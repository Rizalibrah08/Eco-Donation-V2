#!/usr/bin/env node
// Mengekspor semua layar desain Eco-Donation dari Figma menjadi PNG 2x ke
// "design & alur kerja sistem/design-v2/". Memakai Figma REST API (tanpa batas MCP).
//
//   FIGMA_TOKEN=<personal access token> node scripts/export-figma.js
//
// Token dibuat di Figma: Settings → Security → Personal access tokens (cukup izin baca file).

const fs = require('fs');
const path = require('path');

const FILE_KEY = 'WRh3634Jh2BbSXQgcGoAm3';
const SCALE = 2;
const token = process.env.FIGMA_TOKEN;
if (!token) {
  console.error('Set FIGMA_TOKEN terlebih dahulu (lihat komentar di atas file ini).');
  process.exit(1);
}

const root = path.resolve(__dirname, '..', 'design & alur kerja sistem', 'design-v2');
const api = async (url) => {
  const res = await fetch(`https://api.figma.com/v1${url}`, { headers: { 'X-Figma-Token': token } });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}: ${await res.text()}`);
  return res.json();
};

const slug = (s) => s.toLowerCase().replace(/[—·()]/g, ' ').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

// "WF U05b · Aktivitas — Mutasi poin" → wireframe/user/U05b-aktivitas-mutasi-poin.png
function target(name) {
  const m = name.match(/^(WF )?([UK]\d+b?) · (.+)$/);
  if (m) {
    const kind = m[1] ? 'wireframe' : 'hifi';
    const app = m[2].startsWith('U') ? 'user' : 'kurir';
    return path.join(kind, app, `${m[2]}-${slug(m[3])}.png`);
  }
  if (name === 'Komponen' || name.startsWith('Ikon') || name === 'Catatan arah desain') return path.join('fondasi', `${slug(name)}.png`);
  return null;
}

(async () => {
  const file = await api(`/files/${FILE_KEY}?depth=2`);
  const jobs = [];
  for (const page of file.document.children) {
    for (const node of page.children || []) {
      const out = target(node.name);
      if (out) jobs.push({ id: node.id, name: node.name, out });
    }
  }
  if (!jobs.length) throw new Error('Tidak ada frame yang cocok ditemukan.');

  // Render bertahap agar URL tidak kedaluwarsa dan permintaan tidak terlalu besar.
  for (let i = 0; i < jobs.length; i += 20) {
    const batch = jobs.slice(i, i + 20);
    const { images } = await api(`/images/${FILE_KEY}?ids=${batch.map((j) => j.id).join(',')}&scale=${SCALE}&format=png`);
    for (const job of batch) {
      const url = images[job.id];
      if (!url) { console.warn(`Lewati (gagal render): ${job.name}`); continue; }
      const buf = Buffer.from(await (await fetch(url)).arrayBuffer());
      const dest = path.join(root, job.out);
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.writeFileSync(dest, buf);
      console.log(`✓ ${job.out}`);
    }
  }
  console.log(`Selesai: ${jobs.length} gambar di ${root}`);
})().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
