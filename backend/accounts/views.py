from rest_framework.views import APIView
from django.contrib.auth import get_user_model
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework import status, generics, permissions
from rest_framework.exceptions import ValidationError
from django.db import models
from .models import UserAccount, Profile, PushSubscription, DirectConversation, DirectMessage, DirectMessageDeleteForMe, DirectMessageReaction, UserFollow, Notification, UserBlock, UserReport, CollabRequest, CollabApplication, BookingSlot, BookingRequest
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.tokens import RefreshToken, TokenError
from .email import CustomActivationEmail
from .rate_limits import check_rate_limit, get_client_ip
from .serializers import (
    CustomTokenObtainPairSerializer, UserUpdateSerializer, ProfileSerializer, 
    UserDetailSerializer, UserPublicSerializer, DirectConversationSerializer, DirectMessageSerializer,
    NotificationSerializer, UserReportSerializer, CollabRequestSerializer, CollabApplicationSerializer,
    BookingSlotSerializer, BookingRequestSerializer
)
from django.http import JsonResponse
from django.views.decorators.csrf import ensure_csrf_cookie
from django.utils.http import urlsafe_base64_decode
from django.utils import timezone
from datetime import timedelta
from .tokens import ActivationTokenGenerator
from social_django.utils import load_backend, load_strategy
from django.shortcuts import redirect
from django.urls import reverse
import boto3
import time
from django.conf import settings
from django.http import JsonResponse
from video.models import Call
from video.serializers import CallSerializer
from django.db.models import Q
from django.shortcuts import get_object_or_404
from .realtime import emit_notifications_read




User = get_user_model()
token_generator = ActivationTokenGenerator()


def rate_limit_response(result):
    return Response(
        {
            "detail": "Too many attempts. Please wait a moment before trying again.",
            "retry_after_seconds": result.retry_after_seconds,
        },
        status=status.HTTP_429_TOO_MANY_REQUESTS,
        headers={"Retry-After": str(result.retry_after_seconds)},
    )


class ActivateUserView(APIView):
    def post(self, request):
        uid = request.data.get("uid")
        token = request.data.get("token")

        try: 
            uid = urlsafe_base64_decode(uid).decode()
            user = UserAccount.objects.get(pk=uid)
        except (TypeError, ValueError, OverflowError, User.DoesNotExist):
            return Response({"detail": "Invalid UID"}, status.HTTP_400_BAD_REQUEST)
        
        if token_generator.check_token(user, token):
            user.is_active = True
            user.save()
            return Response({"detail": "Account activated"}, status=status.HTTP_200_OK)

        return Response({"detail": "Activation link expired or invalid"}, status=status.HTTP_400_BAD_REQUEST)


