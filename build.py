#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import json, os, re, html

ROOT = os.path.dirname(os.path.abspath(__file__))
UP = '/mnt/user-data/uploads'

d1 = json.load(open(f'{UP}/blitz_site_content_part1.json'))

vid = d1['vidPoslugi']['items']
by_cat = {}
for item in vid:
    cat = item['fields'].get('Категорія', 'Інше')
    by_cat.setdefault(cat, []).append(item)

CATS = [
    # (data-key, slug, nav title, short teaser)
    ('Поліграфія', 'poligrafiya', 'Поліграфія', 'Візитки, листівки, буклети, наліпки, шовкотрафарет і цифровий друк'),
    ('Сувенірна продукція', 'suvenirna', 'Сувенірна продукція', 'Футболки, чашки, флешки, ручки — брендування будь-яких носіїв'),
    ('Вивіски', 'vyvisky', 'Вивіски', 'Виготовлення та монтаж вивісок, зовнішнє брендування торгових точок'),
    ('Бігборди', 'bigbordy', 'Бігборди', 'Розміщення реклами на бігбордах у Білій Церкві та області'),
    ('Відеоборди', 'videoborday', 'Відеоборди', 'Розміщення відеореклами на LED-екранах міста'),
    ('Розробка логотипів', 'logotypy', 'Розробка логотипів', 'Розробка фірмового стилю та логотипів для бізнесу'),
    ('Радіо', 'radio', 'Реклама на радіо', 'Розміщення реклами на 8+ радіостанціях: Біла Церква, Фастів, Умань, Сміла, Богуслав, Рокитне'),
    ('Створення фото/відео контенту для соцмереж та зовнішньої реклами', 'foto-video', 'Фото/відео контент', 'Зйомка та монтаж контенту для соцмереж і зовнішньої реклами'),
]
CAT_SLUG = {c[0]: c[1] for c in CATS}

def esc(s):
    return html.escape(s or '', quote=True)

def photo_local(url, depth=''):
    """Convert an ntile.app image URL to a local asset path once images are unpacked."""
    if not url:
        return ''
    hash_name = url.rstrip('/').split('/')[-1]
    return f'{depth}assets/products/{hash_name}.jpg'

def slugify(s):
    import re as _re
    trans = str.maketrans({
        'а':'a','б':'b','в':'v','г':'h','д':'d','е':'e','є':'ie','ж':'zh','з':'z','и':'y',
        'і':'i','ї':'i','й':'i','к':'k','л':'l','м':'m','н':'n','о':'o','п':'p','р':'r',
        'с':'s','т':'t','у':'u','ф':'f','х':'kh','ц':'ts','ч':'ch','ш':'sh','щ':'shch',
        'ь':'','ю':'iu','я':'ia',"'":'','’':''
    })
    s2 = s.lower().translate(trans)
    s2 = _re.sub(r'[^a-z0-9]+', '-', s2).strip('-')
    return s2[:60] or 'porada'

PORADI_FULL_LIST = json.load(open(f'{ROOT}/poradi_full_text.json'))
PORADU_TEXT = {item['title']: item['text'] for item in PORADI_FULL_LIST}
PORADU_SLUG = {}
_used_slugs = set()
for _it in d1['poradi']['items']:
    _base = slugify(_it['title'])
    _slug = _base
    _n = 2
    while _slug in _used_slugs:
        _slug = f'{_base}-{_n}'
        _n += 1
    _used_slugs.add(_slug)
    PORADU_SLUG[_it['title']] = _slug

def poradu_excerpt(title, length=110):
    t = PORADU_TEXT.get(title, '')
    t = t.replace('⠀', ' ').replace('\n', ' ')
    t = ' '.join(t.split())
    return (t[:length] + '…') if len(t) > length else t

def nl2br(s):
    return '<br>'.join(esc(line) for line in (s or '').split('\n') if line.strip())

def money(v):
    v = (v or '').strip()
    if not v:
        return ''
    digits = re.sub(r'[^\d]', '', v)
    if digits and digits == v:
        return f'{int(digits):,}'.replace(',', ' ') + ' грн'
    return v

