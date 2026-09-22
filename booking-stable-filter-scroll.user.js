// ==UserScript==
// @name         Booking.com Stable Filter Scroll
// @name:ru      Booking.com — стабильный скролл фильтров
// @namespace    https://github.com/fakie-dev/booking-stable-filter-scroll
// @version      1.1.2
// @description  Keeps the Booking.com filter sidebar from jumping when filters update or move.
// @description:ru Не даёт странице Booking.com прыгать при обновлении и перемещении фильтров.
// @author       fakie-dev
// @license      MIT
// @match        https://www.booking.com/searchresults*
// @match        https://booking.com/searchresults*
// @icon         https://raw.githubusercontent.com/fakie-dev/booking-stable-filter-scroll/main/assets/icon-64.png
// @icon64       https://raw.githubusercontent.com/fakie-dev/booking-stable-filter-scroll/main/assets/icon-128.png
// @run-at       document-start
// @noframes
// @homepageURL  https://github.com/fakie-dev/booking-stable-filter-scroll
// @supportURL   https://github.com/fakie-dev/booking-stable-filter-scroll/issues
// @updateURL    https://raw.githubusercontent.com/fakie-dev/booking-stable-filter-scroll/main/booking-stable-filter-scroll.meta.js
// @downloadURL  https://raw.githubusercontent.com/fakie-dev/booking-stable-filter-scroll/main/booking-stable-filter-scroll.user.js
// @grant        none
// ==/UserScript==

