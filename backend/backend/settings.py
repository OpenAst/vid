
from pathlib import Path
import os
import dj_database_url
from decouple import config
from datetime import timedelta


BASE_DIR = Path(__file__).resolve().parent.parent


def csv_config(name, default=""):
    value = config(name, default=default)
    return [item.strip() for item in value.split(",") if item.strip()]

SITE_ID = 1

SECRET_KEY = config('SECRET_KEY')

DEBUG = config("DEBUG", default=False, cast=bool)

INSTALLED_APPS = [
    'daphne',
    'core',
    'channels',
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'djoser',
    'django.contrib.sites',
    'django_celery_beat',
    'corsheaders',
    'rest_framework',
    'social_django',
    'rest_framework_simplejwt',
    
    'accounts',
    'video',
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',

]

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [os.path.join(BASE_DIR, 'backend/templates')],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
                'social_django.context_processors.backends',
                'social_django.context_processors.login_redirect'
            ],
        },
    },
]

ROOT_URLCONF = 'backend.urls'


CSRF_COOKIE_HTTPONLY = True

ENV = config("ENV", default="production")
FRONTEND_ORIGINS = csv_config(
    "FRONTEND_ORIGINS",
    "http://localhost:3000,https://www.oneclyq.com,https://oneclyq.com,https://vid-olive.vercel.app",
)
COOKIE_DOMAIN = config("COOKIE_DOMAIN", default=None)

if ENV == "development":
    CSRF_COOKIE_SECURE = False
    SESSION_COOKIE_SECURE = False
    SESSION_COOKIE_DOMAIN = None
    CSRF_COOKIE_DOMAIN = None
    SESSION_COOKIE_SAMESITE = 'Lax'
    CSRF_COOKIE_SAMESITE = 'Lax'
else:
    CSRF_COOKIE_SECURE = True
    SESSION_COOKIE_SECURE = True
    # Only set a shared cookie domain when the API is actually served from it.
    SESSION_COOKIE_DOMAIN = COOKIE_DOMAIN
    CSRF_COOKIE_DOMAIN = COOKIE_DOMAIN
    # SameSite=None is required for cross-origin social auth callbacks
    SESSION_COOKIE_SAMESITE = 'None'
    CSRF_COOKIE_SAMESITE = 'None'
    # Render and other proxies
    SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')

CSRF_USE_SESSIONS = False

CSRF_TRUSTED_ORIGINS = list(
    dict.fromkeys(
        FRONTEND_ORIGINS + ['https://vid-4yi2.onrender.com']
    )
)

MEDIA_URL = '/media/'
MEDIA_ROOT = os.path.join(BASE_DIR, 'media')

CORS_ALLOW_CREDENTIALS = True
CORS_ALLOWED_ORIGINS = list(
    dict.fromkeys(
        FRONTEND_ORIGINS + ["http://localhost:3001"]
    )
)

FRONTEND_URL = csv_config('FRONTEND_URL')

ALLOWED_HOSTS = csv_config('ALLOWED_HOSTS')


DATA_UPLOAD_MAX_MEMORY_SIZE =  1024 * 1024 * 1024
FILE_UPLOAD_MAX_MEMORY_SIZE =  1024 * 1024 * 1024

FILE_UPLOAD_PERMISSIONS = 0o644
FILE_UPLOAD_DIRECTORY_PERMISSIONS = 0o755


WSGI_APPLICATION = 'backend.wsgi.application'

ASGI_APPLICATION = 'backend.asgi.application'


# Channels configuration
CHANNEL_LAYER_BACKEND = config('CHANNEL_LAYER_BACKEND', default='inmemory')
REDIS_URL = config('REDIS_URL', default='redis://127.0.0.1:6379/0')

if CHANNEL_LAYER_BACKEND == 'redis':
    CHANNEL_LAYERS = {
      'default': {
        "BACKEND": "channels_redis.core.RedisChannelLayer",
        "CONFIG": {
          'hosts': [REDIS_URL],
        },
      },
    }
else:
    CHANNEL_LAYERS = {
      'default': {
        "BACKEND": "channels.layers.InMemoryChannelLayer",
      },
    }

# Database
# https://docs.djangoproject.com/en/5.1/ref/settings/#databases

