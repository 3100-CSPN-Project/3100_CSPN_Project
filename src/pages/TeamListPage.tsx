import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  getMlbTeamLogos,
  transformedImageUrl,
  type MlbTeamLogo,
} from '../lib/mlbImages.js';
import {
  getMlbTeamSeasonRecords,
  type MlbTeamRecord,
} from '../lib/mlbTeams.js';

const TEAM_LEAGUES = [
  {
    leagueId: 103,
    label: 'American League (AL)',
    divisions: [
      { divisionId: 200, label: 'West' },
      { divisionId: 202, label: 'Central' },
      { divisionId: 201, label: 'East' },
    ],
  },
  {
    leagueId: 104,
    label: 'National League (NL)',
    divisions: [
      { divisionId: 203, label: 'West' },
      { divisionId: 205, label: 'Central' },
      { divisionId: 204, label: 'East' },
    ],
  },
] as const;

function TeamCards({ teams }: { teams: MlbTeamLogo[] }) {
  return (
    <ul className="team-directory">
      {teams.map((team) => (
        <li key={team.teamId}>
          <Link to={`/team/${team.teamId}`}>
            {team.logoUrl !== null && (
              <img
                src={transformedImageUrl(team.logoUrl, 128)}
                alt=""
                width={64}
                height={64}
                loading="lazy"
              />
            )}
            {team.name}
          </Link>
        </li>
      ))}
    </ul>
  );
}

export default function TeamListPage() {
  const [teams, setTeams] = useState<MlbTeamLogo[] | undefined>(undefined);
  const [records, setRecords] = useState<Map<number, MlbTeamRecord>>(new Map());
  const [error, setError] = useState<string | undefined>(undefined);

  useEffect(() => {
    let active = true;

    Promise.all([getMlbTeamLogos(), getMlbTeamSeasonRecords()])
      .then(([rows, standings]) => {
        if (active) {
          setTeams(rows);
          setRecords(standings.records);
        }
      })
      .catch((cause: unknown) => {
        if (active) {
          setError(cause instanceof Error ? cause.message : String(cause));
        }
      });

    return () => {
      active = false;
    };
  }, []);

  return (
    <section>
      <h1>Teams</h1>

      {error !== undefined && <p role="alert">{error}</p>}
      {error === undefined && teams === undefined && <p>Loading teams...</p>}
      {teams?.length === 0 && <p>No teams have been imported yet.</p>}

      {teams !== undefined && teams.length > 0 && (
        <div className="team-divisions">
          {TEAM_LEAGUES.map((league) => (
            <section className="team-league" key={league.leagueId}>
              <h2>{league.label}</h2>
              <div className="team-division-grid">
                {league.divisions.map((division) => {
                  const divisionTeams = teams
                    .filter(
                      (team) =>
                        team.leagueId === league.leagueId &&
                        team.divisionId === division.divisionId,
                    )
                    .sort((first, second) => {
                      const firstRecord = records.get(first.teamId);
                      const secondRecord = records.get(second.teamId);
                      const firstGames =
                        (firstRecord?.wins ?? 0) + (firstRecord?.losses ?? 0);
                      const secondGames =
                        (secondRecord?.wins ?? 0) + (secondRecord?.losses ?? 0);
                      const firstPercentage = firstGames
                        ? (firstRecord?.wins ?? 0) / firstGames
                        : 0;
                      const secondPercentage = secondGames
                        ? (secondRecord?.wins ?? 0) / secondGames
                        : 0;

                      return (
                        secondPercentage - firstPercentage ||
                        (secondRecord?.wins ?? 0) - (firstRecord?.wins ?? 0) ||
                        (firstRecord?.losses ?? 0) - (secondRecord?.losses ?? 0) ||
                        first.name.localeCompare(second.name)
                      );
                    });

                  return (
                    <section className="team-division" key={division.divisionId}>
                      <h3>{division.label}</h3>
                      {divisionTeams.length > 0 ? (
                        <TeamCards teams={divisionTeams} />
                      ) : (
                        <p>No teams listed.</p>
                      )}
                    </section>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </section>
  );
}
