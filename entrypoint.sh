#!/bin/bash

set -e

echo "Running migrations..."
python backend/manage.py migrate --noinput

echo "Collecting static files..."
python backend/manage.py collectstatic --noinput

echo "Configuring Nginx..."
PORT=${PORT:-8000}
sed "s/RENDER_PORT/$PORT/g" /usr/src/app/nginx.conf.template > /etc/nginx/sites-available/default

echo "Starting supervisor..."
exec supervisord -c /etc/supervisor/conf.d/supervisord.conf
