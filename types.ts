export interface LottoGame {
  id: string;
  name: string;
  maxNumber: number; // Max value for an individual digit (0-9 for 3D)
  numbersToPick: number; // Number of digits to pick (3 for 3D)
  digitMinNumber?: number; // Min value for an individual digit (0 for 3D)
  isOrderSignificant?: boolean; // True for 3D Swertres style
  drawDays?: string; 
}

export type DrawResult = number[]; // e.g., [1, 2, 3] for 3 Digit

export interface FrequencyData {
  number: number; // The digit (0-9)
  count: number;
  percentage: number; // Percentage of this digit among all digits entered
}

export interface GeminiPrediction {
  predictedNumbers: number[]; // The predicted 3 digits, order matters
  analysisSummary: string;
}