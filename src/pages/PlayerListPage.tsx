import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  getMlbPlayers,
  searchMlbPlayers,
  type MlbPlayer,
} from '../lib/mlbPlayers.js';

export default function PlayerListPage() {
  const [query, setQuery] = useState('');
  const [players, setPlayers] = useState<MlbPlayer[] | undefined>(undefined);
  const [error, setError] = useState<string | undefined>(undefined);

  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(() => {
      setError(undefined);

      const request = query.trim() ? searchMlbPlayers(query) : getMlbPlayers();

      request
        .then((rows) => {
          if (active) setPlayers(rows);
        })
        .catch((cause: unknown) => {
          if (active) {
            setPlayers([]);
            setError(cause instanceof Error ? cause.message : String(cause));
          }
        });
    }, 250);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [query]);

  return (
    <section className="player-directory">
      <h1>Players</h1>
      <label htmlFor="player-search">Search players</label>
      <input
        id="player-search"
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search by player name"
        autoComplete="off"
      />

      {error !== undefined && <p role="alert">{error}</p>}
      {error === undefined && players === undefined && (
        <p>Loading players...</p>
      )}
      {players?.length === 0 && (
        <p>
          {query.trim()
            ? 'No players matched that search.'
            : 'No players found.'}
        </p>
      )}

      <ul className="player-directory-list">
        {players?.map((player) => (
          <li key={player.playerId}>
            <Link to={`/player/${player.playerId}`}>
              {player.fullName}
              {player.primaryPosition && (
                <span> · {player.primaryPosition}</span>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
