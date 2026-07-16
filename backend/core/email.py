from django.conf import settings
from django.core.mail import send_mail
from smtplib import SMTPException

import logging

logger = logging.getLogger(__name__)

WELCOME_SUBJECT = 'Welcome to Closure Library'
PASSWORD_RESET_SUBJECT = 'Password Reset Request'
OVERDUE_SUBJECT = 'Overdue Book Reminder'
DUE_SOON_SUBJECT = 'Return Reminder: Your book is due soon'


def send_email(subject, message, recipient_list):
    from_email = settings.DEFAULT_FROM_EMAIL or settings.EMAIL_HOST_USER
    if not from_email:
        logger.warning('No sender email configured. Skipping email send.')
        return False
    try:
        send_mail(
            subject=subject,
            message=message,
            from_email=from_email,
            recipient_list=recipient_list,
            fail_silently=False,
        )
        return True
    except SMTPException as exc:
        logger.error(f"Failed to send email to {recipient_list}: {exc}")
        return False


def send_welcome_email(user):
    message = (
        f"Hi {user.username},\n\n"
        "Welcome to Closure Library! Your account has been created successfully.\n"
        "You can now browse our collection, borrow books, and manage your loans from your dashboard.\n\n"
        "Happy reading!\n"
        "Closure Library Team"
    )
    return send_email(WELCOME_SUBJECT, message, [user.email])


def send_password_reset_email(user, reset_link):
    message = (
        f'Hi {user.username},\n\n'
        'Click the link below to reset your password:\n\n'
        f'{reset_link}\n\n'
        'This link expires in 24 hours.'
    )
    return send_email(PASSWORD_RESET_SUBJECT, message, [user.email])


def send_overdue_reminder_email(user, book_title):
    message = (
        f"Dear {user.username},\n\n"
        f"This is a friendly reminder that the book \"{book_title}\" "
        "you borrowed is now overdue.\n"
        "Please return it as soon as possible to avoid additional fines.\n\n"
        "Thank you,\n"
        "Closure Library Team"
    )
    return send_email(OVERDUE_SUBJECT, message, [user.email])


def send_due_date_reminder_email(user, book_title, due_date_str):
    message = (
        f"Dear {user.username},\n\n"
        f"This is a friendly reminder that \"{book_title}\" "
        f"is due for return on {due_date_str}.\n"
        "Please return it on time to avoid fines.\n\n"
        "Thank you,\n"
        "Closure Library Team"
    )
    return send_email(DUE_SOON_SUBJECT, message, [user.email])

