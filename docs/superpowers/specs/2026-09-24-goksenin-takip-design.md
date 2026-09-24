# Göksenin Takip — Tasarım Dokümanı

Tarih: 2026-09-24
Durum: Onaylandı (sohbet içinde bölüm bölüm), yazılı spec incelemesi bekleniyor

## 1. Amaç

7. ve 8. sınıf öğrencisi (tek öğrenci) için çözülen test, ödev ve deneme sınavlarının
doğru / yanlış / boş sayılarını kaydetmek; haftalık ve aylık net gelişimini analiz etmek;
dersleri, konuları ve denemeleri en iyiden en kötüye sıralamak.

Uygulama GitHub Pages üzerinden bir link olarak yayınlanır ve linki alan, teknik bilgisi
olmayan aile üyeleri tarafından (çoğunlukla telefondan) kullanılır.

### Başarı ölçütleri
- Linki alan biri kullanıcı adı/şifre ile giriş yapıp 1 dakikadan kısa sürede bir kayıt girebilir.
- Farklı cihazlardan giren tüm kullanıcılar aynı veriyi görür.
- Analiz sayfası seçilen dönemi bir önceki dönemle net oranı üzerinden karşılaştırır ve
  iyileşme/kötüleşmeyi gösterir.
- Veri, Excel'de açılabilen bir Google Sheet'te durur; CSV olarak indirilebilir.

## 2. Temel kavramlar ve hesaplamalar

- **Sınıf:** 7 veya 8.
- **Ders:** Düzenlenebilir liste. Başlangıç (MEB resmi adları):
  - 7. sınıf: Türkçe, Matematik, Fen Bilimleri, Sosyal Bilgiler, Din Kültürü ve Ahlak Bilgisi, İngilizce
  - 8. sınıf: Türkçe, Matematik, Fen Bilimleri, T.C. İnkılap Tarihi ve Atatürkçülük, Din Kültürü ve Ahlak Bilgisi, İngilizce
- **Kaynak:** Sabit üç değer — `Deneme`, `Ödev`, `Kendi Çözdüğü`.
- **Konu:** Ders + sınıf başına düzenlenebilir liste; başlangıçta MEB müfredat konularıyla doldurulur.
- **Net** = doğru − yanlış / 3 (3 yanlış 1 doğruyu götürür; 2026-09-24 kullanıcı düzeltmesiyle 4 yerine 3). Boşlar etkisizdir. Net negatif olabilir.
- **Net oranı** = net / soru sayısı × 100. İyileşme ve sıralamaların temel ölçüsüdür.
  Birden çok kaydın toplu net oranı = Σnet / Σsoru × 100 (kayıt başı oranların ortalaması değil).
- Net ve net oranı Sheet'te saklanmaz; her zaman ham D/Y/B'den hesaplanır.

## 3. Mimari

```
[GitHub Pages: React uygulaması]  ──fetch (POST, text/plain)──►  [Apps Script Web App]  ──►  [Google Sheet]
                                                                  (login, CRUD, doğrulama)
```

- **Frontend:** React + Vite + TypeScript + Tailwind CSS + Recharts. GitHub Actions ile
  build edilip GitHub Pages'e yayınlanır (push → otomatik yayın).
- **Backend:** Google Apps Script Web App ("Execute as: Me", "Anyone" erişimi). Tüm istekler
  tek bir `doPost` ucuna `{ action, token, payload }` gövdesiyle gider. CORS preflight'tan
  kaçınmak için `Content-Type: text/plain` kullanılır.
- **Veri:** Google Sheet. Sheet kimseyle paylaşılmaz; yalnızca script üzerinden erişilir.
- **Mock backend:** Geliştirme için, aynı arayüzü uygulayan ve örnek veriyle çalışan yerel
  bir adaptör. `VITE_API_URL` tanımlı değilse mock kullanılır.

### Sheet sekmeleri

| Sekme | Kolonlar |
|---|---|
| `Kayitlar` | `id, tarih, sinif, ders, kaynak, konu, soru, dogru, yanlis, bos, deneme_id, giren_kullanici, olusturma_zamani` |
| `Denemeler` | `deneme_id, ad, tarih, sinif` |
| `Dersler` | `ders, sinif, deneme_soru_sayisi, sira` |
| `Konular` | `ders, sinif, konu` |
| `Kullanicilar` | `kullanici_adi, sifre_hash, salt, ad` |

