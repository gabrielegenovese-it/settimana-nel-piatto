// Genera icon-192.png e icon-512.png (zero dipendenze): un piatto bianco su fondo rosso pomodoro.
// Uso: node strumenti/icone.mjs
import { deflateSync } from "node:zlib";
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const qui = dirname(fileURLToPath(import.meta.url));
const FONDO = [207, 74, 38], BIANCO = [255, 255, 255];

const crcTab = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc = b => { let c = 0xffffffff; for (const x of b) c = crcTab[(c ^ x) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
function blocco(tipo, dati) {
  const len = Buffer.alloc(4); len.writeUInt32BE(dati.length);
  const td = Buffer.concat([Buffer.from(tipo), dati]);
  const c = Buffer.alloc(4); c.writeUInt32BE(crc(td));
  return Buffer.concat([len, td, c]);
}

// Piatto visto dall'alto: bordo ad anello + fondo pieno. Coordinate normalizzate 0..1.
function bianco(x, y) {
  const d = Math.hypot(x - 0.5, y - 0.5);
  return (d <= 0.31 && d >= 0.25) || d <= 0.18;
}

function png(lato) {
  const SS = 4, righe = [];
  for (let py = 0; py < lato; py++) {
    const riga = Buffer.alloc(1 + lato * 3);
    for (let px = 0; px < lato; px++) {
      let n = 0;
      for (let sy = 0; sy < SS; sy++) for (let sx = 0; sx < SS; sx++) {
        if (bianco((px + (sx + 0.5) / SS) / lato, (py + (sy + 0.5) / SS) / lato)) n++;
      }
      const t = n / (SS * SS);
      for (let k = 0; k < 3; k++) riga[1 + px * 3 + k] = Math.round(FONDO[k] + (BIANCO[k] - FONDO[k]) * t);
    }
    righe.push(riga);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(lato, 0); ihdr.writeUInt32BE(lato, 4);
  ihdr[8] = 8; ihdr[9] = 2;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    blocco("IHDR", ihdr),
    blocco("IDAT", deflateSync(Buffer.concat(righe))),
    blocco("IEND", Buffer.alloc(0)),
  ]);
}

for (const lato of [192, 512]) {
  writeFileSync(join(qui, "..", `icon-${lato}.png`), png(lato));
  console.log(`icon-${lato}.png`);
}