class ResendActivationEmailView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        email = (request.data.get("email") or "").strip().lower()
        generic_response = {
            "detail": "If this account still needs activation, we will send another activation email.",
        }

        if not email:
            return Response({"detail": "Email is required."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            user = UserAccount.objects.get(email__iexact=email)
        except UserAccount.DoesNotExist:
            return Response(generic_response, status=status.HTTP_200_OK)

        if user.is_active:
            return Response(generic_response, status=status.HTTP_200_OK)

        if user.activation_email_sent_at:
            wait_until = user.activation_email_sent_at + timedelta(minutes=2)
            if timezone.now() < wait_until:
                return Response(
                    {
                        "detail": "We recently sent an activation email. Please wait a moment before requesting another one.",
                        "retry_after_seconds": max(1, int((wait_until - timezone.now()).total_seconds())),
                    },
                    status=status.HTTP_429_TOO_MANY_REQUESTS,
                )

        CustomActivationEmail(request, {"user": user}).send([user.email])
        return Response({"detail": "Activation email sent. Please check your inbox."}, status=status.HTTP_200_OK)

        

class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer

    def post(self, request, *args, **kwargs):
        client_ip = get_client_ip(request)
        identifier = (
            request.data.get("email")
            or request.data.get("username")
            or client_ip
        )
        identifier = str(identifier).strip().lower()

        ip_limit = check_rate_limit(
            "login-ip",
            client_ip,
            settings.LOGIN_RATE_LIMIT_IP_ATTEMPTS,
            settings.LOGIN_RATE_LIMIT_WINDOW_SECONDS,
        )
        if not ip_limit.allowed:
            return rate_limit_response(ip_limit)

        identifier_limit = check_rate_limit(
            "login-identifier",
            identifier,
            settings.LOGIN_RATE_LIMIT_IDENTIFIER_ATTEMPTS,
            settings.LOGIN_RATE_LIMIT_WINDOW_SECONDS,
        )
        if not identifier_limit.allowed:
            return rate_limit_response(identifier_limit)

        try:
            user = User.objects.get(email=request.data.get('email'))

            if not user.is_active:
                return Response(
                    {'detail': 'Account not activated'},
                    status=status.HTTP_401_UNAUTHORIZED
                )
            
            if user.is_deactivated:
                return Response(
                    {'detail': 'Account deactivated'}, 
                    status=status.HTTP_401_UNAUTHORIZED
                )
        except User.DoesNotExist:
            # Let the serializer handle invalid credentials
            pass

        response = super().post(request, *args, **kwargs)
        return response
        
class UserDetailView(generics.RetrieveAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = UserDetailSerializer
    
    def get_object(self):
        return self.request.user

    
class ProfileUpdateView(generics.UpdateAPIView):
    """PATCH /auth/users/profile/update/"""
    serializer_class = UserUpdateSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user
    
    def get_serializer_class(self):
        if self.request.method in ('PATCH', 'PUT'):
            return UserUpdateSerializer
        return UserDetailSerializer

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()

        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        serializer.save()

        instance.refresh_from_db()
        if hasattr(instance, "profile"):
            instance.profile.refresh_from_db()

        read_serializer = UserDetailSerializer(instance, context=self.get_serializer_context())
        return Response(read_serializer.data, status=status.HTTP_200_OK)

    
class ProfileView(generics.RetrieveAPIView):
    serializer_class = ProfileSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user.profile

class PublicProfileView(generics.RetrieveAPIView):
    queryset = User.objects.all()
    serializer_class = UserPublicSerializer
    permission_classes = [permissions.AllowAny]
    lookup_field = "username" # Lookup field for username

    def get_object(self):
        username = self.kwargs.get('username')
        user = get_object_or_404(User, username=username, is_active=True)

        if self.request.user.is_authenticated and has_blocked(user, self.request.user):
            raise generics.NotFound()

        return user

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        if should_hide_private_profile(request.user, instance):
            data = {
                'id': str(instance.id),
                'username': instance.username,
                'first_name': instance.first_name,
                'last_name': instance.last_name,
                'profile': {'is_private': True},
                'is_following': False,
                'following_count': instance.following_relationships.count(),
                'follower_count': instance.follower_relationships.count(),
            }
            return Response(data, status=status.HTTP_200_OK)

        return super().retrieve(request, *args, **kwargs)


def sync_follower_count(user):
    count = UserFollow.objects.filter(following=user).count()
    Profile.objects.filter(user=user).update(followers=count)
    return count


def has_blocked(user, target):
    return UserBlock.objects.filter(blocker=user, blocked=target).exists()


def is_blocked_by(user, target):
    return UserBlock.objects.filter(blocker=target, blocked=user).exists()


def should_hide_private_profile(requesting_user, target_user):
    if not target_user.profile.is_private:
        return False
    if not requesting_user or not requesting_user.is_authenticated:
        return True
    if requesting_user.id == target_user.id:
        return False
    return not UserFollow.objects.filter(follower=requesting_user, following=target_user).exists()


class UserFollowAPIView(generics.GenericAPIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, user_id, *args, **kwargs):
        target_user = get_object_or_404(UserAccount, pk=user_id, is_active=True)

        if target_user.id == request.user.id:
            return Response({"detail": "You cannot follow yourself"}, status=status.HTTP_400_BAD_REQUEST)

        if has_blocked(target_user, request.user):
            return Response({"detail": "You cannot follow this user."}, status=status.HTTP_403_FORBIDDEN)

        if has_blocked(request.user, target_user):
            return Response({"detail": "Unblock this user before following."}, status=status.HTTP_403_FORBIDDEN)

        _, created = UserFollow.objects.get_or_create(follower=request.user, following=target_user)
        followers = sync_follower_count(target_user)

        if created:
            display_name = request.user.username or request.user.first_name or "Someone"
            Notification.objects.create(
                recipient=target_user,
                actor=request.user,
                notification_type="follow",
                title=f"@{display_name} followed you",
                body="You have a new follower.",
                target_url=f"/profile/{request.user.username}" if request.user.username else "/profile",
            )

        return Response(
            {
                "is_following": True,
                "followers": followers,
                "following_count": request.user.following_relationships.count(),
            },
            status=status.HTTP_200_OK,
        )

    def delete(self, request, user_id, *args, **kwargs):
        target_user = get_object_or_404(UserAccount, pk=user_id, is_active=True)

        UserFollow.objects.filter(follower=request.user, following=target_user).delete()
        followers = sync_follower_count(target_user)

        return Response(
            {
                "is_following": False,
                "followers": followers,
                "following_count": request.user.following_relationships.count(),
            },
            status=status.HTTP_200_OK,
        )


class UserFollowerListAPIView(generics.GenericAPIView):
    serializer_class = UserPublicSerializer
    permission_classes = [permissions.AllowAny]

    def get(self, request, user_id, *args, **kwargs):
        target_user = get_object_or_404(UserAccount, pk=user_id, is_active=True)
        followers = UserFollow.objects.filter(following=target_user).select_related("follower", "follower__profile")
        users = [relation.follower for relation in followers]
        serializer = self.get_serializer(users, many=True, context={"request": request})
        return Response({"results": serializer.data}, status=status.HTTP_200_OK)


class UserFollowingListAPIView(generics.GenericAPIView):
    serializer_class = UserPublicSerializer
    permission_classes = [permissions.AllowAny]

    def get(self, request, user_id, *args, **kwargs):
        target_user = get_object_or_404(UserAccount, pk=user_id, is_active=True)
        following = UserFollow.objects.filter(follower=target_user).select_related("following", "following__profile")
        users = [relation.following for relation in following]
        serializer = self.get_serializer(users, many=True, context={"request": request})
        return Response({"results": serializer.data}, status=status.HTTP_200_OK)


class UserBlockAPIView(generics.GenericAPIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, user_id, *args, **kwargs):
        target_user = get_object_or_404(UserAccount, pk=user_id, is_active=True)
        if target_user.id == request.user.id:
            return Response({"detail": "You cannot block yourself."}, status=status.HTTP_400_BAD_REQUEST)

        UserBlock.objects.get_or_create(blocker=request.user, blocked=target_user)
        UserFollow.objects.filter(follower=request.user, following=target_user).delete()
        UserFollow.objects.filter(follower=target_user, following=request.user).delete()
        sync_follower_count(target_user)
        sync_follower_count(request.user)
        return Response({"blocked": True}, status=status.HTTP_200_OK)

    def delete(self, request, user_id, *args, **kwargs):
        target_user = get_object_or_404(UserAccount, pk=user_id, is_active=True)
        UserBlock.objects.filter(blocker=request.user, blocked=target_user).delete()
        return Response({"blocked": False}, status=status.HTTP_200_OK)


class UserBlockStatusAPIView(generics.GenericAPIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, user_id, *args, **kwargs):
        target_user = get_object_or_404(UserAccount, pk=user_id, is_active=True)
        return Response({
            "blocked": has_blocked(request.user, target_user),
            "blocked_by": has_blocked(target_user, request.user),
        }, status=status.HTTP_200_OK)


class UserBlockedListAPIView(generics.GenericAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = UserPublicSerializer

    def get(self, request, *args, **kwargs):
        blocks = UserBlock.objects.filter(blocker=request.user).select_related("blocked", "blocked__profile")
        users = [block.blocked for block in blocks]
        serializer = self.get_serializer(users, many=True, context={"request": request})
        return Response({"results": serializer.data}, status=status.HTTP_200_OK)


class UserReportAPIView(generics.GenericAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = UserReportSerializer

    def post(self, request, user_id, *args, **kwargs):
        target_user = get_object_or_404(UserAccount, pk=user_id, is_active=True)
        if target_user.id == request.user.id:
            return Response({"detail": "You cannot report yourself."}, status=status.HTTP_400_BAD_REQUEST)

        recent_report = UserReport.objects.filter(
            reporter=request.user,
            reported=target_user,
            status="pending",
            created_at__gte=timezone.now() - timedelta(hours=24),
        ).first()
        if recent_report:
            return Response(
                {"reported": True, "detail": "You already submitted a report for this user recently."},
                status=status.HTTP_200_OK,
            )

        report_type = request.data.get("reason", "other")
        details = (request.data.get("details") or "").strip()
        if report_type == "other" and len(details) < 10:
            return Response({"detail": "Please add a few details for this report."}, status=status.HTTP_400_BAD_REQUEST)

        serializer = self.get_serializer(data={
            "reporter": request.user.id,
            "reported": target_user.id,
            "report_type": report_type,
            "details": details,
        })
        serializer.is_valid(raise_exception=True)
        serializer.save(reporter=request.user, reported=target_user)
        return Response({"reported": True}, status=status.HTTP_201_CREATED)


class PushSubscriptionView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        endpoint = request.data.get("endpoint")
        keys = request.data.get("keys") or {}
        p256dh = keys.get("p256dh")
        auth = keys.get("auth")

        if not endpoint or not p256dh or not auth:
            return Response({"detail": "Invalid push subscription payload"}, status=status.HTTP_400_BAD_REQUEST)

        subscription, _ = PushSubscription.objects.update_or_create(
            endpoint=endpoint,
            defaults={
                "user": request.user,
                "p256dh": p256dh,
                "auth": auth,
            },
        )

        return Response(
            {
                "id": str(subscription.id),
                "endpoint": subscription.endpoint,
            },
            status=status.HTTP_200_OK,
        )

    def delete(self, request):
        endpoint = request.data.get("endpoint")
        if not endpoint:
            return Response({"detail": "endpoint is required"}, status=status.HTTP_400_BAD_REQUEST)

        PushSubscription.objects.filter(user=request.user, endpoint=endpoint).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class NotificationListAPIView(generics.GenericAPIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, *args, **kwargs):
        if request.query_params.get("summary") == "true":
            unread_count = Notification.objects.filter(recipient=request.user, is_read=False).count()
            latest = (
                Notification.objects.filter(recipient=request.user)
                .order_by("-created_at")
                .values_list("created_at", flat=True)
                .first()
            )
            return Response(
                {
                    "unread_count": unread_count,
                    "latest_at": latest,
                },
                status=status.HTTP_200_OK,
            )

        try:
            limit = min(max(int(request.query_params.get("limit") or 30), 1), 50)
        except (TypeError, ValueError):
            limit = 30

        only_unread = request.query_params.get("unread") == "true"
        queryset = Notification.objects.filter(recipient=request.user)
        if only_unread:
            queryset = queryset.filter(is_read=False)

        notifications = (
            queryset
            .select_related("actor", "actor__profile")
            .order_by("-created_at")[:limit]
        )
        unread_count = Notification.objects.filter(recipient=request.user, is_read=False).count()
        serializer = NotificationSerializer(notifications, many=True, context={"request": request})
        return Response(
            {
                "unread_count": unread_count,
                "results": serializer.data,
            },
            status=status.HTTP_200_OK,
        )

    def patch(self, request, *args, **kwargs):
        notification_ids = request.data.get("ids")
        queryset = Notification.objects.filter(recipient=request.user, is_read=False)

        if isinstance(notification_ids, list) and notification_ids:
            queryset = queryset.filter(id__in=notification_ids)

        queryset.update(is_read=True)
        unread_count = Notification.objects.filter(recipient=request.user, is_read=False).count()
        emit_notifications_read(request.user.id, unread_count)
        return Response({"unread_count": unread_count}, status=status.HTTP_200_OK)


class PendingIncomingCallView(generics.GenericAPIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, *args, **kwargs):
        stale_before = timezone.now() - timedelta(seconds=30)
        stale_calls = list(
            Call.objects.select_related("caller", "callee").filter(
                callee=request.user,
                status="ringing",
                created_at__lt=stale_before,
            )
        )
        now = timezone.now()
        for stale_call in stale_calls:
            stale_call.status = "missed"
            stale_call.ended_at = now
            stale_call.save(update_fields=["status", "ended_at"])
            display_name = stale_call.caller.username or stale_call.caller.first_name or "Someone"
            Notification.objects.create(
                recipient=stale_call.callee,
                actor=stale_call.caller,
                notification_type="call",
                title=f"Missed {stale_call.call_type} call",
                body=f"@{display_name} tried to reach you.",
                target_url=f"/messages?user={stale_call.caller_id}",
            )

        call = (
            Call.objects.select_related("caller", "callee")
            .filter(callee=request.user, status="ringing")
            .order_by("-created_at")
            .first()
        )

        if not call:
            return Response({"call": None}, status=status.HTTP_200_OK)

        return Response({"call": CallSerializer(call).data}, status=status.HTTP_200_OK)


def build_conversation_pair_key(user_a_id, user_b_id):
    ordered = sorted([str(user_a_id), str(user_b_id)])
    return f"{ordered[0]}:{ordered[1]}"


def get_direct_conversation_queryset(user):
    return DirectConversation.objects.filter(
        Q(user_one=user) | Q(user_two=user)
    ).select_related(
        "user_one", "user_one__profile", "user_two", "user_two__profile"
    )


def attach_conversation_call_previews(user, conversations):
    conversation_ids = [conversation.id for conversation in conversations]
    peer_ids = {
        conversation.user_two_id if conversation.user_one_id == user.id else conversation.user_one_id
        for conversation in conversations
    }
    latest_message_by_conversation = {}
    unread_count_by_conversation = {
        item["conversation_id"]: item["count"]
        for item in DirectMessage.objects.filter(
            conversation_id__in=conversation_ids,
            read_at__isnull=True,
        )
        .exclude(sender=user)
        .exclude(deleted_for=user)
        .values("conversation_id")
        .annotate(count=models.Count("id"))
    }

    latest_messages = (
        DirectMessage.objects.filter(conversation_id__in=conversation_ids)
        .exclude(deleted_for=user)
        .select_related("sender", "sender__profile", "reply_to", "reply_to__sender", "reply_to__sender__profile")
        .prefetch_related("reactions")
        .order_by("conversation_id", "-created_at")
    )
    for message in latest_messages:
        if message.conversation_id not in latest_message_by_conversation:
            latest_message_by_conversation[message.conversation_id] = message
            if len(latest_message_by_conversation) == len(conversation_ids):
                break

    latest_call_by_peer = {}
    calls = Call.objects.filter(
        Q(caller=user, callee_id__in=peer_ids) | Q(caller_id__in=peer_ids, callee=user)
    ).select_related("caller", "callee", "caller__profile", "callee__profile").order_by("-created_at")

    for call in calls:
        peer_id = call.callee_id if call.caller_id == user.id else call.caller_id
        if peer_id not in latest_call_by_peer:
            latest_call_by_peer[peer_id] = call

    for conversation in conversations:
        last_message = latest_message_by_conversation.get(conversation.id)
        peer_id = conversation.user_two_id if conversation.user_one_id == user.id else conversation.user_one_id
        last_call = latest_call_by_peer.get(peer_id)
        activity_candidates = [conversation.last_message_at]
        if last_message:
            activity_candidates.append(last_message.created_at)
        if last_call:
            activity_candidates.append(last_call.created_at)

        conversation._prefetched_last_message = last_message
        conversation._prefetched_last_call = last_call
        conversation._last_activity_at = max(activity_candidates)
        conversation._unread_count = unread_count_by_conversation.get(conversation.id, 0)

    return sorted(conversations, key=lambda conversation: conversation._last_activity_at, reverse=True)


class DirectConversationListCreateAPIView(generics.GenericAPIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, *args, **kwargs):
        conversations = attach_conversation_call_previews(
            request.user,
            list(get_direct_conversation_queryset(request.user)),
        )

        serializer = DirectConversationSerializer(conversations, many=True, context={"request": request})
        return Response({"results": serializer.data}, status=status.HTTP_200_OK)

    def post(self, request, *args, **kwargs):
        participant_id = request.data.get("participant_id")
        if not participant_id:
            return Response({"detail": "participant_id is required"}, status=status.HTTP_400_BAD_REQUEST)

        participant = get_object_or_404(UserAccount, pk=participant_id)
        if participant.id == request.user.id:
            return Response({"detail": "You cannot start a conversation with yourself"}, status=status.HTTP_400_BAD_REQUEST)

        if has_blocked(participant, request.user) or has_blocked(request.user, participant):
            return Response({"detail": "You cannot start a conversation with this user."}, status=status.HTTP_403_FORBIDDEN)

        pair_key = build_conversation_pair_key(request.user.id, participant.id)
        defaults = {
            "user_one": request.user if str(request.user.id) < str(participant.id) else participant,
            "user_two": participant if str(request.user.id) < str(participant.id) else request.user,
        }
        conversation, _ = DirectConversation.objects.get_or_create(pair_key=pair_key, defaults=defaults)
        serializer = DirectConversationSerializer(conversation, context={"request": request})
        return Response(serializer.data, status=status.HTTP_200_OK)


class DirectConversationMessagesAPIView(generics.GenericAPIView):
    permission_classes = [permissions.IsAuthenticated]

    def get_conversation(self, request, conversation_id):
        return get_object_or_404(
            DirectConversation.objects.select_related(
                "user_one", "user_one__profile", "user_two", "user_two__profile"
            ),
            Q(user_one=request.user) | Q(user_two=request.user),
            pk=conversation_id,
        )

    def get(self, request, conversation_id, *args, **kwargs):
        conversation = self.get_conversation(request, conversation_id)
        other_user = conversation.user_two if conversation.user_one_id == request.user.id else conversation.user_one
        if has_blocked(other_user, request.user) or has_blocked(request.user, other_user):
            return Response({"detail": "You cannot view this conversation."}, status=status.HTTP_403_FORBIDDEN)

        now = timezone.now()
        unread_incoming = conversation.messages.filter(sender=other_user, read_at__isnull=True).exclude(deleted_for=request.user)
        read_message_ids = [str(message_id) for message_id in unread_incoming.values_list("id", flat=True)]
        if read_message_ids:
            unread_incoming.update(read_at=now)

        latest_messages = list(
            conversation.messages.select_related(
                "sender", "sender__profile", "reply_to", "reply_to__sender", "reply_to__sender__profile"
            )
            .exclude(deleted_for=request.user)
            .prefetch_related("reactions")
            .order_by("-created_at")[:50]
        )
        latest_messages.reverse()
        serializer = DirectMessageSerializer(latest_messages, many=True, context={"request": request})
        return Response(
            {
                "conversation": DirectConversationSerializer(conversation, context={"request": request}).data,
                "results": serializer.data,
                "read_message_ids": read_message_ids,
                "read_at": now.isoformat() if read_message_ids else None,
            },
            status=status.HTTP_200_OK,
        )

    def post(self, request, conversation_id, *args, **kwargs):
        conversation = self.get_conversation(request, conversation_id)
        other_user = conversation.user_two if conversation.user_one_id == request.user.id else conversation.user_one
        if has_blocked(other_user, request.user) or has_blocked(request.user, other_user):
            return Response({"detail": "You cannot send messages in this conversation."}, status=status.HTTP_403_FORBIDDEN)

        body = (request.data.get("body") or "").strip()
        message_type = request.data.get("message_type", "text")
        audio_url = (request.data.get("audio_url") or "").strip()
        audio_transcript = (request.data.get("audio_transcript") or "").strip()
        attachment_url = (request.data.get("attachment_url") or "").strip()
        attachment_name = (request.data.get("attachment_name") or "").strip()
        attachment_type = (request.data.get("attachment_type") or "").strip()
        try:
            audio_duration_ms = int(request.data.get("audio_duration_ms") or 0)
        except (TypeError, ValueError):
            audio_duration_ms = 0
        try:
            attachment_size = int(request.data.get("attachment_size") or 0)
        except (TypeError, ValueError):
            attachment_size = 0
        if message_type not in {"text", "voice", "image", "file"}:
            return Response({"detail": "Invalid message type"}, status=status.HTTP_400_BAD_REQUEST)
        if message_type == "text" and not body:
            return Response({"detail": "Message body is required"}, status=status.HTTP_400_BAD_REQUEST)
        if message_type == "voice" and not audio_url:
            return Response({"detail": "Voice note audio is required"}, status=status.HTTP_400_BAD_REQUEST)
        if message_type in {"image", "file"} and not attachment_url:
            return Response({"detail": "Attachment URL is required"}, status=status.HTTP_400_BAD_REQUEST)
        reply_to = None
        reply_to_id = request.data.get("reply_to_id")
        if reply_to_id:
            reply_to = conversation.messages.filter(pk=reply_to_id).first()
            if not reply_to:
                return Response({"detail": "Reply message was not found"}, status=status.HTTP_400_BAD_REQUEST)

        message = DirectMessage.objects.create(
            conversation=conversation,
            sender=request.user,
            reply_to=reply_to,
            body=body,
            message_type=message_type,
            audio_url=audio_url or None,
            audio_duration_ms=audio_duration_ms,
            audio_transcript=audio_transcript if message_type == "voice" else "",
            attachment_url=attachment_url or None,
            attachment_name=attachment_name[:255],
            attachment_type=attachment_type[:120],
            attachment_size=max(0, attachment_size),
        )
        if message_type == "voice" and not message.audio_transcript:
            from backend.tasks import transcribe_voice_message

            transcribe_voice_message.delay(str(message.id))
        conversation.last_message_at = message.created_at
        conversation.save(update_fields=["last_message_at", "updated_at"])

        recipient = conversation.user_two if conversation.user_one_id == request.user.id else conversation.user_one
        display_name = request.user.username or request.user.first_name or "Someone"
        Notification.objects.create(
            recipient=recipient,
            actor=request.user,
            notification_type="message",
            title=f"@{display_name} sent you a message",
            body={
                "voice": "Voice note",
                "image": attachment_name or "Image",
                "file": attachment_name or "File",
            }.get(message_type, body[:120]),
            target_url=f"/messages?user={request.user.id}",
        )

        serializer = DirectMessageSerializer(message, context={"request": request})
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    def patch(self, request, conversation_id, *args, **kwargs):
        conversation = self.get_conversation(request, conversation_id)
        other_user = conversation.user_two if conversation.user_one_id == request.user.id else conversation.user_one
        if has_blocked(other_user, request.user) or has_blocked(request.user, other_user):
            return Response({"detail": "You cannot update this conversation."}, status=status.HTTP_403_FORBIDDEN)

        message_ids = request.data.get("message_ids") or []
        if not isinstance(message_ids, list):
            return Response({"detail": "message_ids must be a list"}, status=status.HTTP_400_BAD_REQUEST)

        now = timezone.now()
        unread_incoming = conversation.messages.filter(
            id__in=message_ids,
            sender=other_user,
            read_at__isnull=True,
        ).exclude(deleted_for=request.user)
        read_message_ids = [str(message_id) for message_id in unread_incoming.values_list("id", flat=True)]
        if read_message_ids:
            unread_incoming.update(read_at=now)

        return Response(
            {
                "read_message_ids": read_message_ids,
                "read_at": now.isoformat() if read_message_ids else None,
            },
            status=status.HTTP_200_OK,
        )


class DirectMessageReactionAPIView(generics.GenericAPIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, conversation_id, message_id, *args, **kwargs):
        conversation = get_object_or_404(
            DirectConversation.objects.select_related("user_one", "user_two"),
            Q(user_one=request.user) | Q(user_two=request.user),
            pk=conversation_id,
        )
        message = get_object_or_404(conversation.messages.prefetch_related("reactions"), pk=message_id)
        reaction = request.data.get("reaction")

        allowed_reactions = {key for key, _ in DirectMessageReaction.ALLOWED_REACTIONS}
        if reaction not in allowed_reactions:
            return Response({"detail": "Invalid reaction."}, status=status.HTTP_400_BAD_REQUEST)

        existing = DirectMessageReaction.objects.filter(message=message, user=request.user).first()
        if existing and existing.reaction == reaction:
            existing.delete()
            my_reaction = None
        else:
            DirectMessageReaction.objects.update_or_create(
                message=message,
                user=request.user,
                defaults={"reaction": reaction},
            )
            my_reaction = reaction

        message = DirectMessage.objects.prefetch_related("reactions").get(pk=message.id)
        counts = {key: 0 for key in allowed_reactions}
        for item in message.reactions.all():
            counts[item.reaction] = counts.get(item.reaction, 0) + 1

        return Response(
            {
                "message_id": str(message.id),
                "reaction_counts": counts,
                "my_reaction": my_reaction,
            },
            status=status.HTTP_200_OK,
        )


class DirectMessageVisibilityAPIView(generics.GenericAPIView):
    permission_classes = [permissions.IsAuthenticated]
    undo_window = timedelta(minutes=5)

    def get_message(self, request, conversation_id, message_id):
        conversation = get_object_or_404(
            DirectConversation.objects.select_related("user_one", "user_two"),
            Q(user_one=request.user) | Q(user_two=request.user),
            pk=conversation_id,
        )
        return get_object_or_404(
            conversation.messages.select_related("sender", "sender__profile").prefetch_related("reactions"),
            pk=message_id,
        )

    def delete(self, request, conversation_id, message_id, *args, **kwargs):
        message = self.get_message(request, conversation_id, message_id)
        message.deleted_for.add(request.user)
        record, _ = DirectMessageDeleteForMe.objects.update_or_create(
            message=message,
            user=request.user,
            defaults={"deleted_at": timezone.now()},
        )
        return Response(
            {
                "detail": "Message deleted for you.",
                "undo_expires_at": (record.deleted_at + self.undo_window).isoformat(),
            },
            status=status.HTTP_200_OK,
        )

    def patch(self, request, conversation_id, message_id, *args, **kwargs):
        message = self.get_message(request, conversation_id, message_id)
        if message.sender_id != request.user.id:
            return Response({"detail": "You can only delete your own messages for everyone."}, status=status.HTTP_403_FORBIDDEN)

        if not message.is_deleted_for_everyone:
            message.is_deleted_for_everyone = True
            message.deleted_for_everyone_at = timezone.now()
            message.save(update_fields=["is_deleted_for_everyone", "deleted_for_everyone_at"])
            message.reactions.all().delete()

        message = DirectMessage.objects.select_related("sender", "sender__profile").prefetch_related("reactions").get(pk=message.pk)
        serializer = DirectMessageSerializer(message, context={"request": request})
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request, conversation_id, message_id, *args, **kwargs):
        message = self.get_message(request, conversation_id, message_id)
        delete_record = DirectMessageDeleteForMe.objects.filter(message=message, user=request.user).first()
        if not delete_record:
            return Response({"detail": "This message can no longer be restored."}, status=status.HTTP_400_BAD_REQUEST)

        if timezone.now() > delete_record.deleted_at + self.undo_window:
            return Response(
                {"detail": "Undo is only available for 5 minutes after deleting for you."},
                status=status.HTTP_410_GONE,
            )

        message.deleted_for.remove(request.user)
        delete_record.delete()
        serializer = DirectMessageSerializer(message, context={"request": request})
        return Response(serializer.data, status=status.HTTP_200_OK)


class UserDirectoryAPIView(generics.GenericAPIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, *args, **kwargs):
        search = (request.query_params.get("search") or "").strip()
        if len(search) < 2:
            return Response({"results": []}, status=status.HTTP_200_OK)

        users = (
            UserAccount.objects.filter(is_active=True)
            .exclude(pk=request.user.id)
            .exclude(pk__in=UserBlock.objects.filter(blocker=request.user).values_list("blocked_id", flat=True))
            .exclude(pk__in=UserBlock.objects.filter(blocked=request.user).values_list("blocker_id", flat=True))
            .filter(
                Q(first_name__icontains=search)
                | Q(last_name__icontains=search)
                | Q(username__icontains=search)
                | Q(profile__skill_tags__icontains=search)
            )
            .select_related("profile")
            .order_by("first_name", "username")[:12]
        )
        serializer = UserPublicSerializer(users, many=True, context={"request": request})
        return Response({"results": serializer.data}, status=status.HTTP_200_OK)


class CollabRequestListCreateAPIView(generics.ListCreateAPIView):
    serializer_class = CollabRequestSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        mine = self.request.query_params.get("mine") == "1"
        queryset = (
            CollabRequest.objects.filter(status="open" if not mine else "open")
            .select_related("creator", "creator__profile")
            .prefetch_related("applications", "applications__applicant", "applications__applicant__profile")
        )
        if mine:
            queryset = queryset.filter(creator=self.request.user)
        else:
            queryset = queryset.exclude(creator=self.request.user)

        request_type = self.request.query_params.get("type")
        search = self.request.query_params.get("search")

        if request_type in {"collab", "hire", "mentor"}:
            queryset = queryset.filter(request_type=request_type)

        if search:
            queryset = queryset.filter(
                Q(title__icontains=search) |
                Q(description__icontains=search) |
                Q(skills__icontains=search) |
                Q(creator__username__icontains=search)
            )

        return queryset

    def perform_create(self, serializer):
        serializer.save(creator=self.request.user)


class CollabApplicationListCreateAPIView(generics.ListCreateAPIView):
    serializer_class = CollabApplicationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_collab_request(self):
        return get_object_or_404(
            CollabRequest.objects.select_related("creator"),
            pk=self.kwargs.get("request_id"),
            status="open",
        )

    def get_queryset(self):
        collab_request = self.get_collab_request()
        if collab_request.creator_id != self.request.user.id:
            return CollabApplication.objects.none()
        return collab_request.applications.select_related("applicant", "applicant__profile").all()

    def perform_create(self, serializer):
        collab_request = self.get_collab_request()
        if collab_request.creator_id == self.request.user.id:
            raise ValidationError("You cannot apply to your own request.")
        application, created = CollabApplication.objects.get_or_create(
            request=collab_request,
            applicant=self.request.user,
            defaults={"pitch": serializer.validated_data.get("pitch", "")},
        )
        if not created:
            application.pitch = serializer.validated_data.get("pitch", application.pitch)
            application.status = "submitted"
            application.save(update_fields=["pitch", "status", "updated_at"])

        display_name = self.request.user.username or self.request.user.first_name or "Someone"
        Notification.objects.create(
            recipient=collab_request.creator,
            actor=self.request.user,
            notification_type="system",
            title=f"@{display_name} applied to your collab",
            body=collab_request.title,
            target_url="/collabs",
        )
        serializer.instance = application


class CollabApplicationStatusAPIView(generics.UpdateAPIView):
    serializer_class = CollabApplicationSerializer
    permission_classes = [permissions.IsAuthenticated]
    http_method_names = ["patch"]

    def get_queryset(self):
        return CollabApplication.objects.select_related("request", "request__creator", "applicant", "applicant__profile")

    def get_object(self):
        application = get_object_or_404(self.get_queryset(), pk=self.kwargs.get("application_id"))
        if application.request.creator_id != self.request.user.id:
            raise generics.NotFound()
        return application

    def patch(self, request, *args, **kwargs):
        application = self.get_object()
        next_status = request.data.get("status")
        if next_status not in {"submitted", "shortlisted", "accepted", "declined"}:
            return Response({"detail": "Invalid status."}, status=status.HTTP_400_BAD_REQUEST)

        application.status = next_status
        application.save(update_fields=["status", "updated_at"])

        Notification.objects.create(
            recipient=application.applicant,
            actor=request.user,
            notification_type="system",
            title=f"Your collab application was {next_status}",
            body=application.request.title,
            target_url="/collabs",
        )

        serializer = self.get_serializer(application, context=self.get_serializer_context())
        return Response(serializer.data, status=status.HTTP_200_OK)


class BookingSlotListCreateAPIView(generics.ListCreateAPIView):
    serializer_class = BookingSlotSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        mine = self.request.query_params.get("mine") == "1"
        creator_id = self.request.query_params.get("creator")
        queryset = (
            BookingSlot.objects.filter(is_active=True, starts_at__gte=timezone.now())
            .select_related("creator", "creator__profile")
            .prefetch_related("booking_requests", "booking_requests__requester", "booking_requests__requester__profile")
        )
        if mine:
            queryset = queryset.filter(creator=self.request.user)
        elif creator_id:
            queryset = queryset.filter(creator_id=creator_id).exclude(creator=self.request.user)
        else:
            queryset = queryset.exclude(creator=self.request.user)
        return queryset

    def perform_create(self, serializer):
        serializer.save(creator=self.request.user)


class BookingRequestListCreateAPIView(generics.ListCreateAPIView):
    serializer_class = BookingRequestSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_slot(self):
        return get_object_or_404(BookingSlot.objects.select_related("creator"), pk=self.kwargs.get("slot_id"), is_active=True)

    def get_queryset(self):
        slot = self.get_slot()
        if slot.creator_id != self.request.user.id:
            return BookingRequest.objects.none()
        return slot.booking_requests.select_related("requester", "requester__profile").all()

    def perform_create(self, serializer):
        slot = self.get_slot()
        if slot.creator_id == self.request.user.id:
            raise ValidationError("You cannot request your own slot.")
        booking_request, created = BookingRequest.objects.get_or_create(
            slot=slot,
            requester=self.request.user,
            defaults={"message": serializer.validated_data.get("message", "")},
        )
        if not created:
            booking_request.message = serializer.validated_data.get("message", booking_request.message)
            booking_request.status = "pending"
            booking_request.save(update_fields=["message", "status", "updated_at"])

        display_name = self.request.user.username or self.request.user.first_name or "Someone"
        Notification.objects.create(
            recipient=slot.creator,
            actor=self.request.user,
            notification_type="system",
            title=f"@{display_name} requested a booking",
            body=f"{slot.get_purpose_display()} on {slot.starts_at:%b %d, %I:%M %p}",
            target_url="/creator",
        )
        serializer.instance = booking_request


class BookingRequestStatusAPIView(generics.UpdateAPIView):
    serializer_class = BookingRequestSerializer
    permission_classes = [permissions.IsAuthenticated]
    http_method_names = ["patch"]

    def get_queryset(self):
        return BookingRequest.objects.select_related("slot", "slot__creator", "requester", "requester__profile")

    def get_object(self):
        booking_request = get_object_or_404(self.get_queryset(), pk=self.kwargs.get("request_id"))
        if booking_request.slot.creator_id != self.request.user.id:
            raise generics.NotFound()
        return booking_request

    def patch(self, request, *args, **kwargs):
        booking_request = self.get_object()
        next_status = request.data.get("status")
        if next_status not in {"pending", "accepted", "declined"}:
            return Response({"detail": "Invalid status."}, status=status.HTTP_400_BAD_REQUEST)

        booking_request.status = next_status
        booking_request.save(update_fields=["status", "updated_at"])
        Notification.objects.create(
            recipient=booking_request.requester,
            actor=request.user,
            notification_type="system",
            title=f"Your booking was {next_status}",
            body=f"{booking_request.slot.get_purpose_display()} with @{request.user.username}",
            target_url="/messages",
        )
        serializer = self.get_serializer(booking_request, context=self.get_serializer_context())
        return Response(serializer.data, status=status.HTTP_200_OK)

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def get_avatar_url(request):
    s3 = boto3.client(
        "s3",
        endpoint_url=settings.AWS_S3_ENDPOINT_URL,
        aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
        aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
        region_name='auto'
    )
    
    file_type = request.data.get("file_type", "image/jpeg")
    file_name = request.data.get("file_name", f"avatar_{request.user.id}")
    
    if file_type == "image/svg+xml":
        file_type = "image/png"
        file_extension = "png"
    else: 
        file_extension = file_type.split('/')[-1]

    # user Id with cache busting
    timestamp = int(time.time())
    
    key = f"avatars/{request.user.id}_{timestamp}.{file_extension}"

    presigned_url = s3.generate_presigned_url(
        ClientMethod="put_object",
        Params={
            "Bucket": settings.AWS_STORAGE_BUCKET_NAME,
            "Key": key,
            "ContentType": file_type
        },
        ExpiresIn=3600,
    )

    if settings.AWS_S3_CUSTOM_DOMAIN:
        public_url = f"https://{settings.AWS_S3_CUSTOM_DOMAIN}/{key}"
    else:
        public_url = f"{settings.AWS_S3_ENDPOINT_URL}/{settings.AWS_STORAGE_BUCKET_NAME}/{key}"
        
    return JsonResponse({
        "upload_url": presigned_url, 
        "public_url": public_url,
        "file_name": key
    })


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def get_voice_note_url(request):
    file_type = request.data.get("file_type", "audio/webm")
    if not str(file_type).startswith("audio/"):
        return Response({"detail": "Voice note must be an audio file."}, status=status.HTTP_400_BAD_REQUEST)

    extension = "webm"
    if "/" in file_type:
        extension = file_type.split("/", 1)[1].split(";", 1)[0] or "webm"
    if extension in {"mpeg", "mp3"}:
        extension = "mp3"
    if extension not in {"webm", "ogg", "mp3", "m4a", "mp4", "wav"}:
        extension = "webm"

    timestamp = int(time.time())
    key = f"voice-notes/{request.user.id}/{timestamp}.{extension}"
    s3 = boto3.client(
        "s3",
        endpoint_url=settings.AWS_S3_ENDPOINT_URL,
        aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
        aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
        region_name="auto",
    )
    presigned_url = s3.generate_presigned_url(
        ClientMethod="put_object",
        Params={
            "Bucket": settings.AWS_STORAGE_BUCKET_NAME,
            "Key": key,
            "ContentType": file_type,
        },
        ExpiresIn=3600,
    )

    if settings.AWS_S3_CUSTOM_DOMAIN:
        public_url = f"https://{settings.AWS_S3_CUSTOM_DOMAIN}/{key}"
    else:
        public_url = f"{settings.AWS_S3_ENDPOINT_URL}/{settings.AWS_STORAGE_BUCKET_NAME}/{key}"

    return Response({"upload_url": presigned_url, "audio_url": public_url, "file_name": key}, status=status.HTTP_200_OK)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def get_message_attachment_url(request):
    file_type = str(request.data.get("file_type") or "application/octet-stream")
    file_name = str(request.data.get("file_name") or "attachment").strip()[:180] or "attachment"
    try:
        file_size = int(request.data.get("file_size") or 0)
    except (TypeError, ValueError):
        file_size = 0

    if file_size > 15 * 1024 * 1024:
        return Response({"detail": "Attachments must be 15MB or smaller."}, status=status.HTTP_400_BAD_REQUEST)

    allowed_prefixes = ("image/", "application/pdf", "text/", "application/zip")
    if not file_type.startswith(allowed_prefixes):
        return Response({"detail": "This file type is not supported."}, status=status.HTTP_400_BAD_REQUEST)

    extension = "bin"
    if "." in file_name:
        extension = file_name.rsplit(".", 1)[1].lower()[:12] or "bin"
    elif "/" in file_type:
        extension = file_type.split("/", 1)[1].split(";", 1)[0][:12] or "bin"

    timestamp = int(time.time())
    key = f"message-attachments/{request.user.id}/{timestamp}.{extension}"
    s3 = boto3.client(
        "s3",
        endpoint_url=settings.AWS_S3_ENDPOINT_URL,
        aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
        aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
        region_name="auto",
    )
    presigned_url = s3.generate_presigned_url(
        ClientMethod="put_object",
        Params={
            "Bucket": settings.AWS_STORAGE_BUCKET_NAME,
            "Key": key,
            "ContentType": file_type,
        },
        ExpiresIn=3600,
    )

    if settings.AWS_S3_CUSTOM_DOMAIN:
        public_url = f"https://{settings.AWS_S3_CUSTOM_DOMAIN}/{key}"
    else:
        public_url = f"{settings.AWS_S3_ENDPOINT_URL}/{settings.AWS_STORAGE_BUCKET_NAME}/{key}"

    return Response({"upload_url": presigned_url, "attachment_url": public_url, "file_name": key}, status=status.HTTP_200_OK)

@ensure_csrf_cookie
def csrf(request):
    return JsonResponse({'message': 'CSRF cookie set'})


@api_view(['GET'])
@permission_classes([AllowAny])
def google_auth_redirect(request):
    limit = check_rate_limit(
        "google-auth-redirect-ip",
        get_client_ip(request),
        settings.OAUTH_START_RATE_LIMIT_IP_ATTEMPTS,
        settings.OAUTH_START_RATE_LIMIT_WINDOW_SECONDS,
    )
    if not limit.allowed:
        return rate_limit_response(limit)

    redirect_uri = request.query_params.get('redirect_uri')

    if not redirect_uri:
        return Response(
            {"detail": "redirect_uri is required"},
            status=status.HTTP_400_BAD_REQUEST
        )

    allowed_redirect_uris = settings.DJOSER.get('SOCIAL_AUTH_ALLOWED_REDIRECT_URIS', [])
    if redirect_uri not in allowed_redirect_uris:
        return Response(
            {"detail": "Redirect URI is not allowed."},
            status=status.HTTP_400_BAD_REQUEST
        )

    strategy = load_strategy(request)
    backend = load_backend(
        strategy=strategy,
        name='google-oauth2',
        redirect_uri=redirect_uri,
    )

    return backend.start()


@api_view(['GET'])
@permission_classes([AllowAny])
def google_auth_start(request):
    limit = check_rate_limit(
        "google-auth-start-ip",
        get_client_ip(request),
        settings.OAUTH_START_RATE_LIMIT_IP_ATTEMPTS,
        settings.OAUTH_START_RATE_LIMIT_WINDOW_SECONDS,
    )
    if not limit.allowed:
        return rate_limit_response(limit)

    redirect_uri = request.build_absolute_uri(reverse('google-auth-callback'))
    strategy = load_strategy(request)
    backend = load_backend(
        strategy=strategy,
        name='google-oauth2',
        redirect_uri=redirect_uri,
    )
    return backend.start()


@api_view(['GET'])
@permission_classes([AllowAny])
def google_auth_callback(request):
    redirect_uri = request.build_absolute_uri(reverse('google-auth-callback'))
    strategy = load_strategy(request)
    backend = load_backend(
        strategy=strategy,
        name='google-oauth2',
        redirect_uri=redirect_uri,
    )

    try:
        user = backend.complete(user=None)
    except Exception:
        return Response({"detail": "Google authentication failed."}, status=status.HTTP_400_BAD_REQUEST)

    if not user:
        return Response({"detail": "Google authentication failed."}, status=status.HTTP_400_BAD_REQUEST)

    if hasattr(user, "is_active") and not user.is_active:
        user.is_active = True
        user.save(update_fields=["is_active"])

    refresh = RefreshToken.for_user(user)
    access = str(refresh.access_token)
    refresh_token = str(refresh)

    frontend_base = settings.PRIMARY_FRONTEND_URL
    if settings.ENV == "development":
        frontend_base = "http://localhost:3000"

    if settings.COOKIE_DOMAIN:
        response = redirect(frontend_base)
        response.set_cookie(
            "access",
            access,
            httponly=True,
            secure=settings.ENV != "development",
            samesite="None" if settings.ENV != "development" else "Lax",
            domain=settings.COOKIE_DOMAIN,
            path="/",
        )
        response.set_cookie(
            "refresh",
            refresh_token,
            httponly=True,
            secure=settings.ENV != "development",
            samesite="None" if settings.ENV != "development" else "Lax",
            domain=settings.COOKIE_DOMAIN,
            path="/",
        )
        return response

    # Local dev fallback: pass tokens to frontend to set cookies on its own domain
    redirect_url = f"{frontend_base.rstrip('/')}/auth/google?access={access}&refresh={refresh_token}"
    return redirect(redirect_url)

@api_view(['GET'])  
def home(request):
    return Response({'detail': 'Welcome home !'}, status=status.HTTP_200_OK)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def total_users(request):
    """
        Returns total number of users with IDs and emails
    """
    users = User.objects.filter(is_active=True).values('id', 'email')
    total_count = users.count()

    return Response({
        "total_users": total_count,
        "user_details": list(users)
    })

class LogoutView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        refresh_token = request.data.get("refresh")

        if refresh_token is None:
            return Response({
                "error": "Refresh token is required"
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            token = RefreshToken(refresh_token)
            token.blacklist()

            return Response({
                "detail": "Logout successful"
            }, status=status.HTTP_205_RESET_CONTENT)
            
        except TokenError as e:
            return Response({
                "error": "Token is invalid or expired",
                "details": str(e)
            }, status=status.HTTP_400_BAD_REQUEST)    

@api_view(['GET'])
def check_email(request):
    email = request.query_params.get('email')

    if not email:
        return Response({
            "error": "Email is required",
        }, status=status.HTTP_400_BAD_REQUEST)
    exists = User.objects.filter(email=email).exists()

    return Response({'exists': exists}, status=status.HTTP_200_OK)
    
