from django.contrib import admin
from .models import BookingRequest, BookingSlot, CollabApplication, CollabRequest, UserAccount
from django.contrib.auth.admin import UserAdmin

@admin.register(UserAccount)
class UserAccountAdmin(UserAdmin):
  list_display = ('email', 'username', 'first_name', 'last_name', 'is_staff', 'is_active')
  list_filter = ('is_staff', 'is_active')
  search_fields = ('email', 'first_name', 'last_name')
  ordering = ('email',)

  fieldsets = (
    (None, {'fields': ('email', 'password')}),
    ('Personal info', {'fields': ('first_name', 'last_name')}),
    ('Permissions', {'fields': ('is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions')}),
    ('Important dates', {'fields': ('last_login', 'date_joined')}),
  )

  add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('email', 'first_name', 'last_name', 'password1', 'password2', 'is_staff', 'is_active'),
        }),
    )

  filter_horizontal = ('groups', 'user_permissions',)


@admin.register(CollabRequest)
class CollabRequestAdmin(admin.ModelAdmin):
  list_display = ('title', 'creator', 'request_type', 'status', 'created_at')
  list_filter = ('request_type', 'status', 'created_at')
  search_fields = ('title', 'description', 'skills', 'creator__username')


@admin.register(CollabApplication)
class CollabApplicationAdmin(admin.ModelAdmin):
  list_display = ('request', 'applicant', 'status', 'created_at')
  list_filter = ('status', 'created_at')
  search_fields = ('request__title', 'applicant__username', 'pitch')


@admin.register(BookingSlot)
class BookingSlotAdmin(admin.ModelAdmin):
  list_display = ('creator', 'purpose', 'starts_at', 'duration_minutes', 'is_active')
  list_filter = ('purpose', 'is_active', 'starts_at')
  search_fields = ('creator__username', 'note')


@admin.register(BookingRequest)
class BookingRequestAdmin(admin.ModelAdmin):
  list_display = ('slot', 'requester', 'status', 'created_at')
  list_filter = ('status', 'created_at')
  search_fields = ('slot__creator__username', 'requester__username', 'message')
