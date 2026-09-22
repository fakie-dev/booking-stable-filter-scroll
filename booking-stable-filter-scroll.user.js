// ==UserScript==
// @name         Booking.com Stable Filter Scroll
// @namespace    https://github.com/fakie-dev/booking-stable-filter-scroll
// @version      1.0.0
// @description  Keeps the Booking.com filter sidebar from jumping when filters update or reorder.
// @author       fakie-dev
// @license      MIT
// @match        https://www.booking.com/searchresults*
// @match        https://booking.com/searchresults*
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

    const STORAGE_KEY = '__booking_stable_filter_scroll_v1';
    const MAX_LOCK_TIME_MS = 2500;
    const QUIET_TIME_MS = 350;
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

    function findBestFilterMatch(key, expectedTop) {
        if (!key) {
            return null;
        }

        const matches = [];

        for (const element of document.querySelectorAll('[data-filters-item]')) {
            if (getFilterKey(element) !== key) {
                continue;
            }

            const rect = element.getBoundingClientRect();

            if (rect.width <= 0 || rect.height <= 0) {
                continue;
            }

            matches.push({
                element,
                top: rect.top,
                distance: Math.abs(rect.top - expectedTop),
            });
        }

        matches.sort((a, b) => a.distance - b.distance);

        return matches[0]?.element ?? null;
    }

    function collectAnchors(clickedFilter) {
        const viewportMiddle = window.innerHeight / 2;
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

            candidates.push({
                key,
                top: rect.top,
                distance: Math.abs(center - viewportMiddle),
            });
        }

        candidates.sort((a, b) => a.distance - b.distance);

        const anchors = [];
        const seen = new Set();

        for (const candidate of candidates) {
            if (seen.has(candidate.key)) {
                continue;
            }

            seen.add(candidate.key);
            anchors.push({ key: candidate.key, top: candidate.top });

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
            const element = findBestFilterMatch(anchor.key, anchor.top);
            if (!element) {
                continue;
            }

            const currentTop = element.getBoundingClientRect().top;
            deltas.push(currentTop - anchor.top);
        }

        return median(deltas);
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
            (elapsed > 450 && quietFor > QUIET_TIME_MS) ||
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
