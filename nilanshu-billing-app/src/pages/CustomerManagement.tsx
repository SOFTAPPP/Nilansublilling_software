import { useState, useRef } from 'react';
import { useStore, Party } from '../store/useStore';
import { Upload, Plus, Trash2, Edit2 } from 'lucide-react';
import { parseCustomersFile } from '../utils/dataImport';

export default function CustomerManagement() {
  const { parties, addParty, deleteParty, setParties, updateParty, showDialog } = useStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [editingParty, setEditingParty] = useState<Party | null>(null);
  const [editForm, setEditForm] = useState<Partial<Party>>({});

  const handleEditClick = (party: Party) => {
    setEditingParty(party);
    setEditForm({ ...party });
  };

  const handleEditSave = async () => {
    if (!editingParty) return;
    if (!editForm.name) {
      showDialog({ title: 'Validation Error', message: 'Name is required', type: 'alert' });
      return;
    }
    await updateParty(editingParty.id, editForm);
    setEditingParty(null);
    setEditForm({});
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
    
    const party: Party = {
      id: `PARTY-${Date.now()}`,
      name: newParty.name || '',
      address: newParty.address || '',
      phone: newParty.phone || '',
      email: newParty.email || '',
      gstin: newParty.gstin || '',
      discountPercentage: Number(newParty.discountPercentage) || 0,
      outstandingBalance: Number(newParty.outstandingBalance) || 0,
    };

    addParty(party);
    setIsAdding(false);
    setNewParty({ name: '', address: '', phone: '', email: '', gstin: '', discountPercentage: 0, outstandingBalance: 0 });
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
        <div className="bg-card p-6 rounded-xl border border-border shadow-sm mb-6">
          <h2 className="text-lg font-semibold mb-4">Add New Customer</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input type="text" placeholder="Name *" value={newParty.name} onChange={e => setNewParty({...newParty, name: e.target.value})} className="border border-border p-2 rounded bg-background" />
            <input type="text" placeholder="Phone" value={newParty.phone} onChange={e => setNewParty({...newParty, phone: e.target.value})} className="border border-border p-2 rounded bg-background" />
            <input type="text" placeholder="Email" value={newParty.email} onChange={e => setNewParty({...newParty, email: e.target.value})} className="border border-border p-2 rounded bg-background" />
            <input type="text" placeholder="GSTIN" value={newParty.gstin} onChange={e => setNewParty({...newParty, gstin: e.target.value})} className="border border-border p-2 rounded bg-background" />
            <input type="text" placeholder="Address" value={newParty.address} onChange={e => setNewParty({...newParty, address: e.target.value})} className="border border-border p-2 rounded bg-background md:col-span-2" />
            <div className="flex flex-col">
              <label className="text-xs text-muted-foreground mb-1">Default Discount %</label>
              <input type="number" placeholder="0" value={newParty.discountPercentage} onChange={e => setNewParty({...newParty, discountPercentage: parseFloat(e.target.value)})} className="border border-border p-2 rounded bg-background" />
            </div>
            <div className="flex flex-col">
              <label className="text-xs text-muted-foreground mb-1">Opening Balance (₹)</label>
              <input type="number" placeholder="0" value={newParty.outstandingBalance} onChange={e => setNewParty({...newParty, outstandingBalance: parseFloat(e.target.value)})} className="border border-border p-2 rounded bg-background" />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button onClick={handleAddManual} className="bg-primary text-primary-foreground px-4 py-2 rounded-md">Save</button>
            <button onClick={() => setIsAdding(false)} className="bg-muted text-muted-foreground px-4 py-2 rounded-md">Cancel</button>
          </div>
        </div>
      )}

      {editingParty && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card p-6 rounded-xl w-full max-w-lg shadow-2xl border border-border">
            <h2 className="text-xl font-bold mb-4">Edit Customer: {editingParty.name}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input type="text" placeholder="Name *" value={editForm.name || ''} onChange={e => setEditForm({...editForm, name: e.target.value})} className="border border-border p-2 rounded bg-background" />
              <input type="text" placeholder="Phone" value={editForm.phone || ''} onChange={e => setEditForm({...editForm, phone: e.target.value})} className="border border-border p-2 rounded bg-background" />
              <input type="text" placeholder="Email" value={editForm.email || ''} onChange={e => setEditForm({...editForm, email: e.target.value})} className="border border-border p-2 rounded bg-background" />
              <input type="text" placeholder="GSTIN" value={editForm.gstin || ''} onChange={e => setEditForm({...editForm, gstin: e.target.value})} className="border border-border p-2 rounded bg-background" />
              <input type="text" placeholder="Address" value={editForm.address || ''} onChange={e => setEditForm({...editForm, address: e.target.value})} className="border border-border p-2 rounded bg-background md:col-span-2" />
              <div className="flex flex-col">
                <label className="text-xs text-muted-foreground mb-1">Default Discount %</label>
                <input type="number" value={editForm.discountPercentage || 0} onChange={e => setEditForm({...editForm, discountPercentage: parseFloat(e.target.value) || 0})} className="border border-border p-2 rounded bg-background" />
              </div>
              <div className="flex flex-col">
                <label className="text-xs text-muted-foreground mb-1">Outstanding Balance (₹)</label>
                <input type="number" value={editForm.outstandingBalance || 0} onChange={e => setEditForm({...editForm, outstandingBalance: parseFloat(e.target.value) || 0})} className="border border-border p-2 rounded bg-background" />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button onClick={() => { setEditingParty(null); setEditForm({}); }} className="px-4 py-2 border rounded-md hover:bg-muted">Cancel</button>
              <button onClick={handleEditSave} className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90">Update</button>
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
                    {party.outstandingBalance.toFixed(2)}
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
