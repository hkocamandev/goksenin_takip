import { describe, expect, it } from 'vitest';
import { CSP, cspPlugin } from '../../vite.csp';

describe('İçerik Güvenlik Politikası', () => {
  it('yalnızca kendi kaynaklarına, Google Fonts ve Apps Script\'e izin verir; eval ve satır içi betik yok', () => {
    expect(CSP).toContain("default-src 'self'");
    expect(CSP).toContain("script-src 'self'");
    expect(CSP).not.toMatch(/script-src[^;]*'unsafe-(inline|eval)'/);
    expect(CSP).toContain('connect-src https://script.google.com https://script.googleusercontent.com');
    expect(CSP).toContain("object-src 'none'");
    expect(CSP).toContain("base-uri 'self'");
    expect(CSP).toContain("form-action 'none'");
  });

  it('yalnızca üretim derlemesinde head içine meta etiketi ekler', () => {
    const plugin = cspPlugin();
    expect(plugin.apply).toBe('build');
    const out = (plugin.transformIndexHtml as (html: string) => string)('<head><meta charset="UTF-8" /></head>');
    expect(out).toContain(`<meta http-equiv="Content-Security-Policy" content="${CSP}" />`);
    expect(out).toContain('<meta name="referrer" content="no-referrer" />');
  });
});
