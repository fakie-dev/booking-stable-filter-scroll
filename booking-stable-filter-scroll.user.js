// ==UserScript==
// @name         Booking.com Stable Filter Scroll
// @name:ru      Booking.com — стабильный скролл фильтров
// @namespace    https://github.com/fakie-dev/booking-stable-filter-scroll
// @version      1.1.3
// @author       fakie-dev
// @description  Keeps the Booking.com filter sidebar from jumping when filters update or move.
// @description:ru Не даёт странице Booking.com прыгать при обновлении и перемещении фильтров.
// @license      MIT
// @icon         https://raw.githubusercontent.com/fakie-dev/booking-stable-filter-scroll/main/assets/icon-64.png
// @icon64       https://raw.githubusercontent.com/fakie-dev/booking-stable-filter-scroll/main/assets/icon-128.png
// @homepageURL  https://github.com/fakie-dev/booking-stable-filter-scroll
// @supportURL   https://github.com/fakie-dev/booking-stable-filter-scroll/issues
// @downloadURL  https://raw.githubusercontent.com/fakie-dev/booking-stable-filter-scroll/main/booking-stable-filter-scroll.user.js
// @updateURL    https://raw.githubusercontent.com/fakie-dev/booking-stable-filter-scroll/main/booking-stable-filter-scroll.meta.js
// @match        https://www.booking.com/searchresults*
// @match        https://booking.com/searchresults*
// @grant        none
// @run-at       document-start
// @noframes
// ==/UserScript==

