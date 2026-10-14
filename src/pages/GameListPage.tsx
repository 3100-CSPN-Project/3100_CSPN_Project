import { Link } from 'react-router-dom';

export default function GameListPage() {
  return (
    <section>
      <h1>Games</h1>
      <p>A page to showcase the following.</p>
      <ul>
        <li>Team logos and names</li>
        <li>Current score, time and game info</li>
        <li>Recent plays</li>
        <li>An interactive chat column</li>
      </ul>
      <Link to="/game/1">Example: Dodgers vs. Giants</Link>
    </section>
  );
}
