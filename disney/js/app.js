/* ============================================================================
   Twins Disney Trip 2026 — app
   Vanilla JS. No storage: all state lives in the URL so links are shareable.
   ========================================================================== */
(function () {
  'use strict';

  /* ------------------------------------------------------------- helpers -- */

  const $ = (s, r) => (r || document).querySelector(s);
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const svg = (id, cls) =>
    `<svg class="ic${cls ? ' ' + cls : ''}" width="1em" height="1em" viewBox="0 0 24 24"` +
    ` aria-hidden="true" focusable="false"><use href="#${id}"/></svg>`;

  const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------------------------------------------------------------- time -- */
  /* Everything is anchored to resort time so the page reads the same whether
     you're in Toronto, Orlando, or on a plane in between.                    */

  const TZ = TRIP.tz;
  const _dtf = new Intl.DateTimeFormat('en-US', {
    timeZone: TZ, hour12: false,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });

  function tzOffsetMs(utcMs) {
    const p = {};
    for (const part of _dtf.formatToParts(new Date(utcMs))) p[part.type] = part.value;
    const asUTC = Date.UTC(+p.year, p.month - 1, +p.day, (+p.hour) % 24, +p.minute, +p.second);
    return asUTC - utcMs;
  }

  /** Wall-clock time at the resort -> epoch ms. */
  function atResort(dateStr, hhmm) {
    const [y, m, d] = dateStr.split('-').map(Number);
    const [hh, mi] = (hhmm || '00:00').split(':').map(Number);
    const naive = Date.UTC(y, m - 1, d, hh, mi);
    let ms = naive - tzOffsetMs(naive);
    ms = naive - tzOffsetMs(ms); // settle across DST edges (Nov 1!)
    return ms;
  }

  /** Today's date at the resort, as YYYY-MM-DD. */
  function resortToday() {
    const p = {};
    for (const part of _dtf.formatToParts(new Date())) p[part.type] = part.value;
    return `${p.year}-${p.month}-${p.day}`;
  }

  function fmt12(hhmm) {
    const [h, m] = hhmm.split(':').map(Number);
    const mer = h >= 12 ? 'PM' : 'AM';
    const hr = h % 12 === 0 ? 12 : h % 12;
    return { t: `${hr}:${String(m).padStart(2, '0')}`, mer };
  }
  const fmt12s = (hhmm) => { const f = fmt12(hhmm); return `${f.t} ${f.mer}`; };

  function longDate(dateStr) {
    const [y, m, d] = dateStr.split('-').map(Number);
    return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-US', {
      weekday: 'long', month: 'long', day: 'numeric', timeZone: 'UTC',
    });
  }
  function shortDate(dateStr) {
    const [y, m, d] = dateStr.split('-').map(Number);
    return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-US', {
      weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC',
    });
  }

  /** Humanised gap, e.g. "1 h 24 m" / "7 min". */
  function dur(ms) {
    const mins = Math.max(0, Math.round(ms / 60000));
    if (mins < 60) return `${mins} min`;
    const h = Math.floor(mins / 60), m = mins % 60;
    const dys = Math.floor(h / 24);
    if (dys >= 1) return `${dys} day${dys > 1 ? 's' : ''} ${h % 24} h`;
    return m ? `${h} h ${m} m` : `${h} h`;
  }

  /* -------------------------------------------------------------- people -- */

  const BY_ID = {};
  PEOPLE.forEach((p) => { BY_ID[p.id] = p; });
  const ALL_IDS = PEOPLE.map((p) => p.id);
  const ROOM_BY_ID = {};
  ROOMS.forEach((r) => { ROOM_BY_ID[r.id] = r; });

  const initials = (p) => p.name.slice(0, 2);
  const whoIds = (item) => {
    if (item.who === 'all') return ALL_IDS.slice();
    if (Array.isArray(item.who)) return item.who;
    if (item.subs) {
      const out = [];
      item.subs.forEach((s) => (s.who || []).forEach((i) => { if (!out.includes(i)) out.push(i); }));
      return out;
    }
    return null; // group-wide: applies to all of us
  };

  function avatar(id, cls) {
    const p = BY_ID[id];
    if (!p) return '';
    const mine = id === state.me ? ' is-me' : '';
    const ex = p.llExempt ? ' exempt' : '';
    return `<span class="av${cls ? ' ' + cls : ''}${mine}${ex}" style="--h:${p.hue}"
      title="${esc(p.name)}" aria-label="${esc(p.name)}">${esc(initials(p))}</span>`;
  }
  function chip(id, item) {
    const p = BY_ID[id];
    if (!p) return '';
    const rs = item && item.riderSwitch && item.riderSwitch.includes(id);
    const star = item && item.type === 'll' && p.llExempt ? '<span class="rs">*</span>' : '';
    return `<span class="chip${id === state.me ? ' is-me' : ''}">${avatar(id, 'xs')}
      ${esc(p.name)}${star}${rs ? '<span class="rs">Rider Switch</span>' : ''}</span>`;
  }

  /* ------------------------------------------------------- derived model -- */

  const TYPE_META = {
    travel:   { icon: 'i-bus',    label: 'Travel',   mins: 45 },
    flight:   { icon: 'i-plane',  label: 'Flight',   mins: 180 },
    park:     { icon: 'i-castle', label: 'Park',     mins: 60 },
    resort:   { icon: 'i-bed',    label: 'Resort',   mins: 45 },
    show:     { icon: 'i-show',   label: 'Show',     mins: 40 },
    pool:     { icon: 'i-pool',   label: 'Pool',     mins: 60 },
    split:    { icon: 'i-split',  label: 'Split up', mins: 45 },
    optional: { icon: 'i-star',   label: 'Optional', mins: 60 },
    meal:     { icon: 'i-fork',   label: 'Meal',     mins: 90 },
    ll:       { icon: 'i-bolt',   label: 'Lightning Lane', mins: 60 },
  };

  // Flatten + stamp absolute times once.
  const FLAT = [];
  DAYS.forEach((day) => {
    day.items.sort((a, b) => (a.t < b.t ? -1 : a.t > b.t ? 1 : 0));
    day.items.forEach((item, i) => {
      item._day = day;
      item._key = `d${day.n}-${i}`;
      item._start = atResort(day.date, item.t);
      item._end = item.end ? atResort(day.date, item.end) : null;
      item._who = whoIds(item);
      FLAT.push(item);
    });
  });
  FLAT.sort((a, b) => a._start - b._start);
  FLAT.forEach((item, i) => {
    const meta = TYPE_META[item.type] || TYPE_META.travel;
    const next = FLAT[i + 1];
    const cap = item._end || (item._start + meta.mins * 60000);
    item._stop = next ? Math.min(cap, Math.max(next._start, item._start + 5 * 60000)) : cap;
  });

  const TRIP_START = FLAT[0]._start;
  const TRIP_END = FLAT[FLAT.length - 1]._stop;

  const MEALS = FLAT.filter((i) => i.type === 'meal');

  /* --------------------------------------------------------------- state -- */

  const state = { me: null, dayN: null, mineOnly: false, open: {} };

  function readURL() {
    const q = new URLSearchParams(location.search);
    const me = q.get('me');
    state.me = me && BY_ID[me] ? me : null;
    const d = parseInt(q.get('day'), 10);
    state.dayN = d >= 1 && d <= DAYS.length ? d : null;
    state.mineOnly = q.get('only') === '1' && !!state.me;
  }
  function writeURL(push) {
    const q = new URLSearchParams();
    if (state.me) q.set('me', state.me);
    if (state.dayN) q.set('day', String(state.dayN));
    if (state.mineOnly) q.set('only', '1');
    const url = location.pathname + (q.toString() ? '?' + q : '') + location.hash;
    history[push ? 'pushState' : 'replaceState']({}, '', url);
  }

  function defaultDayN() {
    const today = resortToday();
    const hit = DAYS.find((d) => d.date === today);
    if (hit) return hit.n;
    if (Date.now() < TRIP_START) return 1;
    if (Date.now() > TRIP_END) return DAYS.length;
    // mid-trip but today isn't a listed date (shouldn't happen) — nearest
    let best = DAYS[0];
    DAYS.forEach((d) => {
      if (Math.abs(atResort(d.date, '12:00') - Date.now()) <
          Math.abs(atResort(best.date, '12:00') - Date.now())) best = d;
    });
    return best.n;
  }

  const currentDay = () => DAYS[(state.dayN || 1) - 1];
  const isMine = (item) => !!state.me && !!item._who && item._who.includes(state.me);
  // A card with sub-bookings (the sunset dinners) concerns the whole group even
  // if you personally aren't on one of the tables — never hide or dim it.
  const notMine = (item) =>
    !!state.me && !!item._who && !item.subs && !item._who.includes(state.me);

  /* ------------------------------------------------------------ day strip -- */

  function renderStrip() {
    const today = resortToday();
    $('#daystrip').innerHTML = DAYS.map((d) => `
      <button class="daypill" role="tab" data-day="${d.n}" data-theme="${d.theme}"
        aria-selected="${d.n === state.dayN}" style="--pill:var(--accent)">
        <span class="dp-day">${d.date === today
          ? '<span class="dot"></span><span class="vh">Today, </span>' : ''
        }Day ${d.n} · ${esc(shortDate(d.date).split(', ')[1])}</span>
        <span class="dp-name">${esc(d.kicker)}</span>
      </button>`).join('');

    const sel = $('.daypill[aria-selected="true"]', $('#daystrip'));
    if (sel) sel.scrollIntoView({ block: 'nearest', inline: 'center', behavior: REDUCED ? 'auto' : 'smooth' });
  }

  /* --------------------------------------------------------------- cards -- */

  function llWindow(item) {
    const label = item.windowLabel || 'Return window';
    return `<span class="llwin">
        <span class="llwin-top"><span>${esc(label)}</span>
        <span>${fmt12s(item.t)} – ${fmt12s(item.end)}</span></span>
        <span class="llbar" data-bar="${item._key}"><i></i></span>
      </span>
      <span class="llstate" data-llstate="${item._key}"></span>`;
  }

  function whoRow(item) {
    if (!item._who) return '';
    const all = item._who.length === ALL_IDS.length;
    const shown = item._who.slice(0, 5);
    return `<span class="whorow">
      <span class="count">${all ? `All ${ALL_IDS.length}` : `${item._who.length} people`}</span>
      ${shown.map((id) => avatar(id)).join('')}
      ${item._who.length > shown.length ? `<span class="count">+${item._who.length - shown.length}</span>` : ''}
    </span>`;
  }

  function moreBlock(item) {
    if (!item._who) return '';
    const hasEx = item.type === 'll' && item._who.some((id) => BY_ID[id] && BY_ID[id].llExempt);
    return `<span class="card-more"><span><span class="more-inner">
      <span class="lbl">Who's on this</span>
      <span class="chips">${item._who.map((id) => chip(id, item)).join('')}</span>
      ${hasEx ? '<span class="fine">* Lightning Lane not required &mdash; rides with an adult.</span>' : ''}
      ${item.riderSwitch && item.riderSwitch.length
        ? `<span class="fine">${item.riderSwitch.map((i) => esc(BY_ID[i].name)).join(', ')} uses Rider Switch so someone always stays with the twins.</span>` : ''}
    </span></span></span>${svg('i-chev', 'card-caret')}`;
  }

  function subsBlock(item) {
    if (!item.subs) return '';
    return `<span class="subs">${item.subs.map((s) => {
      const mine = state.me && (s.who || []).includes(state.me);
      return `<span class="sub${mine ? ' is-mine' : ''}">
        <span class="s-t">${fmt12s(s.t)}</span>
        <span class="s-n">${esc(s.title)}</span>
        <span class="s-w">${(s.who || []).map((id) => chip(id)).join('')}</span>
        ${s.note ? `<span class="s-note">${esc(s.note)}</span>` : ''}
      </span>`;
    }).join('')}</span>${state.me && !item._who.includes(state.me)
      ? `<span class="card-note"><strong>No table listed for ${esc(BY_ID[state.me].name)} in the agenda.</strong></span>` : ''}`;
  }

  function kindLabel(item) {
    if (item.type === 'll') return `Lightning Lane · ${item.pass === 'single' ? 'Single Pass' : 'Multi Pass'}`;
    if (item.type === 'meal') return `${item.meal} reservation`;
    if (item.type === 'optional') return 'Optional';
    return (TYPE_META[item.type] || {}).label || '';
  }

  function itemHTML(item, idx) {
    const meta = TYPE_META[item.type] || TYPE_META.travel;
    const feat = item.type === 'll' || item.type === 'meal';
    const interactive = !!item._who;
    const tag = interactive ? 'button' : 'span';
    const mine = isMine(item);
    const dim = state.me && notMine(item) && !state.mineOnly;
    const f = fmt12(item.t);

    const inner = `
      <span class="card-kind">${svg(meta.icon)}<span>${esc(kindLabel(item))}</span>
        ${mine ? '<span class="mine-flag">You</span>' : ''}</span>
      <span class="card-title">${item.title}</span>
      ${item.type === 'll' && item.end ? llWindow(item) : ''}
      ${item.split ? '<span class="tag plain" style="margin-top:.45rem">Split into 2 groups</span>' : ''}
      ${item.note ? `<span class="card-note">${esc(item.note)}</span>` : ''}
      ${subsBlock(item)}
      ${item.subs ? '' : whoRow(item)}
      ${moreBlock(item)}`;

    return `<li class="tl-item k-${item.type}${dim ? ' is-dim' : ''} reveal" style="--i:${Math.min(idx, 10)}">
      <span class="tl-time${item.timeLabel ? ' is-label' : ''}">${item.timeLabel
        ? esc(item.timeLabel)
        : `<span>${item.approx ? '~' : ''}${f.t}</span><span class="mer">${f.mer}</span>`}</span>
      <span class="tl-body">
        <span class="tl-node"></span>
        <${tag} class="card${feat ? ' feat' : ''}${mine ? ' is-mine' : ''} k-${item.type}"
          ${interactive ? `type="button" aria-expanded="${state.open[item._key] ? 'true' : 'false'}" data-exp="${item._key}"` : ''}>
          ${inner}
        </${tag}>
      </span>
    </li>`;
  }

  /* ------------------------------------------------------------ day view -- */

  function renderDay() {
    const day = currentDay();
    const today = resortToday();
    const isToday = day.date === today;
    let items = day.items;
    if (state.mineOnly && state.me) items = items.filter((i) => !notMine(i));

    const llCount = day.items.filter((i) => i.type === 'll').length;
    const mealCount = day.items.filter((i) => i.type === 'meal').length;

    let rows = '';
    let markerDone = !isToday;
    items.forEach((item, i) => {
      if (!markerDone && item._start > Date.now()) {
        rows += nowMarkerHTML();
        markerDone = true;
      }
      rows += itemHTML(item, i);
    });
    if (!markerDone && isToday) rows += nowMarkerHTML();

    $('#dayWrap').innerHTML = `
      <p class="eyebrow">${isToday ? 'Today' : `Day ${day.n} of ${DAYS.length}`} · ${esc(longDate(day.date))}</p>
      <div class="dayhead swapin" data-theme="${day.theme}">
        <span class="dh-top">
          <span>Day ${day.n}</span>
          <span>·</span>
          <span>${esc(shortDate(day.date))}</span>
          ${day.badge ? `<span class="dh-badge">${esc(day.badge)}</span>` : ''}
          ${isToday ? '<span class="dh-badge">Today</span>' : ''}
        </span>
        <h2 class="dh-title">${esc(day.title)}</h2>
        <p class="dh-hours">${esc(day.hours)}</p>
        <div class="dh-foot">
          ${llCount ? `<span class="dh-chip">${svg('i-bolt')} ${llCount} Lightning Lane${llCount > 1 ? 's' : ''}</span>` : ''}
          ${mealCount ? `<span class="dh-chip">${svg('i-fork')} ${mealCount} booking${mealCount > 1 ? 's' : ''}</span>` : ''}
          <span class="dh-chip" id="dayWeather" hidden></span>
          <button class="dh-chip" id="icsDay">${svg('i-cal')} Add this day</button>
        </div>
      </div>

      <div class="dayswitch">
        <button class="ds-btn" data-day="${day.n - 1}" ${day.n <= 1 ? 'disabled' : ''}>
          ${svg('i-chevl')} ${day.n > 1 ? esc(DAYS[day.n - 2].kicker) : 'Back'}
        </button>
        <button class="ds-btn" data-day="${day.n + 1}" ${day.n >= DAYS.length ? 'disabled' : ''}>
          ${day.n < DAYS.length ? esc(DAYS[day.n].kicker) : 'Next'} ${svg('i-chevr')}
        </button>
      </div>

      <div class="filterbar">
        <span class="seg" role="group" aria-label="Filter the day">
          <button data-only="0" aria-pressed="${!state.mineOnly}">Everyone</button>
          <button data-only="1" aria-pressed="${state.mineOnly}">${state.me ? 'Just ' + esc(BY_ID[state.me].name) : 'Just me'}</button>
        </span>
        <span class="filter-hint">${state.me
          ? (state.mineOnly ? 'Showing only what you’re on.' : 'Your items are highlighted.')
          : 'Pick yourself up top to filter.'}</span>
      </div>

      <ol class="timeline">${rows}</ol>`;

    document.body.dataset.theme = day.theme;
    $('#dayBand').dataset.theme = day.theme;
    observeReveals($('#dayWrap'));
    tick();
    loadDayWeather(day);
  }

  function nowMarkerHTML() {
    const now = new Date().toLocaleTimeString('en-US',
      { timeZone: TZ, hour: 'numeric', minute: '2-digit' });
    return `<li class="nowmark"><span class="nm-t">Now<br>${esc(now)}</span><span class="nm-l"></span></li>`;
  }

  /* ------------------------------------------------------------ live now -- */

  function cdCell(n, l) {
    return `<span class="cd-cell"><span class="cd-num">${n}</span><span class="cd-lbl">${l}</span></span>`;
  }

  function renderHeroLive() {
    const now = Date.now();
    const host = $('#heroLive');

    if (now < TRIP_START) {
      const ms = TRIP_START - now;
      const d = Math.floor(ms / 86400000);
      const h = Math.floor(ms / 3600000) % 24;
      const m = Math.floor(ms / 60000) % 60;
      const s = Math.floor(ms / 1000) % 60;
      host.innerHTML = `<div class="countdown">
        <div class="countdown-grid">
          ${cdCell(d, 'Days')}${cdCell(h, 'Hours')}${cdCell(m, 'Min')}${cdCell(s, 'Sec')}
        </div>
        <p class="eyebrow" style="color:rgba(255,255,255,.6)">Until the 5:00 AM alarm</p>
      </div>`;
      return;
    }
    if (now > TRIP_END) {
      host.innerHTML = `<div class="hero-nowcard">
        <span class="nc-eyebrow">${svg('i-star')} That's a wrap</span>
        <p class="nc-title">Home, and somehow still tired</p>
        <p class="nc-meta">Nine days, four rooms, sixteen of us. Browse any day below.</p>
      </div>`;
      return;
    }

    const cur = FLAT.filter((i) => i._start <= now && i._stop > now).pop();
    const next = FLAT.find((i) => i._start > now);
    host.innerHTML = `<div class="hero-nowcard">
      <span class="nc-eyebrow"><span class="pulse"></span> ${cur ? 'Happening now' : 'Up next'}</span>
      <p class="nc-title">${(cur || next || {}).title || 'Free time'}</p>
      <p class="nc-meta">${cur
        ? (next ? `Next: ${esc(next.title)} at ${fmt12s(next.t)}` : 'Last thing on the list.')
        : (next ? `Starts at ${fmt12s(next.t)} · in ${dur(next._start - now)}` : 'Nothing left today.')}</p>
    </div>`;
  }

  function liveCard(kind, item, now) {
    if (!item) {
      return `<div class="livecard is-empty">
        <p class="lc-title">Free time</p>
        <p class="lc-note">Nothing booked. Wander, snack, nap.</p>
      </div>`;
    }
    const meta = TYPE_META[item.type] || TYPE_META.travel;
    const mine = isMine(item);
    const notme = notMine(item);
    const live = kind === 'now';
    let count = '';
    if (live && item._end && item._end > now) count = `${dur(item._end - now)} left in the window`;
    else if (!live) count = `in ${dur(item._start - now)}`;

    return `<div class="livecard${live ? ' is-now' : ''} k-${item.type}" data-theme="${item._day.theme}">
      <p class="lc-eyebrow">${live ? '<span class="pulse"></span>' : svg('i-clock')}
        ${live ? 'Happening now' : 'Next up'}</p>
      <h3 class="lc-title">${item.title}</h3>
      <p class="lc-when">${esc(kindLabel(item))} · ${item.timeLabel ? esc(item.timeLabel) : fmt12s(item.t)}${item.end ? ` – ${fmt12s(item.end)}` : ''}</p>
      ${count ? `<p class="lc-count">${esc(count)}</p>` : ''}
      ${item.note ? `<p class="lc-note">${esc(item.note)}</p>` : ''}
      ${state.me && item._who ? `<p class="lc-note"><strong>${mine ? 'You’re on this one.' : ''}${notme ? 'Not your group — you’re free.' : ''}</strong></p>` : ''}
      ${item._who ? whoRow(item) : ''}
    </div>`;
  }

  function renderNow() {
    const now = Date.now();
    const grid = $('#nowGrid');

    if (now < TRIP_START) {
      const d1 = DAYS[0];
      $('#nowTitle').textContent = 'Not long now';
      grid.innerHTML = `
        <div class="livecard" data-theme="${d1.theme}">
          <p class="lc-eyebrow">${svg('i-clock')} First move</p>
          <h3 class="lc-title">${esc(d1.items[0].title)}</h3>
          <p class="lc-when">${esc(longDate(d1.date))} · ${fmt12s(d1.items[0].t)}</p>
          <p class="lc-count">${esc(dur(TRIP_START - now))}</p>
          <p class="lc-note">This page goes live the moment the trip starts: what's happening right now, what's next, and whether you're on it.</p>
        </div>
        <div class="livecard" data-theme="rest">
          <p class="lc-eyebrow">${svg('i-user')} Make it yours</p>
          <h3 class="lc-title">Tap &ldquo;Who are you?&rdquo;</h3>
          <p class="lc-note">Pick your name and every Lightning Lane, table and room you&rsquo;re on gets highlighted. The choice lives in the link, so bookmark it or send it to your own phone.</p>
        </div>`;
      return;
    }
    if (now > TRIP_END) {
      $('#nowTitle').textContent = 'The trip';
      grid.innerHTML = `<div class="livecard is-empty"><p class="lc-title">All nine days are below</p>
        <p class="lc-note">Tap any day to relive it.</p></div>`;
      return;
    }

    const cur = FLAT.filter((i) => i._start <= now && i._stop > now).pop();
    const next = FLAT.find((i) => i._start > now);
    $('#nowTitle').textContent = 'Right now';
    grid.innerHTML = liveCard('now', cur, now) + liveCard('next', next, now);
  }

  /* -------------------------------------------------------------- statics -- */

  function renderRooms() {
    $('#roomGrid').innerHTML = ROOMS.map((r) => {
      const ppl = PEOPLE.filter((p) => p.room === r.id);
      const mine = state.me && BY_ID[state.me].room === r.id;
      return `<div class="room reveal${mine ? ' is-mine' : ''}">
        <h3>${esc(r.name)}</h3>
        <p class="sec-sub" style="margin-top:.25rem">${esc(r.blurb)}</p>
        <div class="r-who">${ppl.map((p) =>
          `<button class="chip${p.id === state.me ? ' is-me' : ''}" data-pick="${p.id}">
            ${avatar(p.id, 'xs')} ${esc(p.name)}</button>`).join('')}</div>
      </div>`;
    }).join('');
    observeReveals($('#roomGrid'));
  }

  function renderDining() {
    $('#dineList').innerHTML = MEALS.map((m) => {
      const mine = !state.me || !m._who || m._who.includes(state.me);
      return `<div class="dine reveal">
        <span class="d-when">${fmt12s(m.t)}</span>
        <span class="d-name">${esc(m.title)}</span>
        <span class="d-meta">${esc(m.meal)} · ${esc(shortDate(m._day.date))} · ${esc(m._day.kicker)}</span>
        ${m.note ? `<span class="d-meta">${esc(m.note)}</span>` : ''}
        ${m.subs ? `<span class="d-meta">${m.subs.map((s) =>
          `${fmt12s(s.t)} ${esc(s.title)} — ${(s.who || []).map((i) => esc(BY_ID[i].name)).join(', ')}`).join('<br>')}</span>` : ''}
        <span class="d-day"><button class="chip" data-day="${m._day.n}">${svg('i-chevr')} Day ${m._day.n}</button>
          ${state.me && !mine ? '<span class="tag plain">Not your table</span>' : ''}
          ${state.me && mine ? '<span class="tag plain">You</span>' : ''}</span>
      </div>`;
    }).join('');
    observeReveals($('#dineList'));
  }

  function renderNotes() {
    const icons = { bolt: 'i-bolt', meal: 'i-fork', bus: 'i-bus', split: 'i-split' };
    $('#noteList').innerHTML = NOTES.map((n) => `<div class="note-card reveal">
      <h3>${svg(icons[n.icon] || 'i-star')} ${esc(n.title)}</h3>
      <p>${esc(n.body)}</p>
    </div>`).join('');
    observeReveals($('#noteList'));
  }

  /* ---------------------------------------------------------- who dialog -- */

  function renderPeopleGrid() {
    $('#peopleGrid').innerHTML = PEOPLE.map((p) => `
      <button class="pbtn" data-pick="${p.id}" aria-pressed="${p.id === state.me}">
        ${avatar(p.id, 'lg')}
        <span class="pn">${esc(p.name)}</span>
        <span class="pr">${esc(ROOM_BY_ID[p.room].name.replace(' Suite', '').replace(' Room', ''))}</span>
      </button>`).join('');
  }

  function renderWhoBtn() {
    const inner = $('#whoBtnInner');
    const btn = $('#whoBtn');
    if (state.me) {
      btn.classList.add('is-set');
      inner.classList.remove('ph');
      inner.innerHTML = `${avatar(state.me)} <span>${esc(BY_ID[state.me].name)}</span>`;
    } else {
      btn.classList.remove('is-set');
      inner.classList.add('ph');
      inner.textContent = 'Who are you?';
    }
  }

  function setMe(id) {
    state.me = id && BY_ID[id] ? id : null;
    if (!state.me) state.mineOnly = false;
    writeURL();
    renderWhoBtn();
    renderPeopleGrid();
    renderDay();
    renderRooms();
    renderDining();
    renderNow();
  }

  /* ----------------------------------------------------------------- ics -- */

  const pad = (n) => String(n).padStart(2, '0');
  function icsStamp(ms) {
    const d = new Date(ms);
    return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T` +
      `${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}00Z`;
  }
  function icsEsc(s) {
    return String(s).replace(/\\/g, '\\\\').replace(/;/g, '\\;')
      .replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
  }
  function fold(line) {
    const out = [];
    let s = line;
    while (s.length > 72) { out.push(s.slice(0, 72)); s = ' ' + s.slice(72); }
    out.push(s);
    return out.join('\r\n');
  }
  function buildICS(items, name) {
    const L = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Twins Disney Trip 2026//EN',
      'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', `X-WR-CALNAME:${icsEsc(name)}`];
    items.forEach((i) => {
      const meta = TYPE_META[i.type] || TYPE_META.travel;
      const end = i._end || (i._start + meta.mins * 60000);
      const who = i._who ? (i._who.length === ALL_IDS.length ? 'Everyone'
        : i._who.map((x) => BY_ID[x].name).join(', ')) : 'Whole group';
      const desc = [kindLabel(i), i.note, `Who: ${who}`].filter(Boolean).join('\n');
      L.push('BEGIN:VEVENT',
        fold(`UID:${i._key}@disney2026`),
        `DTSTAMP:${icsStamp(Date.now())}`,
        `DTSTART:${icsStamp(i._start)}`,
        `DTEND:${icsStamp(end)}`,
        fold(`SUMMARY:${icsEsc(i.title.replace(/[“”]/g, '"'))}`),
        fold(`DESCRIPTION:${icsEsc(desc)}`),
        fold(`LOCATION:${icsEsc(i._day.kicker)}`),
        'END:VEVENT');
    });
    L.push('END:VCALENDAR');
    return L.join('\r\n');
  }
  function download(text, filename) {
    const blob = new Blob([text], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  }

  /* ------------------------------------------------------------- weather -- */

  const WX = {
    0: ['Clear', '☀️'], 1: ['Mostly clear', '🌤'], 2: ['Partly cloudy', '⛅'], 3: ['Overcast', '☁️'],
    45: ['Fog', '🌫'], 48: ['Fog', '🌫'], 51: ['Light drizzle', '🌦'], 53: ['Drizzle', '🌦'],
    55: ['Drizzle', '🌦'], 61: ['Light rain', '🌧'], 63: ['Rain', '🌧'], 65: ['Heavy rain', '🌧'],
    80: ['Showers', '🌦'], 81: ['Showers', '🌧'], 82: ['Heavy showers', '⛈'],
    95: ['Thunderstorms', '⛈'], 96: ['Thunderstorms', '⛈'], 99: ['Thunderstorms', '⛈'],
  };
  const cToF = (c) => Math.round(c * 9 / 5 + 32);

  async function loadCurrentWeather() {
    try {
      const u = `https://api.open-meteo.com/v1/forecast?latitude=${TRIP.coords.lat}` +
        `&longitude=${TRIP.coords.lon}&current=temperature_2m,weather_code&timezone=${encodeURIComponent(TZ)}`;
      const r = await fetch(u, { cache: 'no-store' });
      if (!r.ok) return;
      const j = await r.json();
      const t = Math.round(j.current.temperature_2m);
      const w = WX[j.current.weather_code] || ['', ''];
      $('#heroWeather').textContent =
        `${w[1]}  ${w[0]} at Walt Disney World · ${t}°C / ${cToF(t)}°F`;
    } catch (e) { /* offline is fine */ }
  }

  async function loadDayWeather(day) {
    const host = $('#dayWeather');
    if (!host) return;
    try {
      const u = `https://api.open-meteo.com/v1/forecast?latitude=${TRIP.coords.lat}` +
        `&longitude=${TRIP.coords.lon}&daily=temperature_2m_max,temperature_2m_min,weather_code,` +
        `precipitation_probability_max&timezone=${encodeURIComponent(TZ)}` +
        `&start_date=${day.date}&end_date=${day.date}`;
      const r = await fetch(u);
      if (!r.ok) return;
      const j = await r.json();
      const d = j.daily;
      if (!d || !d.time || !d.time.length) return;
      const w = WX[d.weather_code[0]] || ['', ''];
      const hi = Math.round(d.temperature_2m_max[0]);
      const lo = Math.round(d.temperature_2m_min[0]);
      host.innerHTML = `${w[1]} ${esc(w[0])} · ${hi}° / ${lo}°C` +
        (d.precipitation_probability_max[0] != null ? ` · ${d.precipitation_probability_max[0]}% rain` : '');
      host.hidden = false;
    } catch (e) { /* forecast only reaches ~16 days out */ }
  }

  /* ---------------------------------------------------------------- tick -- */

  function tick() {
    const now = Date.now();
    renderHeroLive();
    renderNow();

    // Lightning Lane window bars
    DAYS.forEach((day) => day.items.forEach((item) => {
      if (item.type !== 'll' || !item._end) return;
      const bar = document.querySelector(`[data-bar="${item._key}"]`);
      const st = document.querySelector(`[data-llstate="${item._key}"]`);
      if (!bar || !st) return;
      const span = item._end - item._start;
      let p = (now - item._start) / span;
      p = Math.max(0, Math.min(1, p));
      bar.style.setProperty('--p', (p * 100).toFixed(1) + '%');
      if (now < item._start) {
        bar.classList.remove('is-live');
        st.textContent = now > item._start - 6 * 3600000
          ? `Opens in ${dur(item._start - now)}` : '';
      } else if (now <= item._end) {
        bar.classList.add('is-live');
        st.textContent = `Open now · ${dur(item._end - now)} left to tap in`;
      } else {
        bar.classList.remove('is-live');
        st.textContent = 'Window closed';
      }
    }));
  }

  /* -------------------------------------------------------------- reveal -- */

  let io = null;
  function observeReveals(root) {
    if (REDUCED) {
      (root || document).querySelectorAll('.reveal').forEach((n) => n.classList.add('in'));
      return;
    }
    if (!io) {
      io = new IntersectionObserver((ents) => {
        ents.forEach((e) => {
          if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
        });
      }, { rootMargin: '0px 0px -8% 0px', threshold: 0.04 });
    }
    (root || document).querySelectorAll('.reveal:not(.in)').forEach((n) => io.observe(n));
  }

  /* ------------------------------------------------------------- actions -- */

  function goDay(n, push) {
    n = Math.max(1, Math.min(DAYS.length, n));
    if (n === state.dayN) return;
    state.dayN = n;
    writeURL(push);
    renderStrip();
    renderDay();
    const top = $('#dayBand').getBoundingClientRect().top + scrollY - 108;
    if (scrollY > top + 400 || scrollY < top - 2000) {
      scrollTo({ top, behavior: REDUCED ? 'auto' : 'smooth' });
    }
  }

  function wire() {
    // day strip + any [data-day] button
    document.addEventListener('click', (e) => {
      const d = e.target.closest('[data-day]');
      if (d && !d.disabled) {
        goDay(parseInt(d.dataset.day, 10), true);
        if (d.closest('.dine')) {
          scrollTo({ top: $('#dayBand').offsetTop - 108, behavior: REDUCED ? 'auto' : 'smooth' });
        }
        return;
      }
      const pick = e.target.closest('[data-pick]');
      if (pick) {
        const id = pick.dataset.pick;
        setMe(state.me === id ? null : id);
        return;
      }
      const only = e.target.closest('[data-only]');
      if (only) {
        if (!state.me) { openWho(); return; }
        state.mineOnly = only.dataset.only === '1';
        writeURL();
        renderDay();
        return;
      }
      const exp = e.target.closest('[data-exp]');
      if (exp) {
        const k = exp.dataset.exp;
        state.open[k] = exp.getAttribute('aria-expanded') !== 'true';
        exp.setAttribute('aria-expanded', state.open[k] ? 'true' : 'false');
      }
    });

    // who dialog
    const dlg = $('#whoDialog');
    $('#whoBtn').addEventListener('click', openWho);
    $('#whoDone').addEventListener('click', () => dlg.close());
    $('#whoClear').addEventListener('click', () => { setMe(null); dlg.close(); });
    dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); });

    // ics
    $('#icsAll').addEventListener('click', () =>
      download(buildICS(FLAT, 'Twins Disney Trip 2026'), 'twins-disney-trip-2026.ics'));
    document.addEventListener('click', (e) => {
      if (!e.target.closest('#icsDay')) return;
      const day = currentDay();
      download(buildICS(day.items, `Disney Day ${day.n}`), `disney-2026-day-${day.n}.ics`);
    });

    // share
    $('#shareBtn').addEventListener('click', async () => {
      const url = location.href;
      try {
        if (navigator.share) { await navigator.share({ title: TRIP.name, url }); return; }
        await navigator.clipboard.writeText(url);
        const b = $('#shareBtn');
        const old = b.innerHTML;
        b.innerHTML = 'Link copied';
        setTimeout(() => { b.innerHTML = old; }, 1600);
      } catch (e) { /* user cancelled */ }
    });

    // keyboard: left/right switch days
    document.addEventListener('keydown', (e) => {
      if (e.target.closest('input, textarea, dialog')) return;
      if (e.key === 'ArrowRight') goDay((state.dayN || 1) + 1, true);
      if (e.key === 'ArrowLeft') goDay((state.dayN || 1) - 1, true);
    });

    // swipe between days on the timeline
    let sx = 0, sy = 0, swiping = false;
    const band = $('#dayBand');
    band.addEventListener('touchstart', (e) => {
      if (e.touches.length !== 1) return;
      sx = e.touches[0].clientX; sy = e.touches[0].clientY; swiping = true;
    }, { passive: true });
    band.addEventListener('touchend', (e) => {
      if (!swiping) return;
      swiping = false;
      const t = e.changedTouches[0];
      const dx = t.clientX - sx, dy = t.clientY - sy;
      if (Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy) * 2) {
        goDay((state.dayN || 1) + (dx < 0 ? 1 : -1), true);
      }
    }, { passive: true });

    // sticky shadow + back to top
    const nav = $('#topnav'), top = $('#toTop');
    const onScroll = () => {
      nav.classList.toggle('is-stuck', scrollY > innerHeight * 0.92);
      top.classList.toggle('show', scrollY > innerHeight * 1.4);
    };
    addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    top.addEventListener('click', () => scrollTo({ top: 0, behavior: REDUCED ? 'auto' : 'smooth' }));

    // hero parallax
    if (!REDUCED) {
      const bg = $('.hero-bg');
      let raf = 0;
      addEventListener('scroll', () => {
        if (raf) return;
        raf = requestAnimationFrame(() => {
          raf = 0;
          if (scrollY < innerHeight * 1.2) {
            bg.style.transform = `translate3d(0,${scrollY * 0.3}px,0)`;
            const hi = $('.hero-inner');
            hi.style.transform = `translate3d(0,${scrollY * 0.12}px,0)`;
            hi.style.opacity = String(Math.max(0, 1 - scrollY / (innerHeight * 0.62)));
          }
        });
      }, { passive: true });
    }

    addEventListener('popstate', () => {
      readURL();
      if (!state.dayN) state.dayN = defaultDayN();
      renderWhoBtn(); renderStrip(); renderDay(); renderRooms(); renderDining();
    });
  }

  function openWho() {
    renderPeopleGrid();
    const dlg = $('#whoDialog');
    if (typeof dlg.showModal === 'function') dlg.showModal();
    else dlg.setAttribute('open', '');
  }

  /* ----------------------------------------------------------------- boot -- */

  readURL();
  if (!state.dayN) state.dayN = defaultDayN();

  renderWhoBtn();
  renderStrip();
  renderDay();
  renderRooms();
  renderDining();
  renderNotes();
  renderNow();
  renderHeroLive();
  wire();
  observeReveals(document);
  loadCurrentWeather();

  setInterval(tick, 1000);
  // Re-evaluate "today" if the page is left open overnight.
  setInterval(() => {
    const d = defaultDayN();
    if (!new URLSearchParams(location.search).get('day') && d !== state.dayN) {
      state.dayN = d; renderStrip(); renderDay();
    }
  }, 60000);

  document.addEventListener('visibilitychange', () => { if (!document.hidden) tick(); });

  if ('serviceWorker' in navigator) {
    addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
  }
})();
