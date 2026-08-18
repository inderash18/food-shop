import React, { useState } from 'react';
import {
  MapPin,
  Plus,
  Trash2,
  Edit2,
  CheckCircle2,
  Building,
  Phone,
  Home,
  BookOpen,
  Coffee,
  X,
} from 'lucide-react';
import { useAddressStore, CampusAddress } from '../../stores/addresses';
import { toast } from '../../components/ui/Toast';
import { cn } from '../../lib/utils';

export function AddressesPage() {
  const { addresses, addAddress, updateAddress, deleteAddress, setDefault } = useAddressStore();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form State
  const [label, setLabel] = useState<CampusAddress['label']>('Hostel');
  const [building, setBuilding] = useState('');
  const [roomNumber, setRoomNumber] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [deliveryNotes, setDeliveryNotes] = useState('');
  const [isDefault, setIsDefault] = useState(false);

  const openAddModal = () => {
    setEditingId(null);
    setLabel('Hostel');
    setBuilding('');
    setRoomNumber('');
    setContactPhone('+91 ');
    setDeliveryNotes('');
    setIsDefault(addresses.length === 0);
    setModalOpen(true);
  };

  const openEditModal = (addr: CampusAddress) => {
    setEditingId(addr.id);
    setLabel(addr.label);
    setBuilding(addr.building);
    setRoomNumber(addr.roomNumber);
    setContactPhone(addr.contactPhone);
    setDeliveryNotes(addr.deliveryNotes || '');
    setIsDefault(addr.isDefault);
    setModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!building.trim() || !roomNumber.trim()) {
      toast.error('Please enter building and room/floor details');
      return;
    }

    if (editingId) {
      updateAddress(editingId, {
        label,
        building: building.trim(),
        roomNumber: roomNumber.trim(),
        contactPhone: contactPhone.trim(),
        deliveryNotes: deliveryNotes.trim(),
        isDefault,
      });
      toast.success('Address updated successfully');
    } else {
      addAddress({
        label,
        building: building.trim(),
        roomNumber: roomNumber.trim(),
        contactPhone: contactPhone.trim(),
        deliveryNotes: deliveryNotes.trim(),
        isDefault,
      });
      toast.success('New campus address added');
    }

    setModalOpen(false);
  };

  const getLabelIcon = (type: CampusAddress['label']) => {
    switch (type) {
      case 'Hostel':
        return <Home className="w-4 h-4 text-emerald-600" />;
      case 'Academic Block':
        return <Building className="w-4 h-4 text-blue-600" />;
      case 'Library':
        return <BookOpen className="w-4 h-4 text-amber-600" />;
      case 'Canteen':
        return <Coffee className="w-4 h-4 text-rose-600" />;
      default:
        return <MapPin className="w-4 h-4 text-gray-600" />;
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Delivery Addresses</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Manage your hostel rooms and campus spots for ultra-fast food drop-offs.
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-2xl shadow-emerald transition-transform active:scale-95 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" /> Add New Address
        </button>
      </div>

      {/* Address Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {addresses.map((addr) => (
          <div
            key={addr.id}
            className={cn(
              'bg-white rounded-3xl border p-5 space-y-3 relative transition-all shadow-2xs',
              addr.isDefault
                ? 'border-emerald-300 ring-2 ring-emerald-100'
                : 'border-gray-100 hover:border-gray-200'
            )}
          >
            {/* Card Header */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-gray-50 flex items-center justify-center border border-gray-100">
                  {getLabelIcon(addr.label)}
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-gray-900">{addr.building}</h3>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                    {addr.label}
                  </span>
                </div>
              </div>

              {addr.isDefault && (
                <span className="bg-emerald-50 text-emerald-800 text-[10px] font-black px-2.5 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Default
                </span>
              )}
            </div>

            {/* Address Details */}
            <div className="space-y-1 text-xs text-gray-600 bg-gray-50/70 p-3 rounded-2xl border border-gray-100/60">
              <p className="font-bold text-gray-900">{addr.roomNumber}</p>
              <p className="flex items-center gap-1.5 text-gray-500">
                <Phone className="w-3 h-3 text-gray-400" /> {addr.contactPhone}
              </p>
              {addr.deliveryNotes && (
                <p className="text-[11px] text-gray-400 italic pt-1 border-t border-gray-200/50">
                  &ldquo;{addr.deliveryNotes}&rdquo;
                </p>
              )}
            </div>

            {/* Card Actions */}
            <div className="flex items-center justify-between pt-2 border-t border-gray-50 text-xs font-bold">
              {!addr.isDefault ? (
                <button
                  onClick={() => {
                    setDefault(addr.id);
                    toast.success(`Set ${addr.building} as default`);
                  }}
                  className="text-emerald-700 hover:text-emerald-800 hover:underline"
                >
                  Set as Default
                </button>
              ) : (
                <span className="text-[11px] text-gray-400 font-medium">Selected for checkout</span>
              )}

              <div className="flex items-center gap-2">
                <button
                  onClick={() => openEditModal(addr)}
                  className="p-2 text-gray-500 hover:text-emerald-700 hover:bg-gray-100 rounded-xl transition-colors"
                  title="Edit"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                {addresses.length > 1 && (
                  <button
                    onClick={() => {
                      deleteAddress(addr.id);
                      toast.success('Address removed');
                    }}
                    className="p-2 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ========================================================= */}
      {/* ADD / EDIT ADDRESS MODAL                                   */}
      {/* ========================================================= */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl space-y-4 animate-in">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <h3 className="text-base font-extrabold text-gray-900">
                {editingId ? 'Edit Delivery Address' : 'Add New Delivery Address'}
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-gray-700 mb-1.5">Address Type</label>
                <div className="grid grid-cols-4 gap-2">
                  {(['Hostel', 'Academic Block', 'Library', 'Canteen'] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setLabel(t)}
                      className={cn(
                        'py-2 px-1 rounded-xl font-bold text-[11px] border text-center transition-all truncate',
                        label === t
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                          : 'bg-gray-50 text-gray-600 border-gray-200'
                      )}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Building / Hostel Block</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Main Hostel - Block A"
                  value={building}
                  onChange={(e) => setBuilding(e.target.value)}
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Room / Floor Details</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Room 304, 3rd Floor"
                  value={roomNumber}
                  onChange={(e) => setRoomNumber(e.target.value)}
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Contact Phone</label>
                <input
                  type="tel"
                  required
                  placeholder="+91 98765 43210"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Delivery Notes (Optional)</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Call at gate upon arrival"
                  value={deliveryNotes}
                  onChange={(e) => setDeliveryNotes(e.target.value)}
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="defaultAddressCheckbox"
                  checked={isDefault}
                  onChange={(e) => setIsDefault(e.target.checked)}
                  className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500 cursor-pointer"
                />
                <label htmlFor="defaultAddressCheckbox" className="font-bold text-gray-700 cursor-pointer">
                  Make this my default delivery address
                </label>
              </div>

              <div className="flex gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="flex-1 py-3 border border-gray-200 rounded-xl font-bold text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-extrabold shadow-emerald transition-colors"
                >
                  {editingId ? 'Save Changes' : 'Add Address'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
