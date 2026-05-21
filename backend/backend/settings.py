from pathlib import Path
import os
from datetime import timedelta

import dj_database_url
from decouple import config


BASE_DIR = Path(__file__).resolve().parent.parent


def csv_config(name, default=""):
    value = config(name, default=default)
    return [item.strip() for item in value.split(",") if item.strip()]


SITE_ID = 1

SECRET_KEY = config("SECRET_KEY")
DEBUG = config("DEBUG", default=False, cast=bool)
ENV = config("ENV", default="development")

ALLOWED_HOSTS = csv_config("ALLOWED_HOSTS", "127.0.0.1,localhost")
FRONTEND_ORIGINS = csv_config("FRONTEND_ORIGINS", "http://localhost:3000")
PRIMARY_FRONTEND_URL = config("PRIMARY_FRONTEND_URL", default="http://localhost:3000")
API_BASE_URL = config("API_BASE_URL", default="http://localhost:8000")
REALTIME_SERVER_INTERNAL_URL = config("REALTIME_SERVER_INTERNAL_URL", default="http://localhost:4000")
REALTIME_INTERNAL_SECRET = config("REALTIME_INTERNAL_SECRET", default="")
VOICE_TRANSCRIPTION_ENABLED = config("VOICE_TRANSCRIPTION_ENABLED", default=False, cast=bool)
VOICE_TRANSCRIPTION_PROVIDER = config("VOICE_TRANSCRIPTION_PROVIDER", default="openai")
VOICE_TRANSCRIPTION_LANGUAGE = config("VOICE_TRANSCRIPTION_LANGUAGE", default="")
VOICE_TRANSCRIPTION_MAX_AUDIO_BYTES = config("VOICE_TRANSCRIPTION_MAX_AUDIO_BYTES", default=25 * 1024 * 1024, cast=int)
OPENAI_API_KEY = config("OPENAI_API_KEY", default="")
OPENAI_TRANSCRIPTION_MODEL = config("OPENAI_TRANSCRIPTION_MODEL", default="gpt-4o-mini-transcribe")
LOGIN_RATE_LIMIT_IP_ATTEMPTS = config("LOGIN_RATE_LIMIT_IP_ATTEMPTS", default=20, cast=int)
LOGIN_RATE_LIMIT_IDENTIFIER_ATTEMPTS = config("LOGIN_RATE_LIMIT_IDENTIFIER_ATTEMPTS", default=8, cast=int)
LOGIN_RATE_LIMIT_WINDOW_SECONDS = config("LOGIN_RATE_LIMIT_WINDOW_SECONDS", default=900, cast=int)
OAUTH_START_RATE_LIMIT_IP_ATTEMPTS = config("OAUTH_START_RATE_LIMIT_IP_ATTEMPTS", default=30, cast=int)
OAUTH_START_RATE_LIMIT_WINDOW_SECONDS = config("OAUTH_START_RATE_LIMIT_WINDOW_SECONDS", default=900, cast=int)
TURN_SERVER_URLS = csv_config("TURN_SERVER_URLS", "stun:localhost:3478,turn:localhost:3478")
TURN_SHARED_SECRET = config("TURN_SHARED_SECRET", default="")
TURN_CREDENTIAL_TTL_SECONDS = config("TURN_CREDENTIAL_TTL_SECONDS", default=3600, cast=int)
WEB_PUSH_VAPID_PUBLIC_KEY = config("WEB_PUSH_VAPID_PUBLIC_KEY", default="")
WEB_PUSH_VAPID_PRIVATE_KEY = config("WEB_PUSH_VAPID_PRIVATE_KEY", default="")
WEB_PUSH_VAPID_SUBJECT = config("WEB_PUSH_VAPID_SUBJECT", default="")
COOKIE_DOMAIN = config("COOKIE_DOMAIN", default="")

FRONTEND_PROTOCOL, FRONTEND_DOMAIN = PRIMARY_FRONTEND_URL.split("://", 1)


INSTALLED_APPS = [
    "core",
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "django.contrib.sites",
    "django_celery_beat",
    "corsheaders",
    "rest_framework",
    "social_django",
    "rest_framework_simplejwt",
    "djoser",
    "accounts",
    "video",
]

MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "backend.urls"
WSGI_APPLICATION = "backend.wsgi.application"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [os.path.join(BASE_DIR, "backend/templates")],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
                "social_django.context_processors.backends",
                "social_django.context_processors.login_redirect",
            ],
        },
    },
]


# ----------------------------
# Security / Cookies / CORS
# ----------------------------

CSRF_COOKIE_HTTPONLY = True
CSRF_USE_SESSIONS = False
CORS_ALLOW_CREDENTIALS = True

if ENV == "development":
    SESSION_COOKIE_SECURE = False
    CSRF_COOKIE_SECURE = False

    SESSION_COOKIE_DOMAIN = None
    CSRF_COOKIE_DOMAIN = None

    SESSION_COOKIE_SAMESITE = "Lax"
    CSRF_COOKIE_SAMESITE = "Lax"

    CORS_ALLOWED_ORIGINS = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]

    CSRF_TRUSTED_ORIGINS = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
    ]
else:
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True

    SESSION_COOKIE_DOMAIN = COOKIE_DOMAIN or None
    CSRF_COOKIE_DOMAIN = COOKIE_DOMAIN or None

    SESSION_COOKIE_SAMESITE = "None"
    CSRF_COOKIE_SAMESITE = "None"

    CORS_ALLOWED_ORIGINS = list(dict.fromkeys(
        FRONTEND_ORIGINS + [API_BASE_URL]
    ))

    CSRF_TRUSTED_ORIGINS = list(dict.fromkeys(
        FRONTEND_ORIGINS + [API_BASE_URL]
    ))

    SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
    SECURE_SSL_REDIRECT = config("SECURE_SSL_REDIRECT", default=False, cast=bool)


# ----------------------------
# Media / Static
# ----------------------------

MEDIA_ROOT = os.path.join(BASE_DIR, "media")
MEDIA_URL = "/media/"

STATIC_URL = "/static/"
STATICFILES_DIRS = [BASE_DIR / "static"]
STATIC_ROOT = BASE_DIR / "staticfiles"
STATICFILES_STORAGE = "whitenoise.storage.CompressedManifestStaticFilesStorage"


# ----------------------------
# Upload limits
# ----------------------------

DATA_UPLOAD_MAX_MEMORY_SIZE = 1024 * 1024 * 1024
FILE_UPLOAD_MAX_MEMORY_SIZE = 1024 * 1024 * 1024
FILE_UPLOAD_PERMISSIONS = 0o644
FILE_UPLOAD_DIRECTORY_PERMISSIONS = 0o755


# ----------------------------
# Database
# ----------------------------

USE_DATABASE_URL = config("USE_DATABASE_URL", default=False, cast=bool)
DB_CONN_MAX_AGE = config("DB_CONN_MAX_AGE", default=0 if ENV == "development" else 600, cast=int)

if USE_DATABASE_URL:
    DATABASES = {
        "default": dj_database_url.config(
            default=config("DATABASE_URL"),
            conn_max_age=DB_CONN_MAX_AGE,
            ssl_require=(ENV == "production"),
        )
    }
else:
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.postgresql",
            "NAME": config("DB_NAME"),
            "HOST": config("DB_HOST"),
            "USER": config("DB_USER"),
            "PASSWORD": config("DB_PASSWORD"),
            "PORT": config("DB_PORT", default="5432"),
            "CONN_MAX_AGE": DB_CONN_MAX_AGE,
        }
    }


# ----------------------------
# Email
# ----------------------------

EMAIL_BACKEND = config("EMAIL_BACKEND")
EMAIL_HOST = config("EMAIL_HOST")
EMAIL_PORT = config("EMAIL_PORT", cast=int)
EMAIL_HOST_USER = config("EMAIL_HOST_USER")
EMAIL_HOST_PASSWORD = config("EMAIL_HOST_PASSWORD")
EMAIL_USE_TLS = config("EMAIL_USE_TLS", default=True, cast=bool)
EMAIL_TIMEOUT = config("EMAIL_TIMEOUT", default=15, cast=int)
DEFAULT_FROM_EMAIL = config("DEFAULT_FROM_EMAIL")

