import { Moon, Sun } from 'lucide-react';
import { useState } from 'react';
import { IconButton } from './IconButton';

export function ThemeToggle() {
  const [theme, setTheme] = useState(() => document.documentElement.dataset.theme ?? 'light');
  const toggle = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem('goksenin-theme', next);
    } catch {
      /* depolama kapalı */
    }
    setTheme(next);
  };
  return (
    <IconButton label={theme === 'dark' ? 'Açık temaya geç' : 'Koyu temaya geç'} onClick={toggle}>
      {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
    </IconButton>
  );
}
