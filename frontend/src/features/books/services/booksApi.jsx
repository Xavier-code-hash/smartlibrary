import api from '../../../services/api';

export function getBooks(params) {
  return api.get('/books/', { params });
}

export function getBook(id) {
  return api.get(`/books/${id}/`);
}

export function createBook(data, config) {
  return api.post('/books/', data, config);
}

export function updateBook(id, data, config) {
  return api.put(`/books/${id}/`, data, config);
}

export function deleteBook(id) {
  return api.delete(`/books/${id}/`);
}
