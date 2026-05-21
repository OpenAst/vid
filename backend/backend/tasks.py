from celery import shared_task
from django.conf import settings
from django.core.mail import EmailMultiAlternatives
import boto3
import os
import requests
from urllib.parse import urlparse

@shared_task
def cleanup_multipart_uploads():
    """
    Clean up unfinished/aborted multipart uploads in R2 (or S3).
    """
    s3 = boto3.client(
        "s3",
        endpoint_url=os.getenv("AWS_S3_ENDPOINT_URL"),
        aws_access_key_id=os.getenv("AWS_ACCESS_KEY_ID"),
        aws_secret_access_key=os.getenv("AWS_SECRET_ACCESS_KEY"),
    )
    bucket = os.getenv("AWS_STORAGE_BUCKET_NAME")

    try:
        response = s3.list_multipart_uploads(Bucket=bucket)
        uploads = response.get("Uploads", [])
        for u in uploads:
            s3.abort_multipart_upload(
                Bucket=bucket,
                Key=u["Key"],
                UploadId=u["UploadId"],
            )
            print(f"Aborted unfinished upload: {u['Key']}")
    except Exception as e:
        print(f"Error cleaning multipart uploads: {e}")


@shared_task(bind=True, autoretry_for=(Exception,), retry_backoff=True, retry_kwargs={"max_retries": 3})
def send_rendered_email(self, subject, body, from_email, to, alternatives=None):
    message = EmailMultiAlternatives(
        subject=subject,
        body=body,
        from_email=from_email,
        to=to,
    )

    for content, mimetype in alternatives or []:
        message.attach_alternative(content, mimetype)

    return message.send()


def _audio_filename_from_url(audio_url):
    path = urlparse(audio_url).path
    filename = os.path.basename(path) or "voice-note.webm"
    return filename.split("?")[0] or "voice-note.webm"


def _download_audio(audio_url):
    response = requests.get(audio_url, timeout=30)
    response.raise_for_status()

    audio_bytes = response.content
    if len(audio_bytes) > settings.VOICE_TRANSCRIPTION_MAX_AUDIO_BYTES:
        raise ValueError("Voice note is too large to transcribe")

    return audio_bytes, response.headers.get("content-type") or "audio/webm"


def _transcribe_with_openai(audio_url):
    if not settings.OPENAI_API_KEY:
        raise ValueError("OPENAI_API_KEY is not configured")

    audio_bytes, content_type = _download_audio(audio_url)
    data = {
        "model": settings.OPENAI_TRANSCRIPTION_MODEL,
        "response_format": "json",
    }
    if settings.VOICE_TRANSCRIPTION_LANGUAGE:
        data["language"] = settings.VOICE_TRANSCRIPTION_LANGUAGE

    response = requests.post(
        "https://api.openai.com/v1/audio/transcriptions",
        headers={"Authorization": f"Bearer {settings.OPENAI_API_KEY}"},
        data=data,
        files={
            "file": (
                _audio_filename_from_url(audio_url),
                audio_bytes,
                content_type,
            )
        },
        timeout=90,
    )
    response.raise_for_status()

    transcript = (response.json().get("text") or "").strip()
    if not transcript:
        raise ValueError("Transcription returned no text")
    return transcript


def _emit_message_update(message):
    if not settings.REALTIME_SERVER_INTERNAL_URL or not settings.REALTIME_INTERNAL_SECRET:
        return

    conversation = message.conversation
    user_ids = [str(conversation.user_one_id), str(conversation.user_two_id)]
    try:
        requests.post(
            f"{settings.REALTIME_SERVER_INTERNAL_URL.rstrip('/')}/internal/events",
            headers={"Authorization": f"Bearer {settings.REALTIME_INTERNAL_SECRET}"},
            json={
                "type": "messages_updated",
                "conversationId": str(conversation.id),
                "userIds": user_ids,
                "message": {
                    "id": str(message.id),
                    "audio_transcript": message.audio_transcript,
                },
            },
            timeout=5,
        )
    except Exception as exc:
        print(f"Unable to emit message update: {exc}")


@shared_task(bind=True, autoretry_for=(requests.RequestException,), retry_backoff=True, retry_kwargs={"max_retries": 3})
def transcribe_voice_message(self, message_id):
    if not settings.VOICE_TRANSCRIPTION_ENABLED:
        return {"skipped": "disabled"}

    if settings.VOICE_TRANSCRIPTION_PROVIDER != "openai":
        return {"skipped": "unsupported_provider"}

    from accounts.models import DirectMessage

    message = DirectMessage.objects.select_related("conversation").filter(pk=message_id).first()
    if not message or message.message_type != "voice" or not message.audio_url:
        return {"skipped": "not_voice_message"}

    if message.audio_transcript:
        return {"skipped": "already_transcribed"}

    transcript = _transcribe_with_openai(message.audio_url)
    DirectMessage.objects.filter(pk=message.pk, audio_transcript="").update(audio_transcript=transcript)
    message.audio_transcript = transcript
    _emit_message_update(message)
    return {"message_id": str(message.id), "transcribed": True}
