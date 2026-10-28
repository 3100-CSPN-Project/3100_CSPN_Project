import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { transformedImageUrl } from '../lib/mlbImages.js';
import { getMlbPlayer, type MlbPlayer } from '../lib/mlbPlayers.js';
import { getMlbPlayerStats, type MlbPlayerStatRow } from '../lib/mlbStats.js';

function formatRate(value: number | null, digits = 3): string {
  if (value === null) return '—';

  return value.toFixed(digits).replace(/^(-?)0\./, '$1.');
}

function formatCount(value: number | null): string {
  return value === null ? '—' : String(value);
}

function isPitcher(position: string | null): boolean {
  const normalizedPosition = position?.trim().toUpperCase();

  return (
    normalizedPosition !== undefined &&
    (['P', 'SP', 'RP', 'CP', 'RHP', 'LHP'].includes(normalizedPosition) ||
      normalizedPosition.includes('PITCH'))
  );
}

export default function PlayerPage() {
  const { playerId: playerIdParam } = useParams();
  const playerId = Number(playerIdParam);
  const hasValidPlayerId =
    playerIdParam !== undefined &&
    Number.isSafeInteger(playerId) &&
    playerId > 0;
  const [player, setPlayer] = useState<MlbPlayer | null | undefined>(undefined);
  const [seasonStats, setSeasonStats] = useState<MlbPlayerStatRow | null>(null);
  const [error, setError] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (!hasValidPlayerId) return undefined;

    let active = true;
    setPlayer(undefined);
    setSeasonStats(null);
    setError(undefined);

    Promise.all([
      getMlbPlayer(playerId),
      getMlbPlayerStats({ playerId, split: 'season' }),
    ])
      .then(([playerRow, statRows]) => {
        if (!active) return;

        setPlayer(playerRow);
        setSeasonStats(statRows[0] ?? null);
      })
      .catch((cause: unknown) => {
        if (active) {
          setError(cause instanceof Error ? cause.message : String(cause));
        }
      });

    return () => {
      active = false;
    };
  }, [hasValidPlayerId, playerId]);

  if (!hasValidPlayerId) {
    return <p role="alert">Invalid player ID.</p>;
  }

  if (error !== undefined) {
    return <p role="alert">{error}</p>;
  }

  if (player === undefined) {
    return <p>Loading player...</p>;
  }

  if (player === null) {
    return <p>Player not found.</p>;
  }

  const playerImage = transformedImageUrl(player.imageUrl, 256);
  const handDetails = [
    player.batSide ? `Bats ${player.batSide}` : null,
    player.throwHand ? `Throws ${player.throwHand}` : null,
  ]
    .filter(Boolean)
    .join(' / ');
  const seasonLabel = seasonStats?.season ?? new Date().getUTCFullYear();
  const pitcher = isPitcher(player.primaryPosition);
  const position = player.primaryPosition?.trim().toUpperCase();
  const reliefPitcher =
    pitcher &&
    (position === 'RP' ||
      position === 'CP' ||
      (seasonStats?.games_started !== null &&
        seasonStats?.games_started !== undefined &&
        seasonStats.games_started === 0));
  const headlineStats = pitcher
    ? [
        {
          label: reliefPitcher ? 'Saves' : 'Wins',
          value: formatCount(
            reliefPitcher
              ? (seasonStats?.saves ?? null)
              : (seasonStats?.wins ?? null),
          ),
        },
        { label: 'Losses', value: formatCount(seasonStats?.losses ?? null) },
        { label: 'ERA', value: formatRate(seasonStats?.era ?? null, 2) },
        { label: 'K', value: formatCount(seasonStats?.strikeouts ?? null) },
        { label: 'WHIP', value: formatRate(seasonStats?.whip ?? null, 2) },
      ]
    : [
        {
          label: 'AVG',
          value: formatRate(seasonStats?.batting_average ?? null),
        },
        { label: 'HR', value: formatCount(seasonStats?.home_runs ?? null) },
        { label: 'RBI', value: formatCount(seasonStats?.rbi ?? null) },
        { label: 'OPS', value: formatRate(seasonStats?.ops ?? null) },
      ];

  return (
    <section className="sports-page player-page">
      {/* trace: The shared Layout header replaces this page's former local header. */}
      <div className="player-overview">
        <div className="player-icon">
          {playerImage ? (
            <img src={playerImage} alt={player.fullName} />
          ) : (
            'Player'
          )}
        </div>
        <div className="player-identity">
          <h1>{player.fullName}</h1>
          <p>{player.primaryPosition ?? 'Position unavailable'}</p>
          <p>{handDetails || 'Batting and throwing information unavailable'}</p>
          <button type="button">Follow</button>
        </div>
        <div
          className={`headline-stats${
            pitcher ? ' pitcher-headline-stats' : ''
          }`}
        >
          {headlineStats.map(({ label, value }) => (
            <span key={label}>
              <strong>{label}</strong>
              <b>{value}</b>
            </span>
          ))}
        </div>
      </div>

      <nav className="player-tabs" aria-label="Player information">
        <a className="active" href="#stats">
          Stats
        </a>
        <a href="#splits">Splits</a>
        <a href="#games">Game Log</a>
        <a href="#news">News</a>
        <a href="#bio">Bio</a>
      </nav>

      <div className="player-grid">
        <div className="player-left-column">
          <section className="stats-card" id="stats">
            <h2>Performance Stats</h2>
            <div
              className="stats-table"
              role="table"
              aria-label="Season performance statistics"
            >
              <div role="row" className="table-heading">
                <span>STAT</span>
                <span>{seasonLabel}</span>
              </div>
              <div role="row">
                <span>Games</span>
                <span>{formatCount(seasonStats?.games ?? null)}</span>
              </div>
              <div role="row">
                <span>Batting average</span>
                <span>{formatRate(seasonStats?.batting_average ?? null)}</span>
              </div>
              <div role="row">
                <span>Home runs</span>
                <span>{formatCount(seasonStats?.home_runs ?? null)}</span>
              </div>
              <div role="row">
                <span>Runs batted in</span>
                <span>{formatCount(seasonStats?.rbi ?? null)}</span>
              </div>
              <div role="row">
                <span>OPS</span>
                <span>{formatRate(seasonStats?.ops ?? null)}</span>
              </div>
              <div role="row">
                <span>ERA</span>
                <span>{formatRate(seasonStats?.era ?? null, 2)}</span>
              </div>
              <div role="row">
                <span>WHIP</span>
                <span>{formatRate(seasonStats?.whip ?? null, 2)}</span>
              </div>
            </div>
          </section>
          <section className="trend-card">
            <h2>Trend Chart (last 10 games)</h2>
            <div className="trend-bars" aria-label="Last ten games bar chart">
              {[42, 64, 55, 84, 47, 71, 93].map((height, index) => (
                <span key={index} style={{ height: `${height}%` }} />
              ))}
            </div>
          </section>
        </div>

        <aside className="player-side-column">
          <section className="side-card next-game">
            <h2>Next Game</h2>
            <Link to="/game/1">T1 Logo · Time · T2 Logo</Link>
          </section>
          <section className="side-card">
            <h2>Other Players (teammates)</h2>
            <div className="side-list">
              <Link to="/player/2">Teammate One</Link>
              <Link to="/player/3">Teammate Two</Link>
              <Link to="/player/4">Teammate Three</Link>
            </div>
          </section>
          <section className="side-card related-news">
            <h2>Related News</h2>
            <p>Latest team and player news will appear here.</p>
          </section>
        </aside>
      </div>
      <p className="sr-only">Player ID: {player.playerId}</p>
    </section>
  );
}
