#!/usr/bin/env node
/**
 * HumMatch Duet Pages Generator
 * Creates 25 static HTML pages for every voice-type pairing (5x5 matrix)
 * plus an index hub page at /duets/index.html
 *
 * Run:  node generate-duet-pages.js
 */

const fs   = require('fs');
const path = require('path');

const BASE_URL = 'https://hummatch.me';
const OUT_DIR  = path.join(__dirname, 'duets');
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

// ─── VOICE TYPE META ──────────────────────────────────────────────────────────
const VOICES = ['bass', 'baritone', 'tenor', 'mezzo', 'soprano'];

const VOICE = {
  bass:     { display: 'Bass',          range: 'C2–E4', midiLo: 36, midiHi: 64, emoji: '🔊', color: '#4F46E5', desc: 'Deep, resonant foundation voice' },
  baritone: { display: 'Baritone',      range: 'G2–G4', midiLo: 43, midiHi: 67, emoji: '🎙️', color: '#7C3AED', desc: 'Warm, versatile middle-low voice' },
  tenor:    { display: 'Tenor',         range: 'C3–C5', midiLo: 48, midiHi: 72, emoji: '🎤', color: '#A855F7', desc: 'Bright, powerful high male voice' },
  mezzo:    { display: 'Mezzo-Soprano', range: 'G3–D5', midiLo: 55, midiHi: 74, emoji: '🌹', color: '#DB2777', desc: 'Rich, full middle female voice' },
  soprano:  { display: 'Soprano',       range: 'C4–G5', midiLo: 60, midiHi: 79, emoji: '⭐', color: '#EC4899', desc: 'Brilliant, soaring high female voice' },
};

