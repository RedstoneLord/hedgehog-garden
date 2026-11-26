import { writeFile } from 'node:fs/promises';
import { deflateSync, crc32 } from 'node:zlib';
import { AMBIENT_FRAMES, createTerrainPixels, TERRAIN_SIZE } from '../src/terrain.js';

function chunk(type, data) {
  const name = Buffer.from(type);
  const header = Buffer.alloc(8);
  header.writeUInt32BE(data.length);
  name.copy(header, 4);
  const checksum = Buffer.alloc(4);
  checksum.writeUInt32BE(crc32(data, crc32(name)));
  return Buffer.concat([header, data, checksum]);
}

function png(pixels, width, height) {
  const bytesPerRow = width * 4;
  const rows = Buffer.alloc((bytesPerRow + 1) * height);
  for (let y = 0; y < height; y++) rows.set(pixels.subarray(y * bytesPerRow, (y + 1) * bytesPerRow), y * (bytesPerRow + 1) + 1);
  const dimensions = Buffer.alloc(13);
  dimensions.writeUInt32BE(width);
  dimensions.writeUInt32BE(height, 4);
  dimensions[8] = 8;
  dimensions[9] = 6;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', dimensions),
    chunk('IDAT', deflateSync(rows, { level: 9 })), chunk('IEND', Buffer.alloc(0)),
  ]);
}

const { width, height } = TERRAIN_SIZE;
const base = createTerrainPixels();
await writeFile(new URL('../src/pixel-landscape.png', import.meta.url), png(base, width, height));

async function writeAmbient(filename, render) {
  const overlays = new Uint8Array(base.length * (AMBIENT_FRAMES + 1));
  for (let frame = 1; frame < AMBIENT_FRAMES; frame++) {
    const pixels = render(frame);
    for (let px = 0; px < base.length; px += 4) {
      if (pixels[px] === base[px] && pixels[px + 1] === base[px + 1] && pixels[px + 2] === base[px + 2]) continue;
      const offset = frame * base.length + px;
      overlays.set(pixels.subarray(px, px + 4), offset);
    }
  }
  await writeFile(new URL(`../src/${filename}`, import.meta.url), png(overlays, width, height * (AMBIENT_FRAMES + 1)));
}
await writeAmbient('pixel-ambient.png', frame => createTerrainPixels(frame, 0));
await writeAmbient('pixel-wind.png', frame => createTerrainPixels(0, frame));
