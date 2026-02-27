#!/bin/bash

set -e

echo "Running Django migrations..."
python3 backend/manage.py migrate --noinput

echo "Running Prisma migrations..."
cd server && npx prisma migrate deploy && npx prisma generate
cd /app

echo "Collecting static files..."
python3 backend/manage.py collectstatic --noinput

echo "Starting supervisor..."
exec supervisord -c /etc/supervisor/conf.d/supervisord.conf
