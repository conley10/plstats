import {
  Route,
  Routes,
} from "react-router-dom";

import SiteLayout from "./components/layout/SiteLayout";

import HomePage from "./pages/HomePage";

import PlayersPage from "./pages/PlayersPage";

import PlayerDetailPage from "./pages/PlayerDetailPage";

import PlayerScoutPage from "./pages/PlayerScoutPage";

import ComparePlayersPage from "./pages/ComparePlayersPage";

import PlayerRankingsPage from "./pages/PlayerRankingsPage";

import TeamsPage from "./pages/TeamsPage.jsx";

import TeamDetailPage from "./pages/TeamDetailPage";

import TeamScoutPage from "./pages/TeamScoutPage";

import TeamStatsPage from "./pages/TeamStatsPage";

import CompareTeamsPage from "./pages/CompareTeamsPage";

import FixturesPage from "./pages/FixturesPage";

import MatchDetailPage from "./pages/MatchDetailPage";

import LeagueTablePage from "./pages/LeagueTablePage";

import FantasyPage from "./pages/FantasyPage";

import FantasyPredictorPage from "./pages/FantasyPredictorPage";

import FantasyMyTeamPage from "./pages/FantasyMyTeamPage";

import NotFoundPage from "./pages/NotFoundPage";

import FantasyTransfersPage from "./pages/FantasyTransfersPage";

function PlaceholderPage({
  title,
}) {
  return (
    <main className="page-container">
      <div className="panel p-8">
        <span className="section-label">
          PLStats Fantasy
        </span>

        <h1 className="page-heading mt-2">
          {title}
        </h1>

        <p className="mt-4 text-muted">
          This section will be built in the next upgrade.
        </p>
      </div>
    </main>
  );
}

function App() {
  return (
    <Routes>
      <Route element={<SiteLayout />}>
        <Route
          path="/"
          element={<HomePage />}
        />

        <Route
          path="/players"
          element={<PlayersPage />}
        />

        <Route
          path="/players/compare"
          element={<ComparePlayersPage />}
        />

        <Route
          path="/players/:playerId/scout"
          element={<PlayerScoutPage />}
        />

        <Route
          path="/players/rankings"
          element={<PlayerRankingsPage />}
        />

        <Route
          path="/players/:playerId"
          element={<PlayerDetailPage />}
        />

        <Route
          path="/teams"
          element={<TeamsPage />}
        />

        <Route
          path="/teams/stats"
          element={<TeamStatsPage />}
        />

        <Route
          path="/teams/compare"
          element={<CompareTeamsPage />}
        />

        <Route
          path="/teams/:teamId/scout"
          element={<TeamScoutPage />}
        />

        <Route
          path="/teams/:teamId"
          element={<TeamDetailPage />}
        />

        <Route
          path="/fixtures"
          element={<FixturesPage />}
        />

        <Route
          path="/fixtures/:fixtureId"
          element={<MatchDetailPage />}
        />

        <Route
          path="/table"
          element={<LeagueTablePage />}
        />

        <Route
          path="/fantasy"
          element={<FantasyPage />}
        />

        <Route
          path="/fantasy/predictor"
          element={<FantasyPredictorPage />}
        />

        <Route
          path="/fantasy/my-team"
          element={<FantasyMyTeamPage />}
        />

        <Route
  path="/fantasy/transfers"
  element={<FantasyTransfersPage />}
/>

        <Route
          path="*"
          element={<NotFoundPage />}
        />
      </Route>
    </Routes>
  );
}

export default App;