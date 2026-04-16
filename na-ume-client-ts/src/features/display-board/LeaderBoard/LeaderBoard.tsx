import type { Player } from '@/entities/player';
import { LeaderboardRow } from './LeaderBoardRow';
import './LeaderBoard.css'

type Props = {
  players: Player[];
};

export const LeaderBoard = ({ players}: Props) => {

  return (
    <div className="leaderboard-screen">
      <h2 className="leaderboard-title">Топ лидеров</h2>
      <div className="leaderboard-list">
        {players.map((player, idx) => (
          <LeaderboardRow
            key={player.id}
            index={idx + 1}
            playerName={player.name}
            score={player.score}
          />
        ))}
      </div>
    </div>
  );
};