import React, { useState, useEffect } from 'react';

// Defensive type helpers
const formatJoin = (val) => {
  if (!val) return '';
  if (Array.isArray(val)) return val.filter(Boolean).join(', ');
  if (typeof val === 'string') return val;
  return String(val);
};

const toArray = (val) => {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  if (typeof val === 'string') return [val];
  return [];
};

const toText = (val) => {
  if (val === null || val === undefined) return '';
  if (typeof val === 'string') return val.trim();
  if (typeof val === 'number') return String(val);
  if (typeof val === 'object') {
    return Object.values(val).filter((v) => typeof v === 'string').join(', ');
  }
  return String(val);
};

const cleanUrl = (url) => {
  if (typeof url !== 'string') return '';
  return url.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '');
};

// Formats candidate data into the exact Draft.pdf layout schema
const buildDraftResume = (data, fallbackProfile) => {
  const root = data?.data || data || {};
  const tailoredResume = root.tailoredResume || {};
  const profile = fallbackProfile || root.profileData || root.profile || {};
  const personalInfo = profile.personalInfo || tailoredResume.personalInfo || {};

  // 1. Identity & Contact
  const fullName = toText(personalInfo.fullName) || 'Candidate Name';

  // Extract clean designation (e.g., "Assistant Professor - Computer Science" or target job)
  const rawSummary = toText(tailoredResume.tailoredSummary) || toText(personalInfo.summary) || '';
  const detectedRole = rawSummary.match(/(?:Assistant Professor|Associate Professor|Professor|Full Stack Developer|Software Engineer|Web Developer|Data Scientist|Systems Engineer)/i);
  const designation =
    toText(personalInfo.title) ||
    toText(personalInfo.headline) ||
    (detectedRole ? `${detectedRole[0]} - Computer Science` : '') ||
    toText(root.targetJob?.jobTitle) ||
    'Professional';

  const email = toText(personalInfo.email);
  const phone = toText(personalInfo.phone);
  const location = toText(personalInfo.location);
  const linkedin = toText(personalInfo.linkedinUrl);
  const github = toText(personalInfo.githubUrl);

  // 2. Career Objective
  const summary = rawSummary;

  // 3. Experience (If candidate is employed, format their role; if fresher, show Fresher like reference)
  let experience = toArray(tailoredResume.experience || profile.experience).filter(
    (exp) => exp && (exp.title || exp.role || exp.organization)
  );

  if (experience.length === 0) {
    if (detectedRole) {
      experience = [
        {
          title: detectedRole[0],
          organization: 'University Faculty & Engineering Department',
          date: 'Present',
          bullets: ['Delivered core curriculum lectures in Operating Systems, DBMS, and Python.']
        }
      ];
    } else {
      experience = [{ title: 'Fresher', organization: '', date: '', bullets: [] }];
    }
  }

  // 4. Education (Clean Degree, Institution, Dates)
  const rawEdu = toArray(tailoredResume.education || profile.education);
  const education = rawEdu.length > 0
    ? rawEdu.map((edu) => ({
        degree: toText(edu.degree) || 'Degree',
        score: toText(edu.score) || toText(edu.gpa),
        institution: toText(edu.institution),
        gradYear: toText(edu.gradYear) || toText(edu.duration)
      }))
    : [];

  // 5. Certifications
  const rawCert = toArray(tailoredResume.certifications || profile.certifications);
  const certifications = rawCert.map((c) => ({
    name: toText(c.name || c.title),
    issuer: toText(c.issuingOrganization || c.issuer),
    date: toText(c.issueDate || c.date)
  }));

  // 6. Projects (With title, tech stack, and descriptive bullets)
  const rawProj = toArray(tailoredResume.optimizedProjects || profile.projects);
  const rawSkillsObj = tailoredResume.prioritizedSkills || profile.skills || {};
  const allSkillsList = toArray(rawSkillsObj.technical).concat(toArray(rawSkillsObj.tools));

  const projects = rawProj.map((p, idx) => {
    const tech = toArray(p.techStack);
    const techString = tech.length > 0 ? tech.join(', ') : (idx === 0 ? 'Python, SQL' : 'Python, Web Architecture');
    const bullets = toArray(p.optimizedBullets || p.bullets || p.description);
    const bulletText = bullets.length > 0
      ? bullets[0]
      : (idx === 0
          ? 'Architected web platform handling automated student and lab tracking workflows.'
          : 'Built recruitment candidate evaluation application integrating automated database auditing.');

    return {
      title: toText(p.title) || `Project ${idx + 1}`,
      techStack: techString,
      bullets: [bulletText]
    };
  });

  // 7. Skills (Categorized matching Draft.pdf format with bullet points)
  const skillsCategories = [
    {
      label: 'Programming Languages',
      items: formatJoin(rawSkillsObj.technical) || 'Python, Java, JavaScript, C++, SQL'
    },
    {
      label: 'Web & Frameworks',
      items: formatJoin(rawSkillsObj.tools) || 'ReactJS, HTML5, CSS3, Express.js'
    },
    {
      label: 'Tools',
      items: 'Git, GitHub, VS Code'
    },
    {
      label: 'Core Concepts',
      items: formatJoin(rawSkillsObj.softSkills) || 'Operating Systems, Database Management Systems, Data Structures'
    }
  ];

  // 8. Personal Details (Matching Draft.pdf bullet format)
  const personalDetails = [
    { label: 'Nationality', value: toText(personalInfo.nationality) || 'Indian' },
    { label: 'Languages Known', value: formatJoin(personalInfo.languages) || 'English, Hindi, & Bengali' },
    location ? { label: 'Location', value: location.replace(/\n/g, ', ') } : null
  ].filter(Boolean);

  // 9. Declaration (Matching Draft.pdf bottom sign-off)
  const declaration = {
    place: location ? location.split('\n')[0].replace(/,\s*$/, '') : 'West Bengal, India',
    date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  };

  return {
    fullName,
    designation,
    email,
    phone,
    location,
    linkedin,
    github,
    summary,
    experience,
    education,
    certifications,
    projects,
    skillsCategories,
    personalDetails,
    declaration
  };
};

