# Production & Free-Tier Deployment Strategy

## 1. Free-Tier Architecture Strategy (For 3,000–5,000 Students)

```
[ Frontend: Vercel / Netlify Free Tier ]
                  │
                  ▼ (HTTPS)
[ Backend: Render / Railway / Fly.io Free/Hobby Tier ]
                  │
                  ▼ (TLS)
[ Database: MongoDB Atlas M0 (512MB Shared Free Tier) ]
```

### Free Tier Hosting Recommendations
1. **Frontend**:
   - **Vercel / Cloudflare Pages / Netlify**: Global edge CDN, automated HTTPS, zero compute cost for static SPA bundles.
2. **Backend**:
   - **Render / Railway / Fly.io**: Supports Node.js runtime and WebSocket persistence.
3. **Database**:
   - **MongoDB Atlas (M0 Cluster)**: Free 512 MB storage, SSL/TLS encryption, and automated indexing.

---

## 2. Environment Configuration (.env.production)

```env
NODE_ENV=production
PORT=5000
MONGODB_URI=mongodb+srv://<user>:<password>@cluster0.mongodb.net/college-food-shop?retryWrites=true&w=majority
JWT_SECRET=generate-a-strong-64-character-random-secret
CLIENT_URL=https://your-canteen-app.vercel.app
PAYMENT_PROVIDER=MOCK # or RAZORPAY in production
RAZORPAY_KEY_ID=rzp_live_...
RAZORPAY_KEY_SECRET=...
WEBHOOK_SECRET=...
```

---

## 3. Production Build & Run Commands

```bash
# Build both client and server bundles
npm run build

# Start production server
npm run start -w server
```
