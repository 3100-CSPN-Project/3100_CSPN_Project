import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  getMlbTeamLogos,
  transformedImageUrl,
  type MlbTeamLogo,
} from '../lib/mlbImages.js';

export default function TeamListPage() {
  const [teams, setTeams] = useState<MlbTeamLogo[] | undefined>(undefined);
  const [error, setError] = useState<string | undefined>(undefined);

  useEffect(() => {
    let active = true;

    getMlbTeamLogos()
      .then((rows) => {
        if (active) setTeams(rows);
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

      <ul className="team-directory">
        {teams?.map((team) => (
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
    </section>
  );
}
