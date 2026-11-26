#!/usr/bin/env python3
"""Φτιάχνει τις στατικές σελίδες (/programma/ κ.λπ.).

Πηγή αλήθειας:
  - index.html: κοινό κέλυφος (head, header, footer, mini player) και η αρχική (v-home)
  - <σελίδα>/index.html: το πλήρες περιεχόμενο της δικής της ενότητας (v-<σελίδα>)
Κάθε σελίδα περιέχει πλήρες ΜΟΝΟ το δικό της περιεχόμενο (+ την αρχική, που έχει τον player).
Οι υπόλοιπες ενότητες μπαίνουν κενές με data-lazy και φορτώνονται από το app.js όταν χρειαστούν.
Έτσι το Google δεν βλέπει τις σελίδες ως διπλότυπες.
Χρήση: python3 tools/build.py   (από τη ρίζα του repo)
"""
import re, json, pathlib, html
ROOT = pathlib.Path(__file__).resolve().parent.parent
ORIGIN = 'https://themapatras.gr'
NAMES = ['home', 'programma', 'diafimisi', 'epikoinonia', 'oroi-xrisis', 'aporrito', 'cookies', 'taytotita']
VIEW = lambda n: re.compile(r'<section class="view" id="v-%s"[^>]*>.*?\n</section>' % re.escape(n), re.S)
OPEN = re.compile(r'^(<section class="view" id="v-[\w-]+")([^>]*)>')

def page(n): return ROOT / ('index.html' if n == 'home' else f'{n}/index.html')
def read(p): return p.read_text(encoding='utf-8')

base = read(page('home'))
full = {}
for n in NAMES:
    m = VIEW(n).search(read(page(n))) if page(n).exists() else None
    if not m or 'data-lazy' in m.group(0)[:600].split('>')[0]:
        m = VIEW(n).search(base)
    full[n] = m.group(0)
    assert 'data-lazy' not in full[n].split('>')[0], f'λείπει το πλήρες περιεχόμενο για {n}'

def tag_attrs(sec):
    m = OPEN.match(sec); attrs = re.sub(r'\s(hidden|data-lazy)\b', '', m.group(2)); return m.group(1), attrs

def build(r):
    s = base
    for n in NAMES:
        start, attrs = tag_attrs(full[n])
        hid = '' if n == r else ' hidden'
        if n in ('home', r):
            body = full[n][OPEN.match(full[n]).end():]
            sec = f'{start}{attrs}{hid}>{body}'
        else:
            sec = f'{start}{attrs}{hid} data-lazy>\n</section>'
        s = VIEW(n).sub(lambda _: sec, s, count=1)
    s = re.sub(r'<body data-route="[\w-]+">', f'<body data-route="{r}">', s)
    s = re.sub(r'\n<script type="application/ld\+json">\{"@context":"https://schema.org","@type":"BreadcrumbList".*?</script>', '', s)
    if r != 'home':
        m = re.search(r'data-title="([^"]*)" data-desc="([^"]*)"', full[r])
        title, desc = m.group(1), m.group(2)
        url = f'{ORIGIN}/{r}/'
        name = html.unescape(title.split(' · ')[0])
        s = re.sub(r'<title>.*?</title>', f'<title>{title}</title>', s, count=1)
        for pat, val in [(r'(<meta name="description" content=")[^"]*', desc), (r'(<link rel="canonical" href=")[^"]*', url),
                         (r'(<meta property="og:title" content=")[^"]*', title), (r'(<meta property="og:description" content=")[^"]*', desc),
                         (r'(<meta property="og:url" content=")[^"]*', url), (r'(<meta name="twitter:title" content=")[^"]*', title),
                         (r'(<meta name="twitter:description" content=")[^"]*', desc)]:
            s = re.sub(pat, lambda m2: m2.group(1) + val, s, count=1)
        bc = {"@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": [
            {"@type": "ListItem", "position": 1, "name": "Θέμα Πάτρας 98.7 FM", "item": ORIGIN + '/'},
            {"@type": "ListItem", "position": 2, "name": name, "item": url}]}
        s = s.replace('\n</head>', '\n<script type="application/ld+json">' + json.dumps(bc, ensure_ascii=False, separators=(',', ':')) + '</script>\n</head>', 1)
    return s

out = {n: build(n) for n in NAMES}
for n, s in out.items():
    p = page(n); p.parent.mkdir(exist_ok=True); p.write_text(s, encoding='utf-8')
    print(f'{str(p.relative_to(ROOT)):28} {len(s):6} bytes')
