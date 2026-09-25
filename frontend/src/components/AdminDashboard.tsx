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
      <div className="w-full bg-white rounded-2xl p-6 sm:p-8 border border-gray-200 shadow-sm space-y-6">
        <div className="flex items-center justify-between border-b border-gray-100 pb-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-slate-900">User & Access Permission Management</h2>
              <p className="text-xs font-medium text-slate-500">Manage user roles (Admin, Manager, User) for private 5–20 TB storage</p>
            </div>
          </div>
        </div>

        {message && (
          <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-bold flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{message}</span>
          </div>
        )}

        <div className="overflow-hidden rounded-xl border border-gray-200 shadow-sm">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-900 text-white uppercase tracking-wider font-extrabold text-[11px]">
              <tr>
                <th className="p-3.5">User</th>
                <th className="p-3.5">Email</th>
                <th className="p-3.5">Assigned Role</th>
                <th className="p-3.5">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white font-medium">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50 transition">
                  <td className="p-3.5 font-extrabold text-slate-900">{u.name}</td>
                  <td className="p-3.5 text-slate-600 font-mono font-semibold">{u.email}</td>
                  <td className="p-3.5">
                    <select
                      value={u.role}
                      onChange={(e) => handleRoleChange(u.id, e.target.value)}
                      className="bg-slate-100 border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#FFD600] cursor-pointer"
                    >
                      <option value="ADMIN">ADMIN</option>
                      <option value="MANAGER">MANAGER</option>
                      <option value="USER">USER</option>
                    </select>
                  </td>
                  <td className="p-3.5">
                    <button
                      onClick={() => handleDeleteUser(u.id)}
                      className="p-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 transition shadow-sm"
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
    <div className="w-full bg-white rounded-2xl p-6 sm:p-8 border border-gray-200 shadow-sm space-y-6">
      <div className="flex items-center justify-between border-b border-gray-100 pb-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center border border-purple-100">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-extrabold text-slate-900">System Audit & Compliance Stream</h2>
            <p className="text-xs font-medium text-slate-500">Track all uploads, downloads, deletions, and permission modifications</p>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 shadow-sm">
        <table className="w-full text-left text-xs text-slate-700">
          <thead className="bg-slate-900 text-white uppercase tracking-wider font-extrabold text-[11px]">
            <tr>
              <th className="p-3.5">Timestamp</th>
              <th className="p-3.5">User</th>
              <th className="p-3.5">Action</th>
              <th className="p-3.5">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white font-medium">
            {auditLogs.map((log) => (
              <tr key={log.id} className="hover:bg-slate-50 transition">
                <td className="p-3.5 font-mono font-semibold text-slate-600">{new Date(log.createdAt).toLocaleString()}</td>
                <td className="p-3.5 font-extrabold text-slate-900">{log.user ? `${log.user.name} (${log.user.role})` : 'System'}</td>
                <td className="p-3.5">
                  <span
                    className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                      log.action === 'UPLOAD'
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                        : log.action === 'DELETE'
                        ? 'bg-rose-100 text-rose-800 border border-rose-200'
                        : log.action === 'DOWNLOAD'
                        ? 'bg-indigo-100 text-indigo-800 border border-indigo-200'
                        : 'bg-purple-100 text-purple-800 border border-purple-200'
                    }`}
                  >
                    {log.action}
                  </span>
                </td>
                <td className="p-3.5 font-mono font-semibold text-slate-600 truncate max-w-xs">
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

