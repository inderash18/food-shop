import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface SavedPaymentMethod {
  id: string;
  type: 'upi' | 'wallet' | 'card';
  title: string;
  subtitle: string;
  identifier: string;
  isDefault: boolean;
  iconType: 'gpay' | 'phonepe' | 'paytm' | 'wallet' | 'card';
}

interface PaymentMethodsState {
  methods: SavedPaymentMethod[];
  walletBalance: number;
  addMethod: (method: Omit<SavedPaymentMethod, 'id'>) => SavedPaymentMethod;
  removeMethod: (id: string) => void;
  setDefaultMethod: (id: string) => void;
  getDefaultMethod: () => SavedPaymentMethod | undefined;
  topUpWallet: (amount: number) => void;
  deductWallet: (amount: number) => boolean;
}

const initialMethods: SavedPaymentMethod[] = [
  {
    id: 'pay_upi_1',
    type: 'upi',
    title: 'Google Pay UPI',
    subtitle: 'Fast instant payment',
    identifier: 'student@okhdfcbank',
    isDefault: true,
    iconType: 'gpay',
  },
  {
    id: 'pay_upi_2',
    type: 'upi',
    title: 'PhonePe UPI',
    subtitle: 'Verified UPI ID',
    identifier: 'student@ybl',
    isDefault: false,
    iconType: 'phonepe',
  },
  {
    id: 'pay_wallet_1',
    type: 'wallet',
    title: 'Campus Food Wallet',
    subtitle: '1-tap instant campus checkout',
    identifier: 'Wallet #CF-8849',
    isDefault: false,
    iconType: 'wallet',
  },
];

export const usePaymentMethodsStore = create<PaymentMethodsState>()(
  persist(
    (set, get) => ({
      methods: initialMethods,
      walletBalance: 450.0,
      addMethod: (data) => {
        const newMethod: SavedPaymentMethod = {
          ...data,
          id: `pay_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        };

        set((state) => {
          let updated = [...state.methods];
          if (newMethod.isDefault) {
            updated = updated.map((m) => ({ ...m, isDefault: false }));
          }
          return { methods: [newMethod, ...updated] };
        });

        return newMethod;
      },
      removeMethod: (id) => {
        set((state) => {
          const remaining = state.methods.filter((m) => m.id !== id);
          if (remaining.length > 0 && !remaining.some((m) => m.isDefault)) {
            remaining[0].isDefault = true;
          }
          return { methods: remaining };
        });
      },
      setDefaultMethod: (id) => {
        set((state) => ({
          methods: state.methods.map((m) => ({
            ...m,
            isDefault: m.id === id,
          })),
        }));
      },
      getDefaultMethod: () => {
        const { methods } = get();
        return methods.find((m) => m.isDefault) || methods[0];
      },
      topUpWallet: (amount) => {
        set((state) => ({ walletBalance: state.walletBalance + amount }));
      },
      deductWallet: (amount) => {
        const { walletBalance } = get();
        if (walletBalance >= amount) {
          set({ walletBalance: walletBalance - amount });
          return true;
        }
        return false;
      },
    }),
    {
      name: 'campus_food_payments',
    }
  )
);
