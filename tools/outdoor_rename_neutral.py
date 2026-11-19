#!/usr/bin/env python3
"""Одноразове (і повторюване) перейменування мініатюр бігбордів у нейтральні імена.

Навіщо: за іменами файлів assets/outdoor/t/ можна було б відрізнити постачальника. Публічний фід
(calc.blitz.com.ua/outdoor-public.json) віддає нейтральний ключ id (8 hex) і img = ключ + розширення;
цей скрипт перейменовує файли під цей самий ключ. Зміст файлів не змінюється (git mv).

Ключ: перші 8 hex sha256("<сіль>|<внутрішній id>"). Сіль секретна: вона лежить ЛИШЕ в приватному
репо воркера (blitz-calc/outdoor-public.js, PUBLIC_KEY_SALT). Цей скрипт і весь репо сайту публічні,
тому сіль тут не зберігається, а читається з blitz-calc (--calc). Внутрішні id беруться з blitz-calc/public/outdoor-data.json.
Схеми розташування в публічний фід не йдуть; якщо файли схем є, вони перейменовуються на ключ, не пов'язаний з основним
(sha256("<сіль>|s|<id>")), щоб за наявністю файлу не можна було відрізнити постачальника.

Запуск (з будь-якого місця):
  python3 tools/outdoor_rename_neutral.py --dry-run     # лише показати план
  python3 tools/outdoor_rename_neutral.py               # виконати (git mv, якщо це git-репо)
  python3 tools/outdoor_rename_neutral.py --drop-orphans  # те саме + видалити файли, яких немає в каталозі
Ідемпотентний: уже перейменовані файли пропускаються; повторний запуск після ручного копіювання нових мініатюр
(з менеджерського public/photos/t/ у старих іменах) перейменує лише їх. Колізія ключів між сторонами каталогу → зупинка без змін.
Код виходу: 0 = усе гаразд; 1 = помилка або є сторони фіду без файлу мініатюри.
"""
import argparse, hashlib, json, os, re, shutil, subprocess, sys

HERE = os.path.dirname(os.path.abspath(__file__))
SITE = os.path.dirname(HERE)
EXT = re.compile(r'\.(jpg|jpeg|png|webp)$', re.I)


def load_salt(calc):
    src = open(os.path.join(calc, 'outdoor-public.js'), encoding='utf-8').read()
    m = re.search(r"PUBLIC_KEY_SALT\s*=\s*'([0-9a-f]{32})'", src)
    if not m:
        sys.exit('не знайдено PUBLIC_KEY_SALT у %s/outdoor-public.js' % calc)
    ps = re.search(r"PUBLIC_SUPPLIERS\s*=\s*\[([^\]]*)\]", src)
    return m.group(1), set(re.findall(r"'([\w-]+)'", ps.group(1))) if ps else set()


def key(salt, *parts):
    return hashlib.sha256((salt + '|' + '|'.join(parts)).encode('utf-8')).hexdigest()[:8]


def main():
    ap = argparse.ArgumentParser(description=__doc__.split('\n')[0])
    ap.add_argument('--dry-run', action='store_true', help='нічого не міняти, лише показати план')
    ap.add_argument('--drop-orphans', action='store_true', help='видалити файли, яких немає в каталозі (залишки зниклих сторін зі старими іменами)')
    ap.add_argument('--calc', default=os.path.expanduser('~/Projects/blitz-calc'), help='каталог репо blitz-calc (сіль і каталог)')
    ap.add_argument('--dir', default=os.path.join(SITE, 'assets', 'outdoor', 't'), help='каталог мініатюр')
    a = ap.parse_args()

    salt, published = load_salt(a.calc)   # published — постачальники, яких віддає фід (список теж із воркера, тут не дублюється)
    items = json.load(open(os.path.join(a.calc, 'public', 'outdoor-data.json'), encoding='utf-8'))['items']
    keys = [key(salt, i['id']) for i in items]
    if len(set(keys)) != len(keys):
        sys.exit('КОЛІЗІЯ ключів у каталозі: зміни не вносились. Потрібне рішення (див. publicFeed: повторний хеш id~n).')

    plan, missing, done, known = [], [], 0, set()
    for it, k in zip(items, keys):
        sk = key(salt, 's', it['id'])
        cands = [('img', it.get('img'), k), ('schemeImg', it.get('schemeImg'), sk)]
        for e in ('.jpg', '.jpeg', '.png', '.webp'):                       # схема, на яку немає посилання в каталозі, але файл лежить поруч (<id>-s.ext)
            if not it.get('schemeImg') and os.path.exists(os.path.join(a.dir, it['id'] + '-s' + e)):
                cands.append(('schemeImg', it['id'] + '-s' + e, sk))
        for field, old, new_key in cands:
            if not old or not EXT.search(old):
                continue
            new = new_key + EXT.search(old).group(0).lower()
            known.update([old, new])
            po, pn = os.path.join(a.dir, old), os.path.join(a.dir, new)
            if os.path.exists(pn):
                if os.path.exists(po):
                    sys.exit('конфлікт: існують і %s, і %s' % (old, new))
                done += 1
            elif os.path.exists(po):
                if (old, new) not in plan:
                    plan.append((old, new))
            elif field == 'img' and it.get('sup') in published and not it.get('off') and not it.get('gone'):
                missing.append((it['id'], old))
    # один старий файл може бути в img двох сторін (спільне фото): для всіх, крім останньої, — копія, останній — переміщення
    last = {}
    for old, new in plan:
        last[old] = new
    for old, new in plan:
        po, pn = os.path.join(a.dir, old), os.path.join(a.dir, new)
        move = last[old] == new
        print(('[dry] ' if a.dry_run else '') + ('mv ' if move else 'cp ') + old + ' -> ' + new)
        if a.dry_run:
            continue
        in_git = subprocess.run(['git', '-C', SITE, 'ls-files', '--error-unmatch', po], capture_output=True).returncode == 0
        if move:
            subprocess.run(['git', '-C', SITE, 'mv', po, pn], check=True) if in_git else os.rename(po, pn)
        else:
            shutil.copyfile(po, pn)
            if in_git:
                subprocess.run(['git', '-C', SITE, 'add', pn], check=True)
    left = sorted(f for f in os.listdir(a.dir) if f not in known)
    print('перейменовано: %d, уже нейтральні: %d, не відповідають каталогу (не чіпаю): %d' % (0 if a.dry_run else len(plan), done, len(left)))
    for f in left[:10]:
        print('  зайвий файл:', f)
        if a.drop_orphans and not a.dry_run:
            fp = os.path.join(a.dir, f)
            if subprocess.run(['git', '-C', SITE, 'ls-files', '--error-unmatch', fp], capture_output=True).returncode == 0:
                subprocess.run(['git', '-C', SITE, 'rm', '-q', fp], check=True)
            else:
                os.remove(fp)
    if missing:
        print('УВАГА: у фіді є img без файлу мініатюри (%d), напр. %s' % (len(missing), missing[:3]))
        sys.exit(1)


if __name__ == '__main__':
    main()
