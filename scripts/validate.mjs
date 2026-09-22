import fs from 'node:fs';
import process from 'node:process';

const userFile = 'booking-stable-filter-scroll.user.js';
const metaFile = 'booking-stable-filter-scroll.meta.js';

const user = fs.readFileSync(userFile, 'utf8');
const meta = fs.readFileSync(metaFile, 'utf8');

function metadataBlock(source, file) {
    const match = source.match(/\/\/ ==UserScript==[\s\S]*?\/\/ ==\/UserScript==/);
    if (!match) {
        throw new Error(`${file}: userscript metadata block not found`);
    }
    return match[0];
}

function field(block, name, file) {
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const match = block.match(new RegExp(`^\\/\\/\\s+@${escaped}\\s+(.+)$`, 'm'));
    if (!match) {
        throw new Error(`${file}: @${name} not found`);
    }
    return match[1].trim();
}

const userMeta = metadataBlock(user, userFile);
const metaMeta = metadataBlock(meta, metaFile);

const fields = [
    'name',
    'namespace',
    'version',
    'description',
    'description:ru',
    'author',
    'license',
    'icon',
    'icon64',
    'run-at',
    'homepageURL',
    'supportURL',
    'updateURL',
    'downloadURL',
    'grant',
];

for (const name of fields) {
    const a = field(userMeta, name, userFile);
    const b = field(metaMeta, name, metaFile);
    if (a !== b) {
        throw new Error(`Metadata mismatch for @${name}: ${JSON.stringify(a)} !== ${JSON.stringify(b)}`);
    }
}

const version = field(userMeta, 'version', userFile);
if (!/^\d+\.\d+\.\d+$/.test(version)) {
    throw new Error(`@version must use x.y.z semantic versioning, got ${version}`);
}

const requiredMatches = [
    'https://www.booking.com/searchresults*',
    'https://booking.com/searchresults*',
];

for (const pattern of requiredMatches) {
    if (!userMeta.includes(`@match        ${pattern}`) || !metaMeta.includes(`@match        ${pattern}`)) {
        throw new Error(`Missing required @match ${pattern}`);
    }
}

for (const forbidden of ['@require', '@connect']) {
    if (userMeta.includes(forbidden)) {
        throw new Error(`${userFile}: ${forbidden} is not allowed by the current security model`);
    }
}

console.log(`OK: metadata synchronized, version ${version}`);
