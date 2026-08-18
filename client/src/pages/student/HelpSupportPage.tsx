import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  HelpCircle,
  Search,
  ChevronDown,
  MessageSquare,
  Phone,
  Mail,
  Clock,
  Send,
  CheckCircle2,
  AlertCircle,
  FileQuestion,
  ShieldQuestion,
  Sparkles,
} from 'lucide-react';
import { toast } from '../../components/ui/Toast';
import { cn } from '../../lib/utils';

export function HelpSupportPage() {
  const [searchParams] = useSearchParams();
  const prefilledOrderId = searchParams.get('orderId') || '';

  const [faqSearch, setFaqSearch] = useState('');
  const [expandedFaq, setExpandedFaq] = useState<number | null>(prefilledOrderId ? 0 : null);

  // Ticket Form State
  const [category, setCategory] = useState(prefilledOrderId ? 'order_issue' : 'general');
  const [orderNumber, setOrderNumber] = useState(prefilledOrderId);
  const [message, setMessage] = useState('');
  const [ticketSubmitted, setTicketSubmitted] = useState(false);

  const faqs = [
    {
      q: 'How does Campus Fast Delivery work?',
      a: 'Orders are freshly prepared in the campus central kitchen and delivered directly to your selected hostel block gate or designated academic building lobby within 15–20 minutes.',
      cat: 'delivery',
    },
    {
      q: 'Can I cancel an order after placing it?',
      a: 'You can cancel an order as long as it is in "Order Placed", "Payment Pending", or "Preparing" state. Once marked "Ready for Pickup", cancellation is not permitted to avoid food waste.',
      cat: 'orders',
    },
    {
      q: 'What payment methods are supported?',
      a: 'We support Google Pay, PhonePe, Paytm, BHIM UPI, as well as the 1-Tap Campus Food Wallet balance.',
      cat: 'payments',
    },
    {
      q: 'What if an item in my order is missing or incorrect?',
      a: 'Submit a quick ticket below with your order number. Our campus support team will immediately review and credit a full refund or send a replacement to your hostel block.',
      cat: 'orders',
    },
    {
      q: 'What are the kitchen operational hours?',
      a: 'The central campus kitchen operates daily from 8:00 AM to 11:30 PM. Late night snacks are available during exam season until 2:00 AM.',
      cat: 'general',
    },
  ];

  const filteredFaqs = faqs.filter(
    (f) =>
      f.q.toLowerCase().includes(faqSearch.toLowerCase()) ||
      f.a.toLowerCase().includes(faqSearch.toLowerCase())
  );

  const handleSubmitTicket = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) {
      toast.error('Please write a brief description of your query');
      return;
    }
    setTicketSubmitted(true);
    toast.success('Support ticket submitted! Campus support will respond shortly.');
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      
      {/* Header */}
      <div className="text-center max-w-lg mx-auto space-y-2">
        <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-3xl flex items-center justify-center mx-auto shadow-2xs">
          <HelpCircle className="w-7 h-7" />
        </div>
        <h1 className="text-2xl font-black text-gray-900 tracking-tight">How can we help you?</h1>
        <p className="text-xs text-gray-500">
          Find instant answers to common campus dining questions or submit a support inquiry.
        </p>

        {/* FAQ Search Bar */}
        <div className="relative pt-2">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search FAQs (delivery, refunds, payment)..."
            value={faqSearch}
            onChange={(e) => setFaqSearch(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-white border border-gray-200 rounded-2xl text-xs font-semibold shadow-2xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
          />
        </div>
      </div>

      {/* FAQs Accordion */}
      <div className="space-y-4">
        <h2 className="text-sm font-extrabold text-gray-900 flex items-center gap-2">
          <FileQuestion className="w-4 h-4 text-emerald-600" /> Frequently Asked Questions
        </h2>

        <div className="space-y-2.5">
          {filteredFaqs.map((faq, idx) => (
            <div
              key={idx}
              className="bg-white rounded-3xl border border-gray-100 shadow-2xs overflow-hidden transition-all"
            >
              <button
                onClick={() => setExpandedFaq(expandedFaq === idx ? null : idx)}
                className="w-full p-4 sm:p-5 flex items-center justify-between text-left gap-3"
              >
                <span className="font-extrabold text-xs sm:text-sm text-gray-900">{faq.q}</span>
                <ChevronDown
                  className={cn(
                    'w-4 h-4 text-gray-400 shrink-0 transition-transform duration-200',
                    expandedFaq === idx && 'rotate-180 text-emerald-600'
                  )}
                />
              </button>
              {expandedFaq === idx && (
                <div className="px-5 pb-5 pt-1 text-xs text-gray-600 leading-relaxed border-t border-gray-50 bg-gray-50/40 animate-in">
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Support Ticket Submission Form */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-2xs p-6 sm:p-8 space-y-4">
        <div className="border-b border-gray-100 pb-3">
          <h2 className="text-base font-extrabold text-gray-900 flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-emerald-600" /> Contact Campus Support Desk
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Our campus cafeteria coordinators respond within 10 minutes during open hours.
          </p>
        </div>

        {ticketSubmitted ? (
          <div className="p-6 bg-emerald-50 rounded-2xl border border-emerald-200 text-center space-y-3 animate-in">
            <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
            <h3 className="font-extrabold text-sm text-emerald-950">Support Ticket #TK-8492 Received</h3>
            <p className="text-xs text-emerald-800 max-w-sm mx-auto">
              We have dispatched your inquiry to the cafeteria manager. You will receive an update shortly.
            </p>
            <button
              onClick={() => {
                setTicketSubmitted(false);
                setMessage('');
              }}
              className="px-5 py-2 bg-emerald-600 text-white font-bold text-xs rounded-xl shadow-xs"
            >
              Submit Another Query
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmitTicket} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-bold text-gray-700 mb-1">Inquiry Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl font-medium focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                >
                  <option value="general">General Question</option>
                  <option value="order_issue">Issue with Recent Order</option>
                  <option value="payment_refund">Payment & Refund Status</option>
                  <option value="feedback">Dietary & Menu Feedback</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Order # (If applicable)</label>
                <input
                  type="text"
                  placeholder="e.g. 1004"
                  value={orderNumber}
                  onChange={(e) => setOrderNumber(e.target.value)}
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl font-mono focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-gray-700 mb-1">Describe your inquiry</label>
              <textarea
                rows={4}
                required
                placeholder="Explain what happened or how we can assist you..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl font-medium focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-xl shadow-emerald flex items-center justify-center gap-2 transition-transform active:scale-98"
            >
              <Send className="w-4 h-4" /> Send Ticket to Kitchen Team
            </button>
          </form>
        )}
      </div>

      {/* Direct Contact Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-2xs text-center space-y-1">
          <Phone className="w-5 h-5 text-emerald-600 mx-auto mb-2" />
          <p className="font-extrabold text-xs text-gray-900">Campus Hotline</p>
          <p className="text-[11px] text-gray-500 font-mono">+91 98765 00000</p>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-2xs text-center space-y-1">
          <Mail className="w-5 h-5 text-emerald-600 mx-auto mb-2" />
          <p className="font-extrabold text-xs text-gray-900">Cafeteria Email</p>
          <p className="text-[11px] text-gray-500">dining@campus.edu</p>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-2xs text-center space-y-1">
          <Clock className="w-5 h-5 text-emerald-600 mx-auto mb-2" />
          <p className="font-extrabold text-xs text-gray-900">Open Hours</p>
          <p className="text-[11px] text-gray-500">8:00 AM – 11:30 PM Daily</p>
        </div>
      </div>
    </div>
  );
}