// ─── DUET SONG DATABASE ───────────────────────────────────────────────────────
// pairs: array of [voice1, voice2] combos this song suits (order-agnostic).
// difficulty: easy | medium | hard
// contexts: wedding | karaoke | theater | country | gospel | jazz | rock | disney | r&b | folk | pop | party
const SONGS = [
  // ── TENOR + SOPRANO ──────────────────────────────────────────────────────────
  { id: 1,  title: 'The Prayer',                  a1: 'Andrea Bocelli',    a2: 'Celine Dion',        pairs: [['tenor','soprano']], diff: 'hard',   ctxs: ['wedding','theater','gospel'],          year: 1998, genre: 'Classical Crossover', note: 'One of the most beloved wedding duets; requires strong high notes from both singers.' },
  { id: 2,  title: 'Endless Love',                a1: 'Lionel Richie',     a2: 'Diana Ross',          pairs: [['tenor','soprano']], diff: 'medium', ctxs: ['wedding','karaoke','pop'],             year: 1981, genre: 'Soul / R&B',         note: 'Iconic romantic duet; accessible range for most singers.' },
  { id: 3,  title: 'A Whole New World',           a1: 'Peabo Bryson',      a2: 'Regina Belle',        pairs: [['tenor','soprano']], diff: 'medium', ctxs: ['wedding','disney','karaoke'],          year: 1992, genre: 'Disney',             note: 'Disney classic with a soaring soprano finale.' },
  { id: 4,  title: 'Beauty and the Beast',        a1: 'Peabo Bryson',      a2: 'Celine Dion',         pairs: [['tenor','soprano'],['baritone','soprano']], diff: 'medium', ctxs: ['wedding','disney','theater'], year: 1991, genre: 'Disney', note: 'Elegant ballad; the melody sits comfortably for both voice types.' },
  { id: 5,  title: 'Come What May',               a1: 'Ewan McGregor',     a2: 'Nicole Kidman',       pairs: [['tenor','soprano']], diff: 'hard',   ctxs: ['theater','wedding'],                   year: 2001, genre: 'Musical Theater',   note: 'Moulin Rouge showstopper; climactic ending requires strong high notes.' },
  { id: 6,  title: 'Time to Say Goodbye',         a1: 'Andrea Bocelli',    a2: 'Sarah Brightman',     pairs: [['tenor','soprano']], diff: 'hard',   ctxs: ['theater','wedding','classical'],        year: 1996, genre: 'Classical Crossover', note: 'Dramatic operatic crossover; soprano needs a strong upper register.' },
  { id: 7,  title: 'Unforgettable',               a1: 'Nat King Cole',     a2: 'Natalie Cole',        pairs: [['tenor','soprano'],['baritone','mezzo']], diff: 'easy', ctxs: ['wedding','jazz','karaoke'], year: 1991, genre: 'Jazz Standards', note: 'Timeless jazz standard; gentle range works for several voice combos.' },
  { id: 8,  title: 'Say Something',               a1: 'A Great Big World',  a2: 'Christina Aguilera',  pairs: [['tenor','soprano']], diff: 'medium', ctxs: ['karaoke','pop'],                       year: 2013, genre: 'Pop',               note: 'Emotional piano ballad; both parts have moments of intensity.' },
  { id: 9,  title: 'Perfect',                     a1: 'Ed Sheeran',        a2: 'Beyoncé',             pairs: [['tenor','soprano'],['tenor','mezzo']], diff: 'medium', ctxs: ['wedding','karaoke','pop'], year: 2017, genre: 'Pop', note: 'Contemporary wedding staple; adaptable to mezzo as well.' },
  { id: 10, title: "Don't Stop Believin'",        a1: 'Steve Perry',       a2: 'Various',             pairs: [['tenor','soprano'],['tenor','mezzo']], diff: 'hard', ctxs: ['rock','karaoke','party'],  year: 1981, genre: 'Rock',              note: 'Arena anthem; the chorus demands strong high notes.' },
  { id: 11, title: 'Cheek to Cheek',              a1: 'Fred Astaire',      a2: 'Various',             pairs: [['tenor','soprano'],['tenor','mezzo']], diff: 'easy', ctxs: ['jazz','wedding','karaoke'], year: 1935, genre: 'Jazz Standards', note: 'Elegant standard; easy range suits beginners.' },
  { id: 12, title: 'Breathe',                     a1: 'Faith Hill',        a2: 'Various',             pairs: [['tenor','soprano']], diff: 'medium', ctxs: ['country','wedding'],                    year: 1999, genre: 'Country',            note: 'Ethereal country ballad; dreamy harmonies throughout.' },
  { id: 13, title: 'November Rain',               a1: "Guns N' Roses",     a2: 'Various',             pairs: [['tenor','soprano']], diff: 'hard',   ctxs: ['rock','wedding'],                       year: 1992, genre: 'Rock Ballad',        note: 'Operatic rock epic; both singers need sustained power.' },

  // ── BARITONE + SOPRANO ────────────────────────────────────────────────────────
  { id: 20, title: "Don't Go Breaking My Heart", a1: 'Elton John',        a2: 'Kiki Dee',            pairs: [['baritone','soprano']], diff: 'easy',   ctxs: ['karaoke','pop','party'],              year: 1976, genre: 'Pop',               note: 'Upbeat and beginner-friendly; iconic call-and-response structure.' },
  { id: 21, title: "You're the One That I Want", a1: 'John Travolta',     a2: 'Olivia Newton-John',  pairs: [['baritone','soprano']], diff: 'easy',   ctxs: ['karaoke','theater','party'],           year: 1978, genre: 'Musical Theater',   note: 'Grease classic; energetic and crowd-pleasing.' },
  { id: 22, title: "I've Had the Time of My Life",a1: 'Bill Medley',      a2: 'Jennifer Warnes',     pairs: [['baritone','soprano']], diff: 'medium', ctxs: ['wedding','karaoke','pop'],             year: 1987, genre: 'Pop',               note: 'Dirty Dancing anthem; key modulation at the end requires vocal stamina.' },
  { id: 23, title: 'Shallow',                     a1: 'Bradley Cooper',    a2: 'Lady Gaga',           pairs: [['baritone','soprano'],['baritone','mezzo']], diff: 'hard', ctxs: ['karaoke','theater','pop'], year: 2018, genre: 'Country Pop', note: 'A Star Is Born showstopper; dramatic key change demands full range.' },
  { id: 24, title: 'Up Where We Belong',          a1: 'Joe Cocker',        a2: 'Jennifer Warnes',     pairs: [['baritone','soprano']], diff: 'medium', ctxs: ['wedding','karaoke','pop'],             year: 1982, genre: 'Pop Ballad',        note: 'An Officer and a Gentleman theme; soulful baritone anchors soaring soprano.' },
  { id: 25, title: "Somethin' Stupid",            a1: 'Frank Sinatra',     a2: 'Nancy Sinatra',       pairs: [['baritone','soprano']], diff: 'easy',   ctxs: ['wedding','jazz','karaoke'],            year: 1967, genre: 'Jazz Pop',           note: 'Delightfully intimate; accessible for all skill levels.' },
  { id: 26, title: 'I Knew You Were Waiting',     a1: 'George Michael',    a2: 'Aretha Franklin',     pairs: [['baritone','soprano'],['baritone','mezzo']], diff: 'medium', ctxs: ['karaoke','pop','gospel'], year: 1987, genre: 'Pop / Soul', note: 'Gospel-infused pop; both singers trade explosive lines.' },
  { id: 27, title: 'Dead Ringer for Love',        a1: 'Meat Loaf',         a2: 'Cher',                pairs: [['baritone','soprano'],['baritone','mezzo']], diff: 'medium', ctxs: ['karaoke','rock'],  year: 1981, genre: 'Rock',              note: 'Theatrical rock duet; Meat Loaf-style drama at its finest.' },
  { id: 28, title: 'Hallelujah',                  a1: 'Leonard Cohen',     a2: 'Various',             pairs: [['baritone','soprano'],['baritone','mezzo']], diff: 'medium', ctxs: ['wedding','gospel','karaoke','theater'], year: 1984, genre: 'Folk / Gospel', note: 'Universal duet arrangement; transpose as needed for each pair.' },
  { id: 29, title: 'Oh Happy Day',                a1: 'Edwin Hawkins Singers', a2: 'Various',         pairs: [['baritone','soprano']], diff: 'easy',   ctxs: ['gospel','wedding','karaoke'],          year: 1967, genre: 'Gospel',             note: 'Joyful call-and-response; easy to adapt for any baritone-soprano pairing.' },
  { id: 30, title: 'Amazing Grace (duet arr.)',   a1: 'Various',           a2: 'Various',             pairs: [['baritone','soprano'],['bass','soprano'],['baritone','mezzo']], diff: 'easy', ctxs: ['gospel','wedding','church'], year: 1779, genre: 'Hymn / Gospel', note: 'Timeless hymn; the duet arrangement adds rich harmony.' },
  { id: 31, title: 'From This Moment On',         a1: 'Shania Twain',      a2: 'Bryan White',         pairs: [['baritone','soprano']], diff: 'medium', ctxs: ['country','wedding','karaoke'],         year: 1998, genre: 'Country',            note: 'Wedding staple; lush harmonies and memorable melody.' },
  { id: 32, title: 'I Cross My Heart',            a1: 'George Strait',     a2: 'Various',             pairs: [['baritone','soprano']], diff: 'easy',   ctxs: ['country','wedding'],                   year: 1992, genre: 'Country',            note: 'Traditional country wedding song; easy range for beginners.' },

  // ── BARITONE + MEZZO ──────────────────────────────────────────────────────────
  { id: 40, title: 'Islands in the Stream',       a1: 'Kenny Rogers',      a2: 'Dolly Parton',        pairs: [['baritone','mezzo']], diff: 'easy',   ctxs: ['country','karaoke','wedding'],          year: 1983, genre: 'Country',            note: 'Easy range and fun call-and-response; perfect for beginners.' },
  { id: 41, title: 'Stop Dragging My Heart Around',a1: 'Tom Petty',        a2: 'Stevie Nicks',        pairs: [['baritone','mezzo']], diff: 'medium', ctxs: ['rock','karaoke'],                       year: 1981, genre: 'Rock',              note: 'Gritty rock duet; Stevie Nicks style suits a mezzo perfectly.' },
  { id: 42, title: 'Moves Like Jagger',           a1: 'Adam Levine',       a2: 'Christina Aguilera',  pairs: [['baritone','mezzo']], diff: 'medium', ctxs: ['karaoke','pop','party'],                year: 2011, genre: 'Pop',               note: "High-energy pop duet; Christina's parts work in the mezzo range." },
  { id: 43, title: 'Wagon Wheel',                 a1: 'Darius Rucker',     a2: 'Various',             pairs: [['baritone','mezzo'],['baritone','soprano']], diff: 'easy', ctxs: ['country','karaoke','party','campfire'], year: 2013, genre: 'Country', note: 'Campfire favourite; accessible and hugely singable.' },
  { id: 44, title: 'Need You Now',                a1: 'Lady A',            a2: 'N/A',                 pairs: [['baritone','mezzo']], diff: 'easy',   ctxs: ['country','wedding','karaoke'],          year: 2009, genre: 'Country',            note: 'Smooth country ballad; perfect blend of baritone warmth and mezzo richness.' },
  { id: 45, title: 'The Lady Is a Tramp',         a1: 'Frank Sinatra',     a2: 'Liza Minnelli',       pairs: [['baritone','mezzo']], diff: 'medium', ctxs: ['jazz','theater','karaoke'],             year: 1937, genre: 'Jazz Standards',     note: 'Swing classic; mezzo brightness contrasts nicely with baritone warmth.' },
  { id: 46, title: 'At Last',                     a1: 'Etta James',        a2: 'Various',             pairs: [['baritone','mezzo'],['bass','mezzo']], diff: 'medium', ctxs: ['wedding','jazz','karaoke'], year: 1961, genre: 'Jazz / R&B', note: 'Timeless wedding song; the melody sits in mezzo gold zone.' },
  { id: 47, title: "I'd Do Anything for Love",    a1: 'Meat Loaf',         a2: 'Various',             pairs: [['baritone','mezzo']], diff: 'hard',   ctxs: ['rock','karaoke','theater'],             year: 1993, genre: 'Rock',              note: 'Epic theatrical rock duet; demands sustained power from both.' },
  { id: 48, title: 'Total Eclipse of the Heart',  a1: 'Bonnie Tyler',      a2: 'Various',             pairs: [['baritone','mezzo']], diff: 'hard',   ctxs: ['rock','karaoke','party'],               year: 1983, genre: 'Rock Ballad',        note: "Dramatic crescendo-heavy duet; one of karaoke's greatest challenges." },
  { id: 49, title: 'Ebony and Ivory',             a1: 'Paul McCartney',    a2: 'Stevie Wonder',       pairs: [['baritone','mezzo'],['tenor','mezzo']], diff: 'easy', ctxs: ['pop','karaoke'],        year: 1982, genre: 'Pop',               note: 'Gentle and accessible; mezzo can take the Stevie Wonder part.' },

  // ── TENOR + MEZZO ─────────────────────────────────────────────────────────────
  { id: 55, title: 'Lucky',                       a1: 'Jason Mraz',        a2: 'Colbie Caillat',      pairs: [['tenor','mezzo']], diff: 'easy',   ctxs: ['wedding','karaoke','pop'],              year: 2008, genre: 'Pop',               note: 'Breezy and intimate; ideal for couples wanting an effortless duet.' },
  { id: 56, title: 'Thinking Out Loud',           a1: 'Ed Sheeran',        a2: 'Various',             pairs: [['tenor','mezzo'],['tenor','soprano']], diff: 'medium', ctxs: ['wedding','karaoke','pop'], year: 2014, genre: 'Pop', note: 'Soulful romantic ballad; adaptable to mezzo or soprano second voice.' },
  { id: 57, title: 'When You Say Nothing at All', a1: 'Keith Whitley',     a2: 'Alison Krauss',       pairs: [['tenor','mezzo']], diff: 'easy',   ctxs: ['wedding','country'],                    year: 1988, genre: 'Country',            note: 'Sweet country love song; tender harmonies throughout.' },
  { id: 58, title: "I Don't Want to Miss a Thing",a1: 'Steven Tyler',      a2: 'Various',             pairs: [['tenor','mezzo'],['tenor','soprano']], diff: 'hard', ctxs: ['wedding','karaoke','rock'], year: 1998, genre: 'Rock Ballad', note: 'Power ballad; emotionally intense with a demanding high finish.' },
  { id: 59, title: "Don't You Want Me",           a1: 'Philip Oakey',      a2: 'Susan Ann Sulley',    pairs: [['tenor','mezzo'],['tenor','soprano']], diff: 'easy', ctxs: ['karaoke','pop','party'],  year: 1981, genre: 'Synth-pop',         note: 'Fun 80s duet; easy, alternating verses suit many voice combos.' },
  { id: 60, title: 'They Can\'t Take That Away',  a1: 'Fred Astaire',      a2: 'Various',             pairs: [['tenor','mezzo']], diff: 'easy',   ctxs: ['jazz','wedding'],                       year: 1937, genre: 'Jazz Standards',     note: 'Gentle Gershwin standard; sits naturally in the tenor-mezzo overlap.' },
  { id: 61, title: 'Wherever You Will Go',        a1: 'The Calling',       a2: 'Various',             pairs: [['tenor','mezzo']], diff: 'medium', ctxs: ['wedding','pop','karaoke'],              year: 2001, genre: 'Pop Rock',           note: 'Lush rock ballad; mezzo harmonies add richness to the tenor lead.' },

  // ── BARITONE + TENOR ──────────────────────────────────────────────────────────
  { id: 65, title: 'Bring Him Home',              a1: 'Jean Valjean',      a2: 'Enjolras',            pairs: [['tenor','baritone']], diff: 'hard',   ctxs: ['theater','gospel','wedding'],          year: 1985, genre: 'Musical Theater',   note: "Les Misérables showpiece; the tenor's upper register is essential." },
  { id: 66, title: 'Under Pressure',              a1: 'Freddie Mercury',   a2: 'David Bowie',         pairs: [['tenor','baritone'],['baritone','baritone']], diff: 'hard', ctxs: ['rock','karaoke'], year: 1981, genre: 'Rock', note: "Iconic male-male duet; Queen's signature driving bass-line." },
  { id: 67, title: 'Simon & Garfunkel Medley',    a1: 'Paul Simon',        a2: 'Art Garfunkel',       pairs: [['tenor','baritone'],['tenor','tenor']], diff: 'medium', ctxs: ['folk','karaoke','pop'], year: 1965, genre: 'Folk Pop', note: "Harmonically rich; Art Garfunkel's soaring tenor pairs with Simon's baritone." },
  { id: 68, title: 'Bridge Over Troubled Water',  a1: 'Art Garfunkel',     a2: 'Paul Simon',          pairs: [['tenor','baritone'],['tenor','tenor']], diff: 'hard', ctxs: ['gospel','theater','wedding'], year: 1970, genre: 'Folk / Gospel', note: 'Climactic high notes make this one of the most challenging folk duets.' },
  { id: 69, title: 'Scarborough Fair',            a1: 'Paul Simon',        a2: 'Art Garfunkel',       pairs: [['tenor','baritone'],['tenor','tenor'],['baritone','baritone']], diff: 'medium', ctxs: ['folk','wedding'], year: 1966, genre: 'Folk', note: 'Interweaving counterpoint melodies; no single "lead" voice dominates.' },
  { id: 70, title: 'Summer Nights (Grease)',      a1: 'Danny Zuko',        a2: 'Sandy Olsson',        pairs: [['baritone','soprano'],['tenor','soprano'],['baritone','baritone'],['tenor','baritone']], diff: 'easy', ctxs: ['theater','karaoke','party'], year: 1978, genre: 'Musical Theater', note: 'Crowd-pleasing Grease classic; very flexible voice-type assignment.' },

  // ── BASS + BARITONE ───────────────────────────────────────────────────────────
  { id: 75, title: 'Friends in Low Places',       a1: 'Garth Brooks',      a2: 'Various',             pairs: [['bass','baritone'],['baritone','baritone']], diff: 'easy', ctxs: ['country','karaoke','party'], year: 1990, genre: 'Country', note: 'Country singalong staple; perfect showcase for deep, rich male voices.' },
  { id: 76, title: 'Take Me Home, Country Roads', a1: 'John Denver',       a2: 'Various',             pairs: [['bass','baritone'],['baritone','baritone'],['bass','bass']], diff: 'easy', ctxs: ['karaoke','country','campfire','party'], year: 1971, genre: 'Country Folk', note: 'Universal campfire duet; easy range, massive crowd participation.' },
  { id: 77, title: 'Lean on Me',                  a1: 'Bill Withers',      a2: 'Various',             pairs: [['bass','baritone'],['baritone','baritone']], diff: 'easy', ctxs: ['gospel','pop','karaoke','wedding'], year: 1972, genre: 'Soul / Gospel', note: 'Soulful and uplifting; harmony parts add warmth without difficulty.' },
  { id: 78, title: 'Stand by Me',                 a1: 'Ben E. King',       a2: 'Various',             pairs: [['bass','baritone'],['baritone','baritone']], diff: 'easy', ctxs: ['pop','karaoke','wedding','soul'], year: 1961, genre: 'Soul',             note: 'Timeless ballad; the low, steady verse showcases deep voices beautifully.' },
  { id: 79, title: 'Piano Man',                   a1: 'Billy Joel',        a2: 'Various',             pairs: [['baritone','baritone'],['bass','baritone']], diff: 'medium', ctxs: ['karaoke','pop','rock','party'], year: 1973, genre: 'Rock', note: 'Singalong legend; rich harmonies in the chorus are endlessly satisfying.' },
  { id: 80, title: 'Man in the Mirror',           a1: 'Michael Jackson',   a2: 'Various',             pairs: [['baritone','baritone'],['bass','baritone']], diff: 'medium', ctxs: ['pop','karaoke','gospel'], year: 1988, genre: 'Pop / Gospel', note: 'Gospel-choir energy; the bridge builds to an anthemic call-and-response.' },

  // ── BASS + TENOR ──────────────────────────────────────────────────────────────
  { id: 85, title: 'The Sound of Silence',        a1: 'Paul Simon',        a2: 'Art Garfunkel',       pairs: [['bass','tenor'],['baritone','tenor']], diff: 'medium', ctxs: ['folk','karaoke'],       year: 1964, genre: 'Folk',              note: 'Haunting counterpoint; the contrast in tone between bass and tenor is striking.' },
  { id: 86, title: 'Old Man',                     a1: 'Neil Young',        a2: 'Various',             pairs: [['bass','tenor'],['baritone','tenor'],['bass','baritone']], diff: 'easy', ctxs: ['folk','country','karaoke'], year: 1972, genre: 'Folk Rock', note: 'Understated folk gem; two-part harmony sits naturally in this range spread.' },

  // ── BASS + SOPRANO ────────────────────────────────────────────────────────────
  { id: 90, title: 'The Phantom of the Opera',    a1: 'Michael Crawford',  a2: 'Sarah Brightman',     pairs: [['bass','soprano']], diff: 'hard',   ctxs: ['theater','classical'],                 year: 1986, genre: 'Musical Theater',   note: 'The ultimate dramatic contrast duet; requires experienced singers.' },
  { id: 91, title: 'All I Ask of You',             a1: 'Michael Crawford',  a2: 'Sarah Brightman',     pairs: [['bass','soprano']], diff: 'hard',   ctxs: ['theater','wedding'],                   year: 1986, genre: 'Musical Theater',   note: 'More romantic and accessible than the title song; lyrical and beautiful.' },
  { id: 92, title: 'Belle (Beauty & the Beast)',   a1: 'Robby Benson',      a2: 'Paige O\'Hara',       pairs: [['bass','soprano'],['baritone','soprano']], diff: 'medium', ctxs: ['disney','theater','karaoke'], year: 1991, genre: 'Disney', note: 'Beast–Belle opening duet; fun and dramatic with clear character contrast.' },
  { id: 93, title: 'Sixteen Going on Seventeen',   a1: 'Rolf',              a2: 'Liesl',               pairs: [['bass','soprano'],['baritone','soprano']], diff: 'easy', ctxs: ['theater','disney','karaoke'], year: 1965, genre: 'Musical Theater', note: 'Sound of Music favourite; light and playful with a big range spread.' },
  { id: 94, title: 'Jackson',                     a1: 'Johnny Cash',       a2: 'June Carter Cash',    pairs: [['bass','mezzo'],['bass','soprano']], diff: 'easy', ctxs: ['country','karaoke','wedding'], year: 1967, genre: 'Country', note: 'Joyful banter-style duet; Johnny Cash\'s bass grounds June\'s higher voice.' },

  // ── BASS + MEZZO ──────────────────────────────────────────────────────────────
  { id: 100, title: 'Unchained Melody',           a1: 'Bobby Hatfield',    a2: 'Various',             pairs: [['bass','mezzo'],['baritone','mezzo']], diff: 'medium', ctxs: ['wedding','pop','karaoke'], year: 1965, genre: 'Pop Ballad', note: 'Deeply romantic; the wide range spread adds emotional intensity.' },
  { id: 101, title: "You've Lost That Lovin' Feelin'",a1:'Righteous Brothers',a2:'Various',          pairs: [['bass','mezzo'],['baritone','mezzo']], diff: 'hard', ctxs: ['pop','karaoke','wedding'], year: 1964, genre: 'Soul Pop', note: 'Requires vocal power and dynamic control; thrilling when done well.' },

  // ── MEZZO + SOPRANO ───────────────────────────────────────────────────────────
  { id: 105, title: 'For Good (Wicked)',           a1: 'Kristin Chenoweth', a2: 'Idina Menzel',        pairs: [['mezzo','soprano']], diff: 'hard',   ctxs: ['theater','wedding'],                   year: 2003, genre: 'Musical Theater',   note: 'Perfect mezzo-soprano showcase; emotionally devastating when performed well.' },
  { id: 106, title: 'Defying Gravity',             a1: 'Idina Menzel',      a2: 'Kristin Chenoweth',   pairs: [['mezzo','soprano']], diff: 'hard',   ctxs: ['theater','karaoke'],                   year: 2003, genre: 'Musical Theater',   note: 'Wicked showstopper; Elphaba (mezzo) vs Glinda (soprano) fireworks.' },
  { id: 107, title: 'I Will Always Love You (duet)',a1: 'Whitney Houston',  a2: 'Various',             pairs: [['mezzo','soprano']], diff: 'hard',   ctxs: ['wedding','karaoke','pop'],             year: 1992, genre: 'Pop / Country',     note: "Whitney's powerhouse delivery demands a strong soprano; mezzo provides contrast." },
  { id: 108, title: '(You Make Me Feel Like) A Natural Woman',a1:'Aretha Franklin',a2:'Various',   pairs: [['mezzo','soprano']], diff: 'medium', ctxs: ['soul','pop','gospel','karaoke'],        year: 1967, genre: 'Soul',              note: 'Soul classic; mezzo leads with the soprano adding soaring harmony.' },
  { id: 109, title: 'Sisters (White Christmas)',   a1: 'Rosemary Clooney',  a2: 'Vera-Ellen',          pairs: [['soprano','soprano'],['mezzo','soprano']], diff: 'easy', ctxs: ['christmas','theater','wedding'], year: 1954, genre: 'Holiday', note: 'Playful and charming; a wonderful showcase for two higher female voices.' },
  { id: 110, title: 'The Boy Is Mine',             a1: 'Brandy',            a2: 'Monica',              pairs: [['mezzo','mezzo'],['mezzo','soprano']], diff: 'medium', ctxs: ['pop','karaoke','r&b'], year: 1998, genre: 'R&B', note: 'Sassy R&B showdown; overlapping call-and-response lines.' },

  // ── MEZZO + MEZZO ─────────────────────────────────────────────────────────────
  { id: 115, title: 'Waterfalls',                  a1: 'TLC',               a2: 'N/A',                 pairs: [['mezzo','mezzo']], diff: 'medium', ctxs: ['pop','r&b','karaoke'],                  year: 1994, genre: 'R&B',               note: 'TLC classic with beautiful harmonies naturally in the mezzo range.' },
  { id: 116, title: 'Say My Name',                 a1: "Destiny's Child",   a2: 'N/A',                 pairs: [['mezzo','mezzo']], diff: 'medium', ctxs: ['pop','r&b','karaoke'],                  year: 1999, genre: 'R&B',               note: 'Interweaving mezzo harmonies; recognisable and rewarding to perform.' },
  { id: 117, title: 'No Scrubs',                   a1: 'TLC',               a2: 'N/A',                 pairs: [['mezzo','mezzo']], diff: 'easy',   ctxs: ['pop','r&b','karaoke','party'],          year: 1999, genre: 'R&B',               note: "Easy range makes this one of the most approachable mezzo-mezzo duets." },
  { id: 118, title: 'Landslide',                   a1: 'Stevie Nicks',      a2: 'Various',             pairs: [['mezzo','mezzo'],['mezzo','soprano']], diff: 'easy', ctxs: ['folk','rock','wedding','karaoke'], year: 1975, genre: 'Folk Rock', note: 'Reflective and beautiful; the melody sits perfectly in the mezzo register.' },
  { id: 119, title: 'Dreams',                      a1: 'Stevie Nicks',      a2: 'Lindsay Buckingham',  pairs: [['mezzo','mezzo'],['baritone','mezzo']], diff: 'medium', ctxs: ['rock','karaoke'],   year: 1977, genre: 'Rock',              note: "Fleetwood Mac classic; Nicks' smoky mezzo is the heart of this song." },
  { id: 120, title: 'Closer to Fine',              a1: 'Indigo Girls',      a2: 'N/A',                 pairs: [['mezzo','mezzo'],['tenor','mezzo']], diff: 'easy', ctxs: ['folk','pop','karaoke'],     year: 1989, genre: 'Folk Rock',          note: 'Two-guitar, two-voice folk anthem; tight harmonies in the mezzo zone.' },

  // ── TENOR + TENOR ─────────────────────────────────────────────────────────────
  { id: 125, title: 'The Sound of Silence',        a1: 'Simon & Garfunkel', a2: 'N/A',                 pairs: [['tenor','tenor'],['baritone','tenor']], diff: 'medium', ctxs: ['folk','karaoke'],    year: 1964, genre: 'Folk',              note: 'Tight tenor harmonies create a haunting, ethereal sound.' },
  { id: 126, title: 'American Pie',                a1: 'Don McLean',        a2: 'Various',             pairs: [['tenor','tenor']], diff: 'easy',   ctxs: ['folk','party','karaoke'],               year: 1971, genre: 'Folk Rock',          note: 'Legendary singalong; two tenors trading verses is crowd gold.' },
  { id: 127, title: 'With a Little Help from My Friends',a1:'Beatles',      a2: 'Joe Cocker',          pairs: [['tenor','tenor'],['baritone','tenor']], diff: 'easy', ctxs: ['rock','karaoke','pop','party'], year: 1967, genre: 'Rock', note: 'Joyful sing-along; can be sung by two tenors or a tenor-baritone pair.' },

  // ── BARITONE + BARITONE ───────────────────────────────────────────────────────
  { id: 130, title: 'Old Man',                     a1: 'Neil Young',        a2: 'Various',             pairs: [['baritone','baritone']], diff: 'easy',   ctxs: ['folk','country','karaoke'],           year: 1972, genre: 'Folk Rock',          note: 'Understated beauty; two baritones trading verses suits this perfectly.' },
  { id: 131, title: 'Margaritaville',              a1: 'Jimmy Buffett',     a2: 'Various',             pairs: [['baritone','baritone'],['bass','baritone']], diff: 'easy', ctxs: ['karaoke','country','party'], year: 1977, genre: 'Country Pop', note: 'Laid-back and fun; ideal for a casual, feel-good duet.' },

  // ── SOPRANO + SOPRANO ─────────────────────────────────────────────────────────
  { id: 135, title: 'Sisters',                     a1: 'Rosemary Clooney',  a2: 'Vera-Ellen',          pairs: [['soprano','soprano']], diff: 'easy',   ctxs: ['christmas','theater','wedding'],       year: 1954, genre: 'Holiday',            note: 'The definitive soprano-soprano duet; charming and accessible.' },
  { id: 136, title: 'Good Morning Baltimore (harmony)',a1:'Hairspray cast', a2: 'N/A',                 pairs: [['soprano','soprano'],['mezzo','soprano']], diff: 'medium', ctxs: ['theater','karaoke','party'], year: 2002, genre: 'Musical Theater', note: 'High-energy musical theater; two bright soprano voices shine here.' },
  { id: 137, title: "I Am Changing (Duet arr.)",   a1: 'Dreamgirls cast',   a2: 'N/A',                 pairs: [['soprano','soprano'],['mezzo','soprano']], diff: 'hard', ctxs: ['theater','gospel'], year: 1982, genre: 'Musical Theater / Gospel', note: 'Gospel-theater powerhouse; two strong high voices create incredible drama.' },
  { id: 138, title: 'True Colors',                 a1: 'Cyndi Lauper',      a2: 'Various',             pairs: [['soprano','soprano'],['mezzo','soprano']], diff: 'easy', ctxs: ['pop','wedding','karaoke'], year: 1986, genre: 'Pop', note: 'Soft and beautiful; the melody sits in soprano comfort zone throughout.' },

  // ── BASS + BASS ───────────────────────────────────────────────────────────────
  { id: 140, title: 'Old Man River',               a1: 'Paul Robeson',      a2: 'Various',             pairs: [['bass','bass']], diff: 'medium', ctxs: ['theater','gospel','classical'],            year: 1927, genre: 'Musical Theater',   note: 'The iconic bass showpiece; two deep voices create a powerful, resonant effect.' },
  { id: 141, title: 'Shenandoah (duet arr.)',      a1: 'Various',           a2: 'Various',             pairs: [['bass','bass'],['bass','baritone']], diff: 'easy', ctxs: ['folk','gospel','classical'], year: 1800, genre: 'American Folk',     note: 'Deep, reverent folk song; rich, contrasting bass-clef harmonies.' },
  { id: 142, title: 'Danny Boy (bass duet)',       a1: 'Various',           a2: 'Various',             pairs: [['bass','bass'],['bass','baritone']], diff: 'medium', ctxs: ['folk','gospel','wedding'], year: 1913, genre: 'Folk / Ballad', note: 'Heartfelt Irish ballad; two bass voices add gravitas and depth.' },
  { id: 143, title: 'Swing Low, Sweet Chariot',   a1: 'Various',           a2: 'Various',             pairs: [['bass','bass'],['bass','baritone'],['baritone','baritone']], diff: 'easy', ctxs: ['gospel','church','wedding'], year: 1865, genre: 'Spiritual / Gospel', note: 'Beloved spiritual; deep harmony voices make this profoundly moving.' },
  { id: 144, title: 'In the Ghetto',               a1: 'Elvis Presley',     a2: 'Various',             pairs: [['bass','bass'],['baritone','bass']], diff: 'medium', ctxs: ['pop','soul','karaoke'],  year: 1969, genre: 'Soul Pop',           note: 'Dramatic and soulful; suits two deep voices seeking emotional intensity.' },
];

