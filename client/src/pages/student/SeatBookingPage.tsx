import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  ChevronLeft,
  Calendar,
  Clock,
  MapPin,
  Sparkles,
  Armchair,
  Utensils,
  Plus,
  Minus,
  CheckCircle2,
  AlertCircle,
  QrCode,
  CreditCard,
  Lock,
  ArrowRight,
  ShieldCheck,
  Building,
} from 'lucide-react';
import { bookingApi } from '../../api/bookings';
import { apiGet } from '../../api/client';
import { useAuthStore } from '../../stores/auth';
import { formatINR } from '../../lib/format';
import { toast } from '../../components/ui/Toast';
import { ProductImage } from '../../components/ProductImage';
import type { Product, SeatLayoutItem } from '../../lib/types';
import { cn } from '../../lib/utils';

export function SeatBookingPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);

  // 1. Fetch Event Details
  const { data: eventData, isLoading: isEventLoading } = useQuery({
    queryKey: ['event-detail', eventId],
    queryFn: () => bookingApi.getEventById(eventId || ''),
    enabled: !!eventId,
  });

  const event = eventData?.event;

  // Selected State
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>('');
  const [selectedSeats, setSelectedSeats] = useState<string[]>([]);
  const [preOrderCart, setPreOrderCart] = useState<Record<string, number>>({});
  const [cookingNotes, setCookingNotes] = useState<string>('');
  const [coupon, setCoupon] = useState<string>('');
  const [bookingError, setBookingError] = useState<string | null>(null);

  // Set default date and timeslot once event loads
  useEffect(() => {
    if (event) {
      if (!selectedDate && event.dates.length > 0) {
        setSelectedDate(event.dates[0]);
      }
      if (!selectedTimeSlot && event.timeSlots.length > 0) {
        setSelectedTimeSlot(event.timeSlots[0].time);
      }
    }
  }, [event, selectedDate, selectedTimeSlot]);

  // 2. Fetch Real-time Occupied Seats
  const { data: seatsOccupancy, refetch: refetchSeats } = useQuery({
    queryKey: ['seats-occupancy', eventId, selectedDate, selectedTimeSlot],
    queryFn: () => bookingApi.getOccupiedSeats(eventId || '', selectedDate, selectedTimeSlot),
    enabled: !!eventId && !!selectedDate && !!selectedTimeSlot,
    refetchInterval: 15_000, // Refresh seats every 15s
  });

  const bookedSeats = seatsOccupancy?.booked || [];
  const heldSeats = seatsOccupancy?.held || [];

  // 3. Fetch Pre-Order Catalog Products
  const { data: catalogData } = useQuery({
    queryKey: ['preorder-catalog'],
    queryFn: () => apiGet<{ products: Product[] }>('/api/products'),
    staleTime: 60_000,
  });

  const products: Product[] = catalogData?.products || [];

  // Seat toggle handler
  const handleToggleSeat = (seat: SeatLayoutItem) => {
    if (bookedSeats.includes(seat.label)) {
      toast.error(`Seat ${seat.label} is already reserved.`);
      return;
    }

    if (selectedSeats.includes(seat.label)) {
      setSelectedSeats(selectedSeats.filter((s) => s !== seat.label));
    } else {
      if (selectedSeats.length >= 6) {
        toast.error('You can reserve up to 6 seats per booking.');
        return;
      }
      setSelectedSeats([...selectedSeats, seat.label]);
    }
  };

  // Pre-Order item quantity modifier
  const updatePreOrderQty = (productId: string, delta: number) => {
    setPreOrderCart((prev) => {
      const current = prev[productId] || 0;
      const next = Math.max(0, current + delta);
      if (next === 0) {
        const copy = { ...prev };
        delete copy[productId];
        return copy;
      }
      return { ...prev, [productId]: next };
    });
  };

  // Calculations
  const seatTotal = selectedSeats.reduce((sum, seatLabel) => {
    const seatObj = event?.seatLayout.find((s) => s.label === seatLabel);
    return sum + (seatObj ? seatObj.price : event?.startingPrice || 0);
  }, 0);

  const preOrderItemsList = Object.entries(preOrderCart)
    .map(([productId, quantity]) => {
      const prod = products.find((p: Product) => p._id === productId);
      return prod ? { product: prod, quantity, subtotal: prod.price * quantity } : null;
    })
    .filter(Boolean) as Array<{ product: Product; quantity: number; subtotal: number }>;

  const preOrderTotal = preOrderItemsList.reduce((sum, item) => sum + item.subtotal, 0);
  const grandTotal = seatTotal + preOrderTotal;

  // 4. Booking Mutation
  const checkoutIdRef = useRef<string>(`bkg_${crypto.randomUUID()}`);

  const bookingMutation = useMutation({
    mutationFn: () => {
      setBookingError(null);
      return bookingApi.createBooking({
        eventId: eventId || '',
        bookingDate: selectedDate,
        timeSlot: selectedTimeSlot,
        seatNumbers: selectedSeats,
        preOrderItems: Object.entries(preOrderCart).map(([productId, quantity]) => ({
          productId,
          quantity,
        })),
        notes: cookingNotes,
        checkoutRequestId: checkoutIdRef.current,
      });
    },
    onSuccess: (data) => {
      toast.success('Seat and Pre-Order Confirmed!');
      navigate(`/bookings/${data.booking._id}`);
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message || err.message || 'Failed to complete booking';
      setBookingError(msg);
      toast.error(msg);
    },
  });

  const handleCheckoutSubmit = () => {
    if (!user) {
      toast.info('Please log in to reserve your seat');
      navigate(`/login?redirect=/book/${eventId}`);
      return;
    }

    if (selectedSeats.length === 0) {
      toast.error('Please select at least 1 seat on the map');
      return;
    }

    bookingMutation.mutate();
  };

  if (isEventLoading) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center p-8 space-y-3">
        <div className="w-8 h-8 border-2 border-[#389C9A] border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs font-bold text-gray-400">Loading seat layout and hall...</p>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="max-w-md mx-auto my-12 p-8 bg-white rounded-[28px] border border-gray-100 text-center space-y-4 shadow-card">
        <AlertCircle className="w-10 h-10 text-rose-500 mx-auto" />
        <h2 className="text-base font-extrabold text-darkText">Venue or Show Not Found</h2>
        <p className="text-xs text-gray-500">The event may have ended or is no longer available for booking.</p>
        <Link
          to="/events"
          className="inline-flex px-5 py-2.5 bg-[#389C9A] text-white font-extrabold text-xs rounded-xl shadow-teal"
        >
          Back to Shows & Lounges
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-24">
      
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/events')}
          className="p-2 rounded-2xl bg-secondaryBg hover:bg-gray-100 text-darkText transition-colors shadow-3xs flex items-center gap-1 text-xs font-bold"
        >
          <ChevronLeft className="w-4 h-4" /> Back to Shows
        </button>

        <span className="text-xs font-bold text-[#389C9A] bg-teal-50 px-3 py-1 rounded-full border border-teal-200/60">
          Fast-Track Admission & Counter 2 Pickup
        </span>
      </div>

      {/* Event Banner Card */}
      <div className="bg-[#389C9A] rounded-[28px] p-6 sm:p-7 text-white shadow-teal space-y-2 relative overflow-hidden">
        <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-white/20 text-white text-[10px] font-extrabold uppercase tracking-widest">
          {event.category}
        </div>
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">{event.title}</h1>
        <p className="text-xs text-white/90 flex items-center gap-1">
          <MapPin className="w-3.5 h-3.5 text-[#FEDB71] shrink-0" /> {event.venue} • {event.collectionCounter}
        </p>
      </div>

      {/* ========================================================================= */}
      {/* STEP 1: DATE & SHOWTIME SELECTOR                                          */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-[28px] border border-gray-100 p-5 sm:p-6 shadow-card space-y-4">
        <h2 className="text-xs font-extrabold uppercase tracking-wider text-darkText flex items-center gap-1.5">
          <Calendar className="w-3.5 h-3.5 text-[#389C9A]" /> 1. Select Date & Showtime
        </h2>

        {/* Date Selector Pills */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold text-gray-500">Choose Date</label>
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            {event.dates.map((dt, idx) => {
              const isSelected = selectedDate === dt;
              return (
                <button
                  key={idx}
                  onClick={() => setSelectedDate(dt)}
                  className={cn(
                    'px-4 py-2.5 rounded-2xl text-xs font-extrabold whitespace-nowrap transition-all flex flex-col items-center gap-0.5 border',
                    isSelected
                      ? 'bg-[#389C9A] text-white border-[#389C9A] shadow-teal'
                      : 'bg-secondaryBg text-gray-700 border-transparent hover:bg-gray-100'
                  )}
                >
                  <span className="text-[10px] uppercase opacity-80">Date</span>
                  <span>{dt}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Showtime Selector Pills */}
        <div className="space-y-1.5 pt-1">
          <label className="text-[11px] font-bold text-gray-500">Choose Showtime / Session</label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {event.timeSlots.map((ts, idx) => {
              const isSelected = selectedTimeSlot === ts.time;
              return (
                <button
                  key={idx}
                  onClick={() => setSelectedTimeSlot(ts.time)}
                  className={cn(
                    'p-3 rounded-2xl text-left border transition-all flex flex-col justify-between space-y-1',
                    isSelected
                      ? 'bg-teal-50 border-[#389C9A] text-darkText shadow-sm'
                      : 'bg-secondaryBg border-transparent text-gray-700 hover:bg-gray-100'
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold">{ts.time}</span>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-teal-100 text-[#225353]">
                      {ts.label}
                    </span>
                  </div>
                  <span className="text-[10px] text-gray-400 font-medium">Standard & VIP Available</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* STEP 2: INTERACTIVE SVG SEAT MAP                                          */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-[28px] border border-gray-100 p-5 sm:p-6 shadow-card space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-extrabold uppercase tracking-wider text-darkText flex items-center gap-1.5">
            <Armchair className="w-3.5 h-3.5 text-[#389C9A]" /> 2. Choose Your Seat
          </h2>
          <div className="flex items-center gap-3 text-[10px] font-bold text-gray-500">
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-md bg-secondaryBg border border-gray-300"></span> Available
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-md bg-[#389C9A]"></span> Selected
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-md bg-[#1D1D1D]"></span> Occupied
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-md bg-[#FEDB71]"></span> VIP
            </span>
          </div>
        </div>

        {/* Screen / Stage Indicator */}
        <div className="flex flex-col items-center space-y-1">
          <div className="w-3/4 h-2 bg-gradient-to-r from-teal-200 via-[#389C9A] to-teal-200 rounded-full shadow-sm"></div>
          <span className="text-[10px] font-extrabold uppercase tracking-widest text-gray-400">
            SCREEN / STAGE / DINING BAR
          </span>
        </div>

        {/* Seat Grid */}
        <div className="overflow-x-auto pb-2 flex justify-center">
          <div className="grid grid-cols-6 gap-2.5 p-4 bg-secondaryBg rounded-3xl border border-gray-100 max-w-sm w-full">
            {event.seatLayout.map((seat) => {
              const isSelected = selectedSeats.includes(seat.label);
              const isBooked = bookedSeats.includes(seat.label);
              const isVIP = seat.type === 'VIP';

              return (
                <button
                  key={seat.label}
                  disabled={isBooked}
                  onClick={() => handleToggleSeat(seat)}
                  className={cn(
                    'h-11 rounded-xl font-bold text-xs flex flex-col items-center justify-center transition-all relative',
                    isBooked
                      ? 'bg-[#1D1D1D] text-gray-500 cursor-not-allowed opacity-40'
                      : isSelected
                      ? 'bg-[#389C9A] text-white shadow-teal scale-105 ring-2 ring-teal-400'
                      : isVIP
                      ? 'bg-[#FEDB71] text-darkText border border-[#fedb71] hover:bg-[#fedb71]/90 shadow-3xs'
                      : 'bg-white text-darkText border border-gray-200 hover:bg-teal-50 hover:border-[#389C9A] shadow-3xs'
                  )}
                >
                  <span>{seat.label}</span>
                  <span className="text-[8px] opacity-75 font-mono">{formatINR(seat.price)}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Seats Summary */}
        <div className="p-3.5 bg-teal-50 border border-teal-200/60 rounded-2xl flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <Armchair className="w-4 h-4 text-[#389C9A]" />
            <span>
              Selected Seats:{' '}
              <strong>{selectedSeats.length > 0 ? selectedSeats.join(', ') : 'None selected'}</strong>
            </span>
          </div>
          <span className="font-black text-[#389C9A]">{formatINR(seatTotal)}</span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* STEP 3: PRE-ORDER FOOD & DRINKS ADDONS                                    */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-[28px] border border-gray-100 p-5 sm:p-6 shadow-card space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xs font-extrabold uppercase tracking-wider text-darkText flex items-center gap-1.5">
              <Utensils className="w-3.5 h-3.5 text-[#389C9A]" /> 3. Pre-Order Food & Refreshments (Optional)
            </h2>
            <p className="text-[11px] text-gray-400">
              Skip the counter billing rush. Pre-ordered food is waiting at {event.collectionCounter}.
            </p>
          </div>
          <span className="text-xs font-black text-[#389C9A] bg-teal-50 px-2.5 py-1 rounded-xl">
            Pre-Order: {formatINR(preOrderTotal)}
          </span>
        </div>

        {/* Items Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-80 overflow-y-auto pr-1">
          {products.slice(0, 8).map((prod: Product) => {
            const qty = preOrderCart[prod._id] || 0;
            return (
              <div
                key={prod._id}
                className="p-3 bg-secondaryBg rounded-2xl border border-gray-100 flex items-center justify-between gap-3 hover:border-teal-200 transition-colors"
              >
                <div className="flex items-center gap-2.5 flex-1 min-w-0">
                  <div className="w-12 h-12 rounded-xl overflow-hidden shrink-0 bg-white shadow-3xs">
                    <ProductImage src={prod.imageUrl} alt={prod.name} className="w-full h-full object-cover" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1">
                      <span className={cn('w-2 h-2 rounded-full', prod.isVeg ? 'bg-[#389C9A]' : 'bg-rose-600')} />
                      <p className="text-xs font-extrabold text-darkText truncate">{prod.name}</p>
                    </div>
                    <p className="text-xs font-black text-[#389C9A]">{formatINR(prod.price)}</p>
                  </div>
                </div>

                {/* Quantity Stepper */}
                <div className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-xl p-1 shadow-3xs">
                  <button
                    onClick={() => updatePreOrderQty(prod._id, -1)}
                    disabled={qty === 0}
                    className="w-6 h-6 rounded-lg bg-gray-100 hover:bg-gray-200 text-darkText flex items-center justify-center disabled:opacity-30 transition-colors"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="w-5 text-center text-xs font-black text-darkText">{qty}</span>
                  <button
                    onClick={() => updatePreOrderQty(prod._id, 1)}
                    className="w-6 h-6 rounded-lg bg-[#389C9A] hover:bg-[#2d817f] text-white flex items-center justify-center shadow-3xs transition-transform active:scale-95"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* STEP 4: REVIEW BOOKING & CONFIRMATION                                     */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-[28px] border border-gray-100 p-5 sm:p-6 shadow-card space-y-4">
        <h2 className="text-xs font-extrabold uppercase tracking-wider text-darkText flex items-center gap-1.5">
          <CreditCard className="w-3.5 h-3.5 text-[#389C9A]" /> 4. Review Booking & Payment
        </h2>

        {/* Cost Summary Breakdown */}
        <div className="space-y-2 text-xs text-gray-600 border-y border-gray-100 py-3">
          <div className="flex justify-between">
            <span>Seat Reservation ({selectedSeats.length} seats)</span>
            <span className="font-bold text-darkText">{formatINR(seatTotal)}</span>
          </div>

          <div className="flex justify-between">
            <span>Pre-Ordered Items ({preOrderItemsList.length} dishes)</span>
            <span className="font-bold text-darkText">{formatINR(preOrderTotal)}</span>
          </div>

          <div className="flex justify-between text-sm font-black text-darkText pt-2 border-t border-gray-100">
            <span>Grand Total</span>
            <span className="text-[#389C9A] text-base">{formatINR(grandTotal)}</span>
          </div>
        </div>

        {bookingError && (
          <div className="p-3 bg-rose-50 text-rose-700 text-xs font-bold rounded-xl border border-rose-200">
            {bookingError}
          </div>
        )}

        {/* Submit Booking Button */}
        <button
          onClick={handleCheckoutSubmit}
          disabled={bookingMutation.isPending || selectedSeats.length === 0}
          className="w-full py-4 bg-[#FEDB71] hover:bg-[#fedb71]/90 text-darkText font-black text-sm rounded-2xl shadow-md flex items-center justify-center gap-2 transition-transform active:scale-98 disabled:opacity-50"
        >
          {bookingMutation.isPending ? (
            'Confirming Seat Reservation...'
          ) : (
            <>
              <Lock className="w-4 h-4" /> Confirm Booking • {formatINR(grandTotal)}
            </>
          )}
        </button>

        <p className="text-[11px] text-gray-400 text-center flex items-center justify-center gap-1">
          <ShieldCheck className="w-3.5 h-3.5 text-[#389C9A]" /> Digital boarding pass generated instantly upon confirmation.
        </p>
      </div>
    </div>
  );
}
