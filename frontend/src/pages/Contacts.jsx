import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import Sidebar from '../components/Sidebar';
import { Mail, Phone, Tag, Upload, Plus, UserPlus } from 'lucide-react';

export default function Contacts() {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // VCF Upload state
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  // Family Member form state
  const [addingFamilyFor, setAddingFamilyFor] = useState(null);
  const [familyForm, setFamilyForm] = useState({ relation: 'spouse', full_name: '', date_of_birth: '', date_of_death: '' });

  const fetchContacts = async () => {
    try {
      const res = await axios.get('http://localhost:3000/api/contacts');
      setContacts(res.data);
    } catch (error) {
      console.error('Failed to fetch contacts:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContacts();
  }, []);

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    setUploading(true);
    try {
      const res = await axios.post('http://localhost:3000/api/contacts/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      alert(`Import complete! Added: ${res.data.importedCount}, Skipped: ${res.data.skippedCount}`);
      fetchContacts();
    } catch (error) {
      console.error('Error uploading file', error);
      alert('Failed to import contacts.');
    } finally {
      setUploading(false);
      e.target.value = null; // reset input
    }
  };

  const submitFamilyMember = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`http://localhost:3000/api/contacts/${addingFamilyFor}/family`, familyForm);
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
      <main className="flex-1 p-8 overflow-y-auto">
        <header className="mb-8 flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-bold text-white">Contacts</h2>
            <p className="text-slate-400 mt-1">Manage your contacts and import VCF files.</p>
          </div>
          <div>
            <input type="file" accept=".vcf" className="hidden" ref={fileInputRef} onChange={handleFileUpload} />
            <button 
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg font-medium text-white transition-colors disabled:opacity-50"
            >
              <Upload className="w-5 h-5" />
              {uploading ? 'Importing...' : 'Import VCF'}
            </button>
          </div>
        </header>

        {loading ? (
          <p className="text-slate-400">Loading contacts...</p>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {contacts.length === 0 ? (
              <p className="text-slate-400 col-span-2">No contacts found.</p>
            ) : (
              contacts.map(contact => (
                <div key={contact.id} className="bg-slate-800 rounded-xl shadow-sm border border-slate-700 overflow-hidden flex flex-col">
                  <div className="p-6 pb-4 border-b border-slate-700/50">
                    <h3 className="text-xl font-bold text-white mb-2">{contact.name}</h3>
                    <div className="flex flex-col gap-2 text-sm text-slate-300">
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-blue-400" />
                        <span>{contact.phone}</span>
                      </div>
                      {contact.email && (
                        <div className="flex items-center gap-2">
                          <Mail className="w-4 h-4 text-blue-400" />
                          <span>{contact.email}</span>
                        </div>
                      )}
                      {contact.tags && (
                        <div className="flex items-center gap-2">
                          <Tag className="w-4 h-4 text-blue-400" />
                          <span className="bg-slate-700 px-2 py-0.5 rounded text-xs">{contact.tags}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="p-4 bg-slate-800/50 flex-1">
                    <div className="flex justify-between items-center mb-3">
                      <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Family Members</h4>
                      <button 
                        onClick={() => setAddingFamilyFor(addingFamilyFor === contact.id ? null : contact.id)}
                        className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
                      >
                        <UserPlus className="w-3 h-3" /> Add
                      </button>
                    </div>

                    {addingFamilyFor === contact.id && (
                      <form onSubmit={submitFamilyMember} className="bg-slate-900/50 p-3 rounded-lg border border-slate-700 mb-3 space-y-3">
                        <input 
                          required type="text" placeholder="Full Name" 
                          value={familyForm.full_name} onChange={e => setFamilyForm({...familyForm, full_name: e.target.value})}
                          className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-blue-500" 
                        />
                        <div className="flex gap-2">
                          <select 
                            value={familyForm.relation} onChange={e => setFamilyForm({...familyForm, relation: e.target.value})}
                            className="bg-slate-800 border border-slate-600 rounded px-2 py-1.5 text-sm focus:outline-none"
                          >
                            <option value="spouse">Spouse</option>
                            <option value="father">Father</option>
                            <option value="mother">Mother</option>
                            <option value="child">Child</option>
                          </select>
                          <input 
                            type="date" title="Date of Birth"
                            value={familyForm.date_of_birth} onChange={e => setFamilyForm({...familyForm, date_of_birth: e.target.value})}
                            className="bg-slate-800 border border-slate-600 rounded px-2 py-1.5 text-sm focus:outline-none text-slate-300"
                          />
                        </div>
                        <div className="flex justify-end gap-2">
                          <button type="button" onClick={() => setAddingFamilyFor(null)} className="text-xs text-slate-400 hover:text-white px-2 py-1">Cancel</button>
                          <button type="submit" className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded">Save</button>
                        </div>
                      </form>
                    )}

                    {contact.familyMembers?.length === 0 ? (
                      <p className="text-sm text-slate-500 italic">No family members logged.</p>
                    ) : (
                      <ul className="space-y-2">
                        {contact.familyMembers?.map(member => (
                          <li key={member.id} className="text-sm flex flex-wrap justify-between items-center bg-slate-900/50 px-3 py-2 rounded">
                            <span className="font-medium text-white">{member.full_name} <span className="text-slate-400 text-xs font-normal">({member.relation})</span></span>
                            <div className="flex gap-3">
                              {member.date_of_birth && <span className="text-slate-400 text-xs">DOB: {new Date(member.date_of_birth).toLocaleDateString()}</span>}
                              {member.date_of_death && <span className="text-red-400/80 text-xs">DOD: {new Date(member.date_of_death).toLocaleDateString()}</span>}
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
      </main>
    </div>
  );
}
