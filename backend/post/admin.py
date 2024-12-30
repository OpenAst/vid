from django.contrib import admin
from .models import Post

@admin.register(Post)
class PostAdmin(admin.ModelAdmin):
  list_display = ('content', 'created_at', 'user')
  search_fields = ('title', 'content')
  