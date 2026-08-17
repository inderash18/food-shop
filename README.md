# College Campus Food Ordering & Management Platform

A high-performance, mobile-first, production-ready centralized food ordering and kitchen management platform designed specifically for college campuses serving 3,000–5,000 students.

---

## 🌟 Key Features

### For Students
- **Interactive Menu & Live Search**: Debounced search, dietary filtering (Veg/Non-Veg), categories, and real-time stock availability indicators.
- **Cart & Server-Side Pricing**: Client cart total is a preview; the backend calculates exact totals, verifies active stock, and applies discount coupons.
- **Pluggable Payment Gateway**: Integrated mock payment provider for free local development and ready for Razorpay/UPI in production.
- **Live Visual Order Tracking**: Real-time status progression (`Payment Verified` → `Preparing` → `Ready for Pickup` → `Completed`) powered by Socket.IO.
- **Profile & In-App Alerts**: Track order history, reorder favorite items, manage student credentials, and receive instant pickup notifications.

### For Kitchen Staff & Admins
- **Kitchen Display System (KDS)**: Kanban board (`NEW CONFIRMED` → `PREPARING` → `READY`) with one-click status transitions and instant alerts.
- **Strict Admin Separation Rule**: Unpaid or abandoned checkouts (`PAYMENT_PENDING`, `PAYMENT_FAILED`) are strictly separated from confirmed paid orders.
- **Inventory Control & Audit Trail**: Atomic stock reservations, minimum-level alerts, manual refill/wastage adjustments, and immutable reason-based logs.
- **Menu & Category Management**: Dynamic catalog management with preparation estimates, price controls, and soft-delete capabilities.
- **Analytics & CSV Reports**: Real-time revenue charts, peak ordering hours analysis, top selling food items, and one-click CSV report exports.
- **Role-Based Access Control (RBAC)**: Fine-grained permissions for `STUDENT`, `STAFF`, `ADMIN`, and `SUPER_ADMIN`.
- **Shop Configuration**: Customizable operating hours, rush-hour order pause, emergency announcements, and college domain validation.

---

## 🛠 Tech Stack

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, Lucide Icons, TanStack Query v5, Zustand, Recharts, Socket.IO Client.
- **Backend**: Node.js, Express, TypeScript, Mongoose (MongoDB), Socket.IO, Helmet, Express Rate Limit, Cookie Parser, Zod validation, Vitest.
- **Architecture**: Modular Service-Repository Pattern, Server-as-Source-of-Truth, Event-driven WebSockets, Idempotent Payment Webhooks.

---

## 🚀 Getting Started Locally

### Prerequisites
- Node.js >= 20.x
- MongoDB instance (local or MongoDB Atlas free tier)

### 1. Installation
Clone the repository and install dependencies in the root workspace:
```bash
npm install
```

### 2. Environment Setup
Copy the sample environment configuration:
```bash
cp .env.example .env
```
Ensure your MongoDB connection string is configured:
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/food-shop
JWT_SECRET=your-super-secure-jwt-secret-key-min-32-chars
CLIENT_URL=http://localhost:5173
PAYMENT_PROVIDER=MOCK
```

### 3. Seed Initial Campus Data
Populate categories, menu items, admin, staff, and student accounts:
```bash
npm run seed
```

**Default Development Accounts:**
| Role | Email | Password |
|---|---|---|
| **Super Admin** | `admin@college.local` | `College@123` |
| **Kitchen Staff** | `staff@college.local` | `College@123` |
| **Student 1** | `student1@college.local` | `College@123` |
| **Student 2** | `student2@college.local` | `College@123` |

### 4. Running the Platform
Start both the backend server and frontend client concurrently:
```bash
npm run dev
```
- **Student & Admin Web App**: [http://localhost:5173](http://localhost:5173)
- **API Server & Health**: [http://localhost:5000/api/health](http://localhost:5000/api/health)

---

## 🧪 Testing Suite

Execute automated unit, integration, and security tests:
```bash
npm run test -w server
```
Tests cover:
- **Atomic Stock Concurrency**: Prevents overselling during simultaneous peak lunch requests.
- **Webhook Idempotency**: Prevents double-crediting or duplicate stock deductions from repeated gateway webhooks.
- **Security & RBAC**: Validates student blocking from administrative endpoints and IDOR protection.

---

## 📚 Technical Documentation

- [Architecture & State Machine Design](file:///ARCHITECTURE.md)
- [Database Schema & Indexes](file:///DATABASE.md)
- [REST API Specifications](file:///API.md)
- [Security & Compliance Guidelines](file:///SECURITY.md)
- [Production Deployment Strategy](file:///DEPLOYMENT.md)
