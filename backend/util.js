function checkLinkedInUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string' || !rawUrl.trim()) {
    return {
      issue: 'Missing LinkedIn Profile URL',
      severity: 'MEDIUM',
      suggestion: 'Shorten your LinkedIn profile URL and attach it to your resume header.',
      actionType: 'LINKEDIN_URL_FIX',
      videoUrl: 'https://youtu.be/oga5s3Yngc8?si=C5pl-yJ_vWoMdJ0K'
    };
  }

  const cleaned = rawUrl.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '').trim();

  // 2. Detect default uncustomized URLs:
  // - Contains auto-generated random trailing hex/numbers (e.g., -13552418b or -9b12a84)
  // - Contains tracking query parameters (?trk=...)
  // - Length exceeds 30 characters
  const hasRandomHash = /-[a-f0-9]{6,12}$/i.test(cleaned);
  const hasQueryParams = cleaned.includes('?');
  const isExcessivelyLong = cleaned.length > 30;

  if (hasRandomHash || hasQueryParams || isExcessivelyLong) {
    return {
      issue: 'Uncustomized / Lengthy LinkedIn URL',
      severity: 'LOW',
      suggestion: 'Your LinkedIn URL is uncustomized. Follow the video to create a clean slug, paste it below, and click Add LinkedIn.',
      actionType: 'LINKEDIN_URL_FIX',
      videoUrl: 'https://youtu.be/oga5s3Yngc8?si=C5pl-yJ_vWoMdJ0K'
    };
  }

  // URL is already clean (e.g. linkedin.com/in/bibek-mandal) -> No con generated
  return null;
}

function checkBasicInfo(personalInfo = {}) {
  const missingCons = [];

  const requiredFields = [
    { key: 'fullName', label: 'Full Name', severity: 'HIGH' },
    { key: 'phone', label: 'Phone Number', severity: 'HIGH' },
    { key: 'location', label: 'Permanent Address', severity: 'MEDIUM' },
    { key: 'githubUrl', label: 'GitHub Profile Link', severity: 'MEDIUM' },
    { key: 'dob', label: 'Date of Birth', severity: 'MEDIUM' },
    { key: 'gender', label: 'Gender', severity: 'LOW' },
    { key: 'nationality', label: 'Nationality', severity: 'LOW' },
    { key: 'fatherName', label: "Father's Name", severity: 'LOW' },
    { key: 'languages', label: 'Languages Known', severity: 'LOW' }
  ];

  requiredFields.forEach(({ key, label, severity }) => {
    const value = personalInfo[key];
    if (!value || typeof value !== 'string' || !value.trim()) {
      missingCons.push({
        issue: `Missing ${label}`,
        severity: severity,
        suggestion: `Please enter your ${label.toLowerCase()} to complete the required college placement details.`,
        actionType: 'BASIC_INFO_FIX',
        targetField: key,
        fieldLabel: label
      });
    }
  });

  return missingCons;
}

module.exports = { 
  checkLinkedInUrl,
  checkBasicInfo 
};