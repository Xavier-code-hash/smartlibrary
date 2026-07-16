import re
import random
import string
from typing import Optional
from django.db import IntegrityError
from django.conf import settings


def normalize_isbn(isbn: str) -> str:
    """Remove hyphens and spaces from ISBN."""
    return re.sub(r'[\s-]', '', (isbn or '')).strip().upper()


def is_valid_isbn10(isbn: str) -> bool:
    """Validate ISBN-10 checksum."""
    if not re.match(r'^\d{9}[\dX]$', isbn):
        return False
    total = sum((10 - i) * (int(d) if d != 'X' else 10) for i, d in enumerate(isbn))
    return total % 11 == 0


def is_valid_isbn13(isbn: str) -> bool:
    """Validate ISBN-13 checksum."""
    if not re.match(r'^\d{13}$', isbn):
        return False
    total = sum(int(d) * (1 if i % 2 == 0 else 3) for i, d in enumerate(isbn))
    return total % 10 == 0


def is_valid_isbn(isbn: str) -> bool:
    """Validate ISBN-10 or ISBN-13."""
    normalized = normalize_isbn(isbn)
    if len(normalized) == 10:
        return is_valid_isbn10(normalized)
    if len(normalized) == 13:
        return is_valid_isbn13(normalized)
    return False


def generate_isbn13(prefix: str = '978') -> str:
    """Generate a valid ISBN-13 with the given prefix."""
    body = prefix + ''.join(random.choices(string.digits, k=9))
    total = sum(int(d) * (1 if i % 2 == 0 else 3) for i, d in enumerate(body))
    check = (10 - (total % 10)) % 10
    return body + str(check)


def generate_barcode(book_title: str, book_id: int, copy_index: int) -> str:
    """Generate a unique barcode for a book copy."""
    words = re.findall(r'[A-Za-z0-9]+', book_title)[:3]
    code = ''.join(w[:3].upper() for w in words)
    code = code[:8].ljust(8, 'X')
    return f"{code}-{book_id:04d}-{copy_index:02d}"


# ---------------------------------------------------------------------------
# Library verification code (book "type")
#
# Format: PUBLISHER-AUTHOR-TITLE-NUMBER[-YEAR]
#   PUBLISHER : unique letter assignment for the publisher (e.g. "NW")
#   AUTHOR    : unique letter+number assignment for the author (e.g. "A7")
#   TITLE     : abbreviation derived from the title (identical titles match)
#   NUMBER    : unique running count of the book (based on copies/count)
#   YEAR      : library purchase year, appended only when the year has ended
# ---------------------------------------------------------------------------

PUBLISHER_CODE_LENGTH = 2

# Library prefix embedded into generated ISBNs / QR payloads so that codes
# are unique to this library instance.
LIBRARY_PREFIX = getattr(settings, 'LIBRARY_CODE_PREFIX', 'LIB')


def _slugify_token(word: str, length: int) -> str:
    token = re.sub(r'[^A-Za-z0-9]', '', word).upper()
    return token[:length]


def assign_publisher_code(publisher: Publisher) -> str:
    """Return a stable unique letter-based code for a publisher."""
    from .models import Publisher
    existing = set(
        Publisher.objects.filter(code__isnull=False).exclude(pk=publisher.pk)
        .values_list('code', flat=True)
    )
    base = _slugify_token(re.sub(r'[^A-Za-z0-9 ]', '', publisher.name).split()[0], PUBLISHER_CODE_LENGTH) \
        if publisher.name else 'PB'
    code = base
    suffix = 1
    while code in existing:
        code = f"{base[:PUBLISHER_CODE_LENGTH - 1]}{suffix}"
        suffix += 1
        if len(code) > PUBLISHER_CODE_LENGTH:
            code = f"P{suffix}"
    return code


def assign_author_code(author_name: str) -> str:
    """Return a stable unique 2-char code (letter + number) for an author."""
    from .models import Author
    letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
    existing = set(Author.objects.filter(code__isnull=False).values_list('code', flat=True))
    name = (author_name or '').strip()
    initial = (re.sub(r'[^A-Za-z]', '', name).upper() or 'X')[0]
    for num in range(0, 10):
        candidate = f"{initial}{num}"
        if candidate not in existing:
            return candidate
    for letter in letters:
        for num in range(0, 10):
            candidate = f"{letter}{num}"
            if candidate not in existing:
                return candidate
    return f"{initial}9"


def _title_code(title: str) -> str:
    """Deterministic title abbreviation so identical titles match."""
    words = re.findall(r'[A-Za-z0-9]+', title or '')
    if not words:
        return 'XXX'
    if len(words) == 1:
        return _slugify_token(words[0], 3).ljust(3, 'X')
    return (_slugify_token(words[0], 2) + _slugify_token(words[1], 1)).ljust(3, 'X')


def generate_book_code(book: Book) -> str:
    """Build the human-readable verification code for a book."""
    publisher = book.publisher
    publisher_code = 'XX'
    if publisher:
        if not getattr(publisher, 'code', ''):
            publisher.code = assign_publisher_code(publisher)
            Publisher.objects.filter(pk=publisher.pk).update(code=publisher.code)
        publisher_code = publisher.code or 'XX'

    primary_author = book.authors.first()
    author_code = 'X9'
    if primary_author:
        author_code = primary_author.code or 'X9'

    title_code = _title_code(book.title)

    # Running number: count of the book's copies (unique per book), zero-padded.
    number = (book.copies.count() or book.total_copies or 1)
    number_code = f"{number:03d}"

    # Year only appended when the library purchase year has ended.
    year_code = ''
    if book.year_purchased:
        try:
            from datetime import datetime
            if book.year_purchased < datetime.now().year:
                year_code = f"-{book.year_purchased}"
        except Exception:
            year_code = ''

    return f"{publisher_code}-{author_code}-{title_code}-{number_code}{year_code}"


def generate_qr_payload(book: Book) -> str:
    """Build the QR payload embedding the ISBN plus library-unique info."""
    code = generate_book_code(book) or ''
    isbn = normalize_isbn(book.isbn or '')
    return f"{LIBRARY_PREFIX}|{isbn}|{code}|{book.id}"


def generate_library_isbn(book: Book, prefix: str = '978') -> str:
    """Generate a valid ISBN-13 that also carries library-unique info in QR.

    The stored ISBN remains a normal ISBN-13; the library-unique data lives in
    the QR payload built by ``generate_qr_payload`` (which includes the ISBN).
    """
    return generate_isbn13(prefix)


def render_qr_image(payload: str, size: int = 6, border: int = 2):
    """Render a QR code PNG for the given payload. Returns (image, raw_bytes)."""
    import io
    import qrcode
    qr = qrcode.QRCode(version=1, error_correction=qrcode.constants.ERROR_CORRECT_M, box_size=size, border=border)
    qr.add_data(payload)
    qr.make(fit=True)
    img = qr.make_image(fill_color='black', back_color='white')
    buf = io.BytesIO()
    img.save(buf, format='PNG')
    return img, buf.getvalue()
