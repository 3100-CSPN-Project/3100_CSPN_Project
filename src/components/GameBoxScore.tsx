import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  getMlbGameBoxScore,
  type MlbGameBoxScore,
  type MlbGameData,
  type MlbGamePlayerStats,
} from '../lib/mlbGames';
import type { GameComment } from '../lib/gameComments';
import ChatTextBox from './ChatTextBox';

interface GameBoxScoreProps {
  game: MlbGameData;
  gameId: string;
  comments: GameComment[];
  commentsError: string | null;
  onPostComment: (form: FormData) => Promise<void>;
}

const battingColumns = [
  ['AB', 'atBats'],
  ['R', 'runs'],
  ['H', 'hits'],
  ['RBI', 'rbi'],
  ['HR', 'homeRuns'],
  ['BB', 'baseOnBalls'],
  ['K', 'strikeOuts'],
] as const;

const pitchingColumns = [
  ['IP', 'inningsPitched'],
  ['H', 'hits'],
  ['R', 'runs'],
  ['ER', 'earnedRuns'],
  ['BB', 'baseOnBalls'],
  ['K', 'strikeOuts'],
] as const;

function statText(
  stats: Record<string, number | string | null>,
  key: string,
): string {
  const value = stats[key];
  return value === null || value === undefined || value === '' ? '-' : `${value}`;
}

function battingPlayers(players: MlbGamePlayerStats[]) {
  return players
    .filter((player) => Object.keys(player.batting_stats).length > 0)
    .sort((first, second) =>
      (first.batting_order ?? '').localeCompare(second.batting_order ?? ''),
    );
}

function pitchingPlayers(players: MlbGamePlayerStats[]) {
  return players.filter(
    (player) => Object.keys(player.pitching_stats).length > 0,
  );
}

function formatDate(date: string): string {
  const parsedDate = new Date(`${date}T12:00:00`);
  return Number.isNaN(parsedDate.getTime())
    ? date
    : parsedDate.toLocaleDateString(undefined, {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      });
}