// ─── TIPS PER COMBINATION ─────────────────────────────────────────────────────
function getTips(v1, v2) {
  const tips = {
    'bass-bass':           ['Let your voices breathe on identical notes — slight vibrato offsets create warmth.', 'Choose songs with a moving bass line so each singer can claim a melodic role.', 'Amplify the lower singer slightly to prevent muddiness on shared pitches.'],
    'bass-baritone':       ['The baritone naturally takes the melody while bass anchors below.', 'Songs in G2–E4 work best for both; avoid keys that push either above E4.', 'Aim for smooth voice-leading — large leaps between your parts sound jarring.'],
    'bass-tenor':          ['The large gap creates natural contrast — lean into it.', 'Let the tenor carry the emotional melody while bass provides a drone or counter-melody.', 'Bridge Over Troubled Water is a masterclass in this pairing — study it.'],
    'bass-mezzo':          ['This pairing covers nearly three octaves — use the full palette.', 'Jackson (Cash & Carter) is your blueprint: playful banter across registers.', 'Let the mezzo take the verse melody; bass adds a counter-response.'],
    'bass-soprano':        ['One of the most dramatic pairings in vocal music — the gap is thrilling.', "Think Phantom of the Opera: bass as the brooding anchor, soprano soaring above.", 'Mic balance is critical — ensure the soprano is not drowned out by bass resonance.'],
    'baritone-baritone':   ['Harmonise a third or sixth apart for the richest sound.', 'Aim for the low-tenor range (D3–E4) where both voices are most comfortable.', 'One singer takes the melody, the other a counter-melody or sustained harmony.'],
    'baritone-tenor':      ["Grease's Summer Nights is the blueprint: same language, different registers.", 'The tenor naturally leads high climaxes; baritone takes the verse weight.', 'Transpose songs to B♭2–G4 for the baritone and D3–B4 for the tenor.'],
    'baritone-mezzo':      ['Overlapping middle registers create silky blend — blend carefully.', 'Islands in the Stream is your starter song: easy range, great call-and-response.', 'Make sure you are in different octaves on unison lines for contrast.'],
    'baritone-soprano':    ['Classic pairing — the most songs exist for you. Explore them all.', 'Keep the soprano in E4–D5 to avoid overpowering the baritone below.', 'Transpose keys up a step if the soprano part feels low and breathy.'],
    'tenor-tenor':         ['Harmonise in thirds; parallel fifths can feel hollow.', 'One tenor takes the octave above the other on final choruses for drama.', 'Folk duets (Simon & Garfunkel) are ideal territory for this pairing.'],
    'tenor-mezzo':         ["Lucky by Jason Mraz & Colbie Caillat is your perfect starter — breezy and fun.", 'Transpose most songs down a whole step so the mezzo sits above G3.', 'The tenor\'s clarity cuts through the mezzo\'s warmth — let the contrast shine.'],
    'tenor-soprano':       ['The Prayer and Time to Say Goodbye are the gold standards — study both.', 'Soprano should sit in the D5–G5 range on climaxes for max impact.', 'Mic the tenor slightly hotter — sopranos naturally project over tenors.'],
    'mezzo-mezzo':         ['TLC and Destiny\'s Child wrote the rulebook — study their vocal layering.', 'One mezzo takes the root, the other harmonises a third above.', 'Avoid keys that push either voice above D5 without full chest voice support.'],
    'mezzo-soprano':       ['For Good from Wicked is your anthem — dramatic and perfectly written for this pair.', 'The soprano should sit a fourth or fifth above the mezzo for the richest blend.', "Avoid unison passages — your tonal colours are different enough that they'll clash."],
    'soprano-soprano':     ['Sisters from White Christmas is your classic starting point.', 'Soprano 1 takes the higher harmony; Soprano 2 carries the melody below.', 'Avoid songs that push both voices above G5 — fatigue sets in quickly.'],
  };
  const key = `${v1}-${v2}`;
  return tips[key] || ['Choose keys that keep both voices in their comfortable middle range.', 'Record yourselves and listen back — blend issues are much clearer on playback.', 'Start slow: run the harmony parts separately before combining.'];
}

