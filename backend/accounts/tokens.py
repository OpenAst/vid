from django.contrib.auth.tokens import PasswordResetTokenGenerator
from django.utils import timezone
from datetime import timedelta

class OneDayActivationTokenGenerator(PasswordResetTokenGenerator):
  def check_token(self, user, token):
    if not super().check_token(user, token):
      return False
    
    ts_built = self._parse_timestamp(token)

    created_time = self._num_seconds(ts_built)
    now_time = timezone.now()

    if (now_time - created_time) > timedelta(hours=24):
      return False
    
    return True
  