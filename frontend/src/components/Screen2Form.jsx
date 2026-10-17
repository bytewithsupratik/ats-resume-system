import React, { useState } from 'react';

const BACKEND_URL = 'http://localhost:5001/api/profiles';

export default function Screen2Form({ mode, onBack, onSuccess, setLoading, setStatusText, setError }) {
  const [file, setFile] = useState(null);
  const [jd, setJd] = useState('');

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
    { title: '', techStack: '', liveLink: '', repoLink: '', bullets: '' }
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
    setProjects([...projects, { title: '', techStack: '', liveLink: '', repoLink: '', bullets: '' }]);
  };

  const removeProject = (index) => {
    setProjects(projects.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!jd.trim()) {
      setError('Please paste a Job Description first.');
      return;
    }

    try {
      setLoading(true);
      let profileId = null;

      if (mode === 'upload') {
        if (!file) {
          setError('Please attach your LinkedIn PDF.');
          setLoading(false);
          return;
        }

        setStatusText('Uploading & parsing PDF...');
        const formData = new FormData();
        formData.append('file', file);

        const res = await fetch(`${BACKEND_URL}/upload-pdf`, {
          method: 'POST',
          body: formData
        });
        const uploadRes = await res.json();
        
        if (!res.ok || !uploadRes.success) {
          throw new Error(uploadRes.message || 'PDF parse failed on backend');
        }
        profileId = uploadRes.profileId;
      } else {
        if (!info.fullName || !info.email) {
          setError('Name and Email are required.');
          setLoading(false);
          return;
        }

        setStatusText('Saving candidate details...');
        
        const cleanArr = (str) => str ? str.split(',').map(s => s.trim()).filter(Boolean) : [];

        const payload = {
          personalInfo: info,
          skills: {
            technical: cleanArr(skills.technical),
            tools: cleanArr(skills.tools),
            softSkills: cleanArr(skills.softSkills)
          },
          projects: projects.map(p => ({
            ...p,
            techStack: cleanArr(p.techStack),
            bullets: p.bullets ? p.bullets.split('\n').map(b => b.trim()).filter(Boolean) : []
          })),
          education: education.filter(ed => ed.institution && ed.degree)
        };

        const res = await fetch(`${BACKEND_URL}/manual`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const manualRes = await res.json();

        if (!res.ok || !manualRes.success) {
          throw new Error(manualRes.message || 'Error saving profile');
        }
        profileId = manualRes.profileId;
      }

      setStatusText('Analyzing with Gemini & calculating ATS scores...');
      const analyzeRes = await fetch(`${BACKEND_URL}/${profileId}/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobDescription: jd })
      });

      const report = await analyzeRes.json();
      if (!analyzeRes.ok || !report.success) {
        throw new Error(report.message || 'Failed generating analysis');
      }

      onSuccess(report);
    } catch (err) {
      setError(err.message || 'Network connection failed');
      setLoading(false);
    }
  };

  return (
    <div className="form-wrapper">
      <div className="action-row">
        <button type="button" className="btn-back" onClick={onBack}>&larr; Back</button>
        <span className="mode-tag">{mode === 'upload' ? 'LinkedIn PDF Mode' : 'Manual Form Mode'}</span>
      </div>

      <form onSubmit={handleSubmit}>
        {mode === 'upload' ? (
          <div className="section-card upload-box">
            <h3>Upload PDF Profile</h3>
            <p>Upload the PDF downloaded directly from LinkedIn.</p>
            <input
              type="file"
              accept=".pdf,application/pdf"
              onChange={(e) => setFile(e.target.files[0])}
            />
            {file && <p className="file-name">Attached: <strong>{file.name}</strong></p>}
          </div>
        ) : (
          <div className="manual-inputs">
            <div className="section-card">
              <h3>Personal Details</h3>
              <div className="input-grid">
                <input type="text" name="fullName" placeholder="Full Name *" required value={info.fullName} onChange={handleInfo} />
                <input type="email" name="email" placeholder="Email *" required value={info.email} onChange={handleInfo} />
                <input type="text" name="phone" placeholder="Phone Number" value={info.phone} onChange={handleInfo} />
                <input type="text" name="location" placeholder="City, Country" value={info.location} onChange={handleInfo} />
                <input type="text" name="linkedinUrl" placeholder="LinkedIn URL" value={info.linkedinUrl} onChange={handleInfo} />
                <input type="text" name="githubUrl" placeholder="GitHub URL" value={info.githubUrl} onChange={handleInfo} />
              </div>
              <textarea name="summary" placeholder="Summary / Bio" rows="3" value={info.summary} onChange={handleInfo} style={{ marginTop: '10px' }} />
            </div>

            <div className="section-card">
              <h3>Skills (comma separated)</h3>
              <input type="text" name="technical" placeholder="Languages & Frameworks (e.g. React, Node, Python)" value={skills.technical} onChange={handleSkills} />
              <input type="text" name="tools" placeholder="Tools (e.g. Git, Docker, MongoDB)" value={skills.tools} onChange={handleSkills} style={{ marginTop: '8px' }} />
              <input type="text" name="softSkills" placeholder="Soft Skills (e.g. Team Leadership, Problem Solving)" value={skills.softSkills} onChange={handleSkills} style={{ marginTop: '8px' }} />
            </div>

            <div className="section-card">
              <div className="row-between">
                <h3>Projects</h3>
                <button type="button" className="btn-small" onClick={addProject}>+ Add Project</button>
              </div>

              {projects.map((proj, idx) => (
                <div key={idx} className="sub-card">
                  <div className="row-between">
                    <strong>Project {idx + 1}</strong>
                    {projects.length > 1 && (
                      <button type="button" className="btn-del" onClick={() => removeProject(idx)}>Delete</button>
                    )}
                  </div>
                  <div className="input-grid">
                    <input type="text" placeholder="Project Title" value={proj.title} onChange={(e) => updateProject(idx, 'title', e.target.value)} />
                    <input type="text" placeholder="Tech Stack" value={proj.techStack} onChange={(e) => updateProject(idx, 'techStack', e.target.value)} />
                  </div>
                  <textarea rows="3" placeholder="Bullets (one per line)" value={proj.bullets} onChange={(e) => updateProject(idx, 'bullets', e.target.value)} style={{ marginTop: '8px' }} />
                </div>
              ))}
            </div>

            <div className="section-card">
              <h3>Education</h3>
              <div className="input-grid">
                <input type="text" placeholder="Institution" value={education[0].institution} onChange={(e) => {
                  const arr = [...education];
                  arr[0].institution = e.target.value;
                  setEducation(arr);
                }} />
                <input type="text" placeholder="Degree" value={education[0].degree} onChange={(e) => {
                  const arr = [...education];
                  arr[0].degree = e.target.value;
                  setEducation(arr);
                }} />
                <input type="text" placeholder="Field of Study" value={education[0].fieldOfStudy} onChange={(e) => {
                  const arr = [...education];
                  arr[0].fieldOfStudy = e.target.value;
                  setEducation(arr);
                }} />
                <input type="text" placeholder="Grad Year" value={education[0].gradYear} onChange={(e) => {
                  const arr = [...education];
                  arr[0].gradYear = e.target.value;
                  setEducation(arr);
                }} />
              </div>
            </div>
          </div>
        )}

        <div className="section-card jd-box">
          <h3>Target Job Description *</h3>
          <p>Paste the JD here so we can match keywords and generate bullet points.</p>
          <textarea
            required
            rows="6"
            placeholder="Paste complete Job Description here..."
            value={jd}
            onChange={(e) => setJd(e.target.value)}
          />
        </div>

        <button type="submit" className="btn-primary full-btn">Analyze & Generate Resume</button>
      </form>
    </div>
  );
}