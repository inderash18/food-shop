# System Architecture & Design Specifications

## 1. High-Level System Architecture

```
                                  [ Students & Staff Devices ]
                                               │
                                               ▼
                              ┌────────────────────────────────┐
                              │     Vite + React 18 (SPA)      │
                              │  Tailwind CSS + TanStack Query │
                              └────────────────────────────────┘
                                      │                 ▲
                        HTTPS REST API│                 │ WebSocket (Socket.IO)
                                      ▼                 │
                              ┌────────────────────────────────┐
                              │    Node.js Express + TS API    │
                              │   Helmet, RateLimit, RBAC Zod  │
                              └────────────────────────────────┘
                                      │                 ▲
                                      ▼                 │
                       ┌────────────────────────┐       │ Event Bus
                       │    MongoDB Database    │───────┘
                       │ (Mongoose Transaction) │
                       └────────────────────────┘
```

---

## 2. Order & Payment Lifecycle State Machine

```
[CART] ──► [CHECKOUT] ──► [PAYMENT_PENDING] (Stock Reserved)
                                │
        ┌───────────────────────┴───────────────────────┐
        ▼ (Payment Success / Verified)                  ▼ (Failed / Expired)
[ORDER_CONFIRMED] (Stock Committed)             [PAYMENT_FAILED] (Stock Released)
        │                                               │
        ▼                                               ▼
   [PREPARING]                                  [ORDER_CANCELLED]
        │
        ▼
     [READY] ──► (In-App Notification to Student)
        │
        ▼
   [COMPLETED]
```

### Critical Rule: Server as Source of Truth
- **Never Trust Frontend Price**: Product prices are read directly from MongoDB.
- **Never Trust Frontend Stock**: Stock is checked and atomically decremented on the backend.
- **Never Trust Frontend Status**: Order transitions must follow `ALLOWED_ORDER_TRANSITIONS` definitions.

---

## 3. Concurrency & Stock Reservation

During high-concurrency peak lunch hours (500+ simultaneous students):
1. When checkout is initiated, backend executes an atomic reservation:
   ```typescript
   Product.updateOne(
     { _id: productId, isActive: true, $expr: { $gte: [{ $subtract: ['$stock', '$reservedStock'] }, qty] } },
     { $inc: { reservedStock: qty } }
   );
   ```
2. When payment succeeds:
   ```typescript
   Product.updateOne(
     { _id: productId, reservedStock: { $gte: qty } },
     { $inc: { stock: -qty, reservedStock: -qty } }
   );
   ```
3. If checkout is cancelled or payment fails:
   ```typescript
   Product.updateOne(
     { _id: productId, reservedStock: { $gte: qty } },
     { $inc: { reservedStock: -qty } }
   );
   ```

---

## 4. Payment Provider Abstraction Layer

```
                     ┌────────────────────────┐
                     │   PaymentService API   │
                     └────────────────────────┘
                                 │
                     ┌───────────┴───────────┐
                     ▼                       ▼
          ┌─────────────────────┐ ┌─────────────────────┐
          │ MockPaymentProvider │ │  RazorpayProvider   │
          │  (Local Dev & Test) │ │    (Production)     │
          └─────────────────────┘ └─────────────────────┘
```

All providers implement:
- `createPayment({ orderId, userId, amount, currency })`
- `verifyPayment({ paymentId, orderId, signature, ... })`
- `handleWebhook(payload, headers, rawBody)`
- `refundPayment(paymentId, amount)`