PHONE1 = '+380 67 280 40 30'
PHONE2 = '+380 50 469 33 66'
PHONE3 = '+380 50 732 22 22'
TELEGRAM = '@ra_blits'
TELEGRAM_URL = 'https://t.me/ra_blits'
EMAIL = 'Owner@blitz.com.ua'
ADDR = 'вул. Гагаріна, 5, Біла Церква'
CITIES = 'Біла Церква, Фастів, Умань, Сміла, Богуслав (Дибинці), Рокитне'
CITIES_SHORT = 'Біла Церква · Фастів · Умань · Сміла · Богуслав · Рокитне'

def nav(active=''):
    items = [
        ('index.html', 'Головна', 'home'),
        ('poslugy.html', 'Послуги', 'poslugy'),
        ('akcii.html', 'Акції', 'akcii'),
        ('poradu.html', 'Поради', 'poradu'),
        ('pro-nas.html', 'Про нас', 'pro-nas'),
        ('kontakty.html', 'Контакти', 'kontakty'),
    ]
    links = '\n'.join(
        f'<a href="{href}" class="{"active" if key==active else ""}">{label}</a>'
        for href, label, key in items
    )
    return links

def header(active='', depth=''):
    logo = f'{depth}assets/logo-blitz-ra.png'
    home = f'{depth}index.html' if depth else 'index.html'
    kontakty = f'{depth}kontakty.html'
    return f'''<header class="site-header">
  <div class="wrap">
    <a href="{home}" class="logo"><img src="{logo}" alt="РА «БЛІЦ»"></a>
    <nav class="nav" id="mainNav">
      {nav(active).replace('href="', f'href="{depth}')}
    </nav>
    <div class="header-actions">
      <a href="tel:{PHONE1.replace(' ', '')}" class="nav-phone">{PHONE1}</a>
      <a href="{kontakty}" class="btn btn-primary btn-sm">Замовити</a>
      <button class="burger" id="burgerBtn" aria-label="Меню"><span></span><span></span><span></span></button>
    </div>  </div>
</header>'''

def footer(depth=''):
    return f'''<footer class="site-footer">
  <div class="wrap">
    <div class="footer-grid">
      <div>
        <div class="footer-logo"><img src="{depth}assets/logo-blitz.png" alt="БЛІЦ"></div>
        <p>Рекламно-інформаційне агентство повного циклу. На ринку реклами {CITIES} з 2000 року — понад 26 років досвіду.</p>
      </div>
      <div>
        <h5>Послуги</h5>
        {''.join(f'<a href="{depth}poslugy/{slug}.html">{title}</a>' for _, slug, title, _ in CATS)}
      </div>
      <div>
        <h5>Компанія</h5>
        <a href="{depth}pro-nas.html">Про нас</a>
        <a href="{depth}akcii.html">Акції</a>
        <a href="{depth}poradu.html">Поради</a>
        <a href="{depth}dokumenty.html">Документи</a>
        <a href="{depth}kontakty.html">Контакти</a>
      </div>
      <div>
        <h5>Контакти</h5>
        <p>{ADDR}</p>
        <a href="tel:{PHONE1.replace(' ', '')}">{PHONE1}</a>
        <a href="tel:{PHONE2.replace(' ', '')}">{PHONE2}</a>
        <a href="tel:{PHONE3.replace(' ', '')}">{PHONE3}</a>
        <a href="{TELEGRAM_URL}" target="_blank" rel="noopener">Telegram: {TELEGRAM}</a>
        <a href="mailto:{EMAIL}">{EMAIL}</a>
      </div>
    </div>
    <div class="footer-bottom">
      <div>© 2000–2026 РІА «БЛІЦ». Усі права захищено.</div>
      <div>{CITIES_SHORT}</div>
    </div>
  </div>
</footer>
<div class="mobile-call"><a href="tel:{PHONE1.replace(' ', '')}">📞 Замовити дзвінок</a></div>
<script src="{depth}assets/main.js"></script>'''

def page(title, desc, active, body, depth='', extra_head=''):
    return f'''<!DOCTYPE html>
<html lang="uk">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{esc(title)} — РІА «БЛІЦ»</title>
<meta name="description" content="{esc(desc)}">
<link rel="icon" href="{depth}assets/logo-blitz.png">
<link rel="stylesheet" href="{depth}assets/style.css">
{extra_head}
</head>
<body>
{header(active, depth)}
{body}
{footer(depth)}
</body>
</html>'''

