import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  getMlbTeamPageData,
  type MlbTeamPageData,
  type MlbTeamPlayer,
} from '../lib/mlbTeams.js';
import { transformedImageUrl } from '../lib/mlbImages.js';

type LeaderMetric = {
  label: string;
  getValue: (player: MlbTeamPlayer) => number | null;
  format: (value: number) => string;
  lowerIsBetter?: boolean;
  qualifies?: (player: MlbTeamPlayer) => boolean;
};

const BATTING_METRICS: LeaderMetric[] = [
  {
    label: 'Batting average',
    getValue: (player) => player.stats.batting_average,
    format: formatAverage,
    qualifies: (player) => (player.stats.at_bats ?? 0) > 0,
  },
  {
    label: 'Home runs',
    getValue: (player) => player.stats.home_runs,
    format: formatCount,
  },
  {
    label: 'RBI',
    getValue: (player) => player.stats.rbi,
    format: formatCount,
  },
  {
    label: 'OPS',
    getValue: (player) => player.stats.ops,
    format: formatAverage,
    qualifies: (player) => (player.stats.at_bats ?? 0) > 0,
  },
];

const PITCHING_METRICS: LeaderMetric[] = [
  {
    label: 'Wins',
    getValue: (player) => player.stats.wins,
    format: formatCount,
  },
  {
    label: 'ERA',
    getValue: (player) => player.stats.era,
    format: (value) => value.toFixed(2),
    lowerIsBetter: true,
    qualifies: (player) =>
      player.stats.innings_pitched !== null &&
      player.stats.innings_pitched !== '0.0',
  },
  {
    label: 'Strikeouts',
    getValue: (player) => player.stats.strikeouts,
    format: formatCount,
  },
  {
    label: 'Saves',
    getValue: (player) => player.stats.saves,
    format: formatCount,
  },
];

function formatAverage(value: number): string {
  return value.toFixed(3).replace(/^0\./, '.');
}

function formatCount(value: number): string {
  return String(value);
}

function formatDate(value: string): string {
  return new Date(`${value.slice(0, 10)}T12:00:00Z`).toLocaleDateString(
    'en-US',
    { month: 'short', day: 'numeric', timeZone: 'UTC' },
  );
}

function recordLabel(data: MlbTeamPageData): string {
  return `${data.wins}-${data.losses}${data.ties > 0 ? `-${data.ties}` : ''}`;
}

function getLeader(
  players: MlbTeamPlayer[],
  metric: LeaderMetric,
): { player: MlbTeamPlayer; value: number } | null {
  const eligiblePlayers = players
    .map((player) => ({ player, value: metric.getValue(player) }))
    .filter(
      (row): row is { player: MlbTeamPlayer; value: number } =>
        row.value !== null && (metric.qualifies?.(row.player) ?? true),
    );

  eligiblePlayers.sort((first, second) => {
    const difference = metric.lowerIsBetter
      ? first.value - second.value
      : second.value - first.value;
    return difference || first.player.fullName.localeCompare(second.player.fullName);
  });

  return eligiblePlayers[0] ?? null;
}

