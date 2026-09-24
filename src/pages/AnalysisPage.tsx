import { useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Card, CardTitle } from '../components/Card';
import { ChartTooltip } from '../components/ChartTooltip';
import { EmptyState } from '../components/EmptyState';
import { FilterBar, initialFilters, type FilterState } from '../components/FilterBar';
import { PageHeader } from '../components/PageHeader';
import { Segmented } from '../components/Segmented';
import { StatCard } from '../components/StatCard';
import { TrendBadge } from '../components/TrendBadge';
import { compareByKey, examSummaries, filterRecords, inRange, seriesByPeriod, summarize, type ExamSummary } from '../lib/analysis';
import { subjectNames } from '../lib/catalog';
import { subjectColor } from '../lib/colors';
import { formatDelta, formatNet, formatRate, round2 } from '../lib/net';
import { defaultRange, formatDateTr, todayIso, type PeriodType } from '../lib/periods';
import { useAppData } from '../state/DataContext';

const axis = { tickLine: false, axisLine: false, tick: { fill: 'var(--muted)', fontSize: 12 } } as const;

function examChart(list: ExamSummary[]) {
  const dersler = [...new Set(list.flatMap((e) => e.byDers.map((b) => b.ders)))];
  const rows = list.map((e) => ({ label: e.exam.ad, ...Object.fromEntries(e.byDers.map((b) => [b.ders, round2(b.net)])) }));
  return { dersler, rows };
}

