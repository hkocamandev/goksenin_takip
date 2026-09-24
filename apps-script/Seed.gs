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
