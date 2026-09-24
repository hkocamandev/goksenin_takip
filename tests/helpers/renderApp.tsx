import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createApi, type Api, type Transport } from '../../src/api/api';
import { createMockTransport } from '../../src/api/mock';
import { App } from '../../src/App';

export function makeApi(wrap?: (inner: Transport) => Transport, samples = false): Api {
  const inner = createMockTransport({ storage: null, latencyMs: 0, withSamples: samples });
  return createApi(wrap ? wrap(inner) : inner);
}

export async function renderApp(opts: {
  route?: string;
  samples?: boolean;
  wrap?: (inner: Transport) => Transport;
  seed?: (api: Api) => Promise<void>;
} = {}) {
  localStorage.clear();
  const api = makeApi(opts.wrap, opts.samples);
  const session = await api.login('demo', 'demo123', true);
  api.setToken(session.token);
  if (opts.seed) await opts.seed(api);
  localStorage.setItem('goksenin-session', JSON.stringify(session));
  window.location.hash = opts.route ?? '#/';
  const user = userEvent.setup();
  const utils = render(<App api={api} />);
  return { api, user, unmount: utils.unmount };
}