if os.getenv('USE_DATABASE_URL', 'false') == 'true':
  DATABASES = {
    'default': dj_database_url.config(
       default=os.getenv('DATABASE_URL'), conn_max_age=600, ssl_require=True
    )
  }
else:
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.postgresql',
            'NAME': config('DB_NAME'),
            'HOST': config('DB_HOST'),
            'USER': config('DB_USER'),
            'PASSWORD': config('DB_PASSWORD'),
            'PORT': config('DB_PORT', default='5432'),
        }
    }
  

EMAIL_BACKEND = config('EMAIL_BACKEND')
EMAIL_HOST = config('EMAIL_HOST')
EMAIL_PORT = config('EMAIL_PORT')
EMAIL_HOST_USER = config('EMAIL_HOST_USER')
EMAIL_HOST_PASSWORD = config('EMAIL_HOST_PASSWORD')
EMAIL_USE_TLS = True
DEFAULT_FROM_EMAIL = config('DEFAULT_FROM_EMAIL')



AWS_ACCESS_KEY_ID = config('AWS_ACCESS_KEY_ID')  
AWS_SECRET_ACCESS_KEY = config('AWS_SECRET_ACCESS_KEY') 
AWS_STORAGE_BUCKET_NAME = config('AWS_STORAGE_BUCKET_NAME')  
AWS_S3_ENDPOINT_URL = config('AWS_S3_ENDPOINT_URL') 
AWS_S3_CUSTOM_DOMAIN = config('AWS_S3_CUSTOM_DOMAIN', default=None) 


AWS_S3_REGION_NAME = 'auto'  
AWS_S3_ADDRESSING_STYLE = 'virtual'  
AWS_DEFAULT_ACL = 'public-read'  
AWS_QUERYSTRING_AUTH = False 
AWS_S3_FILE_OVERWRITE = False  

# Media URL configuration
if AWS_S3_CUSTOM_DOMAIN:
    MEDIA_URL = f'https://{AWS_S3_CUSTOM_DOMAIN}/'
else:
    MEDIA_URL = f'https://{AWS_STORAGE_BUCKET_NAME}.{AWS_S3_ENDPOINT_URL.split("//")[1]}/'

# Storage backend
DEFAULT_FILE_STORAGE = 'storages.backends.s3boto3.S3Boto3Storage'

LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '{levelname} {asctime} {module} {message}',
            'style': '{',
        },
    },
    'handlers': {
        'console': {
            'level': 'DEBUG',
            'class': 'logging.StreamHandler',
            'formatter': 'verbose',  # Use the 'verbose' formatter
        },
    },
    'root': {
        'handlers': ['console'],
        'level': 'INFO',
    },
    'loggers': {
        'django': {
            'handlers': ['console'],
            'level': 'INFO',
            'propagate': False,
        },
        'django.request': {
            'handlers': ['console'],
            'level': 'DEBUG',
            'propagate': False,
        },
    },
}


REST_FRAMEWORK = {
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.AllowAny'
    ],
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ),
    'DEFAULT_RENDERER_CLASSES': [
      'rest_framework.renderers.JSONRenderer',
    ],
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 10,
}

AUTHENTICATION_BACKENDS = (
    'social_core.backends.google.GoogleOAuth2',
    'django.contrib.auth.backends.ModelBackend'
)

SIMPLE_JWT = {
    'AUTH_HEADER_TYPES': ('JWT',),
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=120),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=5),
    'AUTH_TOKEN_CLASSES': (
        'rest_framework_simplejwt.tokens.AccessToken',
    ),
    'TOKEN_OBTAIN_SERIALIZER': 'accounts.serializers.CustomTokenObtainPairSerializer',
    'AUTH_COOKIE': 'ACCESS_TOKEN',
    'AUTH_COOKIE_SECURE': False,
    'AUTH_COOKIE_HTTP_ONLY': True,
    'AUTH_COOKIE_SAMESITE': None,
}

DEFAULT_FRONTEND_URL = (
    "http://localhost:3000" if ENV == 'development' else "https://www.oneclyq.com"
)
PRIMARY_FRONTEND_URL = config("PRIMARY_FRONTEND_URL", default=DEFAULT_FRONTEND_URL)
FRONTEND_PROTOCOL, FRONTEND_DOMAIN = PRIMARY_FRONTEND_URL.split("://", 1)

