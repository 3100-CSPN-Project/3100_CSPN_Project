import { useParams } from 'react-router-dom';
import PlayTextBox from '../components/PlayTextBox';
import ChatTextBox from '../components/ChatTextBox';
const IMG_WIDTH: number = 200;
const IMG_HEIGHT: number = 200;
//Add a play component for each play, infinite scroll should be in play-by-play
//Add a comment component for each play, infinite scroll should be in chat
//chat also needs the comment line.


export default function GamePage() {
  const { gameId } = useParams();
//Track game completion, track names, imgs, ball possession, outs,
  return (
    <div className="game-display">
      <div className="game-info">
        <img
          src="/src/assets/dodgers.png"
          alt="dodgers logo"
          width={IMG_WIDTH}
          height={IMG_HEIGHT}
        />
        <div className="game-text-box">
          <strong>
            <p>2 - 1</p>
            <p> BOT 9TH</p>
            <p>2 outs</p>
          </strong>
        </div>
        <img
          src="/src/assets/giants.png"
          alt="giants logo"
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
