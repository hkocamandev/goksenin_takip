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
