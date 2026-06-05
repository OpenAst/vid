import uuid
import base64
import boto3
import hmac
import json
import logging
import os
import time
import subprocess
import tempfile
import threading
import requests
from datetime import timedelta
from hashlib import sha1
from urllib.parse import urljoin
from botocore.config import Config
from django.conf import settings
from rest_framework import status
from django.db.models import Avg, Case, Count, F, IntegerField, Q, Sum, Value, When
from django.utils import timezone
from django.http import JsonResponse
from django.shortcuts import get_object_or_404
from rest_framework.response import Response
from rest_framework import generics, permissions, viewsets
from rest_framework.permissions import IsAuthenticated
from .models import Video, Comment, VideoVote, CommentVote, VideoView, VideoWatchProgress, Call, SavedVideo, SavedCollection, SavedCollectionItem
from .serializers import VideoSerializer, CommentSerializer, VideoVoteSerializer, CommentVoteSerializer, UserPublicSerializer, CallSerializer
from rest_framework.pagination import PageNumberPagination
from accounts.permissions import IsOwnerOrReadOnly
from django.views.decorators.csrf import csrf_exempt
from rest_framework.decorators import api_view, permission_classes
from rest_framework.parsers import JSONParser, MultiPartParser
from accounts.models import UserAccount, PushSubscription, UserFollow, Notification, UserBlock
from accounts.push import send_call_push_notification

logger = logging.getLogger(__name__)

class VideoPagination(PageNumberPagination):
  page_size = 10
  page_size_query_param = 'limit'
  max_page_size = 100


def serialize_comment_for_request(comment, request):
    return CommentSerializer(comment, context={"request": request}).data


def get_room_comments(room_id, request):
    comments = (
        Comment.objects.filter(video_id=room_id, parent__isnull=True)
        .select_related("user", "user__profile", "video")
        .prefetch_related(
            "votes",
            "replies__votes",
            "replies__user",
            "replies__user__profile",
        )
        .order_by("-is_pinned", "created_at")
    )

    serialized_comments = []
    for comment in comments:
        data = serialize_comment_for_request(comment, request)
        data["replies"] = [
            serialize_comment_for_request(reply, request)
            for reply in comment.replies.all().order_by("created_at")
        ]
        serialized_comments.append(data)
    return serialized_comments


def notify_realtime_server(event_type, payload):
    if not settings.REALTIME_SERVER_INTERNAL_URL or not settings.REALTIME_INTERNAL_SECRET:
        return

    endpoint = urljoin(settings.REALTIME_SERVER_INTERNAL_URL.rstrip("/") + "/", "internal/events")

    try:
        requests.post(
            endpoint,
            json={"type": event_type, **payload},
            headers={"Authorization": f"Bearer {settings.REALTIME_INTERNAL_SECRET}"},
            timeout=3,
        )
    except requests.RequestException:
        logger.exception("Failed to notify realtime server")

