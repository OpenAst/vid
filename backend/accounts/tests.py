from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from django.contrib.auth import get_user_model
from .models import Profile

User = get_user_model()

class ProfileTests(APITestCase):
    def setUp(self):
        self.user_data = {
            "email": "testuser@example.com",
            "username": "testuser",
            "first_name": "Test",
            "last_name": "User",
            "password": "testpassword123"
        }
        self.user = User.objects.create_user(**self.user_data)
        self.public_user_data = {
            "email": "public@example.com",
            "username": "publicuser",
            "first_name": "Public",
            "last_name": "User",
            "password": "publicpassword123"
        }
        self.public_user = User.objects.create_user(**self.public_user_data)

    def test_profile_created_on_user_registration(self):
        """Test that a Profile object is automatically created when a User is created."""
        self.assertIsNotNone(self.user.profile)
        self.assertEqual(self.user.profile.bio, None)

    def test_public_profile_view_restricted_fields(self):
        """Test that public profile view excludes sensitive fields like email."""
        url = reverse('public-profile', kwargs={'username': self.public_user.username})
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['username'], self.public_user.username)
        self.assertNotIn('email', response.data)
        # Check nested profile
        self.assertIn('profile', response.data)
        self.assertNotIn('birth_date', response.data['profile'])

    def test_own_profile_view_includes_private_fields(self):
        """Test that the /me/ endpoint includes full profile data for the authenticated user."""
        self.client.force_authenticate(user=self.user)
        url = reverse('current-user')
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['email'], self.user.email)
        self.assertIn('profile', response.data)
        # Note: birth_date is in ProfileSerializer which is used for own profile
        self.assertIn('birth_date', response.data['profile'])

    def test_profile_update_success(self):
        """Test that a user can update their own profile fields."""
        self.client.force_authenticate(user=self.user)
        url = reverse('profile-update')
        data = {
            "first_name": "UpdatedName",
            "bio": "New bio content",
            "avatar": "https://example.com/avatar.jpg"
        }
        response = self.client.patch(url, data)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Verify changes in DB
        self.user.refresh_from_db()
        self.assertEqual(self.user.first_name, "UpdatedName")
        self.assertEqual(self.user.profile.bio, "New bio content")
        self.assertEqual(self.user.profile.avatar, "https://example.com/avatar.jpg")

    def test_profile_update_unauthorized(self):
        """Test that an unauthenticated user cannot update profiles."""
        url = reverse('profile-update')
        data = {"bio": "Malicious bio"}
        response = self.client.patch(url, data)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
