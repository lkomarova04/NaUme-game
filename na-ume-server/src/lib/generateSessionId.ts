import { DEFAULT_SESSION_ID_LENGTH } from '../config/game';

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export const generateSessionId = (length = DEFAULT_SESSION_ID_LENGTH) => {
  let result = '';

  for (let index = 0; index < length; index += 1) {
    const randomIndex = Math.floor(Math.random() * ALPHABET.length);
    result += ALPHABET[randomIndex];
  }

  return result;
};
