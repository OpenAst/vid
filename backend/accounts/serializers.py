from rest_framework import serializers
from .models import UserAccount, DirectConversation, DirectMessage, DirectMessageReaction, UserFollow, Notification, Profile, UserBlock, UserReport, CollabRequest, CollabApplication, BookingSlot, BookingRequest
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework.exceptions import ValidationError
from django.contrib.auth import get_user_model
from djoser.serializers import UserCreateSerializer
from django.db import models
import logging
from video.models import Call, Video

logger = logging.getLogger(__name__)

user = get_user_model()

class UserCreateSerializer(UserCreateSerializer):
  class Meta:
    model = UserAccount
    fields = ('id', 'first_name', 'last_name', 'email', 'username',
              'password', 'is_active', 'date_joined')
    extra_kwargs = { 'password': {'write_only': True}}
  
  def create(self, validated_data):
    try:
      return UserAccount.objects.create_user(**validated_data)
    except Exception as e:
      if 'unique' in str(e):
        raise serializers.ValidationError({'username': 'This username has been taken.'})
      raise serializers.ValidationError(str(e))
  
class FeaturedVideoSerializer(serializers.ModelSerializer):
  class Meta:
    model = Video
    fields = ['id', 'title', 'thumbnail', 'skill_category']
    read_only_fields = fields

class ProfileSerializer(serializers.ModelSerializer):
  featured_video = FeaturedVideoSerializer(read_only=True)
  featured_video_id = serializers.PrimaryKeyRelatedField(
      source='featured_video',
      queryset=Video.objects.all(),
      required=False,
      allow_null=True,
  )

  class Meta:
    model = Profile
    fields = [
      'avatar', 'bio', 'birth_date', 'followers', 'skill_tags', 'featured_video',
      'featured_video_id', 'website_url', 'twitter_url', 'linkedin_url',
      'open_to_collab', 'open_to_hire', 'open_to_mentor', 'availability_status',
      'is_private', 'onboarding_completed', 'skipped_profile_setup', 'skipped_interests',
      'skipped_follow_suggestions', 'membership_tiers'
    ]
    read_only_fields = ["followers", "featured_video"]
    extra_kwargs = {
      'avatar': {'required': False, 'allow_blank': True }
    }

class PublicProfileSerializer(serializers.ModelSerializer):
  featured_video = FeaturedVideoSerializer(read_only=True)

  class Meta:
    model = Profile
    fields = [
      'avatar', 'bio', 'followers', 'skill_tags', 'featured_video',
      'website_url', 'twitter_url', 'linkedin_url',
      'open_to_collab', 'open_to_hire', 'open_to_mentor', 'availability_status', 'is_private',
      'membership_tiers'
    ]
    read_only_fields = [
      'avatar', 'bio', 'followers', 'skill_tags', 'featured_video',
      'website_url', 'twitter_url', 'linkedin_url',
      'open_to_collab', 'open_to_hire', 'open_to_mentor', 'availability_status', 'is_private',
      'membership_tiers'
    ]

class UserDetailSerializer(serializers.ModelSerializer):
  profile = ProfileSerializer(read_only=True)
  following_count = serializers.SerializerMethodField()
  follower_count = serializers.SerializerMethodField()

  class Meta:
    model = UserAccount
    fields = ('id', 'email', 
              'first_name',
              'last_name', 'username','is_active', 
              'is_deactivated', 'date_joined', 'profile', 'following_count', 'follower_count'
            )

  def get_following_count(self, obj):
    return obj.following_relationships.count()

  def get_follower_count(self, obj):
    return obj.follower_relationships.count()

class UserPublicSerializer(serializers.ModelSerializer):
  profile = PublicProfileSerializer(read_only=True)
  is_following = serializers.SerializerMethodField()
  following_count = serializers.SerializerMethodField()
  follower_count = serializers.SerializerMethodField()

  class Meta:
    model = UserAccount
    fields = ('id', 'username', 'first_name', 'last_name', 'profile', 'is_following', 'following_count', 'follower_count')

  def get_is_following(self, obj):
    request = self.context.get("request")
    if not request or not request.user.is_authenticated or request.user.id == obj.id:
      return False
    return UserFollow.objects.filter(follower=request.user, following=obj).exists()

  def get_following_count(self, obj):
    return obj.following_relationships.count()

  def get_follower_count(self, obj):
    return obj.follower_relationships.count()
                
