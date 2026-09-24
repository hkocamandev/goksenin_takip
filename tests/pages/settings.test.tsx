import { screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderApp } from '../helpers/renderApp';

beforeEach(() => {
  vi.spyOn(window, 'confirm').mockReturnValue(true);
});

const region = (name: string) => screen.getByRole('region', { name });

describe('Ayarlar', () => {
  it('konu ekler ve kaldırır (8. sınıf Matematik)', async () => {
    const { user, api } = await renderApp({ route: '#/ayarlar' });
    const r = await screen.findByRole('region', { name: 'Konular' });
    await user.selectOptions(within(r).getByLabelText('Ders'), 'Matematik');
    await user.type(within(r).getByLabelText('Yeni konu'), 'Kümeler');
    await user.click(within(r).getByRole('button', { name: 'Konu ekle' }));
    await waitFor(async () => expect((await api.getAll()).konular).toContainEqual({ ders: 'Matematik', sinif: 8, konu: 'Kümeler' }));
    expect(within(region('Konular')).getByText('Kümeler')).toBeInTheDocument();
    await user.click(within(region('Konular')).getByRole('button', { name: 'Kümeler kaldır' }));
    await waitFor(async () => expect((await api.getAll()).konular).not.toContainEqual({ ders: 'Matematik', sinif: 8, konu: 'Kümeler' }));
  });

  it('konu yeniden adlandırma geçmiş kayıtlara da yansır', async () => {
    const { user, api } = await renderApp({
      route: '#/ayarlar',
      seed: async (a) => {
        await a.addRecord({ tarih: '2026-09-20', sinif: 8, ders: 'Matematik', kaynak: 'Ödev', konu: 'Üslü İfadeler', soru: 10, dogru: 5, yanlis: 0, bos: 5 });
      },
    });
    const r = await screen.findByRole('region', { name: 'Konular' });
    await user.selectOptions(within(r).getByLabelText('Ders'), 'Matematik');
    await user.click(within(r).getByRole('button', { name: 'Üslü İfadeler yeniden adlandır' }));
    const input = within(r).getByLabelText('Yeni ad');
    await user.clear(input);
    await user.type(input, 'Üslü Sayılar');
    await user.click(within(r).getByRole('button', { name: 'Kaydet' }));
    await waitFor(async () => expect((await api.getAll()).kayitlar[0].konu).toBe('Üslü Sayılar'));
  });

  it('aynı adla ders eklenemez; yeni ders eklenir', async () => {
    const { user, api } = await renderApp({ route: '#/ayarlar' });
    const r = await screen.findByRole('region', { name: 'Dersler' });
    await user.type(within(r).getByLabelText('Yeni ders'), 'matematik');
    await user.click(within(r).getByRole('button', { name: 'Ders ekle' }));
    expect(await within(r).findByText('Bu ad zaten var.')).toBeInTheDocument();
    await user.clear(within(r).getByLabelText('Yeni ders'));
    await user.type(within(r).getByLabelText('Yeni ders'), 'Görsel Sanatlar');
    await user.click(within(r).getByRole('button', { name: 'Ders ekle' }));
    await waitFor(async () => expect((await api.getAll()).dersler.some((d) => d.ders === 'Görsel Sanatlar' && d.sinif === 8)).toBe(true));
  });

  it('kullanıcı ekler', async () => {
    const { user } = await renderApp({ route: '#/ayarlar' });
    const r = await screen.findByRole('region', { name: 'Kullanıcılar' });
    await user.type(within(r).getByLabelText('Yeni kullanıcı adı'), 'anne');
    await user.type(within(r).getByLabelText('Görünen ad'), 'Anne');
    await user.type(within(r).getByLabelText('Yeni kullanıcının şifresi'), 'gizli123');
    await user.click(within(r).getByRole('button', { name: 'Kullanıcı ekle' }));
    expect(await within(region('Kullanıcılar')).findByText('@anne')).toBeInTheDocument();
  });

  it('CSV indirir', async () => {
    const create = vi.fn(() => 'blob:x');
    URL.createObjectURL = create;
    URL.revokeObjectURL = vi.fn();
    const { user } = await renderApp({ route: '#/ayarlar' });
    await user.click(await screen.findByRole('button', { name: 'CSV indir' }));
    expect(create).toHaveBeenCalledTimes(1);
  });
});
