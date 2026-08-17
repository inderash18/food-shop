import { Routes, Route, Navigate } from 'react-router-dom';
import { StudentLayout } from './components/layout/StudentLayout';
import { AdminLayout } from './components/layout/AdminLayout';

// Student Pages
import { HomePage } from './pages/student/HomePage';
import { MenuPage } from './pages/student/MenuPage';
import { ProductDetailPage } from './pages/student/ProductDetailPage';
import { CartPage } from './pages/student/CartPage';
import { CheckoutPage } from './pages/student/CheckoutPage';
import { PaymentPage } from './pages/student/PaymentPage';
import { OrderConfirmationPage } from './pages/student/OrderConfirmationPage';
import { OrdersPage } from './pages/student/OrdersPage';
import { ProfilePage } from './pages/student/ProfilePage';
import { NotificationsPage } from './pages/student/NotificationsPage';
import { MockPaymentPage } from './pages/student/MockPaymentPage';

// Auth Pages
import { LoginPage } from './pages/auth/LoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';

// Admin Pages
import { AdminDashboardPage } from './pages/admin/AdminDashboardPage';
import { OrderManagementPage } from './pages/admin/OrderManagementPage';
import { KitchenKanbanPage } from './pages/admin/KitchenKanbanPage';
import { ProductManagementPage } from './pages/admin/ProductManagementPage';
import { CategoryManagementPage } from './pages/admin/CategoryManagementPage';
import { InventoryManagementPage } from './pages/admin/InventoryManagementPage';
import { CouponsPage } from './pages/admin/CouponsPage';
import { UserManagementPage } from './pages/admin/UserManagementPage';
import { PaymentsPage } from './pages/admin/PaymentsPage';
import { AnalyticsPage } from './pages/admin/AnalyticsPage';
import { ReportsPage } from './pages/admin/ReportsPage';
import { AuditLogsPage } from './pages/admin/AuditLogsPage';
import { SettingsPage } from './pages/admin/SettingsPage';

export default function App() {
  return (
    <Routes>
      {/* Auth Routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      {/* Student App Routes */}
      <Route element={<StudentLayout />}>
        <Route index element={<HomePage />} />
        <Route path="menu" element={<MenuPage />} />
        <Route path="menu/:id" element={<ProductDetailPage />} />
        <Route path="cart" element={<CartPage />} />
        <Route path="checkout" element={<CheckoutPage />} />
        <Route path="payment" element={<PaymentPage />} />
        <Route path="order-confirmation" element={<OrderConfirmationPage />} />
        <Route path="orders" element={<OrdersPage />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="notifications" element={<NotificationsPage />} />
        <Route path="mock-payment/:paymentId" element={<MockPaymentPage />} />
      </Route>

      {/* Admin App Routes */}
      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<AdminDashboardPage />} />
        <Route path="orders" element={<OrderManagementPage />} />
        <Route path="kitchen" element={<KitchenKanbanPage />} />
        <Route path="products" element={<ProductManagementPage />} />
        <Route path="categories" element={<CategoryManagementPage />} />
        <Route path="inventory" element={<InventoryManagementPage />} />
        <Route path="coupons" element={<CouponsPage />} />
        <Route path="users" element={<UserManagementPage />} />
        <Route path="payments" element={<PaymentsPage />} />
        <Route path="analytics" element={<AnalyticsPage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="audit-logs" element={<AuditLogsPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
