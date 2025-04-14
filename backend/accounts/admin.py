from django.contrib import admin
from .models import UserAccount
from django.contrib.auth.admin import UserAdmin

@admin.register(UserAccount)
class UserAccountAdmin(UserAdmin):
  list_display = ('email', 'first_name', 'last_name', 'is_staff', 'is_active')
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
