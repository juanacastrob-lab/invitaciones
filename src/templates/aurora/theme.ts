/**
 * Plantilla Aurora.
 *
 * Una plantilla = componente React + configuración. Los colores viven aquí y
 * se inyectan como variables CSS, para que la siguiente plantilla solo tenga
 * que cambiar este archivo y su layout, no el contenido del evento.
 */
export const auroraTheme = {
  id: 'aurora',
  colors: {
    paper: '#faf8f5',
    ink: '#2e2c29',
    muted: '#8a837a',
    line: '#e2dcd3',
    accent: '#7d8471',
    accentSoft: '#eef0ea',
  },
} as const;

export const auroraCssVars = {
  '--paper': auroraTheme.colors.paper,
  '--ink': auroraTheme.colors.ink,
  '--muted': auroraTheme.colors.muted,
  '--line': auroraTheme.colors.line,
  '--accent': auroraTheme.colors.accent,
  '--accent-soft': auroraTheme.colors.accentSoft,
} as React.CSSProperties;
