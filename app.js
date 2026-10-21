(() => {
  'use strict';
  document.documentElement.classList.add('js');
  const STREAM = 'https://radio.themapatras.gr/radio';
  const STATUS = 'https://radio.themapatras.gr/status-json.xsl';
  const MARK = 'images/mark.png';
  const MEGA = 'images/mega-logo.png';
  const $ = id => document.getElementById(id);
  const abs = u => new URL(u, location.href).href;
  const audio = $('audio'), card = $('player'), vol = $('vol'), mini = $('mini');
  const elTitle = $('title'), elArtist = $('artist'), elStatus = $('status'), elLabel = $('label');
  const art = $('art'), mart = $('mart'), amb = $('ambient');
  let wantPlay = false, retries = 0, retryTimer, last = '', meta = '', seq = 0;
  $('year').textContent = new Date().getFullYear();

  // ================= Θέμα (φωτεινό / σκούρο) =================
  const root = document.documentElement;
  const dark = () => root.dataset.theme ? root.dataset.theme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
  const themeColor = () => {
    let m = document.querySelector('meta[name=theme-color]');
    if (m) m.content = dark() ? '#151517' : '#fbfbfd';
  };
  themeColor();
  matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', themeColor);
  $('theme').addEventListener('click', () => {
    const next = dark() ? 'light' : 'dark';
    root.dataset.theme = next; themeColor();
    try { localStorage.setItem('theme', next); } catch (e) {}
  });

  // ================= Player =================
  const playBtns = [...document.querySelectorAll('[data-play]')];
  const setState = s => {
    document.body.classList.toggle('playing', s === 'playing');
    document.body.classList.toggle('loading', s === 'loading');
    for (const el of [card, mini]) { el.classList.toggle('playing', s === 'playing'); el.classList.toggle('loading', s === 'loading'); }
    const label = s === 'idle' ? 'Αναπαραγωγή' : 'Παύση';
    for (const b of playBtns) if (b.classList.contains('play')) b.setAttribute('aria-label', label);
    $('hero-play').textContent = s === 'idle' ? 'Ακούστε τώρα' : 'Παύση';
    if ('mediaSession' in navigator) navigator.mediaSession.playbackState = s === 'playing' ? 'playing' : 'paused';
  };
  function start() {
    wantPlay = true; clearTimeout(retryTimer); elStatus.textContent = '';
    setState('loading');
    audio.src = STREAM + '?t=' + Date.now();
    audio.play().catch(onFail);
  }
  function stop() {
    wantPlay = false; retries = 0; clearTimeout(retryTimer);
    audio.pause(); audio.removeAttribute('src'); audio.load();
    setState('idle'); elStatus.textContent = '';
  }
  function onFail() {
    if (!wantPlay) return;
    if (retries < 4) { retries++; setState('loading'); elStatus.textContent = 'Επανασύνδεση…'; retryTimer = setTimeout(start, 1000 * retries); }
    else { wantPlay = false; setState('idle'); elStatus.textContent = 'Δεν ήταν δυνατή η σύνδεση. Δοκιμάστε ξανά σε λίγο.'; }
  }
  for (const b of playBtns) b.addEventListener('click', () => (wantPlay ? stop() : start()));
  audio.addEventListener('playing', () => { retries = 0; elStatus.textContent = ''; setState('playing'); });
  audio.addEventListener('playing', () => lastMS && setMS(...lastMS));
  audio.addEventListener('waiting', () => wantPlay && setState('loading'));
  audio.addEventListener('error', onFail);
  audio.addEventListener('stalled', () => wantPlay && setTimeout(() => audio.paused && onFail(), 4000));
  audio.addEventListener('pause', () => { if (wantPlay && document.body.classList.contains('playing')) stop(); });
  try { const v = localStorage.getItem('vol'); if (v !== null) vol.value = v; } catch (e) {}
  audio.volume = +vol.value;
  vol.addEventListener('input', () => { audio.volume = +vol.value; try { localStorage.setItem('vol', vol.value); } catch (e) {} });
  if ('mediaSession' in navigator) for (const [a, f] of [['play', start], ['pause', stop], ['stop', stop]]) { try { navigator.mediaSession.setActionHandler(a, f); } catch (e) {} }

  // ================= Πρόγραμμα (ώρα Ελλάδας) =================
  const T = s => { const [h, m] = s.split(':'); return +h * 60 + +m; };
  const fmt = m => String(m / 60 | 0).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0');
  // Ώρες αναμετάδοσης Mega News 104,6 (άλλαξε εδώ αν αλλάξει το πρόγραμμα)
  const WD = [['08:00','08:15','Πρωινό Magazino','Μαρία Αλυφαντή'],['08:15','10:00','Αντικριστοί','Γ. Χουδαλάκης – Δ. Καμπουράκης'],['10:00','11:00','Το Ημερολόγιο','Παύλος Τσίμας'],['11:00','12:00','Διπλός Μπέλας','Ι. Χασαπόπουλος – Α. Βούλγαρη'],['13:00','14:00','Ανατροπές','Ρ. Τζίμα – Γ. Παπαχρήστος'],['14:00','15:00','Κεντρικό Magazino','Νίκη Λυμπεράκη']];
  const WE = [['07:00','09:00','Μη με ξυπνάς από τις έξι','Κώστας Αλατζάς'],['11:00','13:00','Βαρόμετρο','Ά. Ραβανός – Μ. Δούση'],['13:00','14:00','Αστάθμητος Παράγων','Χρήστος Χωμενίδης'],['14:00','15:00','Μεσημβρινό Magazino','Ζήσης Μούσιος']];
  const OWN = { own: 1, ti: 'Alternative & Top 40', ho: 'Ξένη μουσική, μόνο hits' };
  // Ηχογραφημένες εκπομπές του Mega (Δευτέρα–Παρασκευή): παίζουν στη σειρά από τις 18:00.
  // Η καθεμία διαρκεί 40–60΄, άρα το μπλοκ τελειώνει σίγουρα μετά τις 20:00 και το αργότερο στις 21:00.
  // `re`: λέξεις που ψάχνει στον τίτλο του stream (χωρίς τόνους) για να ξέρει ποια εκπομπή παίζει.
  const REC = {
    from: '18:00', certain: '20:00', to: '21:00',
    shows: [
      { ti: 'Μαινάδες', ho: 'Α. Γιάμαλη – Τζ. Μοσχολιού', at: '12:00', re: /μαιναδ|mainad/ },
      { ti: 'Θεός Φυλάξοι', ho: 'Δ. Βερύκιος – Δ. Αλφιέρης', at: '15:00', re: /φυλαξ|fylax|filax/ },
      { ti: 'Πού Πάμε;', ho: 'Ν. Κορωνάκης – Σ. Μπερετάνου', at: '17:00', re: /που παμε|pou pame/ }
    ]
  };
  const REC_NAMES = REC.shows.map(x => x.ti).join(' · ');
  const REC_TITLE = 'Ηχογραφημένες εκπομπές Mega';
  const DN = ['Κυριακή','Δευτέρα','Τρίτη','Τετάρτη','Πέμπτη','Παρασκευή','Σάββατο'];
  function day(d) {
    const out = []; let t = 0;
    const wk = d >= 1 && d <= 5;
    const list = wk ? [...WD, [REC.from, REC.to, REC_TITLE, REC_NAMES, 1]] : WE;
    for (const [a, b, ti, ho, rec] of list) {
      if (T(a) > t) out.push({ ...OWN, a: t, b: T(a) });
      out.push({ a: T(a), b: T(b), ti, ho, rec: !!rec }); t = T(b);
    }
    if (t < 1440) out.push({ ...OWN, a: t, b: 1440 });
    return out;
  }
  // Μέσα στο μπλοκ 18:00–21:00: παίζει εκπομπή ή μουσική; Ο τίτλος του stream έχει προτεραιότητα.
  function recState(m) {
    const k = norm(meta), i = REC.shows.findIndex(x => x.re.test(k));
    if (i >= 0) return { on: true, show: REC.shows[i] };
    return { on: m < T(REC.certain), show: null };
  }
  function athens() {
    const p = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Athens', weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date());
    const g = t => p.find(x => x.type === t).value;
    return { d: ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].indexOf(g('weekday')), m: +g('hour') * 60 + +g('minute') };
  }
  const tabs = $('tabs'), plist = $('plist');
  let selDay = null;
  function drawDay(d) {
    selDay = d;
    const n = athens();
    [...tabs.children].forEach(b => b.setAttribute('aria-selected', +b.dataset.d === d));
    plist.innerHTML = day(d).map(s => {
      const now = d === n.d && n.m >= s.a && n.m < s.b;
      if (s.rec) {
        const items = REC.shows.map(x => `<li><span class="ico-rec"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3.6" fill="currentColor" stroke="none"/></svg></span><div><b>${x.ti}</b><span>${x.ho}</span><small>Αρχικά στις ${x.at} · 40–60΄</small></div></li>`).join('');
        return `<li class="slot rec${now ? ' now' : ''}"><time>από ${fmt(s.a)}</time><div><b>Ηχογραφημένες εκπομπές</b><span>Αναμετάδοση Mega News 104,6 · μεταβλητή διάρκεια</span><ol class="recs">${items}</ol><p class="rnote"><span class="ico-back"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5M12 7v5l3 2"/></svg></span><span>Παίζουν στη σειρά και η καθεμία διαρκεί από 40 έως 60 λεπτά, οπότε το μπλοκ τελειώνει μεταξύ ${REC.certain} και ${REC.to}. Μετά συνεχίζει η μουσική. Ανάλογα με το πότε το Mega News 104,6 διαθέτει κάθε εκπομπή, μπορεί να είναι της προηγούμενης ημέρας.</span></p></div><em>Ηχογραφημένο</em></li>`;
      }
      const body = s.own ? `<b>${s.ti.replace('&', '&amp;')}</b><span>${s.ho}</span>` : `<b>${s.ti}</b><span>${s.ho}</span>`;
      return `<li class="slot ${s.own ? 'own' : 'relay'}${now ? ' now' : ''}"><time>${fmt(s.a)} – ${fmt(s.b)}</time><div>${body}</div>${s.own ? '' : '<em>Αναμετάδοση Mega</em>'}</li>`;
    }).join('');
  }
  [1,2,3,4,5,6,0].forEach(d => {
    const b = document.createElement('button');
    b.type = 'button'; b.dataset.d = d; b.setAttribute('role', 'tab'); b.textContent = DN[d];
    b.onclick = () => drawDay(d); tabs.append(b);
  });
  function nowNext() {
    const n = athens(), list = day(n.d);
    const cur = list.find(x => n.m >= x.a && n.m < x.b);
    const nxt = list.find(x => x.a >= cur.b) || day((n.d + 1) % 7)[0];
    const musicNow = cur.own || (cur.rec && !recState(n.m).on);
    const what = (s, music) => (s.own || music) ? 'Alternative & Top 40' : s.ti;
    const sub = (s, music) => (s.own || music) ? 'Ξένη μουσική' : s.rec ? 'Ηχογραφημένες · ' + REC_NAMES : 'Αναμετάδοση Mega 104,6 · ' + s.ho;
    $('now-t').textContent = what(cur, musicNow);
    $('now-s').textContent = sub(cur, musicNow) + (cur.rec && !musicNow ? ' · έως ' + REC.certain + '–' + REC.to : ' · έως ' + fmt(cur.b % 1440));
    $('next-t').textContent = what(nxt);
    $('next-s').textContent = sub(nxt) + ' · από ' + fmt(nxt.a);
  }

  // ================= Σελίδες (hash router, ο ήχος δεν διακόπτεται) =================
  const ROUTES = { '/': 'home', '/programma': 'programma', '/diafimisi': 'diafimisi', '/epikoinonia': 'epikoinonia' };
  const views = [...document.querySelectorAll('.view')];
  const navLinks = [...document.querySelectorAll('[data-r]')];
  const burger = $('burger'), menu = $('menu');
  const io = 'IntersectionObserver' in window ? new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold: .12 }) : null;
  function closeMenu() { menu.hidden = true; burger.setAttribute('aria-expanded', 'false'); }
  function route() {
    const name = ROUTES[location.hash.replace(/^#/, '') || '/'] || 'home';
    document.body.dataset.route = name;
    views.forEach(v => { v.hidden = v.id !== 'v-' + name; });
    const v = $('v-' + name);
    document.title = v.dataset.title;
    navLinks.forEach(a => a.dataset.r === name ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current'));
    closeMenu();
    window.scrollTo({ top: 0, behavior: 'instant' });
    if (name === 'programma') drawDay(selDay ?? athens().d);
    v.querySelectorAll('.reveal:not(.in)').forEach(el => io ? io.observe(el) : el.classList.add('in'));
    const h = v.querySelector('h1'); if (h) h.focus({ preventScroll: true });
  }
  burger.onclick = () => { const o = menu.hidden; menu.hidden = !o; burger.setAttribute('aria-expanded', String(o)); };
  document.addEventListener('keydown', e => e.key === 'Escape' && closeMenu());
  addEventListener('hashchange', route);

  // ================= Τώρα παίζει + artwork =================
  const norm = s => (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9α-ωάέήίόύώ ]+/g, ' ').replace(/\s+/g, ' ').trim();
  const clean = s => s.replace(/\([^)]*\)|\[[^\]]*\]/g, '').replace(/\b(feat|ft)\.?\s.*$/i, '').trim();
  const artCache = new Map();
  const same = (x, y) => !!x && !!y && (x.includes(y) || y.includes(x));
  const loads = url => new Promise(r => { const i = new Image(); i.onload = () => r(true); i.onerror = () => r(false); i.src = url; });
  const jsonp = (url, ms = 6000) => new Promise((res, rej) => {
    const cb = '__cb' + Math.random().toString(36).slice(2), s = document.createElement('script');
    const done = (v, err) => { clearTimeout(t); delete window[cb]; s.remove(); err ? rej(err) : res(v); };
    const t = setTimeout(() => done(null, new Error('timeout')), ms);
    window[cb] = v => done(v); s.onerror = () => done(null, new Error('load'));
    s.src = url + (url.includes('?') ? '&' : '?') + 'output=jsonp&callback=' + cb; document.head.append(s);
  });
  const getJSON = async (url, ms = 6000) => { const c = new AbortController(), t = setTimeout(() => c.abort(), ms); try { return await (await fetch(url, { signal: c.signal })).json(); } finally { clearTimeout(t); } };
  // Κάθε πηγή επιστρέφει [{artist,title,url}]
  const SOURCES = [
    async (a, t) => (await getJSON('https://itunes.apple.com/search?media=music&entity=song&limit=10&term=' + encodeURIComponent(a + ' ' + t))).results.map(x => ({ artist: x.artistName, title: x.trackName, url: (x.artworkUrl100 || '').replace('100x100bb', '600x600bb') })),
    async (a, t) => (await jsonp('https://api.deezer.com/search?limit=10&q=' + encodeURIComponent(`artist:"${a}" track:"${t}"`))).data.map(x => ({ artist: x.artist.name, title: x.title, url: x.album.cover_xl || x.album.cover_big })),
    async (a, t) => (await jsonp('https://api.deezer.com/search?limit=10&q=' + encodeURIComponent(a + ' ' + t))).data.map(x => ({ artist: x.artist.name, title: x.title, url: x.album.cover_xl || x.album.cover_big })),
    async (a, t) => { const d = await getJSON('https://musicbrainz.org/ws/2/recording/?fmt=json&limit=5&query=' + encodeURIComponent(`recording:"${t}" AND artist:"${a}"`)); return (d.recordings || []).flatMap(r => (r.releases || []).slice(0, 2).map(l => ({ artist: ((r['artist-credit'] || [])[0] || {}).name || '', title: r.title, url: 'https://coverartarchive.org/release/' + l.id + '/front-500' }))); }
  ];
  async function getArtwork(artist, song) {
    const key = artist + '|' + song;
    if (artCache.has(key)) return artCache.get(key);
    const a = norm(clean(artist)), t = norm(clean(song)), a1 = a.split(' ')[0];
    const A = clean(artist), Tt = clean(song);
    let weak = null;
    for (const src of SOURCES) {
      let list = [];
      try { list = await src(A, Tt); } catch (e) { continue; }
      for (const c of list) {
        if (!c.url) continue;
        const ca = norm(c.artist), ct = norm(c.title);
        const artistOk = same(ca, a) || (a1.length > 2 && ca.includes(a1));
        if (!artistOk) continue;
        if (same(ct, t)) { if (await loads(c.url)) { artCache.set(key, c.url); return c.url; } }
        else if (!weak) weak = c.url;
      }
    }
    if (weak && await loads(weak)) { artCache.set(key, weak); return weak; }
    artCache.set(key, null); return null;
  }
  const setImg = (src, ambient) => {
    for (const el of [art, mart]) { el.style.opacity = 0; setTimeout(() => { el.src = src; el.style.opacity = 1; }, 160); }
    amb.classList.toggle('on', !!ambient); if (ambient) amb.style.backgroundImage = `url("${ambient}")`;
  };
  art.addEventListener('error', () => { if (!art.src.endsWith(MARK)) art.src = MARK; });
  let lastMS = null;
  function setMS(title, artist, url, isMega) {
    lastMS = [title, artist, url, isMega];
    if (!('mediaSession' in navigator)) return;
    const artwork = url && !isMega
      ? [{ src: url, sizes: '512x512', type: 'image/jpeg' }]
      : [{ src: abs(isMega ? MEGA : MARK), sizes: '512x512', type: 'image/png' }];
    navigator.mediaSession.metadata = new MediaMetadata({ title, artist: artist || 'Θέμα Πάτρας 98.7 FM', album: isMega ? 'Mega News 104,6 · αναμετάδοση' : 'Θέμα Πάτρας 98.7 FM', artwork });
  }
  function render() {
    nowNext();
    const n = athens(), s = day(n.d).find(x => n.m >= x.a && n.m < x.b);
    const rs = s.rec ? recState(n.m) : null;
    const relay = !s.own && (!s.rec || rs.on);
    const mega = relay || /mega\s*news|104[.,]6/i.test(meta);
    let title, artist, label;
    if (relay && s.rec) { title = rs.show ? rs.show.ti : REC_TITLE; artist = rs.show ? rs.show.ho : REC_NAMES; label = 'Ηχογραφημένη αναμετάδοση · Mega News 104,6'; }
    else if (mega) { title = relay ? s.ti : 'Mega News 104,6'; artist = relay ? s.ho : ''; label = 'Αναμετάδοση · Mega News 104,6'; }
    else {
      const i = meta.indexOf(' - ');
      artist = i > 0 ? meta.slice(0, i).trim() : '';
      title = (i > 0 ? meta.slice(i + 3) : meta).trim() || '98.7 FM';
      label = 'Τώρα παίζει';
    }
    const key = (mega ? 'M|' : 'S|') + title + '|' + artist;
    if (key === last) return;
    last = key; const my = ++seq;
    elLabel.textContent = label; elTitle.textContent = title; elArtist.textContent = artist;
    $('mtitle').textContent = title; $('martist').textContent = artist || label;
    setMS(title, artist, null, mega);
    if (mega) return setImg(MEGA, null);
    setImg(MARK, null);
    if (artist) getArtwork(artist, title).then(u => { if (u && my === seq) { setImg(u, u); setMS(title, artist, u, false); } else if (!u) console.info('[artwork] δεν βρέθηκε για:', artist, '-', title); });
  }
  async function poll() {
    if (document.hidden && !wantPlay) return;
    try {
      const d = await (await fetch(STATUS, { cache: 'no-store' })).json();
      let s = d.icestats && d.icestats.source;
      if (Array.isArray(s)) s = s.find(x => /\/radio$/.test(x.listenurl || '')) || s[0];
      meta = (s && (s.title || s.yp_currently_playing)) || '';
    } catch (e) { console.info('[status] αποτυχία ανάγνωσης τίτλου:', e.message); }
    render();
  }
  route(); render(); poll(); setInterval(poll, 15000); setInterval(render, 30000);
  document.addEventListener('visibilitychange', () => !document.hidden && poll());

  // ================= Καιρός Πάτρας (Open-Meteo) =================
  const WX = { 0: ['☀️', 'Καθαρός'], 1: ['🌤️', 'Σχεδόν καθαρός'], 2: ['⛅', 'Λίγα σύννεφα'], 3: ['☁️', 'Συννεφιά'], 45: ['🌫️', 'Ομίχλη'], 48: ['🌫️', 'Ομίχλη'], 51: ['🌦️', 'Ψιλόβροχο'], 53: ['🌦️', 'Ψιλόβροχο'], 55: ['🌦️', 'Ψιλόβροχο'], 61: ['🌧️', 'Βροχή'], 63: ['🌧️', 'Βροχή'], 65: ['🌧️', 'Έντονη βροχή'], 71: ['❄️', 'Χιόνι'], 80: ['🌦️', 'Μπόρες'], 81: ['🌧️', 'Μπόρες'], 82: ['⛈️', 'Έντονες μπόρες'], 95: ['⛈️', 'Καταιγίδα'], 96: ['⛈️', 'Καταιγίδα'], 99: ['⛈️', 'Καταιγίδα'] };
  getJSON('https://api.open-meteo.com/v1/forecast?latitude=38.2466&longitude=21.7346&current=temperature_2m,weather_code&timezone=Europe%2FAthens')
    .then(d => { const c = d.current, w = WX[c.weather_code] || ['🌡️', ''], el = $('weather'); el.textContent = `${w[0]} Πάτρα ${Math.round(c.temperature_2m)}°C ${w[1]}`; el.hidden = false; }).catch(() => {});

  // ================= Φόρμα επικοινωνίας =================
  const cf = $('cform'), cs = $('cstatus'), cm = $('cmail');
  cf.addEventListener('submit', async e => {
    e.preventDefault();
    if (!cf.reportValidity()) return;
    const data = Object.fromEntries(new FormData(cf));
    if (data._honey) return;
    const b = cf.querySelector('button[type=submit]'); b.disabled = true; cm.hidden = true;
    cs.className = 'cstatus'; cs.textContent = 'Αποστολή…';
    try {
      const r = await fetch('https://formsubmit.co/ajax/themapatras@gmail.com', { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(data) });
      const d = await r.json();
      if (!r.ok || String(d.success) !== 'true') throw new Error(d.message || r.status);
      cf.reset(); cs.className = 'cstatus ok'; cs.textContent = 'Ευχαριστούμε! Το μήνυμά σας στάλθηκε.';
    } catch (err) {
      console.warn('[form]', err);
      cs.className = 'cstatus err'; cs.textContent = 'Δεν στάλθηκε αυτόματα. Μπορείτε να το στείλετε από το email σας:';
      cm.href = 'mailto:themapatras@gmail.com?subject=' + encodeURIComponent('Μήνυμα από το site') + '&body=' + encodeURIComponent(`Όνομα: ${data.name}\nEmail: ${data.email}\nΤηλέφωνο: ${data.phone || '-'}\n\n${data.message}`);
      cm.hidden = false;
    }
    setTimeout(() => (b.disabled = false), 5000);
  });
})();
