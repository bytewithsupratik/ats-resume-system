import React, { useState, useEffect, useRef } from 'react';

const formatJoin = (val) => (Array.isArray(val) ? val.filter(Boolean).join(', ') : val || '');
const toArray = (val) => (Array.isArray(val) ? val.filter(Boolean) : val ? [val] : []);
const toText = (val) => (typeof val === 'string' ? val.trim() : val != null ? String(val) : '');
const cleanUrl = (url) => (typeof url === 'string' ? url.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '') : '');

const parseKeywords = (keywords) => {
  return toArray(keywords).map(kw => {
    if (typeof kw === 'string') return kw.trim();
    if (kw && typeof kw === 'object') {
      return kw.keyword || kw.name || kw.point || kw.title || String(kw);
    }
    return String(kw);
  }).filter(Boolean);
};

const parseCons = (cons) => {
  return toArray(cons).map(c => {
    if (typeof c === 'string') {
      return { issue: c, severity: 'MEDIUM', suggestion: '', actionType: '', targetField: '' };
    }
    return {
      issue: c.issue || c.point || c.title || String(c),
      severity: c.severity || 'MEDIUM',
      suggestion: c.suggestion || c.description || '',
      actionType: c.actionType || '',
      targetField: c.targetField || '',
      fieldLabel: c.fieldLabel || '',
      placeholder: c.placeholder || '',
      videoUrl: c.videoUrl || ''
    };
  });
};

const parsePros = (pros) => {
  return toArray(pros).map(p => {
    if (typeof p === 'string') {
      return { point: p, category: 'Competency' };
    }
    return {
      point: p.point || p.issue || p.description || String(p),
      category: p.category || 'Competency'
    };
  });
};

const resolveTarget = (con) => {
  if (con.targetField) return con.targetField;
  const issue = (con.issue || '').toLowerCase();
  
  if (issue.includes('phone') || issue.includes('mobile')) return 'phone';
  if (issue.includes('father')) return 'fatherName';
  if (issue.includes('dob') || issue.includes('birth')) return 'dob';
  if (issue.includes('gender')) return 'gender';
  if (issue.includes('nationality')) return 'nationality';
  if (issue.includes('language')) return 'languages';
  if (issue.includes('address') || issue.includes('location')) return 'location';
  if (issue.includes('linkedin')) return 'linkedin';
  if (issue.includes('github')) return 'githubUrl';
  if (issue.includes('name') && !issue.includes('father')) return 'fullName';
  if (issue.includes('certif')) return 'certifications';
  if (issue.includes('project')) return 'projects';
  if (issue.includes('experience') || issue.includes('teaching')) return 'experience';
  if (issue.includes('phd') || issue.includes('degree') || issue.includes('m.tech') || issue.includes('b.tech')) return 'education';
  if (issue.includes('skill')) return 'skill';
  return 'general';
};

