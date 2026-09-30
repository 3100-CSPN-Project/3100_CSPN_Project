import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export interface SupabaseConfig {
  url: string;
  publishableKey: string;
}

export interface SupabaseEnv {
  VITE_SUPABASE_URL?: string;
  VITE_SUPABASE_PUBLISHABLE_KEY?: string;
  VITE_SUPABASE_ANON_KEY?: string;
}

export interface SupabaseClientOptions {
  url?: string;
  publishableKey?: string;
}

function firstNonEmpty(
  ...values: Array<string | undefined>
): string | undefined {
  return values.find((value) => value?.trim())?.trim();
}

function getViteEnv(): SupabaseEnv {
  return {
    VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
    VITE_SUPABASE_PUBLISHABLE_KEY: import.meta.env
      .VITE_SUPABASE_PUBLISHABLE_KEY,
    VITE_SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY,
  };
}

export function getSupabaseConfig(
  env: SupabaseEnv = getViteEnv(),
): SupabaseConfig {
  const url = firstNonEmpty(env.VITE_SUPABASE_URL);
  const publishableKey = firstNonEmpty(
    env.VITE_SUPABASE_PUBLISHABLE_KEY,
    env.VITE_SUPABASE_ANON_KEY,
  );

  if (!url || !publishableKey) {
    throw new Error(
      'Missing Supabase configuration. Set VITE_SUPABASE_URL and ' +
        'VITE_SUPABASE_PUBLISHABLE_KEY (or the legacy ' +
        'VITE_SUPABASE_ANON_KEY).',
    );
  }

  return { url, publishableKey };
}

export function createSupabaseClient(
  options: SupabaseClientOptions = {},
  env: SupabaseEnv = getViteEnv(),
): SupabaseClient {
  const url = firstNonEmpty(options.url, env.VITE_SUPABASE_URL);
  const publishableKey = firstNonEmpty(
    options.publishableKey,
    env.VITE_SUPABASE_PUBLISHABLE_KEY,
    env.VITE_SUPABASE_ANON_KEY,
  );

  if (!url || !publishableKey) {
    throw new Error(
      'Missing Supabase configuration. Set VITE_SUPABASE_URL and ' +
        'VITE_SUPABASE_PUBLISHABLE_KEY (or the legacy ' +
        'VITE_SUPABASE_ANON_KEY).',
    );
  }

  return createClient(url, publishableKey);
}

let client: SupabaseClient | undefined;

/** Returns one shared client for the current process. */
export function getSupabaseClient(): SupabaseClient {
  client ??= createSupabaseClient();
  return client;
}
