import React, { useState, useEffect, useCallback } from 'react';
import { LottoGame, DrawResult, FrequencyData, GeminiPrediction } from './types';
import { LOTTO_GAMES, DEFAULT_GAME_ID } from './constants';
import LottoForm from './components/LottoForm';
import ResultsDashboard from './components/ResultsDashboard';
import { getGeminiPrediction } from './services/geminiService';
import { Analytics } from '@vercel/analytics/react';

// --- Icons ---
const GitHubIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="currentColor"
    width="24"
    height="24"
    className={className || ''}
    aria-hidden="true"
    style={{ verticalAlign: 'middle' }} 
  >
    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
  </svg>
);

const GmailIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="currentColor"
    width="24"
    height="24"
    className={className || ''}
    aria-hidden="true"
    style={{ verticalAlign: 'middle' }}
  >
    <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm-.4 4.25l-7.07 4.42c-.32.2-.74.2-1.06 0L4.4 8.25V6.75L12 11l7.6-4.25v1.5z"/>
  </svg>
);


const SunIcon: React.FC<{ className?: string }> = ({ className }) => (
  <span className={`material-symbols-outlined ${className || ''}`} aria-hidden="true">
    light_mode
  </span>
);

const MoonIcon: React.FC<{ className?: string }> = ({ className }) => (
  <span className={`material-symbols-outlined ${className || ''}`} aria-hidden="true">
    dark_mode
  </span>
);
// --- End Icons ---

type Theme = 'light' | 'dark';

