import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { LottoGame, DrawResult, GeminiPrediction } from '../types';
import { GEMINI_MODEL_TEXT } from '../constants';

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  console.warn("API_KEY environment variable not set. Gemini AI features will be disabled.");
}

const ai = API_KEY ? new GoogleGenAI({ apiKey: API_KEY }) : null;

export const getGeminiPrediction = async (
  game: LottoGame,
  recentDrawsChronological: DrawResult[] // Expects draws oldest to newest for context
): Promise<GeminiPrediction | null> => {
  if (!ai) {
    throw new Error("Gemini AI client is not initialized. API_KEY might be missing.");
  }

  // Format for prompt: oldest result first, newest result last.
  const recentResultsString = recentDrawsChronological.map(draw => draw.join('-')).join('; '); 

  let prompt: string;

  if (game.id === '3d') {
    prompt = `
You are a lottery analysis expert specializing in the Philippine 3-Digit (Swertres) Lotto.
The game consists of drawing three digits, each from 0 to 9. The order of the digits (d1, d2, d3) matters.
Recent draw results are provided below, ordered from OLDEST to NEWEST (e.g., d1-d2-d3; ...; latest_d1-d2-d3):
${recentResultsString}

1. Analyze these historical results. Consider digit frequencies (0-9 for each position), their positions (1st, 2nd, 3rd digit), common pairs across positions, triplets, sequences, sums, or any other observable patterns or trends leading up to the most recent draw.
2. Based on your comprehensive analysis of the provided sequence, predict the next 3-digit combination (d1, d2, d3) that would follow the LATEST draw. Remember, digits can repeat (e.g., 1-1-2 is valid), and each digit must be strictly between 0 and 9.
3. Provide a brief, simple explanation (max 2-3 sentences) for your prediction strategy.

Return your response ONLY as a JSON object with the following structure:
{
  "predictedNumbers": [d1, d2, d3],
  "analysisSummary": "Your brief analysis and strategy here."
}
Ensure the "predictedNumbers" array contains exactly 3 digits, each an integer between 0 and 9 inclusive. The order in the array should be your predicted d1, d2, d3.
Do not include any preamble, markdown formatting (like \`\`\`json), or explanations outside the JSON object itself.
    `;
  } else {
    // Fallback for other game types
    prompt = `
You are a lottery analysis expert.
Given the following recent draw results for the Philippine ${game.name} (where ${game.numbersToPick} numbers are drawn from ${game.digitMinNumber ?? 1} to ${game.maxNumber}), ordered OLDEST to NEWEST:
${recentResultsString}

1. Analyze the frequency of each number from these results and any emerging trends.
2. Based on this analysis, predict ${game.numbersToPick} numbers for the next draw.
3. Provide a brief, simple explanation for your prediction strategy.

Return your response ONLY as a JSON object with the following structure:
{
  "predictedNumbers": [num1, num2, ...],
  "analysisSummary": "Your brief analysis and strategy here."
}
Ensure the predictedNumbers array contains ${game.numbersToPick} unique numbers, sorted in ascending order, and each number is within the range.
Do not include any preamble, markdown formatting (like \`\`\`json), or explanations outside the JSON object itself.
    `;
  }

  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: GEMINI_MODEL_TEXT,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        temperature: 0.7, // Maintain some creativity
      },
    });

    let jsonStr = response.text.trim();
    const fenceRegex = /^```(\w*)?\s*\n?(.*?)\n?\s*```$/s;
    const match = jsonStr.match(fenceRegex);
    if (match && match[2]) {
      jsonStr = match[2].trim();
    }
    
    const parsedData = JSON.parse(jsonStr) as GeminiPrediction;

    if (!parsedData.predictedNumbers || !parsedData.analysisSummary || !Array.isArray(parsedData.predictedNumbers)) {
        throw new Error("Invalid JSON structure from AI. Missing 'predictedNumbers' or 'analysisSummary', or 'predictedNumbers' is not an array.")
    }

    if (game.id === '3d') {
      if (parsedData.predictedNumbers.length !== 3) {
        throw new Error(`AI predicted ${parsedData.predictedNumbers.length} digits, but exactly 3 were expected for the 3-Digit game.`);
      }
      parsedData.predictedNumbers.forEach((num, index) => {
        if (typeof num !== 'number' || num < 0 || num > 9 || !Number.isInteger(num)) {
            throw new Error(`AI predicted an invalid digit: '${num}' at position ${index + 1}. Each digit must be an integer between 0 and 9.`);
        }
      });
    } else {
      if (parsedData.predictedNumbers.length !== game.numbersToPick) {
          throw new Error(`AI predicted ${parsedData.predictedNumbers.length} numbers, expected ${game.numbersToPick}.`);
      }
      parsedData.predictedNumbers.forEach(num => {
          if (typeof num !== 'number' || num < (game.digitMinNumber ?? 1) || num > game.maxNumber || !Number.isInteger(num)) {
              throw new Error(`AI predicted an invalid number: ${num} for game range ${game.digitMinNumber ?? 1}-${game.maxNumber}.`);
          }
      });
      const uniqueSortedNumbers = Array.from(new Set(parsedData.predictedNumbers)).sort((a, b) => a - b);
      if (uniqueSortedNumbers.length !== game.numbersToPick) {
           throw new Error(`AI prediction processing error: Expected ${game.numbersToPick} unique numbers, but got ${uniqueSortedNumbers.length} after filtering and sorting.`);
      }
      parsedData.predictedNumbers = uniqueSortedNumbers;
    }
    return parsedData;

  } catch (error) {
    console.error("Error calling Gemini API or parsing response:", error);
    let errorMessage = "Failed to get AI prediction due to an unknown error.";
    if (error instanceof SyntaxError) {
        errorMessage = `Failed to parse AI response as JSON. Content: ${error.message}`;
    } else if (error instanceof Error) {
        errorMessage = `Failed to get AI prediction: ${error.message}`;
    }
    throw new Error(errorMessage);
  }
};
