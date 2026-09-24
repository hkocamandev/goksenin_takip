import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { ApiError, errorMessage, type Api } from '../api/api';
import type { AppData, ExamInput, ExamResult, RecordInput, RecordRow } from '../lib/types';
import { useAuth } from './AuthContext';

interface DataValue {
  data: AppData | null;
  error: string | null;
  reload(): Promise<void>;
  saveRecord(input: RecordInput, id?: string, clientId?: string): Promise<RecordRow>;
  removeRecord(id: string): Promise<void>;
  saveExam(input: ExamInput, id?: string, clientId?: string): Promise<ExamResult>;
  removeExam(id: string): Promise<void>;
  runAndReload(fn: (api: Api) => Promise<unknown>): Promise<void>;
}

const DataContext = createContext<DataValue | null>(null);

export function DataProvider({ children }: { children: ReactNode }) {
  const { api, expire } = useAuth();
  const [data, setData] = useState<AppData | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Oturum düşerse (AUTH) giriş sayfasına dön; diğer hatalar çağırana iletilir.
  const guard = useCallback(
    async <T,>(p: Promise<T>): Promise<T> => {
      try {
        return await p;
      } catch (e) {
        if (e instanceof ApiError && e.code === 'AUTH') expire();
        throw e;
      }
    },
    [expire],
  );

  const reload = useCallback(async () => {
    setError(null);
    try {
      setData(await guard(api.getAll()));
    } catch (e) {
      if (!(e instanceof ApiError && e.code === 'AUTH')) setError(errorMessage(e));
    }
  }, [api, guard]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const saveRecord = async (input: RecordInput, id?: string, clientId?: string) => {
    const row = await guard(id ? api.updateRecord(id, input) : api.addRecord(input, clientId));
    setData((d) => d && { ...d, kayitlar: [...d.kayitlar.filter((r) => r.id !== row.id), row] });
    return row;
  };

  const removeRecord = async (id: string) => {
    await guard(api.deleteRecord(id));
    setData((d) => d && { ...d, kayitlar: d.kayitlar.filter((r) => r.id !== id) });
  };

  const saveExam = async (input: ExamInput, id?: string, clientId?: string) => {
    const res = await guard(id ? api.updateExam(id, input) : api.addExam(input, clientId));
    const eid = res.exam.deneme_id;
    setData(
      (d) =>
        d && {
          ...d,
          denemeler: [...d.denemeler.filter((e) => e.deneme_id !== eid), res.exam],
          kayitlar: [...d.kayitlar.filter((r) => r.deneme_id !== eid), ...res.rows],
        },
    );
    return res;
  };

  const removeExam = async (id: string) => {
    await guard(api.deleteExam(id));
    setData((d) => d && { ...d, denemeler: d.denemeler.filter((e) => e.deneme_id !== id), kayitlar: d.kayitlar.filter((r) => r.deneme_id !== id) });
  };

  const runAndReload = async (fn: (api: Api) => Promise<unknown>) => {
    await guard(fn(api));
    await reload();
  };

  return (
    <DataContext.Provider value={{ data, error, reload, saveRecord, removeRecord, saveExam, removeExam, runAndReload }}>
      {children}
    </DataContext.Provider>
  );
}

export function useData(): DataValue {
  const v = useContext(DataContext);
  if (!v) throw new Error('useData, DataProvider içinde kullanılmalı');
  return v;
}

export function useAppData(): AppData {
  const { data } = useData();
  if (!data) throw new Error('Veri henüz yüklenmedi');
  return data;
}
