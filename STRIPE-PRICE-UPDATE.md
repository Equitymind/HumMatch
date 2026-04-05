# Stripe Price Update - New Pricing ($7.99 / $49.99)

## Step 1: Create New Prices in Stripe Dashboard

Go to: https://dashboard.stripe.com/products

### Monthly Price ($7.99/month)
1. Find the "Squad Leader" product
2. Click "Add another price"
3. Set:
   - **Price:** $7.99 USD
   - **Billing period:** Monthly
   - **Description:** "Squad Leader Monthly - $7.99"
4. Copy the new **Price ID** (starts with `price_`)

### Annual Price ($49.99/year)
1. On same product, click "Add another price"
2. Set:
   - **Price:** $49.99 USD
   - **Billing period:** Yearly
   - **Description:** "Squad Leader Annual - $49.99 (Save 48%)"
3. Copy the new **Price ID** (starts with `price_`)

---

## Step 2: Update server.js

Replace the old price IDs in `server.js`:

```javascript
const STRIPE_PRICES = {
  monthly: 'price_NEW_MONTHLY_ID_HERE',  // Replace with new $7.99 price ID
  annual: 'price_NEW_ANNUAL_ID_HERE'     // Replace with new $49.99 price ID
};
```

**Old IDs (for reference):**
- Monthly (old $5.99): `price_1TE07i8kAFC9VsZHxD9xqXYB`
- Annual (old $39.99): `price_1TDCM48kAFC9VsZHdVNcIKI7`

---

## Step 3: Test Checkout Flow

1. Start server: `npm start`
2. Visit: http://localhost:3000/pricing
3. Click "Become a Squad Leader" (monthly)
4. Use Stripe test card: `4242 4242 4242 4242`
5. Verify amount shows **$7.99**
6. Repeat for annual plan (should show **$49.99**)

---

## Step 4: Deploy to Production

After testing locally:

```bash
git add .
git commit -m "Update pricing to $7.99/mo and $49.99/yr"
git push origin main
```

Then update Stripe price IDs in Render environment variables OR in server.js.

---

## Affiliate Payout Math (Improved!)

**Old pricing:**
- 20% of $5.99 = $1.20/month per referral
- 20% of $39.99 = $8.00/year

**NEW pricing:**
- 20% of $7.99 = **$1.60/month** (+33% increase!)
- 20% of $49.99 = **$10.00/year** (+25% increase!)

This makes affiliate program way more attractive! 💰

---

## Optional: Archive Old Prices

In Stripe Dashboard:
1. Go to old $5.99 price → Click "Archive"
2. Go to old $39.99 price → Click "Archive"

This prevents new signups at old pricing but keeps existing subscriptions active.

---

**Next Steps:**
1. Create new Stripe prices → Copy IDs
2. Update `server.js` STRIPE_PRICES object
3. Test locally
4. Deploy to production
5. Announce new pricing!
