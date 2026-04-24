# Realtime Migration Plan

## Goal

Move realtime features from Django Channels to a dedicated Node.js websocket server while keeping Django as the source of truth for authentication, comments, likes, replies, and view counts.

## Why this design makes sense

- Django already owns the data model and business rules.
- All primary keys are already UUIDs in Django models.
- Node is better suited to managing many persistent websocket connections.
- The frontend can keep the same websocket message shapes, which lowers migration risk.

## UUID strategy

- Database entities keep using Django UUID primary keys:
  - `Video.id`
  - `Comment.id`
  - `UserAccount.id`
  - `VideoVote.id`
  - `CommentVote.id`
  - `VideoView.id`
- The Node realtime server also generates UUIDs for:
  - `connectionId`: identifies each websocket connection
  - `eventId`: identifies each emitted realtime event

This is useful for tracing, debugging duplicates, and future message acknowledgements.

## Target architecture

1. The frontend opens websockets against the Node server:
   - `/ws/comments/:videoId/`
   - `/ws/video-likes/`
2. The Node server validates the JWT by calling Django:
   - `GET /api/realtime/auth/me/`
3. For comment history and mutations, Node calls Django bridge endpoints:
   - `GET /api/realtime/comments/:videoId/history/`
   - `POST /api/realtime/comments/:videoId/messages/`
   - `POST /api/realtime/comments/:videoId/replies/`
   - `POST /api/realtime/comments/vote/toggle/`
   - `POST /api/realtime/videos/vote/toggle/`
4. Django persists the changes and returns canonical payloads.
5. Node broadcasts the same event contract the frontend already expects.
6. When Django records a video view via HTTP, it notifies Node with:
   - `POST /internal/events`

## Rollout plan

1. Deploy the Node realtime server.
2. Set these environment variables:
   - Frontend: `NEXT_PUBLIC_REALTIME_URL`
   - Django: `REALTIME_SERVER_INTERNAL_URL`, `REALTIME_INTERNAL_SECRET`
   - Node: `DJANGO_API_URL`, `REALTIME_INTERNAL_SECRET`
3. Verify:
   - comments history loads
   - new comments fan out
   - replies fan out
   - comment likes fan out
   - video likes fan out
   - video views fan out

## Current implementation added in this repo

- `realtime-server/`
  - standalone TypeScript websocket service using `ws`
- Django bridge endpoints in `backend/video/views.py` and `backend/video/urls.py`
- Django signed webhook publisher for view updates
- Frontend websocket helper now prefers `NEXT_PUBLIC_REALTIME_URL`

## Cleanup status

The cleanup is now complete:

- `channels`, `channels_redis`, and `daphne` are no longer required
- backend websocket routing has been removed
- legacy consumers and websocket auth middleware are no longer part of the runtime
- channel layer config has been removed from `backend/backend/settings.py`
