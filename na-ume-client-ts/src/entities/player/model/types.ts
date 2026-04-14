export interface Player {
  id: string;
  name: string;
  score: number;

  hasAnswered?: boolean;
  hasGuessed?: boolean;
}