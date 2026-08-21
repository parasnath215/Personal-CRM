import { useState, useEffect } from 'react';
import api from '../api';
import Sidebar from '../components/Sidebar';
import { 
  Bed, Check, Plus, Search, Calendar, Phone, CreditCard, 
  Globe, Building, User, FileText, CheckCircle2, Clock, 
  LogOut, Edit3, Trash2, X, DollarSign, Filter, Sparkles, ArrowRight
} from 'lucide-react';

const formatDateTimeLocal = (dateObj = new Date()) => {
  const d = new Date(dateObj);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const getTomorrowDateTimeLocal = () => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(11, 0, 0, 0); // standard checkout 11:00 AM
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export default function Hotel() {
  const [guests, setGuests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // all, checked_in, checked_out
  const [sourceFilter, setSourceFilter] = useState('all'); // all, website, offline

  // New Check-in Form State
  const [form, setForm] = useState({
    name: '',
    phone: '',
    room_number: '',
    id_proof_type: 'Aadhaar Card',
    id_proof_number: '',
    check_in: formatDateTimeLocal(),
    check_out: getTomorrowDateTimeLocal(),
    booking_source: 'offline', // offline or website
    payment_mode: 'cash', // cash, upi, website, card
    amount_paid: '',
    status: 'checked_in'
  });

  // Edit Modal State
  const [editingGuest, setEditingGuest] = useState(null);
  const [savingEdit, setSavingEdit] = useState(false);

  const fetchGuests = async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/hotel/guests');
      setGuests(res.data || []);
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
    if (!form.name.trim() || !form.phone.trim() || !form.room_number.trim()) {
      alert('Please provide Guest Name, Phone, and Room Number.');
      return;
    }

    try {
      await api.post('/api/hotel/guests', {
        ...form,
        amount_paid: form.amount_paid ? parseFloat(form.amount_paid) : 0
      });
      setForm({
        name: '',
        phone: '',
        room_number: '',
        id_proof_type: 'Aadhaar Card',
        id_proof_number: '',
        check_in: formatDateTimeLocal(),
        check_out: getTomorrowDateTimeLocal(),
        booking_source: 'offline',
        payment_mode: 'cash',
        amount_paid: '',
        status: 'checked_in'
      });
      fetchGuests();
    } catch (error) {
      console.error('Failed to create guest', error);
      alert(error.response?.data?.error || 'Failed to add guest check-in');
    }
  };

  const handleQuickCheckOut = async (guest) => {
    if (!window.confirm(`Mark ${guest.name} (Room ${guest.room_number}) as Checked Out?`)) return;
    try {
      await api.put(`/api/hotel/guests/${guest.id}`, {
        status: 'checked_out',
        check_out: new Date().toISOString()
      });
      fetchGuests();
    } catch (error) {
      console.error('Failed to check out guest', error);
      alert('Failed to update guest status');
    }
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editingGuest) return;

    setSavingEdit(true);
    try {
      await api.put(`/api/hotel/guests/${editingGuest.id}`, {
        ...editingGuest,
        amount_paid: editingGuest.amount_paid !== '' ? parseFloat(editingGuest.amount_paid) : 0
      });
      setEditingGuest(null);
      fetchGuests();
    } catch (error) {
      console.error('Failed to update guest', error);
      alert(error.response?.data?.error || 'Failed to update guest record');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDeleteGuest = async (id) => {
    if (!window.confirm('Are you sure you want to permanently delete this guest entry?')) return;
    try {
      await api.delete(`/api/hotel/guests/${id}`);
      fetchGuests();
    } catch (error) {
      console.error('Failed to delete guest', error);
      alert('Failed to delete guest record');
    }
  };

  // Filtered list
  const filteredGuests = guests.filter(g => {
    if (statusFilter !== 'all' && (g.status || 'checked_in') !== statusFilter) return false;
    if (sourceFilter !== 'all' && (g.booking_source || 'offline') !== sourceFilter) return false;
    
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = g.name && g.name.toLowerCase().includes(q);
      const matchPhone = g.phone && g.phone.toLowerCase().includes(q);
      const matchRoom = g.room_number && String(g.room_number).toLowerCase().includes(q);
      const matchIdProof = g.id_proof_number && g.id_proof_number.toLowerCase().includes(q);
      return matchName || matchPhone || matchRoom || matchIdProof;
    }
    return true;
  });

  // Calculate high-level stats
  const activeInHouse = guests.filter(g => (g.status || 'checked_in') === 'checked_in');
  const checkedOutCount = guests.filter(g => g.status === 'checked_out').length;
  const totalRevenue = guests.reduce((sum, g) => sum + (Number(g.amount_paid) || 0), 0);

  const formatTimestamp = (dVal) => {
    if (!dVal) return '-';
    const d = new Date(dVal);
    return d.toLocaleString('en-IN', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="min-h-screen bg-slate-900 flex text-slate-200">
      <Sidebar />
      <main className="flex-1 p-4 md:p-8 overflow-y-auto max-w-7xl mx-auto w-full">
        {/* Header */}
        <header className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold text-white tracking-tight flex items-center gap-2">
              Hotel Management <Bed className="w-7 h-7 text-blue-400" />
            </h2>
            <p className="text-slate-400 mt-1">
              Complete guest registry, check-in/out timestamps, Aadhaar ID verification, booking channels & payments.
            </p>
          </div>
        </header>

        {/* Top Summary Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-8">
          <div className="bg-slate-800/80 rounded-2xl p-5 border border-blue-500/20 shadow-md backdrop-blur-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-blue-400">In-House Guests</span>
              <div className="p-2 bg-blue-500/10 rounded-xl text-blue-400">
                <Bed className="w-5 h-5" />
              </div>
            </div>
            <h3 className="text-3xl font-extrabold text-white mt-3">{activeInHouse.length}</h3>
            <p className="text-xs text-slate-400 mt-1">Currently checked in</p>
          </div>

          <div className="bg-slate-800/80 rounded-2xl p-5 border border-purple-500/20 shadow-md backdrop-blur-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-purple-400">Completed Stays</span>
              <div className="p-2 bg-purple-500/10 rounded-xl text-purple-400">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            </div>
            <h3 className="text-3xl font-extrabold text-white mt-3">{checkedOutCount}</h3>
            <p className="text-xs text-slate-400 mt-1">Checked out records</p>
          </div>

          <div className="bg-slate-800/80 rounded-2xl p-5 border border-emerald-500/20 shadow-md backdrop-blur-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">Total Collections</span>
              <div className="p-2 bg-emerald-500/10 rounded-xl text-emerald-400">
                <DollarSign className="w-5 h-5" />
              </div>
            </div>
            <h3 className="text-3xl font-extrabold text-white mt-3">₹{totalRevenue.toLocaleString('en-IN')}</h3>
            <p className="text-xs text-slate-400 mt-1">Total revenue collected</p>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
          {/* Left Column: Comprehensive Check-In Form */}
          <div className="xl:col-span-4">
            <div className="bg-slate-800 rounded-2xl p-6 shadow-md border border-slate-700 sticky top-6">
              <div className="flex items-center justify-between mb-5 border-b border-slate-700/60 pb-3">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Plus className="w-5 h-5 text-blue-400" /> New Guest Check-In
                </h3>
                <span className="text-[11px] bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2.5 py-0.5 rounded-full font-medium">
                  Direct Entry
                </span>
              </div>

              <form onSubmit={handleCreateGuest} className="space-y-4">
                {/* Guest Name */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Guest Full Name *</label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input 
                      required 
                      type="text" 
                      placeholder="e.g. Ramesh Kumar" 
                      value={form.name} 
                      onChange={e => setForm({...form, name: e.target.value})} 
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-3.5 py-2 text-sm text-white focus:outline-none focus:border-blue-500" 
                    />
                  </div>
                </div>

                {/* Phone & Room Number */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Phone Number *</label>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                      <input 
                        required 
                        type="text" 
                        placeholder="+91..." 
                        value={form.phone} 
                        onChange={e => setForm({...form, phone: e.target.value})} 
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 font-mono" 
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Room Number *</label>
                    <div className="relative">
                      <Bed className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                      <input 
                        required 
                        type="text" 
                        placeholder="e.g. 104 / Deluxe 2" 
                        value={form.room_number} 
                        onChange={e => setForm({...form, room_number: e.target.value})} 
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 font-medium" 
                      />
                    </div>
                  </div>
                </div>

                {/* ID Proof Type & Aadhaar / ID Detail */}
                <div className="bg-slate-900/60 p-3.5 rounded-xl border border-slate-700/80 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5 uppercase">
                      <FileText className="w-3.5 h-3.5 text-blue-400" /> ID Verification
                    </span>
                    <span className="text-[11px] text-amber-400">Govt ID Proof</span>
                  </div>

                  <div className="grid grid-cols-1 gap-2.5">
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">ID Document Type</label>
                      <select
                        value={form.id_proof_type}
                        onChange={e => setForm({...form, id_proof_type: e.target.value})}
                        className="w-full bg-slate-800 border border-slate-600 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none"
                      >
                        <option value="Aadhaar Card">Aadhaar Card</option>
                        <option value="PAN Card">PAN Card</option>
                        <option value="Driving License">Driving License</option>
                        <option value="Passport">Passport</option>
                        <option value="Voter ID">Voter ID</option>
                        <option value="Other ID">Other ID Proof</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">Aadhaar / ID Number Detail</label>
                      <input 
                        type="text" 
                        placeholder="e.g. 4589 1234 5678" 
                        value={form.id_proof_number} 
                        onChange={e => setForm({...form, id_proof_number: e.target.value})} 
                        className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500 font-mono" 
                      />
                    </div>
                  </div>
                </div>

                {/* Check-In & Check-Out Date & Timing */}
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-1 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase mb-1 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-emerald-400" /> Check-In Date & Timing *
                    </label>
                    <input 
                      required 
                      type="datetime-local" 
                      value={form.check_in} 
                      onChange={e => setForm({...form, check_in: e.target.value})} 
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500" 
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase mb-1 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-rose-400" /> Check-Out Date & Timing
                    </label>
                    <input 
                      type="datetime-local" 
                      value={form.check_out} 
                      onChange={e => setForm({...form, check_out: e.target.value})} 
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500" 
                    />
                  </div>
                </div>

                {/* Booking Source & Payment Mode */}
                <div className="bg-slate-900/60 p-3.5 rounded-xl border border-slate-700/80 space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase mb-1.5 flex items-center gap-1.5">
                      <Globe className="w-3.5 h-3.5 text-indigo-400" /> Booking Source Channel
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setForm({ ...form, booking_source: 'offline' })}
                        className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 border transition-all ${
                          form.booking_source === 'offline'
                            ? 'bg-blue-600 border-blue-500 text-white shadow-sm'
                            : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
                        }`}
                      >
                        <Building className="w-3.5 h-3.5" /> Offline / Walk-in
                      </button>
                      <button
                        type="button"
                        onClick={() => setForm({ ...form, booking_source: 'website' })}
                        className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 border transition-all ${
                          form.booking_source === 'website'
                            ? 'bg-indigo-600 border-indigo-500 text-white shadow-sm'
                            : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
                        }`}
                      >
                        <Globe className="w-3.5 h-3.5" /> Website Booking
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5 pt-1">
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">Payment Method</label>
                      <select
                        value={form.payment_mode}
                        onChange={e => setForm({...form, payment_mode: e.target.value})}
                        className="w-full bg-slate-800 border border-slate-600 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none"
                      >
                        <option value="cash">Cash</option>
                        <option value="upi">UPI (GPay/PhonePe)</option>
                        <option value="website">Website Booking</option>
                        <option value="card">Credit / Debit Card</option>
                        <option value="other">Other</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">Amount Paid (₹)</label>
                      <input 
                        type="number" 
                        step="0.01" 
                        placeholder="0.00" 
                        value={form.amount_paid} 
                        onChange={e => setForm({...form, amount_paid: e.target.value})} 
                        className="w-full bg-slate-800 border border-slate-600 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500 font-semibold" 
                      />
                    </div>
                  </div>
                </div>

                <button 
                  type="submit" 
                  className="w-full bg-blue-600 hover:bg-blue-500 py-3 rounded-xl text-white font-bold transition-all shadow-md shadow-blue-900/30 flex items-center justify-center gap-2"
                >
                  <Check className="w-4 h-4" /> Check In Guest
                </button>
              </form>
            </div>
          </div>

          {/* Right Column: Guest Directory & Management */}
          <div className="xl:col-span-8 space-y-6">
            <div className="bg-slate-800 rounded-2xl p-6 shadow-md border border-slate-700">
              
              {/* Filter and Search Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 pb-4 border-b border-slate-700/60">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs text-slate-400 uppercase font-semibold flex items-center gap-1">
                    <Filter className="w-3.5 h-3.5" /> Status:
                  </span>
                  <div className="flex bg-slate-900 rounded-xl p-1 border border-slate-700 text-xs">
                    <button
                      onClick={() => setStatusFilter('all')}
                      className={`px-3 py-1 rounded-lg font-medium transition-all ${
                        statusFilter === 'all' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      All ({guests.length})
                    </button>
                    <button
                      onClick={() => setStatusFilter('checked_in')}
                      className={`px-3 py-1 rounded-lg font-medium transition-all ${
                        statusFilter === 'checked_in' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      In-House ({activeInHouse.length})
                    </button>
                    <button
                      onClick={() => setStatusFilter('checked_out')}
                      className={`px-3 py-1 rounded-lg font-medium transition-all ${
                        statusFilter === 'checked_out' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Checked Out ({checkedOutCount})
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="relative w-full sm:w-64">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      placeholder="Search guest, phone, room, ID..."
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Guest Registry List */}
              {loading ? (
                <div className="py-16 text-center text-slate-400">Loading guest registry...</div>
              ) : filteredGuests.length === 0 ? (
                <div className="py-16 text-center bg-slate-900/40 rounded-xl border border-dashed border-slate-700">
                  <Bed className="w-10 h-10 text-slate-600 mx-auto mb-2 opacity-50" />
                  <p className="text-slate-300 font-medium">No guest records found</p>
                  <p className="text-xs text-slate-500 mt-0.5">Adjust your filters or add a new guest check-in from the form.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredGuests.map(guest => {
                    const isCheckedIn = (guest.status || 'checked_in') === 'checked_in';
                    const isWebsite = guest.booking_source === 'website';

                    return (
                      <div 
                        key={guest.id} 
                        className={`rounded-2xl p-5 border transition-all ${
                          isCheckedIn 
                            ? 'bg-slate-900/90 border-slate-700 hover:border-slate-600 shadow-sm' 
                            : 'bg-slate-900/40 border-slate-800 text-slate-400'
                        }`}
                      >
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                          
                          {/* Left: Guest & Room Info */}
                          <div className="flex-1">
                            <div className="flex flex-wrap items-center gap-2.5 mb-1.5">
                              <h4 className="text-lg font-bold text-white flex items-center gap-2">
                                {guest.name}
                              </h4>

                              {/* Room Badge */}
                              <span className="text-xs font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2.5 py-0.5 rounded-lg">
                                Room {guest.room_number}
                              </span>

                              {/* Status Badge */}
                              <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${
                                isCheckedIn 
                                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                                  : 'bg-purple-500/10 text-purple-300 border-purple-500/20'
                              }`}>
                                {isCheckedIn ? '● Currently In-House' : '✓ Checked Out'}
                              </span>

                              {/* Booking Source Badge */}
                              <span className={`text-[11px] font-medium px-2 py-0.5 rounded-md border flex items-center gap-1 ${
                                isWebsite
                                  ? 'bg-indigo-500/10 text-indigo-300 border-indigo-500/20'
                                  : 'bg-slate-700/50 text-slate-300 border-slate-600/50'
                              }`}>
                                {isWebsite ? <Globe className="w-3 h-3 text-indigo-400" /> : <Building className="w-3 h-3 text-slate-400" />}
                                {isWebsite ? 'Website Booking' : 'Offline / Walk-in'}
                              </span>
                            </div>

                            {/* Contact & ID Details */}
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-300 mt-2">
                              <span className="flex items-center gap-1 font-mono text-slate-200">
                                <Phone className="w-3.5 h-3.5 text-emerald-400" /> {guest.phone}
                              </span>

                              {guest.id_proof_number ? (
                                <span className="flex items-center gap-1 bg-slate-800 px-2 py-0.5 rounded border border-slate-700 text-amber-300 font-mono">
                                  <FileText className="w-3.5 h-3.5 text-amber-400" /> 
                                  {guest.id_proof_type || 'ID'}: {guest.id_proof_number}
                                </span>
                              ) : (
                                <span className="text-slate-500 italic text-[11px]">(No ID proof recorded)</span>
                              )}
                            </div>

                            {/* Timestamps & Payment details */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3 pt-3 border-t border-slate-800 text-xs">
                              <div className="flex items-center gap-1.5 text-slate-300">
                                <Clock className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                                <span>Check-In: <strong>{formatTimestamp(guest.check_in)}</strong></span>
                              </div>

                              <div className="flex items-center gap-1.5 text-slate-300">
                                <LogOut className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                                <span>Check-Out: <strong>{guest.check_out ? formatTimestamp(guest.check_out) : 'Open'}</strong></span>
                              </div>

                              <div className="flex items-center gap-1.5 text-slate-300">
                                <CreditCard className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                                <span>Paid via: <strong className="uppercase">{guest.payment_mode || 'Cash'}</strong></span>
                              </div>

                              <div className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                                <DollarSign className="w-3.5 h-3.5 shrink-0" />
                                <span>Amount: ₹{(Number(guest.amount_paid) || 0).toLocaleString('en-IN')}</span>
                              </div>
                            </div>
                          </div>

                          {/* Right: Actions */}
                          <div className="flex sm:flex-col items-center justify-end gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800">
                            {isCheckedIn && (
                              <button
                                onClick={() => handleQuickCheckOut(guest)}
                                className="flex items-center gap-1 bg-purple-600/20 hover:bg-purple-600 text-purple-300 hover:text-white border border-purple-500/30 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
                                title="Check Out Guest"
                              >
                                <LogOut className="w-3.5 h-3.5" /> Check Out
                              </button>
                            )}

                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => setEditingGuest({
                                  ...guest,
                                  check_in: formatDateTimeLocal(guest.check_in),
                                  check_out: guest.check_out ? formatDateTimeLocal(guest.check_out) : '',
                                  amount_paid: guest.amount_paid !== null ? guest.amount_paid : ''
                                })}
                                className="p-2 text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 rounded-xl transition-colors"
                                title="Edit Guest Details"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>

                              <button
                                onClick={() => handleDeleteGuest(guest.id)}
                                className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-colors"
                                title="Delete Record"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>

                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

            </div>
          </div>
        </div>

        {/* Edit Guest Modal */}
        {editingGuest && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-lg p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-5 border-b border-slate-700/60 pb-3">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Edit3 className="w-5 h-5 text-blue-400" /> Edit Guest Record
                </h3>
                <button 
                  onClick={() => setEditingGuest(null)}
                  className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveEdit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Guest Full Name *</label>
                  <input
                    required
                    type="text"
                    value={editingGuest.name}
                    onChange={e => setEditingGuest({...editingGuest, name: e.target.value})}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Phone Number *</label>
                    <input
                      required
                      type="text"
                      value={editingGuest.phone}
                      onChange={e => setEditingGuest({...editingGuest, phone: e.target.value})}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-blue-500 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Room Number *</label>
                    <input
                      required
                      type="text"
                      value={editingGuest.room_number}
                      onChange={e => setEditingGuest({...editingGuest, room_number: e.target.value})}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="bg-slate-900/60 p-3.5 rounded-xl border border-slate-700 space-y-2.5">
                  <label className="block text-xs font-bold text-slate-300 uppercase">ID Verification Details</label>
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      value={editingGuest.id_proof_type || 'Aadhaar Card'}
                      onChange={e => setEditingGuest({...editingGuest, id_proof_type: e.target.value})}
                      className="bg-slate-800 border border-slate-600 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none"
                    >
                      <option value="Aadhaar Card">Aadhaar Card</option>
                      <option value="PAN Card">PAN Card</option>
                      <option value="Driving License">Driving License</option>
                      <option value="Passport">Passport</option>
                      <option value="Voter ID">Voter ID</option>
                      <option value="Other ID">Other ID Proof</option>
                    </select>

                    <input
                      type="text"
                      placeholder="ID Number"
                      value={editingGuest.id_proof_number || ''}
                      onChange={e => setEditingGuest({...editingGuest, id_proof_number: e.target.value})}
                      className="bg-slate-800 border border-slate-600 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Check-In Time</label>
                    <input
                      type="datetime-local"
                      value={editingGuest.check_in}
                      onChange={e => setEditingGuest({...editingGuest, check_in: e.target.value})}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Check-Out Time</label>
                    <input
                      type="datetime-local"
                      value={editingGuest.check_out || ''}
                      onChange={e => setEditingGuest({...editingGuest, check_out: e.target.value})}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 bg-slate-900/60 p-3 rounded-xl border border-slate-700">
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Status</label>
                    <select
                      value={editingGuest.status || 'checked_in'}
                      onChange={e => setEditingGuest({...editingGuest, status: e.target.value})}
                      className="w-full bg-slate-800 border border-slate-600 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none"
                    >
                      <option value="checked_in">Checked In</option>
                      <option value="checked_out">Checked Out</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Source</label>
                    <select
                      value={editingGuest.booking_source || 'offline'}
                      onChange={e => setEditingGuest({...editingGuest, booking_source: e.target.value})}
                      className="w-full bg-slate-800 border border-slate-600 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none"
                    >
                      <option value="offline">Offline / Walk-in</option>
                      <option value="website">Website Booking</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Payment Mode</label>
                    <select
                      value={editingGuest.payment_mode || 'cash'}
                      onChange={e => setEditingGuest({...editingGuest, payment_mode: e.target.value})}
                      className="w-full bg-slate-800 border border-slate-600 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none"
                    >
                      <option value="cash">Cash</option>
                      <option value="upi">UPI</option>
                      <option value="website">Website</option>
                      <option value="card">Card</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Amount Paid (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editingGuest.amount_paid}
                    onChange={e => setEditingGuest({...editingGuest, amount_paid: e.target.value})}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-blue-500 font-semibold"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-700/60 mt-6">
                  <button
                    type="button"
                    onClick={() => setEditingGuest(null)}
                    className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-xl text-sm font-medium text-slate-300 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingEdit}
                    className="px-5 py-2 bg-blue-600 hover:bg-blue-500 rounded-xl text-sm font-semibold text-white transition-colors disabled:opacity-50 shadow-md shadow-blue-900/30 flex items-center gap-1.5"
                  >
                    <Check className="w-4 h-4" /> {savingEdit ? 'Saving...' : 'Save Changes'}
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
