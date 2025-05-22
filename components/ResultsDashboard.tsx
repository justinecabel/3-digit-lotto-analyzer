import React from 'react';
import { LottoGame, DrawResult, FrequencyData, GeminiPrediction } from '../types';

interface ResultsDashboardProps {
  selectedGame: LottoGame;
  recentDraws: DrawResult[];
  frequencyData: FrequencyData[];
  hotDigitsPrediction: number[]; // Renamed from simplePrediction
  geminiPrediction: GeminiPrediction | null;
  onGetGeminiPrediction: () => Promise<void>;
  isLoadingAiPrediction: boolean;
  aiError: string | null;
}

const ResultsDashboard: React.FC<ResultsDashboardProps> = ({
  selectedGame,
  recentDraws,
  frequencyData,
  hotDigitsPrediction,
  geminiPrediction,
  onGetGeminiPrediction,
  isLoadingAiPrediction,
  aiError,
}) => {
  if (recentDraws.length === 0) {
    return (
      <div className="md-card"> 
        <p className="md-typography-body-large text-center subtle-text">
          Add some past draw results to see analysis and predictions.
        </p>
      </div>
    );
  }

  const API_KEY_AVAILABLE = process.env.API_KEY;

  const renderPredictionChips = (prediction: number[], chipStyle?: React.CSSProperties) => (
    <div className="flex flex-wrap gap-3 items-center justify-center">
      {prediction.map((num, index) => (
        <React.Fragment key={index}>
          <span className="md-prediction-chip" style={chipStyle || {backgroundColor: 'var(--md-sys-color-secondary-container)', color: 'var(--md-sys-color-on-secondary-container)'}}>
            {num}
          </span>
          {index < prediction.length - 1 && <span className="md-prediction-separator">-</span>}
        </React.Fragment>
      ))}
    </div>
  );

  return (
    <div className="md-card space-y-8"> 
      <div>
        <h3 className="md-typography-headline-medium mb-4" style={{color: 'var(--md-sys-color-secondary)'}}>Digit Frequency Analysis (0-9)</h3>
        {frequencyData.length > 0 ? (
          <div className="md-table-wrapper">
            <table className="md-table">
              <thead>
                <tr>
                  <th>Digit</th>
                  <th>Times Drawn</th>
                  <th>Percentage</th>
                </tr>
              </thead>
              <tbody>
                {frequencyData.map(data => (
                  <tr key={data.number}>
                    <td className="text-center font-medium">{data.number}</td>
                    <td className="text-center">{data.count}</td>
                    <td className="text-center">{data.percentage.toFixed(2)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
             <p className="md-typography-label-small mt-2 subtle-text">Percentage is based on the total number of individual digits analyzed from all draws.</p>
          </div>
        ) : (
          <p className="md-typography-body-medium subtle-text">No frequency data to display yet.</p>
        )}
      </div>

      {/* Hot Digits Prediction */}
      <div>
        <h3 className="md-typography-headline-medium mb-2" style={{color: 'var(--md-sys-color-secondary)'}}>Hot Digits (Most Frequent Overall)</h3>
        <p className="md-typography-body-medium mb-3 subtle-text">
          Based on the {selectedGame.numbersToPick} most frequent digits found across all positions (sorted):
        </p>
        {hotDigitsPrediction.length > 0 ? (
          <div className="prediction-block">
            {renderPredictionChips(hotDigitsPrediction)}
            {hotDigitsPrediction.length < selectedGame.numbersToPick && (
                <p className="warning-text text-xs mt-2 text-center">Note: Fewer than {selectedGame.numbersToPick} unique digits were present for a full prediction.</p>
            )}
          </div>
        ) : (
          <p className="md-typography-body-medium subtle-text">Not enough data for Hot Digits prediction.</p>
        )}
      </div>
      
      {/* AI Prediction */}
      <div>
        <h3 className="md-typography-headline-medium mb-4" style={{color: 'var(--md-sys-color-secondary)'}}>AI-Powered Prediction (Gemini)</h3>
        {!API_KEY_AVAILABLE && (
             <div className="info-box" style={{backgroundColor: 'var(--md-sys-color-tertiary-container)', color: 'var(--md-sys-color-on-tertiary-container)'}}>
                <p className="md-typography-body-medium">
                    Gemini AI features are disabled. The API_KEY environment variable is not set.
                    Set the API_KEY to enable AI predictions.
                </p>
            </div>
        )}
        {API_KEY_AVAILABLE && (
            <>
            <button
                onClick={onGetGeminiPrediction}
                disabled={isLoadingAiPrediction || recentDraws.length < 3}
                title={recentDraws.length < 3 ? "Add at least 3 draw results to enable AI Prediction" : "Get AI Prediction"}
                className="md-button md-button--filled w-full mb-4"
                style={{backgroundColor: 'var(--md-sys-color-tertiary)', color: 'var(--md-sys-color-on-tertiary)'}}
                >
                {isLoadingAiPrediction ? (
                    <div className="md-spinner-wrapper">
                      <div className="md-spinner" style={{borderColor: 'var(--md-sys-color-on-tertiary)', borderTopColor: 'var(--md-sys-color-tertiary-container)'}}></div>
                      <span>Analyzing with Gemini...</span>
                    </div>
                ) : (
                    "Get Gemini AI Prediction (3-Digit)"
                )}
                </button>
                {recentDraws.length < 3 && <p className="md-typography-label-medium text-center mb-3 warning-text">Please add at least 3 draw results for a more meaningful AI prediction.</p>}
                {aiError && <p className="info-box info-box-error md-typography-body-medium mb-4" role="alert">{aiError}</p>}
                
                {geminiPrediction && !isLoadingAiPrediction && (
                <div className="prediction-block">
                    <p className="md-typography-title-medium mb-2" style={{color: 'var(--md-sys-color-on-surface-variant)'}}>AI Predicted 3-Digit Combination (Order Matters):</p>
                    {renderPredictionChips(geminiPrediction.predictedNumbers, {backgroundColor: 'var(--md-sys-color-tertiary-container)', color: 'var(--md-sys-color-on-tertiary-container)'})}
                    <p className="md-typography-title-medium mb-1 mt-4" style={{color: 'var(--md-sys-color-on-surface-variant)'}}>AI Analysis Summary:</p>
                    <p className="md-typography-body-medium italic subtle-text">{geminiPrediction.analysisSummary}</p>
                </div>
                )}
            </>
        )}
      </div>
       <div className="md-disclaimer-box">
        <p className="md-typography-body-medium">
          <strong>Disclaimer:</strong> Lotto predictions are speculative. This tool is for entertainment/informational purposes only. Playing involves risk; no winning guarantee. Please play responsibly. Not affiliated with PCSO.
        </p>
      </div>
    </div>
  );
};

export default ResultsDashboard;