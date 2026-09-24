// Sayfa başka bir sitenin iframe'i içinde mi (clickjacking)? GitHub Pages X-Frame-Options başlığı
// gönderemediği için kontrol istemcide yapılır.
export function isFramed(win: { self: unknown; top: unknown }): boolean {
  try {
    return win.self !== win.top;
  } catch {
    return true;
  }
}
