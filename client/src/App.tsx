import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { StudentLayout } from './components/layout/StudentLayout';
import { AdminLayout } from './components/layout/AdminLayout';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { AdminProtectedRoute } from './components/auth/AdminProtectedRoute';
import { useAuthStore } from './stores/auth';

import { AppLoader } from './components/ui/AppLoader';

// Minimal Fast Loading Spinner
function PageFallback() {
  return <AppLoader message="Loading Food Shop..." />;
}

// Public & Landing Pages
const LandingPage = lazy(() =>
  import('./pages/public/LandingPage').then((m) => ({ default: m.LandingPage }))
);
const LoginPage = lazy(() =>
  import('./pages/auth/LoginPage').then((m) => ({ default: m.LoginPage }))
);
const RegisterPage = lazy(() =>
  import('./pages/auth/RegisterPage').then((m) => ({ default: m.RegisterPage }))
);
const AdminLoginPage = lazy(() =>
  import('./pages/admin/AdminLoginPage').then((m) => ({ default: m.AdminLoginPage }))
);

// Student Food Pre-Order Pages
const HomePage = lazy(() =>
  import('./pages/student/HomePage').then((m) => ({ default: m.HomePage }))
);
const CartPage = lazy(() =>
  import('./pages/student/CartPage').then((m) => ({ default: m.CartPage }))
);
const CheckoutPage = lazy(() =>
  import('./pages/student/CheckoutPage').then((m) => ({ default: m.CheckoutPage }))
);
const PaymentPage = lazy(() =>
  import('./pages/student/PaymentPage').then((m) => ({ default: m.PaymentPage }))
);
const OrderConfirmationPage = lazy(() =>
  import('./pages/student/OrderConfirmationPage').then((m) => ({ default: m.OrderConfirmationPage }))
);
const OrdersPage = lazy(() =>
  import('./pages/student/OrdersPage').then((m) => ({ default: m.OrdersPage }))
);
const OrderDetailPage = lazy(() =>
  import('./pages/student/OrderDetailPage').then((m) => ({ default: m.OrderDetailPage }))
);
const SearchPage = lazy(() =>
  import('./pages/student/SearchPage').then((m) => ({ default: m.SearchPage }))
);
const ProductDetailPage = lazy(() =>
  import('./pages/student/ProductDetailPage').then((m) => ({ default: m.ProductDetailPage }))
);
const ProfilePage = lazy(() =>
  import('./pages/student/ProfilePage').then((m) => ({ default: m.ProfilePage }))
);
const WishlistPage = lazy(() =>
  import('./pages/student/WishlistPage').then((m) => ({ default: m.WishlistPage }))
);
const AddressesPage = lazy(() =>
  import('./pages/student/AddressesPage').then((m) => ({ default: m.AddressesPage }))
);
const PaymentMethodsPage = lazy(() =>
  import('./pages/student/PaymentMethodsPage').then((m) => ({ default: m.PaymentMethodsPage }))
);
const StudentSettingsPage = lazy(() =>
  import('./pages/student/StudentSettingsPage').then((m) => ({ default: m.StudentSettingsPage }))
);
const HelpSupportPage = lazy(() =>
  import('./pages/student/HelpSupportPage').then((m) => ({ default: m.HelpSupportPage }))
);
const NotificationsPage = lazy(() =>
  import('./pages/student/NotificationsPage').then((m) => ({ default: m.NotificationsPage }))
);
const NotFoundPage = lazy(() =>
  import('./pages/student/NotFoundPage').then((m) => ({ default: m.NotFoundPage }))
);

// Admin & Staff Pages
const StaffCheckInPage = lazy(() =>
  import('./pages/admin/StaffCheckInPage').then((m) => ({ default: m.StaffCheckInPage }))
);
const AdminDashboardPage = lazy(() =>
  import('./pages/admin/AdminDashboardPage').then((m) => ({ default: m.AdminDashboardPage }))
);
const OrderManagementPage = lazy(() =>
  import('./pages/admin/OrderManagementPage').then((m) => ({ default: m.OrderManagementPage }))
);
const KitchenKanbanPage = lazy(() =>
  import('./pages/admin/KitchenKanbanPage').then((m) => ({ default: m.KitchenKanbanPage }))
);
const ProductManagementPage = lazy(() =>
  import('./pages/admin/ProductManagementPage').then((m) => ({ default: m.ProductManagementPage }))
);
const CategoryManagementPage = lazy(() =>
  import('./pages/admin/CategoryManagementPage').then((m) => ({ default: m.CategoryManagementPage }))
);
const InventoryManagementPage = lazy(() =>
  import('./pages/admin/InventoryManagementPage').then((m) => ({ default: m.InventoryManagementPage }))
);
const CouponsPage = lazy(() =>
  import('./pages/admin/CouponsPage').then((m) => ({ default: m.CouponsPage }))
);
const UserManagementPage = lazy(() =>
  import('./pages/admin/UserManagementPage').then((m) => ({ default: m.UserManagementPage }))
);
const PaymentsPage = lazy(() =>
  import('./pages/admin/PaymentsPage').then((m) => ({ default: m.PaymentsPage }))
);
const SettlementsPage = lazy(() =>
  import('./pages/admin/SettlementsPage').then((m) => ({ default: m.SettlementsPage }))
);
const AnalyticsPage = lazy(() =>
  import('./pages/admin/AnalyticsPage').then((m) => ({ default: m.AnalyticsPage }))
);
const ReportsPage = lazy(() =>
  import('./pages/admin/ReportsPage').then((m) => ({ default: m.ReportsPage }))
);
const AuditLogsPage = lazy(() =>
  import('./pages/admin/AuditLogsPage').then((m) => ({ default: m.AuditLogsPage }))
);
const SettingsPage = lazy(() =>
  import('./pages/admin/SettingsPage').then((m) => ({ default: m.SettingsPage }))
);

