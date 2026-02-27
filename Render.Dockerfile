# Multi-process Dockerfile for Django + Node.js (Render.com - External Services)
# Uses Supabase (PostgreSQL) + R2 (Storage) + External Redis
FROM python:3.12-slim-bookworm

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1
ENV NODE_VERSION 20

# Install system dependencies (no ffmpeg for now - add if needed)
RUN apt-get update && apt-get install -y \
    curl \
    gnupg \
    supervisor \
    nginx \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Install Node.js
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs

WORKDIR /app

# --- Build Node.js Server ---
COPY server/package*.json ./server/
RUN cd server && npm ci --omit=dev

COPY server/ ./server/
RUN cd server && npx prisma generate && npm run build

# --- Build Django Backend ---
COPY backend/requirements.txt ./backend/
RUN pip install --no-cache-dir -r backend/requirements.txt
RUN pip install gunicorn

COPY backend/ ./backend/

# --- Setup Supervisor (no Redis/Postgres services) ---
RUN mkdir -p /var/log/supervisor && \
    touch /var/log/backend.err.log /var/log/backend.out.log /var/log/socket.err.log /var/log/socket.out.log /var/log/nginx.err.log /var/log/nginx.out.log

COPY render-supervisord.conf /etc/supervisor/conf.d/supervisord.conf
COPY nginx.conf.template /app/nginx.conf.template
COPY render-entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh

# Expose port (Render uses this)
EXPOSE 8000

ENTRYPOINT ["/app/entrypoint.sh"]
