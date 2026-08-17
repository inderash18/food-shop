# REST API Documentation

Base URL: `/api`

All protected endpoints require either an `Authorization: Bearer <token>` header or an HTTP-only auth cookie.

---

## 1. Authentication Endpoints (`/api/auth`)

### `POST /api/auth/register`
- **Access**: Public
- **Body**: `{ name, email, studentId, password, phone? }`
- **Response**: `{ user: User, accessToken: string }`

### `POST /api/auth/login`
- **Access**: Public
- **Body**: `{ identifier, password }` (identifier = email or studentId)
- **Response**: `{ user: User, accessToken: string }`

### `GET /api/auth/me`
- **Access**: Authenticated (`STUDENT`, `STAFF`, `ADMIN`)
- **Response**: `{ user: User }`

---

## 2. Catalog & Menu (`/api`)

### `GET /api/products`
- **Query**: `?categoryId=&search=&isVeg=&page=&limit=`
- **Response**: `{ products: Product[], total: number }`

### `GET /api/categories`
- **Response**: `{ categories: Category[] }`

---

## 3. Checkout & Payment (`/api/checkout`, `/api/payments`)

### `POST /api/checkout`
- **Access**: `STUDENT`
- **Body**:
  ```json
  {
    "items": [{ "productId": "...", "quantity": 2 }],
    "checkoutRequestId": "uuid-v4-idempotency-key",
    "couponCode": "WELCOME10"
  }
  ```
- **Response**:
  ```json
  {
    "order": { "orderNumber": "COL-2026-0001", "total": 120, "status": "PAYMENT_PENDING" },
    "paymentIntent": { "paymentId": "...", "amount": 120, "provider": "MOCK" }
  }
  ```

### `POST /api/payments/verify`
- **Access**: `STUDENT`
- **Body**: `{ paymentId, signature?, mockSuccess: true }`
- **Response**: `{ order: Order, status: "SUCCESS" }`

---

## 4. Student Orders (`/api/orders`)

### `GET /api/orders`
- **Access**: `STUDENT`
- **Response**: `{ orders: Order[] }`

### `GET /api/orders/:id`
- **Access**: Owner or `ADMIN`/`STAFF` (IDOR Protected)

### `POST /api/orders/:id/cancel`
- **Access**: Owner (Allowed only before `READY`/`COMPLETED`)

---

## 5. Admin & Kitchen Operations (`/api/admin`)

### `GET /api/orders/admin`
- **Access**: `STAFF`, `ADMIN`
- **Query**: `?view=confirmed|all&status=&search=&page=`

### `GET /api/orders/admin/kitchen`
- **Access**: `STAFF`, `ADMIN`
- **Response**: `{ board: { NEW: Order[], PREPARING: Order[], READY: Order[] } }`

### `PATCH /api/orders/admin/:id/status`
- **Access**: `STAFF`, `ADMIN`
- **Body**: `{ status: "PREPARING" | "READY" | "COMPLETED" }`

### `POST /api/admin/inventory/:id/stock`
- **Access**: `ADMIN`
- **Body**: `{ type: "add" | "remove" | "set" | "waste", quantity: 20, reason: "Morning batch" }`
