import assert from 'node:assert/strict';
import { test } from 'node:test';

let nextModule = 0;

async function loadScript({ saved = null, rows = [], scrollY = 500 } = {}) {
    const documentListeners = new Map();
    const windowListeners = new Map();
    const frames = new Map();
    const calls = [];
    let nextFrame = 0;
    let observer;
    let observations = 0;
    let disconnections = 0;

    class FilterElement {
        constructor(key, top) {
            this.key = key;
            this.top = top;
        }

        closest() {
            return this;
        }

        getAttribute(name) {
            return name === 'data-filters-item' ? this.key : null;
        }

        getBoundingClientRect() {
            return { top: this.top, bottom: this.top + 20, width: 200, height: 20 };
        }

        scrollIntoView() {
            calls.push(['scrollIntoView']);
        }
    }

    const root = {
        style: { visibility: 'visible' },
        scrollHeight: 3000,
        classList: { add() {}, remove() {} },
        appendChild(child) { child.isConnected = true; },
    };
    const document = {
        documentElement: root,
        readyState: 'complete',
        createElement: () => ({ isConnected: false }),
        querySelectorAll: () => rows,
        addEventListener(type, listener) { documentListeners.set(type, listener); },
    };
    const window = {
        scrollY,
        innerHeight: 600,
        scrollTo(_x, y) { calls.push(['scrollTo', y]); this.scrollY = y; },
        scroll(_x, y) { calls.push(['scroll', y]); this.scrollY = y; },
        scrollBy(_x, y) { calls.push(['scrollBy', y]); this.scrollY += y; },
        setTimeout() { return 1; },
        addEventListener(type, listener) { windowListeners.set(type, listener); },
    };

    globalThis.Element = FilterElement;
    globalThis.document = document;
    globalThis.window = window;
    globalThis.history = { scrollRestoration: 'auto' };
    globalThis.sessionStorage = {
        getItem: () => saved && JSON.stringify(saved),
        setItem() {},
        removeItem() {},
    };
    globalThis.MutationObserver = class {
        constructor(callback) { this.callback = callback; observer = this; }
        observe() { observations += 1; }
        disconnect() { disconnections += 1; }
    };
    globalThis.requestAnimationFrame = (callback) => {
        const id = ++nextFrame;
        frames.set(id, callback);
        return id;
    };
    globalThis.cancelAnimationFrame = (id) => frames.delete(id);
    globalThis.clearTimeout = () => {};

    await import(`../src/main.js?lifecycle=${++nextModule}`);

    return {
        calls,
        document,
        window,
        root,
        FilterElement,
        get observer() { return observer; },
        get observations() { return observations; },
        get disconnections() { return disconnections; },
        pointerdown(target, button = 0) {
            documentListeners.get('pointerdown')({ target, button, isPrimary: true });
        },
        wheel() { windowListeners.get('wheel')(); },
        nextFrame() {
            const [id, callback] = frames.entries().next().value;
            frames.delete(id);
            callback();
        },
    };
}

test('manual scrolling stops stabilization without a final page jump', async () => {
    const page = await loadScript();
    assert.equal(history.scrollRestoration, 'auto');
    assert.equal(page.observations, 0);

    page.pointerdown(new page.FilterElement('clicked', 100));
    assert.equal(page.observations, 1);
    page.wheel();

    assert.deepEqual(page.calls, []);
    assert.equal(history.scrollRestoration, 'auto');
    assert.equal(page.disconnections, 1);
});

test('an in-page update does not restore stale scrollY when anchors disappear', async () => {
    const page = await loadScript();
    page.pointerdown(new page.FilterElement('clicked', 100));

    page.window.scrollY = 0;
    page.nextFrame();

    assert.deepEqual(page.calls, []);
    assert.equal(page.window.scrollY, 0);
    page.wheel();
});

test('blocks site scrollBy during stabilization and releases it afterward', async () => {
    const page = await loadScript();
    page.pointerdown(new page.FilterElement('clicked', 100));

    page.window.scrollBy(0, -500);
    assert.deepEqual(page.calls, []);
    assert.equal(page.window.scrollY, 500);

    page.wheel();
    page.window.scrollBy(0, -100);
    assert.deepEqual(page.calls, [['scrollBy', -100]]);
});

test('right click on a filter does not start stabilization', async () => {
    const page = await loadScript();
    page.pointerdown(new page.FilterElement('clicked', 100), 2);

    assert.equal(page.observations, 0);
    page.window.scrollBy(0, -100);
    assert.deepEqual(page.calls, [['scrollBy', -100]]);
});

test('restores navigation scroll settings and prior visibility on stop', async () => {
    const page = await loadScript({
        saved: { originalY: 500, anchors: [], time: Date.now() },
        scrollY: 0,
    });

    assert.equal(history.scrollRestoration, 'manual');
    assert.equal(page.root.style.visibility, 'hidden');

    page.nextFrame();
    assert.deepEqual(page.calls, [['scrollTo', 500]]);

    page.wheel();
    assert.equal(history.scrollRestoration, 'auto');
    assert.equal(page.root.style.visibility, 'visible');
    assert.deepEqual(page.calls, [['scrollTo', 500]]);
});

test('mutation observer leaves correction to the next animation frame', async () => {
    const rows = [];
    const page = await loadScript({ rows });
    const clicked = new page.FilterElement('clicked', 100);
    rows.push(clicked, new page.FilterElement('a', 80), new page.FilterElement('b', 120));

    page.pointerdown(clicked);
    rows[1].top += 20;
    rows[2].top += 20;
    page.observer.callback();
    assert.deepEqual(page.calls, []);

    page.nextFrame();
    assert.deepEqual(page.calls, [['scrollBy', 20]]);
});
