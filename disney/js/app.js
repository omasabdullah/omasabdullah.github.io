/* ============================================================================
   Twins Disney Trip 2026 — app
   Vanilla JS. No storage: all state lives in the URL so links are shareable.
   ========================================================================== */
(function () {
  'use strict';

  /* ------------------------------------------------------------- helpers -- */

  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.prototype.slice.call((r || document).querySelectorAll(s));
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const svg = (id, cls) =>
    `<svg class="ic${cls ? ' ' + cls : ''}" width="1em" height="1em" viewBox="0 0 24 24"` +
    ` aria-hidden="true" focusable="false"><use href="#${id}"/></svg>`;

  const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const SMOOTH = REDUCED ? 'auto' : 'smooth';

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

  const state = { me: null, activeDay: 1, mineOnly: false, open: {}, jumpTo: null,
    mapKey: null, mapDay: null, mapAll: false, place: null, mapFull: false,
    mapCare: false };

  function readURL() {
    const q = new URLSearchParams(location.search);
    const me = q.get('me');
    state.me = me && BY_ID[me] ? me : null;
    state.mineOnly = q.get('only') === '1' && !!state.me;

    let d = parseInt(q.get('day'), 10);
    const h = /^#day-(\d+)$/.exec(location.hash);
    if (h) d = parseInt(h[1], 10);
    state.jumpTo = d >= 1 && d <= DAYS.length ? d : null;
    state.activeDay = state.jumpTo || defaultDayN();

    // Park map: ?map=mk&place=tron&mday=7 opens that pin, zoomed in.
    const mk = q.get('map');
    state.mapKey = mk && PARK_BY_KEY[mk] ? mk : null;
    const pl = q.get('place');
    state.place = state.mapKey && PARK_BY_KEY[state.mapKey]._byId[pl] ? pl : null;
    state.mapAll = q.get('all') === '1';
    state.mapCare = q.get('care') === '1';
    const md = parseInt(q.get('mday'), 10);
    state.mapDay = state.mapKey && PARK_BY_KEY[state.mapKey].days.includes(md) ? md : null;
  }

  /* The URL mirrors where you are so any link is shareable. replaceState
     only — scrolling through nine days must not fill up the back button. */
  function writeURL() {
    const q = new URLSearchParams();
    if (state.me) q.set('me', state.me);
    if (state.activeDay) q.set('day', String(state.activeDay));
    if (state.mineOnly) q.set('only', '1');
    if (state.mapKey) q.set('map', state.mapKey);
    if (state.mapDay) q.set('mday', String(state.mapDay));
    if (state.mapAll) q.set('all', '1');
    if (state.mapCare) q.set('care', '1');
    if (state.place) q.set('place', state.place);
    history.replaceState({}, '', location.pathname + (q.toString() ? '?' + q : ''));
  }

  function defaultDayN() {
    const today = resortToday();
    const hit = DAYS.find((d) => d.date === today);
    if (hit) return hit.n;
    if (Date.now() < TRIP_START) return 1;
    if (Date.now() > TRIP_END) return DAYS.length;
    let best = DAYS[0];
    DAYS.forEach((d) => {
      if (Math.abs(atResort(d.date, '12:00') - Date.now()) <
          Math.abs(atResort(best.date, '12:00') - Date.now())) best = d;
    });
    return best.n;
  }

  const isMine = (item) => !!state.me && !!item._who && item._who.includes(state.me);
  // A card with sub-bookings (the sunset dinners) concerns the whole group even
  // if you personally aren't on one of the tables — never hide or dim it.
  const notMine = (item) =>
    !!state.me && !!item._who && !item.subs && !item._who.includes(state.me);

  /* ------------------------------------------------------------ day strip -- */

  function renderStrip() {
    const today = resortToday();
    $('#daystrip').innerHTML = DAYS.map((d) => `
      <a class="daypill" href="#day-${d.n}" data-jumpday="${d.n}"
        data-theme="${d.theme}" aria-current="${d.n === state.activeDay}"
        style="--pill:var(--accent)">
        <span class="dp-day">${d.date === today
          ? '<span class="dot"></span><span class="vh">Today, </span>' : ''
        }Day ${d.n} · ${esc(shortDate(d.date).split(', ')[1])}</span>
        <span class="dp-name">${esc(d.kicker)}</span>
      </a>`).join('');
    centerPill();
  }

  /* Centre the active pill inside its own scroller. Deliberately not
     scrollIntoView() — that would yank the page while you're scrolling. */
  function centerPill() {
    const strip = $('#daystrip');
    const el = $('.daypill[aria-current="true"]', strip);
    if (!el) return;
    const left = el.offsetLeft - (strip.clientWidth - el.offsetWidth) / 2;
    strip.scrollTo({ left: Math.max(0, left), behavior: SMOOTH });
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

    return `<li class="tl-item k-${item.type}${dim ? ' is-dim' : ''} reveal"
      id="${item._key}" style="--i:${Math.min(idx, 10)}">
      <span class="tl-time${item.timeLabel ? ' is-label' : ''}">${item.timeLabel
        ? esc(item.timeLabel)
        : `<span>${item.approx ? '~' : ''}${f.t}</span><span class="mer">${f.mer}</span>`}</span>
      <span class="tl-body">
        <span class="tl-node"></span>
        <${tag} class="card${feat ? ' feat' : ''}${mine ? ' is-mine' : ''} k-${item.type}"
          ${interactive ? `type="button" aria-expanded="${state.open[item._key] ? 'true' : 'false'}" data-exp="${item._key}"` : ''}>
          ${inner}
        </${tag}>
        ${mapLink(item)}
      </span>
    </li>`;
  }

  /* The "now" line is a single node that gets *moved* as the day progresses,
     never re-rendered with the timeline — so it stays accurate for hours
     without disturbing anything around it. */
  let nowMark = null;

  function syncNowMarker() {
    const day = DAYS.find((d) => d.date === resortToday());
    const list = day ? $(`#day-${day.n} .timeline`) : null;
    if (!list) { if (nowMark) { nowMark.remove(); nowMark = null; } return; }

    if (!nowMark) {
      nowMark = document.createElement('li');
      nowMark.className = 'nowmark';
      nowMark.id = 'nowmark';
      nowMark.innerHTML = '<span class="nm-t">Now<br><b></b></span><span class="nm-l"></span>';
    }
    $('b', nowMark).textContent = new Date().toLocaleTimeString('en-US',
      { timeZone: TZ, hour: 'numeric', minute: '2-digit' });

    const now = Date.now();
    let before = null;
    for (const item of day.items) {
      if (item._start <= now) continue;
      const el = document.getElementById(item._key);
      if (el && el.parentNode === list) { before = el; break; }
    }
    if (before) {
      if (nowMark.nextElementSibling !== before) list.insertBefore(nowMark, before);
    } else if (nowMark.parentNode !== list || nowMark.nextElementSibling) {
      list.appendChild(nowMark);
    }
  }

  /* --------------------------------------------------------- the agenda -- */
  /* All nine days render at once, in order, as one continuous scroll. Day 1
     runs into day 2 runs into day 3. You never finish a day and fall off a
     cliff into the footer — there's always more trip below.                 */

  function dayHTML(day) {
    const isToday = day.date === resortToday();
    const past = Date.now() > atResort(day.date, '23:59');
    let items = day.items;
    if (state.mineOnly && state.me) items = items.filter((i) => !notMine(i));

    const llCount = day.items.filter((i) => i.type === 'll').length;
    const mealCount = day.items.filter((i) => i.type === 'meal').length;

    let rows = items.map(itemHTML).join('');
    if (!items.length) {
      rows = `<li class="tl-empty">Nothing today is just for
        ${esc(BY_ID[state.me].name)} — switch to <strong>Everyone</strong> to see it all.</li>`;
    }

    const next = DAYS[day.n];

    return `<section class="day${past ? ' is-past' : ''}" id="day-${day.n}"
        data-theme="${day.theme}" data-dayn="${day.n}" aria-labelledby="dayt-${day.n}">
      <div class="wrap">
        <div class="dayhead reveal">
          <span class="dh-top">
            <span>Day ${day.n} of ${DAYS.length}</span>
            <span>·</span>
            <span>${esc(longDate(day.date))}</span>
            ${day.badge ? `<span class="dh-badge">${esc(day.badge)}</span>` : ''}
            ${isToday ? '<span class="dh-badge">Today</span>' : ''}
          </span>
          <h2 class="dh-title" id="dayt-${day.n}">${esc(day.title)}</h2>
          <p class="dh-hours">${esc(day.hours)}</p>
          <div class="dh-foot">
            ${llCount ? `<span class="dh-chip">${svg('i-bolt')} ${llCount} Lightning Lane${llCount > 1 ? 's' : ''}</span>` : ''}
            ${mealCount ? `<span class="dh-chip">${svg('i-fork')} ${mealCount} booking${mealCount > 1 ? 's' : ''}</span>` : ''}
            <span class="dh-chip" data-wx="${day.date}" hidden></span>
            ${mapChip(day)}
            <button class="dh-chip" data-icsday="${day.n}">${svg('i-cal')} Add this day</button>
          </div>
        </div>

        <ol class="timeline">${rows}</ol>

        ${next ? `<div class="daybreak reveal" data-theme="${next.theme}">
            <span class="db-line"></span>
            <a class="db-pill" href="#day-${next.n}" data-jumpday="${next.n}">
              <span class="db-l">Day ${day.n} done · keep scrolling</span>
              <span class="db-t">Day ${next.n} · ${esc(next.kicker)}</span>
              ${svg('i-arrowdown', 'db-a')}
            </a>
          </div>` : `<div class="tripend reveal">
            <p class="te-k">${svg('i-star')} That&rsquo;s the whole trip</p>
            <p class="te-t">Nine days, four rooms, sixteen of us.</p>
            <p class="te-s">Below: who&rsquo;s in which room, every reservation,
              and the handful of things worth remembering.</p>
          </div>`}
      </div>
    </section>`;
  }

  /** Re-render the whole agenda. keepAnchor pins the viewport to the day
      you're currently looking at, so filtering doesn't teleport you. */
  function renderAgenda(keepAnchor) {
    const anchor = keepAnchor ? $(`#day-${state.activeDay}`) : null;
    const anchorTop = anchor ? anchor.getBoundingClientRect().top : null;

    $('#agendaFilter').innerHTML = `
      <span class="seg" role="group" aria-label="Filter the trip">
        <button data-only="0" aria-pressed="${!state.mineOnly}">Everyone</button>
        <button data-only="1" aria-pressed="${state.mineOnly}">${state.me ? 'Just ' + esc(BY_ID[state.me].name) : 'Just me'}</button>
      </span>
      <span class="filter-hint">${state.me
        ? (state.mineOnly
          ? 'Showing only what you’re on, across all nine days.'
          : 'Your items are highlighted, everything else is dimmed.')
        : 'Pick yourself up top to filter all nine days.'}</span>`;

    $('#dayWrap').innerHTML = DAYS.map(dayHTML).join('');

    nowMark = null; // the old node went out with the innerHTML
    observeReveals($('#dayWrap'));
    measureDays();
    tick();
    paintWeather();

    if (anchor) {
      const el = $(`#day-${state.activeDay}`);
      if (el) hardScroll(Math.max(0, scrollY + el.getBoundingClientRect().top - anchorTop));
    }
  }

  /* ---------------------------------------------------------- scroll spy -- */
  /* The nav isn't a view switcher any more — it's a map. It follows you. */

  let dayEls = [];
  function measureDays() {
    dayEls = $$('#dayWrap .day').map((el) => ({ n: +el.dataset.dayn, el }));
    measureNav();
  }
  function measureNav() {
    document.documentElement.style.setProperty('--navh', $('#topnav').offsetHeight + 'px');
  }

  function setActiveDay(n) {
    if (n === state.activeDay) return;
    state.activeDay = n;
    document.body.dataset.theme = DAYS[n - 1].theme;
    $$('#daystrip .daypill').forEach((p) =>
      p.setAttribute('aria-current', String(+p.dataset.jumpday === n)));
    centerPill();
    writeURL();
  }

  /* While a jump is animating, the spy must not fight it: mid-flight it would
     keep re-selecting the day being scrolled away from, which eats the next
     tap or arrow press. */
  let spyLock = 0;
  let userScrolled = false;
  // Bumped on every jump. A pending settle from an older jump is ignored,
  // otherwise a stale callback snaps you back to a day you already left.
  let jumpSeq = 0;

  function spy() {
    if (!dayEls.length) return;
    if (Date.now() >= spyLock) {
      const line = $('#topnav').offsetHeight + 28;
      let active = dayEls[0].n;
      for (const d of dayEls) {
        if (d.el.getBoundingClientRect().top <= line) active = d.n; else break;
      }
      setActiveDay(active);
    }
    progress();
  }

  function progress() {
    const r = $('#dayWrap').getBoundingClientRect();
    const total = r.height - innerHeight;
    const p = total > 0 ? Math.min(1, Math.max(0, -r.top / total)) : (r.top < 0 ? 1 : 0);
    $('#navProgress').style.transform = `scaleX(${p.toFixed(4)})`;
  }

  /* The page is ~24,000px tall. Smooth-scrolling the full length would be a
     blur, so only short hops animate; long jumps land instantly and the
     target flashes so you can see where you were put. */
  function hardScroll(top) {
    const el = document.documentElement;
    el.style.scrollBehavior = 'auto';
    scrollTo(0, top);
    // Always restore to '' — never to a captured value, or two overlapping
    // hard scrolls would leave scroll-behavior:auto stuck on the page.
    requestAnimationFrame(() => { el.style.scrollBehavior = ''; });
  }

  const maxScrollY = () =>
    Math.max(0, document.documentElement.scrollHeight - innerHeight);

  /* Layout position, walked through offsetParent. Deliberately NOT
     getBoundingClientRect(): that includes transforms, and timeline entries
     carry a translateY(18px) reveal animation, so measuring an entry that
     hadn't finished revealing yet landed every deep link 18px too low. */
  function docTop(el) {
    let y = 0;
    for (let n = el; n; n = n.offsetParent) y += n.offsetTop;
    return y;
  }

  /* Run a mutation that may change the height of content *above* the reader,
     then shift the scroll position by exactly as much as their anchor moved,
     so from their point of view nothing happened. Only applies when the
     anchor day is actually at or above the nav line; if they're still up in
     the hero, nothing should move at all. */
  function preserveScroll(mutate) {
    const anchor = $(`#day-${state.activeDay}`);
    const line = $('#topnav').offsetHeight + 28;
    const before = anchor ? docTop(anchor) : 0;
    const relevant = !!anchor && before <= scrollY + line;
    mutate();
    if (!relevant) return;
    const shift = docTop(anchor) - before;
    if (shift) hardScroll(Math.max(0, scrollY + shift));
  }

  /** Where the page needs to sit for `el` to clear the sticky nav. */
  function targetTop(el) {
    const raw = docTop(el) - ($('#topnav').offsetHeight + 14);
    return Math.min(Math.max(0, raw), maxScrollY());
  }

  /** Programmatic scroll finished: correct any drift, unlock, then either
      re-assert the day we were aiming for or work it out from where we are. */
  /* Nudge the page so `el` sits exactly under the nav, repeatedly over a few
     frames. Needed because things settle *after* we arrive: weather chips land
     late, a tapped card expands, and Chrome's own scroll anchoring shifts us a
     dozen px in response. Only small offsets are corrected, so a real scroll
     by the user is never fought. */
  function align(el, until, id) {
    // Abandon the moment the user takes over, or a newer jump supersedes us —
    // two overlapping align loops would drag the page between two targets.
    if (userScrolled || id !== jumpSeq) return;
    const off = targetTop(el) - scrollY;
    if (Math.abs(off) > 1 && Math.abs(off) < 140) hardScroll(scrollY + off);
    if (Date.now() < until) requestAnimationFrame(() => align(el, until, id));
  }

  function settle(el, dayN, id) {
    spyLock = 0;
    if (el) { userScrolled = false; align(el, Date.now() + 700, id); }
    if (dayN) { setActiveDay(dayN); progress(); } else spy();
  }

  function jumpTo(target, opts) {
    opts = opts || {};
    const el = typeof target === 'string' ? $(target) : target;
    if (!el) return;
    const top = targetTop(el);
    const aim = opts.dayN || 0;
    const id = ++jumpSeq;

    if (opts.instant || Math.abs(top - scrollY) > innerHeight * 2.5 || REDUCED) {
      hardScroll(top);
      settle(el, aim, id);
      return;
    }
    // Freeze the spy for the duration of the animation; scrollend releases it
    // early, the timeout is the fallback for browsers without scrollend.
    spyLock = Date.now() + 2000;
    scrollTo({ top, behavior: 'smooth' });
    const fin = () => { if (id === jumpSeq) settle(el, aim, id); };
    if ('onscrollend' in window) addEventListener('scrollend', fin, { once: true });
    setTimeout(fin, 900);
  }

  /* Day jumps always land instantly. Days sit 1,500–2,700px apart, and
     smooth-scrolling that far is just a blur — the nav is a tab bar, you
     expect to arrive. It also keeps the step deterministic when someone
     mashes the arrow keys, since there's no animation to race. Short hops to
     an individual entry still animate (see jumpTo). */
  function jumpDay(n) {
    n = Math.max(1, Math.min(DAYS.length, n));
    setActiveDay(n);
    jumpTo(`#day-${n}`, { dayN: n, instant: true });
  }

  /* ------------------------------------------------------------ live now -- */

  function cdCell(k, l) {
    return `<span class="cd-cell"><span class="cd-num" data-cd="${k}">0</span>` +
      `<span class="cd-lbl">${l}</span></span>`;
  }

  const phaseOf = (now) => now < TRIP_START ? 'pre' : now > TRIP_END ? 'post' : 'live';

  /* Rebuilding these every second would change their height and shunt the
     whole 24,000px agenda up and down under the reader's thumb. So the DOM is
     only rebuilt when *what* it describes changes; the ticking numbers are
     patched in place. */
  let heroSig = '';

  function renderHeroLive() {
    const now = Date.now();
    const host = $('#heroLive');

    if (now < TRIP_START) {
      if (heroSig !== 'pre') {
        heroSig = 'pre';
        host.innerHTML = `<div class="countdown">
          <div class="countdown-grid">
            ${cdCell('d', 'Days')}${cdCell('h', 'Hours')}${cdCell('m', 'Min')}${cdCell('s', 'Sec')}
          </div>
          <p class="eyebrow" style="color:rgba(255,255,255,.6)">Until the 5:00 AM alarm</p>
        </div>`;
      }
      const ms = TRIP_START - now;
      const v = {
        d: Math.floor(ms / 86400000),
        h: Math.floor(ms / 3600000) % 24,
        m: Math.floor(ms / 60000) % 60,
        s: Math.floor(ms / 1000) % 60,
      };
      $$('[data-cd]', host).forEach((el) => {
        const t = String(v[el.dataset.cd]);
        if (el.textContent !== t) el.textContent = t;
      });
      return;
    }
    if (now > TRIP_END) {
      if (heroSig === 'post') return;
      heroSig = 'post';
      host.innerHTML = `<div class="hero-nowcard">
        <span class="nc-eyebrow">${svg('i-star')} That's a wrap</span>
        <p class="nc-title">Home, and somehow still tired</p>
        <p class="nc-meta">Nine days, four rooms, sixteen of us. Scroll the whole thing below.</p>
      </div>`;
      return;
    }

    const cur = FLAT.filter((i) => i._start <= now && i._stop > now).pop();
    const next = FLAT.find((i) => i._start > now);
    const focus = cur || next;
    const sig = `live|${cur ? cur._key : '-'}|${next ? next._key : '-'}`;
    if (sig === heroSig) return;
    heroSig = sig;
    host.innerHTML = `<a class="hero-nowcard" href="#${focus ? focus._key : 'nowmark'}" data-jumpnow>
      <span class="nc-eyebrow"><span class="pulse"></span> ${cur ? 'Happening now' : 'Up next'}</span>
      <p class="nc-title">${(focus || {}).title || 'Free time'}</p>
      <p class="nc-meta">${cur
        ? (next ? `Next: ${esc(next.title)} at ${fmt12s(next.t)}` : 'Last thing on the list.')
        : (next ? `Starts at ${fmt12s(next.t)} · in ${dur(next._start - now)}` : 'Nothing left today.')}</p>
      <span class="nc-go">Jump to it in the agenda ${svg('i-arrowdown')}</span>
    </a>`;
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
    // data-live lets tick() refresh just this string, in place.
    let count = '', tagged = '';
    if (live && item._end && item._end > now) {
      count = `${dur(item._end - now)} left in the window`;
      tagged = ` data-live="end:${item._key}"`;
    } else if (!live) {
      count = `in ${dur(item._start - now)}`;
      tagged = ` data-live="start:${item._key}"`;
    }

    return `<div class="livecard${live ? ' is-now' : ''} k-${item.type}" data-theme="${item._day.theme}">
      <p class="lc-eyebrow">${live ? '<span class="pulse"></span>' : svg('i-clock')}
        ${live ? 'Happening now' : 'Next up'}</p>
      <h3 class="lc-title">${item.title}</h3>
      <p class="lc-when">${esc(kindLabel(item))} · ${item.timeLabel ? esc(item.timeLabel) : fmt12s(item.t)}${item.end ? ` – ${fmt12s(item.end)}` : ''}</p>
      ${count ? `<p class="lc-count"${tagged}>${esc(count)}</p>` : ''}
      ${item.note ? `<p class="lc-note">${esc(item.note)}</p>` : ''}
      ${state.me && item._who ? `<p class="lc-note"><strong>${mine ? 'You’re on this one.' : ''}${notme ? 'Not your group — you’re free.' : ''}</strong></p>` : ''}
      ${item._who ? whoRow(item) : ''}
      <span class="lc-acts">
        <a class="lc-go" href="#${item._key}" data-jumpnow>Show in the agenda ${svg('i-arrowdown')}</a>
        ${item._place ? `<button class="lc-go" data-openmap="${item._place._park.key}"
          data-mapplace="${item._place.id}" data-mapopenday="${item._day.n}">Find it on the map ${svg('i-pin')}</button>` : ''}
      </span>
    </div>`;
  }

  let nowSig = '';

  /** Refresh the live countdown strings without touching the DOM structure. */
  function patchLive() {
    const now = Date.now();
    $$('[data-live]').forEach((el) => {
      const parts = el.dataset.live.split(':');
      const item = FLAT.find((i) => i._key === parts[1]);
      if (!item) return;
      const t = parts[0] === 'end'
        ? `${dur(Math.max(0, item._end - now))} left in the window`
        : `in ${dur(Math.max(0, item._start - now))}`;
      if (el.textContent !== t) el.textContent = t;
    });
  }

  function renderNow() {
    const now = Date.now();
    const grid = $('#nowGrid');

    if (now < TRIP_START) {
      if (nowSig === 'pre') { patchLive(); return; }
      nowSig = 'pre';
      const d1 = DAYS[0];
      $('#nowTitle').textContent = 'Not long now';
      grid.innerHTML = `
        <div class="livecard" data-theme="${d1.theme}">
          <p class="lc-eyebrow">${svg('i-clock')} First move</p>
          <h3 class="lc-title">${esc(d1.items[0].title)}</h3>
          <p class="lc-when">${esc(longDate(d1.date))} · ${fmt12s(d1.items[0].t)}</p>
          <p class="lc-count" data-live="start:${d1.items[0]._key}">${esc(dur(TRIP_START - now))}</p>
          <p class="lc-note">This page goes live the moment the trip starts: what's happening right now, what's next, and whether you're on it.</p>
          <a class="lc-go" href="#day-1" data-jumpnow>Start at day 1 ${svg('i-arrowdown')}</a>
        </div>
        <div class="livecard" data-theme="rest">
          <p class="lc-eyebrow">${svg('i-user')} Make it yours</p>
          <h3 class="lc-title">Tap &ldquo;Who are you?&rdquo;</h3>
          <p class="lc-note">Pick your name and every Lightning Lane, table and room you&rsquo;re on gets highlighted, all nine days. The choice lives in the link, so bookmark it or send it to your own phone.</p>
        </div>`;
      return;
    }
    if (now > TRIP_END) {
      if (nowSig === 'post') return;
      nowSig = 'post';
      $('#nowTitle').textContent = 'The trip';
      grid.innerHTML = `<div class="livecard is-empty"><p class="lc-title">All nine days are below</p>
        <p class="lc-note">Scroll straight through from the airport to the flight home.</p></div>`;
      return;
    }

    const cur = FLAT.filter((i) => i._start <= now && i._stop > now).pop();
    const next = FLAT.find((i) => i._start > now);
    const sig = `live|${cur ? cur._key : '-'}|${next ? next._key : '-'}|${state.me}`;
    if (sig !== nowSig) {
      nowSig = sig;
      $('#nowTitle').textContent = 'Right now';
      grid.innerHTML = liveCard('now', cur, now) + liveCard('next', next, now);
    }
    patchLive();
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
        <span class="d-day"><a class="chip" href="#${m._key}" data-jumpnow>${svg('i-chevr')} Day ${m._day.n}</a>
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

  /* ----------------------------------------------------------- park maps -- */
  /* The images are Disney's own guidemaps, cut out of their PDFs. Everything
     drawn on top is derived from the agenda: each pin knows which entries
     happen there, so tapping TRON tells you it's a Single Pass at 6:25 PM and
     whether you're on it. Pin coordinates live in js/maps.js.              */

  /* Case, curly quotes and punctuation are all flattened, so “it’s a small
     world” and "it's a small world" are the same string. */
  const mnorm = (s) => String(s).toLowerCase()
    .replace(/[\u2018\u2019\u02bc]/g, "'")
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

  const PARK_BY_KEY = {};
  const PARK_BY_THEME = {};
  PARK_MAPS.forEach((pk) => {
    PARK_BY_KEY[pk.key] = pk;
    PARK_BY_THEME[pk.theme] = pk;
    pk._byId = {};
    pk._byName = {};
    pk.places.forEach((p) => {
      p._park = pk;
      p._items = [];
      pk._byId[p.id] = p;
      pk._byName[mnorm(p.name)] = p;
      (p.alias || []).forEach((a) => { pk._byName[mnorm(a)] = p; });
    });
  });

  /* Tie every agenda entry to a pin, once. An explicit `place:` in data.js
     wins; otherwise the title has to match a place name *exactly*. This is
     deliberately not fuzzy — a near-miss that quietly pins a Lightning Lane
     to the wrong ride is far worse than a missing pin. */
  FLAT.forEach((item) => {
    const pk = PARK_BY_THEME[item._day.theme];
    if (!pk) return;
    const p = item.place ? pk._byId[item.place] : pk._byName[mnorm(item.title)];
    if (!p) return;
    item._place = p;
    p._items.push(item);
  });

  const mapOf = (day) => PARK_BY_THEME[day.theme] || null;

  function pinClass(p) {
    // Facilities are their own thing: never on the agenda, always worth finding.
    if (p.kind === 'care') return 'p-care';
    if (p.kind === 'gear') return 'p-gear';
    if (p.kind === 'gate') return 'p-gate';
    if (!p._items.length) return 'p-extra';
    if (p._items.some((i) => i.type === 'll')) return 'p-ll';
    if (p._items.some((i) => i.type === 'meal')) return 'p-meal';
    return 'p-show';
  }
  const PIN_ICON = { 'p-gate': 'i-bus', 'p-meal': 'i-fork', 'p-show': 'i-show',
    'p-ll': 'i-bolt', 'p-extra': 'i-pin',
    'p-care': 'i-baby', 'p-gear': 'i-stroller' };

  /* Full ride names are far too long to sit beside a pin on a 390px screen. */
  function pinLabel(p) {
    return (p.short || p.name)
      .replace(/^(Star Wars: |The Many Adventures of |Journey of Water, )/i, '')
      .replace(/ [-–—] .*$/, '');
  }

  /* ------------------------------------------------------------ live waits --
   * Standby waits, ride status and showtimes from themeparks.wiki.
   *
   * That API was picked for one unglamorous reason: it sends
   * `access-control-allow-origin: *`. queue-times.com has the same data and a
   * friendlier shape, but no CORS header at all, so a browser on github.io
   * can't read it — and there's no server here to proxy through.
   *
   * Everything below is best-effort and silent on failure. A wait time is a
   * nice-to-have on top of a plan that works without it, so if the fetch is
   * slow, blocked by park wifi, or the response shape changes under us, the
   * card renders exactly as it did before and nobody sees an error.
   *
   * The one thing this never does is guess. A place shows a number only if
   * its `live` id in maps.js is an exact entity match, resolved offline once.
   * A wait time on the wrong ride is worse than no wait time.
   */
  const Waits = (function () {
    const API = 'https://api.themeparks.wiki/v1/entity/';
    const TTL = 90e3;  // upstream refreshes about once a minute
    const COLD = 9e3;  // give up rather than leave a spinner sitting there
    const data = {};   // park key -> { at, by: { uuid: entry } , err }
    const busy = {};   // park key -> in-flight promise
    const subs = [];

    const fresh = (key) => {
      const d = data[key];
      return !!d && !d.err && Date.now() - d.at < TTL;
    };

    function tell(key) {
      subs.forEach((fn) => { try { fn(key); } catch (_) { /* not our problem */ } });
    }

    function load(park) {
      if (!park || !park.live) return Promise.resolve();
      const key = park.key;
      if (fresh(key)) return Promise.resolve();
      if (busy[key]) return busy[key];

      const ctrl = typeof AbortController === 'function' ? new AbortController() : null;
      const timer = setTimeout(() => { if (ctrl) ctrl.abort(); }, COLD);

      busy[key] = fetch(API + park.live + '/live', {
        signal: ctrl ? ctrl.signal : undefined,
        headers: { accept: 'application/json' },
      })
        .then((r) => {
          if (!r.ok) throw new Error('http ' + r.status);
          return r.json();
        })
        .then((j) => {
          const by = {};
          const rows = j && Array.isArray(j.liveData) ? j.liveData : [];
          rows.forEach((e) => { if (e && e.id) by[e.id] = e; });
          data[key] = { at: Date.now(), by };
        })
        .catch(() => { data[key] = { at: Date.now(), by: {}, err: true }; })
        .then(() => {
          clearTimeout(timer);
          delete busy[key];
          tell(key);
        });
      return busy[key];
    }

    /** Raw entry for a place, or null. */
    function entry(park, place) {
      if (!park || !place || !place.live) return null;
      const d = data[park.key];
      return d && d.by[place.live] ? d.by[place.live] : null;
    }

    const clock = (ms) => new Date(ms).toLocaleTimeString('en-US',
      { timeZone: TZ, hour: 'numeric', minute: '2-digit' });

    /** Next performance strictly after now, as epoch ms, or null. */
    function nextShow(e) {
      if (!e || !Array.isArray(e.showtimes)) return null;
      const now = Date.now();
      let best = null;
      for (const s of e.showtimes) {
        const t = Date.parse(s && (s.startTime || s.endTime));
        if (!isNaN(t) && t > now && (best === null || t < best)) best = t;
      }
      return best;
    }

    /**
     * What to put on a chip for this place, or null to show nothing at all.
     * `tone` drives the colour; `text` is already human-readable.
     */
    function chipFor(park, place) {
      const e = entry(park, place);
      if (!e) return null;
      const st = e.status;

      if (st === 'REFURBISHMENT') return { tone: 'shut', text: 'Closed for refurbishment' };
      if (st === 'DOWN') return { tone: 'down', text: 'Temporarily down' };
      if (st === 'CLOSED') return { tone: 'shut', text: 'Closed right now' };

      const show = nextShow(e);
      if (show !== null) return { tone: 'show', text: `Next show ${clock(show)}` };

      const q = e.queue && e.queue.STANDBY;
      const w = q && typeof q.waitTime === 'number' ? q.waitTime : null;
      if (w !== null) {
        if (w <= 0) return { tone: 'ok', text: 'Walk on' };
        return { tone: w <= 20 ? 'ok' : w <= 45 ? 'mid' : 'busy', text: `${w} min wait` };
      }

      /* Operating, but nothing to report: no queue, no showtimes. True of
         restaurants and walk-through spaces. A chip reading "Open" on a
         table-service restaurant you already have a reservation for is noise,
         so say nothing and let the closures be the only news. */
      return null;
    }

    /** True once we've tried and got nothing usable for this park. */
    const failed = (key) => !!(data[key] && data[key].err);
    const tried = (key) => !!data[key];
    const stamp = (key) => (data[key] && !data[key].err ? data[key].at : null);

    return {
      load,
      chipFor,
      failed,
      tried,
      stamp,
      loading: (key) => !!busy[key],
      onChange: (fn) => { subs.push(fn); },
    };
  })();

  const MapView = (function () {
    const FULL_LOADED = {};
    let pk = null;                 // the park being shown
    let k = 1, tx = 0, ty = 0;     // canvas scale + translation
    let bw = 0, bh = 0;            // image size when fitted to the stage, px
    let sw = 0, sh = 0;            // stage size, px
    let built = false;

    const stage = () => $('#mapStage');
    const canvas = () => $('#mapCanvas');
    const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

    /* Zooming past about one image pixel per CSS pixel only buys blur, so the
       ceiling comes from the image we actually have rather than a fixed guess.
       Magic Kingdom's guidemap is half the resolution of EPCOT's. */
    const maxK = () => clamp(pk ? pk.img.w / Math.max(1, sw) : 3, 2.8, 7);

    function measure() {
      if (!pk) return;
      const st = stage();
      sw = st.clientWidth;
      if (!sw) return;
      if (state.mapFull) {
        st.style.height = '';          // let the flex layout fill the screen
        sh = st.clientHeight;
      } else {
        /* Give the stage the park's own proportions so the art reaches all
           four edges. Letterbox bands would otherwise eat 180px of a phone
           screen on the squarer maps. */
        const cap = Math.min(innerHeight * 0.68, 600);
        sh = Math.round(clamp(sw * (pk.img.h / pk.img.w), 320, cap));
        st.style.height = sh + 'px';
      }
      if (!sh) return;
      const s0 = Math.min(sw / pk.img.w, sh / pk.img.h);
      bw = pk.img.w * s0;
      bh = pk.img.h * s0;
      const cv = canvas();
      cv.style.width = bw + 'px';
      cv.style.height = bh + 'px';
    }

    /* How much of the stage the detail card is sitting on. Everything below
       treats the stage as being this much shorter, so a pin near the bottom
       edge of the map can still be brought up into view — the map is allowed
       to slide up behind the card. */
    function inset() {
      const c = $('#placeCard');
      return c.hidden ? 0 : Math.min(c.offsetHeight, sh * 0.6);
    }

    /* Never let the map be dragged away from the stage: anything smaller than
       the visible area on an axis stays centred in it. */
    function clampT() {
      const w = bw * k, h = bh * k;
      const vh = sh - inset();
      tx = w <= sw ? (sw - w) / 2 : clamp(tx, sw - w, 0);
      ty = h <= vh ? (vh - h) / 2 : clamp(ty, vh - h, 0);
    }

    function apply(anim) {
      if (!pk) return;
      clampT();
      const cv = canvas();
      cv.style.transition = (anim && !REDUCED)
        ? 'transform 460ms cubic-bezier(.16,1,.3,1)' : 'none';
      cv.style.transform =
        `translate3d(${tx.toFixed(2)}px,${ty.toFixed(2)}px,0) scale(${k.toFixed(4)})`;
      /* Pins read --k to cancel the zoom out, so they stay the same size on
         screen however far in you go. */
      cv.style.setProperty('--k', k.toFixed(4));
      cv.dataset.labels = (k >= 1.7 || sw >= 620) ? 'on' : 'off';
      layoutLabels();
      /* One finger scrolls the page until you've zoomed in — then it pans the
         map instead. Two fingers always pinch. */
      const st = stage();
      st.style.touchAction = (k > 1.02 || state.mapFull) ? 'none' : 'pan-y';
      st.style.cursor = (k > 1.02 || state.mapFull) ? '' : 'default';
      $('#mapOut').disabled = k <= 1.001;
      $('#mapIn').disabled = k >= maxK() - 0.001;
      $('#mapFit').disabled = k <= 1.001;
      const z = $('#mapZoom');
      z.textContent = `${k.toFixed(1)}\u00d7`;
      z.classList.toggle('show', k > 1.02);
    }

    /* Fantasyland puts six attractions inside a thumb's width, so at some zoom
       levels their labels inevitably pile up. Rather than let them overlap
       into mush, lay them out greedily: the open pin wins, then the ones we
       have plans at, then top to bottom. Anything that would collide with a
       label already placed, or that has drifted off the stage, is dropped.
       Dots are never hidden — only their names. */
    let lblRaf = 0;
    function layoutLabels() {
      cancelAnimationFrame(lblRaf);
      lblRaf = requestAnimationFrame(() => {
        const pins = $$('.pin', $('#mapPins'));
        if (!pins.length) return;
        const rank = (p) => (p.classList.contains('is-sel') ? 0 : 1)
          + (p.classList.contains('p-extra') ? 2 : 0)
          + (p.classList.contains('is-dim') ? 1 : 0);
        const order = pins.slice().sort((a, b) => rank(a) - rank(b)
          || (+a.style.getPropertyValue('--y')) - (+b.style.getPropertyValue('--y')));
        const lbls = order.map((p) => $('.pin-lbl', p));
        // Show everything first, so one layout pass serves every measurement.
        lbls.forEach((l) => { l.style.visibility = ''; });
        const box = stage().getBoundingClientRect();
        const rects = lbls.map((l) => l.getBoundingClientRect());
        const dots = order.map((p) => $('.pin-dot', p).getBoundingClientRect());
        const gap = 3;
        const hits = (r, o) => r.left < o.right + gap && r.right > o.left - gap
          && r.top < o.bottom + gap && r.bottom > o.top - gap;
        const kept = [];
        rects.forEach((r, i) => {
          // Must fit entirely inside the stage: a name sliced off by the edge
          // reads as a glitch, and half of "Cinderella Castle" is no use.
          const off = r.left < box.left + 2 || r.right > box.right - 2
            || r.bottom < box.top || r.top > box.bottom;
          // A label may never cover another pin's dot — losing the name is
          // recoverable, losing the marker is not.
          const clash = kept.some((o) => hits(r, o))
            || dots.some((d, j) => j !== i && hits(r, d));
          if (off || clash) lbls[i].style.visibility = 'hidden';
          else kept.push(r);
        });
      });
    }

    /** Zoom about a point in stage coordinates, so whatever is under the
        cursor / pinch stays under it. */
    function zoomAt(nk, px, py, anim) {
      nk = clamp(nk, 1, maxK());
      const cx = (px - tx) / k, cy = (py - ty) / k;
      k = nk;
      tx = px - cx * k;
      ty = py - cy * k;
      apply(anim);
    }
    const zoomBy = (f, anim) => zoomAt(k * f, sw / 2, sh / 2, anim);

    /** Centre a normalised map point in the part of the stage you can actually
        see — which is the space above the detail card when one is open. */
    function centreOn(nx, ny, nk, anim) {
      /* Default to a modest zoom, and never pull back out: if you're already
         further in than this, selecting a pin shouldn't undo that. */
      k = clamp(nk == null ? Math.max(k, Math.min(maxK(), 2.2)) : nk, 1, maxK());
      tx = sw / 2 - nx * bw * k;
      ty = (sh - inset()) / 2 - ny * bh * k;
      apply(anim !== false);
    }
    function fit(anim) { k = 1; apply(anim !== false); }

    /* ------------------------------------------------------------- pins --- */

    const dayItems = (p) => state.mapDay
      ? p._items.filter((i) => i._day.n === state.mapDay) : p._items;

    function visible() {
      return pk.places.filter((p) => {
        /* Facilities sit on their own switch. They're not plans, so they don't
           belong under "Everything" either — with four under-fives in the
           group you want them on tap, not hunted for among the rides. */
        if (p.facility) return !!state.mapCare;
        if (state.mapAll) return true;
        // Gates stay put whatever the filter — they're how you orient yourself.
        if (p.kind === 'gate') return true;
        const items = dayItems(p);
        if (!items.length) return false;
        if (state.mineOnly && state.me) return items.some((i) => !notMine(i));
        return true;
      });
    }

    /* Mirrors the agenda: with a person picked, anything that isn't theirs
       fades back instead of disappearing, so they still see the shape of
       the day around them. */
    const dimmed = (p) => {
      if (!state.me) return false;
      const items = dayItems(p);
      return items.length > 0 && items.every((i) => notMine(i));
    };

    function renderPins() {
      if (!pk) return;
      const list = visible();
      $('#mapPins').innerHTML = list.map((p) => {
        const cls = pinClass(p);
        const items = dayItems(p);
        const mine = !!state.me && items.some((i) => isMine(i));
        const t = items.length
          ? `${p.name} — ${items.map((i) => fmt12s(i.t)).join(', ')}`
          : `${p.name} — not on our list`;
        return `<button class="pin ${cls}${dimmed(p) ? ' is-dim' : ''}${mine ? ' is-mine' : ''}${
          state.place === p.id ? ' is-sel' : ''}${p.x > 0.7 ? ' lbl-l' : ''}"
          style="--x:${p.x};--y:${p.y}" data-place="${p.id}"
          aria-label="${esc(t)}" title="${esc(t)}">
          <span class="pin-dot">${svg(PIN_ICON[cls])}${items.length > 1
            ? `<span class="pin-n">${items.length}</span>` : ''}</span>
          <span class="pin-lbl">${esc(pinLabel(p))}</span>
        </button>`;
      }).join('');
      const n = list.length;
      const c = $('#mapCount');
      if (c) c.textContent = `${n} ${n === 1 ? 'place' : 'places'}`;
    }

    /* -------------------------------------------------------- place card -- */

    function placeRow(item) {
      const d = item._day;
      const win = item.end ? `${fmt12s(item.t)} – ${fmt12s(item.end)}` : fmt12s(item.t);
      const mine = isMine(item);
      return `<a class="pc-row k-${item.type}" href="#${item._key}" data-jumpnow>
        <span class="pc-when">${svg('i-clock')}<span>Day ${d.n} · ${esc(win)}</span></span>
        <span class="pc-what">${esc(kindLabel(item))}${mine
          ? '<span class="mine-flag">You</span>' : ''}</span>
        ${item.title === (item._place || {}).name ? ''
          : `<span class="pc-title">${item.title}</span>`}
        ${item._who ? `<span class="pc-who">${item._who.length === ALL_IDS.length
          ? `All ${ALL_IDS.length} of us`
          : item._who.map((id) => avatar(id, 'xs')).join('') }</span>` : ''}
        <span class="pc-go">${svg('i-chevr')}<span class="vh">Show in the plan</span></span>
      </a>`;
    }

    /**
     * The live-wait chip for a place card. Returns '' whenever there's
     * nothing honest to say, which includes: places with no `live` id (gates,
     * lands, facilities), a park whose fetch failed, and a fetch still in
     * flight on first open.
     */
    function waitChip(p) {
      if (!p.live || !pk) return '';
      const c = Waits.chipFor(pk, p);
      if (!c) {
        if (Waits.loading(pk.key) || !Waits.tried(pk.key)) {
          return `<p class="pc-wait is-wait"><span>Checking the wait…</span></p>`;
        }
        return '';
      }
      const at = Waits.stamp(pk.key);
      const ago = at ? ` <small>as of ${new Date(at).toLocaleTimeString('en-US',
        { timeZone: TZ, hour: 'numeric', minute: '2-digit' })}</small>` : '';
      return `<p class="pc-wait is-${c.tone}">${svg('i-clock')}<span>${esc(c.text)}</span>${ago}</p>`;
    }

    function renderCard() {
      const card = $('#placeCard');
      const p = state.place && pk ? pk._byId[state.place] : null;
      if (!p) {
        card.hidden = true;
        card.innerHTML = '';
        stage().classList.remove('has-card');
        return;
      }
      const items = dayItems(p);
      card.innerHTML = `
        <button class="pc-x" data-closeplace aria-label="Close">${svg('i-close')}</button>
        <p class="pc-land">${svg(PIN_ICON[pinClass(p)])}<span>${esc(p.land)}</span></p>
        <h3 class="pc-name">${esc(p.name)}</h3>
        ${waitChip(p)}
        ${p.note ? `<p class="pc-note">${esc(p.note)}</p>` : ''}
        ${items.length
          ? `<div class="pc-rows">${items.map(placeRow).join('')}</div>`
          : p.facility ? ''
            : `<p class="pc-none">Not on our plan — just somewhere worth knowing
              about if you have time to spare.</p>`}`;
      // Waits are fetched lazily: opening a card is the signal that you care.
      if (p.live) Waits.load(pk);
      card.hidden = false;
      // The card is already shouting the name; the pin's own label would only
      // collide with the controls.
      stage().classList.add('has-card');
    }

    function select(id, opts) {
      const o = opts || {};
      const p = pk && id ? pk._byId[id] : null;
      state.place = p ? p.id : null;
      $$('.pin', $('#mapPins')).forEach((el) => {
        el.classList.toggle('is-sel', el.dataset.place === state.place);
      });
      /* A pin that's been filtered out still needs to show when it's deep
         linked, so bring it back by widening the filter. */
      if (p && !visible().includes(p)) {
        if (p.facility) state.mapCare = true;
        else state.mapAll = true;
        renderFilters();
        renderPins();
        $$('.pin', $('#mapPins')).forEach((el) => {
          el.classList.toggle('is-sel', el.dataset.place === state.place);
        });
      }
      renderCard();
      if (p && o.fly !== false) centreOn(p.x, p.y, o.k, o.anim);
      // Card dismissed: re-settle into the space it was covering.
      else if (!p) apply(true);
      if (o.url !== false) writeURL();
    }

    /* ----------------------------------------------------- chrome + load -- */

    function renderPicker() {
      $('#parkPicker').innerHTML = PARK_MAPS.map((m) => {
        const on = pk && m.key === pk.key;
        return `<button class="ptab" data-theme="${m.theme}" data-park="${m.key}"
          role="tab" aria-selected="${on}" tabindex="${on ? 0 : -1}">
          <span class="pt-day">${m.days.length > 1
            ? `Days ${m.days.join(' & ')}` : `Day ${m.days[0]}`}</span>
          <span class="pt-name">${esc(m.name)}</span>
        </button>`;
      }).join('');
    }

    function renderFilters() {
      const days = pk.days.length > 1 ? `
        <span class="seg" role="group" aria-label="Which day">
          <button data-mapday="0" aria-pressed="${!state.mapDay}">Both days</button>
          ${pk.days.map((n) => `<button data-mapday="${n}"
            aria-pressed="${state.mapDay === n}">Day ${n}</button>`).join('')}
        </span>` : '';
      $('#mapFilters').innerHTML = `
        <span class="seg" role="group" aria-label="What to show">
          <button data-mapall="0" aria-pressed="${!state.mapAll}">Our plans</button>
          <button data-mapall="1" aria-pressed="${!!state.mapAll}">Everything</button>
        </span>
        ${days}
        <button class="carebtn" data-mapcare="${state.mapCare ? '0' : '1'}"
          aria-pressed="${!!state.mapCare}">${svg('i-baby')}<span>Baby care</span></button>
        <span class="mapcount" id="mapCount"></span>`;
    }

    /* The small image is in the service worker's cache, so it paints instantly
       even offline. The full one is fetched behind it and swapped in when it
       lands — you can start reading the map before the detail arrives. */
    function loadImage() {
      const img = $('#mapImg');
      const want = pk.key;
      img.alt = `${pk.full} guidemap`;
      img.src = FULL_LOADED[want] ? pk.img.full : pk.img.sm;
      if (FULL_LOADED[want]) return;
      const hi = new Image();
      hi.decoding = 'async';
      hi.onload = () => {
        FULL_LOADED[want] = true;
        if (pk && pk.key === want) img.src = pk.img.full;
      };
      hi.src = pk.img.full;
    }

    function show(key, opts) {
      const o = opts || {};
      const next = PARK_BY_KEY[key] || PARK_MAPS[0];
      const swapped = !pk || pk.key !== next.key;
      pk = next;
      state.mapKey = pk.key;
      if (swapped) {
        state.place = null;
        if (state.mapDay && !pk.days.includes(state.mapDay)) state.mapDay = null;
        loadImage();
        $('#mapWrap').dataset.theme = pk.theme;
        $('#mapCredit').textContent = pk.credit;
        renderPicker();
        renderFilters();
        measure();
        fit(false);
        renderPins();
        renderCard();
      }
      if (o.day !== undefined) {
        state.mapDay = pk.days.includes(o.day) ? o.day : null;
        renderFilters();
        renderPins();
      }
      if (o.url !== false) writeURL();
    }

    /* ------------------------------------------------------- full screen -- */

    let scrollKeep = 0;
    function setFull(on) {
      if (!pk || state.mapFull === on) return;
      if (on) scrollKeep = scrollY;
      state.mapFull = on;
      $('#mapWrap').classList.toggle('is-full', on);
      document.documentElement.classList.toggle('map-full', on);
      const b = $('#mapFull');
      b.setAttribute('aria-pressed', String(on));
      b.setAttribute('aria-label', on ? 'Leave full screen' : 'Open the map full screen');
      b.innerHTML = svg(on ? 'i-close' : 'i-full');
      if (!on) scrollTo(0, scrollKeep);
      /* The stage has just changed shape — refit around whatever was in the
         middle of it so you don't lose your place. */
      const cx = (sw / 2 - tx) / (bw * k), cy = (sh / 2 - ty) / (bh * k);
      requestAnimationFrame(() => {
        measure();
        if (k > 1.02) centreOn(cx, cy, k, false); else fit(false);
      });
    }

    /* ---------------------------------------------------------- gestures -- */

    function bind() {
      const st = stage();
      const pts = new Map();
      let g = null;
      let lastTap = 0;
      let dragged = false;

      /* Phrased for whatever is pointing at it — a trackpad needs ⌘-scroll
         where a thumb just pinches. It stays put rather than fading out: it's
         one muted line below the map, and sixteen people will each meet this
         map for the first time. */
      $('#mapHint').textContent = matchMedia('(hover: hover)').matches
        ? 'Drag to move, double-click or \u2318/Ctrl-scroll to zoom.'
        : 'Pinch to zoom, drag to move, tap a pin for the details.';
      addEventListener('transitionend', (e) => {
        if (e.target === canvas() && e.propertyName === 'transform') layoutLabels();
      });

      const local = (e) => {
        const r = st.getBoundingClientRect();
        return { x: e.clientX - r.left, y: e.clientY - r.top };
      };
      const two = () => {
        const [a, b] = Array.from(pts.values());
        const r = st.getBoundingClientRect();
        return {
          d: Math.max(1, Math.hypot(a.x - b.x, a.y - b.y)),
          x: (a.x + b.x) / 2 - r.left,
          y: (a.y + b.y) / 2 - r.top,
        };
      };
      function startPinch() {
        const m = two();
        g = { mode: 'pinch', d: m.d, k, cx: (m.x - tx) / k, cy: (m.y - ty) / k };
      }
      function startPan(e) {
        g = { mode: 'pan', x: e.clientX, y: e.clientY, tx, ty, moved: 0 };
      }

      st.addEventListener('pointerdown', (e) => {
        if (e.pointerType === 'mouse' && e.button !== 0) return;
        pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (pts.size === 2) { startPinch(); return; }
        if (pts.size > 2) return;
        // At fit size a one-finger drag belongs to the page, not the map.
        if (e.pointerType === 'touch' && k <= 1.02 && !state.mapFull) return;
        startPan(e);
        st.classList.add('is-grab');
      });

      /* Deliberately on the window rather than setPointerCapture: capturing
         retargets the mouse events, which would send a pin's click to the
         stage instead of the pin. Window listeners also mean a drag that
         leaves the stage keeps working. */
      addEventListener('pointermove', (e) => {
        if (!pts.has(e.pointerId)) return;
        pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (!g) return;
        if (g.mode === 'pinch' && pts.size >= 2) {
          const m = two();
          k = clamp(g.k * (m.d / g.d), 1, maxK());
          tx = m.x - g.cx * k;
          ty = m.y - g.cy * k;
          apply(false);
        } else if (g.mode === 'pan') {
          const dx = e.clientX - g.x, dy = e.clientY - g.y;
          g.moved = Math.max(g.moved, Math.abs(dx) + Math.abs(dy));
          tx = g.tx + dx;
          ty = g.ty + dy;
          apply(false);
        }
      });

      function release(e) {
        if (!pts.has(e.pointerId)) return;
        const had = g;
        pts.delete(e.pointerId);
        if (pts.size === 1 && had && had.mode === 'pinch') {
          // Lifting one finger mid-pinch turns it back into a pan.
          const only = Array.from(pts.values())[0];
          startPan({ clientX: only.x, clientY: only.y });
          return;
        }
        if (pts.size === 0) {
          g = null;
          st.classList.remove('is-grab');
          const onPin = e.target instanceof Element && !!e.target.closest('.pin');
          if (had && had.mode === 'pan' && had.moved >= 7) dragged = true;
          // A tap on bare map closes the detail card; two taps zoom in.
          if (had && had.mode === 'pan' && had.moved < 7 && !onPin) {
            const now = Date.now();
            if (e.pointerType !== 'mouse' && now - lastTap < 320) {
              const l = local(e);
              zoomAt(k >= maxK() - 0.01 ? 1 : k * 2, l.x, l.y, true);
              lastTap = 0;
            } else {
              lastTap = now;
              if (state.place) select(null);
            }
          }
        }
      }
      addEventListener('pointerup', release);
      addEventListener('pointercancel', release);

      /* A drag that happens to finish over a pin must not also open it. */
      st.addEventListener('click', (e) => {
        if (!dragged) return;
        dragged = false;
        e.preventDefault();
        e.stopPropagation();
      }, true);

      /* Plain scrolling over the map keeps scrolling the page — until you've
         zoomed in, which is a clear sign you want the map. A trackpad pinch
         arrives as a ctrl-wheel and always zooms. */
      st.addEventListener('wheel', (e) => {
        const own = e.ctrlKey || e.metaKey || k > 1.02;
        if (!own) return;
        e.preventDefault();
        const l = local(e);
        zoomAt(k * Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0022)), l.x, l.y, false);
      }, { passive: false });

      st.addEventListener('dblclick', (e) => {
        if (e.target.closest('.pin')) return;
        const l = local(e);
        zoomAt(k >= maxK() - 0.01 ? 1 : k * 2, l.x, l.y, true);
      });

      st.addEventListener('keydown', (e) => {
        const step = 60;
        const hit = {
          ArrowLeft: () => { tx += step; apply(false); },
          ArrowRight: () => { tx -= step; apply(false); },
          ArrowUp: () => { ty += step; apply(false); },
          ArrowDown: () => { ty -= step; apply(false); },
          '+': () => zoomBy(1.4, true), '=': () => zoomBy(1.4, true),
          '-': () => zoomBy(1 / 1.4, true), '_': () => zoomBy(1 / 1.4, true),
          0: () => fit(true),
        }[e.key];
        if (hit) { e.preventDefault(); hit(); }
      });

      // Dragging the image itself would otherwise start a native image drag.
      st.addEventListener('dragstart', (e) => e.preventDefault());

      /* Rotating the phone changes the stage's shape. Hold on to whatever you
         were looking at: the open pin if there is one, otherwise the point in
         the middle of the view. */
      let rz = 0;
      addEventListener('resize', () => {
        if (!pk) return;
        cancelAnimationFrame(rz);
        /* The old view centre has to be read now, before the stage changes
           shape. The selection is read in the callback instead: browsers fire
           a spurious resize during load, and capturing the selection here
           would let that stale "nothing selected" overwrite a deep-linked pin
           in the very same frame. */
        const cx = (sw / 2 - tx) / (bw * k), cy = (sh / 2 - ty) / (bh * k);
        const k0 = k;
        rz = requestAnimationFrame(() => {
          measure();
          const sel = state.place ? pk._byId[state.place] : null;
          if (sel) centreOn(sel.x, sel.y, k, false);
          else if (k0 > 1.02) centreOn(cx, cy, k0, false);
          else fit(false);
        });
      });

      addEventListener('keydown', (e) => {
        if (e.key !== 'Escape') return;
        if (state.place) { select(null); return; }
        if (state.mapFull) setFull(false);
      });

      /* Waits land asynchronously and may never land at all. Redraw only the
         open card: the pins don't show times, so nothing else can change. */
      Waits.onChange((key) => {
        if (pk && pk.key === key && state.place) renderCard();
      });
    }

    /* -------------------------------------------------------------- api -- */

    return {
      /** First paint. The stage has a CSS height, so the geometry is known
          before the image arrives and nothing jumps when it lands. */
      init() {
        if (built) return;
        built = true;
        // show() resets the selection when it swaps park, so hold on to the
        // deep-linked pin across it.
        const want = state.place;
        const day = state.mapDay;
        const start = PARK_BY_KEY[state.mapKey] || mapOf(DAYS[state.activeDay - 1])
          || PARK_MAPS[0];
        show(start.key, { url: false });
        if (day) { state.mapDay = day; renderFilters(); renderPins(); }
        bind();
        if (want) {
          requestAnimationFrame(() => select(want, { url: false, anim: false }));
        }
      },
      show,
      select,
      setFull,
      toggleFull: () => setFull(!state.mapFull),
      zoomBy,
      fit,
      refit: () => { measure(); apply(false); },
      /** Called when the person filter changes — pins restyle in place. */
      repaint() {
        if (!pk) return;
        renderFilters();
        renderPins();
        renderCard();
      },
      setDay(n) {
        state.mapDay = n && pk.days.includes(n) ? n : null;
        state.place = null;
        renderFilters();
        renderPins();
        renderCard();
        writeURL();
      },
      setAll(on) {
        state.mapAll = !!on;
        renderFilters();
        renderPins();
        writeURL();
      },
      setCare(on) {
        state.mapCare = !!on;
        /* Turning the layer off while one of its pins is open would leave the
           card describing something no longer on screen. */
        if (!state.mapCare && state.place && pk && pk._byId[state.place]
            && pk._byId[state.place].facility) state.place = null;
        renderFilters();
        renderPins();
        renderCard();
        writeURL();
      },
      /** Ask for fresh waits — user-driven only, never on page load. */
      waits() { if (pk) Waits.load(pk); },
      /** Jump to the map from anywhere else on the page. */
      open(key, opts) {
        const o = opts || {};
        show(key, { day: o.day, url: false });
        measure();
        if (o.place) select(o.place, { k: o.k, anim: !REDUCED });
        else { fit(false); writeURL(); }
        // Skip the heading, but keep the park tabs in shot: arriving on a map
        // with no idea which park it is, or how to change it, is disorienting.
        jumpTo('#parkPicker');
      },
      park: () => pk,
    };
  }());

  /** The chip under a park day's heading, and the link under a single card. */
  function mapChip(day) {
    const m = mapOf(day);
    if (!m) return '';
    return `<button class="dh-chip" data-openmap="${m.key}" data-mapopenday="${day.n}">${
      svg('i-map')} Park map</button>`;
  }
  function mapLink(item) {
    if (!item._place) return '';
    const p = item._place;
    return `<button class="maplink" data-openmap="${p._park.key}"
      data-mapplace="${p.id}" data-mapopenday="${item._day.n}">${svg('i-pin')
      }<span>${esc(p.land)}</span><span class="ml-go">on the map</span></button>`;
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
    nowSig = heroSig = ''; // identity changed, so the live cards must rebuild
    renderAgenda(true);
    renderRooms();
    renderDining();
    MapView.repaint();
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

  /* One request covers the whole trip; each day head paints from the cache.
     Forecasts only reach ~16 days out, so early on most days come back empty
     and simply stay hidden. */
  const WX_BY_DATE = {};

  async function loadTripWeather() {
    try {
      const u = `https://api.open-meteo.com/v1/forecast?latitude=${TRIP.coords.lat}` +
        `&longitude=${TRIP.coords.lon}&daily=temperature_2m_max,temperature_2m_min,weather_code,` +
        `precipitation_probability_max&timezone=${encodeURIComponent(TZ)}` +
        `&start_date=${DAYS[0].date}&end_date=${DAYS[DAYS.length - 1].date}`;
      const r = await fetch(u);
      if (!r.ok) return;
      const d = (await r.json()).daily;
      if (!d || !d.time) return;
      d.time.forEach((date, i) => {
        WX_BY_DATE[date] = {
          code: d.weather_code[i],
          hi: Math.round(d.temperature_2m_max[i]),
          lo: Math.round(d.temperature_2m_min[i]),
          rain: d.precipitation_probability_max[i],
        };
      });
      paintWeather();
    } catch (e) { /* offline is fine */ }
  }

  function paintWeather() {
    // Revealing nine chips adds ~600px above the fold. Without compensation
    // the page lurches out from under whoever is mid-scroll when the forecast
    // finally arrives, and any ?day= deep link lands short.
    preserveScroll(() => {
      $$('[data-wx]').forEach((host) => {
        const f = WX_BY_DATE[host.dataset.wx];
        if (!f || f.hi == null) return;
        const w = WX[f.code] || ['', ''];
        host.innerHTML = `${w[1]} ${esc(w[0])} · ${f.hi}° / ${f.lo}°C` +
          (f.rain != null ? ` · ${f.rain}% rain` : '');
        host.hidden = false;
      });
    });
    measureDays();
    spy();
  }

  /* ---------------------------------------------------------------- tick -- */

  function tick() {
    const now = Date.now();
    renderHeroLive();
    renderNow();
    syncNowMarker();

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

  function wire() {
    document.addEventListener('click', (e) => {
      // day pills / "keep scrolling" dividers — scroll, never swap views
      const jd = e.target.closest('[data-jumpday]');
      if (jd) {
        e.preventDefault();
        jumpDay(parseInt(jd.dataset.jumpday, 10));
        return;
      }
      // deep links straight to one timeline entry
      const jn = e.target.closest('[data-jumpnow]');
      if (jn) {
        e.preventDefault();
        MapView.setFull(false);
        const id = (jn.getAttribute('href') || '').slice(1);
        const el = document.getElementById(id);
        if (el) {
          // Expand before measuring, and without the transition, so the
          // layout is final when we work out where to scroll. Animating it
          // here would move the target while we were travelling to it.
          const card = $('[data-exp]', el);
          if (card && card.getAttribute('aria-expanded') === 'false') {
            card.classList.add('insta');
            state.open[card.dataset.exp] = true;
            card.setAttribute('aria-expanded', 'true');
            void el.offsetHeight;
            requestAnimationFrame(() => card.classList.remove('insta'));
          }
          // No point animating in something you just asked to be taken to.
          el.classList.add('in');
          jumpTo(el);
          el.classList.remove('flash');
          void el.offsetWidth;
          el.classList.add('flash');
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
        renderAgenda(true);
        MapView.repaint();
        return;
      }
      // park maps ---------------------------------------------------------
      const om = e.target.closest('[data-openmap]');
      if (om) {
        e.preventDefault();
        MapView.open(om.dataset.openmap, {
          place: om.dataset.mapplace || null,
          day: om.dataset.mapopenday ? parseInt(om.dataset.mapopenday, 10) : undefined,
        });
        return;
      }
      const tab = e.target.closest('[data-park]');
      // Picking a park is a deliberate act, so it's a fair moment to go and
      // get the waits. Page load is not, which is why this isn't in show().
      if (tab) { MapView.show(tab.dataset.park); MapView.waits(); return; }
      const mday = e.target.closest('[data-mapday]');
      if (mday) { MapView.setDay(parseInt(mday.dataset.mapday, 10)); return; }
      const mall = e.target.closest('[data-mapall]');
      if (mall) { MapView.setAll(mall.dataset.mapall === '1'); return; }
      const mcare = e.target.closest('[data-mapcare]');
      if (mcare) { MapView.setCare(mcare.dataset.mapcare === '1'); return; }
      const pinb = e.target.closest('[data-place]');
      if (pinb) { MapView.select(pinb.dataset.place); return; }
      if (e.target.closest('[data-closeplace]')) { MapView.select(null); return; }
      if (e.target.closest('#mapIn')) { MapView.zoomBy(1.6, true); return; }
      if (e.target.closest('#mapOut')) { MapView.zoomBy(1 / 1.6, true); return; }
      if (e.target.closest('#mapFit')) { MapView.fit(true); return; }
      if (e.target.closest('#mapFull')) { MapView.toggleFull(); return; }
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
      const b = e.target.closest('[data-icsday]');
      if (!b) return;
      const day = DAYS[parseInt(b.dataset.icsday, 10) - 1];
      download(buildICS(day.items, `Disney Day ${day.n} · ${day.kicker}`),
        `disney-2026-day-${day.n}.ics`);
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

    // keyboard: left/right skip a day forward or back
    document.addEventListener('keydown', (e) => {
      const t = e.target;
      if (t instanceof Element && t.closest('input, textarea, dialog')) return;
      if (e.key === 'ArrowRight') { e.preventDefault(); jumpDay(state.activeDay + 1); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); jumpDay(state.activeDay - 1); }
    });

    // sticky shadow, back-to-top, scroll spy — one rAF-throttled listener
    const nav = $('#topnav'), top = $('#toTop');
    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        nav.classList.toggle('is-stuck', scrollY > innerHeight * 0.92);
        top.classList.toggle('show', scrollY > innerHeight * 1.4);
        spy();
      });
    };
    addEventListener('scroll', onScroll, { passive: true });
    addEventListener('resize', () => { measureNav(); spy(); });
    // A hands-on scroll immediately outranks an in-flight jump. touchmove,
    // not touchstart, so tapping a day pill doesn't cancel its own jump.
    ['wheel', 'touchmove'].forEach((ev) =>
      addEventListener(ev, () => { spyLock = 0; userScrolled = true; }, { passive: true }));
    onScroll();
    top.addEventListener('click', () => scrollTo({ top: 0, behavior: SMOOTH }));

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
      const prevMe = state.me, prevOnly = state.mineOnly;
      readURL();
      renderWhoBtn();
      if (state.me !== prevMe || state.mineOnly !== prevOnly) {
        renderStrip(); renderAgenda(); renderRooms(); renderDining(); renderNow();
      }
      if (state.jumpTo) jumpDay(state.jumpTo);
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

  renderWhoBtn();
  renderStrip();
  renderAgenda();
  renderRooms();
  renderDining();
  renderNotes();
  MapView.init();
  renderNow();
  renderHeroLive();
  wire();
  observeReveals(document);
  loadCurrentWeather();
  loadTripWeather();
  document.body.dataset.theme = DAYS[state.activeDay - 1].theme;

  // A ?day= or #day- link lands you at that day; otherwise you start at the top.
  if (state.jumpTo) {
    requestAnimationFrame(() => jumpDay(state.jumpTo));
  }

  addEventListener('hashchange', () => {
    const h = /^#day-(\d+)$/.exec(location.hash);
    if (h) jumpDay(parseInt(h[1], 10));
  });

  setInterval(tick, 1000);
  // Re-render once a day rolls over if the page is left open overnight.
  let lastToday = resortToday();
  setInterval(() => {
    const t = resortToday();
    if (t !== lastToday) { lastToday = t; renderStrip(); renderAgenda(true); }
  }, 60000);

  document.addEventListener('visibilitychange', () => { if (!document.hidden) tick(); });

  if ('serviceWorker' in navigator) {
    addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
  }
})();
