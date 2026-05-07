const DIMINUTIVE_SUFFIXES = ['ушк', 'юшк', 'очк', 'ечк', 'оньк', 'еньк'];
const ENDING_SUFFIXES = [
  'иями',
  'ями',
  'ами',
  'ого',
  'ему',
  'ому',
  'ее',
  'ие',
  'ый',
  'ий',
  'ой',
  'ая',
  'яя',
  'ов',
  'ев',
  'а',
  'я',
  'ы',
  'и',
  'е',
  'о',
  'у',
  'ю',
];

const normalizeToken = (token: string) => {
  if (token.length <= 3) {
    return token;
  }

  let nextToken = token;

  for (const suffix of DIMINUTIVE_SUFFIXES) {
    if (nextToken.length > suffix.length + 2 && nextToken.endsWith(suffix + 'а')) {
      nextToken = nextToken.slice(0, -(suffix.length + 1));
      break;
    }

    if (nextToken.length > suffix.length + 1 && nextToken.endsWith(suffix)) {
      nextToken = nextToken.slice(0, -suffix.length);
      break;
    }
  }

  for (const suffix of ENDING_SUFFIXES) {
    if (nextToken.length > suffix.length + 2 && nextToken.endsWith(suffix)) {
      nextToken = nextToken.slice(0, -suffix.length);
      break;
    }
  }

  return nextToken;
};

export const normalizeText = (text: string) => {
  return text
    .toLocaleLowerCase('ru-RU')
    .trim()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map(normalizeToken)
    .join(' ');
};