# ---------------------------------------------------------------- INDEX
def product_card(item, small=False, depth='../'):
    f = item['fields']
    photo = photo_local(f.get('Фото', ''), depth)
    price = money(f.get('Ціна'))
    qty = esc(f.get('Кількість', ''))
    desc = esc(f.get('Опис', ''))[:220]
    title = esc(item['title'])
    img = f'<img src="{photo}" alt="{title}" loading="lazy">' if photo else ''
    return f'''<div class="product-card">
  <div class="thumb">{img}</div>
  <div class="body">
    <h4>{title}</h4>
    <div class="desc">{desc}</div>
    <div class="meta-row">
      <div class="price">{price}</div>
      <div class="qty">{qty}</div>
    </div>
  </div>
</div>'''

def build_index():
    services_cards = ''
    for cat_key, slug, title, teaser in CATS:
        items = by_cat.get(cat_key, [])
        thumb = ''
        for it in items:
            if it['fields'].get('Фото'):
                thumb = photo_local(it['fields']['Фото'], '')
                break
        services_cards += f'''<a href="poslugy/{slug}.html" class="service-card">
  <div class="thumb"><img src="{thumb}" alt="{esc(title)}" loading="lazy"></div>
  <div class="body">
    <h3>{esc(title)}</h3>
    <div class="count">{len(items)} позицій у каталозі</div>
    <div class="go">Переглянути →</div>
  </div>
</a>'''

    akcii_items = d1['akciyi']['items'][:3]
    promo_cards = ''
    for it in akcii_items:
        f = it['fields']
        promo_cards += f'''<div class="promo-card">
  <span class="tag">Акція</span>
  <h4>{esc(it['title'])}</h4>
  <p>{esc(f.get('Опис',''))}</p>
  <div class="price">{money(f.get('Ціна'))} <small>{esc(f.get('Кількість',''))}</small></div>
</div>'''

    poradu_items = d1['poradi']['items'][:3]
    poradu_cards = ''
    for it in poradu_items:
        f = it['fields']
        img = photo_local(f.get('Фото', ''), '')
        slug = PORADU_SLUG[it['title']]
        excerpt = poradu_excerpt(it['title'])
        poradu_cards += f'''<a href="poradu/{slug}.html" class="poradu-card" style="display:block;">
  <div class="thumb"><img src="{img}" alt="" loading="lazy"></div>
  <div class="body"><h4>{esc(it['title'])}</h4><p style="margin-top:8px; font-size:13px; color:var(--fg-3); line-height:1.5;">{esc(excerpt)}</p></div>
</a>'''

    hero_photo = photo_local(by_cat.get('Поліграфія', [{}])[0].get('fields', {}).get('Фото', ''), '')

    body = f'''
<section class="hero">
  <div class="wrap">
    <div class="hero-text">
      <div class="hero-eyebrow">РІА «БЛІЦ» · Біла Церква з 2000 року</div>
      <div class="hero-title">Наносимо<span class="kw">РЕКЛАМУ</span>на все, що бачить Ваш клієнт</div>
      <p class="hero-lead">Радіо, зовнішня реклама, поліграфія, сувенірка, відео та дизайн — повний цикл рекламних послуг в одному агентстві.</p>
      <div class="hero-cta">
        <a href="kontakty.html" class="btn btn-invert">Замовити рекламу</a>
        <a href="poslugy.html" class="btn btn-ghost" style="border-color:rgba(255,255,255,0.5); color:#fff;">Всі послуги</a>
      </div>
      <div class="hero-stats">
        <div><div class="num">26+</div><div class="lbl">років на ринку</div></div>
        <div><div class="num">8</div><div class="lbl">радіостанцій-партнерів</div></div>
        <div><div class="num">175+</div><div class="lbl">позицій у каталозі</div></div>
      </div>
    </div>
    <div class="hero-figure">
      <div class="bubble-photo"><img src="{hero_photo}" alt="БЛІЦ"></div>
    </div>
  </div>
</section>

<section>
  <div class="wrap">
    <div class="section-head"><h2>Послуги</h2><div class="rule"></div><a href="poslugy.html" class="see-all">Всі послуги →</a></div>
    <p class="section-sub">Повний цикл рекламних рішень: від ідеї та дизайну до друку, монтажу й розміщення.</p>
    <div class="services-grid">{services_cards}</div>
  </div>
</section>

<section style="background:var(--bg-2);">
  <div class="wrap">
    <div class="section-head"><h2>Акції</h2><div class="rule"></div><a href="akcii.html" class="see-all">Всі акції →</a></div>
    <div class="promo-grid">{promo_cards}</div>
  </div>
</section>

<section>
  <div class="wrap">
    <div class="section-head"><h2>Чому обирають нас</h2><div class="rule"></div></div>
    <div class="why-grid">
      <div class="why-item"><div class="n">01</div><h4>Повний цикл</h4><p>Від дизайну до друку й розміщення — не треба шукати підрядників окремо.</p></div>
      <div class="why-item"><div class="n">02</div><h4>Власне виробництво</h4><p>Друкарня, монтаж, знімальна група — все в межах агентства.</p></div>
      <div class="why-item"><div class="n">03</div><h4>Своя радіостанція</h4><p>БЛІЦ-ФМ і мережа з 8 партнерських станцій: {CITIES}.</p></div>
      <div class="why-item"><div class="n">04</div><h4>26+ років досвіду</h4><p>Знаємо регіональний ринок зсередини з 2000 року.</p></div>
    </div>
  </div>
</section>

<section style="background:var(--bg-2);">
  <div class="wrap">
    <div class="section-head"><h2>Поради</h2><div class="rule"></div><a href="poradu.html" class="see-all">Всі поради →</a></div>
    <div class="poradu-grid">{poradu_cards}</div>
  </div>
</section>

<section>
  <div class="wrap">
    <div class="cta-band">
      <h3>Готові підняти свій бізнес на новий рівень реклами?</h3>
      <div class="btns">
        <a href="kontakty.html" class="btn btn-invert">Написати нам</a>
        <a href="tel:{PHONE1.replace(' ', '')}" class="btn btn-ghost" style="border-color:rgba(255,255,255,0.6); color:#fff;">{PHONE1}</a>
      </div>
    </div>
  </div>
</section>
'''
    open(f'{ROOT}/index.html', 'w').write(page(
        'РІА «БЛІЦ» — рекламне агентство повного циклу',
        f'Радіо, зовнішня реклама, поліграфія, сувенірка та дизайн — {CITIES}. 26+ років на ринку.',
        'home', body))

