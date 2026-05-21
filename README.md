# vid

This repo contains three deployable services:

- `backend/` - Django, DRF, Celery, and admin
- `app/` - Next.js frontend
- `realtime/` - Socket.IO realtime relay

## Coolify Deployment

The repository now includes [`docker-compose.coolify.yml`](./docker-compose.coolify.yml) and production-ready Dockerfiles for each service.
The root [`.env.example`](./.env.example) has a deployment checklist of the variables Coolify needs.

### Recommended layout

- `frontend` -> public website
- `backend` -> public API
- `realtime` -> realtime service
- `coturn` -> WebRTC STUN/TURN relay for live calls
- `postgres` -> database
- `redis` -> Socket.IO adapter for scaling

### What to set in Coolify

Set the backend service to use the `backend/Dockerfile`, the frontend service to use `app/Dockerfile`, and the realtime service to use `realtime/Dockerfile`.
Use these container ports in Coolify: backend `8000`, frontend `3000`, realtime `4000`.

Use these values as the baseline:

- `SECRET_KEY`
- `ALLOWED_HOSTS`
- `FRONTEND_ORIGINS`
- `PRIMARY_FRONTEND_URL`
- `API_BASE_URL`
- `REALTIME_INTERNAL_SECRET`
- `TURN_SERVER_URLS`
- `TURN_SHARED_SECRET`
- `TURN_CREDENTIAL_TTL_SECONDS`
- `TURN_REALM`
- `WEB_PUSH_VAPID_PUBLIC_KEY`
- `WEB_PUSH_VAPID_PRIVATE_KEY`
- `WEB_PUSH_VAPID_SUBJECT`
- `SOCIAL_AUTH_GOOGLE_OAUTH2_KEY`
- `SOCIAL_AUTH_GOOGLE_OAUTH2_SECRET`
- `EMAIL_*`
- `AWS_*`

For the backend service:

- `ENV=production`
- `DEBUG=False`
- `USE_DATABASE_URL=False`
- `DB_HOST=postgres`
- `DB_NAME`, `DB_USER`, `DB_PASSWORD`
- `DB_PORT=5432`
- `REALTIME_SERVER_INTERNAL_URL=http://realtime:4000`
- `TURN_SERVER_URLS=stun:turn.your-domain.com:3478,turn:turn.your-domain.com:3478`
- `TURN_SHARED_SECRET=<same value used by coturn>`
- `WEB_PUSH_VAPID_PUBLIC_KEY=<generated VAPID public key>`
- `WEB_PUSH_VAPID_PRIVATE_KEY=<generated VAPID private key>`
- `WEB_PUSH_VAPID_SUBJECT=mailto:you@your-domain.com`
- `REDIS_URL=redis://redis:6379/0`
- `CELERY_BROKER_URL=redis://redis:6379/0`
- `CELERY_RESULT_BACKEND=redis://redis:6379/0`

For the frontend service:

- `NEXT_PUBLIC_API_URL=https://api.your-domain.com`
- `NEXT_PUBLIC_WS_URL=https://realtime.your-domain.com`
- `NEXT_PUBLIC_REALTIME_URL=https://realtime.your-domain.com`
- `NEXT_PUBLIC_SITE_URL=https://www.your-domain.com`
- `NEXT_PUBLIC_MEDIA_HOST=media.your-domain.com` or `NEXT_PUBLIC_MEDIA_URL=https://media.your-domain.com`
- `NEXT_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY=<same public VAPID key as backend>`

If you use a cookie domain, set it to the parent domain, for example:

- `COOKIE_DOMAIN=.your-domain.com`

That is optional now. If you leave it empty, the app still works as long as the browser can reach the backend domain.

### Important notes

- The backend now runs plain `gunicorn` and no longer depends on Django Channels.
- Static files are served with WhiteNoise.
- The frontend Dockerfile uses Node 20 and production builds.
- The realtime server now uses Socket.IO and can scale with Redis.
- Activation emails are queued through Celery, so the Celery worker service must be running for resend/register emails to leave the queue.

### If Coolify still feels messy

1. Deploy the backend first and confirm `/` or the Django admin loads.
2. Add Redis and Postgres.
3. Deploy the realtime service and verify it can reach `http://backend:8000`.
4. Deploy the frontend last, with the API and site URLs already set.

## Local Development

Use a separate local database for development. Do not point `backend/.env` at the production database unless you are intentionally debugging production data.

Start local infrastructure:

```bash
docker compose -f docker-compose.dev.yml up -d
```

Create a local backend env file:

```bash
cp backend/.env.dev.example backend/.env
```

Then run the backend:

```bash
cd backend
source venv/bin/activate
python manage.py migrate
python manage.py runserver
```

In a second backend terminal, run the worker for async email and scheduled jobs:

```bash
cd backend
source venv/bin/activate
celery -A backend worker -l info
```

Voice-message transcripts are optional. To enable them, set these in the backend environment and keep the Celery worker running:

```bash
VOICE_TRANSCRIPTION_ENABLED=True
OPENAI_API_KEY=your-openai-api-key
OPENAI_TRANSCRIPTION_MODEL=gpt-4o-mini-transcribe
```

The local dev defaults are:

- Postgres: `localhost:5432`, database `vid_dev`
- Redis: `localhost:6379`
- Backend: `http://localhost:8000`
- Frontend: `http://localhost:3000`

## Local Full-Stack Reference

If you want to run the same stack locally with Docker, use:

```bash
docker compose -f docker-compose.coolify.yml up --build
```

For local live-call testing, use browser-facing TURN URLs:

```bash
TURN_SERVER_URLS=stun:localhost:3478,turn:localhost:3478
TURN_SHARED_SECRET=local-turn-secret
TURN_REALM=localhost
```

Then open two different browsers or browser profiles, log in as two users, and press `Audio` on a public profile or `Call` on a feed video.

For push notifications, generate VAPID keys once and use them in both backend and frontend env:

```bash
npx web-push generate-vapid-keys
```
