import React from 'react';
import { BrowserRouter, Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { AuthProvider } from './features/auth/context/AuthContext';
import { ToastProvider, useToast } from './components/common/Toast';
import ProtectedRoute from './components/layout/ProtectedRoute';
import Header from './components/layout/Header';
import Footer from './components/layout/Footer';
import Home from './pages/Home';
import Login from './features/auth/Login';
import Register from './features/auth/Register';
import ForgetPassword from './features/auth/ForgetPassword';
import ResetPassword from './features/auth/ResetPassword';
import BookList from './features/books/BookList';
import BookDetail from './features/books/BookDetail';
import BookForm from './features/books/BookForm';
import Search from './pages/Search';
import Dashboard from './pages/Dashboard';
import BooksManagement from './pages/Admin/BooksManagement';
import Users from './pages/Admin/Users';
import AdminHistory from './pages/Admin/History';
import Payments from './pages/Admin/Payments';
import Profile from './features/profile/Profile';
import Notifications from './features/notifications/Notifications';
import Borrow from './features/borrow/Borrow';
import './styles/global.css';

function BookListWrapper() {
  const location = useLocation();
  const toast = useToast();
  const { booksCreated } = location.state || {};
  
  React.useEffect(() => {
    if (booksCreated) {
      toast(`Book${booksCreated > 1 ? 's' : ''} created successfully`, { variant: 'success' });
      window.history.replaceState({}, document.title);
    }
  }, [booksCreated, toast]);
  
  return <BookList locationState={location.state} />;
}

function BooksManagementWrapper() {
  const location = useLocation();
  const toast = useToast();
  const { booksCreated } = location.state || {};
  
  React.useEffect(() => {
    if (booksCreated) {
      toast(`Book${booksCreated > 1 ? 's' : ''} created successfully`, { variant: 'success' });
      window.history.replaceState({}, document.title);
    }
  }, [booksCreated, toast]);
  
  return <BooksManagement locationState={location.state} />;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <Header />
          <main className="container">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/forgot-password" element={<ForgetPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/books" element={<BookListWrapper />} />
              <Route path="/books/new" element={<ProtectedRoute roles={['admin', 'librarian']}><BookForm /></ProtectedRoute>} />
              <Route path="/books/:id" element={<BookDetail />} />
              <Route path="/books/:id/edit" element={<ProtectedRoute roles={['admin', 'librarian']}><BookForm /></ProtectedRoute>} />
              <Route path="/search" element={<Search />} />
              <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
              <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
              <Route path="/borrow" element={<ProtectedRoute><Borrow /></ProtectedRoute>} />
              <Route path="/admin/books" element={<ProtectedRoute roles={['admin', 'librarian']}><BooksManagementWrapper /></ProtectedRoute>} />
              <Route path="/admin/history" element={<ProtectedRoute roles={['admin', 'librarian']}><AdminHistory /></ProtectedRoute>} />
              <Route path="/admin/payments" element={<ProtectedRoute roles={['admin', 'librarian']}><Payments /></ProtectedRoute>} />
              <Route path="/admin/users" element={<ProtectedRoute roles={['admin']}><Users /></ProtectedRoute>} />
            </Routes>
          </main>
          <Footer />
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
