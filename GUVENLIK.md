# Güvenlik

Bu belge uygulamanın neye karşı korunduğunu, hangi önlemlerin alındığını, bilinçli olarak kabul edilen riskleri ve sahibin yapması gerekenleri anlatır.

## Saldırı yüzeyi

| Parça | Kim erişebilir | Ne içerir |
|---|---|---|
| GitHub Pages sitesi | Herkes | Yalnızca uygulama kodu; veri yok |
| GitHub reposu (public) | Herkes | Kod, Apps Script kodu. Sır yok |
| Apps Script web uygulaması | Herkes (URL sitenin kodunda görünür) | Giriş dışında her istek geçerli oturum anahtarı ister |
| Google Sheet | Yalnızca sahibi (paylaşılmaz) | Tüm kayıtlar, kullanıcılar, şifre özetleri |
| Script Properties | Yalnızca script düzenleyicileri | Oturum anahtarları |

## Alınan önlemler

### Kimlik doğrulama
- **Kaba kuvvet kilidi:** Kullanıcı adı başına 5 hatalı denemeden sonra 15 dakika giriş kapalı. Var olmayan kullanıcı adları da aynı şekilde sayılır ve aynı mesajı alır; böylece hangi kullanıcı adlarının var olduğu anlaşılamaz. Her hatalı deneme 1 saniye bekletilir.
- **Şifre özeti:** PBKDF2-HMAC-SHA256, kullanıcı başına rastgele tuz, 2000 tur. Eski biçimde (tek tur SHA-256) saklanan şifreler, kullanıcı ilk giriş yaptığında otomatik olarak yeni biçime taşınır. Özetler sabit zamanlı karşılaştırılır.
- **Şifre kuralı:** 8–200 karakter.
- **Oturum anahtarı:** 256 bitten uzun rastgele değer. İstek gövdesinde gönderilir, URL'de hiç yer almaz. Süresi 30 gün ("Beni hatırla") ya da 1 gün. Süresi dolan anahtarlar temizlenir.
- **Şifre değişikliği:** Kullanıcının diğer cihazlardaki oturumlarını kapatır.
- **Kurulum şifresi:** `SETUP_PASS` kurulumdan sonra silinir. Şifre özetleri hiçbir API yanıtında yer almaz.

### Veri bütünlüğü ve Sheet güvenliği
- **Formül enjeksiyonu:** Sheet'e yazılan metinler (ders, konu, deneme adı, görünen ad) `=`, `+`, `-`, `@` ile başlayamaz. Böylece `=IMPORTXML(...)` gibi bir girdi, Sheet açıldığında veriyi dışarı sızdıramaz. Ayrıca metin sütunları düz metin (`@`) biçimindedir; yeni eklenen satırlar da bu biçimi alır.
- **Boyut sınırları:**
  - Metinler en fazla 100 karakter.
  - Soru sayısı en fazla 500.
  - Bir denemede en fazla 20 ders.
  - En fazla 50 ders ve 3000 konu.
  - İstek gövdesi en fazla 2 MB.
- **Ortak doğrulama:** Kurallar frontend, Apps Script ve mock'ta aynıdır. Otomatik testler üçünün aynı sonucu verdiğini doğrular.
- **Yazma sırası:** Tüm yazma işlemleri kilit altında sırayla yapılır.
- **Çift kayıt:** Aynı kayıt, ağ kopup tekrar denense bile iki kez yazılmaz.

### Hata yönetimi
- **İç ayrıntı sızmaz:** Beklenmeyen hatalar istemciye genel bir mesajla döner. Sekme adı, satır numarası, yığın izi gibi iç ayrıntılar yalnızca Apps Script günlüğüne yazılır.
- **Geçersiz istek:** Bozuk ya da çok büyük istekler "Geçersiz istek." yanıtıyla reddedilir.

### Tarayıcı
- **İçerik Güvenlik Politikası (CSP):**
  - Betikler yalnızca sitenin kendisinden yüklenebilir. Satır içi betik ve `eval` yasak.
  - Ağ istekleri yalnızca Apps Script adreslerine gidebilir.
  - `object`, `frame` ve `form` hedefleri kapalı.
  - Olası bir XSS hatasında oturum anahtarının başka bir adrese gönderilmesini engeller.
