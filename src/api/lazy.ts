import type { Transport } from './api';

// Asıl transport'u ilk istekte yükler (ör. mock yalnızca geliştirmede, ayrı bir parçadan).
export function lazyTransport(load: () => Promise<Transport>): Transport {
  let pending: Promise<Transport> | null = null;
  return async (action, payload, token) => {
    pending ??= load();
    return (await pending)(action, payload, token);
  };
}
