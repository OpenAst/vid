from django.db import models
from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin, BaseUserManager
from django.utils import timezone
from uuid import uuid4

class UserAccountManager(BaseUserManager):
    def create_user(self, email, username=None, first_name=None, last_name=None, password=None, **extra_fields):
        if not email:
            raise ValueError('Users must have an email address')

        email = self.normalize_email(email)
        
        first_name = first_name or extra_fields.pop('first_name', '')
        last_name = last_name or extra_fields.pop('last_name', '')
        username = username or extra_fields.pop('username', email.split('@')[0]) # Fallback to email prefix

        user = self.model(email=email, username=username, first_name=first_name, last_name=last_name, **extra_fields)

        user.set_password(password)
        user.save()
        
        return user
    
    def create_superuser(self, email, username, first_name, last_name, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('is_active', True)
        
        if extra_fields.get('is_staff') is not True:
            raise ValueError('Superuser must have is_staff=True.')
        if extra_fields.get('is_superuser') is not True:
            raise ValueError('Superuser must have is_superuser=True.')

        return self.create_user(email, username, first_name, last_name, password, **extra_fields)

class UserAccount(AbstractBaseUser, PermissionsMixin):
    id = models.UUIDField(primary_key=True, default=uuid4, editable=False)
    email = models.EmailField(max_length=255, unique=True)
    username = models.CharField(max_length=150, unique=True, blank=True, null=True)
    first_name = models.CharField(max_length=255)
    last_name = models.CharField(max_length=255)
    is_active = models.BooleanField(default=True)
    is_deactivated = models.BooleanField(default=False)
    is_staff = models.BooleanField(default=False)
    date_joined = models.DateTimeField(default=timezone.now)

    objects = UserAccountManager()

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username', 'first_name', 'last_name']

    def get_full_name(self):
        return self.first_name

    def get_short_name(self):
        return self.first_name
    
    def __str__(self):
        return self.email
    
class Profile(models.Model):
    AVAILABILITY_CHOICES = (
        ("available", "Available"),
        ("busy", "Busy"),
        ("offline", "Offline"),
    )

    id = models.UUIDField(primary_key=True, default=uuid4, editable=False)
    user = models.OneToOneField(UserAccount, on_delete=models.CASCADE, related_name="profile")
    avatar = models.URLField(blank=True, null=True)  
    bio = models.TextField(blank=True, null=True)
    followers = models.IntegerField(default=0, blank=True)
    skill_tags = models.CharField(max_length=255, blank=True, default="")
    featured_video = models.ForeignKey(
        "video.Video",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="featured_by_profiles",
    )
    website_url = models.URLField(blank=True, null=True)
    twitter_url = models.URLField(blank=True, null=True)
    linkedin_url = models.URLField(blank=True, null=True)
    open_to_collab = models.BooleanField(default=False)
    open_to_hire = models.BooleanField(default=False)
    open_to_mentor = models.BooleanField(default=False)
    availability_status = models.CharField(max_length=20, choices=AVAILABILITY_CHOICES, default="available")
    is_private = models.BooleanField(default=False)
    onboarding_completed = models.BooleanField(default=False)
    skipped_profile_setup = models.BooleanField(default=False)
    skipped_interests = models.BooleanField(default=False)
    skipped_follow_suggestions = models.BooleanField(default=False)
    membership_tiers = models.JSONField(default=list, blank=True)
    birth_date = models.DateField(blank=True, null=True)

    def __str__(self):
        return f"{self.user.username}'s Profile"


class UserFollow(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid4, editable=False)
    follower = models.ForeignKey(UserAccount, on_delete=models.CASCADE, related_name="following_relationships")
    following = models.ForeignKey(UserAccount, on_delete=models.CASCADE, related_name="follower_relationships")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("follower", "following")
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.follower.username} follows {self.following.username}"


