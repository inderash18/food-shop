import { useState } from 'react';
import {
  X,
  Plus,
  Minus,
  Clock,
  Sparkles,
  Utensils,
  Check,
} from 'lucide-react';
import { formatINR } from '../../lib/format';
import { ProductImage } from '../ProductImage';
import type { Product } from '../../lib/types';
import { cn } from '../../lib/utils';

interface FoodDetailDrawerProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
  onAddToCart: (product: Product, quantity: number, addons?: string[], notes?: string) => void;
}

export function FoodDetailDrawer({ product, isOpen, onClose, onAddToCart }: FoodDetailDrawerProps) {
  const [quantity, setQuantity] = useState(1);
  const [selectedAddons, setSelectedAddons] = useState<string[]>([]);
  const [notes, setNotes] = useState('');

  if (!isOpen || !product) return null;

  const defaultAddons = [
    { name: 'Extra Cheese / Sauce', price: 20 },
    { name: 'Peri-Peri Seasoning', price: 15 },
    { name: 'Double Patty / Extra Topping', price: 40 },
  ];

  const addonsTotal = selectedAddons.length * 20; // flat addon calculation
  const itemTotal = (product.price + addonsTotal) * quantity;

  const toggleAddon = (name: string) => {
    if (selectedAddons.includes(name)) {
      setSelectedAddons(selectedAddons.filter((a) => a !== name));
    } else {
      setSelectedAddons([...selectedAddons, name]);
    }
  };

  const handleConfirm = () => {
    onAddToCart(product, quantity, selectedAddons, notes);
    onClose();
    // Reset local state
    setQuantity(1);
    setSelectedAddons([]);
    setNotes('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
      <div
        className="relative w-full max-w-lg bg-white rounded-t-[32px] sm:rounded-[32px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 w-8 h-8 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Scrollable Content */}
        <div className="overflow-y-auto p-0 flex-1">
          {/* Large Image Header */}
          <div className="relative h-56 sm:h-64 w-full bg-secondaryBg overflow-hidden">
            <ProductImage
              src={product.imageUrl}
              alt={product.name}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
            <span
              className={cn(
                'absolute bottom-3 left-4 px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase text-white tracking-wider flex items-center gap-1',
                product.isVeg ? 'bg-emerald-600' : 'bg-rose-600'
              )}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-white"></span>
              {product.isVeg ? 'Vegetarian' : 'Non-Veg'}
            </span>
          </div>

          {/* Details Body */}
          <div className="p-6 space-y-5">
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-amber-950">{product.name}</h2>
                <span className="text-xl font-bold text-amber-950 tabular-nums">{formatINR(product.price)}</span>
              </div>
              <p className="text-xs font-normal text-stone-500 leading-relaxed">{product.description}</p>
            </div>

            {/* Preparation time badge */}
            <div className="flex items-center gap-2 text-xs font-medium text-amber-900 bg-amber-50/70 p-2.5 rounded-xl border border-amber-100">
              <Clock className="w-3.5 h-3.5 text-[#F59E0B]" />
              <span>Prep Time: <strong className="font-semibold">{product.prepMinutes || 8}–12 mins</strong></span>
              <span className="text-amber-300">•</span>
              <span className="text-amber-800 font-semibold">Express Counter 2</span>
            </div>

            {/* Optional Add-ons */}
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-amber-950">
                Customizations & Add-ons
              </label>
              <div className="space-y-1.5">
                {defaultAddons.map((addon) => {
                  const isChecked = selectedAddons.includes(addon.name);
                  return (
                    <button
                      key={addon.name}
                      type="button"
                      onClick={() => toggleAddon(addon.name)}
                      className={cn(
                        'w-full p-3 rounded-xl text-xs flex items-center justify-between transition-colors border',
                        isChecked
                          ? 'bg-[#FEDB71] border-amber-300 text-amber-950 shadow-3xs font-bold'
                          : 'bg-stone-50 border-stone-200/80 text-stone-700 hover:bg-amber-50/50 font-medium'
                      )}
                    >
                      <span className="flex items-center gap-2">
                        <span
                          className={cn(
                            'w-4 h-4 rounded-md flex items-center justify-center text-amber-950 text-[10px] transition-colors',
                            isChecked ? 'bg-amber-400 font-bold' : 'border border-stone-300 bg-white'
                          )}
                        >
                          {isChecked && <Check className="w-3 h-3 text-amber-950" />}
                        </span>
                        {addon.name}
                      </span>
                      <span className="font-bold text-amber-950 tabular-nums">+{formatINR(addon.price)}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Special Instructions for Chef */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-amber-950">
                Cooking Notes for Chef
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Less spicy, no mayo, extra hot..."
                className="w-full px-3.5 py-2.5 bg-amber-50/30 rounded-xl text-xs font-normal text-amber-950 placeholder:text-stone-400 focus:bg-white focus:border-amber-400 focus:outline-none border border-amber-200 transition-all"
              />
            </div>
          </div>
        </div>

        {/* Footer Quantity & Add to Pre-Order */}
        <div className="p-4 bg-white border-t border-amber-100 flex items-center justify-between gap-3">
          {/* Quantity Stepper */}
          <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-2xl p-1 shadow-3xs">
            <button
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
              disabled={quantity <= 1}
              className="w-8 h-8 rounded-xl bg-white hover:bg-amber-100 text-amber-950 flex items-center justify-center disabled:opacity-30 transition-colors shadow-3xs border border-amber-200/60"
            >
              <Minus className="w-4 h-4" />
            </button>
            <span className="w-6 text-center text-xs font-bold text-amber-950 tabular-nums">{quantity}</span>
            <button
              onClick={() => setQuantity(quantity + 1)}
              className="w-8 h-8 rounded-xl bg-[#FEDB71] hover:bg-[#F5CA38] text-amber-950 flex items-center justify-center shadow-3xs transition-transform active:scale-95 border border-amber-300"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {/* Add to Pre-Order CTA */}
          <button
            onClick={handleConfirm}
            className="flex-1 py-3 bg-[#FEDB71] hover:bg-[#F5CA38] text-amber-950 font-bold text-xs sm:text-sm rounded-2xl shadow-3xs flex items-center justify-center gap-1.5 transition-transform active:scale-98 border border-amber-300"
          >
            Add to Pre-Order • <span className="tabular-nums">{formatINR(itemTotal)}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
