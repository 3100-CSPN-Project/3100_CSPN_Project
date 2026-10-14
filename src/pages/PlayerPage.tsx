import { Link, useParams } from 'react-router-dom';
import logo from '../assets/logo.svg';

export default function PlayerPage() {
  const { playerId } = useParams();

  return (
    <section className="sports-page player-page">
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

      <div className="player-overview">
        <div className="player-icon">
          Player
          <br />
          Icon
        </div>
        <div className="player-identity">
          <h1>Player Name</h1>
          <p>Team · # · Position</p>
          <p>HT/WT · Age · Bats/Throws</p>
          <button type="button">Follow</button>
        </div>
        <div className="headline-stats">
          <span>
            <strong>AVG</strong>
            <b>.298</b>
          </span>
          <span>
            <strong>HR</strong>
            <b>24</b>
          </span>
          <span>
            <strong>RBI</strong>
            <b>82</b>
          </span>
          <span>
            <strong>OPS</strong>
            <b>.874</b>
          </span>
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
            <h2>Performance Stats (season table)</h2>
            <div
              className="stats-table"
              role="table"
              aria-label="Season performance statistics"
            >
              <div role="row" className="table-heading">
                <span>STAT</span>
                <span>2026</span>
                <span>CAREER</span>
              </div>
              <div role="row">
                <span>Games</span>
                <span>142</span>
                <span>715</span>
              </div>
              <div role="row">
                <span>Batting average</span>
                <span>.298</span>
                <span>.281</span>
              </div>
              <div role="row">
                <span>Home runs</span>
                <span>24</span>
                <span>118</span>
              </div>
              <div role="row">
                <span>Runs batted in</span>
                <span>82</span>
                <span>401</span>
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
      <p className="sr-only">Player ID: {playerId}</p>
    </section>
  );
}
