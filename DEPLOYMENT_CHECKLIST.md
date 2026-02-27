# Render.com Deployment Checklist

## Before You Start
- [ ] You have a GitHub account
- [ ] Your code is pushed to a GitHub repo
- [ ] You have Supabase account with a PostgreSQL database
- [ ] You have Cloudflare R2 bucket with API token
- [ ] You have Redis (Upstash or Redis Cloud) connection string

## Get Your Credentials

### 1. Supabase PostgreSQL
- [ ] Go to supabase.com → Your Project → Settings → Database
- [ ] Copy: **DATABASE_URL**
  ```
  postgresql://postgres:[password]@db.[xxx].supabase.co:5432/postgres
  ```

### 2. Cloudflare R2
- [ ] Go to Cloudflare → R2 → Create Bucket (if not exists)
- [ ] Create API Token in R2 → Settings
- [ ] Copy: **AWS_ACCESS_KEY_ID**
- [ ] Copy: **AWS_SECRET_ACCESS_KEY**
- [ ] Copy: **AWS_S3_ENDPOINT_URL** (format: `https://[account-id].r2.cloudflarestorage.com`)
- [ ] Copy: **AWS_STORAGE_BUCKET_NAME**

### 3. Redis (Upstash Free Tier)
- [ ] Go to upstash.com → Create Free Account
- [ ] Create Redis Database
- [ ] Copy: **Redis URL** (format: `redis://default:[password]@[host]:[port]`)

### 4. Your Domains
- [ ] What is your frontend domain? (e.g., `oneclyq.com`)
- [ ] What is your backend domain? (will be `[something].render.com`)

## Deploy on Render

### Step 1: Create Web Service
- [ ] Go to render.com → New → Web Service
- [ ] Choose "Public Git repository"
- [ ] Paste your GitHub repo URL
- [ ] Click "Connect"

### Step 2: Configure Service
- [ ] Name: `web-backend` (or your choice)
- [ ] Language: **Docker**
- [ ] Dockerfile Path: `Render.Dockerfile` ← IMPORTANT
- [ ] Build Command: Leave empty
- [ ] Start Command: Leave empty
- [ ] Plan: **Starter** ($7/month)
- [ ] Region: Choose one (Oregon is fine)

### Step 3: Add Environment Variables
Click "Advanced" and paste all these (replace with YOUR values):

```
ENV=production
DEBUG=False
DJANGO_SECRET_KEY=django-insecure-GENERATE-A-LONG-RANDOM-STRING-HERE

DATABASE_URL=postgresql://postgres:your-password@db.xxx.supabase.co:5432/postgres

CELERY_BROKER_URL=redis://default:password@host:port
CELERY_RESULT_BACKEND=redis://default:password@host:port

AWS_ACCESS_KEY_ID=your-r2-access-key-id
AWS_SECRET_ACCESS_KEY=your-r2-secret-access-key
AWS_S3_ENDPOINT_URL=https://account-id.r2.cloudflarestorage.com
AWS_STORAGE_BUCKET_NAME=your-bucket-name
AWS_S3_CUSTOM_DOMAIN=yourdomain.com

ALLOWED_HOSTS=web-backend.onrender.com,yourdomain.com
FRONTEND_DOMAIN=yourdomain.com
FRONTEND_URL=https://yourdomain.com
FRONTEND_PROTOCOL=https

CSRF_TRUSTED_ORIGINS=https://yourdomain.com,https://web-backend.onrender.com
CORS_ALLOWED_ORIGINS=https://yourdomain.com,http://localhost:3000

EMAIL_BACKEND=sendgrid_backend.SendgridBackend
DEFAULT_FROM_EMAIL=noreply@yourdomain.com
EMAIL_HOST_USER=SG.your-sendgrid-api-key

SOCIAL_AUTH_GOOGLE_OAUTH2_KEY=your-google-oauth-key
SOCIAL_AUTH_GOOGLE_OAUTH2_SECRET=your-google-oauth-secret

USE_DATABASE_URL=true
NODE_ENV=production
```

### Step 4: Deploy
- [ ] Click "Create Web Service"
- [ ] Wait for build to complete (5-10 minutes)
- [ ] Check Logs tab for any errors
- [ ] Look for "Starting supervisor..." message

## After Deployment

- [ ] Check that service is "Live" (green status)
- [ ] Visit `https://web-backend.onrender.com` (should see nginx welcome or your API)
- [ ] Check Render Logs for any errors
- [ ] Test file upload to verify R2 is working
- [ ] Test database by creating an account

## Troubleshooting

| Error | Solution |
|-------|----------|
| Build fails | Check Docker build logs, verify `Render.Dockerfile` exists |
| "could not translate host name" | Check DATABASE_URL is correct from Supabase |
| "Connection refused" at Redis | Check CELERY_BROKER_URL is correct |
| Static files 404 | Check AWS_* vars are correct |
| "File not found after upload" | Check R2 bucket exists and credentials work |

## Update Your Code

After deployment:
1. Make changes locally
2. `git push origin main`
3. Render auto-redeploys
4. Watch Logs tab for build progress

## Cost Summary

- Render Starter: **$7/month**
- Supabase Free: **$0** (500MB limit)
- R2 Free: **$0** (10GB limit)
- Upstash Free: **$0** (10,000 commands/day)
- **Total: ~$7/month** ✨

