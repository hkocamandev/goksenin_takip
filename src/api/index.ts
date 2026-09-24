import { createApi } from './api';
import { resolveApiConfig } from './config';
import { httpTransport } from './http';
import { createMockTransport } from './mock';

export const apiConfig = resolveApiConfig({ PROD: import.meta.env.PROD, VITE_API_URL: import.meta.env.VITE_API_URL });

export const defaultApi = createApi(apiConfig.mode === 'http' ? httpTransport(apiConfig.url) : createMockTransport());
