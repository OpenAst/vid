from django.core.management.base import BaseCommand
import boto3
from django.conf import settings

class Command(BaseCommand):
  help = "Abort all incomplete multipart uploads in R2"

  def handle(self, *args, **options):
    s3 = boto3.client(
      's3',
      endpoint_url=settings.AWS_S3_ENDPOINT_URL,
      aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
      aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
      region_name='auto'
    )

    uploads = s3.list_multipart_uploads(Bucket=settings.AWS_STORAGE_BUCKET_NAME)
    for upload in uploads.get('Uploads', []):
      self.stdout.write(f"Aborting: {upload['Key']} - {upload['UploadId']}")
      s3.abort_multipart_upload(
        Bucket=settings.AWS_STORAGE_BUCKET_NAME,
        Key=upload['Key'],
        UploadId=upload['UploadId']
      )
    self.stdout.write("All incomplete multipart uploads aborted.")