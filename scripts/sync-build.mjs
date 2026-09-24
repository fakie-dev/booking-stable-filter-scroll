import { copyFileSync } from 'node:fs';
import { join } from 'node:path';

const name = 'booking-stable-filter-scroll';

for (const suffix of ['user.js', 'meta.js']) {
    const file = `${name}.${suffix}`;
    copyFileSync(join('dist', file), file);
    console.log(`Updated ${file}`);
}
