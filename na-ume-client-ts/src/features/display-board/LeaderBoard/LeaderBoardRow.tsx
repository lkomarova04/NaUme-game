import GameRow from '@/shared/ui/GameRow';

type Props = {
  index: number;
  playerName: string;
  score: number;
};

export const LeaderboardRow = ({ index, playerName, score }: Props) => {
  return (
    <GameRow
      left={<p>{index}</p>}
      center={<p>{playerName}</p>}
      right={<p>{score}</p>}
      isRevealed={true}
      animationDelayMs={index * 100}
    />
  );
};