ANYMAIL = {
    "POSTMARK_SERVER_TOKEN": config("POSTMARK_SERVER_TOKEN", default=""),
    "MAILGUN_API_KEY": config("MAILGUN_API_KEY", default=""),
    "MAILGUN_SENDER_DOMAIN": config("MAILGUN_SENDER_DOMAIN", default=""),
    "SENDGRID_API_KEY": config("SENDGRID_API_KEY", default=""),
}


# ----------------------------
# Celery / Redis
# ----------------------------

REDIS_URL = config("REDIS_URL", default="redis://localhost:6379/0")
CELERY_BROKER_URL = config("CELERY_BROKER_URL", default=REDIS_URL)
CELERY_RESULT_BACKEND = config("CELERY_RESULT_BACKEND", default=REDIS_URL)
CELERY_TASK_ALWAYS_EAGER = config("CELERY_TASK_ALWAYS_EAGER", default=False, cast=bool)
CELERY_TASK_EAGER_PROPAGATES = config("CELERY_TASK_EAGER_PROPAGATES", default=DEBUG, cast=bool)
CELERY_BROKER_CONNECTION_TIMEOUT = config("CELERY_BROKER_CONNECTION_TIMEOUT", default=3, cast=int)


# ----------------------------
# Cloudflare R2 / S3
# ----------------------------

AWS_ACCESS_KEY_ID = config("AWS_ACCESS_KEY_ID")
AWS_SECRET_ACCESS_KEY = config("AWS_SECRET_ACCESS_KEY")
AWS_STORAGE_BUCKET_NAME = config("AWS_STORAGE_BUCKET_NAME")
AWS_S3_ENDPOINT_URL = config("AWS_S3_ENDPOINT_URL")
AWS_S3_CUSTOM_DOMAIN = config("AWS_S3_CUSTOM_DOMAIN", default=None)

AWS_S3_REGION_NAME = "auto"
AWS_S3_ADDRESSING_STYLE = "virtual"
AWS_DEFAULT_ACL = "public-read"
AWS_QUERYSTRING_AUTH = False
AWS_S3_FILE_OVERWRITE = False

if AWS_S3_CUSTOM_DOMAIN:
    MEDIA_URL = f"https://{AWS_S3_CUSTOM_DOMAIN}/"
else:
    MEDIA_URL = f"https://{AWS_STORAGE_BUCKET_NAME}.{AWS_S3_ENDPOINT_URL.split('//')[1]}/"

DEFAULT_FILE_STORAGE = "storages.backends.s3boto3.S3Boto3Storage"


# ----------------------------
# Logging
# ----------------------------

LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "verbose": {
            "format": "{levelname} {asctime} {module} {message}",
            "style": "{",
        },
    },
    "handlers": {
        "console": {
            "level": "DEBUG",
            "class": "logging.StreamHandler",
            "formatter": "verbose",
        },
    },
    "root": {
        "handlers": ["console"],
        "level": "INFO",
    },
    "loggers": {
        "django": {
            "handlers": ["console"],
            "level": "INFO",
            "propagate": False,
        },
        "django.request": {
            "handlers": ["console"],
            "level": "DEBUG",
            "propagate": False,
        },
    },
}


# ----------------------------
# DRF / Auth
# ----------------------------

REST_FRAMEWORK = {
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.AllowAny",
    ],
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ),
    "DEFAULT_RENDERER_CLASSES": [
        "rest_framework.renderers.JSONRenderer",
    ],
    "DEFAULT_PAGINATION_CLASS": "rest_framework.pagination.PageNumberPagination",
    "PAGE_SIZE": 10,
}

AUTHENTICATION_BACKENDS = (
    "social_core.backends.google.GoogleOAuth2",
    "django.contrib.auth.backends.ModelBackend",
)

SIMPLE_JWT = {
    "AUTH_HEADER_TYPES": ("JWT",),
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=120),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=5),
    "AUTH_TOKEN_CLASSES": (
        "rest_framework_simplejwt.tokens.AccessToken",
    ),
    "TOKEN_OBTAIN_SERIALIZER": "accounts.serializers.CustomTokenObtainPairSerializer",
    "AUTH_COOKIE": "ACCESS_TOKEN",
    "AUTH_COOKIE_SECURE": ENV != "development",
    "AUTH_COOKIE_HTTP_ONLY": True,
    "AUTH_COOKIE_SAMESITE": "Lax" if ENV == "development" else "None",
}


