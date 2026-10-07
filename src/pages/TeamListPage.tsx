import { Link } from 'react-router-dom';

export default function TeamListPage() {
  return (
    <section>
      <h1>Teams</h1>
      <p>Team directory goes here.</p>
      <ul>
        <li>
          <Link to="/team/1">Example team</Link>
        </li>
      </ul>
    </section>
  );
}
