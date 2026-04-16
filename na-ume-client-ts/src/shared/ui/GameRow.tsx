import './GameRow.css';

interface GameRowProps {
  left: React.ReactNode;
  center: React.ReactNode;
  right: React.ReactNode;
  isRevealed?: boolean;
  animationDelayMs?: number;
}

const GameRow = ({ left, center, right, isRevealed, animationDelayMs = 0 }: GameRowProps) => {
  return (
    <div className="row-list" style={{ animationDelay: `${animationDelayMs}ms` }}>
      <div className={`row ${isRevealed ? 'open' : ''}`}>
        <div className="index">{left}</div>
        <div className="text">{center}</div>
        <div className="index count">{right}</div>
      </div>
    </div>
  );
};

export default GameRow;
