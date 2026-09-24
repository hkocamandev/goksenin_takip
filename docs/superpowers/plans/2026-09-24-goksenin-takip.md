# Göksenin Takip Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 7. ve 8. sınıf test/ödev/deneme sonuçlarını kaydeden, haftalık/aylık net gelişimini analiz eden ve sıralayan, GitHub Pages'te yayınlanan, kullanıcı girişli bir web uygulaması.

**Architecture:** React SPA (Vite, TypeScript, Tailwind v4, Recharts) GitHub Pages'te çalışır; tek bir Google Apps Script Web App ucuna `POST {action, token, payload}` gönderir; Apps Script veriyi paylaşılmamış bir Google Sheet'te tutar, girişi ve doğrulamayı yapar. Tüm hesaplamalar (net, dönemler, sıralamalar) `src/lib/` altında saf fonksiyonlardır. `VITE_API_URL` yoksa geliştirmede aynı arayüzü uygulayan mock backend kullanılır.

**Tech Stack:** Node 24, React 19, Vite 8, TypeScript 5, Tailwind CSS 4 (`@tailwindcss/vite`), Recharts 3, React Router 8 (`HashRouter`), date-fns 4, lucide-react, clsx, Vitest 5 + jsdom + Testing Library, Google Apps Script (V8), GitHub Actions + GitHub Pages.

**Spec:** `docs/superpowers/specs/2026-09-24-goksenin-takip-design.md`

## Global Constraints

- Net = doğru − yanlış / 4; boşlar etkisiz; net negatif olabilir.
- Net oranı = net / soru × 100; toplu oran = Σnet / Σsoru × 100 (kayıt oranlarının ortalaması DEĞİL).
- Net ve net oranı Sheet'te saklanmaz; her zaman D/Y/B'den hesaplanır.
- Kaynak sabit üç değer: `Deneme`, `Ödev`, `Kendi Çözdüğü`. Tek kayıt formu yalnızca `Ödev` / `Kendi Çözdüğü` kabul eder.
- Sınıf ∈ {7, 8}. Tarih `YYYY-MM-DD` (ISO) string; gelecekte olamaz.
- Doğrulama: soru ≥ 1 tam sayı; doğru, yanlış, boş ≥ 0 tam sayı; doğru + yanlış + boş = soru; deneme adı boş değil. Frontend (`src/lib/validation.ts`) ve Apps Script (`apps-script/Code.gs`) AYNI kurallar ve AYNI mesajlar.
- Hafta pazartesi başlar; ay takvim ayıdır. Tarih stringleri `date-fns/parseISO` ile ayrıştırılır — ASLA `new Date('YYYY-MM-DD')` kullanılmaz.
- İyileşme eşiği: net oranı değişimi (2 ondalığa yuvarlanmış) ≥ +2 → `up`, ≤ −2 → `down`, arası `flat`, önceki/şimdiki dönem verisi yoksa `none`.
- Konular sıralaması: varsayılan en az 10 soru eşiği (sayfada ayarlanabilir); konusu boş kayıtlar hariç.
- Oturum: "Beni hatırla" 30 gün, değilse 1 gün. Şifre: kullanıcı başı salt + SHA-256.
- Tüm kullanıcılar aynı yetkide. Arayüz dili Türkçe; `<html lang="tr">`.
- Apps Script dosyalarında üst düzey tanımlar yalnızca `var` ve `function` (testler dosyaları Node `vm` ile yükler; `const`/`let` görünmez).
- Seed verisi (dersler + MEB konuları) TEK kaynaktan gelir: `apps-script/Seed.gs`. Frontend onu `?raw` ile içe aktarır.
- Koyu/açık tema; masaüstünde sol menü, telefonda alt sekme çubuğu; her derse sabit renk.

## Review Focus

1. **Tarih kayması:** Sheets `2026-09-24` stringini Date nesnesine çevirir; saat dilimi farkıyla bir gün kayabilir. Beklenen: tarih her yerde birebir aynı kalır. → Task 4 (TZ=America/Los_Angeles altında dönem testleri) ve Task 8 (`normalizeCell_` script saat dilimini kullanır) testleri.
2. **Yapılandırmasız üretim derlemesi:** `VITE_API_URL` tanımlanmadan yayınlanan site sessizce mock (sahte, tarayıcıya yazan) backend ile çalışır ve aile verisi kaybolur. Beklenen: açık bir "yapılandırılmamış" hata ekranı. → Task 9 `resolveApiConfig` testleri.
3. **Çift tıklama / ağ hatası:** Kaydet'e iki kez basılınca iki kayıt oluşur ya da ağ hatasında girilen sayılar kaybolur. Beklenen: tek istek, hata sonrası değerler formda, "Tekrar dene" çalışır. → Task 11 test.
4. **Form ortasında oturum sona ermesi:** Beklenen: giriş sayfasına yönlendirme + "oturum sona erdi" mesajı; yeniden girişten sonra yazılanlar formda. → Task 11 test.
5. **Türkçe Excel'de CSV:** Türkçe Excel `;` ayırıcı ve ondalık virgül bekler, BOM olmadan ğüşİ bozulur. Beklenen: dosya Excel'de doğru sütunlarla ve karakterlerle açılır. → Task 7 `toCsv` testleri.

---

## File Structure

```
package.json, tsconfig.json, vite.config.ts, index.html, .gitignore
src/
  main.tsx                    uygulamayı bağlar
  App.tsx                     router + yapılandırma hatası ekranı
  index.css                   Tailwind + tasarım token'ları (açık/koyu)
  vite-env.d.ts
  lib/                        SAF fonksiyonlar (React yok)
    types.ts                  alan tipleri
    net.ts                    net, oran, toplamlar, biçimlendirme
    validation.ts             doğrulama kuralları + mesajlar
    drafts.ts                 form taslağı → sayılar (otomatik boş, deneme satırları)
    periods.ts                hafta/ay dönemleri, etiketler
    analysis.ts               filtre, seri, özet, karşılaştırma, deneme özetleri
    ranking.ts                ders/konu/deneme sıralaması, gelişen/gerileyen
    catalog.ts                sınıfa göre ders/konu listeleri
    recent.ts                 son kayıtlar listesi
    csv.ts                    CSV dışa aktarma
    colors.ts                 ders renkleri
    download.ts               tarayıcıda dosya indirme
  api/
    api.ts                    ApiError, Transport, createApi, errorMessage
    http.ts                   Apps Script transport
    mock.ts                   yerel mock transport
    sample.ts                 mock için örnek veri
    seed.ts                   Seed.gs'yi ?raw ile yükler
    config.ts                 resolveApiConfig
    index.ts                  varsayılan api örneği
  state/
    AuthContext.tsx           oturum, login/logout/expire, RequireAuth
    DataContext.tsx           AppData önbelleği + mutasyonlar
    useDraft.ts               localStorage'a kalıcı form taslağı
    useAction.ts              busy/error sarmalayıcı
  components/
    ui.ts                     ortak class stringleri
    Card.tsx, Field.tsx, Segmented.tsx, StatCard.tsx, TrendBadge.tsx,
    EmptyState.tsx, PageHeader.tsx, IconButton.tsx, ChartTooltip.tsx,
    ThemeToggle.tsx, Layout.tsx, FilterBar.tsx, RankList.tsx,
    CountInputs.tsx, EditableName.tsx
  pages/
    LoginPage.tsx
    entry/EntryPage.tsx, entry/SingleForm.tsx, entry/ExamForm.tsx, entry/RecentList.tsx
    AnalysisPage.tsx
    RankingPage.tsx
    settings/SettingsPage.tsx, settings/SubjectsSection.tsx, settings/TopicsSection.tsx,
    settings/UsersSection.tsx, settings/ExportSection.tsx
apps-script/
  Code.gs                     backend
  Seed.gs                     dersler + MEB konuları (tek kaynak)
tests/
  setup.ts, fixtures/records.ts, fixtures/validationCases.ts, helpers/renderApp.tsx
  lib/*.test.ts, api/*.test.ts, appsScript/code.test.ts, pages/*.test.tsx
.github/workflows/deploy.yml
KURULUM.md, README.md
```

---

### Task 1: Proje iskeleti ve alan tipleri

**Files:**
- Create: `package.json`, `tsconfig.json`, `vite.config.ts`, `index.html`, `.gitignore`, `src/vite-env.d.ts`, `src/main.tsx`, `src/App.tsx` (geçici, Task 10'da değişir), `src/index.css` (geçici, Task 10'da değişir), `src/lib/types.ts`, `tests/setup.ts`
- Test: `tests/lib/types.test.ts`

**Interfaces:**
- Produces (`src/lib/types.ts`):
  - `type Grade = 7 | 8`
  - `type Source = 'Deneme' | 'Ödev' | 'Kendi Çözdüğü'`, `const SOURCES: readonly Source[]`
  - `type SingleSource = Exclude<Source, 'Deneme'>`, `const SINGLE_SOURCES: readonly SingleSource[]`
  - `interface Counts { soru: number; dogru: number; yanlis: number; bos: number }`
  - `interface RecordRow extends Counts { id; tarih; sinif: Grade; ders; kaynak: Source; konu; deneme_id; giren_kullanici; olusturma_zamani }` (stringler)
  - `interface Exam { deneme_id: string; ad: string; tarih: string; sinif: Grade }`
  - `interface Subject { ders: string; sinif: Grade; deneme_soru_sayisi: number; sira: number }`
  - `interface Topic { ders: string; sinif: Grade; konu: string }`
  - `interface UserInfo { kullanici_adi: string; ad: string }`
  - `interface AppData { kayitlar: RecordRow[]; denemeler: Exam[]; dersler: Subject[]; konular: Topic[]; kullanicilar: UserInfo[] }`
  - `interface RecordInput extends Counts { tarih; sinif: Grade; ders; kaynak: Source; konu }`
  - `interface ExamRowInput extends Counts { ders: string }`
  - `interface ExamInput { ad; tarih; sinif: Grade; satirlar: ExamRowInput[] }`
  - `interface ExamResult { exam: Exam; rows: RecordRow[] }`
  - `type FieldErrors = Record<string, string>`

- [ ] **Step 1: Bağımlılıkları kur**

```bash
cd /Users/hasankocaman/IdeaProjects/goksenin_takip
npm init -y >/dev/null
npm i react react-dom react-router recharts date-fns lucide-react clsx
npm i -D vite @vitejs/plugin-react typescript @types/react @types/react-dom @types/node tailwindcss @tailwindcss/vite vitest jsdom @testing-library/react @testing-library/dom @testing-library/jest-dom @testing-library/user-event
```

- [ ] **Step 2: `package.json` alanlarını düzenle**

