import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getBook } from './services/booksApi';
import Button from '../../components/common/Button';
import './BookDetail.css';

export default function BookDetail() {
  const { id } = useParams();
  const [book, setBook] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    getBook(id).then(({ data }) => setBook(data)).finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div>Loading...</div>;
  if (!book) return <div>Book not found</div>;

  return (
    <div className="book-detail">
      <img src={book.cover || '/assets/images/default-cover.svg'} alt={book.title} />
      <div>
        <h2>{book.title}</h2>
        <p><strong>Author:</strong> {book.authors?.map((a) => a.name).join(', ') || 'Unknown'}</p>
        <p><strong>ISBN:</strong> {book.isbn || 'N/A'}</p>
        <p><strong>Publisher:</strong> {book.publisher?.name || book.publisher || 'Unknown'}</p>
        <p><strong>Year:</strong> {book.publication_year || 'N/A'}</p>
        <p><strong>Description:</strong> {book.description || 'No description available'}</p>
        <p><strong>Available Copies:</strong> {book.available_copies ?? 0}</p>
        <Button variant="primary" onClick={() => navigate('/borrow')}>Borrow</Button>
      </div>
    </div>
  );
}
