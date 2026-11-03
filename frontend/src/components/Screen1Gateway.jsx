import React from 'react';

export default function Screen1Gateway({ onSelect }) {
  return (
    <div className="gateway-container">
      {/* Hero Header */}
      <div className="gateway-hero">
        <h1 className="gateway-title">How would you like to get started?</h1>
        <p className="gateway-subtitle">
          Choose the easiest way to bring your experience into your resume.
        </p>
      </div>

      {/* Two Clean Action Cards */}
      <div className="gateway-cards-grid">
        
        {/* Card 1: Upload LinkedIn PDF */}
        <div className="action-card" onClick={() => onSelect('upload')}>
          <div className="card-top-content">
            <div className="card-icon-wrapper">
              <svg width="40" height="46" viewBox="0 0 40 46" fill="none">
                <path
                  d="M4 2C2.89543 2 2 2.89543 2 4V42C2 43.1046 2.89543 44 4 44H36C37.1046 44 38 43.1046 38 42V14L26 2H4Z"
                  stroke="#0f172a"
                  strokeWidth="2.2"
                  fill="#ffffff"
                />
                <path d="M26 2V14H38" stroke="#0f172a" strokeWidth="2.2" />
                <rect x="5" y="19" width="20" height="13" rx="3" fill="#dc2626" />
                <text
                  x="7.5"
                  y="28.5"
                  fill="#ffffff"
                  fontSize="8.5"
                  fontWeight="bold"
                  fontFamily="Arial, sans-serif"
                >
                  PDF
                </text>
              </svg>
            </div>

            <h2 className="card-heading">Upload your LinkedIn PDF</h2>
            <p className="card-description">
              Export your profile from LinkedIn and upload the PDF. We'll organize your experience, skills, and education for you.
            </p>

            <ul className="card-checklist">
              <li>
                <span className="check-bubble">
                  <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
                    <circle cx="10" cy="10" r="10" fill="#16a34a" />
                    <path d="M6 10.5L8.5 13L14 7.5" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
                <span>Less manual typing</span>
              </li>
              <li>
                <span className="check-bubble">
                  <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
                    <circle cx="10" cy="10" r="10" fill="#16a34a" />
                    <path d="M6 10.5L8.5 13L14 7.5" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
                <span>Experience and skills organized automatically</span>
              </li>
            </ul>
          </div>

          <button className="btn-outline-blue" type="button">
            Choose LinkedIn PDF &rarr;
          </button>
        </div>

        {/* Card 2: Start with Job Description */}
        <div className="action-card" onClick={() => onSelect('manual')}>
          <div className="card-top-content">
            <div className="card-icon-wrapper">
              <svg width="40" height="46" viewBox="0 0 40 46" fill="none">
                <path
                  d="M5 3C3.89543 3 3 3.89543 3 5V41C3 42.1046 3.89543 43 5 43H28C29.1046 43 30 42.1046 30 41V13L20 3H5Z"
                  stroke="#0f172a"
                  strokeWidth="2.2"
                  fill="#ffffff"
                />
                <path d="M20 3V13H30" stroke="#0f172a" strokeWidth="2.2" />
                <path d="M8 20H18M8 25H16M8 30H20" stroke="#0f172a" strokeWidth="2" strokeLinecap="round" />
                <path
                  d="M21 28L33 16L37 20L25 32L19 33L21 28Z"
                  fill="#2563eb"
                  stroke="#0f172a"
                  strokeWidth="1.8"
                  strokeLinejoin="round"
                />
              </svg>
            </div>

            <h2 className="card-heading">Start with a job description</h2>
            <p className="card-description">
              Paste the role you're targeting, then add your details to build a resume tailored to that opportunity.
            </p>

            <ul className="card-checklist">
              <li>
                <span className="check-bubble">
                  <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
                    <circle cx="10" cy="10" r="10" fill="#16a34a" />
                    <path d="M6 10.5L8.5 13L14 7.5" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
                <span>Build around your target role</span>
              </li>
              <li>
                <span className="check-bubble">
                  <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
                    <circle cx="10" cy="10" r="10" fill="#16a34a" />
                    <path d="M6 10.5L8.5 13L14 7.5" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
                <span>Review every detail as you go</span>
              </li>
            </ul>
          </div>

          <button className="btn-solid-dark" type="button">
            Enter details manually &rarr;
          </button>
        </div>

      </div>
    </div>
  );
}