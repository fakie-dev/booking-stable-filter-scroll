import fs from 'node:fs';
import process from 'node:process';

const version = process.argv[2];

if (!version || !/^\d+\.\d+\.\d+$/.test(version)) {
    console.error('Usage: node scripts/set-version.mjs <x.y.z>');
    process.exit(1);
}

for (const file of [
    'booking-stable-filter-scroll.user.js',
    'booking-stable-filter-scroll.meta.js',
]) {
    const source = fs.readFileSync(file, 'utf8');
    const pattern = /(^\/\/\s+@version\s+)(\S+)/m;

    if (!pattern.test(source)) {
        throw new Error(`${file}: @version not found`);
    }

    const updated = source.replace(pattern, `$1${version}`);
    fs.writeFileSync(file, updated);
}

console.log(`Updated userscript version to ${version}`);
