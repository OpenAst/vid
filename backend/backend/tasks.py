from celery import shared_task
import datetime

@shared_task
def scheduled_taks():
  print("Scheduled task executed at", datetime.datetime.now())
  
