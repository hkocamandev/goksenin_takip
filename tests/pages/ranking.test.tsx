import { screen, within } from '@testing-library/react';
import { format, parseISO, subDays } from 'date-fns';
import { describe, expect, it } from 'vitest';
import type { Api } from '../../src/api/api';
import { todayIso } from '../../src/lib/periods';
import { renderApp } from '../helpers/renderApp';

const today = todayIso();
const weekAgo = format(subDays(parseISO(today), 7), 'yyyy-MM-dd');
const base = { sinif: 8 as const, kaynak: 'Ödev' as const, konu: '', yanlis: 0 };

async function seed(api: Api) {
  await api.addRecord({ ...base, tarih: today, ders: 'Matematik', konu: 'Kümeler', soru: 12, dogru: 11, bos: 1 });
  await api.addRecord({ ...base, tarih: weekAgo, ders: 'Matematik', konu: 'Kümeler', soru: 10, dogru: 5, bos: 5 });
  await api.addRecord({ ...base, tarih: today, ders: 'Fen Bilimleri', konu: 'Basınç', soru: 5, dogru: 1, bos: 4 });
}

const firstItem = (listName: string) => within(screen.getByRole('list', { name: listName })).getAllByRole('listitem')[0];

describe('Sıralama', () => {
  it('dersler en iyiden en kötüye, düğmeyle tersine', async () => {
    const { user } = await renderApp({ route: '#/siralama', seed });
    await screen.findByRole('list', { name: 'Dersler sıralaması' });
    expect(firstItem('Dersler sıralaması')).toHaveTextContent('Matematik');
    await user.click(screen.getByRole('tab', { name: 'En kötüden en iyiye' }));
    expect(firstItem('Dersler sıralaması')).toHaveTextContent('Fen Bilimleri');
  });

  it('konular en az soru eşiğine uyar', async () => {
    const { user } = await renderApp({ route: '#/siralama', seed });
    await user.click(await screen.findByRole('tab', { name: 'Konular' }));
    const list = screen.getByRole('list', { name: 'Konular sıralaması' });
    expect(within(list).getByText('Kümeler')).toBeInTheDocument();
    expect(within(list).queryByText('Basınç')).toBeNull();
    const min = screen.getByLabelText('En az soru');
    await user.clear(min);
    await user.type(min, '0');
    expect(within(screen.getByRole('list', { name: 'Konular sıralaması' })).getByText('Basınç')).toBeInTheDocument();
  });

  it('denemeler toplam nete göre', async () => {
    const { user } = await renderApp({
      route: '#/siralama',
      seed: async (a) => {
        await a.addExam({ ad: 'Zayıf', tarih: weekAgo, sinif: 8, satirlar: [{ ders: 'Türkçe', soru: 20, dogru: 8, yanlis: 0, bos: 12 }] });
        await a.addExam({ ad: 'Güçlü', tarih: today, sinif: 8, satirlar: [{ ders: 'Türkçe', soru: 20, dogru: 18, yanlis: 0, bos: 2 }] });
      },
    });
    await user.click(await screen.findByRole('tab', { name: 'Denemeler' }));
    expect(firstItem('Denemeler sıralaması')).toHaveTextContent('Güçlü');
  });

  it('en çok gelişen dersler ve konular', async () => {
    const { user } = await renderApp({ route: '#/siralama', seed });
    await user.click(await screen.findByRole('tab', { name: 'Gelişen / gerileyen' }));
    const up = screen.getByRole('list', { name: 'En çok gelişen dersler' });
    expect(within(up).getByText('Matematik')).toBeInTheDocument();
    expect(within(up).getByText(/\+41,7/)).toBeInTheDocument(); // %91,7 − %50
    expect(within(screen.getByRole('list', { name: 'En çok gelişen konular' })).getByText('Kümeler')).toBeInTheDocument();
  });
});