- **Referrer:** `no-referrer`. Site adresi üçüncü taraflara gönderilmez.
- **Clickjacking:** Uygulama başka bir sitenin iframe'i içinde açılırsa çalışmaz. GitHub Pages `X-Frame-Options` başlığı gönderemediği için bu kontrol istemcide yapılır.
- **XSS:** React tüm kullanıcı içeriğini metin olarak basar. `innerHTML` ya da `dangerouslySetInnerHTML` kullanılmaz.
- **Mock backend:** Üretimde hiç yüklenmez. Backend adresi olmadan derlenen site açıkça "Kurulum tamamlanmamış" der.
- **Oturum saklama:** "Beni hatırla" kapalıysa oturum yalnızca o sekmede (sessionStorage) tutulur. Çıkışta form taslakları silinir.
- **CSV dışa aktarma:** Formül enjeksiyonuna karşı korumalıdır (`= + - @ sekme satır başı`).

### Tedarik zinciri ve yayın
- **GitHub Actions:** Eylemler commit SHA'sına sabitlenmiştir. Her iş yalnızca ihtiyaç duyduğu yetkiye sahiptir; varsayılan yetki yoktur. Checkout kimlik bilgisini saklamaz.
- **Bağımlılıklar:**
  - `npm ci --ignore-scripts`: kilit dosyasına sadık kurulum, paket betikleri çalışmaz.
  - `npm audit --audit-level=high`: yüksek önemde açık varsa yayın durur.
  - Dependabot: npm paketleri ve GitHub Actions için haftalık güncelleme önerileri açar.

## Bilinçli olarak kabul edilen riskler

- **Tüm kullanıcılar eşit yetkili (tasarım gereği):** Ele geçirilen bir aile hesabı veri silebilir ve yeni kullanıcı ekleyebilir. Yedek için Sheet'in sürüm geçmişi kullanılabilir.
- **Giriş kilidi kötüye kullanılabilir:** Birinin kullanıcı adını bilen biri 5 yanlış deneme yaparak o kişiyi 15 dakika dışarıda bırakabilir. Hesabın ele geçirilmesini önlemenin bedeli bu.
- **Hizmet engelleme:** Apps Script adresi herkese açık. Çok yoğun istek, Google'ın Apps Script kotalarını zorlayabilir. Bu mimaride ağ düzeyinde hız sınırlama yapılamaz.
- **Şifre özeti turu:** 2000 tur, Apps Script'in işlem süresi sınırları nedeniyle seçildi. Sheet sızarsa zayıf şifreler yine de kırılabilir; bu yüzden uzun ve benzersiz şifre önerilir.
- **CSP meta etiketiyle verilir:** GitHub Pages HTTP başlığı ayarlayamadığı için `frame-ancestors` kullanılamaz. Bunun yerine istemci tarafında iframe kontrolü yapılır.

## Sahibin yapması gerekenler

- [ ] Google hesabında **iki adımlı doğrulama** açık olsun. Sheet'e ve script'e erişim bu hesaba bağlı.
- [ ] GitHub hesabında **iki adımlı doğrulama** açık olsun. Repoya yazabilen, yayına kod gönderebilir.
- [ ] Google Sheet'i ve Apps Script projesini **kimseyle paylaşma**. Düzenleyici erişimi olan biri oturum anahtarlarını ve şifre özetlerini görebilir.
- [ ] Kullanılmayan eski Apps Script dağıtımını **arşivle**: Dağıt → Dağıtımları yönet.
- [ ] Code.gs'yi güncelledikten sonra **mevcut dağıtımı düzenleyip "Yeni sürüm"** seç. Yeni dağıtım oluşturma; adres değişir.
- [ ] Aile üyelerine **en az 8 karakterli, başka yerde kullanılmayan** şifreler ver.
- [ ] Bir cihaz kaybolursa o kullanıcının şifresini değiştir. Diğer oturumlar otomatik kapanır.
- [ ] Ara sıra **Ayarlar → CSV indir** ile yedek al. Sheet'in *Dosya → Sürüm geçmişi* de geri dönüş sağlar.
- [ ] GitHub repo ayarlarında **Secret scanning** ve **Dependabot alerts** açık olsun: Settings → Code security.
