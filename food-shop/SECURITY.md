# Security & Threat Model

## 1. Defensive Measures Implemented

### Server-as-Source-of-Truth
- No client-provided prices, totals, discounts, or stock levels are accepted.
- All totals are recalculated using authoritative database values.

### Insecure Direct Object Reference (IDOR) Mitigation
- Endpoints such as `GET /api/orders/:id` verify that `req.userId === order.userId` or that the requester possesses `STAFF` or `ADMIN` roles.

### Webhook Signature Verification
- Webhooks from payment gateways require raw body HMAC SHA256 signature verification prior to JSON parsing or state changes.

### Concurrency Race Condition Protection
- Stock decrement utilizes atomic database conditional updates (`$expr: { $gte: [{ $subtract: ['$stock', '$reservedStock'] }, qty] }`), ensuring that concurrent requests cannot over-allocate physical items.

### Rate Limiting & DoS Protection
- `express-rate-limit` throttles login, registration, and checkout endpoints.
- `helmet` applies essential security headers (`X-Content-Type-Options`, `Strict-Transport-Security`, `X-Frame-Options`).

### Password Hashing
- Passwords are encrypted with `bcryptjs` using a salt work factor of 12. Plaintext passwords are never stored or logged.
