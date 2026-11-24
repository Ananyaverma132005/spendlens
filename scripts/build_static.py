"""Build the static GitHub Pages demo of SpendLens into _site/.

The live demo runs entirely in the browser: static/js/demo-api.js stands in
for the Flask API and keeps data in localStorage. Paths are made relative so
the site works from https://<user>.github.io/spendlens/.

Usage:
    python scripts/build_static.py
"""
import json
import os
import shutil

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
OUT = os.path.join(ROOT, '_site')


def main():
    shutil.rmtree(OUT, ignore_errors=True)
    shutil.copytree(os.path.join(ROOT, 'static'), os.path.join(OUT, 'static'))

    with open(os.path.join(ROOT, 'templates', 'index.html'), encoding='utf-8') as f:
        html = f.read()

    html = html.replace('"/static/', '"static/')
    # A service worker under static/js/ can't control the site root, so skip it here.
    html = html.replace('navigator.serviceWorker.register("/service-worker.js");', '')
    html = html.replace(
        '<script src="static/js/script.js"></script>',
        '<script src="static/js/demo-api.js"></script>\n  <script src="static/js/script.js"></script>',
    )
    if 'demo-api.js' not in html:
        raise SystemExit('Could not inject demo-api.js into index.html')

    with open(os.path.join(OUT, 'index.html'), 'w', encoding='utf-8') as f:
        f.write(html)

    manifest_path = os.path.join(OUT, 'static', 'json', 'manifest.json')
    with open(manifest_path, encoding='utf-8') as f:
        manifest = json.load(f)
    manifest['start_url'] = '../../'
    for icon in manifest.get('icons', []):
        icon['src'] = '../images/' + os.path.basename(icon['src'])
    with open(manifest_path, 'w', encoding='utf-8') as f:
        json.dump(manifest, f, indent=2)

    # Tell GitHub Pages not to run Jekyll on the output.
    open(os.path.join(OUT, '.nojekyll'), 'w').close()
    print(f'Built static demo in {OUT}')


if __name__ == '__main__':
    main()
