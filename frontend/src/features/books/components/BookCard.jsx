import { Link } from 'react-router-dom';
import { useAuth } from '../../../features/auth/context/AuthContext';
import Button from '../../../components/common/Button';

export default function BookCard({ book, onDeleted, onDeleteRequest }) {
  const { user } = useAuth();
  const canManage = user?.role === 'admin' || user?.role === 'librarian';

  const handleDeleteClick = () => {
    if (onDeleteRequest) {
      onDeleteRequest(book);
    }
  };

  return (
    <div className="book-card">
      <img src={book.cover || '/assets/images/default-cover.svg'} alt={book.title} />
      <div className="book-card-body">
        <h4>{book.title}</h4>
        <p>{book.authors?.map((a) => a.name).join(', ')}</p>
        <span className={`status status-${book.available_copies > 0 ? 'available' : 'unavailable'}`}>
          {book.available_copies > 0 ? `${book.available_copies} available` : 'Unavailable'}
        </span>
        <div className="book-card-actions">
          <Link to={`/books/${book.id}`}>View Details</Link>
          {canManage && <Link to={`/books/${book.id}/edit`}>Edit</Link>}
          {canManage && <Button type="button" variant="ghost" size="sm" onClick={handleDeleteClick}>Delete</Button>}
        </div>
      </div>
    </div>
  );
}
