import React from 'react';

export default function Screen1Gateway({ onSelect }) {
  return (
    <div className="gateway-box">
      <h2>How do you want to start?</h2>
      <p className="subtitle">Pick an option to load your profile before analyzing against the JD.</p>

      <div className="cards-row">
        <div className="card-item" onClick={() => onSelect('upload')}>
          <span className="pill">Quick</span>
          <h3>Upload LinkedIn PDF</h3>
          <p>Export your profile as PDF from LinkedIn and let the backend parse it automatically.</p>
          <button className="btn-secondary" type="button">Use PDF</button>
        </div>

        <div className="card-item" onClick={() => onSelect('manual')}>
          <span className="pill neutral">Custom</span>
          <h3>Fill Form Manually</h3>
          <p>Type in your details, tech stack, and achievements manually if you don't have a PDF.</p>
          <button className="btn-secondary" type="button">Fill Form</button>
        </div>
      </div>
    </div>
  );
}