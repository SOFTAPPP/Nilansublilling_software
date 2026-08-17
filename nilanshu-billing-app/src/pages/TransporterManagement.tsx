import React, { useState, useEffect } from 'react';
import { useStore, Transporter } from '../store/useStore';
import { Search, Plus, Trash2, Edit2 } from 'lucide-react';

export default function TransporterManagement() {
  const { transporters, addTransporter, updateTransporter, deleteTransporter, fetchTransporters, showDialog } = useStore();
  const [searchTerm, setSearchTerm] = useState('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<Transporter>>({
    name: '', phone: '', address: ''
  });
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [route, setRoute] = useState('');

  useEffect(() => {
    fetchTransporters();
  }, [fetchTransporters]);

  const filteredTransporters = transporters.filter(t => 
    t.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    t.phone.includes(searchTerm)
  );

  const handleOpenModal = (transporter?: Transporter) => {
    if (transporter) {
      setEditingId(transporter.id);
      
      let parsedAddress = transporter.address || '';
      let parsedVehicle = '';
      let parsedRoute = '';
      
      const vMatch = parsedAddress.match(/ \| Vehicle: (.*?)(?= \| Route:|$)/);
      const rMatch = parsedAddress.match(/ \| Route: (.*)$/);
      
      if (vMatch) {
        parsedVehicle = vMatch[1].trim();
        parsedAddress = parsedAddress.replace(vMatch[0], '');
      }
      if (rMatch) {
        parsedRoute = rMatch[1].trim();
        parsedAddress = parsedAddress.replace(rMatch[0], '');
      }

      setFormData({ ...transporter, address: parsedAddress.trim() });
      setVehicleNumber(parsedVehicle);
      setRoute(parsedRoute);
    } else {
      setEditingId(null);
      setFormData({ name: '', phone: '', address: '' });
      setVehicleNumber('');
      setRoute('');
    }
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name) {
      showDialog({ title: 'Validation Error', message: 'Name is required', type: 'alert' });
      return;
    }
    
    setIsModalOpen(false);

    const finalAddress = `${formData.address || ''}${vehicleNumber ? ` | Vehicle: ${vehicleNumber}` : ''}${route ? ` | Route: ${route}` : ''}`;
    const payload = { ...formData, address: finalAddress };

    if (editingId) {
      await updateTransporter(editingId, payload);
    } else {
      await addTransporter(payload);
    }
  };

  const handleDelete = (id: string) => {
    showDialog({
      title: 'Delete Transporter',
      message: 'Are you sure you want to delete this transporter?',
      type: 'confirm',
      onConfirm: async () => {
        await deleteTransporter(id);
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Transporters</h1>
        <button onClick={() => handleOpenModal()} className="bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 flex items-center gap-2">
          <Plus size={18} /> Add Transporter
        </button>
      </div>

      <div className="flex gap-4 items-center bg-card p-4 rounded-xl border border-border shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
          <input 
            type="text" 
            placeholder="Search transporters by name or phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-md outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted text-muted-foreground">
            <tr>
              <th className="p-4 font-medium">Transporter Name</th>
              <th className="p-4 font-medium">Phone</th>
              <th className="p-4 font-medium">Address</th>
              <th className="p-4 font-medium text-center w-24">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filteredTransporters.map(transporter => (
              <tr key={transporter.id} className="hover:bg-muted/50 transition-colors">
                <td className="p-4 font-medium">{transporter.name}</td>
                <td className="p-4">{transporter.phone || '-'}</td>
                <td className="p-4 text-muted-foreground">{transporter.address || '-'}</td>
                <td className="p-4 text-center">
                  <div className="flex justify-center gap-2">
                    <button onClick={() => handleOpenModal(transporter)} className="text-muted-foreground hover:text-primary transition-colors">
                      <Edit2 size={16} />
                    </button>
                    <button onClick={() => handleDelete(transporter.id)} className="text-muted-foreground hover:text-destructive transition-colors">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filteredTransporters.length === 0 && (
              <tr>
                <td colSpan={4} className="p-8 text-center text-muted-foreground">
                  No transporters found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 backdrop-blur-sm bg-black/40 flex items-center justify-center z-50 animate-in fade-in duration-200">
          <div className="bg-card p-6 md:p-8 rounded-2xl w-full max-w-md shadow-2xl border border-border/50 animate-in zoom-in-95 duration-200">
            <h2 className="text-2xl font-bold mb-6 tracking-tight text-foreground">{editingId ? 'Edit Transporter' : 'Add Transporter'}</h2>
            <div className="space-y-5">
              <div>
                <label className="block text-[13px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Name <span className="text-red-500">*</span></label>
                <input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full border border-border/50 p-3 rounded-xl bg-muted/50 focus:bg-background outline-none focus:ring-2 focus:ring-primary/30 transition-all font-semibold text-sm text-foreground" placeholder="Transporter Name" />
              </div>
              <div>
                <label className="block text-[13px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Phone</label>
                <input value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full border border-border/50 p-3 rounded-xl bg-muted/50 focus:bg-background outline-none focus:ring-2 focus:ring-primary/30 transition-all font-semibold text-sm text-foreground" placeholder="Contact Number" />
              </div>
              <div>
                <label className="block text-[13px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Address</label>
                <input value={formData.address || ''} onChange={e => setFormData({...formData, address: e.target.value})} className="w-full border border-border/50 p-3 rounded-xl bg-muted/50 focus:bg-background outline-none focus:ring-2 focus:ring-primary/30 transition-all font-semibold text-sm text-foreground" placeholder="Full Address" />
              </div>
              <div>
                <label className="block text-[13px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Vehicle Number / Transport Number</label>
                <input value={vehicleNumber} onChange={e => setVehicleNumber(e.target.value)} className="w-full border border-border/50 p-3 rounded-xl bg-muted/50 focus:bg-background outline-none focus:ring-2 focus:ring-primary/30 transition-all font-semibold text-sm text-foreground" placeholder="e.g. WB11A 1234" />
              </div>
              <div>
                <label className="block text-[13px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Route (From - To)</label>
                <input value={route} onChange={e => setRoute(e.target.value)} className="w-full border border-border/50 p-3 rounded-xl bg-muted/50 focus:bg-background outline-none focus:ring-2 focus:ring-primary/30 transition-all font-semibold text-sm text-foreground" placeholder="e.g. Kolkata to Delhi" />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-8">
              <button onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 border border-border/50 rounded-xl hover:bg-muted font-bold transition-colors text-sm text-foreground shadow-sm">Cancel</button>
              <button onClick={handleSave} className="px-7 py-2.5 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 font-bold shadow-md transition-colors text-sm">Save Transporter</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