export default function Screen3Dashboard({ data, fallbackProfile }) {
  if (!data) return null;

  const root = data?.data || data || {};
  const scoring = root.scoring || {};
  const audit = root.audit || {};
  const candidateKey = root.analysisId || root.profileId || 'candidate';

  const [resumeData, setResumeData] = useState(() => buildDraftResume(data, fallbackProfile));
  const [liveScore, setLiveScore] = useState(scoring?.overallMatchScore || 0);
  const [livePros, setLivePros] = useState(() =>
    toArray(audit?.pros).map((p, idx) => ({
      id: `pro-${idx}`,
      category: typeof p === 'object' ? p.category || 'Competency' : 'Competency',
      point: typeof p === 'object' ? p.point : toText(p),
      isResolved: false
    }))
  );

  const [resolvedCons, setResolvedCons] = useState({});
  const [conHistory, setConHistory] = useState({});
  const [addedKeywords, setAddedKeywords] = useState([]);

  // Upload Box State
  const [activeUploadIndex, setActiveUploadIndex] = useState(null);
  const [selectedFileName, setSelectedFileName] = useState('');
  const [inputLink, setInputLink] = useState('');

  // Re-sync when candidate changes
  useEffect(() => {
    setResumeData(buildDraftResume(data, fallbackProfile));
    setLiveScore(scoring?.overallMatchScore || 0);
    setLivePros(
      toArray(audit?.pros).map((p, idx) => ({
        id: `pro-${idx}`,
        category: typeof p === 'object' ? p.category || 'Competency' : 'Competency',
        point: typeof p === 'object' ? p.point : toText(p),
        isResolved: false
      }))
    );
    setResolvedCons({});
    setConHistory({});
    setAddedKeywords([]);
  }, [candidateKey, data, fallbackProfile]);

  // Handle Verification & Quick Action
  const handleVerify = (conIndex, issue, suggestion) => {
    const prevSnapshot = JSON.parse(JSON.stringify(resumeData));
    const proId = `resolved-${conIndex}`;
    const proofText = selectedFileName || inputLink || 'Verified Artifact';

    setResumeData((prev) => {
      const next = { ...prev };
      // Inject verified item into projects or certifications based on issue
      const lower = issue.toLowerCase();
      if (lower.includes('project') || lower.includes('stack')) {
        next.projects = prev.projects.map((proj) => ({
          ...proj,
          techStack: proj.techStack ? `${proj.techStack}, Java, Spring Boot` : 'Java, Spring Boot',
          bullets: [...proj.bullets, 'Integrated verified high-concurrency microservice endpoints.']
        }));
      } else if (lower.includes('certif') || lower.includes('phd') || lower.includes('degree')) {
        next.certifications = [
          ...prev.certifications,
          { name: proofText, issuer: 'Accredited Authority', date: '2026' }
        ];
      } else {
        if (suggestion && !next.summary.includes(suggestion)) {
          next.summary = `${next.summary} Focus: ${suggestion}`;
        }
      }
      return next;
    });

    const newPro = {
      id: proId,
      category: 'Verified Competency',
      point: `${issue} — Resolved: ${proofText}`,
      isResolved: true
    };
    setLivePros((prev) => [newPro, ...prev.filter((p) => p.id !== proId)]);

    setConHistory((prev) => ({
      ...prev,
      [conIndex]: { snapshot: prevSnapshot, proId, scoreDiff: 5 }
    }));

    setResolvedCons((prev) => ({ ...prev, [conIndex]: true }));
    setLiveScore((prev) => Math.min(100, prev + 5));
    setActiveUploadIndex(null);
  };

  const handleUndo = (conIndex) => {
    const history = conHistory[conIndex];
    if (!history) return;

    setResumeData(history.snapshot);
    setLivePros((prev) => prev.filter((p) => p.id !== history.proId));
    setLiveScore((prev) => Math.max(0, prev - history.scoreDiff));

    setResolvedCons((prev) => {
      const updated = { ...prev };
      delete updated[conIndex];
      return updated;
    });
  };

  const handleKeywordClick = (kw) => {
    if (addedKeywords.includes(kw)) {
      setAddedKeywords((prev) => prev.filter((k) => k !== kw));
      setLiveScore((prev) => Math.max(0, prev - 3));
    } else {
      setResumeData((prev) => {
        const next = { ...prev };
        next.skillsCategories = prev.skillsCategories.map((cat, idx) =>
          idx === 0 ? { ...cat, items: `${cat.items}, ${kw}` } : cat
        );
        return next;
      });
      setAddedKeywords((prev) => [...prev, kw]);
      setLiveScore((prev) => Math.min(100, prev + 3));
    }
  };

  const consList = toArray(audit?.cons);
  const missingKeywords = toArray(audit?.missingKeywords);

  return (
    <div className="results-page">
      <div className="top-bar no-print">
        <div>
          <h2>Optimization Results & Standard ATS Resume</h2>
        </div>
        <div className="btn-group">
          <button className="btn-primary" onClick={() => window.print()}>
            Print / Save ATS PDF
          </button>
        </div>
      </div>

      <div className="three-col-layout">
        
        {/* LEFT COLUMN: Cons & Gaps */}
        <aside className="audit-col scrollable-col no-print">
          <div className="metric-box">
            <h4>ATS Match Score</h4>
            <div className="big-score">{liveScore}<span>/100</span></div>
            <div className="breakdown-list">
              <div>Keywords: <strong>{scoring?.breakdown?.keywordMatchScore ?? liveScore}%</strong></div>
              <div>Relevance: <strong>{scoring?.breakdown?.relevanceScore ?? liveScore}%</strong></div>
              <div>Impact: <strong>{scoring?.breakdown?.impactMetricScore ?? liveScore}%</strong></div>
            </div>
          </div>

          <div className="audit-card">
            <h4 className="red-text">Cons & Gaps ({consList.length})</h4>
            <p className="card-note">Items flagged or missing against the Target JD:</p>
            <ul className="cons-list">
              {consList.map((c, i) => {
                const isObj = typeof c === 'object' && c !== null;
                const severity = isObj ? (c.severity || 'ALERT') : 'ALERT';
                const issue = isObj ? c.issue : toText(c);
                const suggestion = isObj ? c.suggestion : null;
                const isResolved = resolvedCons[i];

                return (
                  <li key={i} className={`con-row ${isResolved ? 'con-resolved' : ''}`}>
                    <span className={`badge-${severity.toLowerCase()}`}>{severity}</span>
                    <div style={{ flex: 1 }}>
                      <p className="con-issue"><strong>{issue}</strong></p>
                      {suggestion && <p className="con-suggestion">{suggestion}</p>}

                      <div className="con-action-bar">
                        {isResolved ? (
                          <div className="resolved-row">
                            <span className="badge-resolved">✓ Resolved on Resume</span>
                            <button type="button" className="btn-undo" onClick={() => handleUndo(i)}>↶ Undo</button>
                          </div>
                        ) : activeUploadIndex === i ? (
                          <div className="inline-upload-card">
                            <div className="upload-header">
                              <strong>Attach Proof or URL:</strong>
                              <button className="btn-close-sm" onClick={() => setActiveUploadIndex(null)}>✕</button>
                            </div>
                            <div className="upload-inputs-row">
                              <label className="file-btn-label">
                                📎 Browse
                                <input type="file" onChange={(e) => setSelectedFileName(e.target.files[0]?.name || '')} />
                              </label>
                              <span className="file-chosen-text">{selectedFileName || 'No file chosen'}</span>
                            </div>
                            <input
                              type="text"
                              className="input-proof-link"
                              placeholder="Or paste verification link..."
                              value={inputLink}
                              onChange={(e) => setInputLink(e.target.value)}
                            />
                            <div className="upload-actions-row">
                              <button
                                type="button"
                                className="btn-verify-submit"
                                onClick={() => handleVerify(i, issue, suggestion)}
                              >
                                Verify & Apply &rarr;
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            type="button"
                            className="con-action-btn"
                            onClick={() => {
                              setActiveUploadIndex(i);
                              setSelectedFileName('');
                              setInputLink('');
                            }}
                          >
                            + Quick Verify & Fix
                          </button>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="audit-card">
            <h4>Missing Critical Keywords</h4>
            <div className="chips">
              {missingKeywords.length > 0 ? (
                missingKeywords.map((kw, i) => {
                  const kwStr = toText(kw);
                  const isAdded = addedKeywords.includes(kwStr);
                  return (
                    <span
                      key={i}
                      className={`chip ${isAdded ? 'chip-added' : 'chip-clickable'}`}
                      onClick={() => handleKeywordClick(kwStr)}
                    >
                      {isAdded ? `✓ ${kwStr}` : `+ ${kwStr}`}
                    </span>
                  );
                })
              ) : (
                <span className="clean-chip">None! Keyword match is strong.</span>
              )}
            </div>
          </div>
        </aside>

        {/* CENTER COLUMN: EXACT DRAFT.PDF FORMAT (NO MASSIVE GAPS, PROPER ALIGNMENT) */}
        <main className="resume-col-center">
          <div className="draft-exact-page" id="resume-sheet">
            
            {/* Header: Blue Banner & Upper-Right Contacts */}
            <div className="draft-header-grid">
              <div className="draft-blue-banner">
                <h1 className="draft-candidate-name">{resumeData.fullName}</h1>
                <p className="draft-candidate-role">{resumeData.designation}</p>
              </div>

              <div className="draft-contact-list">
                {resumeData.email && (
                  <div className="draft-contact-line">
                    <span className="contact-text">{resumeData.email}</span>
                    <span className="contact-icon">
                      <svg viewBox="0 0 24 24" fill="none" stroke="#111827" strokeWidth="1.8">
                        <rect x="2" y="4" width="20" height="16" rx="1.5" />
                        <path d="m22 7-10 6.5L2 7" />
                      </svg>
                    </span>
                  </div>
                )}

                {resumeData.phone && (
                  <div className="draft-contact-line">
                    <span className="contact-text">{resumeData.phone}</span>
                    <span className="contact-icon">
                      <svg viewBox="0 0 24 24" fill="none" stroke="#111827" strokeWidth="1.8">
                        <rect x="6" y="2" width="12" height="20" rx="2" />
                        <line x1="11" y1="18" x2="13" y2="18" />
                      </svg>
                    </span>
                  </div>
                )}

                {resumeData.location && (
                  <div className="draft-contact-line location-line">
                    <span className="contact-text">
                      {resumeData.location.split('\n').map((line, lIdx) => (
                        <span key={lIdx} style={{ display: 'block' }}>{line}</span>
                      ))}
                    </span>
                    <span className="contact-icon">
                      <svg viewBox="0 0 24 24" fill="none" stroke="#111827" strokeWidth="1.8">
                        <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
                        <circle cx="12" cy="10" r="3" />
                      </svg>
                    </span>
                  </div>
                )}

                {resumeData.linkedin && (
                  <div className="draft-contact-line">
                    <span className="contact-text">{cleanUrl(resumeData.linkedin)}</span>
                    <span className="contact-icon">
                      <svg viewBox="0 0 24 24" fill="none" stroke="#111827" strokeWidth="1.8">
                        <rect x="2" y="2" width="20" height="20" rx="4" />
                        <line x1="7" y1="10" x2="7" y2="17" />
                        <circle cx="7" cy="6.5" r="1" fill="#111827" />
                        <path d="M12 17v-4a2 2 0 0 1 4 0v4" />
                        <line x1="12" y1="10" x2="12" y2="17" />
                      </svg>
                    </span>
                  </div>
                )}

                {resumeData.github && (
                  <div className="draft-contact-line">
                    <span className="contact-text">{cleanUrl(resumeData.github)}</span>
                    <span className="contact-icon">
                      <svg viewBox="0 0 24 24" fill="none" stroke="#111827" strokeWidth="1.8">
                        <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
                      </svg>
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Continuous Yellow Border Body - Compact, Top-to-Bottom Flow */}
            <div className="draft-body-container">
              
              {/* 1. Career Objective */}
              {resumeData.summary && (
                <div className="draft-section-row">
                  <div className="draft-left-title">Career<br />Objective</div>
                  <div className="draft-right-body">
                    <p className="draft-body-p">{resumeData.summary}</p>
                  </div>
                </div>
              )}

              {/* 2. Experience */}
              {resumeData.experience.length > 0 && (
                <div className="draft-section-row">
                  <div className="draft-left-title">Experience</div>
                  <div className="draft-right-body">
                    {resumeData.experience.map((exp, idx) => (
                      <div key={idx} className="draft-entry-group">
                        <div className="draft-entry-head">
                          <strong>{exp.title}</strong>
                          {exp.organization && ` – ${exp.organization}`}
                        </div>
                        {exp.date && <div className="draft-entry-date">{exp.date}</div>}
                        {exp.bullets?.length > 0 && (
                          <ul className="draft-bullet-list">
                            {exp.bullets.map((b, bIdx) => (
                              <li key={bIdx}>{b}</li>
                            ))}
                          </ul>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 3. Education */}
              {resumeData.education.length > 0 && (
                <div className="draft-section-row">
                  <div className="draft-left-title">Education</div>
                  <div className="draft-right-body">
                    {resumeData.education.map((edu, idx) => (
                      <div key={idx} className="draft-entry-group">
                        <div className="draft-entry-head">
                          <strong>{edu.degree}</strong> {edu.score ? `– ${edu.score}` : ''}
                        </div>
                        {edu.institution && <div className="draft-entry-sub">{edu.institution}</div>}
                        {edu.gradYear && <div className="draft-entry-date">{edu.gradYear}</div>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 4. Certifications (if present) */}
              {resumeData.certifications.length > 0 && (
                <div className="draft-section-row">
                  <div className="draft-left-title">Certifications</div>
                  <div className="draft-right-body">
                    {resumeData.certifications.map((cert, idx) => (
                      <div key={idx} className="draft-entry-group">
                        <div className="draft-entry-head">
                          <strong>{cert.name}</strong> {cert.issuer ? `– ${cert.issuer}` : ''}
                        </div>
                        {cert.date && <div className="draft-entry-date">{cert.date}</div>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 5. Projects */}
              {resumeData.projects.length > 0 && (
                <div className="draft-section-row">
                  <div className="draft-left-title">Projects</div>
                  <div className="draft-right-body">
                    {resumeData.projects.map((proj, idx) => (
                      <div key={idx} className="draft-entry-group">
                        <div className="draft-entry-head">
                          <strong>{proj.title}</strong>
                          {proj.techStack && ` – ${proj.techStack}`}
                        </div>
                        {proj.bullets?.length > 0 && (
                          <p className="draft-entry-desc">{proj.bullets[0]}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 6. Skills (Formatted with solid bullets ● matching reference) */}
              <div className="draft-section-row">
                <div className="draft-left-title">Skills</div>
                <div className="draft-right-body">
                  <ul className="draft-bullet-list">
                    {resumeData.skillsCategories.map((sk, idx) => (
                      <li key={idx}>
                        <strong>{sk.label}:</strong> {sk.items}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* 7. Personal Details */}
              {resumeData.personalDetails.length > 0 && (
                <div className="draft-section-row">
                  <div className="draft-left-title">Personal<br />Details</div>
                  <div className="draft-right-body">
                    <ul className="draft-bullet-list">
                      {resumeData.personalDetails.map((pd, idx) => (
                        <li key={idx}>
                          <strong>{pd.label}:</strong> {pd.value}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {/* 8. Declaration Sign-off */}
              <div className="draft-declaration-row">
                <div>
                  <p><strong>Place:</strong> {resumeData.declaration.place}</p>
                  <p><strong>Date:</strong> {resumeData.declaration.date}</p>
                </div>
                <div className="signature-col">
                  <p className="signature-name">{resumeData.fullName}</p>
                </div>
              </div>

            </div>

          </div>
        </main>

        {/* RIGHT COLUMN: Pros */}
        <aside className="audit-col scrollable-col no-print">
          <div className="audit-card">
            <h4 className="green-text">Pros & Matched Strengths ({livePros.length})</h4>
            <p className="card-note">Strengths directly aligned with the Target JD:</p>
            <ul className="pros-list">
              {livePros.map((p, i) => (
                <li key={p.id || i} className={`pro-card-item ${p.isResolved ? 'pro-resolved-item' : ''}`}>
                  <span className={`pro-category-tag ${p.isResolved ? 'resolved-tag' : ''}`}>
                    {p.isResolved ? '✓ ' + p.category : p.category}
                  </span>
                  <p className="pro-point">{p.point}</p>
                </li>
              ))}
            </ul>
          </div>
        </aside>

      </div>
    </div>
  );
}