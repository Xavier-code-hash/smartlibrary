import React, { useState, useEffect } from 'react';
import useBooks from '../features/books/hooks/useBooks';
import BookCard from '../features/books/components/BookCard';
import { deleteBook } from '../features/books/services/booksApi';
import ConfirmDialog from '../components/common/ConfirmDialog';
import Pagination from '../components/common/Pagination';
import { useToast } from '../components/common/Toast';

export default function Search() {
  const [query, setQuery] = useState('');
  const [debouncedValue, setDebouncedValue] = useState('');
  const params = React.useMemo(() => ({ search: debouncedValue }), [debouncedValue]);
  const { books, loading, refetch, totalPages, page, setPage } = useBooks(params);
  const toast = useToast();
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(query), 500);
    return () => clearTimeout(timer);
  }, [query]);

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
      toast(err.response?.data?.detail || err.response?.data?.title || 'Delete failed. Please try again.', { variant: 'error' });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="search-page">
      <h2>Advanced Search</h2>
      <input
        type="text"
        placeholder="Search by title, author, ISBN..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="search-input"
      />
      {!loading && books.length === 0 && debouncedValue && (
        <p className="search-empty">No books found for "{debouncedValue}".</p>
      )}
      <div className="book-grid">
        {loading ? <p>Loading...</p> : books.map((b) => <BookCard key={b.id} book={b} onDeleted={refetch} onDeleteRequest={handleDeleteRequest} />)}
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
