function checkLinkedInUrl(rawUrl) {
  const tutorialVideoUrl = 'https://www.youtube.com/embed/oga5s3Yngc8';

  if (!rawUrl || typeof rawUrl !== 'string' || !rawUrl.trim()) {
    return {
      issue: 'Missing LinkedIn Profile URL',
      severity: 'MEDIUM',
      suggestion: 'Add your custom shortened LinkedIn URL to your resume header.',
      actionType: 'LINKEDIN_URL_FIX',
      targetField: 'linkedin',
      fieldLabel: 'LinkedIn Profile URL',
      placeholder: 'e.g. linkedin.com/in/yourname',
      videoUrl: tutorialVideoUrl
    };
  }

  const cleaned = rawUrl.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '').trim();
  const hasRandomHash = /-[a-f0-9]{7,}$/i.test(cleaned) || /-\d{6,}$/.test(cleaned);
  const hasQueryParams = cleaned.includes('?');
  const isAbsurdlyLong = cleaned.length > 55;

  if (hasRandomHash || hasQueryParams || isAbsurdlyLong) {
    return {
      issue: 'Uncustomized / Lengthy LinkedIn URL',
      severity: 'LOW',
      suggestion: 'Your LinkedIn URL contains default system numbers. Shorten it, paste your clean handle below, and click Apply.',
      actionType: 'LINKEDIN_URL_FIX',
      targetField: 'linkedin',
      fieldLabel: 'Shortened LinkedIn URL',
      placeholder: 'e.g. linkedin.com/in/yourname',
      videoUrl: tutorialVideoUrl
    };
  }

  return null;
}

function checkBasicInfo(profile = {}) {
  const missingCons = [];
  const pInfo = profile.personalInfo || {};

  const requiredFields = [
    { key: 'fullName', label: 'Full Name', severity: 'HIGH', placeholder: 'Enter Full Name' },
    { key: 'phone', label: 'Phone Number', severity: 'HIGH', placeholder: '+91 XXXXXXXXXX' },
    { key: 'location', label: 'Permanent Address', severity: 'MEDIUM', placeholder: 'City, State' },
    { key: 'githubUrl', label: 'GitHub Profile Link', severity: 'MEDIUM', placeholder: 'github.com/your-username' },
    { key: 'dob', label: 'Date of Birth', severity: 'MEDIUM', placeholder: 'DD/MM/YYYY' },
    { key: 'gender', label: 'Gender', severity: 'LOW', placeholder: 'Male / Female' },
    { key: 'nationality', label: 'Nationality', severity: 'LOW', placeholder: 'Indian' },
    { key: 'fatherName', label: "Father's Name", severity: 'LOW', placeholder: "Father's Name" },
    { key: 'languages', label: 'Languages Known', severity: 'LOW', placeholder: 'English, Hindi, Bengali' }
  ];

  requiredFields.forEach(({ key, label, severity, placeholder }) => {
    const value = pInfo[key];
    if (!value || typeof value !== 'string' || !value.trim()) {
      missingCons.push({
        issue: `Missing ${label}`,
        severity: severity,
        suggestion: `Provide your ${label.toLowerCase()} for the resume header/details.`,
        actionType: 'BASIC_INFO_FIX',
        targetField: key,
        fieldLabel: label,
        placeholder: placeholder
      });
    }
  });

  if (!Array.isArray(profile.certifications) || profile.certifications.length === 0) {
    missingCons.push({
      issue: 'Missing Certifications',
      severity: 'LOW',
      suggestion: 'Adding technical certifications validates your domain expertise to recruiters.',
      actionType: 'BASIC_INFO_FIX',
      targetField: 'certifications',
      fieldLabel: 'Certification (Name - Issuer)',
      placeholder: 'e.g. AWS Certified Developer - Amazon'
    });
  }

  if (!Array.isArray(profile.projects) || profile.projects.length === 0) {
    missingCons.push({
      issue: 'Missing Technical Projects',
      severity: 'HIGH',
      suggestion: 'Add at least one technical project demonstrating your programming skills.',
      actionType: 'BASIC_INFO_FIX',
      targetField: 'projects',
      fieldLabel: 'Project (Title - Stack)',
      placeholder: 'e.g. College Lab App - Python, SQL'
    });
  }

  return missingCons;
}

module.exports = { 
  checkLinkedInUrl,
  checkBasicInfo 
};