class Notification(models.Model):
    NOTIFICATION_TYPES = (
        ("follow", "Follow"),
        ("message", "Message"),
        ("call", "Call"),
        ("system", "System"),
    )

    id = models.UUIDField(primary_key=True, default=uuid4, editable=False)
    recipient = models.ForeignKey(UserAccount, on_delete=models.CASCADE, related_name="notifications")
    actor = models.ForeignKey(UserAccount, on_delete=models.SET_NULL, null=True, blank=True, related_name="notifications_sent")
    notification_type = models.CharField(max_length=24, choices=NOTIFICATION_TYPES)
    title = models.CharField(max_length=120)
    body = models.CharField(max_length=255, blank=True)
    target_url = models.CharField(max_length=255, blank=True)
    is_read = models.BooleanField(default=False, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.notification_type} notification for {self.recipient.username}"


class UserBlock(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid4, editable=False)
    blocker = models.ForeignKey(UserAccount, on_delete=models.CASCADE, related_name="blocks_initiated")
    blocked = models.ForeignKey(UserAccount, on_delete=models.CASCADE, related_name="blocks_received")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("blocker", "blocked")
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.blocker.username} blocked {self.blocked.username}"


class UserReport(models.Model):
    REPORT_TYPES = (
        ("harassment", "Harassment"),
        ("spam", "Spam"),
        ("inappropriate", "Inappropriate content"),
        ("other", "Other"),
    )
    STATUS_CHOICES = (
        ("pending", "Pending"),
        ("reviewed", "Reviewed"),
        ("actioned", "Actioned"),
    )

    id = models.UUIDField(primary_key=True, default=uuid4, editable=False)
    reporter = models.ForeignKey(UserAccount, on_delete=models.CASCADE, related_name="reports_made")
    reported = models.ForeignKey(UserAccount, on_delete=models.CASCADE, related_name="reports_received")
    report_type = models.CharField(max_length=32, choices=REPORT_TYPES, default="other")
    details = models.TextField(blank=True, null=True)
    status = models.CharField(max_length=32, choices=STATUS_CHOICES, default="pending")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"Report from {self.reporter.username} about {self.reported.username}"


class CollabRequest(models.Model):
    REQUEST_TYPES = (
        ("collab", "Collaboration"),
        ("hire", "Paid work"),
        ("mentor", "Mentorship"),
    )

    STATUS_CHOICES = (
        ("open", "Open"),
        ("closed", "Closed"),
    )

    id = models.UUIDField(primary_key=True, default=uuid4, editable=False)
    creator = models.ForeignKey(UserAccount, on_delete=models.CASCADE, related_name="collab_requests")
    request_type = models.CharField(max_length=24, choices=REQUEST_TYPES, default="collab")
    title = models.CharField(max_length=120)
    description = models.TextField(blank=True, default="")
    skills = models.CharField(max_length=255, blank=True, default="")
    budget = models.CharField(max_length=80, blank=True, default="")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="open", db_index=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.title} by {self.creator.username}"


class CollabApplication(models.Model):
    STATUS_CHOICES = (
        ("submitted", "Submitted"),
        ("shortlisted", "Shortlisted"),
        ("accepted", "Accepted"),
        ("declined", "Declined"),
    )

    id = models.UUIDField(primary_key=True, default=uuid4, editable=False)
    request = models.ForeignKey(CollabRequest, on_delete=models.CASCADE, related_name="applications")
    applicant = models.ForeignKey(UserAccount, on_delete=models.CASCADE, related_name="collab_applications")
    pitch = models.TextField(blank=True, default="")
    status = models.CharField(max_length=24, choices=STATUS_CHOICES, default="submitted", db_index=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ("request", "applicant")
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.applicant.username} applied to {self.request.title}"


