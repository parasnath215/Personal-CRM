import { useState, useEffect, useRef } from 'react';
import api from '../api';
import Sidebar from '../components/Sidebar';
import { 
  Mail, Phone, Tag, Upload, Plus, UserPlus, X, UserCheck, 
  Cake, Heart, Sparkles, Send, Edit3, Trash2, Search, Check, Users 
} from 'lucide-react';

const toDateInputStr = (dateVal) => {
  if (!dateVal) return '';
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return '';
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export default function Contacts() {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // VCF Upload state
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  // New Contact modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [newContact, setNewContact] = useState({
    name: '',
    phone: '',
    email: '',
    tags: '',
    date_of_birth: '',
    marriage_anniversary: ''
  });
  const [submittingContact, setSubmittingContact] = useState(false);

  // Edit Contact modal state
  const [editingContact, setEditingContact] = useState(null);
  const [savingEdit, setSavingEdit] = useState(false);

  // Family Member form state
  const [addingFamilyFor, setAddingFamilyFor] = useState(null);
  const [familyForm, setFamilyForm] = useState({
    relation: 'spouse',
    full_name: '',
    date_of_birth: '',
    marriage_anniversary: '',
    date_of_death: ''
  });

  // Automation wish check state
  const [triggeringWishes, setTriggeringWishes] = useState(false);
  const [wishResult, setWishResult] = useState(null);

  const fetchContacts = async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/contacts');
      setContacts(res.data || []);
    } catch (error) {
      console.error('Failed to fetch contacts:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContacts();
  }, []);

  const handleCreateContact = async (e) => {
    e.preventDefault();
    if (!newContact.name.trim() || !newContact.phone.trim()) {
      alert('Please provide name and phone number.');
      return;
    }

    setSubmittingContact(true);
    try {
      await api.post('/api/contacts', newContact);
      setNewContact({ name: '', phone: '', email: '', tags: '', date_of_birth: '', marriage_anniversary: '' });
      setShowAddModal(false);
      fetchContacts();
    } catch (error) {
      console.error('Error creating contact:', error);
      alert(error.response?.data?.error || 'Failed to create contact.');
    } finally {
      setSubmittingContact(false);
    }
  };

  const handleOpenEdit = (contact) => {
    setEditingContact({
      id: contact.id,
      name: contact.name || '',
      phone: contact.phone || '',
      email: contact.email || '',
      tags: contact.tags || '',
      date_of_birth: toDateInputStr(contact.date_of_birth),
      marriage_anniversary: toDateInputStr(contact.marriage_anniversary)
    });
  };

  const handleSaveEditContact = async (e) => {
    e.preventDefault();
    if (!editingContact || !editingContact.name.trim() || !editingContact.phone.trim()) {
      alert('Name and Phone are required.');
      return;
    }

    setSavingEdit(true);
    try {
      await api.put(`/api/contacts/${editingContact.id}`, editingContact);
      setEditingContact(null);
      fetchContacts();
    } catch (error) {
      console.error('Error updating contact:', error);
      alert(error.response?.data?.error || 'Failed to update contact.');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDeleteContact = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete "${name}" from your contacts?`)) return;
    try {
      await api.delete(`/api/contacts/${id}`);
      fetchContacts();
    } catch (error) {
      console.error('Error deleting contact:', error);
      alert('Failed to delete contact.');
    }
  };

  const handleDeleteFamilyMember = async (contactId, memberId, memberName) => {
    if (!window.confirm(`Remove family member "${memberName}"?`)) return;
    try {
      await api.delete(`/api/contacts/${contactId}/family/${memberId}`);
      fetchContacts();
    } catch (error) {
      console.error('Error deleting family member:', error);
      alert('Failed to delete family member.');
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    setUploading(true);
    try {
      const res = await api.post('/api/contacts/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      alert(`Import complete! Added: ${res.data.importedCount}, Skipped: ${res.data.skippedCount}`);
      fetchContacts();
    } catch (error) {
      console.error('Error uploading file', error);
      alert('Failed to import contacts.');
    } finally {
      setUploading(false);
      e.target.value = null;
    }
  };

  const submitFamilyMember = async (e) => {
    e.preventDefault();
    try {
      await api.post(`/api/contacts/${addingFamilyFor}/family`, familyForm);
      setAddingFamilyFor(null);
      setFamilyForm({ relation: 'spouse', full_name: '', date_of_birth: '', marriage_anniversary: '', date_of_death: '' });
      fetchContacts();
    } catch (error) {
      console.error('Error adding family member', error);
      alert('Failed to add family member.');
    }
  };

  const handleTriggerWishes = async () => {
    setTriggeringWishes(true);
    setWishResult(null);
    try {
      const res = await api.post('/api/contacts/trigger-wishes');
      setWishResult(res.data);
      setTimeout(() => setWishResult(null), 6000);
    } catch (error) {
      console.error('Failed to trigger wishes check', error);
      alert('Failed to run wishes automation.');
    } finally {
      setTriggeringWishes(false);
    }
  };

  const formatDateStr = (dateVal) => {
    if (!dateVal) return null;
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return null;
    return d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const filteredContacts = contacts.filter(c => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (c.name && c.name.toLowerCase().includes(q)) ||
      (c.phone && c.phone.toLowerCase().includes(q)) ||
      (c.email && c.email.toLowerCase().includes(q)) ||
      (c.tags && c.tags.toLowerCase().includes(q)) ||
      (c.familyMembers && c.familyMembers.some(f => f.full_name && f.full_name.toLowerCase().includes(q)))
    );
  });

  return (
    <div className="min-h-screen bg-slate-900 flex text-slate-200">
      <Sidebar />
      <main className="flex-1 p-4 md:p-8 overflow-y-auto max-w-7xl mx-auto w-full">
        {/* Header */}
        <header className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold text-white tracking-tight flex items-center gap-2">
              Contacts Directory <UserCheck className="w-6 h-6 text-blue-400" />
            </h2>
            <p className="text-slate-400 mt-1">Manage client profiles, birthdays, marriage anniversaries, and VCF imports.</p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleTriggerWishes}
              disabled={triggeringWishes}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-4 py-2.5 rounded-xl transition-all shadow-md shadow-emerald-950/30 text-sm disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4" />
              {triggeringWishes ? 'Checking...' : "Run Today's Wishes Check"}
            </button>

            <input type="file" accept=".vcf" className="hidden" ref={fileInputRef} onChange={handleFileUpload} />
            
            <button 
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 px-4 py-2.5 rounded-xl font-medium text-slate-200 hover:text-white transition-colors disabled:opacity-50 text-sm shadow-sm"
            >
              <Upload className="w-4 h-4 text-blue-400" />
              {uploading ? 'Importing...' : 'Import VCF'}
            </button>

            <button 
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 px-4 py-2.5 rounded-xl font-semibold text-white transition-colors text-sm shadow-md shadow-blue-900/30"
            >
              <Plus className="w-4 h-4" />
              Add Contact
            </button>
          </div>
        </header>

        {/* Search Bar & Stats */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6 bg-slate-800/60 p-4 rounded-2xl border border-slate-700">
          <div className="relative w-full sm:w-96">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Search by name, phone, tags, email..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-10 pr-4 py-2 text-sm text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-400 self-end sm:self-auto">
            <Users className="w-4 h-4 text-blue-400" />
            <span>Showing <strong>{filteredContacts.length}</strong> of <strong>{contacts.length}</strong> contacts</span>
          </div>
        </div>

        {/* Wishes Result Banner */}
        {wishResult && (
          <div className="mb-6 p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 flex items-center justify-between text-sm shadow-md animate-fade-in">
            <div className="flex items-center gap-3">
              <Send className="w-5 h-5 text-emerald-400" />
              <div>
                <p className="font-bold">Automated Wishes Executed Successfully!</p>
                <p className="text-xs text-emerald-200 mt-0.5">
                  🎂 Birthdays Sent: <strong>{wishResult.birthdayWishesSent || 0}</strong> | 
                  💑 Anniversaries Sent: <strong>{wishResult.anniversaryWishesSent || 0}</strong> | 
                  🤍 Remembrances Sent: <strong>{wishResult.remembranceSent || 0}</strong>
                </p>
              </div>
            </div>
            <button onClick={() => setWishResult(null)} className="text-emerald-400 hover:text-white p-1">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {loading ? (
          <div className="p-12 text-center text-slate-400">Loading contacts...</div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {filteredContacts.length === 0 ? (
              <div className="col-span-2 bg-slate-800/50 border border-slate-700/80 rounded-2xl p-12 text-center">
                <p className="text-slate-400 text-base mb-4">No contacts match your query.</p>
                <button
                  onClick={() => setShowAddModal(true)}
                  className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-medium px-4 py-2 rounded-xl transition-colors text-sm"
                >
                  <Plus className="w-4 h-4" /> Add New Contact
                </button>
              </div>
            ) : (
              filteredContacts.map(contact => (
                <div key={contact.id} className="bg-slate-800 rounded-2xl shadow-md border border-slate-700/80 overflow-hidden flex flex-col hover:border-slate-600 transition-colors">
                  <div className="p-6 pb-4 border-b border-slate-700/50">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-xl font-bold text-white mb-1">{contact.name}</h3>
                        {contact.tags && (
                          <div className="inline-flex items-center gap-1 bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2.5 py-0.5 rounded-lg text-xs font-semibold mt-0.5">
                            <Tag className="w-3 h-3" />
                            <span>{contact.tags}</span>
                          </div>
                        )}
                      </div>

                      {/* Edit and Delete Actions */}
                      <div className="flex items-center gap-1 bg-slate-900/60 p-1 rounded-xl border border-slate-700/60">
                        <button
                          onClick={() => handleOpenEdit(contact)}
                          className="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors"
                          title="Edit Contact"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteContact(contact.id, contact.name)}
                          className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                          title="Delete Contact"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 text-sm text-slate-300 mt-3">
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span className="font-mono text-slate-200">{contact.phone}</span>
                      </div>
                      {contact.email && (
                        <div className="flex items-center gap-2">
                          <Mail className="w-4 h-4 text-amber-400 shrink-0" />
                          <span className="truncate">{contact.email}</span>
                        </div>
                      )}
                    </div>

                    {/* DOB & Marriage Anniversary Badges */}
                    <div className="flex flex-wrap gap-2 mt-4 pt-3 border-t border-slate-700/40 text-xs">
                      {contact.date_of_birth && (
                        <div className="flex items-center gap-1.5 bg-amber-500/10 text-amber-300 border border-amber-500/20 px-2.5 py-1 rounded-full">
                          <Cake className="w-3.5 h-3.5 text-amber-400" />
                          <span>DOB: {formatDateStr(contact.date_of_birth)}</span>
                        </div>
                      )}
                      {contact.marriage_anniversary && (
                        <div className="flex items-center gap-1.5 bg-rose-500/10 text-rose-300 border border-rose-500/20 px-2.5 py-1 rounded-full">
                          <Heart className="w-3.5 h-3.5 text-rose-400" />
                          <span>Anniversary: {formatDateStr(contact.marriage_anniversary)}</span>
                        </div>
                      )}
                      {!contact.date_of_birth && !contact.marriage_anniversary && (
                        <span className="text-slate-500 italic text-[11px]">No dates logged</span>
                      )}
                    </div>
                  </div>
                  
                  {/* Family Members Section */}
                  <div className="p-5 bg-slate-800/50 flex-1">
                    <div className="flex justify-between items-center mb-3">
                      <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                        Family Members ({contact.familyMembers?.length || 0})
                      </h4>
                      <button 
                        onClick={() => setAddingFamilyFor(addingFamilyFor === contact.id ? null : contact.id)}
                        className="text-xs text-blue-400 hover:text-blue-300 font-medium flex items-center gap-1 bg-slate-700/60 hover:bg-slate-700 px-2.5 py-1 rounded-lg transition-colors"
                      >
                        <UserPlus className="w-3.5 h-3.5" /> Add Member
                      </button>
                    </div>

                    {addingFamilyFor === contact.id && (
                      <form onSubmit={submitFamilyMember} className="bg-slate-900/80 p-4 rounded-xl border border-slate-700 mb-4 space-y-3 shadow-inner">
                        <div>
                          <label className="block text-xs text-slate-400 mb-1">Full Name</label>
                          <input 
                            required type="text" placeholder="e.g. Anita Sharma" 
                            value={familyForm.full_name} onChange={e => setFamilyForm({...familyForm, full_name: e.target.value})}
                            className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-blue-500" 
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-xs text-slate-400 mb-1">Relation</label>
                            <select 
                              value={familyForm.relation} onChange={e => setFamilyForm({...familyForm, relation: e.target.value})}
                              className="w-full bg-slate-800 border border-slate-600 rounded-lg px-2.5 py-1.5 text-sm text-white focus:outline-none"
                            >
                              <option value="spouse">Spouse</option>
                              <option value="father">Father</option>
                              <option value="mother">Mother</option>
                              <option value="child">Child</option>
                              <option value="sibling">Sibling</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs text-slate-400 mb-1">Date of Birth</label>
                            <input 
                              type="date"
                              value={familyForm.date_of_birth} onChange={e => setFamilyForm({...familyForm, date_of_birth: e.target.value})}
                              className="w-full bg-slate-800 border border-slate-600 rounded-lg px-2 py-1.5 text-sm text-white focus:outline-none"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs text-slate-400 mb-1">Marriage Anniversary (Optional)</label>
                          <input 
                            type="date"
                            value={familyForm.marriage_anniversary} onChange={e => setFamilyForm({...familyForm, marriage_anniversary: e.target.value})}
                            className="w-full bg-slate-800 border border-slate-600 rounded-lg px-2.5 py-1.5 text-sm text-white focus:outline-none"
                          />
                        </div>

                        <div className="flex justify-end gap-2 pt-1">
                          <button type="button" onClick={() => setAddingFamilyFor(null)} className="text-xs text-slate-400 hover:text-white px-3 py-1.5 rounded-lg">Cancel</button>
                          <button type="submit" className="text-xs bg-blue-600 hover:bg-blue-500 text-white font-medium px-3.5 py-1.5 rounded-lg transition-colors">Save Member</button>
                        </div>
                      </form>
                    )}

                    {(!contact.familyMembers || contact.familyMembers.length === 0) ? (
                      <p className="text-xs text-slate-500 italic py-1">No family members logged.</p>
                    ) : (
                      <ul className="space-y-2">
                        {contact.familyMembers.map(member => (
                          <li key={member.id} className="text-xs flex items-center justify-between bg-slate-900/60 border border-slate-700/50 px-3 py-2 rounded-xl gap-2">
                            <div>
                              <span className="font-medium text-slate-200">
                                {member.full_name} <span className="text-slate-400 font-normal">({member.relation})</span>
                              </span>
                              <div className="flex items-center gap-3 text-slate-400 text-[11px] mt-0.5">
                                {member.date_of_birth && <span className="flex items-center gap-1"><Cake className="w-3 h-3 text-amber-400" /> {formatDateStr(member.date_of_birth)}</span>}
                                {member.marriage_anniversary && <span className="flex items-center gap-1"><Heart className="w-3 h-3 text-rose-400" /> {formatDateStr(member.marriage_anniversary)}</span>}
                              </div>
                            </div>

                            <button
                              onClick={() => handleDeleteFamilyMember(contact.id, member.id, member.full_name)}
                              className="text-slate-500 hover:text-rose-400 p-1 transition-colors"
                              title="Delete family member"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Add Contact Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-md p-6 shadow-2xl">
              <div className="flex items-center justify-between mb-5 border-b border-slate-700/60 pb-3">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <UserPlus className="w-5 h-5 text-blue-400" /> Create New Contact
                </h3>
                <button 
                  onClick={() => setShowAddModal(false)}
                  className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateContact} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Full Name *</label>
                  <input
                    required
                    type="text"
                    placeholder="e.g. Ramesh Patel"
                    value={newContact.name}
                    onChange={(e) => setNewContact({ ...newContact, name: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Phone Number *</label>
                  <input
                    required
                    type="text"
                    placeholder="e.g. +919876543210"
                    value={newContact.phone}
                    onChange={(e) => setNewContact({ ...newContact, phone: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-blue-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Email Address</label>
                  <input
                    type="email"
                    placeholder="e.g. ramesh@example.com"
                    value={newContact.email}
                    onChange={(e) => setNewContact({ ...newContact, email: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Date of Birth</label>
                    <input
                      type="date"
                      value={newContact.date_of_birth}
                      onChange={(e) => setNewContact({ ...newContact, date_of_birth: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Marriage Anniversary</label>
                    <input
                      type="date"
                      value={newContact.marriage_anniversary}
                      onChange={(e) => setNewContact({ ...newContact, marriage_anniversary: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Tags (Comma-separated)</label>
                  <input
                    type="text"
                    placeholder="e.g. VIP, Business, Regular"
                    value={newContact.tags}
                    onChange={(e) => setNewContact({ ...newContact, tags: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-700/60 mt-6">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-xl text-sm font-medium text-slate-300 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingContact}
                    className="px-5 py-2 bg-blue-600 hover:bg-blue-500 rounded-xl text-sm font-semibold text-white transition-colors disabled:opacity-50 shadow-md shadow-blue-900/30"
                  >
                    {submittingContact ? 'Saving...' : 'Save Contact'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Edit Contact Modal */}
        {editingContact && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-md p-6 shadow-2xl">
              <div className="flex items-center justify-between mb-5 border-b border-slate-700/60 pb-3">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Edit3 className="w-5 h-5 text-blue-400" /> Edit Contact Details
                </h3>
                <button 
                  onClick={() => setEditingContact(null)}
                  className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveEditContact} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Full Name *</label>
                  <input
                    required
                    type="text"
                    value={editingContact.name}
                    onChange={(e) => setEditingContact({ ...editingContact, name: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Phone Number *</label>
                  <input
                    required
                    type="text"
                    value={editingContact.phone}
                    onChange={(e) => setEditingContact({ ...editingContact, phone: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-blue-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Email Address</label>
                  <input
                    type="email"
                    value={editingContact.email}
                    onChange={(e) => setEditingContact({ ...editingContact, email: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Date of Birth</label>
                    <input
                      type="date"
                      value={editingContact.date_of_birth}
                      onChange={(e) => setEditingContact({ ...editingContact, date_of_birth: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Marriage Anniversary</label>
                    <input
                      type="date"
                      value={editingContact.marriage_anniversary}
                      onChange={(e) => setEditingContact({ ...editingContact, marriage_anniversary: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Tags (Comma-separated)</label>
                  <input
                    type="text"
                    placeholder="e.g. VIP, Business, Regular"
                    value={editingContact.tags}
                    onChange={(e) => setEditingContact({ ...editingContact, tags: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-700/60 mt-6">
                  <button
                    type="button"
                    onClick={() => setEditingContact(null)}
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
