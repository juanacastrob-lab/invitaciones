import localFont from 'next/font/local';

/**
 * Las fuentes elegibles, servidas desde el propio sitio (archivos en
 * src/assets/fonts, subconjunto latino). Cada una queda como variable CSS;
 * el navegador solo descarga la que aparece en pantalla.
 */
const cormorant = localFont({ src: '../assets/fonts/CormorantGaramond-Medium.ttf', weight: '500', variable: '--font-cormorant', display: 'swap' });
const playfair = localFont({ src: '../assets/fonts/playfair-400.woff2', weight: '400 500', variable: '--font-playfair', display: 'swap' });
const libre = localFont({ src: '../assets/fonts/libre-400.woff2', weight: '400', variable: '--font-libre', display: 'swap' });
const cinzel = localFont({ src: '../assets/fonts/cinzel-400.woff2', weight: '400 500', variable: '--font-cinzel', display: 'swap' });
const greatvibes = localFont({ src: '../assets/fonts/greatvibes-400.woff2', weight: '400', variable: '--font-greatvibes', display: 'swap' });
const parisienne = localFont({ src: '../assets/fonts/parisienne-400.woff2', weight: '400', variable: '--font-parisienne', display: 'swap' });
const josefin = localFont({ src: '../assets/fonts/josefin-300.woff2', weight: '300 400', variable: '--font-josefin', display: 'swap' });
const montserrat = localFont({ src: '../assets/fonts/montserrat-300.woff2', weight: '300 400', variable: '--font-montserrat', display: 'swap' });

/** Clases con todas las variables; se pone en la raíz de la invitación y del selector. */
export const FONT_VARIABLE_CLASSES = [cormorant, playfair, libre, cinzel, greatvibes, parisienne, josefin, montserrat].map((f) => f.variable).join(' ');
