import base64
import json
import urllib.request
import urllib.error
from datetime import datetime

from django.conf import settings


def _base_url():
    env = getattr(settings, 'MPESA_ENVIRONMENT', 'sandbox')
    if env == 'production':
        return 'https://api.safaricom.co.ke'
    return 'https://sandbox.safaricom.co.ke'


def get_access_token():
    url = f"{_base_url()}/oauth/v1/generate?grant_type=client_credentials"
    key = settings.MPESA_CONSUMER_KEY
    secret = settings.MPESA_CONSUMER_SECRET
    creds = base64.b64encode(f"{key}:{secret}".encode()).decode()
    req = urllib.request.Request(url, headers={'Authorization': f"Basic {creds}"})
    with urllib.request.urlopen(req, timeout=20) as resp:
        return json.loads(resp.read().decode())['access_token']


def normalize_phone(phone):
    digits = ''.join(ch for ch in str(phone) if ch.isdigit())
    if not digits:
        return ''
    if digits.startswith('0'):
        digits = '254' + digits[1:]
    elif len(digits) == 9:
        digits = '254' + digits
    return digits


def stk_push(phone, amount, account_ref, description, callback_url):
    token = get_access_token()
    shortcode = settings.MPESA_SHORTCODE
    passkey = settings.MPESA_PASSKEY
    timestamp = datetime.now().strftime('%Y%m%d%H%M%S')
    password = base64.b64encode(f"{shortcode}{passkey}{timestamp}".encode()).decode()

    payload = {
        'BusinessShortCode': shortcode,
        'Password': password,
        'Timestamp': timestamp,
        'TransactionType': 'CustomerPayBillOnline',
        'Amount': int(round(float(amount))),
        'PartyA': str(phone),
        'PartyB': shortcode,
        'PhoneNumber': str(phone),
        'CallBackURL': callback_url,
        'AccountReference': str(account_ref)[:12],
        'TransactionDesc': str(description)[:30],
    }

    url = f"{_base_url()}/mpesa/stkpush/v1/processrequest"
    data = json.dumps(payload).encode()
    req = urllib.request.Request(
        url,
        data=data,
        headers={
            'Authorization': f"Bearer {token}",
            'Content-Type': 'application/json',
        },
    )
    with urllib.request.urlopen(req, timeout=30) as resp:
        return json.loads(resp.read().decode())
