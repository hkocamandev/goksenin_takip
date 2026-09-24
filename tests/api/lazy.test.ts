import { describe, expect, it, vi } from 'vitest';
import { lazyTransport } from '../../src/api/lazy';

describe('lazyTransport', () => {
  it('asıl transport modülünü ilk istekte ve yalnızca bir kez yükler', async () => {
    const inner = vi.fn(async (action: string) => `yanıt:${action}`);
    const loader = vi.fn(async () => inner);
    const t = lazyTransport(loader);
    expect(loader).not.toHaveBeenCalled();
    await expect(t('getAll', {}, 'tok')).resolves.toBe('yanıt:getAll');
    await expect(t('logout', {}, 'tok')).resolves.toBe('yanıt:logout');
    expect(loader).toHaveBeenCalledTimes(1);
    expect(inner).toHaveBeenCalledWith('logout', {}, 'tok');
  });
});