# ---------------------------------------------------------------- POSLUGY (overview)
def build_poslugy_overview():
    cards = ''
    for cat_key, slug, title, teaser in CATS:
        items = by_cat.get(cat_key, [])
        thumb = ''
        for it in items:
            if it['fields'].get('Фото'):
                thumb = photo_local(it['fields']['Фото'], '')
                break
        cards += f'''<a href="poslugy/{slug}.html" class="service-card">
  <div class="thumb"><img src="{thumb}" alt="{esc(title)}" loading="lazy"></div>
  <div class="body">
    <h3>{esc(title)}</h3>
    <div class="count">{teaser}</div>
    <div class="go">{len(items)} позицій — переглянути →</div>
  </div>
</a>'''
    body = f'''
<section class="page-hero"><div class="wrap"><h1>Послуги</h1><p>Повний каталог послуг РІА «БЛІЦ»: {len(vid)} позицій у {len(CATS)} категоріях.</p></div></section>
<section><div class="wrap"><div class="services-grid">{cards}</div></div></section>
'''
    open(f'{ROOT}/poslugy.html', 'w').write(page(
        'Послуги', 'Повний каталог послуг РІА «БЛІЦ»', 'poslugy', body))

# ---------------------------------------------------------------- CATEGORY PAGES
def build_category(cat_key, slug, title, teaser):
    items = by_cat.get(cat_key, [])
    cards = ''.join(product_card(it, depth='../') for it in items)
    pills = ''.join(
        f'<a href="{s}.html" class="{"active" if s==slug else ""}">{t}</a>'
        for _, s, t, _ in CATS
    )
    body = f'''
<section class="page-hero"><div class="wrap">
  <h1>{esc(title)}</h1>
  <p>{esc(teaser)} — {len(items)} позицій.</p>
</div></section>
<section>
  <div class="wrap">
    <div class="breadcrumbs" style="margin-bottom:20px;"><a href="../index.html">Головна</a> / <a href="../poslugy.html">Послуги</a> / {esc(title)}</div>
    <div class="cat-pills">{pills}</div>
    <div class="product-grid">{cards}</div>
    <div class="cta-band" style="margin-top:48px;">
      <h3>Не знайшли потрібну позицію?</h3>
      <div class="btns">
        <a href="../kontakty.html" class="btn btn-invert">Зробити індивідуальний запит</a>
      </div>
    </div>
  </div>
</section>
'''
    open(f'{ROOT}/poslugy/{slug}.html', 'w').write(page(
        title, teaser, 'poslugy', body, depth='../'))

