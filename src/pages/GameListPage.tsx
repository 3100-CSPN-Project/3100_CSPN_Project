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
      <Link to="/game/849815">Example: Rays vs Guardians </Link>
      <Link to="/game/849805">Example: Brewers v. Rays </Link>
      <Link to="/game/823953">Example: Dodgers v. Giants </Link>
    </section>
  );
}
