import clsx from 'clsx';
import { Download } from 'lucide-react';
import { Card, CardTitle } from '../../components/Card';
import { btnGhost } from '../../components/ui';
import { toCsv } from '../../lib/csv';
import { downloadText } from '../../lib/download';
import { todayIso } from '../../lib/periods';
import { useAppData } from '../../state/DataContext';

export function ExportSection() {
  const data = useAppData();
  return (
    <Card label="Dışa aktar">
      <CardTitle>Dışa aktar</CardTitle>
      <p className="text-sm text-muted">
        Tüm kayıtları Excel'de açılabilen bir CSV dosyası olarak indir. Veriler ayrıca Google Sheet'te de duruyor.
      </p>
      <button
        type="button"
        className={clsx(btnGhost, 'mt-4')}
        onClick={() => downloadText(`goksenin-takip-${todayIso()}.csv`, toCsv(data.kayitlar, data.denemeler), 'text/csv;charset=utf-8')}
      >
        <Download size={16} /> CSV indir
      </button>
    </Card>
  );
}
