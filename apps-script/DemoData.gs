/**
 * Demo veri: uygulamayı denemek için rastgele ama tutarlı kayıtlar üretir.
 * Kullanım (Apps Script editöründe, bir kez): demoVerileriOlustur()
 * Temizlik: demoVerileriniSil() — yalnızca "demo-veri" ile işaretli satırları siler.
 * Üst düzey tanımlar yalnızca `var` ve `function` (testler dosyayı Node vm içinde yükler).
 */

var DEMO_USER = 'demo-veri';
var DEMO_RANGES = {
  7: { from: '2025-09-08', to: '2026-06-19', exams: 10, examName: '7. Sınıf Genel Deneme ' },
  8: { from: '2026-06-22', to: null, exams: 8, examName: 'LGS Deneme ' }
};
var DEMO_MIN_TOTAL = 250;
var DEMO_MAX_TOTAL = 1500;

/* ---------------- Saf üretici (test edilir) ---------------- */

// Tohumlu rastgele sayı üreteci (mulberry32): aynı tohum aynı veriyi verir.
function demoRng_(seed) {
  var a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    var t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function demoDay_(iso) {
  var p = iso.split('-').map(Number);
  return Date.UTC(p[0], p[1] - 1, p[2]) / 86400000;
}

function demoIso_(day) {
  return new Date(day * 86400000).toISOString().slice(0, 10);
}

function demoCounts_(soru, p, rnd) {
  var dogru = Math.max(0, Math.min(soru, Math.round(soru * p)));
  var kalan = soru - dogru;
  var yanlis = Math.round(kalan * (0.45 + rnd() * 0.3));
  return { soru: soru, dogru: dogru, yanlis: yanlis, bos: kalan - yanlis };
}

function demoClamp_(x) {
  return Math.max(0.15, Math.min(0.97, x));
}

/**
 * dersler/konular: Dersler ve Konular sekmelerinin içeriği; today: 'yyyy-MM-dd'.
 * Ödev ve Kendi Çözdüğü için her konuda toplam 250–1500 soru, testlere bölünmüş;
 * denemeler her dersin deneme soru sayısıyla (MEB: toplam 90).
 */
function buildDemoData_(dersler, konular, today, seed, newId) {
  var rnd = demoRng_(seed);
  var between = function (min, max) { return min + Math.floor(rnd() * (max - min + 1)); };
  var kayitlar = [];
  var denemeler = [];

  [7, 8].forEach(function (sinif) {
    var range = DEMO_RANGES[sinif];
    var start = demoDay_(range.from);
    var end = demoDay_(range.to && range.to < today ? range.to : today);
    if (end < start) return;
    var progress = function (day) { return end === start ? 1 : (day - start) / (end - start); };
    var subjects = dersler.filter(function (s) { return s.sinif === sinif; }).sort(function (a, b) { return a.sira - b.sira; });
    var skill = {};
    subjects.forEach(function (s) { skill[s.ders] = 0.5 + rnd() * 0.22; });

    // Ödev ve Kendi Çözdüğü: konu başına toplam 250–1500 soru, 15–50 soruluk testler.
    konular.filter(function (t) { return t.sinif === sinif && skill[t.ders] !== undefined; }).forEach(function (t) {
      var topicOffset = (rnd() - 0.5) * 0.3;
      ['Ödev', 'Kendi Çözdüğü'].forEach(function (kaynak) {
        var remaining = between(DEMO_MIN_TOTAL, DEMO_MAX_TOTAL);
        var sourceOffset = kaynak === 'Kendi Çözdüğü' ? 0.03 : 0;
        while (remaining > 0) {
          var soru = Math.min(remaining, between(15, 50));
          if (remaining - soru > 0 && remaining - soru < 15) soru = remaining;
          remaining -= soru;
          var day = between(start, end);
          var p = demoClamp_(skill[t.ders] + topicOffset + sourceOffset + 0.12 * progress(day) + (rnd() - 0.5) * 0.16);
          var c = demoCounts_(soru, p, rnd);
          var tarih = demoIso_(day);
          kayitlar.push({
            id: newId(), tarih: tarih, sinif: sinif, ders: t.ders, kaynak: kaynak, konu: t.konu,
            soru: c.soru, dogru: c.dogru, yanlis: c.yanlis, bos: c.bos, deneme_id: '',
            giren_kullanici: DEMO_USER, olusturma_zamani: tarih + 'T18:00:00.000Z'
          });
        }
      });
    });

    // Denemeler: aralığa eşit dağılmış, her derste dersin deneme soru sayısı.
    for (var k = 0; k < range.exams; k++) {
      var slot = (end - start) / range.exams;
      var examDay = Math.min(end, Math.round(start + slot * k + rnd() * Math.max(0, slot - 1)));
      var exam = { deneme_id: newId(), ad: range.examName + (k + 1), tarih: demoIso_(examDay), sinif: sinif };
      denemeler.push(exam);
      subjects.forEach(function (s) {
        var p = demoClamp_(skill[s.ders] + 0.1 * progress(examDay) + (rnd() - 0.5) * 0.12);
        var c = demoCounts_(s.deneme_soru_sayisi, p, rnd);
        kayitlar.push({
          id: newId(), tarih: exam.tarih, sinif: sinif, ders: s.ders, kaynak: 'Deneme', konu: '',
          soru: c.soru, dogru: c.dogru, yanlis: c.yanlis, bos: c.bos, deneme_id: exam.deneme_id,
          giren_kullanici: DEMO_USER, olusturma_zamani: exam.tarih + 'T12:00:00.000Z'
        });
      });
    }
  });

  kayitlar.sort(function (a, b) { return a.tarih < b.tarih ? -1 : a.tarih > b.tarih ? 1 : 0; });
  denemeler.sort(function (a, b) { return a.tarih < b.tarih ? -1 : a.tarih > b.tarih ? 1 : 0; });
  return { kayitlar: kayitlar, denemeler: denemeler };
}

// Koşulu sağlamayan satırları tek seferde kaldırır (satır satır silmek binlerce satırda çok yavaş).
function keepRows_(name, keep) {
  var sh = sheet_(name), h = SHEETS[name], last = sh.getLastRow();
  if (last < 2) return 0;
  var range = sh.getRange(2, 1, last - 1, h.length);
  var values = range.getValues();
  var kept = values.filter(function (row) { return row.join('') !== '' && keep(toObject_(h, row)); });
  var removed = values.filter(function (row) { return row.join('') !== ''; }).length - kept.length;
  range.clearContent();
  if (kept.length) sh.getRange(2, 1, kept.length, h.length).setValues(kept);
  return removed;
}

// Yeni eklenecek satırlarda da metin sütunları düz metin olsun (tarih Date'e dönüşmesin).
function prepareTextColumns_(name, lastRow) {
  var sh = sheet_(name), h = SHEETS[name];
  ensureRows_(sh, lastRow);
  h.forEach(function (col, j) {
    if (NUMERIC_COLUMNS.indexOf(col) === -1) sh.getRange(1, j + 1, sh.getMaxRows(), 1).setNumberFormat('@');
  });
}

/* ---------------- Editörden çalıştırılan fonksiyonlar ---------------- */

function demoVerileriOlustur() {
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    if (readAll_('Kayitlar').some(function (r) { return r.giren_kullanici === DEMO_USER; })) {
      throw new Error('Demo veriler zaten var. Yeniden üretmek için önce demoVerileriniSil() çalıştırın.');
    }
    var data = buildDemoData_(readAll_('Dersler').map(strip_), readAll_('Konular').map(strip_), today_(), Date.now(), function () {
      return Utilities.getUuid();
    });
    prepareTextColumns_('Denemeler', sheet_('Denemeler').getLastRow() + data.denemeler.length);
    prepareTextColumns_('Kayitlar', sheet_('Kayitlar').getLastRow() + data.kayitlar.length);
    appendMany_('Denemeler', data.denemeler);
    appendMany_('Kayitlar', data.kayitlar);
    Logger.log('Demo veri eklendi: ' + data.kayitlar.length + ' kayıt satırı, ' + data.denemeler.length + ' deneme.');
  } finally {
    lock.releaseLock();
  }
}

function demoVerileriniSil() {
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    var demoExams = {};
    readAll_('Kayitlar').forEach(function (r) {
      if (r.giren_kullanici === DEMO_USER && r.deneme_id) demoExams[r.deneme_id] = true;
    });
    var rows = keepRows_('Kayitlar', function (o) { return o.giren_kullanici !== DEMO_USER; });
    var exams = keepRows_('Denemeler', function (o) { return !demoExams[o.deneme_id]; });
    Logger.log('Silindi: ' + rows + ' kayıt satırı, ' + exams + ' deneme. Gerçek kayıtlara dokunulmadı.');
  } finally {
    lock.releaseLock();
  }
}
