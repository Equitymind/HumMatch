# HumMatch Ride Mode Spec

Updated: 2026-04-21

## Product Name
**HumMatch Ride Mode**

Related naming:
- **HumMatch Ride Mode** = rideshare / taxi / limo / shuttle / party bus / hosted vehicle experiences
- **HumMatch Car Mode** = personal consumer mode for friends and family

## One-Line Positioning
HumMatch Ride Mode turns any rideshare car into a live singalong intelligence session — passengers scan, hum, and instantly see what songs this car can actually sing together.

## Core Idea
HumMatch in the ride is not:
- the karaoke player
- the lyrics engine
- the audio source

It is:
- the song selector
- the group voice matcher
- the duet/harmony recommender
- the session organizer
- the affiliate conversion trigger

Core question:
**What should this car sing next?**

## Roles
### Driver
The driver is not the karaoke operator.
The driver is:
- the session starter
- the affiliate
- the QR distribution point
- the saved-voice anchor

### Passengers
Passengers are:
- the participants
- the likely social sharers
- the upgrade candidates
- the future Squad Leaders

## Why this wedge matters
Ride Mode creates:
- built-in distribution
- built-in affiliate growth
- a natural social demo environment
- repeat exposure through rideshare volume
- an OEM story later without needing OEM integration now

## Product Split
### Ride Mode
For rideshare / shuttle / limo / party bus hosts.

### Car Mode
For personal use with friends and family.

## MVP Principles
- Keep the driver flow minimal for safety
- Do not rely on vehicle microphone routing for MVP
- Prefer each participant using their own phone or one shared host phone in sequence
- Optimize for completion in roughly 30-90 seconds
- Keep the session simple enough for short rides

## Ride Mode MVP Flow
### 1. Driver starts Ride Mode
Driver uses saved voice if available and starts a ride session.
Driver screen shows:
- large QR code
- line: "What should this car sing next?"
- optional ride/session name
- progress count

### 2. Passenger scans QR
Passenger lands on Join Ride Session.
Fields:
- first name
- optional preference: Lead / Harmony / Either
- join

### 3. Host assignment
MVP options:
- first passenger to join becomes Host
- or driver can tap Assign Host

### 4. Hum order
Sequence runs automatically.
- Driver is participant 1 by default if saved voice exists
- remaining passengers hum in order
- support up to 5 total riders in a session

### 5. Live progress
Driver screen shows:
- joined count
- ready count
- waiting count
Passenger screens show:
- whose turn it is
- when results appear

### 6. Results
Tabs:
- Best For This Car
- Best Duets
- Easy Wins
- Harmony Picks
- Road Trip Songs

Song cards should show:
- overall fit
- who should take lead
- who fits harmony
- duet pairing when relevant
- key shift suggestions when available
- action button to YouTube karaoke search

### 7. Playback handoff
Ride Mode does not play songs.
Ride Mode hands off to YouTube karaoke results for lyrics and singalong support.

## Affiliate Layer
### Rideshare drivers should be automatic affiliates
Do not require manual affiliate application for this program.

Create a driver-facing program conceptually like:
**Drive & Earn with HumMatch**

### Driver affiliate benefits
- automatic affiliate identity
- unique QR code
- payout tracking
- session tracking
- recurring commission attribution on converted riders

### Economics
Recommended:
- **20% affiliate commission** to the originating rideshare driver when referred riders convert to monthly or annual paid plans
- **10% automatic discount** for riders/passengers who join after the Ride Mode humming/singing experience and convert from that referred flow
- define a conversion attribution window in implementation later

### Product logic
The ride experience should preserve attribution from:
- driver affiliate id
- ride session id
- passenger scan/join event
- later signup
- later subscription conversion

## Affiliate Dashboard Requirements
Driver dashboard should eventually show:
- rides started
- scans
- joined sessions
- completed hum sessions
- new accounts
- paid upgrades
- commissions earned
- top songs picked
- optional leaderboard/challenges

## Rider Conversion Hook
After the humming/singing experience, passengers should have a natural conversion path with:
- account creation
- save playlist/session prompt
- upgrade offer
- automatic **10% rider discount** if attributed to a Ride Mode session

## QR Sign Copy Options
### Preferred
**What should this car sing next?**
Scan to join HumMatch.

### Alternatives
- Singing? Scan this. HumMatch finds the best songs for this car.
- Find the best songs for this ride. Scan and hum once.

## Safety Requirements
- Driver should do almost nothing after starting session
- Host/passengers should handle most of the interaction
- No complex driver management flow while driving

## Non-MVP / Later
- OEM integrations
- in-dash native integration
- vehicle microphone routing as a core assumption
- advanced affiliate payout engine
- large multi-ride analytics suite

## Immediate Build Direction
Build **Ride Mode MVP first**.
Then later generalize into consumer-facing **Car Mode**.
