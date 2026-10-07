import { useParams } from 'react-router-dom';

export default function PlayerPage() {
  const { playerId } = useParams();

  return (
    <section>
      <h1>Player</h1>
      <p>Player ID: {playerId}</p>
      <p>Player stats and bio go here.</p>
    </section>
  );
}
