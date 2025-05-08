from django.contrib.auth.tokens import PasswordResetTokenGenerator
from django.utils import timezone
from django.utils.http import base36_to_int
from django.utils.crypto import constant_time_compare
from datetime import timedelta, datetime

class OneDayActivationTokenGenerator(PasswordResetTokenGenerator):
    def check_token(self, user, token):
        if not super().check_token(user, token):
            return False

        
        ts = self._get_timestamp(token)

        token_created_time = self._date_from_timestamp(ts)
        now = timezone.now()

        if now - token_created_time > timedelta(hours=24):
            return False

        return True

    def _get_timestamp(self, token):
        try:
            ts_b36 = token.split("-")[1]
            return int(ts_b36, 36)
        except (IndexError, ValueError):
            return 0

    def _date_from_timestamp(self, ts):
        return datetime(2001, 1, 1, tzinfo=timezone.utc) + timedelta(seconds=ts * 60)
