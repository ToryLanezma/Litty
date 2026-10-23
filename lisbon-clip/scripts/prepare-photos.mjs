// Normalizes raw photos into public/photos and writes src/photos.json.
// Usage: node scripts/prepare-photos.mjs <raw-photos-dir>
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import exifReader from 'exif-reader';

const rawDir = process.argv[2];
if (!rawDir) {
  console.error('Usage: node scripts/prepare-photos.mjs <raw-photos-dir>');
  process.exit(1);
}
const outDir = path.resolve('public/photos');
fs.rmSync(outDir, {recursive: true, force: true});
fs.mkdirSync(outDir, {recursive: true});

const files = fs
  .readdirSync(rawDir)
  .filter((f) => /\.(jpe?g|png|webp|heic|heif|tiff?)$/i.test(f));

const photos = [];
for (const file of files) {
  const src = path.join(rawDir, file);
  const meta = await sharp(src).metadata();
  let takenAt = fs.statSync(src).mtimeMs;
  if (meta.exif) {
    try {
      const date = exifReader(meta.exif).Photo?.DateTimeOriginal;
      if (date) takenAt = date.getTime();
    } catch {}
  }
  const name = path.parse(file).name.replace(/[^\w-]/g, '_') + '.jpg';
  const info = await sharp(src)
    .rotate()
    .resize({width: 3200, height: 3200, fit: 'inside', withoutEnlargement: true})
    .jpeg({quality: 90})
    .toFile(path.join(outDir, name));
  photos.push({file: `photos/${name}`, width: info.width, height: info.height, takenAt});
  console.log(`${file} -> ${name} (${info.width}x${info.height})`);
}

photos.sort((a, b) => a.takenAt - b.takenAt);
fs.writeFileSync('src/photos.json', JSON.stringify(photos, null, 2));
console.log(`\n${photos.length} photos ready`);
