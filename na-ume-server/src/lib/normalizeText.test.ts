import { containsProfanity } from './containsProfanity';
import { normalizeText } from './normalizeText';

describe('normalizeText', () => {
  it('lowercases, trims and removes punctuation', () => {
    const result = normalizeText('  Hello,   WORLD!!!  2026  ');
    expect(result).toBe('hello world 2026');
  });

  it('removes separators and keeps letters and digits', () => {
    const result = normalizeText('test-set #1 / super');
    expect(result).toBe('test set 1 super');
  });

  it('keeps equal answers comparable after case changes', () => {
    expect(normalizeText('Coffee')).toBe(normalizeText(' coffee '));
  });
});

describe('containsProfanity', () => {
  it('catches rude words without false positives for normal words', () => {
    expect(containsProfanity(normalizeText('kakashka'))).toBe(true);
    expect(containsProfanity(normalizeText('coffee'))).toBe(false);
  });
});