// ─── FAQ PER COMBINATION ──────────────────────────────────────────────────────
function getFaq(v1, v2) {
  const d1 = VOICE[v1].display, d2 = VOICE[v2].display;
  const r1 = VOICE[v1].range,  r2 = VOICE[v2].range;
  return [
    { q: `What is the best key for a ${d1} and ${d2} duet?`, a: `It depends on the song, but generally aim for a key where ${d1} (${r1}) sits comfortably in the middle of their range — then check that ${d2} (${r2}) can reach all their notes without strain. Use HumMatch's free voice test to find your exact range before committing to a key.` },
    { q: `Who should take the melody in a ${d1}/${d2} duet?`, a: `In most popular duets the higher voice carries the main melody in the chorus while the lower voice anchors verses or provides harmony. However, call-and-response arrangements (like Jackson by Johnny Cash & June Carter) split verses evenly — experiment to find what feels natural for your voices.` },
    { q: `How do I find songs that work for both a ${d1} and a ${d2}?`, a: `Use the difficulty and context filters above to narrow down songs for your situation. For a perfect fit, both singers should test their range on HumMatch first, then look for songs whose combined range matches both voice profiles.` },
    { q: `Are there easy duets for ${d1} and ${d2} beginners?`, a: `Yes — filter by "Easy" above. Beginner-friendly picks require no more than a 12-semitone span from either voice and feature clear, stepwise melodies. Wedding and country songs often fall in this category.` },
    { q: `Can a ${d1} and ${d2} do musical theater duets?`, a: `Absolutely. Theater has a rich tradition of duets written for a wide range of pairings. Filter by "Theater" above for the best options. Les Misérables, Wicked, Phantom of the Opera, and Grease all feature well-known ${d1}–${d2} pairings.` },
  ];
}

