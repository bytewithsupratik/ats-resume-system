import React, { useState } from 'react';
import Screen1Gateway from './components/Screen1Gateway';
import Screen2Form from './components/Screen2Form';
import Screen3Dashboard from './components/Screen3Dashboard';
import './App.css';

export default function App() {
  const [step, setStep] = useState(1);
  const [mode, setMode] = useState('upload');
  const [result, setResult] = useState(null);
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [statusText, setStatusText] = useState('');
  const [error, setError] = useState('');

  const chooseMode = (selectedMode) => {
    setMode(selectedMode);
    setError('');
    setStep(2);
  };

  const onAnalysisDone = (analysisData, initialProfile) => {
    localStorage.removeItem('ats_editor_verified_state');
    localStorage.removeItem('ats_editor_localhost_state');
    setProfileData(initialProfile);
    setResult(analysisData);
    setLoading(false);
    setStep(3);
  };

  const resetAll = () => {
    localStorage.removeItem('ats_editor_verified_state');
    localStorage.removeItem('ats_editor_localhost_state');
    setStep(1);
    setResult(null);
    setProfileData(null);
    setError('');
    setLoading(false);
  };

  return (
    <div className={`app-shell ${step === 3 ? 'dashboard-view' : ''}`}>
      {/* Upper Navigation Bar with Branding on Left and Print Button on Right */}
      <header className="top-nav no-print">
        <div className="nav-container">
          <div className="logo" onClick={resetAll}>
            <span className="badge">ATS</span>
            <span className="logo-title">Resume Editor</span>
          </div>

          {/* Change #2: Print button moved into upper navigation bar */}
          {step === 3 && (
            <button className="btn-primary" onClick={() => window.print()}>
              Print / Save ATS PDF
            </button>
          )}
        </div>
      </header>

      <main className="content-area">
        {error && (
          <div className="error-box no-print">
            <span>{error}</span>
            <button onClick={() => setError('')}>&times;</button>
          </div>
        )}

        {loading && (
          <div className="loading-modal no-print">
            <div className="loader" />
            <p className="loading-title">{statusText || 'Processing...'}</p>
            <p className="loading-sub">Analyzing competencies and tailoring against target Job Description</p>
          </div>
        )}

        {step === 1 && <Screen1Gateway onSelect={chooseMode} />}

        {step === 2 && (
          <Screen2Form
            mode={mode}
            onBack={() => setStep(1)}
            onSuccess={onAnalysisDone}
            setLoading={setLoading}
            setStatusText={setStatusText}
            setError={setError}
          />
        )}

        {step === 3 && (
          <Screen3Dashboard
            data={result}
            fallbackProfile={profileData}
          />
        )}
      </main>
    </div>
  );
}