import { readFile, writeFile, mkdir, readdir, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const output = resolve(root, 'public');
if (dirname(output) !== root || output === root) throw new Error('Invalid output directory');
await rm(output, { recursive: true, force: true });
await mkdir(resolve(output, 'js'), { recursive: true });
let index = await readFile(resolve(root, 'igbt-test-cell/index.html'), 'utf8');
if (!index.includes('</body>')) throw new Error('App index has no closing body');
index = index.replace('</body>', '<script type="module" src="/app-ai.mjs"></script>\n</body>');
await writeFile(resolve(output, 'index.html'), index);
const files = (await readdir(resolve(root, 'igbt-test-cell/js'))).filter(name => /^[a-z]+\.js$/.test(name));
for (const name of files) {
  await writeFile(resolve(output, 'js', name), await readFile(resolve(root, 'igbt-test-cell/js', name)));
}
await writeFile(resolve(output, 'evidence.mjs'), await readFile(resolve(root, 'ai-explainer/evidence.mjs')));
await writeFile(resolve(output, 'app-ai.mjs'), await readFile(resolve(root, 'ai-explainer/public/app-ai.mjs')));
console.log(`Built operator website: index + ${files.length} scripts + AI browser helpers. No server code copied.`);
