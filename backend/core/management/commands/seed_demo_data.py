from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.db import transaction
from django.conf import settings
from books.models import Author, Category, Publisher, Book, BookCopy
from transactions.models import BorrowTransaction, Reservation, Fine
from core.models import Notification
from decimal import Decimal
from datetime import timedelta, datetime
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont


class Command(BaseCommand):
    help = 'Seed the project with mock data for visual demonstration'

    @transaction.atomic
    def handle(self, *args, **options):
        User = get_user_model()

        User.objects.all().delete()
        Book.objects.all().delete()
        Author.objects.all().delete()
        Category.objects.all().delete()
        Publisher.objects.all().delete()
        BookCopy.objects.all().delete()
        BorrowTransaction.objects.all().delete()
        Reservation.objects.all().delete()
        Fine.objects.all().delete()
        Notification.objects.all().delete()

        admin = User.objects.create_user(username='admin', password='admin123', email='admin@example.com', role='admin', is_staff=True, is_superuser=True)
        librarian = User.objects.create_user(username='librarian', password='librarian123', email='librarian@example.com', role='librarian')
        member = User.objects.create_user(username='member', password='member123', email='member@example.com', role='member')

        users = [admin, librarian, member]
        for index in range(1, 48):
            username = f'member{index:02d}'
            user = User.objects.create_user(
                username=username,
                password='demo12345',
                email=f'{username}@example.com',
                role='member',
                first_name=['Ava', 'Noah', 'Mia', 'Liam', 'Sophia', 'Ethan', 'Amelia', 'Lucas', 'Olivia', 'Mason'][index % 10],
                last_name=['Nguyen', 'Patel', 'Garcia', 'Kim', 'Brown', 'Singh', 'Miller', 'Davis', 'Lopez', 'Chen'][index % 10],
                phone=f'555-01{(index % 90) + 10:02d}',
                address=f'{100 + index} Demo Street, City Center',
                membership_id=f'MEM{1000 + index}',
            )
            users.append(user)

        authors = {}
        categories = {}
        publishers = {}

        for author_name, biography, birth_date in [
            ('Jane Austen', 'Renowned English novelist.', '1775-12-16'),
            ('George Orwell', 'English novelist and essayist.', '1903-06-25'),
            ('Chimamanda Ngozi Adichie', 'Nigerian novelist and writer.', '1977-09-15'),
            ('J.R.R. Tolkien', 'British author best known for fantasy classics.', '1892-01-03'),
            ('F. Scott Fitzgerald', 'American novelist of the Jazz Age.', '1896-09-24'),
            ('Haruki Murakami', 'Contemporary Japanese novelist and short-story writer.', '1949-01-12'),
            ('Margaret Atwood', 'Canadian novelist and cultural critic.', '1939-11-18'),
            ('Toni Morrison', 'American novelist and Nobel laureate.', '1931-02-18'),
            ('Isabel Allende', 'Chilean novelist known for magical realism.', '1942-08-02'),
            ('Yuval Noah Harari', 'Israeli historian and bestselling nonfiction author.', '1976-02-24'),
            ('Malala Yousafzai', 'Pakistani activist and education advocate.', '1997-07-12'),
            ('James Clear', 'Writer and productivity expert.', '1986-01-22'),
            ('Andy Weir', 'American author of science-fiction thrillers.', '1972-06-16'),
            ('Agatha Christie', 'British queen of mystery fiction.', '1890-09-15'),
            ('Kazuo Ishiguro', 'British author of literary fiction.', '1954-11-08'),
            ('Gabriel García Márquez', 'Colombian novelist and Nobel laureate.', '1927-03-06'),
            ('Mary Shelley', 'English novelist and early pioneer of science fiction.', '1797-08-30'),
            ('Charlotte Brontë', 'English novelist and poet.', '1816-04-21'),
            ('Emily Brontë', 'English novelist and poet.', '1818-07-30'),
            ('Herman Melville', 'American novelist and poet.', '1819-08-01'),
        ]:
            authors[author_name] = Author.objects.create(name=author_name, biography=biography, birth_date=birth_date)

        for category_name, description in [
            ('Fiction', 'Narrative stories and novels'),
            ('Classic', 'Timeless literary classics'),
            ('Science', 'Scientific and educational content'),
            ('Fantasy', 'Imaginative and magical storytelling'),
            ('Biography', 'Life stories and memoirs'),
            ('History', 'Historical and cultural studies'),
            ('Self-Help', 'Practical personal development'),
            ('Mystery', 'Suspenseful detective and crime writing'),
            ('Science Fiction', 'Speculative and futuristic fiction'),
            ('Nonfiction', 'Informative and factual writing'),
        ]:
            categories[category_name] = Category.objects.create(name=category_name, description=description)

        for publisher_name, address, phone in [
            ('Northwind Press', '12 Market Street', '555-0101'),
            ('River Books', '88 Lakeview Road', '555-0102'),
            ('Hearthstone Publishing', '44 Lantern Avenue', '555-0103'),
            ('Atlas Library House', '9 Harbor Drive', '555-0104'),
            ('Crescent Media', '77 Skyline Road', '555-0105'),
            ('Global Literacy Press', '21 Civic Square', '555-0106'),
        ]:
            publishers[publisher_name] = Publisher.objects.create(name=publisher_name, address=address, phone=phone)

        book_specs = [
            {'title': 'Pride and Prejudice', 'author': 'Jane Austen', 'categories': ['Fiction', 'Classic'], 'publisher': 'Northwind Press', 'year': 1813, 'description': 'A romantic novel of manners and social standing.', 'copies': 3, 'prefix': 'PRD'},
            {'title': '1984', 'author': 'George Orwell', 'categories': ['Fiction', 'Science'], 'publisher': 'River Books', 'year': 1949, 'description': 'A dystopian political novel about surveillance and oppression.', 'copies': 3, 'prefix': 'N84'},
            {'title': 'Half of a Yellow Sun', 'author': 'Chimamanda Ngozi Adichie', 'categories': ['Fiction', 'History'], 'publisher': 'River Books', 'year': 2006, 'description': 'A powerful historical novel about Nigeria during the civil war.', 'copies': 2, 'prefix': 'HYS'},
            {'title': 'The Hobbit', 'author': 'J.R.R. Tolkien', 'categories': ['Fantasy', 'Classic'], 'publisher': 'Hearthstone Publishing', 'year': 1937, 'description': 'A classic fantasy adventure following Bilbo Baggins.', 'copies': 3, 'prefix': 'HOB'},
            {'title': 'To Kill a Mockingbird', 'author': 'Harper Lee', 'categories': ['Fiction', 'Classic'], 'publisher': 'Atlas Library House', 'year': 1960, 'description': 'A coming-of-age novel about justice and empathy.', 'copies': 2, 'prefix': 'TKM'},
            {'title': 'The Great Gatsby', 'author': 'F. Scott Fitzgerald', 'categories': ['Fiction', 'Classic'], 'publisher': 'Northwind Press', 'year': 1925, 'description': 'A glittering portrait of ambition and the American Dream.', 'copies': 2, 'prefix': 'GGT'},
            {'title': 'One Hundred Years of Solitude', 'author': 'Gabriel García Márquez', 'categories': ['Fiction', 'Classic'], 'publisher': 'Global Literacy Press', 'year': 1967, 'description': 'A multigenerational saga of love, memory, and family.', 'copies': 2, 'prefix': 'OHS'},
            {'title': 'The Catcher in the Rye', 'author': 'J.D. Salinger', 'categories': ['Fiction', 'Classic'], 'publisher': 'Crescent Media', 'year': 1951, 'description': 'A candid portrait of youth, alienation, and rebellion.', 'copies': 2, 'prefix': 'CIR'},
            {'title': 'Harry Potter and the Sorcerer\'s Stone', 'author': 'J.K. Rowling', 'categories': ['Fantasy', 'Fiction'], 'publisher': 'Hearthstone Publishing', 'year': 1997, 'description': 'An enchanted introduction to the world of Hogwarts.', 'copies': 3, 'prefix': 'HPS'},
            {'title': 'The Lord of the Rings', 'author': 'J.R.R. Tolkien', 'categories': ['Fantasy', 'Classic'], 'publisher': 'Hearthstone Publishing', 'year': 1954, 'description': 'An epic quest through the lands of Middle-earth.', 'copies': 2, 'prefix': 'LOR'},
            {'title': 'The Alchemist', 'author': 'Paulo Coelho', 'categories': ['Fiction', 'Self-Help'], 'publisher': 'Atlas Library House', 'year': 1988, 'description': 'A philosophical journey to discover one\'s personal legend.', 'copies': 2, 'prefix': 'ALC'},
            {'title': 'The Kite Runner', 'author': 'Khaled Hosseini', 'categories': ['Fiction', 'History'], 'publisher': 'River Books', 'year': 2003, 'description': 'A moving story of friendship and redemption in Afghanistan.', 'copies': 2, 'prefix': 'KTR'},
            {'title': 'Sapiens', 'author': 'Yuval Noah Harari', 'categories': ['Nonfiction', 'History'], 'publisher': 'Global Literacy Press', 'year': 2011, 'description': 'A sweeping overview of human history and civilization.', 'copies': 2, 'prefix': 'SAP'},
            {'title': 'Becoming', 'author': 'Michelle Obama', 'categories': ['Biography', 'Nonfiction'], 'publisher': 'Crescent Media', 'year': 2018, 'description': 'The memoir of the former First Lady and public servant.', 'copies': 2, 'prefix': 'BEC'},
            {'title': 'Educated', 'author': 'Tara Westover', 'categories': ['Biography', 'Nonfiction'], 'publisher': 'Atlas Library House', 'year': 2018, 'description': 'A memoir about resilience, family, and self-invention.', 'copies': 2, 'prefix': 'EDU'},
            {'title': 'The Immortal Life of Henrietta Lacks', 'author': 'Rebecca Skloot', 'categories': ['Biography', 'Science'], 'publisher': 'Northwind Press', 'year': 2010, 'description': 'The story of a woman whose cells transformed medicine.', 'copies': 2, 'prefix': 'HEN'},
            {'title': 'Circe', 'author': 'Madeline Miller', 'categories': ['Fantasy', 'Fiction'], 'publisher': 'Global Literacy Press', 'year': 2018, 'description': 'A retelling of Greek mythology through the eyes of Circe.', 'copies': 2, 'prefix': 'CIR'},
            {'title': 'The Night Circus', 'author': 'Erin Morgenstern', 'categories': ['Fantasy', 'Fiction'], 'publisher': 'Crescent Media', 'year': 2011, 'description': 'A magical competition unfolds in an enchanted circus.', 'copies': 2, 'prefix': 'NOC'},
            {'title': 'Atomic Habits', 'author': 'James Clear', 'categories': ['Self-Help', 'Nonfiction'], 'publisher': 'River Books', 'year': 2018, 'description': 'Practical strategies to build better habits and break bad ones.', 'copies': 2, 'prefix': 'ATH'},
            {'title': 'Deep Work', 'author': 'Cal Newport', 'categories': ['Self-Help', 'Nonfiction'], 'publisher': 'Atlas Library House', 'year': 2016, 'description': 'A guide to focused work in a distracted world.', 'copies': 2, 'prefix': 'DWP'},
            {'title': 'The Martian', 'author': 'Andy Weir', 'categories': ['Science Fiction', 'Fiction'], 'publisher': 'Hearthstone Publishing', 'year': 2011, 'description': 'An astronaut stranded on Mars must improvise to survive.', 'copies': 2, 'prefix': 'MRT'},
            {'title': 'Dune', 'author': 'Frank Herbert', 'categories': ['Science Fiction', 'Fiction'], 'publisher': 'Global Literacy Press', 'year': 1965, 'description': 'A sweeping epic about politics, ecology, and destiny.', 'copies': 2, 'prefix': 'DUN'},
            {'title': 'Project Hail Mary', 'author': 'Andy Weir', 'categories': ['Science Fiction', 'Fiction'], 'publisher': 'Northwind Press', 'year': 2021, 'description': 'A lone astronaut faces an impossible crisis in space.', 'copies': 2, 'prefix': 'PHM'},
            {'title': 'The Silent Patient', 'author': 'Alex Michaelides', 'categories': ['Mystery', 'Fiction'], 'publisher': 'Crescent Media', 'year': 2019, 'description': 'A psychological thriller about a woman who stops speaking.', 'copies': 2, 'prefix': 'STP'},
            {'title': 'The Thursday Murder Club', 'author': 'Richard Osman', 'categories': ['Mystery', 'Fiction'], 'publisher': 'River Books', 'year': 2020, 'description': 'A group of retirees investigates cold cases with wit and charm.', 'copies': 2, 'prefix': 'TMC'},
            {'title': 'The Lincoln Highway', 'author': 'Amor Towles', 'categories': ['Fiction', 'History'], 'publisher': 'Atlas Library House', 'year': 2021, 'description': 'Two brothers embark on a cross-country journey in postwar America.', 'copies': 2, 'prefix': 'LNH'},
            {'title': 'The Vanishing Half', 'author': 'Brit Bennett', 'categories': ['Fiction', 'History'], 'publisher': 'Northwind Press', 'year': 2020, 'description': 'A family story about identity, race, and the lives we choose.', 'copies': 2, 'prefix': 'VNH'},
            {'title': 'The Midnight Library', 'author': 'Matt Haig', 'categories': ['Fantasy', 'Fiction'], 'publisher': 'Global Literacy Press', 'year': 2020, 'description': 'A library between lives offers a chance to rewrite regret.', 'copies': 2, 'prefix': 'MLB'},
            {'title': 'Remarkably Bright Creatures', 'author': 'Shelby Van Pelt', 'categories': ['Fiction', 'Mystery'], 'publisher': 'Hearthstone Publishing', 'year': 2022, 'description': 'An octopus and a grieving widow form an unlikely bond.', 'copies': 2, 'prefix': 'RBC'},
            {'title': 'Homegoing', 'author': 'Yaa Gyasi', 'categories': ['Fiction', 'History'], 'publisher': 'Crescent Media', 'year': 2016, 'description': 'A multigenerational novel tracing the legacy of slavery.', 'copies': 2, 'prefix': 'HMG'},
            {'title': 'Beloved', 'author': 'Toni Morrison', 'categories': ['Fiction', 'Classic'], 'publisher': 'River Books', 'year': 1987, 'description': 'A haunting novel about memory, trauma, and freedom.', 'copies': 2, 'prefix': 'BLV'},
            {'title': 'The House of the Spirits', 'author': 'Isabel Allende', 'categories': ['Fiction', 'Classic'], 'publisher': 'Atlas Library House', 'year': 1982, 'description': 'An intergenerational family saga rooted in Chile.', 'copies': 2, 'prefix': 'HOS'},
            {'title': 'The Name of the Rose', 'author': 'Umberto Eco', 'categories': ['Mystery', 'Fiction'], 'publisher': 'Northwind Press', 'year': 1980, 'description': 'A murder mystery set inside a medieval abbey.', 'copies': 2, 'prefix': 'NOR'},
            {'title': 'The Master and Margarita', 'author': 'Mikhail Bulgakov', 'categories': ['Fiction', 'Classic'], 'publisher': 'Global Literacy Press', 'year': 1967, 'description': 'A satirical fantasy about the devil in Soviet Moscow.', 'copies': 2, 'prefix': 'MAM'},
            {'title': 'Never Let Me Go', 'author': 'Kazuo Ishiguro', 'categories': ['Science Fiction', 'Fiction'], 'publisher': 'Crescent Media', 'year': 2005, 'description': 'A quietly devastating novel about memory and mortality.', 'copies': 2, 'prefix': 'NLM'},
            {'title': 'The Road', 'author': 'Cormac McCarthy', 'categories': ['Fiction', 'Classic'], 'publisher': 'Hearthstone Publishing', 'year': 2006, 'description': 'A father and son travel through a burned-out America.', 'copies': 2, 'prefix': 'TRD'},
            {'title': 'The Left Hand of Darkness', 'author': 'Ursula K. Le Guin', 'categories': ['Science Fiction', 'Fiction'], 'publisher': 'Atlas Library House', 'year': 1969, 'description': 'A pioneering exploration of alien culture and gender.', 'copies': 2, 'prefix': 'LHD'},
            {'title': 'Frankenstein', 'author': 'Mary Shelley', 'categories': ['Classic', 'Science Fiction'], 'publisher': 'Northwind Press', 'year': 1818, 'description': 'A foundational gothic novel about ambition and creation.', 'copies': 2, 'prefix': 'FRK'},
            {'title': 'Jane Eyre', 'author': 'Charlotte Brontë', 'categories': ['Classic', 'Fiction'], 'publisher': 'River Books', 'year': 1847, 'description': 'An enduring novel of love, independence, and moral strength.', 'copies': 2, 'prefix': 'JAE'},
            {'title': 'Wuthering Heights', 'author': 'Emily Brontë', 'categories': ['Classic', 'Fiction'], 'publisher': 'Crescent Media', 'year': 1847, 'description': 'A tempestuous tale of passion and revenge on the moors.', 'copies': 2, 'prefix': 'WTH'},
            {'title': 'Moby-Dick', 'author': 'Herman Melville', 'categories': ['Classic', 'Fiction'], 'publisher': 'Global Literacy Press', 'year': 1851, 'description': 'An obsessive voyage into the pursuit of a legendary whale.', 'copies': 2, 'prefix': 'MBD'},
            {'title': 'Crime and Punishment', 'author': 'Fyodor Dostoevsky', 'categories': ['Classic', 'Fiction'], 'publisher': 'Hearthstone Publishing', 'year': 1866, 'description': 'A psychological drama about guilt, conscience, and redemption.', 'copies': 2, 'prefix': 'CAP'},
            {'title': 'The Brothers Karamazov', 'author': 'Fyodor Dostoevsky', 'categories': ['Classic', 'Fiction'], 'publisher': 'Atlas Library House', 'year': 1880, 'description': 'A philosophical novel about faith, family, and free will.', 'copies': 2, 'prefix': 'BKA'},
            {'title': 'The Odyssey', 'author': 'Homer', 'categories': ['Classic', 'Fiction'], 'publisher': 'Northwind Press', 'year': 800, 'description': 'An ancient epic of travel, homecoming, and heroism.', 'copies': 2, 'prefix': 'ODY'},
            {'title': 'The Iliad', 'author': 'Homer', 'categories': ['Classic', 'Fiction'], 'publisher': 'River Books', 'year': 750, 'description': 'A monumental poem of war, honor, and fate.', 'copies': 2, 'prefix': 'ILI'},
            {'title': 'The Picture of Dorian Gray', 'author': 'Oscar Wilde', 'categories': ['Classic', 'Fiction'], 'publisher': 'Global Literacy Press', 'year': 1890, 'description': 'A gothic novel on beauty, corruption, and moral decay.', 'copies': 2, 'prefix': 'PDG'},
            {'title': 'Dracula', 'author': 'Bram Stoker', 'categories': ['Classic', 'Mystery'], 'publisher': 'Hearthstone Publishing', 'year': 1897, 'description': 'A landmark horror novel of suspense and terror.', 'copies': 2, 'prefix': 'DRC'},
            {'title': 'The Hound of the Baskervilles', 'author': 'Arthur Conan Doyle', 'categories': ['Mystery', 'Classic'], 'publisher': 'Crescent Media', 'year': 1902, 'description': 'Sherlock Holmes investigates a legendary family curse.', 'copies': 2, 'prefix': 'HOB'},
            {'title': 'The Da Vinci Code', 'author': 'Dan Brown', 'categories': ['Mystery', 'Fiction'], 'publisher': 'Northwind Press', 'year': 2003, 'description': 'A modern thriller blending art, religion, and conspiracy.', 'copies': 2, 'prefix': 'DVC'},
            {'title': 'The Secret Garden', 'author': 'Frances Hodgson Burnett', 'categories': ['Classic', 'Fiction'], 'publisher': 'River Books', 'year': 1911, 'description': 'A hopeful story of renewal and the healing power of nature.', 'copies': 2, 'prefix': 'SGD'},
        ]

        created_books = {}
        for index, spec in enumerate(book_specs, start=1):
            author_name = spec['author']
            if author_name not in authors:
                authors[author_name] = Author.objects.create(name=author_name, biography='Featured contemporary or classic author.', birth_date=None)

            book = Book.objects.create(
                title=spec['title'],
                isbn=f'978{index:010d}',
                publisher=publishers[spec['publisher']],
                publication_year=spec['year'],
                description=spec['description'],
                total_copies=spec['copies'],
            )
            book.authors.add(authors[author_name])
            book.categories.add(*(categories[name] for name in spec['categories']))
            created_books[spec['title']] = book

            cover_name = f"{spec['prefix']}-{index:02d}.png"
            cover_path = Path(settings.MEDIA_ROOT) / 'covers' / cover_name
            cover_path.parent.mkdir(parents=True, exist_ok=True)
            img = Image.new('RGB', (400, 600), color=(79, 70, 229))
            draw = ImageDraw.Draw(img)
            try:
                font = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 28)
            except Exception:
                font = ImageFont.load_default()
            text = spec['title']
            bbox = draw.textbbox((0, 0), text, font=font)
            text_width = bbox[2] - bbox[0]
            text_height = bbox[3] - bbox[1]
            x = (400 - text_width) / 2
            y = (600 - text_height) / 2
            draw.text((x, y), text, fill=(255, 255, 255), font=font)
            img.save(cover_path)
            book.cover.name = f'covers/{cover_name}'
            book.save(update_fields=['cover'])

            for copy_index in range(1, spec['copies'] + 1):
                status = 'available' if copy_index == 1 else 'issued' if copy_index == 2 else 'damaged'
                BookCopy.objects.create(
                    book=book,
                    barcode=f"{spec['prefix']}-{index:02d}-{copy_index:02d}",
                    status=status,
                )

        for recipient, message in [
            (admin, 'New member registration requires approval.'),
            (member, 'Your reservation for 1984 is confirmed.'),
            (librarian, 'Two books need catalog review this week.'),
            (users[3], 'A new copy of The Hobbit is now available.'),
            (users[7], 'Your borrowed title is due soon.'),
            (users[12], 'A reserved title has moved up in the queue.'),
        ]:
            Notification.objects.create(recipient=recipient, message=message)

        available_copies = list(BookCopy.objects.filter(status='available'))
        issued_copies = list(BookCopy.objects.filter(status='issued'))
        for index, copy in enumerate(issued_copies[:10]):
            if index < 3:
                due = datetime.now() - timedelta(days=index + 1)
            else:
                due = datetime.now() + timedelta(days=7 + index)
            transaction_obj = BorrowTransaction.objects.create(
                user=users[index + 3],
                book_copy=copy,
                due_date=due,
                status='issued',
            )
            if index < 3:
                BorrowTransaction.objects.filter(pk=transaction_obj.pk).update(status='overdue', return_date=None)
            Fine.objects.create(transaction=transaction_obj, amount=Decimal(f'{index + 1}.50'))

        for index, book in enumerate(list(created_books.values())[:8]):
            Reservation.objects.create(user=users[index + 4], book=book, status='pending' if index % 2 == 0 else 'fulfilled', queue_position=index + 1)

        self.stdout.write(self.style.SUCCESS('Seeded demo data successfully.'))