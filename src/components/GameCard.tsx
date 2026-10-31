import { Link } from 'react-router-dom';
const IMG_SIZE: number = 100;

export default function GameCard(props: any) {
  if (props.status === 'Preview') {
    return (
      <Link to={`/game/${props.gameId}`} className={'game-card'}>
        <img
          src={`/src/assets/${props.home_team}.png`}
          alt={`${props.home_team} logo`}
          width={IMG_SIZE}
        />
        <p style={{ margin: '20px' }}>{props.time}</p>
        <img
          src={`/src/assets/${props.away_team}.png`}
          alt={`${props.away_team} logo`}
          width={IMG_SIZE}
        />
      </Link>
    );
  } else if (props.status === 'In Progress') {
    return (
      <Link to={`/game/${props.gameId}`} className={'game-card'}>
        <img
          src={`/src/assets/${props.home_team}.png`}
          alt={`${props.home_team} logo`}
          width={IMG_SIZE}
        />
        <p style={{ margin: '20px' }}>{props.score}</p>
        <p style={{ margin: '20px' }}>{props.interval}</p>
        <img
          src={`/src/assets/${props.away_team}.png`}
          alt={`${props.away_team} logo`}
          width={IMG_SIZE}
        />
      </Link>
    );
  } else {
    return (
      <Link to={`/game/${props.gameId}`} className={'game-card'}>
        <img
          src={`/src/assets/${props.home_team}.png`}
          alt={`${props.home_team} logo`}
          width={IMG_SIZE}
        />
        <p style={{ margin: '20px' }}>{props.score}</p>
        <img
          src={`/src/assets/${props.away_team}.png`}
          alt={`${props.away_team} logo`}
          width={IMG_SIZE}
        />
      </Link>
    );
  }
}
