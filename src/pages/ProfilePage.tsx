import { useState } from 'react';
import SettingsOverlay from '../components/SettingsOverlay';

const teams = ['SF Giants', '', ''];
const players = ['John Player', '', ''];

export default function ProfilePage() {
  // kept here so the name under the avatar updates when settings saves
  const [username, setUsername] = useState('drmelgoza');
  const [showSettings, setShowSettings] = useState(false);

  return (
    <section className="profile-page">
      <div className="profile-shell">
        <header className="profile-header">Profile Page</header>

        <div className="profile-inner-shell">
          {/* trace: Site navigation now comes from Layout's shared header. */}
          <div className="profile-content">
            <aside className="profile-sidebar">
              <div className="profile-avatar" aria-label="Profile avatar" />
              <div className="profile-name">{username}</div>
              <button
                type="button"
                className="profile-action"
                onClick={() => setShowSettings(true)}
              >
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

      {showSettings && (
        <SettingsOverlay
          username={username}
          onClose={() => setShowSettings(false)}
          onSave={(nextUsername) => {
            setUsername(nextUsername);
            setShowSettings(false);
          }}
        />
      )}
    </section>
  );
}
