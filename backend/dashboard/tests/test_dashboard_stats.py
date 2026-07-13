from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework.test import APITestCase


class DashboardStatsViewTests(APITestCase):
    def test_authenticated_member_can_access_dashboard_stats(self):
        User = get_user_model()
        user = User.objects.create_user(
            username='memberdemo',
            password='demo12345',
            email='memberdemo@example.com',
            role='member',
        )

        self.client.force_authenticate(user=user)
        response = self.client.get(reverse('dashboard-stats'))

        self.assertEqual(response.status_code, 200)
        self.assertIn('active_borrows_count', response.data)
        self.assertIn('overdue_count', response.data)