# ----------------------------
# Djoser / Social Auth
# ----------------------------

DJOSER = {
    "DOMAIN": FRONTEND_DOMAIN,
    "SITE_NAME": "OneClyq",
    "PROTOCOL": FRONTEND_PROTOCOL,
    "LOGIN_FIELD": "email",
    "USER_CREATE_PASSWORD_RETYPE": True,
    "USERNAME_CHANGED_EMAIL_CONFIRMATION": True,
    "PASSWORD_CHANGED_EMAIL_CONFIRMATION": True,
    "SEND_CONFIRMATION_EMAIL": True,
    "SET_USERNAME_RETYPE": True,
    "SET_PASSWORD_RETYPE": True,
    "PASSWORD_RESET_CONFIRM_URL": "password/confirm/{uid}/{token}",
    "USERNAME_RESET_CONFIRM_URL": "email/reset/confirm/{uid}/{token}",
    "ACTIVATION_URL": "activate/{uid}/{token}",
    "SEND_ACTIVATION_EMAIL": True,
    "EMAIL": {
        "activation": "accounts.email.CustomActivationEmail",
    },
    "SOCIAL_AUTH_TOKEN_STRATEGY": "djoser.social.token.jwt.TokenStrategy",
    "SOCIAL_AUTH_ALLOWED_REDIRECT_URIS": csv_config("SOCIAL_AUTH_ALLOWED_REDIRECT_URIS"),
    "SERIALIZERS": {
        "user_create": "accounts.serializers.UserCreateSerializer",
        "user": "accounts.serializers.UserDetailSerializer",
        "current_user": "accounts.serializers.UserDetailSerializer",
        "user_delete": "djoser.serializers.UserDeleteSerializer",
    },
    "PERMISSIONS": {
        "set_password": ["rest_framework.permissions.IsAuthenticated"],
    },
}

SOCIAL_AUTH_PIPELINE = (
    "social_core.pipeline.social_auth.social_details",
    "social_core.pipeline.social_auth.social_uid",
    "social_core.pipeline.social_auth.auth_allowed",
    "social_core.pipeline.social_auth.social_user",
    "social_core.pipeline.user.get_username",
    "social_core.pipeline.social_auth.associate_by_email",
    "social_core.pipeline.user.create_user",
    "social_core.pipeline.social_auth.associate_user",
    "social_core.pipeline.social_auth.load_extra_data",
    "social_core.pipeline.user.user_details",
)

SOCIAL_AUTH_REDIRECT_IS_HTTPS = config(
    "SOCIAL_AUTH_REDIRECT_IS_HTTPS",
    default=(ENV != "development"),
    cast=bool,
)

SOCIAL_AUTH_GOOGLE_OAUTH2_KEY = config("SOCIAL_AUTH_GOOGLE_OAUTH2_KEY")
SOCIAL_AUTH_GOOGLE_OAUTH2_SECRET = config("SOCIAL_AUTH_GOOGLE_OAUTH2_SECRET")
SOCIAL_AUTH_GOOGLE_OAUTH2_SCOPE = [
    "https://www.googleapis.com/auth/userinfo.email",
    "https://www.googleapis.com/auth/userinfo.profile",
    "openid",
]
SOCIAL_AUTH_GOOGLE_OAUTH2_EXTRA_DATA = ["first_name", "last_name"]



# ----------------------------
# Password validation
# ----------------------------

AUTH_PASSWORD_VALIDATORS = [
    {
        "NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.MinimumLengthValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.CommonPasswordValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.NumericPasswordValidator",
    },
]


# ----------------------------
# Internationalization
# ----------------------------

LANGUAGE_CODE = "en-us"
TIME_ZONE = "UTC"
USE_I18N = True
USE_TZ = True


# ----------------------------
# Default PK / User model
# ----------------------------

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"
AUTH_USER_MODEL = "accounts.UserAccount"
