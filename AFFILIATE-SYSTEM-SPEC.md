# HumMatch Affiliate System - Technical Spec
## Automated KJ/Bar Sign-Up & QR Code Generation

**Created:** April 4, 2026  
**Priority:** URGENT (needed for TikTok launch)  
**Goal:** Zero-friction affiliate signup → instant custom QR code delivery

---

## User Flow

### **Step 1: Affiliate Signup**
```
URL: https://hummatch.me/affiliate/signup

Form fields:
- Email (required)
- Password (required)
- Confirm Password (required)
- Bar/Venue Name (required)
- City/State (required)
- Venmo/PayPal (required - for commission payouts)
- Phone (optional - for SMS notifications)

Submit → Creates account + generates unique affiliate code
```

### **Step 2: Instant QR Code Generation**
```
On successful signup:
1. Generate unique affiliate code: HM-[CITY][5-DIGIT-RANDOM]
   Example: HM-IRV-A7X92 (Irvine bar)

2. Generate QR code URL:
   https://hummatch.me/scan/HM-IRV-A7X92
   
3. QR code redirects to:
   https://hummatch.me/?ref=HM-IRV-A7X92
   
4. Track conversions:
   - Scan count
   - Account signups
   - Hums captured
   - Premium upgrades
```

### **Step 3: Affiliate Dashboard**
```
URL: https://hummatch.me/affiliate/dashboard

Shows:
- Your unique QR code (downloadable)
- Total scans this week/month
- Total signups from your QR
- Total hums captured
- Commission earned
- Payout status

Downloadable assets:
- QR code PNG (high-res for printing)
- QR code + HumMatch branding (poster template)
- QR code SVG (for T-shirts)
- Social media templates (Instagram story, TikTok overlay)
```

---

## Commission Structure

**Tier 1: Free User Acquisition**
- $0.50 per signup from your QR code
- $1.00 per user who completes first hum
- $2.00 per user who creates a squad

**Tier 2: Premium Conversion**
- 20% of first month premium subscription ($2 from $10/month)
- 10% recurring commission for lifetime of subscription

**Tier 3: Venue Bonus**
- $50 bonus at 100 signups from your QR
- $100 bonus at 500 signups
- $500 bonus at 2,000 signups

**Payout schedule:** Weekly via Venmo/PayPal (minimum $25 balance)

---

## QR Code Asset Deliverables

### **1. Wall Poster QR (for KJ screen projection)**
```
Size: 1920x1080 (HD landscape)
Elements:
- Large QR code (center)
- "Find Your Perfect Song in 10 Seconds" headline
- "Scan to Discover Your Vocal Range" subheader
- HumMatch logo
- Affiliate venue name (bottom corner)

File: QR-Wall-Poster-[AFFILIATE-CODE].png
```

### **2. Printable Handout QR (business card size)**
```
Size: 3.5" x 2" (standard business card)
Elements:
- QR code (left side)
- "HumMatch: Your Voice, Your Songs" tagline
- "Scan Here" CTA
- Venue name

File: QR-Handout-[AFFILIATE-CODE].pdf
```

### **3. T-Shirt QR (wearable for KJs)**
```
Size: 12" x 12" (square front chest print)
Elements:
- Large QR code
- "Scan Me!" text above
- "Find Your Song" text below
- HumMatch logo

File: QR-TShirt-[AFFILIATE-CODE].svg
```

### **4. Social Media QR**
```
Instagram Story: 1080x1920 (vertical)
TikTok Overlay: 1080x1920 (vertical)

Elements:
- QR code (bottom third)
- "Try HumMatch at [Venue Name]!" headline
- Animated hum icon
- Swipe-up CTA

Files: 
- QR-Instagram-[AFFILIATE-CODE].png
- QR-TikTok-[AFFILIATE-CODE].mp4 (with animation)
```

---

## Technical Implementation

### **Database Schema (add to HumMatch MongoDB)**

