export interface RawAnswer {
  id: string;
  playerId: string;
  text: string;
  roundIndex?: number;
  createdAt?: number;
  isRejected?: boolean;
}

export interface TopAnswer {
  id: string;
  text: string;
  count: number;
  percentage: number;
  revealed: boolean;
  matchedBy?: string[];
}