// ─── HTML GENERATOR ───────────────────────────────────────────────────────────
function renderPage(v1, v2) {
  const V1 = VOICE[v1], V2 = VOICE[v2];
  const slug = `${v1}-${v2}`;
  const title = `${V1.display} & ${V2.display} Duet Songs`;
  const seoTitle = `Best ${V1.display} + ${V2.display} Duet Songs | ${title} | HumMatch`;
  const desc = `Top duet songs for ${V1.display} and ${V2.display} voices. Filter by difficulty, occasion, and genre — wedding songs, karaoke picks, musical theater classics, and more.`;
  const canonical = `${BASE_URL}/duets/${slug}`;

  // Filter songs for this combo (both directions)
  const pageSongs = SONGS.filter(s =>
    s.pairs.some(([a,b]) => (a===v1 && b===v2) || (a===v2 && b===v1))
  ).sort((a,b) => {
    const diffOrder = { easy: 0, medium: 1, hard: 2 };
    return diffOrder[a.diff] - diffOrder[b.diff];
  });

  // Related combos (same voice 1, different voice 2) + (different v1, same v2)
  const related = VOICES
    .filter(v => v !== v2)
    .slice(0, 4)
    .map(v => ({ v1, v2: v, slug: `${v1}-${v}`, label: `${V1.display} & ${VOICE[v].display}` }));

  const tips = getTips(v1, v2);
  const faqs = getFaq(v1, v2);

  // Build context tag set
  const allCtxs = [...new Set(pageSongs.flatMap(s => s.ctxs))].sort();

  // Schema JSON-LD
  const schema = JSON.stringify({
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BreadcrumbList",
        "itemListElement": [
          { "@type": "ListItem", "position": 1, "name": "Home", "item": BASE_URL },
          { "@type": "ListItem", "position": 2, "name": "Duet Songs", "item": `${BASE_URL}/duets/` },
          { "@type": "ListItem", "position": 3, "name": title, "item": canonical }
        ]
      },
      {
        "@type": "FAQPage",
        "mainEntity": faqs.map(f => ({
          "@type": "Question",
          "name": f.q,
          "acceptedAnswer": { "@type": "Answer", "text": f.a }
        }))
      }
    ]
  });

  const songCardsHTML = pageSongs.map(s => {
    const diffColor = s.diff === 'easy' ? '#22c55e' : s.diff === 'medium' ? '#f59e0b' : '#ef4444';
    const diffEmoji = s.diff === 'easy' ? '🟢' : s.diff === 'medium' ? '🟡' : '🔴';
    const ctxTags = s.ctxs.map(c => `<span class="ctx-tag" data-ctx="${c}">${c}</span>`).join('');
    const ytQ = encodeURIComponent(`${s.title} ${s.a1} karaoke duet`);
    const ytLink = `https://www.youtube.com/results?search_query=${ytQ}`;
    return `
    <div class="song-card" data-diff="${s.diff}" data-ctxs="${s.ctxs.join(',')}" data-title="${s.title.toLowerCase()}" data-votes="0">
      <div class="card-top">
        <div class="card-info">
          <div class="song-title">${s.title}</div>
          <div class="song-artists">${s.a1}${s.a2 && s.a2 !== 'N/A' ? ` & ${s.a2}` : ''}</div>
          <div class="song-meta">${s.year} · ${s.genre}</div>
        </div>
        <div class="diff-badge" style="background:${diffColor}22;color:${diffColor};border-color:${diffColor}44">${diffEmoji} ${s.diff.charAt(0).toUpperCase()+s.diff.slice(1)}</div>
      </div>
      <div class="ctx-tags">${ctxTags}</div>
      ${s.note ? `<p class="song-note">${s.note}</p>` : ''}
      <div class="card-actions">
        <button class="vote-btn up" onclick="vote(this,'${s.id}',1)" title="Great duet song">👍 <span class="vote-count">0</span></button>
        <button class="vote-btn down" onclick="vote(this,'${s.id}',-1)" title="Not for me">👎</button>
        <a class="yt-btn" href="${ytLink}" target="_blank" rel="noopener">▶ Karaoke</a>
      </div>
    </div>`;
  }).join('\n');

  const faqHTML = faqs.map(f => `
  <details class="faq-item">
    <summary>${f.q}</summary>
    <p>${f.a}</p>
  </details>`).join('\n');

  const tipsHTML = tips.map(t => `<li>${t}</li>`).join('\n');

  const relatedHTML = related.map(r => `
    <a class="related-card" href="/duets/${r.slug}.html">
      <span class="rel-emoji">${VOICE[r.v1].emoji}${VOICE[r.v2].emoji}</span>
      <span>${r.label}</span>
    </a>`).join('\n');

  // All 25 links for nav
  const allCombos = VOICES.flatMap(va => VOICES.map(vb => ({
    v1: va, v2: vb,
    slug: `${va}-${vb}`,
    label: `${VOICE[va].display} & ${VOICE[vb].display}`
  })));
  const navGridHTML = allCombos.map(c =>
    `<a href="/duets/${c.slug}.html" class="combo-nav-link${c.slug===slug?' active':''}">${VOICE[c.v1].emoji}${VOICE[c.v2].emoji} ${c.label}</a>`
  ).join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${seoTitle}</title>
  <meta name="description" content="${desc}">
  <meta name="robots" content="index, follow">
  <link rel="canonical" href="${canonical}">
  <meta property="og:type" content="website">
  <meta property="og:title" content="${seoTitle}">
  <meta property="og:description" content="${desc}">
  <meta property="og:url" content="${canonical}">
  <meta property="og:site_name" content="HumMatch">
  <meta name="twitter:card" content="summary">
  <meta name="twitter:title" content="${seoTitle}">
  <meta name="twitter:description" content="${desc}">
  <script type="application/ld+json">${schema}</script>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    :root {
      --bg: #0d0b1a; --card: rgba(255,255,255,0.04);
      --border: rgba(124,58,237,0.15); --grad: linear-gradient(135deg, #A855F7, #EC4899);
      --purple: #A855F7; --pink: #EC4899; --text: #e2e0f0;
      --muted: rgba(255,255,255,0.45); --radius: 14px;
    }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: var(--bg); color: var(--text); min-height: 100vh; line-height: 1.65; }

    /* NAV */
    nav.topnav { display: flex; align-items: center; justify-content: space-between; padding: 14px 24px; border-bottom: 1px solid var(--border); position: sticky; top: 0; z-index: 50; background: rgba(13,11,26,0.92); backdrop-filter: blur(12px); }
    .logo { font-size: 1.2rem; font-weight: 800; text-decoration: none; background: var(--grad); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
    .nav-links { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
    .nav-link { color: var(--muted); text-decoration: none; font-size: 0.875rem; padding: 6px 12px; border-radius: 8px; transition: color 0.15s; }
    .nav-link:hover { color: var(--text); }
    .nav-btn { background: var(--grad); color: #fff; padding: 8px 18px; border-radius: 10px; text-decoration: none; font-weight: 700; font-size: 0.875rem; transition: opacity 0.15s; }
    .nav-btn:hover { opacity: 0.85; }

    /* HERO */
    .hero { max-width: 1000px; margin: 0 auto; padding: 48px 24px 28px; }
    .breadcrumb { font-size: 0.8rem; color: var(--muted); margin-bottom: 20px; }
    .breadcrumb a { color: var(--muted); text-decoration: none; }
    .breadcrumb a:hover { color: var(--purple); }
    .breadcrumb span { margin: 0 6px; }
    .voice-pair-badge { display: inline-flex; align-items: center; gap: 10px; background: var(--card); border: 1px solid var(--border); border-radius: 50px; padding: 8px 20px; margin-bottom: 18px; }
    .voice-chip { display: flex; align-items: center; gap: 6px; font-size: 0.85rem; font-weight: 600; }
    .plus-sep { color: var(--muted); font-size: 1.1rem; }
    h1 { font-size: clamp(1.9rem, 5vw, 2.7rem); font-weight: 800; line-height: 1.15; margin-bottom: 10px; background: var(--grad); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
    .lead { font-size: 1rem; color: var(--muted); max-width: 680px; margin-bottom: 28px; line-height: 1.7; }
    .stats-bar { display: flex; gap: 12px; flex-wrap: wrap; margin-bottom: 36px; }
    .stat-chip { background: var(--card); border: 1px solid var(--border); border-radius: 10px; padding: 9px 16px; font-size: 0.82rem; color: var(--muted); }
    .stat-chip strong { color: var(--text); }

    /* CONTENT */
    .content { max-width: 1000px; margin: 0 auto; padding: 0 24px 80px; }

    /* FILTERS */
    .filter-section { background: var(--card); border: 1px solid var(--border); border-radius: var(--radius); padding: 18px 20px; margin-bottom: 24px; }
    .filter-row { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; margin-bottom: 10px; }
    .filter-row:last-child { margin-bottom: 0; }
    .filter-label { font-size: 0.78rem; color: var(--muted); font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em; min-width: 80px; }
    .filter-btn { background: transparent; border: 1px solid var(--border); border-radius: 8px; padding: 6px 14px; color: var(--muted); font-size: 0.83rem; cursor: pointer; transition: all 0.15s; }
    .filter-btn:hover, .filter-btn.active { background: var(--grad); border-color: transparent; color: #fff; }
    .search-input { flex: 1; min-width: 200px; background: rgba(255,255,255,0.03); border: 1px solid var(--border); border-radius: 10px; padding: 9px 14px; color: var(--text); font-size: 0.9rem; outline: none; }
    .search-input::placeholder { color: var(--muted); }
    .search-input:focus { border-color: var(--purple); }
    .result-count { font-size: 0.82rem; color: var(--muted); padding: 4px 0; }

    /* SONG GRID */
    .song-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px,1fr)); gap: 12px; margin-top: 16px; }
    .song-card { background: var(--card); border: 1px solid var(--border); border-radius: var(--radius); padding: 16px; transition: border-color 0.2s, transform 0.15s; display: flex; flex-direction: column; gap: 10px; }
    .song-card:hover { border-color: rgba(168,85,247,0.4); transform: translateY(-2px); }
    .card-top { display: flex; justify-content: space-between; align-items: flex-start; gap: 8px; }
    .card-info { flex: 1; }
    .song-title { font-weight: 700; font-size: 0.95rem; margin-bottom: 2px; }
    .song-artists { font-size: 0.82rem; color: var(--muted); margin-bottom: 2px; }
    .song-meta { font-size: 0.76rem; color: var(--muted); opacity: 0.7; }
    .diff-badge { border: 1px solid; border-radius: 8px; padding: 4px 10px; font-size: 0.75rem; font-weight: 600; white-space: nowrap; }
    .ctx-tags { display: flex; flex-wrap: wrap; gap: 5px; }
    .ctx-tag { background: rgba(255,255,255,0.05); border: 1px solid var(--border); border-radius: 6px; padding: 2px 8px; font-size: 0.72rem; color: var(--muted); text-transform: capitalize; }
    .song-note { font-size: 0.8rem; color: var(--muted); line-height: 1.55; border-left: 2px solid var(--border); padding-left: 8px; }
    .card-actions { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; margin-top: 4px; }
    .vote-btn { background: transparent; border: 1px solid var(--border); border-radius: 8px; padding: 5px 12px; color: var(--muted); cursor: pointer; font-size: 0.83rem; transition: all 0.15s; }
    .vote-btn:hover { border-color: var(--purple); color: var(--text); }
    .vote-btn.voted-up { background: rgba(34,197,94,0.15); border-color: #22c55e; color: #22c55e; }
    .vote-btn.voted-down { background: rgba(239,68,68,0.15); border-color: #ef4444; color: #ef4444; }
    .vote-count { font-weight: 700; }
    .yt-btn { margin-left: auto; background: rgba(168,85,247,0.15); border: 1px solid rgba(168,85,247,0.3); border-radius: 8px; padding: 5px 12px; color: var(--purple); text-decoration: none; font-size: 0.8rem; font-weight: 600; transition: all 0.15s; }
    .yt-btn:hover { background: rgba(168,85,247,0.25); }
    .no-results { text-align: center; padding: 48px 24px; color: var(--muted); font-size: 0.95rem; }

    /* TIPS */
    .section { margin-top: 56px; }
    .section-title { font-size: 1.25rem; font-weight: 700; margin-bottom: 16px; }
    .tips-list { list-style: none; display: flex; flex-direction: column; gap: 10px; }
    .tips-list li { background: var(--card); border: 1px solid var(--border); border-radius: 10px; padding: 12px 16px; font-size: 0.9rem; color: var(--muted); line-height: 1.6; }
    .tips-list li::before { content: "💡 "; }

    /* FAQ */
    .faq-item { background: var(--card); border: 1px solid var(--border); border-radius: 10px; margin-bottom: 8px; overflow: hidden; }
    .faq-item summary { padding: 14px 18px; font-weight: 600; font-size: 0.9rem; cursor: pointer; list-style: none; display: flex; justify-content: space-between; align-items: center; }
    .faq-item summary::after { content: "+"; font-size: 1.2rem; color: var(--muted); transition: transform 0.2s; }
    .faq-item[open] summary::after { transform: rotate(45deg); }
    .faq-item p { padding: 0 18px 16px; font-size: 0.87rem; color: var(--muted); line-height: 1.7; }

    /* RELATED */
    .related-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px,1fr)); gap: 8px; }
    .related-card { background: var(--card); border: 1px solid var(--border); border-radius: 10px; padding: 12px 14px; text-decoration: none; color: var(--text); font-size: 0.85rem; font-weight: 600; display: flex; align-items: center; gap: 8px; transition: border-color 0.15s, transform 0.15s; }
    .related-card:hover { border-color: rgba(168,85,247,0.4); transform: translateY(-1px); }
    .rel-emoji { font-size: 1.1rem; }

    /* ALL COMBOS NAV */
    .combo-nav { background: var(--card); border: 1px solid var(--border); border-radius: var(--radius); padding: 18px; margin-top: 48px; }
    .combo-nav-title { font-size: 0.82rem; color: var(--muted); font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em; margin-bottom: 14px; }
    .combo-nav-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px,1fr)); gap: 6px; }
    .combo-nav-link { display: flex; align-items: center; gap: 6px; padding: 7px 10px; border-radius: 8px; text-decoration: none; font-size: 0.78rem; color: var(--muted); transition: all 0.15s; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .combo-nav-link:hover { background: rgba(255,255,255,0.06); color: var(--text); }
    .combo-nav-link.active { background: rgba(168,85,247,0.15); color: var(--purple); font-weight: 700; }

    /* CTA */
    .cta-box { background: linear-gradient(135deg, rgba(168,85,247,0.12), rgba(236,72,153,0.12)); border: 1px solid rgba(168,85,247,0.25); border-radius: var(--radius); padding: 32px; text-align: center; margin-top: 56px; }
    .cta-box h2 { font-size: 1.4rem; font-weight: 800; margin-bottom: 8px; }
    .cta-box p { color: var(--muted); margin-bottom: 20px; font-size: 0.93rem; }
    .cta-link { display: inline-block; background: var(--grad); color: #fff; font-weight: 700; padding: 12px 28px; border-radius: 12px; text-decoration: none; font-size: 0.95rem; transition: opacity 0.15s; }
    .cta-link:hover { opacity: 0.85; }

    /* FOOTER */
    footer { border-top: 1px solid var(--border); padding: 28px 24px; text-align: center; font-size: 0.82rem; color: var(--muted); }
    footer a { color: var(--muted); text-decoration: none; margin: 0 8px; }
    footer a:hover { color: var(--text); }

    @media (max-width: 580px) {
      .hero { padding: 32px 16px 20px; }
      .content { padding: 0 16px 60px; }
      .song-grid { grid-template-columns: 1fr; }
      .nav-links { display: none; }
    }
  </style>
</head>
<body>

<nav class="topnav">
  <a href="/" class="logo">HumMatch</a>
  <div class="nav-links">
    <a href="/duets/" class="nav-link">All Duets</a>
    <a href="/baritone-songs.html" class="nav-link">Voice Types</a>
    <a href="/blog/" class="nav-link">Blog</a>
    <a href="/" class="nav-btn">Test My Voice →</a>
  </div>
</nav>

<div class="hero">
  <div class="breadcrumb">
    <a href="/">Home</a><span>›</span><a href="/duets/">Duet Songs</a><span>›</span>${V1.display} &amp; ${V2.display}
  </div>

  <div class="voice-pair-badge">
    <span class="voice-chip" style="color:${V1.color}">${V1.emoji} ${V1.display}</span>
    <span class="plus-sep">+</span>
    <span class="voice-chip" style="color:${V2.color}">${V2.emoji} ${V2.display}</span>
  </div>

  <h1>${title}</h1>
  <p class="lead">The best songs for a <strong>${V1.display}</strong> (${V1.range}) singing with a <strong>${V2.display}</strong> (${V2.range}). Filter by difficulty or occasion to find your perfect duet — then test your voice free on HumMatch.</p>

  <div class="stats-bar">
    <div class="stat-chip"><strong>${pageSongs.length}</strong> curated songs</div>
    <div class="stat-chip">${V1.display} range: <strong>${V1.range}</strong></div>
    <div class="stat-chip">${V2.display} range: <strong>${V2.range}</strong></div>
    <div class="stat-chip"><strong>${pageSongs.filter(s=>s.diff==='easy').length}</strong> easy picks</div>
  </div>
</div>

<div class="content">

  <!-- FILTERS -->
  <div class="filter-section">
    <div class="filter-row">
      <span class="filter-label">Difficulty</span>
      <button class="filter-btn active" data-filter="diff" data-value="all" onclick="setFilter('diff','all',this)">All</button>
      <button class="filter-btn" data-filter="diff" data-value="easy" onclick="setFilter('diff','easy',this)">🟢 Easy</button>
      <button class="filter-btn" data-filter="diff" data-value="medium" onclick="setFilter('diff','medium',this)">🟡 Medium</button>
      <button class="filter-btn" data-filter="diff" data-value="hard" onclick="setFilter('diff','hard',this)">🔴 Hard</button>
    </div>
    <div class="filter-row">
      <span class="filter-label">Occasion</span>
      <button class="filter-btn active" data-filter="ctx" data-value="all" onclick="setFilter('ctx','all',this)">All</button>
      ${allCtxs.map(c => `<button class="filter-btn" data-filter="ctx" data-value="${c}" onclick="setFilter('ctx','${c}',this)">${c.charAt(0).toUpperCase()+c.slice(1)}</button>`).join('\n      ')}
    </div>
    <div class="filter-row">
      <input class="search-input" type="search" placeholder="Search songs…" oninput="applyFilters()">
      <span class="result-count" id="resultCount">${pageSongs.length} songs</span>
    </div>
  </div>

  <div class="song-grid" id="songGrid">
${songCardsHTML}
  </div>
  <p class="no-results" id="noResults" style="display:none">No songs match your filters. Try clearing some.</p>

  <!-- TIPS -->
  <div class="section">
    <h2 class="section-title">Tips for ${V1.display} &amp; ${V2.display} Duets</h2>
    <ul class="tips-list">
      ${tipsHTML}
    </ul>
  </div>

  <!-- FAQ -->
  <div class="section">
    <h2 class="section-title">Frequently Asked Questions</h2>
    ${faqHTML}
  </div>

  <!-- RELATED -->
  <div class="section">
    <h2 class="section-title">Related Voice Pairings</h2>
    <div class="related-grid">
      ${relatedHTML}
    </div>
  </div>

  <!-- ALL 25 COMBOS NAV -->
  <div class="combo-nav">
    <div class="combo-nav-title">All 25 Voice Combinations</div>
    <div class="combo-nav-grid">
      ${navGridHTML}
    </div>
  </div>

  <!-- CTA -->
  <div class="cta-box">
    <h2>Not Sure Which Voice Type You Are?</h2>
    <p>Hum any melody and HumMatch will detect your vocal range instantly — no account needed.</p>
    <a href="/" class="cta-link">Test My Voice Free →</a>
  </div>

</div>

<footer>
  <a href="/">HumMatch</a>
  <a href="/duets/">All Duets</a>
  <a href="/baritone-songs.html">Voice Types</a>
  <a href="/blog/">Blog</a>
  <a href="/contact.html">Contact</a>
  <br><br>
  <span>© ${new Date().getFullYear()} HumMatch · Find songs that fit your voice</span>
</footer>

<script>
  const filters = { diff: 'all', ctx: 'all' };
  let searchQ = '';

  function setFilter(type, value, btn) {
    filters[type] = value;
    document.querySelectorAll(\`[data-filter="\${type}"]\`).forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    applyFilters();
  }

  function applyFilters() {
    searchQ = document.querySelector('.search-input').value.toLowerCase();
    const cards = document.querySelectorAll('.song-card');
    let visible = 0;
    cards.forEach(card => {
      const matchDiff = filters.diff === 'all' || card.dataset.diff === filters.diff;
      const matchCtx  = filters.ctx  === 'all' || card.dataset.ctxs.split(',').includes(filters.ctx);
      const matchQ    = !searchQ || card.dataset.title.includes(searchQ);
      const show = matchDiff && matchCtx && matchQ;
      card.style.display = show ? '' : 'none';
      if (show) visible++;
    });
    document.getElementById('resultCount').textContent = visible + ' song' + (visible !== 1 ? 's' : '');
    document.getElementById('noResults').style.display = visible === 0 ? '' : 'none';
  }

  // Voting with localStorage
  function vote(btn, songId, dir) {
    const key = 'hm_vote_duet_' + songId;
    const card = btn.closest('.song-card');
    const upBtn = card.querySelector('.vote-btn.up');
    const downBtn = card.querySelector('.vote-btn.down');
    const countEl = upBtn.querySelector('.vote-count');
    const prev = parseInt(localStorage.getItem(key) || '0');
    const prevTotal = parseInt(countEl.textContent || '0');

    // Toggle
    if ((dir === 1 && prev === 1) || (dir === -1 && prev === -1)) {
      localStorage.setItem(key, '0');
      countEl.textContent = Math.max(0, prevTotal - 1);
      upBtn.classList.remove('voted-up');
      downBtn.classList.remove('voted-down');
      card.dataset.votes = Math.max(0, prevTotal - 1);
    } else {
      const delta = dir - prev;
      const newTotal = Math.max(0, prevTotal + delta);
      localStorage.setItem(key, String(dir));
      countEl.textContent = newTotal;
      upBtn.classList.toggle('voted-up', dir === 1);
      downBtn.classList.toggle('voted-down', dir === -1);
      card.dataset.votes = newTotal;
    }
  }

  // Restore votes from localStorage on load
  document.querySelectorAll('.song-card').forEach(card => {
    const songId = card.querySelector('.vote-btn.up').getAttribute('onclick').match(/'(\\d+)'/)[1];
    const key = 'hm_vote_duet_' + songId;
    const saved = parseInt(localStorage.getItem(key) || '0');
    if (saved !== 0) {
      const upBtn = card.querySelector('.vote-btn.up');
      const downBtn = card.querySelector('.vote-btn.down');
      if (saved === 1) upBtn.classList.add('voted-up');
      if (saved === -1) downBtn.classList.add('voted-down');
    }
  });
</script>

</body>
</html>`;
}

// ─── INDEX PAGE ───────────────────────────────────────────────────────────────
function renderIndex() {
  const combos = VOICES.flatMap(v1 => VOICES.map(v2 => ({ v1, v2 })));
  const cardsHTML = combos.map(({ v1, v2 }) => {
    const V1 = VOICE[v1], V2 = VOICE[v2];
    const count = SONGS.filter(s => s.pairs.some(([a,b]) => (a===v1&&b===v2)||(a===v2&&b===v1))).length;
    return `
    <a class="combo-card" href="/duets/${v1}-${v2}.html">
      <div class="combo-emojis">${V1.emoji}${V2.emoji}</div>
      <div class="combo-name">${V1.display} &amp; ${V2.display}</div>
      <div class="combo-count">${count} songs</div>
      <div class="combo-ranges">${V1.range} · ${V2.range}</div>
    </a>`;
  }).join('\n');

  const schema = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "Home", "item": BASE_URL },
      { "@type": "ListItem", "position": 2, "name": "Duet Songs by Voice Type", "item": `${BASE_URL}/duets/` }
    ]
  });

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Duet Songs by Voice Type | All 25 Voice Combinations | HumMatch</title>
  <meta name="description" content="Browse the best duet songs for every voice-type combination — Bass, Baritone, Tenor, Mezzo-Soprano, and Soprano. 25 pairings with difficulty filters, occasion tags, and voting.">
  <meta name="robots" content="index, follow">
  <link rel="canonical" href="${BASE_URL}/duets/">
  <meta property="og:type" content="website">
  <meta property="og:title" content="Duet Songs by Voice Type | All 25 Combinations | HumMatch">
  <meta property="og:description" content="Find the perfect duet for your voice pairing. 25 voice-type combinations with curated songs, difficulty filters, and voting.">
  <script type="application/ld+json">${schema}</script>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    :root { --bg: #0d0b1a; --card: rgba(255,255,255,0.04); --border: rgba(124,58,237,0.15); --grad: linear-gradient(135deg, #A855F7, #EC4899); --purple: #A855F7; --pink: #EC4899; --text: #e2e0f0; --muted: rgba(255,255,255,0.45); --radius: 14px; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: var(--bg); color: var(--text); min-height: 100vh; }
    nav.topnav { display: flex; align-items: center; justify-content: space-between; padding: 14px 24px; border-bottom: 1px solid var(--border); position: sticky; top: 0; z-index: 50; background: rgba(13,11,26,0.92); backdrop-filter: blur(12px); }
    .logo { font-size: 1.2rem; font-weight: 800; text-decoration: none; background: var(--grad); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
    .nav-links { display: flex; gap: 8px; align-items: center; }
    .nav-link { color: var(--muted); text-decoration: none; font-size: 0.875rem; padding: 6px 12px; border-radius: 8px; }
    .nav-link:hover { color: var(--text); }
    .nav-btn { background: var(--grad); color: #fff; padding: 8px 18px; border-radius: 10px; text-decoration: none; font-weight: 700; font-size: 0.875rem; }
    .hero { max-width: 860px; margin: 0 auto; padding: 56px 24px 36px; text-align: center; }
    h1 { font-size: clamp(2rem, 5vw, 3rem); font-weight: 800; background: var(--grad); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; margin-bottom: 14px; }
    .lead { font-size: 1.05rem; color: var(--muted); max-width: 620px; margin: 0 auto 40px; line-height: 1.7; }
    .content { max-width: 1060px; margin: 0 auto; padding: 0 24px 80px; }
    .section-label { font-size: 0.8rem; color: var(--muted); font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 16px; }
    .combo-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px,1fr)); gap: 10px; }
    .combo-card { background: var(--card); border: 1px solid var(--border); border-radius: var(--radius); padding: 16px; text-decoration: none; color: var(--text); transition: border-color 0.2s, transform 0.15s; display: flex; flex-direction: column; gap: 4px; }
    .combo-card:hover { border-color: rgba(168,85,247,0.4); transform: translateY(-2px); }
    .combo-emojis { font-size: 1.5rem; margin-bottom: 4px; }
    .combo-name { font-weight: 700; font-size: 0.88rem; line-height: 1.3; }
    .combo-count { font-size: 0.78rem; color: var(--purple); font-weight: 600; margin-top: 2px; }
    .combo-ranges { font-size: 0.72rem; color: var(--muted); margin-top: 2px; }
    .cta-box { background: linear-gradient(135deg, rgba(168,85,247,0.12), rgba(236,72,153,0.12)); border: 1px solid rgba(168,85,247,0.25); border-radius: var(--radius); padding: 36px; text-align: center; margin-top: 56px; }
    .cta-box h2 { font-size: 1.5rem; font-weight: 800; margin-bottom: 10px; }
    .cta-box p { color: var(--muted); margin-bottom: 22px; }
    .cta-link { display: inline-block; background: var(--grad); color: #fff; font-weight: 700; padding: 13px 30px; border-radius: 12px; text-decoration: none; font-size: 1rem; }
    footer { border-top: 1px solid var(--border); padding: 28px 24px; text-align: center; font-size: 0.82rem; color: var(--muted); }
    footer a { color: var(--muted); text-decoration: none; margin: 0 8px; }
    @media (max-width: 580px) { .hero { padding: 36px 16px 24px; } .content { padding: 0 16px 60px; } .nav-links { display: none; } }
  </style>
</head>
<body>

<nav class="topnav">
  <a href="/" class="logo">HumMatch</a>
  <div class="nav-links">
    <a href="/baritone-songs.html" class="nav-link">Voice Types</a>
    <a href="/blog/" class="nav-link">Blog</a>
    <a href="/" class="nav-btn">Test My Voice →</a>
  </div>
</nav>

<div class="hero">
  <h1>Duet Songs by Voice Type</h1>
  <p class="lead">Browse curated song lists for all 25 voice-type pairings — Bass, Baritone, Tenor, Mezzo-Soprano, and Soprano. Find songs that fit your vocal range and your partner's, filtered by difficulty and occasion.</p>
</div>

<div class="content">
  <p class="section-label">All 25 Voice Combinations</p>
  <div class="combo-grid">
${cardsHTML}
  </div>

  <div class="cta-box">
    <h2>Find Your Voice Type First</h2>
    <p>Not sure if you're a baritone or tenor? Hum any melody and HumMatch detects your range in seconds.</p>
    <a href="/" class="cta-link">Test My Voice Free →</a>
  </div>
</div>

<footer>
  <a href="/">HumMatch</a>
  <a href="/baritone-songs.html">Voice Types</a>
  <a href="/easy-songs.html">Easy Songs</a>
  <a href="/blog/">Blog</a>
  <br><br>
  <span>© ${new Date().getFullYear()} HumMatch · Find songs that fit your voice</span>
</footer>

</body>
</html>`;
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
let count = 0;

// Generate index
fs.writeFileSync(path.join(OUT_DIR, 'index.html'), renderIndex(), 'utf8');
console.log('✓  duets/index.html');

// Generate all 25 combination pages
for (const v1 of VOICES) {
  for (const v2 of VOICES) {
    const filename = `${v1}-${v2}.html`;
    const outPath  = path.join(OUT_DIR, filename);
    fs.writeFileSync(outPath, renderPage(v1, v2), 'utf8');
    count++;
    console.log(`✓  duets/${filename}`);
  }
}

console.log(`\n✅  Generated ${count} duet pages + index → ./duets/`);
