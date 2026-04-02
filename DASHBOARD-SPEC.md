# HumMatch Premium Dashboard Specification

## Overview
Premium users get a personalized dashboard tracking their voice matching journey, saved playlists, and usage stats.

## URL & Access
- **URL:** `hummatch.me/dashboard`
- **Auth:** Requires login (email/password or token)
- **Premium gate:** Free users see upgrade prompt with preview of locked features

## Dashboard Sections

### 0. SquadMatch (New Premium Feature!) 🎤👥
```
┌─────────────────────────────────────────┐
│ 🎵 Your SquadMatch                      │
├─────────────────────────────────────────┤
│ [+ Add Friend]                          │
│                                         │
│ Sarah M.        Mike T.       Alex K.   │
│ Soprano         Tenor         Alto      │
│ 12 shared       8 shared      5 shared  │
│ songs           songs         songs     │
│                                         │
│ Squad Matches: 3 songs all can nail! ⭐ │
│ - "Don't Stop Believin'" - Journey      │
│ - "Shallow" - Lady Gaga                 │
│ - "Sweet Caroline" - Neil Diamond       │
│ [View All Squad Songs →]                │
└─────────────────────────────────────────┘
```

**How it works:**
- Premium users can add friends to their SquadMatch
- Friend accepts invite → shares their playlist privately with squad
- Dashboard shows songs that work for EVERYONE in the squad
- Perfect for: karaoke nights, band formations, group performances
- Filter: "Songs we ALL can sing" vs "Songs at least 2 can sing"

**Use cases:**
- **Karaoke groups:** Find songs everyone can nail
- **Bands:** Discover songs in everyone's range
- **Choirs:** Match voice types for harmonies
- **Couples:** Duet finder
- **Family:** Thanksgiving singalong songs

**Database schema:**
```sql
CREATE TABLE squad_matches (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  owner_user_id INTEGER,
  squad_name TEXT DEFAULT 'My SquadMatch',
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY(owner_user_id) REFERENCES users(id)
);

CREATE TABLE squad_members (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  squad_id INTEGER,
  user_id INTEGER,
  status TEXT DEFAULT 'pending', -- pending, accepted, declined
  joined_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY(squad_id) REFERENCES squad_matches(id),
  FOREIGN KEY(user_id) REFERENCES users(id)
);
```

### 1. Header / Account Info
```
┌─────────────────────────────────────────┐
│ 🎵 HumMatch Dashboard                   │
│ Welcome back, [Name/Email]!             │
│ Premium Member since [Date]       [⚙️]  │
└─────────────────────────────────────────┘
```
- Profile icon/name
- Premium badge
- Settings dropdown (Account, Billing, Logout)

### 2. Quick Stats (Top Cards)
```
┌──────────┬──────────┬──────────┬──────────┐
│ Total    │ This     │ Best     │ Playlist │
│ Hums     │ Week     │ Match    │ Size     │
│ 247      │ 12       │ 98/100   │ 34 songs │
└──────────┴──────────┴──────────┴──────────┘
```
- Total hums (lifetime)
- Recent activity (last 7 days)
- Highest confidence match ever
- Current playlist size

### 3. My Playlist (Main Section)
**Features:**
- Grid/list view toggle
- Sort by: Date added, Confidence, Artist, Genre
- Filter by: Genre, Decade, Language (EN/ES)
- Search bar

**Song cards:**
```
┌───────────────────────────────────────┐
│ 🎤 "Bohemian Rhapsody" - Queen        │
│ Confidence: 94/100 ⭐⭐⭐⭐⭐           │
│ Matched: Mar 29, 2026                 │
│ Genre: Rock | Key: Bb | Range: Tenor  │
│ [▶ Listen] [📤 Share] [🗑 Remove]     │
└───────────────────────────────────────┘
```

**Bulk actions:**
- Select multiple → Export to Spotify
- Select multiple → Create setlist PDF
- One-click "Export All to Spotify"

### 4. Recent Activity / Hum History
```
┌─────────────────────────────────────────┐
│ Recent Hums                             │
├─────────────────────────────────────────┤
│ Apr 2  | "Purple Rain" - Prince  | 91   │
│ Apr 1  | "Valerie" - Amy W.      | 88   │
│ Mar 31 | "Shallow" - Lady Gaga   | 95   │
│ [View All History →]                    │
└─────────────────────────────────────────┘
```
- Last 10 hums
- Date, song, confidence score
- Link to full history page

### 5. Voice Insights (Future - ML-powered)
```
┌─────────────────────────────────────────┐
│ Your Voice Profile                      │
├─────────────────────────────────────────┤
│ Detected Type: Tenor                    │
│ Comfortable Range: C3 - C5              │
│ Favorite Genres: Rock (42%), Pop (31%)  │
│ Best Match Days: Weekends 🎉            │
└─────────────────────────────────────────┘
```
- Voice type classification (if detected)
- Range stats based on matched songs
- Genre preferences
- Usage patterns

### 6. Friend Invites & Discount Codes (Premium Perk)
```
┌─────────────────────────────────────────┐
│ Premium Friend Invites                  │
├─────────────────────────────────────────┤
│ 🎁 Share HumMatch with Friends          │
│ Friend Codes Remaining: 3/5             │
│ Resets: Apr 30, 2026 (28 days)          │
│                                         │
│ Your Unique Code: JOEMUSIC20            │
│ 20% off forever for friends 🎉          │
│ [Copy Code] [Generate New Link]         │
│                                         │
│ Friends Converted: 2 🚀                 │
│ - Sarah (Mar 15) ✅                     │
│ - Mike (Mar 28) ✅                      │
└─────────────────────────────────────────┘
```

