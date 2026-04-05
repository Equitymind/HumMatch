#!/usr/bin/env node

/**
 * Create new Stripe prices for $7.99/mo and $49.99/yr
 * 
 * Usage:
 *   STRIPE_SECRET_KEY=sk_live_xxx node create-new-stripe-prices.js
 * 
 * Or set STRIPE_SECRET_KEY in your environment and run:
 *   node create-new-stripe-prices.js
 */

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;

if (!STRIPE_SECRET_KEY) {
  console.error('❌ ERROR: STRIPE_SECRET_KEY environment variable not set!');
  console.error('');
  console.error('Usage:');
  console.error('  STRIPE_SECRET_KEY=sk_live_xxx node create-new-stripe-prices.js');
  console.error('');
  console.error('Or set it in your environment first:');
  console.error('  export STRIPE_SECRET_KEY=sk_live_xxx');
  console.error('  node create-new-stripe-prices.js');
  process.exit(1);
}

const stripe = require('stripe')(STRIPE_SECRET_KEY);

// Find the Squad Leader product
// You can get this from Stripe Dashboard → Products
const PRODUCT_ID = 'prod_UBZUoiOJMUGvYU'; // HumMatch Premium (Squad Leader)

async function createPrices() {
  console.log('🚀 Creating new Stripe prices...\n');

  try {
    // Create $7.99/month price
    console.log('Creating monthly price ($7.99)...');
    const monthlyPrice = await stripe.prices.create({
      product: PRODUCT_ID,
      unit_amount: 799, // $7.99 in cents
      currency: 'usd',
      recurring: {
        interval: 'month',
      },
      nickname: 'Squad Leader Monthly - $7.99',
    });
    console.log('✅ Monthly price created!');
    console.log(`   ID: ${monthlyPrice.id}`);
    console.log('');

    // Create $49.99/year price
    console.log('Creating annual price ($49.99)...');
    const annualPrice = await stripe.prices.create({
      product: PRODUCT_ID,
      unit_amount: 4999, // $49.99 in cents
      currency: 'usd',
      recurring: {
        interval: 'year',
      },
      nickname: 'Squad Leader Annual - $49.99 (Save 48%)',
    });
    console.log('✅ Annual price created!');
    console.log(`   ID: ${annualPrice.id}`);
    console.log('');

    // Output for server.js
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📝 UPDATE server.js with these new price IDs:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');
    console.log('const STRIPE_PRICES = {');
    console.log(`  monthly: '${monthlyPrice.id}',  // $7.99/mo`);
    console.log(`  annual: '${annualPrice.id}'   // $49.99/yr`);
    console.log('};');
    console.log('');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');
    console.log('OLD PRICE IDs (archive these in Stripe Dashboard):');
    console.log('  monthly: price_1TE07i8kAFC9VsZHxD9xqXYB  ($5.99)');
    console.log('  annual:  price_1TDCM48kAFC9VsZHdVNcIKI7  ($39.99)');
    console.log('');

  } catch (error) {
    console.error('❌ ERROR:', error.message);
    if (error.type === 'StripeInvalidRequestError') {
      console.error('');
      console.error('Make sure you have the correct PRODUCT_ID in this script!');
      console.error('Find it in: https://dashboard.stripe.com/products');
    }
    process.exit(1);
  }
}

// Alternative: If you don't know the product ID, list all products first
async function listProducts() {
  console.log('📦 Listing Stripe products...\n');
  const products = await stripe.products.list({ limit: 10 });
  
  products.data.forEach(p => {
    console.log(`Product: ${p.name}`);
    console.log(`  ID: ${p.id}`);
    console.log(`  Active: ${p.active}`);
    console.log('');
  });
  
  console.log('Copy the Squad Leader product ID and update PRODUCT_ID in this script.');
}

// Run it
if (PRODUCT_ID === 'prod_xxxxx') {
  console.log('⚠️  WARNING: PRODUCT_ID not set in script!');
  console.log('');
  console.log('Finding your Squad Leader product...\n');
  listProducts().catch(err => {
    console.error('Error:', err.message);
    process.exit(1);
  });
} else {
  createPrices().catch(err => {
    console.error('Error:', err.message);
    process.exit(1);
  });
}
