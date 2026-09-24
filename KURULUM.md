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