class VideoUploadView(generics.CreateAPIView):
    serializer_class = VideoSerializer
    permission_classes = [IsAuthenticated]
    parser_classes = [JSONParser]

    def create(self, request, *args, **kwargs):
        logger = logging.getLogger(__name__)
        print("Request data:", request.data)

        try:
            # Validate required fields
            required_fields = ['title', 'description', 'file_url']
            missing = [f for f in required_fields if f not in request.data]
            
            if missing:
                return Response(
                    {"error": f"Missing required fields: {missing}"},
                    status=status.HTTP_400_BAD_REQUEST
                )

            data = {
                "title": request.data.get("title"),
                "description": request.data.get("description", ""),
                "skill_category": request.data.get("skill_category") or "general",
                "file_url": request.data.get("file_url"),
                "music_url": request.data.get("music_url"),
            }
            
            serializer = self.get_serializer(data=data)

            if not serializer.is_valid():
                logger.error("Validation errors: %s", serializer.errors)
                return Response(serializer.errors, status=400)

            self.perform_create(serializer)
            video_instance = serializer.instance
            
            # Trigger thumbnail extraction in the background
            threading.Thread(
                target=extract_and_upload_thumbnail, 
                args=(video_instance.file_url, video_instance)
            ).start()

            if video_instance.music_url:
                video_instance.processing_status = "processing"
                video_instance.save(update_fields=["processing_status"])
                threading.Thread(
                    target=mix_music_and_upload_video,
                    args=(video_instance.id,)
                ).start()

            return Response(serializer.data, status=status.HTTP_201_CREATED)

            
        except Exception as e:

            logger.exception("Exception occurred during video metadata upload")

            return Response(
                {
                    "error": "Metadata upload failed",
                    "details": str(e)
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
            
    def perform_create(self, serializer):
        serializer.save(uploader=self.request.user)

class VideoListView(generics.ListAPIView):
  serializer_class = VideoSerializer
  permission_classes = [permissions.IsAuthenticatedOrReadOnly]
  pagination_class = VideoPagination
  
  def get_serializer_context(self):
    return {"request": self.request}
  
  def get_queryset(self):
    queryset = Video.objects.all()
    search_query = self.request.query_params.get('search', None)
    username = self.request.query_params.get('username', None)
    feed = self.request.query_params.get('feed', None)
    category = self.request.query_params.get('category', None)
    
    if search_query:
      queryset = queryset.filter(
        Q(title__icontains=search_query) | 
        Q(description__icontains=search_query)
      )
    
    if self.request.user.is_authenticated:
      blocked_user_ids = UserBlock.objects.filter(blocker=self.request.user).values_list("blocked_id", flat=True)
      blocked_by_ids = UserBlock.objects.filter(blocked=self.request.user).values_list("blocker_id", flat=True)
      queryset = queryset.exclude(uploader_id__in=blocked_user_ids)
      queryset = queryset.exclude(uploader_id__in=blocked_by_ids)

    if username:
      if self.request.user.is_authenticated:
        user = UserAccount.objects.filter(username=username, is_active=True).select_related("profile").first()
      else:
        user = UserAccount.objects.filter(username=username, is_active=True).select_related("profile").first()
      if user and user.profile.is_private:
        if not self.request.user.is_authenticated or not UserFollow.objects.filter(follower=self.request.user, following=user).exists():
          return queryset.none()
      queryset = queryset.filter(uploader__username=username)

    if category:
      queryset = queryset.filter(skill_category__iexact=category)

    if feed == "following":
      if not self.request.user.is_authenticated:
        return queryset.none()

      followed_user_ids = UserFollow.objects.filter(
        follower=self.request.user
      ).values_list("following_id", flat=True)
      queryset = queryset.filter(uploader_id__in=followed_user_ids)

    if feed == "for-you" or not feed:
      followed_user_ids = []
      category_interest_values = []

      if self.request.user.is_authenticated:
        followed_user_ids = list(
          UserFollow.objects.filter(follower=self.request.user).values_list("following_id", flat=True)
        )
        category_interest_values = list(
          Video.objects.filter(
            Q(saved_by__user=self.request.user)
            | Q(votes__user=self.request.user, votes__value=1)
            | Q(watch_progress__user=self.request.user, watch_progress__completed=True)
          )
          .exclude(skill_category="")
          .values("skill_category")
          .annotate(signal_count=Count("id"))
          .order_by("-signal_count")
          .values_list("skill_category", flat=True)[:5]
        )

      queryset = queryset.annotate(
        like_count=Count("votes", filter=Q(votes__value=1), distinct=True),
        comment_count_value=Count("comments", distinct=True),
        save_count=Count("saved_by", distinct=True),
        completion_count=Count("watch_progress", filter=Q(watch_progress__completed=True), distinct=True),
        viewer_completed_count=Count(
          "watch_progress",
          filter=Q(watch_progress__user=self.request.user, watch_progress__completed=True)
          if self.request.user.is_authenticated else Q(pk__isnull=True),
          distinct=True,
        ),
        viewer_disliked_count=Count(
          "votes",
          filter=Q(votes__user=self.request.user, votes__value=-1)
          if self.request.user.is_authenticated else Q(pk__isnull=True),
          distinct=True,
        ),
        freshness_boost=Case(
          When(created_at__gte=timezone.now() - timedelta(days=2), then=Value(30)),
          When(created_at__gte=timezone.now() - timedelta(days=7), then=Value(15)),
          default=Value(0),
          output_field=IntegerField(),
        ),
        followed_boost=Case(
          When(uploader_id__in=followed_user_ids, then=Value(18)),
          default=Value(0),
          output_field=IntegerField(),
        ),
        category_match_boost=Case(
          When(skill_category__in=category_interest_values, then=Value(16)),
          default=Value(0),
          output_field=IntegerField(),
        ),
      ).annotate(
        feed_score=(
          (F("like_count") * 8)
          + (F("comment_count_value") * 6)
          + (F("save_count") * 10)
          + (F("completion_count") * 12)
          + F("views")
          + F("freshness_boost")
          + F("followed_boost")
          + F("category_match_boost")
          - (F("viewer_completed_count") * 30)
          - (F("viewer_disliked_count") * 80)
        )
      ).order_by("-feed_score", "-created_at")
    else:
      queryset = queryset.order_by("-created_at")
      
    return queryset

class VideoDetailView(generics.RetrieveAPIView):
  serializer_class = VideoSerializer
  permission_classes = [permissions.AllowAny]    

  def get_queryset(self):
    return Video.objects.order_by('-created_at')


class SavedVideoListAPIView(generics.ListAPIView):
  serializer_class = VideoSerializer
  permission_classes = [IsAuthenticated]
  pagination_class = VideoPagination

  def get_queryset(self):
    return (
      Video.objects.filter(saved_by__user=self.request.user)
      .select_related("uploader")
      .order_by("-saved_by__created_at")
    )


class SavedVideoToggleAPIView(generics.GenericAPIView):
  permission_classes = [IsAuthenticated]

  def post(self, request, video_id):
    video = get_object_or_404(Video, id=video_id)
    SavedVideo.objects.get_or_create(user=request.user, video=video)
    return Response({"video_id": str(video.id), "saved": True}, status=status.HTTP_200_OK)

  def delete(self, request, video_id):
    video = get_object_or_404(Video, id=video_id)
    SavedVideo.objects.filter(user=request.user, video=video).delete()
    return Response({"video_id": str(video.id), "saved": False}, status=status.HTTP_200_OK)


def serialize_saved_collection(collection):
  return {
    "id": str(collection.id),
    "name": collection.name,
    "count": getattr(collection, "item_count", collection.items.count()),
    "created_at": collection.created_at.isoformat(),
  }


class SavedCollectionListCreateAPIView(generics.GenericAPIView):
  permission_classes = [IsAuthenticated]

  def get(self, request):
    collections = (
      SavedCollection.objects.filter(user=request.user)
      .annotate(item_count=Count("items", distinct=True))
      .order_by("-created_at")
    )
    return Response({"results": [serialize_saved_collection(collection) for collection in collections]}, status=status.HTTP_200_OK)

  def post(self, request):
    name = (request.data.get("name") or "").strip()
    if not name:
      return Response({"detail": "Collection name is required"}, status=status.HTTP_400_BAD_REQUEST)
    if len(name) > 80:
      return Response({"detail": "Collection name is too long"}, status=status.HTTP_400_BAD_REQUEST)

    collection, created = SavedCollection.objects.get_or_create(user=request.user, name=name)
    status_code = status.HTTP_201_CREATED if created else status.HTTP_200_OK
    return Response(serialize_saved_collection(collection), status=status_code)


class SavedCollectionDetailAPIView(generics.GenericAPIView):
  permission_classes = [IsAuthenticated]

  def get_collection(self):
    return get_object_or_404(SavedCollection, id=self.kwargs["collection_id"], user=self.request.user)

  def get(self, request, collection_id):
    collection = self.get_collection()
    videos = (
      Video.objects.filter(saved_by__collection_items__collection=collection)
      .select_related("uploader")
      .order_by("-saved_by__collection_items__created_at")
    )
    serializer = VideoSerializer(videos, many=True, context={"request": request})
    return Response(
      {
        "collection": serialize_saved_collection(collection),
        "results": serializer.data,
      },
      status=status.HTTP_200_OK,
    )

  def delete(self, request, collection_id):
    collection = self.get_collection()
    collection.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)


class SavedCollectionItemAPIView(generics.GenericAPIView):
  permission_classes = [IsAuthenticated]

  def get_collection(self):
    return get_object_or_404(SavedCollection, id=self.kwargs["collection_id"], user=self.request.user)

  def post(self, request, collection_id, video_id):
    collection = self.get_collection()
    video = get_object_or_404(Video, id=video_id)
    saved_video, _ = SavedVideo.objects.get_or_create(user=request.user, video=video)
    SavedCollectionItem.objects.get_or_create(collection=collection, saved_video=saved_video)
    return Response({"added": True, "collection_id": str(collection.id), "video_id": str(video.id)}, status=status.HTTP_200_OK)

  def delete(self, request, collection_id, video_id):
    collection = self.get_collection()
    SavedCollectionItem.objects.filter(
      collection=collection,
      saved_video__user=request.user,
      saved_video__video_id=video_id,
    ).delete()
    return Response({"removed": True, "collection_id": str(collection.id), "video_id": str(video_id)}, status=status.HTTP_200_OK)


def serialize_watch_progress(progress, request):
  video_data = VideoSerializer(progress.video, context={"request": request}).data
  return {
    "id": str(progress.id),
    "video": video_data,
    "progress_seconds": progress.progress_seconds,
    "duration_seconds": progress.duration_seconds,
    "completed": progress.completed,
    "updated_at": progress.updated_at.isoformat(),
  }


class WatchHistoryAPIView(generics.GenericAPIView):
  permission_classes = [IsAuthenticated]

  def get(self, request):
    progress = (
      VideoWatchProgress.objects.filter(user=request.user)
      .select_related("video", "video__uploader")
      .order_by("-updated_at")[:80]
    )
    return Response({"results": [serialize_watch_progress(item, request) for item in progress]}, status=status.HTTP_200_OK)

  def delete(self, request):
    VideoWatchProgress.objects.filter(user=request.user).delete()
    return Response(status=status.HTTP_204_NO_CONTENT)


class VideoWatchProgressAPIView(generics.GenericAPIView):
  permission_classes = [IsAuthenticated]

  def post(self, request, video_id):
    video = get_object_or_404(Video, id=video_id)
    try:
      progress_seconds = max(float(request.data.get("progress_seconds") or 0), 0)
      duration_seconds = max(float(request.data.get("duration_seconds") or 0), 0)
    except (TypeError, ValueError):
      return Response({"detail": "Invalid progress values"}, status=status.HTTP_400_BAD_REQUEST)

    completed = bool(request.data.get("completed"))
    if duration_seconds > 0:
      completed = completed or progress_seconds >= max(duration_seconds - 2, duration_seconds * 0.95)
      if completed:
        progress_seconds = duration_seconds

    progress, _ = VideoWatchProgress.objects.update_or_create(
      user=request.user,
      video=video,
      defaults={
        "progress_seconds": progress_seconds,
        "duration_seconds": duration_seconds,
        "completed": completed,
      },
    )
    return Response(serialize_watch_progress(progress, request), status=status.HTTP_200_OK)


class CreatorAnalyticsAPIView(generics.GenericAPIView):
  permission_classes = [IsAuthenticated]

  def get(self, request):
    videos = Video.objects.filter(uploader=request.user)
    total_videos = videos.count()
    total_views = videos.aggregate(total_views=Sum("views")).get("total_views") or 0
    total_likes = VideoVote.objects.filter(video__uploader=request.user, value=1).count()
    total_comments = Comment.objects.filter(video__uploader=request.user).count()
    total_saves = SavedVideo.objects.filter(video__uploader=request.user).count()
    progress_queryset = VideoWatchProgress.objects.filter(video__uploader=request.user)
    total_watchers = progress_queryset.count()
    completed_watches = progress_queryset.filter(completed=True).count()
    average_progress = progress_queryset.aggregate(value=Avg("progress_seconds")).get("value") or 0

    follower_count = UserFollow.objects.filter(following=request.user).count()
    completion_rate = round((completed_watches / total_watchers) * 100) if total_watchers else 0

    top_videos = (
      videos.annotate(
        like_count=Count("votes", filter=Q(votes__value=1), distinct=True),
        comment_count=Count("comments", distinct=True),
        save_count=Count("saved_by", distinct=True),
        watcher_count=Count("watch_progress", distinct=True),
        completed_count=Count("watch_progress", filter=Q(watch_progress__completed=True), distinct=True),
        avg_progress=Avg("watch_progress__progress_seconds"),
      )
      .order_by("-views", "-like_count", "-comment_count", "-created_at")[:8]
    )

    top_clip_data = []
    for video in top_videos:
      watcher_count = getattr(video, "watcher_count", 0) or 0
      completed_count = getattr(video, "completed_count", 0) or 0
      top_clip_data.append({
        "id": str(video.id),
        "title": video.title,
        "thumbnail_url": VideoSerializer(video, context={"request": request}).data.get("thumbnail_url"),
        "views": video.views,
        "likes": getattr(video, "like_count", 0) or 0,
        "comments": getattr(video, "comment_count", 0) or 0,
        "saves": getattr(video, "save_count", 0) or 0,
        "watchers": watcher_count,
        "completion_rate": round((completed_count / watcher_count) * 100) if watcher_count else 0,
        "average_progress": round(getattr(video, "avg_progress", 0) or 0, 1),
        "created_at": video.created_at.isoformat(),
      })

    return Response({
      "summary": {
        "total_videos": total_videos,
        "total_views": total_views,
        "total_likes": total_likes,
        "total_comments": total_comments,
        "total_saves": total_saves,
        "followers": follower_count,
        "watchers": total_watchers,
        "completion_rate": completion_rate,
        "average_progress": round(average_progress, 1),
      },
      "top_videos": top_clip_data,
    }, status=status.HTTP_200_OK)


def escape_ffmpeg_drawtext(value):
    return str(value or "").replace("\\", "\\\\").replace(":", "\\:").replace("'", "\\'")


def get_public_storage_url(key):
    if hasattr(settings, "AWS_S3_CUSTOM_DOMAIN") and settings.AWS_S3_CUSTOM_DOMAIN:
        return f"https://{settings.AWS_S3_CUSTOM_DOMAIN}/{key}"
    return f"{settings.AWS_S3_ENDPOINT_URL}/{settings.AWS_STORAGE_BUCKET_NAME}/{key}"


def get_video_storage_client():
    return boto3.client(
        's3',
        endpoint_url=settings.AWS_S3_ENDPOINT_URL,
        aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
        aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
        region_name='auto',
        config=Config(
            signature_version='s3v4',
            s3={'addressing_style': 'path'}
        )
    )


class WatermarkedVideoExportAPIView(generics.GenericAPIView):
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def post(self, request, video_id, *args, **kwargs):
        video = get_object_or_404(
            Video.objects.select_related("uploader"),
            pk=video_id,
        )
        key = f"watermarked/{video.uploader_id}/{video.id}.mp4"
        public_url = get_public_storage_url(key)
        s3 = get_video_storage_client()

        try:
            s3.head_object(Bucket=settings.AWS_STORAGE_BUCKET_NAME, Key=key)
            return Response({"watermarked_url": public_url}, status=status.HTTP_200_OK)
        except Exception:
            pass

        temp_video = None
        temp_output = None
        try:
            temp_video = download_to_temp_file(video.file_url, ".mp4")
            temp_output = tempfile.NamedTemporaryFile(suffix=".mp4", delete=False).name
            creator_handle = f"@{video.uploader.username or 'creator'}"
            brand_text = escape_ffmpeg_drawtext("OneClyq")
            creator_text = escape_ffmpeg_drawtext(creator_handle)
            watermark_filter = (
                "drawtext=text='"
                + brand_text
                + "':x=24:y=24:fontsize=28:fontcolor=white:"
                + "box=1:boxcolor=black@0.42:boxborderw=12,"
                + "drawtext=text='"
                + creator_text
                + "':x=24:y=78:fontsize=22:fontcolor=white:"
                + "box=1:boxcolor=black@0.32:boxborderw=10"
            )

            subprocess.run(
                [
                    'ffmpeg',
                    '-y',
                    '-i',
                    temp_video,
                    '-vf',
                    watermark_filter,
                    '-c:v',
                    'libx264',
                    '-preset',
                    'veryfast',
                    '-crf',
                    '23',
                    '-c:a',
                    'copy',
                    '-movflags',
                    '+faststart',
                    temp_output,
                ],
                check=True,
                capture_output=True,
                text=True,
            )

            with open(temp_output, 'rb') as f:
                s3.put_object(
                    Bucket=settings.AWS_STORAGE_BUCKET_NAME,
                    Key=key,
                    Body=f,
                    ACL='public-read',
                    ContentType='video/mp4'
                )

            return Response({"watermarked_url": public_url}, status=status.HTTP_201_CREATED)
        except Exception as exc:
            logger.exception("Failed to create watermarked export for video %s", video_id)
            return Response(
                {"detail": "Watermarked export failed", "error": str(exc)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
        finally:
            for temp_path in (temp_video, temp_output):
                try:
                    if temp_path and os.path.exists(temp_path):
                        os.remove(temp_path)
                except OSError:
                    logger.exception("Failed to clean up watermarked export temp file")

class CommentListAPIView(generics.ListAPIView):
   serializer_class = CommentSerializer
   permission_classes = [permissions.AllowAny]

   def get_queryset(self):
      video_id = self.kwargs['video_id']
      return Comment.objects.filter(video_id=video_id).order_by('-created_at')

class CommentCreateAPIView(generics.CreateAPIView):
   serializer_class = CommentSerializer
   permission_classes = [permissions.IsAuthenticated]

   def perform_create(self, serializer):
      video_id = self.kwargs['video_id']
      serializer.save(user=self.request.user, video_id=video_id)

class CommentDetailAPIView(generics.RetrieveAPIView):
    queryset = Comment.objects.all()
    serializer_class = CommentSerializer
    permission_classes = [permissions.AllowAny]
    lookup_field = "pk"

class CommentUpdateAPIView(generics.UpdateAPIView):
    queryset = Comment.objects.all()
    serializer_class = CommentSerializer
    permission_classes = [permissions.IsAuthenticated, IsOwnerOrReadOnly]
    lookup_field = "pk"


class CommentDeleteAPIView(generics.DestroyAPIView):
    queryset = Comment.objects.all()
    serializer_class = CommentSerializer
    permission_classes = [permissions.IsAuthenticated, IsOwnerOrReadOnly]
    lookup_field = "pk"

class VideoVoteAPIView(generics.CreateAPIView):
    serializer = VideoVoteSerializer
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, *args, **kwargs):
        video_id = request.data.get("video")
        value = int(request.data.get("value", 0))

        if value not in [1, -1]:
            return Response({"detail": "Invalid vote vallue"}, status=status.HTTP_400_BAD_REQUEST)
        
        existing_vote = VideoVote.objects.filter(video_id=video_id, user=request.user).first()

        if existing_vote:
            if existing_vote.value == value:
                existing_vote.delete()
                return Response({"detail": "Vote removed", "value": "0"}, status=status.HTTP_200_OK)
            else:
                existing_vote.value = value
                existing_vote.save()
                return Response({"detail": "Vote updated", "value": value}, status=status.HTTP_200_OK)
        
        VideoVote.objects.create(video_id=video_id, user=request.user, value=value)
        return Response({"detail": "Vote recorded", "value": value}, status=status.HTTP_201_CREATED)

class CommentVoteAPIView(generics.CreateAPIView):
    serializer_class = CommentVoteSerializer
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, *args, **kwargs):
        comment_id = request.data.get("comment") or request.data.get("commentId")
        value = int(request.data.get("value", 1))

        print("Received data", request.data)
        
        if not comment_id:
            return Response({
                "detail": "Comment ID and vote value are required."
            }, status=status.HTTP_400_BAD_REQUEST
        )

        try:
            comment_uuid = uuid.UUID(comment_id)
        except (ValueError, TypeError):
            return Response({
                "detail": "Invalid comment ID format."
            }, status=status.HTTP_400_BAD_REQUEST)

        
        comment = get_object_or_404(Comment, pk=comment_uuid)


        existing_like = CommentVote.objects.filter(comment=comment, user=request.user, value=1).first()

        if existing_like:
            existing_like.delete()
            total_likes = CommentVote.objects.filter(comment=comment, value=1).count()

            return Response(
                {
                    "detail": "Like removed",
                    "liked": False,
                    "total_likes": total_likes
                }, status=status.HTTP_200_OK
            )

        CommentVote.objects.create(comment=comment, user=request.user, value=1)
        total_likes = CommentVote.objects.filter(comment=comment, value=1).count()

        return Response(
            {
                "detail": "Liked successfully",
                "liked": True,
                "total_likes": total_likes
            }, status=status.HTTP_201_CREATED
        )


class RealtimeAuthMeAPIView(generics.GenericAPIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, *args, **kwargs):
        return Response(UserPublicSerializer(request.user).data, status=status.HTTP_200_OK)


class RealtimeCommentHistoryAPIView(generics.GenericAPIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, *args, **kwargs):
        return Response(
            {"comments": get_room_comments(self.kwargs["video_id"], request)},
            status=status.HTTP_200_OK,
        )


class RealtimeCommentCreateAPIView(generics.GenericAPIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, *args, **kwargs):
        text = (request.data.get("text") or "").strip()
        if not text:
            return Response({"detail": "Comment text is required"}, status=status.HTTP_400_BAD_REQUEST)

        video = get_object_or_404(Video, pk=self.kwargs["video_id"])
        comment = Comment.objects.create(
            video=video,
            user=request.user,
            content=text,
        )
        comment = Comment.objects.select_related("user", "user__profile", "video").prefetch_related("votes").get(pk=comment.pk)
        return Response(
            {"comment": serialize_comment_for_request(comment, request)},
            status=status.HTTP_201_CREATED,
        )


class RealtimeReplyCreateAPIView(generics.GenericAPIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, *args, **kwargs):
        parent_id = request.data.get("parentId")
        text = (request.data.get("text") or "").strip()

        if not parent_id or not text:
            return Response({"detail": "parentId and text are required"}, status=status.HTTP_400_BAD_REQUEST)

        parent = get_object_or_404(Comment, pk=parent_id, video_id=self.kwargs["video_id"])
        reply = Comment.objects.create(
            video=parent.video,
            user=request.user,
            content=text,
            parent=parent,
        )
        reply = Comment.objects.select_related("user", "user__profile", "video", "parent").prefetch_related("votes").get(pk=reply.pk)
        return Response(
            {
                "parentId": str(parent.id),
                "reply": serialize_comment_for_request(reply, request),
            },
            status=status.HTTP_201_CREATED,
        )


class RealtimeCommentVoteToggleAPIView(generics.GenericAPIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, *args, **kwargs):
        comment_id = request.data.get("commentId")
        comment = get_object_or_404(Comment, pk=comment_id)

        existing_like = CommentVote.objects.filter(comment=comment, user=request.user, value=1).first()
        if existing_like:
            existing_like.delete()
            liked = False
        else:
            CommentVote.objects.create(comment=comment, user=request.user, value=1)
            liked = True

        likes = CommentVote.objects.filter(comment=comment, value=1).count()
        return Response(
            {
                "commentId": str(comment.id),
                "roomId": str(comment.video_id),
                "likes": likes,
                "liked": liked,
            },
            status=status.HTTP_200_OK,
        )


class CommentPinToggleAPIView(generics.GenericAPIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk, *args, **kwargs):
        comment = get_object_or_404(Comment.objects.select_related("video"), pk=pk, parent__isnull=True)
        if comment.video.uploader_id != request.user.id:
            return Response({"detail": "Only the video owner can pin comments."}, status=status.HTTP_403_FORBIDDEN)

        next_pinned = bool(request.data.get("is_pinned", not comment.is_pinned))
        if next_pinned:
            Comment.objects.filter(video=comment.video, parent__isnull=True, is_pinned=True).exclude(pk=comment.pk).update(is_pinned=False)

        comment.is_pinned = next_pinned
        comment.save(update_fields=["is_pinned"])
        return Response({"comment": serialize_comment_for_request(comment, request)}, status=status.HTTP_200_OK)


class RealtimeVideoVoteToggleAPIView(generics.GenericAPIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, *args, **kwargs):
        video_id = request.data.get("videoId")
        video = get_object_or_404(Video, pk=video_id)

        existing_vote = VideoVote.objects.filter(video=video, user=request.user).first()
        if existing_vote and existing_vote.value == 1:
            existing_vote.delete()
            liked = False
        elif existing_vote:
            existing_vote.value = 1
            existing_vote.save(update_fields=["value"])
            liked = True
        else:
            VideoVote.objects.create(video=video, user=request.user, value=1)
            liked = True

        likes = video.votes.filter(value=1).count()
        return Response(
            {
                "videoId": str(video.id),
                "likes": likes,
                "liked": liked,
            },
            status=status.HTTP_200_OK,
        )


class CallStartAPIView(generics.GenericAPIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, *args, **kwargs):
        callee_id = request.data.get("callee_id")
        call_type = request.data.get("call_type", "audio")

        if call_type not in {"audio", "video"}:
            return Response({"detail": "Invalid call type"}, status=status.HTTP_400_BAD_REQUEST)

        if not callee_id:
            return Response({"detail": "callee_id is required"}, status=status.HTTP_400_BAD_REQUEST)

        if str(request.user.id) == str(callee_id):
            return Response({"detail": "You cannot call yourself"}, status=status.HTTP_400_BAD_REQUEST)

        callee = get_object_or_404(UserAccount, pk=callee_id)
        call = Call.objects.create(caller=request.user, callee=callee, call_type=call_type)

        notification_payload = {
            "title": f"{request.user.username or request.user.first_name or 'Someone'} is calling",
            "body": f"Incoming {call_type} call on OneClyq",
            "tag": f"call-{call.id}",
            "url": "/",
            "callId": str(call.id),
            "callType": call_type,
            "caller": {
                "id": str(request.user.id),
                "username": request.user.username,
                "first_name": request.user.first_name,
                "last_name": request.user.last_name,
            },
        }

        for subscription in PushSubscription.objects.filter(user=callee):
            send_call_push_notification(subscription, notification_payload)

        return Response(CallSerializer(call).data, status=status.HTTP_201_CREATED)


class CallHistoryAPIView(generics.ListAPIView):
    serializer_class = CallSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        queryset = Call.objects.filter(
            Q(caller=self.request.user) | Q(callee=self.request.user)
        ).select_related("caller", "callee")

        peer_id = self.request.query_params.get("peer_id")
        if peer_id:
            try:
                uuid.UUID(str(peer_id))
            except ValueError:
                return queryset.none()

            queryset = queryset.filter(
                Q(caller=self.request.user, callee_id=peer_id)
                | Q(caller_id=peer_id, callee=self.request.user)
            )

        return queryset.order_by("-created_at")[:50]

    def list(self, request, *args, **kwargs):
        serializer = self.get_serializer(self.get_queryset(), many=True)
        return Response({"results": serializer.data}, status=status.HTTP_200_OK)


class CallActionAPIView(generics.GenericAPIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, call_id, action, *args, **kwargs):
        call = get_object_or_404(Call, pk=call_id)

        if request.user.id not in {call.caller_id, call.callee_id}:
            return Response({"detail": "Not allowed"}, status=status.HTTP_403_FORBIDDEN)

        from django.utils import timezone

        if action == "accept":
            if request.user != call.callee:
                return Response({"detail": "Only the callee can accept"}, status=status.HTTP_403_FORBIDDEN)
            if call.status != "ringing":
                return Response({"detail": "This call is no longer ringing"}, status=status.HTTP_400_BAD_REQUEST)
            call.status = "accepted"
            call.started_at = call.started_at or timezone.now()
            call.save(update_fields=["status", "started_at"])
        elif action == "reject":
            if request.user != call.callee:
                return Response({"detail": "Only the callee can reject"}, status=status.HTTP_403_FORBIDDEN)
            if call.status != "ringing":
                return Response(CallSerializer(call).data, status=status.HTTP_200_OK)
            call.status = "rejected"
            call.ended_at = timezone.now()
            call.save(update_fields=["status", "ended_at"])
        elif action == "missed":
            if call.status != "ringing":
                return Response(CallSerializer(call).data, status=status.HTTP_200_OK)
            call.status = "missed"
            call.ended_at = timezone.now()
            call.save(update_fields=["status", "ended_at"])
            display_name = call.caller.username or call.caller.first_name or "Someone"
            Notification.objects.create(
                recipient=call.callee,
                actor=call.caller,
                notification_type="call",
                title=f"Missed {call.call_type} call",
                body=f"@{display_name} tried to reach you.",
                target_url=f"/messages?user={call.caller_id}",
            )
        elif action == "end":
            call.status = "ended"
            call.ended_at = timezone.now()
            call.save(update_fields=["status", "ended_at"])
        else:
            return Response({"detail": "Invalid call action"}, status=status.HTTP_400_BAD_REQUEST)

        return Response(CallSerializer(call).data, status=status.HTTP_200_OK)


class TurnCredentialsAPIView(generics.GenericAPIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, *args, **kwargs):
        ttl = settings.TURN_CREDENTIAL_TTL_SECONDS
        expiry = int(time.time()) + ttl
        username = f"{expiry}:{request.user.id}"
        urls = settings.TURN_SERVER_URLS

        if isinstance(urls, str):
            urls = [item.strip() for item in urls.split(",") if item.strip()]

        stun_urls = [url for url in urls if isinstance(url, str) and url.startswith("stun:")]
        turn_urls = [url for url in urls if isinstance(url, str) and url.startswith("turn:")]
        ice_servers = []

        if settings.TURN_SHARED_SECRET:
            digest = hmac.new(
                settings.TURN_SHARED_SECRET.encode("utf-8"),
                username.encode("utf-8"),
                sha1,
            ).digest()
            credential = base64.b64encode(digest).decode("utf-8")
        else:
            credential = ""

        if stun_urls:
            ice_servers.append({
                "urls": stun_urls,
            })

        if turn_urls and username and credential:
            ice_servers.append({
                "urls": turn_urls,
                "username": username,
                "credential": credential,
            })

        return Response(
            {
                "ttl": ttl,
                "expires_at": expiry,
                "iceServers": ice_servers,
            },
            status=status.HTTP_200_OK,
        )

class VideoViewAPIView(generics.CreateAPIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request, *args, **kwargs):
        video_id = self.kwargs.get("video_id")
        video = get_object_or_404(Video, pk=video_id)

        try:
            user = request.user if request.user.is_authenticated else None
            ip_address = self.get_client_ip(request)
            session = getattr(request, "session", None)
            session_key = getattr(session, "session_key", "") or ""

            # Logic for unique views:
            # 1. If authenticated, check if this user has viewed this video in the last 24 hours.
            # 2. If anonymous, check if this IP has viewed this video in the last 24 hours.

            from django.utils import timezone
            from datetime import timedelta

            # Reduced window for testing/verification, can be increased later
            time_threshold = timezone.now() - timedelta(minutes=1)

            if user:
                already_viewed = VideoView.objects.filter(
                    video=video, user=user, created_at__gt=time_threshold
                ).exists()
            else:
                already_viewed = VideoView.objects.filter(
                    video=video, ip_address=ip_address, created_at__gt=time_threshold
                ).exists()

            if not already_viewed:
                VideoView.objects.create(
                    video=video,
                    user=user,
                    ip_address=ip_address,
                    session_key=session_key
                )
                # Increment the views count on the video model for fast access
                video.views += 1
                video.save(update_fields=['views'])

                notify_realtime_server(
                    "video_view_updated",
                    {
                        "videoId": str(video.id),
                        "views": video.views,
                    },
                )

                return Response({"detail": "View recorded", "total_views": video.views}, status=status.HTTP_201_CREATED)

            return Response({"detail": "Already viewed", "total_views": video.views}, status=status.HTTP_200_OK)
        except Exception:
            logger.exception("Failed to record view for video %s", video_id)
            return Response(
                {"detail": "View tracking unavailable", "total_views": video.views},
                status=status.HTTP_200_OK,
            )

    def get_client_ip(self, request):
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def initiate_multipart_upload(request):
    file_name = request.data['file_name']
    file_type = request.data.get('file_type', 'application/octet-stream')
    object_key = f"user_{request.user.id}/{uuid.uuid4()}_{file_name}"

    s3 = boto3.client(
        's3',
        endpoint_url=settings.AWS_S3_ENDPOINT_URL,
        aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
        aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
        region_name='auto'
    )
    response = s3.create_multipart_upload(
        Bucket=settings.AWS_STORAGE_BUCKET_NAME,
        Key=object_key,
        ACL='public-read',
        ContentType=file_type
    )
    public_url = f"https://{settings.AWS_S3_CUSTOM_DOMAIN}/{object_key}"

    return Response(
        {
            'upload_id': response['UploadId'],
            'object_key': object_key,
            'public_url': public_url
        })

@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def get_presigned_part_url(request):
    try:
        object_key = request.data['object_key']
        file_type = request.data['file_type']
        part_number = int(request.data['part_number'])
        upload_id = request.data['upload_id']
        
        s3 = boto3.client(
            's3',
            endpoint_url=settings.AWS_S3_ENDPOINT_URL,
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
            region_name='auto',
            config=Config(
                signature_version='s3v4',
                s3={'addressing_style': 'path'}
            )
        )
        
        presigned_url = s3.generate_presigned_url(
            'upload_part',
            Params={
                'Bucket': settings.AWS_STORAGE_BUCKET_NAME,
                'Key': object_key,
                'UploadId': upload_id,
                'PartNumber': part_number,
            },
            ExpiresIn=3600 
        )

        public_url = f"https://{settings.AWS_S3_CUSTOM_DOMAIN}/{object_key}"
        logger.info(f"Presigned upload URL: {presigned_url}")
        logger.info(f"Public file will be accessible at: {public_url}")

        return Response({
            'url': presigned_url,
            'object_key': object_key,
            'public_url': public_url
        })

    except Exception as e:
        logger.error(f"Error generating presigned URL: {e}")
        return Response({'error': str(e)}, status=500)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def complete_multipart_upload(request):
    try:
        object_key = request.data['object_key']
        upload_id = request.data['upload_id']
        parts = request.data['parts']

        s3 = boto3.client(
            's3',
            endpoint_url=settings.AWS_S3_ENDPOINT_URL,
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
            region_name='auto',
            config=Config(
                signature_version='s3v4',
                s3={'addressing_style': 'path'}
            )
        )

        response = s3.complete_multipart_upload(
            Bucket=settings.AWS_STORAGE_BUCKET_NAME,
            Key=object_key,
            UploadId=upload_id,
            MultipartUpload={'Parts': parts}
        )

        public_url = f"https://{settings.AWS_S3_CUSTOM_DOMAIN}/{object_key}"

        return Response({
            'message': 'Upload complete',
            'location': response.get('Location'),
            'object_key': object_key,
            'public_url': public_url
            })
    except Exception as e:
        logger.exception("Error completing multipart upload")
        return Response({'error': str(e)}, status=500)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def cleanup_multipart_upload(request):
    """
    Delete all incomplete multipart uploads for this bucket.
    """

    s3 = boto3.client(
        's3',
        endpoint_url=settings.AWS_S3_ENDPOINT_URL,
        aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
        aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
        region_name='auto'
    )

    aborted = []
    paginator = s3.get_paginator("list_multipart_uploads")

    for page in paginator.paginate(Bucket=settings.AWS_STORAGE_BUCKET_NAME):
        uploads = page.get("Uploads", [])
        for u in uploads:
            object_key = u["Key"]
            upload_id = u["UploadId"]
            try:
                s3.abort_multipart_upload(
                    Bucket=settings.AWS_STORAGE_BUCKET_NAME,
                    Key=object_key,
                    UploadId=upload_id
                )
                aborted.append({"key": object_key, "upload_id": upload_id})
            except Exception as e:
                print(f"Failed to abort {object_key} - {upload_id}: {e}")

    return Response({
        'message': f'Aborted {len(aborted)} incomplete multipart uploads',
        'aborted': aborted
        })

def extract_and_upload_thumbnail(video_url, video_instance):
    """
    Downloads the video, extracts a thumbnail using ffmpeg,
    and uploads it to R2.
    """
    temp_video = None
    temp_thumb = None
    try:
        # Create temp files
        temp_video = download_to_temp_file(video_url, ".mp4")
        temp_thumb = tempfile.NamedTemporaryFile(suffix=".jpg", delete=False).name
        
        # Extract frame
        result = subprocess.run(
            [
                'ffmpeg',
                '-y',
                '-ss',
                '00:00:03.000',
                '-i',
                temp_video,
                '-vframes',
                '1',
                '-f',
                'image2',
                temp_thumb,
            ],
            capture_output=True,
            text=True,
        )

        # Verify thumb was created
        if result.returncode != 0 or not os.path.exists(temp_thumb) or os.path.getsize(temp_thumb) == 0:
            logger.error(
                "Thumbnail extraction failed for video %s: %s",
                video_instance.id,
                (result.stderr or result.stdout or "ffmpeg returned no output").strip(),
            )
            return

        # Upload to S3/R2
        s3 = boto3.client('s3', 
            endpoint_url=settings.AWS_S3_ENDPOINT_URL,
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
            region_name='auto',
            config=Config(
                signature_version='s3v4', 
                s3={'addressing_style': 'path'} # Match the fixed style
            )
        )
        key = f"thumbnails/{video_instance.id}_thumb.jpg"
        
        with open(temp_thumb, 'rb') as f:
            s3.put_object(
                Bucket=settings.AWS_STORAGE_BUCKET_NAME,
                Key=key,
                Body=f,
                ACL='public-read',
                ContentType='image/jpeg'
            )

        public_url = f"https://{settings.AWS_S3_CUSTOM_DOMAIN}/{key}"
        video_instance.thumbnail = public_url
        video_instance.save()
        logger.info("Successfully generated and uploaded thumbnail for %s", video_instance.id)

    except Exception as e:
        logger.exception("Error in extract_and_upload_thumbnail for video %s: %s", video_instance.id, str(e))
    finally:
        # Cleanup
        try:
            if temp_video and os.path.exists(temp_video):
                os.remove(temp_video)
            if temp_thumb and os.path.exists(temp_thumb):
                os.remove(temp_thumb)
        except OSError:
            logger.exception("Failed to clean up thumbnail extraction temp files")


def download_to_temp_file(url, suffix):
    temp_path = tempfile.NamedTemporaryFile(suffix=suffix, delete=False).name
    response = requests.get(url, stream=True, timeout=30)
    response.raise_for_status()
    with open(temp_path, 'wb') as f:
        for chunk in response.iter_content(chunk_size=1024 * 1024):
            if chunk:
                f.write(chunk)
    return temp_path


def video_has_audio_stream(video_path):
    try:
        result = subprocess.run(
            [
                'ffprobe',
                '-v',
                'error',
                '-select_streams',
                'a',
                '-show_entries',
                'stream=index',
                '-of',
                'json',
                video_path,
            ],
            check=True,
            capture_output=True,
            text=True,
        )
        data = json.loads(result.stdout or '{}')
        return bool(data.get('streams'))
    except Exception:
        logger.exception("Failed to inspect video audio stream")
        return False


def mix_music_and_upload_video(video_id):
    temp_video = None
    temp_music = None
    temp_output = None

    try:
        video_instance = Video.objects.get(id=video_id)
        if not video_instance.music_url:
            return

        temp_video = download_to_temp_file(video_instance.file_url, ".mp4")
        temp_music = download_to_temp_file(video_instance.music_url, ".audio")
        temp_output = tempfile.NamedTemporaryFile(suffix=".mp4", delete=False).name

        if video_has_audio_stream(temp_video):
            ffmpeg_command = [
                'ffmpeg',
                '-y',
                '-i',
                temp_video,
                '-stream_loop',
                '-1',
                '-i',
                temp_music,
                '-filter_complex',
                '[0:a]volume=0.55[a0];[1:a]volume=0.45[a1];[a0][a1]amix=inputs=2:duration=first:dropout_transition=2[aout]',
                '-map',
                '0:v:0',
                '-map',
                '[aout]',
                '-c:v',
                'copy',
                '-c:a',
                'aac',
                '-shortest',
                temp_output,
            ]
        else:
            ffmpeg_command = [
                'ffmpeg',
                '-y',
                '-i',
                temp_video,
                '-stream_loop',
                '-1',
                '-i',
                temp_music,
                '-map',
                '0:v:0',
                '-map',
                '1:a:0',
                '-c:v',
                'copy',
                '-c:a',
                'aac',
                '-shortest',
                temp_output,
            ]

        subprocess.run(ffmpeg_command, check=True, capture_output=True, text=True)

        s3 = boto3.client(
            's3',
            endpoint_url=settings.AWS_S3_ENDPOINT_URL,
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
            region_name='auto',
            config=Config(
                signature_version='s3v4',
                s3={'addressing_style': 'path'}
            )
        )

        key = f"processed/{video_instance.uploader_id}/{video_instance.id}_with_music.mp4"
        with open(temp_output, 'rb') as f:
            s3.put_object(
                Bucket=settings.AWS_STORAGE_BUCKET_NAME,
                Key=key,
                Body=f,
                ACL='public-read',
                ContentType='video/mp4'
            )

        video_instance.file_url = f"https://{settings.AWS_S3_CUSTOM_DOMAIN}/{key}"
        video_instance.processing_status = "ready"
        video_instance.save(update_fields=["file_url", "processing_status"])

        threading.Thread(
            target=extract_and_upload_thumbnail,
            args=(video_instance.file_url, video_instance)
        ).start()
        logger.info("Successfully mixed music into video %s", video_instance.id)

    except Exception:
        logger.exception("Failed to mix music into video %s", video_id)
        Video.objects.filter(id=video_id).update(processing_status="failed")
    finally:
        for temp_path in (temp_video, temp_music, temp_output):
            try:
                if temp_path and os.path.exists(temp_path):
                    os.remove(temp_path)
            except OSError:
                logger.exception("Failed to clean up music processing temp file")
