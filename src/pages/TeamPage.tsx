import { useParams } from 'react-router-dom';

export default function TeamPage() {
  const { teamId } = useParams();

  return (
    <section>
      <h1>Team</h1>
      <p>Team ID: {teamId}</p>
      <p>Team roster and record go here.</p>
    </section>
  );
}
