/** One league heading + a row of three empty game cards. */
function GameRow({ league }: { league: string }) {
  return (
    <section className="league-row">
      <h2>{league}</h2>
      <div className="game-grid">
        <div className="game-card" />
        <div className="game-card" />
        <div className="game-card" />
      </div>
    </section>
  );
}
export default function HomePage() {
  return (
    <div className="home-page">
      <h1>Upcoming Games</h1>
      <GameRow league="NFL" />
      <GameRow league="MLB" />
      <GameRow league="NBA" />
    </div>
  );
}