const App: React.FC = () => {
  const [selectedGameId, setSelectedGameId] = useState<string>(DEFAULT_GAME_ID);
  const [recentDraws, setRecentDraws] = useState<DrawResult[]>([]);
  const [frequencyData, setFrequencyData] = useState<FrequencyData[]>([]);
  
  // Local Predictions
  const [hotDigitsPrediction, setHotDigitsPrediction] = useState<number[]>([]);
  
  // Gemini AI Prediction
  const [geminiPrediction, setGeminiPrediction] = useState<GeminiPrediction | null>(null);
  const [isLoadingAiPrediction, setIsLoadingAiPrediction] = useState<boolean>(false);
  const [aiError, setAiError] = useState<string | null>(null);

  // Theme
  const [theme, setTheme] = useState<Theme>('dark');

  const selectedGame = LOTTO_GAMES.find(game => game.id === selectedGameId) || LOTTO_GAMES[0];

  // Theme Management Effect
  useEffect(() => {
    const storedTheme = localStorage.getItem('app-theme') as Theme | null;
    const preferredTheme: Theme = window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
    const initialTheme = storedTheme || preferredTheme;
    setTheme(initialTheme);
  }, []);

  useEffect(() => {
    document.documentElement.className = `theme-${theme}`;
    localStorage.setItem('app-theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prevTheme => prevTheme === 'light' ? 'dark' : 'light');
  };

  const handleGameChange = useCallback((gameId: string) => {
    setSelectedGameId(gameId);
    setRecentDraws([]); 
    setFrequencyData([]);
    setHotDigitsPrediction([]);
    setGeminiPrediction(null);
    setAiError(null);
  }, []);

  const handleAddDraw = useCallback((draw: DrawResult) => {
    setRecentDraws(prevDraws => [draw, ...prevDraws]); // Newest first
  }, []);

  const handleAddMultipleDraws = useCallback((draws: DrawResult[]) => {
    // CSV draws are typically oldest first, so reverse them to be newest first in our state.
    setRecentDraws(prevDraws => [...draws.reverse(), ...prevDraws]);
  }, []);

  const handleRemoveDraw = useCallback((indexToRemove: number) => {
    setRecentDraws(prevDraws => prevDraws.filter((_, index) => index !== indexToRemove));
  }, []);
  
  const handleClearDraws = useCallback(() => {
    setRecentDraws([]);
    setFrequencyData([]);
    setHotDigitsPrediction([]);
    setGeminiPrediction(null);
    setAiError(null);
  }, []);


  // Calculate Frequencies and Local Predictions
  useEffect(() => {
    if (recentDraws.length === 0) {
      setFrequencyData([]);
      setHotDigitsPrediction([]);
      return;
    }

    const overallCounts: { [key: number]: number } = {};
    let totalDigitsAnalyzed = 0;

    recentDraws.forEach(draw => { 
      draw.forEach((num) => { 
        overallCounts[num] = (overallCounts[num] || 0) + 1;
        totalDigitsAnalyzed++;
      });
    });

    const newFrequencyData = Object.entries(overallCounts)
      .map(([numStr, count]) => {
        const number = parseInt(numStr);
        const percentage = totalDigitsAnalyzed > 0 ? (count / totalDigitsAnalyzed) * 100 : 0;
        return { number, count, percentage };
      })
      .sort((a, b) => b.count - a.count || a.number - b.number); 
    setFrequencyData(newFrequencyData);

    const topHotDigits = newFrequencyData.slice(0, selectedGame.numbersToPick).map(fd => fd.number).sort((a,b) => a-b);
    setHotDigitsPrediction(topHotDigits);

    // Reset AI prediction when draws change
    setGeminiPrediction(null);
    setAiError(null);

  }, [recentDraws, selectedGame.numbersToPick, selectedGame.id]);

  const handleGetGeminiPrediction = useCallback(async () => {
    if (recentDraws.length < 3) { 
      setAiError("Please add at least 3 draw results for a better AI prediction.");
      return;
    }
    setIsLoadingAiPrediction(true);
    setAiError(null);
    setGeminiPrediction(null);
    try {
      const orderedRecentDrawsForApi = [...recentDraws].reverse(); 
      const prediction = await getGeminiPrediction(selectedGame, orderedRecentDrawsForApi);
      setGeminiPrediction(prediction);
    } catch (error) {
      if (error instanceof Error) {
        setAiError(error.message);
      } else {
        setAiError("An unknown error occurred while fetching AI prediction.");
      }
       console.error("AI Prediction Error in App:", error);
    } finally {
      setIsLoadingAiPrediction(false);
    }
  }, [selectedGame, recentDraws]);


  return (
    <div className="app-padding">
      <div className="container">
        <header className="app-header text-center mb-10">
          <div className="app-header-content">
            <div className="app-header-main">
              <h1 className="md-typography-display-medium">
                SWERTRES Predict
              </h1>
              <p className="md-typography-body-large mt-1 app-subtitle">
                Analyze past 3-Digit (Swertres) results, view digit frequencies, and get AI-powered predictions.
              </p>
            </div>
            <button
              onClick={toggleTheme}
              className="md-button md-icon-button theme-toggle-button"
              aria-label={theme === 'light' ? 'Switch to dark theme' : 'Switch to light theme'}
              title={theme === 'light' ? 'Switch to dark theme' : 'Switch to light theme'}
            >
              {theme === 'light' ? <MoonIcon /> : <SunIcon />}
            </button>
          </div>
        </header>

        <main>
          <div className="main-content-layout">
            <div className="form-column">
              <LottoForm
                selectedGame={selectedGame}
                onGameChange={handleGameChange}
                onAddDraw={handleAddDraw}
                onAddMultipleDraws={handleAddMultipleDraws}
                recentDraws={recentDraws}
                onRemoveDraw={handleRemoveDraw}
                onClearDraws={handleClearDraws}
              />
            </div>
            <div className="results-column">
              <ResultsDashboard
                selectedGame={selectedGame}
                recentDraws={recentDraws}
                frequencyData={frequencyData}
                hotDigitsPrediction={hotDigitsPrediction}
                geminiPrediction={geminiPrediction}
                onGetGeminiPrediction={handleGetGeminiPrediction}
                isLoadingAiPrediction={isLoadingAiPrediction}
                aiError={aiError}
              />
            </div>
          </div>
        </main>
        
        <footer className="footer text-center mt-12 py-6">
          <div className="md-typography-label-large flex items-center justify-center space-x-2 flex-wrap">
            <span>Justine Cabel. &copy; {new Date().getFullYear()}.</span>
            <a
              href="https://github.com/justinecabel"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Justine Cabel's GitHub Profile"
              title="GitHub Profile"
              className="footer-icon-link" 
            >
              <GitHubIcon className="footer-icon" />
            </a>
            <a
                href="mailto:justinecabel2@gmail.com"
                aria-label="Email Justine Cabel"
                title="Email: justinecabel2@gmail.com"
                className="footer-icon-link"
            >
                <GmailIcon className="footer-icon" />
            </a>
          </div>
        </footer>
      </div>
      <Analytics/>
    </div>
  );
};

export default App;