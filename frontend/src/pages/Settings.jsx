import { useState, useEffect, useRef } from 'react';
import api from '../api';
import Sidebar from '../components/Sidebar';
import { useAuth } from '../context/AuthContext';
import { 
  Shield, UserPlus, Users, MessageSquare, QrCode, 
  RefreshCw, CheckCircle2, AlertCircle, LogOut, Send,
  Edit3, Trash2, X
} from 'lucide-react';

export default function Settings() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'hotel_staff' });
  const [editingUser, setEditingUser] = useState(null);
  const [savingUser, setSavingUser] = useState(false);

  // WhatsApp state
  const [waStatus, setWaStatus] = useState({ status: 'DISCONNECTED', qrCode: null, user: null });
  const [waLoading, setWaLoading] = useState(false);
  const [connectingElapsed, setConnectingElapsed] = useState(0);
  const [testForm, setTestForm] = useState({ phone: '', message: '' });
  const [sendingTest, setSendingTest] = useState(false);
  const pollingRef = useRef(null);

  const fetchUsers = async () => {
    try {
      const res = await api.get('/api/settings/users');
      setUsers(res.data);
    } catch (error) {
      console.error('Failed to fetch users', error);
    } finally {
      setUsersLoading(false);
    }
  };

  const fetchWhatsAppStatus = async () => {
    try {
      const res = await api.get('/api/whatsapp/status');
      setWaStatus(res.data);
      return res.data;
    } catch (error) {
      console.error('Failed to fetch WhatsApp status', error);
    }
  };

  const handleConnectWhatsApp = async () => {
    setWaLoading(true);
    setWaStatus(prev => ({ ...prev, status: 'CONNECTING', error: null }));
    try {
      await api.post('/api/whatsapp/connect');
      await fetchWhatsAppStatus();
    } catch (error) {
      console.error('Failed to connect WhatsApp', error);
      alert(error.response?.data?.error || 'Failed to initialize WhatsApp connection');
    } finally {
      setWaLoading(false);
    }
  };

  const handleDisconnectWhatsApp = async () => {
    if (!window.confirm('Are you sure you want to disconnect WhatsApp and clear the session?')) return;
    setWaLoading(true);
    try {
      await api.post('/api/whatsapp/disconnect');
      await fetchWhatsAppStatus();
    } catch (error) {
      console.error('Failed to disconnect WhatsApp', error);
      alert('Failed to disconnect WhatsApp');
    } finally {
      setWaLoading(false);
    }
  };

  const handleSendTestMessage = async (e) => {
    e.preventDefault();
    if (!testForm.phone || !testForm.message) return;
    setSendingTest(true);
    try {
      await api.post('/api/whatsapp/send-test', testForm);
      alert('Test message sent successfully!');
      setTestForm({ phone: '', message: '' });
    } catch (error) {
      console.error('Failed to send test message', error);
      alert(error.response?.data?.error || 'Failed to send test message');
    } finally {
      setSendingTest(false);
    }
  };

  useEffect(() => {
    document.title = 'Personal CRM - Settings';
    if (currentUser?.role === 'admin') {
      fetchUsers();
      fetchWhatsAppStatus();
    } else {
      setUsersLoading(false);
    }
  }, [currentUser]);

  // Dynamic status polling (every 2s if connecting, 5s otherwise)
  useEffect(() => {
    if (currentUser?.role !== 'admin') return;

    const intervalMs = waStatus.status === 'CONNECTING' ? 2000 : 5000;
    const interval = setInterval(() => {
      fetchWhatsAppStatus();
    }, intervalMs);

    return () => clearInterval(interval);
  }, [currentUser, waStatus.status]);

  // Elapsed seconds timer during connection attempt
  useEffect(() => {
    let timer;
    if (waStatus.status === 'CONNECTING') {
      setConnectingElapsed(0);
      timer = setInterval(() => {
        setConnectingElapsed(prev => prev + 1);
      }, 1000);
    } else {
      setConnectingElapsed(0);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [waStatus.status]);

  const handleCreateUser = async (e) => {
    e.preventDefault();
    try {
      await api.post('/api/settings/users', form);
      setForm({ name: '', email: '', password: '', role: 'hotel_staff' });
      fetchUsers();
      alert('User created successfully');
    } catch (error) {
      console.error('Failed to create user', error);
      alert(error.response?.data?.error || 'Failed to create user');
    }
  };

  const handleDeleteUser = async (id, name) => {
    if (id === currentUser?.id) {
      alert('You cannot delete your own account.');
      return;
    }
    if (!window.confirm(`Are you sure you want to permanently delete user "${name}" (ID #${id})?`)) {
      return;
    }
    try {
      await api.delete(`/api/settings/users/${id}`);
      fetchUsers();
      alert(`User "${name}" deleted successfully.`);
    } catch (error) {
      console.error('Failed to delete user:', error);
      alert(error.response?.data?.error || 'Failed to delete user');
    }
  };

  const handleSaveEditUser = async (e) => {
    e.preventDefault();
    if (!editingUser.name.trim() || !editingUser.email.trim()) {
      alert('Full Name and Email are required.');
      return;
    }
    setSavingUser(true);
    try {
      await api.put(`/api/settings/users/${editingUser.id}`, {
        name: editingUser.name,
        email: editingUser.email,
        role: editingUser.role,
        ...(editingUser.password && editingUser.password.trim() ? { password: editingUser.password.trim() } : {})
      });
      setEditingUser(null);
      fetchUsers();
      alert('User updated successfully.');
    } catch (error) {
      console.error('Failed to update user:', error);
      alert(error.response?.data?.error || 'Failed to update user');
    } finally {
      setSavingUser(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex text-slate-200">
      <Sidebar />
      <main className="flex-1 p-8 overflow-y-auto">
        <header className="mb-8">
          <h2 className="text-3xl font-bold text-white">Settings</h2>
          <p className="text-slate-400 mt-1">Manage system configurations, users, and WhatsApp integration.</p>
        </header>

        {currentUser?.role !== 'admin' ? (
          <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 text-center text-slate-400">
            <Shield className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p>You do not have permission to access system settings.</p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* WhatsApp Integration Card */}
            <div className="bg-slate-800 rounded-xl p-6 shadow-sm border border-slate-700">
              <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <MessageSquare className="w-6 h-6 text-green-400" />
                WhatsApp Integration
              </h3>
              
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Status Column */}
                <div className="space-y-4">
                  <h4 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Connection Status</h4>
                  
                  <div className="flex items-center gap-3 bg-slate-900/50 p-4 rounded-xl border border-slate-700">
                    {waStatus.status === 'CONNECTED' ? (
                      <>
                        <CheckCircle2 className="w-8 h-8 text-green-400 shrink-0" />
                        <div>
                          <p className="font-bold text-white">Connected</p>
                          <p className="text-xs text-slate-400">{waStatus.user?.name} ({waStatus.user?.number})</p>
                        </div>
                      </>
                    ) : waStatus.status === 'QR_RECEIVED' ? (
                      <>
                        <QrCode className="w-8 h-8 text-yellow-400 animate-pulse shrink-0" />
                        <div>
                          <p className="font-bold text-white">QR Code Ready</p>
                          <p className="text-xs text-slate-400">Waiting for scan...</p>
                        </div>
                      </>
                    ) : waStatus.status === 'CONNECTING' ? (
                      <>
                        <RefreshCw className="w-8 h-8 text-blue-400 animate-spin shrink-0" />
                        <div>
                          <p className="font-bold text-white">Connecting</p>
                          <p className="text-xs text-slate-400">Starting services...</p>
                        </div>
                      </>
                    ) : (
                      <>
                        <AlertCircle className="w-8 h-8 text-slate-500 shrink-0" />
                        <div>
                          <p className="font-bold text-slate-300">Disconnected</p>
                          <p className="text-xs text-slate-400">No active session.</p>
                        </div>
                      </>
                    )}
                  </div>

                  <div className="pt-2">
                    {waStatus.status === 'CONNECTED' ? (
                      <button 
                        onClick={handleDisconnectWhatsApp}
                        disabled={waLoading}
                        className="w-full flex items-center justify-center gap-2 bg-red-600/20 hover:bg-red-600/35 border border-red-500/30 hover:border-red-500/50 disabled:opacity-50 text-red-400 font-medium py-2.5 px-4 rounded-lg transition-all shadow-sm cursor-pointer"
                      >
                        <LogOut className="w-4 h-4" />
                        Disconnect Session
                      </button>
                    ) : waStatus.status === 'CONNECTING' ? (
                      <div className="space-y-1.5">
                        <button 
                          disabled
                          className="w-full flex items-center justify-center gap-2 bg-blue-600/50 border border-blue-500/40 text-blue-200 font-medium py-2.5 px-4 rounded-lg transition-colors shadow-sm cursor-not-allowed"
                        >
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          Generating QR Code...
                        </button>
                        <button 
                          onClick={handleDisconnectWhatsApp}
                          className="w-full text-center text-xs text-slate-400 hover:text-rose-400 py-1 transition cursor-pointer"
                        >
                          Cancel / Reset
                        </button>
                      </div>
                    ) : (
                      <button 
                        onClick={handleConnectWhatsApp}
                        disabled={waLoading}
                        className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 disabled:bg-green-800 disabled:opacity-50 text-white font-medium py-2.5 px-4 rounded-lg transition-colors shadow-sm cursor-pointer"
                      >
                        <RefreshCw className={`w-4 h-4 ${waLoading ? 'animate-spin' : ''}`} />
                        Connect WhatsApp
                      </button>
                    )}
                  </div>
                </div>

                {/* Main QR Area */}
                <div className="flex flex-col items-center justify-center border-y lg:border-y-0 lg:border-x border-slate-700/50 py-6 lg:py-0 lg:px-8">
                  {waStatus.status === 'QR_RECEIVED' && waStatus.qrCode ? (
                    <div className="text-center space-y-4">
                      <div className="bg-white p-3.5 rounded-xl shadow-lg inline-block">
                        <img src={waStatus.qrCode} alt="WhatsApp QR Code" className="w-48 h-48 block animate-fade-in" />
                      </div>
                      <p className="text-xs text-slate-400 max-w-[240px]">
                        Scan this QR code from WhatsApp on your phone (Go to <strong>Settings</strong> &gt; <strong>Linked Devices</strong> &gt; <strong>Link a Device</strong>) to authenticate.
                      </p>
                    </div>
                  ) : waStatus.status === 'CONNECTED' ? (
                    <div className="text-center py-6 space-y-2">
                      <div className="w-16 h-16 bg-green-500/10 border border-green-500/20 rounded-full flex items-center justify-center mx-auto text-green-400">
                        <CheckCircle2 className="w-8 h-8" />
                      </div>
                      <p className="text-sm font-medium text-slate-200">Session Linked Successfully</p>
                      <p className="text-xs text-slate-400 max-w-[220px]">
                        CRM is authenticated and ready to deliver birthday, bill, and task notifications.
                      </p>
                    </div>
                  ) : waStatus.status === 'CONNECTING' || waLoading ? (
                    <div className="text-center py-8 space-y-4">
                      <RefreshCw className="w-10 h-10 text-blue-400 animate-spin mx-auto" />
                      <div>
                        <p className="text-sm font-medium text-slate-200">Starting WhatsApp Client...</p>
                        <p className="text-xs text-blue-400 font-mono mt-0.5">Elapsed: {connectingElapsed}s</p>
                      </div>
                      <p className="text-xs text-slate-400 max-w-[270px] leading-relaxed">
                        Initializing headless Chrome & loading WhatsApp Web. On cloud servers, cold start typically takes 40-75s. Please wait...
                      </p>
                    </div>
                  ) : waStatus.error ? (
                    <div className="text-center py-6 text-rose-400 space-y-2">
                      <div className="w-12 h-12 bg-rose-500/10 border border-rose-500/20 rounded-full flex items-center justify-center mx-auto text-rose-400">
                        <AlertCircle className="w-6 h-6" />
                      </div>
                      <p className="text-sm font-semibold text-rose-300">Connection Failed</p>
                      <p className="text-xs text-slate-400 max-w-[240px] break-words">{waStatus.error}</p>
                      <button
                        onClick={handleConnectWhatsApp}
                        className="mt-2 text-xs bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-1.5 px-3 rounded-lg transition shadow cursor-pointer"
                      >
                        Try Again
                      </button>
                    </div>
                  ) : (
                    <div className="text-center py-6 text-slate-500 space-y-2">
                      <QrCode className="w-16 h-16 mx-auto opacity-20" />
                      <p className="text-sm italic">WhatsApp client is offline.</p>
                      <p className="text-xs max-w-[200px]">Click "Connect WhatsApp" to generate a scan code.</p>
                    </div>
                  )}
                </div>

                {/* Send Test Message Column */}
                <div className="space-y-4">
                  <h4 className="text-sm font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Send className="w-4 h-4" />
                    Test Notification
                  </h4>
                  
                  <form onSubmit={handleSendTestMessage} className="space-y-3">
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Phone Number (E.164 format)</label>
                      <input 
                        required 
                        type="tel" 
                        placeholder="e.g. +919876543210" 
                        value={testForm.phone}
                        onChange={e => setTestForm({...testForm, phone: e.target.value})}
                        disabled={waStatus.status !== 'CONNECTED' || sendingTest}
                        className="w-full bg-slate-700/50 border border-slate-600 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-green-500 disabled:opacity-50" 
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Message</label>
                      <textarea 
                        required
                        rows={2}
                        placeholder="Hello from WhatsApp CRM!" 
                        value={testForm.message}
                        onChange={e => setTestForm({...testForm, message: e.target.value})}
                        disabled={waStatus.status !== 'CONNECTED' || sendingTest}
                        className="w-full bg-slate-700/50 border border-slate-600 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-green-500 resize-none disabled:opacity-50" 
                      />
                    </div>
                    <button 
                      type="submit" 
                      disabled={waStatus.status !== 'CONNECTED' || sendingTest}
                      className="w-full bg-green-600 hover:bg-green-700 disabled:bg-slate-700 disabled:opacity-50 py-2.5 rounded-lg text-white font-medium transition-colors text-sm flex items-center justify-center gap-2 cursor-pointer"
                    >
                      {sendingTest ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4" />
                          Send WhatsApp message
                        </>
                      )}
                    </button>
                  </form>
                </div>
              </div>
            </div>

            {/* Standard User Management Rows */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-slate-800 rounded-xl p-6 shadow-sm border border-slate-700 h-fit">
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <UserPlus className="w-5 h-5 text-blue-400" />
                  Create New User
                </h3>
                <form onSubmit={handleCreateUser} className="space-y-4">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Full Name</label>
                    <input required type="text" value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500" />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Email</label>
                    <input required type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500" />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Password</label>
                    <input required type="password" value={form.password} onChange={e => setForm({...form, password: e.target.value})} className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500" />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Role</label>
                    <select value={form.role} onChange={e => setForm({...form, role: e.target.value})} className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500">
                      <option value="hotel_staff">Hotel Staff</option>
                      <option value="accountant">Accountant</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                  <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 py-2 rounded-lg text-white font-medium transition-colors">Create Account</button>
                </form>
              </div>

              <div className="bg-slate-800 rounded-xl p-6 shadow-sm border border-slate-700">
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <Users className="w-5 h-5 text-blue-400" />
                  System Users ({users.length})
                </h3>
                {usersLoading ? <p className="text-slate-400">Loading users...</p> : (
                  <ul className="divide-y divide-slate-700/50">
                    {users.map(u => {
                      const isSelf = u.id === currentUser?.id;
                      return (
                        <li key={u.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-semibold text-white">{u.name}</p>
                              <span className="text-[10px] bg-slate-700 text-slate-300 px-1.5 py-0.5 rounded font-mono">
                                ID: #{u.id}
                              </span>
                              {isSelf && (
                                <span className="text-[10px] bg-blue-500/20 text-blue-400 border border-blue-500/30 px-1.5 py-0.5 rounded font-bold">
                                  You
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-slate-400 mt-0.5">{u.email}</p>
                          </div>

                          <div className="flex items-center gap-2.5">
                            <span className={`text-xs px-2.5 py-1 rounded-full font-semibold capitalize border ${
                              u.role === 'admin' 
                                ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' 
                                : u.role === 'accountant'
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                            }`}>
                              {u.role.replace('_', ' ')}
                            </span>

                            {/* Action Buttons: Edit & Delete */}
                            <div className="flex items-center gap-1 border-l border-slate-700 pl-2">
                              <button
                                type="button"
                                onClick={() => setEditingUser({
                                  id: u.id,
                                  name: u.name,
                                  email: u.email,
                                  role: u.role,
                                  password: ''
                                })}
                                className="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors cursor-pointer"
                                title={`Edit user "${u.name}"`}
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>

                              <button
                                type="button"
                                disabled={isSelf}
                                onClick={() => handleDeleteUser(u.id, u.name)}
                                className={`p-1.5 rounded-lg transition-colors ${
                                  isSelf 
                                    ? 'text-slate-600 cursor-not-allowed' 
                                    : 'text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 cursor-pointer'
                                }`}
                                title={isSelf ? 'Cannot delete your own account' : `Delete user "${u.name}"`}
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Edit User Modal */}
        {editingUser && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-slate-800 border border-slate-700 rounded-2xl max-w-md w-full p-6 shadow-2xl relative animate-fade-in">
              <div className="flex items-center justify-between pb-4 border-b border-slate-700 mb-4">
                <h4 className="text-lg font-bold text-white flex items-center gap-2">
                  <Edit3 className="w-5 h-5 text-blue-400" /> Edit User Account
                </h4>
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-700 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveEditUser} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">User ID</label>
                  <input
                    type="text"
                    disabled
                    value={`#${editingUser.id}`}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-500 cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Full Name</label>
                  <input
                    required
                    type="text"
                    value={editingUser.name}
                    onChange={e => setEditingUser({ ...editingUser, name: e.target.value })}
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Email</label>
                  <input
                    required
                    type="email"
                    value={editingUser.email}
                    onChange={e => setEditingUser({ ...editingUser, email: e.target.value })}
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Role</label>
                  <select
                    value={editingUser.role}
                    onChange={e => setEditingUser({ ...editingUser, role: e.target.value })}
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="hotel_staff">Hotel Staff</option>
                    <option value="accountant">Accountant</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">
                    New Password <span className="text-slate-500 font-normal normal-case">(leave blank to keep current)</span>
                  </label>
                  <input
                    type="password"
                    placeholder="Enter new password to change..."
                    value={editingUser.password || ''}
                    onChange={e => setEditingUser({ ...editingUser, password: e.target.value })}
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-700">
                  <button
                    type="button"
                    onClick={() => setEditingUser(null)}
                    className="px-4 py-2 rounded-lg text-sm text-slate-300 hover:text-white hover:bg-slate-700 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingUser}
                    className="px-5 py-2 rounded-lg text-sm font-semibold text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-50 transition-colors shadow-md cursor-pointer"
                  >
                    {savingUser ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
