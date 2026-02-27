# Quick Render Deployment with Fresh Database

## TL;DR - Step by Step

### 1️⃣ Prepare New Supabase (5 min)

**Option A: New Project (Cleanest)**
- Go to supabase.com → + New Project
- Name: `oneclyq-render` 
- Copy the `DATABASE_URL` (PostgreSQL URI)

**Option B: Reset Existing Project**
- Supabase Dashboard → Settings → Danger Zone → Delete all data
- Wait 1 min, copy DATABASE_URL

### 2️⃣ Update Render Environment (2 min)

- [ ] Go to render.yaml
- [ ] Replace `DATABASE_URL` value with your NEW Supabase connection
- [ ] Also get:
  - R2 credentials (AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_S3_ENDPOINT_URL, AWS_STORAGE_BUCKET_NAME)
  - Redis URL (CELERY_BROKER_URL, CELERY_RESULT_BACKEND)
  - Other env vars (see RENDER_DEPLOYMENT.md)

### 3️⃣ Push to GitHub (1 min)

```bash
git add .
git commit -m "Fix database schema: clean UUID deployment"
git push origin main
```

### 4️⃣ Deploy on Render (10 min build + 5 min init)

1. Go to render.com → New → Web Service
2. Select your GitHub repo
3. Set:
   - Name: `web-backend`
   - Language: Docker
   - Dockerfile: `Render.Dockerfile`
   - Plan: Starter
4. Add all env vars from your list
5. Click "Deploy"

### 5️⃣ Watch the Magic (10 min)

In Render Logs, you should see:
```
=== Build Stage ===
↳ Building Docker image...
✓ Image built successfully

=== Runtime Stage ===
↳ Running Django migrations...
✓ Migrations applied
↳ Running Prisma migrations...
✓ Prisma schema synced
↳ Collecting static files...
✓ Static files collected
↳ Starting supervisor...
✓ supervisord started
```

Service should go **Live** (green) ✅

### 6️⃣ Test It Works

```bash
# Test backend
curl https://your-service.render.com/api/

# Test if database connected
# Try creating an account or uploading a video
```

Check Supabase:
1. Go to SQL Editor
2. Run: `SELECT * FROM accounts_useraccount LIMIT 1;`
3. Should see your test data ✅

## If Something Goes Wrong

### ❌ Build fails
→ Check Render Logs → Docker build command
→ Verify Dockerfile syntax

### ❌ "could not translate host name"
→ DATABASE_URL is wrong
→ Copy fresh from Supabase → Settings → Database

### ❌ "relation does not exist"
→ Migrations didn't run
→ Check Render logs for "Running Django migrations..."
→ If missing, restart service

### ❌ "Prisma schema mismatch"
→ Delete `server/prisma/migrations` folder (if starting fresh)
→ Redeploy

## Files Modified for This Deployment

✅ `Render.Dockerfile` - Builds both services
✅ `render-supervisord.conf` - Manages processes
✅ `render-entrypoint.sh` - Runs migrations (UPDATED: now runs Prisma too)
✅ `render.yaml` - Infrastructure config
✅ `backend/backend/settings.py` - Database config
✅ `server/prisma/schema.prisma` - Prisma schema

## Environment Variables You Need

**Copy all these into Render:**

```
# Django
ENV=production
DEBUG=False
DJANGO_SECRET_KEY=[generate random]
DATABASE_URL=[from Supabase]

# Database
USE_DATABASE_URL=true

# Redis
CELERY_BROKER_URL=[from Upstash/Redis Cloud]
CELERY_RESULT_BACKEND=[same as CELERY_BROKER_URL]

# R2 Storage
AWS_ACCESS_KEY_ID=[from R2]
AWS_SECRET_ACCESS_KEY=[from R2]
AWS_S3_ENDPOINT_URL=[from R2]
AWS_STORAGE_BUCKET_NAME=[your bucket]
AWS_S3_CUSTOM_DOMAIN=[optional]

# Domains
ALLOWED_HOSTS=your-service.onrender.com,yourdomain.com
FRONTEND_DOMAIN=yourdomain.com
FRONTEND_URL=https://yourdomain.com
FRONTEND_PROTOCOL=https

# CORS & CSRF
CORS_ALLOWED_ORIGINS=https://yourdomain.com,http://localhost:3000
CSRF_TRUSTED_ORIGINS=https://yourdomain.com,https://your-service.onrender.com

# Email
EMAIL_BACKEND=sendgrid_backend.SendgridBackend
DEFAULT_FROM_EMAIL=noreply@yourdomain.com
EMAIL_HOST_USER=SG.xxxx

# Google OAuth (if using)
SOCIAL_AUTH_GOOGLE_OAUTH2_KEY=xxxx
SOCIAL_AUTH_GOOGLE_OAUTH2_SECRET=xxxx

# Node
NODE_ENV=production
```

## Post-Deployment

1. **Monitor Logs** for 1 hour in Render dashboard
2. **Test Core Features:**
   - [ ] Register account
   - [ ] Login
   - [ ] Upload video
   - [ ] Create comment
   - [ ] Like/dislike
3. **Check Database** in Supabase SQL editor
4. **Set up Monitoring** (Sentry, etc.)

## Rollback if Needed

If deployment fails badly:

1. Delete the Render service
2. Reset Supabase or use old database
3. Fix code locally
4. Redeploy

## Success Indicators

✅ Render service status: **Live** (green)
✅ Logs show "supervisord started successfully"
✅ Can reach https://your-service.onrender.com
✅ Database has tables in Supabase
✅ Can create account and upload

🎉 **You're live!**

---

For detailed troubleshooting, see [DATABASE_MIGRATION_STRATEGY.md](DATABASE_MIGRATION_STRATEGY.md) and [RENDER_DEPLOYMENT.md](RENDER_DEPLOYMENT.md)
