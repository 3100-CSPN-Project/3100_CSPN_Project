import { Link, useParams } from 'react-router-dom';
import { getSupabaseClient } from '../lib/supabase';
import { getMlbGame, MlbGameData } from '../lib/mlbGames';
import { SupabaseClient } from '@supabase/supabase-js';
import { PostgrestError, QueryData } from '@supabase/supabase-js';
import { useEffect, useState } from 'react';
import PlayTextBox from '../components/PlayTextBox';
import ChatTextBox from '../components/ChatTextBox';
import {
  getGameComments,
  postGameComment,
  type GameComment,
} from '../lib/gameComments';
import GameBoxScoreMockup from '../components/GameBoxScoreMockup';
const IMG_WIDTH: number = 200;
const IMG_HEIGHT: number = 200;
const MOCKUP_GAME_ID = '849799';

//Game Page: Display the DB data for a single game, including the score (if live or final),
//the teams, and the time.
export default function GamePage() {
  //Use the game id identified in the router to get a game from the DB.
  const { gameId } = useParams();
  if (!gameId) {
    return <p>There was an error...</p>;
  } else {
    //Set the state variables to track game data and SQL errors.
    const [currentGame, setGame] = useState<MlbGameData | null>(null);
    const [currentError, setError] = useState<PostgrestError | null>(null);

    //useEffect() function will rerun if the gameId ever changes.
    //async function getGameData() is defined to handle the async behavior of retrieving the
    //query data. call the function right after it's defined to use it.
    //There is no value in the async promise, so handle it with a simple catch().
    useEffect(() => {
      async function getGameData() {
        const { data, error } = await getMlbGame(gameId!);
        setGame(data);
        setError(error);
      }
      getGameData().catch((err) => {
        console.log(`Error occurred; ${err}`);
      });
    }, [gameId]);

    // the chat has its own state so a new comment does not refetch the game
    const [comments, setComments] = useState<GameComment[]>([]);

    // also used after posting, so the new comment shows up straight away
    async function loadComments() {
      setComments(await getGameComments(gameId!));
    }

    useEffect(() => {
      loadComments();
    }, [gameId]);

    // react gives the form data straight to the action
    async function handlePost(form: FormData) {
      await postGameComment(
        gameId!,
        String(form.get('author')),
        String(form.get('body')),
      );
      await loadComments();
    }

    //Display on the page an error, a loading screen, or the proper page
    //depending on the return value of the Supabase Query.
    if (currentError) {
      return <p>There was an error...</p>;
    } else if (!currentGame) {
      return <p>Loading...</p>;
    } else {
      if (gameId === MOCKUP_GAME_ID) {
        return (
          <GameBoxScoreMockup
            game={currentGame}
            gameId={gameId}
            comments={comments}
            onPostComment={handlePost}
          />
        );
      }

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
        game_status = `${currentGame.linescore.inningState?.toUpperCase() ?? ''} ${currentGame.linescore.currentInningOrdinal?.toUpperCase() ?? ''}`.trim();
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
            <Link to={`/team/${currentGame.home_team_id}`}>
              <img
                src={`/src/assets/${currentGame.home_team.team_name}.png`}
                alt={`${currentGame.home_team.team_name} logo`}
                width={IMG_WIDTH}
                height={IMG_HEIGHT}
              />
            </Link>
            <div className="game-text-box">
              <strong>
                <p>{score_status}</p>
                <p>{game_status}</p>
                <p>{outs_status}</p>
              </strong>
            </div>
            <Link to={`/team/${currentGame.away_team_id}`}>
              <img
                src={`/src/assets/${currentGame.away_team.team_name}.png`}
                alt={`${currentGame.away_team.team_name} logo`}
                width={IMG_WIDTH}
                height={IMG_HEIGHT}
              />
            </Link>
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
                {comments.length === 0 && <p>No comments yet.</p>}
                {comments.map((comment) => (
                  <ChatTextBox
                    key={comment.comment_id}
                    author={comment.author}
                    body={comment.body}
                  />
                ))}

                {/* the form clears itself after posting because the inputs are uncontrolled */}
                <form className="chat-form" action={handlePost}>
                  <input
                    name="author"
                    placeholder="your name"
                    maxLength={40}
                    required
                  />
                  <input
                    name="body"
                    placeholder="say something"
                    maxLength={500}
                    required
                  />
                  <button type="submit">post</button>
                </form>
              </div>
            </div>
          </div>
          <div></div>
        </div>
      );
    }
  }
}
