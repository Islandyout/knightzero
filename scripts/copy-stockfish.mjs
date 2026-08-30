import { mkdir, copyFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const sourceDir = resolve('node_modules/stockfish/bin');
const targetDir = resolve('public/stockfish');
await mkdir(targetDir, { recursive: true });
for (const file of ['stockfish-18-lite-single.js','stockfish-18-lite-single.wasm']) {
  await copyFile(resolve(sourceDir, file), resolve(targetDir, file));
  console.log(`Copied ${file}`);
}