(function() {
	"use strict";
	var MAX_ANCHORS = 6;
	var SINGLE_ANCHOR_MAX_DOCUMENT_SHIFT_PX = 24;
	var TWO_ANCHOR_MAX_DISAGREEMENT_PX = 80;
	function median(values) {
		if (values.length === 0) return null;
		const sorted = [...values].sort((a, b) => a - b);
		const middle = Math.floor(sorted.length / 2);
		return sorted.length % 2 === 1 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
	}
	function getFilterKey(element) {
		return element?.getAttribute?.("data-filters-item") || null;
	}
	function collectAnchors(clickedFilter) {
		const clickedRect = clickedFilter.getBoundingClientRect();
		const clickedCenter = (clickedRect.top + clickedRect.bottom) / 2;
		const clickedDocumentTop = clickedRect.top + window.scrollY;
		const candidates = [];
		for (const element of document.querySelectorAll("[data-filters-item]")) {
			if (element === clickedFilter) continue;
			const key = getFilterKey(element);
			if (!key) continue;
			const rect = element.getBoundingClientRect();
			if (rect.width <= 0 || rect.height <= 0 || rect.bottom <= 0 || rect.top >= window.innerHeight) continue;
			const center = (rect.top + rect.bottom) / 2;
			const documentTop = rect.top + window.scrollY;
			const aboveBias = documentTop < clickedDocumentTop ? -30 : 0;
			candidates.push({
				key,
				top: rect.top,
				documentTop,
				score: Math.abs(center - clickedCenter) + aboveBias
			});
		}
		candidates.sort((a, b) => a.score - b.score);
		const anchors = [];
		const seen = new Set();
		for (const candidate of candidates) {
			if (seen.has(candidate.key)) continue;
			seen.add(candidate.key);
			anchors.push({
				key: candidate.key,
				top: candidate.top,
				documentTop: candidate.documentTop
			});
			if (anchors.length >= MAX_ANCHORS) break;
		}
		return anchors;
	}
	function calculateAnchorDelta(anchors) {
		if (!anchors?.length) return null;
		const expected = new Map();
		for (const anchor of anchors) if (typeof anchor.key === "string" && Number.isFinite(anchor.top) && Number.isFinite(anchor.documentTop) && !expected.has(anchor.key)) expected.set(anchor.key, anchor);
		if (expected.size === 0) return null;
		const matches = new Map();
		const scrollY = window.scrollY;
		for (const element of document.querySelectorAll("[data-filters-item]")) {
			const key = getFilterKey(element);
			const anchor = expected.get(key);
			if (!anchor) continue;
			const rect = element.getBoundingClientRect();
			if (rect.width <= 0 || rect.height <= 0) continue;
			const distance = Math.abs(rect.top + scrollY - anchor.documentTop);
			const previous = matches.get(key);
			if (!previous || distance < previous.distance) matches.set(key, {
				distance,
				delta: rect.top - anchor.top
			});
		}
		const found = [...matches.values()];
		const deltas = found.map(({ delta }) => delta);
		if (deltas.length === 0) return null;
		if (deltas.length === 1 && found[0].distance > SINGLE_ANCHOR_MAX_DOCUMENT_SHIFT_PX) return null;
		if (deltas.length === 2 && Math.abs(deltas[0] - deltas[1]) > TWO_ANCHOR_MAX_DISAGREEMENT_PX) return null;
		const center = median(deltas);
		const mad = median(deltas.map((delta) => Math.abs(delta - center))) ?? 0;
		const threshold = Math.max(24, mad * 3.5);
		const inliers = deltas.filter((delta) => Math.abs(delta - center) <= threshold);
		return median(inliers.length > 0 ? inliers : deltas);
	}
	var STORAGE_KEY = "__booking_stable_filter_scroll_v2";
	var MIN_LOCK_TIME_MS = 1200;
	var MAX_LOCK_TIME_MS = 3500;
	var QUIET_TIME_MS = 500;
	var RESTORE_MAX_AGE_MS = 1e4;
	var REVEAL_TIMEOUT_MS = 800;
	var DELTA_EPSILON_PX = .5;
	var nativeScrollTo = window.scrollTo.bind(window);
	var nativeScroll = window.scroll.bind(window);
	var nativeScrollBy = window.scrollBy.bind(window);
	var nativeScrollIntoView = Element.prototype.scrollIntoView;
	var active = null;
	var animationFrameId = null;
	var observer = null;
	var revealTimer = null;
	var style = document.createElement("style");
	style.textContent = `
    html.bsf-scroll-lock,
    html.bsf-scroll-lock body {
        overflow-anchor: none !important;
        scroll-behavior: auto !important;
    }
`;
	function ensureStyle() {
		if (document.documentElement && !style.isConnected) document.documentElement.appendChild(style);
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
		if (!active) return;
		const delta = calculateAnchorDelta(active.anchors);
		if (delta !== null) {
			if (Math.abs(delta) > DELTA_EPSILON_PX) nativeScrollBy(0, delta);
			if (active.hidden) revealDocument();
			return;
		}
		if (active.restoring && Number.isFinite(active.originalY)) {
			if (Math.max(0, document.documentElement.scrollHeight - window.innerHeight) >= active.originalY) {
				if (Math.abs(window.scrollY - active.originalY) > DELTA_EPSILON_PX) nativeScrollTo(0, active.originalY);
				if (active.hidden) revealDocument();
			}
		}
	}
	function stopStabilizing() {
		if (!active) return;
		document.documentElement.classList.remove("bsf-scroll-lock");
		revealDocument();
		if (active.restoring && active.previousScrollRestoration !== null) try {
			history.scrollRestoration = active.previousScrollRestoration;
		} catch {}
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
		if (!active) return;
		compensate();
		const now = performance.now();
		const elapsed = now - active.startedAt;
		const quietFor = now - active.lastMutation;
		if (elapsed > MIN_LOCK_TIME_MS && quietFor > QUIET_TIME_MS || elapsed > MAX_LOCK_TIME_MS) {
			stopStabilizing();
			return;
		}
		animationFrameId = requestAnimationFrame(stabilizationLoop);
	}
	function startStabilizing(data) {
		if (active) stopStabilizing();
		ensureStyle();
		const restoring = Boolean(data.restoring);
		let previousScrollRestoration = null;
		if (restoring) try {
			previousScrollRestoration = history.scrollRestoration;
			history.scrollRestoration = "manual";
		} catch {}
		active = {
			originalY: data.originalY,
			anchors: Array.isArray(data.anchors) ? data.anchors : [],
			startedAt: performance.now(),
			lastMutation: performance.now(),
			hidden: Boolean(data.hidden),
			restoring,
			previousScrollRestoration,
			previousVisibility: document.documentElement.style.visibility
		};
		document.documentElement.classList.add("bsf-scroll-lock");
		if (active.hidden) {
			document.documentElement.style.visibility = "hidden";
			revealTimer = window.setTimeout(revealDocument, REVEAL_TIMEOUT_MS);
		}
		startObserver();
		animationFrameId = requestAnimationFrame(stabilizationLoop);
	}
	function getRequestedTop(args) {
		if (args.length === 0) return null;
		if (typeof args[0] === "object" && args[0] !== null) {
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
			if (active && getRequestedTop(args) !== null) return;
			return nativeScrollTo(...args);
		};
		window.scroll = (...args) => {
			if (active && getRequestedTop(args) !== null) return;
			return nativeScroll(...args);
		};
		window.scrollBy = (...args) => {
			if (active && getRequestedTop(args) !== null) return;
			return nativeScrollBy(...args);
		};
	} catch {}
	try {
		Element.prototype.scrollIntoView = function(...args) {
			if (active) return;
			return nativeScrollIntoView.apply(this, args);
		};
	} catch {}
	function startObserver() {
		if (!document.documentElement) return;
		if (!observer) observer = new MutationObserver(() => {
			if (active) active.lastMutation = performance.now();
		});
		observer.observe(document.documentElement, {
			childList: true,
			subtree: true
		});
	}
	document.addEventListener("pointerdown", (event) => {
		if (event.isPrimary === false || event.button !== void 0 && event.button !== 0) return;
		if (!(event.target instanceof Element)) return;
		const filter = event.target.closest("[data-filters-item]");
		if (!filter) return;
		if (active) stopStabilizing();
		const data = {
			originalY: window.scrollY,
			anchors: collectAnchors(filter),
			time: Date.now()
		};
		try {
			sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data));
		} catch {}
		startStabilizing(data);
	}, true);
	function restoreAfterNavigation() {
		let saved = null;
		try {
			const raw = sessionStorage.getItem(STORAGE_KEY);
			if (raw) saved = JSON.parse(raw);
		} catch {}
		if (!saved || !Number.isFinite(saved.originalY) || Date.now() - saved.time >= RESTORE_MAX_AGE_MS) {
			try {
				sessionStorage.removeItem(STORAGE_KEY);
			} catch {}
			return;
		}
		startStabilizing({
			...saved,
			hidden: true,
			restoring: true
		});
	}
	var manualScrollKeys = new Set([
		"ArrowUp",
		"ArrowDown",
		"PageUp",
		"PageDown",
		"Home",
		"End",
		" "
	]);
	window.addEventListener("wheel", () => {
		if (active) stopStabilizing();
	}, {
		capture: true,
		passive: true
	});
	window.addEventListener("touchstart", () => {
		if (active) stopStabilizing();
	}, {
		capture: true,
		passive: true
	});
	window.addEventListener("keydown", (event) => {
		if (active && manualScrollKeys.has(event.key)) stopStabilizing();
	}, { capture: true });
	function init() {
		restoreAfterNavigation();
	}
	if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
	else init();
})();
