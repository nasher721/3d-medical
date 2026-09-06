import { readdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
const files = ['server.js', ...(await readdir('src')).filter(f => f.endsWith('.js')).map(f => `src/${f}`), ...(await readdir('scripts')).filter(f => f.endsWith('.js')).map(f => `scripts/${f}`)];
for (const file of files) {
  const result = spawnSync(process.execPath, ['--check', file], { stdio: 'inherit' });
  if (result.status !== 0) process.exit(result.status || 1);
}
console.log(`Syntax checked ${files.length} JavaScript modules. No external dependencies.`);