`package.json` içinde `name`, `private`, `type`, `scripts` alanlarını şu hale getir (bağımlılık blokları npm'in yazdığı gibi kalır; `main`, `keywords`, `author`, `license`, `description` alanlarını sil):

```json
{
  "name": "goksenin-takip",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc --noEmit && vite build",
    "preview": "vite preview",
    "test": "vitest"
  }
}
```

- [ ] **Step 3: Yapılandırma dosyalarını yaz**

`tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "noEmit": true,
    "skipLibCheck": true,
    "isolatedModules": true,
    "resolveJsonModule": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "types": ["node"]
  },
  "include": ["src", "tests", "vite.config.ts"]
}
```

`vite.config.ts`:

```ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.{ts,tsx}'],
    // Tarih kayması hatalarını yakalamak için testler UTC-8'de koşar.
    env: { TZ: 'America/Los_Angeles' },
  },
});
```

`.gitignore`:

```
node_modules
dist
*.local
.DS_Store
```

`src/vite-env.d.ts`:

```ts
/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
}
interface ImportMeta {
  readonly env: ImportMetaEnv;
}
```

`tests/setup.ts`:

```ts
import '@testing-library/jest-dom/vitest';

class NoopResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver ??= NoopResizeObserver as unknown as typeof ResizeObserver;
window.scrollTo = () => {};
```

`index.html`:

```html
<!doctype html>
<html lang="tr">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
    <title>Göksenin Takip</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
      href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500;12..96,600;12..96,700&family=IBM+Plex+Sans:wght@400;500;600&display=swap"
      rel="stylesheet"
    />
    <script>
      (function () {
        var t;
        try { t = localStorage.getItem('goksenin-theme'); } catch (e) {}
        if (t !== 'light' && t !== 'dark') t = matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        document.documentElement.dataset.theme = t;
      })();
    </script>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

`src/index.css` (geçici):

```css
@import "tailwindcss";
```

`src/App.tsx` (geçici):

```tsx
export function App() {
  return <p>Göksenin Takip</p>;
}
```

`src/main.tsx`:

```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import { App } from './App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
```

- [ ] **Step 4: Başarısız testi yaz**

`tests/lib/types.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { SINGLE_SOURCES, SOURCES } from '../../src/lib/types';

describe('types', () => {
  it('kaynaklar sabit üç değerdir, tek kayıt Deneme içermez', () => {
    expect(SOURCES).toEqual(['Deneme', 'Ödev', 'Kendi Çözdüğü']);
    expect(SINGLE_SOURCES).toEqual(['Ödev', 'Kendi Çözdüğü']);
  });
  it('testler UTC-8 saat diliminde koşar', () => {
    expect(new Date(2026, 0, 1).getTimezoneOffset()).toBe(480);
  });
});
```

- [ ] **Step 5: Testi çalıştır, başarısız olduğunu gör**

Run: `npx vitest run tests/lib/types.test.ts`
Expected: FAIL — `Cannot find module '../../src/lib/types'` (veya `Failed to resolve import`).

- [ ] **Step 6: `src/lib/types.ts` yaz**

```ts
export type Grade = 7 | 8;
export type Source = 'Deneme' | 'Ödev' | 'Kendi Çözdüğü';
export type SingleSource = Exclude<Source, 'Deneme'>;

export const SOURCES: readonly Source[] = ['Deneme', 'Ödev', 'Kendi Çözdüğü'];
export const SINGLE_SOURCES: readonly SingleSource[] = ['Ödev', 'Kendi Çözdüğü'];

export interface Counts {
  soru: number;
  dogru: number;
  yanlis: number;
  bos: number;
}

export interface RecordRow extends Counts {
  id: string;
  tarih: string;
  sinif: Grade;
  ders: string;
  kaynak: Source;
  konu: string;
  deneme_id: string;
  giren_kullanici: string;
  olusturma_zamani: string;
}

export interface Exam {
  deneme_id: string;
  ad: string;
  tarih: string;
  sinif: Grade;
}

export interface Subject {
  ders: string;
  sinif: Grade;
  deneme_soru_sayisi: number;
  sira: number;
}

export interface Topic {
  ders: string;
  sinif: Grade;
  konu: string;
}

export interface UserInfo {
  kullanici_adi: string;
  ad: string;
}

export interface AppData {
  kayitlar: RecordRow[];
  denemeler: Exam[];
  dersler: Subject[];
  konular: Topic[];
  kullanicilar: UserInfo[];
}

export interface RecordInput extends Counts {
  tarih: string;
  sinif: Grade;
  ders: string;
  kaynak: Source;
  konu: string;
}

export interface ExamRowInput extends Counts {
  ders: string;
}

export interface ExamInput {
  ad: string;
  tarih: string;
  sinif: Grade;
  satirlar: ExamRowInput[];
}

export interface ExamResult {
  exam: Exam;
  rows: RecordRow[];
}

export type FieldErrors = Record<string, string>;
```

- [ ] **Step 7: Testleri ve derlemeyi çalıştır**

Run: `npx vitest run && npm run build`
Expected: 2 test PASS; build `dist/` üretir, TypeScript hatası yok.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "chore: Vite + React + Tailwind + Vitest iskeleti ve alan tipleri"
```

---

### Task 2: Net hesapları ve biçimlendirme

**Files:**
- Create: `src/lib/net.ts`
- Test: `tests/lib/net.test.ts`

**Interfaces:**
- Consumes: `Counts` (`src/lib/types.ts`)
- Produces (`src/lib/net.ts`):
  - `net(dogru: number, yanlis: number): number`
  - `netRate(netValue: number, soru: number): number | null`
  - `interface Totals { count: number; soru: number; dogru: number; yanlis: number; bos: number; net: number; oran: number | null }`
  - `totals(rows: readonly Counts[]): Totals`
  - `round2(x: number): number`
  - `formatNet(x: number): string` — `15,25`
  - `formatRate(x: number | null): string` — `%60,0` / `—`
  - `formatDelta(x: number | null): string` — `+40,0` / `-6,5` / `—`

- [ ] **Step 1: Başarısız testleri yaz**

`tests/lib/net.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { formatDelta, formatNet, formatRate, net, netRate, round2, totals } from '../../src/lib/net';

describe('net', () => {
  it('4 yanlış 1 doğruyu götürür: 25 soru, 5 boş, 4 yanlış → 15 net', () => {
    expect(net(16, 4)).toBe(15);
  });
  it('net negatif olabilir', () => {
    expect(net(1, 8)).toBe(-1);
  });
});

describe('netRate', () => {
  it('net / soru × 100', () => {
    expect(netRate(15, 25)).toBe(60);
  });
  it('soru 0 ise null', () => {
    expect(netRate(0, 0)).toBeNull();
  });
});

describe('totals', () => {
  it('toplu oran Σnet/Σsoru ile hesaplanır, kayıt oranlarının ortalaması değildir', () => {
    const t = totals([
      { soru: 10, dogru: 8, yanlis: 0, bos: 2 },
      { soru: 40, dogru: 20, yanlis: 0, bos: 20 },
    ]);
    expect(t).toEqual({ count: 2, soru: 50, dogru: 28, yanlis: 0, bos: 22, net: 28, oran: 56 });
  });
  it('boş liste: net 0, oran null', () => {
    expect(totals([])).toEqual({ count: 0, soru: 0, dogru: 0, yanlis: 0, bos: 0, net: 0, oran: null });
  });
});

describe('biçimlendirme', () => {
  it('round2', () => {
    expect(round2(1.9999999999999998)).toBe(2);
    expect(round2(15.254)).toBe(15.25);
  });
  it('formatNet Türkçe ondalık virgül kullanır', () => {
    expect(formatNet(15.25)).toBe('15,25');
    expect(formatNet(15)).toBe('15');
    expect(formatNet(-0.25)).toBe('-0,25');
  });
  it('formatRate', () => {
    expect(formatRate(60)).toBe('%60,0');
    expect(formatRate(null)).toBe('—');
  });
  it('formatDelta işaret gösterir', () => {
    expect(formatDelta(40)).toBe('+40,0');
    expect(formatDelta(-6.54)).toBe('-6,5');
    expect(formatDelta(0)).toBe('0,0');
    expect(formatDelta(null)).toBe('—');
  });
});
```

- [ ] **Step 2: Başarısız olduğunu doğrula**

Run: `npx vitest run tests/lib/net.test.ts`
Expected: FAIL — `src/lib/net` çözümlenemiyor.

- [ ] **Step 3: `src/lib/net.ts` yaz**

```ts
import type { Counts } from './types';

export function net(dogru: number, yanlis: number): number {
  return dogru - yanlis / 4;
}

export function netRate(netValue: number, soru: number): number | null {
  // Önce ×100: 7/10*100 = 70.00000000000001 olurdu, 700/10 = 70 tam çıkar.
  return soru > 0 ? (netValue * 100) / soru : null;
}

export interface Totals {
  count: number;
  soru: number;
  dogru: number;
  yanlis: number;
  bos: number;
  net: number;
  oran: number | null;
}

export function totals(rows: readonly Counts[]): Totals {
  let soru = 0;
  let dogru = 0;
  let yanlis = 0;
  let bos = 0;
  for (const r of rows) {
    soru += r.soru;
    dogru += r.dogru;
    yanlis += r.yanlis;
    bos += r.bos;
  }
  const n = net(dogru, yanlis);
  return { count: rows.length, soru, dogru, yanlis, bos, net: n, oran: netRate(n, soru) };
}

export function round2(x: number): number {
  return Math.round(x * 100) / 100;
}

const netFmt = new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 2 });
const oneFmt = new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

export function formatNet(x: number): string {
  return netFmt.format(round2(x));
}

export function formatRate(x: number | null): string {
  return x === null ? '—' : `%${oneFmt.format(x)}`;
}

export function formatDelta(x: number | null): string {
  if (x === null) return '—';
  const r = Math.round(x * 10) / 10;
  return `${r > 0 ? '+' : ''}${oneFmt.format(r)}`;
}
```

Not: `Intl` negatif sayıda `-` (U+002D) üretmezse (bazı ICU sürümleri U+2212 kullanabilir) test çıktısına bakıp `.replace('−', '-')` ekle.

- [ ] **Step 4: Testleri çalıştır**

Run: `npx vitest run tests/lib/net.test.ts`
Expected: PASS (tüm testler).

- [ ] **Step 5: Commit**

```bash
git add src/lib/net.ts tests/lib/net.test.ts
git commit -m "feat: net, net oranı ve Türkçe biçimlendirme"
```

---

### Task 3: Doğrulama kuralları ve form taslağı yardımcıları

**Files:**
- Create: `src/lib/validation.ts`, `src/lib/drafts.ts`, `tests/fixtures/validationCases.ts`
- Test: `tests/lib/validation.test.ts`, `tests/lib/drafts.test.ts`

**Interfaces:**
- Consumes: `Counts, RecordInput, ExamInput, ExamRowInput, Subject, Topic, FieldErrors, SINGLE_SOURCES` (`types.ts`)
- Produces (`src/lib/validation.ts`):
  - `const MSG` — tüm hata mesajları (Code.gs'deki `MSG` ile birebir aynı)
  - `isIsoDate(s: unknown): boolean`
  - `countErrors(c: Counts, prefix?: string): FieldErrors`
  - `validateRecord(r: RecordInput, today: string): FieldErrors`
  - `validateExam(e: ExamInput, today: string): FieldErrors` — satır anahtarları `satirlar.<i>.<alan>`
  - `validateSubjects(list: Subject[]): FieldErrors` — `dersler.<i>.<alan>`
  - `validateTopics(list: Topic[]): FieldErrors` — `konular.<i>.<alan>`
  - Toplam hatası anahtarı: `toplam` (tek kayıt) / `satirlar.<i>.toplam`
- Produces (`src/lib/drafts.ts`):
  - `interface CountDraft { soru: string; dogru: string; yanlis: string; bos: string; bosManual: boolean }`
  - `interface ExamRowDraft extends CountDraft { ders: string }`
  - `const EMPTY_COUNTS: CountDraft`
  - `parseCount(s: string, empty?: number): number`
  - `autoBlank(soru: string, dogru: string, yanlis: string): string`
  - `draftCounts(d: CountDraft): Counts`
  - `isRowEmpty(d: { dogru: string; yanlis: string }): boolean`
  - `examRowsFromDrafts(drafts: ExamRowDraft[]): { rows: ExamRowInput[]; index: number[] }`
  - `remapRowErrors(errs: FieldErrors, index: number[]): FieldErrors`
- Produces (`tests/fixtures/validationCases.ts`): `TODAY`, `recordCases`, `examCases`, `subjectCases`, `topicCases` — Task 8 de kullanır.

- [ ] **Step 1: Ortak test vakalarını yaz**

`tests/fixtures/validationCases.ts`:

```ts
import type { ExamInput, RecordInput, Subject, Topic } from '../../src/lib/types';

export const TODAY = '2026-09-24';

const rec: RecordInput = {
  tarih: '2026-09-20', sinif: 8, ders: 'Matematik', kaynak: 'Ödev', konu: 'Kümeler',
  soru: 25, dogru: 16, yanlis: 4, bos: 5,
};

export const recordCases: { name: string; input: RecordInput; keys: string[] }[] = [
  { name: 'geçerli', input: rec, keys: [] },
  { name: 'bugün geçerli', input: { ...rec, tarih: TODAY }, keys: [] },
  { name: 'konu boş olabilir', input: { ...rec, konu: '' }, keys: [] },
  { name: 'kendi çözdüğü geçerli', input: { ...rec, kaynak: 'Kendi Çözdüğü' }, keys: [] },
  { name: 'gelecek tarih', input: { ...rec, tarih: '2026-09-25' }, keys: ['tarih'] },
  { name: 'olmayan gün', input: { ...rec, tarih: '2026-02-30' }, keys: ['tarih'] },
  { name: 'bozuk tarih', input: { ...rec, tarih: '24.09.2026' }, keys: ['tarih'] },
  { name: 'sınıf 6', input: { ...rec, sinif: 6 as never }, keys: ['sinif'] },
  { name: 'tek kayıtta Deneme kaynağı yok', input: { ...rec, kaynak: 'Deneme' }, keys: ['kaynak'] },
  { name: 'ders boş', input: { ...rec, ders: '  ' }, keys: ['ders'] },
  { name: 'soru 0', input: { ...rec, soru: 0, dogru: 0, yanlis: 0, bos: 0 }, keys: ['soru'] },
  { name: 'negatif yanlış', input: { ...rec, yanlis: -1 }, keys: ['yanlis'] },
  { name: 'ondalık doğru', input: { ...rec, dogru: 15.5 }, keys: ['dogru'] },
  { name: 'NaN boş', input: { ...rec, bos: Number.NaN }, keys: ['bos'] },
  { name: 'toplam tutmuyor', input: { ...rec, bos: 4 }, keys: ['toplam'] },
];

const exam: ExamInput = {
  ad: 'Özdebir 3', tarih: '2026-09-20', sinif: 8,
  satirlar: [
    { ders: 'Türkçe', soru: 20, dogru: 15, yanlis: 3, bos: 2 },
    { ders: 'Matematik', soru: 20, dogru: 12, yanlis: 4, bos: 4 },
  ],
};

export const examCases: { name: string; input: ExamInput; keys: string[] }[] = [
  { name: 'geçerli', input: exam, keys: [] },
  { name: 'ad boş', input: { ...exam, ad: ' ' }, keys: ['ad'] },
  { name: 'gelecek tarih', input: { ...exam, tarih: '2026-10-01' }, keys: ['tarih'] },
  { name: 'satır yok', input: { ...exam, satirlar: [] }, keys: ['satirlar'] },
  {
    name: 'ikinci satır toplamı tutmuyor',
    input: { ...exam, satirlar: [exam.satirlar[0], { ...exam.satirlar[1], bos: 3 }] },
    keys: ['satirlar.1.toplam'],
  },
  {
    name: 'satır dersi boş',
    input: { ...exam, satirlar: [{ ...exam.satirlar[0], ders: '' }] },
    keys: ['satirlar.0.ders'],
  },
];

const sub = (ders: string, sinif: 7 | 8, sira: number): Subject => ({ ders, sinif, deneme_soru_sayisi: 20, sira });

export const subjectCases: { name: string; input: Subject[]; keys: string[] }[] = [
  { name: 'geçerli', input: [sub('Matematik', 8, 1), sub('Matematik', 7, 1)], keys: [] },
  { name: 'aynı sınıfta tekrar (büyük/küçük harf)', input: [sub('Matematik', 8, 1), sub('matematik', 8, 2)], keys: ['dersler.1.ders'] },
  { name: 'boş ad', input: [sub(' ', 8, 1)], keys: ['dersler.0.ders'] },
  { name: 'negatif soru sayısı', input: [{ ...sub('Fen', 8, 1), deneme_soru_sayisi: -1 }], keys: ['dersler.0.deneme_soru_sayisi'] },
];

const top = (konu: string, ders = 'Matematik', sinif: 7 | 8 = 8): Topic => ({ ders, sinif, konu });

export const topicCases: { name: string; input: Topic[]; keys: string[] }[] = [
  { name: 'geçerli', input: [top('Kümeler'), top('Kümeler', 'Fen Bilimleri'), top('Kümeler', 'Matematik', 7)], keys: [] },
  { name: 'aynı ders+sınıfta tekrar', input: [top('Kümeler'), top('kümeler')], keys: ['konular.1.konu'] },
  { name: 'boş konu', input: [top('')], keys: ['konular.0.konu'] },
];
```

- [ ] **Step 2: Başarısız doğrulama testlerini yaz**

`tests/lib/validation.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import {
  MSG, countErrors, isIsoDate, validateExam, validateRecord, validateSubjects, validateTopics,
} from '../../src/lib/validation';
import { TODAY, examCases, recordCases, subjectCases, topicCases } from '../fixtures/validationCases';

const keys = (e: Record<string, string>) => Object.keys(e).sort();

describe('validateRecord', () => {
  it.each(recordCases)('$name', ({ input, keys: expected }) => {
    expect(keys(validateRecord(input, TODAY))).toEqual([...expected].sort());
  });
  it('mesajlar Türkçe ve sabit', () => {
    expect(validateRecord({ ...recordCases[0].input, bos: 4 }, TODAY)).toEqual({ toplam: MSG.toplam });
  });
});

describe('validateExam', () => {
  it.each(examCases)('$name', ({ input, keys: expected }) => {
    expect(keys(validateExam(input, TODAY))).toEqual([...expected].sort());
  });
});

describe('validateSubjects / validateTopics', () => {
  it.each(subjectCases)('dersler: $name', ({ input, keys: expected }) => {
    expect(keys(validateSubjects(input))).toEqual([...expected].sort());
  });
  it.each(topicCases)('konular: $name', ({ input, keys: expected }) => {
    expect(keys(validateTopics(input))).toEqual([...expected].sort());
  });
});

describe('yardımcılar', () => {
  it('isIsoDate', () => {
    expect(isIsoDate('2028-02-29')).toBe(true);
    expect(isIsoDate('2027-02-29')).toBe(false);
    expect(isIsoDate(20260924)).toBe(false);
  });
  it('countErrors önek kullanır ve toplamı yalnızca alanlar geçerliyse kontrol eder', () => {
    expect(countErrors({ soru: 10, dogru: -1, yanlis: 0, bos: 0 }, 'satirlar.2.')).toEqual({ 'satirlar.2.dogru': MSG.sayi });
    expect(countErrors({ soru: 10, dogru: 5, yanlis: 0, bos: 0 })).toEqual({ toplam: MSG.toplam });
  });
});
```

- [ ] **Step 3: Başarısız taslak testlerini yaz**

`tests/lib/drafts.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import {
  EMPTY_COUNTS, autoBlank, draftCounts, examRowsFromDrafts, isRowEmpty, parseCount, remapRowErrors,
  type ExamRowDraft,
} from '../../src/lib/drafts';

describe('autoBlank', () => {
  it('boş = soru − doğru − yanlış', () => {
    expect(autoBlank('25', '16', '4')).toBe('5');
  });
  it('doğru/yanlış boşsa 0 sayılır', () => {
    expect(autoBlank('10', '', '')).toBe('10');
  });
  it('soru girilmemişse boş döner', () => {
    expect(autoBlank('', '1', '1')).toBe('');
  });
  it('doğru+yanlış soruyu aşarsa 0 (toplam hatası doğrulamada çıkar)', () => {
    expect(autoBlank('10', '8', '5')).toBe('0');
  });
});

describe('draftCounts', () => {
  it('otomatik boş kullanır', () => {
    expect(draftCounts({ ...EMPTY_COUNTS, soru: '25', dogru: '16', yanlis: '4' })).toEqual({ soru: 25, dogru: 16, yanlis: 4, bos: 5 });
  });
  it('elle girilen boşu kullanır', () => {
    expect(draftCounts({ soru: '25', dogru: '16', yanlis: '4', bos: '4', bosManual: true }).bos).toBe(4);
  });
  it('soru boşsa NaN', () => {
    expect(parseCount('')).toBeNaN();
    expect(draftCounts(EMPTY_COUNTS).soru).toBeNaN();
  });
});

describe('deneme satırları', () => {
  const row = (ders: string, dogru: string, yanlis: string): ExamRowDraft => ({ ders, soru: '20', dogru, yanlis, bos: '', bosManual: false });

  it('D ve Y boş satırlar atlanır, indeksler korunur', () => {
    const drafts = [row('Türkçe', '15', '4'), row('Matematik', '', ''), row('Fen Bilimleri', '10', '')];
    expect(isRowEmpty(drafts[1])).toBe(true);
    expect(examRowsFromDrafts(drafts)).toEqual({
      rows: [
        { ders: 'Türkçe', soru: 20, dogru: 15, yanlis: 4, bos: 1 },
        { ders: 'Fen Bilimleri', soru: 20, dogru: 10, yanlis: 0, bos: 10 },
      ],
      index: [0, 2],
    });
  });
  it('remapRowErrors satır hatalarını taslak indeksine taşır', () => {
    expect(remapRowErrors({ 'satirlar.1.toplam': 'x', ad: 'y' }, [0, 2])).toEqual({ 'satirlar.2.toplam': 'x', ad: 'y' });
  });
});
```

- [ ] **Step 4: Başarısız olduğunu doğrula**

Run: `npx vitest run tests/lib/validation.test.ts tests/lib/drafts.test.ts`
Expected: FAIL — modüller çözümlenemiyor.

- [ ] **Step 5: `src/lib/validation.ts` yaz**

```ts
import { SINGLE_SOURCES, type Counts, type ExamInput, type FieldErrors, type RecordInput, type Subject, type Topic } from './types';

// apps-script/Code.gs içindeki MSG ile birebir aynı olmalı (tests/appsScript/code.test.ts kontrol eder).
export const MSG = {
  tarihGecersiz: 'Geçerli bir tarih girin.',
  tarihGelecek: 'Tarih bugünden sonra olamaz.',
  sinif: 'Sınıf 7 veya 8 olmalı.',
  kaynak: 'Geçerli bir kaynak seçin.',
  ders: 'Ders seçin.',
  konu: 'Konu adı boş olamaz.',
  soru: 'Soru sayısı en az 1 olmalı.',
  sayi: '0 veya daha büyük bir tam sayı girin.',
  toplam: 'Doğru + yanlış + boş, soru sayısına eşit olmalı.',
  ad: 'Deneme adı boş olamaz.',
  satirYok: 'En az bir ders satırı doldurun.',
  tekrar: 'Bu ad zaten var.',
  kullaniciAdi: 'Kullanıcı adı 3-30 karakter olmalı; yalnızca a-z, 0-9, nokta, tire ve alt çizgi.',
  adSoyad: 'Ad boş olamaz.',
  sifre: 'Şifre en az 6 karakter olmalı.',
  eskiSifre: 'Mevcut şifre hatalı.',
} as const;

export function isIsoDate(s: unknown): boolean {
  if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const [y, m, d] = s.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

function isCount(x: unknown, min: number): boolean {
  return typeof x === 'number' && Number.isInteger(x) && x >= min;
}

function isBlank(s: unknown): boolean {
  return typeof s !== 'string' || s.trim() === '';
}

function checkDate(tarih: unknown, today: string, errs: FieldErrors): void {
  if (!isIsoDate(tarih)) errs.tarih = MSG.tarihGecersiz;
  else if ((tarih as string) > today) errs.tarih = MSG.tarihGelecek;
}

function checkGrade(sinif: unknown, key: string, errs: FieldErrors): void {
  if (sinif !== 7 && sinif !== 8) errs[key] = MSG.sinif;
}

export function countErrors(c: Counts, prefix = ''): FieldErrors {
  const errs: FieldErrors = {};
  if (!isCount(c.soru, 1)) errs[`${prefix}soru`] = MSG.soru;
  for (const k of ['dogru', 'yanlis', 'bos'] as const) {
    if (!isCount(c[k], 0)) errs[`${prefix}${k}`] = MSG.sayi;
  }
  if (Object.keys(errs).length === 0 && c.dogru + c.yanlis + c.bos !== c.soru) {
    errs[`${prefix}toplam`] = MSG.toplam;
  }
  return errs;
}

export function validateRecord(r: RecordInput, today: string): FieldErrors {
  const errs: FieldErrors = {};
  checkDate(r.tarih, today, errs);
  checkGrade(r.sinif, 'sinif', errs);
  if (!(SINGLE_SOURCES as readonly string[]).includes(r.kaynak)) errs.kaynak = MSG.kaynak;
  if (isBlank(r.ders)) errs.ders = MSG.ders;
  Object.assign(errs, countErrors(r));
  return errs;
}

export function validateExam(e: ExamInput, today: string): FieldErrors {
  const errs: FieldErrors = {};
  if (isBlank(e.ad)) errs.ad = MSG.ad;
  checkDate(e.tarih, today, errs);
  checkGrade(e.sinif, 'sinif', errs);
  if (!Array.isArray(e.satirlar) || e.satirlar.length === 0) {
    errs.satirlar = MSG.satirYok;
  } else {
    e.satirlar.forEach((s, i) => {
      const p = `satirlar.${i}.`;
      if (isBlank(s.ders)) errs[`${p}ders`] = MSG.ders;
      Object.assign(errs, countErrors(s, p));
    });
  }
  return errs;
}

const lower = (s: string) => s.trim().toLocaleLowerCase('tr');

export function validateSubjects(list: Subject[]): FieldErrors {
  const errs: FieldErrors = {};
  const seen = new Set<string>();
  list.forEach((s, i) => {
    const p = `dersler.${i}.`;
    if (isBlank(s.ders)) {
      errs[`${p}ders`] = MSG.ders;
    } else {
      const key = `${s.sinif}|${lower(s.ders)}`;
      if (seen.has(key)) errs[`${p}ders`] = MSG.tekrar;
      seen.add(key);
    }
    checkGrade(s.sinif, `${p}sinif`, errs);
    if (!isCount(s.deneme_soru_sayisi, 0)) errs[`${p}deneme_soru_sayisi`] = MSG.sayi;
    if (!isCount(s.sira, 0)) errs[`${p}sira`] = MSG.sayi;
  });
  return errs;
}

export function validateTopics(list: Topic[]): FieldErrors {
  const errs: FieldErrors = {};
  const seen = new Set<string>();
  list.forEach((t, i) => {
    const p = `konular.${i}.`;
    if (isBlank(t.ders)) errs[`${p}ders`] = MSG.ders;
    checkGrade(t.sinif, `${p}sinif`, errs);
    if (isBlank(t.konu)) {
      errs[`${p}konu`] = MSG.konu;
    } else {
      const key = `${t.sinif}|${isBlank(t.ders) ? '' : lower(t.ders)}|${lower(t.konu)}`;
      if (seen.has(key)) errs[`${p}konu`] = MSG.tekrar;
      seen.add(key);
    }
  });
  return errs;
}
```

- [ ] **Step 6: `src/lib/drafts.ts` yaz**

```ts
import type { Counts, ExamRowInput, FieldErrors } from './types';

export interface CountDraft {
  soru: string;
  dogru: string;
  yanlis: string;
  bos: string;
  bosManual: boolean;
}

export interface ExamRowDraft extends CountDraft {
  ders: string;
}

export const EMPTY_COUNTS: CountDraft = { soru: '', dogru: '', yanlis: '', bos: '', bosManual: false };

export function parseCount(s: string, empty = Number.NaN): number {
  const t = s.trim();
  return t === '' ? empty : Number(t);
}

export function autoBlank(soru: string, dogru: string, yanlis: string): string {
  const b = parseCount(soru) - parseCount(dogru, 0) - parseCount(yanlis, 0);
  return Number.isFinite(b) ? String(Math.max(0, b)) : '';
}

export function draftCounts(d: CountDraft): Counts {
  const bos = d.bosManual ? d.bos : autoBlank(d.soru, d.dogru, d.yanlis);
  return {
    soru: parseCount(d.soru),
    dogru: parseCount(d.dogru, 0),
    yanlis: parseCount(d.yanlis, 0),
    bos: parseCount(bos),
  };
}

export function isRowEmpty(d: { dogru: string; yanlis: string }): boolean {
  return d.dogru.trim() === '' && d.yanlis.trim() === '';
}

export function examRowsFromDrafts(drafts: ExamRowDraft[]): { rows: ExamRowInput[]; index: number[] } {
  const rows: ExamRowInput[] = [];
  const index: number[] = [];
  drafts.forEach((d, i) => {
    if (isRowEmpty(d)) return;
    rows.push({ ders: d.ders, ...draftCounts(d) });
    index.push(i);
  });
  return { rows, index };
}

export function remapRowErrors(errs: FieldErrors, index: number[]): FieldErrors {
  const out: FieldErrors = {};
  for (const [k, v] of Object.entries(errs)) {
    const m = /^satirlar\.(\d+)\.(.+)$/.exec(k);
    out[m ? `satirlar.${index[Number(m[1])]}.${m[2]}` : k] = v;
  }
  return out;
}
```

- [ ] **Step 7: Testleri çalıştır**

Run: `npx vitest run tests/lib/validation.test.ts tests/lib/drafts.test.ts`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add src/lib/validation.ts src/lib/drafts.ts tests/fixtures/validationCases.ts tests/lib/validation.test.ts tests/lib/drafts.test.ts
git commit -m "feat: doğrulama kuralları ve form taslağı yardımcıları"
```

---

### Task 4: Haftalık/aylık dönemler

**Files:**
- Create: `src/lib/periods.ts`
- Test: `tests/lib/periods.test.ts`

**Interfaces:**
- Produces (`src/lib/periods.ts`):
  - `type PeriodType = 'week' | 'month'`
  - `todayIso(): string`
  - `periodStart(date: string, type: PeriodType): string` — pazartesi veya ayın 1'i
  - `shiftPeriod(start: string, type: PeriodType, n: number): string`
  - `dayBefore(date: string): string`
  - `periodsBetween(from: string, to: string, type: PeriodType): string[]` — dönem başlangıçları, kapsayıcı
  - `periodLabel(start: string, type: PeriodType): string` — `21 Eyl` / `Eyl 2026`
  - `defaultRange(today: string, type: PeriodType): { from: string; to: string }` — son 12 dönem
  - `formatDateTr(date: string): string` — `24 Eyl 2026`

- [ ] **Step 1: Başarısız testleri yaz**

`tests/lib/periods.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import {
  dayBefore, defaultRange, formatDateTr, periodLabel, periodStart, periodsBetween, shiftPeriod,
} from '../../src/lib/periods';

describe('periodStart (UTC-8 altında da gün kaymaz)', () => {
  it('hafta pazartesi başlar', () => {
    expect(periodStart('2026-09-24', 'week')).toBe('2026-09-21'); // perşembe
    expect(periodStart('2026-09-27', 'week')).toBe('2026-09-21'); // pazar
    expect(periodStart('2026-09-28', 'week')).toBe('2026-09-28'); // pazartesi
  });
  it('yıl sınırını aşan hafta', () => {
    expect(periodStart('2027-01-01', 'week')).toBe('2026-12-28');
  });
  it('ay', () => {
    expect(periodStart('2026-12-15', 'month')).toBe('2026-12-01');
    expect(periodStart('2026-12-01', 'month')).toBe('2026-12-01');
  });
});

describe('kaydırma ve aralıklar', () => {
  it('shiftPeriod ay ve yıl sınırı', () => {
    expect(shiftPeriod('2026-12-01', 'month', 1)).toBe('2027-01-01');
    expect(shiftPeriod('2026-09-21', 'week', -1)).toBe('2026-09-14');
  });
  it('dayBefore', () => {
    expect(dayBefore('2026-03-01')).toBe('2026-02-28');
  });
  it('periodsBetween kapsayıcıdır', () => {
    expect(periodsBetween('2026-09-24', '2026-10-06', 'week')).toEqual(['2026-09-21', '2026-09-28', '2026-10-05']);
    expect(periodsBetween('2026-11-30', '2027-01-02', 'month')).toEqual(['2026-11-01', '2026-12-01', '2027-01-01']);
  });
  it('from > to ise boş', () => {
    expect(periodsBetween('2026-10-01', '2026-09-01', 'week')).toEqual([]);
  });
  it('defaultRange son 12 dönemi kapsar', () => {
    expect(defaultRange('2026-09-24', 'week')).toEqual({ from: '2026-07-06', to: '2026-09-24' });
    expect(defaultRange('2026-09-24', 'month')).toEqual({ from: '2025-10-01', to: '2026-09-24' });
    expect(periodsBetween('2026-07-06', '2026-09-24', 'week')).toHaveLength(12);
  });
});

describe('Türkçe etiketler', () => {
  it('hafta ve ay', () => {
    expect(periodLabel('2026-09-21', 'week')).toBe('21 Eyl');
    expect(periodLabel('2026-09-01', 'month')).toBe('Eyl 2026');
    expect(formatDateTr('2026-08-03')).toBe('3 Ağu 2026');
  });
});
```

- [ ] **Step 2: Başarısız olduğunu doğrula**

Run: `npx vitest run tests/lib/periods.test.ts`
Expected: FAIL — modül yok.

- [ ] **Step 3: `src/lib/periods.ts` yaz**

```ts
import { addMonths, addWeeks, format, parseISO, startOfISOWeek, startOfMonth, subDays } from 'date-fns';
import { tr } from 'date-fns/locale';

export type PeriodType = 'week' | 'month';

const ISO = 'yyyy-MM-dd';

// Tarih stringleri her zaman parseISO ile yerel gün olarak okunur; new Date('YYYY-MM-DD') UTC'dir ve gün kaydırır.
export function todayIso(): string {
  return format(new Date(), ISO);
}

export function periodStart(date: string, type: PeriodType): string {
  const d = parseISO(date);
  return format(type === 'week' ? startOfISOWeek(d) : startOfMonth(d), ISO);
}

export function shiftPeriod(start: string, type: PeriodType, n: number): string {
  const d = parseISO(start);
  return format(type === 'week' ? addWeeks(d, n) : addMonths(d, n), ISO);
}

export function dayBefore(date: string): string {
  return format(subDays(parseISO(date), 1), ISO);
}

export function periodsBetween(from: string, to: string, type: PeriodType): string[] {
  if (from > to) return [];
  const out: string[] = [];
  const last = periodStart(to, type);
  for (let cur = periodStart(from, type); cur <= last; cur = shiftPeriod(cur, type, 1)) out.push(cur);
  return out;
}

export function periodLabel(start: string, type: PeriodType): string {
  return format(parseISO(start), type === 'week' ? 'd MMM' : 'MMM yyyy', { locale: tr });
}

export function defaultRange(today: string, type: PeriodType): { from: string; to: string } {
  return { from: shiftPeriod(periodStart(today, type), type, -11), to: today };
}

export function formatDateTr(date: string): string {
  return format(parseISO(date), 'd MMM yyyy', { locale: tr });
}
```

- [ ] **Step 4: Testleri çalıştır**

Run: `npx vitest run tests/lib/periods.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/periods.ts tests/lib/periods.test.ts
git commit -m "feat: haftalık/aylık dönem hesapları"
```

---

### Task 5: Analiz hesapları

**Files:**
- Create: `src/lib/analysis.ts`, `tests/fixtures/records.ts`
- Test: `tests/lib/analysis.test.ts`

**Interfaces:**
- Consumes: `totals, Totals, round2` (net.ts); `periodStart, periodsBetween, shiftPeriod, dayBefore, periodLabel, PeriodType` (periods.ts); tipler.
- Produces (`src/lib/analysis.ts`):
  - `interface BaseFilters { sinif: Grade | 'all'; dersler: string[]; kaynak: Source | 'all' }` (`dersler` boş = tümü)
  - `interface DateRange { from: string; to: string }`
  - `filterRecords(rows: readonly RecordRow[], f: BaseFilters): RecordRow[]` — tarih filtresi YOK
  - `inRange(r: { tarih: string }, range: DateRange): boolean`
  - `type Trend = 'up' | 'down' | 'flat' | 'none'`, `const TREND_THRESHOLD = 2`
  - `trendOf(delta: number | null): Trend`, `deltaOf(prev: number | null, cur: number | null): number | null`
  - `interface PeriodPoint { start: string; label: string; net: number; oran: number | null; soru: number }`
  - `seriesByPeriod(rows: readonly RecordRow[], from: string, to: string, type: PeriodType): PeriodPoint[]` — boş dönemler dahil
  - `lastTwoPeriods(to: string, type: PeriodType): { cur: DateRange; prev: DateRange }`
  - `interface Summary { total: Totals; cur: Totals; prev: Totals; delta: number | null; trend: Trend }`
  - `summarize(base: readonly RecordRow[], range: DateRange, type: PeriodType): Summary`
  - `interface Comparison { key: string; prev: number | null; cur: number | null; delta: number | null; trend: Trend; prevSoru: number; curSoru: number }`
  - `compareByKey(base: readonly RecordRow[], to: string, type: PeriodType, keyFn: (r: RecordRow) => string): Comparison[]`
  - `interface ExamSummary { exam: Exam; byDers: { ders: string; net: number; soru: number }[]; net: number; soru: number; oran: number | null }`
  - `examSummaries(exams: readonly Exam[], rows: readonly RecordRow[], f: { sinif: Grade | 'all'; dersler: string[] } & DateRange): ExamSummary[]` — tarihe göre artan
- Produces (`tests/fixtures/records.ts`): `rec(partial?: Partial<RecordRow>): RecordRow`

- [ ] **Step 1: Test fixture'ını yaz**

`tests/fixtures/records.ts`:

```ts
import type { RecordRow } from '../../src/lib/types';

let seq = 0;

export function rec(p: Partial<RecordRow> = {}): RecordRow {
  seq += 1;
  return {
    id: `r${seq}`, tarih: '2026-09-24', sinif: 8, ders: 'Matematik', kaynak: 'Ödev', konu: '',
    soru: 10, dogru: 5, yanlis: 0, bos: 5, deneme_id: '', giren_kullanici: 'demo',
    olusturma_zamani: '2026-09-24T10:00:00.000Z', ...p,
  };
}
```

- [ ] **Step 2: Başarısız testleri yaz**

`tests/lib/analysis.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import {
  compareByKey, examSummaries, filterRecords, inRange, lastTwoPeriods, seriesByPeriod, summarize, trendOf,
} from '../../src/lib/analysis';
import type { Exam } from '../../src/lib/types';
import { rec } from '../fixtures/records';

const all = { sinif: 'all', dersler: [], kaynak: 'all' } as const;

describe('filterRecords', () => {
  const rows = [
    rec({ sinif: 7, ders: 'Matematik', kaynak: 'Ödev' }),
    rec({ sinif: 8, ders: 'Fen Bilimleri', kaynak: 'Kendi Çözdüğü' }),
    rec({ sinif: 8, ders: 'Matematik', kaynak: 'Deneme' }),
  ];
  it('boş ders listesi tüm dersler demektir', () => {
    expect(filterRecords(rows, { ...all })).toHaveLength(3);
  });
  it('sınıf, ders ve kaynak birlikte uygulanır', () => {
    expect(filterRecords(rows, { sinif: 8, dersler: ['Matematik'], kaynak: 'Deneme' })).toEqual([rows[2]]);
  });
  it('inRange kapsayıcıdır', () => {
    expect(inRange({ tarih: '2026-09-01' }, { from: '2026-09-01', to: '2026-09-30' })).toBe(true);
    expect(inRange({ tarih: '2026-10-01' }, { from: '2026-09-01', to: '2026-09-30' })).toBe(false);
  });
});

describe('trendOf', () => {
  it('±2 eşiği', () => {
    expect(trendOf(2)).toBe('up');
    expect(trendOf(1.99)).toBe('flat');
    expect(trendOf(-2)).toBe('down');
    expect(trendOf(null)).toBe('none');
  });
  it('kayan nokta hatası eşiği bozmaz', () => {
    expect(trendOf((0.3 - 0.1) * 10)).toBe('up'); // 1.9999999999999998
  });
});

describe('seriesByPeriod', () => {
  it('boş dönemleri de içerir', () => {
    const rows = [rec({ tarih: '2026-09-14', dogru: 8, bos: 2 }), rec({ tarih: '2026-09-24', dogru: 4, yanlis: 4, bos: 2 })];
    expect(seriesByPeriod(rows, '2026-09-07', '2026-09-24', 'week')).toEqual([
      { start: '2026-09-07', label: '7 Eyl', net: 0, oran: null, soru: 0 },
      { start: '2026-09-14', label: '14 Eyl', net: 8, oran: 80, soru: 10 },
      { start: '2026-09-21', label: '21 Eyl', net: 3, oran: 30, soru: 10 },
    ]);
  });
});

describe('summarize / compareByKey', () => {
  const rows = [
    rec({ tarih: '2026-09-22', ders: 'Matematik', dogru: 9, bos: 1 }), // bu hafta %90
    rec({ tarih: '2026-09-15', ders: 'Matematik', dogru: 5, bos: 5 }), // geçen hafta %50
    rec({ tarih: '2026-09-16', ders: 'Fen Bilimleri', dogru: 7, bos: 3 }), // yalnız geçen hafta
    rec({ tarih: '2026-08-01', ders: 'Matematik', dogru: 10, bos: 0 }), // aralık dışı
  ];

  it('lastTwoPeriods', () => {
    expect(lastTwoPeriods('2026-09-24', 'week')).toEqual({
      cur: { from: '2026-09-21', to: '2026-09-24' },
      prev: { from: '2026-09-14', to: '2026-09-20' },
    });
  });

  it('bu dönemi önceki dönemle net oranı üzerinden karşılaştırır', () => {
    const s = summarize(rows, { from: '2026-09-01', to: '2026-09-24' }, 'week');
    expect(s.total.soru).toBe(30);
    expect(s.cur.oran).toBe(90);
    expect(s.prev.oran).toBe(60); // (5+7)/20
    expect(s.delta).toBe(30);
    expect(s.trend).toBe('up');
  });

  it('ders bazında karşılaştırma; bir dönemde verisi olmayan ders none', () => {
    expect(compareByKey(rows, '2026-09-24', 'week', (r) => r.ders)).toEqual([
      { key: 'Fen Bilimleri', prev: 70, cur: null, delta: null, trend: 'none', prevSoru: 10, curSoru: 0 },
      { key: 'Matematik', prev: 50, cur: 90, delta: 40, trend: 'up', prevSoru: 10, curSoru: 10 },
    ]);
  });
});

describe('examSummaries', () => {
  const exams: Exam[] = [
    { deneme_id: 'd1', ad: 'Deneme 1', tarih: '2026-09-10', sinif: 8 },
    { deneme_id: 'd2', ad: 'Deneme 2', tarih: '2026-09-20', sinif: 8 },
    { deneme_id: 'd0', ad: 'Eski', tarih: '2026-06-01', sinif: 8 },
  ];
  const rows = [
    rec({ deneme_id: 'd2', kaynak: 'Deneme', tarih: '2026-09-20', ders: 'Türkçe', soru: 20, dogru: 16, yanlis: 4, bos: 0 }),
    rec({ deneme_id: 'd2', kaynak: 'Deneme', tarih: '2026-09-20', ders: 'Matematik', soru: 20, dogru: 10, yanlis: 0, bos: 10 }),
    rec({ deneme_id: 'd1', kaynak: 'Deneme', tarih: '2026-09-10', ders: 'Matematik', soru: 20, dogru: 8, yanlis: 0, bos: 12 }),
    rec({ deneme_id: 'd0', kaynak: 'Deneme', tarih: '2026-06-01', ders: 'Matematik', soru: 20, dogru: 5, yanlis: 0, bos: 15 }),
  ];

  it('toplam deneme netini ders kırılımıyla, tarihe göre artan verir', () => {
    const s = examSummaries(exams, rows, { sinif: 'all', dersler: [], from: '2026-09-01', to: '2026-09-24' });
    expect(s.map((x) => x.exam.ad)).toEqual(['Deneme 1', 'Deneme 2']);
    expect(s[1].net).toBe(25);
    expect(s[1].byDers).toEqual([
      { ders: 'Türkçe', net: 15, soru: 20 },
      { ders: 'Matematik', net: 10, soru: 20 },
    ]);
  });
  it('ders filtresi kırılımı ve toplamı daraltır', () => {
    const s = examSummaries(exams, rows, { sinif: 8, dersler: ['Türkçe'], from: '2026-09-01', to: '2026-09-24' });
    expect(s).toHaveLength(1);
    expect(s[0].net).toBe(15);
  });
});
```

- [ ] **Step 3: Başarısız olduğunu doğrula**

Run: `npx vitest run tests/lib/analysis.test.ts`
Expected: FAIL — modül yok.

- [ ] **Step 4: `src/lib/analysis.ts` yaz**

```ts
import { round2, totals, type Totals } from './net';
import { dayBefore, periodLabel, periodStart, periodsBetween, shiftPeriod, type PeriodType } from './periods';
import type { Exam, Grade, RecordRow, Source } from './types';

export interface BaseFilters {
  sinif: Grade | 'all';
  dersler: string[];
  kaynak: Source | 'all';
}

export interface DateRange {
  from: string;
  to: string;
}

export function filterRecords(rows: readonly RecordRow[], f: BaseFilters): RecordRow[] {
  return rows.filter(
    (r) =>
      (f.sinif === 'all' || r.sinif === f.sinif) &&
      (f.dersler.length === 0 || f.dersler.includes(r.ders)) &&
      (f.kaynak === 'all' || r.kaynak === f.kaynak),
  );
}

export function inRange(r: { tarih: string }, range: DateRange): boolean {
  return r.tarih >= range.from && r.tarih <= range.to;
}

export type Trend = 'up' | 'down' | 'flat' | 'none';
export const TREND_THRESHOLD = 2;

export function trendOf(delta: number | null): Trend {
  if (delta === null) return 'none';
  const d = round2(delta);
  if (d >= TREND_THRESHOLD) return 'up';
  if (d <= -TREND_THRESHOLD) return 'down';
  return 'flat';
}

export function deltaOf(prev: number | null, cur: number | null): number | null {
  return prev === null || cur === null ? null : cur - prev;
}

export interface PeriodPoint {
  start: string;
  label: string;
  net: number;
  oran: number | null;
  soru: number;
}

function groupBy<T>(items: readonly T[], key: (t: T) => string): Map<string, T[]> {
  const m = new Map<string, T[]>();
  for (const it of items) {
    const k = key(it);
    const list = m.get(k);
    if (list) list.push(it);
    else m.set(k, [it]);
  }
  return m;
}

export function seriesByPeriod(rows: readonly RecordRow[], from: string, to: string, type: PeriodType): PeriodPoint[] {
  const groups = groupBy(rows, (r) => periodStart(r.tarih, type));
  return periodsBetween(from, to, type).map((start) => {
    const t = totals(groups.get(start) ?? []);
    return { start, label: periodLabel(start, type), net: t.net, oran: t.oran, soru: t.soru };
  });
}

export function lastTwoPeriods(to: string, type: PeriodType): { cur: DateRange; prev: DateRange } {
  const curStart = periodStart(to, type);
  return {
    cur: { from: curStart, to },
    prev: { from: shiftPeriod(curStart, type, -1), to: dayBefore(curStart) },
  };
}

export interface Summary {
  total: Totals;
  cur: Totals;
  prev: Totals;
  delta: number | null;
  trend: Trend;
}

export function summarize(base: readonly RecordRow[], range: DateRange, type: PeriodType): Summary {
  const w = lastTwoPeriods(range.to, type);
  const cur = totals(base.filter((r) => inRange(r, w.cur)));
  const prev = totals(base.filter((r) => inRange(r, w.prev)));
  const delta = deltaOf(prev.oran, cur.oran);
  return { total: totals(base.filter((r) => inRange(r, range))), cur, prev, delta, trend: trendOf(delta) };
}

export interface Comparison {
  key: string;
  prev: number | null;
  cur: number | null;
  delta: number | null;
  trend: Trend;
  prevSoru: number;
  curSoru: number;
}

export function compareByKey(
  base: readonly RecordRow[],
  to: string,
  type: PeriodType,
  keyFn: (r: RecordRow) => string,
): Comparison[] {
  const w = lastTwoPeriods(to, type);
  const cur = groupBy(base.filter((r) => inRange(r, w.cur)), keyFn);
  const prev = groupBy(base.filter((r) => inRange(r, w.prev)), keyFn);
  const keys = [...new Set([...prev.keys(), ...cur.keys()])].sort((a, b) => a.localeCompare(b, 'tr'));
  return keys.map((key) => {
    const c = totals(cur.get(key) ?? []);
    const p = totals(prev.get(key) ?? []);
    const delta = deltaOf(p.oran, c.oran);
    return { key, prev: p.oran, cur: c.oran, delta, trend: trendOf(delta), prevSoru: p.soru, curSoru: c.soru };
  });
}

export interface ExamSummary {
  exam: Exam;
  byDers: { ders: string; net: number; soru: number }[];
  net: number;
  soru: number;
  oran: number | null;
}

export function examSummaries(
  exams: readonly Exam[],
  rows: readonly RecordRow[],
  f: { sinif: Grade | 'all'; dersler: string[] } & DateRange,
): ExamSummary[] {
  const byExam = groupBy(rows.filter((r) => r.deneme_id !== ''), (r) => r.deneme_id);
  const out: ExamSummary[] = [];
  for (const exam of exams) {
    if ((f.sinif !== 'all' && exam.sinif !== f.sinif) || !inRange(exam, f)) continue;
    const list = (byExam.get(exam.deneme_id) ?? []).filter((r) => f.dersler.length === 0 || f.dersler.includes(r.ders));
    if (list.length === 0) continue;
    const t = totals(list);
    out.push({
      exam,
      byDers: list.map((r) => ({ ders: r.ders, net: totals([r]).net, soru: r.soru })),
      net: t.net,
      soru: t.soru,
      oran: t.oran,
    });
  }
  return out.sort((a, b) => a.exam.tarih.localeCompare(b.exam.tarih) || a.exam.ad.localeCompare(b.exam.ad, 'tr'));
}
```

- [ ] **Step 5: Testleri çalıştır**

Run: `npx vitest run tests/lib/analysis.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/analysis.ts tests/fixtures/records.ts tests/lib/analysis.test.ts
git commit -m "feat: dönem serileri, özet, ders karşılaştırması ve deneme özetleri"
```

---

### Task 6: Sıralamalar

**Files:**
- Create: `src/lib/ranking.ts`
- Test: `tests/lib/ranking.test.ts`

**Interfaces:**
- Consumes: `totals, Totals` (net.ts); `lastTwoPeriods, inRange, deltaOf, ExamSummary` (analysis.ts); `PeriodType`.
- Produces (`src/lib/ranking.ts`):
  - `type Direction = 'best' | 'worst'`
  - `interface RankItem { key: string; label: string; detail: string; totals: Totals }`
  - `rankSubjects(rows: readonly RecordRow[], dir: Direction): RankItem[]` — ders adına göre birleştirir
  - `rankTopics(rows: readonly RecordRow[], dir: Direction, minSoru: number): RankItem[]` — anahtar `sinif|ders|konu`, label `konu`, detail `8. sınıf · Matematik`
  - `rankExams(list: readonly ExamSummary[], dir: Direction): ExamSummary[]`
  - `interface Mover { key: string; label: string; detail: string; prev: number; cur: number; delta: number }`
  - `movers(base: readonly RecordRow[], to: string, type: PeriodType, by: 'ders' | 'konu', dir: 'up' | 'down'): Mover[]`

- [ ] **Step 1: Başarısız testleri yaz**

`tests/lib/ranking.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import type { ExamSummary } from '../../src/lib/analysis';
import { movers, rankExams, rankSubjects, rankTopics } from '../../src/lib/ranking';
import { rec } from '../fixtures/records';

describe('rankSubjects', () => {
  const rows = [
    rec({ ders: 'Fen Bilimleri', dogru: 5, bos: 5 }), // %50
    rec({ ders: 'Matematik', dogru: 9, bos: 1 }), // %90
    rec({ ders: 'Türkçe', soru: 20, dogru: 10, bos: 10 }), // %50, daha çok soru
  ];
  it('en iyiden en kötüye; eşitlikte çok soru önce', () => {
    expect(rankSubjects(rows, 'best').map((r) => r.label)).toEqual(['Matematik', 'Türkçe', 'Fen Bilimleri']);
  });
  it('en kötüden en iyiye', () => {
    expect(rankSubjects(rows, 'worst').map((r) => r.label)).toEqual(['Türkçe', 'Fen Bilimleri', 'Matematik']);
  });
  it('sınıflar birleşir (ders adına göre)', () => {
    const r = rankSubjects([rec({ sinif: 7 }), rec({ sinif: 8 })], 'best');
    expect(r).toHaveLength(1);
    expect(r[0].totals.soru).toBe(20);
  });
});

describe('rankTopics', () => {
  const rows = [
    rec({ konu: 'Kümeler', soru: 12, dogru: 6, bos: 6 }),
    rec({ konu: 'Üslü İfadeler', soru: 5, dogru: 5, bos: 0 }),
    rec({ konu: '', soru: 30, dogru: 30, bos: 0 }),
    rec({ sinif: 7, konu: 'Veri Analizi', soru: 10, dogru: 9, bos: 1 }),
    rec({ sinif: 8, konu: 'Veri Analizi', soru: 10, dogru: 2, bos: 8 }),
  ];
  it('eşik altı ve konusuz kayıtlar hariç; aynı konu farklı sınıfta ayrı', () => {
    const r = rankTopics(rows, 'best', 10);
    expect(r.map((x) => `${x.label}|${x.detail}`)).toEqual([
      'Veri Analizi|7. sınıf · Matematik',
      'Kümeler|8. sınıf · Matematik',
      'Veri Analizi|8. sınıf · Matematik',
    ]);
  });
  it('eşik 0 ise tümü', () => {
    expect(rankTopics(rows, 'best', 0)).toHaveLength(4);
  });
});

describe('rankExams', () => {
  const mk = (ad: string, net: number): ExamSummary => ({
    exam: { deneme_id: ad, ad, tarih: '2026-09-01', sinif: 8 }, byDers: [], net, soru: 90, oran: (net / 90) * 100,
  });
  it('toplam nete göre', () => {
    const list = [mk('A', 40), mk('B', 60.5), mk('C', 20)];
    expect(rankExams(list, 'best').map((e) => e.exam.ad)).toEqual(['B', 'A', 'C']);
    expect(rankExams(list, 'worst').map((e) => e.exam.ad)).toEqual(['C', 'A', 'B']);
  });
});

describe('movers', () => {
  const rows = [
    rec({ tarih: '2026-09-22', ders: 'Matematik', dogru: 9, bos: 1 }),
    rec({ tarih: '2026-09-15', ders: 'Matematik', dogru: 5, bos: 5 }), // +40
    rec({ tarih: '2026-09-22', ders: 'Türkçe', dogru: 6, bos: 4 }),
    rec({ tarih: '2026-09-15', ders: 'Türkçe', dogru: 5, bos: 5 }), // +10
    rec({ tarih: '2026-09-22', ders: 'Fen Bilimleri', dogru: 2, bos: 8 }),
    rec({ tarih: '2026-09-15', ders: 'Fen Bilimleri', dogru: 8, bos: 2 }), // -60
    rec({ tarih: '2026-09-22', ders: 'İngilizce', dogru: 10, bos: 0 }), // yalnız bu hafta
  ];
  it('gelişenler azalan farkla, yalnız iki dönemde de verisi olanlar', () => {
    expect(movers(rows, '2026-09-24', 'week', 'ders', 'up').map((m) => [m.label, m.delta])).toEqual([
      ['Matematik', 40],
      ['Türkçe', 10],
    ]);
  });
  it('gerileyenler', () => {
    expect(movers(rows, '2026-09-24', 'week', 'ders', 'down').map((m) => [m.label, m.delta])).toEqual([['Fen Bilimleri', -60]]);
  });
  it('konu bazında konusuz kayıtlar hariç', () => {
    expect(movers(rows, '2026-09-24', 'week', 'konu', 'up')).toEqual([]);
  });
});
```

- [ ] **Step 2: Başarısız olduğunu doğrula**

Run: `npx vitest run tests/lib/ranking.test.ts`
Expected: FAIL — modül yok.

- [ ] **Step 3: `src/lib/ranking.ts` yaz**

```ts
import { deltaOf, inRange, lastTwoPeriods, type ExamSummary } from './analysis';
import { totals, type Totals } from './net';
import type { PeriodType } from './periods';
import type { RecordRow } from './types';

export type Direction = 'best' | 'worst';

export interface RankItem {
  key: string;
  label: string;
  detail: string;
  totals: Totals;
}

interface Keyed {
  key: string;
  label: string;
  detail: string;
}

function subjectKey(r: RecordRow): Keyed {
  return { key: r.ders, label: r.ders, detail: '' };
}

function topicKey(r: RecordRow): Keyed {
  return { key: `${r.sinif}|${r.ders}|${r.konu}`, label: r.konu, detail: `${r.sinif}. sınıf · ${r.ders}` };
}

function aggregate(rows: readonly RecordRow[], keyOf: (r: RecordRow) => Keyed): RankItem[] {
  const groups = new Map<string, { k: Keyed; rows: RecordRow[] }>();
  for (const r of rows) {
    const k = keyOf(r);
    const g = groups.get(k.key);
    if (g) g.rows.push(r);
    else groups.set(k.key, { k, rows: [r] });
  }
  return [...groups.values()].map(({ k, rows: list }) => {
    const t = totals(list);
    return { ...k, detail: k.detail || `${t.soru} soru`, totals: t };
  });
}

function sortItems(items: RankItem[], dir: Direction): RankItem[] {
  const sign = dir === 'best' ? -1 : 1;
  return items.sort((a, b) => {
    const ao = a.totals.oran;
    const bo = b.totals.oran;
    if (ao === null || bo === null) return ao === bo ? 0 : ao === null ? 1 : -1;
    return sign * (ao - bo) || b.totals.soru - a.totals.soru || a.label.localeCompare(b.label, 'tr');
  });
}

export function rankSubjects(rows: readonly RecordRow[], dir: Direction): RankItem[] {
  return sortItems(aggregate(rows, subjectKey), dir);
}

export function rankTopics(rows: readonly RecordRow[], dir: Direction, minSoru: number): RankItem[] {
  const items = aggregate(rows.filter((r) => r.konu.trim() !== ''), topicKey).filter((i) => i.totals.soru >= minSoru);
  return sortItems(items, dir);
}

export function rankExams(list: readonly ExamSummary[], dir: Direction): ExamSummary[] {
  const sign = dir === 'best' ? -1 : 1;
  return [...list].sort((a, b) => sign * (a.net - b.net) || b.exam.tarih.localeCompare(a.exam.tarih));
}

export interface Mover {
  key: string;
  label: string;
  detail: string;
  prev: number;
  cur: number;
  delta: number;
}

export function movers(
  base: readonly RecordRow[],
  to: string,
  type: PeriodType,
  by: 'ders' | 'konu',
  dir: 'up' | 'down',
): Mover[] {
  const w = lastTwoPeriods(to, type);
  const rows = by === 'konu' ? base.filter((r) => r.konu.trim() !== '') : base;
  const keyOf = by === 'ders' ? subjectKey : topicKey;
  const cur = new Map(aggregate(rows.filter((r) => inRange(r, w.cur)), keyOf).map((i) => [i.key, i]));
  const prev = new Map(aggregate(rows.filter((r) => inRange(r, w.prev)), keyOf).map((i) => [i.key, i]));
  const out: Mover[] = [];
  for (const [key, c] of cur) {
    const p = prev.get(key);
    const delta = p ? deltaOf(p.totals.oran, c.totals.oran) : null;
    if (!p || delta === null || p.totals.oran === null || c.totals.oran === null) continue;
    if ((dir === 'up' && delta > 0) || (dir === 'down' && delta < 0)) {
      out.push({ key, label: c.label, detail: by === 'ders' ? `${c.totals.soru} soru bu dönem` : c.detail, prev: p.totals.oran, cur: c.totals.oran, delta });
    }
  }
  return out.sort((a, b) => (dir === 'up' ? b.delta - a.delta : a.delta - b.delta));
}
```

- [ ] **Step 4: Testleri çalıştır**

Run: `npx vitest run tests/lib/ranking.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/ranking.ts tests/lib/ranking.test.ts
git commit -m "feat: ders, konu, deneme sıralamaları ve en çok gelişen/gerileyen"
```

---

### Task 7: CSV dışa aktarma, ders renkleri, katalog ve son kayıtlar

**Files:**
- Create: `src/lib/csv.ts`, `src/lib/colors.ts`, `src/lib/catalog.ts`, `src/lib/recent.ts`, `src/lib/download.ts`
- Test: `tests/lib/csv.test.ts`, `tests/lib/colors.test.ts`, `tests/lib/catalog.test.ts`, `tests/lib/recent.test.ts`

**Interfaces:**
- Produces:
  - `toCsv(rows: readonly RecordRow[], exams: readonly Exam[]): string` (csv.ts)
  - `subjectColor(ders: string): string` (colors.ts)
  - `subjectsFor(dersler: readonly Subject[], sinif: Grade): Subject[]`, `topicsFor(konular: readonly Topic[], sinif: Grade, ders: string): string[]`, `subjectNames(dersler: readonly Subject[], sinif: Grade | 'all'): string[]` (catalog.ts)
  - `type RecentItem = { kind: 'record'; key; tarih; created; row: RecordRow } | { kind: 'exam'; key; tarih; created; exam: Exam; rows: RecordRow[] }`, `recentItems(kayitlar, denemeler, limit?: number): RecentItem[]` (recent.ts)
  - `downloadText(filename: string, content: string, type: string): void` (download.ts)

Bu task'ta renkleri seçerken **dataviz** skill'ini yükle; aşağıdaki palet başlangıç değeridir, skill'in doğrulayıcısı açık (`#F6F3EC`) ve koyu (`#171A21`) yüzeylerde ayırt edilebilirlik için reddederse değerleri orada ayarla (testler yalnızca anahtar eşlemeyi ve determinizmi sabitler).

- [ ] **Step 1: Başarısız testleri yaz**

`tests/lib/csv.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { toCsv } from '../../src/lib/csv';
import { rec } from '../fixtures/records';

describe('toCsv (Türkçe Excel)', () => {
  const rows = [
    rec({ tarih: '2026-09-24', ders: 'Türkçe', konu: 'Sözcükte Anlam; Deyimler', soru: 25, dogru: 16, yanlis: 4, bos: 5 }),
    rec({ tarih: '2026-09-20', ders: 'Matematik', kaynak: 'Deneme', deneme_id: 'd1', soru: 1, dogru: 0, yanlis: 1, bos: 0 }),
    rec({ tarih: '2026-09-21', ders: 'İngilizce', konu: '=HYPERLINK("x")', soru: 10, dogru: 10, yanlis: 0, bos: 0 }),
  ];
  const csv = toCsv(rows, [{ deneme_id: 'd1', ad: 'Özdebir "3"', tarih: '2026-09-20', sinif: 8 }]);
  const lines = csv.slice(1).split('\r\n');

  it('UTF-8 BOM ile başlar ve ; ayırıcı kullanır', () => {
    expect(csv.charCodeAt(0)).toBe(0xfeff);
    expect(lines[0]).toBe('tarih;sinif;ders;kaynak;konu;deneme;soru;dogru;yanlis;bos;net;net_orani;giren_kullanici');
  });
  it('tarihe göre sıralı, ondalık virgül, negatif net, deneme adı kaçışlı', () => {
    expect(lines[1]).toBe('2026-09-20;8;Matematik;Deneme;;"Özdebir ""3""";1;0;1;0;-0,25;-25;demo');
  });
  it('formül enjeksiyonu önlenir', () => {
    expect(lines[2]).toBe(`2026-09-21;8;İngilizce;Ödev;"'=HYPERLINK(""x"")";;10;10;0;0;10;100;demo`);
  });
  it('; içeren metin tırnaklanır, net 15, oran 60', () => {
    expect(lines[3]).toBe('2026-09-24;8;Türkçe;Ödev;"Sözcükte Anlam; Deyimler";;25;16;4;5;15;60;demo');
  });
});
```

`tests/lib/colors.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { FALLBACK_COLORS, SUBJECT_COLORS, subjectColor } from '../../src/lib/colors';

describe('subjectColor', () => {
  it('bilinen dersler sabit renk alır', () => {
    expect(subjectColor('Matematik')).toBe(SUBJECT_COLORS.Matematik);
    expect(subjectColor('T.C. İnkılap Tarihi ve Atatürkçülük')).toBe(SUBJECT_COLORS['Sosyal Bilgiler']);
  });
  it('yeni dersler yedek paletten deterministik renk alır', () => {
    const c = subjectColor('Görsel Sanatlar');
    expect(FALLBACK_COLORS).toContain(c);
    expect(subjectColor('Görsel Sanatlar')).toBe(c);
  });
});
```

`tests/lib/catalog.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { subjectNames, subjectsFor, topicsFor } from '../../src/lib/catalog';
import type { Subject, Topic } from '../../src/lib/types';

const dersler: Subject[] = [
  { ders: 'Matematik', sinif: 8, deneme_soru_sayisi: 20, sira: 2 },
  { ders: 'Türkçe', sinif: 8, deneme_soru_sayisi: 20, sira: 1 },
  { ders: 'Sosyal Bilgiler', sinif: 7, deneme_soru_sayisi: 10, sira: 3 },
  { ders: 'Matematik', sinif: 7, deneme_soru_sayisi: 20, sira: 1 },
];
const konular: Topic[] = [
  { ders: 'Matematik', sinif: 8, konu: 'Çarpanlar ve Katlar' },
  { ders: 'Matematik', sinif: 8, konu: 'Üslü İfadeler' },
  { ders: 'Matematik', sinif: 7, konu: 'Oran ve Orantı' },
];

describe('catalog', () => {
  it('subjectsFor sıraya göre', () => {
    expect(subjectsFor(dersler, 8).map((s) => s.ders)).toEqual(['Türkçe', 'Matematik']);
  });
  it('topicsFor sınıf ve derse göre, sayfa sırasıyla', () => {
    expect(topicsFor(konular, 8, 'Matematik')).toEqual(['Çarpanlar ve Katlar', 'Üslü İfadeler']);
  });
  it('subjectNames tüm sınıflarda tekrarsız', () => {
    expect(subjectNames(dersler, 'all')).toEqual(['Matematik', 'Sosyal Bilgiler', 'Türkçe']);
  });
});
```

`tests/lib/recent.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { recentItems } from '../../src/lib/recent';
import { rec } from '../fixtures/records';

describe('recentItems', () => {
  it('deneme satırlarını tek öğede toplar, tarihe sonra oluşturma zamanına göre azalan sıralar', () => {
    const rows = [
      rec({ id: 'a', tarih: '2026-09-20', olusturma_zamani: '2026-09-20T10:00:00Z' }),
      rec({ id: 'b', tarih: '2026-09-22', deneme_id: 'd1', kaynak: 'Deneme', olusturma_zamani: '2026-09-22T09:00:00Z' }),
      rec({ id: 'c', tarih: '2026-09-22', deneme_id: 'd1', kaynak: 'Deneme', olusturma_zamani: '2026-09-22T09:00:00Z' }),
      rec({ id: 'd', tarih: '2026-09-22', olusturma_zamani: '2026-09-22T12:00:00Z' }),
    ];
    const items = recentItems(rows, [{ deneme_id: 'd1', ad: 'Deneme 1', tarih: '2026-09-22', sinif: 8 }]);
    expect(items.map((i) => i.key)).toEqual(['d', 'd1', 'a']);
    const exam = items[1];
    expect(exam.kind === 'exam' && exam.rows.length).toBe(2);
  });
  it('limit uygular', () => {
    const rows = Array.from({ length: 15 }, (_, i) => rec({ id: `x${i}` }));
    expect(recentItems(rows, [], 10)).toHaveLength(10);
  });
});
```

- [ ] **Step 2: Başarısız olduğunu doğrula**

Run: `npx vitest run tests/lib/csv.test.ts tests/lib/colors.test.ts tests/lib/catalog.test.ts tests/lib/recent.test.ts`
Expected: FAIL — modüller yok.

- [ ] **Step 3: `src/lib/csv.ts` yaz**

```ts
import { net, netRate, round2 } from './net';
import type { Exam, RecordRow } from './types';

const HEADERS = ['tarih', 'sinif', 'ders', 'kaynak', 'konu', 'deneme', 'soru', 'dogru', 'yanlis', 'bos', 'net', 'net_orani', 'giren_kullanici'];

// Türkçe Excel: ; ayırıcı, ondalık virgül, UTF-8 BOM.
function cell(v: string | number | null): string {
  if (v === null) return '';
  if (typeof v === 'number') return String(round2(v)).replace('.', ',');
  const s = /^[=+\-@]/.test(v) ? `'${v}` : v;
  return /[";\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(rows: readonly RecordRow[], exams: readonly Exam[]): string {
  const examName = new Map(exams.map((e) => [e.deneme_id, e.ad]));
  const sorted = [...rows].sort((a, b) => a.tarih.localeCompare(b.tarih) || a.olusturma_zamani.localeCompare(b.olusturma_zamani));
  const lines = sorted.map((r) => {
    const n = net(r.dogru, r.yanlis);
    return [
      r.tarih, r.sinif, r.ders, r.kaynak, r.konu, examName.get(r.deneme_id) ?? '',
      r.soru, r.dogru, r.yanlis, r.bos, n, netRate(n, r.soru), r.giren_kullanici,
    ].map(cell).join(';');
  });
  return `﻿${[HEADERS.join(';'), ...lines].join('\r\n')}`;
}
```

- [ ] **Step 4: `src/lib/colors.ts` yaz**

```ts
export const SUBJECT_COLORS: Record<string, string> = {
  Matematik: '#3D6BF0',
  Türkçe: '#E0453F',
  'Fen Bilimleri': '#2E9E62',
  'Sosyal Bilgiler': '#D98E04',
  'T.C. İnkılap Tarihi ve Atatürkçülük': '#D98E04',
  'Din Kültürü ve Ahlak Bilgisi': '#8B4FC4',
  İngilizce: '#0E9DB0',
};

export const FALLBACK_COLORS = ['#C93F8E', '#8A7A5C', '#5B5FD6', '#6E9E1E', '#B5562B'];

export function subjectColor(ders: string): string {
  const known = SUBJECT_COLORS[ders];
  if (known) return known;
  let h = 0;
  for (const ch of ders) h = (h * 31 + ch.codePointAt(0)!) >>> 0;
  return FALLBACK_COLORS[h % FALLBACK_COLORS.length];
}
```

- [ ] **Step 5: `src/lib/catalog.ts`, `src/lib/recent.ts`, `src/lib/download.ts` yaz**

`src/lib/catalog.ts`:

```ts
import type { Grade, Subject, Topic } from './types';

export function subjectsFor(dersler: readonly Subject[], sinif: Grade): Subject[] {
  return dersler.filter((s) => s.sinif === sinif).sort((a, b) => a.sira - b.sira || a.ders.localeCompare(b.ders, 'tr'));
}

export function topicsFor(konular: readonly Topic[], sinif: Grade, ders: string): string[] {
  return konular.filter((t) => t.sinif === sinif && t.ders === ders).map((t) => t.konu);
}

export function subjectNames(dersler: readonly Subject[], sinif: Grade | 'all'): string[] {
  const list = sinif === 'all' ? [...subjectsFor(dersler, 7), ...subjectsFor(dersler, 8)] : subjectsFor(dersler, sinif);
  const names = [...new Set(list.map((s) => s.ders))];
  return sinif === 'all' ? names.sort((a, b) => a.localeCompare(b, 'tr')) : names;
}
```

`src/lib/recent.ts`:

```ts
import type { Exam, RecordRow } from './types';

export type RecentItem =
  | { kind: 'record'; key: string; tarih: string; created: string; row: RecordRow }
  | { kind: 'exam'; key: string; tarih: string; created: string; exam: Exam; rows: RecordRow[] };

export function recentItems(kayitlar: readonly RecordRow[], denemeler: readonly Exam[], limit = 10): RecentItem[] {
  const byExam = new Map<string, RecordRow[]>();
  const items: RecentItem[] = [];
  for (const r of kayitlar) {
    if (r.deneme_id) {
      const list = byExam.get(r.deneme_id) ?? [];
      list.push(r);
      byExam.set(r.deneme_id, list);
    } else {
      items.push({ kind: 'record', key: r.id, tarih: r.tarih, created: r.olusturma_zamani, row: r });
    }
  }
  for (const exam of denemeler) {
    const rows = byExam.get(exam.deneme_id) ?? [];
    const created = rows.reduce((m, r) => (r.olusturma_zamani > m ? r.olusturma_zamani : m), '');
    items.push({ kind: 'exam', key: exam.deneme_id, tarih: exam.tarih, created, exam, rows });
  }
  return items.sort((a, b) => b.tarih.localeCompare(a.tarih) || b.created.localeCompare(a.created)).slice(0, limit);
}
```

`src/lib/download.ts`:

```ts
export function downloadText(filename: string, content: string, type: string): void {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
```

- [ ] **Step 6: Testleri çalıştır**

Run: `npx vitest run tests/lib`
Expected: PASS (tüm lib testleri).

- [ ] **Step 7: Commit**

```bash
git add src/lib tests/lib
git commit -m "feat: CSV dışa aktarma, ders renkleri, katalog ve son kayıtlar"
```

---
### Task 8: Google Apps Script backend ve seed verisi

**Files:**
- Create: `apps-script/Seed.gs`, `apps-script/Code.gs`, `src/api/seed.ts`
- Test: `tests/appsScript/code.test.ts`, `tests/api/seed.test.ts`

**Interfaces:**
- Consumes: `tests/fixtures/validationCases.ts` (Task 3), `validateRecord/validateExam/validateSubjects/validateTopics/MSG` (Task 3).
- Produces:
  - `apps-script/Seed.gs`: `var SEED` (`{ '7': SeedSubject[], '8': SeedSubject[] }`, `SeedSubject = { ders, soru, konular: string[] }`), `seedSubjects_(): Subject[]`, `seedTopics_(): Topic[]`
  - `apps-script/Code.gs`: `doGet`, `doPost`, `setup`, ve test edilen saf fonksiyonlar `validateRecord_`, `validateExam_`, `validateSubjects_`, `validateTopics_`, `normalizeCell_`, `toObject_`, `MSG`
  - HTTP sözleşmesi: istek gövdesi `{ action, token, payload }`; yanıt `{ ok: true, data }` veya `{ ok: false, error: 'AUTH'|'LOGIN'|'VALIDATION'|'NOT_FOUND'|'SERVER', message, details }`
  - Eylemler ve payload'lar: `login {kullanici_adi, sifre, hatirla}` → `{token, kullanici_adi, ad}`; `logout {}`; `getAll {}` → `AppData`; `addRecord {input}` → `RecordRow`; `updateRecord {id, input}` → `RecordRow`; `deleteRecord {id}`; `addExam {input}` → `ExamResult`; `updateExam {deneme_id, input}` → `ExamResult`; `deleteExam {deneme_id}`; `saveSubjects {dersler}`; `saveTopics {konular}`; `renameSubject {sinif, eski, yeni}`; `renameTopic {sinif, ders, eski, yeni}`; `addUser {kullanici_adi, ad, sifre}`; `changePassword {eski, yeni}`. Değer döndürmeyen eylemler `null` döner.
  - `src/api/seed.ts`: `SEED`, `seedSubjects(): Subject[]`, `seedTopics(): Topic[]` — Seed.gs'yi `?raw` ile yükler (tek kaynak)

- [ ] **Step 1: Başarısız testleri yaz**

`tests/appsScript/code.test.ts`:

```ts
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { describe, expect, it } from 'vitest';
import { MSG, validateExam, validateRecord, validateSubjects, validateTopics } from '../../src/lib/validation';
import { TODAY, examCases, recordCases, subjectCases, topicCases } from '../fixtures/validationCases';

// Code.gs ve Seed.gs'yi Apps Script'in yaptığı gibi tek bir global kapsamda yükler.
function loadGs(globals: Record<string, unknown> = {}) {
  const ctx = vm.createContext({ ...globals });
  for (const f of ['apps-script/Seed.gs', 'apps-script/Code.gs']) {
    vm.runInContext(readFileSync(f, 'utf8'), ctx, { filename: f });
  }
  return ctx as Record<string, any>;
}
const plain = (x: unknown) => JSON.parse(JSON.stringify(x));

describe('Code.gs doğrulaması frontend ile birebir aynı', () => {
  const gs = loadGs();
  it('mesajlar aynı', () => {
    expect(plain(gs.MSG)).toEqual(MSG);
  });
  it.each(recordCases)('kayıt: $name', ({ input }) => {
    expect(plain(gs.validateRecord_(input, TODAY))).toEqual(plain(validateRecord(input, TODAY)));
  });
  it.each(examCases)('deneme: $name', ({ input }) => {
    expect(plain(gs.validateExam_(input, TODAY))).toEqual(plain(validateExam(input, TODAY)));
  });
  it.each(subjectCases)('dersler: $name', ({ input }) => {
    expect(plain(gs.validateSubjects_(input))).toEqual(plain(validateSubjects(input)));
  });
  it.each(topicCases)('konular: $name', ({ input }) => {
    expect(plain(gs.validateTopics_(input))).toEqual(plain(validateTopics(input)));
  });
});

describe('Sheets hücre dönüşümü', () => {
  it('Date hücresini script saat diliminde yyyy-MM-dd yapar (toISOString değil)', () => {
    const calls: unknown[][] = [];
    const gs = loadGs({
      Utilities: { formatDate: (...a: unknown[]) => { calls.push(a); return '2026-09-24'; } },
      Session: { getScriptTimeZone: () => 'Europe/Istanbul' },
    });
    const d = vm.runInContext('new Date(2026, 8, 24)', gs as vm.Context);
    expect(gs.normalizeCell_(d)).toBe('2026-09-24');
    expect(calls[0].slice(1)).toEqual(['Europe/Istanbul', 'yyyy-MM-dd']);
    expect(gs.normalizeCell_('2026-09-24')).toBe('2026-09-24');
  });
  it('toObject_ sayısal sütunları sayıya, diğerlerini stringe çevirir', () => {
    const gs = loadGs();
    const o = gs.toObject_(['ders', 'sinif', 'soru', 'konu'], ['Matematik', '8', 20, 12]);
    expect(plain(o)).toEqual({ ders: 'Matematik', sinif: 8, soru: 20, konu: '12' });
  });
});
```

`tests/api/seed.test.ts`:

```ts
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { describe, expect, it } from 'vitest';
import { seedSubjects, seedTopics } from '../../src/api/seed';

describe('seed (tek kaynak: apps-script/Seed.gs)', () => {
  it('MEB resmi ders adları ve LGS soru sayıları', () => {
    const s8 = seedSubjects().filter((s) => s.sinif === 8);
    expect(s8.map((s) => [s.ders, s.deneme_soru_sayisi])).toEqual([
      ['Türkçe', 20],
      ['Matematik', 20],
      ['Fen Bilimleri', 20],
      ['T.C. İnkılap Tarihi ve Atatürkçülük', 10],
      ['Din Kültürü ve Ahlak Bilgisi', 10],
      ['İngilizce', 10],
    ]);
    expect(seedSubjects().filter((s) => s.sinif === 7).map((s) => s.ders)).toContain('Sosyal Bilgiler');
  });
  it('konular ders ve sınıfa bağlı', () => {
    expect(seedTopics()).toContainEqual({ ders: 'Matematik', sinif: 8, konu: 'Çarpanlar ve Katlar' });
    expect(seedTopics()).toContainEqual({ ders: 'Matematik', sinif: 7, konu: 'Oran ve Orantı' });
  });
  it('Apps Script de aynı listeyi üretir', () => {
    const ctx = vm.createContext({});
    vm.runInContext(readFileSync('apps-script/Seed.gs', 'utf8'), ctx);
    expect(JSON.parse(JSON.stringify(vm.runInContext('seedSubjects_()', ctx)))).toEqual(seedSubjects());
    expect(JSON.parse(JSON.stringify(vm.runInContext('seedTopics_()', ctx)))).toEqual(seedTopics());
  });
});
```

- [ ] **Step 2: Başarısız olduğunu doğrula**

Run: `npx vitest run tests/appsScript tests/api/seed.test.ts`
Expected: FAIL — `ENOENT: apps-script/Seed.gs` ve `src/api/seed` çözümlenemiyor.

- [ ] **Step 3: `apps-script/Seed.gs` yaz**

```js
/**
 * Başlangıç ders ve konu listesi (MEB). Tek kaynak: frontend bu dosyayı ?raw ile içe aktarır.
 * Liste uygulamanın Ayarlar sayfasından değiştirilebilir; bu dosya yalnızca ilk kurulumda kullanılır.
 */
var SEED = {
  '7': [
    { ders: 'Türkçe', soru: 20, konular: ['Sözcükte Anlam', 'Cümlede Anlam', 'Paragrafta Anlam', 'Fiiller', 'Fiil Kipleri ve Kişi', 'Ek Fiil', 'Zarflar', 'Yazım Kuralları', 'Noktalama İşaretleri', 'Anlatım Bozuklukları', 'Söz Sanatları', 'Metin Türleri', 'Görsel Okuma ve Sözel Mantık'] },
    { ders: 'Matematik', soru: 20, konular: ['Tam Sayılarla İşlemler', 'Rasyonel Sayılar', 'Rasyonel Sayılarla İşlemler', 'Cebirsel İfadeler', 'Eşitlik ve Denklem', 'Oran ve Orantı', 'Yüzdeler', 'Doğrular ve Açılar', 'Çokgenler', 'Çember ve Daire', 'Veri Analizi', 'Cisimlerin Farklı Yönlerden Görünümleri'] },
    { ders: 'Fen Bilimleri', soru: 20, konular: ['Güneş Sistemi ve Ötesi', 'Hücre ve Bölünmeler', 'Kuvvet ve Enerji', 'Saf Madde ve Karışımlar', 'Işığın Madde ile Etkileşimi', 'Canlılarda Üreme, Büyüme ve Gelişme', 'Elektrik Devreleri'] },
    { ders: 'Sosyal Bilgiler', soru: 10, konular: ['İletişim ve İnsan İlişkileri', 'Türk Tarihinde Yolculuk', 'Ülkemizde Nüfus', 'Zaman İçinde Bilim', 'Ekonomi ve Sosyal Hayat', 'Yaşayan Demokrasi', 'Ülkeler Arası Köprüler'] },
    { ders: 'Din Kültürü ve Ahlak Bilgisi', soru: 10, konular: ['Melek ve Ahiret İnancı', 'Hac ve Kurban', 'Ahlaki Davranışlar', "Allah'ın Kulu ve Elçisi: Hz. Muhammed", 'İslam Düşüncesinde Yorumlar'] },
    { ders: 'İngilizce', soru: 10, konular: ['Appearance and Personality', 'Sports', 'Biographies', 'Wild Animals', 'Television', 'Celebrations', 'Dreams', 'Public Buildings', 'Environment', 'Planets'] }
  ],
  '8': [
    { ders: 'Türkçe', soru: 20, konular: ['Sözcükte Anlam', 'Cümlede Anlam', 'Paragrafta Anlam', 'Fiilimsiler', 'Cümlenin Ögeleri', 'Fiilde Çatı', 'Cümle Türleri', 'Yazım Kuralları', 'Noktalama İşaretleri', 'Anlatım Bozuklukları', 'Söz Sanatları', 'Metin Türleri', 'Görsel Okuma ve Sözel Mantık'] },
    { ders: 'Matematik', soru: 20, konular: ['Çarpanlar ve Katlar', 'Üslü İfadeler', 'Kareköklü İfadeler', 'Veri Analizi', 'Basit Olayların Olma Olasılığı', 'Cebirsel İfadeler ve Özdeşlikler', 'Doğrusal Denklemler', 'Eşitsizlikler', 'Üçgenler', 'Eşlik ve Benzerlik', 'Dönüşüm Geometrisi', 'Geometrik Cisimler'] },
    { ders: 'Fen Bilimleri', soru: 20, konular: ['Mevsimler ve İklim', 'DNA ve Genetik Kod', 'Basınç', 'Madde ve Endüstri', 'Basit Makineler', 'Enerji Dönüşümleri ve Çevre Bilimi', 'Elektrik Yükleri ve Elektrik Enerjisi'] },
    { ders: 'T.C. İnkılap Tarihi ve Atatürkçülük', soru: 10, konular: ['Bir Kahraman Doğuyor', 'Millî Uyanış: Bağımsızlık Yolunda Atılan Adımlar', 'Millî Bir Destan: Ya İstiklal Ya Ölüm!', 'Atatürkçülük ve Çağdaşlaşan Türkiye', 'Demokratikleşme Çabaları', 'Atatürk Dönemi Türk Dış Politikası', "Atatürk'ün Ölümü ve Sonrası"] },
    { ders: 'Din Kültürü ve Ahlak Bilgisi', soru: 10, konular: ['Kader İnancı', 'Zekât ve Sadaka', 'Din ve Hayat', "Hz. Muhammed'in Örnekliği", "Kur'an-ı Kerim ve Özellikleri"] },
    { ders: 'İngilizce', soru: 10, konular: ['Friendship', 'Teen Life', 'In the Kitchen', 'On the Phone', 'The Internet', 'Adventures', 'Tourism', 'Chores', 'Science', 'Natural Forces'] }
  ]
};

function seedSubjects_() {
  var out = [];
  [7, 8].forEach(function (sinif) {
    SEED[sinif].forEach(function (s, i) {
      out.push({ ders: s.ders, sinif: sinif, deneme_soru_sayisi: s.soru, sira: i + 1 });
    });
  });
  return out;
}

function seedTopics_() {
  var out = [];
  [7, 8].forEach(function (sinif) {
    SEED[sinif].forEach(function (s) {
      s.konular.forEach(function (konu) {
        out.push({ ders: s.ders, sinif: sinif, konu: konu });
      });
    });
  });
  return out;
}
```

- [ ] **Step 4: `src/api/seed.ts` yaz**

```ts
import seedSource from '../../apps-script/Seed.gs?raw';
import type { Subject, Topic } from '../lib/types';

interface SeedModule {
  seedSubjects_: () => Subject[];
  seedTopics_: () => Topic[];
}

// Seed.gs tek kaynaktır; Apps Script ile aynı kodu çalıştırırız.
const mod = new Function(`${seedSource}\nreturn { seedSubjects_: seedSubjects_, seedTopics_: seedTopics_ };`)() as SeedModule;

export function seedSubjects(): Subject[] {
  return mod.seedSubjects_();
}

export function seedTopics(): Topic[] {
  return mod.seedTopics_();
}
```

- [ ] **Step 5: `apps-script/Code.gs` yaz**

```js
/**
 * Göksenin Takip — Google Apps Script backend.
 * Üst düzey tanımlar yalnızca `var` ve `function` olmalı: testler bu dosyayı Node vm içinde yükler.
 * Doğrulama kuralları ve mesajları src/lib/validation.ts ile birebir aynıdır.
 */

var SHEETS = {
  Kayitlar: ['id', 'tarih', 'sinif', 'ders', 'kaynak', 'konu', 'soru', 'dogru', 'yanlis', 'bos', 'deneme_id', 'giren_kullanici', 'olusturma_zamani'],
  Denemeler: ['deneme_id', 'ad', 'tarih', 'sinif'],
  Dersler: ['ders', 'sinif', 'deneme_soru_sayisi', 'sira'],
  Konular: ['ders', 'sinif', 'konu'],
  Kullanicilar: ['kullanici_adi', 'sifre_hash', 'salt', 'ad']
};
var NUMERIC_COLUMNS = ['sinif', 'soru', 'dogru', 'yanlis', 'bos', 'deneme_soru_sayisi', 'sira'];
var SINGLE_SOURCES = ['Ödev', 'Kendi Çözdüğü'];
var DAY_MS = 24 * 60 * 60 * 1000;
var TOKEN_PREFIX = 'tok_';

var MSG = {
  tarihGecersiz: 'Geçerli bir tarih girin.',
  tarihGelecek: 'Tarih bugünden sonra olamaz.',
  sinif: 'Sınıf 7 veya 8 olmalı.',
  kaynak: 'Geçerli bir kaynak seçin.',
  ders: 'Ders seçin.',
  konu: 'Konu adı boş olamaz.',
  soru: 'Soru sayısı en az 1 olmalı.',
  sayi: '0 veya daha büyük bir tam sayı girin.',
  toplam: 'Doğru + yanlış + boş, soru sayısına eşit olmalı.',
  ad: 'Deneme adı boş olamaz.',
  satirYok: 'En az bir ders satırı doldurun.',
  tekrar: 'Bu ad zaten var.',
  kullaniciAdi: 'Kullanıcı adı 3-30 karakter olmalı; yalnızca a-z, 0-9, nokta, tire ve alt çizgi.',
  adSoyad: 'Ad boş olamaz.',
  sifre: 'Şifre en az 6 karakter olmalı.',
  eskiSifre: 'Mevcut şifre hatalı.'
};

/* ---------------- Doğrulama ---------------- */

function isIsoDate_(s) {
  if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  var p = s.split('-').map(Number);
  var d = new Date(Date.UTC(p[0], p[1] - 1, p[2]));
  return d.getUTCFullYear() === p[0] && d.getUTCMonth() === p[1] - 1 && d.getUTCDate() === p[2];
}

function isCount_(x, min) {
  return typeof x === 'number' && Number.isInteger(x) && x >= min;
}

function isBlank_(s) {
  return typeof s !== 'string' || s.trim() === '';
}

function lower_(s) {
  return s.trim().toLocaleLowerCase('tr');
}

function checkDate_(tarih, today, errs) {
  if (!isIsoDate_(tarih)) errs.tarih = MSG.tarihGecersiz;
  else if (tarih > today) errs.tarih = MSG.tarihGelecek;
}

function checkGrade_(sinif, key, errs) {
  if (sinif !== 7 && sinif !== 8) errs[key] = MSG.sinif;
}

function countErrors_(c, prefix) {
  var errs = {};
  if (!isCount_(c.soru, 1)) errs[prefix + 'soru'] = MSG.soru;
  ['dogru', 'yanlis', 'bos'].forEach(function (k) {
    if (!isCount_(c[k], 0)) errs[prefix + k] = MSG.sayi;
  });
  if (Object.keys(errs).length === 0 && c.dogru + c.yanlis + c.bos !== c.soru) errs[prefix + 'toplam'] = MSG.toplam;
  return errs;
}

function merge_(target, source) {
  Object.keys(source).forEach(function (k) { target[k] = source[k]; });
  return target;
}

function validateRecord_(r, today) {
  var errs = {};
  checkDate_(r.tarih, today, errs);
  checkGrade_(r.sinif, 'sinif', errs);
  if (SINGLE_SOURCES.indexOf(r.kaynak) === -1) errs.kaynak = MSG.kaynak;
  if (isBlank_(r.ders)) errs.ders = MSG.ders;
  return merge_(errs, countErrors_(r, ''));
}

function validateExam_(e, today) {
  var errs = {};
  if (isBlank_(e.ad)) errs.ad = MSG.ad;
  checkDate_(e.tarih, today, errs);
  checkGrade_(e.sinif, 'sinif', errs);
  if (!Array.isArray(e.satirlar) || e.satirlar.length === 0) {
    errs.satirlar = MSG.satirYok;
  } else {
    e.satirlar.forEach(function (s, i) {
      var p = 'satirlar.' + i + '.';
      if (isBlank_(s.ders)) errs[p + 'ders'] = MSG.ders;
      merge_(errs, countErrors_(s, p));
    });
  }
  return errs;
}

function validateSubjects_(list) {
  var errs = {}, seen = {};
  list.forEach(function (s, i) {
    var p = 'dersler.' + i + '.';
    if (isBlank_(s.ders)) {
      errs[p + 'ders'] = MSG.ders;
    } else {
      var key = s.sinif + '|' + lower_(s.ders);
      if (seen[key]) errs[p + 'ders'] = MSG.tekrar;
      seen[key] = true;
    }
    checkGrade_(s.sinif, p + 'sinif', errs);
    if (!isCount_(s.deneme_soru_sayisi, 0)) errs[p + 'deneme_soru_sayisi'] = MSG.sayi;
    if (!isCount_(s.sira, 0)) errs[p + 'sira'] = MSG.sayi;
  });
  return errs;
}

function validateTopics_(list) {
  var errs = {}, seen = {};
  list.forEach(function (t, i) {
    var p = 'konular.' + i + '.';
    if (isBlank_(t.ders)) errs[p + 'ders'] = MSG.ders;
    checkGrade_(t.sinif, p + 'sinif', errs);
    if (isBlank_(t.konu)) {
      errs[p + 'konu'] = MSG.konu;
    } else {
      var key = t.sinif + '|' + (isBlank_(t.ders) ? '' : lower_(t.ders)) + '|' + lower_(t.konu);
      if (seen[key]) errs[p + 'konu'] = MSG.tekrar;
      seen[key] = true;
    }
  });
  return errs;
}

/* ---------------- HTTP ---------------- */

function doGet() {
  return json_({ ok: true, data: 'goksenin-takip' });
}

function doPost(e) {
  var res;
  try {
    var req = JSON.parse(e.postData.contents);
    res = { ok: true, data: route_(req) };
  } catch (err) {
    res = { ok: false, error: err.code || 'SERVER', message: err.message || String(err), details: err.details || null };
  }
  return json_(res);
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function fail_(code, message, details) {
  var e = new Error(message);
  e.code = code;
  e.details = details || null;
  throw e;
}

function requireValid_(errs) {
  if (Object.keys(errs).length) fail_('VALIDATION', 'Formda hatalar var.', errs);
}

var WRITE_HANDLERS = {
  addRecord: addRecord_,
  updateRecord: updateRecord_,
  deleteRecord: deleteRecord_,
  addExam: addExam_,
  updateExam: updateExam_,
  deleteExam: deleteExam_,
  saveSubjects: saveSubjects_,
  saveTopics: saveTopics_,
  renameSubject: renameSubject_,
  renameTopic: renameTopic_,
  addUser: addUser_,
  changePassword: changePassword_
};

function route_(req) {
  var p = req.payload || {};
  if (req.action === 'login') return login_(p);
  var user = requireUser_(req.token);
  if (req.action === 'logout') {
    PropertiesService.getScriptProperties().deleteProperty(TOKEN_PREFIX + req.token);
    return null;
  }
  if (req.action === 'getAll') return getAll_();
  var handler = WRITE_HANDLERS[req.action];
  if (!handler) fail_('SERVER', 'Bilinmeyen işlem: ' + req.action);
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    return handler(p, user);
  } finally {
    lock.releaseLock();
  }
}

/* ---------------- Oturum ---------------- */

function hash_(salt, pass) {
  var bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, salt + ':' + pass, Utilities.Charset.UTF_8);
  return bytes.map(function (b) { return ('0' + (b & 0xff).toString(16)).slice(-2); }).join('');
}

function newToken_() {
  return (Utilities.getUuid() + Utilities.getUuid()).replace(/-/g, '');
}

function cleanupTokens_(props) {
  var all = props.getProperties(), now = Date.now();
  Object.keys(all).forEach(function (k) {
    if (k.indexOf(TOKEN_PREFIX) !== 0) return;
    try {
      if (JSON.parse(all[k]).exp < now) props.deleteProperty(k);
    } catch (e) {
      props.deleteProperty(k);
    }
  });
}

function login_(p) {
  var u = String(p.kullanici_adi || '').trim().toLowerCase();
  var me = readAll_('Kullanicilar').filter(function (x) { return x.kullanici_adi === u; })[0];
  if (!me || hash_(me.salt, String(p.sifre || '')) !== me.sifre_hash) {
    Utilities.sleep(1000);
    fail_('LOGIN', 'Kullanıcı adı veya şifre hatalı.');
  }
  var props = PropertiesService.getScriptProperties();
  cleanupTokens_(props);
  var token = newToken_();
  var days = p.hatirla ? 30 : 1;
  props.setProperty(TOKEN_PREFIX + token, JSON.stringify({ u: me.kullanici_adi, exp: Date.now() + days * DAY_MS }));
  return { token: token, kullanici_adi: me.kullanici_adi, ad: me.ad };
}

function requireUser_(token) {
  if (!token) fail_('AUTH', 'Oturumunuz sona erdi. Lütfen tekrar giriş yapın.');
  var props = PropertiesService.getScriptProperties();
  var raw = props.getProperty(TOKEN_PREFIX + token);
  var t = raw ? JSON.parse(raw) : null;
  if (!t || t.exp < Date.now()) {
    if (raw) props.deleteProperty(TOKEN_PREFIX + token);
    fail_('AUTH', 'Oturumunuz sona erdi. Lütfen tekrar giriş yapın.');
  }
  return t.u;
}

/* ---------------- Sheet yardımcıları ---------------- */

function sheet_(name) {
  var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name);
  if (!sh) fail_('SERVER', name + ' sekmesi bulunamadı. Apps Script içinde setup() çalıştırın.');
  return sh;
}

// Sheets "2026-09-24" metnini Date'e çevirebilir; script saat diliminde geri yazıya çeviririz.
function normalizeCell_(v) {
  if (v instanceof Date) return Utilities.formatDate(v, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  return v;
}

function toObject_(headers, row) {
  var o = {};
  headers.forEach(function (h, j) {
    var v = normalizeCell_(row[j]);
    o[h] = NUMERIC_COLUMNS.indexOf(h) >= 0 ? Number(v) : String(v === null || v === undefined ? '' : v);
  });
  return o;
}

function readAll_(name) {
  var headers = SHEETS[name];
  var values = sheet_(name).getDataRange().getValues();
  var out = [];
  for (var i = 1; i < values.length; i++) {
    if (values[i].join('') === '') continue;
    var o = toObject_(headers, values[i]);
    o._row = i + 1;
    out.push(o);
  }
  return out;
}

function strip_(o) {
  var c = {};
  Object.keys(o).forEach(function (k) { if (k !== '_row') c[k] = o[k]; });
  return c;
}

function rowValues_(name, obj) {
  return SHEETS[name].map(function (h) { return obj[h] === undefined || obj[h] === null ? '' : obj[h]; });
}

function ensureRows_(sh, lastNeeded) {
  var missing = lastNeeded - sh.getMaxRows();
  if (missing > 0) sh.insertRowsAfter(sh.getMaxRows(), missing);
}

function appendMany_(name, objs) {
  if (!objs.length) return;
  var sh = sheet_(name), start = sh.getLastRow() + 1;
  ensureRows_(sh, start + objs.length - 1);
  sh.getRange(start, 1, objs.length, SHEETS[name].length).setValues(objs.map(function (o) { return rowValues_(name, o); }));
}

function update_(name, rowIndex, obj) {
  sheet_(name).getRange(rowIndex, 1, 1, SHEETS[name].length).setValues([rowValues_(name, obj)]);
}

function deleteRows_(name, rowIndexes) {
  var sh = sheet_(name);
  rowIndexes.slice().sort(function (a, b) { return b - a; }).forEach(function (r) { sh.deleteRow(r); });
}

function replaceAll_(name, objs) {
  var sh = sheet_(name), width = SHEETS[name].length, last = sh.getLastRow();
  if (last > 1) sh.getRange(2, 1, last - 1, width).clearContent();
  if (!objs.length) return;
  ensureRows_(sh, objs.length + 1);
  sh.getRange(2, 1, objs.length, width).setValues(objs.map(function (o) { return rowValues_(name, o); }));
}

function renameWhere_(name, col, match, value) {
  var sh = sheet_(name), h = SHEETS[name], last = sh.getLastRow();
  if (last < 2) return;
  var range = sh.getRange(2, 1, last - 1, h.length), values = range.getValues(), ci = h.indexOf(col), changed = false;
  values.forEach(function (row) {
    if (match(toObject_(h, row))) { row[ci] = value; changed = true; }
  });
  if (changed) range.setValues(values);
}

function today_() {
  return Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
}

/* ---------------- Eylemler ---------------- */

function getAll_() {
  return {
    kayitlar: readAll_('Kayitlar').map(strip_),
    denemeler: readAll_('Denemeler').map(strip_),
    dersler: readAll_('Dersler').map(strip_),
    konular: readAll_('Konular').map(strip_),
    kullanicilar: readAll_('Kullanicilar').map(function (u) { return { kullanici_adi: u.kullanici_adi, ad: u.ad }; })
  };
}

function cleanRecordInput_(r) {
  return {
    tarih: r.tarih, sinif: r.sinif, ders: String(r.ders).trim(), kaynak: r.kaynak,
    konu: typeof r.konu === 'string' ? r.konu.trim() : '',
    soru: r.soru, dogru: r.dogru, yanlis: r.yanlis, bos: r.bos
  };
}

function findSingle_(id) {
  var r = readAll_('Kayitlar').filter(function (x) { return x.id === id && x.deneme_id === ''; })[0];
  if (!r) fail_('NOT_FOUND', 'Kayıt bulunamadı. Sayfayı yenileyin.');
  return r;
}

function addRecord_(p, user) {
  var input = p.input || {};
  requireValid_(validateRecord_(input, today_()));
  var rec = cleanRecordInput_(input);
  rec.id = Utilities.getUuid();
  rec.deneme_id = '';
  rec.giren_kullanici = user;
  rec.olusturma_zamani = new Date().toISOString();
  appendMany_('Kayitlar', [rec]);
  return rec;
}

function updateRecord_(p) {
  var old = findSingle_(p.id);
  var input = p.input || {};
  requireValid_(validateRecord_(input, today_()));
  var rec = cleanRecordInput_(input);
  rec.id = old.id;
  rec.deneme_id = '';
  rec.giren_kullanici = old.giren_kullanici;
  rec.olusturma_zamani = old.olusturma_zamani;
  update_('Kayitlar', old._row, rec);
  return rec;
}

function deleteRecord_(p) {
  deleteRows_('Kayitlar', [findSingle_(p.id)._row]);
  return null;
}

function findExam_(id) {
  var e = readAll_('Denemeler').filter(function (x) { return x.deneme_id === id; })[0];
  if (!e) fail_('NOT_FOUND', 'Deneme bulunamadı. Sayfayı yenileyin.');
  return e;
}

function buildExamRows_(exam, satirlar, user, created) {
  return satirlar.map(function (s) {
    return {
      id: Utilities.getUuid(), tarih: exam.tarih, sinif: exam.sinif, ders: String(s.ders).trim(), kaynak: 'Deneme', konu: '',
      soru: s.soru, dogru: s.dogru, yanlis: s.yanlis, bos: s.bos, deneme_id: exam.deneme_id,
      giren_kullanici: user, olusturma_zamani: created
    };
  });
}

function addExam_(p, user) {
  var input = p.input || {};
  requireValid_(validateExam_(input, today_()));
  var exam = { deneme_id: Utilities.getUuid(), ad: input.ad.trim(), tarih: input.tarih, sinif: input.sinif };
  var rows = buildExamRows_(exam, input.satirlar, user, new Date().toISOString());
  appendMany_('Denemeler', [exam]);
  appendMany_('Kayitlar', rows);
  return { exam: exam, rows: rows };
}

function updateExam_(p, user) {
  var old = findExam_(p.deneme_id);
  var input = p.input || {};
  requireValid_(validateExam_(input, today_()));
  var exam = { deneme_id: old.deneme_id, ad: input.ad.trim(), tarih: input.tarih, sinif: input.sinif };
  var oldRows = readAll_('Kayitlar').filter(function (r) { return r.deneme_id === old.deneme_id; });
  var creator = oldRows.length ? oldRows[0].giren_kullanici : user;
  var created = oldRows.length ? oldRows[0].olusturma_zamani : new Date().toISOString();
  update_('Denemeler', old._row, exam);
  deleteRows_('Kayitlar', oldRows.map(function (r) { return r._row; }));
  var rows = buildExamRows_(exam, input.satirlar, creator, created);
  appendMany_('Kayitlar', rows);
  return { exam: exam, rows: rows };
}

function deleteExam_(p) {
  var old = findExam_(p.deneme_id);
  var rows = readAll_('Kayitlar').filter(function (r) { return r.deneme_id === old.deneme_id; });
  deleteRows_('Kayitlar', rows.map(function (r) { return r._row; }));
  deleteRows_('Denemeler', [old._row]);
  return null;
}

function saveSubjects_(p) {
  var list = Array.isArray(p.dersler) ? p.dersler : [];
  requireValid_(validateSubjects_(list));
  replaceAll_('Dersler', list.map(function (s) {
    return { ders: s.ders.trim(), sinif: s.sinif, deneme_soru_sayisi: s.deneme_soru_sayisi, sira: s.sira };
  }));
  return null;
}

function saveTopics_(p) {
  var list = Array.isArray(p.konular) ? p.konular : [];
  requireValid_(validateTopics_(list));
  replaceAll_('Konular', list.map(function (t) { return { ders: t.ders.trim(), sinif: t.sinif, konu: t.konu.trim() }; }));
  return null;
}

function renameSubject_(p) {
  var sinif = p.sinif, eski = String(p.eski || '').trim(), yeni = String(p.yeni || '').trim();
  if (!yeni) fail_('VALIDATION', MSG.ders, { yeni: MSG.ders });
  if (eski === yeni) return null;
  var clash = readAll_('Dersler').some(function (s) {
    return s.sinif === sinif && s.ders !== eski && lower_(s.ders) === lower_(yeni);
  });
  if (clash) fail_('VALIDATION', MSG.tekrar, { yeni: MSG.tekrar });
  var match = function (o) { return o.sinif === sinif && o.ders === eski; };
  renameWhere_('Dersler', 'ders', match, yeni);
  renameWhere_('Konular', 'ders', match, yeni);
  renameWhere_('Kayitlar', 'ders', match, yeni);
  return null;
}

function renameTopic_(p) {
  var sinif = p.sinif, ders = p.ders, eski = String(p.eski || '').trim(), yeni = String(p.yeni || '').trim();
  if (!yeni) fail_('VALIDATION', MSG.konu, { yeni: MSG.konu });
  if (eski === yeni) return null;
  var clash = readAll_('Konular').some(function (t) {
    return t.sinif === sinif && t.ders === ders && t.konu !== eski && lower_(t.konu) === lower_(yeni);
  });
  if (clash) fail_('VALIDATION', MSG.tekrar, { yeni: MSG.tekrar });
  var match = function (o) { return o.sinif === sinif && o.ders === ders && o.konu === eski; };
  renameWhere_('Konular', 'konu', match, yeni);
  renameWhere_('Kayitlar', 'konu', match, yeni);
  return null;
}

function addUser_(p) {
  var u = String(p.kullanici_adi || '').trim().toLowerCase();
  var ad = String(p.ad || '').trim();
  var sifre = String(p.sifre || '');
  var errs = {};
  if (!/^[a-z0-9._-]{3,30}$/.test(u)) errs.kullanici_adi = MSG.kullaniciAdi;
  else if (readAll_('Kullanicilar').some(function (x) { return x.kullanici_adi === u; })) errs.kullanici_adi = MSG.tekrar;
  if (!ad) errs.ad = MSG.adSoyad;
  if (sifre.length < 6) errs.sifre = MSG.sifre;
  requireValid_(errs);
  var salt = newToken_().slice(0, 16);
  appendMany_('Kullanicilar', [{ kullanici_adi: u, sifre_hash: hash_(salt, sifre), salt: salt, ad: ad }]);
  return null;
}

function changePassword_(p, user) {
  var me = readAll_('Kullanicilar').filter(function (x) { return x.kullanici_adi === user; })[0];
  if (!me) fail_('AUTH', 'Oturumunuz sona erdi. Lütfen tekrar giriş yapın.');
  var errs = {};
  if (hash_(me.salt, String(p.eski || '')) !== me.sifre_hash) errs.eski = MSG.eskiSifre;
  if (String(p.yeni || '').length < 6) errs.yeni = MSG.sifre;
  requireValid_(errs);
  var salt = newToken_().slice(0, 16);
  update_('Kullanicilar', me._row, { kullanici_adi: me.kullanici_adi, sifre_hash: hash_(salt, String(p.yeni)), salt: salt, ad: me.ad });
  return null;
}

/* ---------------- Kurulum (bir kez elle çalıştırılır) ---------------- */

function setup() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  Object.keys(SHEETS).forEach(function (name) {
    var sh = ss.getSheetByName(name) || ss.insertSheet(name);
    var h = SHEETS[name];
    sh.getRange(1, 1, 1, h.length).setValues([h]).setFontWeight('bold');
    sh.setFrozenRows(1);
    // Metin sütunları düz metin: Sheets tarihleri ve kimlikleri dönüştürmesin.
    h.forEach(function (col, j) {
      if (NUMERIC_COLUMNS.indexOf(col) === -1) sh.getRange(1, j + 1, sh.getMaxRows(), 1).setNumberFormat('@');
    });
  });
  if (readAll_('Dersler').length === 0) replaceAll_('Dersler', seedSubjects_());
  if (readAll_('Konular').length === 0) replaceAll_('Konular', seedTopics_());
  var props = PropertiesService.getScriptProperties();
  if (readAll_('Kullanicilar').length === 0) {
    var u = props.getProperty('SETUP_USER'), pass = props.getProperty('SETUP_PASS'), ad = props.getProperty('SETUP_NAME') || u;
    if (!u || !pass) throw new Error('Önce Proje Ayarları > Script Properties içine SETUP_USER, SETUP_PASS ve SETUP_NAME ekleyin.');
    try {
      addUser_({ kullanici_adi: u, ad: ad, sifre: pass });
    } catch (err) {
      throw new Error('İlk kullanıcı oluşturulamadı: ' + JSON.stringify(err.details || err.message));
    }
  }
  props.deleteProperty('SETUP_PASS');
  ['Sayfa1', 'Sheet1'].forEach(function (n) {
    var def = ss.getSheetByName(n);
    if (def && def.getLastRow() === 0 && ss.getSheets().length > 1) ss.deleteSheet(def);
  });
  Logger.log('Kurulum tamamlandı. Şimdi Deploy > New deployment > Web app ile yayınlayın.');
}
```

- [ ] **Step 6: Testleri çalıştır**

Run: `npx vitest run tests/appsScript tests/api/seed.test.ts`
Expected: PASS. (`?raw` içe aktarımı için TypeScript tipi `vite/client`'tan gelir; `npx tsc --noEmit` de hatasız olmalı.)

- [ ] **Step 7: Commit**

```bash
git add apps-script src/api/seed.ts tests/appsScript tests/api/seed.test.ts
git commit -m "feat: Google Apps Script backend, MEB seed listesi ve doğrulama eşliği testleri"
```

---

### Task 9: API katmanı (HTTP, mock, yapılandırma)

**Files:**
- Create: `src/api/api.ts`, `src/api/http.ts`, `src/api/mock.ts`, `src/api/sample.ts`, `src/api/config.ts`, `src/api/index.ts`
- Test: `tests/api/http.test.ts`, `tests/api/mock.test.ts`, `tests/api/config.test.ts`

**Interfaces:**
- Consumes: tipler; `validateRecord, validateExam, validateSubjects, validateTopics, MSG` (validation.ts); `seedSubjects, seedTopics` (seed.ts); `todayIso` (periods.ts).
- Produces (`src/api/api.ts`):
  - `type ErrorCode = 'AUTH' | 'LOGIN' | 'VALIDATION' | 'NOT_FOUND' | 'NETWORK' | 'SERVER'`
  - `class ApiError extends Error { code: ErrorCode; details: FieldErrors | null }`
  - `type Transport = (action: string, payload: unknown, token: string | null) => Promise<unknown>`
  - `interface Session { token: string; kullanici_adi: string; ad: string }`
  - `createApi(transport: Transport)` → `{ setToken(t: string | null): void; login(kullanici_adi, sifre, hatirla: boolean): Promise<Session>; logout(): Promise<null>; getAll(): Promise<AppData>; addRecord(input: RecordInput): Promise<RecordRow>; updateRecord(id, input): Promise<RecordRow>; deleteRecord(id): Promise<null>; addExam(input: ExamInput): Promise<ExamResult>; updateExam(deneme_id, input): Promise<ExamResult>; deleteExam(deneme_id): Promise<null>; saveSubjects(dersler: Subject[]): Promise<null>; saveTopics(konular: Topic[]): Promise<null>; renameSubject(sinif: Grade, eski, yeni): Promise<null>; renameTopic(sinif: Grade, ders, eski, yeni): Promise<null>; addUser(kullanici_adi, ad, sifre): Promise<null>; changePassword(eski, yeni): Promise<null> }`
  - `type Api = ReturnType<typeof createApi>`
  - `errorMessage(e: unknown): string` — VALIDATION detayı varsa ilk detay mesajı
- Produces: `httpTransport(url: string, fetchFn?: typeof fetch): Transport` (http.ts); `createMockTransport(opts?: { storage?: Storage | null; today?: string; latencyMs?: number; withSamples?: boolean }): Transport` (mock.ts; demo kullanıcı `demo` / `demo123`); `sampleData(today: string): { kayitlar: RecordRow[]; denemeler: Exam[] }` (sample.ts); `type ApiConfig`, `resolveApiConfig(env: { PROD: boolean; VITE_API_URL?: string }): ApiConfig` (config.ts); `apiConfig: ApiConfig`, `defaultApi: Api` (index.ts)

- [ ] **Step 1: Başarısız testleri yaz**

`tests/api/config.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { resolveApiConfig } from '../../src/api/config';

describe('resolveApiConfig', () => {
  it('URL varsa http', () => {
    expect(resolveApiConfig({ PROD: true, VITE_API_URL: ' https://script.google.com/macros/s/X/exec ' })).toEqual({
      mode: 'http', url: 'https://script.google.com/macros/s/X/exec',
    });
  });
  it('geliştirmede URL yoksa mock', () => {
    expect(resolveApiConfig({ PROD: false })).toEqual({ mode: 'mock' });
  });
  it('üretimde URL yoksa sessizce mock KULLANMAZ, hata verir', () => {
    const c = resolveApiConfig({ PROD: true, VITE_API_URL: '' });
    expect(c.mode).toBe('error');
  });
});
```

`tests/api/http.test.ts`:

```ts
import { describe, expect, it, vi } from 'vitest';
import { ApiError, createApi, errorMessage } from '../../src/api/api';
import { httpTransport } from '../../src/api/http';

const reply = (body: unknown, status = 200) =>
  vi.fn(async () => new Response(typeof body === 'string' ? body : JSON.stringify(body), { status }));

describe('httpTransport', () => {
  it('text/plain POST gövdesinde action, payload ve token gönderir; data döner', async () => {
    const fetchFn = reply({ ok: true, data: { x: 1 } });
    const api = createApi(httpTransport('https://example.test/exec', fetchFn));
    api.setToken('t1');
    await expect(api.getAll()).resolves.toEqual({ x: 1 });
    const [url, init] = fetchFn.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://example.test/exec');
    expect(init.method).toBe('POST');
    expect((init.headers as Record<string, string>)['Content-Type']).toBe('text/plain;charset=utf-8');
    expect(JSON.parse(init.body as string)).toEqual({ action: 'getAll', payload: {}, token: 't1' });
  });
  it('ok:false → ApiError (kod, mesaj, detay)', async () => {
    const t = httpTransport('u', reply({ ok: false, error: 'VALIDATION', message: 'Formda hatalar var.', details: { soru: 'x' } }));
    const err = await t('addRecord', {}, 't').catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err.code).toBe('VALIDATION');
    expect(errorMessage(err)).toBe('x');
  });
  it('fetch hatası → NETWORK', async () => {
    const t = httpTransport('u', vi.fn(async () => { throw new TypeError('Failed to fetch'); }));
    await expect(t('getAll', {}, 't')).rejects.toMatchObject({ code: 'NETWORK' });
  });
  it('JSON olmayan yanıt (ör. Google giriş sayfası) → SERVER', async () => {
    const t = httpTransport('u', reply('<html>login</html>'));
    await expect(t('getAll', {}, 't')).rejects.toMatchObject({ code: 'SERVER' });
  });
});
```

`tests/api/mock.test.ts`:

```ts
import { beforeEach, describe, expect, it } from 'vitest';
import { ApiError, createApi, type Api } from '../../src/api/api';
import { createMockTransport } from '../../src/api/mock';
import { MSG } from '../../src/lib/validation';

