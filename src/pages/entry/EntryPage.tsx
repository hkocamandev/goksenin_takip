import { useState } from 'react';
import { errorMessage } from '../../api/api';
import { Card, CardTitle } from '../../components/Card';
import { PageHeader } from '../../components/PageHeader';
import { Segmented } from '../../components/Segmented';
import { recentItems, type RecentItem } from '../../lib/recent';
import type { Exam, RecordRow, Source } from '../../lib/types';
import { useAppData, useData } from '../../state/DataContext';
import { ExamForm } from './ExamForm';
import { RecentList } from './RecentList';
import { SingleForm } from './SingleForm';

const TAB_KEY = 'goksenin-entry-tab';
const TABS: { value: Source; label: string }[] = [
  { value: 'Deneme', label: 'Deneme' },
  { value: 'Ödev', label: 'Ödev' },
  { value: 'Kendi Çözdüğü', label: 'Kendi Çözdüğü' },
];

type Editing = { kind: 'record'; row: RecordRow } | { kind: 'exam'; exam: Exam; rows: RecordRow[] } | null;

function readTab(): Source {
  try {
    const t = localStorage.getItem(TAB_KEY);
    if (t && TABS.some((x) => x.value === t)) return t as Source;
  } catch {
    /* depolama kapalı */
  }
  return 'Deneme';
}

export function EntryPage() {
  const data = useAppData();
  const { removeRecord, removeExam } = useData();
  const [tab, setTabState] = useState<Source>(readTab);
  const [editing, setEditing] = useState<Editing>(null);
  const [listError, setListError] = useState<string | null>(null);

  const setTab = (t: Source) => {
    setTabState(t);
    try {
      localStorage.setItem(TAB_KEY, t);
    } catch {
      /* depolama kapalı */
    }
  };

  const startEdit = (item: RecentItem) => {
    if (item.kind === 'record') {
      setTab(item.row.kaynak);
      setEditing({ kind: 'record', row: item.row });
    } else {
      setTab('Deneme');
      setEditing({ kind: 'exam', exam: item.exam, rows: item.rows });
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const del = async (item: RecentItem) => {
    const name = item.kind === 'exam' ? `"${item.exam.ad}" denemesi` : `${item.row.ders} kaydı`;
    if (!window.confirm(`${name} silinsin mi? Bu işlem geri alınamaz.`)) return;
    setListError(null);
    try {
      if (item.kind === 'exam') await removeExam(item.exam.deneme_id);
      else await removeRecord(item.row.id);
      setEditing(null);
    } catch (e) {
      setListError(errorMessage(e));
    }
  };

  const done = () => setEditing(null);
  const editKey = editing ? (editing.kind === 'exam' ? editing.exam.deneme_id : editing.row.id) : 'yeni';

  return (
    <div className="space-y-6">
      <PageHeader title="Veri Girişi" subtitle="Deneme, ödev ve kendi çözdüğü testlerin sonuçlarını kaydet" />
      <Segmented label="Kayıt türü" value={tab} onChange={(t) => { setTab(t); setEditing(null); }} options={TABS} />
      <Card>
        {editing && (
          <p className="mb-4 rounded-xl bg-accent/10 px-3 py-2 text-sm font-medium">
            Düzenleniyor: {editing.kind === 'exam' ? editing.exam.ad : `${editing.row.ders} kaydı`}
          </p>
        )}
        {tab === 'Deneme' ? (
          <ExamForm key={`Deneme-${editKey}`} editing={editing?.kind === 'exam' ? editing : undefined} onDone={done} />
        ) : (
          <SingleForm key={`${tab}-${editKey}`} kaynak={tab} editing={editing?.kind === 'record' ? editing.row : undefined} onDone={done} />
        )}
      </Card>
      <Card>
        <CardTitle>Son kayıtlar</CardTitle>
        {listError && <p role="alert" className="mb-3 text-sm text-bad">{listError}</p>}
        <RecentList items={recentItems(data.kayitlar, data.denemeler, 10)} onEdit={startEdit} onDelete={(i) => void del(i)} />
      </Card>
    </div>
  );
}
