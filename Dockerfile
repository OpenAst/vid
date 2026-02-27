# Multi-process Dockerfile for Django + Node.js
FROM python:3.11-slim-bookworm

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1
ENV NODE_VERSION 20

# Install system dependencies
RUN apt-get update && apt-get install -y \
    curl \
    gnupg \
    ffmpeg \
    supervisor \
    redis-server \
    nginx \
    postgresql \
    postgresql-contrib \
    postgresql-client \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Install Node.js
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs

WORKDIR /usr/src/app

# --- Build Node.js Server ---
COPY server/package*.json ./server/
RUN cd server && npm install

COPY server/ ./server/
RUN cd server && npx prisma generate && npm run build

# --- Build Django Backend ---
COPY backend/requirements.txt ./backend/
RUN pip install --no-cache-dir -r backend/requirements.txt
RUN pip install gunicorn

COPY backend/ ./backend/

# --- Setup Supervisor ---
RUN mkdir -p /var/log/supervisor && \
    touch /var/log/backend.err.log /var/log/backend.out.log /var/log/socket.err.log /var/log/socket.out.log /var/log/redis.err.log /var/log/redis.out.log /var/log/nginx.err.log /var/log/nginx.out.log /var/log/postgres.err.log /var/log/postgres.out.log

COPY supervisord.conf /etc/supervisor/conf.d/supervisord.conf
COPY nginx.conf.template /usr/src/app/nginx.conf.template
COPY entrypoint.sh /usr/src/app/entrypoint.sh
RUN chmod +x /usr/src/app/entrypoint.sh

# Expose ports (Render usually only uses one, but local testing needs both)
EXPOSE 8000
EXPOSE 3001

ENTRYPOINT ["/usr/src/app/entrypoint.sh"]
