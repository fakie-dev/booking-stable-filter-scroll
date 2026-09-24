import { calculateAnchorDelta, collectAnchors } from './anchors.js';

const STORAGE_KEY = '__booking_stable_filter_scroll_v2';
const MIN_LOCK_TIME_MS = 1200;
const MAX_LOCK_TIME_MS = 3500;
const QUIET_TIME_MS = 500;
const RESTORE_MAX_AGE_MS = 10_000;
const REVEAL_TIMEOUT_MS = 800;
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

function ensureStyle() {
    if (document.documentElement && !style.isConnected) {
        document.documentElement.appendChild(style);
    }
}

function revealDocument() {
    if (revealTimer !== null) {
        clearTimeout(revealTimer);
        revealTimer = null;
    }

    if (active?.hidden) {
        document.documentElement.style.visibility = active.previousVisibility;
        active.hidden = false;
    }
}

function compensate() {
    if (!active) {
        return;
    }

    const delta = calculateAnchorDelta(active.anchors);

    if (delta !== null) {
        if (Math.abs(delta) > DELTA_EPSILON_PX) {
            nativeScrollBy(0, delta);
        }

        if (active.hidden) {
            revealDocument();
        }

        return;
    }

    // Only a full navigation needs a position fallback. During an in-page
    // update, a stale saved Y could move the user away from the clicked row.
    if (active.restoring && Number.isFinite(active.originalY)) {
        const maxY = Math.max(
            0,
            document.documentElement.scrollHeight - window.innerHeight,
        );

        if (maxY >= active.originalY) {
            if (Math.abs(window.scrollY - active.originalY) > DELTA_EPSILON_PX) {
                nativeScrollTo(0, active.originalY);
            }

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

    document.documentElement.classList.remove('bsf-scroll-lock');
    revealDocument();

    if (active.restoring && active.previousScrollRestoration !== null) {
        try {
            history.scrollRestoration = active.previousScrollRestoration;
        } catch {}
    }

    active = null;

    if (animationFrameId !== null) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
    }

    observer?.disconnect();

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

    ensureStyle();

    const restoring = Boolean(data.restoring);
    let previousScrollRestoration = null;
    if (restoring) {
        try {
            previousScrollRestoration = history.scrollRestoration;
            history.scrollRestoration = 'manual';
        } catch {}
    }

    active = {
        originalY: data.originalY,
        anchors: Array.isArray(data.anchors) ? data.anchors : [],
        startedAt: performance.now(),
        lastMutation: performance.now(),
        hidden: Boolean(data.hidden),
        restoring,
        previousScrollRestoration,
        previousVisibility: document.documentElement.style.visibility,
    };

    document.documentElement.classList.add('bsf-scroll-lock');

    if (active.hidden) {
        document.documentElement.style.visibility = 'hidden';
        revealTimer = window.setTimeout(revealDocument, REVEAL_TIMEOUT_MS);
    }

    startObserver();
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

    window.scrollBy = (...args) => {
        if (active && getRequestedTop(args) !== null) {
            return;
        }

        return nativeScrollBy(...args);
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
    if (!document.documentElement) {
        return;
    }

    if (!observer) {
        observer = new MutationObserver(() => {
            if (active) {
                active.lastMutation = performance.now();
            }
        });
    }

    // No observer is retained on the idle page; the active frame loop does
    // the correction before paint after a mutation arrives.
    observer.observe(document.documentElement, {
        childList: true,
        subtree: true,
    });
}

document.addEventListener(
    'pointerdown',
    (event) => {
        if (event.isPrimary === false || (event.button !== undefined && event.button !== 0)) {
            return;
        }

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

    startStabilizing({ ...saved, hidden: true, restoring: true });
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
    restoreAfterNavigation();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
} else {
    init();
}