- Deneme sınavı, her ders için bir `Kayitlar` satırı olarak saklanır; satırlar `deneme_id` ile
  `Denemeler` sekmesindeki kayda bağlanır. Deneme dışı kayıtlarda `deneme_id` boştur.
- `tarih` ISO formatında (`YYYY-MM-DD`) saklanır.

### Kimlik doğrulama
- Birden fazla kullanıcı hesabı, hepsi aynı yetkide (ekleme, düzenleme, silme, ayarlar,
  kullanıcı ekleme).
- Şifreler kullanıcı başı salt ile SHA-256 hash olarak saklanır.
- `login` başarılıysa rastgele bir oturum token'ı üretilir ve Apps Script `PropertiesService`'te
  son kullanma zamanıyla saklanır: "Beni hatırla" seçiliyse 30 gün, değilse 1 gün.
- `login` dışındaki her istek geçerli token ister; geçersiz/süresi dolmuş token →
  `{ ok: false, error: "AUTH" }`.
- İlk kullanıcı `setup()` sırasında oluşturulur.

### API eylemleri
`login`, `logout`, `getAll` (kayıtlar, denemeler, dersler, konular, kullanıcı adları),
`addRecord`, `updateRecord`, `deleteRecord`, `addExam` (deneme + ders satırları tek işlemde),
`updateExam`, `deleteExam`, `saveSubjects`, `saveTopics`, `renameSubject`, `renameTopic`,
`addUser`, `changePassword`.

Yanıt biçimi: `{ ok: true, data }` veya `{ ok: false, error, message }`.
Yazma işlemleri `LockService` ile sıraya alınır.

Analiz hesaplamaları tamamen frontend'de, `getAll` ile çekilen veri üzerinde yapılır
(tek öğrencinin veri hacmi küçüktür).

## 4. Sayfalar

Genel: koyu/açık tema; masaüstünde sol menü, telefonda alt sekme çubuğu; her derse sabit
bir renk atanır ve tüm grafik ve etiketlerde tutarlı kullanılır. Görsel detaylar uygulama
aşamasında frontend-design yönergeleriyle belirlenir.

### 4.1 Giriş
Kullanıcı adı, şifre, "Beni hatırla". Token tarayıcıda (`localStorage`) saklanır.

### 4.2 Veri girişi
Üç sekme: **Deneme | Ödev | Kendi Çözdüğü**.

- **Ödev / Kendi Çözdüğü:** Tarih (varsayılan bugün), Sınıf, Ders, Konu (seçilen ders ve
  sınıfa göre açılır liste), Soru, Doğru, Yanlış, Boş.
  - Boş, varsayılan olarak `soru − doğru − yanlış` şeklinde otomatik doldurulur; kullanıcı
    elle değiştirebilir.
  - Canlı net ve net oranı gösterilir.
- **Deneme:** Deneme adı, tarih, sınıf. Altında seçilen sınıfın her dersi için bir satır:
  soru (dersin `deneme_soru_sayisi` değeriyle önceden dolu, değiştirilebilir), D, Y, B (otomatik).
  - Satır başına net, altta toplam net.
  - D ve Y alanları boş bırakılan ders satırı kaydedilmez.
  - Konu alanı yok.
- Sayfanın altında son 10 kayıt listelenir; buradan kayıt ve denemeler düzenlenip silinebilir.

### 4.3 Analiz
- Filtreler: **Haftalık | Aylık**, Sınıf, Ders (çoklu seçim), Kaynak, tarih aralığı.
- **Özet kartlar:** toplam net, ortalama net oranı, bu dönemin önceki döneme göre değişimi,
  çözülen soru sayısı.
- **Ana grafik:** her dönem için toplam net barları + net oranı çizgisi (ikincil eksen).
- **Ders karşılaştırma tablosu:** ders | önceki dönem net oranı | bu dönem net oranı | değişim.
- **Deneme trendi:** her denemenin toplam neti, ders kırılımıyla üst üste bar.
- Dönem tanımları: hafta pazartesi başlar; ay, takvim ayıdır. "Bu dönem" filtredeki tarih
  aralığının son dönemidir, "önceki dönem" ondan hemen önceki dönemdir.
- **İyileşme eşiği:** net oranı değişimi ≥ +2 puan → ▲ iyileşme, ≤ −2 puan → ▼ kötüleşme,
  arası → "sabit". Önceki dönemde veri yoksa değişim "—".

### 4.4 Sıralama
Dört sekme; hepsinde ortak filtreler (Sınıf, Kaynak, tarih aralığı) ve
"en iyi → en kötü / en kötü → en iyi" düğmesi. Her satırda net oranı çubukla gösterilir.

