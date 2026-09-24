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

function isClientId_(x) {
  return typeof x === 'string' && /^[A-Za-z0-9-]{8,64}$/.test(x);
}

// Bağlantı yazmadan sonra koparsa istemci aynı kimlikle tekrar dener; ikinci kayıt açılmaz.
function addRecord_(p, user) {
  if (isClientId_(p.id)) {
    var existing = readAll_('Kayitlar').filter(function (x) { return x.id === p.id; })[0];
    if (existing) return strip_(existing);
  }
  var input = p.input || {};
  requireValid_(validateRecord_(input, today_()));
  var rec = cleanRecordInput_(input);
  rec.id = isClientId_(p.id) ? p.id : Utilities.getUuid();
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
  if (isClientId_(p.deneme_id)) {
    var found = readAll_('Denemeler').filter(function (x) { return x.deneme_id === p.deneme_id; })[0];
    if (found) {
      var rows = readAll_('Kayitlar').filter(function (r) { return r.deneme_id === found.deneme_id; });
      return { exam: strip_(found), rows: rows.map(strip_) };
    }
  }
  var input = p.input || {};
  requireValid_(validateExam_(input, today_()));
  var exam = { deneme_id: isClientId_(p.deneme_id) ? p.deneme_id : Utilities.getUuid(), ad: input.ad.trim(), tarih: input.tarih, sinif: input.sinif };
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
