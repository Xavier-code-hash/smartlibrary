import { useState, useEffect } from 'react';
import api from '../../services/api';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import { useToast } from '../../components/common/Toast';
import { ROLES } from '../../utils/constants';
import './Users.css';

export default function Users() {
  const toast = useToast();
  const [users, setUsers] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [form, setForm] = useState({
    username: '',
    email: '',
    role: ROLES.MEMBER,
    phone: '',
    address: '',
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const { data } = await api.get('/auth/users/');
      setUsers(data.results || data);
    } catch {
      setMessage('Failed to load users');
    }
  };

  const openCreate = () => {
    setEditingUser(null);
    setForm({ username: '', email: '', role: ROLES.MEMBER, phone: '', address: '' });
    setModalOpen(true);
    setMessage('');
  };

  const openEdit = (u) => {
    setEditingUser(u);
    setForm({
      username: u.username,
      email: u.email,
      role: u.role,
      phone: u.phone || '',
      address: u.address || '',
    });
    setModalOpen(true);
    setMessage('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setSaving(true);
    try {
      if (editingUser) {
        await api.put(`/auth/users/${editingUser.id}/`, { ...form, role: form.role });
        toast('User updated successfully', { variant: 'success' });
      } else {
        await api.post('/auth/register/', { ...form, password: 'tempPass123' });
        toast('User created successfully', { variant: 'success' });
      }
      setModalOpen(false);
      fetchUsers();
    } catch {
      toast('Operation failed. Please try again.', { variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteClick = (id) => {
    setConfirmDeleteId(id);
  };

  const handleDeleteConfirm = async () => {
    setDeleting(true);
    try {
      await api.delete(`/auth/users/${confirmDeleteId}/`);
      setUsers(users.filter((u) => u.id !== confirmDeleteId));
      toast('User deleted successfully', { variant: 'success' });
    } catch {
      toast('Delete failed. Please try again.', { variant: 'error' });
    } finally {
      setConfirmDeleteId(null);
      setDeleting(false);
    }
  };

  return (
    <div className="users-page">
      <div className="users-header">
        <div>
          <h1>User Management</h1>
          <p className="users-subtitle">{users.length} users in system</p>
        </div>
        <Button onClick={openCreate}>Add User</Button>
      </div>

      <div className="users-table-wrapper">
        <table className="users-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Username</th>
              <th>Email</th>
              <th>Role</th>
              <th>Phone</th>
              <th>Membership</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td className="users-cell-id">#{u.id}</td>
                <td className="users-cell-primary">{u.username}</td>
                <td className="users-cell-secondary">{u.email}</td>
                <td>
                  <span className={`role-badge role-${u.role}`}>{u.role}</span>
                </td>
                <td className="users-cell-secondary">{u.phone || '-'}</td>
                <td className="users-cell-secondary">{u.membership_id || '-'}</td>
                <td className="users-cell-actions">
                  <button className="btn-link" onClick={() => openEdit(u)}>Edit</button>
                  <button className="btn-link btn-danger" onClick={() => handleDeleteClick(u.id)}>Delete</button>
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr>
                <td colSpan="7" className="users-empty">No users found</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <ConfirmDialog
        isOpen={!!confirmDeleteId}
        onClose={() => setConfirmDeleteId(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete User"
        message="Are you sure you want to delete this user? This action cannot be undone."
        confirmText="Delete"
        danger
        loading={deleting}
      />

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editingUser ? 'Edit User' : 'Add User'}>
        <form onSubmit={handleSubmit} className="users-form">
          <div className="form-row">
            <div className="form-field">
              <label htmlFor="username">Username</label>
              <input
                id="username"
                placeholder="johndoe"
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                required
                disabled={!!editingUser}
              />
            </div>
            <div className="form-field">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                placeholder="john@example.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="form-field">
            <label htmlFor="role">Role</label>
            <select
              id="role"
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
            >
              <option value={ROLES.ADMIN}>Admin</option>
              <option value={ROLES.LIBRARIAN}>Librarian</option>
              <option value={ROLES.MEMBER}>Member</option>
            </select>
          </div>

          <div className="form-field">
            <label htmlFor="phone">Phone</label>
            <input
              id="phone"
              placeholder="555-0100"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </div>

          <div className="form-field">
            <label htmlFor="address">Address</label>
            <textarea
              id="address"
              placeholder="123 Main St, City"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
            />
          </div>

          <div className="users-form-actions">
            <Button type="submit" variant="primary" disabled={saving}>
              {saving ? 'Saving...' : editingUser ? 'Update User' : 'Create User'}
            </Button>
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
