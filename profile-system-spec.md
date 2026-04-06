# HumMatch Profile System - Musical Social Network

## Overview
Transform HumMatch from "karaoke discovery" → "musical social network with AI vocal intelligence"

## Core Features

### 1. Public User Profiles (`/@username`)

**URL Structure:**
```
hummatch.me/@username
```

**Profile Page Elements:**
- Username & display name
- Voice type badge (Bass-Baritone, Alto, etc.)
- Vocal range display (G2 - C#4, 18 semitones)
- Profile photo (optional)
- Bio (150 chars max)
- Join date
- Stats:
  - Songs I Can Nail: 47
  - Playlists Created: 5
  - HumFriends: 12
  - Profile Views: 234

**Sections:**
1. **Songs I Can Nail** (top matches, sorted by %)
2. **Playlists** (public playlists)
3. **HumFriends** (network connections)
4. **Activity** (recent matches, new playlists)

**CTA for Visitors:**
- "Test Your Voice Like @username"
- "Find Songs YOU Can Nail"

---

### 2. Public Playlist Pages (`/@username/playlist/slug`)

**URL Structure:**
```
hummatch.me/@username/playlist/karaoke-night
```

**Playlist Page Elements:**
- Playlist title & description
- Creator profile link
- Song count
- Average match % (if creator's playlist)
- Created/updated dates
- Share count
- View count

**Song List:**
```
1. Journey - Don't Stop Believin' (96% match)
2. Queen - Bohemian Rhapsody (98%)
3. Bon Jovi - Livin' on a Prayer (94%)
...
```

**SEO Optimized:**
- Title: "[Username]'s [Playlist Name] - HumMatch"
- Description: "Discover [X] songs perfect for [voice type]. Created by @username on HumMatch."
- Structured data (MusicPlaylist schema)

**Share Options:**
- Twitter/X
- Instagram (Story format)
- TikTok
- Facebook
- Copy link

---

### 3. Share Canvas Generator

**Instagram Story (1080x1920):**
```
┌─────────────────────────────┐
│  Gradient BG (brand colors) │
│                             │
│  🎤 My Songs I Can Nail     │
│                             │
│  ✓ Bohemian Rhapsody - 98% │
│  ✓ Sweet Child O' Mine - 95%│
│  ✓ Livin' on a Prayer - 94%│
│  ✓ Hotel California - 93%  │
│  ✓ Don't Stop Believin' - 92%│
│                             │
│  +12 more songs             │
│                             │
│  @username • Bass-Baritone  │
│                             │
│  [QR Code]                  │
│  hummatch.me/@username      │
└─────────────────────────────┘
```

**Twitter Card (1200x675):**
```
┌────────────────────────────────────┐
│  🎤 I can nail these 12 songs!    │
│                                    │
│  Top 3:                            │
│  ✓ Bohemian Rhapsody - 98%       │
│  ✓ Sweet Child O' Mine - 95%     │
│  ✓ Livin' on a Prayer - 94%      │
│                                    │
│  Find yours at hummatch.me        │
└────────────────────────────────────┘
```

**Auto-filled Captions:**

*Instagram/TikTok:*
```
Just found out I can nail these 12 songs! 🎤
Check out my full list: hummatch.me/@username
#karaoke #singing #hummatch #vocalmatch
```

*Twitter/X:*
```
I can nail these songs! 🎤 Find yours at hummatch.me/@username
```

*Facebook:*
```
Tested my voice on HumMatch - turns out I can nail 12 songs! 🎵
See my matches: hummatch.me/@username
```

---

### 4. HumFriends Network

**Connection Types:**
- **Follow** (one-way, like Twitter)
- **HumFriend** (mutual, like Facebook friend)

**Use Cases:**
- See friends' new playlists
- Squad invitations from network
- Voice type discovery ("Find other Bass singers")
- Duet matching (future: "Find a Soprano for harmony")

**Profile Discoverability:**
- Search by username
- Browse by voice type
- "Suggested HumFriends" (similar vocal ranges)
- "People who nail these songs" (overlap)

**Privacy Options:**
- Public (default): Profile indexed, shareable, appears in search
- Friends Only: HumFriends can see profile/playlists
- Private: Only you (no SEO, no shares)

**Incentive for Public:**
```
💡 Public profiles get 10x more SquadMatch invites!
```

---

### 5. Database Schema

**New Tables:**

```sql
-- User profiles (extends existing users table)
CREATE TABLE user_profiles (
  user_id INTEGER PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  display_name TEXT,
  bio TEXT,
  profile_photo_url TEXT,
  voice_type TEXT,
  range_low INTEGER,
  range_high INTEGER,
  is_public BOOLEAN DEFAULT 1,
  profile_views INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- User playlists (make existing playlists shareable)
CREATE TABLE user_playlists (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  slug TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  is_public BOOLEAN DEFAULT 1,
  view_count INTEGER DEFAULT 0,
  share_count INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, slug),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Playlist songs (many-to-many)
CREATE TABLE playlist_songs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  playlist_id INTEGER NOT NULL,
  song_title TEXT NOT NULL,
  song_artist TEXT NOT NULL,
  match_percentage INTEGER,
  added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (playlist_id) REFERENCES user_playlists(id)
);

-- HumFriends connections
CREATE TABLE hum_friends (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  friend_id INTEGER NOT NULL,
  status TEXT DEFAULT 'pending', -- 'pending', 'accepted', 'blocked'
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, friend_id),
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (friend_id) REFERENCES users(id)
);
```

---

### 6. API Endpoints

**Profile:**
- `GET /@username` - Public profile page
- `GET /api/profile/:username` - Profile data (JSON)
- `POST /api/profile/update` - Update own profile
- `POST /api/profile/privacy` - Change privacy settings

**Playlists:**
- `GET /@username/playlist/:slug` - Public playlist page
- `POST /api/playlist/create` - Create new playlist
- `POST /api/playlist/:id/share` - Generate share image
- `GET /api/playlist/:id/stats` - View/share counts

**HumFriends:**
- `POST /api/humfriends/connect` - Send friend request
- `POST /api/humfriends/accept` - Accept request
- `GET /api/humfriends/list` - List connections
- `GET /api/humfriends/suggested` - Suggested connections

---

### 7. SEO Strategy

**Profile Pages:**
- Title: "@username - Bass-Baritone Singer | HumMatch"
- Description: "Vocal profile for @username. Voice type: Bass-Baritone, Range: G2-C#4. 47 songs matched. View playlists and vocal stats."
- Canonical: `hummatch.me/@username`

**Playlist Pages:**
- Title: "[Playlist Name] by @username - [X] Songs | HumMatch"
- Description: "Discover [X] songs perfect for [voice type]. Curated by @username on HumMatch."
- Canonical: `hummatch.me/@username/playlist/slug`

**Sitemap Updates:**
```xml
<url>
  <loc>https://hummatch.me/@username</loc>
  <lastmod>2026-04-06</lastmod>
  <changefreq>weekly</changefreq>
</url>
<url>
  <loc>https://hummatch.me/@username/playlist/karaoke-night</loc>
  <lastmod>2026-04-06</lastmod>
  <changefreq>monthly</changefreq>
</url>
```

**Scale:**
- 10K users × 1 profile = 10K pages
- 10K users × 5 playlists avg = 50K pages
- **Total: 60K+ new indexed pages**

---

### 8. Viral Loop Mechanics

**Trigger Points:**
1. After 10 songs checked: "Share your matches!"
2. After creating playlist: "Share this playlist"
3. After export: "Show friends what you nailed"
4. On profile page: Persistent share button

**Share Tracking:**
```
?utm_source=share&utm_medium=instagram&utm_campaign=playlist&utm_content=username
```

**Attribution:**
- Track which shares drive signups
- Leaderboard: "Top Shared Profiles"
- Reward: "10+ shares unlocks custom profile URL"

---

### 9. Privacy & Safety

**Default Settings:**
- New users: Public profiles (with clear explanation)
- Opt-out: Easy privacy toggle in settings
- Content moderation: Flag inappropriate usernames/bios

**User Controls:**
- Edit profile anytime
- Delete playlists
- Block/unblock HumFriends
- Download all data (GDPR)

**Incentives for Public:**
```
💡 Benefits of Public Profiles:
✓ 10x more SquadMatch invites
✓ Profile appears in search
✓ Playlists get shared
✓ Build your HumFriends network
```

---

### 10. Implementation Priority

**Phase 1: Core Profiles (Week 1)**
- Database schema
- Profile creation on signup
- Public profile pages (`/@username`)
- Basic stats display

**Phase 2: Playlists (Week 2)**
- Make playlists shareable
- Public playlist pages
- Share canvas generator
- Social share buttons

**Phase 3: Network (Week 3)**
- HumFriends system
- Follow/connect functionality
- Activity feeds
- Suggested connections

**Phase 4: Viral Growth (Week 4)**
- Share tracking & attribution
- Leaderboards
- Referral rewards
- Profile customization

---

## Success Metrics

**Engagement:**
- % users with public profiles
- Avg playlists per user
- Share rate (shares/user/month)
- HumFriend connections/user

**Growth:**
- Signup rate from shared profiles
- Viral coefficient (invites per user)
- Profile page views
- Playlist page views

**SEO:**
- Indexed profile pages
- Indexed playlist pages
- Organic traffic from profiles
- Backlinks from shares

**Target (3 months):**
- 10K users
- 60K+ indexed pages
- 1.5 viral coefficient
- 30% public profile rate

---

## Competitive Advantage

**vs. Smule:**
- ✅ Web-first (SEO moat)
- ✅ Social-native (shareable everywhere)
- ✅ Free discovery (lower friction)
- ✅ AI vocal matching (unique data)

**vs. Karaoke apps:**
- ✅ Network effects (profiles + friends)
- ✅ User-generated SEO content
- ✅ Viral sharing mechanics
- ✅ Musical identity platform

**Category:**
"Musical social network with AI vocal intelligence"

---

**This is the moat. LinkedIn for singers. Built in 20 days.** 🚀
