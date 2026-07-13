import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import useBooks from './hooks/useBooks';
import BookCard from './components/BookCard';
import { deleteBook } from './services/booksApi';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import Pagination from '../../components/common/Pagination';
import { useToast } from '../../components/common/Toast';
import './BookList.css';

export default function BookList() {
  const { books, loading, error, refetch, totalPages, page, setPage } = useBooks();
  const location = useLocation();
  const toast = useToast();
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (location.state?.booksCreated) {
      refetch();
    }
  }, [location.state, refetch]);

  const handleDeleteRequest = (book) => {
    setDeleteTarget(book);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteBook(deleteTarget.id);
      toast('Book deleted successfully', { variant: 'success' });
      setDeleteTarget(null);
      refetch();
    } catch (err) {
      setDeleteTarget(null);
      if (err.response?.status === 404) {
        toast('This book no longer exists. Refreshing list.', { variant: 'warning' });
        refetch();
      } else {
        toast(err.response?.data?.detail || err.response?.data?.title || 'Delete failed. Please try again.', { variant: 'error' });
      }
    } finally {
      setDeleting(false);
    }
  };

  if (loading) return <div className="loading">Loading books...</div>;
  if (error) return <div className="error">Error: {error}</div>;

  return (
    <div className="book-list">
      <h2>All Books</h2>
      <div className="book-grid">
        {books.map((book) => <BookCard key={book.id} book={book} onDeleted={refetch} onDeleteRequest={handleDeleteRequest} />)}
      </div>

      <Pagination page={page} totalPages={totalPages} onChange={setPage} />

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete Book"
        message={deleteTarget ? `Are you sure you want to delete "${deleteTarget.title}"? This action cannot be undone.` : ''}
        confirmText="Delete"
        danger
        loading={deleting}
      />
    </div>
  );
}
