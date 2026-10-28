export default function GameCard(props: any) {
  if (props.status === 'Preview') {
    return (
      <div className={'game-card'}>
        <img
          src={`/src/assets/${props.home_team}.png`}
          alt={`${props.home_team} logo`}
        />
        <p>{props.time}</p>
        <img
          src={`/src/assets/${props.away_team}.png`}
          alt={`${props.away_team} logo`}
        />
      </div>
    );
  } else if (props.status === 'In Progress') {
    return (
      <div className={'game-card'}>
        <img
          src={`/src/assets/${props.home_team}.png`}
          alt={`${props.home_team} logo`}
        />
        <p>{props.score}</p>
        <p>{props.interval}</p>
        <img
          src={`/src/assets/${props.away_team}.png`}
          alt={`${props.away_team} logo`}
        />
      </div>
    );
  } else {
    return (
      <div className={'game-card'}>
        <img
          src={`/src/assets/${props.home_team}.png`}
          alt={`${props.home_team} logo`}
        />
        <p>{props.score}</p>
        <img
          src={`/src/assets/${props.away_team}.png`}
          alt={`${props.away_team} logo`}
        />
      </div>
    );
  }
}
