import { Link } from 'react-router-dom';

export default function PlayerListPage() {
  return (
    <section>
      <h1>Players</h1>
      <p>Player directory goes here.</p>
      <ul>
        <li>
          <Link to="/player/1">Example player</Link>
        </li>
      </ul>
    </section>
  );
}
