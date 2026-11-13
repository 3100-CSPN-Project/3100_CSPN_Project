import { useEffect, useState, type KeyboardEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getMlbNextGameForTeam, type MlbNextGame } from '../lib/mlbGames.js';
import { transformedImageUrl } from '../lib/mlbImages.js';
import {
  getMlbPlayer,
  getRandomMlbTeammates,
  type MlbPlayer,
} from '../lib/mlbPlayers.js';
import {
  getMlbPlayerProfileStats,
  type MlbPlayerGameLogRow,
  type MlbPlayerProfileStats,
  type MlbPlayerStatRow,
} from '../lib/mlbStats.js';

const PLAYER_TABS = [
  { id: 'stats', label: 'Stats' },
  { id: 'splits', label: 'Splits' },
  { id: 'games', label: 'Game Log' },
  { id: 'news', label: 'News' },
  { id: 'bio', label: 'Bio' },
] as const;

type PlayerTab = (typeof PLAYER_TABS)[number]['id'];
type GameLogLimit = '7' | '30' | 'all';

interface MlbPlayerProfile extends MlbPlayer {
  teamName: string | null;
}

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

function valueAsNumber(
  stats: Record<string, unknown>,
  key: string,
): number | null {
  const value = stats[key];
  if (value === undefined || value === null || value === '') return null;

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function valueAsText(
  stats: Record<string, unknown>,
  key: string,
): string | null {
  const value = stats[key];
  return value === undefined || value === null || value === ''
    ? null
    : String(value);
}

function formatRecord(row: MlbPlayerStatRow): string {
  if (row.wins === null && row.losses === null) return '—';
  return `${row.wins ?? 0}-${row.losses ?? 0}`;
}

function splitLabel(row: MlbPlayerStatRow): string {
  if (row.split_type === 'season') return 'Season';
  if (row.split_type === 'last_games') {
    return `Last ${row.split_value} games`;
  }

  const [year, month] = row.split_value.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString('en-US', {
    month: 'long',
    timeZone: 'UTC',
  });
}

function formatDate(value: string): string {
  return new Date(`${value.slice(0, 10)}T12:00:00Z`).toLocaleDateString(
    'en-US',
    { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' },
  );
}

function gameResult(row: MlbPlayerGameLogRow): string {
  if (row.homeScore === null || row.awayScore === null) return '—';

  const playerScore = row.isHome ? row.homeScore : row.awayScore;
  const opponentScore = row.isHome ? row.awayScore : row.homeScore;
  const result =
    playerScore === opponentScore
      ? 'T'
      : playerScore > opponentScore
        ? 'W'
        : 'L';

  return `${result} ${playerScore}–${opponentScore}`;
}

export default function PlayerPage() {
  const { playerId: playerIdParam } = useParams();
  const playerId = Number(playerIdParam);
  const hasValidPlayerId =
    playerIdParam !== undefined &&
    Number.isSafeInteger(playerId) &&
    playerId > 0;
  const [player, setPlayer] = useState<MlbPlayerProfile | null | undefined>(
    undefined,
  );
  const [profileStats, setProfileStats] =
    useState<MlbPlayerProfileStats | null>(null);
  const [nextGame, setNextGame] = useState<MlbNextGame | null>(null);
  const [teammates, setTeammates] = useState<MlbPlayer[]>([]);
  const [error, setError] = useState<string | undefined>(undefined);
  const [activeTab, setActiveTab] = useState<PlayerTab>('stats');
  const [gameLogLimit, setGameLogLimit] = useState<GameLogLimit>('7');

  useEffect(() => {
    if (!hasValidPlayerId) return undefined;

    let active = true;
    setPlayer(undefined);
    setProfileStats(null);
    setNextGame(null);
    setTeammates([]);
    setError(undefined);
    setActiveTab('stats');
    setGameLogLimit('7');

    async function loadProfile() {
      const [playerRow, stats] = await Promise.all([
        getMlbPlayer(playerId),
        getMlbPlayerProfileStats(playerId),
      ]);

      if (!active) return;
      if (!playerRow) {
        setPlayer(null);
        return;
      }

      const teamId = stats.gameLog[0]?.teamId;
      let teamPlayers: MlbPlayer[] = [];
      let upcomingGame: MlbNextGame | null = null;
      if (teamId !== undefined) {
        [teamPlayers, upcomingGame] = await Promise.all([
          getRandomMlbTeammates(teamId, playerId),
          getMlbNextGameForTeam(
            teamId,
            stats.season?.season ?? new Date().getUTCFullYear(),
          ),
        ]);
      }

      if (!active) return;
      setPlayer({
        ...playerRow,
        teamName: stats.gameLog[0]?.teamName ?? null,
      });
      setProfileStats(stats);
      setTeammates(teamPlayers);
      setNextGame(upcomingGame);
    }

    loadProfile().catch((cause: unknown) => {
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
  const seasonLabel =
    profileStats?.season?.season ?? new Date().getUTCFullYear();
  const seasonStats = profileStats?.season ?? null;
  const splits = profileStats?.splits ?? [];
  const gameLog = profileStats?.gameLog ?? [];
  const visibleGameLog =
    gameLogLimit === 'all'
      ? gameLog
      : gameLog.slice(0, Number(gameLogLimit));
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
          value: reliefPitcher
            ? formatCount(seasonStats?.saves ?? null)
            : formatCount(seasonStats?.wins ?? null),
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

  function handleTabKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const currentIndex = PLAYER_TABS.findIndex((tab) => tab.id === activeTab);
    let nextIndex = currentIndex;

    if (event.key === 'ArrowRight') {
      nextIndex = (currentIndex + 1) % PLAYER_TABS.length;
    } else if (event.key === 'ArrowLeft') {
      nextIndex = (currentIndex - 1 + PLAYER_TABS.length) % PLAYER_TABS.length;
    } else if (event.key === 'Home') {
      nextIndex = 0;
    } else if (event.key === 'End') {
      nextIndex = PLAYER_TABS.length - 1;
    } else {
      return;
    }

    event.preventDefault();
    const nextTab = PLAYER_TABS[nextIndex];
    setActiveTab(nextTab.id);
    document.getElementById(`player-tab-${nextTab.id}`)?.focus();
  }

  return (
    <section className="sports-page player-page">
      <div className="player-overview">
        <div className="player-icon">
          {playerImage ? (
            <img src={playerImage} alt={player.fullName} />
          ) : (
            'Player'
          )}
        </div>
        <div className="player-identity">
          <h1>
            {player.fullName}{' '}
            {player.teamName && <em>({player.teamName})</em>}
          </h1>
          <p>{player.primaryPosition ?? 'Position unavailable'}</p>
          <p>
            {handDetails || 'Batting and throwing information unavailable'}
          </p>
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

      <div
        className="player-tabs"
        role="tablist"
        aria-label="Player information"
        onKeyDown={handleTabKeyDown}
      >
        {PLAYER_TABS.map((tab) => (
          <button
            key={tab.id}
            id={`player-tab-${tab.id}`}
            className={activeTab === tab.id ? 'active' : ''}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            aria-controls="player-tab-panel"
            tabIndex={activeTab === tab.id ? 0 : -1}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div
        className="player-tab-panel"
        id="player-tab-panel"
        role="tabpanel"
        aria-labelledby={`player-tab-${activeTab}`}
        tabIndex={0}
      >
        {activeTab === 'stats' && (
          <div className="player-grid">
            <section className="stats-card">
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
                  <span>Wins / losses</span>
                  <span>{seasonStats ? formatRecord(seasonStats) : '—'}</span>
                </div>
                <div role="row">
                  <span>ERA</span>
                  <span>{formatRate(seasonStats?.era ?? null, 2)}</span>
                </div>
                <div role="row">
                  <span>Strikeouts</span>
                  <span>{formatCount(seasonStats?.strikeouts ?? null)}</span>
                </div>
                <div role="row">
                  <span>WHIP</span>
                  <span>{formatRate(seasonStats?.whip ?? null, 2)}</span>
                </div>
              </div>
            </section>

            <aside className="player-side-column">
              <section className="side-card next-game">
                <h2>Next Game</h2>
                {nextGame ? (
                  <Link to={`/game/${nextGame.gamePk}`}>
                    {nextGame.awayTeamName ?? 'Away team'} at{' '}
                    {nextGame.homeTeamName ?? 'Home team'} ·{' '}
                    {formatDate(nextGame.officialDate)}
                  </Link>
                ) : (
                  <p className="empty-state">next game not found</p>
                )}
              </section>

              <section className="side-card">
                <h2>Other Players (teammates)</h2>
                {teammates.length > 0 ? (
                  <div className="side-list">
                    {teammates.map((teammate) => (
                      <Link
                        key={teammate.playerId}
                        to={`/player/${teammate.playerId}`}
                      >
                        {teammate.fullName}
                        {teammate.primaryPosition
                          ? ` · ${teammate.primaryPosition}`
                          : ''}
                      </Link>
                    ))}
                  </div>
                ) : (
                  <p className="empty-state">No teammates found.</p>
                )}
              </section>
            </aside>
          </div>
        )}

        {activeTab === 'splits' && (
          <section className="stats-card">
            <h2>{seasonLabel} Splits</h2>
            {splits.length > 0 ? (
              <div className="table-scroll">
                <table className="player-data-table">
                  <thead>
                    <tr>
                      <th scope="col">Split</th>
                      <th scope="col">G</th>
                      <th scope="col">AVG</th>
                      <th scope="col">HR</th>
                      <th scope="col">RBI</th>
                      <th scope="col">OPS</th>
                      <th scope="col">W-L</th>
                      <th scope="col">ERA</th>
                      <th scope="col">K</th>
                      <th scope="col">WHIP</th>
                    </tr>
                  </thead>
                  <tbody>
                    {splits.map((row) => (
                      <tr key={`${row.split_type}-${row.split_value}`}>
                        <th scope="row">{splitLabel(row)}</th>
                        <td>{formatCount(row.games)}</td>
                        <td>{formatRate(row.batting_average)}</td>
                        <td>{formatCount(row.home_runs)}</td>
                        <td>{formatCount(row.rbi)}</td>
                        <td>{formatRate(row.ops)}</td>
                        <td>{formatRecord(row)}</td>
                        <td>{formatRate(row.era, 2)}</td>
                        <td>{formatCount(row.strikeouts)}</td>
                        <td>{formatRate(row.whip, 2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="empty-state">Splits not found.</p>
            )}
          </section>
        )}

        {activeTab === 'games' && (
          <section className="stats-card">
            <div className="game-log-heading">
              <h2>{seasonLabel} Game Log</h2>
              <label htmlFor="game-log-limit">
                Games shown
                <select
                  id="game-log-limit"
                  value={gameLogLimit}
                  onChange={(event) =>
                    setGameLogLimit(event.target.value as GameLogLimit)
                  }
                >
                  <option value="7">7</option>
                  <option value="30">30</option>
                  <option value="all">Total</option>
                </select>
              </label>
            </div>
            {gameLog.length > 0 ? (
              <div className="table-scroll">
                <table className="player-data-table game-log-table">
                  <thead>
                    <tr>
                      <th scope="col">Date</th>
                      <th scope="col">Opponent</th>
                      <th scope="col">Result</th>
                      <th scope="col">AB</th>
                      <th scope="col">H</th>
                      <th scope="col">HR</th>
                      <th scope="col">RBI</th>
                      <th scope="col">IP</th>
                      <th scope="col">ER</th>
                      <th scope="col">K</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleGameLog.map((row) => (
                      <tr key={row.gamePk}>
                        <th scope="row">{formatDate(row.date)}</th>
                        <td>
                          {row.opponent
                            ? `${row.isHome ? 'vs' : '@'} ${row.opponent}`
                            : '—'}
                        </td>
                        <td>{gameResult(row)}</td>
                        <td>
                          {formatCount(
                            valueAsNumber(row.battingStats, 'atBats'),
                          )}
                        </td>
                        <td>
                          {formatCount(valueAsNumber(row.battingStats, 'hits'))}
                        </td>
                        <td>
                          {formatCount(
                            valueAsNumber(row.battingStats, 'homeRuns'),
                          )}
                        </td>
                        <td>
                          {formatCount(valueAsNumber(row.battingStats, 'rbi'))}
                        </td>
                        <td>
                          {valueAsText(row.pitchingStats, 'inningsPitched') ??
                            '—'}
                        </td>
                        <td>
                          {formatCount(
                            valueAsNumber(row.pitchingStats, 'earnedRuns'),
                          )}
                        </td>
                        <td>
                          {formatCount(
                            valueAsNumber(row.pitchingStats, 'strikeOuts') ??
                              valueAsNumber(row.pitchingStats, 'strikeouts'),
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="empty-state">Game log not found.</p>
            )}
          </section>
        )}

        {activeTab === 'news' && (
          <section className="stats-card">
            <h2>Related News</h2>
            <p className="empty-state">not found</p>
          </section>
        )}

        {activeTab === 'bio' && (
          <section className="stats-card">
            <h2>Bio</h2>
            <p className="empty-state">not found</p>
          </section>
        )}
      </div>
      <p className="sr-only">Player ID: {player.playerId}</p>
    </section>
  );
}
