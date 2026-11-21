import { Link } from 'react-router-dom';
import { JSX } from 'react';
const IMG_SIZE: number = 100;

export default function GameCard(props: any) {
  let gameInfo: JSX.Element = <p></p>;
  if (props.status === 'Preview') {
    gameInfo = <p style={{ margin: '20px' }}>{props.time}</p>;
  } else if (props.status === 'In Progress') {
    gameInfo = (
      <div>
        <p style={{ margin: '20px' }}>{props.score}</p>
        <p style={{ margin: '20px' }}>{props.interval}</p>
      </div>
    );
  } else if (props.status === 'Final') {
    gameInfo = <p style={{ margin: '20px' }}>{props.score}</p>;
  } else {
    return <p>there was an error...</p>;
  }
  return (
    <Link to={`/games/${props.game_id}`} className={'game-card'}>
      <img
        src={`/src/assets/${props.home_team}.png`}
        alt={`${props.home_team} logo`}
        width={IMG_SIZE}
      />
      {gameInfo}
      <img
        src={`/src/assets/${props.away_team}.png`}
        alt={`${props.away_team} logo`}
        width={IMG_SIZE}
      />
    </Link>
  );
}