// Trace Macias requested batter and pitcher names link to cumulative player pages.
function PlayerBattingTable({ players }: { players: MlbGamePlayerStats[] }) {
  const rows = battingPlayers(players);

  return (
    <div className="game-detail-table-wrap">
      {rows.length === 0 ? (
        <p className="game-detail-empty">No batting box score available.</p>
      ) : (
        <table className="game-detail-table">
          <thead>
            <tr>
              <th scope="col">Batter</th>
              <th scope="col">Pos</th>
              {battingColumns.map(([label]) => (
                <th scope="col" key={label}>
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((player) => (
              <tr key={player.player_id}>
                <th scope="row">
                  <Link
                    className="game-detail-player-link"
                    to={`/player/${player.player_id}`}
                  >
                    {player.player.full_name}
                  </Link>
                </th>
                <td>{player.position_abbreviation ?? '-'}</td>
                {battingColumns.map(([label, key]) => (
                  <td key={label}>{statText(player.batting_stats, key)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function PlayerPitchingTable({ players }: { players: MlbGamePlayerStats[] }) {
  const rows = pitchingPlayers(players);

  return (
    <div className="game-detail-table-wrap">
      {rows.length === 0 ? (
        <p className="game-detail-empty">No pitching box score available.</p>
      ) : (
        <table className="game-detail-table">
          <thead>
            <tr>
              <th scope="col">Pitcher</th>
              {pitchingColumns.map(([label]) => (
                <th scope="col" key={label}>
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((player) => (
              <tr key={player.player_id}>
                <th scope="row">
                  <Link
                    className="game-detail-player-link"
                    to={`/player/${player.player_id}`}
                  >
                    {player.player.full_name}
                  </Link>
                </th>
                {pitchingColumns.map(([label, key]) => (
                  <td key={label}>{statText(player.pitching_stats, key)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default function GameBoxScore({
  game,
  gameId,
  comments,
  commentsError,
  onPostComment,
}: GameBoxScoreProps) {
  const [boxScore, setBoxScore] = useState<MlbGameBoxScore | null>(null);
  const [boxScoreError, setBoxScoreError] = useState<string | null>(null);

  // trace: Reset and guard the async stats request when navigating between game routes.
  useEffect(() => {
    let active = true;
    setBoxScore(null);
    setBoxScoreError(null);

    getMlbGameBoxScore(gameId)
      .then((data) => {
        if (active) setBoxScore(data);
      })
      .catch((error: unknown) => {
        if (!active) return;
        setBoxScoreError(
          error instanceof Error ? error.message : 'Unable to load box score.',
        );
      });

    return () => {
      active = false;
    };
  }, [gameId]);

  const awayPlayers =
    boxScore?.players.filter((player) => player.side === 'away') ?? [];
  const homePlayers =
    boxScore?.players.filter((player) => player.side === 'home') ?? [];
  const innings = game.linescore.innings ?? [];
  const isScheduled = game.status_abstract === 'Preview';
  const hasBoxScore =
    boxScore !== null &&
    (boxScore.players.length > 0 || boxScore.teams.length > 0);
  const statusText =
    game.status_abstract === 'In Progress'
      ? [
          game.linescore.inningState,
          game.linescore.currentInningOrdinal,
        ]
          .filter(Boolean)
          .join(' ') || game.status_abstract
      : game.status_abstract;

  return (
    <div className="game-detail">
      <section className="game-detail-scoreboard" aria-label="Game result">
        <div className="game-detail-kicker">
          {/* Trace Macias requested hiding the internal game ID from the scoreboard. */}
          <span>{statusText}</span>
        </div>
        <div className="game-detail-matchup">
          {/* Trace Macias requested team marks link to their cumulative team pages. */}
          <Link
            className="game-detail-team"
            to={`/team/${game.away_team_id}`}
            aria-label={`${game.away_team.team_name} team page`}
          >
            <img
              src={`/src/assets/${game.away_team.team_name}.png`}
              alt=""
              width="88"
              height="88"
            />
            <span>{game.away_team.team_name}</span>
            <small>Away</small>
          </Link>
          <div className="game-detail-score">
            {isScheduled ? (
              <span className="game-detail-upcoming">VS</span>
            ) : (
              <>
                <span>{game.away_score}</span>
                <span className="game-detail-score-divider">-</span>
                <span>{game.home_score}</span>
              </>
            )}
          </div>
          <Link
            className="game-detail-team"
            to={`/team/${game.home_team_id}`}
            aria-label={`${game.home_team.team_name} team page`}
          >
            <img
              src={`/src/assets/${game.home_team.team_name}.png`}
              alt=""
              width="88"
              height="88"
            />
            <span>{game.home_team.team_name}</span>
            <small>Home</small>
          </Link>
        </div>
        <div className="game-detail-meta">
          <span>{formatDate(game.official_date)}</span>
          {game.venue_name && <span>{game.venue_name}</span>}
        </div>
      </section>

      <section className="game-detail-panel" aria-labelledby="line-score-title">
        <div className="game-detail-panel-heading">
          <div>
            <span className="game-detail-overline">THE GAME</span>
            <h2 id="line-score-title">Line score</h2>
          </div>
        </div>
        {innings.length > 0 ? (
          <div className="game-detail-table-wrap">
            <table className="game-detail-table game-detail-linescore">
              <thead>
                <tr>
                  <th scope="col">Team</th>
                  {innings.map((inning, index) => (
                    <th scope="col" key={inning.num ?? index}>
                      {inning.num ?? index + 1}
                    </th>
                  ))}
                  <th scope="col">R</th>
                  <th scope="col">H</th>
                  <th scope="col">E</th>
                </tr>
              </thead>
              <tbody>
                {[
                  {
                    side: 'away' as const,
                    name: game.away_team.team_name,
                  },
                  {
                    side: 'home' as const,
                    name: game.home_team.team_name,
                  },
                ].map(({ side, name }) => {
                  const totals = game.linescore.teams?.[side];

                  return (
                    <tr key={side}>
                      <th scope="row">{name}</th>
                      {innings.map((inning, index) => (
                        <td key={inning.num ?? index}>
                          {inning[side]?.runs ?? '-'}
                        </td>
                      ))}
                      <td className="game-detail-total">
                        {totals?.runs ?? game[`${side}_score`]}
                      </td>
                      <td>{totals?.hits ?? '-'}</td>
                      <td>{totals?.errors ?? '-'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="game-detail-empty">
            {isScheduled
              ? 'The game has not started yet.'
              : 'Inning-by-inning scoring is not available for this game.'}
          </p>
        )}
      </section>

      {boxScoreError ? (
        <p className="game-detail-error" role="alert">
          {boxScoreError}
        </p>
      ) : !boxScore ? (
        <p className="game-detail-loading">Loading player box score…</p>
      ) : !hasBoxScore ? (
        <section className="game-detail-panel">
          <p className="game-detail-empty">
            {game.is_final
              ? 'No player box score is available for this game.'
              : 'Player box scores will appear after the game is final.'}
          </p>
        </section>
      ) : (
        <>
          <section className="game-detail-panel">
            <div className="game-detail-panel-heading">
              <div>
                <span className="game-detail-overline">BATTERS</span>
                <h2>Batting box score</h2>
              </div>
            </div>
            <h3 className="game-detail-team-heading">
              {game.away_team.team_name}
            </h3>
            <PlayerBattingTable players={awayPlayers} />
            <h3 className="game-detail-team-heading">
              {game.home_team.team_name}
            </h3>
            <PlayerBattingTable players={homePlayers} />
          </section>

          <section className="game-detail-panel">
            <div className="game-detail-panel-heading">
              <div>
                <span className="game-detail-overline">PITCHERS</span>
                <h2>Pitching lines</h2>
              </div>
            </div>
            <div className="game-detail-pitching-grid">
              <div>
                <h3 className="game-detail-team-heading">
                  {game.away_team.team_name}
                </h3>
                <PlayerPitchingTable players={awayPlayers} />
              </div>
              <div>
                <h3 className="game-detail-team-heading">
                  {game.home_team.team_name}
                </h3>
                <PlayerPitchingTable players={homePlayers} />
              </div>
            </div>
          </section>
        </>
      )}

      <section className="game-detail-panel game-detail-chat">
        <div className="game-detail-panel-heading">
          <div>
            <span className="game-detail-overline">FAN DISCUSSION</span>
            <h2>Live chat</h2>
          </div>
        </div>
        {commentsError && (
          <p className="game-detail-error" role="alert">
            Unable to load game comments: {commentsError}
          </p>
        )}
        {comments.length === 0 ? (
          <p className="game-detail-empty">No comments yet.</p>
        ) : (
          comments.map((comment) => (
            <ChatTextBox
              key={comment.comment_id}
              author={comment.author}
              body={comment.body}
            />
          ))
        )}
        <form className="game-detail-chat-form" action={onPostComment}>
          <input
            name="author"
            placeholder="Your name"
            maxLength={40}
            required
          />
          <input
            name="body"
            placeholder="Add to the discussion"
            maxLength={500}
            required
          />
          <button type="submit">Post</button>
        </form>
      </section>
    </div>
  );
}
