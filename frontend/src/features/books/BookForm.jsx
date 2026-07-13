import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { createBook, getBook, updateBook, getBooks } from './services/booksApi';
import api from '../../services/api';
import Button from '../../components/common/Button';
import { useToast } from '../../components/common/Toast';
import './BookForm.css';

export default function BookForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [authors, setAuthors] = useState([]);
  const [categories, setCategories] = useState([]);
  const [publishers, setPublishers] = useState([]);
  const [coverFile, setCoverFile] = useState(null);
  const [coverPreview, setCoverPreview] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [isbnCheck, setIsbnCheck] = useState({ checking: false, duplicate: null });
  const isbnTimerRef = useRef(null);
  const [form, setForm] = useState({
    title: '',
    isbn: '',
    publisher: '',
    publication_year: '',
    description: '',
    authors: [],
    categories: [],
    total_copies: 1,
  });

  const loadOptions = useCallback(async () => {
    const [authorsRes, categoriesRes, publishersRes] = await Promise.all([
      api.get('/books/authors/'),
      api.get('/books/categories/'),
      api.get('/books/publishers/'),
    ]);
    setAuthors(authorsRes.data.results || authorsRes.data);
    setCategories(categoriesRes.data.results || categoriesRes.data);
    setPublishers(publishersRes.data.results || publishersRes.data);
  }, []);

  useEffect(() => {
    loadOptions();
  }, [loadOptions]);

  useEffect(() => {
    if (!id) return;
    getBook(id)
      .then(({ data }) => {
        setForm({
          title: data.title || '',
          isbn: data.isbn || '',
          publisher: data.publisher?.id || '',
          publication_year: data.publication_year || '',
          description: data.description || '',
          authors: data.authors?.map((a) => a.id) || [],
          categories: data.categories?.map((c) => c.id) || [],
          total_copies: data.total_copies || 1,
        });
        setCoverPreview(data.cover || '');
      })
      .catch(() => setError('Failed to load book'));
  }, [id]);

  const checkIsbn = useCallback(async (isbn) => {
    if (!isbn || isbn.trim().length < 10) {
      setIsbnCheck({ checking: false, duplicate: null });
      return;
    }
    setIsbnCheck({ checking: true, duplicate: null });
    try {
      const { data } = await getBooks({ search: isbn.trim() });
      const results = data?.results || data || [];
      const matches = results.filter((b) => b.isbn === isbn.trim() && (!id || b.id !== Number(id)));
      if (matches.length > 0) {
        setIsbnCheck({ checking: false, duplicate: matches[0] });
      } else {
        setIsbnCheck({ checking: false, duplicate: null });
      }
    } catch {
      setIsbnCheck({ checking: false, duplicate: null });
    }
  }, [id]);

  const handleChange = (e) => {
    let value;
    if (e.target.multiple) {
      value = Array.from(e.target.selectedOptions)
        .filter((o) => o.selected)
        .map((o) => Number(o.value));
    } else if (e.target.type === 'checkbox') {
      value = e.target.checked;
    } else {
      value = e.target.value;
    }

    setForm((prev) => {
      const next = { ...prev, [e.target.name]: value };
      if (e.target.name === 'isbn') {
        setIsbnCheck({ checking: false, duplicate: null });
        setFieldErrors((prevErrors) => ({ ...prevErrors, isbn: undefined }));
        if (isbnTimerRef.current) clearTimeout(isbnTimerRef.current);
        isbnTimerRef.current = setTimeout(() => checkIsbn(value), 400);
      }
      return next;
    });
  };

  const handleCoverChange = (e) => {
    const file = e.target.files?.[0] || null;
    setCoverFile(file);
    if (file) {
      setCoverPreview(URL.createObjectURL(file));
    } else {
      setCoverPreview('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setFieldErrors({});
    setIsbnCheck({ checking: false, duplicate: null });
    setSaving(true);
    try {
      const payload = new FormData();
      payload.append('title', form.title || '');
      payload.append('isbn', form.isbn || '');
      if (form.publisher) payload.append('publisher', String(form.publisher));
      if (form.publication_year) payload.append('publication_year', String(form.publication_year));
      payload.append('description', form.description || '');
      payload.append('total_copies', String(form.total_copies || 1));
      (form.authors || []).forEach((authorId) => payload.append('authors', String(authorId)));
      (form.categories || []).forEach((categoryId) => payload.append('categories', String(categoryId)));
      if (coverFile) payload.append('cover', coverFile);

      if (id) {
        await updateBook(id, payload, { headers: { 'Content-Type': 'multipart/form-data' } });
        toast('Book updated successfully', { variant: 'success' });
      } else {
        await createBook(payload, { headers: { 'Content-Type': 'multipart/form-data' } });
        toast('Book created successfully', { variant: 'success' });
      }
      navigate('/admin/books', { state: { booksCreated: 1 } });
    } catch (err) {
      const responseData = err.response?.data;
      if (responseData && typeof responseData === 'object') {
        const nextFieldErrors = {};
        Object.keys(responseData).forEach((key) => {
          const value = responseData[key];
          if (Array.isArray(value) && value.length > 0) {
            nextFieldErrors[key] = value[0];
          } else if (typeof value === 'string') {
            nextFieldErrors[key] = value;
          }
        });
        setFieldErrors(nextFieldErrors);
        const isbnError = nextFieldErrors.isbn;
        if (isbnError && isbnError.toLowerCase().includes('isbn')) {
          const existing = await findBookByIsbn(form.isbn);
          if (existing) {
            setError(`ISBN already exists: "${form.isbn}" is used by "${existing.title}" (ID ${existing.id}).`);
          } else {
            setError(isbnError);
          }
        } else {
          setError('Please fix the highlighted fields.');
        }
      } else {
        const msg = responseData?.detail || responseData || 'Save failed';
        setError(typeof msg === 'string' ? msg : JSON.stringify(msg));
      }
    } finally {
      setSaving(false);
    }
  };

  const findBookByIsbn = async (isbn) => {
    try {
      const { data } = await getBooks({ search: isbn });
      const results = data?.results || data || [];
      return results.find((b) => b.isbn === isbn) || null;
    } catch {
      return null;
    }
  };

  const fieldError = (field) => fieldErrors[field] || null;

  return (
    <div className="book-form-page">
      <div className="book-form-card">
        <div className="book-form-header">
          <h2>{id ? 'Edit Book' : 'Add New Book'}</h2>
          <p className="book-form-subtitle">
            {id ? 'Update book information and media' : 'Create a new catalog entry with cover preview'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="book-form">
          {(error || isbnCheck.duplicate) && (
            <div className={`book-form-error ${isbnCheck.duplicate ? 'book-form-error-warning' : ''}`}>
              <span className="book-form-error-icon">!</span>
              <span>
                {error ||
                  (isbnCheck.duplicate
                    ? `ISBN already exists: "${form.isbn}" is used by "${isbnCheck.duplicate.title}" (ID ${isbnCheck.duplicate.id}).`
                    : '')}
              </span>
            </div>
          )}

          <div className="book-form-grid">
            <div className="book-form-main">
              <section className="book-form-section">
                <h3>Basic Information</h3>
                <div className="form-row">
                  <div className="form-field">
                    <label htmlFor="title">Title</label>
                    <input
                      id="title"
                      name="title"
                      placeholder="Enter book title"
                      value={form.title}
                      onChange={handleChange}
                      required
                    />
                    {fieldError('title') && <span className="field-error">{fieldError('title')}</span>}
                  </div>
                  <div className="form-field">
                    <label htmlFor="isbn">ISBN</label>
                    <input
                      id="isbn"
                      name="isbn"
                      placeholder="978XXXXXXXXXX"
                      value={form.isbn}
                      onChange={handleChange}
                    />
                    {fieldError('isbn') && <span className="field-error">{fieldError('isbn')}</span>}
                    {isbnCheck.checking && <span className="field-hint">Checking ISBN...</span>}
                    {!isbnCheck.checking && isbnCheck.duplicate && (
                      <span className="field-error">
                        Duplicate ISBN found for book: {isbnCheck.duplicate.title} (ID {isbnCheck.duplicate.id})
                      </span>
                    )}
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-field">
                    <label htmlFor="publisher">Publisher</label>
                    <select id="publisher" name="publisher" value={form.publisher} onChange={handleChange}>
                      <option value="">Select Publisher</option>
                      {publishers.map((p) => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                    {fieldError('publisher') && <span className="field-error">{fieldError('publisher')}</span>}
                  </div>
                  <div className="form-field">
                    <label htmlFor="publication_year">Publication Year</label>
                    <input
                      id="publication_year"
                      name="publication_year"
                      type="number"
                      placeholder="2024"
                      value={form.publication_year}
                      onChange={handleChange}
                    />
                  </div>
                </div>

                <div className="form-field">
                  <label htmlFor="description">Description</label>
                  <textarea
                    id="description"
                    name="description"
                    placeholder="Enter book description"
                    value={form.description}
                    onChange={handleChange}
                  />
                </div>
              </section>

              <section className="book-form-section">
                <h3>Classification</h3>
                <div className="form-field">
                  <label htmlFor="authors">Authors</label>
                  <select
                    id="authors"
                    name="authors"
                    multiple
                    value={form.authors}
                    onChange={handleChange}
                    className="multi-select"
                  >
                    {authors.map((a) => (
                      <option key={a.id} value={a.id}>{a.name}</option>
                    ))}
                  </select>
                  <span className="field-hint">Hold Ctrl/Cmd to select multiple</span>
                </div>
                <div className="form-field">
                  <label htmlFor="categories">Categories</label>
                  <select
                    id="categories"
                    name="categories"
                    multiple
                    value={form.categories}
                    onChange={handleChange}
                    className="multi-select"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                  <span className="field-hint">Hold Ctrl/Cmd to select multiple</span>
                </div>
              </section>
            </div>

            <div className="book-form-side">
              <section className="book-form-section">
                <h3>Inventory</h3>
                <div className="form-field">
                  <label htmlFor="total_copies">Total Copies</label>
                  <input
                    id="total_copies"
                    name="total_copies"
                    type="number"
                    min="1"
                    value={form.total_copies}
                    onChange={handleChange}
                  />
                </div>
              </section>

              <section className="book-form-section">
                <h3>Cover Image</h3>
                <div className="cover-upload">
                  <div className="cover-preview">
                    {coverPreview ? (
                      <img src={coverPreview} alt="Cover preview" />
                    ) : (
                      <div className="cover-placeholder">
                        <span>No Cover</span>
                      </div>
                    )}
                  </div>
                  <div className="cover-actions">
                    <label className="btn btn-outline btn-sm">
                      Choose Image
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleCoverChange}
                        hidden
                      />
                    </label>
                    {coverPreview && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setCoverFile(null);
                          setCoverPreview('');
                        }}
                      >
                        Clear
                      </Button>
                    )}
                  </div>
                </div>
              </section>

              <section className="book-form-actions">
                <Button type="submit" variant="primary" disabled={saving}>
                  {saving ? 'Saving...' : id ? 'Update Book' : 'Create Book'}
                </Button>
                <Button type="button" variant="outline" onClick={() => navigate('/admin/books')}>
                  Cancel
                </Button>
              </section>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
