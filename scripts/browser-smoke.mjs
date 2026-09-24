import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, sep } from 'node:path';
import { pathToFileURL } from 'node:url';

const browserCandidates = [
    process.env.CHROME_PATH,
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    'google-chrome',
    'chromium',
    'chromium-browser',
].filter(Boolean);

const browser = browserCandidates.find((candidate) =>
    (candidate.includes('/') ? existsSync(candidate) : spawnSync(candidate, ['--version']).status === 0),
);

if (!browser) {
    throw new Error('Chrome or Chromium is required. Set CHROME_PATH to its executable.');
}

const userscript = readFileSync('booking-stable-filter-scroll.user.js', 'utf8');
const temp = mkdtempSync(join(tmpdir(), 'booking-userscript-smoke-'));

try {
    const html = `<!doctype html><html><head><script>${userscript.replaceAll('</script>', '<\\/script>')}</script></head><body>
<div style="height:700px"></div>
<div data-filters-item="above" style="height:40px">Above</div>
<div data-filters-item="clicked" style="height:40px">Clicked</div>
<div data-filters-item="below" style="height:40px">Below</div>
<div style="height:1500px"></div><pre id="result"></pre>
<script>
window.addEventListener('load', async () => {
  try {
    const rows = document.querySelectorAll('[data-filters-item]');
    window.scrollTo(0, 500);
    rows[1].dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0, isPrimary: true }));
    const before = window.scrollY;
    window.scrollBy(0, -400);
    const blocked = window.scrollY;
    window.dispatchEvent(new WheelEvent('wheel', { bubbles: true }));
    window.scrollBy(0, -100);
    const afterManual = window.scrollY;

    window.scrollTo(0, 500);
    rows[1].dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0, isPrimary: true }));
    rows[0].style.transform = 'translateY(20px)';
    rows[2].style.transform = 'translateY(20px)';
    await new Promise(requestAnimationFrame);
    const afterShift = window.scrollY;
    window.dispatchEvent(new WheelEvent('wheel', { bubbles: true }));

    document.getElementById('result').textContent = JSON.stringify({
      before, blocked, afterManual, afterShift,
      scrollRestoration: history.scrollRestoration,
    });
  } catch (error) {
    document.getElementById('result').textContent = JSON.stringify({ error: String(error) });
  }
});
</script></body></html>`;

    const fixture = join(temp, 'fixture.html');
    writeFileSync(fixture, html);
    const result = spawnSync(browser, [
        '--headless=new',
        '--disable-gpu',
        '--disable-extensions',
        '--no-first-run',
        '--no-default-browser-check',
        `--user-data-dir=${join(temp, 'profile')}`,
        '--virtual-time-budget=3000',
        '--dump-dom',
        pathToFileURL(fixture).href,
    ], { encoding: 'utf8', timeout: 20_000 });

    if (result.error) {
        throw result.error;
    }
    assert.equal(result.status, 0, result.stderr.slice(-1000));

    const match = result.stdout.match(/<pre id="result">([^<]*)<\/pre>/);
    assert.ok(match, `Browser fixture did not finish: ${result.stderr.slice(-1000)}`);
    const actual = JSON.parse(match[1]);
    assert.deepEqual(actual, {
        before: 500,
        blocked: 500,
        afterManual: 400,
        afterShift: 520,
        scrollRestoration: 'auto',
    });
    console.log(`Browser smoke passed: ${browser}`);
} finally {
    if (!resolve(temp).startsWith(resolve(tmpdir()) + sep)) {
        throw new Error('Refusing to remove a path outside the temporary directory');
    }
    rmSync(temp, { recursive: true, force: true });
}
