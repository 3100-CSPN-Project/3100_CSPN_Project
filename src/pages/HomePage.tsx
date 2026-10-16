/** One league heading + a row of three empty game cards. */
function GameRow({ gameType }: { gameType: string }) {
  return (
    <section className="league-row">
      <h2>{gameType} Games</h2>
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
      <h1>MLB Games</h1>
      <GameRow gameType="Live" />
      <GameRow gameType="Upcoming" />
      <GameRow gameType="Previous" />
    </div>
  );
}
