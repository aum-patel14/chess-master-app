#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import https from 'https';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const publicDir = path.join(root, 'public');
const CDN_JS =
  'https://cdn.jsdelivr.net/npm/stockfish@16.0.0/src/stockfish-nnue-16.js';

function copyIfExists(src, dest) {
  if (!fs.existsSync(src)) return false;
  fs.copyFileSync(src, dest);
  console.log(`Copied ${path.basename(dest)}`);
  return true;
}

function download(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https
      .get(url, (res) => {
        if (res.statusCode !== 200) {
          reject(new Error(`HTTP ${res.statusCode} for ${url}`));
          return;
        }
        res.pipe(file);
        file.on('finish', () => {
          file.close();
          console.log(`Downloaded ${path.basename(dest)}`);
          resolve();
        });
      })
      .on('error', reject);
  });
}

async function main() {
  if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true });

  const binDir = path.join(root, 'node_modules', 'stockfish', 'bin');
  const jsSrc = path.join(binDir, 'stockfish-18-lite.js');
  const wasmSrc = path.join(binDir, 'stockfish-18-lite.wasm');
  const jsFallback = path.join(binDir, 'stockfish.js');
  const wasmFallback = path.join(binDir, 'stockfish.wasm');
  const jsDest = path.join(publicDir, 'stockfish.js');
  const wasmDest = path.join(publicDir, 'stockfish.wasm');

  let jsOk = copyIfExists(jsSrc, jsDest) || copyIfExists(jsFallback, jsDest);
  let wasmOk = copyIfExists(wasmSrc, wasmDest) || copyIfExists(wasmFallback, wasmDest);

  if (!jsOk) {
    try {
      await download(CDN_JS, jsDest);
      jsOk = true;
    } catch (e) {
      console.warn('Could not download stockfish.js:', e.message);
    }
  }

  if (!wasmOk && jsOk && fs.existsSync(wasmSrc)) {
    wasmOk = copyIfExists(wasmSrc, wasmDest);
  }

  if (!jsOk) {
    console.warn('stockfish.js not available — AI will use CDN fallback at runtime.');
    process.exit(0);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
