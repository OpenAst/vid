# Image Posts

OneClyq now supports photo/image posts alongside video posts in the existing feed system.

## Data Model

The `Video` model now has a `media_type` field:

- `video` is the default for existing records and normal video uploads.
- `image` identifies photo posts.

Migration:

- `backend/video/migrations/0011_video_media_type.py`

Run this migration during deployment before relying on image posts in production.

## Upload Flow

The upload screen lets the user choose a post type:

- `Video`: accepts `video/*`, can include background music, and uses the existing thumbnail/music processing flow.
- `Photo`: accepts `image/*`, hides background music, uploads the image file, and saves it as a ready post immediately.

Frontend upload files:

- `app/app/upload/page.tsx`
- `app/app/components/upload/UploadProvider.tsx`
- `app/app/api/video/save-metadata/route.ts`

Backend save behavior:

- `media_type=image` requires an image MIME type when `file_type` is provided.
- Image posts reject `music_url`.
- Image posts set `thumbnail` to `file_url` and `processing_status` to `ready`.
- Video posts keep the existing thumbnail extraction and music mixing behavior.

Backend files:

- `backend/video/models.py`
- `backend/video/serializers.py`
- `backend/video/views.py`

## Viewing Flow

Feed cards use `media_type` to decide how to render:

- Videos render with the existing `<video>` player, autoplay handling, mute control, progress syncing, and branded share export.
- Photos render with `next/image`, loading/error states, double-tap like, pinch zoom, and a lightweight view count timer.

Primary viewing files:

- `app/app/components/video/Feed.tsx`
- `app/app/components/video/VideoCard.tsx`
- `app/app/video/[id]/page.tsx`

Grid surfaces now show photos directly instead of waiting for video thumbnails:

- `app/app/discover/page.tsx`
- `app/app/search/page.tsx`
- `app/app/saved/page.tsx`
- `app/app/history/page.tsx`
- `app/app/profile/page.tsx`
- `app/app/profile/[username]/page.tsx`

## Sharing

Video feed sharing still uses the branded watermark exporter.

Photo feed sharing skips the watermark endpoint and shares the post page URL directly. This avoids sending images to the video-only export path.

## Deployment Notes

1. Apply backend migrations.
2. Deploy backend, frontend, and worker services normally.
3. Confirm the media host used by uploaded images is allowed by `next.config` image remote patterns.
4. Smoke test:
   - Upload a photo post.
   - Confirm it appears in For You, Latest, Discover/Search, Profile, Saved, and Detail.
   - Confirm photo share copies or opens the post link.
   - Upload a video post to confirm the video path still supports music and thumbnail processing.
