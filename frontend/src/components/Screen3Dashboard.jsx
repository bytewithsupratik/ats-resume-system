import React from 'react';

export default function Screen3Dashboard({ data, onBack }) {
  if (!data) return null;

  const { scoring, audit, tailoredResume } = data;
  const score = scoring?.overallMatchScore || 0;

  return (
    <div className="results-page">
      <div className="top-bar no-print">
        <div>
          <h2>Optimization Results</h2>
          <p>Review the audit report on the left and print the ATS resume on the right.</p>
        </div>
        <div className="btn-group">
          <button className="btn-secondary" onClick={onBack}>&larr; Back</button>
          <button className="btn-primary" onClick={() => window.print()}>Print / Save PDF</button>
        </div>
      </div>

      <div className="two-col-layout">
        {/* Left Side: Audit */}
        <aside className="audit-sidebar no-print">
          <div className="metric-box">
            <h4>Match Score</h4>
            <div className="big-score">{score}<span>/100</span></div>
            <div className="breakdown-list">
              <div>Keywords: <strong>{scoring?.breakdown?.keywordMatchScore ?? score}%</strong></div>
              <div>Relevance: <strong>{scoring?.breakdown?.relevanceScore ?? score}%</strong></div>
              <div>Impact: <strong>{scoring?.breakdown?.impactMetricScore ?? score}%</strong></div>
            </div>
          </div>

          <div className="audit-card">
            <h4 className="green-text">Pros</h4>
            <ul>
              {audit?.pros?.map((p, i) => (
                <li key={i}>
                  <strong>{p.category}:</strong> {p.point}
                </li>
              ))}
            </ul>
          </div>

          <div className="audit-card">
            <h4 className="red-text">Cons & Gaps</h4>
            <ul>
              {audit?.cons?.map((c, i) => (
                <li key={i} className="con-row">
                  <span className={`badge-${c.severity?.toLowerCase() || 'medium'}`}>{c.severity}</span>
                  <div>
                    <p><strong>{c.issue}</strong></p>
                    {c.suggestion && <p className="sub-text">{c.suggestion}</p>}
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="audit-card">
            <h4>Missing Keywords</h4>
            <div className="chips">
              {audit?.missingKeywords?.map((kw, i) => (
                <span key={i} className="chip">{kw}</span>
              ))}
            </div>
          </div>
        </aside>

        {/* Right Side: ATS Resume Preview */}
        <div className="resume-sheet-container">
          <div className="resume-sheet">
            <div className="r-header">
              <h1>{tailoredResume?.personalInfo?.fullName || 'Candidate Name'}</h1>
              <p>
                {[
                  tailoredResume?.personalInfo?.location,
                  tailoredResume?.personalInfo?.phone,
                  tailoredResume?.personalInfo?.email,
                  tailoredResume?.personalInfo?.linkedinUrl,
                  tailoredResume?.personalInfo?.githubUrl
                ].filter(Boolean).join(' | ')}
              </p>
            </div>

            {tailoredResume?.tailoredSummary && (
              <section className="r-section">
                <h2>PROFESSIONAL SUMMARY</h2>
                <p>{tailoredResume.tailoredSummary}</p>
              </section>
            )}

            {tailoredResume?.prioritizedSkills && (
              <section className="r-section">
                <h2>SKILLS</h2>
                {tailoredResume.prioritizedSkills.technical?.length > 0 && (
                  <p><strong>Technical:</strong> {tailoredResume.prioritizedSkills.technical.join(', ')}</p>
                )}
                {tailoredResume.prioritizedSkills.tools?.length > 0 && (
                  <p><strong>Tools:</strong> {tailoredResume.prioritizedSkills.tools.join(', ')}</p>
                )}
                {tailoredResume.prioritizedSkills.softSkills?.length > 0 && (
                  <p><strong>Soft Skills:</strong> {tailoredResume.prioritizedSkills.softSkills.join(', ')}</p>
                )}
              </section>
            )}

            {tailoredResume?.optimizedProjects?.length > 0 && (
              <section className="r-section">
                <h2>PROJECTS & EXPERIENCE</h2>
                {tailoredResume.optimizedProjects.map((p, i) => (
                  <div key={i} className="r-item">
                    <div className="r-item-head">
                      <strong>{p.title}</strong>
                      {p.techStack?.length > 0 && <span> | {p.techStack.join(', ')}</span>}
                    </div>
                    {p.optimizedBullets?.length > 0 && (
                      <ul>
                        {p.optimizedBullets.map((b, bi) => (
                          <li key={bi}>{b}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </section>
            )}

            {tailoredResume?.education?.length > 0 && (
              <section className="r-section">
                <h2>EDUCATION</h2>
                {tailoredResume.education.map((e, i) => (
                  <div key={i} className="r-item">
                    <div className="r-item-head">
                      <strong>{e.institution}</strong>
                      <span>{e.gradYear}</span>
                    </div>
                    <p>{e.degree} {e.fieldOfStudy ? `in ${e.fieldOfStudy}` : ''} {e.score ? `(${e.score})` : ''}</p>
                  </div>
                ))}
              </section>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}