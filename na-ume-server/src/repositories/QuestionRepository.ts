import type { Question } from '../domain/types';

export interface QuestionRepository {
  init(): Promise<void>;
  getAll(): Promise<Question[]>;
}
