import { useState, useEffect, useRef } from 'react';
import api from '../api';
import Sidebar from '../components/Sidebar';
import { Mail, Phone, Tag, Upload, Plus, UserPlus, X, UserCheck } from 'lucide-react';

export default function Contacts() {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // VCF Upload state
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  // New Contact modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [newContact, setNewContact] = useState({ name: '', phone: '', email: '', tags: '' });
  const [submittingContact, setSubmittingContact] = useState(false);

  // Family Member form state
  const [addingFamilyFor, setAddingFamilyFor] = useState(null);
  const [familyForm, setFamilyForm] = useState({ relation: 'spouse', full_name: '', date_of_birth: '', date_of_death: '' });

  const fetchContacts = async () => {
    try {
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
      setNewContact({ name: '', phone: '', email: '', tags: '' });
      setShowAddModal(false);
      fetchContacts();
    } catch (error) {
      console.error('Error creating contact:', error);
      alert(error.response?.data?.error || 'Failed to create contact.');
    } finally {
      setSubmittingContact(false);
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
      setFamilyForm({ relation: 'spouse', full_name: '', date_of_birth: '', date_of_death: '' });
      fetchContacts();
    } catch (error) {
      console.error('Error adding family member', error);
      alert('Failed to add family member.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex text-slate-200">
      <Sidebar />
      <main className="flex-1 p-8 overflow-y-auto max-w-7xl mx-auto w-full">
        <header className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold text-white tracking-tight flex items-center gap-2">
              Contacts Directory <UserCheck className="w-6 h-6 text-blue-400" />
            </h2>
            <p className="text-slate-400 mt-1">Manage client profiles, family records, and VCF imports.</p>
          </div>
          <div className="flex items-center gap-3">
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

        {loading ? (
          <div className="p-12 text-center text-slate-400">Loading contacts...</div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {contacts.length === 0 ? (
              <div className="col-span-2 bg-slate-800/50 border border-slate-700/80 rounded-2xl p-12 text-center">
                <p className="text-slate-400 text-base mb-4">No contacts found in your database.</p>
                <button
                  onClick={() => setShowAddModal(true)}
                  className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-medium px-4 py-2 rounded-xl transition-colors text-sm"
                >
                  <Plus className="w-4 h-4" /> Add First Contact
                </button>
              </div>
            ) : (
              contacts.map(contact => (
                <div key={contact.id} className="bg-slate-800 rounded-xl shadow-md border border-slate-700/80 overflow-hidden flex flex-col hover:border-slate-600 transition-colors">
                  <div className="p-6 pb-4 border-b border-slate-700/50">
                    <div className="flex items-start justify-between">
                      <h3 className="text-xl font-bold text-white mb-2">{contact.name}</h3>
                      {contact.tags && (
                        <div className="flex items-center gap-1 bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2.5 py-1 rounded-lg text-xs font-semibold">
                          <Tag className="w-3 h-3" />
                          <span>{contact.tags}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col gap-2 text-sm text-slate-300 mt-2">
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-emerald-400" />
                        <span className="font-mono text-slate-200">{contact.phone}</span>
                      </div>
                      {contact.email && (
                        <div className="flex items-center gap-2">
                          <Mail className="w-4 h-4 text-amber-400" />
                          <span>{contact.email}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="p-5 bg-slate-800/50 flex-1">
                    <div className="flex justify-between items-center mb-3">
                      <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Family Members ({contact.familyMembers?.length || 0})</h4>
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
                            required type="text" placeholder="e.g. Rahul Sharma" 
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
                          <li key={member.id} className="text-xs flex items-center justify-between bg-slate-900/60 border border-slate-700/50 px-3 py-2 rounded-lg">
                            <span className="font-medium text-slate-200">
                              {member.full_name} <span className="text-slate-400 font-normal">({member.relation})</span>
                            </span>
                            <div className="flex items-center gap-2 text-slate-400">
                              {member.date_of_birth && <span>DOB: {new Date(member.date_of_birth).toLocaleDateString()}</span>}
                            </div>
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
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
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
      </main>
    </div>
  );
}
