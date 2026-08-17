# Database Architecture & Schemas

## 1. Collections Overview

| Collection | Description | Primary Indexes |
|---|---|---|
| `users` | Student, Staff, and Admin profiles | `email (unique)`, `studentId (unique)`, `role` |
| `products` | Campus food items catalog | `categoryId`, `isActive`, `slug (unique)` |
| `categories` | Menu categories | `slug (unique)`, `sortOrder` |
| `orders` | Confirmed and in-flight orders | `orderNumber (unique)`, `userId`, `status`, `paymentStatus`, `createdAt` |
| `payments` | Gateway transaction records | `providerPaymentId (unique)`, `orderId`, `status` |
| `inventory_transactions` | Immutable inventory changes | `productId`, `createdAt` |
| `coupons` | Promotional vouchers | `code (unique)`, `isActive`, `expiresAt` |
| `shop_settings` | Global campus food shop config | Single document singleton |
| `audit_logs` | Administrative security audit trail | `actorId`, `action`, `createdAt` |
| `notifications` | In-app user notifications | `userId`, `isRead`, `createdAt` |

---

## 2. Key Data Models

### User Schema (`users`)
```typescript
{
  name: String,
  email: String (unique, lowercased),
  studentId: String (unique),
  passwordHash: String,
  role: Enum ['STUDENT', 'STAFF', 'ADMIN', 'SUPER_ADMIN'],
  isActive: Boolean (default: true),
  createdAt: Date,
  updatedAt: Date
}
```

### Product Schema (`products`)
```typescript
{
  name: String,
  slug: String (unique),
  description: String,
  categoryId: ObjectId (ref: 'Category'),
  price: Number,
  stock: Number,
  reservedStock: Number (default: 0),
  minimumStock: Number (default: 5),
  prepMinutes: Number (default: 5),
  isVeg: Boolean (default: true),
  isPopular: Boolean (default: false),
  isActive: Boolean (default: true),
  availableFrom: String (HH:mm),
  availableUntil: String (HH:mm),
  imageUrl: String
}
```

### Order Schema (`orders`)
```typescript
{
  orderNumber: String (unique, e.g. COL-20260812-000124),
  userId: ObjectId (ref: 'User'),
  items: [
    {
      productId: ObjectId (ref: 'Product'),
      productNameSnapshot: String,
      priceSnapshot: Number,
      quantity: Number,
      subtotal: Number,
      isVeg: Boolean
    }
  ],
  itemCount: Number,
  subtotal: Number,
  discount: Number,
  couponCode: String,
  serviceFee: Number,
  total: Number,
  status: Enum ['PAYMENT_PENDING', 'ORDER_CONFIRMED', 'PREPARING', 'READY', 'COMPLETED', 'CANCELLED'],
  paymentStatus: Enum ['PENDING', 'SUCCESS', 'FAILED', 'REFUNDED'],
  paymentId: ObjectId (ref: 'Payment'),
  checkoutRequestId: String (unique, idempotency key),
  createdAt: Date,
  completedAt: Date
}
```
