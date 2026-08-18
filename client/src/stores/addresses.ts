import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface CampusAddress {
  id: string;
  label: 'Hostel' | 'Academic Block' | 'Library' | 'Canteen' | 'Other';
  building: string;
  roomNumber: string;
  contactPhone: string;
  deliveryNotes?: string;
  isDefault: boolean;
  createdAt: string;
}

interface AddressState {
  addresses: CampusAddress[];
  addAddress: (address: Omit<CampusAddress, 'id' | 'createdAt'>) => CampusAddress;
  updateAddress: (id: string, address: Partial<CampusAddress>) => void;
  deleteAddress: (id: string) => void;
  setDefault: (id: string) => void;
  getDefault: () => CampusAddress | undefined;
}

const initialAddresses: CampusAddress[] = [
  {
    id: 'addr_default_1',
    label: 'Hostel',
    building: 'Main Hostel - Block A',
    roomNumber: 'Room 304 (3rd Floor)',
    contactPhone: '+91 98765 43210',
    deliveryNotes: 'Please ring bell or call on arrival at hostel gate',
    isDefault: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'addr_default_2',
    label: 'Academic Block',
    building: 'Engineering Block 3 - Tech Park',
    roomNumber: 'Lab 202 (2nd Floor)',
    contactPhone: '+91 98765 43210',
    deliveryNotes: 'Drop at security lobby reception',
    isDefault: false,
    createdAt: new Date().toISOString(),
  },
];

export const useAddressStore = create<AddressState>()(
  persist(
    (set, get) => ({
      addresses: initialAddresses,
      addAddress: (data) => {
        const newAddress: CampusAddress = {
          ...data,
          id: `addr_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
          createdAt: new Date().toISOString(),
        };

        set((state) => {
          let updated = [...state.addresses];
          if (newAddress.isDefault) {
            updated = updated.map((a) => ({ ...a, isDefault: false }));
          }
          return { addresses: [newAddress, ...updated] };
        });

        return newAddress;
      },
      updateAddress: (id, data) => {
        set((state) => {
          let updated = state.addresses.map((a) => (a.id === id ? { ...a, ...data } : a));
          if (data.isDefault) {
            updated = updated.map((a) => (a.id === id ? { ...a, isDefault: true } : { ...a, isDefault: false }));
          }
          return { addresses: updated };
        });
      },
      deleteAddress: (id) => {
        set((state) => {
          const remaining = state.addresses.filter((a) => a.id !== id);
          if (remaining.length > 0 && !remaining.some((a) => a.isDefault)) {
            remaining[0].isDefault = true;
          }
          return { addresses: remaining };
        });
      },
      setDefault: (id) => {
        set((state) => ({
          addresses: state.addresses.map((a) => ({
            ...a,
            isDefault: a.id === id,
          })),
        }));
      },
      getDefault: () => {
        const { addresses } = get();
        return addresses.find((a) => a.isDefault) || addresses[0];
      },
    }),
    {
      name: 'campus_food_addresses',
    }
  )
);