function LeaderGroup({
  title,
  metrics,
  players,
}: {
  title: string;
  metrics: LeaderMetric[];
  players: MlbTeamPlayer[];
}) {
  return (
    <section className="team-panel team-leader-panel" aria-label={`${title} leaders`}>
      <h2>{title} leaders</h2>
      <div className="team-leader-grid">
        {metrics.map((metric) => {
          const leader = getLeader(players, metric);

          return (
            <div className="team-leader-card" key={metric.label}>
              <span className="team-leader-label">{metric.label}</span>
              {leader ? (
                <>
                  <strong>{metric.format(leader.value)}</strong>
                  <Link to={`/player/${leader.player.playerId}`}>
                    {leader.player.fullName}
                  </Link>
                </>
              ) : (
                <span className="team-leader-empty">No stats</span>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function DepthChart({
  title,
  players,
}: {
  title: string;
  players: MlbTeamPlayer[];
}) {
  return (
    <section className="team-panel team-depth-panel">
      <h2>{title}</h2>
      {players.length > 0 ? (
        <ul className="team-depth-list">
          {players.map((player) => (
            <li key={player.playerId}>
              <span className="team-depth-position">{player.position}</span>
              <Link to={`/player/${player.playerId}`}>{player.fullName}</Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="team-empty-state">No players found for this season.</p>
      )}
    </section>
  );
}

export default function TeamPage() {
  const { teamId: teamIdParam } = useParams();
  const teamId = Number(teamIdParam);
  const hasValidTeamId =
    teamIdParam !== undefined && Number.isSafeInteger(teamId) && teamId > 0;
  const [teamData, setTeamData] = useState<MlbTeamPageData | null | undefined>(
    undefined,
  );
  const [error, setError] = useState<string>();

  useEffect(() => {
    if (!hasValidTeamId) return undefined;

    let active = true;
    setTeamData(undefined);
    setError(undefined);

    getMlbTeamPageData(teamId)
      .then((data) => {
        if (active) setTeamData(data);
      })
      .catch((cause: unknown) => {
        if (active) {
          setError(cause instanceof Error ? cause.message : String(cause));
        }
      });

    return () => {
      active = false;
    };
  }, [hasValidTeamId, teamId]);

  if (!hasValidTeamId) return <p role="alert">Invalid team ID.</p>;
  if (error !== undefined) return <p role="alert">{error}</p>;
  if (teamData === undefined) return <p>Loading team...</p>;
  if (teamData === null) return <p>Team not found.</p>;

  const logoUrl = transformedImageUrl(teamData.team.logoUrl, 256);

  return (
    <section className="sports-page team-page">
      <div className="team-page-content">
        <header className="team-summary">
          <div className="team-identity">
            {logoUrl ? (
              <img className="team-logo" src={logoUrl} alt="" />
            ) : (
              <span className="team-logo-fallback" aria-hidden="true">
                {teamData.team.abbreviation ?? 'MLB'}
              </span>
            )}
            <div>
              <p className="team-season-label">{teamData.season} season</p>
              <h1>{teamData.team.name}</h1>
              <span className="team-record-caption">Regular season record</span>
            </div>
          </div>
          <div className="team-record-summary" aria-label="Season record and standing">
            <div>
              <span>Record</span>
              <strong>{recordLabel(teamData)}</strong>
            </div>
            <div>
              <span>Final standing</span>
              <strong>{teamData.standing}</strong>
            </div>
          </div>
        </header>

        <div className="team-columns">
          <div className="team-depth-column">
            <div className="team-section-heading">
              <div>
                <p>Roster</p>
                <h2>Depth chart</h2>
              </div>
              <span>{teamData.positionPlayers.length + teamData.pitchers.length} players</span>
            </div>
            <DepthChart title="Position players" players={teamData.positionPlayers} />
            <DepthChart title="Pitchers" players={teamData.pitchers} />
          </div>

          <aside className="team-side-column">
            <div className="team-section-heading">
              <div>
                <p>{teamData.season} regular season</p>
                <h2>Team leaders</h2>
              </div>
            </div>
            <LeaderGroup
              title="Batting"
              metrics={BATTING_METRICS}
              players={teamData.positionPlayers}
            />
            <LeaderGroup
              title="Pitching"
              metrics={PITCHING_METRICS}
              players={teamData.pitchers}
            />

            <section className="team-panel team-recent-panel">
              <div className="team-panel-heading">
                <h2>Last 4 games</h2>
                <span>Latest results</span>
              </div>
              {teamData.recentGames.length > 0 ? (
                <ul className="team-recent-list">
                  {teamData.recentGames.map((game) => (
                    <li key={game.gamePk}>
                      <Link to={`/game/${game.gamePk}`} className="team-recent-game">
                        <span className={`team-result team-result-${game.result.toLowerCase()}`}>
                          {game.result}
                        </span>
                        <span className="team-game-opponent">
                          <strong>{game.isHome ? 'vs.' : '@'} {game.opponent}</strong>
                          <small>{formatDate(game.date)}</small>
                        </span>
                        <strong className="team-game-score">
                          {game.teamScore}–{game.opponentScore}
                        </strong>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="team-empty-state">No completed games found.</p>
              )}
            </section>
          </aside>
        </div>
      </div>
    </section>
  );
}
