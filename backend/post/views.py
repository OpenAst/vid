from django.shortcuts import render

# Create your views here.
from django.shortcuts import render
from .models import Post
from rest_framework.views import APIView
from rest_framework.response import Response
from .serializers import PostSerializer
from django.shortcuts import get_object_or_404
from rest_framework import status


class PostListView(APIView):
  def get(self, request):
    posts = Post.objects.all().order_by('-created_at')
    serializer = PostSerializer(posts, many=True)
    return Response(serializer.data)
  
  def post(self, request):
    serializer = PostSerializer(data=request.data)
    if serializer.is_valid():
      serializer.save()
      return Response(serializer.data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
  
class PostDetailView(APIView):
  def get(self, request, slug):
    post = Post.objects.get(slug=slug)
    serializer = PostSerializer(post)
    return Response(serializer.data)
  
  def post(self, request, slug):
    # Retrieve the post by slug
    post = get_object_or_404(Post, slug=slug)
    serializer = PostSerializer(post, data=request.data, partial=True)
    if serializer.is_valid():
      # Update the post object
      serializer.save() 
      return Response(serializer.data, status=status.HTTP_200_OK)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)