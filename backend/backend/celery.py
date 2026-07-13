import os

from celery import Celery
from celery.schedules import crontab

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')

app = Celery('backend')
app.config_from_object('django.conf:settings', namespace='CELERY')
app.autodiscover_tasks()

app.conf.beat_schedule = {
    'send-overdue-reminders-daily': {
        'task': 'transactions.tasks.send_overdue_reminders',
        'schedule': crontab(hour=6, minute=0),
    },
}
