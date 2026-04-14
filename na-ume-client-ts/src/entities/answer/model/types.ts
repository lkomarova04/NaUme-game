export interface RawAnswer {
  playerId: string;
  text: string;
}

export interface TopAnswer {
  text: string;
  count: number;
  percentage: number;
  revealed: boolean;
}