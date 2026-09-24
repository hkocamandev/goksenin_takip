import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { ApiError } from '../../src/api/api';
import { App } from '../../src/App';
import { makeApi, renderApp } from '../helpers/renderApp';

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  window.location.hash = '';
});

async function loginAs(user: ReturnType<typeof userEvent.setup>, u: string, p: string) {
  await user.type(screen.getByLabelText('Kullanıcı adı'), u);
  await user.type(screen.getByLabelText('Şifre'), p);
  await user.click(screen.getByRole('button', { name: 'Giriş yap' }));
}

describe('giriş', () => {
  it('oturum yoksa giriş sayfası gelir; hatalı şifrede mesaj gösterir', async () => {
    const user = userEvent.setup();
    render(<App api={makeApi()} />);
    await loginAs(user, 'demo', 'yanlis');
    expect(await screen.findByText('Kullanıcı adı veya şifre hatalı.')).toBeInTheDocument();
  });

  it('doğru girişte menü görünür ve oturum saklanır', async () => {
    const user = userEvent.setup();
    render(<App api={makeApi()} />);
    await loginAs(user, 'demo', 'demo123');
    expect((await screen.findAllByRole('link', { name: /Analiz/ })).length).toBeGreaterThan(0);
    expect(JSON.parse(localStorage.getItem('goksenin-session')!).kullanici_adi).toBe('demo');
  });

  it('sunucu AUTH dönerse giriş sayfasına döner ve oturumun bittiğini söyler', async () => {
    let expireNow = false;
    await renderApp({
      wrap: (inner) => async (a, p, t) => {
        if (expireNow && a !== 'login') throw new ApiError('AUTH', 'Oturumunuz sona erdi. Lütfen tekrar giriş yapın.');
        expireNow = true; // login sonrası ilk getAll'dan itibaren
        return inner(a, p, t);
      },
    });
    expect(await screen.findByText(/Oturumunuz sona erdi/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Giriş yap' })).toBeInTheDocument();
    expect(localStorage.getItem('goksenin-session')).toBeNull();
  });

  it('çıkış yapınca giriş sayfasına döner', async () => {
    const { user } = await renderApp();
    await user.click((await screen.findAllByRole('button', { name: 'Çıkış yap' }))[0]);
    expect(await screen.findByRole('button', { name: 'Giriş yap' })).toBeInTheDocument();
  });
});

describe('oturum saklama', () => {
  it('"Beni hatırla" kapalıysa oturum yalnızca bu sekmede (sessionStorage) tutulur', async () => {
    sessionStorage.clear();
    const user = userEvent.setup();
    render(<App api={makeApi()} />);
    await user.click(screen.getByLabelText(/Beni hatırla/));
    await loginAs(user, 'demo', 'demo123');
    await screen.findAllByRole('link', { name: /Analiz/ });
    expect(localStorage.getItem('goksenin-session')).toBeNull();
    expect(JSON.parse(sessionStorage.getItem('goksenin-session')!).kullanici_adi).toBe('demo');
  });

  it('çıkış yapınca form taslakları da silinir', async () => {
    const { user } = await renderApp();
    localStorage.setItem('goksenin-draft-Ödev', '{"x":1}');
    await user.click((await screen.findAllByRole('button', { name: 'Çıkış yap' }))[0]);
    await screen.findByRole('button', { name: 'Giriş yap' });
    expect(localStorage.getItem('goksenin-draft-Ödev')).toBeNull();
  });
});
