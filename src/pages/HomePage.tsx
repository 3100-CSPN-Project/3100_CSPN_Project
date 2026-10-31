/**The Home Page of CSPN, displaying live, upcoming, and previous MLB games
 * in three separate rows. Game cards are direct links to that game's respective
 * part of the site.**/
import { getSupabaseClient } from '../lib/supabase';
import { SupabaseClient } from '@supabase/supabase-js';
import { PostgrestError, QueryData } from '@supabase/supabase-js';
import { JSX, useEffect, useState } from 'react';
import GameCard from '../components/GameCard';

export default function HomePage() {
  //set Supabase client and queries. Use three separate queries to
  //apply the three necessary filters separately.
  const client: SupabaseClient = getSupabaseClient();
  const upcomingGamesQuery = client
    .from('mlb_games')
    .select(
      'game_pk, status_abstract, official_date, home_team:mlb_teams!home_team_id(team_name), away_team:mlb_teams!away_team_id(team_name)',
    )
    .eq('status_abstract', 'Preview')
    .order('official_date', { ascending: false })
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
    .order('official_date', { ascending: false })
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
    .order('official_date', { ascending: false })
    .limit(3)
    .overrideTypes<
      Array<{
        home_team: { team_name: any };
        away_team: { team_name: any };
      }>
    >();

  //identify the query data types
  type upcomingGamesData = QueryData<typeof upcomingGamesQuery>;
  type pastGamesData = QueryData<typeof pastGamesQuery>;
  type liveGamesData = QueryData<typeof liveGamesQuery>;

  //set the state variables for game data and query errors.
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

  //Set the useEffect function to reload after the first render.
  //Three separate async functions are used here
  //to independently fetch all 3 query results.
  //All 3 functions have a catch case for when errors occur.
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

  //Set variables used to dynamically build
  //The three sections of games.

  let upcomingSection: JSX.Element | null = null;
  let liveSection: JSX.Element | null = null;
  let pastSection: JSX.Element | null = null;

  //If the game data has been successfully returned, build the HTMl sections.
  //The section will be empty if there is no data to use.
  if (upcomingGames) {
    if (upcomingGames.length > 0) {
      const upcomingGamesRender: JSX.Element[] = upcomingGames.map((game) => (
        <GameCard
          gameId={game.game_pk}
          status={game.status_abstract}
          home_team={game.home_team.team_name}
          time={`${game.official_date}`}
          away_team={game.away_team.team_name}
        />
      ));
      upcomingSection = (
        <section className="league-row">
          <h2>Upcoming Games</h2>
          <div className="game-grid">{upcomingGamesRender}</div>
        </section>
      );
    } else {
      upcomingSection = <section></section>;
    }
  }

  if (liveGames) {
    if (liveGames.length > 0) {
      const liveGamesRender: JSX.Element[] = liveGames.map((game) => (
        <GameCard
          gameId={game.game_pk}
          status={game.status_abstract}
          home_team={game.home_team.team_name}
          score={`${game.home_score} - ${game.away_score}`}
          interval={`${game.linescore.inningState.toUpperCase()} ${game.linescore.currentInningOrdinal.toUpperCase()}`}
          away_team={game.away_team.team_name}
        />
      ));
      liveSection = (
        <section className="league-row">
          <h2>Live Games</h2>
          <div className="game-grid">{liveGamesRender}</div>
        </section>
      );
    } else {
      liveSection = <section></section>;
    }
  }

  if (pastGames) {
    if (pastGames.length > 0) {
      const pastGamesRender: JSX.Element[] = pastGames.map((game) => (
        <GameCard
          gameId={game.game_pk}
          status={game.status_abstract}
          home_team={game.home_team.team_name}
          score={`${game.home_score} - ${game.away_score}`}
          away_team={game.away_team.team_name}
        />
      ));
      pastSection = (
        <section className="league-row">
          <h2>Previous Games</h2>
          <div className="game-grid">{pastGamesRender}</div>
        </section>
      );
    } else {
      pastSection = <section></section>;
    }
  }

  if (upcomingGames && pastGames && liveGames) {
    return (
      <div className="home-page">
        <h1>MLB Games</h1>
        {liveSection}
        {upcomingSection}
        {pastSection}
      </div>
    );
  } else if (upcomingError || pastError || liveError) {
    return <p>There was an error...</p>;
  } else {
    return <p>Loading...</p>;
  }
}
