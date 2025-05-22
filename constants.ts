import { LottoGame } from './types';

export const LOTTO_GAMES: LottoGame[] = [
  {
    id: '3d',
    name: '3 Digit Lotto (Swertres)',
    maxNumber: 9, // Max for each digit
    numbersToPick: 3,
    digitMinNumber: 0, // Min for each digit
    isOrderSignificant: true,
    drawDays: 'Daily 2PM, 5PM, 9PM'
  },
  // Other PCSO games can be added here if needed in the future
  // { id: '6/42', name: 'Lotto 6/42', maxNumber: 42, numbersToPick: 6, drawDays: 'Tue, Thu, Sat', isOrderSignificant: false },
];

export const DEFAULT_GAME_ID = LOTTO_GAMES[0].id;

export const GEMINI_MODEL_TEXT = 'gemini-2.5-flash-preview-04-17'; // Updated model
