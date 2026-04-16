export interface RawAnswer {
  playerId: string;
  text: string;
}

export interface TopAnswer {
  id: string
  text: string;
  count: number;
  percentage: number;
  revealed: boolean;
}