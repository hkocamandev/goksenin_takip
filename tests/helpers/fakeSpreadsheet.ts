// Bellekte çalışan küçük bir Google Sheets taklidi: yalnızca Code.gs ve Yedek.gs'nin kullandığı çağrılar.

export type Cell = string | number;

export class FakeSheet {
  rows: Cell[][] = [];
  maxRows = 1000;
  frozen = 0;
  constructor(public name: string) {}

  getName() { return this.name; }
  setName(n: string) { this.name = n; return this; }
  getLastRow() {
    for (let i = this.rows.length - 1; i >= 0; i--) if (this.rows[i]?.some((c) => c !== '')) return i + 1;
    return 0;
  }
  getMaxRows() { return this.maxRows; }
  insertRowsAfter(_after: number, n: number) { this.maxRows += n; }
  setFrozenRows(n: number) { this.frozen = n; }
  deleteRow(r: number) { this.rows.splice(r - 1, 1); }
  getDataRange() {
    const last = this.getLastRow();
    const width = Math.max(0, ...this.rows.slice(0, last).map((r) => r.length));
    return this.getRange(1, 1, Math.max(last, 1), Math.max(width, 1));
  }
  getRange(row: number, col: number, nr = 1, nc = 1) {
    const sheet = this;
    const range = {
      getValues: () =>
        Array.from({ length: nr }, (_, i) => Array.from({ length: nc }, (_, j) => sheet.rows[row - 1 + i]?.[col - 1 + j] ?? '')),
      setValues: (v: Cell[][]) => {
        v.forEach((r, i) => {
          const target = (sheet.rows[row - 1 + i] ??= []);
          r.forEach((c, j) => { target[col - 1 + j] = c; });
        });
        for (let i = 0; i < sheet.rows.length; i++) sheet.rows[i] ??= [];
        return range;
      },
      clearContent: () => {
        for (let i = row - 1; i < row - 1 + nr; i++) {
          if (!sheet.rows[i]) continue;
          for (let j = col - 1; j < col - 1 + nc; j++) sheet.rows[i][j] = '';
        }
        return range;
      },
      setNumberFormat: () => range,
      setFontWeight: () => range,
    };
    return range;
  }
  copyTo(dest: FakeSpreadsheet) {
    const s = dest.insertSheet(`Copy of ${this.name}`);
    s.rows = this.rows.map((r) => [...r]);
    return s;
  }
  // Başlığı atlayıp dolu satırları nesneye çevirir (testlerde okumayı kolaylaştırır).
  objects() {
    const [header, ...body] = this.rows.slice(0, this.getLastRow());
    return body.filter((r) => r.some((c) => c !== '')).map((r) => Object.fromEntries(header.map((h, j) => [h, r[j] ?? ''])));
  }
}

export class FakeSpreadsheet {
  sheets: FakeSheet[] = [];
  constructor(public id = 'ss-1', public name = 'Göksenin Takip') {}
  getId() { return this.id; }
  getName() { return this.name; }
  getSheets() { return [...this.sheets]; }
  getSheetByName(n: string) { return this.sheets.find((s) => s.name === n) ?? null; }
  insertSheet(n: string) {
    const s = new FakeSheet(n);
    this.sheets.push(s);
    return s;
  }
  deleteSheet(s: FakeSheet) { this.sheets = this.sheets.filter((x) => x !== s); }
  getSpreadsheetTimeZone() { return 'Europe/Istanbul'; }
}

// headers: SHEETS tanımı; data: sekme adı → satır nesneleri.
export function makeBook(headers: Record<string, string[]>, data: Record<string, Record<string, Cell>[]> = {}) {
  const book = new FakeSpreadsheet();
  for (const [name, h] of Object.entries(headers)) {
    const s = book.insertSheet(name);
    s.rows = [[...h], ...(data[name] ?? []).map((o) => h.map((k) => o[k] ?? ''))];
  }
  return book;
}