(() => {
    'use strict';

    const STORAGE_KEY = '__booking_stable_filter_scroll_v2';
    const MIN_LOCK_TIME_MS = 1200;
    const MAX_LOCK_TIME_MS = 3500;
    const QUIET_TIME_MS = 500;
    const RESTORE_MAX_AGE_MS = 10_000;
    const REVEAL_TIMEOUT_MS = 800;
    const MAX_ANCHORS = 6;
    const DELTA_EPSILON_PX = 0.5;

    const nativeScrollTo = window.scrollTo.bind(window);
    const nativeScroll = window.scroll.bind(window);
    const nativeScrollBy = window.scrollBy.bind(window);
    const nativeScrollIntoView = Element.prototype.scrollIntoView;

    let active = null;
    let animationFrameId = null;
    let observer = null;
    let revealTimer = null;

    const style = document.createElement('style');
    style.textContent = `
        html.bsf-scroll-lock,
        html.bsf-scroll-lock body {
            overflow-anchor: none !important;
            scroll-behavior: auto !important;
        }
    `;
    document.documentElement.appendChild(style);

    try {
        history.scrollRestoration = 'manual';
    } catch {}

    function median(values) {
        if (values.length === 0) {
            return null;
        }

        const sorted = [...values].sort((a, b) => a - b);
        const middle = Math.floor(sorted.length / 2);

        return sorted.length % 2 === 1
            ? sorted[middle]
            : (sorted[middle - 1] + sorted[middle]) / 2;
    }

    function isVisible(element) {
        const rect = element.getBoundingClientRect();

        return (
            rect.width > 0 &&
            rect.height > 0 &&
            rect.bottom > 0 &&
            rect.top < window.innerHeight
        );
    }

    function getFilterKey(element) {
        return element?.getAttribute?.('data-filters-item') || null;
    }

    function getDocumentTop(element) {
        return element.getBoundingClientRect().top + window.scrollY;
    }

    function findBestFilterMatch(key, expectedDocumentTop) {
        if (!key) {
            return null;
        }

        let best = null;
        let bestDistance = Infinity;

        for (const element of document.querySelectorAll('[data-filters-item]')) {
            if (getFilterKey(element) !== key) {
                continue;
            }

            const rect = element.getBoundingClientRect();
            if (rect.width <= 0 || rect.height <= 0) {
                continue;
            }

            // The same filter can appear twice after Booking promotes a selected
            // item to "Popular filters". Match the copy closest to its old
            // document position instead of whichever copy happens to be first.
            const distance = Math.abs(getDocumentTop(element) - expectedDocumentTop);

            if (distance < bestDistance) {
                best = element;
                bestDistance = distance;
            }
        }

        return best;
    }

    function collectAnchors(clickedFilter) {
        const clickedRect = clickedFilter.getBoundingClientRect();
        const clickedCenter = (clickedRect.top + clickedRect.bottom) / 2;
        const clickedDocumentTop = getDocumentTop(clickedFilter);
        const candidates = [];

        for (const element of document.querySelectorAll('[data-filters-item]')) {
            if (element === clickedFilter || !isVisible(element)) {
                continue;
            }

            const key = getFilterKey(element);
            if (!key) {
                continue;
            }

            const rect = element.getBoundingClientRect();
            const center = (rect.top + rect.bottom) / 2;
            const documentTop = getDocumentTop(element);

            // Prefer rows around the one being clicked. Rows just above it tend
            // to survive Booking's reordering more reliably than promoted rows.
            const aboveBias = documentTop < clickedDocumentTop ? -30 : 0;

            candidates.push({
                key,
                top: rect.top,
                documentTop,
                score: Math.abs(center - clickedCenter) + aboveBias,
            });
        }

        candidates.sort((a, b) => a.score - b.score);

        const anchors = [];
        const seen = new Set();

        for (const candidate of candidates) {
            if (seen.has(candidate.key)) {
                continue;
            }

            seen.add(candidate.key);
            anchors.push({
                key: candidate.key,
                top: candidate.top,
                documentTop: candidate.documentTop,
            });

            if (anchors.length >= MAX_ANCHORS) {
                break;
            }
        }

        return anchors;
    }

    function calculateAnchorDelta() {
        if (!active?.anchors?.length) {
            return null;
        }

        const deltas = [];

        for (const anchor of active.anchors) {
            const element = findBestFilterMatch(anchor.key, anchor.documentTop);
            if (!element) {
                continue;
            }

            const currentTop = element.getBoundingClientRect().top;
            deltas.push(currentTop - anchor.top);
        }

        if (deltas.length === 0) {
            return null;
        }

        // A promoted/duplicated row can still be a bad match. Use a robust
        // median and discard large outliers before applying the correction.
        const center = median(deltas);
        const deviations = deltas.map((delta) => Math.abs(delta - center));
        const mad = median(deviations) ?? 0;
        const threshold = Math.max(24, mad * 3.5);
        const inliers = deltas.filter((delta) => Math.abs(delta - center) <= threshold);

        return median(inliers.length > 0 ? inliers : deltas);
    }

    function revealDocument() {
        document.documentElement.style.visibility = '';

        if (revealTimer !== null) {
            clearTimeout(revealTimer);
            revealTimer = null;
        }

        if (active) {
            active.hidden = false;
        }
    }

    function compensate() {
        if (!active) {
            return;
        }

        const delta = calculateAnchorDelta();

        if (delta !== null) {
            if (Math.abs(delta) > DELTA_EPSILON_PX) {
                nativeScrollBy(0, delta);
            }

            if (active.hidden) {
                revealDocument();
            }

            return;
        }

        // Full navigation: filters may not be in the DOM yet.
        if (Number.isFinite(active.originalY)) {
            const maxY = Math.max(
                0,
                document.documentElement.scrollHeight - window.innerHeight,
            );

            if (maxY >= active.originalY) {
                nativeScrollTo(0, active.originalY);

                if (active.hidden) {
                    revealDocument();
                }
            }
        }
    }

    function stopStabilizing() {
        if (!active) {
            return;
        }

        compensate();
        active = null;

        document.documentElement.classList.remove('bsf-scroll-lock');
        revealDocument();

        if (animationFrameId !== null) {
            cancelAnimationFrame(animationFrameId);
            animationFrameId = null;
        }

        try {
            sessionStorage.removeItem(STORAGE_KEY);
        } catch {}
    }

    function stabilizationLoop() {
        if (!active) {
            return;
        }

        compensate();

        const now = performance.now();
        const elapsed = now - active.startedAt;
        const quietFor = now - active.lastMutation;

        if (
            (elapsed > MIN_LOCK_TIME_MS && quietFor > QUIET_TIME_MS) ||
            elapsed > MAX_LOCK_TIME_MS
        ) {
            stopStabilizing();
            return;
        }

        animationFrameId = requestAnimationFrame(stabilizationLoop);
    }

    function startStabilizing(data) {
        if (active) {
            stopStabilizing();
        }

        active = {
            originalY: data.originalY,
            anchors: Array.isArray(data.anchors) ? data.anchors : [],
            startedAt: performance.now(),
            lastMutation: performance.now(),
            hidden: Boolean(data.hidden),
        };

        document.documentElement.classList.add('bsf-scroll-lock');

        if (active.hidden) {
            revealTimer = window.setTimeout(revealDocument, REVEAL_TIMEOUT_MS);
        }

        animationFrameId = requestAnimationFrame(stabilizationLoop);
    }

    function getRequestedTop(args) {
        if (args.length === 0) {
            return null;
        }

        if (typeof args[0] === 'object' && args[0] !== null) {
            const top = Number(args[0].top);
            return Number.isFinite(top) ? top : null;
        }

        if (args.length >= 2) {
            const top = Number(args[1]);
            return Number.isFinite(top) ? top : null;
        }

        return null;
    }

    try {
        window.scrollTo = (...args) => {
            if (active && getRequestedTop(args) !== null) {
                return;
            }

            return nativeScrollTo(...args);
        };

        window.scroll = (...args) => {
            if (active && getRequestedTop(args) !== null) {
                return;
            }

            return nativeScroll(...args);
        };
    } catch {}

    try {
        Element.prototype.scrollIntoView = function (...args) {
            if (active) {
                return;
            }

            return nativeScrollIntoView.apply(this, args);
        };
    } catch {}

    function startObserver() {
        if (observer || !document.documentElement) {
            return;
        }

        observer = new MutationObserver(() => {
            if (!active) {
                return;
            }

            active.lastMutation = performance.now();

            // Correct before paint, then once more after layout settles.
            compensate();

            requestAnimationFrame(compensate);
        });

        observer.observe(document.documentElement, {
            childList: true,
            subtree: true,
        });
    }

    document.addEventListener(
        'pointerdown',
        (event) => {
            if (!(event.target instanceof Element)) {
                return;
            }

            const filter = event.target.closest('[data-filters-item]');
            if (!filter) {
                return;
            }

            if (active) {
                stopStabilizing();
            }

            const data = {
                originalY: window.scrollY,
                anchors: collectAnchors(filter),
                time: Date.now(),
            };

            try {
                sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data));
            } catch {}

            // Booking still handles the click normally.
            startStabilizing(data);
        },
        true,
    );

    function restoreAfterNavigation() {
        let saved = null;

        try {
            const raw = sessionStorage.getItem(STORAGE_KEY);
            if (raw) {
                saved = JSON.parse(raw);
            }
        } catch {}

        if (
            !saved ||
            !Number.isFinite(saved.originalY) ||
            Date.now() - saved.time >= RESTORE_MAX_AGE_MS
        ) {
            try {
                sessionStorage.removeItem(STORAGE_KEY);
            } catch {}

            return;
        }

        document.documentElement.style.visibility = 'hidden';
        startStabilizing({ ...saved, hidden: true });
    }

    const manualScrollKeys = new Set([
        'ArrowUp',
        'ArrowDown',
        'PageUp',
        'PageDown',
        'Home',
        'End',
        ' ',
    ]);

    window.addEventListener(
        'wheel',
        () => {
            if (active) {
                stopStabilizing();
            }
        },
        { capture: true, passive: true },
    );

    window.addEventListener(
        'touchstart',
        () => {
            if (active) {
                stopStabilizing();
            }
        },
        { capture: true, passive: true },
    );

    window.addEventListener(
        'keydown',
        (event) => {
            if (active && manualScrollKeys.has(event.key)) {
                stopStabilizing();
            }
        },
        { capture: true },
    );

    function init() {
        startObserver();
        restoreAfterNavigation();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init, { once: true });
    } else {
        init();
    }
})();
