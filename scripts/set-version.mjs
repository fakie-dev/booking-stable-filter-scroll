import { readFileSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import process from 'node:process';

const version = process.argv[2];

if (!version || !/^\d+\.\d+\.\d+$/.test(version)) {
    console.error('Usage: node scripts/set-version.mjs <x.y.z>');
    process.exit(1);
}

for (const file of ['package.json', 'package-lock.json']) {
    const data = JSON.parse(readFileSync(file, 'utf8'));
    data.version = version;

    if (file === 'package-lock.json') {
        data.packages[''].version = version;
    }

    writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`);
}

execSync('npm run build', { stdio: 'inherit' });
