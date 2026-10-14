import { Link, useParams } from 'react-router-dom';
import logo from '../assets/logo.svg';

export default function TeamPage() {
  const { teamId } = useParams();

  return (
    <section className="sports-page">
      <header className="sports-header">
        <Link className="cspn-logo" to="/">
          <img src={logo} alt="ESPN" />
        </Link>
        <nav className="league-links" aria-label="League navigation">
          <a href="#mlb">MLB</a>
          <a href="#nfl">NFL</a>
          <a href="#nba">NBA</a>
        </nav>
        <Link className="user-settings" to="/profile">
          User profile/
          <br />
          settings
        </Link>
      </header>

      <div className="team-page-content">
        <div className="team-summary">
          <div className="team-logo-placeholder">
            T1
            <br />
            Logo
          </div>
          <div className="season-stats">
            Season Stats
            <br />
            <span>(ex. 3-0-1, 1st in League)</span>
          </div>
        </div>

        <div className="team-columns">
          <div className="recent-games">
            <h1>Recent games</h1>
            <div className="games-panel">
              <Link to="/game/1" className="game-row">
                Example game (Click here)
              </Link>
              <div className="game-row">Game 2</div>
              <div className="game-row">Game 3</div>
            </div>
          </div>
          <aside className="team-players">
            <h2>Players</h2>
            <div className="team-player-list">
              <Link to="/player/1">John Player</Link>
              <span aria-hidden="true" />
              <span aria-hidden="true" />
            </div>
          </aside>
        </div>
      </div>
      <p className="sr-only">Team ID: {teamId}</p>
    </section>
  );
}
