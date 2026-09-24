import { useState } from 'react';
import { Card, CardTitle } from '../../components/Card';
import { Field } from '../../components/Field';
import { btnSm, inputCls } from '../../components/ui';
import { useAuth } from '../../state/AuthContext';
import { useAppData, useData } from '../../state/DataContext';
import { useAction } from '../../state/useAction';

export function UsersSection() {
  const data = useAppData();
  const { session } = useAuth();
  const { runAndReload } = useData();
  const add = useAction();
  const pw = useAction();
  const [u, setU] = useState('');
  const [ad, setAd] = useState('');
  const [sifre, setSifre] = useState('');
  const [eski, setEski] = useState('');
  const [yeni, setYeni] = useState('');
  const [pwDone, setPwDone] = useState(false);

  return (
    <Card label="Kullanıcılar">
      <CardTitle>Kullanıcılar</CardTitle>
      <ul aria-label="Kullanıcı listesi" className="divide-y divide-line">
        {data.kullanicilar.map((k) => (
          <li key={k.kullanici_adi} className="flex items-center justify-between py-2">
            <span className="font-medium">{k.ad}</span>
            <span className="text-sm text-muted">
              <span>@{k.kullanici_adi}</span>
              {k.kullanici_adi === session?.kullanici_adi && <span> · sen</span>}
            </span>
          </li>
        ))}
      </ul>
      <div className="mt-6 grid gap-8 lg:grid-cols-2">
        <form
          className="space-y-3"
          onSubmit={async (e) => {
            e.preventDefault();
            if (await add.run(() => runAndReload((api) => api.addUser(u, ad, sifre)))) {
              setU('');
              setAd('');
              setSifre('');
            }
          }}
        >
          <h3 className="font-display font-semibold">Yeni kullanıcı</h3>
          <Field label="Yeni kullanıcı adı" hint="küçük harf, rakam, nokta, tire">
            <input className={inputCls} autoCapitalize="none" autoComplete="off" value={u} onChange={(e) => setU(e.target.value)} />
          </Field>
          <Field label="Görünen ad">
            <input className={inputCls} value={ad} onChange={(e) => setAd(e.target.value)} />
          </Field>
          <Field label="Yeni kullanıcının şifresi" hint="en az 8 karakter">
            <input className={inputCls} type="password" autoComplete="new-password" value={sifre} onChange={(e) => setSifre(e.target.value)} />
          </Field>
          {add.error && <p role="alert" className="text-sm text-bad">{add.error}</p>}
          <button type="submit" className={btnSm} disabled={add.busy}>Kullanıcı ekle</button>
        </form>
        <form
          className="space-y-3"
          onSubmit={async (e) => {
            e.preventDefault();
            setPwDone(false);
            if (await pw.run(() => runAndReload((api) => api.changePassword(eski, yeni)))) {
              setEski('');
              setYeni('');
              setPwDone(true);
            }
          }}
        >
          <h3 className="font-display font-semibold">Şifremi değiştir</h3>
          <Field label="Mevcut şifre">
            <input className={inputCls} type="password" autoComplete="current-password" value={eski} onChange={(e) => setEski(e.target.value)} />
          </Field>
          <Field label="Yeni şifre" hint="en az 8 karakter">
            <input className={inputCls} type="password" autoComplete="new-password" value={yeni} onChange={(e) => setYeni(e.target.value)} />
          </Field>
          {pw.error && <p role="alert" className="text-sm text-bad">{pw.error}</p>}
          {pwDone && <p role="status" className="text-sm text-good">Şifre değiştirildi.</p>}
          <button type="submit" className={btnSm} disabled={pw.busy}>Şifreyi değiştir</button>
        </form>
      </div>
    </Card>
  );
}
