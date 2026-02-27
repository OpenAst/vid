# Deploying to Render.com (Supabase + R2 + External Redis)

**Zero cost approach:** Uses your existing Supabase + R2 + free Redis tier

## Prerequisites

You MUST have these already set up:
1. **Supabase PostgreSQL** - [supabase.com](https://supabase.com) (free tier available)
2. **Cloudflare R2 Storage** - [cloudflare.com/r2](https://www.cloudflare.com/products/r2/) ($0.015/GB, free 10GB)
3. **External Redis** - Free options:
   - [Upstash Redis](https://upstash.com/) - 10,000 free commands/day
   - [Redis Cloud](https://redis.com/cloud/overview/) - 30MB free
4. **GitHub repo** - Push your code there

## Step 1: Get Your Connection Strings

### Supabase PostgreSQL
1. Go to [supabase.com](https://supabase.com) → Your Project → Settings → Database
2. Copy the connection string (should look like):
   ```
   postgresql://postgres:[password]@db.[random].supabase.co:5432/postgres
   ```

### Cloudflare R2
1. Go to Cloudflare Dashboard → R2 → Create Bucket
2. Create API token: Settings → API tokens → Create token
3. Get your values:
   - `AWS_ACCESS_KEY_ID`: Your R2 API token ID
   - `AWS_SECRET_ACCESS_KEY`: Your R2 API token secret
   - `AWS_S3_ENDPOINT_URL`: https://[account-id].r2.cloudflarestorage.com
   - `AWS_STORAGE_BUCKET_NAME`: Your bucket name

Find your account ID: Go to R2 → any bucket → Copy URL, extract the ID

### Redis (Choose One)

**Option A: Upstash (Recommended for free tier)**
1. Go to [upstash.com](https://upstash.com/), create free account
2. Create Redis database
3. Copy the **Redis URL** (should look like):
   ```
   redis://default:[password]@[host]:[port]
   ```

**Option B: Redis Cloud**
1. Go to [redis.com/cloud](https://redis.com/cloud/overview/), create free account
2. Create database
3. Copy the connection URL

## Step 2: Deploy on Render

### Via Render Dashboard (Manual)

1. Go to [render.com](https://render.com), sign up
2. Click **New** → **Web Service**
3. Choose **Public Git repository** → paste your GitHub URL
4. Fill in settings:
   - **Name**: `web-backend` (or any name)
   - **Language**: Docker
   - **Dockerfile Path**: `Render.Dockerfile`
   - **Build Command**: Leave empty
   - **Start Command**: Leave empty
   - **Plan**: Starter ($7/month)
   - **Region**: Oregon (or your preference)

5. Click **Advanced** and add these environment variables:

   ```
   ENV=production
   DEBUG=False
   DJANGO_SECRET_KEY=[generate a random secret key]
   
   DATABASE_URL=[Your Supabase connection string]
   
   CELERY_BROKER_URL=[Your Redis URL]
   CELERY_RESULT_BACKEND=[Your Redis URL]
   
   AWS_ACCESS_KEY_ID=[Your R2 token ID]
   AWS_SECRET_ACCESS_KEY=[Your R2 token secret]
   AWS_S3_ENDPOINT_URL=[Your R2 endpoint]
   AWS_STORAGE_BUCKET_NAME=[Your bucket name]
   AWS_S3_CUSTOM_DOMAIN=[optional: your.domain.com]
   
   ALLOWED_HOSTS=your-service.render.com,yourdomain.com
   FRONTEND_DOMAIN=your-frontend-domain.com
   FRONTEND_URL=https://your-frontend-domain.com
   FRONTEND_PROTOCOL=https
   
   CSRF_TRUSTED_ORIGINS=https://your-frontend-domain.com,https://your-service.render.com
   CORS_ALLOWED_ORIGINS=https://your-frontend-domain.com,http://localhost:3000
   
   EMAIL_BACKEND=sendgrid_backend.SendgridBackend
   DEFAULT_FROM_EMAIL=noreply@yourdomain.com
   EMAIL_HOST_USER=[Your SendGrid API key]
   
   SOCIAL_AUTH_GOOGLE_OAUTH2_KEY=[Your Google OAuth key]
   SOCIAL_AUTH_GOOGLE_OAUTH2_SECRET=[Your Google OAuth secret]
   
   USE_DATABASE_URL=true
   NODE_ENV=production
   ```

6. Click **Deploy**

### Via render.yaml (Infrastructure as Code)

1. Edit `render.yaml` and fill in all the `sync: false` variables with your actual values
2. Push to GitHub
3. Render should auto-detect and deploy

## Step 3: Database Migrations

After first deploy, run migrations:

### Option A: Via Render Logs
The migrations run automatically in the entrypoint script. Check logs:
1. In Render dashboard → Your service → Logs
2. Look for "Running migrations..." and "Collecting static files..."

### Option B: Via Shell (if migrations fail)
Render doesn't provide SSH, but you can check logs and restart:
1. Dashboard → Your service → Logs (tab)
2. Check for errors
3. Fix env vars and redeploy

## Cost Breakdown

| Service | Cost | Notes |
|---------|------|-------|
| Render Web | $7/month | Starter tier (512MB RAM, 0.5 CPU) |
| Supabase PostgreSQL | Free | Free tier has 500MB DB |
| Cloudflare R2 | ~$0-2/month | Free 10GB, then $0.015/GB |
| Upstash Redis | Free | 10,000 commands/day free |
| **Total** | **~$7-10/month** | Very cheap! |

## What Happens During Deploy

1. Render builds `Render.Dockerfile`:
   - Installs Node.js and Python dependencies
   - Builds Next.js express server
   - Builds Django backend

2. Container starts and runs `render-entrypoint.sh`:
   - Runs Django migrations against Supabase
   - Collects static files to R2
   - Starts supervisor (manages 3 processes)

3. Supervisor manages:
   - **Nginx** (reverse proxy, listens on port 8000)
   - **Django Backend** (internal port 8000)
   - **Node.js Server** (internal port 4000, Socket.io)

4. External services:
   - **Supabase PostgreSQL** - handles all database
   - **Cloudflare R2** - stores all uploaded files
   - **Redis** - handles Celery tasks and caching

## Troubleshooting

### Check Logs
Dashboard → Your service → **Logs**

### Database Connection Error
```
Error: could not translate host name "db.XXXX.supabase.co" to address
```
**Fix:** Verify your `DATABASE_URL` is correct from Supabase → Settings → Database

### Static Files 404
```
Static file not found
```
**Fix:** Make sure `AWS_S3_*` variables are correct. Check migrations ran in logs.

### Socket.io Connection Failed
```
WebSocket connection failed
```
**Fix:** Update your frontend Socket.io URL to `https://your-service.render.com:8000`

### R2 Upload Fails
```
InvalidAccessKeyId or NoSuchBucket
```
**Fix:** Verify R2 credentials and bucket exists in Cloudflare dashboard

### Redis Connection Failed
```
Connection refused Redis
```
**Fix:** Check your Redis URL is correct from Upstash/Redis Cloud dashboard

## Updating Your App

1. Make changes locally
2. Push to GitHub: `git push origin main`
3. Render auto-redeploys (if autoDeploy enabled)
4. Check logs: Dashboard → Logs

## Environment Variable Reference

| Variable | Source | Purpose |
|----------|--------|---------|
| `DJANGO_SECRET_KEY` | Generate one | Django security |
| `DATABASE_URL` | Supabase | PostgreSQL connection |
| `CELERY_BROKER_URL` | Upstash/Redis Cloud | Async task queue |
| `AWS_ACCESS_KEY_ID` | Cloudflare R2 | File storage auth |
| `AWS_S3_ENDPOINT_URL` | Cloudflare R2 | R2 API endpoint |
| `ALLOWED_HOSTS` | Your domain | Django security |
| `CORS_ALLOWED_ORIGINS` | Your frontend | Allow cross-origin requests |

Generate a Django secret key:
```bash
python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
```

## Useful Render Commands

**View Logs:**
```
Render Dashboard → Service → Logs tab
```

**Restart Service:**
```
Render Dashboard → Service → Manual Deploys → Deploy Latest Commit
```

**Check Environment Variables:**
```
Render Dashboard → Service → Environment
```

## Performance Notes

- Starter tier has 512MB RAM - fine for small projects
- Upgrade to Standard ($12/month) if you need more
- Monitor CPU/Memory in Metrics tab
- Consider upgrading if > 80% utilization

## Next Steps

1. Document your env var setup somewhere secure (1Password, LastPass, etc.)
2. Test uploads work (check R2 dashboard for files)
3. Monitor Render logs for first few hours
4. Set up Render alerts for errors
5. Consider adding monitoring (Sentry, etc.)