# ---------------------------------------------------------------- AKCII
def build_akcii():
    cards = ''
    for it in d1['akciyi']['items']:
        f = it['fields']
        cards += f'''<div class="promo-card">
  <span class="tag">Акція</span>
  <h4>{esc(it['title'])}</h4>
  <p>{esc(f.get('Опис',''))}</p>
  <div class="price">{money(f.get('Ціна'))} <small>{esc(f.get('Кількість',''))}</small></div>
  <p style="font-size:12px;color:var(--fg-4,#9B9B9B);margin-top:10px;">{esc(f.get('Важлива інформація','')[:160])}</p>
</div>'''
    body = f'''
<section class="page-hero"><div class="wrap"><h1>Акції</h1><p>Актуальні пакетні пропозиції на розміщення реклами. Ціни довідкові — точний розрахунок для вас зробить менеджер.</p></div></section>
<section><div class="wrap"><div class="promo-grid">{cards}</div></div></section>
'''
    open(f'{ROOT}/akcii.html', 'w').write(page('Акції', 'Актуальні акції РІА «БЛІЦ»', 'akcii', body))

# ---------------------------------------------------------------- PORADU
def build_poradu_articles():
    items = d1['poradi']['items']
    for idx, it in enumerate(items):
        title = it['title']
        slug = PORADU_SLUG[title]
        photo = photo_local(it['fields'].get('Фото', ''), '../')
        text = PORADU_TEXT.get(title, '')
        paragraphs = ''.join(f'<p style="margin-bottom:16px;">{esc(p)}</p>' for p in text.split('\n') if p.strip())
        prev_it = items[idx - 1] if idx > 0 else items[-1]
        next_it = items[idx + 1] if idx < len(items) - 1 else items[0]
        body = f'''
<section class="page-hero"><div class="wrap" style="max-width:820px;">
  <div class="breadcrumbs" style="margin-bottom:14px;"><a href="../poradu.html" style="color:rgba(255,255,255,0.85);">← Всі поради</a></div>
  <h1 style="font-size:clamp(26px,3.6vw,40px);">{esc(title)}</h1>
</div></section>
<section>
  <div class="wrap" style="max-width:760px;">
    {'<img src="' + photo + '" alt="" style="width:100%; border-radius:var(--radius-lg); margin-bottom:32px; box-shadow:var(--shadow-md);">' if photo else ''}
    <div class="blitz-body" style="font-size:16.5px; line-height:1.75;">{paragraphs}</div>
    <div style="display:flex; justify-content:space-between; gap:16px; margin-top:48px; padding-top:24px; border-top:1px solid var(--blitz-line); flex-wrap:wrap;">
      <a href="{PORADU_SLUG[prev_it['title']]}.html" class="btn btn-ghost">← {esc(prev_it['title'][:40])}</a>
      <a href="{PORADU_SLUG[next_it['title']]}.html" class="btn btn-ghost">{esc(next_it['title'][:40])} →</a>
    </div>
  </div>
</section>
'''
        open(f'{ROOT}/poradu/{slug}.html', 'w').write(page(title, poradu_excerpt(title, 150) or title, 'poradu', body, depth='../'))

def build_poradu():
    cards = ''
    for it in d1['poradi']['items']:
        f = it['fields']
        img = photo_local(f.get('Фото', ''), '')
        slug = PORADU_SLUG[it['title']]
        excerpt = poradu_excerpt(it['title'])
        cards += f'''<a href="poradu/{slug}.html" class="poradu-card" style="display:block;">
  <div class="thumb"><img src="{img}" alt="" loading="lazy"></div>
  <div class="body"><h4>{esc(it['title'])}</h4><p style="margin-top:8px; font-size:13px; color:var(--fg-3); line-height:1.5;">{esc(excerpt)}</p></div>
</a>'''
    body = f'''
<section class="page-hero"><div class="wrap"><h1>Поради</h1><p>Корисні думки й лайфхаки про рекламу від команди БЛІЦ.</p></div></section>
<section><div class="wrap"><div class="poradu-grid">{cards}</div></div></section>
'''
    open(f'{ROOT}/poradu.html', 'w').write(page('Поради', 'Поради про рекламу від РІА «БЛІЦ»', 'poradu', body))
    build_poradu_articles()