let api: Api;

beforeEach(async () => {
  api = createApi(createMockTransport({ storage: null, latencyMs: 0, withSamples: false, today: '2026-09-24' }));
  const s = await api.login('demo', 'demo123', false);
  api.setToken(s.token);
});

const input = { tarih: '2026-09-20', sinif: 8 as const, ders: 'Matematik', kaynak: 'Ödev' as const, konu: 'Kümeler', soru: 10, dogru: 6, yanlis: 2, bos: 2 };

describe('mock backend', () => {
  it('hatalı şifre LOGIN, tokensız istek AUTH', async () => {
    await expect(api.login('demo', 'yanlis', false)).rejects.toMatchObject({ code: 'LOGIN' });
    api.setToken(null);
    await expect(api.getAll()).rejects.toMatchObject({ code: 'AUTH' });
  });
  it('seed dersleri ve konuları yüklü', async () => {
    const d = await api.getAll();
    expect(d.dersler.length).toBe(12);
    expect(d.kayitlar).toEqual([]);
  });
  it('kayıt ekler, doğrulama hatasında VALIDATION + detay', async () => {
    const row = await api.addRecord(input);
    expect(row).toMatchObject({ ...input, deneme_id: '', giren_kullanici: 'demo' });
    const err = (await api.addRecord({ ...input, bos: 1 }).catch((e) => e)) as ApiError;
    expect(err.code).toBe('VALIDATION');
    expect(err.details).toEqual({ toplam: MSG.toplam });
  });
  it('deneme ekler, günceller (satırları değiştirir) ve siler', async () => {
    const res = await api.addExam({
      ad: 'D1', tarih: '2026-09-20', sinif: 8,
      satirlar: [{ ders: 'Türkçe', soru: 20, dogru: 10, yanlis: 0, bos: 10 }, { ders: 'Matematik', soru: 20, dogru: 5, yanlis: 0, bos: 15 }],
    });
    expect(res.rows.map((r) => r.kaynak)).toEqual(['Deneme', 'Deneme']);
    await api.updateExam(res.exam.deneme_id, { ad: 'D1b', tarih: '2026-09-21', sinif: 8, satirlar: [{ ders: 'Türkçe', soru: 20, dogru: 12, yanlis: 0, bos: 8 }] });
    let d = await api.getAll();
    expect(d.denemeler).toEqual([{ deneme_id: res.exam.deneme_id, ad: 'D1b', tarih: '2026-09-21', sinif: 8 }]);
    expect(d.kayitlar).toHaveLength(1);
    await api.deleteExam(res.exam.deneme_id);
    d = await api.getAll();
    expect(d.denemeler).toEqual([]);
    expect(d.kayitlar).toEqual([]);
  });
  it('konu yeniden adlandırma geçmiş kayıtları da günceller', async () => {
    await api.addRecord(input);
    await api.renameTopic(8, 'Matematik', 'Kümeler', 'Kümeler ve İşlemler');
    const d = await api.getAll();
    expect(d.kayitlar[0].konu).toBe('Kümeler ve İşlemler');
    expect(d.konular).toContainEqual({ ders: 'Matematik', sinif: 8, konu: 'Kümeler ve İşlemler' });
  });
  it('ders yeniden adlandırmada çakışma VALIDATION', async () => {
    await expect(api.renameSubject(8, 'Matematik', 'türkçe')).rejects.toMatchObject({ code: 'VALIDATION' });
  });
  it('kullanıcı ekler; yeni kullanıcı giriş yapabilir; yanlış eski şifre reddedilir', async () => {
    await api.addUser('Anne', 'Anne', 'gizli123');
    await expect(api.login('anne', 'gizli123', true)).resolves.toMatchObject({ kullanici_adi: 'anne', ad: 'Anne' });
    await expect(api.changePassword('yanlis', 'yenisi123')).rejects.toMatchObject({ code: 'VALIDATION' });
  });
});
```

- [ ] **Step 2: Başarısız olduğunu doğrula**

Run: `npx vitest run tests/api`
Expected: FAIL — `src/api/api`, `http`, `mock`, `config` yok (seed testi geçer).

- [ ] **Step 3: `src/api/api.ts` yaz**

```ts
import type {
  AppData, ExamInput, ExamResult, FieldErrors, Grade, RecordInput, RecordRow, Subject, Topic,
} from '../lib/types';

