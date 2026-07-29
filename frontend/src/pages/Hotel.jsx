import { useState, useEffect } from 'react';
import api from '../api';
import Sidebar from '../components/Sidebar';
import { Bed, Check } from 'lucide-react';

const getTodayStr = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};

export default function Hotel() {
  const [guests, setGuests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: '', phone: '', room_number: '', check_in: getTodayStr() });

  const fetchGuests = async () => {
    try {
      const res = await api.get('/api/hotel/guests');
      setGuests(res.data);
    } catch (error) {
      console.error('Failed to fetch guests', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGuests();
  }, []);

  const handleCreateGuest = async (e) => {
    e.preventDefault();
    try {
      await api.post('/api/hotel/guests', form);
      setForm({ name: '', phone: '', room_number: '', check_in: getTodayStr() });
      fetchGuests();
    } catch (error) {
      console.error('Failed to create guest', error);
      alert('Failed to add guest');
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex text-slate-200">
      <Sidebar />
      <main className="flex-1 p-8 overflow-y-auto">
        <header className="mb-8">
          <h2 className="text-3xl font-bold text-white">Hotel Management</h2>
          <p className="text-slate-400 mt-1">Manage guest check-ins and room assignments.</p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1">
            <div className="bg-slate-800 rounded-xl p-6 shadow-sm border border-slate-700">
              <h3 className="text-lg font-bold text-white mb-4">New Check-In</h3>
              <form onSubmit={handleCreateGuest} className="space-y-4">
                <input required type="text" placeholder="Guest Name" value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-sm text-white focus:outline-none" />
                <input required type="text" placeholder="Phone Number" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-sm text-white focus:outline-none" />
                <input required type="text" placeholder="Room Number" value={form.room_number} onChange={e => setForm({...form, room_number: e.target.value})} className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-sm text-white focus:outline-none" />
                <input required type="date" value={form.check_in} onChange={e => setForm({...form, check_in: e.target.value})} className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-sm text-white focus:outline-none" />
                <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 py-2 rounded-lg text-white font-medium">Check In</button>
              </form>
            </div>
          </div>

          <div className="lg:col-span-2">
            <div className="bg-slate-800 rounded-xl p-6 shadow-sm border border-slate-700 h-full">
              <h3 className="text-lg font-bold text-white mb-4">Current & Past Guests</h3>
              {loading ? <p className="text-slate-400">Loading guests...</p> : (
                <ul className="divide-y divide-slate-700/50">
                  {guests.map(guest => (
                    <li key={guest.id} className="py-3 flex justify-between items-center">
                      <div>
                        <p className="font-medium text-white flex items-center gap-2">
                          {guest.name}
                          <span className="text-xs bg-slate-700 px-2 rounded text-slate-300">Room {guest.room_number}</span>
                        </p>
                        <p className="text-xs text-slate-400 mt-1">{guest.phone} | In: {new Date(guest.check_in).toLocaleDateString()}</p>
                      </div>
                      <Bed className="w-5 h-5 text-slate-500" />
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
