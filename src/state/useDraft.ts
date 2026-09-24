import { useEffect, useState, type Dispatch, type SetStateAction } from 'react';

// Form taslağını localStorage'da tutar: oturum düşse ya da sayfa kapansa da yazılanlar kaybolmaz.
export function useDraft<T>(key: string | null, init: () => T, revive: (t: T) => T = (t) => t): [T, Dispatch<SetStateAction<T>>] {
  const [value, setValue] = useState<T>(() => {
    if (key) {
      try {
        const raw = localStorage.getItem(key);
        if (raw) return revive(JSON.parse(raw) as T);
      } catch {
        /* bozuk ya da erişilemeyen taslak: yok say */
      }
    }
    return init();
  });
  useEffect(() => {
    if (!key) return;
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* depolama kapalı */
    }
  }, [key, value]);
  return [value, setValue];
}