- **Dersler:** ders başına toplu net oranı.
- **Konular:** konu başına toplu net oranı; yalnızca toplam soru sayısı en az eşik
  değeri (varsayılan 10, sayfada ayarlanabilir) olan konular listelenir. Konusu boş
  kayıtlar hariç tutulur.
- **Denemeler:** toplam net (denemeler arası soru sayısı sabit kabul edilir; toplam net
  oranı da gösterilir).
- **En çok gelişen / gerileyen:** seçilen dönem tipine (hafta/ay) göre son dönem ile önceki
  dönem arasındaki net oranı farkı; dersler ve konular için ayrı listeler. İki dönemde de
  verisi olan öğeler dahil edilir.

### 4.5 Ayarlar
- **Dersler:** ekle, sil, yeniden adlandır, deneme soru sayısı ve sıra düzenle (sınıf başına).
- **Konular:** ders + sınıf seç; konu ekle, sil, yeniden adlandır.
- **Kullanıcılar:** kullanıcı ekle, kendi şifresini değiştir.
- **Tüm veriyi CSV indir.**

## 5. Kurallar ve hata durumları

- **Doğrulama (frontend ve Apps Script'te aynı kurallar):**
  - tarih geçerli ve gelecekte değil;
  - sınıf ∈ {7, 8};
  - kaynak geçerli;
  - soru ≥ 1;
  - doğru, yanlış, boş ≥ 0 tam sayı;
  - doğru + yanlış + boş = soru;
  - deneme adı boş değil.
- **Kaydetme:** istek sürerken düğme kilitlenir (çift kayıt önlenir). Hata olursa form
  değerleri korunur ve "Tekrar dene" gösterilir.
- **Oturum süresi dolması:** giriş sayfasına yönlendirilir; kaydedilmemiş form taslağı
  `localStorage`'da tutulur ve girişten sonra geri yüklenir.
- **Yeniden adlandırma:** ders veya konu adı değişince `Kayitlar`, `Konular` ve `Dersler`
  sekmelerindeki ilgili değerler de güncellenir.
- **Silme:** Kaydı bulunan konu listeden silinebilir; geçmiş kayıtlar korunur ve analizde
  görünmeye devam eder. Ders silme de aynı şekildedir.
- **Eşzamanlı yazma:** `LockService` ile sıralı yazılır.
- **Boş veri:** seçilen dönemde kayıt yoksa grafik yerine "Bu dönemde kayıt yok" mesajı.

## 6. Test yaklaşımı

- Tüm hesaplamalar React'tan bağımsız saf fonksiyonlar olarak (`src/lib/`) yazılır ve
  Vitest ile TDD uygulanır:
  - net, net oranı, toplu net oranı;
  - haftalık/aylık gruplama (pazartesi başlangıcı, ay ve yıl sınırları);
  - dönem karşılaştırması ve ±2 eşiği;
  - sıralamalar, konu eşik filtresi, en çok gelişen/gerileyen;
  - deneme toplamları;
  - doğrulama kuralları.
- Apps Script tarafı ince tutulur; doğrulama mantığı frontend ile aynı kuralları uygular.
  Uçtan uca akış kurulum sonrası elle bir kez doğrulanır.
- Mock backend ile uygulama Sheet kurulmadan yerelde çalıştırılabilir.

## 7. Kurulum ve yayın

1. Boş bir Google Sheet oluştur → *Uzantılar → Apps Script* → `apps-script/Code.gs` içeriğini yapıştır.
2. Script özelliklerine ilk kullanıcı bilgisini gir, `setup()` fonksiyonunu bir kez çalıştır:
   sekmeler, ders ve MEB konu listeleri ve ilk kullanıcı oluşur.
3. *Deploy → New deployment → Web app* ("Execute as: Me", "Who has access: Anyone"),
   çıkan URL'yi kopyala.
4. GitHub reposunda `VITE_API_URL` adında bir Actions değişkeni oluştur; *Settings → Pages →
   Source: GitHub Actions* seç.
5. Push et; site `https://<kullanici>.github.io/goksenin_takip/` adresinde yayınlanır.

Repoda Türkçe, adım adım bir `KURULUM.md` rehberi bulunur.

## 8. Kapsam dışı

Bildirim veya e-posta, PDF rapor, birden fazla öğrenci desteği, çevrimdışı çalışma, rol
bazlı yetkilendirme, özelleştirilebilir kaynak türleri.
