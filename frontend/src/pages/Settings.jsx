import { useState, useEffect } from 'react';
import axios from 'axios';
import Sidebar from '../components/Sidebar';
import { useAuth } from '../context/AuthContext';
import { Shield, UserPlus, Users } from 'lucide-react';

export default function Settings() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'hotel_staff' });

  const fetchUsers = async () => {
    try {
      const res = await axios.get('http://localhost:3000/api/settings/users');
      setUsers(res.data);
    } catch (error) {
      console.error('Failed to fetch users', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser?.role === 'admin') {
      fetchUsers();
    } else {
      setLoading(false);
    }
  }, [currentUser]);

  const handleCreateUser = async (e) => {
    e.preventDefault();
    try {
      await axios.post('http://localhost:3000/api/settings/users', form);
      setForm({ name: '', email: '', password: '', role: 'hotel_staff' });
      fetchUsers();
      alert('User created successfully');
    } catch (error) {
      console.error('Failed to create user', error);
      alert('Failed to create user');
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex text-slate-200">
      <Sidebar />
      <main className="flex-1 p-8 overflow-y-auto">
        <header className="mb-8">
          <h2 className="text-3xl font-bold text-white">Settings</h2>
          <p className="text-slate-400 mt-1">Manage system configurations and users.</p>
        </header>

        {currentUser?.role !== 'admin' ? (
          <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 text-center text-slate-400">
            <Shield className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p>You do not have permission to access system settings.</p>
          </div>
        ) : (
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
                System Users
              </h3>
              {loading ? <p className="text-slate-400">Loading...</p> : (
                <ul className="divide-y divide-slate-700/50">
                  {users.map(u => (
                    <li key={u.id} className="py-3 flex justify-between items-center">
                      <div>
                        <p className="font-medium text-white">{u.name}</p>
                        <p className="text-xs text-slate-400">{u.email}</p>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded font-medium capitalize ${u.role === 'admin' ? 'bg-purple-500/20 text-purple-400' : 'bg-blue-500/20 text-blue-400'}`}>
                        {u.role.replace('_', ' ')}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
