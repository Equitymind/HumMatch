import json

with open('songs-to-add-400.json', 'r') as f:
    songs = json.load(f)

print(f"// Added {len(songs)} songs - Batch 1-4 (1960s-2000s)")
for song in songs:
    title = song['title'].replace("'", "\\'")
    artist = song['artist'].replace("'", "\\'")
    year = f", year:{song['year']}" if 'year' in song else ''
    print(f"  {{ title:'{title}', artist:'{artist}', lo:{song['lo']}, hi:{song['hi']}, brightness:{song['brightness']}{year} }},")
