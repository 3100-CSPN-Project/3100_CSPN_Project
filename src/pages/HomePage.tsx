/** One league heading + a row of three empty game cards. */
import { getSupabaseClient } from '../lib/supabase';
import { SupabaseClient } from '@supabase/supabase-js';
import { PostgrestError, QueryData } from '@supabase/supabase-js';
import React, { useEffect, useState } from 'react';
import GameCard from '../components/GameCard';
import { Link } from 'react-router-dom';
import { WritableStreamDefaultWriter } from 'node:stream/web';

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

//TODO: Order by date.
export default function HomePage() {
  const client: SupabaseClient = getSupabaseClient();
  const upcomingGamesQuery = client
    .from('mlb_games')
    .select(
      'game_pk, status_abstract, official_date, home_team:mlb_teams!home_team_id(team_name), away_team:mlb_teams!away_team_id(team_name)',
    )
    .eq('status_abstract', 'Preview')
    .limit(3)
    .overrideTypes<
      Array<{
        home_team: { team_name: string };
        away_team: { team_name: string };
      }>
    >();

  const pastGamesQuery = client
    .from('mlb_games')
    .select(
      'game_pk, status_abstract, official_date, home_team:mlb_teams!home_team_id(team_name), home_score, away_team:mlb_teams!away_team_id(team_name), away_score',
    )
    .eq('status_abstract', 'Final')
    .limit(3)
    .overrideTypes<
      Array<{
        home_team: { team_name: string };
        away_team: { team_name: string };
      }>
    >();

  const liveGamesQuery = client
    .from('mlb_games')
    .select(
      'game_pk, status_abstract, official_date, home_team:mlb_teams!home_team_id(team_name), home_score, away_team:mlb_teams!away_team_id(team_name), away_score, linescore',
    )
    .eq('status_abstract', 'In Progress')
    .limit(3)
    .overrideTypes<
      Array<{
        home_team: { team_name: any };
        away_team: { team_name: any };
      }>
    >();

  type upcomingGamesData = QueryData<typeof upcomingGamesQuery>;
  type pastGamesData = QueryData<typeof pastGamesQuery>;
  type liveGamesData = QueryData<typeof liveGamesQuery>;

  const [upcomingGames, setUpcomingGames] = useState<upcomingGamesData | null>(
    null,
  );
  const [pastGames, setPastGames] = useState<pastGamesData | null>(null);
  const [liveGames, setLiveGames] = useState<liveGamesData | null>(null);
  const [upcomingError, setUpcomingError] = useState<PostgrestError | null>(
    null,
  );
  const [pastError, setPastError] = useState<PostgrestError | null>(null);
  const [liveError, setLiveError] = useState<PostgrestError | null>(null);

  useEffect(() => {
    async function getUpcomingGamesData() {
      const { data, error } = await upcomingGamesQuery;
      if (error) {
        setUpcomingError(error);
      }
      setUpcomingGames(data);
    }

    async function getPastGamesData() {
      const { data, error } = await pastGamesQuery;
      if (error) {
        setPastError(error);
      }
      setPastGames(data);
    }

    async function getLiveGamesData() {
      const { data, error } = await liveGamesQuery;
      if (error) {
        setLiveError(error);
      }
      setLiveGames(data);
    }

    getUpcomingGamesData().catch((err) => {
      console.log(`Error occurred: ${err}`);
    });

    getPastGamesData().catch((err) => {
      console.log(`Error occurred: ${err}`);
    });

    getLiveGamesData().catch((err) => {
      console.log(`Error occurred: ${err}`);
    });
  }, []);

  let upcomingGamesRender: React.JSX.Element[] | null = null;
  let liveGamesRender: React.JSX.Element[] | null = null;
  let pastGamesRender: React.JSX.Element[] | null = null;

  //TODO: Fix list arrangement using CSS and HTML
  if (upcomingGames) {
    upcomingGamesRender = upcomingGames.map((game) => (
      <GameCard
        gameId={game.game_pk}
        status={game.status_abstract}
        home_team={game.home_team.team_name}
        time={`${game.official_date}`}
        away_team={game.away_team.team_name}
      />
    ));
  }

  if (liveGames) {
    liveGamesRender = liveGames.map((game) => (
      <GameCard
        gameId={game.game_pk}
        status={game.status_abstract}
        home_team={game.home_team.team_name}
        score={`${game.home_score} - ${game.away_score}`}
        interval={`${game.linescore.inningState.toUpperCase()} ${game.linescore.currentInningOrdinal.toUpperCase()}`}
        away_team={game.away_team.team_name}
      />
    ));
  }

  if (pastGames) {
    pastGamesRender = pastGames.map((game) => (
      <GameCard
        gameId={game.game_pk}
        status={game.status_abstract}
        home_team={game.home_team.team_name}
        score={`${game.home_score} - ${game.away_score}`}
        away_team={game.away_team.team_name}
      />
    ));
  }

  if (upcomingGamesRender && liveGamesRender && pastGamesRender) {
    return (
      <div className="home-page">
        <h1>MLB Games</h1>
        <section className="league-row">
          <h2>Live Games</h2>
          <div className="game-grid">{liveGamesRender}</div>
        </section>
        <section className="league-row">
          <h2>Upcoming Games</h2>
          <div className="game-grid">{upcomingGamesRender}</div>
        </section>
        <section className="league-row">
          <h2>Previous Games</h2>
          <div className="game-grid">{pastGamesRender}</div>
        </section>
      </div>
    );
  } else if (upcomingError || pastError || liveError) {
    return <p>There was an error...</p>;
  } else {
    return <p>loading...</p>;
  }
}
