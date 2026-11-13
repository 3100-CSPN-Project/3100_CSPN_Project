import { useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { getMlbGame, type MlbGameData } from '../lib/mlbGames';
import {
  getGameComments,
  postGameComment,
  type GameComment,
} from '../lib/gameComments';
import GameBoxScore from '../components/GameBoxScore';

export default function GamePage() {
  const { gameId } = useParams();
  const [currentGame, setGame] = useState<MlbGameData | null>(null);
  const [gameError, setGameError] = useState<string | null>(null);
  const [comments, setComments] = useState<GameComment[]>([]);
  const [commentsError, setCommentsError] = useState<string | null>(null);

  // trace: Ignore stale responses so navigating quickly cannot show another game's data.
  useEffect(() => {
    if (!gameId) return;

    let active = true;
    setGame(null);
    setGameError(null);

    getMlbGame(gameId)
      .then(({ data, error }) => {
        if (!active) return;
        if (error) {
          setGameError(error.message);
          return;
        }
        setGame(data);
      })
      .catch((error: unknown) => {
        if (active) {
          setGameError(
            error instanceof Error ? error.message : 'Unable to load game.',
          );
        }
      });

    return () => {
      active = false;
    };
  }, [gameId]);

  // trace: Comments load independently so a chat error does not hide the game box score.
  useEffect(() => {
    if (!gameId) return;

    let active = true;
    setComments([]);
    setCommentsError(null);

    getGameComments(gameId)
      .then((data) => {
        if (active) setComments(data);
      })
      .catch((error: unknown) => {
        if (active) {
          setCommentsError(
            error instanceof Error
              ? error.message
              : 'Unable to load game comments.',
          );
        }
      });

    return () => {
      active = false;
    };
  }, [gameId]);

  async function handlePost(form: FormData) {
    if (!gameId) throw new Error('A game ID is required to post a comment.');

    await postGameComment(
      gameId,
      String(form.get('author')),
      String(form.get('body')),
    );
    setComments(await getGameComments(gameId));
  }

  if (!gameId) return <p>No game was selected.</p>;
  if (gameError) return <p role="alert">Unable to load game: {gameError}</p>;
  if (!currentGame) return <p>Loading...</p>;

  // Trace Macias requested this data-backed game detail page for every game.
  return (
    <GameBoxScore
      game={currentGame}
      gameId={gameId}
      comments={comments}
      commentsError={commentsError}
      onPostComment={handlePost}
    />
  );
}
