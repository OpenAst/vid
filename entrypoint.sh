#!/bin/bash

export PATH=$PATH:/usr/lib/postgresql/15/bin

set -e

echo "Configuring Postgres..."
# Ensure data directory exists and has correct permissions
mkdir -p /var/lib/postgresql/data
chown -R postgres:postgres /var/lib/postgresql/data

# Initialize Postgres data directory if empty
if [ -z "$(ls -A /var/lib/postgresql/data)" ]; then
    echo "Initializing Postgres database..."
    su postgres -c "initdb -D /var/lib/postgresql/data"
fi

# Start Postgres temporarily to create roles/db if they don't exist
su postgres -c "pg_ctl -D /var/lib/postgresql/data -o '-c listen_addresses=\"\"' -w start"

# Create DB/User if needed (using env vars if available)
DB_NAME=${DB_NAME:-accounts}
DB_USER=${DB_USER:-postgres}
DB_PASSWORD=${DB_PASSWORD:-root}

su postgres -c "psql -tc \"SELECT 1 FROM pg_user WHERE usename = '$DB_USER'\" | grep -q 1 || psql -c \"CREATE USER $DB_USER WITH PASSWORD '$DB_PASSWORD' SUPERUSER;\""
su postgres -c "psql -tc \"SELECT 1 FROM pg_database WHERE datname = '$DB_NAME'\" | grep -q 1 || psql -c \"CREATE DATABASE $DB_NAME OWNER $DB_USER;\""

su postgres -c "pg_ctl -D /var/lib/postgresql/data -m fast -w stop"

echo "Configuring Nginx..."
PORT=${PORT:-8000}
sed "s/RENDER_PORT/$PORT/g" /usr/src/app/nginx.conf.template > /etc/nginx/sites-available/default

echo "Running migrations..."
python3 backend/manage.py migrate --noinput

echo "Collecting static files..."
python3 backend/manage.py collectstatic --noinput

echo "Starting supervisor..."
exec supervisord -c /etc/supervisor/conf.d/supervisord.conf
