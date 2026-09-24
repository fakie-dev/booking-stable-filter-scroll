import assert from 'node:assert/strict';
import { test } from 'node:test';
import { calculateAnchorDelta, collectAnchors } from '../src/anchors.js';

function filter(key, top, height = 20) {
    return {
        key,
        top,
        getAttribute(name) {
            return name === 'data-filters-item' ? this.key : null;
        },
        getBoundingClientRect() {
            return {
                top: this.top,
                bottom: this.top + height,
                width: 200,
                height,
            };
        },
    };
}

test('keeps the original filter copy when Booking promotes a duplicate', () => {
    const original = filter('price', 110);
    const promoted = filter('price', -50);
    const second = filter('stars', 130);
    const third = filter('breakfast', 150);

    globalThis.window = { scrollY: 100, innerHeight: 600 };
    globalThis.document = {
        querySelectorAll: () => [promoted, original, second, third],
    };

    const anchors = [
        { key: 'price', top: 100, documentTop: 200 },
        { key: 'stars', top: 120, documentTop: 220 },
        { key: 'breakfast', top: 140, documentTop: 240 },
    ];

    assert.equal(calculateAnchorDelta(anchors), 10);
});

test('ignores a filter row that moves separately from its neighbors', () => {
    const rows = [filter('a', 110), filter('b', 130), filter('c', 150), filter('d', 400)];

    globalThis.window = { scrollY: 100, innerHeight: 600 };
    globalThis.document = { querySelectorAll: () => rows };

    const anchors = [
        { key: 'a', top: 100, documentTop: 200 },
        { key: 'b', top: 120, documentTop: 220 },
        { key: 'c', top: 140, documentTop: 240 },
        { key: 'd', top: 160, documentTop: 260 },
    ];

    assert.equal(calculateAnchorDelta(anchors), 10);
});

test('collects visible neighbors without using the clicked filter', () => {
    const above = filter('above', 80);
    const clicked = filter('clicked', 100);
    const below = filter('below', 120);
    const hidden = filter('hidden', 700);

    globalThis.window = { scrollY: 100, innerHeight: 600 };
    globalThis.document = {
        querySelectorAll: () => [above, clicked, below, hidden],
    };

    assert.deepEqual(
        collectAnchors(clicked).map(({ key }) => key),
        ['above', 'below'],
    );
});

test('does not follow a lone row that moved to a different document position', () => {
    globalThis.window = { scrollY: 100, innerHeight: 600 };
    globalThis.document = { querySelectorAll: () => [filter('price', -500)] };

    assert.equal(
        calculateAnchorDelta([{ key: 'price', top: 100, documentTop: 200 }]),
        null,
    );
});

test('uses a lone stable row to reverse an unexpected page scroll', () => {
    globalThis.window = { scrollY: 0, innerHeight: 600 };
    globalThis.document = { querySelectorAll: () => [filter('price', 1100)] };

    assert.equal(
        calculateAnchorDelta([{ key: 'price', top: 100, documentTop: 1100 }]),
        1000,
    );
});

test('ignores two anchors whose corrections disagree', () => {
    globalThis.window = { scrollY: 100, innerHeight: 600 };
    globalThis.document = {
        querySelectorAll: () => [filter('stars', 110), filter('breakfast', -380)],
    };

    assert.equal(calculateAnchorDelta([
        { key: 'stars', top: 100, documentTop: 200 },
        { key: 'breakfast', top: 120, documentTop: 220 },
    ]), null);
});

test('measures filter rows once per correction even with several anchors', () => {
    let queries = 0;
    let measurements = 0;
    const rows = [filter('a', 110), filter('b', 130), filter('c', 150)];
    for (const row of rows) {
        const original = row.getBoundingClientRect;
        row.getBoundingClientRect = function () {
            measurements += 1;
            return original.call(this);
        };
    }

    globalThis.window = { scrollY: 100, innerHeight: 600 };
    globalThis.document = {
        querySelectorAll: () => {
            queries += 1;
            return rows;
        },
    };

    assert.equal(calculateAnchorDelta([
        { key: 'a', top: 100, documentTop: 200 },
        { key: 'b', top: 120, documentTop: 220 },
        { key: 'c', top: 140, documentTop: 240 },
    ]), 10);
    assert.equal(queries, 1);
    assert.equal(measurements, rows.length);
});