```javascript
// Affiliate collection
{
  _id: ObjectId,
  affiliateCode: "HM-IRV-A7X92",
  email: "kj@karaokebar.com",
  passwordHash: "...",
  venueName: "Irvine Karaoke Bar",
  city: "Irvine",
  state: "CA",
  payoutMethod: "venmo",
  payoutEmail: "kj@venmo.com",
  phone: "+1234567890",
  createdAt: Date,
  qrCodeUrl: "https://hummatch.me/scan/HM-IRV-A7X92",
  stats: {
    totalScans: 0,
    totalSignups: 0,
    totalHums: 0,
    totalPremiumConversions: 0,
    lifetimeCommission: 0,
    pendingPayout: 0,
    lastPayoutDate: null
  }
}

// Conversion tracking collection
{
  _id: ObjectId,
  affiliateCode: "HM-IRV-A7X92",
  userId: ObjectId,  // user who signed up via QR
  eventType: "scan" | "signup" | "hum" | "premium_conversion",
  timestamp: Date,
  commissionAmount: 0.50,
  commissionPaid: false
}
```

### **API Endpoints (add to server.js)**

```javascript
// POST /api/affiliate/signup
// Creates affiliate account + generates QR code

// GET /api/affiliate/dashboard
// Returns affiliate stats + downloadable assets

// GET /scan/:affiliateCode
// Redirects to app with tracking parameter

// POST /api/affiliate/payout
// Triggers weekly payout processing
```

### **QR Code Generation (Node.js)**

```javascript
const QRCode = require('qrcode');

async function generateAffiliateQR(affiliateCode) {
  const qrUrl = `https://hummatch.me/scan/${affiliateCode}`;
  
  // Generate high-res PNG
  const qrPNG = await QRCode.toDataURL(qrUrl, {
    width: 2000,
    margin: 2,
    color: {
      dark: '#1a1a1a',  // HumMatch brand color
      light: '#ffffff'
    }
  });
  
  // Save to cloud storage (Render static files)
  const fileName = `qr-codes/${affiliateCode}.png`;
  await saveToStorage(fileName, qrPNG);
  
  return `https://hummatch.me/qr-codes/${affiliateCode}.png`;
}
```

---

## Deployment Checklist

### **Phase 1: MVP (This Weekend)**
- [ ] Add affiliate signup form (/affiliate/signup)
- [ ] Generate unique codes on signup
- [ ] Create QR code PNG (basic, no branding)
- [ ] Email QR code to affiliate immediately
- [ ] Track scans via `/scan/:code` redirect

### **Phase 2: Dashboard (Next Week)**
- [ ] Build affiliate dashboard UI
- [ ] Show real-time stats (scans, signups, commissions)
- [ ] Downloadable QR assets (PNG, PDF, SVG)
- [ ] Commission calculator

### **Phase 3: Automation (Week After)**
- [ ] Weekly payout automation (Stripe → Venmo/PayPal)
- [ ] Email notifications (milestones, payouts)
- [ ] Social media templates (auto-generate with venue branding)
- [ ] Referral leaderboard (gamification)

---

## Marketing Copy for Affiliates

**Email subject:** "Your HumMatch Affiliate Kit is Ready! 🎤"

**Email body:**
```
Hey [Venue Name]!

Welcome to the HumMatch Affiliate Program! You're now earning money every time someone at your venue discovers their perfect song.

Your custom QR code is ready:
[QR CODE IMAGE]

Download your assets:
- Wall Poster (project on screen during karaoke)
- Printable Handouts (pass out to singers)
- T-Shirt Design (wear it while you KJ!)
- Social Media Posts (share on Instagram/TikTok)

How you earn:
💰 $0.50 per scan
💰 $1.00 per signup
💰 $2.00 per first hum
💰 20% of premium upgrades (recurring!)

Track your earnings: https://hummatch.me/affiliate/dashboard

Questions? Reply to this email!

Let's help singers find their voice,
The HumMatch Team
```

---

## Success Metrics

**Week 1 Goal:**
- 10 affiliate signups (KJs/bars)
- 100 QR scans
- 50 new user signups from affiliates

**Month 1 Goal:**
- 50 affiliate signups
- 1,000 QR scans
- 500 new users from affiliates
- $500 commission paid out

**Quarter 1 Goal:**
- 200 affiliates
- 10,000 QR scans
- 5,000 new users from affiliates
- $5,000 commission paid out

---

## Next Steps

1. **Build MVP affiliate system** (this weekend - before TikTok launch)
2. **Recruit first 10 KJs** (reach out to local karaoke bars Monday)
3. **Test QR code flow** (scan → signup → commission tracking)
4. **Launch TikTok campaign** (show KJs earning money from HumMatch)

---

**File location:** `/Users/Equitymind/Desktop/Portfolio/HumMatch/AFFILIATE-SYSTEM-SPEC.md`  
**Build priority:** URGENT (needed for TikTok viral loop)