# ---------------------------------------------------------------- PRO-NAS
def build_pro_nas():
    proponuiemo_cards = ''
    for it in d1['shcho_proponuiemo']['items']:
        f = it['fields']
        proponuiemo_cards += f'''<div class="why-item" style="background:var(--bg-2); padding:22px; border-radius:var(--radius-lg);">
  <img src="{photo_local(f.get('Фото',''), '')}" alt="" style="width:100%;aspect-ratio:16/10;object-fit:cover;border-radius:var(--radius-md);margin-bottom:14px;">
  <h4>{esc(it['title'])}</h4>
  <p>{esc(f.get('Опис',''))}</p>
</div>'''

    radio_cards = ''
    for it in d1['reklama']['items']:
        f = it['fields']
        if f.get('Категорія') != 'Радіо':
            continue
        radio_cards += f'''<div class="radio-card">
  <div class="logo-wrap"><img src="{photo_local(f.get('Фото',''), '')}" alt="{esc(it['title'])}" loading="lazy"></div>
  <h5>{esc(it['title'])}</h5>
  <p>{esc(f.get('Опис',''))}</p>
</div>'''

    founder_text = d1['golovna']['items'][2]['title']
    founder_html = ''.join(f'<p style="margin-bottom:14px;">{esc(p)}</p>' for p in founder_text.split('\n') if p.strip())

    body = f'''
<section class="page-hero"><div class="wrap"><h1>Про нас</h1><p>Рекламно-інформаційне агентство повного циклу — {CITIES} — з 2000 року.</p></div></section>

<section>
  <div class="wrap" style="max-width:820px;">
    <div class="section-head"><h2>Наша історія</h2><div class="rule"></div></div>
    <div class="blitz-body" style="font-size:16.5px; line-height:1.7;">{founder_html}</div>
  </div>
</section>

<section style="background:var(--bg-2);">
  <div class="wrap">
    <div class="section-head"><h2>Що ми пропонуємо</h2><div class="rule"></div></div>
    <div class="why-grid" style="grid-template-columns:repeat(3,1fr);">{proponuiemo_cards}</div>
  </div>
</section>

<section>
  <div class="wrap">
    <div class="section-head"><h2>Наші радіостанції-партнери</h2><div class="rule"></div></div>
    <p class="section-sub">Розміщуємо радіорекламу на 8+ станціях: {CITIES}.</p>
    <div class="radio-grid">{radio_cards}</div>
  </div>
</section>
'''
    open(f'{ROOT}/pro-nas.html', 'w').write(page('Про нас', 'Про рекламне агентство РІА «БЛІЦ»', 'pro-nas', body))

# ---------------------------------------------------------------- KONTAKTY
def build_kontakty():
    body = f'''
<section class="page-hero"><div class="wrap"><h1>Контакти</h1><p>Зв'яжіться з нами будь-яким зручним способом — відповідаємо швидко.</p></div></section>
<section>
  <div class="wrap" style="display:flex; gap:48px; flex-wrap:wrap;">
    <div style="flex:1 1 320px;">
      <div class="section-head"><h2 style="font-size:26px;">Наші дані</h2></div>
      <p class="blitz-body" style="margin-bottom:18px;"><strong>Адреса:</strong><br>{ADDR}</p>
      <p class="blitz-body" style="margin-bottom:18px;"><strong>Телефони:</strong><br>
        <a href="tel:{PHONE1.replace(' ', '')}" style="color:var(--fg-accent);">{PHONE1}</a><br>
        <a href="tel:{PHONE2.replace(' ', '')}" style="color:var(--fg-accent);">{PHONE2}</a><br>
        <a href="tel:{PHONE3.replace(' ', '')}" style="color:var(--fg-accent);">{PHONE3}</a>
      </p>
      <p class="blitz-body" style="margin-bottom:18px;"><strong>Telegram:</strong><br><a href="{TELEGRAM_URL}" target="_blank" rel="noopener" style="color:var(--fg-accent);">{TELEGRAM}</a></p>
      <p class="blitz-body" style="margin-bottom:18px;"><strong>Email:</strong><br><a href="mailto:{EMAIL}" style="color:var(--fg-accent);">{EMAIL}</a></p>
      <p class="blitz-body" style="margin-bottom:18px;"><strong>Міста присутності:</strong><br>{CITIES}</p>
      <p class="blitz-body"><strong>Сайт:</strong><br>blitz.com.ua</p>
    </div>
    <div style="flex:1 1 380px; background:var(--bg-2); border-radius:var(--radius-lg); padding:32px;">
      <div class="section-head"><h2 style="font-size:22px;">Залишити заявку</h2></div>
      <form onsubmit="alert('Дякуємо! Ми зв\\'яжемось з Вами найближчим часом.'); return false;">
        <div style="margin-bottom:16px;"><input required placeholder="Ваше ім'я" style="width:100%; padding:14px 16px; border-radius:var(--radius-md); border:1px solid var(--blitz-line); font-family:var(--font-body); font-size:14px;"></div>
        <div style="margin-bottom:16px;"><input required placeholder="Телефон" style="width:100%; padding:14px 16px; border-radius:var(--radius-md); border:1px solid var(--blitz-line); font-family:var(--font-body); font-size:14px;"></div>
        <div style="margin-bottom:20px;"><textarea placeholder="Опишіть завдання" rows="4" style="width:100%; padding:14px 16px; border-radius:var(--radius-md); border:1px solid var(--blitz-line); font-family:var(--font-body); font-size:14px;"></textarea></div>
        <button type="submit" class="btn btn-primary" style="width:100%;">Надіслати заявку</button>
      </form>
    </div>
  </div>
</section>
'''
    open(f'{ROOT}/kontakty.html', 'w').write(page('Контакти', 'Контакти РІА «БЛІЦ»', 'kontakty', body))

