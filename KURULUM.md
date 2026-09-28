# Kurulum Rehberi

Bu rehber bir kez yapılır (~15 dakika). Sonunda paylaşılabilir bir link elde edersin.

## 1. Google Sheet ve Apps Script

1. [sheets.new](https://sheets.new) ile boş bir Google Sheet oluştur, adını "Göksenin Takip" yap. **Kimseyle paylaşma.** Sheet'te **Dosya → Ayarlar → Saat dilimi**'ni `(GMT+03:00) İstanbul` yap.
2. Menüden **Uzantılar → Apps Script**'i aç.
3. Soldaki `Kod.gs` dosyasının içeriğini sil, bu repodaki `apps-script/Code.gs` içeriğini yapıştır.
4. Sol üstteki **+ → Komut dosyası** ile `Seed` adında yeni dosya ekle, `apps-script/Seed.gs` içeriğini yapıştır.
5. **Proje Ayarları (⚙)**:
   - *Saat dilimi*: `(GMT+03:00) İstanbul`
   - *Komut dosyası özellikleri* → şu üçünü ekle:
     - `SETUP_USER` → ilk kullanıcı adı (ör. `hasan`, küçük harf)
     - `SETUP_PASS` → en az 8 karakterli şifre
     - `SETUP_NAME` → görünen ad (ör. `Hasan`)
6. Editöre dön, üstteki fonksiyon listesinden `setup` seç ve **Çalıştır**. Google izin isteyecek: hesabını seç → *Gelişmiş* → *Göksenin Takip'e git (güvenli değil)* → *İzin ver*. (Bu uyarı, script'i senin yazdığın için çıkar.)
7. Sheet'e dön: `Kayitlar`, `Denemeler`, `Dersler`, `Konular`, `Kullanicilar`, `Degisiklikler` sekmeleri oluşmuş olmalı. `SETUP_PASS` güvenlik için otomatik silinir.

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

## 6. Yedekleme ve değişiklik günlüğü

İki katman birlikte çalışır:

- **Değişiklik günlüğü (`Degisiklikler` sekmesi):** Uygulamadan yapılan her ekleme, düzenleme ve silme bir satır yazar: zaman, kullanıcı, işlem, tablo, kayıt kimliği, **eski** ve **yeni** değer (JSON). Yanlışlıkla değiştirilen ya da silinen bir kaydın eski hali buradan okunup geri girilebilir. Şifre özetleri yazılmaz. Kendiliğinden çalışır; sekme yoksa ilk yazmada oluşur.
- **Günlük yedek (Google Drive):** Her gece 03:00 civarı tüm sekmeler Drive'da **Göksenin Takip Yedekler** klasörüne `Göksenin Takip Yedek 2026-09-28` adıyla kopyalanır. Son 30 günün yedekleri ve her ayın ilk yedeği kalır; daha eskileri çöp kutusuna gider.

Kurulum (bir kez):

1. Apps Script editöründe `Code.gs`'yi bu repodaki güncel içerikle değiştir.
2. **+ → Komut dosyası** ile `Yedek` adında yeni bir dosya ekle, `apps-script/Yedek.gs` içeriğini yapıştır ve kaydet.
3. Fonksiyon listesinden `yedeklemeyiKur` seç → **Çalıştır**. Google, Drive ve tetikleyici için yeni izin ister; 1. bölümdeki gibi onayla. Günlükte "Yedek alındı: …" ve "Günlük yedekleme kuruldu" yazar; Drive'da klasör ve ilk yedek oluşur.
4. Günlüğün uygulamada çalışması için dağıtımı yenile: Dağıt → *Dağıtımları yönet* → kalem → *Sürüm: Yeni sürüm* → Dağıt (URL değişmez).

Tetikleyiciyi **Tetikleyiciler (⏰)** menüsünden görebilirsin. Yedek alınamazsa Google hesabına hata e-postası gelir. Elle yedek için `yedekAl` fonksiyonunu çalıştırman yeterli.

**Ne zaman güncellenir:** Asıl sekmeler ve `Degisiklikler` siteden kaydedildiği an yazılır. Drive yedeği ise gecede bir alınan bir anlık görüntüdür; alındıktan sonra değişmez. Gün içinde kopya gerekirse `yedekAl` o günün yedeğini yenisiyle değiştirir.

**Geri yükleme:**
- *Tek kayıt:* `Degisiklikler` sekmesinde kaydın satırını bul (`kayit_id` ya da tarihle), `eski` sütunundaki değerlerle kaydı siteden yeniden gir.
- *Toplu sorun:* Drive'daki yedek dosyasını aç, gereken satırları kopyalayıp asıl Sheet'teki aynı sekmeye yapıştır.

## Demo veri (isteğe bağlı)

Uygulamayı gerçek veriyle doldurmadan denemek için:

1. Apps Script editöründe **+ → Komut dosyası** ile `DemoData` adında yeni bir dosya ekle, `apps-script/DemoData.gs` içeriğini yapıştır ve kaydet.
2. Üstteki fonksiyon listesinden `demoVerileriOlustur` seç → **Çalıştır**. Birkaç saniye sürer; günlükte "Demo veri eklendi: … kayıt satırı, … deneme." yazar.
3. Her 7. ve 8. sınıf konusu için Ödev ve Kendi Çözdüğü kaynaklarında toplam 250–1500 soruluk rastgele ama tutarlı sonuçlar, ayrıca 18 deneme (MEB dağılımı, 90 soru) oluşur. Tüm satırlar `giren_kullanici = demo-veri` ile işaretlidir.
4. Silmek için `demoVerileriniSil` fonksiyonunu çalıştır. Yalnızca demo satırları silinir; gerçek kayıtlara dokunulmaz.

Bu fonksiyonlar editörden çalıştırıldığı için yeni dağıtım gerekmez.

## Sorun giderme

| Belirti | Çözüm |
|---|---|
| "Kurulum tamamlanmamış" ekranı | `VITE_API_URL` değişkeni eksik; 4. adımı yapıp iş akışını yeniden çalıştır. |
| "Sunucudan beklenmeyen yanıt geldi" | Web App erişimi "Herkes" değil ya da URL `/exec` ile bitmiyor. |
| "Kayitlar sekmesi bulunamadı" | Apps Script'te `setup` çalıştırılmamış. |
| `Degisiklikler` sekmesi yok | Sekme siteden yapılan ilk kayıtta oluşur. Hâlâ yoksa: `Code.gs` kaydedilmeden sürüm alınmış ya da yeni sürüm sitenin kullandığı dağıtıma (`VITE_API_URL`) verilmemiş. Kaydet → Dağıtımları yönet → doğru dağıtım → Yeni sürüm. Hata için Apps Script → **Yürütmeler**. |
| Drive'da yedek oluşmuyor | `yedeklemeyiKur` çalıştırılmamış ya da izin verilmemiş; Tetikleyiciler (⏰) menüsünde `yedekAl` görünmeli. |
| Site 404 veriyor, son yayın başarılı | Repoda Pages kapanmış olabilir: Settings → Pages → Source: **GitHub Actions**, sonra Actions'ta "Yayınla"yı yeniden çalıştır. |
| Giriş yapılamıyor | Kullanıcı adı küçük harfle yazılmalı; ilk kullanıcı `SETUP_USER` değeridir. |

Güvenlik önlemleri ve yapılması gerekenler için: [GUVENLIK.md](GUVENLIK.md)
