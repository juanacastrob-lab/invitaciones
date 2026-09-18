/**
 * Genera las imágenes provisionales del evento demo.
 *
 * Mientras no haya fotos reales, la invitación no debe verse rota. Estos SVG
 * pesan unos pocos KB, se ven nítidos en cualquier pantalla y usan la paleta
 * de la plantilla, así que parecen parte del diseño y no un hueco.
 *
 *   npm run build:demo-placeholders
 */
import { mkdirSync, writeFileSync } from 'node:fs';

const PAPER = '#faf8f5';
const SAND = '#e8e0d5';
const SAGE = '#7d8471';

/** Una ramita de hojas, que es lo que hace que no parezca un cuadro vacío. */
function sprig(x: number, y: number, scale: number, rotate: number, opacity: number) {
  const leaves = Array.from({ length: 7 }, (_, i) => {
    const t = i / 6;
    const ly = -t * 90;
    const side = i % 2 === 0 ? 1 : -1;
    const size = 16 * (1 - t * 0.45);
    return `<ellipse cx="${side * size * 0.85}" cy="${ly}" rx="${size}" ry="${size * 0.42}"
      transform="rotate(${side * 28} ${side * size * 0.85} ${ly})" fill="${SAGE}" />`;
  }).join('');

  return `<g transform="translate(${x} ${y}) scale(${scale}) rotate(${rotate})" opacity="${opacity}">
    <path d="M0 0 C 2 -40, -2 -70, 0 -95" stroke="${SAGE}" stroke-width="2" fill="none" />
    ${leaves}
  </g>`;
}

function frame(w: number, h: number, inner: string, seed: number) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img">
  <defs>
    <linearGradient id="g${seed}" x1="0" y1="0" x2="0.3" y2="1">
      <stop offset="0%" stop-color="${SAND}" />
      <stop offset="55%" stop-color="${PAPER}" />
      <stop offset="100%" stop-color="${SAND}" />
    </linearGradient>
  </defs>
  <rect width="${w}" height="${h}" fill="url(#g${seed})" />
  ${inner}
</svg>
`;
}

mkdirSync('public/demo', { recursive: true });

// Portada: vertical, con arco y monograma.
writeFileSync(
  'public/demo/portada.svg',
  frame(
    1200,
    1600,
    `<path d="M300 1180 L300 620 A300 300 0 0 1 900 620 L900 1180 Z"
       fill="none" stroke="${SAGE}" stroke-width="2" opacity="0.35" />
     ${sprig(300, 1180, 2.2, -14, 0.35)}
     ${sprig(900, 1180, 2.2, 14, 0.35)}`,
    1,
  ),
);

// Nuestra historia: 4:5.
writeFileSync(
  'public/demo/historia.svg',
  frame(
    1000,
    1250,
    `<circle cx="500" cy="600" r="280" fill="none" stroke="${SAGE}" stroke-width="2" opacity="0.3" />
     ${sprig(500, 980, 2.6, 0, 0.3)}`,
    2,
  ),
);

// Galería: cuatro cuadrados, cada uno con su motivo.
const motivos = [
  `<circle cx="400" cy="400" r="210" fill="none" stroke="${SAGE}" stroke-width="2" opacity="0.32" />`,
  `<rect x="190" y="190" width="420" height="420" fill="none" stroke="${SAGE}" stroke-width="2" opacity="0.32" />`,
  `<path d="M400 190 L610 400 L400 610 L190 400 Z" fill="none" stroke="${SAGE}" stroke-width="2" opacity="0.32" />`,
  `<path d="M190 480 Q400 250 610 480" fill="none" stroke="${SAGE}" stroke-width="2" opacity="0.32" />`,
];

motivos.forEach((motivo, i) => {
  writeFileSync(
    `public/demo/galeria-${i + 1}.svg`,
    frame(800, 800, `${motivo}${sprig(400, 690, 1.8, i % 2 === 0 ? -10 : 10, 0.28)}`, 10 + i),
  );
});

console.log('6 imágenes provisionales escritas en public/demo/');
