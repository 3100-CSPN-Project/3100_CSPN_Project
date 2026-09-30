import { useEffect, useState } from 'react';
import { getSupabaseClient } from './lib/supabase';

export default function App() {
  const [ready, setReady] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function checkSupabase() {
      try {
        const { error } = await getSupabaseClient()
          .from('todos')
          .select('id')
          .limit(1);

        if (!cancelled) {
          setReady(!error);
        }
      } catch {
        if (!cancelled) {
          setReady(false);
        }
      }
    }

    void checkSupabase();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="app-shell">
      <h1>
        {ready === null
          ? 'Checking Supabase...'
          : ready
            ? 'Supabase ready'
            : 'Supabase not ready'}
      </h1>
    </main>
  );
}
