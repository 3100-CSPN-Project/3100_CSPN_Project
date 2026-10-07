import { Link } from 'react-router-dom';

export default function GameListPage() {
  return (
    <section>
      <h1>Games</h1>
      <p>Schedule and scores go here.</p>
      <ul>
        <li>
          <Link to="/game/1">Example game</Link>
        </li>
      </ul>
    </section>
  );
}
