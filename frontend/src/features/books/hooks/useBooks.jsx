import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { getBooks } from '../services/booksApi';
import { PAGE_SIZE } from '../../../utils/constants.jsx';

export default function useBooks(params = {}) {
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [count, setCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);

  const paramsKey = useMemo(() => JSON.stringify(params ?? {}), [params]);
  const requestKey = useMemo(() => `${paramsKey}:${page}`, [paramsKey, page]);

  const isInitialParams = useRef(true);
  useEffect(() => {
    if (isInitialParams.current) {
      isInitialParams.current = false;
      return;
    }
    setPage(1);
  }, [paramsKey]);

  useEffect(() => {
    let isActive = true;

    const loadBooks = async () => {
      setLoading(true);
      setError(null);
      try {
        const query = { ...params, page };
        const { data } = await getBooks(query);
        if (isActive) {
          setBooks(data?.results || data || []);
          setCount(data?.count ?? (Array.isArray(data) ? data.length : 0));
          setTotalPages(data?.count ? Math.ceil(data.count / PAGE_SIZE) : (Array.isArray(data) ? 1 : 1));
        }
      } catch (err) {
        if (isActive) {
          setError(err?.message || 'Failed to fetch books');
        }
      } finally {
        if (isActive) {
          setLoading(false);
        }
      }
    };

    loadBooks();

    return () => {
      isActive = false;
    };
  }, [requestKey]);

  const goToPage = useCallback((nextPage) => {
    setPage(nextPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  async function refetch() {
    setLoading(true);
    setError(null);
      try {
        const query = { ...params, page };
        const { data } = await getBooks(query);
        setBooks(data?.results || data || []);
        setCount(data?.count ?? (Array.isArray(data) ? data.length : 0));
        setTotalPages(data?.count ? Math.ceil(data.count / PAGE_SIZE) : (Array.isArray(data) ? 1 : 1));
      } catch (err) {
      setError(err?.message || 'Failed to fetch books');
    } finally {
      setLoading(false);
    }
  }

  return { books, loading, error, refetch, count, totalPages, page, setPage: goToPage };
}
