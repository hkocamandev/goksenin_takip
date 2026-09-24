import { createApi } from './api';
import { resolveApiConfig } from './config';
import { httpTransport } from './http';
import { lazyTransport } from './lazy';

export const apiConfig = resolveApiConfig({ PROD: import.meta.env.PROD, VITE_API_URL: import.meta.env.VITE_API_URL });

// Mock yalnızca geliştirmede ve ayrı bir parçadan yüklenir: üretim paketi onu (ve içindeki eval'i) hiç çalıştırmaz.
export const defaultApi = createApi(
  apiConfig.mode === 'http'
    ? httpTransport(apiConfig.url)
    : lazyTransport(() => import('./mock').then((m) => m.createMockTransport())),
);