class UserReportSerializer(serializers.ModelSerializer):
  class Meta:
    model = UserReport
    fields = ['id', 'reporter', 'reported', 'report_type', 'details', 'status', 'created_at']
    read_only_fields = ['id', 'reporter', 'reported', 'status', 'created_at']


class CollabApplicationSerializer(serializers.ModelSerializer):
  applicant = UserPublicSerializer(read_only=True)

  class Meta:
    model = CollabApplication
    fields = ['id', 'applicant', 'pitch', 'status', 'created_at', 'updated_at']
    read_only_fields = ['id', 'applicant', 'status', 'created_at', 'updated_at']

  def validate_pitch(self, value):
    return value.strip()


class CollabRequestSerializer(serializers.ModelSerializer):
  creator = UserPublicSerializer(read_only=True)
  application_count = serializers.SerializerMethodField()
  my_application = serializers.SerializerMethodField()
  applications = serializers.SerializerMethodField()

  class Meta:
    model = CollabRequest
    fields = [
      'id', 'creator', 'request_type', 'title', 'description', 'skills', 'budget',
      'status', 'created_at', 'updated_at', 'application_count', 'my_application', 'applications'
    ]
    read_only_fields = ['id', 'creator', 'created_at', 'updated_at', 'application_count', 'my_application', 'applications']

  def validate_title(self, value):
    if not value.strip():
      raise serializers.ValidationError("Title is required.")
    return value.strip()

  def validate_description(self, value):
    return value.strip()

  def validate_skills(self, value):
    return value.strip()

  def validate_budget(self, value):
    return value.strip()

  def get_application_count(self, obj):
    return obj.applications.count()

  def get_my_application(self, obj):
    request = self.context.get("request")
    if not request or not request.user.is_authenticated:
      return None
    application = obj.applications.filter(applicant=request.user).first()
    if not application:
      return None
    return CollabApplicationSerializer(application, context=self.context).data

  def get_applications(self, obj):
    request = self.context.get("request")
    if not request or not request.user.is_authenticated or obj.creator_id != request.user.id:
      return []
    applications = obj.applications.select_related("applicant", "applicant__profile").all()
    return CollabApplicationSerializer(applications, many=True, context=self.context).data


class BookingRequestSerializer(serializers.ModelSerializer):
  requester = UserPublicSerializer(read_only=True)

  class Meta:
    model = BookingRequest
    fields = ['id', 'requester', 'message', 'status', 'created_at', 'updated_at']
    read_only_fields = ['id', 'requester', 'status', 'created_at', 'updated_at']

  def validate_message(self, value):
    return value.strip()


class BookingSlotSerializer(serializers.ModelSerializer):
  creator = UserPublicSerializer(read_only=True)
  request_count = serializers.SerializerMethodField()
  my_request = serializers.SerializerMethodField()
  requests = serializers.SerializerMethodField()

  class Meta:
    model = BookingSlot
    fields = [
      'id', 'creator', 'starts_at', 'duration_minutes', 'purpose', 'note', 'is_active',
      'created_at', 'request_count', 'my_request', 'requests'
    ]
    read_only_fields = ['id', 'creator', 'created_at', 'request_count', 'my_request', 'requests']

  def validate_note(self, value):
    return value.strip()

  def get_request_count(self, obj):
    return obj.booking_requests.count()

  def get_my_request(self, obj):
    request = self.context.get("request")
    if not request or not request.user.is_authenticated:
      return None
    booking_request = obj.booking_requests.filter(requester=request.user).first()
    if not booking_request:
      return None
    return BookingRequestSerializer(booking_request, context=self.context).data

  def get_requests(self, obj):
    request = self.context.get("request")
    if not request or not request.user.is_authenticated or obj.creator_id != request.user.id:
      return []
    requests = obj.booking_requests.select_related("requester", "requester__profile").all()
    return BookingRequestSerializer(requests, many=True, context=self.context).data


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        username_or_email = attrs.get("email")
        password = attrs.get("password")

        try:
           user_obj = UserAccount.objects.get(email=username_or_email)
        except UserAccount.DoesNotExist:
           raise serializers.ValidationError({"email": "No user with this email or username exists."})
        
        if not user_obj.check_password(password):
           raise serializers.ValidationError({
              "password": "Incorrect password."
           })
        
        data = super().validate(attrs)

        obj = self.user

        data.update({
            'id': obj.id,
            'first_name': obj.first_name,
            'last_name': obj.last_name, 
            'email': obj.email,
            'username': obj.username,
            'is_active': obj.is_active,
            'is_deactivated': obj.is_deactivated,
            'date_joined': obj.date_joined,
        })

        return data