class BookingSlot(models.Model):
    PURPOSE_CHOICES = (
        ("collab", "Collab call"),
        ("mentor", "Mentorship"),
        ("consult", "Consult"),
    )

    id = models.UUIDField(primary_key=True, default=uuid4, editable=False)
    creator = models.ForeignKey(UserAccount, on_delete=models.CASCADE, related_name="booking_slots")
    starts_at = models.DateTimeField(db_index=True)
    duration_minutes = models.PositiveIntegerField(default=30)
    purpose = models.CharField(max_length=24, choices=PURPOSE_CHOICES, default="collab")
    note = models.CharField(max_length=160, blank=True, default="")
    is_active = models.BooleanField(default=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["starts_at"]

    def __str__(self):
        return f"{self.creator.username} slot at {self.starts_at}"


class BookingRequest(models.Model):
    STATUS_CHOICES = (
        ("pending", "Pending"),
        ("accepted", "Accepted"),
        ("declined", "Declined"),
    )

    id = models.UUIDField(primary_key=True, default=uuid4, editable=False)
    slot = models.ForeignKey(BookingSlot, on_delete=models.CASCADE, related_name="booking_requests")
    requester = models.ForeignKey(UserAccount, on_delete=models.CASCADE, related_name="booking_requests")
    message = models.TextField(blank=True, default="")
    status = models.CharField(max_length=24, choices=STATUS_CHOICES, default="pending", db_index=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ("slot", "requester")
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.requester.username} requested {self.slot}"


class PushSubscription(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid4, editable=False)
    user = models.ForeignKey(UserAccount, on_delete=models.CASCADE, related_name="push_subscriptions")
    endpoint = models.URLField(unique=True)
    p256dh = models.TextField()
    auth = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-updated_at"]

    def __str__(self):
        return f"Push subscription for {self.user.email}"


class DirectConversation(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid4, editable=False)
    user_one = models.ForeignKey(UserAccount, on_delete=models.CASCADE, related_name="direct_conversations_started")
    user_two = models.ForeignKey(UserAccount, on_delete=models.CASCADE, related_name="direct_conversations_received")
    pair_key = models.CharField(max_length=80, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    last_message_at = models.DateTimeField(default=timezone.now, db_index=True)

    class Meta:
        ordering = ["-last_message_at", "-updated_at"]

    def __str__(self):
        return f"Conversation {self.user_one.username} <-> {self.user_two.username}"


class DirectMessage(models.Model):
    MESSAGE_TYPES = (
        ("text", "Text"),
        ("voice", "Voice note"),
    )

    id = models.UUIDField(primary_key=True, default=uuid4, editable=False)
    conversation = models.ForeignKey(DirectConversation, on_delete=models.CASCADE, related_name="messages")
    sender = models.ForeignKey(UserAccount, on_delete=models.CASCADE, related_name="direct_messages_sent")
    reply_to = models.ForeignKey(
        "self",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="replies",
    )
    body = models.TextField(blank=True, default="")
    message_type = models.CharField(max_length=16, choices=MESSAGE_TYPES, default="text")
    audio_url = models.URLField(blank=True, null=True)
    audio_duration_ms = models.PositiveIntegerField(default=0)
    audio_transcript = models.TextField(blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)
    read_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["created_at"]

    def __str__(self):
        return f"Message from {self.sender.username}"


class DirectMessageReaction(models.Model):
    ALLOWED_REACTIONS = (
        ("heart", "Heart"),
        ("laugh", "Laugh"),
        ("fire", "Fire"),
        ("clap", "Clap"),
        ("sad", "Sad"),
    )

    id = models.UUIDField(primary_key=True, default=uuid4, editable=False)
    message = models.ForeignKey(DirectMessage, on_delete=models.CASCADE, related_name="reactions")
    user = models.ForeignKey(UserAccount, on_delete=models.CASCADE, related_name="direct_message_reactions")
    reaction = models.CharField(max_length=16, choices=ALLOWED_REACTIONS)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("message", "user")
        ordering = ["created_at"]

    def __str__(self):
        return f"{self.user.username} reacted {self.reaction}"
