# Twins Disney Trip 2026

Live agenda for our Walt Disney World trip, **Oct 28 – Nov 5 2026**.

**→ <https://omasabdullah.github.io/disney/>**

Unlisted: `noindex` on the page and `Disallow: /disney/` in `robots.txt`, so it
won't show up in search. Share the link directly.

---

## What it does

- **One continuous scroll.** All nine days render top to bottom in order — the
  airport, then Animal Kingdom, then Magic Kingdom, all the way to the flight
  home. Each day ends with a *"Day 3 done · keep scrolling → Day 4"* marker, so
  you're never left at a dead end wondering whether that was everything.
- **The nav bar is a map, not a switcher.** The day pills jump you to a day and
  then follow you as you scroll: the active pill, the accent colour and a thin
  progress line under the nav all track where you are in the trip. ← / → step
  between days.
- **Right now** — resolves the current time at the resort (`America/New_York`)
  no matter what timezone your phone is in, then shows what's happening, what's
  next, a live countdown, and a red "now" line that moves down the timeline as
  the day goes on. Before the trip it's a countdown to the 5:00 AM alarm.
  "Show in the agenda" drops you at that exact entry.
- **Who are you?** — pick your name and every Lightning Lane, table and room
  you're on is highlighted; everything you're *not* on dims. `Just <name>`
  strips all nine days down to only your items.
- **Park maps** — Disney's own guidemap for each of the four parks, with our
  Lightning Lanes, tables and shows pinned on top. Pinch or scroll to zoom,
  drag to move, tap a pin to see who's on it and when, then tap through to that
  entry in the agenda. Every park day card has an *"on the map"* link that
  flies you to the right pin. Pin labels lay themselves out so they never cover
  another pin, and *Everything* adds the big rides we haven't booked — useful
  when a Lightning Lane falls through and you need a plan B nearby.
- **Lightning Lane windows** — the return window renders as a bar that fills in
  real time, with "Open now · 34 min left to tap in" / "Opens in 50 min".
  Rider Switch and the kids who don't need a pass are flagged.
- **Works offline** — a service worker caches the whole app. Park wifi is bad
  and half of us are roaming from Toronto.
- **Add to calendar** — whole trip or a single day, generated in the browser.
- Live weather for Lake Buena Vista (Open-Meteo, keyless, fails silently).
- Light + dark mode, respects `prefers-reduced-motion`, installable to the
  home screen.

## No storage

Nothing is written to your device — no `localStorage`, no cookies. All state
lives in the URL:

```
/disney/?me=jon                # Jon's view
/disney/?day=4                 # opens scrolled to Hollywood Studios
/disney/?me=jon&day=4&only=1   # only Jon's items, landing on day 4
/disney/#day-7                 # also works

/disney/?map=hs                # park map explorer, Hollywood Studios
/disney/?map=hs&place=slinky   # ...zoomed and opened on Slinky Dog Dash
/disney/?map=mk&mday=7         # Magic Kingdom, showing day 7's pins only
/disney/?map=ak&all=1          # Animal Kingdom, every pin not just our plans
```

The `day` parameter updates itself as you scroll, so "copy link" always points
at what you're looking at. A personalised link is bookmarkable and shareable —
send each person theirs.

## Editing the agenda

Everything on screen is derived from one object: **`js/data.js`**.

| Want to change | Edit |
| --- | --- |
| A Lightning Lane time | that item's `t` / `end` |
| Who's riding | that item's `who` array (person ids) |
| A reservation | the `type: 'meal'` item |
| A person's name or room | the `PEOPLE` array |
| The "good to know" cards | the `NOTES` array |
| Which map pin an item points at | that item's `place` (see below) |

Times are 24-hour strings in resort local time. `who: 'all'` means all 16.
`riderSwitch: ['valencia']` adds the Rider Switch badge. People marked
`llExempt: true` (Aurora, Mateo, Layla, Skyla) get the "Lightning Lane not
required" asterisk automatically.

An item is matched to its map pin **by exact name**, so most items need nothing
doing. Where the agenda's wording differs from the place's name — *"Walk to the
entrance"* vs *"Park entrance"* — add `place: 'gate'` pointing at the pin's id
in `js/maps.js`. Matching is deliberately never fuzzy: a pin on the wrong ride
is worse than no pin at all.

After editing, **bump `CACHE` in `sw.js`** (e.g. `v2` → `v3`).

The service worker is deliberately **network-first**: when there's a usable
connection everyone always gets the current times, and the cache only kicks in
when the network doesn't answer within 2.5s. Showing someone a cached copy of
yesterday's Lightning Lane window would be worse than showing nothing.

The one exception is `maps/*.webp`, which is **cache-first** — those filenames
never change their contents, and racing a 680 KB download against a 2.5s
timeout on park wifi would feel broken.

```bash
git add -A && git commit -m "Update Lightning Lane times" && git push
```

## Editing the park maps

Pins live in **`js/maps.js`**, one entry per park, separate from `data.js` so
the agenda stays the single source of truth for times and people.

Coordinates are **fractions of the image**, `x` and `y` from 0 to 1, measured
from the top-left — so they survive the image being re-exported at a different
resolution. `x: 0.5, y: 0.5` is dead centre.

```js
{ id: 'slinky', name: 'Slinky Dog Dash', land: 'Toy Story Land',
  kind: 'll', x: 0.472, y: 0.305,
  note: 'Family coaster, no big drops. 38"/97 cm.' }
```

| Field | Does |
| --- | --- |
| `id` | what `place:` in `data.js` and `?place=` in the URL refer to |
| `name` | must match the agenda item's name exactly to auto-link |
| `alias` | extra names that should also match |
| `short` | shorter label drawn on the map when `name` is too long |
| `kind` | `ll` / `meal` / `show` / `gate` — picks the pin's colour and icon |
| `extra: true` | not in our plans; hidden until *Everything* is selected |
| `note` | the line under the name, e.g. height requirements |

To place a new pin, open the map at `?map=<key>`, zoom to the spot, and read
the coordinates off the illustration — or measure against the master PNG in
an image editor and divide by its width and height.

The images themselves are cropped from Disney's published guidemap PDFs (the
map side only, with the numbered attraction list trimmed off) and exported at
two sizes: `*-sm.webp` is precached so the map paints instantly, and the
full-resolution `*-full.webp` is swapped in once it arrives.

```bash
cwebp -q 76 -m 6 -af -pass 6 -sharp_yuv mk.png -o maps/mk-full.webp
```

New or renamed images must be added to `SHELL` in `sw.js`.

## Layout

```
disney/
  index.html            shell + inline SVG icon sprite
  css/app.css           design system (tokens, components, motion)
  js/data.js            ← the source of truth
  js/maps.js            park map pins and coordinates
  js/app.js             rendering, live clock, filtering, maps, .ics, weather
  maps/                 guidemap images, 2 sizes per park
  sw.js                 offline cache
  manifest.webmanifest  home-screen install
  icons/
```

No build step, no dependencies, no server. Plain files served by GitHub Pages.

## Local preview

```bash
python3 -m http.server 8765
open http://localhost:8765/disney/
```