export type ErrorCode = 'AUTH' | 'LOGIN' | 'VALIDATION' | 'NOT_FOUND' | 'NETWORK' | 'SERVER';

export class ApiError extends Error {
  code: ErrorCode;
  details: FieldErrors | null;

  constructor(code: ErrorCode, message: string, details: FieldErrors | null = null) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.details = details;
  }
}

export type Transport = (action: string, payload: unknown, token: string | null) => Promise<unknown>;

export interface Session {
  token: string;
  kullanici_adi: string;
  ad: string;
}

export function createApi(transport: Transport) {
  let token: string | null = null;
  const call = <T>(action: string, payload: unknown = {}) => transport(action, payload, token) as Promise<T>;
  return {
    setToken(t: string | null) {
      token = t;
    },
    login: (kullanici_adi: string, sifre: string, hatirla: boolean) => call<Session>('login', { kullanici_adi, sifre, hatirla }),
    logout: () => call<null>('logout'),
    getAll: () => call<AppData>('getAll'),
    addRecord: (input: RecordInput) => call<RecordRow>('addRecord', { input }),
    updateRecord: (id: string, input: RecordInput) => call<RecordRow>('updateRecord', { id, input }),
    deleteRecord: (id: string) => call<null>('deleteRecord', { id }),
    addExam: (input: ExamInput) => call<ExamResult>('addExam', { input }),
    updateExam: (deneme_id: string, input: ExamInput) => call<ExamResult>('updateExam', { deneme_id, input }),
    deleteExam: (deneme_id: string) => call<null>('deleteExam', { deneme_id }),
    saveSubjects: (dersler: Subject[]) => call<null>('saveSubjects', { dersler }),
    saveTopics: (konular: Topic[]) => call<null>('saveTopics', { konular }),
    renameSubject: (sinif: Grade, eski: string, yeni: string) => call<null>('renameSubject', { sinif, eski, yeni }),
    renameTopic: (sinif: Grade, ders: string, eski: string, yeni: string) => call<null>('renameTopic', { sinif, ders, eski, yeni }),
    addUser: (kullanici_adi: string, ad: string, sifre: string) => call<null>('addUser', { kullanici_adi, ad, sifre }),
    changePassword: (eski: string, yeni: string) => call<null>('changePassword', { eski, yeni }),
  };
}

export type Api = ReturnType<typeof createApi>;

export function errorMessage(e: unknown): string {
  if (e instanceof ApiError) {
    const first = e.details ? Object.values(e.details)[0] : undefined;
    return first ?? e.message;
  }
  return 'Beklenmeyen bir hata oluştu.';
}
```

- [ ] **Step 4: `src/api/http.ts` ve `src/api/config.ts` yaz**

`src/api/http.ts`:

```ts
import { ApiError, type ErrorCode, type Transport } from './api';
import type { FieldErrors } from '../lib/types';

interface Envelope {
  ok: boolean;
  data?: unknown;
  error?: ErrorCode;
  message?: string;
  details?: FieldErrors | null;
}

// text/plain: Apps Script CORS ön kontrolünü (preflight) desteklemez.
export function httpTransport(url: string, fetchFn: typeof fetch = (...a) => fetch(...a)): Transport {
  return async (action, payload, token) => {
    let res: Response;
    try {
      res = await fetchFn(url, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action, payload, token }),
        redirect: 'follow',
      });
    } catch {
      throw new ApiError('NETWORK', 'Sunucuya ulaşılamadı. İnternet bağlantınızı kontrol edin.');
    }
    if (!res.ok) throw new ApiError('SERVER', `Sunucu hatası (${res.status}).`);
    let body: Envelope;
    try {
      body = (await res.json()) as Envelope;
    } catch {
      throw new ApiError('SERVER', 'Sunucudan beklenmeyen yanıt geldi. Apps Script yayın ayarlarını kontrol edin.');
    }
    if (!body.ok) throw new ApiError(body.error ?? 'SERVER', body.message ?? 'Bilinmeyen hata.', body.details ?? null);
    return body.data ?? null;
  };
}
```

`src/api/config.ts`:

```ts
export type ApiConfig = { mode: 'http'; url: string } | { mode: 'mock' } | { mode: 'error'; message: string };

export function resolveApiConfig(env: { PROD: boolean; VITE_API_URL?: string }): ApiConfig {
  const url = env.VITE_API_URL?.trim();
  if (url) return { mode: 'http', url };
  if (env.PROD) {
    return {
      mode: 'error',
      message: 'Uygulama yapılandırılmamış: VITE_API_URL tanımlı değil. KURULUM.md 4. adıma bakın.',
    };
  }
  return { mode: 'mock' };
}
```

- [ ] **Step 5: `src/api/sample.ts` yaz**

```ts
import { format, parseISO, subDays } from 'date-fns';
import { seedSubjects, seedTopics } from './seed';
import type { Exam, RecordRow } from '../lib/types';