export function AnalysisPage() {
  const data = useAppData();
  const [type, setType] = useState<PeriodType>('week');
  const [f, setF] = useState<FilterState>(() => initialFilters('week'));

  const changeType = (t: PeriodType) => {
    setType(t);
    setF((prev) => ({ ...prev, ...defaultRange(todayIso(), t) }));
  };

  const view = useMemo(() => {
    const base = filterRecords(data.kayitlar, f);
    const inR = base.filter((r) => inRange(r, f));
    const showExams = f.kaynak === 'all' || f.kaynak === 'Deneme';
    return {
      hasData: inR.length > 0,
      summary: summarize(base, f, type),
      series: seriesByPeriod(inR, f.from, f.to, type).map((p) => ({ ...p, net: round2(p.net), oran: p.oran === null ? null : round2(p.oran) })),
      comparisons: compareByKey(base, f.to, type, (r) => r.ders),
      exams: showExams ? examSummaries(data.denemeler, data.kayitlar, f) : [],
    };
  }, [data, f, type]);

  const word = type === 'week' ? 'hafta' : 'ay';
  const chart = examChart(view.exams);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Analiz"
        subtitle="Net gelişimi, dönem karşılaştırması ve deneme trendi"
        actions={
          <Segmented label="Dönem" value={type} onChange={changeType} options={[{ value: 'week', label: 'Haftalık' }, { value: 'month', label: 'Aylık' }]} />
        }
      />
      <FilterBar value={f} onChange={setF} subjects={subjectNames(data.dersler, f.sinif)} />

      {!view.hasData ? (
        <EmptyState title="Bu dönemde kayıt yok" text="Filtreleri genişlet ya da Veri Girişi sayfasından kayıt ekle." />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard label="Toplam net" value={formatNet(view.summary.total.net)} />
            <StatCard label="Net oranı" value={formatRate(view.summary.total.oran)} />
            <StatCard label={`Bu ${word} ile önceki`} value={formatDelta(view.summary.delta)} suffix="puan" trend={view.summary.trend} />
            <StatCard label="Çözülen soru" value={view.summary.total.soru.toLocaleString('tr-TR')} />
          </div>

          <Card>
            <CardTitle>{type === 'week' ? 'Haftalık net' : 'Aylık net'}</CardTitle>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={view.series} margin={{ top: 8, right: 16, left: -16, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke="var(--line)" />
                  <XAxis dataKey="label" {...axis} />
                  <YAxis {...axis} />
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: 'var(--surface-2)' }} />
                  <Bar dataKey="net" name="Toplam net" fill="var(--accent)" radius={[4, 4, 0, 0]} maxBarSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <h3 className="mb-2 mt-6 font-display text-base font-semibold">Net oranı</h3>
            <div className="h-44">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={view.series} margin={{ top: 8, right: 16, left: -16, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke="var(--line)" />
                  <XAxis dataKey="label" {...axis} />
                  <YAxis unit="%" domain={[(min: number) => Math.min(0, Math.floor(min)), 100]} {...axis} />
                  <Tooltip content={<ChartTooltip />} cursor={{ stroke: 'var(--muted)', strokeDasharray: '3 3' }} />
                  <Line dataKey="oran" name="Net oranı" type="monotone" stroke="var(--ink)" strokeWidth={2} dot={{ r: 4, strokeWidth: 2, fill: 'var(--surface)' }} activeDot={{ r: 5 }} connectNulls />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <p className="mt-2 text-sm text-muted">Üstte dönemdeki toplam net, altta net oranı (net ÷ soru). İyileşme yorumu oran üzerinden yapılır; soru sayısı haftadan haftaya değiştiği için ham net tek başına yanıltabilir.</p>
          </Card>

          <Card>
            <CardTitle>Ders bazında: bu {word} ve önceki {word}</CardTitle>
            {view.comparisons.length === 0 ? (
              <p className="py-4 text-sm text-muted">Son iki dönemde kayıt yok.</p>
            ) : (
              <table aria-label="Ders bazında karşılaştırma" className="w-full text-sm">
                <thead>
                  <tr className="text-left text-sm text-muted">
                    <th className="py-2 font-medium">Ders</th>
                    <th className="py-2 text-right font-medium">Önceki</th>
                    <th className="py-2 text-right font-medium">Bu dönem</th>
                    <th className="py-2 text-right font-medium">Değişim</th>
                  </tr>
                </thead>
                <tbody>
                  {view.comparisons.map((c) => (
                    <tr key={c.key} className="border-t border-line">
                      <td className="py-2.5">
                        <span className="inline-flex items-center gap-2">
                          <span className="size-2.5 rounded-full" style={{ background: subjectColor(c.key) }} />
                          {c.key}
                        </span>
                      </td>
                      <td className="py-2.5 text-right tabular-nums text-muted">{formatRate(c.prev)}</td>
                      <td className="py-2.5 text-right tabular-nums">{formatRate(c.cur)}</td>
                      <td className="py-2.5 text-right">
                        <TrendBadge trend={c.trend} delta={c.delta} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <p className="mt-3 text-sm text-muted">±2 puandan küçük değişimler "sabit" sayılır.</p>
          </Card>

          {view.exams.length > 0 && (
            <Card>
              <CardTitle>Deneme trendi</CardTitle>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chart.rows} margin={{ top: 8, right: 16, left: -16, bottom: 0 }}>
                    <CartesianGrid vertical={false} stroke="var(--line)" />
                    <XAxis dataKey="label" {...axis} />
                    <YAxis {...axis} />
                    <Tooltip content={<ChartTooltip />} cursor={{ fill: 'var(--surface-2)' }} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    {chart.dersler.map((d) => (
                      <Bar key={d} dataKey={d} name={d} stackId="net" fill={subjectColor(d)} stroke="var(--surface)" strokeWidth={2} maxBarSize={48} />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <ul className="mt-4 divide-y divide-line text-sm">
                {view.exams.map((e) => (
                  <li key={e.exam.deneme_id} className="flex items-center justify-between py-2">
                    <span>
                      <span className="font-medium">{e.exam.ad}</span>
                      <span className="ml-2 text-muted">{formatDateTr(e.exam.tarih)}</span>
                    </span>
                    <span className="font-display font-semibold tabular-nums">{formatNet(e.net)} net</span>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