const buildReferenceResume = (data, fallbackProfile) => {
  const root = data?.data || data || {};
  const tailored = root.tailoredResume || {};
  const profile = fallbackProfile || root.profileData || root.profile || {};
  const personal = profile.personalInfo || tailored.personalInfo || {};

  const designation = toText(
    root.targetJob?.jobTitle || 
    tailored.targetJobTitle || 
    personal.title || 
    'Professional'
  );

  // Experience Extraction & Total Years calculation
  const rawExp = toArray(tailored.experience || profile.experience);
  const isFresher = rawExp.length === 0;
  const totalExperienceYears = isFresher ? "0 Years (Fresher)" : `${rawExp.length >= 3 ? '3+' : rawExp.length} Years of Working Experience`;

  // Education Filter: Strictly 12th onwards (Exclude 10th and early schooling)
  const rawEducation = toArray(tailored.education || profile.education);
  const filteredEducation = rawEducation
    .map((edu) => ({
      degree: toText(edu.degree),
      score: toText(edu.score || edu.gpa),
      institution: toText(edu.institution),
      gradYear: toText(edu.gradYear || edu.duration)
    }))
    .filter((edu) => {
      const text = `${edu.degree} ${edu.institution}`.toLowerCase();
      if (
        text.includes('10th') ||
        text.includes('matric') ||
        text.includes('secondary') ||
        text.includes('high school') ||
        text.includes('class x') ||
        text.includes('ssc') ||
        (text.includes('school') && !text.includes('university') && !text.includes('college') && !text.includes('institute') && !text.includes('higher secondary') && !text.includes('intermediate'))
      ) {
        return false;
      }
      return true;
    });

  return {
    fullName: toText(personal.fullName),
    designation,
    email: toText(personal.email),
    phone: toText(personal.phone),
    location: toText(personal.location),
    linkedin: cleanUrl(personal.linkedinUrl),
    github: cleanUrl(personal.githubUrl),
    summary: toText(tailored.tailoredSummary || personal.summary),
    isFresher,
    totalExperienceYears,
    education: filteredEducation,
    certifications: toArray(tailored.certifications || profile.certifications).map((c) => ({
      name: toText(c.name || c.title),
      issuer: toText(c.issuingOrganization || c.issuer),
      date: toText(c.issueDate || c.date)
    })),
    projects: toArray(tailored.optimizedProjects || profile.projects).map((p) => ({
      title: toText(p.title),
      techStack: formatJoin(p.techStack),
      description: toArray(p.optimizedBullets || p.bullets)[0] || toText(p.description)
    })),
    skillsCategories: [
      { label: 'Programming Languages', items: formatJoin(tailored.prioritizedSkills?.technical || profile.skills?.technical) },
      { label: 'Web & Frameworks', items: formatJoin(tailored.prioritizedSkills?.tools || profile.skills?.tools) },
      { label: 'Core Concepts', items: formatJoin(tailored.prioritizedSkills?.softSkills || profile.skills?.softSkills) }
    ].filter((cat) => cat.items),
    personalDetails: [
      personal.fatherName ? { label: "Father's Name", value: personal.fatherName } : null,
      personal.dob ? { label: 'Date of Birth', value: personal.dob } : null,
      personal.gender ? { label: 'Gender', value: personal.gender } : null,
      personal.nationality ? { label: 'Nationality', value: personal.nationality } : null,
      personal.languages ? { label: 'Languages Known', value: personal.languages } : null
    ].filter(Boolean),
    declaration: {
      place: personal.location ? personal.location.split(',')[0] : 'Kolkata, India',
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    }
  };
};

