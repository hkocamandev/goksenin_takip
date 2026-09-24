import { useMemo, useState } from 'react';
import { Card, CardTitle } from '../components/Card';
import { Field } from '../components/Field';
import { FilterBar, initialFilters, type FilterState } from '../components/FilterBar';
import { PageHeader } from '../components/PageHeader';
import { RankList, type RankRow } from '../components/RankList';
import { Segmented } from '../components/Segmented';
import { inputCls } from '../components/ui';
import { examSummaries, filterRecords, inRange } from '../lib/analysis';
import { subjectColor } from '../lib/colors';
import { formatDelta, formatNet, formatRate } from '../lib/net';
import { formatDateTr, type PeriodType } from '../lib/periods';
import { movers, rankExams, rankSubjects, rankTopics, type Direction, type Mover } from '../lib/ranking';
import { useAppData } from '../state/DataContext';

type Tab = 'dersler' | 'konular' | 'denemeler' | 'hareket';

const TABS: { value: Tab; label: string }[] = [
  { value: 'dersler', label: 'Dersler' },
  { value: 'konular', label: 'Konular' },
  { value: 'denemeler', label: 'Denemeler' },
  { value: 'hareket', label: 'Gelişen / gerileyen' },
];

const moverRow = (m: Mover, good: boolean): RankRow => ({
  key: m.key,
  label: m.label,
  detail: `${m.detail} · ${formatRate(m.prev)} → ${formatRate(m.cur)}`,
  value: `${formatDelta(m.delta)} puan`,
  rate: m.cur,
  color: good ? 'var(--good)' : 'var(--bad)',
});

export function RankingPage() {
  const data = useAppData();
  const [tab, setTab] = useState<Tab>('dersler');
  const [dir, setDir] = useState<Direction>('best');
  const [minSoru, setMinSoru] = useState('10');
  const [type, setType] = useState<PeriodType>('week');
  const [f, setF] = useState<FilterState>(() => initialFilters('month'));

  const base = useMemo(() => filterRecords(data.kayitlar, { ...f, dersler: [] }), [data.kayitlar, f]);
  const inR = useMemo(() => base.filter((r) => inRange(r, f)), [base, f]);
  const min = Math.max(0, Number(minSoru) || 0);

  const dirToggle = (
    <Segmented
      label="Sıralama yönü"
      value={dir}
      onChange={setDir}
      options={[
        { value: 'best', label: 'En iyiden en kötüye' },
        { value: 'worst', label: 'En kötüden en iyiye' },
      ]}
    />
  );

  let content;
  if (tab === 'dersler') {
    const rows = rankSubjects(inR, dir).map((i) => ({
      key: i.key, label: i.label, detail: `${i.totals.soru} soru · ${formatNet(i.totals.net)} net`,
      value: formatRate(i.totals.oran), rate: i.totals.oran, color: subjectColor(i.label),
    }));
    content = (
      <Card>
        <CardTitle actions={dirToggle}>Dersler (net oranına göre)</CardTitle>
        <RankList label="Dersler sıralaması" rows={rows} empty="Seçilen aralıkta kayıt yok" />
      </Card>
    );
  } else if (tab === 'konular') {
    const rows = rankTopics(inR, dir, min).map((i) => ({
      key: i.key, label: i.label, detail: `${i.detail} · ${i.totals.soru} soru`,
      value: formatRate(i.totals.oran), rate: i.totals.oran, color: subjectColor(i.key.split('|')[1]),
    }));
    content = (
      <Card>
        <CardTitle
          actions={
            <div className="flex flex-wrap items-end gap-3">
              <Field label="En az soru" className="w-28">
                <input type="number" min={0} inputMode="numeric" className={inputCls} value={minSoru} onChange={(e) => setMinSoru(e.target.value)} />
              </Field>
              {dirToggle}
            </div>
          }
        >
          Konular
        </CardTitle>
        <RankList label="Konular sıralaması" rows={rows} empty="Eşiği geçen konu yok — en az soru değerini düşürmeyi dene" />
      </Card>
    );
  } else if (tab === 'denemeler') {
    const rows = rankExams(examSummaries(data.denemeler, data.kayitlar, { sinif: f.sinif, dersler: [], from: f.from, to: f.to }), dir).map((e) => ({
      key: e.exam.deneme_id, label: e.exam.ad, detail: `${formatDateTr(e.exam.tarih)} · ${e.exam.sinif}. sınıf · ${formatRate(e.oran)}`,
      value: `${formatNet(e.net)} net`, rate: e.oran,
    }));
    content = (
      <Card>
        <CardTitle actions={dirToggle}>Denemeler (toplam nete göre)</CardTitle>
        <RankList label="Denemeler sıralaması" rows={rows} empty="Seçilen aralıkta deneme yok" />
      </Card>
    );
  } else {
    const word = type === 'week' ? 'hafta' : 'ay';
    content = (
      <>
        <Segmented label="Karşılaştırma dönemi" value={type} onChange={setType} options={[{ value: 'week', label: 'Haftalık' }, { value: 'month', label: 'Aylık' }]} />
        <p className="text-sm text-muted">Bu {word} ile önceki {word} arasındaki net oranı farkı. Yalnızca iki dönemde de kaydı olanlar listelenir.</p>
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardTitle>En çok gelişen</CardTitle>
            <h3 className="mb-1 text-sm font-medium text-muted">Dersler</h3>
            <RankList label="En çok gelişen dersler" rows={movers(base, f.to, type, 'ders', 'up').map((m) => moverRow(m, true))} empty="Gelişen ders yok" />
            <h3 className="mb-1 mt-5 text-sm font-medium text-muted">Konular</h3>
            <RankList label="En çok gelişen konular" rows={movers(base, f.to, type, 'konu', 'up').map((m) => moverRow(m, true))} empty="Gelişen konu yok" />
          </Card>
          <Card>
            <CardTitle>En çok gerileyen</CardTitle>
            <h3 className="mb-1 text-sm font-medium text-muted">Dersler</h3>
            <RankList label="En çok gerileyen dersler" rows={movers(base, f.to, type, 'ders', 'down').map((m) => moverRow(m, false))} empty="Gerileyen ders yok" />
            <h3 className="mb-1 mt-5 text-sm font-medium text-muted">Konular</h3>
            <RankList label="En çok gerileyen konular" rows={movers(base, f.to, type, 'konu', 'down').map((m) => moverRow(m, false))} empty="Gerileyen konu yok" />
          </Card>
        </div>
      </>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Sıralama" subtitle="En güçlü ve en zayıf dersler, konular ve denemeler" />
      <Segmented label="Sıralama türü" value={tab} onChange={setTab} options={TABS} />
      <FilterBar value={f} onChange={setF} subjects={[]} showSubjects={false} showSource={tab !== 'denemeler'} />
      {content}
    </div>
  );
}
