import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { releaseVersion } from './release-version.mjs';

const buildDirectory = resolve('dist');
const version = releaseVersion();
const output = resolve(process.argv[2] ?? resolve('versions', version, 'play.html'));
await mkdir(dirname(output), { recursive: true });
let html = await readFile(resolve(buildDirectory, 'index.html'), 'utf8');

const moduleTag = /<script type="module"[^>]*src="(\.\/assets\/[^"\s]+\.js)"[^>]*><\/script>/;
const cssTag = /<link rel="stylesheet"[^>]*href="(\.\/assets\/[^"\s]+\.css)"[^>]*>/;
const script = html.match(moduleTag);
const stylesheet = html.match(cssTag);
if (!script || !stylesheet) throw new Error('Could not find the generated JavaScript and CSS in dist/index.html.');

const javascript = await readFile(resolve(buildDirectory, script[1]), 'utf8');
const css = await readFile(resolve(buildDirectory, stylesheet[1]), 'utf8');
html = html.replace(moduleTag, () => `<script type="module">${javascript.replaceAll(/<\/script/gi, '<\\/script')}</script>`);
html = html.replace(cssTag, () => `<style>${css}</style>`);
// Home-screen installation is served by the hosted build. The standalone tab icon is already embedded.
html = html.replace(/^\s*<link rel="(?:manifest|apple-touch-icon)"[^>]*>\r?\n/gm, '');

await writeFile(output, html);
console.log(`Standalone build written to ${output}`);
