import { useState, useEffect } from 'react';
import api from '../api';
import Sidebar from '../components/Sidebar';
import * as XLSX from 'xlsx';
import { 
  Bed, Check, Plus, Search, Calendar, Phone, CreditCard, 
  Globe, Building, User, FileText, CheckCircle2, Clock, 
  LogOut, Edit3, Trash2, X, DollarSign, Filter, ArrowDownRight, ArrowUpRight, Wallet, Download, UserPlus, Bell
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
  const [statusFilter, setStatusFilter] = useState('all'); // all, check_ins, checked_out, checked_in

  const [dateFilter, setDateFilter] = useState('today'); // yesterday, today, tomorrow, custom
  const [customDateStart, setCustomDateStart] = useState('');
  const [customDateEnd, setCustomDateEnd] = useState('');
  const [showCustomDateModal, setShowCustomDateModal] = useState(false);

  const [showCheckInModal, setShowCheckInModal] = useState(false);

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
      setShowCheckInModal(false);
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

  const todayStr = new Date().toDateString();

  const handleExport = () => {
    if (filteredGuests.length === 0) {
      alert('No data to export');
      return;
    }
    const exportData = filteredGuests.map(g => ({
      'Guest Name': g.name,
      'Phone': g.phone,
      'Room Number': g.room_number,
      'ID Type': g.id_proof_type,
      'ID Number': g.id_proof_number,
      'Check-In': formatTimestamp(g.check_in),
      'Check-Out': g.check_out ? formatTimestamp(g.check_out) : 'In-House',
      'Booking Source': g.booking_source,
      'Payment Mode': g.payment_mode,
      'Amount Paid (₹)': g.amount_paid,
      'Status': g.status === 'checked_in' ? 'In-House' : 'Checked Out'
    }));
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Guest Registry');
    XLSX.writeFile(workbook, `Hotel_Guest_Registry_${new Date().getTime()}.xlsx`);
  };

  // Filtered list
  const filteredGuests = guests.filter(g => {
    let matchesDate = true;
    const today = new Date();
    today.setHours(0,0,0,0);
    
    if (dateFilter === 'today') {
      matchesDate = new Date(g.check_in) <= new Date(today.getTime() + 86400000) && (!g.check_out || new Date(g.check_out) >= today);
    } else if (dateFilter === 'yesterday') {
      const yesterday = new Date(today.getTime() - 86400000);
      matchesDate = new Date(g.check_in) <= new Date(yesterday.getTime() + 86400000) && (!g.check_out || new Date(g.check_out) >= yesterday);
    } else if (dateFilter === 'tomorrow') {
      const tomorrow = new Date(today.getTime() + 86400000);
      matchesDate = new Date(g.check_in) <= new Date(tomorrow.getTime() + 86400000) && (!g.check_out || new Date(g.check_out) >= tomorrow);
    } else if (dateFilter === 'custom' && customDateStart && customDateEnd) {
      const start = new Date(customDateStart);
      const end = new Date(customDateEnd);
      end.setHours(23,59,59,999);
      matchesDate = new Date(g.check_in) <= end && (!g.check_out || new Date(g.check_out) >= start);
    }
    
    if (!matchesDate) return false;

    const isTodayCheckIn = new Date(g.check_in).toDateString() === todayStr;

    if (statusFilter === 'check_ins' && !isTodayCheckIn) return false;
    if (statusFilter === 'checked_in' && (g.status || 'checked_in') !== 'checked_in') return false;
    if (statusFilter === 'checked_out' && g.status !== 'checked_out') return false;
    
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

  const activeInHouse = guests.filter(g => (g.status || 'checked_in') === 'checked_in');
  const checkedOutCount = guests.filter(g => g.status === 'checked_out').length;
  
  const todayCheckIns = guests.filter(g => new Date(g.check_in).toDateString() === todayStr);
  const todayCheckOuts = guests.filter(g => g.check_out && new Date(g.check_out).toDateString() === todayStr);
  
  const totalRevenue = guests.reduce((sum, g) => sum + (Number(g.amount_paid) || 0), 0);
  const cashRevenue = guests.filter(g => g.payment_mode === 'cash' || !g.payment_mode).reduce((sum, g) => sum + (Number(g.amount_paid) || 0), 0);
  const otherRevenue = totalRevenue - cashRevenue;

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
    <div className="min-h-screen bg-[#0f111a] flex text-slate-200 font-sans">
      <Sidebar />
      <main className="flex-1 p-6 md:p-8 overflow-y-auto w-full">
        
        {/* Top Header */}
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-slate-800/40 px-3 py-1.5 rounded-full border border-slate-700/50">
              <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
              <span className="text-xs font-semibold text-emerald-400 uppercase">FRONT DESK 01</span>
            </div>
            <div className="text-xs font-medium text-slate-400">
              Shift <span className="text-white">Active</span> • {new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })} IST
            </div>
          </div>
          
          <div className="flex-1 max-w-xl mx-4">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search guests, rooms, reservations, ID..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-[#151923] border border-slate-700/50 rounded-xl pl-9 pr-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
              />
              <div className="absolute right-2 top-2 bg-slate-800 px-1.5 py-0.5 rounded text-[10px] text-slate-400 font-mono border border-slate-700">⌘K</div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button onClick={() => setShowCheckInModal(true)} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-colors shadow-md shadow-blue-900/20">
              <UserPlus className="w-4 h-4" /> New Check-In
            </button>
            <button onClick={() => alert('No new notifications')} className="p-2 bg-slate-800/50 border border-slate-700/50 rounded-full text-slate-400 hover:text-white transition-colors relative">
              <Bell className="w-4 h-4" />
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-rose-500 rounded-full border border-[#0f111a]"></span>
            </button>
            <div className="w-9 h-9 rounded-full bg-slate-700 border border-slate-600 flex items-center justify-center text-xs font-bold text-slate-300 ml-1">
              RK
            </div>
          </div>
        </header>

        {/* 4 Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
          <div className="bg-slate-800/30 rounded-2xl p-5 border border-slate-700/40 shadow-sm backdrop-blur-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">IN-HOUSE GUESTS</span>
              <div className="p-1.5 bg-emerald-500/10 rounded-lg text-emerald-400">
                <Bed className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-end gap-3 mb-4">
              <h3 className="text-4xl font-extrabold text-white leading-none">{activeInHouse.length}</h3>
              <span className="text-xs font-medium text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 mb-1">82% Occupancy</span>
            </div>
            <div className="flex items-center justify-between text-xs text-slate-400 pt-3 border-t border-slate-700/50">
              <span>{activeInHouse.length} Rooms occupied</span>
              <span className="text-blue-400 font-medium">Available</span>
            </div>
          </div>

          <div className="bg-slate-800/30 rounded-2xl p-5 border border-slate-700/40 shadow-sm backdrop-blur-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">TODAY CHECK-INS</span>
              <div className="p-1.5 bg-blue-500/10 rounded-lg text-blue-400">
                <ArrowDownRight className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-end gap-3 mb-4">
              <h3 className="text-4xl font-extrabold text-white leading-none">{todayCheckIns.length} <span className="text-sm font-normal text-slate-400 ml-1">Guests</span></h3>
              <span className="text-xs font-medium text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full border border-blue-500/20 mb-1">{todayCheckIns.length} Processed</span>
            </div>
            <div className="flex items-center justify-between text-xs text-slate-400 pt-3 border-t border-slate-700/50">
              <span>Arriving later</span>
              <span className="text-slate-500">Next: <span className="text-slate-300">N/A</span></span>
            </div>
          </div>

          <div className="bg-slate-800/30 rounded-2xl p-5 border border-slate-700/40 shadow-sm backdrop-blur-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">CHECK-OUTS DUE</span>
              <div className="p-1.5 bg-rose-500/10 rounded-lg text-rose-400">
                <ArrowUpRight className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-end gap-3 mb-4">
              <h3 className="text-4xl font-extrabold text-white leading-none">{todayCheckOuts.length} <span className="text-sm font-normal text-slate-400 ml-1">Rooms</span></h3>
              <span className="text-xs font-medium text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/20 mb-1">Due</span>
            </div>
            <div className="flex items-center justify-between text-xs text-slate-400 pt-3 border-t border-slate-700/50">
              <span>{checkedOutCount} Completed total</span>
              <span className="text-rose-400 font-medium">Overdue Check</span>
            </div>
          </div>

          <div className="bg-slate-800/30 rounded-2xl p-5 border border-slate-700/40 shadow-sm backdrop-blur-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">TODAY COLLECTIONS</span>
              <div className="p-1.5 bg-emerald-500/10 rounded-lg text-emerald-400">
                <Wallet className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-end gap-3 mb-4">
              <h3 className="text-3xl font-extrabold text-white leading-none">₹{totalRevenue.toLocaleString('en-IN')}</h3>
              <span className="text-xs font-medium text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 mb-1">100% Settled</span>
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-400 pt-3 border-t border-slate-700/50">
              <span>Cash: <span className="text-slate-300">₹{cashRevenue.toLocaleString('en-IN')}</span></span>
              <span>UPI/Card: <span className="text-slate-300">₹{otherRevenue.toLocaleString('en-IN')}</span></span>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-2 bg-[#151923] p-1.5 rounded-xl border border-slate-700/50">
            <button onClick={() => setDateFilter('yesterday')} className={`px-4 py-2 rounded-lg text-xs font-medium transition-colors ${dateFilter==='yesterday'?'bg-blue-600 text-white shadow-sm':'text-slate-400 hover:text-white'}`}>Yesterday</button>
            <button onClick={() => setDateFilter('today')} className={`px-4 py-2 rounded-lg text-xs font-medium transition-colors flex items-center gap-2 ${dateFilter==='today'?'bg-blue-600 text-white shadow-sm':'text-slate-400 hover:text-white'}`}>
              {dateFilter === 'today' && <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></div>}
              Today, {new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'short' })} (Live)
            </button>
            <button onClick={() => setDateFilter('tomorrow')} className={`px-4 py-2 rounded-lg text-xs font-medium transition-colors ${dateFilter==='tomorrow'?'bg-blue-600 text-white shadow-sm':'text-slate-400 hover:text-white'}`}>Tomorrow</button>
            <div className="w-px h-5 bg-slate-700 mx-1"></div>
            <button onClick={() => setShowCustomDateModal(true)} className={`px-4 py-2 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${dateFilter==='custom'?'bg-blue-600 text-white shadow-sm':'text-slate-400 hover:text-white'}`}>
              <Calendar className="w-3.5 h-3.5" /> Custom Date Range
            </button>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 bg-[#151923] p-1.5 rounded-xl border border-slate-700/50">
              <button onClick={() => setStatusFilter('all')} className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold flex flex-col items-center ${statusFilter==='all'?'bg-slate-700/80 text-white':'text-slate-400 hover:text-white'}`}>
                <span>All</span>
                <span className={`${statusFilter==='all'?'text-slate-300':'text-slate-500'} font-normal`}>{guests.length}</span>
              </button>
              <button onClick={() => setStatusFilter('check_ins')} className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold flex flex-col items-center ${statusFilter==='check_ins'?'bg-slate-700/80 text-white':'text-slate-400 hover:text-white'}`}>
                <span>Check-Ins</span>
                <span className="text-blue-400 font-normal">{todayCheckIns.length}</span>
              </button>
              <button onClick={() => setStatusFilter('checked_out')} className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold flex flex-col items-center ${statusFilter==='checked_out'?'bg-slate-700/80 text-white':'text-slate-400 hover:text-white'}`}>
                <span>Check-Outs</span>
                <span className="text-rose-400 font-normal">{checkedOutCount}</span>
              </button>
              <button onClick={() => setStatusFilter('checked_in')} className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold flex flex-col items-center ${statusFilter==='checked_in'?'bg-slate-700/80 text-white':'text-slate-400 hover:text-white'}`}>
                <span>In-House</span>
                <span className="text-emerald-400 font-normal">{activeInHouse.length}</span>
              </button>
            </div>
            
            <button onClick={handleExport} className="flex items-center gap-1.5 px-4 py-2 bg-[#151923] border border-slate-700/50 hover:bg-slate-700 rounded-xl text-xs font-medium text-slate-300 transition-colors h-[46px]">
              <Download className="w-3.5 h-3.5" /> Export
            </button>
          </div>
        </div>

        {/* Custom Date Modal */}
        {showCustomDateModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-[#151923] border border-slate-700/60 rounded-2xl w-full max-w-sm p-6 shadow-2xl relative">
              <h3 className="text-lg font-bold text-white mb-4">Select Date Range</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Start Date</label>
                  <input type="date" value={customDateStart} onChange={e => setCustomDateStart(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">End Date</label>
                  <input type="date" value={customDateEnd} onChange={e => setCustomDateEnd(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none" />
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button onClick={() => setShowCustomDateModal(false)} className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-300 hover:bg-slate-800">Cancel</button>
                <button onClick={() => { setDateFilter('custom'); setShowCustomDateModal(false); }} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-xl text-sm font-bold text-white shadow-md">Apply</button>
              </div>
            </div>
          </div>
        )}

        {/* Live Guest Registry Table */}
        <div className="bg-[#151923] rounded-2xl border border-slate-700/50 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-700/50 flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-white mb-0.5">Live Guest Registry</h3>
              <p className="text-xs text-slate-400">Real-time room occupancy, verification and payment ledger</p>
            </div>
            <div className="text-xs text-slate-400 font-mono bg-slate-800/60 px-3 py-1.5 rounded-lg border border-slate-700/50">
              Showing {filteredGuests.length} Records
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-900/40 text-[10px] uppercase font-bold tracking-wider text-slate-500 border-b border-slate-700/50">
                  <th className="py-3.5 px-6">GUEST & VERIFICATION</th>
                  <th className="py-3.5 px-6">ROOM & TIER</th>
                  <th className="py-3.5 px-6">STAY TIMELINE</th>
                  <th className="py-3.5 px-6">CHANNEL & BILLING</th>
                  <th className="py-3.5 px-6">STATUS</th>
                  <th className="py-3.5 px-6 text-right">QUICK ACTION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {filteredGuests.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="py-12 text-center text-slate-400">
                      No guests found matching filters.
                    </td>
                  </tr>
                ) : filteredGuests.map(guest => {
                  const isCheckedIn = (guest.status || 'checked_in') === 'checked_in';
                  const isWebsite = guest.booking_source === 'website';
                  const initials = guest.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

                  return (
                    <tr key={guest.id} className="hover:bg-slate-800/40 transition-colors group">
                      <td className="py-4 px-6">
                        <div className="flex items-start gap-4">
                          <div className="w-10 h-10 rounded-full bg-slate-700/80 border border-slate-600 flex items-center justify-center text-xs font-bold text-slate-300 shrink-0 mt-0.5">
                            {initials}
                          </div>
                          <div>
                            <div className="font-bold text-slate-200 text-sm mb-0.5">{guest.name}</div>
                            <div className="text-[11px] text-slate-400 font-mono mb-2">+91 {guest.phone.replace('+91', '').trim()}</div>
                            <div className="inline-flex items-center gap-1.5 bg-slate-800 px-2 py-0.5 rounded-md border border-slate-700">
                              <FileText className="w-3 h-3 text-emerald-400" />
                              <span className="text-[10px] text-emerald-400 font-medium">{guest.id_proof_type || 'ID'}</span>
                              <span className="text-[10px] text-blue-400 font-mono">{guest.id_proof_number || 'Verified'}</span>
                            </div>
                          </div>
                        </div>
                      </td>
                      
                      <td className="py-4 px-6">
                        <div className="font-bold text-blue-400 mb-0.5">Room {guest.room_number}</div>
                        <div className="text-[11px] text-slate-400">Deluxe Tier</div>
                      </td>
                      
                      <td className="py-4 px-6">
                        <div className="flex flex-col gap-2 text-[11px] font-mono">
                          <div className="flex items-center gap-2">
                            <span className="text-emerald-500/70 text-[9px] uppercase font-bold w-4">IN</span>
                            <span className="text-slate-300">{formatTimestamp(guest.check_in).replace(',', '')}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-rose-500/70 text-[9px] uppercase font-bold w-4">OUT</span>
                            <span className="text-slate-400">{guest.check_out ? formatTimestamp(guest.check_out).replace(',', '') : 'TBD'}</span>
                          </div>
                        </div>
                      </td>
                      
                      <td className="py-4 px-6">
                        <div className="text-[11px] text-indigo-300 font-medium mb-1.5">{isWebsite ? 'Web Direct' : 'Direct / Walk-In'}</div>
                        <div className="text-[11px] text-emerald-400 font-medium flex items-center gap-1.5">
                          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400"></div>
                          Paid <span className="uppercase">{guest.payment_mode || 'Cash'}</span> <span className="font-bold text-white ml-0.5">₹{guest.amount_paid}</span>
                        </div>
                      </td>

                      <td className="py-4 px-6">
                        {isCheckedIn ? (
                          <span className="inline-flex items-center gap-1.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-1 rounded-full text-[11px] font-semibold">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400"></div>
                            In-House
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 bg-slate-700/50 text-slate-400 border border-slate-600/50 px-2.5 py-1 rounded-full text-[11px] font-semibold">
                            <div className="w-1.5 h-1.5 rounded-full bg-slate-400"></div>
                            Checked-Out
                          </span>
                        )}
                      </td>
                      
                      <td className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end gap-2 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => {
                              setEditingGuest({
                                ...guest,
                                check_in: formatDateTimeLocal(guest.check_in),
                                check_out: guest.check_out ? formatDateTimeLocal(guest.check_out) : '',
                                amount_paid: guest.amount_paid !== null ? guest.amount_paid : ''
                              });
                            }}
                            className="px-4 py-1.5 rounded-lg border border-slate-700 bg-slate-800/80 text-[11px] font-semibold text-slate-300 hover:text-white transition-colors"
                          >
                            Folio
                          </button>
                          {isCheckedIn ? (
                            <button
                              onClick={() => handleQuickCheckOut(guest)}
                              className="px-4 py-1.5 rounded-lg border border-blue-500/30 bg-blue-500/10 text-[11px] font-semibold text-blue-400 hover:bg-blue-600 hover:text-white transition-colors"
                            >
                              Check Out
                            </button>
                          ) : (
                            <button
                              onClick={() => handleDeleteGuest(guest.id)}
                              className="p-1.5 rounded-lg text-slate-500 hover:bg-rose-500/10 hover:text-rose-400 transition-colors"
                              title="Delete Record"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Check-In Modal */}
        {showCheckInModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-[#151923] border border-slate-700/60 rounded-2xl w-full max-w-2xl p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-5 border-b border-slate-700/60 pb-4">
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <UserPlus className="w-5 h-5 text-blue-400" /> New Guest Check-In
                </h3>
                <button 
                  onClick={() => setShowCheckInModal(false)}
                  className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateGuest} className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1.5">Guest Full Name *</label>
                      <input 
                        required type="text" placeholder="e.g. Ramesh Kumar" 
                        value={form.name} onChange={e => setForm({...form, name: e.target.value})} 
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500" 
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1.5">Phone Number *</label>
                      <input 
                        required type="text" placeholder="+91..." 
                        value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} 
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 font-mono" 
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1.5">Room Number *</label>
                      <input 
                        required type="text" placeholder="e.g. 104" 
                        value={form.room_number} onChange={e => setForm({...form, room_number: e.target.value})} 
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 font-medium" 
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="bg-slate-800/40 p-4 rounded-xl border border-slate-700/60">
                      <label className="block text-[11px] font-bold text-slate-400 uppercase mb-3">ID Verification</label>
                      <div className="space-y-3">
                        <select
                          value={form.id_proof_type} onChange={e => setForm({...form, id_proof_type: e.target.value})}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none"
                        >
                          <option value="Aadhaar Card">Aadhaar Card</option>
                          <option value="PAN Card">PAN Card</option>
                          <option value="Passport">Passport</option>
                          <option value="Driving License">Driving License</option>
                        </select>
                        <input 
                          type="text" placeholder="ID Number" 
                          value={form.id_proof_number} onChange={e => setForm({...form, id_proof_number: e.target.value})} 
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none font-mono" 
                        />
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1.5">Check-In Date/Time</label>
                      <input 
                        required type="datetime-local" value={form.check_in} onChange={e => setForm({...form, check_in: e.target.value})} 
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500" 
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1.5">Booking Source</label>
                    <select
                      value={form.booking_source} onChange={e => setForm({...form, booking_source: e.target.value})}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none"
                    >
                      <option value="offline">Walk-in</option>
                      <option value="website">Website</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1.5">Payment Mode</label>
                    <select
                      value={form.payment_mode} onChange={e => setForm({...form, payment_mode: e.target.value})}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none"
                    >
                      <option value="cash">Cash</option>
                      <option value="upi">UPI</option>
                      <option value="card">Card</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1.5">Amount Paid (₹)</label>
                    <input 
                      type="number" step="0.01" value={form.amount_paid} onChange={e => setForm({...form, amount_paid: e.target.value})} 
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 font-bold" 
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-6 border-t border-slate-700/60">
                  <button type="button" onClick={() => setShowCheckInModal(false)} className="px-5 py-2.5 rounded-xl text-sm font-semibold text-slate-300 hover:bg-slate-800 transition-colors">
                    Cancel
                  </button>
                  <button type="submit" className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 rounded-xl text-sm font-bold text-white shadow-md transition-colors flex items-center gap-2">
                    <Check className="w-4 h-4" /> Check In Guest
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Edit Modal (Simulated identical styled for consistency) */}
        {editingGuest && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-[#151923] border border-slate-700/60 rounded-2xl w-full max-w-2xl p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-5 border-b border-slate-700/60 pb-4">
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <Edit3 className="w-5 h-5 text-blue-400" /> Edit Guest Record
                </h3>
                <button 
                  onClick={() => setEditingGuest(null)}
                  className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveEdit} className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1.5">Guest Full Name *</label>
                      <input 
                        required type="text"
                        value={editingGuest.name} onChange={e => setEditingGuest({...editingGuest, name: e.target.value})} 
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500" 
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1.5">Phone Number *</label>
                      <input 
                        required type="text"
                        value={editingGuest.phone} onChange={e => setEditingGuest({...editingGuest, phone: e.target.value})} 
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 font-mono" 
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1.5">Room Number *</label>
                      <input 
                        required type="text"
                        value={editingGuest.room_number} onChange={e => setEditingGuest({...editingGuest, room_number: e.target.value})} 
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 font-medium" 
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="bg-slate-800/40 p-4 rounded-xl border border-slate-700/60">
                      <label className="block text-[11px] font-bold text-slate-400 uppercase mb-3">ID Verification</label>
                      <div className="space-y-3">
                        <select
                          value={editingGuest.id_proof_type || ''} onChange={e => setEditingGuest({...editingGuest, id_proof_type: e.target.value})}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none"
                        >
                          <option value="Aadhaar Card">Aadhaar Card</option>
                          <option value="PAN Card">PAN Card</option>
                          <option value="Passport">Passport</option>
                          <option value="Driving License">Driving License</option>
                        </select>
                        <input 
                          type="text" placeholder="ID Number" 
                          value={editingGuest.id_proof_number || ''} onChange={e => setEditingGuest({...editingGuest, id_proof_number: e.target.value})} 
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none font-mono" 
                        />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1.5">Check-In</label>
                        <input 
                          required type="datetime-local" value={editingGuest.check_in} onChange={e => setEditingGuest({...editingGuest, check_in: e.target.value})} 
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500" 
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1.5">Check-Out</label>
                        <input 
                          type="datetime-local" value={editingGuest.check_out || ''} onChange={e => setEditingGuest({...editingGuest, check_out: e.target.value})} 
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500" 
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-4 pt-2">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1.5">Status</label>
                    <select
                      value={editingGuest.status} onChange={e => setEditingGuest({...editingGuest, status: e.target.value})}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none"
                    >
                      <option value="checked_in">Checked In</option>
                      <option value="checked_out">Checked Out</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1.5">Source</label>
                    <select
                      value={editingGuest.booking_source} onChange={e => setEditingGuest({...editingGuest, booking_source: e.target.value})}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none"
                    >
                      <option value="offline">Walk-in</option>
                      <option value="website">Website</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1.5">Payment Mode</label>
                    <select
                      value={editingGuest.payment_mode} onChange={e => setEditingGuest({...editingGuest, payment_mode: e.target.value})}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none"
                    >
                      <option value="cash">Cash</option>
                      <option value="upi">UPI</option>
                      <option value="card">Card</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1.5">Amount (₹)</label>
                    <input 
                      type="number" step="0.01" value={editingGuest.amount_paid} onChange={e => setEditingGuest({...editingGuest, amount_paid: e.target.value})} 
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500 font-bold" 
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-6 border-t border-slate-700/60">
                  <button type="button" onClick={() => setEditingGuest(null)} className="px-5 py-2.5 rounded-xl text-sm font-semibold text-slate-300 hover:bg-slate-800 transition-colors">
                    Cancel
                  </button>
                  <button type="submit" disabled={savingEdit} className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 rounded-xl text-sm font-bold text-white shadow-md transition-colors flex items-center gap-2">
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