DJOSER = {
    'DOMAIN': FRONTEND_DOMAIN,
    'SITE_NAME': 'OneClyq',
    'PROTOCOL': FRONTEND_PROTOCOL,
    'LOGIN_FIELD': 'email',
    'USER_CREATE_PASSWORD_RETYPE': True,
    'USERNAME_CHANGED_EMAIL_CONFIRMATION': True,
    'PASSWORD_CHANGED_EMAIL_CONFIRMATION': True,
    'SEND_CONFIRMATION_EMAIL': True,
    'SET_USERNAME_RETYPE': True,
    'SET_PASSWORD_RETYPE': True,
    'PASSWORD_RESET_CONFIRM_URL': "password/confirm/{uid}/{token}",
    'USERNAME_RESET_CONFIRM_URL': 'email/reset/confirm/{uid}/{token}',
    'ACTIVATION_URL': 'activate/{uid}/{token}',
    'SEND_ACTIVATION_EMAIL': True,


    'EMAIL': {
       'activation': 'accounts.email.CustomActivationEmail',
    },
    'SOCIAL_AUTH_TOKEN_STRATEGY': 'djoser.social.token.jwt.TokenStrategy',
    'SOCIAL_AUTH_ALLOWED_REDIRECT_URIS': os.getenv('SOCIAL_AUTH_ALLOWED_REDIRECT_URIS', '').split(','),
    'SERIALIZERS': {
        'user_create': 'accounts.serializers.UserCreateSerializer',
        'user': 'accounts.serializers.UserDetailSerializer',
        'current_user': 'accounts.serializers.UserDetailSerializer',
        'user_delete': 'djoser.serializers.UserDeleteSerializer',
    },
    'PERMISSIONS': {
        'set_password': ["rest_framework.permissions.IsAuthenticated"],
    },
}

SOCIAL_AUTH_PIPELINE = (
    'social_core.pipeline.social_auth.social_details',
    'social_core.pipeline.social_auth.social_uid',
    'social_core.pipeline.social_auth.auth_allowed',
    'social_core.pipeline.social_auth.social_user',
    'social_core.pipeline.user.get_username',
    'social_core.pipeline.social_auth.associate_by_email',
    'social_core.pipeline.user.create_user',
    'social_core.pipeline.social_auth.associate_user',
    'social_core.pipeline.social_auth.load_extra_data',
    'social_core.pipeline.user.user_details',
)

# Force HTTPS for social redirects in production
if ENV != 'development':
    SOCIAL_AUTH_REDIRECT_IS_HTTPS = True

SOCIAL_AUTH_GOOGLE_OAUTH2_KEY = config('SOCIAL_AUTH_GOOGLE_OAUTH2_KEY')
SOCIAL_AUTH_GOOGLE_OAUTH2_SECRET = config('SOCIAL_AUTH_GOOGLE_OAUTH2_SECRET')
SOCIAL_AUTH_GOOGLE_OAUTH2_SCOPE = ['https://www.googleapis.com/auth/userinfo.email', 'https://www.googleapis.com/auth/userinfo.profile', 'openid']
SOCIAL_AUTH_GOOGLE_OAUTH2_EXTRA_DATA = ['first_name', 'last_name']

CELERY_BROKER_URL = config('CELERY_BROKER_URL', default='redis://127.0.0.1:6379/0')
CELERY_RESULT_BACKEND = config('CELERY_RESULT_BACKEND', default='redis://127.0.0.1:6379/0')
CELERY_ACCEPT_CONTENT = ['json']
CELERY_TASK_SERIALIZER = 'json'
CELERY_RESULT_SERIALIZER = 'json'

AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]


# Internationalization
# https://docs.djangoproject.com/en/5.1/topics/i18n/

LANGUAGE_CODE = 'en-us'

TIME_ZONE = 'UTC'

USE_I18N = True

USE_TZ = True


STATIC_URL = '/static/'
STATICFILES_DIRS = [BASE_DIR / "static"]
STATIC_ROOT = BASE_DIR / "staticfiles"

# Default primary key field type
# https://docs.djangoproject.com/en/5.1/ref/settings/#default-auto-field

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

AUTH_USER_MODEL = 'accounts.UserAccount'
