import type {
  AppData, ExamInput, ExamResult, FieldErrors, Grade, RecordInput, RecordRow, Subject, Topic,
} from '../lib/types';

export type ErrorCode = 'AUTH' | 'LOGIN' | 'VALIDATION' | 'NOT_FOUND' | 'NETWORK' | 'SERVER';

export class ApiError extends Error {
  code: ErrorCode;
  details: FieldErrors | null;

  constructor(code: ErrorCode, message: string, details: FieldErrors | null = null) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.details = details;
  }
}

export type Transport = (action: string, payload: unknown, token: string | null) => Promise<unknown>;

export interface Session {
  token: string;
  kullanici_adi: string;
  ad: string;
}

export function createApi(transport: Transport) {
  let token: string | null = null;
  const call = <T>(action: string, payload: unknown = {}) => transport(action, payload, token) as Promise<T>;
  return {
    setToken(t: string | null) {
      token = t;
    },
    login: (kullanici_adi: string, sifre: string, hatirla: boolean) => call<Session>('login', { kullanici_adi, sifre, hatirla }),
    logout: () => call<null>('logout'),
    getAll: () => call<AppData>('getAll'),
    addRecord: (input: RecordInput) => call<RecordRow>('addRecord', { input }),
    updateRecord: (id: string, input: RecordInput) => call<RecordRow>('updateRecord', { id, input }),
    deleteRecord: (id: string) => call<null>('deleteRecord', { id }),
    addExam: (input: ExamInput) => call<ExamResult>('addExam', { input }),
    updateExam: (deneme_id: string, input: ExamInput) => call<ExamResult>('updateExam', { deneme_id, input }),
    deleteExam: (deneme_id: string) => call<null>('deleteExam', { deneme_id }),
    saveSubjects: (dersler: Subject[]) => call<null>('saveSubjects', { dersler }),
    saveTopics: (konular: Topic[]) => call<null>('saveTopics', { konular }),
    renameSubject: (sinif: Grade, eski: string, yeni: string) => call<null>('renameSubject', { sinif, eski, yeni }),
    renameTopic: (sinif: Grade, ders: string, eski: string, yeni: string) => call<null>('renameTopic', { sinif, ders, eski, yeni }),
    addUser: (kullanici_adi: string, ad: string, sifre: string) => call<null>('addUser', { kullanici_adi, ad, sifre }),
    changePassword: (eski: string, yeni: string) => call<null>('changePassword', { eski, yeni }),
  };
}

export type Api = ReturnType<typeof createApi>;

export function errorMessage(e: unknown): string {
  if (e instanceof ApiError) {
    const first = e.details ? Object.values(e.details)[0] : undefined;
    return first ?? e.message;
  }
  return 'Beklenmeyen bir hata oluştu.';
}
