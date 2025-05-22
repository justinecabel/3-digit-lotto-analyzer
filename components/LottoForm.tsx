import React, { useState, useCallback, useRef } from 'react';
import { LottoGame, DrawResult } from '../types';
import { LOTTO_GAMES } from '../constants';
import { sampleCsvData } from '../src/sampleData'; 

interface LottoFormProps {
  selectedGame: LottoGame;
  onGameChange: (gameId: string) => void;
  onAddDraw: (draw: DrawResult) => void;
  onAddMultipleDraws: (draws: DrawResult[]) => void;
  recentDraws: DrawResult[];
  onRemoveDraw: (index: number) => void;
  onClearDraws: () => void;
}

const UploadFileIcon: React.FC<{ className?: string }> = ({ className }) => (
    <span className={`material-symbols-outlined ${className || ''}`} aria-hidden="true">
        upload_file
    </span>
);


const LottoForm: React.FC<LottoFormProps> = ({
  selectedGame,
  onGameChange,
  onAddDraw,
  onAddMultipleDraws,
  recentDraws,
  onRemoveDraw,
  onClearDraws
}) => {
  const [currentDrawInput, setCurrentDrawInput] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [fileError, setFileError] = useState<string>('');
  const [sampleDataError, setSampleDataError] = useState<string>('');
  const [fileName, setFileName] = useState<string>('No file chosen');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateAndParseDraw = (input: string, game: LottoGame): DrawResult | string => {
    const numbersStr = input.split(/[,-\s]+/).map(s => s.trim()).filter(s => s !== '');
    
    if (game.id === '3d') {
      if (numbersStr.length !== 3) {
        return `Please enter exactly 3 digits for ${game.name}. You entered ${numbersStr.length}. Input: "${input}"`;
      }
      const numbers = numbersStr.map(Number);
      if (numbers.some(isNaN)) {
        return `All inputs must be numeric digits (0-9). Input: "${input}"`;
      }
      if (numbers.some(n => n < 0 || n > 9 || !Number.isInteger(n))) {
        return `Each digit must be an integer between 0 and 9. Input: "${input}"`;
      }
      return numbers; 
    } else { 
      if (numbersStr.length !== game.numbersToPick) {
        return `Please enter exactly ${game.numbersToPick} numbers for ${game.name}. Input: "${input}"`;
      }
      const numbers = numbersStr.map(Number);
      if (numbers.some(isNaN)) {
        return `All inputs must be numbers. Input: "${input}"`;
      }
      if (numbers.some(n => n < (game.digitMinNumber ?? 1) || n > game.maxNumber || !Number.isInteger(n))) {
        return `All numbers must be integers between ${game.digitMinNumber ?? 1} and ${game.maxNumber}. Input: "${input}"`;
      }
      if (!game.isOrderSignificant && new Set(numbers).size !== numbers.length) {
        return `All numbers in a draw must be unique for this game type. Input: "${input}"`;
      }
      return game.isOrderSignificant ? numbers : numbers.sort((a, b) => a - b);
    }
  };

  const handleAddDraw = useCallback(() => {
    setError('');
    const result = validateAndParseDraw(currentDrawInput, selectedGame);
    if (typeof result === 'string') {
      setError(result);
      return;
    }
    onAddDraw(result);
    setCurrentDrawInput('');
  }, [currentDrawInput, selectedGame, onAddDraw]);

  const processCsvText = (text: string, game: LottoGame): { parsedDraws: DrawResult[], errors: string[] } => {
    const lines = text.split(/\r\n|\n/).map(line => line.trim()).filter(line => line.length > 0);
    const parsedDraws: DrawResult[] = [];
    const errors: string[] = [];

    lines.forEach((line, index) => {
      const result = validateAndParseDraw(line, game);
      if (typeof result === 'string') {
        errors.push(`Line ${index + 1} ('${line}'): ${result}`);
      } else {
        parsedDraws.push(result);
      }
    });
    return { parsedDraws, errors };
  };

  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setFileError('');
    setSampleDataError('');
    const file = event.target.files?.[0];
    if (!file) {
        setFileName('No file chosen');
        return;
    }

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (!text) {
        setFileError("Could not read file content.");
        return;
      }
      
      const { parsedDraws, errors } = processCsvText(text, selectedGame);

      if (errors.length > 0) {
        setFileError(`Errors in CSV file:\n- ${errors.slice(0, 5).join('\n- ')}${errors.length > 5 ? `\n...and ${errors.length - 5} more errors.` : ''}`);
        return; 
      }
      
      if (parsedDraws.length === 0 && text.split(/\r\n|\n/).map(line => line.trim()).filter(line => line.length > 0).length > 0) {
        setFileError("CSV file contained data, but no valid draws were parsed. Check format.");
        return;
      }
      if (parsedDraws.length === 0) {
        setFileError("CSV file is empty or contains no processable lines.");
        return;
      }

      onAddMultipleDraws(parsedDraws);
      setFileError('');
      if (fileInputRef.current) {
        fileInputRef.current.value = ""; 
      }
      setFileName('No file chosen'); 
    };
    reader.onerror = () => {
      setFileError("Failed to read file.");
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      setFileName('No file chosen');
    }
    reader.readAsText(file);
  }, [selectedGame, onAddMultipleDraws]);

  const handleLoadSampleData = useCallback(() => {
    setFileError('');
    setSampleDataError('');
    try {
      const text = sampleCsvData; // Use imported string

      if (!text) {
        setSampleDataError("Sample data is empty or could not be read.");
        return;
      }

      const { parsedDraws, errors } = processCsvText(text, selectedGame);

      if (errors.length > 0) {
        setSampleDataError(`Errors in sample data:\n- ${errors.slice(0, 5).join('\n- ')}${errors.length > 5 ? `\n...and ${errors.length - 5} more errors.` : ''}`);
        return;
      }
      
      if (parsedDraws.length === 0) {
        setSampleDataError("Sample data contained no valid draws. Check format.");
        return;
      }
      
      onAddMultipleDraws(parsedDraws);
      setSampleDataError('');
    } catch (err) {
      console.error("Error processing sample data:", err);
      if (err instanceof Error) {
        setSampleDataError(`Error processing sample data: ${err.message}`);
      } else {
        setSampleDataError("An unknown error occurred while processing sample data.");
      }
    }
  }, [selectedGame, onAddMultipleDraws]);


  return (
    <div className="md-card">
      <h2 className="md-typography-headline-medium mb-6" style={{color: 'var(--md-sys-color-primary)'}}>Input 3 Digit Lotto Data</h2>
      
      <div className="md-select-wrapper mb-6">
        <select
          id="lotto-game"
          value={selectedGame.id}
          onChange={(e) => {
            onGameChange(e.target.value);
            // Add class to show selected value color, remove if placeholder shown
            if (e.target.value) {
              e.target.classList.add('md-select-value');
            } else {
              e.target.classList.remove('md-select-value');
            }
          }}
          className={`md-select ${selectedGame.id ? 'md-select-value' : ''}`}
          required 
        >
          {LOTTO_GAMES.map(game => (
            <option key={game.id} value={game.id}>
              {game.name} ({game.numbersToPick} digits, {game.digitMinNumber ?? 1}-{game.maxNumber} each)
            </option>
          ))}
        </select>
        <label htmlFor="lotto-game" className="md-select-label">
          Selected Lotto Game
        </label>
         {selectedGame.drawDays && <p className="md-typography-label-small mt-1 subtle-text">Draw Days: {selectedGame.drawDays}</p>}
      </div>

      <div className="mb-6">
        <div className="md-text-field-wrapper">
          <input
            id="draw-input"
            type="text"
            value={currentDrawInput}
            onChange={(e) => setCurrentDrawInput(e.target.value)}
            placeholder=" " 
            className="md-text-field"
            aria-label="Enter draw result"
          />
          <label htmlFor="draw-input" className="md-text-field-label">
            Enter Past Draw (e.g., 1,2,3 or 0 5 9)
          </label>
        </div>
        <button
            onClick={handleAddDraw}
            className="md-button md-button--filled w-full"
          >
            Add Draw
        </button>
        {error && <p className="md-error-text mt-2" role="alert">{error}</p>}
      </div>
      
      <div className="mb-4">
        <label htmlFor="csv-upload" className="md-typography-label-large mb-2 block">
          Upload Past Draws (CSV):
        </label>
        <p className="md-typography-label-medium subtle-text mb-2">
          Format: Each line one draw, 3 digits (commas, hyphens, or spaces). Ex: "1,2,3" or "0-5-9".
        </p>
        <div className="md-file-input-wrapper">
            <input
                id="csv-upload"
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                ref={fileInputRef}
                className="md-file-input"
                aria-label="Upload CSV file"
            />
            <div className="md-file-input-facade" aria-hidden="true">
                <span>{fileName}</span>
                <UploadFileIcon className="md-file-input-facade-icon" />
            </div>
        </div>
        {fileError && <p className="md-error-text mt-2 whitespace-pre-line" role="alert">{fileError}</p>}
      </div>
      
      <div className="mb-6">
        <button
            onClick={handleLoadSampleData}
            className="md-button md-button--tonal w-full"
        >
            Load Sample Data
        </button>
        {sampleDataError && <p className="md-error-text mt-2 whitespace-pre-line" role="alert">{sampleDataError}</p>}
      </div>


      {recentDraws.length > 0 && (
        <div>
          <div className="flex justify-between items-center mb-3">
            <h3 className="md-typography-title-medium" style={{color: 'var(--md-sys-color-secondary)'}}>Entered Draws ({recentDraws.length}) - Newest First:</h3>
            <button
              onClick={onClearDraws}
              className="md-button md-button--text"
              style={{color: 'var(--md-sys-color-tertiary)', paddingLeft: '0.5rem', paddingRight: '0.5rem'}}
            >
              Clear All
            </button>
          </div>
          <div className="max-h-60 overflow-y-auto p-4" style={{backgroundColor: 'var(--md-sys-color-surface-variant)', borderRadius: 'var(--md-sys-shape-corner-medium)'}}>
            <div className="space-y-2">
              {recentDraws.map((draw, index) => (
                <div key={index} className="flex justify-between items-center p-3 list-item-bg" style={{borderRadius: 'var(--md-sys-shape-corner-small)'}}>
                  <span className="md-typography-body-medium list-item-text-color" style={{fontVariantNumeric: 'tabular-nums'}}>{draw.join(' - ')}</span>
                  <button
                    onClick={() => onRemoveDraw(index)}
                    aria-label={`Remove draw ${draw.join(', ')}`}
                    className="md-button md-button--text list-item-remove-button md-typography-label-small"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LottoForm;