(() => {
  'use strict';
  document.documentElement.classList.add('js');
  // ΝΟΜΙΚΑ ΣΤΟΙΧΕΙΑ ΦΟΡΕΑ: συμπλήρωσε εδώ ΜΟΝΟ αληθή στοιχεία. Ό,τι μένει κενό ('') δεν εμφανίζεται στη σελίδα «Ταυτότητα & διαφάνεια».
  const ENTITY = {
    name: 'Αντωνία Τσελίκα (ατομική επιχείρηση)',        // Επωνυμία φορέα όπως στο ΓΕΜΗ, π.χ. 'ΧΧΧ ΜΟΝΟΠΡΟΣΩΠΗ Ε.Π.Ε.'
    form: 'Ατομική επιχείρηση',        // Νομική μορφή
    afm: '069886969',         // ΑΦΜ
    doy: 'Πατρών',         // ΔΟΥ
    gemi: '034904916000',        // Αριθμός ΓΕΜΗ
    address: 'Θάσου 6, 265 04 Ρίο Πατρών',     // Έδρα (οδός, αριθμός, ΤΚ, πόλη)
    licence: 'Βεβαίωση νόμιμης λειτουργίας ΕΣΡ: ΥΠ.ΤΥΠ. 25061/Ε1/5015/17-12-2002 · Αρ. μητρώου ΕΣΡ 323',     // Άδεια λειτουργίας / στοιχεία ΕΣΡ
    owners: 'Αντωνία Τσελίκα, μοναδική ιδιοκτήτρια (100%) της ατομικής επιχείρησης. Δεν υπάρχουν εταίροι, μέτοχοι ή έμμεσοι ιδιοκτήτες.',      // Άμεσοι και έμμεσοι ιδιοκτήτες
    beneficial: 'Αντωνία Τσελίκα (φυσικό πρόσωπο, 100%)',  // Πραγματικοί δικαιούχοι
    stateAds: ''     // Ποσό κρατικής διαφήμισης που εισπράχθηκε το προηγούμενο έτος, π.χ. '0 €' ή '1.250 €'
  };
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
  // Ηχογραφημένες εκπομπές του Mega (Δευτέρα–Παρασκευή) με ΣΤΑΘΕΡΗ ώρα έναρξης.
  // Κάθε εκπομπή διαρκεί 40–60΄: μέχρι `certain` παίζει σίγουρα, μέχρι `to` το πολύ, και μετά συνεχίζει η μουσική.
  // `at`: ώρα που προβλήθηκε αρχικά στο Mega News 104,6 (μπορεί να είναι της προηγούμενης ημέρας).
  // `re`: λέξεις που ψάχνει στον τίτλο του stream (χωρίς τόνους) για να ξέρει ότι παίζει η εκπομπή.
  // Βάλε true για να εμφανιστούν ξανά οι ηχογραφημένες εκπομπές στο πρόγραμμα και στα κείμενα.
  const SHOW_REC = false;
  const REC = [
    { from: '19:00', certain: '19:40', to: '20:00', ti: 'Μαινάδες', ho: 'Α. Γιάμαλη – Τζ. Μοσχολιού', at: '12:00', re: /μαιναδ|mainad/ },
    { from: '20:00', certain: '20:40', to: '21:00', ti: 'Θεός Φυλάξοι', ho: 'Δ. Βερύκιος – Δ. Αλφιέρης', at: '15:00', re: /φυλαξ|fylax|filax/ }
  ];
  if (!SHOW_REC) document.querySelectorAll('[data-rec]').forEach(el => el.remove());
  const DN = ['Κυριακή','Δευτέρα','Τρίτη','Τετάρτη','Πέμπτη','Παρασκευή','Σάββατο'];
  function day(d) {
    const out = []; let t = 0;
    const wk = d >= 1 && d <= 5;
    const list = wk ? [...WD, ...(SHOW_REC ? REC : []).map(r => [r.from, r.to, r.ti, r.ho, r])] : WE;
    for (const [a, b, ti, ho, rec] of list) {
      if (T(a) > t) out.push({ ...OWN, a: t, b: T(a) });
      out.push({ a: T(a), b: T(b), ti, ho, rec: rec || null }); t = T(b);
    }
    if (t < 1440) out.push({ ...OWN, a: t, b: 1440 });
    return out;
  }
  // Παίζει τώρα αυτή η ηχογραφημένη εκπομπή; Ο τίτλος του stream έχει προτεραιότητα, αλλιώς πάει με την ώρα.
  // Όταν το Icecast στέλνει τίτλο, αυτός αποφασίζει ακριβώς πότε ξεκινά και πότε τελειώνει η εκπομπή.
  // Μόνο αν δεν υπάρχει τίτλος (π.χ. το stream δεν απαντά) πέφτουμε στην ώρα του προγράμματος.
  const recOn = (r, m) => meta ? r.re.test(norm(meta)) : m < T(r.certain);
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
      const now = d === n.d && n.m >= s.a && n.m < s.b && (!s.rec || recOn(s.rec, n.m));
      if (s.rec) {
        const r = s.rec;
        return `<li class="slot rec${now ? ' now' : ''}"><time>από ${r.from}</time><div><ol class="recs"><li><span class="ico-rec"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3.6" fill="currentColor" stroke="none"/></svg></span><div><b>${r.ti}</b><span>${r.ho}</span><small><svg class="ico-back" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/><path d="M12 8v4l3 2"/></svg>Αρχικά στις ${r.at} · 40–60΄</small></div><button type="button" class="info-btn" data-info aria-haspopup="dialog" aria-label="Πληροφορίες για τις ηχογραφημένες εκπομπές"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/></svg></button></li></ol></div><em>Ηχογραφημένο</em></li>`;
      }
      const body = s.own ? `<b>${s.ti.replace('&', '&amp;')}</b><span>${s.ho}</span>` : `<b>${s.ti}</b><span>${s.ho}</span>`;
      return `<li class="slot ${s.own ? 'own' : 'relay'}${now ? ' now' : ''}"><time>${fmt(s.a)} – ${fmt(s.b)}</time><div>${body}</div>${s.own ? '' : '<em>Αναμετάδοση Mega</em>'}</li>`;
    }).join('');
  }
  const infod = $('infod');
  function openInfo() {
    const ends = REC.map(r => `<li><b>${r.ti}</b>: ξεκινά ${r.from}, τελειώνει ${r.certain}–${r.to}</li>`).join('');
    $('infod-b').innerHTML = `<p>Πρόκειται για ηχογραφημένες αναμεταδόσεις από το <strong>Mega News 104,6</strong>. Ξεκινούν σε σταθερή ώρα και έχουν μεταβλητή διάρκεια, από 40 έως 60 λεπτά. Μόλις τελειώσουν, συνεχίζει η μουσική.</p><ul class="mini-list">${ends}</ul><p>Ανάλογα με το πότε το Mega News 104,6 διαθέτει κάθε εκπομπή, μπορεί να είναι της προηγούμενης ημέρας.</p>`;
    infod.showModal();
  }
  plist.addEventListener('click', e => { if (e.target.closest('[data-info]')) openInfo(); });
  $('infod-x').onclick = () => infod.close();
  infod.addEventListener('click', e => { if (e.target === infod) infod.close(); });
  [1,2,3,4,5,6,0].forEach(d => {
    const b = document.createElement('button');
    b.type = 'button'; b.dataset.d = d; b.setAttribute('role', 'tab'); b.textContent = DN[d];
    b.onclick = () => drawDay(d); tabs.append(b);
  });
  function nowNext() {
    const n = athens(), list = day(n.d);
    const cur = list.find(x => n.m >= x.a && n.m < x.b);
    const nxt = list.find(x => x.a >= cur.b) || day((n.d + 1) % 7)[0];
    const musicNow = cur.own || (cur.rec && !recOn(cur.rec, n.m));
    const what = (x, music) => (x.own || music) ? 'Alternative & Top 40' : x.ti;
    const sub = (x, music) => (x.own || music) ? 'Ξένη μουσική' : x.rec ? 'Ηχογραφημένη αναμετάδοση Mega · ' + x.ho : 'Αναμετάδοση Mega 104,6 · ' + x.ho;
    $('now-t').textContent = what(cur, musicNow);
    $('now-s').textContent = sub(cur, musicNow) + (cur.rec && !musicNow ? ' · έως ' + cur.rec.certain + '–' + cur.rec.to : ' · έως ' + fmt(cur.b % 1440));
    $('next-t').textContent = what(nxt);
    $('next-s').textContent = sub(nxt) + ' · από ' + fmt(nxt.a);
  }

  // ================= Σελίδες (hash router, ο ήχος δεν διακόπτεται) =================
  const ROUTES = { '/': 'home', '/programma': 'programma', '/diafimisi': 'diafimisi', '/epikoinonia': 'epikoinonia', '/oroi-xrisis': 'oroi-xrisis', '/aporrito': 'aporrito', '/cookies': 'cookies', '/taytotita': 'taytotita' };
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
    const relay = !s.own && (!s.rec || recOn(s.rec, n.m));
    const mega = relay || /mega\s*news|104[.,]6/i.test(meta);
    let title, artist, label;
    if (relay && s.rec) { title = s.ti; artist = s.ho; label = 'Ηχογραφημένη αναμετάδοση · Mega News 104,6'; }
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
  // ================= Ταυτότητα & διαφάνεια =================
  function fillDl(id, rows) {
    const dl = $(id); if (!dl) return;
    for (const [label, val, first] of rows) {
      if (!val) continue;
      const row = document.createElement('div'), dt = document.createElement('dt'), dd = document.createElement('dd');
      dt.textContent = label; dd.textContent = val; row.append(dt, dd);
      first ? dl.prepend(row) : dl.append(row);
    }
  }
  fillDl('ident', [['Άδεια / ΕΣΡ', ENTITY.licence], ['Έδρα', ENTITY.address], ['ΓΕΜΗ', ENTITY.gemi], ['ΑΦΜ / ΔΟΥ', [ENTITY.afm, ENTITY.doy].filter(Boolean).join(' / ')], ['Νομική μορφή', ENTITY.form], ['Επωνυμία φορέα', ENTITY.name]].map(r => [...r, true]));
  fillDl('transp', [['Ιδιοκτήτες (άμεσοι και έμμεσοι)', ENTITY.owners], ['Πραγματικοί δικαιούχοι', ENTITY.beneficial], ['Κρατική διαφήμιση (προηγούμενο έτος)', ENTITY.stateAds]]);
  if (!$('transp').children.length) $('transp').remove();

  // ================= Ενημέρωση για αποθήκευση ρυθμίσεων =================
  const notice = $('notice');
  let seen = false; try { seen = localStorage.getItem('notice') === '1'; } catch (e) {}
  if (!seen) { notice.hidden = false; document.body.classList.add('has-notice'); }
  $('notice-ok').onclick = () => { notice.hidden = true; document.body.classList.remove('has-notice'); try { localStorage.setItem('notice', '1'); } catch (e) {} };
  $('clear-prefs').onclick = () => {
    try { for (const k of ['theme', 'vol', 'notice']) localStorage.removeItem(k); } catch (e) {}
    delete root.dataset.theme; themeColor(); vol.value = 0.8; audio.volume = 0.8;
    $('clear-msg').textContent = 'Οι αποθηκευμένες ρυθμίσεις διαγράφηκαν.';
  };

  route(); render(); poll(); setInterval(poll, 15000); setInterval(render, 30000);
  document.addEventListener('visibilitychange', () => !document.hidden && poll());

  // ================= Καιρός Πάτρας (Open-Meteo) =================
  const WX = { 0: ['☀️', 'Καθαρός'], 1: ['🌤️', 'Σχεδόν καθαρός'], 2: ['⛅', 'Λίγα σύννεφα'], 3: ['☁️', 'Συννεφιά'], 45: ['🌫️', 'Ομίχλη'], 48: ['🌫️', 'Ομίχλη'], 51: ['🌦️', 'Ψιλόβροχο'], 53: ['🌦️', 'Ψιλόβροχο'], 55: ['🌦️', 'Ψιλόβροχο'], 61: ['🌧️', 'Βροχή'], 63: ['🌧️', 'Βροχή'], 65: ['🌧️', 'Έντονη βροχή'], 71: ['❄️', 'Χιόνι'], 80: ['🌦️', 'Μπόρες'], 81: ['🌧️', 'Μπόρες'], 82: ['⛈️', 'Έντονες μπόρες'], 95: ['⛈️', 'Καταιγίδα'], 96: ['⛈️', 'Καταιγίδα'], 99: ['⛈️', 'Καταιγίδα'] };
  getJSON('https://api.open-meteo.com/v1/forecast?latitude=38.2466&longitude=21.7346&current=temperature_2m,weather_code&timezone=Europe%2FAthens')
    .then(d => { const c = d.current, w = WX[c.weather_code] || ['🌡️', ''], el = $('weather'); el.textContent = `${w[0]} Πάτρα ${Math.round(c.temperature_2m)}°C ${w[1]}`; el.hidden = false; }).catch(() => {});

  // ================= Φόρμα επικοινωνίας (mailto, χωρίς αποστολή από τον ιστότοπο) =================
  const cf = $('cform'), cs = $('cstatus'), cc = $('ccopy');
  const MAIL = 'themapatras@gmail.com';
  const compose = () => {
    const d = Object.fromEntries(new FormData(cf));
    const subject = `${d.topic} – από το site`;
    const body = `Όνομα: ${d.name}\n${d.phone ? 'Τηλέφωνο: ' + d.phone + '\n' : ''}\n${d.message}`;
    return { subject, body };
  };
  cf.addEventListener('submit', e => {
    e.preventDefault();
    if (!cf.reportValidity()) return;
    const { subject, body } = compose();
    location.href = `mailto:${MAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    cs.className = 'cstatus ok';
    cs.textContent = 'Αν δεν άνοιξε το email σας, αντιγράψτε το μήνυμα και στείλτε το στο ' + MAIL + '.';
    cc.hidden = false;
  });
  cc.addEventListener('click', async () => {
    const { subject, body } = compose();
    const text = `Προς: ${MAIL}\nΘέμα: ${subject}\n\n${body}`;
    try { await navigator.clipboard.writeText(text); cs.textContent = 'Το μήνυμα αντιγράφηκε. Επικολλήστε το στο email σας.'; }
    catch { cs.textContent = 'Δεν έγινε αντιγραφή. Στείλτε το μήνυμά σας στο ' + MAIL + '.'; }
  });
})();
