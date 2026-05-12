import blacklist from '../config/profanityBlacklist.json';

const CYRILLIC_LOOKALIKES: Record<string, string> = {
  a: 'а',
  b: 'б',
  c: 'с',
  e: 'е',
  h: 'х',
  k: 'к',
  m: 'м',
  o: 'о',
  p: 'п',
  r: 'р',
  t: 'т',
  x: 'х',
  y: 'у',
};

const TRANSLITERATION_PAIRS: Array<[string, string]> = [
  ['shch', 'щ'],
  ['yo', 'е'],
  ['yu', 'ю'],
  ['ya', 'я'],
  ['zh', 'ж'],
  ['kh', 'х'],
  ['ts', 'ц'],
  ['ch', 'ч'],
  ['sh', 'ш'],
];

const TRANSLITERATION_CHARS: Record<string, string> = {
  a: 'а',
  b: 'б',
  v: 'в',
  g: 'г',
  d: 'д',
  e: 'е',
  z: 'з',
  i: 'и',
  j: 'й',
  k: 'к',
  l: 'л',
  m: 'м',
  n: 'н',
  o: 'о',
  p: 'п',
  r: 'р',
  s: 'с',
  t: 'т',
  u: 'у',
  f: 'ф',
  h: 'х',
  y: 'ы',
};

const PROFANITY_ROOTS = blacklist.roots.map((item) => item.toLocaleLowerCase('ru-RU'));
const PROFANITY_WORDS = blacklist.words.map((item) => item.toLocaleLowerCase('ru-RU'));

const replaceChars = (text: string, map: Record<string, string>) => {
  return text.replace(/[a-z]/g, (char) => map[char] ?? char);
};

const transliterateLatin = (text: string) => {
  let nextText = text;

  for (const [latin, cyrillic] of TRANSLITERATION_PAIRS) {
    nextText = nextText.replaceAll(latin, cyrillic);
  }

  return replaceChars(nextText, TRANSLITERATION_CHARS);
};

const getComparableVariants = (word: string) => {
  const normalized = word.toLocaleLowerCase('ru-RU');
  return Array.from(
    new Set([
      normalized,
      replaceChars(normalized, CYRILLIC_LOOKALIKES),
      transliterateLatin(normalized),
    ]),
  );
};

const isBlocked = (word: string) => {
  return getComparableVariants(word).some((variant) => {
    if (PROFANITY_WORDS.some((pattern) => variant === pattern || variant.includes(pattern))) {
      return true;
    }

    return PROFANITY_ROOTS.some((pattern) => variant.startsWith(pattern));
  });
};

export const containsProfanity = (text: string) => {
  if (!text) {
    return false;
  }

  const words = text.split(' ').filter(Boolean);

  return words.some(isBlocked);
};
