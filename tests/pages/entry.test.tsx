import { render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../../src/api/api';
import { App } from '../../src/App';
import { MSG } from '../../src/lib/validation';
import { renderApp } from '../helpers/renderApp';

beforeEach(() => {
  vi.spyOn(window, 'confirm').mockReturnValue(true);
});

type User = Awaited<ReturnType<typeof renderApp>>['user'];

async function openTab(user: User, name: string) {
  await user.click(await screen.findByRole('tab', { name }));
}

async function fill(user: User, label: string, value: string) {
  const el = screen.getByLabelText(label);
  await user.clear(el);
  await user.type(el, value);
}

describe('Ödev / Kendi Çözdüğü formu', () => {
  it('boşu otomatik hesaplar, canlı neti gösterir ve kaydeder', async () => {
    const { user, api } = await renderApp();
    await openTab(user, 'Ödev');
    await user.selectOptions(screen.getByLabelText('Ders'), 'Matematik');
    await user.selectOptions(screen.getByLabelText('Konu'), 'Çarpanlar ve Katlar');
    await fill(user, 'Soru', '25');
    await fill(user, 'Doğru', '16');
    await fill(user, 'Yanlış', '3');
    expect(screen.getByLabelText('Boş')).toHaveValue(6);
    expect(screen.getByTestId('live-net')).toHaveTextContent('15');
    await user.click(screen.getByRole('button', { name: 'Kaydet' }));
    expect(await screen.findByRole('status')).toHaveTextContent('Kaydedildi');
    const d = await api.getAll();
    expect(d.kayitlar).toHaveLength(1);
    expect(d.kayitlar[0]).toMatchObject({ ders: 'Matematik', konu: 'Çarpanlar ve Katlar', kaynak: 'Ödev', soru: 25, dogru: 16, yanlis: 3, bos: 6 });
    expect(screen.getByLabelText('Soru')).toHaveValue(null); // sayılar sıfırlanır
    expect(within(screen.getByRole('list', { name: 'Son kayıtlar' })).getByText('Matematik')).toBeInTheDocument();
  });

  it('toplam tutmazsa kaydetmez ve hatayı gösterir', async () => {
    const { user, api } = await renderApp();
    await openTab(user, 'Kendi Çözdüğü');
    await fill(user, 'Soru', '25');
    await fill(user, 'Doğru', '16');
    await fill(user, 'Yanlış', '4');
    await fill(user, 'Boş', '4');
    await user.click(screen.getByRole('button', { name: 'Kaydet' }));
    expect(await screen.findByText(MSG.toplam)).toBeInTheDocument();
    expect((await api.getAll()).kayitlar).toHaveLength(0);
  });

  it('kaydederken düğme kilitlenir; ağ hatasında değerler korunur ve tekrar denenebilir', async () => {
    let calls = 0;
    let release: (() => void) | undefined;
    const { user } = await renderApp({
      wrap: (inner) => async (a, p, t) => {
        if (a === 'addRecord') {
          calls += 1;
          if (calls === 1) {
            await new Promise<void>((r) => { release = r; });
            throw new ApiError('NETWORK', 'Sunucuya ulaşılamadı. İnternet bağlantınızı kontrol edin.');
          }
        }
        return inner(a, p, t);
      },
    });
    await openTab(user, 'Ödev');
    await fill(user, 'Soru', '10');
    await fill(user, 'Doğru', '6');
    await fill(user, 'Yanlış', '2');
    await user.click(screen.getByRole('button', { name: 'Kaydet' }));
    const busy = screen.getByRole('button', { name: 'Kaydediliyor…' });
    expect(busy).toBeDisabled();
    await user.click(busy);
    await waitFor(() => expect(release).toBeDefined());
    release!();
    expect(await screen.findByText(/Sunucuya ulaşılamadı/)).toBeInTheDocument();
    expect(calls).toBe(1);
    expect(screen.getByLabelText('Soru')).toHaveValue(10);
    await user.click(screen.getByRole('button', { name: 'Tekrar dene' }));
    expect(await screen.findByRole('status')).toHaveTextContent('Kaydedildi');
    expect(calls).toBe(2);
  });

  it('sunucu yazdıktan sonra bağlantı koparsa "Tekrar dene" kaydı iki kez yazmaz', async () => {
    let failed = false;
    const { user, api } = await renderApp({
      wrap: (inner) => async (a, p, t) => {
        const res = await inner(a, p, t);
        if (a === 'addRecord' && !failed) {
          failed = true;
          throw new ApiError('NETWORK', 'Sunucuya ulaşılamadı. İnternet bağlantınızı kontrol edin.');
        }
        return res;
      },
    });
    await openTab(user, 'Ödev');
    await fill(user, 'Soru', '10');
    await fill(user, 'Doğru', '6');
    await user.click(screen.getByRole('button', { name: 'Kaydet' }));
    expect(await screen.findByText(/Sunucuya ulaşılamadı/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Tekrar dene' }));
    expect(await screen.findByRole('status')).toHaveTextContent('Kaydedildi');
    expect((await api.getAll()).kayitlar).toHaveLength(1);
  });

  it('deneme için de bağlantı kopması sonrası tekrar deneme tek deneme yazar', async () => {
    let failed = false;
    const { user, api } = await renderApp({
      wrap: (inner) => async (a, p, t) => {
        const res = await inner(a, p, t);
        if (a === 'addExam' && !failed) {
          failed = true;
          throw new ApiError('NETWORK', 'Sunucuya ulaşılamadı. İnternet bağlantınızı kontrol edin.');
        }
        return res;
      },
    });
    await openTab(user, 'Deneme');
    await user.type(screen.getByLabelText('Deneme adı'), 'D');
    await user.type(screen.getByLabelText('Türkçe doğru'), '10');
    await user.click(screen.getByRole('button', { name: 'Denemeyi kaydet' }));
    expect(await screen.findByText(/Sunucuya ulaşılamadı/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Tekrar dene' }));
    expect(await screen.findByRole('status')).toHaveTextContent('Kaydedildi');
    const d = await api.getAll();
    expect(d.denemeler).toHaveLength(1);
    expect(d.kayitlar).toHaveLength(1);
  });

  it('oturum kayıt sırasında düşerse girişten sonra yazılanlar formda durur', async () => {
    let failed = false;
    const { user, api } = await renderApp({
      wrap: (inner) => async (a, p, t) => {
        if (a === 'addRecord' && !failed) {
          failed = true;
          throw new ApiError('AUTH', 'Oturumunuz sona erdi. Lütfen tekrar giriş yapın.');
        }
        return inner(a, p, t);
      },
    });
    await openTab(user, 'Ödev');
    await fill(user, 'Soru', '12');
    await fill(user, 'Doğru', '7');
    await user.click(screen.getByRole('button', { name: 'Kaydet' }));
    expect(await screen.findByText(/Oturumunuz sona erdi/)).toBeInTheDocument();
    await user.type(screen.getByLabelText('Kullanıcı adı'), 'demo');
    await user.type(screen.getByLabelText('Şifre'), 'demo123');
    await user.click(screen.getByRole('button', { name: 'Giriş yap' }));
    expect(await screen.findByLabelText('Soru')).toHaveValue(12);
    expect(screen.getByLabelText('Doğru')).toHaveValue(7);
    await user.click(screen.getByRole('button', { name: 'Kaydet' }));
    expect(await screen.findByRole('status')).toHaveTextContent('Kaydedildi');
    expect((await api.getAll()).kayitlar).toHaveLength(1);
  });

  it('taslak sayfa yeniden açıldığında geri gelir', async () => {
    const { user, api, unmount } = await renderApp();
    await openTab(user, 'Ödev');
    await fill(user, 'Soru', '25');
    unmount();
    render(<App api={api} />);
    expect(await screen.findByLabelText('Soru')).toHaveValue(25);
  });
});

describe('Deneme formu', () => {
  it('tüm dersleri satır satır gösterir, toplam neti hesaplar, boş satırları kaydetmez', async () => {
    const { user, api } = await renderApp();
    await openTab(user, 'Deneme');
    await user.type(screen.getByLabelText('Deneme adı'), 'Özdebir 3');
    expect(screen.getByLabelText('Türkçe soru')).toHaveValue(20);
    expect(screen.getByLabelText('İngilizce soru')).toHaveValue(10);
    await user.type(screen.getByLabelText('Türkçe doğru'), '15');
    await user.type(screen.getByLabelText('Türkçe yanlış'), '3');
    await user.type(screen.getByLabelText('Matematik doğru'), '10');
    expect(screen.getByLabelText('Türkçe boş')).toHaveValue(2);
    expect(screen.getByTestId('exam-total')).toHaveTextContent('24');
    await user.click(screen.getByRole('button', { name: 'Denemeyi kaydet' }));
    expect(await screen.findByRole('status')).toHaveTextContent('Kaydedildi');
    const d = await api.getAll();
    expect(d.denemeler).toHaveLength(1);
    expect(d.kayitlar.map((r) => r.ders).sort()).toEqual(['Matematik', 'Türkçe']);
  });

  it('satır hatası ilgili satırın altında görünür', async () => {
    const { user } = await renderApp();
    await openTab(user, 'Deneme');
    await user.type(screen.getByLabelText('Deneme adı'), 'X');
    await user.type(screen.getByLabelText('Matematik doğru'), '15');
    await user.type(screen.getByLabelText('Matematik yanlış'), '9');
    await user.click(screen.getByRole('button', { name: 'Denemeyi kaydet' }));
    expect(await screen.findByText(MSG.toplam)).toBeInTheDocument();
  });
});

describe('Son kayıtlar', () => {
  it('düzenle formu doldurur, sil kaydı kaldırır', async () => {
    const { user, api } = await renderApp({
      seed: async (a) => {
        await a.addRecord({ tarih: '2026-09-20', sinif: 8, ders: 'Fen Bilimleri', kaynak: 'Kendi Çözdüğü', konu: 'Basınç', soru: 10, dogru: 7, yanlis: 1, bos: 2 });
      },
    });
    const list = await screen.findByRole('list', { name: 'Son kayıtlar' });
    await user.click(within(list).getByRole('button', { name: 'Fen Bilimleri düzenle' }));
    expect(screen.getByRole('tab', { name: 'Kendi Çözdüğü' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByLabelText('Doğru')).toHaveValue(7);
    await fill(user, 'Doğru', '8');
    await fill(user, 'Yanlış', '0');
    await user.click(screen.getByRole('button', { name: 'Güncelle' }));
    await waitFor(async () => expect((await api.getAll()).kayitlar[0].dogru).toBe(8));
    await user.click(within(screen.getByRole('list', { name: 'Son kayıtlar' })).getByRole('button', { name: 'Fen Bilimleri sil' }));
    await waitFor(async () => expect((await api.getAll()).kayitlar).toHaveLength(0));
    expect(await screen.findByText('Henüz kayıt yok')).toBeInTheDocument();
  });
});

describe('Veri tazeleme', () => {
  it('sekmeye 5 dakikadan uzun süre sonra dönülünce başka cihazdan girilen kayıtlar görünür', async () => {
    const { api } = await renderApp();
    await screen.findByText('Henüz kayıt yok');
    await api.addRecord({ tarih: '2026-09-20', sinif: 8, ders: 'Fen Bilimleri', kaynak: 'Ödev', konu: '', soru: 10, dogru: 5, yanlis: 0, bos: 5 });
    const now = Date.now();
    const spy = vi.spyOn(Date, 'now').mockReturnValue(now + 6 * 60 * 1000);
    document.dispatchEvent(new Event('visibilitychange'));
    expect(await within(await screen.findByRole('list', { name: 'Son kayıtlar' })).findByText('Fen Bilimleri')).toBeInTheDocument();
    spy.mockRestore();
  });
});