// Root Index Component (Switches between Landing for guests and Food Menu for students)
function RootPageRouter() {
  const user = useAuthStore((s) => s.user);
  const initialized = useAuthStore((s) => s.initialized);

  if (!initialized) {
    return <PageFallback />;
  }

  if (!user) {
    return <LandingPage />;
  }

  return (
    <StudentLayout>
      <HomePage />
    </StudentLayout>
  );
}

export default function App() {
  return (
    <Suspense fallback={<PageFallback />}>
      <Routes>
        {/* Guest Landing Page (Direct Route) */}
        <Route path="/welcome" element={<LandingPage />} />

        {/* Auth Routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* Dynamic Root */}
        <Route path="/" element={<RootPageRouter />} />

        {/* Public & Student Routes inside Student Shell */}
        <Route element={<StudentLayout />}>
          <Route path="menu" element={<HomePage />} />
          <Route path="menu/:id" element={<ProductDetailPage />} />
          <Route path="search" element={<SearchPage />} />
          <Route path="help" element={<HelpSupportPage />} />

          {/* Navigation Aliases */}
          <Route path="events" element={<Navigate to="/menu" replace />} />
          <Route path="book" element={<Navigate to="/menu" replace />} />
          <Route path="book/*" element={<Navigate to="/menu" replace />} />
          <Route path="bookings" element={<Navigate to="/orders" replace />} />
          <Route path="bookings/:id" element={<Navigate to="/orders" replace />} />

          {/* Protected Pre-Order & Pass Routes */}
          <Route
            path="orders"
            element={
              <ProtectedRoute>
                <OrdersPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="orders/:id"
            element={
              <ProtectedRoute>
                <OrderDetailPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="cart"
            element={
              <ProtectedRoute>
                <CartPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="checkout"
            element={
              <ProtectedRoute>
                <CheckoutPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="payment"
            element={
              <ProtectedRoute>
                <PaymentPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="order-confirmation"
            element={
              <ProtectedRoute>
                <OrderConfirmationPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="wishlist"
            element={
              <ProtectedRoute>
                <WishlistPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="addresses"
            element={
              <ProtectedRoute>
                <AddressesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="payment-methods"
            element={
              <ProtectedRoute>
                <PaymentMethodsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="settings"
            element={
              <ProtectedRoute>
                <StudentSettingsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="profile"
            element={
              <ProtectedRoute>
                <ProfilePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="notifications"
            element={
              <ProtectedRoute>
                <NotificationsPage />
              </ProtectedRoute>
            }
          />

          <Route path="*" element={<NotFoundPage />} />
        </Route>

        {/* Dedicated Standalone Admin Login Portal */}
        <Route path="/admin/login" element={<AdminLoginPage />} />

        {/* Protected Admin & Staff App Routes */}
        <Route
          path="/admin"
          element={
            <AdminProtectedRoute>
              <AdminLayout />
            </AdminProtectedRoute>
          }
        >
          <Route index element={<AdminDashboardPage />} />
          <Route path="checkin" element={<StaffCheckInPage />} />
          <Route path="orders" element={<OrderManagementPage />} />
          <Route path="kitchen" element={<KitchenKanbanPage />} />
          <Route path="products" element={<ProductManagementPage />} />
          <Route path="categories" element={<CategoryManagementPage />} />
          <Route path="inventory" element={<InventoryManagementPage />} />
          <Route path="coupons" element={<CouponsPage />} />
          <Route path="users" element={<UserManagementPage />} />
          <Route path="payments" element={<PaymentsPage />} />
          <Route path="settlements" element={<SettlementsPage />} />
          <Route path="analytics" element={<AnalyticsPage />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="audit-logs" element={<AuditLogsPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
