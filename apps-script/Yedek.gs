/**
 * Günlük yedek: tüm sekmeleri Drive'daki "Göksenin Takip Yedekler" klasörüne tarihli bir kopya olarak kaydeder.
 * Kurulum (Apps Script editöründe, bir kez): yedeklemeyiKur() — her gece 03:00 civarı çalışan tetikleyiciyi kurar ve ilk yedeği alır.
 * Saklama: son YEDEK_GUN günün yedekleri ve her ayın ilk yedeği kalır; daha eskileri çöp kutusuna gider (Drive 30 gün daha tutar).
 */

var YEDEK_KLASOR = 'Göksenin Takip Yedekler';
var YEDEK_ON_EK = 'Göksenin Takip Yedek ';
var YEDEK_GUN = 30;
var YEDEK_SAAT = 3;

function yedekKlasoru_() {
  var props = PropertiesService.getScriptProperties();
  var id = props.getProperty('YEDEK_KLASOR_ID');
  if (id) {
    try {
      var existing = DriveApp.getFolderById(id);
      if (!existing.isTrashed()) return existing;
    } catch (e) {
      // Klasör silinmiş ya da erişilemiyor: yenisi açılır.
    }
  }
  var folder = DriveApp.createFolder(YEDEK_KLASOR);
  props.setProperty('YEDEK_KLASOR_ID', folder.getId());
  return folder;
}

function yedekTarihi_(name) {
  if (name.indexOf(YEDEK_ON_EK) !== 0) return null;
  var d = name.slice(YEDEK_ON_EK.length);
  return isIsoDate_(d) ? d : null;
}

// Silinecek yedek adlarını döndürür. Kalanlar: son `gun` günün yedekleri (bugün dahil) ve her ayın en eski yedeği.
function silinecekYedekler_(names, bugun, gun) {
  var dayOf = function (iso) { var p = iso.split('-').map(Number); return Date.UTC(p[0], p[1] - 1, p[2]) / DAY_MS; };
  var dated = names.map(function (n) { return { name: n, tarih: yedekTarihi_(n) }; }).filter(function (x) { return x.tarih; });
  var monthFirst = {};
  dated.forEach(function (x) {
    var ay = x.tarih.slice(0, 7);
    if (!monthFirst[ay] || x.tarih < monthFirst[ay]) monthFirst[ay] = x.tarih;
  });
  return dated.filter(function (x) {
    return dayOf(bugun) - dayOf(x.tarih) >= gun && monthFirst[x.tarih.slice(0, 7)] !== x.tarih;
  }).map(function (x) { return x.name; });
}

function yedekDosyalari_(folder) {
  var out = [], it = folder.getFiles();
  while (it.hasNext()) out.push(it.next());
  return out;
}

function yedekAl() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var bugun = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
  var ad = YEDEK_ON_EK + bugun;
  var folder = yedekKlasoru_();
  // Aynı gün elle ve tetikleyiciyle iki kez çalışırsa en yenisi kalır.
  yedekDosyalari_(folder).forEach(function (f) { if (f.getName() === ad) f.setTrashed(true); });

  // Kopyalama sırasında yazma olmasın diye kilit alınır: yedek tutarlı bir anın görüntüsü olur.
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  var copy;
  try {
    copy = SpreadsheetApp.create(ad);
    var bos = copy.getSheets()[0];
    var kopyalar = ss.getSheets().map(function (sh) { return { ad: sh.getName(), kopya: sh.copyTo(copy) }; });
    copy.deleteSheet(bos);
    kopyalar.forEach(function (k) { k.kopya.setName(k.ad); });
  } finally {
    lock.releaseLock();
  }
  DriveApp.getFileById(copy.getId()).moveTo(folder);

  var files = yedekDosyalari_(folder);
  var sil = silinecekYedekler_(files.map(function (f) { return f.getName(); }), bugun, YEDEK_GUN);
  files.forEach(function (f) { if (sil.indexOf(f.getName()) !== -1) f.setTrashed(true); });
  Logger.log('Yedek alındı: ' + ad + '. ' + sil.length + ' eski yedek silindi.');
}

function yedeklemeyiKur() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'yedekAl') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('yedekAl').timeBased().everyDays(1).atHour(YEDEK_SAAT).create();
  yedekAl();
  Logger.log('Günlük yedekleme kuruldu: her gece ' + YEDEK_SAAT + ':00 civarı "' + YEDEK_KLASOR + '" klasörüne.');
}
