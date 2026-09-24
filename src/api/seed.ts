import seedSource from '../../apps-script/Seed.gs?raw';
import type { Subject, Topic } from '../lib/types';

interface SeedModule {
  seedSubjects_: () => Subject[];
  seedTopics_: () => Topic[];
}

// Seed.gs tek kaynaktır; Apps Script ile aynı kodu çalıştırırız.
const mod = new Function(`${seedSource}\nreturn { seedSubjects_: seedSubjects_, seedTopics_: seedTopics_ };`)() as SeedModule;

export function seedSubjects(): Subject[] {
  return mod.seedSubjects_();
}

export function seedTopics(): Topic[] {
  return mod.seedTopics_();
}