class UserUpdateSerializer(serializers.ModelSerializer):
  bio = serializers.CharField(source="profile.bio", required=False, allow_blank=True)
  avatar = serializers.URLField(source="profile.avatar", required=False, allow_blank=True)
  skill_tags = serializers.CharField(source="profile.skill_tags", required=False, allow_blank=True, max_length=255)
  featured_video_id = serializers.PrimaryKeyRelatedField(
      source="profile.featured_video",
      queryset=Video.objects.all(),
      required=False,
      allow_null=True,
  )
  website_url = serializers.URLField(source="profile.website_url", required=False, allow_blank=True)
  twitter_url = serializers.URLField(source="profile.twitter_url", required=False, allow_blank=True)
  linkedin_url = serializers.URLField(source="profile.linkedin_url", required=False, allow_blank=True)
  open_to_collab = serializers.BooleanField(source="profile.open_to_collab", required=False)
  open_to_hire = serializers.BooleanField(source="profile.open_to_hire", required=False)
  open_to_mentor = serializers.BooleanField(source="profile.open_to_mentor", required=False)
  availability_status = serializers.ChoiceField(source="profile.availability_status", required=False, choices=Profile.AVAILABILITY_CHOICES)
  is_private = serializers.BooleanField(source="profile.is_private", required=False)
  onboarding_completed = serializers.BooleanField(source="profile.onboarding_completed", required=False)
  skipped_profile_setup = serializers.BooleanField(source="profile.skipped_profile_setup", required=False)
  skipped_interests = serializers.BooleanField(source="profile.skipped_interests", required=False)
  skipped_follow_suggestions = serializers.BooleanField(source="profile.skipped_follow_suggestions", required=False)
  membership_tiers = serializers.JSONField(source="profile.membership_tiers", required=False)

  class Meta:
    model = UserAccount
    fields = [
      "first_name", "last_name", "username", "bio", "avatar", "skill_tags",
      "featured_video_id", "website_url", "twitter_url", "linkedin_url",
      "open_to_collab", "open_to_hire", "open_to_mentor", "availability_status", "is_private",
      "onboarding_completed", "skipped_profile_setup", "skipped_interests", "skipped_follow_suggestions",
      "membership_tiers"
    ]
  
  def validate_featured_video_id(self, value):
    user = self.instance
    if value is not None and value.uploader_id != user.id:
      raise serializers.ValidationError("Featured video must belong to your account.")
    return value

  def update(self, instance, validated_data):
    # Extract profile data from source mapping
    profile_data = {}
    if "profile" in validated_data:
        profile_data = validated_data.pop("profile")

    # Update UserAccount fields
    for attr, value in validated_data.items():
      setattr(instance, attr, value)
    instance.save()

    # Update Profile fields
    profile = instance.profile
    for attr, value in profile_data.items():
      setattr(profile, attr, value)
    profile.save()

    return instance
    
class UserDeleteSerializer(serializers.ModelSerializer):
  class Meta:
    model = UserAccount
    fields = ['id']
    
  def delete(self, validated_data):
    user = UserAccount.objects.get(id=validated_data['id'])
    user.delete()
    return user


