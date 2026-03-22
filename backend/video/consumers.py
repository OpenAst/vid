import json

from asgiref.sync import sync_to_async
from channels.generic.websocket import AsyncWebsocketConsumer
from django.core.serializers.json import DjangoJSONEncoder

from .models import Comment, Video, VideoVote
from .serializers import CommentSerializer


class BaseAuthenticatedConsumer(AsyncWebsocketConsumer):
    async def send_json(self, payload):
        await self.send(text_data=json.dumps(payload, cls=DjangoJSONEncoder))

    async def connect(self):
        user = self.scope.get("user")
        if not user or not getattr(user, "is_authenticated", False):
            await self.close(code=4401)
            return False

        await self.accept()
        return True


class CommentsConsumer(BaseAuthenticatedConsumer):
    async def connect(self):
        self.room_id = self.scope["url_route"]["kwargs"]["room_id"]
        self.room_group_name = f"comments_{self.room_id}"

        accepted = await super().connect()
        if not accepted:
            return

        await self.channel_layer.group_add(self.room_group_name, self.channel_name)
        await self.send_json(
            {
                "type": "comments.history",
                "comments": await self.get_comments_history(self.room_id),
            }
        )

    async def disconnect(self, close_code):
        if hasattr(self, "room_group_name"):
            await self.channel_layer.group_discard(self.room_group_name, self.channel_name)

    async def receive(self, text_data=None, bytes_data=None):
        if not text_data:
            return

        payload = json.loads(text_data)
        action = payload.get("action")

        if action == "send_comment":
            await self.handle_send_comment(payload)
        elif action == "vote_comment":
            await self.handle_vote_comment(payload)
        elif action == "send_reply":
            await self.handle_send_reply(payload)

    async def handle_send_comment(self, payload):
        text = (payload.get("text") or "").strip()
        if not text:
            return

        comment = await self.create_comment(self.room_id, self.scope["user"].id, text)
        serialized_comment = await self.serialize_comment(comment.id)
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                "type": "comments.new_comment",
                "comment": serialized_comment,
            },
        )

    async def handle_vote_comment(self, payload):
        comment_id = payload.get("commentId")
        if not comment_id:
            return

        result = await self.toggle_comment_like(comment_id, self.scope["user"].id)
        if not result:
            return

        await self.channel_layer.group_send(
            self.room_group_name,
            {
                "type": "comments.comment_liked",
                "commentId": result["comment_id"],
                "likes": result["total_likes"],
                "liked": result["liked"],
                "actorUserId": str(self.scope["user"].id),
            },
        )

    async def handle_send_reply(self, payload):
        parent_id = payload.get("parentId")
        text = (payload.get("text") or "").strip()
        if not parent_id or not text:
            return

        reply = await self.create_reply(parent_id, self.scope["user"].id, text)
        if not reply:
            return

        serialized_reply = await self.serialize_comment(reply.id)
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                "type": "comments.new_reply",
                "parentId": parent_id,
                "reply": serialized_reply,
            },
        )

    async def comments_new_comment(self, event):
        await self.send_json(
            {
                "type": "new_comment",
                "comment": event["comment"],
            }
        )

    async def comments_comment_liked(self, event):
        await self.send_json(
            {
                "type": "comment_liked",
                "commentId": event["commentId"],
                "likes": event["likes"],
                "liked": event["liked"],
                "actorUserId": event["actorUserId"],
            }
        )

    async def comments_new_reply(self, event):
        await self.send_json(
            {
                "type": "new_reply",
                "parentId": event["parentId"],
                "reply": event["reply"],
            }
        )

    @sync_to_async
    def create_comment(self, room_id, user_id, text):
        return Comment.objects.create(video_id=room_id, user_id=user_id, content=text)

    @sync_to_async
    def create_reply(self, parent_id, user_id, text):
        parent = (
            Comment.objects.select_related("video")
            .filter(pk=parent_id)
            .first()
        )
        if not parent:
            return None

        return Comment.objects.create(
            video=parent.video,
            user_id=user_id,
            content=text,
            parent=parent,
        )

    @sync_to_async
    def serialize_comment(self, comment_id):
        comment = (
            Comment.objects.select_related("user", "user__profile", "video", "parent")
            .prefetch_related("votes")
            .get(pk=comment_id)
        )
        return CommentSerializer(comment).data

    @sync_to_async
    def get_comments_history(self, room_id):
        comments = (
            Comment.objects.filter(video_id=room_id, parent__isnull=True)
            .select_related("user", "user__profile", "video")
            .prefetch_related(
                "votes",
                "replies__votes",
                "replies__user",
                "replies__user__profile",
            )
            .order_by("created_at")
        )

        serialized_comments = []
        for comment in comments:
            data = CommentSerializer(comment).data
            data["replies"] = [
                CommentSerializer(reply).data
                for reply in comment.replies.all().order_by("created_at")
            ]
            serialized_comments.append(data)
        return serialized_comments

    @sync_to_async
    def toggle_comment_like(self, comment_id, user_id):
        from .models import CommentVote

        comment = Comment.objects.filter(pk=comment_id).first()
        if not comment:
            return None

        existing_like = CommentVote.objects.filter(
            comment=comment,
            user_id=user_id,
            value=1,
        ).first()

        if existing_like:
            existing_like.delete()
            liked = False
        else:
            CommentVote.objects.create(comment=comment, user_id=user_id, value=1)
            liked = True

        total_likes = comment.votes.filter(value=1).count()
        return {
            "comment_id": str(comment.id),
            "liked": liked,
            "total_likes": total_likes,
        }


class VideoLikesConsumer(BaseAuthenticatedConsumer):
    async def connect(self):
        self.group_name = "video_likes"
        accepted = await super().connect()
        if not accepted:
            return

        await self.channel_layer.group_add(self.group_name, self.channel_name)

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def receive(self, text_data=None, bytes_data=None):
        if not text_data:
            return

        payload = json.loads(text_data)
        if payload.get("action") != "like_video":
            return

        video_id = payload.get("videoId")
        if not video_id:
            return

        result = await self.toggle_video_like(video_id, self.scope["user"].id)
        if not result:
            return

        await self.channel_layer.group_send(
            self.group_name,
            {
                "type": "videos.vote_updated",
                "videoId": video_id,
                "likes": result["likes"],
                "liked": result["liked"],
                "actorUserId": str(self.scope["user"].id),
            },
        )

    async def videos_vote_updated(self, event):
        await self.send_json(
            {
                "type": "video_vote_updated",
                "videoId": event["videoId"],
                "likes": event["likes"],
                "liked": event["liked"],
                "actorUserId": event["actorUserId"],
            }
        )

    async def videos_view_updated(self, event):
        await self.send_json(
            {
                "type": "video_view_updated",
                "videoId": event["videoId"],
                "views": event["views"],
            }
        )

    @sync_to_async
    def toggle_video_like(self, video_id, user_id):
        video = Video.objects.filter(pk=video_id).first()
        if not video:
            return None

        existing_vote = VideoVote.objects.filter(video=video, user_id=user_id).first()

        if existing_vote and existing_vote.value == 1:
            existing_vote.delete()
            liked = False
        elif existing_vote:
            existing_vote.value = 1
            existing_vote.save(update_fields=["value"])
            liked = True
        else:
            VideoVote.objects.create(video=video, user_id=user_id, value=1)
            liked = True

        likes = video.votes.filter(value=1).count()
        return {
            "liked": liked,
            "likes": likes,
        }
