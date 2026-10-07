import { Route, Routes } from 'react-router-dom';

import Layout from './components/Layout';
import GameListPage from './pages/GameListPage';
import GamePage from './pages/GamePage';
import HomePage from './pages/HomePage';
import NotFoundPage from './pages/NotFoundPage';
import PlayerListPage from './pages/PlayerListPage';
import PlayerPage from './pages/PlayerPage';
import ProfilePage from './pages/ProfilePage';
import TeamListPage from './pages/TeamListPage';
import TeamPage from './pages/TeamPage';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<HomePage />} />

        <Route path="player">
          <Route index element={<PlayerListPage />} />
          <Route path=":playerId" element={<PlayerPage />} />
        </Route>

        <Route path="team">
          <Route index element={<TeamListPage />} />
          <Route path=":teamId" element={<TeamPage />} />
        </Route>

        <Route path="game">
          <Route index element={<GameListPage />} />
          <Route path=":gameId" element={<GamePage />} />
        </Route>

        <Route path="profile" element={<ProfilePage />} />

        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
