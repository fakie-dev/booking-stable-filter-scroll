import { readFileSync } from 'node:fs';

const { version } = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));

export const userscript = {
    name: 'Booking.com Stable Filter Scroll',
    'name:ru': 'Booking.com — стабильный скролл фильтров',
    namespace: 'https://github.com/fakie-dev/booking-stable-filter-scroll',
    version,
    description: 'Keeps the Booking.com filter sidebar from jumping when filters update or move.',
    'description:ru': 'Не даёт странице Booking.com прыгать при обновлении и перемещении фильтров.',
    author: 'fakie-dev',
    license: 'MIT',
    match: [
        'https://www.booking.com/searchresults*',
        'https://booking.com/searchresults*',
    ],
    icon: 'https://raw.githubusercontent.com/fakie-dev/booking-stable-filter-scroll/main/assets/icon-64.png',
    icon64: 'https://raw.githubusercontent.com/fakie-dev/booking-stable-filter-scroll/main/assets/icon-128.png',
    'run-at': 'document-start',
    noframes: true,
    homepageURL: 'https://github.com/fakie-dev/booking-stable-filter-scroll',
    supportURL: 'https://github.com/fakie-dev/booking-stable-filter-scroll/issues',
    updateURL: 'https://raw.githubusercontent.com/fakie-dev/booking-stable-filter-scroll/main/booking-stable-filter-scroll.meta.js',
    downloadURL: 'https://raw.githubusercontent.com/fakie-dev/booking-stable-filter-scroll/main/booking-stable-filter-scroll.user.js',
    grant: 'none',
};
