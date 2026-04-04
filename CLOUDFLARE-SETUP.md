# Cloudflare CDN Setup for HumMatch

## Benefits
- 80% bandwidth reduction (keeps Render costs low)
- Global CDN (faster page loads)
- Free SSL
- DDoS protection
- Free tier handles millions of requests

## Setup Steps

### 1. Add Domain to Cloudflare
1. Go to https://dash.cloudflare.com
2. Click "Add a Site"
3. Enter: `hummatch.me`
4. Choose FREE plan
5. Cloudflare will scan your DNS records

### 2. Update Nameservers
Cloudflare will give you 2 nameservers like:
- `ns1.cloudflare.com`
- `ns2.cloudflare.com`

Go to your domain registrar (where you bought hummatch.me) and update nameservers.

### 3. Configure DNS
In Cloudflare DNS settings:
- Add A record: `@` → Render IP (or CNAME → `hummatch-web.onrender.com`)
- Add CNAME: `www` → `hummatch.me`
- Enable "Proxied" (orange cloud) for both

### 4. Optimize Caching
In Cloudflare dashboard:
1. **Speed → Optimization**
   - Auto Minify: Enable HTML, CSS, JS
   - Rocket Loader: Enable
   - Brotli: Enable

2. **Caching → Configuration**
   - Caching Level: Standard
   - Browser Cache TTL: 4 hours
   
3. **Page Rules** (create these):
   - Rule 1: `hummatch.me/song/*`
     - Cache Level: Cache Everything
     - Edge Cache TTL: 1 week
   
   - Rule 2: `hummatch.me/sitemap.xml`
     - Cache Level: Cache Everything
     - Edge Cache TTL: 1 day

### 5. SSL/TLS
- SSL/TLS mode: Full (strict)
- Always Use HTTPS: On
- Automatic HTTPS Rewrites: On

### 6. Verify
Wait 5-10 minutes for DNS propagation, then:
- Visit https://hummatch.me
- Check that pages load (cached by Cloudflare)
- Response headers should show: `cf-cache-status: HIT`

## Cache Purge (when updating pages)
When you update song pages or content:
1. Cloudflare dashboard → Caching → Purge Cache
2. Choose "Purge Everything" or "Custom Purge" for specific URLs

## Cost Savings
- Without Cloudflare: 100K visitors = ~500 GB bandwidth = $25-100/month Render
- With Cloudflare: 100K visitors = ~100 GB bandwidth (80% cached) = $7-25/month Render

**Saves $18-75/month while improving performance!**

## Next: Spanish Domain
When launching Spanish version:
- Add `es.hummatch.me` subdomain
- Same Cloudflare setup
- Separate cache rules for Spanish pages
