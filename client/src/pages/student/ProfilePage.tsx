import React, { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import {
  User,
  Mail,
  Phone,
  Ticket,
  ShoppingBag,
  Edit3,
  CheckCircle2,
  Lock,
  Settings,
  HelpCircle,
  LogOut,
  ChevronRight,
  ShieldCheck,
  Sparkles,
  X,
  Loader2,
  Camera,
  Trash2,
  Upload,
  AlertCircle,
  Bell,
} from 'lucide-react';
import { useAuthStore } from '../../stores/auth';
import { apiGet, apiPatch } from '../../api/client';
import { formatINR } from '../../lib/format';
import { toast } from '../../components/ui/Toast';
import { UserAvatar, getInitials } from '../../components/ui/UserAvatar';
import type { Order } from '../../lib/types';
import { cn } from '../../lib/utils';

export function ProfilePage() {
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Modals state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);
  const [editName, setEditName] = useState(user?.name || '');
  const [editPhone, setEditPhone] = useState(user?.phone || '');
  const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);

  // User Orders Query
  const { data: ordersData } = useQuery({
    queryKey: ['my-orders'],
    queryFn: () => apiGet<{ orders: Order[] }>('/api/orders/mine'),
    enabled: !!user,
  });

  const orders = ordersData?.orders || [];
  const activeOrdersCount = orders.filter((o) => o.status !== 'CANCELLED' && o.status !== 'COMPLETED').length;

  // Update Profile Mutation
  const updateProfileMutation = useMutation({
    mutationFn: (data: { name?: string; phone?: string; avatarUrl?: string | null }) =>
      apiPatch<{ user: any }>('/api/auth/profile', data),
    onSuccess: (res) => {
      if (res?.user && user) {
        setUser({ ...user, ...res.user });
      }
      toast.success('Profile updated successfully!');
      setIsEditModalOpen(false);
      setIsPhotoModalOpen(false);
      setPreviewPhoto(null);
      queryClient.invalidateQueries({ queryKey: ['auth-me'] });
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message || 'Failed to update profile';
      setPhotoError(msg);
      toast.error(msg);
    },
  });

  // Client-side Image Compression
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPhotoError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setPhotoError('Please select a valid image file (PNG, JPG, WebP).');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setPhotoError('Image is too large. Please select an image under 10MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxSize = 256;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxSize) {
            height = Math.round((height * maxSize) / width);
            width = maxSize;
          }
        } else {
          if (height > maxSize) {
            width = Math.round((width * maxSize) / height);
            height = maxSize;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.85);
          setPreviewPhoto(compressedDataUrl);
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleSavePhoto = () => {
    if (!previewPhoto) return;
    updateProfileMutation.mutate({ avatarUrl: previewPhoto });
  };

  const handleRemovePhoto = () => {
    updateProfileMutation.mutate({ avatarUrl: null });
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfileMutation.mutate({
      name: editName.trim(),
      phone: editPhone.trim(),
    });
  };

  const handleLogout = async () => {
    await logout();
    toast.success('Logged out successfully');
    navigate('/login');
  };

  if (!user) {
    return (
      <div className="max-w-md mx-auto text-center py-16 space-y-4">
        <div className="w-16 h-16 bg-teal-50 text-[#389C9A] rounded-3xl flex items-center justify-center mx-auto">
          <User className="h-8 w-8" />
        </div>
        <h2 className="text-lg font-bold text-darkText">Sign in to view your profile</h2>
        <p className="text-xs font-normal text-gray-500">Access pre-orders, passes, and express pickup settings.</p>
        <Link
          to="/login"
          className="inline-block bg-[#389C9A] hover:bg-[#2d817f] text-white font-semibold text-xs px-6 py-3 rounded-2xl shadow-teal"
        >
          Sign In / Register
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto space-y-5 pb-24 px-1 sm:px-0 antialiased">
      
      {/* 1. Header Profile Card */}
      <div className="bg-white rounded-[28px] border border-gray-100 shadow-card p-5 sm:p-6 text-center space-y-3 relative overflow-hidden">
        
        {/* User Photo / Initials with Camera Trigger */}
        <div className="relative inline-block mx-auto">
          <UserAvatar user={user} size="xl" className="ring-4 ring-teal-50" />
          <button
            onClick={() => {
              setPreviewPhoto(null);
              setPhotoError(null);
              setIsPhotoModalOpen(true);
            }}
            className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-[#389C9A] hover:bg-[#2d817f] text-white flex items-center justify-center shadow-md border-2 border-white transition-transform active:scale-95"
            title="Change Profile Photo"
          >
            <Camera className="w-4 h-4" />
          </button>
        </div>

        {/* Name & Identity */}
        <div className="space-y-1">
          <h1 className="text-xl sm:text-2xl font-bold text-darkText tracking-tight">{user.name}</h1>
          <p className="text-xs text-gray-500 font-normal">{user.email}</p>
          <div className="flex items-center justify-center gap-2 pt-1">
            <span className="text-[10px] font-semibold uppercase tracking-wider bg-teal-50 text-[#389C9A] px-2.5 py-0.5 rounded-full border border-teal-200/60">
              {user.role}
            </span>
            <span className="text-[10px] font-mono font-medium text-gray-500 bg-secondaryBg px-2.5 py-0.5 rounded-full">
              ID: {user.studentId}
            </span>
          </div>
        </div>

        {/* Quick Edit Action */}
        <div className="pt-2">
          <button
            onClick={() => {
              setEditName(user.name);
              setEditPhone(user.phone || '');
              setIsEditModalOpen(true);
            }}
            className="px-5 py-2 rounded-xl bg-secondaryBg hover:bg-gray-100 text-darkText font-semibold text-xs shadow-3xs inline-flex items-center gap-1.5 transition-colors"
          >
            <Edit3 className="w-3.5 h-3.5" /> Edit Profile
          </button>
        </div>
      </div>

      {/* 2. Simple Details & Contact Card */}
      <div className="bg-white rounded-[26px] border border-amber-100 shadow-card p-5 space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-wider text-amber-900/70">Personal Information</h2>
        
        <div className="space-y-2.5 divide-y divide-amber-50 text-xs">
          <div className="flex items-center justify-between pt-1">
            <span className="text-stone-500 font-medium flex items-center gap-2">
              <User className="w-4 h-4 text-amber-600" /> Full Name
            </span>
            <span className="font-bold text-amber-950">{user.name}</span>
          </div>

          <div className="flex items-center justify-between pt-2.5">
            <span className="text-stone-500 font-medium flex items-center gap-2">
              <Phone className="w-4 h-4 text-amber-600" /> Mobile Number
            </span>
            <span className="font-bold text-amber-950 font-mono">{user.phone || (user as any).mobileNumber || 'Not provided'}</span>
          </div>

          <div className="flex items-center justify-between pt-2.5">
            <span className="text-stone-500 font-medium flex items-center gap-2">
              <Mail className="w-4 h-4 text-amber-600" /> Email Address
            </span>
            <span className="font-bold text-amber-950 truncate max-w-[200px] sm:max-w-none">{user.email || '—'}</span>
          </div>

          <div className="flex items-center justify-between pt-2.5">
            <span className="text-stone-500 font-medium flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-amber-600" /> Student / College ID
            </span>
            <span className="font-bold font-mono text-amber-950">{user.studentId || '—'}</span>
          </div>
        </div>
      </div>

      {/* 3. Orders Shortcut & Logout Action */}
      <div className="bg-white rounded-[26px] border border-amber-100 shadow-card p-3 space-y-1">
        <Link
          to="/orders"
          className="flex items-center justify-between p-3 rounded-2xl hover:bg-amber-50/60 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#FEDB71] text-amber-950 flex items-center justify-center border border-amber-300 shadow-3xs">
              <Ticket className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-amber-950">My Orders</p>
              <p className="text-[11px] text-stone-500 font-normal">View live food orders and tokens</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {activeOrdersCount > 0 && (
              <span className="px-2.5 py-0.5 rounded-full bg-[#FEDB71] text-amber-950 text-[10px] font-bold border border-amber-300">
                {activeOrdersCount} Active
              </span>
            )}
            <ChevronRight className="w-4 h-4 text-stone-400" />
          </div>
        </Link>

        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-rose-50 text-rose-600 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-200 shadow-3xs">
              <LogOut className="w-4 h-4" />
            </div>
            <div className="text-left">
              <p className="text-xs font-bold">Log Out</p>
              <p className="text-[11px] text-rose-400 font-normal">Sign out from this device</p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-rose-400" />
        </button>
      </div>

      {/* ========================================================================= */}
      {/* 5. USER PROFILE PHOTO MODAL / DRAWER                                      */}
      {/* ========================================================================= */}
      {isPhotoModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div
            className="w-full max-w-sm bg-white rounded-t-[32px] sm:rounded-[32px] shadow-2xl p-6 space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-darkText">Profile Photo</h2>
              <button
                onClick={() => setIsPhotoModalOpen(false)}
                className="p-1 rounded-full text-gray-400 hover:text-darkText"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Photo Preview / Initials */}
            <div className="flex flex-col items-center justify-center py-2 space-y-3">
              {previewPhoto ? (
                <div className="w-24 h-24 rounded-full overflow-hidden ring-4 ring-[#389C9A] shadow-md">
                  <img src={previewPhoto} alt="Preview" className="w-full h-full object-cover" />
                </div>
              ) : (
                <UserAvatar user={user} size="2xl" className="ring-4 ring-teal-100 shadow-md" />
              )}
              <p className="text-[11px] text-gray-400 text-center font-normal">
                {previewPhoto
                  ? 'Previewing selected image'
                  : user?.avatarUrl
                  ? 'Your current custom profile photo'
                  : 'No photo uploaded. Using initials.'}
              </p>
            </div>

            {photoError && (
              <div className="p-3 bg-rose-50 text-rose-700 text-xs font-semibold rounded-xl flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {photoError}
              </div>
            )}

            {/* Hidden File Input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={handleFileSelect}
              className="hidden"
            />

            {/* Actions */}
            <div className="space-y-2 pt-1">
              {previewPhoto ? (
                <button
                  onClick={handleSavePhoto}
                  disabled={updateProfileMutation.isPending}
                  className="w-full py-3 bg-[#389C9A] hover:bg-[#2d817f] text-white font-semibold text-xs rounded-2xl shadow-teal flex items-center justify-center gap-1.5 transition-transform active:scale-98"
                >
                  {updateProfileMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Uploading...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" /> Save & Use This Photo
                    </>
                  )}
                </button>
              ) : (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full py-3 bg-[#389C9A] hover:bg-[#2d817f] text-white font-semibold text-xs rounded-2xl shadow-teal flex items-center justify-center gap-1.5 transition-transform active:scale-98"
                >
                  <Upload className="w-4 h-4" /> Choose Photo from Device
                </button>
              )}

              {user?.avatarUrl && !previewPhoto && (
                <button
                  onClick={handleRemovePhoto}
                  disabled={updateProfileMutation.isPending}
                  className="w-full py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-600 font-semibold text-xs rounded-2xl flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Remove Current Photo
                </button>
              )}

              <button
                onClick={() => {
                  setPreviewPhoto(null);
                  setIsPhotoModalOpen(false);
                }}
                className="w-full py-2.5 text-gray-500 hover:text-darkText font-medium text-xs"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 6. EDIT PROFILE INFORMATION MODAL                                         */}
      {/* ========================================================================= */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div
            className="w-full max-w-md bg-white rounded-t-[32px] sm:rounded-[32px] shadow-2xl p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-darkText">Edit Profile</h2>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="p-1 rounded-full text-gray-400 hover:text-darkText"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-3">
              <div className="space-y-1">
                <label className="text-[11px] font-semibold uppercase text-gray-500 tracking-wider">Full Name</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-secondaryBg rounded-xl text-xs font-medium text-darkText focus:bg-white focus:border-[#389C9A] focus:outline-none"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold uppercase text-gray-500 tracking-wider">Phone Number</label>
                <input
                  type="tel"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="w-full px-3.5 py-2.5 bg-secondaryBg rounded-xl text-xs font-medium text-darkText focus:bg-white focus:border-[#389C9A] focus:outline-none"
                />
              </div>

              <div className="space-y-1 opacity-70">
                <label className="text-[11px] font-semibold uppercase text-gray-400 tracking-wider">Student ID (Immutable)</label>
                <input
                  type="text"
                  value={user.studentId}
                  disabled
                  className="w-full px-3.5 py-2.5 bg-gray-100 rounded-xl text-xs font-mono font-medium text-gray-500 cursor-not-allowed"
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="flex-1 py-2.5 bg-secondaryBg hover:bg-gray-100 text-darkText font-medium text-xs rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updateProfileMutation.isPending}
                  className="flex-1 py-2.5 bg-[#389C9A] hover:bg-[#2d817f] text-white font-semibold text-xs rounded-xl shadow-teal flex items-center justify-center gap-1.5"
                >
                  {updateProfileMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
