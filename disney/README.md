# Twins Disney Trip 2026

Live agenda for our Walt Disney World trip, **Oct 28 – Nov 5 2026**.

**→ <https://omasabdullah.github.io/disney/>**

Unlisted: `noindex` on the page and `Disallow: /disney/` in `robots.txt`, so it
won't show up in search. Share the link directly.

---

## What it does

- **Right now** — resolves the current time at the resort (`America/New_York`)
  no matter what timezone your phone is in, then shows what's happening, what's
  next, a live countdown, and a red "now" line in the timeline. Before the trip
  it's a countdown to the 5:00 AM alarm.
- **Who are you?** — pick your name and every Lightning Lane, table and room
  you're on is highlighted; everything you're *not* on dims. `Just <name>`
  strips the day down to only your items.
- **Lightning Lane windows** — the return window renders as a bar that fills in
  real time, with "Open now · 34 min left to tap in" / "Opens in 50 min".
  Rider Switch and the kids who don't need a pass are flagged.
- **Nine days** — swipe, tap the day pills, or use ← / → on a keyboard.
- **Works offline** — a service worker pre-caches the whole app. Park wifi is
  bad and half of us are roaming from Toronto.
- **Add to calendar** — whole trip or a single day, generated in the browser.
- Live weather for Lake Buena Vista (Open-Meteo, keyless, fails silently).
- Light + dark mode, respects `prefers-reduced-motion`, installable to the
  home screen.

## No storage

Nothing is written to your device — no `localStorage`, no cookies. All state
lives in the URL:

```
/disney/?me=jon          # Jon's view
/disney/?day=4           # Hollywood Studios
/disney/?me=jon&day=4&only=1   # only what Jon is on, that day
```

So a personalised link is bookmarkable and shareable. Send each person theirs.

## Editing the agenda

Everything on screen is derived from one object: **`js/data.js`**.

| Want to change | Edit |
| --- | --- |
| A Lightning Lane time | that item's `t` / `end` |
| Who's riding | that item's `who` array (person ids) |
| A reservation | the `type: 'meal'` item |
| A person's name or room | the `PEOPLE` array |
| The "good to know" cards | the `NOTES` array |

Times are 24-hour strings in resort local time. `who: 'all'` means all 16.
`riderSwitch: ['valencia']` adds the Rider Switch badge. People marked
`llExempt: true` (Aurora, Mateo, Layla, Skyla) get the "Lightning Lane not
required" asterisk automatically.

After editing, **bump `CACHE` in `sw.js`** (e.g. `disney-2026-v2`) so phones
that already have the old version pick up the change.

```bash
git add -A && git commit -m "Update Lightning Lane times" && git push
```

## Layout

```
disney/
  index.html            shell + inline SVG icon sprite
  css/app.css           design system (tokens, components, motion)
  js/data.js            ← the source of truth
  js/app.js             rendering, live clock, filtering, .ics, weather
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
