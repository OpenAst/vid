# Backend Dockerfile
FROM python:3.12

# Set work directory
WORKDIR /app

# Install dependencies
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend code
COPY backend/ .

# Collect static files (optional, depends if you're serving via Django)
RUN python manage.py collectstatic --noinput || true

# Expose Django port
EXPOSE 8000

CMD ["python", "manage.py", "runserver", "0.0.0.0:8000"]
