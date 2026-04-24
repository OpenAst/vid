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

For the frontend service:

- `NEXT_PUBLIC_API_URL=https://api.your-domain.com`
- `NEXT_PUBLIC_WS_URL=https://realtime.your-domain.com`
- `NEXT_PUBLIC_REALTIME_URL=https://realtime.your-domain.com`
- `NEXT_PUBLIC_SITE_URL=https://www.your-domain.com`
- `NEXT_PUBLIC_MEDIA_HOST=media.your-domain.com` or `NEXT_PUBLIC_MEDIA_URL=https://media.your-domain.com`

If you use a cookie domain, set it to the parent domain, for example:

- `COOKIE_DOMAIN=.your-domain.com`

That is optional now. If you leave it empty, the app still works as long as the browser can reach the backend domain.

### Important notes

- The backend now runs plain `gunicorn` and no longer depends on Django Channels.
- Static files are served with WhiteNoise.
- The frontend Dockerfile uses Node 20 and production builds.
- The realtime server now uses Socket.IO and can scale with Redis.

### If Coolify still feels messy

1. Deploy the backend first and confirm `/` or the Django admin loads.
2. Add Redis and Postgres.
3. Deploy the realtime service and verify it can reach `http://backend:8000`.
4. Deploy the frontend last, with the API and site URLs already set.

## Local reference

If you want to run the same stack locally with Docker, use:

```bash
docker compose -f docker-compose.coolify.yml up --build
```
