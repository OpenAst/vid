# Multi-process Dockerfile for Django ASGI + nginx
FROM python:3.12-slim-bookworm

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1
# Install system dependencies
RUN apt-get update && apt-get install -y \
    supervisor \
    nginx \
    build-essential \
    libpq-dev \
    python3-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# --- Build Django Backend ---
COPY backend/requirements.txt ./backend/
RUN pip install --no-cache-dir -r backend/requirements.txt

COPY backend/ ./backend/

# --- Setup Supervisor ---
RUN mkdir -p /var/log/supervisor && \
    touch /var/log/backend.err.log /var/log/backend.out.log /var/log/nginx.err.log /var/log/nginx.out.log

COPY render-supervisord.conf /etc/supervisor/conf.d/supervisord.conf
COPY nginx.conf.template /app/nginx.conf.template
COPY render-entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh

# Expose port (Render uses this)
EXPOSE 8000

ENTRYPOINT ["/app/entrypoint.sh"]
