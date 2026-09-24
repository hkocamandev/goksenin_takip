import { screen, within } from '@testing-library/react';
import { format, parseISO, subDays } from 'date-fns';
import { describe, expect, it } from 'vitest';
import type { Api } from '../../src/api/api';
import { todayIso } from '../../src/lib/periods';
import { renderApp } from '../helpers/renderApp';

const today = todayIso();
const weekAgo = format(subDays(parseISO(today), 7), 'yyyy-MM-dd');
const base = { sinif: 8 as const, kaynak: 'Ödev' as const, konu: '', soru: 10, yanlis: 0 };

async function seed(api: Api) {
  await api.addRecord({ ...base, tarih: today, ders: 'Matematik', dogru: 9, bos: 1 });
  await api.addRecord({ ...base, tarih: weekAgo, ders: 'Matematik', dogru: 5, bos: 5 });
  await api.addRecord({ ...base, tarih: weekAgo, ders: 'Fen Bilimleri', dogru: 8, bos: 2 });
}

describe('Analiz', () => {
  it('kayıt yoksa boş durum gösterir', async () => {
    await renderApp({ route: '#/analiz' });
    expect(await screen.findByText('Bu dönemde kayıt yok')).toBeInTheDocument();
  });

  it('özet kartlar ve ders bazında haftalık karşılaştırma', async () => {
    await renderApp({ route: '#/analiz', seed });
    const table = await screen.findByRole('table', { name: 'Ders bazında karşılaştırma' });
    const mat = within(table).getByText('Matematik').closest('tr')!;
    expect(within(mat).getByText('+40,0')).toBeInTheDocument();
    expect(within(mat).getByText('İyileşme')).toBeInTheDocument();
    const fen = within(table).getByText('Fen Bilimleri').closest('tr')!;
    expect(within(fen).getByText('Karşılaştırma yok')).toBeInTheDocument();
    expect(screen.getByText('Çözülen soru').parentElement).toHaveTextContent('30');
    expect(screen.getByText('Bu hafta ile önceki').parentElement).toHaveTextContent('+25,0'); // %90 vs %65
  });

  it('aylık görünüme geçer', async () => {
    const { user } = await renderApp({ route: '#/analiz', seed });
    await user.click(await screen.findByRole('tab', { name: 'Aylık' }));
    expect(screen.getByText('Bu ay ile önceki')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Aylık net' })).toBeInTheDocument();
  });

  it('ders filtresi özetleri daraltır', async () => {
    const { user } = await renderApp({ route: '#/analiz', seed });
    await user.click(await screen.findByRole('button', { name: /Fen Bilimleri/ }));
    expect(screen.getByText('Çözülen soru').parentElement).toHaveTextContent('10');
  });

  it('deneme varsa deneme trendi bölümü görünür', async () => {
    await renderApp({
      route: '#/analiz',
      seed: async (a) => {
        await a.addExam({ ad: 'LGS-1', tarih: today, sinif: 8, satirlar: [{ ders: 'Türkçe', soru: 20, dogru: 16, yanlis: 4, bos: 0 }] });
      },
    });
    expect(await screen.findByRole('heading', { name: 'Deneme trendi' })).toBeInTheDocument();
    expect(screen.getByText('LGS-1')).toBeInTheDocument();
  });
});
