const teams = ['SF Giants', '', ''];
const players = ['John Player', '', ''];

export default function ProfilePage() {
  return (
    <section className="profile-page">
      <div className="profile-shell">
        <header className="profile-header">Profile Page</header>

        <div className="profile-inner-shell">
          <nav className="profile-quick-nav" aria-label="League navigation">
            <div className="profile-brand">CSPN</div>
            <div className="profile-leagues">
              <span>MLB</span>
              <span>NBA</span>
              <span>NFL</span>
            </div>
          </nav>

          <div className="profile-content">
            <aside className="profile-sidebar">
              <div className="profile-avatar" aria-label="Profile avatar" />
              <div className="profile-name">drmelgoza</div>
              <button type="button" className="profile-action">
                settings
              </button>
              <button type="button" className="profile-action">
                log out
              </button>
            </aside>

            <div className="profile-panels">
              <div className="profile-panel">
                <div className="profile-panel-header">My Teams</div>
                <div className="profile-list">
                  {teams.map((team, index) => (
                    <div
                      key={`${team || 'team'}-${index}`}
                      className="profile-list-item"
                    >
                      {team || '\u00A0'}
                    </div>
                  ))}
                </div>
              </div>

              <div className="profile-panel">
                <div className="profile-panel-header">My Players</div>
                <div className="profile-list">
                  {players.map((player, index) => (
                    <div
                      key={`${player || 'player'}-${index}`}
                      className="profile-list-item"
                    >
                      {player || '\u00A0'}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