function lcg(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

// Geliştirme için: son 12 haftada zamanla iyileşen örnek 8. sınıf verisi.
export function sampleData(today: string): { kayitlar: RecordRow[]; denemeler: Exam[] } {
  const rnd = lcg(42);
  const day = (n: number) => format(subDays(parseISO(today), n), 'yyyy-MM-dd');
  const subjects = seedSubjects().filter((s) => s.sinif === 8);
  const topics = seedTopics().filter((t) => t.sinif === 8);
  const kayitlar: RecordRow[] = [];
  const denemeler: Exam[] = [];

  for (let i = 84; i >= 0; i -= 2) {
    const s = subjects[Math.floor(rnd() * subjects.length)];
    const ts = topics.filter((t) => t.ders === s.ders);
    const soru = 10 + Math.floor(rnd() * 4) * 5;
    const skill = 0.5 + ((84 - i) / 84) * 0.25 + (rnd() - 0.5) * 0.2;
    const dogru = Math.max(0, Math.min(soru, Math.round(soru * skill)));
    const yanlis = Math.round((soru - dogru) * 0.6);
    const tarih = day(i);
    kayitlar.push({
      id: `s${i}`, tarih, sinif: 8, ders: s.ders, kaynak: rnd() < 0.5 ? 'Ödev' : 'Kendi Çözdüğü',
      konu: ts[Math.floor(rnd() * ts.length)]?.konu ?? '', soru, dogru, yanlis, bos: soru - dogru - yanlis,
      deneme_id: '', giren_kullanici: 'demo', olusturma_zamani: `${tarih}T18:00:00.000Z`,
    });
  }

  for (let k = 0; k < 4; k++) {
    const tarih = day(70 - k * 21);
    const deneme_id = `d${k}`;
    denemeler.push({ deneme_id, ad: `Deneme ${k + 1}`, tarih, sinif: 8 });
    for (const s of subjects) {
      const soru = s.deneme_soru_sayisi;
      const dogru = Math.max(0, Math.min(soru, Math.round(soru * (0.55 + k * 0.06 + (rnd() - 0.5) * 0.1))));
      const yanlis = Math.round((soru - dogru) * 0.7);
      kayitlar.push({
        id: `${deneme_id}-${s.ders}`, tarih, sinif: 8, ders: s.ders, kaynak: 'Deneme', konu: '', soru, dogru, yanlis,
        bos: soru - dogru - yanlis, deneme_id, giren_kullanici: 'demo', olusturma_zamani: `${tarih}T12:00:00.000Z`,
      });
    }
  }
  return { kayitlar, denemeler };
}
```

- [ ] **Step 6: `src/api/mock.ts` yaz**

```ts
import { ApiError, type Transport } from './api';
import { sampleData } from './sample';
import { seedSubjects, seedTopics } from './seed';
import { todayIso } from '../lib/periods';
import type { Exam, ExamInput, FieldErrors, RecordInput, RecordRow, Subject, Topic } from '../lib/types';
import { MSG, validateExam, validateRecord, validateSubjects, validateTopics } from '../lib/validation';

interface MockUser {
  kullanici_adi: string;
  ad: string;
  sifre: string;
}

interface MockDb {
  kayitlar: RecordRow[];
  denemeler: Exam[];
  dersler: Subject[];
  konular: Topic[];
  kullanicilar: MockUser[];
  tokens: Record<string, { u: string; exp: number }>;
}

export interface MockOptions {
  storage?: Storage | null;
  today?: string;
  latencyMs?: number;
  withSamples?: boolean;
}

const DB_KEY = 'goksenin-mock-db';
const DAY_MS = 86_400_000;
const AUTH_MSG = 'Oturumunuz sona erdi. Lütfen tekrar giriş yapın.';

function defaultStorage(): Storage | null {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

function requireValid(errs: FieldErrors): void {
  if (Object.keys(errs).length) throw new ApiError('VALIDATION', 'Formda hatalar var.', errs);
}

const lower = (s: string) => s.trim().toLocaleLowerCase('tr');

// Apps Script backend'inin (apps-script/Code.gs) tarayıcıda çalışan eşdeğeri; yalnızca geliştirme içindir.
export function createMockTransport(opts: MockOptions = {}): Transport {
  const storage = opts.storage === undefined ? defaultStorage() : opts.storage;
  const latency = opts.latencyMs ?? 350;
  const today = () => opts.today ?? todayIso();
  const now = () => new Date().toISOString();
  const newId = () => crypto.randomUUID();

  const load = (): MockDb | null => {
    if (!storage) return null;
    try {
      const raw = storage.getItem(DB_KEY);
      return raw ? (JSON.parse(raw) as MockDb) : null;
    } catch {
      return null;
    }
  };
  const fresh = (): MockDb => ({
    ...(opts.withSamples ?? true ? sampleData(today()) : { kayitlar: [], denemeler: [] }),
    dersler: seedSubjects(),
    konular: seedTopics(),
    kullanicilar: [{ kullanici_adi: 'demo', ad: 'Demo Kullanıcı', sifre: 'demo123' }],
    tokens: {},
  });
  const db: MockDb = load() ?? fresh();
  const persist = () => {
    if (!storage) return;
    try {
      storage.setItem(DB_KEY, JSON.stringify(db));
    } catch {
      /* depolama kapalı ya da dolu: bellekte devam */
    }
  };

  const userOf = (token: string | null): string => {
    const t = token ? db.tokens[token] : undefined;
    if (!t || t.exp < Date.now()) throw new ApiError('AUTH', AUTH_MSG);
    return t.u;
  };

  const cleanRecord = (r: RecordInput) => ({
    tarih: r.tarih, sinif: r.sinif, ders: r.ders.trim(), kaynak: r.kaynak, konu: (r.konu ?? '').trim(),
    soru: r.soru, dogru: r.dogru, yanlis: r.yanlis, bos: r.bos,
  });

  const findSingle = (id: string): number => {
    const i = db.kayitlar.findIndex((r) => r.id === id && r.deneme_id === '');
    if (i < 0) throw new ApiError('NOT_FOUND', 'Kayıt bulunamadı. Sayfayı yenileyin.');
    return i;
  };

  const findExam = (id: string): number => {
    const i = db.denemeler.findIndex((e) => e.deneme_id === id);
    if (i < 0) throw new ApiError('NOT_FOUND', 'Deneme bulunamadı. Sayfayı yenileyin.');
    return i;
  };

  const examRows = (exam: Exam, input: ExamInput, user: string, created: string): RecordRow[] =>
    input.satirlar.map((s) => ({
      id: newId(), tarih: exam.tarih, sinif: exam.sinif, ders: s.ders.trim(), kaynak: 'Deneme', konu: '',
      soru: s.soru, dogru: s.dogru, yanlis: s.yanlis, bos: s.bos, deneme_id: exam.deneme_id,
      giren_kullanici: user, olusturma_zamani: created,
    }));

  const handlers: Record<string, (p: Record<string, any>, user: string) => unknown> = {
    getAll: () => ({
      kayitlar: db.kayitlar, denemeler: db.denemeler, dersler: db.dersler, konular: db.konular,
      kullanicilar: db.kullanicilar.map(({ kullanici_adi, ad }) => ({ kullanici_adi, ad })),
    }),
    addRecord: (p, user) => {
      requireValid(validateRecord(p.input, today()));
      const row: RecordRow = { ...cleanRecord(p.input), id: newId(), deneme_id: '', giren_kullanici: user, olusturma_zamani: now() };
      db.kayitlar.push(row);
      return row;
    },
    updateRecord: (p) => {
      const i = findSingle(p.id);
      requireValid(validateRecord(p.input, today()));
      const old = db.kayitlar[i];
      db.kayitlar[i] = { ...cleanRecord(p.input), id: old.id, deneme_id: '', giren_kullanici: old.giren_kullanici, olusturma_zamani: old.olusturma_zamani };
      return db.kayitlar[i];
    },
    deleteRecord: (p) => {
      db.kayitlar.splice(findSingle(p.id), 1);
      return null;
    },
    addExam: (p, user) => {
      const input = p.input as ExamInput;
      requireValid(validateExam(input, today()));
      const exam: Exam = { deneme_id: newId(), ad: input.ad.trim(), tarih: input.tarih, sinif: input.sinif };
      const rows = examRows(exam, input, user, now());
      db.denemeler.push(exam);
      db.kayitlar.push(...rows);
      return { exam, rows };
    },
    updateExam: (p, user) => {
      const i = findExam(p.deneme_id);
      const input = p.input as ExamInput;
      requireValid(validateExam(input, today()));
      const exam: Exam = { deneme_id: db.denemeler[i].deneme_id, ad: input.ad.trim(), tarih: input.tarih, sinif: input.sinif };
      const old = db.kayitlar.filter((r) => r.deneme_id === exam.deneme_id);
      const rows = examRows(exam, input, old[0]?.giren_kullanici ?? user, old[0]?.olusturma_zamani ?? now());
      db.denemeler[i] = exam;
      db.kayitlar = [...db.kayitlar.filter((r) => r.deneme_id !== exam.deneme_id), ...rows];
      return { exam, rows };
    },
    deleteExam: (p) => {
      const i = findExam(p.deneme_id);
      db.kayitlar = db.kayitlar.filter((r) => r.deneme_id !== p.deneme_id);
      db.denemeler.splice(i, 1);
      return null;
    },
    saveSubjects: (p) => {
      const list = (p.dersler ?? []) as Subject[];
      requireValid(validateSubjects(list));
      db.dersler = list.map((s) => ({ ...s, ders: s.ders.trim() }));
      return null;
    },
    saveTopics: (p) => {
      const list = (p.konular ?? []) as Topic[];
      requireValid(validateTopics(list));
      db.konular = list.map((t) => ({ ...t, ders: t.ders.trim(), konu: t.konu.trim() }));
      return null;
    },
    renameSubject: (p) => {
      const eski = String(p.eski ?? '').trim();
      const yeni = String(p.yeni ?? '').trim();
      if (!yeni) throw new ApiError('VALIDATION', MSG.ders, { yeni: MSG.ders });
      if (eski === yeni) return null;
      if (db.dersler.some((s) => s.sinif === p.sinif && s.ders !== eski && lower(s.ders) === lower(yeni))) {
        throw new ApiError('VALIDATION', MSG.tekrar, { yeni: MSG.tekrar });
      }
      const hit = (o: { sinif: number; ders: string }) => o.sinif === p.sinif && o.ders === eski;
      db.dersler = db.dersler.map((s) => (hit(s) ? { ...s, ders: yeni } : s));
      db.konular = db.konular.map((t) => (hit(t) ? { ...t, ders: yeni } : t));
      db.kayitlar = db.kayitlar.map((r) => (hit(r) ? { ...r, ders: yeni } : r));
      return null;
    },
    renameTopic: (p) => {
      const eski = String(p.eski ?? '').trim();
      const yeni = String(p.yeni ?? '').trim();
      if (!yeni) throw new ApiError('VALIDATION', MSG.konu, { yeni: MSG.konu });
      if (eski === yeni) return null;
      if (db.konular.some((t) => t.sinif === p.sinif && t.ders === p.ders && t.konu !== eski && lower(t.konu) === lower(yeni))) {
        throw new ApiError('VALIDATION', MSG.tekrar, { yeni: MSG.tekrar });
      }
      const hit = (o: { sinif: number; ders: string; konu: string }) => o.sinif === p.sinif && o.ders === p.ders && o.konu === eski;
      db.konular = db.konular.map((t) => (hit(t) ? { ...t, konu: yeni } : t));
      db.kayitlar = db.kayitlar.map((r) => (hit(r) ? { ...r, konu: yeni } : r));
      return null;
    },
    addUser: (p) => {
      const u = String(p.kullanici_adi ?? '').trim().toLowerCase();
      const ad = String(p.ad ?? '').trim();
      const sifre = String(p.sifre ?? '');
      const errs: FieldErrors = {};
      if (!/^[a-z0-9._-]{3,30}$/.test(u)) errs.kullanici_adi = MSG.kullaniciAdi;
      else if (db.kullanicilar.some((x) => x.kullanici_adi === u)) errs.kullanici_adi = MSG.tekrar;
      if (!ad) errs.ad = MSG.adSoyad;
      if (sifre.length < 6) errs.sifre = MSG.sifre;
      requireValid(errs);
      db.kullanicilar.push({ kullanici_adi: u, ad, sifre });
      return null;
    },
    changePassword: (p, user) => {
      const me = db.kullanicilar.find((x) => x.kullanici_adi === user);
      if (!me) throw new ApiError('AUTH', AUTH_MSG);
      const errs: FieldErrors = {};
      if (String(p.eski ?? '') !== me.sifre) errs.eski = MSG.eskiSifre;
      if (String(p.yeni ?? '').length < 6) errs.yeni = MSG.sifre;
      requireValid(errs);
      me.sifre = String(p.yeni);
      return null;
    },
  };

  return async (action, payload, token) => {
    if (latency) await new Promise((r) => setTimeout(r, latency));
    const p = (payload ?? {}) as Record<string, any>;
    if (action === 'login') {
      const u = String(p.kullanici_adi ?? '').trim().toLowerCase();
      const me = db.kullanicilar.find((x) => x.kullanici_adi === u);
      if (!me || me.sifre !== String(p.sifre ?? '')) throw new ApiError('LOGIN', 'Kullanıcı adı veya şifre hatalı.');
      const t = newId();
      db.tokens[t] = { u: me.kullanici_adi, exp: Date.now() + (p.hatirla ? 30 : 1) * DAY_MS };
      persist();
      return { token: t, kullanici_adi: me.kullanici_adi, ad: me.ad };
    }
    const user = userOf(token);
    if (action === 'logout') {
      delete db.tokens[token!];
      persist();
      return null;
    }
    const h = handlers[action];
    if (!h) throw new ApiError('SERVER', `Bilinmeyen işlem: ${action}`);
    const result = h(p, user);
    persist();
    return structuredClone(result ?? null);
  };
}
```

- [ ] **Step 7: `src/api/index.ts` yaz**

```ts
import { createApi } from './api';
import { resolveApiConfig } from './config';
import { httpTransport } from './http';
import { createMockTransport } from './mock';

export const apiConfig = resolveApiConfig({ PROD: import.meta.env.PROD, VITE_API_URL: import.meta.env.VITE_API_URL });

export const defaultApi = createApi(apiConfig.mode === 'http' ? httpTransport(apiConfig.url) : createMockTransport());
```

- [ ] **Step 8: Testleri çalıştır**

Run: `npx vitest run tests/api && npx tsc --noEmit`
Expected: PASS; tip hatası yok.

- [ ] **Step 9: Commit**

```bash
git add src/api tests/api
git commit -m "feat: API katmanı — Apps Script transport, mock backend, yapılandırma koruması"
```

---
### Task 10: Uygulama kabuğu — tasarım sistemi, oturum, veri bağlamı, yerleşim, giriş sayfası

**Files:**
- Modify: `src/index.css` (tamamen değişir), `src/App.tsx` (tamamen değişir)
- Create: `src/state/AuthContext.tsx`, `src/state/DataContext.tsx`, `src/state/useDraft.ts`, `src/state/useAction.ts`, `src/components/ui.ts`, `src/components/Card.tsx`, `src/components/Field.tsx`, `src/components/Segmented.tsx`, `src/components/StatCard.tsx`, `src/components/TrendBadge.tsx`, `src/components/EmptyState.tsx`, `src/components/PageHeader.tsx`, `src/components/IconButton.tsx`, `src/components/ThemeToggle.tsx`, `src/components/Layout.tsx`, `src/pages/LoginPage.tsx`, `tests/helpers/renderApp.tsx`
- Test: `tests/pages/login.test.tsx`

**Interfaces:**
- Consumes: `Api, ApiError, Session, errorMessage, createApi, Transport` (api.ts); `createMockTransport` (mock.ts); `apiConfig, defaultApi` (index.ts); `Trend` (analysis.ts); `formatDelta` (net.ts); `AppData, RecordInput, RecordRow, ExamInput, ExamResult` (types.ts).
- Produces:
  - `AuthProvider({ api, initialSession?, children })`, `useAuth(): { api: Api; session: Session | null; expired: boolean; login(u, p, hatirla): Promise<void>; logout(): Promise<void>; expire(): void }`, `RequireAuth({ children })`; oturum `localStorage['goksenin-session']`
  - `DataProvider({ children })`, `useData(): { data: AppData | null; error: string | null; reload(): Promise<void>; saveRecord(input: RecordInput, id?: string): Promise<RecordRow>; removeRecord(id: string): Promise<void>; saveExam(input: ExamInput, id?: string): Promise<ExamResult>; removeExam(id: string): Promise<void>; runAndReload(fn: (api: Api) => Promise<unknown>): Promise<void> }`, `useAppData(): AppData` (Layout yalnızca veri yüklendikten sonra sayfaları çizer)
  - `useDraft<T>(key: string | null, init: () => T, revive?: (t: T) => T): [T, Dispatch<SetStateAction<T>>]`
  - `useAction(): { busy: boolean; error: string | null; setError(e: string | null): void; run(fn: () => Promise<unknown>): Promise<boolean> }`
  - `ui.ts`: `inputCls`, `inputSm`, `btnPrimary`, `btnGhost`, `btnSm`
  - Bileşenler: `Card({className?, label?, children})`, `CardTitle({children, actions?})`, `Field({label, error?, hint?, className?, children})`, `Segmented<T extends string>({label, value, onChange, options: {value: T; label: string}[]})` (role=tab), `StatCard({label, value, suffix?, trend?})`, `TrendBadge({trend, delta})`, `EmptyState({title, text?})`, `PageHeader({title, subtitle?, actions?})`, `IconButton({label, onClick, children, disabled?})`, `ThemeToggle()`, `Layout()` (Outlet)
  - `App({ api?: Api })` — `HashRouter`; `/giris` → `LoginPage`; korumalı yerleşim rotası; sonraki task'lar içine `Route` ekler
  - `tests/helpers/renderApp.tsx`: `renderApp(opts?: { route?: string; samples?: boolean; wrap?: (inner: Transport) => Transport; seed?: (api: Api) => Promise<void> }): Promise<{ api: Api; user: UserEvent; unmount(): void }>` ve `makeApi(wrap?)`

Bu task'a başlamadan **frontend-design** skill'ini yükle. Tasarım yönü: *"çalışma defteri"* — açık temada sıcak kâğıt zemini ve mürekkep rengi yazı, koyu temada gece çalışma masası; vurgu rengi fosforlu kalem turuncusu; başlıklar ve büyük sayılar Bricolage Grotesque, gövde IBM Plex Sans; sayılar `tabular-nums`. Skill ile token değerlerini (renk, gölge, köşe, boşluk) incelt, ama aşağıdaki token ADLARINI ve bileşen API'lerini koru — sonraki task'lar bunlara dayanır.

- [ ] **Step 1: `src/index.css` yaz (tasarım token'ları)**

```css
@import "tailwindcss";

@custom-variant dark (&:where([data-theme=dark], [data-theme=dark] *));

:root {
  --bg: #f6f3ec;
  --surface: #fffdf8;
  --surface-2: #efeae0;
  --ink: #1d1b17;
  --muted: #6d675c;
  --line: #e2dccd;
  --accent: #e8590c;
  --accent-ink: #ffffff;
  --good: #2b8a3e;
  --bad: #d6336c;
  color-scheme: light;
}

:root[data-theme="dark"] {
  --bg: #0f1115;
  --surface: #171a21;
  --surface-2: #20242d;
  --ink: #ece8df;
  --muted: #9a958a;
  --line: #2a2f3a;
  --accent: #ff8a3d;
  --accent-ink: #1d1b17;
  --good: #51cf66;
  --bad: #ff6b9a;
  color-scheme: dark;
}

@theme inline {
  --font-display: "Bricolage Grotesque", ui-sans-serif, system-ui, sans-serif;
  --font-sans: "IBM Plex Sans", ui-sans-serif, system-ui, sans-serif;
  --color-bg: var(--bg);
  --color-surface: var(--surface);
  --color-surface-2: var(--surface-2);
  --color-ink: var(--ink);
  --color-muted: var(--muted);
  --color-line: var(--line);
  --color-accent: var(--accent);
  --color-accent-ink: var(--accent-ink);
  --color-good: var(--good);
  --color-bad: var(--bad);
}

html,
body {
  background: var(--bg);
  color: var(--ink);
  font-family: var(--font-sans);
  -webkit-font-smoothing: antialiased;
}

input[type="number"]::-webkit-inner-spin-button,
input[type="number"]::-webkit-outer-spin-button {
  -webkit-appearance: none;
  margin: 0;
}
input[type="number"] {
  -moz-appearance: textfield;
}
```

- [ ] **Step 2: Durum kancalarını ve bağlamları yaz**

`src/state/useDraft.ts`:

```ts
import { useEffect, useState, type Dispatch, type SetStateAction } from 'react';

// Form taslağını localStorage'da tutar: oturum düşse ya da sayfa kapansa da yazılanlar kaybolmaz.
export function useDraft<T>(key: string | null, init: () => T, revive: (t: T) => T = (t) => t): [T, Dispatch<SetStateAction<T>>] {
  const [value, setValue] = useState<T>(() => {
    if (key) {
      try {
        const raw = localStorage.getItem(key);
        if (raw) return revive(JSON.parse(raw) as T);
      } catch {
        /* bozuk ya da erişilemeyen taslak: yok say */
      }
    }
    return init();
  });
  useEffect(() => {
    if (!key) return;
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* depolama kapalı */
    }
  }, [key, value]);
  return [value, setValue];
}
```

`src/state/useAction.ts`:

```ts
import { useCallback, useState } from 'react';
import { errorMessage } from '../api/api';

export function useAction() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const run = useCallback(async (fn: () => Promise<unknown>): Promise<boolean> => {
    setBusy(true);
    setError(null);
    try {
      await fn();
      return true;
    } catch (e) {
      setError(errorMessage(e));
      return false;
    } finally {
      setBusy(false);
    }
  }, []);
  return { busy, error, setError, run };
}
```

`src/state/AuthContext.tsx`:

```tsx
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router';
import type { Api, Session } from '../api/api';

const SESSION_KEY = 'goksenin-session';

function readSession(): Session | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    return null;
  }
}

function writeSession(s: Session | null): void {
  try {
    if (s) localStorage.setItem(SESSION_KEY, JSON.stringify(s));
    else localStorage.removeItem(SESSION_KEY);
  } catch {
    /* depolama kapalı */
  }
}

