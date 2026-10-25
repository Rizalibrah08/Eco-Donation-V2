#!/usr/bin/env node
// Menyalin design system dari user-app/src/ui ke courier-app/src/ui.
// theme.ts TIDAK disalin karena warna brand tiap aplikasi berbeda.
//
//   node scripts/sync-ui.js          salin
//   node scripts/sync-ui.js --check  hanya periksa (exit 1 bila berbeda)

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const src = path.join(root, 'user-app', 'src', 'ui');
const dest = path.join(root, 'courier-app', 'src', 'ui');
const SKIP = new Set(['theme.ts']);
const checkOnly = process.argv.includes('--check');

const files = fs.readdirSync(src).filter((f) => !SKIP.has(f) && fs.statSync(path.join(src, f)).isFile());
const stale = [];

if (!checkOnly) fs.mkdirSync(dest, { recursive: true });

for (const file of files) {
  const from = path.join(src, file);
  const to = path.join(dest, file);
  const content = fs.readFileSync(from);
  const same = fs.existsSync(to) && fs.readFileSync(to).equals(content);
  if (same) continue;
  stale.push(file);
  if (!checkOnly) fs.writeFileSync(to, content);
}

// File yang sudah dihapus di user-app ikut dihapus di courier-app.
const orphans = fs.existsSync(dest)
  ? fs.readdirSync(dest).filter((f) => !SKIP.has(f) && !files.includes(f))
  : [];
for (const file of orphans) {
  stale.push(`${file} (dihapus)`);
  if (!checkOnly) fs.unlinkSync(path.join(dest, file));
}

if (!fs.existsSync(path.join(dest, 'theme.ts'))) {
  console.warn('Peringatan: courier-app/src/ui/theme.ts belum ada. Buat manual dengan warna brand kurir.');
}

if (stale.length === 0) {
  console.log('Design system sudah sinkron.');
} else if (checkOnly) {
  console.error(`Belum sinkron: ${stale.join(', ')}\nJalankan: node scripts/sync-ui.js`);
  process.exit(1);
} else {
  console.log(`Disalin ke courier-app/src/ui: ${stale.join(', ')}`);
}
