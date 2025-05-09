from django.contrib.auth.tokens import PasswordResetTokenGenerator
from datetime import datetime, timedelta, timezone

class OneDayActivationTokenGenerator(PasswordResetTokenGenerator):
    def _get_timestamp(self, token):
        try:
            ts_b36 = token.split("-")[0]  # first part before hyphen
            return int(ts_b36, 36)
        except (IndexError, ValueError, OverflowError):
            return None

    def _date_from_timestamp(self, ts):
        try:
            return datetime(2001, 1, 1, tzinfo=timezone.utc) + timedelta(minutes=ts)
        except OverflowError:
            return None

    def check_token(self, user, token):
        if not super().check_token(user, token):
            return False

        ts = self._get_timestamp(token)
        if ts is None:
            return False

        token_time = self._date_from_timestamp(ts)
        if token_time is None:
            return False

        now = datetime.now(timezone.utc)
        return (now - token_time) <= timedelta(hours=24)
