import type { Plugin } from 'vite';

// GitHub Pages HTTP başlığı ayarlayamadığı için politika meta etiketiyle verilir.
// frame-ancestors meta ile çalışmaz; iframe koruması src/lib/security.ts içinde.
export const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  'font-src https://fonts.gstatic.com',
  "img-src 'self' data:",
  'connect-src https://script.google.com https://script.googleusercontent.com',
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'none'",
  "frame-src 'none'",
  'upgrade-insecure-requests',
].join('; ');

export function cspPlugin(): Plugin {
  return {
    name: 'goksenin-csp',
    apply: 'build',
    transformIndexHtml(html: string) {
      return html.replace(
        '<meta charset="UTF-8" />',
        `<meta charset="UTF-8" />\n    <meta http-equiv="Content-Security-Policy" content="${CSP}" />\n    <meta name="referrer" content="no-referrer" />`,
      );
    },
  };
}