class DirectMessageSerializer(serializers.ModelSerializer):
  sender = UserPublicSerializer(read_only=True)
  is_own = serializers.SerializerMethodField()
  reply_to = serializers.SerializerMethodField()
  reaction_counts = serializers.SerializerMethodField()
  my_reaction = serializers.SerializerMethodField()

  class Meta:
    model = DirectMessage
    fields = ["id", "sender", "reply_to", "body", "message_type", "audio_url", "audio_duration_ms", "audio_transcript", "reaction_counts", "my_reaction", "created_at", "read_at", "is_own"]
    read_only_fields = ["id", "sender", "created_at", "read_at", "is_own"]

  def get_is_own(self, obj):
    request = self.context.get("request")
    return bool(request and request.user.is_authenticated and obj.sender_id == request.user.id)

  def get_reply_to(self, obj):
    if not obj.reply_to:
      return None

    return {
      "id": str(obj.reply_to.id),
      "body": obj.reply_to.body,
      "message_type": obj.reply_to.message_type,
      "audio_url": obj.reply_to.audio_url,
      "audio_duration_ms": obj.reply_to.audio_duration_ms,
      "audio_transcript": obj.reply_to.audio_transcript,
      "sender": UserPublicSerializer(obj.reply_to.sender, context=self.context).data,
    }

  def get_reaction_counts(self, obj):
    counts = {reaction: 0 for reaction, _ in DirectMessageReaction.ALLOWED_REACTIONS}
    for reaction in obj.reactions.all():
      counts[reaction.reaction] = counts.get(reaction.reaction, 0) + 1
    return counts

  def get_my_reaction(self, obj):
    request = self.context.get("request")
    if not request or not request.user.is_authenticated:
      return None
    reaction = obj.reactions.filter(user=request.user).first()
    return reaction.reaction if reaction else None


class DirectConversationSerializer(serializers.ModelSerializer):
  other_user = serializers.SerializerMethodField()
  last_message = serializers.SerializerMethodField()
  last_call = serializers.SerializerMethodField()
  last_activity_at = serializers.SerializerMethodField()
  unread_count = serializers.SerializerMethodField()
  last_message_at = serializers.DateTimeField(read_only=True)

  class Meta:
    model = DirectConversation
    fields = ["id", "other_user", "last_message", "last_call", "last_activity_at", "unread_count", "last_message_at", "created_at"]
    read_only_fields = ["id", "other_user", "last_message", "last_call", "last_activity_at", "unread_count", "last_message_at", "created_at"]

  def get_other_user(self, obj):
    request = self.context.get("request")
    if not request or not request.user.is_authenticated:
      return None

    other_user = obj.user_two if obj.user_one_id == request.user.id else obj.user_one
    return UserPublicSerializer(other_user, context=self.context).data

  def get_last_message(self, obj):
    message = getattr(obj, "_prefetched_last_message", None)
    if message is None:
      message = obj.messages.select_related("sender", "sender__profile").order_by("-created_at").first()
    if not message:
      return None
    return DirectMessageSerializer(message, context=self.context).data

  def get_last_call(self, obj):
    call = getattr(obj, "_prefetched_last_call", None)
    request = self.context.get("request")
    if call is None and request and request.user.is_authenticated:
      other_user = obj.user_two if obj.user_one_id == request.user.id else obj.user_one
      call = Call.objects.filter(
        models.Q(caller=request.user, callee=other_user)
        | models.Q(caller=other_user, callee=request.user)
      ).select_related("caller", "callee", "caller__profile", "callee__profile").order_by("-created_at").first()
    if not call:
      return None
    return {
      "id": str(call.id),
      "caller": UserPublicSerializer(call.caller, context=self.context).data,
      "callee": UserPublicSerializer(call.callee, context=self.context).data,
      "call_type": call.call_type,
      "status": call.status,
      "started_at": call.started_at.isoformat() if call.started_at else None,
      "ended_at": call.ended_at.isoformat() if call.ended_at else None,
      "created_at": call.created_at.isoformat(),
    }

  def get_last_activity_at(self, obj):
    activity_at = getattr(obj, "_last_activity_at", None)
    if activity_at:
      return activity_at.isoformat()

    message = getattr(obj, "_prefetched_last_message", None)
    call = getattr(obj, "_prefetched_last_call", None)
    candidates = [obj.last_message_at]
    if message:
      candidates.append(message.created_at)
    if call:
      candidates.append(call.created_at)
    return max(candidates).isoformat()

  def get_unread_count(self, obj):
    unread_count = getattr(obj, "_unread_count", None)
    if unread_count is not None:
      return unread_count

    request = self.context.get("request")
    if not request or not request.user.is_authenticated:
      return 0

    return obj.messages.filter(read_at__isnull=True).exclude(sender=request.user).count()


class NotificationSerializer(serializers.ModelSerializer):
  actor = UserPublicSerializer(read_only=True)

  class Meta:
    model = Notification
    fields = ["id", "notification_type", "title", "body", "target_url", "is_read", "created_at", "actor"]
    read_only_fields = fields
