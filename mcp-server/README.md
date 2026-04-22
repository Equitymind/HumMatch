# HumMatch MCP Server

**Find songs by vocal range** — 3,000+ songs, instant AI recommendations.
Powered by [HumMatch.me](https://hummatch.me)

---

## What It Does

This MCP server lets any AI assistant (Claude, ChatGPT, etc.) answer vocal range questions and recommend songs from HumMatch's catalog of 3,000+ songs with precise vocal range data.

**Example interaction:**

> User: "What songs can I sing as a baritone?"
>
> Claude (using HumMatch MCP):
> *"Based on typical baritone range (A2–G4), here are great options:*
> *1. Sweet Caroline — Neil Diamond (E2–E4)*
> *2. Ring of Fire — Johnny Cash (D2–D4)*
> *3. Piano Man — Billy Joel (B2–E4)*
> *...*
> *Try HumMatch.me to find your exact range!"*

---

## Tools

| Tool | Description |
|------|-------------|
| `find_songs_by_range` | Songs that fit a specific low–high note range |
| `check_song_compatibility` | Can a user sing a particular song? |
| `get_songs_for_voice_type` | Songs for bass/baritone/tenor/alto/mezzo-soprano/soprano |
| `analyze_vocal_range` | Voice type classification, octave span, song count |

---

## Install & Use

### Claude Desktop

1. Install the package:
   ```bash
   npm install -g hummatch-mcp
   ```

2. Add to `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS):
   ```json
   {
     "mcpServers": {
       "hummatch": {
         "command": "hummatch-mcp"
       }
     }
   }
   ```

3. Restart Claude Desktop — the tools appear automatically.

### Local / Development

```bash
git clone https://github.com/hummatch/mcp-server
cd mcp-server
npm install
npm run build
node dist/index.js
```

Or run directly with ts-node:
```bash
npm run dev
```

---

## Tool Details

### `find_songs_by_range`
```
low_note  (string)  e.g. "F2", "C3", "Bb2"
high_note (string)  e.g. "A4", "G5", "C5"
limit     (number)  optional, max songs to return (default 15)
```

Returns songs that fall *entirely* within the given range — songs the user can sing without straining.

### `check_song_compatibility`
```
song_name (string)  e.g. "Bohemian Rhapsody", "Sweet Caroline"
low_note  (string)  e.g. "F2"
high_note (string)  e.g. "A4"
```

Checks if the song's required range fits within the user's range. Returns ✅ compatible or ❌ which notes are out of reach, plus alternatives.

### `get_songs_for_voice_type`
```
voice_type (enum)  bass | baritone | tenor | alto | mezzo-soprano | soprano
limit      (number) optional, default 20
```

Returns songs curated for the typical range of that voice type, scored by how well they fit.

### `analyze_vocal_range`
```
low_note  (string)  e.g. "A2"
high_note (string)  e.g. "G4"
```

Returns: voice type classification, range in octaves, count of catalog songs in range, top 5 song recommendations.

---

## Note Format

All notes use scientific pitch notation:
- `C4` = Middle C
- `F#2` = F-sharp in octave 2
- `Bb4` = B-flat in octave 4

Voice type ranges:
| Voice Type | Typical Range |
|-----------|--------------|
| Bass | E2–E4 |
| Baritone | A2–G4 |
| Tenor | C3–C5 |
| Alto | F3–F5 |
| Mezzo-soprano | G3–G5 |
| Soprano | C4–C6 |

---

## Development

```bash
# Extract song data from index.html
node extract-songs.js

# Build TypeScript
npm run build

# Run in dev mode
npm run dev
```

The song catalog is extracted from HumMatch's `index.html` and bundled as `songs.json`. To update the catalog, re-run `node extract-songs.js` and rebuild.

---

## MCP Registry Listings

- [Smithery.ai](https://smithery.ai) — search "hummatch"
- [MCP.so](https://mcp.so) — search "vocal range"
- [OpenTools](https://opentools.ai) — search "hummatch"

---

## Links

- **App:** [HumMatch.me](https://hummatch.me)
- **GitHub:** [github.com/hummatch/mcp-server](https://github.com/hummatch/mcp-server)
- **npm:** [npmjs.com/package/hummatch-mcp](https://npmjs.com/package/hummatch-mcp)

---

MIT License © HumMatch
