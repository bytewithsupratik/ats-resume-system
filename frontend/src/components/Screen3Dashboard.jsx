import React, { useState, useEffect, useRef } from 'react';

// === TYPE-SAFE UTILITY HELPERS ===
const formatJoin = (val) => {
  if (!val) return '';
  if (Array.isArray(val)) return val.filter(Boolean).join(', ');
  if (typeof val === 'string') return val;
  return String(val);
};

const toArray = (val) => {
  if (!val) return [];
  if (Array.isArray(val)) return val.filter(Boolean);
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

// Target classifier for contextual issue fixing
const classifyIssueTarget = (issue = '', suggestion = '') => {
  const text = `${issue} ${suggestion}`.toLowerCase();
  if (text.includes('linkedin')) return 'LINKEDIN';
  if (text.includes('github') || text.includes('git profile') || text.includes('repo link')) return 'GITHUB';
  if (text.includes('phone') || text.includes('mobile')) return 'PHONE';
  if (text.includes('email') || text.includes('mail address')) return 'EMAIL';
  if (text.includes('location') || text.includes('address') || text.includes('city')) return 'LOCATION';
  if (text.includes('date of birth') || text.includes('dob') || text.includes('birth date')) return 'DOB';
  if (text.includes('gender') || text.includes('sex')) return 'GENDER';
  if (text.includes('nationality') || text.includes('citizenship')) return 'NATIONALITY';
  if (text.includes('language') || text.includes('languages known')) return 'LANGUAGES';
  if (text.includes('education') || text.includes('degree') || text.includes('graduation') || text.includes('attendance') || text.includes('college') || text.includes('university') || text.includes('phd') || text.includes('ph.d')) return 'EDUCATION';
  if (text.includes('experience') || text.includes('employment') || text.includes('work history') || text.includes('teaching') || text.includes('professor') || text.includes('metric') || text.includes('quantif') || text.includes('kpi')) return 'EXPERIENCE';
  if (text.includes('project') || text.includes('tech stack listings')) return 'PROJECTS';
  if (text.includes('certif') || text.includes('credential') || text.includes('accreditation')) return 'CERTIFICATIONS';
  if (text.includes('skill') || text.includes('java') || text.includes('spring boot') || text.includes('python') || text.includes('react')) return 'SKILLS';
  if (text.includes('summary') || text.includes('career objective') || text.includes('profile statement')) return 'SUMMARY';
  return 'GENERAL';
};

const getNameSlug = (fullName = '') => {
  const clean = fullName.toLowerCase().replace(/[^a-z0-9]/g, '');
  return clean || 'candidate';
};

// === STRICT EXTRACTION: FORMAT FROM REFERENCE PDF, DATA ONLY FROM ACTIVE CANDIDATE ===
const buildReferenceResume = (data, fallbackProfile) => {
  const root = data?.data || data || {};
  const tailoredResume = root.tailoredResume || {};
  const profile = fallbackProfile || root.profileData || root.profile || {};
  const personalInfo = profile.personalInfo || tailoredResume.personalInfo || {};

  // 1. Identity & Contact (Zero hardcoded fallbacks)
  const fullName = toText(personalInfo.fullName);
  const designation =
    toText(personalInfo.title) ||
    toText(personalInfo.headline) ||
    toText(root.targetJob?.jobTitle) ||
    '';

  const email = toText(personalInfo.email);
  const phone = toText(personalInfo.phone);
  const location = toText(personalInfo.location);
  const linkedin = toText(personalInfo.linkedinUrl);
  const github = toText(personalInfo.githubUrl);

  // 2. Section 1: Career Objective / Summary
  const summary = toText(tailoredResume.tailoredSummary) || toText(personalInfo.summary) || '';

  // 3. Section 2: Experience (Only actual candidate experience)
  const rawExp = toArray(tailoredResume.experience || profile.experience).filter(
    (exp) => exp && (exp.title || exp.role || exp.organization)
  );
  const experience = rawExp.map((e) => ({
    title: toText(e.title || e.role),
    organization: toText(e.organization || e.company),
    date: toText(e.date || e.duration),
    desc: toArray(e.bullets || e.optimizedBullets)[0] || toText(e.description) || ''
  }));

  // 4. Section 3: Education (Only actual candidate education)
  const rawEdu = toArray(tailoredResume.education || profile.education).filter(
    (edu) => edu && (edu.institution || edu.degree)
  );
  const education = rawEdu.map((edu) => ({
    degree: toText(edu.degree),
    score: toText(edu.score || edu.gpa),
    institution: toText(edu.institution),
    gradYear: toText(edu.gradYear || edu.duration)
  }));

  // 5. Section 4: Certifications (Only actual candidate certifications)
  const rawCert = toArray(tailoredResume.certifications || profile.certifications).filter(
    (cert) => cert && (cert.name || cert.title)
  );
  const certifications = rawCert.map((c) => ({
    name: toText(c.name || c.title),
    issuer: toText(c.issuingOrganization || c.issuer),
    date: toText(c.issueDate || c.date)
  }));

  // 6. Section 5: Projects (Only actual candidate projects)
  const rawProj = toArray(tailoredResume.optimizedProjects || profile.projects).filter(
    (proj) => proj && proj.title
  );
  const projects = rawProj.map((p) => {
    const tech = toArray(p.techStack);
    const bullets = toArray(p.optimizedBullets || p.bullets || p.description);
    return {
      title: toText(p.title),
      techStack: tech.length > 0 ? tech.join(', ') : '',
      description: bullets.length > 0 ? bullets[0] : toText(p.description)
    };
  });

  // 7. Section 6: Skills (Only actual candidate skills mapped to reference categories)
  const rawSkills = tailoredResume.prioritizedSkills || profile.skills || {};
  const skillsCategories = [];
  if (toArray(rawSkills.technical).length > 0) {
    skillsCategories.push({ label: 'Programming Languages', items: formatJoin(rawSkills.technical) });
  }
  if (toArray(rawSkills.tools).length > 0) {
    skillsCategories.push({ label: 'Web & Frameworks', items: formatJoin(rawSkills.tools) });
  }
  if (toArray(rawSkills.softSkills).length > 0) {
    skillsCategories.push({ label: 'Core Concepts', items: formatJoin(rawSkills.softSkills) });
  }

  // 8. Section 7: Personal Details (Only if actual candidate provided details)
  const personalDetails = [];
  if (personalInfo.nationality) {
    personalDetails.push({ label: 'Nationality', value: toText(personalInfo.nationality) });
  }
  if (personalInfo.languages && toArray(personalInfo.languages).length > 0) {
    personalDetails.push({ label: 'Languages Known', value: formatJoin(personalInfo.languages) });
  }
  if (personalInfo.dob) {
    personalDetails.push({ label: 'Date of Birth', value: toText(personalInfo.dob) });
  }
  if (personalInfo.gender) {
    personalDetails.push({ label: 'Gender', value: toText(personalInfo.gender) });
  }

  // 9. Footer Declaration (Uses candidate's actual location and name)
  const declaration = {
    place: location ? location.split('\n')[0].replace(/,\s*$/, '') : '',
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

  const [resumeData, setResumeData] = useState(() => buildReferenceResume(data, fallbackProfile));
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

  // Scaling Engine for On-Screen Preview (Strictly Letter Proportions 612 x 792 pt)
  const containerRef = useRef(null);
  const sheetRef = useRef(null);
  const [previewScale, setPreviewScale] = useState(1);

  useEffect(() => {
    const calculateScale = () => {
      if (!containerRef.current || !sheetRef.current) return;
      const containerWidth = containerRef.current.clientWidth - 32;
      const containerHeight = containerRef.current.clientHeight - 32;
      const sheetWidth = sheetRef.current.offsetWidth || 612;
      const sheetHeight = sheetRef.current.offsetHeight || 792;

      if (sheetWidth > 0 && sheetHeight > 0 && containerWidth > 0 && containerHeight > 0) {
        if (window.innerWidth <= 1024) {
          const scaleX = containerWidth / sheetWidth;
          setPreviewScale(Math.min(scaleX, 1));
        } else {
          const scaleX = containerWidth / sheetWidth;
          const scaleY = containerHeight / sheetHeight;
          const fit = Math.min(scaleX, scaleY);
          setPreviewScale(Math.min(fit, 1.02));
        }
      }
    };

    calculateScale();

    let observer;
    if (window.ResizeObserver && containerRef.current) {
      observer = new ResizeObserver(() => calculateScale());
      observer.observe(containerRef.current);
    }
    window.addEventListener('resize', calculateScale);

    return () => {
      if (observer) observer.disconnect();
      window.removeEventListener('resize', calculateScale);
    };
  }, [resumeData]);

  // Re-sync immediately on candidate switch
  useEffect(() => {
    setResumeData(buildReferenceResume(data, fallbackProfile));
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

  const getActionLabel = (issue = '', suggestion = '') => {
    const target = classifyIssueTarget(issue, suggestion);
    switch (target) {
      case 'LINKEDIN': return '+ Customize LinkedIn';
      case 'GITHUB': return '+ Link GitHub';
      case 'DOB': return '+ Add Date of Birth';
      case 'GENDER': return '+ Add Gender';
      case 'NATIONALITY': return '+ Add Nationality';
      case 'LANGUAGES': return '+ Add Languages';
      case 'EDUCATION': return '+ Add Education Dates';
      case 'EXPERIENCE': return '+ Add Experience Details';
      case 'PROJECTS': return '+ Update Project Stack';
      case 'CERTIFICATIONS': return '+ Add Certification';
      case 'SKILLS': return '+ Add Required Skills';
      case 'SUMMARY': return '+ Refine Objective';
      default: return '+ Quick Fix';
    }
  };

  // Field-specific resolution
  const handleFixCon = (conIndex, issue, suggestion) => {
    const prevSnapshot = JSON.parse(JSON.stringify(resumeData));
    const proId = `resolved-${conIndex}`;
    const target = classifyIssueTarget(issue, suggestion);
    const slug = getNameSlug(resumeData.fullName);
    let resolvedDescription = '';

    setResumeData((prev) => {
      const next = { ...prev };

      switch (target) {
        case 'LINKEDIN': {
          next.linkedin = `linkedin.com/in/${slug}`;
          resolvedDescription = `Customized LinkedIn URL to linkedin.com/in/${slug}`;
          break;
        }
        case 'GITHUB': {
          next.github = `github.com/${slug}`;
          resolvedDescription = `Linked GitHub profile to github.com/${slug}`;
          break;
        }
        case 'DOB': {
          const val = window.prompt('Enter Date of Birth (e.g. DD/MM/YYYY):', '15/08/1998');
          if (val) {
            const updated = [...prev.personalDetails.filter((p) => p.label !== 'Date of Birth')];
            updated.push({ label: 'Date of Birth', value: val });
            next.personalDetails = updated;
            resolvedDescription = `Added Date of Birth: ${val}`;
          }
          break;
        }
        case 'GENDER': {
          const val = window.prompt('Enter Gender:', 'Male');
          if (val) {
            const updated = [...prev.personalDetails.filter((p) => p.label !== 'Gender')];
            updated.push({ label: 'Gender', value: val });
            next.personalDetails = updated;
            resolvedDescription = `Added Gender: ${val}`;
          }
          break;
        }
        case 'NATIONALITY': {
          const val = window.prompt('Enter Nationality:', 'Indian');
          if (val) {
            const updated = [...prev.personalDetails.filter((p) => p.label !== 'Nationality')];
            updated.push({ label: 'Nationality', value: val });
            next.personalDetails = updated;
            resolvedDescription = `Added Nationality: ${val}`;
          }
          break;
        }
        case 'LANGUAGES': {
          const val = window.prompt('Enter Languages Known (comma-separated):', 'English, Hindi');
          if (val) {
            const updated = [...prev.personalDetails.filter((p) => p.label !== 'Languages Known')];
            updated.push({ label: 'Languages Known', value: val });
            next.personalDetails = updated;
            resolvedDescription = `Added Languages: ${val}`;
          }
          break;
        }
        case 'EDUCATION': {
          const lower = `${issue} ${suggestion}`.toLowerCase();
          if (lower.includes('phd') || lower.includes('ph.d')) {
            const phdDeg = window.prompt('Enter Ph.D. Status/Degree:', 'Ph.D. in Computer Science (Enrolled)');
            if (phdDeg) {
              next.education = [
                { degree: phdDeg, score: 'Research Scholar', institution: prev.education[0]?.institution || 'University Department', gradYear: 'Ongoing' },
                ...prev.education
              ];
              resolvedDescription = `Added ${phdDeg} to Education`;
            }
          } else {
            const dates = window.prompt('Enter Start and End Years (e.g. 2021 – 2025):', '2021 – 2025');
            if (dates && next.education.length > 0) {
              next.education = prev.education.map((edu, idx) => idx === 0 ? { ...edu, gradYear: dates } : edu);
              resolvedDescription = `Added attendance dates: ${dates}`;
            }
          }
          break;
        }
        case 'EXPERIENCE': {
          const roleDesc = window.prompt('Enter verified experience impact/metric:', 'Architected scalable microservices improving query latency by 35%.');
          if (roleDesc) {
            if (next.experience.length > 0) {
              next.experience = prev.experience.map((exp, idx) => idx === 0 ? { ...exp, desc: `${exp.desc} ${roleDesc}`.trim() } : exp);
            } else {
              next.experience = [{ title: prev.designation || 'Engineer', organization: 'Software Engineering Department', date: 'Recent', desc: roleDesc }];
            }
            resolvedDescription = 'Added validated impact metrics to experience';
          }
          break;
        }
        case 'PROJECTS': {
          const stack = window.prompt('Enter technologies used in project (comma-separated):', 'Java, Spring Boot, Docker');
          if (stack && next.projects.length > 0) {
            next.projects = prev.projects.map((proj, idx) => idx === 0 ? { ...proj, techStack: proj.techStack ? `${proj.techStack}, ${stack}` : stack } : proj);
            resolvedDescription = `Added ${stack} to project tech stack`;
          }
          break;
        }
        case 'CERTIFICATIONS': {
          const certName = window.prompt('Enter Certification Name:', 'Oracle Certified Professional');
          if (certName) {
            next.certifications = [...prev.certifications, { name: certName, issuer: 'Accredited Authority', date: '2026' }];
            resolvedDescription = `Added certification: ${certName}`;
          }
          break;
        }
        case 'SKILLS': {
          const newSkill = window.prompt('Enter required skills to add (comma-separated):', 'Java, Spring Boot');
          if (newSkill) {
            next.skillsCategories = prev.skillsCategories.map((cat, idx) => idx === 0 ? { ...cat, items: `${cat.items}, ${newSkill}` } : cat);
            resolvedDescription = `Added ${newSkill} to Skills`;
          }
          break;
        }
        case 'SUMMARY': {
          if (suggestion && !next.summary.includes(suggestion)) {
            next.summary = `${next.summary} Focus: ${suggestion}`;
            resolvedDescription = 'Refined Career Objective';
          }
          break;
        }
        default: {
          resolvedDescription = 'Addressed qualification requirement';
          break;
        }
      }

      return next;
    });

    if (resolvedDescription) {
      const newPro = {
        id: proId,
        category: 'Resolved Competency',
        point: `${issue} — Status: ${resolvedDescription}`,
        isResolved: true
      };
      setLivePros((prev) => [newPro, ...prev.filter((p) => p.id !== proId)]);

      setConHistory((prev) => ({
        ...prev,
        [conIndex]: { snapshot: prevSnapshot, proId, scoreDiff: 5 }
      }));

      setResolvedCons((prev) => ({ ...prev, [conIndex]: true }));
      setLiveScore((prev) => Math.min(100, prev + 5));
    }
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
      <div className="three-col-layout">
        
        {/* LEFT COLUMN: Cons & Gaps (Sticky score card, independently scrolling list) */}
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
                            <span className="badge-resolved">✓ Applied</span>
                            <button type="button" className="btn-undo" onClick={() => handleUndo(i)}>↶ Undo</button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            className="con-action-btn"
                            onClick={() => handleFixCon(i, issue, suggestion)}
                          >
                            {getActionLabel(issue, suggestion)}
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

        {/* CENTER COLUMN: EXACT VISUAL BLUEPRINT OF DRAFT(1).PDF WITH CANDIDATE'S ACTUAL DATA */}
        <main className="resume-col-center" ref={containerRef}>
          <div
            className="resume-scaler-wrap"
            style={{
              transform: `scale(${previewScale})`,
              transformOrigin: 'center center'
            }}
          >
            <div className="draft-exact-page" id="resume-sheet" ref={sheetRef}>
              
              {/* HEADER: Blue Banner (Left) & Right-Aligned Contacts with Icons (Right) */}
              <div className="draft-header-grid">
                <div className="draft-blue-banner">
                  <h1 className="draft-candidate-name">{resumeData.fullName || 'Candidate Name'}</h1>
                  {resumeData.designation && (
                    <p className="draft-candidate-role">{resumeData.designation}</p>
                  )}
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

              {/* BODY: Continuous Yellow Line & Two-Column Grid (Sections 1 through 7) */}
              <div className="draft-body-container">
                
                {/* 1. Career Objective */}
                {resumeData.summary && (
                  <div className="ref-grid-row">
                    <div className="ref-grid-title">Career<br />Objective</div>
                    <div className="ref-grid-content">
                      <p className="body-paragraph">{resumeData.summary}</p>
                    </div>
                  </div>
                )}

                {/* 2. Experience */}
                {resumeData.experience.length > 0 && (
                  <div className="ref-grid-row">
                    <div className="ref-grid-title">Experience</div>
                    <div className="ref-grid-content">
                      {resumeData.experience.map((exp, idx) => (
                        <div key={idx} className="entry-box">
                          <div className="entry-heading">
                            <strong>{exp.title}</strong>
                            {exp.organization && ` – ${exp.organization}`}
                          </div>
                          {exp.date && <div className="entry-date">{exp.date}</div>}
                          {exp.desc && <p className="entry-desc">{exp.desc}</p>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 3. Education */}
                {resumeData.education.length > 0 && (
                  <div className="ref-grid-row">
                    <div className="ref-grid-title">Education</div>
                    <div className="ref-grid-content">
                      {resumeData.education.map((edu, idx) => (
                        <div key={idx} className="entry-box">
                          <div className="entry-heading">
                            <strong>{edu.degree}</strong> {edu.score ? `– ${edu.score}` : ''}
                          </div>
                          {edu.institution && <div className="entry-sub">{edu.institution}</div>}
                          {edu.gradYear && <div className="entry-date">{edu.gradYear}</div>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 4. Certifications */}
                {resumeData.certifications.length > 0 && (
                  <div className="ref-grid-row">
                    <div className="ref-grid-title">Certifications</div>
                    <div className="ref-grid-content">
                      {resumeData.certifications.map((cert, idx) => (
                        <div key={idx} className="entry-box">
                          <div className="entry-heading">
                            <strong>{cert.name}</strong> {cert.issuer ? `– ${cert.issuer}` : ''}
                          </div>
                          {cert.date && <div className="entry-date">{cert.date}</div>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 5. Projects */}
                {resumeData.projects.length > 0 && (
                  <div className="ref-grid-row">
                    <div className="ref-grid-title">Projects</div>
                    <div className="ref-grid-content">
                      {resumeData.projects.map((proj, idx) => (
                        <div key={idx} className="entry-box">
                          <div className="entry-heading">
                            <strong>{proj.title}</strong>
                            {proj.techStack && ` – ${proj.techStack}`}
                          </div>
                          {proj.description && <p className="entry-desc">{proj.description}</p>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 6. Skills (Bullet dots ●) */}
                {resumeData.skillsCategories.length > 0 && (
                  <div className="ref-grid-row">
                    <div className="ref-grid-title">Skills</div>
                    <div className="ref-grid-content">
                      <ul className="bullet-list">
                        {resumeData.skillsCategories.map((sk, idx) => (
                          <li key={idx}>
                            <strong>{sk.label}:</strong> {sk.items}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}

                {/* 7. Personal Details (Bullet dots ●) */}
                {resumeData.personalDetails.length > 0 && (
                  <div className="ref-grid-row">
                    <div className="ref-grid-title">Personal<br />Details</div>
                    <div className="ref-grid-content">
                      <ul className="bullet-list">
                        {resumeData.personalDetails.map((pd, idx) => (
                          <li key={idx}>
                            <strong>{pd.label}:</strong> {pd.value}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}

              </div>

              {/* FOOTER: Place & Date (Left) & Actual Candidate Signature (Right) */}
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

        {/* RIGHT COLUMN: Pros */}
        <aside className="audit-col right-col scrollable-col no-print">
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