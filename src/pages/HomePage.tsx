import { useEffect, useState } from 'react';

import { getSupabaseClient } from '../lib/supabase';

export default function HomePage() {
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
    <section>
      <h1>CSPN Sports</h1>
      <p>
        {ready === null
          ? 'Checking Supabase...'
          : ready
            ? 'Supabase ready'
            : 'Supabase not ready'}
      </p>
    </section>
  );
}
