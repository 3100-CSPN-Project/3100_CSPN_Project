import { useParams } from 'react-router-dom';

export default function GamePage() {
  const { gameId } = useParams();

  return (
    <section>
      <h1>Game</h1>
      <p>Game ID: {gameId}</p>
      <p>Box score and play-by-play go here.</p>
    </section>
  );
}
