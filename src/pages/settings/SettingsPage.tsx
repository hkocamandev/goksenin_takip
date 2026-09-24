import { PageHeader } from '../../components/PageHeader';
import { ExportSection } from './ExportSection';
import { SubjectsSection } from './SubjectsSection';
import { TopicsSection } from './TopicsSection';
import { UsersSection } from './UsersSection';

export function SettingsPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Ayarlar" subtitle="Dersler, konular, kullanıcılar ve veri dışa aktarma" />
      <div className="grid gap-6 xl:grid-cols-2">
        <SubjectsSection />
        <TopicsSection />
      </div>
      <UsersSection />
      <ExportSection />
    </div>
  );
}