**How it works:**
- Premium users get **5 friend discount codes per month**
- Each code = **20% off forever** (FRIENDNAME20 format)
- Codes reset on the 1st of each month
- Counter shows remaining codes (3/5 used)
- Tracks who converted (social proof)
- Auto-applies code when friend uses unique link

**Backend logic:**
- Database tracks: user_id, codes_issued_this_month, reset_date
- Cron job runs monthly to reset counter to 5
- Each code generation: check if user has codes remaining
- Store: code, created_by_user_id, used_by_email, converted (bool)
- Dashboard shows conversion stats

**Exclusivity angle:**
- "Premium members can share 5 exclusive invites/month"
- Makes premium feel special (gatekeeping access)
- Creates urgency ("I only have 2 codes left this month!")
- FOMO for receivers ("Limited invite from premium member")

### 7. Spotify Integration Status
```
┌─────────────────────────────────────────┐
│ Spotify Connected ✅                    │
├─────────────────────────────────────────┤
│ Account: joe@example.com                │
│ Last Export: Apr 1, 2026                │
│ Playlist: "HumMatch - My Perfect Songs" │
│ [Disconnect] [Export Now]               │
└─────────────────────────────────────────┘
```
- Connection status
- Linked account
- Export history
- Quick export button

### 8. Song Requests (Premium Feature)
```
┌─────────────────────────────────────────┐
│ 🎵 Suggest a Song                       │
├─────────────────────────────────────────┤
│ Can't find a song? Request it!          │
│                                         │
│ Song Title: [________________]          │
│ Artist:     [________________]          │
│ Your Notes: [________________]          │
│             (optional - why this song?) │
│                                         │
│ [Submit Request]                        │
│                                         │
│ Your Requests (2):                      │
│ ✅ "Valerie" - Amy W. (Added Mar 15!)  │
│ ⏳ "Purple Rain" - Prince (Pending)    │
└─────────────────────────────────────────┘
```

**How it works:**
- Premium members can request songs
- Stored in database with user_id
- Admin reviews requests in God Mode analytics
- When added, user gets notification ("Your request was added!")
- Shows status: Pending, Added, Declined (with reason)

**Database schema:**
```sql
CREATE TABLE song_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  song_title TEXT,
  artist TEXT,
  notes TEXT,
  status TEXT DEFAULT 'pending', -- pending, added, declined
  admin_notes TEXT, -- reason if declined
  requested_at TEXT DEFAULT (datetime('now')),
  reviewed_at TEXT,
  FOREIGN KEY(user_id) REFERENCES users(id)
);
```

**Premium value:**
- Free users can't request (upgrade to suggest!)
- Shows we listen to premium members
- Builds song library based on actual demand
- Creates community feel

### 9. Account Settings (Collapsible)
- Email address
- Password change
- Language preference (EN/ES)
- Subscription status
- Billing info
- Cancel subscription

## Free User Experience
**When non-premium visits `/dashboard`:**
```
┌─────────────────────────────────────────┐
│ 🎵 Unlock Your Full HumMatch Dashboard │
├─────────────────────────────────────────┤
│ [Preview - Blurred/Locked]              │
│                                         │
│ Premium Members Get:                    │
│ ✅ Unlimited voice matches              │
│ ✅ Full playlist history                │
│ ✅ Spotify export                       │
│ ✅ Voice insights & stats               │
│ ✅ Cross-device sync                    │
│                                         │
│ [Upgrade to Premium - $5.99/mo]        │
└─────────────────────────────────────────┘
```
- Show blurred/locked preview
- Clear value prop
- Upgrade CTA

## Technical Requirements

### Frontend
- `/dashboard.html` (premium user view)
- Dark theme matching analytics.html style
- Mobile responsive (playlist cards stack)
- Real-time updates (when new hum added)

### Backend APIs (already exists in server.js, needs enhancement)
- `GET /api/hummatch/dashboard` - user stats & recent hums
- `GET /api/hummatch/playlist` - saved matches
- `POST /api/hummatch/playlist/add` - save a match
- `DELETE /api/hummatch/playlist/:id` - remove song
- `POST /api/hummatch/spotify/export` - export to Spotify
- `GET /api/hummatch/profile` - voice insights

### Database Schema (add to existing SQLite)
```sql
CREATE TABLE user_playlists (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  song_title TEXT,
  artist TEXT,
  confidence INTEGER,
  genre TEXT,
  language TEXT DEFAULT 'en',
  matched_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY(user_id) REFERENCES users(id)
);

CREATE TABLE hum_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  song_title TEXT,
  artist TEXT,
  confidence INTEGER,
  hummed_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY(user_id) REFERENCES users(id)
);
```

## Design Style
- Match analytics.html aesthetic (dark purple/pink gradient)
- Use same fonts (JetBrains Mono for numbers, SF Pro for text)
- Card-based layout with subtle shadows
- Smooth transitions and micro-interactions
- Emoji accents (🎤 🎵 ⭐ 📤)

## MVP vs Full Version

**MVP (Build First):**
- Header with account info
- Quick stats cards
- My Playlist (simple list)
- Recent hums
- Spotify export button
- Account settings

**Phase 2 (Later):**
- Voice insights (ML analysis)
- Sharing stats
- Genre breakdown charts
- Playlist setlist PDF export
- Social features (share matches)

## Success Metrics
- % premium users who visit dashboard weekly
- Avg playlist size per user
- Spotify export conversion rate
- Dashboard → upgrade clicks (for free users)

---

**Ready to build?** This gives premium users a reason to come back daily and creates sticky habit loops!
