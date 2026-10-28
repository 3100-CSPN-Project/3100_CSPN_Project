import { useParams } from 'react-router-dom';
import { getSupabaseClient } from '../lib/supabase';
import { SupabaseClient } from '@supabase/supabase-js';
import { PostgrestError, QueryData } from '@supabase/supabase-js';
import { useEffect, useState } from 'react';
import PlayTextBox from '../components/PlayTextBox';
import ChatTextBox from '../components/ChatTextBox';
const IMG_WIDTH: number = 200;
const IMG_HEIGHT: number = 200;

//Game Page: Display the DB data for a single game, including the score (if live or final),
//the teams, and the time.
export default function GamePage() {
  //Use the game id identified in the router to get a game from the DB.
  const { gameId } = useParams();

  //Summon the supabase client from `../lib/supabase`
  const client: SupabaseClient = getSupabaseClient();

  //The Supabase Query for getting our game info
  //syntax for joins: `alias:other_table_name!this_table_row_with_FK(column)`.
  //.single() to get a single object instead of a list of objects.
  //.overrideTypes<...>() to ensure that home and away team info is set as an object, not an object list.
  const gameDataQuery = client
    .from('mlb_games')
    .select(
      'game_date, status_abstract, official_date, is_final, venue_name, home_team:mlb_teams!home_team_id(team_name), home_score, away_team:mlb_teams!away_team_id(team_name), away_score, linescore',
    )
    .eq('game_pk', gameId)
    .single()
    .overrideTypes<{
      home_team: { team_name: any };
      away_team: { team_name: any };
    }>();

  //get the object structure that will be returned by the query.
  type gameData = QueryData<typeof gameDataQuery>;

  //Set the state variables to track game data and SQL errors.
  const [currentGame, setGame] = useState<gameData | null>(null);
  const [currentError, setError] = useState<PostgrestError | null>(null);

  //useEffect() function will rerun if the gameId ever changes.
  //async function getGameData() is defined to handle the async behavior of retrieving the
  //query data. call the function right after it's defined to use it.
  //There is no value in the async promise, so handle it with a simple catch().
  useEffect(() => {
    async function getGameData() {
      const { data, error } = await gameDataQuery;
      setGame(data);
      setError(error);
    }
    getGameData().catch((err) => {
      console.log(`Error occurred; ${err}`);
    });
  }, [gameId]);

  //Display on the page an error, a loading screen, or the proper page
  //depending on the return value of the Supabase Query.
  if (currentError) {
    return <p>There was an error...</p>;
  } else if (!currentGame) {
    return <p>Loading...</p>;
  } else {
    //Calculate a score string only if the game has begun or passed.

    //Example:
    //if game.status_abstract === 'Preview' -> ''
    //else -> `10 - 0`
    const score_status: string =
      currentGame.status_abstract === 'Preview'
        ? ''
        : `${currentGame.home_score} - ${currentGame.away_score}`;

    //Calculate a status string only if the game is occuring.
    //If the game hasn't happened, only display the game's date.
    //If the game passed, only display the word 'FINAL'.

    //Example:
    //If game.status_abstract === 'In Progress' -> `Top 9th`
    //Else if is 'Preview' -> `10-31-2026`
    //Else -> 'FINAL'
    let game_status: string;
    if (currentGame.status_abstract === 'In Progress') {
      game_status = `${currentGame.linescore.inningState.toUpperCase()} ${currentGame.linescore.currentInningOrdinal.toUpperCase()}`;
    } else if (currentGame.status_abstract === 'Preview') {
      game_status = `${currentGame.official_date}`;
    } else {
      game_status = 'FINAL';
    }

    //Calculate an out string only if the game is in progress.

    //Example:
    //If game.status_abstract === 'In Progress' -> 2 Outs
    //Else -> ''
    const outs_status: string =
      currentGame.status_abstract === 'In Progress'
        ? `${currentGame.linescore.outs} OUTS`
        : '';

    //build the page HTML
    return (
      <div className="game-display">
        <div className="game-info">
          <img
            src={`/src/assets/${currentGame.home_team.team_name}.png`}
            alt={`${currentGame.home_team.team_name} logo`}
            width={IMG_WIDTH}
            height={IMG_HEIGHT}
          />
          <div className="game-text-box">
            <strong>
              <p>{score_status}</p>
              <p>{game_status}</p>
              <p>{outs_status}</p>
            </strong>
          </div>
          <img
            src={`/src/assets/${currentGame.away_team.team_name}.png`}
            alt={`${currentGame.away_team.team_name} logo`}
            width={IMG_WIDTH}
            height={IMG_HEIGHT}
          />
        </div>
        <div className="game-menu-row">
          <div className="game-play-tracker">
            <div className="game-menu-title">
              <h3>Play by Play</h3>
            </div>
            <div className="game-menu-item">
              <PlayTextBox />
              <PlayTextBox />
              <PlayTextBox />
            </div>
          </div>
          <div className="game-chat">
            <div className="game-menu-title">
              <h3>Live Chat</h3>
            </div>
            <div className="game-menu-item">
              <ChatTextBox />
              <ChatTextBox />
              <ChatTextBox />
            </div>
          </div>
        </div>
        <div></div>
      </div>
    );
  }
}
