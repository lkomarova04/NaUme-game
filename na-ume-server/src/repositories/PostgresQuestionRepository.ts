import type { Pool } from 'pg';
import { QUESTION_BANK } from '../config/game';
import type { Question } from '../domain/types';
import type { QuestionRepository } from './QuestionRepository';

export class PostgresQuestionRepository implements QuestionRepository {
  constructor(private readonly pool: Pool) {}

  async init() {
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS categories (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL UNIQUE
      )
    `);

    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS questions (
        id TEXT PRIMARY KEY,
        text TEXT NOT NULL,
        category TEXT,
        category_id INTEGER REFERENCES categories(id)
      )
    `);

    await this.pool.query(`
      ALTER TABLE questions
      ADD COLUMN IF NOT EXISTS category TEXT
    `);

    
    await this.pool.query(`
      ALTER TABLE questions
      ADD COLUMN IF NOT EXISTS text TEXT
    `);

    await this.pool.query(`
      ALTER TABLE questions
      ADD COLUMN IF NOT EXISTS category_id INTEGER REFERENCES categories(id)
    `);

    const categoryNames = Array.from(new Set(QUESTION_BANK.map((question) => question.category)));
    for (const categoryName of categoryNames) {
      await this.pool.query(
        `
          INSERT INTO categories (name)
          VALUES ($1)
          ON CONFLICT (name) DO NOTHING
        `,
        [categoryName],
      );
    }

    await this.pool.query(`
      UPDATE questions
      SET category = 'Общее'
      WHERE category IS NULL OR btrim(category) = ''
    `);

    await this.pool.query(`
      UPDATE questions q
      SET category_id = c.id
      FROM categories c
      WHERE q.category_id IS NULL
        AND q.category IS NOT NULL
        AND btrim(q.category) <> ''
        AND c.name = q.category
    `);

    const existingCountResult = await this.pool.query<{ count: string }>('SELECT COUNT(*)::text AS count FROM questions');
    const existingCount = Number(existingCountResult.rows[0]?.count ?? '0');

    if (existingCount === 0) {
      for (const question of QUESTION_BANK) {
        const categoryResult = await this.pool.query<{ id: number }>(
          `
            SELECT id
            FROM categories
            WHERE name = $1
            LIMIT 1
          `,
          [question.category],
        );

        await this.pool.query(
          `
            INSERT INTO questions (id, text, category, category_id)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (id) DO NOTHING
          `,
          [question.id, question.text, question.category, categoryResult.rows[0]?.id ?? null],
        );
      }
    }
  }

  async getAll(): Promise<Question[]> {
    const result = await this.pool.query<Question>(
      `
        SELECT
          q.id,
          q.text,
          COALESCE(NULLIF(c.name, ''), NULLIF(q.category, ''), 'Общее') AS category
        FROM questions q
        LEFT JOIN categories c ON c.id = q.category_id
        ORDER BY id
      `,
    );

    return result.rows;
  }
}
