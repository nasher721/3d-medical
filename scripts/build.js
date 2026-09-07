import { cp, mkdir, rm, readFile } from 'node:fs/promises';
import { assertAssetReleaseAllowed } from '../src/organ-assets.js';

const releaseBuild = process.argv.includes('--release');
if (releaseBuild) {
  const manifest = JSON.parse(await readFile('assets/organs/manifest.json', 'utf8'));
  assertAssetReleaseAllowed(manifest);
  assertAssetReleaseAllowed(JSON.parse(await readFile('assets/organs/vascular-manifest.json','utf8')));
}
await rm('dist', { recursive: true, force: true });
await mkdir('dist/assets', { recursive: true });
for (const path of ['index.html', 'src']) await cp(path, `dist/${path}`, { recursive: true });
await cp('assets/favicon.svg', 'dist/assets/favicon.svg');
await mkdir('dist/assets/organs', { recursive: true });
await cp('assets/organs/README.md', 'dist/assets/organs/README.md');
await cp('assets/organs/manifest.json', 'dist/assets/organs/manifest.json');
await cp('assets/organs/anatomy.glb', 'dist/assets/organs/anatomy.glb');
for(const file of ['vascular-manifest.json','vasculature.glb'])await cp(`assets/organs/${file}`,`dist/assets/organs/${file}`);
console.log(`Built standalone static application in dist/. No bundler or network dependencies${releaseBuild ? '; provenance gate passed.' : '; local educational preview.'}`);
