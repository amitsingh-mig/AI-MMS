'use client';

import React, { useState, useEffect } from 'react';
import api, { User } from '../lib/api';
import { Users, Shield, FileText, Trash2, CheckCircle2, Clock, AlertCircle } from 'lucide-react';

interface AuditItem {
  id: string;
  action: string;
  createdAt: string;
  ipAddress?: string;
  details?: any;
  user?: { name: string; email: string; role: string };
  media?: { title: string };
}

export default function AdminDashboard({ activeTab }: { activeTab: 'users' | 'audit' }) {
  const [users, setUsers] = useState<User[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'users') {
        const res = await api.get('/users');
        setUsers(res.data);
      } else {
        const res = await api.get('/audit');
        setAuditLogs(res.data.items);
      }
    } catch (err: any) {
      console.error('Failed to fetch admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      await api.patch(`/users/${userId}/role`, { role: newRole });
      setMessage(`Updated user role to ${newRole}`);
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update user role');
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user account?')) return;
    try {
      await api.delete(`/users/${userId}`);
      setMessage('User deleted successfully.');
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete user');
    }
  };

  if (loading) {
    return (
      <div className="w-full glass-panel rounded-2xl p-8 text-center text-gray-400">
        <Clock className="w-8 h-8 animate-spin mx-auto mb-2 text-indigo-400" />
        <p className="text-sm font-semibold">Loading Administration Data...</p>
      </div>
    );
  }

  if (activeTab === 'users') {
    return (
      <div className="w-full glass-panel rounded-2xl p-6 sm:p-8 border border-gray-800 space-y-6">
        <div className="flex items-center justify-between border-b border-gray-800 pb-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center border border-indigo-500/20">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-white">User & Access Permission Management</h2>
              <p className="text-xs text-gray-400">Manage user roles (Admin, Manager, User) for private 5–20 TB storage</p>
            </div>
          </div>
        </div>

        {message && (
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>{message}</span>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-gray-300">
            <thead className="bg-gray-900/90 text-gray-400 uppercase tracking-wider font-semibold border-b border-gray-800">
              <tr>
                <th className="p-3.5">User</th>
                <th className="p-3.5">Email</th>
                <th className="p-3.5">Assigned Role</th>
                <th className="p-3.5">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/60 font-medium">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-gray-900/50 transition">
                  <td className="p-3.5 font-bold text-white">{u.name}</td>
                  <td className="p-3.5 text-gray-400 font-mono">{u.email}</td>
                  <td className="p-3.5">
                    <select
                      value={u.role}
                      onChange={(e) => handleRoleChange(u.id, e.target.value)}
                      className="bg-gray-900 border border-gray-800 rounded-lg px-2.5 py-1 text-xs font-semibold text-indigo-300 focus:outline-none"
                    >
                      <option value="ADMIN">ADMIN</option>
                      <option value="MANAGER">MANAGER</option>
                      <option value="USER">USER</option>
                    </select>
                  </td>
                  <td className="p-3.5">
                    <button
                      onClick={() => handleDeleteUser(u.id)}
                      className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition"
                      title="Delete User"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full glass-panel rounded-2xl p-6 sm:p-8 border border-gray-800 space-y-6">
      <div className="flex items-center justify-between border-b border-gray-800 pb-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center border border-purple-500/20">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-extrabold text-white">System Audit & Compliance Stream</h2>
            <p className="text-xs text-gray-400">Track all uploads, downloads, deletions, and permission modifications</p>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-gray-300">
          <thead className="bg-gray-900/90 text-gray-400 uppercase tracking-wider font-semibold border-b border-gray-800">
            <tr>
              <th className="p-3.5">Timestamp</th>
              <th className="p-3.5">User</th>
              <th className="p-3.5">Action</th>
              <th className="p-3.5">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800/60 font-medium">
            {auditLogs.map((log) => (
              <tr key={log.id} className="hover:bg-gray-900/50 transition">
                <td className="p-3.5 font-mono text-gray-400">{new Date(log.createdAt).toLocaleString()}</td>
                <td className="p-3.5 font-bold text-gray-200">{log.user ? `${log.user.name} (${log.user.role})` : 'System'}</td>
                <td className="p-3.5">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      log.action === 'UPLOAD'
                        ? 'bg-emerald-500/20 text-emerald-300'
                        : log.action === 'DELETE'
                        ? 'bg-rose-500/20 text-rose-300'
                        : log.action === 'DOWNLOAD'
                        ? 'bg-indigo-500/20 text-indigo-300'
                        : 'bg-purple-500/20 text-purple-300'
                    }`}
                  >
                    {log.action}
                  </span>
                </td>
                <td className="p-3.5 font-mono text-gray-400 truncate max-w-xs">
                  {log.details ? JSON.stringify(log.details) : log.media ? log.media.title : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