# ---------------------------------------------------------------- run
build_index()
build_poslugy_overview()
for c in CATS:
    build_category(*c)
build_akcii()
build_poradu()
build_pro_nas()
build_kontakty()
print('Done. Files:', len(os.listdir(ROOT)) + len(os.listdir(f'{ROOT}/poslugy')))

# ---------------------------------------------------------------- DOKUMENTY
def build_dokumenty():
    import os as _os, urllib.parse as _up
    doc_dir = f'{ROOT}/assets/documents'
    files = sorted(_os.listdir(doc_dir))

    def label(f):
        return f.replace('_', ' ').replace('.pdf', '').strip()

    licenses = [f for f in files if 'Ліцензія' in f or 'ліцензія' in f]
    statut = [f for f in files if 'статут' in f]
    vytiah = [f for f in files if 'витяг' in f.lower()]
    rest = [f for f in files if f not in licenses and f not in statut and f not in vytiah]
    # sort "rest" (ownership structure forms) — try to extract year-ish tokens, else alpha
    rest.sort()

    def doc_link(f):
        href = _up.quote(f)
        return f'<a href="assets/documents/{href}" target="_blank" rel="noopener" style="display:flex; align-items:center; gap:12px; padding:14px 18px; background:var(--bg-2); border-radius:var(--radius-md); margin-bottom:10px; font-size:14px; color:var(--fg-1); border:1px solid var(--blitz-line);"><span style="color:var(--fg-accent); font-weight:800;">PDF</span><span>{esc(label(f))}</span></a>'

    def section(title, items):
        if not items:
            return ''
        return f'''<div style="margin-bottom:36px;">
  <h3 style="font-family:var(--font-display); font-weight:800; font-size:18px; margin-bottom:14px;">{esc(title)} <span style="color:var(--fg-3); font-weight:500; font-size:13px;">({len(items)})</span></h3>
  {''.join(doc_link(f) for f in items)}
</div>'''

    body = f'''
<section class="page-hero"><div class="wrap"><h1>Документи</h1><p>Офіційні документи РІА «БЛІЦ»: ліцензії на мовлення, розкриття структури власності та редакційний статут — відповідно до вимог законодавства про медіа.</p></div></section>
<section>
  <div class="wrap" style="max-width:820px;">
    {section('Ліцензії на мовлення БЛІЦ-ФМ', licenses)}
    {section('Редакційний статут', statut)}
    {section('Витяги з реєстру', vytiah)}
    {section('Структура власності — розкриття інформації', rest)}
  </div>
</section>
'''
    open(f'{ROOT}/dokumenty.html', 'w').write(page('Документи', 'Офіційні документи РІА «БЛІЦ»', 'dokumenty', body))

build_dokumenty()
print('dokumenty.html built,', len(os.listdir(f'{ROOT}/assets/documents')), 'documents')
