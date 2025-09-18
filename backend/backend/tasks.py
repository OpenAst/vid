from celery import shared_task
import boto3
import os

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