export default function Screen3Dashboard({ data, fallbackProfile }) {
  if (!data) return null;

  const root = data?.data || data || {};
  const scoring = root.scoring || {};
  const audit = root.audit || {};
  const profileId = root.profileId;

  const [resumeData, setResumeData] = useState(() => buildReferenceResume(data, fallbackProfile));
  const [liveScore, setLiveScore] = useState(scoring?.overallMatchScore || 0);
  const [resolvedCons, setResolvedCons] = useState({});
  const [addedKeywords, setAddedKeywords] = useState([]);

  const [activeConIndex, setActiveConIndex] = useState(null);
  const [inputValue, setInputValue] = useState('');

  const containerRef = useRef(null);
  const sheetRef = useRef(null);
  const [previewScale, setPreviewScale] = useState(1);

  useEffect(() => {
    const calcScale = () => {
      if (!containerRef.current || !sheetRef.current) return;
      const cW = containerRef.current.clientWidth - 32;
      const cH = containerRef.current.clientHeight - 32;
      const sW = sheetRef.current.offsetWidth || 612;
      const sH = sheetRef.current.offsetHeight || 792;
      if (sW > 0 && sH > 0 && cW > 0 && cH > 0) {
        setPreviewScale(Math.min(cW / sW, cH / sH, 1.02));
      }
    };
    calcScale();
    window.addEventListener('resize', calcScale);
    return () => window.removeEventListener('resize', calcScale);
  }, [resumeData]);

  const handleOpenDialog = (index) => {
    setActiveConIndex(index);
    setInputValue('');
  };

  const handleApplyFix = async (conIndex, con) => {
    if (!inputValue.trim()) return;
    const rawVal = inputValue.trim();
    const cleanVal = cleanUrl(rawVal);
    const target = resolveTarget(con);

    setResumeData((prev) => {
      const next = { ...prev };

      if (target === 'phone') next.phone = rawVal;
      else if (target === 'fullName') next.fullName = rawVal;
      else if (target === 'location') {
        next.location = rawVal;
        next.declaration = { ...next.declaration, place: rawVal.split(',')[0] };
      }
      else if (target === 'linkedin') next.linkedin = cleanVal;
      else if (target === 'githubUrl') next.github = cleanVal;
      else if (['fatherName', 'dob', 'gender', 'nationality', 'languages'].includes(target)) {
        const labelMap = {
          fatherName: "Father's Name",
          dob: 'Date of Birth',
          gender: 'Gender',
          nationality: 'Nationality',
          languages: 'Languages Known'
        };
        const label = labelMap[target];
        const updated = prev.personalDetails.filter((p) => p.label !== label);
        updated.push({ label, value: rawVal });
        next.personalDetails = updated;
      }
      else if (target === 'certifications') {
        next.certifications = [
          ...prev.certifications,
          { name: rawVal, issuer: 'Accredited Authority', date: 'Recent' }
        ];
      }
      else if (target === 'projects') {
        next.projects = [
          ...prev.projects,
          { title: rawVal, techStack: 'Python, Web Stack', description: 'Developed application workflows.' }
        ];
      }
      else if (target === 'experience') {
        next.isFresher = false;
        next.totalExperienceYears = "1+ Years of Working Experience";
      }
      else if (target === 'education') {
        next.education = [
          ...prev.education,
          { degree: rawVal, score: 'Completed', institution: 'University Department', gradYear: 'Current' }
        ];
      }
      else if (target === 'skill') {
        next.skillsCategories = prev.skillsCategories.map((cat, idx) =>
          idx === 0 ? { ...cat, items: cat.items ? `${cat.items}, ${rawVal}` : rawVal } : cat
        );
      }

      return next;
    });

    setResolvedCons((prev) => ({ ...prev, [conIndex]: true }));
    setLiveScore((prev) => Math.min(100, prev + 5));
    setActiveConIndex(null);
    setInputValue('');

    if (profileId && con.targetField) {
      try {
        await fetch(`http://localhost:5001/api/profiles/${profileId}/basic-info`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ field: con.targetField, value: rawVal })
        });
      } catch (err) {
        console.warn('DB Sync skipped:', err);
      }
    }
  };

  // Sort cons by severity: HIGH first, then MEDIUM, then LOW
  const severityRank = { HIGH: 1, MEDIUM: 2, LOW: 3 };
  const consList = parseCons(audit?.cons).sort((a, b) => {
    const rankA = severityRank[(a.severity || 'MEDIUM').toUpperCase()] || 2;
    const rankB = severityRank[(b.severity || 'MEDIUM').toUpperCase()] || 2;
    return rankA - rankB;
  });

  const prosList = parsePros(audit?.pros);
  const missingKeywords = parseKeywords(audit?.missingKeywords);

  const handleKeywordToggle = (kw) => {
    if (addedKeywords.includes(kw)) {
      setResumeData((prev) => ({
        ...prev,
        skillsCategories: prev.skillsCategories.map((cat) =>
          cat.label === 'Additional Skills'
            ? { ...cat, items: cat.items.split(', ').filter((item) => item !== kw).join(', ') }
            : cat
        ).filter((cat) => cat.label !== 'Additional Skills' || cat.items)
      }));
      setAddedKeywords((prev) => prev.filter((k) => k !== kw));
      setLiveScore((prev) => Math.max(0, prev - 3));
    } else {
      setResumeData((prev) => {
        let cats = [...prev.skillsCategories];
        let addCatIndex = cats.findIndex((cat) => cat.label === 'Additional Skills');
        if (addCatIndex === -1) {
          cats.push({ label: 'Additional Skills', items: kw });
        } else {
          cats[addCatIndex] = {
            ...cats[addCatIndex],
            items: cats[addCatIndex].items ? `${cats[addCatIndex].items}, ${kw}` : kw
          };
        }
        return { ...prev, skillsCategories: cats };
      });
      setAddedKeywords((prev) => [...prev, kw]);
      setLiveScore((prev) => Math.min(100, prev + 3));
    }
  };

  return (
    <div className="results-page">
      <div className="three-col-layout">
        
        {/* LEFT COLUMN */}
        <aside className="audit-col left-col no-print">
          <div className="metric-box">
            <h4>ATS Match Score</h4>
            <div className="big-score">{liveScore}<span>/100</span></div>
            <div className="breakdown-list">
              <div>Keywords: <strong>{scoring?.breakdown?.keywordMatchScore ?? liveScore}%</strong></div>
              <div>Relevance: <strong>{scoring?.breakdown?.relevanceScore ?? liveScore}%</strong></div>
              <div>Impact: <strong>{scoring?.breakdown?.impactMetricScore ?? liveScore}%</strong></div>
            </div>
          </div>

          <div className="audit-card cons-card">
            <h4 className="red-text">Cons & Gaps ({consList.length})</h4>
            <p className="card-note">Items flagged or missing against the Target JD:</p>

            <ul className="cons-list">
              {consList.map((c, i) => {
                const isResolved = resolvedCons[i];
                const isOpen = activeConIndex === i;

                return (
                  <li key={i} className={`con-row ${isResolved ? 'con-resolved' : ''}`}>
                    <span className={`badge-${(c.severity || 'alert').toLowerCase()}`}>{c.severity || 'ALERT'}</span>
                    <div style={{ flex: 1 }}>
                      <p className="con-issue"><strong>{c.issue}</strong></p>
                      {c.suggestion && <p className="con-suggestion">{c.suggestion}</p>}

                      <div className="con-action-bar">
                        {isResolved ? (
                          <span className="badge-resolved">✓ Applied to Resume</span>
                        ) : isOpen ? (
                          <div className="con-dialog-box">
                            {c.videoUrl && (
                              <div>
                                <div className="video-header-row">
                                  <span className="video-header-title">📺 Shortening Guide</span>
                                  <a
                                    href="https://www.youtube.com/watch?v=oga5s3Yngc8"
                                    target="_blank"
                                    rel="noreferrer"
                                    className="video-direct-link"
                                  >
                                    Open in YouTube ↗
                                  </a>
                                </div>
                                <div className="con-video-wrapper">
                                  <iframe
                                    src={c.videoUrl}
                                    title="YouTube Video Player"
                                    frameBorder="0"
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                    allowFullScreen
                                  />
                                </div>
                              </div>
                            )}

                            <input
                              type="text"
                              className="con-dialog-input"
                              placeholder={c.placeholder || `Enter ${c.fieldLabel || 'details'}...`}
                              value={inputValue}
                              onChange={(e) => setInputValue(e.target.value)}
                              autoFocus
                            />

                            <div className="con-dialog-actions">
                              <button type="button" className="btn-dialog-cancel" onClick={() => setActiveConIndex(null)}>
                                Cancel
                              </button>
                              <button type="button" className="btn-dialog-apply" onClick={() => handleApplyFix(i, c)}>
                                Apply to Resume &rarr;
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            type="button"
                            className="con-action-btn"
                            onClick={() => handleOpenDialog(i)}
                          >
                            + Add {c.fieldLabel || 'Details'}
                          </button>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="audit-card keywords-card">
            <h4>Missing Critical Keywords</h4>
            <div className="chips">
              {missingKeywords.map((kw, i) => {
                const isAdded = addedKeywords.includes(kw);
                return (
                  <span
                    key={i}
                    className={`chip ${isAdded ? 'chip-added' : 'chip-clickable'}`}
                    onClick={() => handleKeywordToggle(kw)}
                    title={isAdded ? 'Click to remove' : 'Click to add'}
                  >
                    {isAdded ? `✓ ${kw}` : `+ ${kw}`}
                  </span>
                );
              })}
            </div>
          </div>
        </aside>

        {/* CENTER COLUMN: Resume Canvas (Strict 1 Page) */}
        <main className="resume-col-center" ref={containerRef}>
          <div className="resume-scaler-wrap" style={{ transform: `scale(${previewScale})`, transformOrigin: 'center center' }}>
            <div className="draft-exact-page" id="resume-sheet" ref={sheetRef}>
              
              {/* Header: Left-Stuck Blue Banner & Contacts */}
              <div className="draft-header-grid">
                <div className="draft-blue-banner">
                  <h1 className="draft-candidate-name">{resumeData.fullName || 'Candidate Name'}</h1>
                  <p className="draft-candidate-role">{resumeData.designation}</p>
                </div>

                <div className="draft-contact-list">
                  {resumeData.email && (
                    <div className="draft-contact-line">
                      <span className="contact-text">{resumeData.email}</span>
                      <span className="contact-icon">
                        <svg viewBox="0 0 24 24" fill="none" stroke="#111827" strokeWidth="1.8">
                          <rect x="2" y="4" width="20" height="16" rx="1.5" /><path d="m22 7-10 6.5L2 7" />
                        </svg>
                      </span>
                    </div>
                  )}
                  {resumeData.phone && (
                    <div className="draft-contact-line">
                      <span className="contact-text">{resumeData.phone}</span>
                      <span className="contact-icon">
                        <svg viewBox="0 0 24 24" fill="none" stroke="#111827" strokeWidth="1.8">
                          <rect x="6" y="2" width="12" height="20" rx="2" /><line x1="11" y1="18" x2="13" y2="18" />
                        </svg>
                      </span>
                    </div>
                  )}
                  {resumeData.location && (
                    <div className="draft-contact-line location-line">
                      <span className="contact-text">{resumeData.location}</span>
                      <span className="contact-icon">
                        <svg viewBox="0 0 24 24" fill="none" stroke="#111827" strokeWidth="1.8">
                          <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" /><circle cx="12" cy="10" r="3" />
                        </svg>
                      </span>
                    </div>
                  )}
                  {resumeData.linkedin && (
                    <div className="draft-contact-line">
                      <span className="contact-text">{resumeData.linkedin}</span>
                      <span className="contact-icon">
                        <svg viewBox="0 0 24 24" fill="none" stroke="#111827" strokeWidth="1.8">
                          <rect x="2" y="2" width="20" height="20" rx="4" /><line x1="7" y1="10" x2="7" y2="17" />
                          <circle cx="7" cy="6.5" r="1" fill="#111827" /><path d="M12 17v-4a2 2 0 0 1 4 0v4" />
                        </svg>
                      </span>
                    </div>
                  )}
                  {resumeData.github && (
                    <div className="draft-contact-line">
                      <span className="contact-text">{resumeData.github}</span>
                      <span className="contact-icon">
                        <svg viewBox="0 0 24 24" fill="none" stroke="#111827" strokeWidth="1.8">
                          <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
                        </svg>
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Body: Yellow Spine */}
              <div className="draft-body-container">
                {resumeData.summary && (
                  <div className="ref-grid-row">
                    <div className="ref-grid-title">Career<br />Objective</div>
                    <div className="ref-grid-content"><p className="body-paragraph">{resumeData.summary}</p></div>
                  </div>
                )}

                {/* Experience: Only Years of Working Experience */}
                <div className="ref-grid-row">
                  <div className="ref-grid-title">Experience</div>
                  <div className="ref-grid-content">
                    <p className="body-paragraph"><strong>{resumeData.totalExperienceYears}</strong></p>
                  </div>
                </div>

                {/* Education: 12th onwards only */}
                {resumeData.education.length > 0 && (
                  <div className="ref-grid-row">
                    <div className="ref-grid-title">Education</div>
                    <div className="ref-grid-content">
                      {resumeData.education.map((edu, idx) => (
                        <div key={idx} className="entry-box">
                          <div className="entry-heading"><strong>{edu.degree}</strong>{edu.score ? ` – ${edu.score}` : ''}</div>
                          {edu.institution && <div className="entry-sub">{edu.institution}</div>}
                          {edu.gradYear && <div className="entry-date">{edu.gradYear}</div>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {resumeData.certifications.length > 0 && (
                  <div className="ref-grid-row">
                    <div className="ref-grid-title">Certifications</div>
                    <div className="ref-grid-content">
                      {resumeData.certifications.map((cert, idx) => (
                        <div key={idx} className="entry-box">
                          <div className="entry-heading"><strong>{cert.name}</strong>{cert.issuer && ` – ${cert.issuer}`}</div>
                          {cert.date && <div className="entry-date">{cert.date}</div>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {resumeData.projects.length > 0 && (
                  <div className="ref-grid-row">
                    <div className="ref-grid-title">Projects</div>
                    <div className="ref-grid-content">
                      {resumeData.projects.map((proj, idx) => (
                        <div key={idx} className="entry-box">
                          <div className="entry-heading"><strong>{proj.title}</strong>{proj.techStack && ` – ${proj.techStack}`}</div>
                          {proj.description && <p className="entry-desc">{proj.description}</p>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {resumeData.skillsCategories.length > 0 && (
                  <div className="ref-grid-row">
                    <div className="ref-grid-title">Skills</div>
                    <div className="ref-grid-content">
                      <ul className="bullet-list">
                        {resumeData.skillsCategories.map((sk, idx) => (
                          <li key={idx}><strong>{sk.label}:</strong> {sk.items}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}

                {resumeData.personalDetails.length > 0 && (
                  <div className="ref-grid-row">
                    <div className="ref-grid-title">Personal<br />Details</div>
                    <div className="ref-grid-content">
                      <ul className="bullet-list">
                        {resumeData.personalDetails.map((pd, idx) => (
                          <li key={idx}><strong>{pd.label}:</strong> {pd.value}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="draft-footer-row">
                <div className="footer-meta">
                  {resumeData.declaration.place && <p>Place: {resumeData.declaration.place}</p>}
                  <p>Date: {resumeData.declaration.date}</p>
                </div>
                <div className="footer-signature">
                  <p>{resumeData.fullName}</p>
                </div>
              </div>

            </div>
          </div>
        </main>

        {/* RIGHT COLUMN */}
        <aside className="audit-col right-col scrollable-col no-print">
          <div className="audit-card">
            <h4 className="green-text">Pros & Matched Strengths ({prosList.length})</h4>
            <p className="card-note">Strengths directly aligned with the Target JD:</p>
            <ul className="pros-list">
              {prosList.map((p, i) => (
                <li key={i} className="pro-card-item">
                  <span className="pro-category-tag">{p.category || 'Competency'}</span>
                  <p className="pro-point">{p.point || p}</p>
                </li>
              ))}
            </ul>
          </div>
        </aside>

      </div>
    </div>
  );
}