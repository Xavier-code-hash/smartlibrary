import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getBook, getBookQr } from './services/booksApi';
import Button from '../../components/common/Button';
import './BookDetail.css';

export default function BookDetail() {
  const { id } = useParams();
  const [book, setBook] = useState(null);
  const [qrUrl, setQrUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    let objectUrl;
    Promise.all([getBook(id), getBookQr(id)])
      .then(([{ data }, qrRes]) => {
        setBook(data);
        if (qrRes?.data) {
          objectUrl = URL.createObjectURL(qrRes.data);
          setQrUrl(objectUrl);
        }
      })
      .finally(() => setLoading(false));
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [id]);

  if (loading) return <div>Loading...</div>;
  if (!book) return <div>Book not found</div>;

  const handlePrint = () => {
    const code = book.book_code || 'N/A';
    const win = window.open('', '_blank', 'width=400,height=520');
    if (!win) return;
    win.document.write(`
      <html>
        <head>
          <title>Book Label - ${book.title}</title>
          <style>
            body { font-family: monospace; text-align: center; padding: 24px; }
            h2 { font-size: 16px; }
            .code { font-size: 22px; font-weight: bold; letter-spacing: 1px; margin: 12px 0; }
            img { width: 200px; height: 200px; }
            .meta { font-size: 12px; color: #444; margin-top: 8px; }
          </style>
        </head>
        <body>
          <h2>${book.title}</h2>
          ${qrUrl ? `<img src="${qrUrl}" alt="QR" />` : ''}
          <div class="code">${code}</div>
          <div class="meta">ISBN: ${book.isbn || 'N/A'}</div>
          <script>window.onload = () => { window.print(); }</script>
        </body>
      </html>
    `);
    win.document.close();
  };

  return (
    <div className="book-detail">
      <img src={book.cover || '/assets/images/default-cover.svg'} alt={book.title} />
      <div>
        <h2>{book.title}</h2>
        <p><strong>Author:</strong> {book.authors?.map((a) => a.name).join(', ') || 'Unknown'}</p>
        <p><strong>ISBN:</strong> {book.isbn || 'N/A'}</p>
        <p><strong>Publisher:</strong> {book.publisher?.name || book.publisher || 'Unknown'}</p>
        <p><strong>Year:</strong> {book.publication_year || 'N/A'}</p>
        <p><strong>Purchased:</strong> {book.year_purchased || 'N/A'}</p>
        <p><strong>Verification Code:</strong> <span className="book-code">{book.book_code || 'N/A'}</span></p>
        <p><strong>Description:</strong> {book.description || 'No description available'}</p>
        <p><strong>Available Copies:</strong> {book.available_copies ?? 0}</p>

        {qrUrl && (
          <div className="book-detail-qr">
            <img src={qrUrl} alt="Scan to verify book" />
            <span>Scan to verify (ISBN + library code)</span>
          </div>
        )}

        <div className="book-detail-actions">
          <Button variant="primary" onClick={() => navigate(`/borrow?book=${id}`)}>Borrow</Button>
          <Button variant="outline" onClick={handlePrint}>Print Label</Button>
        </div>
      </div>
    </div>
  );
}
