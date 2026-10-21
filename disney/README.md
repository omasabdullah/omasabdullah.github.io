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

Times are 24-hour strings in resort local time. `who: 'all'` means all 16.
`riderSwitch: ['valencia']` adds the Rider Switch badge. People marked
`llExempt: true` (Aurora, Mateo, Layla, Skyla) get the "Lightning Lane not
required" asterisk automatically.

After editing, **bump `CACHE` in `sw.js`** (e.g. `v2` → `v3`).

The service worker is deliberately **network-first**: when there's a usable
connection everyone always gets the current times, and the cache only kicks in
when the network doesn't answer within 2.5s. Showing someone a cached copy of
yesterday's Lightning Lane window would be worse than showing nothing.

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
