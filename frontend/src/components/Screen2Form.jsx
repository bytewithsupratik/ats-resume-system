import React, { useState } from 'react';

const BACKEND_URL = import.meta.env.VITE_API_URL || 'https://ats-resume-system-1-dvbp.onrender.com';

export default function Screen2Form({ mode, onBack, onSuccess, setLoading, setStatusText, setError }) {
  const [file, setFile] = useState(null);
  const [jd, setJd] = useState('');
  const [manualStep, setManualStep] = useState(1);

  const [info, setInfo] = useState({
    fullName: '',
    email: '',
    phone: '',
    location: '',
    linkedinUrl: '',
    githubUrl: '',
    summary: ''
  });

  const [skills, setSkills] = useState({ technical: '', tools: '', softSkills: '' });
  
  const [projects, setProjects] = useState([
    { title: '', role: '', organization: '', date: '', techStack: '', bullets: '' }
  ]);
  
  const [education, setEducation] = useState([
    { institution: '', degree: '', fieldOfStudy: '', gradYear: '', score: '' }
  ]);

  const handleInfo = (e) => setInfo({ ...info, [e.target.name]: e.target.value });
  const handleSkills = (e) => setSkills({ ...skills, [e.target.name]: e.target.value });

  const updateProject = (i, field, val) => {
    const list = [...projects];
    list[i][field] = val;
    setProjects(list);
  };

  const addProject = () => {
    setProjects([...projects, { title: '', role: '', organization: '', date: '', techStack: '', bullets: '' }]);
  };

  const removeProject = (index) => {
    setProjects(projects.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!jd.trim()) {
      setError('Please provide the Target Job Description.');
      return;
    }

    try {
      setLoading(true);
      let profileId = null;
      let profilePayload = null;

      if (mode === 'upload') {
        if (!file) {
          setError('Please attach your LinkedIn PDF.');
          setLoading(false);
          return;
        }

        setStatusText('Extracting candidate profile from PDF...');
        const formData = new FormData();
        formData.append('file', file);

        const res = await fetch(`${API_BASE_URL}/api/profiles/upload-pdf`, {
          method: 'POST',
          body: formData
        });
        const uploadRes = await res.json();

        if (!res.ok || !uploadRes.success) {
          throw new Error(uploadRes.message || 'PDF parse failed on backend');
        }

        profileId = uploadRes.profileId;
        profilePayload = uploadRes.profileData;
      } else {
        if (!info.fullName.trim() || !info.email.trim()) {
          setError('Full Name and Email are strictly required.');
          setLoading(false);
          return;
        }

        setStatusText('Saving candidate details...');
        const cleanArr = (str) => (str ? str.split(',').map((s) => s.trim()).filter(Boolean) : []);

        // Filter out empty rows so phantom items never enter MongoDB
        const validProjects = projects
          .filter((p) => p.title && p.title.trim())
          .map((p) => ({
            title: p.title.trim(),
            role: p.role?.trim() || '',
            organization: p.organization?.trim() || '',
            techStack: cleanArr(p.techStack),
            bullets: p.bullets ? p.bullets.split('\n').map((b) => b.trim()).filter(Boolean) : []
          }));

        const validEducation = education
          .filter((ed) => ed.institution && ed.institution.trim())
          .map((ed) => ({
            institution: ed.institution.trim(),
            degree: ed.degree?.trim() || '',
            fieldOfStudy: ed.fieldOfStudy?.trim() || '',
            gradYear: ed.gradYear?.trim() || '',
            score: ed.score?.trim() || ''
          }));

        profilePayload = {
          personalInfo: {
            fullName: info.fullName.trim(),
            email: info.email.trim(),
            phone: info.phone.trim(),
            location: info.location.trim(),
            linkedinUrl: info.linkedinUrl.trim(),
            githubUrl: info.githubUrl.trim(),
            summary: info.summary.trim()
          },
          skills: {
            technical: cleanArr(skills.technical),
            tools: cleanArr(skills.tools),
            softSkills: cleanArr(skills.softSkills)
          },
          projects: validProjects,
          education: validEducation
        };

        const res = await fetch(`${API_BASE_URL}/api/profiles/manual`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(profilePayload)
        });
        const manualRes = await res.json();

        if (!res.ok || !manualRes.success) {
          throw new Error(manualRes.message || 'Error saving profile');
        }
        profileId = manualRes.profileId;
      }

      setStatusText('Analyzing competencies & tailoring resume with Gemini AI...');
      const analyzeRes = await fetch(`${API_BASE_URL}/api/profiles/${profileId}/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobDescription: jd })
      });

      const report = await analyzeRes.json();
      if (!analyzeRes.ok || !report.success) {
        throw new Error(report.message || 'Failed generating analysis');
      }

      onSuccess(report, profilePayload);
    } catch (err) {
      setError(err.message || 'Network connection failed');
      setLoading(false);
    }
  };

  return (
    <div className="form-wrapper">
      <div className="action-row">
        <button type="button" className="btn-back" onClick={onBack}>&larr; Switch Mode</button>
        <span className="mode-tag">{mode === 'upload' ? 'Mode: PDF Upload' : 'Mode: Guided Manual Flow'}</span>
      </div>

      {mode === 'upload' ? (
        <form onSubmit={handleSubmit} className="intake-form">
          <div className="section-card">
            <h3>1. Upload LinkedIn Profile PDF</h3>
            <p className="sub-text">Upload your exported profile. We automatically extract your work history, skills, and education.</p>
            <div className="file-dropzone">
              <label htmlFor="file-upload" className="file-drop-label">
                <span className="file-icon-glyph">📄</span>
                <span className="file-action-title">
                  {file ? file.name : 'Click to select or drag LinkedIn PDF here'}
                </span>
                <span className="file-sub-info">Only .pdf files supported (Max: 10MB)</span>
              </label>
              <input
                id="file-upload"
                type="file"
                accept=".pdf,application/pdf"
                required
                onChange={(e) => setFile(e.target.files[0])}
              />
            </div>
          </div>

          <div className="section-card">
            <h3>2. Target Job Description (JD) *</h3>
            <p className="sub-text">Paste the full role description to audit competencies and required keywords.</p>
            <textarea
              required
              rows="7"
              className="form-textarea"
              placeholder="Paste requirements, duties, and skills required by the target job..."
              value={jd}
              onChange={(e) => setJd(e.target.value)}
            />
          </div>

          <button type="submit" className="btn-primary full-btn">
            Analyze & Build ATS Resume &rarr;
          </button>
        </form>
      ) : (
        <div>
          {manualStep === 1 ? (
            <div className="section-card">
              <h3>Step 1: Target Job Description</h3>
              <p className="sub-text">Paste the target Job Description first so we can guide you to fill details tailored to this specific role.</p>
              <textarea
                required
                rows="8"
                className="form-textarea"
                placeholder="Paste Job Description (responsibilities, technical stack, qualifications)..."
                value={jd}
                onChange={(e) => setJd(e.target.value)}
              />
              <button
                type="button"
                className="btn-primary full-btn"
                style={{ marginTop: '16px' }}
                onClick={() => {
                  if (!jd.trim()) {
                    setError('Please paste the Target Job Description before continuing.');
                    return;
                  }
                  setError('');
                  setManualStep(2);
                }}
              >
                Next: Enter Candidate Details for this Role &rarr;
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="intake-form">
              <div className="jd-reminder-box">
                <span><strong>Target Role:</strong> {jd.slice(0, 100)}...</span>
                <button type="button" className="btn-link" onClick={() => setManualStep(1)}>Edit JD</button>
              </div>

              <div className="section-card">
                <h3>Candidate Information</h3>
                <div className="input-grid">
                  <div className="form-group">
                    <label>Full Name *</label>
                    <input type="text" name="fullName" placeholder="e.g. Jane Doe" required value={info.fullName} onChange={handleInfo} />
                  </div>
                  <div className="form-group">
                    <label>Email Address *</label>
                    <input type="email" name="email" placeholder="e.g. jane@example.com" required value={info.email} onChange={handleInfo} />
                  </div>
                  <div className="form-group">
                    <label>Phone Number</label>
                    <input type="text" name="phone" placeholder="e.g. +1 555-0192" value={info.phone} onChange={handleInfo} />
                  </div>
                  <div className="form-group">
                    <label>Location</label>
                    <input type="text" name="location" placeholder="City, State" value={info.location} onChange={handleInfo} />
                  </div>
                  <div className="form-group">
                    <label>LinkedIn URL</label>
                    <input type="text" name="linkedinUrl" placeholder="linkedin.com/in/username" value={info.linkedinUrl} onChange={handleInfo} />
                  </div>
                  <div className="form-group">
                    <label>GitHub / Portfolio URL</label>
                    <input type="text" name="githubUrl" placeholder="github.com/username" value={info.githubUrl} onChange={handleInfo} />
                  </div>
                </div>
              </div>

              <div className="section-card">
                <h3>Education</h3>
                <div className="input-grid">
                  <div className="form-group">
                    <label>Institution Name</label>
                    <input type="text" placeholder="University / College" value={education[0].institution} onChange={(e) => {
                      const arr = [...education];
                      arr[0].institution = e.target.value;
                      setEducation(arr);
                    }} />
                  </div>
                  <div className="form-group">
                    <label>Degree & Major</label>
                    <input type="text" placeholder="e.g. B.Tech in Computer Science" value={education[0].degree} onChange={(e) => {
                      const arr = [...education];
                      arr[0].degree = e.target.value;
                      setEducation(arr);
                    }} />
                  </div>
                  <div className="form-group">
                    <label>Graduation Year</label>
                    <input type="text" placeholder="e.g. 2025" value={education[0].gradYear} onChange={(e) => {
                      const arr = [...education];
                      arr[0].gradYear = e.target.value;
                      setEducation(arr);
                    }} />
                  </div>
                  <div className="form-group">
                    <label>Score / CGPA</label>
                    <input type="text" placeholder="e.g. 8.5 CGPA" value={education[0].score} onChange={(e) => {
                      const arr = [...education];
                      arr[0].score = e.target.value;
                      setEducation(arr);
                    }} />
                  </div>
                </div>
              </div>

              <div className="section-card">
                <div className="row-between">
                  <h3>Key Projects</h3>
                  <button type="button" className="btn-small" onClick={addProject}>+ Add Project</button>
                </div>

                {projects.map((proj, idx) => (
                  <div key={idx} className="sub-card">
                    <div className="row-between">
                      <strong>Project #{idx + 1}</strong>
                      {projects.length > 1 && (
                        <button type="button" className="btn-del" onClick={() => removeProject(idx)}>Delete</button>
                      )}
                    </div>
                    <div className="input-grid">
                      <div className="form-group">
                        <label>Project Title</label>
                        <input type="text" placeholder="Project Name" value={proj.title} onChange={(e) => updateProject(idx, 'title', e.target.value)} />
                      </div>
                      <div className="form-group">
                        <label>Tech Stack (Comma Separated)</label>
                        <input type="text" placeholder="React, Node.js, Python" value={proj.techStack} onChange={(e) => updateProject(idx, 'techStack', e.target.value)} />
                      </div>
                    </div>
                    <div className="form-group" style={{ marginTop: '8px' }}>
                      <label>Bullet Points (One per line)</label>
                      <textarea
                        rows="3"
                        className="form-textarea"
                        placeholder="Architected system...&#10;Decreased latency by 35%..."
                        value={proj.bullets}
                        onChange={(e) => updateProject(idx, 'bullets', e.target.value)}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="section-card">
                <h3>Skills & Competencies</h3>
                <div className="form-group">
                  <label>Programming Languages (Comma Separated)</label>
                  <input type="text" name="technical" placeholder="Java, Python, JavaScript, C++, SQL" value={skills.technical} onChange={handleSkills} />
                </div>
                <div className="form-group" style={{ marginTop: '10px' }}>
                  <label>Frameworks & Tools</label>
                  <input type="text" name="tools" placeholder="React, Node.js, Express, Docker, Git" value={skills.tools} onChange={handleSkills} />
                </div>
                <div className="form-group" style={{ marginTop: '10px' }}>
                  <label>Core Concepts & Soft Skills</label>
                  <input type="text" name="softSkills" placeholder="Operating Systems, DBMS, Agile, System Design" value={skills.softSkills} onChange={handleSkills} />
                </div>
              </div>

              <button type="submit" className="btn-primary full-btn">
                Analyze & Build ATS Resume &rarr;
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}