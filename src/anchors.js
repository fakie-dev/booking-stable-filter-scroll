const MAX_ANCHORS = 6;
const SINGLE_ANCHOR_MAX_DOCUMENT_SHIFT_PX = 24;
const TWO_ANCHOR_MAX_DISAGREEMENT_PX = 80;

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

function getFilterKey(element) {
    return element?.getAttribute?.('data-filters-item') || null;
}

export function collectAnchors(clickedFilter) {
    const clickedRect = clickedFilter.getBoundingClientRect();
    const clickedCenter = (clickedRect.top + clickedRect.bottom) / 2;
    const clickedDocumentTop = clickedRect.top + window.scrollY;
    const candidates = [];

    for (const element of document.querySelectorAll('[data-filters-item]')) {
        if (element === clickedFilter) {
            continue;
        }

        const key = getFilterKey(element);
        if (!key) {
            continue;
        }

        const rect = element.getBoundingClientRect();
        if (
            rect.width <= 0 ||
            rect.height <= 0 ||
            rect.bottom <= 0 ||
            rect.top >= window.innerHeight
        ) {
            continue;
        }

        const center = (rect.top + rect.bottom) / 2;
        const documentTop = rect.top + window.scrollY;

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

export function calculateAnchorDelta(anchors) {
    if (!anchors?.length) {
        return null;
    }

    const expected = new Map();
    for (const anchor of anchors) {
        if (
            typeof anchor.key === 'string' &&
            Number.isFinite(anchor.top) &&
            Number.isFinite(anchor.documentTop) &&
            !expected.has(anchor.key)
        ) {
            expected.set(anchor.key, anchor);
        }
    }

    if (expected.size === 0) {
        return null;
    }

    const matches = new Map();
    const scrollY = window.scrollY;

    // Scan the filter rows once per frame. A row's rectangle is read once,
    // even when several anchors or duplicate filter keys are present.
    for (const element of document.querySelectorAll('[data-filters-item]')) {
        const key = getFilterKey(element);
        const anchor = expected.get(key);
        if (!anchor) {
            continue;
        }

        const rect = element.getBoundingClientRect();
        if (rect.width <= 0 || rect.height <= 0) {
            continue;
        }

        const distance = Math.abs(rect.top + scrollY - anchor.documentTop);
        const previous = matches.get(key);
        if (!previous || distance < previous.distance) {
            matches.set(key, { distance, delta: rect.top - anchor.top });
        }
    }

    const found = [...matches.values()];
    const deltas = found.map(({ delta }) => delta);

    if (deltas.length === 0) {
        return null;
    }

    // A lone row far from its old document position may be a promoted copy.
    // Two rows that disagree strongly also do not justify a page correction.
    if (deltas.length === 1 && found[0].distance > SINGLE_ANCHOR_MAX_DOCUMENT_SHIFT_PX) {
        return null;
    }
    if (deltas.length === 2 && Math.abs(deltas[0] - deltas[1]) > TWO_ANCHOR_MAX_DISAGREEMENT_PX) {
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
