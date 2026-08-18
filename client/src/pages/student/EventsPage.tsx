import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Ticket,
  Calendar,
  Clock,
  MapPin,
  Sparkles,
  ArrowRight,
  Search,
  SlidersHorizontal,
  Armchair,
  Utensils,
  CheckCircle2,
  Star,
} from 'lucide-react';
import { bookingApi } from '../../api/bookings';
import { formatINR } from '../../lib/format';
import { cn } from '../../lib/utils';

export function EventsPage() {
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const { data, isLoading } = useQuery({
    queryKey: ['events-list'],
    queryFn: () => bookingApi.getEvents(),
    staleTime: 60_000,
  });

  const events = data?.events || [];

  const categories = [
    { id: 'ALL', label: 'All Shows & Lounges' },
    { id: 'Auditorium', label: 'Auditorium Shows' },
    { id: 'Dining Lounge', label: 'VIP Dining Tables' },
    { id: 'Campus Bistro', label: 'Terrace Bistro' },
    { id: 'Study Pods', label: 'Study Pods' },
  ];

  const filteredEvents = events.filter((evt) => {
    const matchCategory = selectedCategory === 'ALL' || evt.category === selectedCategory;
    const matchSearch =
      evt.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      evt.venue.toLowerCase().includes(searchQuery.toLowerCase()) ||
      evt.tagline.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCategory && matchSearch;
  });

  return (
    <div className="space-y-6 pb-16 max-w-5xl mx-auto">
      
      {/* Page Header */}
      <div className="bg-[#389C9A] rounded-[28px] p-6 sm:p-8 text-white space-y-4 shadow-teal relative overflow-hidden">
        <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-white/20 text-white text-[10px] font-extrabold uppercase tracking-widest">
          <Sparkles className="w-3 h-3 text-[#FEDB71]" /> Instant Seat Reservation
        </div>
        <div className="space-y-1 max-w-2xl">
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
            Discover Venues, Auditorium Shows & VIP Lounges
          </h1>
          <p className="text-xs sm:text-sm text-white/90">
            Select your favorite seats, add pre-ordered snacks, and walk right in with your digital ticket.
          </p>
        </div>
      </div>

      {/* Search & Category Filter Controls */}
      <div className="space-y-3">
        {/* Search Bar */}
        <div className="relative max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search shows, auditorium halls, or bistros..."
            className="w-full pl-11 pr-4 py-3 bg-secondaryBg border border-transparent rounded-[22px] text-xs font-medium text-darkText placeholder:text-gray-400 focus:bg-white focus:border-[#389C9A] focus:outline-none transition-all shadow-3xs"
          />
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={cn(
                'px-4 py-2 rounded-[18px] text-xs font-extrabold whitespace-nowrap transition-all select-none',
                selectedCategory === cat.id
                  ? 'bg-[#389C9A] text-white shadow-teal'
                  : 'bg-secondaryBg text-gray-600 hover:bg-gray-100 hover:text-darkText'
              )}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Events Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 animate-pulse">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="h-64 bg-secondaryBg rounded-[28px]" />
          ))}
        </div>
      ) : filteredEvents.length === 0 ? (
        <div className="p-12 text-center bg-secondaryBg rounded-[28px] space-y-3">
          <Ticket className="w-10 h-10 text-gray-300 mx-auto" />
          <h3 className="text-sm font-extrabold text-darkText">No shows found for this filter</h3>
          <p className="text-xs text-gray-400">Try searching for other halls or select "All Shows & Lounges".</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filteredEvents.map((evt) => (
            <div
              key={evt._id}
              className="bg-white rounded-[28px] border border-gray-100 shadow-card overflow-hidden flex flex-col justify-between hover:border-teal-200 transition-all group"
            >
              {/* Event Banner Image */}
              <div className="relative h-48 w-full overflow-hidden bg-gray-100">
                <img
                  src={evt.bannerImage}
                  alt={evt.title}
                  loading="lazy"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                
                {/* Category Pill */}
                <span className="absolute top-3 left-3 px-3 py-1 rounded-full bg-black/60 backdrop-blur-md text-[10px] font-extrabold uppercase tracking-wider text-white">
                  {evt.category}
                </span>

                {/* Starting Price Pill in #FEDB71 */}
                <span className="absolute bottom-3 right-3 px-3 py-1 rounded-xl bg-[#FEDB71] text-darkText text-xs font-black shadow-md">
                  From {formatINR(evt.startingPrice)}
                </span>
              </div>

              {/* Event Content */}
              <div className="p-6 space-y-4 flex-1 flex flex-col justify-between">
                <div className="space-y-1.5">
                  <h3 className="text-base sm:text-lg font-black text-darkText leading-snug">
                    {evt.title}
                  </h3>
                  <p className="text-xs text-gray-500 flex items-center gap-1.5 font-medium">
                    <MapPin className="w-3.5 h-3.5 text-[#389C9A] shrink-0" />
                    {evt.venue}
                  </p>
                  <p className="text-xs text-gray-400 line-clamp-2 pt-1">{evt.description}</p>
                </div>

                {/* Showtimes & Counter */}
                <div className="space-y-3 pt-2 border-t border-gray-100">
                  <div className="flex items-center justify-between text-xs font-semibold text-gray-600">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-[#389C9A]" /> {evt.timeSlots.length} Showtimes Available
                    </span>
                    <span className="text-[#389C9A] font-bold">
                      {evt.collectionCounter}
                    </span>
                  </div>

                  <Link
                    to={`/book/${evt._id}`}
                    className="w-full py-3 bg-[#389C9A] hover:bg-[#2d817f] text-white font-black text-xs rounded-[18px] shadow-teal flex items-center justify-center gap-1.5 transition-transform active:scale-98"
                  >
                    <Armchair className="w-4 h-4" /> Select Seat & Pre-Order <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
