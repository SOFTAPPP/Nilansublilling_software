import { useState, useRef } from 'react';
import { useStore, Party } from '../store/useStore';
import { Upload, Plus, Trash2, Edit2, ChevronDown } from 'lucide-react';
import { parseCustomersFile } from '../utils/dataImport';

export default function CustomerManagement() {
  const { parties, addParty, deleteParty, setParties, updateParty, showDialog } = useStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [editingParty, setEditingParty] = useState<Party | null>(null);
  const [editForm, setEditForm] = useState<Partial<Party>>({});
  const [editPhoneCode, setEditPhoneCode] = useState('+91');
  const [newPhoneCode, setNewPhoneCode] = useState('+91');
  const [newPhoneCodeOpen, setNewPhoneCodeOpen] = useState(false);
  const [editPhoneCodeOpen, setEditPhoneCodeOpen] = useState(false);
  const countryCodes = ['+91', '+1', '+44', '+61', '+971'];

  const handleEditClick = (party: Party) => {
    setEditingParty(party);
    if (party.phone && party.phone.includes(' ')) {
      const parts = party.phone.split(' ');
      setEditPhoneCode(parts[0]);
      setEditForm({ ...party, phone: parts.slice(1).join(' ') });
    } else {
      setEditPhoneCode('+91');
      setEditForm({ ...party });
    }
  };

  const handleEditSave = async () => {
    if (!editingParty) return;
    if (!editForm.name) {
      showDialog({ title: 'Validation Error', message: 'Name is required', type: 'alert' });
      return;
    }
    const currentId = editingParty.id;
    const finalPhone = editForm.phone ? `${editPhoneCode} ${editForm.phone}` : '';
    const currentForm = { ...editForm, phone: finalPhone };
    setEditingParty(null);
    setEditForm({});
    
    await updateParty(currentId, currentForm);
  };

  const [newParty, setNewParty] = useState<Partial<Party>>({
    name: '',
    address: '',
    phone: '',
    email: '',
    gstin: '',
    discountPercentage: 0,
    outstandingBalance: 0,
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const importedParties = await parseCustomersFile(file);
      // Merge with existing avoiding duplicates by phone or name
      const merged = [...parties];
      importedParties.forEach(imported => {
        const exists = merged.find(p => p.phone === imported.phone || p.name === imported.name);
        if (!exists) {
          merged.push(imported);
        }
      });
      setParties(merged);
      showDialog({ title: 'Success', message: `Successfully imported ${importedParties.length} customers.`, type: 'alert' });
    } catch (err) {
      showDialog({ title: 'Import Failed', message: (err as Error).message, type: 'alert' });
    }
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleAddManual = () => {
    if (!newParty.name) {
      showDialog({ title: 'Validation Error', message: 'Name is required', type: 'alert' });
      return;
    }
    
    const finalPhone = newParty.phone ? `${newPhoneCode} ${newParty.phone}` : '';
    const party: Party = {
      id: `PARTY-${Date.now()}`,
      name: newParty.name || '',
      address: newParty.address || '',
      phone: finalPhone,
      email: newParty.email || '',
      gstin: newParty.gstin || '',
      discountPercentage: Number(newParty.discountPercentage) || 0,
      outstandingBalance: Number(newParty.outstandingBalance) || 0,
    };

    addParty(party);
    setIsAdding(false);
    setNewParty({ name: '', address: '', phone: '', email: '', gstin: '', discountPercentage: 0, outstandingBalance: 0 });
    setNewPhoneCode('+91');
  };

  const removeParty = (id: string) => {
    showDialog({
      title: 'Remove Customer',
      message: 'Are you sure you want to remove this customer?',
      type: 'confirm',
      onConfirm: async () => {
        deleteParty(id);
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Customers / Parties</h1>
        <div className="flex gap-4">
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="bg-secondary text-secondary-foreground px-4 py-2 rounded-md hover:bg-secondary/90 flex items-center gap-2"
          >
            <Upload size={18} /> Import (.json/.xlsx)
          </button>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileUpload} 
            accept=".json,.xlsx,.xls" 
            className="hidden" 
          />
          <button 
            onClick={() => setIsAdding(true)}
            className="bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 flex items-center gap-2"
          >
            <Plus size={18} /> Add Manually
          </button>
        </div>
      </div>

      {isAdding && (
        <div className="bg-card p-6 md:p-8 rounded-2xl border border-border/50 shadow-lg mb-6 animate-in slide-in-from-top-4 fade-in duration-300">
          <h2 className="text-2xl font-bold mb-6 tracking-tight text-foreground">Add New Customer</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="col-span-2 md:col-span-1">
              <label className="block text-[13px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Name <span className="text-red-500">*</span></label>
              <input type="text" placeholder="e.g. Suresh Kumar" value={newParty.name} onChange={e => setNewParty({...newParty, name: e.target.value})} className="w-full border border-border/50 p-3 rounded-xl bg-muted/50 focus:bg-background outline-none focus:ring-2 focus:ring-primary/30 transition-all font-semibold text-sm text-foreground" />
            </div>
            <div className="col-span-2 md:col-span-1">
              <label className="block text-[13px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Phone</label>
              <div className="flex">
                <div className="relative">
                  <button 
                    onClick={() => setNewPhoneCodeOpen(!newPhoneCodeOpen)}
                    className="flex items-center justify-between gap-1 border border-border/50 border-r-0 p-3 rounded-l-xl bg-muted/50 hover:bg-muted transition-colors font-semibold text-sm text-foreground w-[85px] h-full"
                  >
                    {newPhoneCode} <ChevronDown size={14} className="opacity-50" />
                  </button>
                  {newPhoneCodeOpen && (
                    <div className="absolute top-full left-0 mt-1.5 w-[110px] bg-card border border-border/50 rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                      {countryCodes.map(code => (
                        <button
                          key={code}
                          onClick={() => { setNewPhoneCode(code); setNewPhoneCodeOpen(false); }}
                          className={`w-full text-left px-4 py-2.5 text-[13px] font-bold hover:bg-primary hover:text-primary-foreground transition-colors ${newPhoneCode === code ? 'bg-primary/10 text-primary' : 'text-foreground'}`}
                        >
                          {code}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <input type="text" placeholder="Contact Number" value={newParty.phone} onChange={e => setNewParty({...newParty, phone: e.target.value.replace(/\D/g, '')})} className="w-full border border-border/50 p-3 rounded-r-xl bg-muted/50 focus:bg-background outline-none focus:ring-2 focus:ring-primary/30 transition-all font-semibold text-sm text-foreground" />
              </div>
            </div>
            <div className="col-span-2 md:col-span-1">
              <label className="block text-[13px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Email</label>
              <input type="text" placeholder="Email Address" value={newParty.email} onChange={e => setNewParty({...newParty, email: e.target.value})} className="w-full border border-border/50 p-3 rounded-xl bg-muted/50 focus:bg-background outline-none focus:ring-2 focus:ring-primary/30 transition-all font-semibold text-sm text-foreground" />
            </div>
            <div className="col-span-2 md:col-span-1">
              <label className="block text-[13px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">GSTIN</label>
              <input type="text" placeholder="GST Number" value={newParty.gstin} onChange={e => setNewParty({...newParty, gstin: e.target.value})} className="w-full border border-border/50 p-3 rounded-xl bg-muted/50 focus:bg-background outline-none focus:ring-2 focus:ring-primary/30 transition-all font-semibold text-sm text-foreground" />
            </div>
            <div className="col-span-2">
              <label className="block text-[13px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Address</label>
              <input type="text" placeholder="Full Address" value={newParty.address} onChange={e => setNewParty({...newParty, address: e.target.value})} className="w-full border border-border/50 p-3 rounded-xl bg-muted/50 focus:bg-background outline-none focus:ring-2 focus:ring-primary/30 transition-all font-semibold text-sm text-foreground" />
            </div>
            <div>
              <label className="block text-[13px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Default Discount %</label>
              <input type="number" placeholder="0" value={newParty.discountPercentage} onChange={e => setNewParty({...newParty, discountPercentage: parseFloat(e.target.value) || 0})} className="w-full border border-border/50 p-3 rounded-xl bg-muted/50 focus:bg-background outline-none focus:ring-2 focus:ring-primary/30 transition-all font-semibold text-sm text-foreground" />
            </div>
            <div>
              <label className="block text-[13px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Opening Balance (₹)</label>
              <input type="number" placeholder="0" value={newParty.outstandingBalance !== undefined ? Number(Number(newParty.outstandingBalance).toFixed(2)) : 0} onChange={e => setNewParty({...newParty, outstandingBalance: parseFloat(e.target.value) || 0})} className="w-full border border-border/50 p-3 rounded-xl bg-muted/50 focus:bg-background outline-none focus:ring-2 focus:ring-primary/30 transition-all font-semibold text-sm text-foreground" />
            </div>
          </div>
          <div className="flex gap-3 mt-8">
            <button onClick={handleAddManual} className="px-7 py-2.5 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 font-bold shadow-md transition-colors text-sm">Save Customer</button>
            <button onClick={() => setIsAdding(false)} className="px-5 py-2.5 border border-border/50 rounded-xl hover:bg-muted font-bold transition-colors text-sm text-foreground shadow-sm">Cancel</button>
          </div>
        </div>
      )}

      {editingParty && (
        <div className="fixed inset-0 backdrop-blur-sm bg-black/40 flex items-center justify-center z-50 animate-in fade-in duration-200">
          <div className="bg-card p-6 md:p-8 rounded-2xl w-full max-w-lg shadow-2xl border border-border/50 animate-in zoom-in-95 duration-200">
            <h2 className="text-2xl font-bold mb-6 tracking-tight text-foreground">Edit Customer: {editingParty.name}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="col-span-2 md:col-span-1">
                <label className="block text-[13px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Name <span className="text-red-500">*</span></label>
                <input type="text" placeholder="Name *" value={editForm.name || ''} onChange={e => setEditForm({...editForm, name: e.target.value})} className="w-full border border-border/50 p-3 rounded-xl bg-muted/50 focus:bg-background outline-none focus:ring-2 focus:ring-primary/30 transition-all font-semibold text-sm text-foreground" />
              </div>
              <div className="col-span-2 md:col-span-1">
                <label className="block text-[13px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Phone</label>
                <div className="flex">
                  <div className="relative">
                    <button 
                      onClick={() => setEditPhoneCodeOpen(!editPhoneCodeOpen)}
                      className="flex items-center justify-between gap-1 border border-border/50 border-r-0 p-3 rounded-l-xl bg-muted/50 hover:bg-muted transition-colors font-semibold text-sm text-foreground w-[85px] h-full"
                    >
                      {editPhoneCode} <ChevronDown size={14} className="opacity-50" />
                    </button>
                    {editPhoneCodeOpen && (
                      <div className="absolute top-full left-0 mt-1.5 w-[110px] bg-card border border-border/50 rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                        {countryCodes.map(code => (
                          <button
                            key={code}
                            onClick={() => { setEditPhoneCode(code); setEditPhoneCodeOpen(false); }}
                            className={`w-full text-left px-4 py-2.5 text-[13px] font-bold hover:bg-primary hover:text-primary-foreground transition-colors ${editPhoneCode === code ? 'bg-primary/10 text-primary' : 'text-foreground'}`}
                          >
                            {code}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <input type="text" placeholder="Phone" value={editForm.phone || ''} onChange={e => setEditForm({...editForm, phone: e.target.value.replace(/\D/g, '')})} className="w-full border border-border/50 p-3 rounded-r-xl bg-muted/50 focus:bg-background outline-none focus:ring-2 focus:ring-primary/30 transition-all font-semibold text-sm text-foreground" />
                </div>
              </div>
              <div className="col-span-2 md:col-span-1">
                <label className="block text-[13px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Email</label>
                <input type="text" placeholder="Email" value={editForm.email || ''} onChange={e => setEditForm({...editForm, email: e.target.value})} className="w-full border border-border/50 p-3 rounded-xl bg-muted/50 focus:bg-background outline-none focus:ring-2 focus:ring-primary/30 transition-all font-semibold text-sm text-foreground" />
              </div>
              <div className="col-span-2 md:col-span-1">
                <label className="block text-[13px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">GSTIN</label>
                <input type="text" placeholder="GSTIN" value={editForm.gstin || ''} onChange={e => setEditForm({...editForm, gstin: e.target.value})} className="w-full border border-border/50 p-3 rounded-xl bg-muted/50 focus:bg-background outline-none focus:ring-2 focus:ring-primary/30 transition-all font-semibold text-sm text-foreground" />
              </div>
              <div className="col-span-2">
                <label className="block text-[13px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Address</label>
                <input type="text" placeholder="Address" value={editForm.address || ''} onChange={e => setEditForm({...editForm, address: e.target.value})} className="w-full border border-border/50 p-3 rounded-xl bg-muted/50 focus:bg-background outline-none focus:ring-2 focus:ring-primary/30 transition-all font-semibold text-sm text-foreground" />
              </div>
              <div>
                <label className="block text-[13px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Default Discount %</label>
                <input type="number" value={editForm.discountPercentage || 0} onChange={e => setEditForm({...editForm, discountPercentage: parseFloat(e.target.value) || 0})} className="w-full border border-border/50 p-3 rounded-xl bg-muted/50 focus:bg-background outline-none focus:ring-2 focus:ring-primary/30 transition-all font-semibold text-sm text-foreground" />
              </div>
              <div>
                <label className="block text-[13px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Outstanding Balance (₹)</label>
                <input type="number" value={editForm.outstandingBalance !== undefined ? Number(Number(editForm.outstandingBalance).toFixed(2)) : 0} onChange={e => setEditForm({...editForm, outstandingBalance: parseFloat(e.target.value) || 0})} className="w-full border border-border/50 p-3 rounded-xl bg-muted/50 focus:bg-background outline-none focus:ring-2 focus:ring-primary/30 transition-all font-semibold text-sm text-foreground" />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-8">
              <button onClick={() => { setEditingParty(null); setEditForm({}); }} className="px-5 py-2.5 border border-border/50 rounded-xl hover:bg-muted font-bold transition-colors text-sm text-foreground shadow-sm">Cancel</button>
              <button onClick={handleEditSave} className="px-7 py-2.5 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 font-bold shadow-md transition-colors text-sm">Update Customer</button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted text-muted-foreground">
            <tr>
              <th className="p-4 font-medium">Customer Name</th>
              <th className="p-4 font-medium">Contact</th>
              <th className="p-4 font-medium">Address</th>
              <th className="p-4 font-medium text-right">Discount %</th>
              <th className="p-4 font-medium text-right">Outstanding (₹)</th>
              <th className="p-4 font-medium text-center w-24">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {parties.map(party => (
              <tr key={party.id} className="hover:bg-muted/50 transition-colors">
                <td className="p-4 font-medium">
                  {party.name}
                  {party.gstin && <div className="text-xs text-muted-foreground mt-1">GST: {party.gstin}</div>}
                </td>
                <td className="p-4">
                  <div>{party.phone || '-'}</div>
                  <div className="text-xs text-muted-foreground">{party.email}</div>
                </td>
                <td className="p-4 text-muted-foreground max-w-[200px] truncate">{party.address || '-'}</td>
                <td className="p-4 text-right">{party.discountPercentage}%</td>
                <td className="p-4 text-right font-medium">
                  <span className={party.outstandingBalance > 0 ? 'text-red-500' : 'text-green-500'}>
                    {party.outstandingBalance < 0 
                      ? `${Math.abs(party.outstandingBalance).toFixed(2)} (Adv)` 
                      : party.outstandingBalance.toFixed(2)}
                  </span>
                </td>
                <td className="p-4 text-center">
                  <div className="flex justify-center gap-2">
                    <button onClick={() => handleEditClick(party)} className="text-muted-foreground hover:text-primary transition-colors">
                      <Edit2 size={16} />
                    </button>
                    <button onClick={() => removeParty(party.id)} className="text-muted-foreground hover:text-destructive transition-colors">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {parties.length === 0 && (
              <tr>
                <td colSpan={6} className="p-8 text-center text-muted-foreground">
                  No customers found. Import from a file or add manually.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
