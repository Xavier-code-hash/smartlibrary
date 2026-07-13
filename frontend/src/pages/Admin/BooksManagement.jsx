import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import BookForm from '../../features/books/BookForm';
import useBooks from '../../features/books/hooks/useBooks';
import BookCard from '../../features/books/components/BookCard';
import { deleteBook } from '../../features/books/services/booksApi';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import Pagination from '../../components/common/Pagination';
import { useToast } from '../../components/common/Toast';
import './BooksManagement.css';

export default function BooksManagement() {
  const location = useLocation();
  const { books, loading, error, refetch, totalPages, page, setPage } = useBooks();
  const toast = useToast();
  const [deleteTarget, setDeleteTarget] = React.useState(null);
  const [deleting, setDeleting] = React.useState(false);

  useEffect(() => {
    if (location.state?.booksCreated) {
      refetch();
      window.history.replaceState({}, document.title);
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

  return (
    <div className="books-management">
      <h1>Books Management</h1>
      <BookForm />
      {loading ? (
        <div className="loading">Loading books...</div>
      ) : error ? (
        <div className="error">Error: {error}</div>
      ) : (
        <div className="book-list">
          <div className="book-grid">
            {books.map((book) => (
              <BookCard key={book.id} book={book} onDeleted={refetch} onDeleteRequest={handleDeleteRequest} />
            ))}
          </div>
        </div>
      )}

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
