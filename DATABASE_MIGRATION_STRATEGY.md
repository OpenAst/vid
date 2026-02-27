# Database Migration Strategy for Render Deployment

## Problem
Your Supabase database has a schema mismatch:
- Old schema: INT IDs
- New schema: UUID IDs (Django + Prisma)
- Result: Migration conflicts during Render deployment

## Solution: Recommended Approach

### Option A: Clean Start for Render (Recommended if no live data)

If your old Supabase database doesn't have critical production data:

**Step 1: Back up your old Supabase database**
```sql
-- In Supabase SQL Editor, export your existing data if needed
```

**Step 2: Reset the Supabase instance for Render**
1. Go to Supabase → Your Project → Settings → Danger Zone
2. Click "Delete all data" OR create a new Supabase project
3. Copy the new `DATABASE_URL` from Settings → Database

**Step 3: Deploy to Render with fresh database**
- Set `DATABASE_URL` to your clean Supabase connection
- Render will run migrations automatically:
  - Django: `python manage.py migrate`
  - Prisma: `npx prisma migrate deploy && npx prisma generate`
- Both services will create UUID-based schema from scratch ✅

### Option B: Migrate Existing Data (Complex)

If you have production data to preserve:

**Step 1: Create migration to convert INT → UUID**
```bash
# In backend/
python manage.py makemigrations accounts --name convert_to_uuid
python manage.py makemigrations video --name convert_to_uuid
```

This requires writing custom migration code to:
1. Create new UUID columns
2. Copy data from old INT columns
3. Update foreign keys
4. Drop old columns

**Step 2: Generate Prisma migration**
```bash
# In server/
npx prisma migrate dev --name convert_to_uuid
```

**Step 3: Deploy**
- These migrations will run on Render automatically

⚠️ This is complex and error-prone. Only do this if you have critical data.

## Recommended: Option A (Clean Start)

For a fresh Render deployment:

### Step-by-step:

1. **Backup old Supabase** (if you want to keep the data)
   - Supabase → SQL Editor → Copy/export any critical data

2. **Delete old schema** (or create new project)
   - Supabase → Settings → Danger Zone → Delete all data
   - OR create new Supabase project (simpler)

3. **Get new DATABASE_URL**
   - Supabase → Settings → Database → Connection String (Postgres URI)

4. **Update Render env var**
   - Go to render.yaml
   - Set `DATABASE_URL=postgresql://...` to your NEW clean database

5. **Deploy to Render**
   - Push code to GitHub
   - Render auto-builds and runs migrations
   - Both Django & Prisma start fresh ✅

## What Happens During Render Deployment

When you deploy with a clean database:

1. Docker image builds (no database yet)
2. Container starts with `render-entrypoint.sh`:
   ```bash
   python3 backend/manage.py migrate --noinput
   # Creates Django tables (accounts, video, etc.) with UUID primary keys
   
   npx prisma migrate deploy  
   # Creates Prisma tables (comments, etc.) with UUID
   ```
3. Both services use the SAME database
4. Zero conflicts ✅

## Verification After Deploy

Check your Render logs:
```
✓ Running migrations...
✓ Collecting static files...
✓ Starting supervisor...
```

Test database:
1. Create account via frontend
2. Upload file (tests R2 + database)
3. Check Supabase SQL Editor to see the data

## Key Points

| Aspect | Details |
|--------|---------|
| Django IDs | UUID (`uuid4()`) |
| Prisma IDs | UUID (`uuid()`) |
| Foreign Keys | All UUID relationships |
| Both Services | Shared Supabase (same DATABASE_URL) |
| Conflict Risk | ZERO if starting with clean schema |

## Files That Reference Database

- `backend/backend/settings.py` - Database config
- `backend/accounts/models.py` - User schema
- `backend/video/models.py` - Video schema  
- `server/prisma/schema.prisma` - Prisma schema
- `render-entrypoint.sh` - Run migrations on startup

All already configured for UUID-based IDs ✅

## In Case of Errors During Render Deploy

**Error: Relation "xxx" does not exist**
- Cause: Insufficient permissions in Supabase
- Fix: Ensure your DATABASE_URL has full schema access

**Error: Column type mismatch**
- Cause: Old INT columns still exist
- Fix: Delete the database and start fresh

**Error: Foreign key constraint violation**
- Cause: INT and UUID IDs mixed
- Fix: Ensure both Django and Prisma use UUID consistently (already done)

## Checklist

Before deploying:
- [ ] Backup any critical data from old database
- [ ] Create clean Supabase instance
- [ ] Get new DATABASE_URL
- [ ] Update render.yaml/ Render env vars
- [ ] Verify `backend/settings.py` uses correct DATABASE_URL
- [ ] Verify `render-entrypoint.sh` runs migrations
- [ ] Push code to GitHub
- [ ] Deploy on Render
- [ ] Check logs for success
