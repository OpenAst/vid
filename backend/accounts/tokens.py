from django.contrib.auth.tokens import PasswordResetTokenGenerator
from django.utils import timezone
from django.utils.http import base36_to_int
from django.utils.crypto import constant_time_compare
from datetime import timedelta

class OneDayActivationTokenGenerator(PasswordResetTokenGenerator):
  def check_token(self, user, token):
    if not super().check_token(user, token):
      return False
    
    try:
      ts_b36 = token.split("-")[1]
      ts_int = base36_to_int(ts_b36)
    except (IndexError, ValueError):
      return False
    
    token_time = self._date_from_timestamp(ts_int)
    now_time = timezone.now()

    if (now_time - token_time) > timedelta(hours=24):
      return False
    
    return True
  
  def _date_from_timestamp(self, ts):
    from datetime import datetime
    return datetime(2000, 1, 1, tzinfo=timezone.utc) + timedelta(seconds=ts * 60)
  