/**
 * backend/util.js
 */

function checkLinkedInUrl(rawUrl) {
  const tutorialVideoUrl = 'https://youtu.be/oga5s3Yngc8?si=C5pl-yJ_vWoMdJ0K';

  // 1. Missing URL
  if (!rawUrl || typeof rawUrl !== 'string' || !rawUrl.trim()) {
    return {
      issue: 'Missing LinkedIn Profile URL',
      severity: 'MEDIUM',
      suggestion: 'Add your shortened LinkedIn URL to your resume header.',
      actionType: 'LINKEDIN_URL_FIX',
      targetField: 'linkedin',
      fieldLabel: 'LinkedIn Profile URL',
      placeholder: 'e.g. linkedin.com/in/yourname',
      videoUrl: tutorialVideoUrl
    };
  }

  const cleaned = rawUrl.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '').trim();

  // 2. ONLY flag if it has an ugly auto-generated hash (e.g. -13552418b or -9b12a84)
  // or tracking queries, or is truly absurdly long (> 55 chars)
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

  // Already shortened and clean -> DO NOT FLAG
  return null;
}

function checkBasicInfo(personalInfo = {}) {
  const missingCons = [];

  const requiredFields = [
    { key: 'fullName', label: 'Full Name', severity: 'HIGH', placeholder: 'Full Name' },
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
    const value = personalInfo[key];
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

  return missingCons;
}

module.exports = { 
  checkLinkedInUrl,
  checkBasicInfo 
};