interface AuthValue {
  api: Api;
  session: Session | null;
  expired: boolean;
  login(kullanici_adi: string, sifre: string, hatirla: boolean): Promise<void>;
  logout(): Promise<void>;
  expire(): void;
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ api, initialSession, children }: { api: Api; initialSession?: Session | null; children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(() => {
    const s = initialSession !== undefined ? initialSession : readSession();
    api.setToken(s?.token ?? null); // alt bileşenlerin ilk isteğinden önce
    return s;
  });
  const [expired, setExpired] = useState(false);

  const apply = useCallback(
    (s: Session | null) => {
      api.setToken(s?.token ?? null);
      writeSession(s);
      setSession(s);
    },
    [api],
  );

  const login = useCallback(
    async (u: string, p: string, h: boolean) => {
      const s = await api.login(u, p, h);
      setExpired(false);
      apply(s);
    },
    [api, apply],
  );

  const logout = useCallback(async () => {
    try {
      await api.logout();
    } catch {
      /* sunucuya ulaşılamasa da yerelde çıkış yap */
    }
    apply(null);
  }, [api, apply]);

  const expire = useCallback(() => {
    setExpired(true);
    apply(null);
  }, [apply]);

  const value = useMemo(() => ({ api, session, expired, login, logout, expire }), [api, session, expired, login, logout, expire]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const v = useContext(AuthContext);
  if (!v) throw new Error('useAuth, AuthProvider içinde kullanılmalı');
  return v;
}

export function RequireAuth({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const location = useLocation();
  if (!session) return <Navigate to="/giris" replace state={{ from: location.pathname }} />;
  return <>{children}</>;
}
```

`src/state/DataContext.tsx`:

```tsx
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { ApiError, errorMessage, type Api } from '../api/api';
import type { AppData, ExamInput, ExamResult, RecordInput, RecordRow } from '../lib/types';
import { useAuth } from './AuthContext';

interface DataValue {
  data: AppData | null;
  error: string | null;
  reload(): Promise<void>;
  saveRecord(input: RecordInput, id?: string): Promise<RecordRow>;
  removeRecord(id: string): Promise<void>;
  saveExam(input: ExamInput, id?: string): Promise<ExamResult>;
  removeExam(id: string): Promise<void>;
  runAndReload(fn: (api: Api) => Promise<unknown>): Promise<void>;
}

const DataContext = createContext<DataValue | null>(null);

export function DataProvider({ children }: { children: ReactNode }) {
  const { api, expire } = useAuth();
  const [data, setData] = useState<AppData | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Oturum düşerse (AUTH) giriş sayfasına dön; diğer hatalar çağırana iletilir.
  const guard = useCallback(
    async <T,>(p: Promise<T>): Promise<T> => {
      try {
        return await p;
      } catch (e) {
        if (e instanceof ApiError && e.code === 'AUTH') expire();
        throw e;
      }
    },
    [expire],
  );

  const reload = useCallback(async () => {
    setError(null);
    try {
      setData(await guard(api.getAll()));
    } catch (e) {
      if (!(e instanceof ApiError && e.code === 'AUTH')) setError(errorMessage(e));
    }
  }, [api, guard]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const saveRecord = async (input: RecordInput, id?: string) => {
    const row = await guard(id ? api.updateRecord(id, input) : api.addRecord(input));
    setData((d) => d && { ...d, kayitlar: id ? d.kayitlar.map((r) => (r.id === id ? row : r)) : [...d.kayitlar, row] });
    return row;
  };

  const removeRecord = async (id: string) => {
    await guard(api.deleteRecord(id));
    setData((d) => d && { ...d, kayitlar: d.kayitlar.filter((r) => r.id !== id) });
  };

  const saveExam = async (input: ExamInput, id?: string) => {
    const res = await guard(id ? api.updateExam(id, input) : api.addExam(input));
    const eid = res.exam.deneme_id;
    setData(
      (d) =>
        d && {
          ...d,
          denemeler: [...d.denemeler.filter((e) => e.deneme_id !== eid), res.exam],
          kayitlar: [...d.kayitlar.filter((r) => r.deneme_id !== eid), ...res.rows],
        },
    );
    return res;
  };

  const removeExam = async (id: string) => {
    await guard(api.deleteExam(id));
    setData((d) => d && { ...d, denemeler: d.denemeler.filter((e) => e.deneme_id !== id), kayitlar: d.kayitlar.filter((r) => r.deneme_id !== id) });
  };

  const runAndReload = async (fn: (api: Api) => Promise<unknown>) => {
    await guard(fn(api));
    await reload();
  };

  return (
    <DataContext.Provider value={{ data, error, reload, saveRecord, removeRecord, saveExam, removeExam, runAndReload }}>
      {children}
    </DataContext.Provider>
  );
}

export function useData(): DataValue {
  const v = useContext(DataContext);
  if (!v) throw new Error('useData, DataProvider içinde kullanılmalı');
  return v;
}

export function useAppData(): AppData {
  const { data } = useData();
  if (!data) throw new Error('Veri henüz yüklenmedi');
  return data;
}
```

- [ ] **Step 3: Ortak bileşenleri yaz**

`src/components/ui.ts`:

```ts
export const inputCls =
  'w-full rounded-xl border border-line bg-surface-2 px-3 py-2.5 text-ink tabular-nums outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/30 disabled:opacity-60';
export const inputSm =
  'w-full min-w-14 rounded-lg border border-line bg-surface-2 px-2 py-1.5 text-center text-ink tabular-nums outline-none focus:border-accent focus:ring-2 focus:ring-accent/30';
export const btnPrimary =
  'inline-flex items-center justify-center gap-2 rounded-xl bg-accent px-5 py-2.5 font-semibold text-accent-ink shadow-sm transition hover:brightness-110 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-60';
export const btnGhost =
  'inline-flex items-center justify-center gap-2 rounded-xl border border-line px-4 py-2 font-medium text-ink transition hover:bg-surface-2 disabled:opacity-60';
export const btnSm =
  'inline-flex items-center justify-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-sm font-semibold text-accent-ink transition hover:brightness-110 disabled:opacity-60';
```

`src/components/Card.tsx`:

```tsx
import clsx from 'clsx';
import type { ReactNode } from 'react';

// label verilirse bölüm erişilebilir bir "region" olur (testler within(getByRole('region', { name })) ile kullanır).
export function Card({ className, label, children }: { className?: string; label?: string; children: ReactNode }) {
  return (
    <section aria-label={label} className={clsx('rounded-2xl border border-line bg-surface p-4 shadow-[0_1px_0_rgba(0,0,0,0.03)] sm:p-5', className)}>
      {children}
    </section>
  );
}

export function CardTitle({ children, actions }: { children: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <h2 className="font-display text-lg font-semibold tracking-tight">{children}</h2>
      {actions}
    </div>
  );
}
```

`src/components/Field.tsx`:

```tsx
import type { ReactNode } from 'react';

// Hata ve ipucu <label> dışında: erişilebilir ad yalnızca etiket metnidir (getByLabelText('Soru')).
export function Field({ label, error, hint, className, children }: { label: string; error?: string; hint?: string; className?: string; children: ReactNode }) {
  return (
    <div className={className}>
      <label className="block">
        <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-muted">{label}</span>
        {children}
      </label>
      {error ? (
        <p role="alert" className="mt-1 text-xs text-bad">{error}</p>
      ) : hint ? (
        <p className="mt-1 text-xs text-muted">{hint}</p>
      ) : null}
    </div>
  );
}
```

`src/components/Segmented.tsx`:

```tsx
import clsx from 'clsx';

export function Segmented<T extends string>({ label, value, onChange, options }: {
  label: string;
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
}) {
  return (
    <div role="tablist" aria-label={label} className="inline-flex max-w-full overflow-x-auto rounded-xl border border-line bg-surface-2 p-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="tab"
          aria-selected={o.value === value}
          onClick={() => onChange(o.value)}
          className={clsx(
            'whitespace-nowrap rounded-lg px-3.5 py-1.5 text-sm font-medium transition',
            o.value === value ? 'bg-surface text-ink shadow-sm' : 'text-muted hover:text-ink',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
```

`src/components/TrendBadge.tsx`:

```tsx
import clsx from 'clsx';
import { Minus, TrendingDown, TrendingUp } from 'lucide-react';
import type { Trend } from '../lib/analysis';
import { formatDelta } from '../lib/net';

const STYLE: Record<Trend, string> = {
  up: 'bg-good/15 text-good',
  down: 'bg-bad/15 text-bad',
  flat: 'bg-surface-2 text-muted',
  none: 'bg-surface-2 text-muted',
};
const ICON = { up: TrendingUp, down: TrendingDown, flat: Minus, none: Minus };
const LABEL: Record<Trend, string> = { up: 'İyileşme', down: 'Kötüleşme', flat: 'Sabit', none: 'Karşılaştırma yok' };

export function TrendBadge({ trend, delta }: { trend: Trend; delta: number | null }) {
  const Icon = ICON[trend];
  return (
    <span title={LABEL[trend]} className={clsx('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums', STYLE[trend])}>
      <Icon size={14} aria-hidden />
      <span>{formatDelta(delta)}</span>
      <span className="sr-only">{LABEL[trend]}</span>
    </span>
  );
}
```

`src/components/StatCard.tsx`:

```tsx
import clsx from 'clsx';
import type { Trend } from '../lib/analysis';

export function StatCard({ label, value, suffix, trend }: { label: string; value: string; suffix?: string; trend?: Trend }) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-muted">{label}</p>
      <p className={clsx('mt-2 font-display text-3xl font-semibold tabular-nums tracking-tight', trend === 'up' && 'text-good', trend === 'down' && 'text-bad')}>
        {value}
        {suffix && <span className="ml-1 font-sans text-sm font-normal text-muted">{suffix}</span>}
      </p>
    </div>
  );
}
```

`src/components/EmptyState.tsx`:

```tsx
export function EmptyState({ title, text }: { title: string; text?: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-line px-6 py-12 text-center">
      <p className="font-display text-lg font-semibold">{title}</p>
      {text && <p className="mt-1 text-sm text-muted">{text}</p>}
    </div>
  );
}
```

`src/components/PageHeader.tsx`:

```tsx
import type { ReactNode } from 'react';

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
      </div>
      {actions}
    </div>
  );
}
```

`src/components/IconButton.tsx`:

```tsx
import type { ReactNode } from 'react';

export function IconButton({ label, onClick, children, disabled }: { label: string; onClick: () => void; children: ReactNode; disabled?: boolean }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className="grid size-9 shrink-0 place-items-center rounded-lg text-muted transition hover:bg-surface-2 hover:text-ink disabled:opacity-40"
    >
      {children}
    </button>
  );
}
```

`src/components/ThemeToggle.tsx`:

```tsx
import { Moon, Sun } from 'lucide-react';
import { useState } from 'react';
import { IconButton } from './IconButton';

export function ThemeToggle() {
  const [theme, setTheme] = useState(() => document.documentElement.dataset.theme ?? 'light');
  const toggle = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem('goksenin-theme', next);
    } catch {
      /* depolama kapalı */
    }
    setTheme(next);
  };
  return (
    <IconButton label={theme === 'dark' ? 'Açık temaya geç' : 'Koyu temaya geç'} onClick={toggle}>
      {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
    </IconButton>
  );
}
```

`src/components/Layout.tsx`:

```tsx
import clsx from 'clsx';
import { ChartColumn, ListOrdered, LogOut, PencilLine, RotateCw, Settings } from 'lucide-react';
import { NavLink, Outlet } from 'react-router';
import { useAuth } from '../state/AuthContext';
import { useData } from '../state/DataContext';
import { IconButton } from './IconButton';
import { ThemeToggle } from './ThemeToggle';
import { btnGhost } from './ui';

const NAV = [
  { to: '/', label: 'Veri Girişi', icon: PencilLine, end: true },
  { to: '/analiz', label: 'Analiz', icon: ChartColumn, end: false },
  { to: '/siralama', label: 'Sıralama', icon: ListOrdered, end: false },
  { to: '/ayarlar', label: 'Ayarlar', icon: Settings, end: false },
];

function Brand() {
  return (
    <div className="flex items-center gap-2.5">
      <span className="grid size-9 place-items-center rounded-xl bg-accent font-display text-lg font-bold text-accent-ink">G</span>
      <div className="leading-tight">
        <p className="font-display text-base font-semibold">Göksenin</p>
        <p className="text-xs text-muted">Net Takip</p>
      </div>
    </div>
  );
}

export function Layout() {
  const { session, logout } = useAuth();
  const { data, error, reload } = useData();

  return (
    <div className="min-h-dvh bg-bg text-ink md:flex">
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r border-line p-5 md:flex">
        <Brand />
        <nav aria-label="Ana menü" className="mt-8 flex flex-col gap-1">
          {NAV.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.end}
              className={({ isActive }) =>
                clsx(
                  'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition',
                  isActive ? 'bg-accent text-accent-ink' : 'text-muted hover:bg-surface-2 hover:text-ink',
                )
              }
            >
              <n.icon size={18} aria-hidden />
              {n.label}
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto space-y-3">
          <p className="truncate text-sm text-muted">{session?.ad}</p>
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <IconButton label="Çıkış yap" onClick={() => void logout()}>
              <LogOut size={18} />
            </IconButton>
          </div>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <header className="flex items-center justify-between border-b border-line px-4 py-3 md:hidden">
          <Brand />
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <IconButton label="Çıkış yap" onClick={() => void logout()}>
              <LogOut size={18} />
            </IconButton>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-4 pb-28 pt-5 md:px-8 md:pb-12 md:pt-8">
          {error ? (
            <div role="alert" className="rounded-2xl border border-bad/40 bg-bad/10 p-5">
              <p className="font-medium">{error}</p>
              <button type="button" className={clsx(btnGhost, 'mt-3')} onClick={() => void reload()}>
                <RotateCw size={16} /> Tekrar dene
              </button>
            </div>
          ) : data ? (
            <Outlet />
          ) : (
            <div className="space-y-4" aria-busy="true" aria-label="Yükleniyor">
              <div className="h-10 w-48 animate-pulse rounded-xl bg-surface-2" />
              <div className="h-40 animate-pulse rounded-2xl bg-surface-2" />
              <div className="h-64 animate-pulse rounded-2xl bg-surface-2" />
            </div>
          )}
        </main>
      </div>

      <nav aria-label="Alt menü" className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-4 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
        {NAV.map((n) => (
          <NavLink
            key={n.to}
            to={n.to}
            end={n.end}
            className={({ isActive }) =>
              clsx('flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium', isActive ? 'text-accent' : 'text-muted')
            }
          >
            <n.icon size={20} aria-hidden />
            {n.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
```

- [ ] **Step 4: Giriş sayfasını ve App'i yaz**

`src/pages/LoginPage.tsx`:

```tsx
import { useState, type FormEvent } from 'react';
import { Navigate, useLocation } from 'react-router';
import { errorMessage } from '../api/api';
import { apiConfig } from '../api/index';
import { Field } from '../components/Field';
import { btnPrimary, inputCls } from '../components/ui';
import { useAuth } from '../state/AuthContext';

export function LoginPage() {
  const { login, session, expired } = useAuth();
  const location = useLocation();
  const [u, setU] = useState('');
  const [p, setP] = useState('');
  const [remember, setRemember] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  if (session) {
    const from = (location.state as { from?: string } | null)?.from;
    return <Navigate to={from && from !== '/giris' ? from : '/'} replace />;
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setErr(null);
    try {
      await login(u, p, remember);
    } catch (x) {
      setErr(errorMessage(x));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid min-h-dvh place-items-center bg-bg px-4 py-10 text-ink">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-accent font-display text-2xl font-bold text-accent-ink">G</span>
          <h1 className="mt-4 font-display text-3xl font-semibold tracking-tight">Göksenin Net Takip</h1>
          <p className="mt-1 text-sm text-muted">Deneme, ödev ve test sonuçları tek yerde</p>
        </div>
        <form onSubmit={submit} className="space-y-4 rounded-2xl border border-line bg-surface p-6">
          {expired && (
            <p role="status" className="rounded-xl bg-surface-2 px-3 py-2 text-sm">
              Oturumunuz sona erdi. Lütfen tekrar giriş yapın; yazdıklarınız kaybolmadı, formda duruyor.
            </p>
          )}
          <Field label="Kullanıcı adı">
            <input className={inputCls} autoComplete="username" autoCapitalize="none" value={u} onChange={(e) => setU(e.target.value)} required />
          </Field>
          <Field label="Şifre">
            <input className={inputCls} type="password" autoComplete="current-password" value={p} onChange={(e) => setP(e.target.value)} required />
          </Field>
          <label className="flex items-center gap-2 text-sm text-muted">
            <input type="checkbox" className="size-4 accent-[var(--accent)]" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
            Beni hatırla (30 gün)
          </label>
          {err && <p role="alert" className="text-sm text-bad">{err}</p>}
          <button type="submit" className={`${btnPrimary} w-full`} disabled={busy}>
            {busy ? 'Giriş yapılıyor…' : 'Giriş yap'}
          </button>
          {apiConfig.mode === 'mock' && <p className="text-center text-xs text-muted">Geliştirme modu — demo / demo123</p>}
        </form>
      </div>
    </div>
  );
}
```

`src/App.tsx`:

```tsx
import { HashRouter, Navigate, Route, Routes } from 'react-router';
import type { Api } from './api/api';
import { apiConfig, defaultApi } from './api/index';
import { Layout } from './components/Layout';
import { LoginPage } from './pages/LoginPage';
import { AuthProvider, RequireAuth } from './state/AuthContext';
import { DataProvider } from './state/DataContext';

function ConfigError({ message }: { message: string }) {
  return (
    <div className="grid min-h-dvh place-items-center bg-bg p-6 text-ink">
      <div role="alert" className="max-w-md rounded-2xl border border-bad/40 bg-surface p-6">
        <h1 className="font-display text-xl font-semibold">Kurulum tamamlanmamış</h1>
        <p className="mt-2 text-sm text-muted">{message}</p>
      </div>
    </div>
  );
}

export function App({ api = defaultApi }: { api?: Api }) {
  if (apiConfig.mode === 'error') return <ConfigError message={apiConfig.message} />;
  return (
    <HashRouter>
      <AuthProvider api={api}>
        <Routes>
          <Route path="/giris" element={<LoginPage />} />
          <Route
            element={
              <RequireAuth>
                <DataProvider>
                  <Layout />
                </DataProvider>
              </RequireAuth>
            }
          >
            {/* Sayfa rotaları Task 11-14'te buraya eklenir. */}
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </HashRouter>
  );
}
```

Not: Task 10 sonunda `/` rotası yerleşimi boş `Outlet` ile gösterir; bu, Task 11'de `index` rotası eklenince dolar.

- [ ] **Step 5: Test yardımcılarını yaz**

`tests/helpers/renderApp.tsx`:

```tsx
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createApi, type Api, type Transport } from '../../src/api/api';
import { createMockTransport } from '../../src/api/mock';
import { App } from '../../src/App';

export function makeApi(wrap?: (inner: Transport) => Transport, samples = false): Api {
  const inner = createMockTransport({ storage: null, latencyMs: 0, withSamples: samples });
  return createApi(wrap ? wrap(inner) : inner);
}

export async function renderApp(opts: {
  route?: string;
  samples?: boolean;
  wrap?: (inner: Transport) => Transport;
  seed?: (api: Api) => Promise<void>;
} = {}) {
  localStorage.clear();
  const api = makeApi(opts.wrap, opts.samples);
  const session = await api.login('demo', 'demo123', true);
  api.setToken(session.token);
  if (opts.seed) await opts.seed(api);
  localStorage.setItem('goksenin-session', JSON.stringify(session));
  window.location.hash = opts.route ?? '#/';
  const user = userEvent.setup();
  const utils = render(<App api={api} />);
  return { api, user, unmount: utils.unmount };
}
```

- [ ] **Step 6: Başarısız giriş testlerini yaz**

`tests/pages/login.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { ApiError } from '../../src/api/api';
import { App } from '../../src/App';
import { makeApi, renderApp } from '../helpers/renderApp';

beforeEach(() => {
  localStorage.clear();
  window.location.hash = '';
});

async function loginAs(user: ReturnType<typeof userEvent.setup>, u: string, p: string) {
  await user.type(screen.getByLabelText('Kullanıcı adı'), u);
  await user.type(screen.getByLabelText('Şifre'), p);
  await user.click(screen.getByRole('button', { name: 'Giriş yap' }));
}

describe('giriş', () => {
  it('oturum yoksa giriş sayfası gelir; hatalı şifrede mesaj gösterir', async () => {
    const user = userEvent.setup();
    render(<App api={makeApi()} />);
    await loginAs(user, 'demo', 'yanlis');
    expect(await screen.findByText('Kullanıcı adı veya şifre hatalı.')).toBeInTheDocument();
  });

  it('doğru girişte menü görünür ve oturum saklanır', async () => {
    const user = userEvent.setup();
    render(<App api={makeApi()} />);
    await loginAs(user, 'demo', 'demo123');
    expect((await screen.findAllByRole('link', { name: /Analiz/ })).length).toBeGreaterThan(0);
    expect(JSON.parse(localStorage.getItem('goksenin-session')!).kullanici_adi).toBe('demo');
  });

  it('sunucu AUTH dönerse giriş sayfasına döner ve oturumun bittiğini söyler', async () => {
    let expireNow = false;
    await renderApp({
      wrap: (inner) => async (a, p, t) => {
        if (expireNow && a !== 'login') throw new ApiError('AUTH', 'Oturumunuz sona erdi. Lütfen tekrar giriş yapın.');
        expireNow = true; // login sonrası ilk getAll'dan itibaren
        return inner(a, p, t);
      },
    });
    expect(await screen.findByText(/Oturumunuz sona erdi/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Giriş yap' })).toBeInTheDocument();
    expect(localStorage.getItem('goksenin-session')).toBeNull();
  });

  it('çıkış yapınca giriş sayfasına döner', async () => {
    const { user } = await renderApp();
    await user.click((await screen.findAllByRole('button', { name: 'Çıkış yap' }))[0]);
    expect(await screen.findByRole('button', { name: 'Giriş yap' })).toBeInTheDocument();
  });
});
```

- [ ] **Step 7: Testlerin önce başarısız olduğunu, sonra geçtiğini doğrula**

Step 1-5'teki dosyaları yazmadan önce testi çalıştırdıysan `Cannot find module` ile başarısız olmalıydı. Şimdi:

Run: `npx vitest run tests/pages/login.test.tsx`
Expected: 4 test PASS. (React Router `HashRouter`'ı `react-router` paketinden dışa aktarmıyorsa: `npm ls react-router` ile sürümü kontrol et ve `react-router-dom`'dan içe aktar.)

- [ ] **Step 8: Tüm testleri ve derlemeyi çalıştır, geliştirme sunucusunda bak**

Run: `npx vitest run && npm run build`
Expected: tümü PASS, build başarılı.
Run: `npm run dev` → `http://localhost:5173` aç, `demo / demo123` ile gir; masaüstünde sol menü, dar pencerede alt menü, tema düğmesi çalışıyor olmalı. Sunucuyu durdur.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: tasarım sistemi, oturum ve veri bağlamı, yerleşim ve giriş sayfası"
```

---

### Task 11: Veri girişi sayfası (tek kayıt, toplu deneme, son kayıtlar)

**Files:**
- Create: `src/components/CountInputs.tsx`, `src/pages/entry/SingleForm.tsx`, `src/pages/entry/ExamForm.tsx`, `src/pages/entry/RecentList.tsx`, `src/pages/entry/EntryPage.tsx`
- Modify: `src/App.tsx` (index rotası)
- Test: `tests/pages/entry.test.tsx`

**Interfaces:**
- Consumes: `useAppData, useData` (DataContext); `useDraft`; `CountDraft, ExamRowDraft, EMPTY_COUNTS, autoBlank, draftCounts, examRowsFromDrafts, isRowEmpty, remapRowErrors` (drafts.ts); `validateRecord, validateExam, countErrors` (validation.ts); `net, netRate, totals, formatNet, formatRate` (net.ts); `subjectsFor, topicsFor` (catalog.ts); `recentItems, RecentItem` (recent.ts); `subjectColor`; `todayIso, formatDateTr`; `ApiError, errorMessage`; bileşenler.
- Produces: `EntryPage()`; `CountInputs({ value: CountDraft; onChange(v: CountDraft): void; errors: FieldErrors })`; taslak anahtarları `goksenin-draft-Ödev`, `goksenin-draft-Kendi Çözdüğü`, `goksenin-draft-Deneme`; seçili sekme `goksenin-entry-tab`.

- [ ] **Step 1: Başarısız testleri yaz**

`tests/pages/entry.test.tsx`:

```tsx
import { render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../../src/api/api';
import { App } from '../../src/App';
import { MSG } from '../../src/lib/validation';
import { renderApp } from '../helpers/renderApp';

beforeEach(() => {
  vi.spyOn(window, 'confirm').mockReturnValue(true);
});

type User = Awaited<ReturnType<typeof renderApp>>['user'];

async function openTab(user: User, name: string) {
  await user.click(await screen.findByRole('tab', { name }));
}

async function fill(user: User, label: string, value: string) {
  const el = screen.getByLabelText(label);
  await user.clear(el);
  await user.type(el, value);
}

describe('Ödev / Kendi Çözdüğü formu', () => {
  it('boşu otomatik hesaplar, canlı neti gösterir ve kaydeder', async () => {
    const { user, api } = await renderApp();
    await openTab(user, 'Ödev');
    await user.selectOptions(screen.getByLabelText('Ders'), 'Matematik');
    await user.selectOptions(screen.getByLabelText('Konu'), 'Çarpanlar ve Katlar');
    await fill(user, 'Soru', '25');
    await fill(user, 'Doğru', '16');
    await fill(user, 'Yanlış', '4');
    expect(screen.getByLabelText('Boş')).toHaveValue(5);
    expect(screen.getByTestId('live-net')).toHaveTextContent('15');
    await user.click(screen.getByRole('button', { name: 'Kaydet' }));
    expect(await screen.findByRole('status')).toHaveTextContent('Kaydedildi');
    const d = await api.getAll();
    expect(d.kayitlar).toHaveLength(1);
    expect(d.kayitlar[0]).toMatchObject({ ders: 'Matematik', konu: 'Çarpanlar ve Katlar', kaynak: 'Ödev', soru: 25, dogru: 16, yanlis: 4, bos: 5 });
    expect(screen.getByLabelText('Soru')).toHaveValue(null); // sayılar sıfırlanır
    expect(within(screen.getByRole('list', { name: 'Son kayıtlar' })).getByText('Matematik')).toBeInTheDocument();
  });

  it('toplam tutmazsa kaydetmez ve hatayı gösterir', async () => {
    const { user, api } = await renderApp();
    await openTab(user, 'Kendi Çözdüğü');
    await fill(user, 'Soru', '25');
    await fill(user, 'Doğru', '16');
    await fill(user, 'Yanlış', '4');
    await fill(user, 'Boş', '4');
    await user.click(screen.getByRole('button', { name: 'Kaydet' }));
    expect(await screen.findByText(MSG.toplam)).toBeInTheDocument();
    expect((await api.getAll()).kayitlar).toHaveLength(0);
  });

  it('kaydederken düğme kilitlenir; ağ hatasında değerler korunur ve tekrar denenebilir', async () => {
    let calls = 0;
    let release: (() => void) | undefined;
    const { user } = await renderApp({
      wrap: (inner) => async (a, p, t) => {
        if (a === 'addRecord') {
          calls += 1;
          if (calls === 1) {
            await new Promise<void>((r) => { release = r; });
            throw new ApiError('NETWORK', 'Sunucuya ulaşılamadı. İnternet bağlantınızı kontrol edin.');
          }
        }
        return inner(a, p, t);
      },
    });
    await openTab(user, 'Ödev');
    await fill(user, 'Soru', '10');
    await fill(user, 'Doğru', '6');
    await fill(user, 'Yanlış', '2');
    await user.click(screen.getByRole('button', { name: 'Kaydet' }));
    const busy = screen.getByRole('button', { name: 'Kaydediliyor…' });
    expect(busy).toBeDisabled();
    await user.click(busy);
    await waitFor(() => expect(release).toBeDefined());
    release!();
    expect(await screen.findByText(/Sunucuya ulaşılamadı/)).toBeInTheDocument();
    expect(calls).toBe(1);
    expect(screen.getByLabelText('Soru')).toHaveValue(10);
    await user.click(screen.getByRole('button', { name: 'Tekrar dene' }));
    expect(await screen.findByRole('status')).toHaveTextContent('Kaydedildi');
    expect(calls).toBe(2);
  });

  it('oturum kayıt sırasında düşerse girişten sonra yazılanlar formda durur', async () => {
    let failed = false;
    const { user, api } = await renderApp({
      wrap: (inner) => async (a, p, t) => {
        if (a === 'addRecord' && !failed) {
          failed = true;
          throw new ApiError('AUTH', 'Oturumunuz sona erdi. Lütfen tekrar giriş yapın.');
        }
        return inner(a, p, t);
      },
    });
    await openTab(user, 'Ödev');
    await fill(user, 'Soru', '12');
    await fill(user, 'Doğru', '7');
    await user.click(screen.getByRole('button', { name: 'Kaydet' }));
    expect(await screen.findByText(/Oturumunuz sona erdi/)).toBeInTheDocument();
    await user.type(screen.getByLabelText('Kullanıcı adı'), 'demo');
    await user.type(screen.getByLabelText('Şifre'), 'demo123');
    await user.click(screen.getByRole('button', { name: 'Giriş yap' }));
    expect(await screen.findByLabelText('Soru')).toHaveValue(12);
    expect(screen.getByLabelText('Doğru')).toHaveValue(7);
    await user.click(screen.getByRole('button', { name: 'Kaydet' }));
    expect(await screen.findByRole('status')).toHaveTextContent('Kaydedildi');
    expect((await api.getAll()).kayitlar).toHaveLength(1);
  });

  it('taslak sayfa yeniden açıldığında geri gelir', async () => {
    const { user, api, unmount } = await renderApp();
    await openTab(user, 'Ödev');
    await fill(user, 'Soru', '25');
    unmount();
    render(<App api={api} />);
    expect(await screen.findByLabelText('Soru')).toHaveValue(25);
  });
});

describe('Deneme formu', () => {
  it('tüm dersleri satır satır gösterir, toplam neti hesaplar, boş satırları kaydetmez', async () => {
    const { user, api } = await renderApp();
    await openTab(user, 'Deneme');
    await user.type(screen.getByLabelText('Deneme adı'), 'Özdebir 3');
    expect(screen.getByLabelText('Türkçe soru')).toHaveValue(20);
    expect(screen.getByLabelText('İngilizce soru')).toHaveValue(10);
    await user.type(screen.getByLabelText('Türkçe doğru'), '15');
    await user.type(screen.getByLabelText('Türkçe yanlış'), '4');
    await user.type(screen.getByLabelText('Matematik doğru'), '10');
    expect(screen.getByLabelText('Türkçe boş')).toHaveValue(1);
    expect(screen.getByTestId('exam-total')).toHaveTextContent('24');
    await user.click(screen.getByRole('button', { name: 'Denemeyi kaydet' }));
    expect(await screen.findByRole('status')).toHaveTextContent('Kaydedildi');
    const d = await api.getAll();
    expect(d.denemeler).toHaveLength(1);
    expect(d.kayitlar.map((r) => r.ders).sort()).toEqual(['Matematik', 'Türkçe']);
  });

  it('satır hatası ilgili satırın altında görünür', async () => {
    const { user } = await renderApp();
    await openTab(user, 'Deneme');
    await user.type(screen.getByLabelText('Deneme adı'), 'X');
    await user.type(screen.getByLabelText('Matematik doğru'), '15');
    await user.type(screen.getByLabelText('Matematik yanlış'), '9');
    await user.click(screen.getByRole('button', { name: 'Denemeyi kaydet' }));
    expect(await screen.findByText(MSG.toplam)).toBeInTheDocument();
  });
});

describe('Son kayıtlar', () => {
  it('düzenle formu doldurur, sil kaydı kaldırır', async () => {
    const { user, api } = await renderApp({
      seed: async (a) => {
        await a.addRecord({ tarih: '2026-09-20', sinif: 8, ders: 'Fen Bilimleri', kaynak: 'Kendi Çözdüğü', konu: 'Basınç', soru: 10, dogru: 7, yanlis: 1, bos: 2 });
      },
    });
    const list = await screen.findByRole('list', { name: 'Son kayıtlar' });
    await user.click(within(list).getByRole('button', { name: 'Fen Bilimleri düzenle' }));
    expect(screen.getByRole('tab', { name: 'Kendi Çözdüğü' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByLabelText('Doğru')).toHaveValue(7);
    await fill(user, 'Doğru', '8');
    await fill(user, 'Yanlış', '0');
    await user.click(screen.getByRole('button', { name: 'Güncelle' }));
    await waitFor(async () => expect((await api.getAll()).kayitlar[0].dogru).toBe(8));
    await user.click(within(screen.getByRole('list', { name: 'Son kayıtlar' })).getByRole('button', { name: 'Fen Bilimleri sil' }));
    await waitFor(async () => expect((await api.getAll()).kayitlar).toHaveLength(0));
    expect(await screen.findByText('Henüz kayıt yok')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Başarısız olduğunu doğrula**

Run: `npx vitest run tests/pages/entry.test.tsx`
Expected: FAIL — `tab "Ödev"` bulunamıyor (sayfa yok).

- [ ] **Step 3: `src/components/CountInputs.tsx` yaz**

```tsx
import type { ChangeEvent } from 'react';
import { autoBlank, type CountDraft } from '../lib/drafts';
import type { FieldErrors } from '../lib/types';
import { Field } from './Field';
import { inputCls } from './ui';

export function CountInputs({ value, onChange, errors }: { value: CountDraft; onChange: (v: CountDraft) => void; errors: FieldErrors }) {
  const bos = value.bosManual ? value.bos : autoBlank(value.soru, value.dogru, value.yanlis);
  const set = (k: 'soru' | 'dogru' | 'yanlis') => (e: ChangeEvent<HTMLInputElement>) => onChange({ ...value, [k]: e.target.value });
  const num = { type: 'number', inputMode: 'numeric', min: 0, step: 1, className: inputCls } as const;
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <Field label="Soru" error={errors.soru}>
        <input {...num} min={1} value={value.soru} onChange={set('soru')} />
      </Field>
      <Field label="Doğru" error={errors.dogru}>
        <input {...num} value={value.dogru} onChange={set('dogru')} />
      </Field>
      <Field label="Yanlış" error={errors.yanlis}>
        <input {...num} value={value.yanlis} onChange={set('yanlis')} />
      </Field>
      <Field label="Boş" error={errors.bos} hint={value.bosManual ? 'elle girildi' : 'otomatik'}>
        <input {...num} value={bos} onChange={(e) => onChange({ ...value, bos: e.target.value, bosManual: true })} />
      </Field>
    </div>
  );
}
```

- [ ] **Step 4: `src/pages/entry/SingleForm.tsx` yaz**

```tsx
import { useEffect, useRef, useState } from 'react';
import { ApiError, errorMessage } from '../../api/api';
import { CountInputs } from '../../components/CountInputs';
import { Field } from '../../components/Field';
import { btnGhost, btnPrimary, inputCls } from '../../components/ui';
import { subjectsFor, topicsFor } from '../../lib/catalog';
import { EMPTY_COUNTS, draftCounts, type CountDraft } from '../../lib/drafts';
import { formatNet, formatRate, net, netRate } from '../../lib/net';
import { todayIso } from '../../lib/periods';
import type { FieldErrors, Grade, RecordInput, RecordRow, SingleSource } from '../../lib/types';
import { countErrors, validateRecord } from '../../lib/validation';
import { useAppData, useData } from '../../state/DataContext';
import { useDraft } from '../../state/useDraft';

interface SingleDraft {
  tarih: string;
  sinif: Grade;
  ders: string;
  konu: string;
  counts: CountDraft;
}

const isEmptyCounts = (c: CountDraft) => !c.soru && !c.dogru && !c.yanlis && !c.bos;

function fromRecord(r: RecordRow): SingleDraft {
  return {
    tarih: r.tarih, sinif: r.sinif, ders: r.ders, konu: r.konu,
    counts: { soru: String(r.soru), dogru: String(r.dogru), yanlis: String(r.yanlis), bos: String(r.bos), bosManual: false },
  };
}

export function SingleForm({ kaynak, editing, onDone }: { kaynak: SingleSource; editing?: RecordRow; onDone: () => void }) {
  const data = useAppData();
  const { saveRecord } = useData();
  const [draft, setDraft] = useDraft<SingleDraft>(
    editing ? null : `goksenin-draft-${kaynak}`,
    () => (editing ? fromRecord(editing) : { tarih: todayIso(), sinif: 8, ders: '', konu: '', counts: EMPTY_COUNTS }),
    (d) => (isEmptyCounts(d.counts) ? { ...d, tarih: todayIso() } : d),
  );
  const [errors, setErrors] = useState<FieldErrors>({});
  const [saving, setSaving] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const inFlight = useRef(false);

  useEffect(() => {
    if (!savedAt) return;
    const t = setTimeout(() => setSavedAt(null), 3000);
    return () => clearTimeout(t);
  }, [savedAt]);

  const subjects = subjectsFor(data.dersler, draft.sinif);
  const keepOld = editing && draft.ders === editing.ders;
  const ders = subjects.some((s) => s.ders === draft.ders) || keepOld ? draft.ders : (subjects[0]?.ders ?? '');
  const topics = topicsFor(data.konular, draft.sinif, ders);
  const konuOptions = draft.konu && !topics.includes(draft.konu) ? [draft.konu, ...topics] : topics;
  const counts = draftCounts(draft.counts);
  const liveOk = Object.keys(countErrors(counts)).length === 0;
  const liveNet = net(counts.dogru, counts.yanlis);
  const patch = (p: Partial<SingleDraft>) => setDraft((d) => ({ ...d, ...p }));

  async function save() {
    if (inFlight.current) return;
    const input: RecordInput = { tarih: draft.tarih, sinif: draft.sinif, ders, kaynak, konu: draft.konu, ...counts };
    const errs = validateRecord(input, todayIso());
    setErrors(errs);
    setFailure(null);
    if (Object.keys(errs).length) return;
    inFlight.current = true;
    setSaving(true);
    try {
      await saveRecord(input, editing?.id);
      setSavedAt(Date.now());
      if (editing) onDone();
      else setDraft((d) => ({ ...d, ders, counts: EMPTY_COUNTS }));
    } catch (e) {
      if (e instanceof ApiError && e.code === 'VALIDATION' && e.details) setErrors(e.details);
      else if (!(e instanceof ApiError && e.code === 'AUTH')) setFailure(errorMessage(e));
    } finally {
      inFlight.current = false;
      setSaving(false);
    }
  }

  return (
    <form noValidate onSubmit={(e) => { e.preventDefault(); void save(); }} className="space-y-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Field label="Tarih" error={errors.tarih}>
          <input type="date" max={todayIso()} className={inputCls} value={draft.tarih} onChange={(e) => patch({ tarih: e.target.value })} />
        </Field>
        <Field label="Sınıf" error={errors.sinif}>
          <select className={inputCls} value={draft.sinif} onChange={(e) => patch({ sinif: Number(e.target.value) as Grade, ders: '', konu: '' })}>
            <option value={7}>7. sınıf</option>
            <option value={8}>8. sınıf</option>
          </select>
        </Field>
        <Field label="Ders" error={errors.ders}>
          <select className={inputCls} value={ders} onChange={(e) => patch({ ders: e.target.value, konu: '' })}>
            {subjects.map((s) => (
              <option key={s.ders} value={s.ders}>{s.ders}</option>
            ))}
            {keepOld && !subjects.some((s) => s.ders === ders) && <option value={ders}>{ders}</option>}
          </select>
        </Field>
        <Field label="Konu">
          <select className={inputCls} value={draft.konu} onChange={(e) => patch({ konu: e.target.value })}>
            <option value="">— Konu seçilmedi —</option>
            {konuOptions.map((k) => (
              <option key={k} value={k}>{k}</option>
            ))}
          </select>
        </Field>
      </div>

      <CountInputs value={draft.counts} onChange={(c) => setDraft((d) => ({ ...d, counts: c }))} errors={errors} />
      {errors.toplam && <p role="alert" className="text-sm text-bad">{errors.toplam}</p>}

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-surface-2 px-4 py-3">
        <p className="flex items-baseline gap-2 text-sm text-muted">
          Net
          <span data-testid="live-net" className="font-display text-2xl font-semibold text-ink tabular-nums">
            {liveOk ? formatNet(liveNet) : '—'}
          </span>
          {liveOk && <span className="tabular-nums">{formatRate(netRate(liveNet, counts.soru))}</span>}
        </p>
        <div className="flex items-center gap-3">
          {savedAt && <p role="status" className="text-sm font-medium text-good">Kaydedildi</p>}
          {editing && (
            <button type="button" className={btnGhost} onClick={onDone}>Vazgeç</button>
          )}
          <button type="submit" className={btnPrimary} disabled={saving}>
            {saving ? 'Kaydediliyor…' : editing ? 'Güncelle' : 'Kaydet'}
          </button>
        </div>
      </div>

      {failure && (
        <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-bad/40 bg-bad/10 px-4 py-3 text-sm">
          <span>{failure}</span>
          <button type="button" className={btnGhost} onClick={() => void save()}>Tekrar dene</button>
        </div>
      )}
    </form>
  );
}
```

- [ ] **Step 5: `src/pages/entry/ExamForm.tsx` yaz**

```tsx
import { Fragment, useEffect, useRef, useState } from 'react';
import { ApiError, errorMessage } from '../../api/api';
import { Field } from '../../components/Field';
import { btnGhost, btnPrimary, inputCls, inputSm } from '../../components/ui';
import { subjectsFor } from '../../lib/catalog';
import { subjectColor } from '../../lib/colors';
import { autoBlank, draftCounts, examRowsFromDrafts, isRowEmpty, remapRowErrors, type ExamRowDraft } from '../../lib/drafts';
import { formatNet, net } from '../../lib/net';
import { todayIso } from '../../lib/periods';
import type { Exam, ExamInput, FieldErrors, Grade, RecordRow, Subject } from '../../lib/types';
import { countErrors, validateExam } from '../../lib/validation';
import { useAppData, useData } from '../../state/DataContext';
import { useDraft } from '../../state/useDraft';

interface ExamDraft {
  ad: string;
  tarih: string;
  sinif: Grade;
  rows: ExamRowDraft[];
}

const LABELS = { soru: 'soru', dogru: 'doğru', yanlis: 'yanlış' } as const;

function blankRows(dersler: Subject[], sinif: Grade, keep: ExamRowDraft[] = []): ExamRowDraft[] {
  const rows = subjectsFor(dersler, sinif).map(
    (s) =>
      keep.find((r) => r.ders === s.ders) ?? {
        ders: s.ders, soru: s.deneme_soru_sayisi ? String(s.deneme_soru_sayisi) : '', dogru: '', yanlis: '', bos: '', bosManual: false,
      },
  );
  const extra = keep.filter((k) => !rows.some((r) => r.ders === k.ders) && !isRowEmpty(k));
  return [...rows, ...extra];
}

function fromExam(dersler: Subject[], exam: Exam, rows: RecordRow[]): ExamDraft {
  const filled = rows.map((r) => ({
    ders: r.ders, soru: String(r.soru), dogru: String(r.dogru), yanlis: String(r.yanlis), bos: String(r.bos), bosManual: false,
  }));
  return { ad: exam.ad, tarih: exam.tarih, sinif: exam.sinif, rows: blankRows(dersler, exam.sinif, filled) };
}

export function ExamForm({ editing, onDone }: { editing?: { exam: Exam; rows: RecordRow[] }; onDone: () => void }) {
  const data = useAppData();
  const { saveExam } = useData();
  const [draft, setDraft] = useDraft<ExamDraft>(
    editing ? null : 'goksenin-draft-Deneme',
    () => (editing ? fromExam(data.dersler, editing.exam, editing.rows) : { ad: '', tarih: todayIso(), sinif: 8, rows: blankRows(data.dersler, 8) }),
    (d) => (d.rows.every(isRowEmpty) ? { ...d, tarih: todayIso(), rows: blankRows(data.dersler, d.sinif) } : d),
  );
  const [errors, setErrors] = useState<FieldErrors>({});
  const [saving, setSaving] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const inFlight = useRef(false);

  useEffect(() => {
    if (!savedAt) return;
    const t = setTimeout(() => setSavedAt(null), 3000);
    return () => clearTimeout(t);
  }, [savedAt]);

  const setRow = (i: number, p: Partial<ExamRowDraft>) =>
    setDraft((d) => ({ ...d, rows: d.rows.map((r, j) => (j === i ? { ...r, ...p } : r)) }));

  const rowState = draft.rows.map((r) => {
    const c = draftCounts(r);
    const ok = !isRowEmpty(r) && Object.keys(countErrors(c)).length === 0;
    return { c, ok };
  });
  const totalNet = rowState.reduce((sum, s) => (s.ok ? sum + net(s.c.dogru, s.c.yanlis) : sum), 0);

  async function save() {
    if (inFlight.current) return;
    const { rows, index } = examRowsFromDrafts(draft.rows);
    const input: ExamInput = { ad: draft.ad, tarih: draft.tarih, sinif: draft.sinif, satirlar: rows };
    const errs = remapRowErrors(validateExam(input, todayIso()), index);
    setErrors(errs);
    setFailure(null);
    if (Object.keys(errs).length) return;
    inFlight.current = true;
    setSaving(true);
    try {
      await saveExam(input, editing?.exam.deneme_id);
      setSavedAt(Date.now());
      if (editing) onDone();
      else setDraft((d) => ({ ad: '', tarih: d.tarih, sinif: d.sinif, rows: blankRows(data.dersler, d.sinif) }));
    } catch (e) {
      if (e instanceof ApiError && e.code === 'VALIDATION' && e.details) setErrors(remapRowErrors(e.details, index));
      else if (!(e instanceof ApiError && e.code === 'AUTH')) setFailure(errorMessage(e));
    } finally {
      inFlight.current = false;
      setSaving(false);
    }
  }

  return (
    <form noValidate onSubmit={(e) => { e.preventDefault(); void save(); }} className="space-y-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Field label="Deneme adı" error={errors.ad} className="col-span-2">
          <input className={inputCls} placeholder="ör. Özdebir LGS Deneme 3" value={draft.ad} onChange={(e) => setDraft((d) => ({ ...d, ad: e.target.value }))} />
        </Field>
        <Field label="Tarih" error={errors.tarih}>
          <input type="date" max={todayIso()} className={inputCls} value={draft.tarih} onChange={(e) => setDraft((d) => ({ ...d, tarih: e.target.value }))} />
        </Field>
        <Field label="Sınıf" error={errors.sinif}>
          <select
            className={inputCls}
            value={draft.sinif}
            onChange={(e) => {
              const sinif = Number(e.target.value) as Grade;
              setDraft((d) => ({ ...d, sinif, rows: blankRows(data.dersler, sinif, d.rows) }));
            }}
          >
            <option value={7}>7. sınıf</option>
            <option value={8}>8. sınıf</option>
          </select>
        </Field>
      </div>

      <div className="-mx-1 overflow-x-auto">
        <table className="w-full min-w-[520px] text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-muted">
              <th className="py-2 pl-1 font-medium">Ders</th>
              <th className="w-20 pr-2 font-medium">Soru</th>
              <th className="w-20 pr-2 font-medium">D</th>
              <th className="w-20 pr-2 font-medium">Y</th>
              <th className="w-20 pr-2 font-medium">B</th>
              <th className="w-20 pr-1 text-right font-medium">Net</th>
            </tr>
          </thead>
          <tbody>
            {draft.rows.map((r, i) => {
              const { c, ok } = rowState[i];
              const rowErr = Object.entries(errors).find(([k]) => k.startsWith(`satirlar.${i}.`))?.[1];
              return (
                <Fragment key={r.ders}>
                  <tr className="border-t border-line">
                    <td className="py-2 pl-1">
                      <span className="inline-flex items-center gap-2">
                        <span className="size-2.5 shrink-0 rounded-full" style={{ background: subjectColor(r.ders) }} />
                        {r.ders}
                      </span>
                    </td>
                    {(['soru', 'dogru', 'yanlis'] as const).map((k) => (
                      <td key={k} className="py-1.5 pr-2">
                        <input
                          aria-label={`${r.ders} ${LABELS[k]}`}
                          type="number"
                          inputMode="numeric"
                          min={0}
                          className={inputSm}
                          value={r[k]}
                          onChange={(e) => setRow(i, { [k]: e.target.value })}
                        />
                      </td>
                    ))}
                    <td className="py-1.5 pr-2">
                      <input
                        aria-label={`${r.ders} boş`}
                        type="number"
                        inputMode="numeric"
                        min={0}
                        className={inputSm}
                        value={r.bosManual ? r.bos : isRowEmpty(r) ? '' : autoBlank(r.soru, r.dogru, r.yanlis)}
                        onChange={(e) => setRow(i, { bos: e.target.value, bosManual: true })}
                      />
                    </td>
                    <td className="pr-1 text-right font-display font-semibold tabular-nums">{ok ? formatNet(net(c.dogru, c.yanlis)) : '—'}</td>
                  </tr>
                  {rowErr && (
                    <tr>
                      <td colSpan={6} role="alert" className="pb-2 pl-1 text-xs text-bad">{rowErr}</td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-line">
              <td colSpan={5} className="py-3 pl-1 font-medium">Toplam net</td>
              <td data-testid="exam-total" className="pr-1 text-right font-display text-xl font-semibold tabular-nums">{formatNet(totalNet)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
      {errors.satirlar && <p role="alert" className="text-sm text-bad">{errors.satirlar}</p>}
      <p className="text-xs text-muted">Doğru ve yanlışı boş bırakılan dersler kaydedilmez.</p>

      <div className="flex flex-wrap items-center justify-end gap-3">
        {savedAt && <p role="status" className="text-sm font-medium text-good">Kaydedildi</p>}
        {editing && (
          <button type="button" className={btnGhost} onClick={onDone}>Vazgeç</button>
        )}
        <button type="submit" className={btnPrimary} disabled={saving}>
          {saving ? 'Kaydediliyor…' : editing ? 'Denemeyi güncelle' : 'Denemeyi kaydet'}
        </button>
      </div>
      {failure && (
        <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-bad/40 bg-bad/10 px-4 py-3 text-sm">
          <span>{failure}</span>
          <button type="button" className={btnGhost} onClick={() => void save()}>Tekrar dene</button>
        </div>
      )}
    </form>
  );
}
```

- [ ] **Step 6: `src/pages/entry/RecentList.tsx` ve `EntryPage.tsx` yaz**

`src/pages/entry/RecentList.tsx`:

```tsx
import { Pencil, Trash2 } from 'lucide-react';
import { EmptyState } from '../../components/EmptyState';
import { IconButton } from '../../components/IconButton';
import { subjectColor } from '../../lib/colors';
import { formatNet, formatRate, totals } from '../../lib/net';
import { formatDateTr } from '../../lib/periods';
import type { RecentItem } from '../../lib/recent';

export function RecentList({ items, onEdit, onDelete }: { items: RecentItem[]; onEdit: (i: RecentItem) => void; onDelete: (i: RecentItem) => void }) {
  if (!items.length) return <EmptyState title="Henüz kayıt yok" text="İlk kaydı yukarıdaki formdan ekleyebilirsin." />;
  return (
    <ul aria-label="Son kayıtlar" className="divide-y divide-line">
      {items.map((item) => {
        const t = totals(item.kind === 'exam' ? item.rows : [item.row]);
        const title = item.kind === 'exam' ? item.exam.ad : item.row.ders;
        const detail =
          item.kind === 'exam'
            ? `${item.exam.sinif}. sınıf · Deneme · ${item.rows.length} ders`
            : `${item.row.sinif}. sınıf · ${item.row.kaynak}${item.row.konu ? ` · ${item.row.konu}` : ''}`;
        return (
          <li key={item.key} className="flex items-center gap-3 py-3">
            <span className="size-2.5 shrink-0 rounded-full" style={{ background: item.kind === 'exam' ? 'var(--accent)' : subjectColor(item.row.ders) }} />
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{title}</p>
              <p className="truncate text-xs text-muted">{formatDateTr(item.tarih)} · {detail}</p>
            </div>
            <div className="text-right">
              <p className="font-display font-semibold tabular-nums">{formatNet(t.net)} net</p>
              <p className="text-xs text-muted tabular-nums">{formatRate(t.oran)}</p>
            </div>
            <IconButton label={`${title} düzenle`} onClick={() => onEdit(item)}>
              <Pencil size={16} />
            </IconButton>
            <IconButton label={`${title} sil`} onClick={() => onDelete(item)}>
              <Trash2 size={16} />
            </IconButton>
          </li>
        );
      })}
    </ul>
  );
}
```

`src/pages/entry/EntryPage.tsx`:

```tsx
import { useState } from 'react';
import { errorMessage } from '../../api/api';
import { Card, CardTitle } from '../../components/Card';
import { PageHeader } from '../../components/PageHeader';
import { Segmented } from '../../components/Segmented';
import { recentItems, type RecentItem } from '../../lib/recent';
import type { Exam, RecordRow, Source } from '../../lib/types';
import { useAppData, useData } from '../../state/DataContext';
import { ExamForm } from './ExamForm';
import { RecentList } from './RecentList';
import { SingleForm } from './SingleForm';

const TAB_KEY = 'goksenin-entry-tab';
const TABS: { value: Source; label: string }[] = [
  { value: 'Deneme', label: 'Deneme' },
  { value: 'Ödev', label: 'Ödev' },
  { value: 'Kendi Çözdüğü', label: 'Kendi Çözdüğü' },
];

type Editing = { kind: 'record'; row: RecordRow } | { kind: 'exam'; exam: Exam; rows: RecordRow[] } | null;

function readTab(): Source {
  try {
    const t = localStorage.getItem(TAB_KEY);
    if (t && TABS.some((x) => x.value === t)) return t as Source;
  } catch {
    /* depolama kapalı */
  }
  return 'Deneme';
}

export function EntryPage() {
  const data = useAppData();
  const { removeRecord, removeExam } = useData();
  const [tab, setTabState] = useState<Source>(readTab);
  const [editing, setEditing] = useState<Editing>(null);
  const [listError, setListError] = useState<string | null>(null);

  const setTab = (t: Source) => {
    setTabState(t);
    try {
      localStorage.setItem(TAB_KEY, t);
    } catch {
      /* depolama kapalı */
    }
  };

  const startEdit = (item: RecentItem) => {
    if (item.kind === 'record') {
      setTab(item.row.kaynak);
      setEditing({ kind: 'record', row: item.row });
    } else {
      setTab('Deneme');
      setEditing({ kind: 'exam', exam: item.exam, rows: item.rows });
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const del = async (item: RecentItem) => {
    const name = item.kind === 'exam' ? `"${item.exam.ad}" denemesi` : `${item.row.ders} kaydı`;
    if (!window.confirm(`${name} silinsin mi? Bu işlem geri alınamaz.`)) return;
    setListError(null);
    try {
      if (item.kind === 'exam') await removeExam(item.exam.deneme_id);
      else await removeRecord(item.row.id);
      setEditing(null);
    } catch (e) {
      setListError(errorMessage(e));
    }
  };

  const done = () => setEditing(null);
  const editKey = editing ? (editing.kind === 'exam' ? editing.exam.deneme_id : editing.row.id) : 'yeni';

  return (
    <div className="space-y-6">
      <PageHeader title="Veri Girişi" subtitle="Deneme, ödev ve kendi çözdüğü testlerin sonuçlarını kaydet" />
      <Segmented label="Kayıt türü" value={tab} onChange={(t) => { setTab(t); setEditing(null); }} options={TABS} />
      <Card>
        {editing && (
          <p className="mb-4 rounded-xl bg-accent/10 px-3 py-2 text-sm font-medium">
            Düzenleniyor: {editing.kind === 'exam' ? editing.exam.ad : `${editing.row.ders} kaydı`}
          </p>
        )}
        {tab === 'Deneme' ? (
          <ExamForm key={`Deneme-${editKey}`} editing={editing?.kind === 'exam' ? editing : undefined} onDone={done} />
        ) : (
          <SingleForm key={`${tab}-${editKey}`} kaynak={tab} editing={editing?.kind === 'record' ? editing.row : undefined} onDone={done} />
        )}
      </Card>
      <Card>
        <CardTitle>Son kayıtlar</CardTitle>
        {listError && <p role="alert" className="mb-3 text-sm text-bad">{listError}</p>}
        <RecentList items={recentItems(data.kayitlar, data.denemeler, 10)} onEdit={startEdit} onDelete={(i) => void del(i)} />
      </Card>
    </div>
  );
}
```

- [ ] **Step 7: Rotayı ekle**

`src/App.tsx` içinde import ekle ve yorum satırının yerine index rotasını koy:

```tsx
import { EntryPage } from './pages/entry/EntryPage';
```

```tsx
            <Route index element={<EntryPage />} />
```

- [ ] **Step 8: Testleri çalıştır**

Run: `npx vitest run tests/pages`
Expected: PASS (giriş + veri girişi testleri).

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: veri girişi — tek kayıt formu, toplu deneme formu, son kayıtlar"
```

---
### Task 12: Analiz sayfası

**Files:**
- Create: `src/components/FilterBar.tsx`, `src/components/ChartTooltip.tsx`, `src/pages/AnalysisPage.tsx`
- Modify: `src/App.tsx` (`analiz` rotası)
- Test: `tests/pages/analysis.test.tsx`

**Interfaces:**
- Consumes: `filterRecords, inRange, summarize, seriesByPeriod, compareByKey, examSummaries, BaseFilters, ExamSummary` (analysis.ts); `defaultRange, todayIso, formatDateTr, PeriodType`; `formatNet, formatRate, formatDelta, round2`; `subjectColor`; `subjectNames`; bileşenler.
- Produces:
  - `FilterBar.tsx`: `interface FilterState extends BaseFilters { from: string; to: string }`, `initialFilters(type: PeriodType): FilterState`, `FilterBar({ value, onChange, subjects, showSubjects?, showSource? })`
  - `ChartTooltip({ active?, payload?, label? })` — `dataKey === 'oran'` yüzde, diğerleri net biçimlendirir
  - `AnalysisPage()`

Grafik işine başlamadan **dataviz** skill'ini yükle ve bar + çizgi birleşik grafiği, eksen/ızgara/tooltip ayrıntılarını onun kurallarıyla gözden geçir; aşağıdaki kod çalışan başlangıçtır.

- [ ] **Step 1: Başarısız testleri yaz**

`tests/pages/analysis.test.tsx`:

```tsx
import { screen, within } from '@testing-library/react';
import { format, parseISO, subDays } from 'date-fns';
import { describe, expect, it } from 'vitest';
import type { Api } from '../../src/api/api';
import { todayIso } from '../../src/lib/periods';
import { renderApp } from '../helpers/renderApp';

const today = todayIso();
const weekAgo = format(subDays(parseISO(today), 7), 'yyyy-MM-dd');
const base = { sinif: 8 as const, kaynak: 'Ödev' as const, konu: '', soru: 10, yanlis: 0 };

async function seed(api: Api) {
  await api.addRecord({ ...base, tarih: today, ders: 'Matematik', dogru: 9, bos: 1 });
  await api.addRecord({ ...base, tarih: weekAgo, ders: 'Matematik', dogru: 5, bos: 5 });
  await api.addRecord({ ...base, tarih: weekAgo, ders: 'Fen Bilimleri', dogru: 8, bos: 2 });
}

describe('Analiz', () => {
  it('kayıt yoksa boş durum gösterir', async () => {
    await renderApp({ route: '#/analiz' });
    expect(await screen.findByText('Bu dönemde kayıt yok')).toBeInTheDocument();
  });

  it('özet kartlar ve ders bazında haftalık karşılaştırma', async () => {
    await renderApp({ route: '#/analiz', seed });
    const table = await screen.findByRole('table', { name: 'Ders bazında karşılaştırma' });
    const mat = within(table).getByText('Matematik').closest('tr')!;
    expect(within(mat).getByText('+40,0')).toBeInTheDocument();
    expect(within(mat).getByText('İyileşme')).toBeInTheDocument();
    const fen = within(table).getByText('Fen Bilimleri').closest('tr')!;
    expect(within(fen).getByText('Karşılaştırma yok')).toBeInTheDocument();
    expect(screen.getByText('Çözülen soru').parentElement).toHaveTextContent('30');
    expect(screen.getByText('Bu hafta ile önceki').parentElement).toHaveTextContent('+25,0'); // %90 vs %65
  });

  it('aylık görünüme geçer', async () => {
    const { user } = await renderApp({ route: '#/analiz', seed });
    await user.click(await screen.findByRole('tab', { name: 'Aylık' }));
    expect(screen.getByText('Bu ay ile önceki')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Aylık net' })).toBeInTheDocument();
  });

  it('ders filtresi özetleri daraltır', async () => {
    const { user } = await renderApp({ route: '#/analiz', seed });
    await user.click(await screen.findByRole('button', { name: /Fen Bilimleri/ }));
    expect(screen.getByText('Çözülen soru').parentElement).toHaveTextContent('10');
  });

  it('deneme varsa deneme trendi bölümü görünür', async () => {
    await renderApp({
      route: '#/analiz',
      seed: async (a) => {
        await a.addExam({ ad: 'LGS-1', tarih: today, sinif: 8, satirlar: [{ ders: 'Türkçe', soru: 20, dogru: 16, yanlis: 4, bos: 0 }] });
      },
    });
    expect(await screen.findByRole('heading', { name: 'Deneme trendi' })).toBeInTheDocument();
    expect(screen.getByText('LGS-1')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Başarısız olduğunu doğrula**

Run: `npx vitest run tests/pages/analysis.test.tsx`
Expected: FAIL — analiz sayfası yok (`/analiz` `*` rotasıyla veri girişine yönlenir).

- [ ] **Step 3: `src/components/FilterBar.tsx` yaz**

```tsx
import clsx from 'clsx';
import type { BaseFilters } from '../lib/analysis';
import { subjectColor } from '../lib/colors';
import { defaultRange, todayIso, type PeriodType } from '../lib/periods';
import { SOURCES, type Grade, type Source } from '../lib/types';
import { Card } from './Card';
import { Field } from './Field';
import { inputCls } from './ui';

export interface FilterState extends BaseFilters {
  from: string;
  to: string;
}

export function initialFilters(type: PeriodType): FilterState {
  return { sinif: 'all', dersler: [], kaynak: 'all', ...defaultRange(todayIso(), type) };
}

export function FilterBar({ value, onChange, subjects, showSubjects = true, showSource = true }: {
  value: FilterState;
  onChange: (f: FilterState) => void;
  subjects: string[];
  showSubjects?: boolean;
  showSource?: boolean;
}) {
  const set = (p: Partial<FilterState>) => onChange({ ...value, ...p });
  return (
    <Card label="Filtreler" className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Field label="Sınıf">
          <select
            className={inputCls}
            value={String(value.sinif)}
            onChange={(e) => set({ sinif: e.target.value === 'all' ? 'all' : (Number(e.target.value) as Grade), dersler: [] })}
          >
            <option value="all">Tüm sınıflar</option>
            <option value="7">7. sınıf</option>
            <option value="8">8. sınıf</option>
          </select>
        </Field>
        {showSource && (
          <Field label="Kaynak">
            <select className={inputCls} value={value.kaynak} onChange={(e) => set({ kaynak: e.target.value as Source | 'all' })}>
              <option value="all">Tüm kaynaklar</option>
              {SOURCES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </Field>
        )}
        <Field label="Başlangıç">
          <input type="date" className={inputCls} value={value.from} max={value.to} onChange={(e) => e.target.value && set({ from: e.target.value })} />
        </Field>
        <Field label="Bitiş">
          <input type="date" className={inputCls} value={value.to} min={value.from} max={todayIso()} onChange={(e) => e.target.value && set({ to: e.target.value })} />
        </Field>
      </div>
      {showSubjects && subjects.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">
            Dersler {value.dersler.length === 0 && <span className="normal-case tracking-normal">· hepsi</span>}
          </p>
          <div className="flex flex-wrap gap-2">
            {subjects.map((s) => {
              const on = value.dersler.includes(s);
              return (
                <button
                  key={s}
                  type="button"
                  aria-pressed={on}
                  onClick={() => set({ dersler: on ? value.dersler.filter((x) => x !== s) : [...value.dersler, s] })}
                  className={clsx(
                    'inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm transition',
                    on ? 'border-transparent bg-ink text-bg' : 'border-line text-muted hover:text-ink',
                  )}
                >
                  <span className="size-2 rounded-full" style={{ background: subjectColor(s) }} />
                  {s}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </Card>
  );
}
```

- [ ] **Step 4: `src/components/ChartTooltip.tsx` yaz**

```tsx
import { formatNet, formatRate } from '../lib/net';

interface Item {
  name?: string;
  value?: number | string | null;
  color?: string;
  dataKey?: string | number;
}

export function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: Item[]; label?: string | number }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-line bg-surface px-3 py-2 text-sm shadow-lg">
      <p className="mb-1 font-medium">{label}</p>
      {payload.map((p) => {
        const v = typeof p.value === 'number' ? p.value : null;
        return (
          <p key={String(p.dataKey)} className="flex items-center gap-2 text-muted">
            <span className="size-2 rounded-full" style={{ background: p.color }} />
            {p.name}:
            <span className="font-medium text-ink tabular-nums">{p.dataKey === 'oran' ? formatRate(v) : v === null ? '—' : formatNet(v)}</span>
          </p>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 5: `src/pages/AnalysisPage.tsx` yaz**

```tsx
import { useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Card, CardTitle } from '../components/Card';
import { ChartTooltip } from '../components/ChartTooltip';
import { EmptyState } from '../components/EmptyState';
import { FilterBar, initialFilters, type FilterState } from '../components/FilterBar';
import { PageHeader } from '../components/PageHeader';
import { Segmented } from '../components/Segmented';
import { StatCard } from '../components/StatCard';
import { TrendBadge } from '../components/TrendBadge';
import { compareByKey, examSummaries, filterRecords, inRange, seriesByPeriod, summarize, type ExamSummary } from '../lib/analysis';
import { subjectNames } from '../lib/catalog';
import { subjectColor } from '../lib/colors';
import { formatDelta, formatNet, formatRate, round2 } from '../lib/net';
import { defaultRange, formatDateTr, todayIso, type PeriodType } from '../lib/periods';
import { useAppData } from '../state/DataContext';

const axis = { tickLine: false, axisLine: false, tick: { fill: 'var(--muted)', fontSize: 12 } } as const;

function examChart(list: ExamSummary[]) {
  const dersler = [...new Set(list.flatMap((e) => e.byDers.map((b) => b.ders)))];
  const rows = list.map((e) => ({ label: e.exam.ad, ...Object.fromEntries(e.byDers.map((b) => [b.ders, round2(b.net)])) }));
  return { dersler, rows };
}

export function AnalysisPage() {
  const data = useAppData();
  const [type, setType] = useState<PeriodType>('week');
  const [f, setF] = useState<FilterState>(() => initialFilters('week'));

  const changeType = (t: PeriodType) => {
    setType(t);
    setF((prev) => ({ ...prev, ...defaultRange(todayIso(), t) }));
  };

  const view = useMemo(() => {
    const base = filterRecords(data.kayitlar, f);
    const inR = base.filter((r) => inRange(r, f));
    const showExams = f.kaynak === 'all' || f.kaynak === 'Deneme';
    return {
      hasData: inR.length > 0,
      summary: summarize(base, f, type),
      series: seriesByPeriod(inR, f.from, f.to, type).map((p) => ({ ...p, net: round2(p.net), oran: p.oran === null ? null : round2(p.oran) })),
      comparisons: compareByKey(base, f.to, type, (r) => r.ders),
      exams: showExams ? examSummaries(data.denemeler, data.kayitlar, f) : [],
    };
  }, [data, f, type]);

  const word = type === 'week' ? 'hafta' : 'ay';
  const chart = examChart(view.exams);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Analiz"
        subtitle="Net gelişimi, dönem karşılaştırması ve deneme trendi"
        actions={
          <Segmented label="Dönem" value={type} onChange={changeType} options={[{ value: 'week', label: 'Haftalık' }, { value: 'month', label: 'Aylık' }]} />
        }
      />
      <FilterBar value={f} onChange={setF} subjects={subjectNames(data.dersler, f.sinif)} />

      {!view.hasData ? (
        <EmptyState title="Bu dönemde kayıt yok" text="Filtreleri genişlet ya da Veri Girişi sayfasından kayıt ekle." />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard label="Toplam net" value={formatNet(view.summary.total.net)} />
            <StatCard label="Net oranı" value={formatRate(view.summary.total.oran)} />
            <StatCard label={`Bu ${word} ile önceki`} value={formatDelta(view.summary.delta)} suffix="puan" trend={view.summary.trend} />
            <StatCard label="Çözülen soru" value={view.summary.total.soru.toLocaleString('tr-TR')} />
          </div>

          <Card>
            <CardTitle>{type === 'week' ? 'Haftalık net' : 'Aylık net'}</CardTitle>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={view.series} margin={{ top: 8, right: 4, left: -16, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke="var(--line)" />
                  <XAxis dataKey="label" {...axis} />
                  <YAxis yAxisId="net" {...axis} />
                  <YAxis yAxisId="oran" orientation="right" unit="%" domain={[(min: number) => Math.min(0, Math.floor(min)), 100]} {...axis} />
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: 'var(--surface-2)' }} />
                  <Bar yAxisId="net" dataKey="net" name="Toplam net" fill="var(--accent)" radius={[6, 6, 0, 0]} maxBarSize={44} />
                  <Line yAxisId="oran" dataKey="oran" name="Net oranı" type="monotone" stroke="var(--ink)" strokeWidth={2} dot={{ r: 3 }} connectNulls />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            <p className="mt-2 text-xs text-muted">Barlar dönemdeki toplam net, çizgi net oranı (net ÷ soru). İyileşme yorumu oran üzerinden yapılır.</p>
          </Card>

          <Card>
            <CardTitle>Ders bazında: bu {word} ve önceki {word}</CardTitle>
            {view.comparisons.length === 0 ? (
              <p className="py-4 text-sm text-muted">Son iki dönemde kayıt yok.</p>
            ) : (
              <table aria-label="Ders bazında karşılaştırma" className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-muted">
                    <th className="py-2 font-medium">Ders</th>
                    <th className="py-2 text-right font-medium">Önceki</th>
                    <th className="py-2 text-right font-medium">Bu dönem</th>
                    <th className="py-2 text-right font-medium">Değişim</th>
                  </tr>
                </thead>
                <tbody>
                  {view.comparisons.map((c) => (
                    <tr key={c.key} className="border-t border-line">
                      <td className="py-2.5">
                        <span className="inline-flex items-center gap-2">
                          <span className="size-2.5 rounded-full" style={{ background: subjectColor(c.key) }} />
                          {c.key}
                        </span>
                      </td>
                      <td className="py-2.5 text-right tabular-nums text-muted">{formatRate(c.prev)}</td>
                      <td className="py-2.5 text-right tabular-nums">{formatRate(c.cur)}</td>
                      <td className="py-2.5 text-right">
                        <TrendBadge trend={c.trend} delta={c.delta} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <p className="mt-3 text-xs text-muted">±2 puandan küçük değişimler "sabit" sayılır.</p>
          </Card>

          {view.exams.length > 0 && (
            <Card>
              <CardTitle>Deneme trendi</CardTitle>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chart.rows} margin={{ top: 8, right: 4, left: -16, bottom: 0 }}>
                    <CartesianGrid vertical={false} stroke="var(--line)" />
                    <XAxis dataKey="label" {...axis} />
                    <YAxis {...axis} />
                    <Tooltip content={<ChartTooltip />} cursor={{ fill: 'var(--surface-2)' }} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    {chart.dersler.map((d) => (
                      <Bar key={d} dataKey={d} name={d} stackId="net" fill={subjectColor(d)} maxBarSize={48} />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <ul className="mt-4 divide-y divide-line text-sm">
                {view.exams.map((e) => (
                  <li key={e.exam.deneme_id} className="flex items-center justify-between py-2">
                    <span>
                      <span className="font-medium">{e.exam.ad}</span>
                      <span className="ml-2 text-muted">{formatDateTr(e.exam.tarih)}</span>
                    </span>
                    <span className="font-display font-semibold tabular-nums">{formatNet(e.net)} net</span>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 6: Rotayı ekle**

`src/App.tsx`: `import { AnalysisPage } from './pages/AnalysisPage';` ve index rotasının altına:

```tsx
            <Route path="analiz" element={<AnalysisPage />} />
```

- [ ] **Step 7: Testleri çalıştır**

Run: `npx vitest run tests/pages/analysis.test.tsx`
Expected: PASS. (jsdom'da grafiklerin genişliği 0 olduğu için Recharts uyarı basabilir; test başarısı etkilenmez.)

- [ ] **Step 8: Tarayıcıda gözle kontrol**

Run: `npm run dev` → `demo / demo123` → Analiz. Örnek veride haftalık barlar ve yükselen oran çizgisi görünmeli; Aylık'a geçiş, ders çipleri, koyu tema ve 375px genişlik (DevTools) kontrol edilmeli. Sunucuyu durdur.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: analiz sayfası — özet kartlar, haftalık/aylık net grafiği, ders karşılaştırması, deneme trendi"
```

---

### Task 13: Sıralama sayfası

**Files:**
- Create: `src/components/RankList.tsx`, `src/pages/RankingPage.tsx`
- Modify: `src/App.tsx` (`siralama` rotası)
- Test: `tests/pages/ranking.test.tsx`

**Interfaces:**
- Consumes: `rankSubjects, rankTopics, rankExams, movers, Direction, RankItem, Mover` (ranking.ts); `filterRecords, inRange, examSummaries`; `FilterBar, initialFilters, FilterState`; biçimlendiriciler; `subjectColor`.
- Produces: `interface RankRow { key: string; label: string; detail: string; value: string; rate: number | null; color?: string }`, `RankList({ label, rows, empty })` (sıralı `<ol aria-label={label}>`), `RankingPage()`.

- [ ] **Step 1: Başarısız testleri yaz**

`tests/pages/ranking.test.tsx`:

```tsx
import { screen, within } from '@testing-library/react';
import { format, parseISO, subDays } from 'date-fns';
import { describe, expect, it } from 'vitest';
import type { Api } from '../../src/api/api';
import { todayIso } from '../../src/lib/periods';
import { renderApp } from '../helpers/renderApp';

const today = todayIso();
const weekAgo = format(subDays(parseISO(today), 7), 'yyyy-MM-dd');
const base = { sinif: 8 as const, kaynak: 'Ödev' as const, konu: '', yanlis: 0 };

async function seed(api: Api) {
  await api.addRecord({ ...base, tarih: today, ders: 'Matematik', konu: 'Kümeler', soru: 12, dogru: 11, bos: 1 });
  await api.addRecord({ ...base, tarih: weekAgo, ders: 'Matematik', konu: 'Kümeler', soru: 10, dogru: 5, bos: 5 });
  await api.addRecord({ ...base, tarih: today, ders: 'Fen Bilimleri', konu: 'Basınç', soru: 5, dogru: 1, bos: 4 });
}

const firstItem = (listName: string) => within(screen.getByRole('list', { name: listName })).getAllByRole('listitem')[0];

describe('Sıralama', () => {
  it('dersler en iyiden en kötüye, düğmeyle tersine', async () => {
    const { user } = await renderApp({ route: '#/siralama', seed });
    await screen.findByRole('list', { name: 'Dersler sıralaması' });
    expect(firstItem('Dersler sıralaması')).toHaveTextContent('Matematik');
    await user.click(screen.getByRole('tab', { name: 'En kötüden en iyiye' }));
    expect(firstItem('Dersler sıralaması')).toHaveTextContent('Fen Bilimleri');
  });

  it('konular en az soru eşiğine uyar', async () => {
    const { user } = await renderApp({ route: '#/siralama', seed });
    await user.click(await screen.findByRole('tab', { name: 'Konular' }));
    const list = screen.getByRole('list', { name: 'Konular sıralaması' });
    expect(within(list).getByText('Kümeler')).toBeInTheDocument();
    expect(within(list).queryByText('Basınç')).toBeNull();
    const min = screen.getByLabelText('En az soru');
    await user.clear(min);
    await user.type(min, '0');
    expect(within(screen.getByRole('list', { name: 'Konular sıralaması' })).getByText('Basınç')).toBeInTheDocument();
  });

  it('denemeler toplam nete göre', async () => {
    const { user } = await renderApp({
      route: '#/siralama',
      seed: async (a) => {
        await a.addExam({ ad: 'Zayıf', tarih: weekAgo, sinif: 8, satirlar: [{ ders: 'Türkçe', soru: 20, dogru: 8, yanlis: 0, bos: 12 }] });
        await a.addExam({ ad: 'Güçlü', tarih: today, sinif: 8, satirlar: [{ ders: 'Türkçe', soru: 20, dogru: 18, yanlis: 0, bos: 2 }] });
      },
    });
    await user.click(await screen.findByRole('tab', { name: 'Denemeler' }));
    expect(firstItem('Denemeler sıralaması')).toHaveTextContent('Güçlü');
  });

  it('en çok gelişen dersler ve konular', async () => {
    const { user } = await renderApp({ route: '#/siralama', seed });
    await user.click(await screen.findByRole('tab', { name: 'Gelişen / gerileyen' }));
    const up = screen.getByRole('list', { name: 'En çok gelişen dersler' });
    expect(within(up).getByText('Matematik')).toBeInTheDocument();
    expect(within(up).getByText(/\+41,7/)).toBeInTheDocument(); // %91,7 − %50
    expect(within(screen.getByRole('list', { name: 'En çok gelişen konular' })).getByText('Kümeler')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Başarısız olduğunu doğrula**

Run: `npx vitest run tests/pages/ranking.test.tsx`
Expected: FAIL — sıralama listesi yok.

- [ ] **Step 3: `src/components/RankList.tsx` yaz**

```tsx
import { EmptyState } from './EmptyState';

export interface RankRow {
  key: string;
  label: string;
  detail: string;
  value: string;
  rate: number | null;
  color?: string;
}

const width = (rate: number | null) => `${Math.max(0, Math.min(100, rate ?? 0))}%`;

export function RankList({ label, rows, empty }: { label: string; rows: RankRow[]; empty: string }) {
  if (!rows.length) return <EmptyState title={empty} />;
  return (
    <ol aria-label={label} className="divide-y divide-line">
      {rows.map((r, i) => (
        <li key={r.key} className="flex items-center gap-4 py-3">
          <span className="w-7 shrink-0 font-display text-lg font-semibold text-muted tabular-nums">{i + 1}</span>
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline justify-between gap-3">
              <p className="truncate font-medium">{r.label}</p>
              <p className="shrink-0 font-display text-lg font-semibold tabular-nums">{r.value}</p>
            </div>
            <p className="truncate text-xs text-muted">{r.detail}</p>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-2">
              <div className="h-full rounded-full transition-[width] duration-500" style={{ width: width(r.rate), background: r.color ?? 'var(--accent)' }} />
            </div>
          </div>
        </li>
      ))}
    </ol>
  );
}
```

- [ ] **Step 4: `src/pages/RankingPage.tsx` yaz**

```tsx
import { useMemo, useState } from 'react';
import { Card, CardTitle } from '../components/Card';
import { Field } from '../components/Field';
import { FilterBar, initialFilters, type FilterState } from '../components/FilterBar';
import { PageHeader } from '../components/PageHeader';
import { RankList, type RankRow } from '../components/RankList';
import { Segmented } from '../components/Segmented';
import { inputCls } from '../components/ui';
import { examSummaries, filterRecords, inRange } from '../lib/analysis';
import { subjectColor } from '../lib/colors';
import { formatDelta, formatNet, formatRate } from '../lib/net';
import { formatDateTr, type PeriodType } from '../lib/periods';
import { movers, rankExams, rankSubjects, rankTopics, type Direction, type Mover } from '../lib/ranking';
import { useAppData } from '../state/DataContext';

type Tab = 'dersler' | 'konular' | 'denemeler' | 'hareket';

const TABS: { value: Tab; label: string }[] = [
  { value: 'dersler', label: 'Dersler' },
  { value: 'konular', label: 'Konular' },
  { value: 'denemeler', label: 'Denemeler' },
  { value: 'hareket', label: 'Gelişen / gerileyen' },
];

const moverRow = (m: Mover, good: boolean): RankRow => ({
  key: m.key,
  label: m.label,
  detail: `${m.detail} · ${formatRate(m.prev)} → ${formatRate(m.cur)}`,
  value: `${formatDelta(m.delta)} puan`,
  rate: m.cur,
  color: good ? 'var(--good)' : 'var(--bad)',
});

export function RankingPage() {
  const data = useAppData();
  const [tab, setTab] = useState<Tab>('dersler');
  const [dir, setDir] = useState<Direction>('best');
  const [minSoru, setMinSoru] = useState('10');
  const [type, setType] = useState<PeriodType>('week');
  const [f, setF] = useState<FilterState>(() => initialFilters('month'));

  const base = useMemo(() => filterRecords(data.kayitlar, { ...f, dersler: [] }), [data.kayitlar, f]);
  const inR = useMemo(() => base.filter((r) => inRange(r, f)), [base, f]);
  const min = Math.max(0, Number(minSoru) || 0);

  const dirToggle = (
    <Segmented
      label="Sıralama yönü"
      value={dir}
      onChange={setDir}
      options={[
        { value: 'best', label: 'En iyiden en kötüye' },
        { value: 'worst', label: 'En kötüden en iyiye' },
      ]}
    />
  );

  let content;
  if (tab === 'dersler') {
    const rows = rankSubjects(inR, dir).map((i) => ({
      key: i.key, label: i.label, detail: `${i.totals.soru} soru · ${formatNet(i.totals.net)} net`,
      value: formatRate(i.totals.oran), rate: i.totals.oran, color: subjectColor(i.label),
    }));
    content = (
      <Card>
        <CardTitle actions={dirToggle}>Dersler (net oranına göre)</CardTitle>
        <RankList label="Dersler sıralaması" rows={rows} empty="Seçilen aralıkta kayıt yok" />
      </Card>
    );
  } else if (tab === 'konular') {
    const rows = rankTopics(inR, dir, min).map((i) => ({
      key: i.key, label: i.label, detail: `${i.detail} · ${i.totals.soru} soru`,
      value: formatRate(i.totals.oran), rate: i.totals.oran, color: subjectColor(i.key.split('|')[1]),
    }));
    content = (
      <Card>
        <CardTitle
          actions={
            <div className="flex flex-wrap items-end gap-3">
              <Field label="En az soru" className="w-28">
                <input type="number" min={0} inputMode="numeric" className={inputCls} value={minSoru} onChange={(e) => setMinSoru(e.target.value)} />
              </Field>
              {dirToggle}
            </div>
          }
        >
          Konular
        </CardTitle>
        <RankList label="Konular sıralaması" rows={rows} empty="Eşiği geçen konu yok — en az soru değerini düşürmeyi dene" />
      </Card>
    );
  } else if (tab === 'denemeler') {
    const rows = rankExams(examSummaries(data.denemeler, data.kayitlar, { sinif: f.sinif, dersler: [], from: f.from, to: f.to }), dir).map((e) => ({
      key: e.exam.deneme_id, label: e.exam.ad, detail: `${formatDateTr(e.exam.tarih)} · ${e.exam.sinif}. sınıf · ${formatRate(e.oran)}`,
      value: `${formatNet(e.net)} net`, rate: e.oran,
    }));
    content = (
      <Card>
        <CardTitle actions={dirToggle}>Denemeler (toplam nete göre)</CardTitle>
        <RankList label="Denemeler sıralaması" rows={rows} empty="Seçilen aralıkta deneme yok" />
      </Card>
    );
  } else {
    const word = type === 'week' ? 'hafta' : 'ay';
    content = (
      <>
        <Segmented label="Karşılaştırma dönemi" value={type} onChange={setType} options={[{ value: 'week', label: 'Haftalık' }, { value: 'month', label: 'Aylık' }]} />
        <p className="text-sm text-muted">Bu {word} ile önceki {word} arasındaki net oranı farkı. Yalnızca iki dönemde de kaydı olanlar listelenir.</p>
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardTitle>En çok gelişen</CardTitle>
            <h3 className="mb-1 text-xs font-medium uppercase tracking-wide text-muted">Dersler</h3>
            <RankList label="En çok gelişen dersler" rows={movers(base, f.to, type, 'ders', 'up').map((m) => moverRow(m, true))} empty="Gelişen ders yok" />
            <h3 className="mb-1 mt-5 text-xs font-medium uppercase tracking-wide text-muted">Konular</h3>
            <RankList label="En çok gelişen konular" rows={movers(base, f.to, type, 'konu', 'up').map((m) => moverRow(m, true))} empty="Gelişen konu yok" />
          </Card>
          <Card>
            <CardTitle>En çok gerileyen</CardTitle>
            <h3 className="mb-1 text-xs font-medium uppercase tracking-wide text-muted">Dersler</h3>
            <RankList label="En çok gerileyen dersler" rows={movers(base, f.to, type, 'ders', 'down').map((m) => moverRow(m, false))} empty="Gerileyen ders yok" />
            <h3 className="mb-1 mt-5 text-xs font-medium uppercase tracking-wide text-muted">Konular</h3>
            <RankList label="En çok gerileyen konular" rows={movers(base, f.to, type, 'konu', 'down').map((m) => moverRow(m, false))} empty="Gerileyen konu yok" />
          </Card>
        </div>
      </>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Sıralama" subtitle="En güçlü ve en zayıf dersler, konular ve denemeler" />
      <Segmented label="Sıralama türü" value={tab} onChange={setTab} options={TABS} />
      <FilterBar value={f} onChange={setF} subjects={[]} showSubjects={false} showSource={tab !== 'denemeler'} />
      {content}
    </div>
  );
}
```

- [ ] **Step 5: Rotayı ekle**

`src/App.tsx`: `import { RankingPage } from './pages/RankingPage';` ve:

```tsx
            <Route path="siralama" element={<RankingPage />} />
```

- [ ] **Step 6: Testleri çalıştır**

Run: `npx vitest run tests/pages/ranking.test.tsx`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: sıralama sayfası — dersler, konular, denemeler, en çok gelişen/gerileyen"
```

---

### Task 14: Ayarlar sayfası (dersler, konular, kullanıcılar, CSV)

**Files:**
- Create: `src/components/EditableName.tsx`, `src/pages/settings/SubjectsSection.tsx`, `src/pages/settings/TopicsSection.tsx`, `src/pages/settings/UsersSection.tsx`, `src/pages/settings/ExportSection.tsx`, `src/pages/settings/SettingsPage.tsx`
- Modify: `src/App.tsx` (`ayarlar` rotası)
- Test: `tests/pages/settings.test.tsx`

**Interfaces:**
- Consumes: `useAppData, useData().runAndReload`; `useAction`; `useAuth().session`; `subjectsFor, topicsFor`; `toCsv`; `downloadText`; `todayIso`; `subjectColor`; bileşenler.
- Produces: `EditableName({ value, onSave: (v: string) => Promise<boolean> })` (düğme adı `"<değer> yeniden adlandır"`, giriş adı `"Yeni ad"`), `SettingsPage()`.

- [ ] **Step 1: Başarısız testleri yaz**

`tests/pages/settings.test.tsx`:

```tsx
import { screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderApp } from '../helpers/renderApp';

beforeEach(() => {
  vi.spyOn(window, 'confirm').mockReturnValue(true);
});

const region = (name: string) => screen.getByRole('region', { name });

describe('Ayarlar', () => {
  it('konu ekler ve kaldırır (8. sınıf Matematik)', async () => {
    const { user, api } = await renderApp({ route: '#/ayarlar' });
    const r = await screen.findByRole('region', { name: 'Konular' });
    await user.selectOptions(within(r).getByLabelText('Ders'), 'Matematik');
    await user.type(within(r).getByLabelText('Yeni konu'), 'Kümeler');
    await user.click(within(r).getByRole('button', { name: 'Konu ekle' }));
    await waitFor(async () => expect((await api.getAll()).konular).toContainEqual({ ders: 'Matematik', sinif: 8, konu: 'Kümeler' }));
    expect(within(region('Konular')).getByText('Kümeler')).toBeInTheDocument();
    await user.click(within(region('Konular')).getByRole('button', { name: 'Kümeler kaldır' }));
    await waitFor(async () => expect((await api.getAll()).konular).not.toContainEqual({ ders: 'Matematik', sinif: 8, konu: 'Kümeler' }));
  });

  it('konu yeniden adlandırma geçmiş kayıtlara da yansır', async () => {
    const { user, api } = await renderApp({
      route: '#/ayarlar',
      seed: async (a) => {
        await a.addRecord({ tarih: '2026-09-20', sinif: 8, ders: 'Matematik', kaynak: 'Ödev', konu: 'Üslü İfadeler', soru: 10, dogru: 5, yanlis: 0, bos: 5 });
      },
    });
    const r = await screen.findByRole('region', { name: 'Konular' });
    await user.selectOptions(within(r).getByLabelText('Ders'), 'Matematik');
    await user.click(within(r).getByRole('button', { name: 'Üslü İfadeler yeniden adlandır' }));
    const input = within(r).getByLabelText('Yeni ad');
    await user.clear(input);
    await user.type(input, 'Üslü Sayılar');
    await user.click(within(r).getByRole('button', { name: 'Kaydet' }));
    await waitFor(async () => expect((await api.getAll()).kayitlar[0].konu).toBe('Üslü Sayılar'));
  });

  it('aynı adla ders eklenemez; yeni ders eklenir', async () => {
    const { user, api } = await renderApp({ route: '#/ayarlar' });
    const r = await screen.findByRole('region', { name: 'Dersler' });
    await user.type(within(r).getByLabelText('Yeni ders'), 'matematik');
    await user.click(within(r).getByRole('button', { name: 'Ders ekle' }));
    expect(await within(r).findByText('Bu ad zaten var.')).toBeInTheDocument();
    await user.clear(within(r).getByLabelText('Yeni ders'));
    await user.type(within(r).getByLabelText('Yeni ders'), 'Görsel Sanatlar');
    await user.click(within(r).getByRole('button', { name: 'Ders ekle' }));
    await waitFor(async () => expect((await api.getAll()).dersler.some((d) => d.ders === 'Görsel Sanatlar' && d.sinif === 8)).toBe(true));
  });

  it('kullanıcı ekler', async () => {
    const { user } = await renderApp({ route: '#/ayarlar' });
    const r = await screen.findByRole('region', { name: 'Kullanıcılar' });
    await user.type(within(r).getByLabelText('Yeni kullanıcı adı'), 'anne');
    await user.type(within(r).getByLabelText('Görünen ad'), 'Anne');
    await user.type(within(r).getByLabelText('Yeni kullanıcının şifresi'), 'gizli123');
    await user.click(within(r).getByRole('button', { name: 'Kullanıcı ekle' }));
    expect(await within(region('Kullanıcılar')).findByText('@anne')).toBeInTheDocument();
  });

  it('CSV indirir', async () => {
    const create = vi.fn(() => 'blob:x');
    URL.createObjectURL = create;
    URL.revokeObjectURL = vi.fn();
    const { user } = await renderApp({ route: '#/ayarlar' });
    await user.click(await screen.findByRole('button', { name: 'CSV indir' }));
    expect(create).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Başarısız olduğunu doğrula**

Run: `npx vitest run tests/pages/settings.test.tsx`
Expected: FAIL — `region "Konular"` bulunamıyor.

- [ ] **Step 3: `src/components/EditableName.tsx` yaz**

```tsx
import { Pencil } from 'lucide-react';
import { useState } from 'react';
import { IconButton } from './IconButton';
import { btnSm, inputSm } from './ui';

export function EditableName({ value, onSave }: { value: string; onSave: (v: string) => Promise<boolean> }) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(value);
  const [busy, setBusy] = useState(false);

  if (!editing) {
    return (
      <div className="flex min-w-0 items-center gap-1">
        <span className="truncate">{value}</span>
        <IconButton label={`${value} yeniden adlandır`} onClick={() => { setText(value); setEditing(true); }}>
          <Pencil size={15} />
        </IconButton>
      </div>
    );
  }

  return (
    <form
      className="flex flex-wrap items-center gap-2"
      onSubmit={async (e) => {
        e.preventDefault();
        const t = text.trim();
        if (!t || t === value) {
          setEditing(false);
          return;
        }
        setBusy(true);
        const ok = await onSave(t);
        setBusy(false);
        if (ok) setEditing(false);
      }}
    >
      <input aria-label="Yeni ad" autoFocus className={`${inputSm} max-w-64 text-left`} value={text} onChange={(e) => setText(e.target.value)} />
      <button type="submit" className={btnSm} disabled={busy}>Kaydet</button>
      <button type="button" className="text-sm text-muted hover:text-ink" onClick={() => setEditing(false)}>İptal</button>
    </form>
  );
}
```

- [ ] **Step 4: Bölümleri yaz**

`src/pages/settings/SubjectsSection.tsx`:

```tsx
import clsx from 'clsx';
import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Card, CardTitle } from '../../components/Card';
import { EditableName } from '../../components/EditableName';
import { IconButton } from '../../components/IconButton';
import { Segmented } from '../../components/Segmented';
import { btnSm, inputCls, inputSm } from '../../components/ui';
import { subjectsFor } from '../../lib/catalog';
import { subjectColor } from '../../lib/colors';
import type { Grade, Subject } from '../../lib/types';
import { useAppData, useData } from '../../state/DataContext';
import { useAction } from '../../state/useAction';

function NumberCell({ label, value, onCommit }: { label: string; value: number; onCommit: (n: number) => void }) {
  const [v, setV] = useState(String(value));
  useEffect(() => setV(String(value)), [value]);
  return (
    <input
      aria-label={label}
      type="number"
      min={0}
      inputMode="numeric"
      className={clsx(inputSm, 'w-16')}
      value={v}
      onChange={(e) => setV(e.target.value)}
      onBlur={() => {
        const n = Number(v);
        if (v.trim() !== '' && Number.isInteger(n) && n >= 0 && n !== value) onCommit(n);
        else setV(String(value));
      }}
    />
  );
}

export const GRADE_OPTIONS = [
  { value: '7', label: '7. sınıf' },
  { value: '8', label: '8. sınıf' },
] as const;

export function SubjectsSection() {
  const data = useAppData();
  const { runAndReload } = useData();
  const { busy, error, run } = useAction();
  const [sinif, setSinif] = useState<Grade>(8);
  const [name, setName] = useState('');

  const list = subjectsFor(data.dersler, sinif);
  const others = data.dersler.filter((s) => s.sinif !== sinif);
  const save = (next: Subject[]) =>
    run(() => runAndReload((api) => api.saveSubjects([...others, ...next.map((s, i) => ({ ...s, sira: i + 1 }))])));
  const move = (i: number, d: -1 | 1) => {
    const j = i + d;
    if (j < 0 || j >= list.length) return;
    const next = [...list];
    [next[i], next[j]] = [next[j], next[i]];
    void save(next);
  };

  return (
    <Card label="Dersler">
      <CardTitle
        actions={<Segmented label="Ders listesi sınıfı" value={String(sinif) as '7' | '8'} onChange={(v) => setSinif(Number(v) as Grade)} options={[...GRADE_OPTIONS]} />}
      >
        Dersler
      </CardTitle>
      <ul className="divide-y divide-line">
        {list.map((s, i) => (
          <li key={s.ders} className="flex flex-wrap items-center gap-2 py-2.5">
            <span className="size-2.5 shrink-0 rounded-full" style={{ background: subjectColor(s.ders) }} />
            <div className="min-w-0 flex-1">
              <EditableName value={s.ders} onSave={(yeni) => run(() => runAndReload((api) => api.renameSubject(sinif, s.ders, yeni)))} />
            </div>
            <label className="flex items-center gap-2 text-xs text-muted">
              Deneme sorusu
              <NumberCell
                label={`${s.ders} deneme soru sayısı`}
                value={s.deneme_soru_sayisi}
                onCommit={(n) => void save(list.map((x) => (x === s ? { ...x, deneme_soru_sayisi: n } : x)))}
              />
            </label>
            <IconButton label={`${s.ders} yukarı taşı`} disabled={i === 0 || busy} onClick={() => move(i, -1)}>
              <ArrowUp size={16} />
            </IconButton>
            <IconButton label={`${s.ders} aşağı taşı`} disabled={i === list.length - 1 || busy} onClick={() => move(i, 1)}>
              <ArrowDown size={16} />
            </IconButton>
            <IconButton
              label={`${s.ders} kaldır`}
              disabled={busy}
              onClick={() => {
                if (window.confirm(`"${s.ders}" dersi ${sinif}. sınıf listesinden kaldırılsın mı? Geçmiş kayıtlar silinmez.`)) {
                  void save(list.filter((x) => x !== s));
                }
              }}
            >
              <Trash2 size={16} />
            </IconButton>
          </li>
        ))}
      </ul>
      <form
        className="mt-4 flex gap-2"
        onSubmit={async (e) => {
          e.preventDefault();
          const t = name.trim();
          if (!t) return;
          if (await save([...list, { ders: t, sinif, deneme_soru_sayisi: 10, sira: list.length + 1 }])) setName('');
        }}
      >
        <input aria-label="Yeni ders" placeholder="Yeni ders adı" className={inputCls} value={name} onChange={(e) => setName(e.target.value)} />
        <button type="submit" className={clsx(btnSm, 'shrink-0')} disabled={busy}>
          <Plus size={16} /> Ders ekle
        </button>
      </form>
      {error && <p role="alert" className="mt-2 text-sm text-bad">{error}</p>}
    </Card>
  );
}
```

`src/pages/settings/TopicsSection.tsx`:

```tsx
import clsx from 'clsx';
import { Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Card, CardTitle } from '../../components/Card';
import { EditableName } from '../../components/EditableName';
import { Field } from '../../components/Field';
import { IconButton } from '../../components/IconButton';
import { Segmented } from '../../components/Segmented';
import { btnSm, inputCls } from '../../components/ui';
import { subjectsFor, topicsFor } from '../../lib/catalog';
import type { Grade } from '../../lib/types';
import { useAppData, useData } from '../../state/DataContext';
import { useAction } from '../../state/useAction';
import { GRADE_OPTIONS } from './SubjectsSection';

export function TopicsSection() {
  const data = useAppData();
  const { runAndReload } = useData();
  const { busy, error, run } = useAction();
  const [sinif, setSinif] = useState<Grade>(8);
  const [picked, setPicked] = useState('');
  const [name, setName] = useState('');

  const subjects = subjectsFor(data.dersler, sinif);
  const ders = subjects.some((s) => s.ders === picked) ? picked : (subjects[0]?.ders ?? '');
  const list = topicsFor(data.konular, sinif, ders);
  const others = data.konular.filter((t) => !(t.sinif === sinif && t.ders === ders));
  const save = (next: string[]) => run(() => runAndReload((api) => api.saveTopics([...others, ...next.map((konu) => ({ ders, sinif, konu }))])));

  return (
    <Card label="Konular">
      <CardTitle
        actions={<Segmented label="Konu listesi sınıfı" value={String(sinif) as '7' | '8'} onChange={(v) => setSinif(Number(v) as Grade)} options={[...GRADE_OPTIONS]} />}
      >
        Konular
      </CardTitle>
      <Field label="Ders" className="max-w-sm">
        <select className={inputCls} value={ders} onChange={(e) => setPicked(e.target.value)}>
          {subjects.map((s) => (
            <option key={s.ders} value={s.ders}>{s.ders}</option>
          ))}
        </select>
      </Field>
      <ul aria-label="Konu listesi" className="mt-4 divide-y divide-line">
        {list.map((k) => (
          <li key={k} className="flex items-center gap-2 py-2">
            <div className="min-w-0 flex-1">
              <EditableName value={k} onSave={(yeni) => run(() => runAndReload((api) => api.renameTopic(sinif, ders, k, yeni)))} />
            </div>
            <IconButton
              label={`${k} kaldır`}
              disabled={busy}
              onClick={() => {
                if (window.confirm(`"${k}" konusu listeden kaldırılsın mı? Geçmiş kayıtlar silinmez.`)) void save(list.filter((x) => x !== k));
              }}
            >
              <Trash2 size={16} />
            </IconButton>
          </li>
        ))}
      </ul>
      {list.length === 0 && <p className="py-3 text-sm text-muted">Bu ders için henüz konu yok.</p>}
      <form
        className="mt-4 flex gap-2"
        onSubmit={async (e) => {
          e.preventDefault();
          const t = name.trim();
          if (!t || !ders) return;
          if (await save([...list, t])) setName('');
        }}
      >
        <input aria-label="Yeni konu" placeholder="Yeni konu adı" className={inputCls} value={name} onChange={(e) => setName(e.target.value)} />
        <button type="submit" className={clsx(btnSm, 'shrink-0')} disabled={busy}>
          <Plus size={16} /> Konu ekle
        </button>
      </form>
      {error && <p role="alert" className="mt-2 text-sm text-bad">{error}</p>}
    </Card>
  );
}
```

`src/pages/settings/UsersSection.tsx`:

```tsx
import { useState } from 'react';
import { Card, CardTitle } from '../../components/Card';
import { Field } from '../../components/Field';
import { btnSm, inputCls } from '../../components/ui';
import { useAuth } from '../../state/AuthContext';
import { useAppData, useData } from '../../state/DataContext';
import { useAction } from '../../state/useAction';

export function UsersSection() {
  const data = useAppData();
  const { session } = useAuth();
  const { runAndReload } = useData();
  const add = useAction();
  const pw = useAction();
  const [u, setU] = useState('');
  const [ad, setAd] = useState('');
  const [sifre, setSifre] = useState('');
  const [eski, setEski] = useState('');
  const [yeni, setYeni] = useState('');
  const [pwDone, setPwDone] = useState(false);

  return (
    <Card label="Kullanıcılar">
      <CardTitle>Kullanıcılar</CardTitle>
      <ul aria-label="Kullanıcı listesi" className="divide-y divide-line">
        {data.kullanicilar.map((k) => (
          <li key={k.kullanici_adi} className="flex items-center justify-between py-2">
            <span className="font-medium">{k.ad}</span>
            <span className="text-sm text-muted">
              <span>@{k.kullanici_adi}</span>
              {k.kullanici_adi === session?.kullanici_adi && <span> · sen</span>}
            </span>
          </li>
        ))}
      </ul>
      <div className="mt-6 grid gap-8 lg:grid-cols-2">
        <form
          className="space-y-3"
          onSubmit={async (e) => {
            e.preventDefault();
            if (await add.run(() => runAndReload((api) => api.addUser(u, ad, sifre)))) {
              setU('');
              setAd('');
              setSifre('');
            }
          }}
        >
          <h3 className="font-display font-semibold">Yeni kullanıcı</h3>
          <Field label="Yeni kullanıcı adı" hint="küçük harf, rakam, nokta, tire">
            <input className={inputCls} autoCapitalize="none" autoComplete="off" value={u} onChange={(e) => setU(e.target.value)} />
          </Field>
          <Field label="Görünen ad">
            <input className={inputCls} value={ad} onChange={(e) => setAd(e.target.value)} />
          </Field>
          <Field label="Yeni kullanıcının şifresi" hint="en az 6 karakter">
            <input className={inputCls} type="password" autoComplete="new-password" value={sifre} onChange={(e) => setSifre(e.target.value)} />
          </Field>
          {add.error && <p role="alert" className="text-sm text-bad">{add.error}</p>}
          <button type="submit" className={btnSm} disabled={add.busy}>Kullanıcı ekle</button>
        </form>
        <form
          className="space-y-3"
          onSubmit={async (e) => {
            e.preventDefault();
            setPwDone(false);
            if (await pw.run(() => runAndReload((api) => api.changePassword(eski, yeni)))) {
              setEski('');
              setYeni('');
              setPwDone(true);
            }
          }}
        >
          <h3 className="font-display font-semibold">Şifremi değiştir</h3>
          <Field label="Mevcut şifre">
            <input className={inputCls} type="password" autoComplete="current-password" value={eski} onChange={(e) => setEski(e.target.value)} />
          </Field>
          <Field label="Yeni şifre" hint="en az 6 karakter">
            <input className={inputCls} type="password" autoComplete="new-password" value={yeni} onChange={(e) => setYeni(e.target.value)} />
          </Field>
          {pw.error && <p role="alert" className="text-sm text-bad">{pw.error}</p>}
          {pwDone && <p role="status" className="text-sm text-good">Şifre değiştirildi.</p>}
          <button type="submit" className={btnSm} disabled={pw.busy}>Şifreyi değiştir</button>
        </form>
      </div>
    </Card>
  );
}
```

`src/pages/settings/ExportSection.tsx`:

```tsx
import clsx from 'clsx';
import { Download } from 'lucide-react';
import { Card, CardTitle } from '../../components/Card';
import { btnGhost } from '../../components/ui';
import { toCsv } from '../../lib/csv';
import { downloadText } from '../../lib/download';
import { todayIso } from '../../lib/periods';
import { useAppData } from '../../state/DataContext';

export function ExportSection() {
  const data = useAppData();
  return (
    <Card label="Dışa aktar">
      <CardTitle>Dışa aktar</CardTitle>
      <p className="text-sm text-muted">
        Tüm kayıtları Excel'de açılabilen bir CSV dosyası olarak indir. Veriler ayrıca Google Sheet'te de duruyor.
      </p>
      <button
        type="button"
        className={clsx(btnGhost, 'mt-4')}
        onClick={() => downloadText(`goksenin-takip-${todayIso()}.csv`, toCsv(data.kayitlar, data.denemeler), 'text/csv;charset=utf-8')}
      >
        <Download size={16} /> CSV indir
      </button>
    </Card>
  );
}
```

`src/pages/settings/SettingsPage.tsx`:

```tsx
import { PageHeader } from '../../components/PageHeader';
import { ExportSection } from './ExportSection';
import { SubjectsSection } from './SubjectsSection';
import { TopicsSection } from './TopicsSection';
import { UsersSection } from './UsersSection';

export function SettingsPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Ayarlar" subtitle="Dersler, konular, kullanıcılar ve veri dışa aktarma" />
      <div className="grid gap-6 xl:grid-cols-2">
        <SubjectsSection />
        <TopicsSection />
      </div>
      <UsersSection />
      <ExportSection />
    </div>
  );
}
```

- [ ] **Step 5: Rotayı ekle**

`src/App.tsx`: `import { SettingsPage } from './pages/settings/SettingsPage';` ve:

```tsx
            <Route path="ayarlar" element={<SettingsPage />} />
```

- [ ] **Step 6: Testleri çalıştır**

Run: `npx vitest run tests/pages/settings.test.tsx`
Expected: PASS.

- [ ] **Step 7: Tüm testler ve derleme**

Run: `npx vitest run && npm run build`
Expected: tümü PASS, build başarılı.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: ayarlar — ders/konu yönetimi, kullanıcılar, CSV dışa aktarma"
```

---

### Task 15: GitHub Pages yayını ve kurulum rehberi

**Files:**
- Create: `.github/workflows/deploy.yml`, `KURULUM.md`, `README.md`

**Interfaces:**
- Consumes: `npm test`, `npm run build`, `VITE_API_URL` (Actions repository variable).
- Produces: `main` dalına her push'ta test + build + Pages yayını.

- [ ] **Step 1: `.github/workflows/deploy.yml` yaz**

```yaml
name: Yayınla

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 24
          cache: npm
      - run: npm ci
      - run: npx vitest run
      - run: npm run build
        env:
          VITE_API_URL: ${{ vars.VITE_API_URL }}
      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

- [ ] **Step 2: `KURULUM.md` yaz**

````markdown
# Kurulum Rehberi

Bu rehber bir kez yapılır (~15 dakika). Sonunda paylaşılabilir bir link elde edersin.

## 1. Google Sheet ve Apps Script

1. [sheets.new](https://sheets.new) ile boş bir Google Sheet oluştur, adını "Göksenin Takip" yap. **Kimseyle paylaşma.**
2. Menüden **Uzantılar → Apps Script**'i aç.
3. Soldaki `Kod.gs` dosyasının içeriğini sil, bu repodaki `apps-script/Code.gs` içeriğini yapıştır.
4. Sol üstteki **+ → Komut dosyası** ile `Seed` adında yeni dosya ekle, `apps-script/Seed.gs` içeriğini yapıştır.
5. **Proje Ayarları (⚙)**:
   - *Saat dilimi*: `(GMT+03:00) İstanbul`
   - *Komut dosyası özellikleri* → şu üçünü ekle:
     - `SETUP_USER` → ilk kullanıcı adı (ör. `hasan`, küçük harf)
     - `SETUP_PASS` → en az 6 karakterli şifre
     - `SETUP_NAME` → görünen ad (ör. `Hasan`)
6. Editöre dön, üstteki fonksiyon listesinden `setup` seç ve **Çalıştır**. Google izin isteyecek: hesabını seç → *Gelişmiş* → *Göksenin Takip'e git (güvenli değil)* → *İzin ver*. (Bu uyarı, script'i senin yazdığın için çıkar.)
7. Sheet'e dön: `Kayitlar`, `Denemeler`, `Dersler`, `Konular`, `Kullanicilar` sekmeleri oluşmuş olmalı. `SETUP_PASS` güvenlik için otomatik silinir.

## 2. Web App olarak yayınla

1. Apps Script'te **Dağıt → Yeni dağıtım** → tür: **Web uygulaması**.
2. *Şu kullanıcı olarak yürüt*: **Ben**; *Erişimi olanlar*: **Herkes**.
3. **Dağıt** → çıkan **Web uygulaması URL'sini** kopyala (`https://script.google.com/macros/s/.../exec`).

> "Herkes" erişimi yalnızca URL'nin çağrılabilmesi içindir; giriş yapmadan hiçbir veri okunamaz veya yazılamaz. Sheet'in kendisi paylaşılmaz.

**Code.gs'yi sonradan değiştirirsen:** Dağıt → *Dağıtımları yönet* → kalem simgesi → *Sürüm: Yeni sürüm* → Dağıt. (Yeni dağıtım oluşturursan URL değişir.)

## 3. GitHub reposu

1. GitHub'da **public** bir repo oluştur (ör. `goksenin_takip`). Ücretsiz hesapta GitHub Pages yalnızca public repolarda çalışır; veriler repoda değil Sheet'te durduğu için sorun değildir.
2. Bu klasörü repoya gönder:
   ```bash
   git remote add origin https://github.com/<kullanici>/goksenin_takip.git
   git push -u origin main
   ```

## 4. GitHub ayarları

1. Repo → **Settings → Secrets and variables → Actions → Variables → New repository variable**
   - Ad: `VITE_API_URL`, Değer: 2. adımda kopyaladığın URL
2. Repo → **Settings → Pages → Source: GitHub Actions**
3. **Actions** sekmesinde "Yayınla" iş akışını çalıştır (ya da boş bir commit gönder). Yeşil olunca site şu adreste açılır:
   `https://<kullanici>.github.io/goksenin_takip/`

## 5. Paylaşım

- Linki gönder. Kişiye **Ayarlar → Kullanıcılar**'dan kendi hesabını aç ve kullanıcı adı/şifresini ilet.
- Telefonda linki açıp tarayıcı menüsünden **Ana ekrana ekle** dersen uygulama gibi açılır.

## Sorun giderme

| Belirti | Çözüm |
|---|---|
| "Kurulum tamamlanmamış" ekranı | `VITE_API_URL` değişkeni eksik; 4. adımı yapıp iş akışını yeniden çalıştır. |
| "Sunucudan beklenmeyen yanıt geldi" | Web App erişimi "Herkes" değil ya da URL `/exec` ile bitmiyor. |
| "Kayitlar sekmesi bulunamadı" | Apps Script'te `setup` çalıştırılmamış. |
| Giriş yapılamıyor | Kullanıcı adı küçük harfle yazılmalı; ilk kullanıcı `SETUP_USER` değeridir. |
````

- [ ] **Step 3: `README.md` yaz**

````markdown
# Göksenin Net Takip

7. ve 8. sınıf deneme, ödev ve kendi çözdüğü test sonuçlarını kaydeden; haftalık/aylık net gelişimini analiz eden ve sıralayan web uygulaması.

- **Net** = doğru − yanlış ÷ 4 (boşlar etkisiz). İyileşme **net oranı** (net ÷ soru) üzerinden, ±2 puan eşiğiyle değerlendirilir.
- Frontend: React + Vite + Tailwind + Recharts, GitHub Pages'te.
- Backend: Google Apps Script + Google Sheet (`apps-script/`).

## Geliştirme

```bash
npm install
npm run dev      # VITE_API_URL yoksa tarayıcıda çalışan mock backend: demo / demo123
npx vitest run   # testler
npm run build
```

Yayına alma ve Google Sheet kurulumu için: [KURULUM.md](KURULUM.md)
````

- [ ] **Step 4: Üretim derlemesinin yapılandırmasız halde hata ekranı verdiğini doğrula**

Run: `npm run build && npx vite preview --port 4173` → `http://localhost:4173` aç.
Expected: "Kurulum tamamlanmamış" ekranı (VITE_API_URL verilmedi). Sonra durdur ve:
Run: `VITE_API_URL=https://example.invalid/exec npm run build && npx vite preview --port 4173`
Expected: giriş sayfası açılır; giriş denemesi "Sunucuya ulaşılamadı…" gösterir. Durdur, `npm run build` ile `dist`'i normal hale getir.

- [ ] **Step 5: Commit**

```bash
git add .github KURULUM.md README.md
git commit -m "chore: GitHub Pages iş akışı, kurulum rehberi ve README"
```

---

### Task 16: Son doğrulama

**Files:** değişiklik yok (bulunan hatalar ilgili task'ın dosyalarında düzeltilir).

- [ ] **Step 1: Tüm testler, tip kontrolü, derleme**

Run: `npx vitest run && npm run build`
Expected: tüm test dosyaları PASS, build hatasız. Çıktıdaki test sayısını not et.

- [ ] **Step 2: Tarayıcıda uçtan uca (mock backend)**

`npm run dev` ile aç (claude-in-chrome veya `run` skill'i kullanılabilir) ve şunları sırayla doğrula, her biri için ekran görüntüsü al:
1. `demo / demo123` giriş; yanlış şifre mesajı.
2. Veri Girişi → Ödev: 25 soru, 16 D, 4 Y → Boş 5, Net 15; kaydet; son kayıtlarda görünür; düzenle ve sil.
3. Deneme: ad + birkaç ders satırı; toplam net; kaydet.
4. Analiz: haftalık/aylık geçiş, ders çipleri, tabloda ▲/▼.
5. Sıralama: dört sekme, yön düğmesi, en az soru eşiği.
6. Ayarlar: konu ekle/yeniden adlandır, kullanıcı ekle, CSV indir ve dosyayı Excel/Numbers'ta aç (Türkçe karakterler ve sütunlar doğru).
7. 375px genişlikte alt menü; koyu tema.

- [ ] **Step 3: Gerçek backend ile duman testi (kullanıcıyla birlikte)**

KURULUM.md 1-2. adımlarını kullanıcı yapar ve Web App URL'sini verir. Sonra:
Run: `VITE_API_URL=<url> npm run dev`
Doğrula: giriş, bir ödev kaydı, bir deneme kaydı → Google Sheet'te `Kayitlar` satırları ve `tarih` sütunu `2026-..-..` metni olarak görünüyor; kaydı sil → satır kalkıyor.

- [ ] **Step 4: GitHub'a gönderim — KULLANICIYA SOR**

Repo oluşturmak ve push etmek dışa dönük bir işlemdir: kullanıcıdan açık onay al (repo adı, public). Onaydan sonra:

```bash
gh repo create goksenin_takip --public --source . --remote origin --push
gh variable set VITE_API_URL --body "<url>"
```

Pages kaynağını "GitHub Actions" yapmak için kullanıcıya KURULUM.md 4.2'yi uygulat (veya `gh api -X POST repos/{owner}/goksenin_takip/pages -f build_type=workflow`). İş akışı yeşil olunca yayındaki linki aç, girişi dene ve linki kullanıcıya ilet.
