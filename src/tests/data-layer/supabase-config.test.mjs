import { describe, expect, it } from '@jest/globals';

const { createSupabaseClient, getSupabaseClient, getSupabaseConfig } =
  await import('../../../.test-build/src/lib/supabase.js');

describe('Supabase client configuration', () => {
  it('trims the project URL and accepts the publishable key', () => {
    expect(
      getSupabaseConfig({
        VITE_SUPABASE_URL: ' https://cspn.example.test ',
        VITE_SUPABASE_PUBLISHABLE_KEY: ' public-key ',
      }),
    ).toEqual({
      url: 'https://cspn.example.test',
      publishableKey: 'public-key',
    });
  });

  it('supports the legacy anonymous-key variable', () => {
    expect(
      getSupabaseConfig({
        VITE_SUPABASE_URL: 'https://cspn.example.test',
        VITE_SUPABASE_ANON_KEY: 'legacy-key',
      }).publishableKey,
    ).toBe('legacy-key');
  });

  it('throws when the URL or key is missing', () => {
    expect(() => getSupabaseConfig({})).toThrow(
      'Missing Supabase configuration',
    );
  });

  it('creates the shared client lazily and reports absent Vite config', () => {
    expect(() => getSupabaseClient()).toThrow('Missing Supabase configuration');
  });

  it('creates a client from explicit options without making a network request', () => {
    const client = createSupabaseClient(
      { url: 'http://127.0.0.1:54321', publishableKey: 'test-key' },
      {},
    );

    expect(typeof client.from).toBe('function');
    expect(typeof client.rpc).toBe('function');
  });

  it('prefers explicit client options over environment values', () => {
    const client = createSupabaseClient(
      { url: 'http://127.0.0.1:54322', publishableKey: 'option-key' },
      {
        VITE_SUPABASE_URL: 'http://127.0.0.1:54321',
        VITE_SUPABASE_PUBLISHABLE_KEY: 'environment-key',
      },
    );

    expect(client.supabaseUrl).toBe('http://127.0.0.1:54322');
    expect(client.supabaseKey).toBe('option-key');
  });
});
