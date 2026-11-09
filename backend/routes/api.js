const express = require('express');
const router = express.Router();
const multer = require('multer');
const pdfParse = require('pdf-parse');
const axios = require('axios');

const Profile = require('../models/Profile');
const JobAnalysis = require('../models/JobAnalysis');
const { checkLinkedInUrl, checkBasicInfo } = require('../util');

const upload = multer({ 
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 }
});

const AI_SERVICE_URL = (process.env.AI_SERVICE_URL || 'http://localhost:8000').trim().replace(/\/$/, '');

function extractCleanJobTitle(jdText = '', aiTitle = '') {
    if (aiTitle && typeof aiTitle === 'string' && aiTitle.trim().length > 2) {
        const cleaned = aiTitle.trim();
        if (!/^(about the job|job description|target role|professional|overview|ugc norms)$/i.test(cleaned)) {
            return cleaned;
        }
    }

    const lines = jdText.split('\n').map(l => l.trim()).filter(Boolean);
    
    for (const line of lines) {
        const match = line.match(/^(?:job title|role|position|designation|hiring for)\s*[:\-]\s*(.+)$/i);
        if (match && match[1]) {
            const candidate = match[1].trim();
            if (candidate.length > 2 && !/about the job|ugc/i.test(candidate)) return candidate.slice(0, 45);
        }
    }

    // Fallback to the first clean headline line of the JD
    for (const line of lines) {
        if (!/^(about the job|job description|overview|requirements|responsibilities|details|we are hiring):?/i.test(line) && line.length > 2 && line.length < 50) {
            return line;
        }
    }

    return lines[0] ? lines[0].slice(0, 40) : 'Professional';
}

router.post('/profiles/manual', async (req, res) => {
    try {
        const newProfile = new Profile(req.body);
        const savedProfile = await newProfile.save();
        res.status(201).json({ success: true, profileId: savedProfile._id, profileData: savedProfile });
    } catch (error) {
        res.status(422).json({ success: false, message: error.message || 'Validation error' });
    }
});

router.post('/profiles/upload-pdf', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ success: false, message: 'PDF file required.' });

        const parsedPdf = await pdfParse(req.file.buffer);
        const rawText = parsedPdf.text;
        if (!rawText || !rawText.trim()) return res.status(400).json({ success: false, message: 'Could not extract text.' });

        const aiResponse = await axios.post(`${AI_SERVICE_URL}/ai/parse-linkedin`, { rawText });
        const newProfile = new Profile(aiResponse.data);
        const savedProfile = await newProfile.save();

        res.status(201).json({ success: true, profileId: savedProfile._id, profileData: savedProfile });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error processing PDF.' });
    }
});

router.post(['/profiles/:id/analyze', '/profiles/:id/analyse'], async (req, res) => {
    try {
        const { id } = req.params;
        const jobDescription = req.body.jobDescription || req.body.jobdescription;
        if (!jobDescription || !jobDescription.trim()) {
            return res.status(400).json({ success: false, message: 'Job Description is required.' });
        }

        const profile = await Profile.findById(id);
        if (!profile) return res.status(404).json({ success: false, message: 'Profile not found.' });

        const aiResponse = await axios.post(`${AI_SERVICE_URL}/ai/analyze-and-tailor`, {
            profileData: profile,
            jobDescription: jobDescription
        });

        const aiData = aiResponse.data;
        const pInfo = profile.personalInfo || {};

        // 1. Run deterministic checks
        const linkedInCon = checkLinkedInUrl(pInfo.linkedinUrl);
        const basicInfoCons = checkBasicInfo(profile.toObject());

        // 2. Filter out false experience gaps, generic personal details, & UGC salary noise
        const rawAiCons = aiData.audit?.cons || [];
        const filteredAiCons = rawAiCons.filter(c => {
            const text = `${c.issue || ''} ${c.suggestion || ''}`.toLowerCase();
            if (text.includes('personal detail') || text.includes('contact information')) return false;
            if (text.includes('salary') || text.includes('ugc')) return false;
            if (/\b(\d+\+?\s*(?:to\s*\d+\s*)?years?|\d+\s*yrs?)\b/i.test(text) && text.includes('experience')) return false;
            return true;
        });

        // 3. Filter durations from missing keywords
        const filteredKeywords = (aiData.audit?.missingKeywords || []).filter(kw => {
            return !/\b(\d+\+?\s*years?|\d+\s*yrs?|experience|salary|ugc)\b/i.test(kw);
        });

        const finalCons = [...basicInfoCons];
        if (linkedInCon) finalCons.unshift(linkedInCon);
        finalCons.push(...filteredAiCons);

        // 4. Extract clean job title (Never "About the job")
        const targetJobTitle = extractCleanJobTitle(jobDescription, aiData.targetJobTitle);

        // 5. Sanitize summary from salary / UGC norms
        if (aiData.tailoredContent?.tailoredSummary) {
            aiData.tailoredContent.tailoredSummary = aiData.tailoredContent.tailoredSummary
                .replace(/salary\s*(as\s*per\s*)?ugc\s*norms/gi, '')
                .replace(/\s+/g, ' ')
                .trim();
        }

        const newAnalysis = new JobAnalysis({
            profileId: profile._id,
            targetJob: {
                jobTitle: targetJobTitle,
                rawJobDescription: jobDescription
            },
            scoring: aiData.scoring,
            audit: {
                pros: aiData.audit?.pros || [],
                cons: finalCons,
                missingKeywords: filteredKeywords
            },
            tailoredResume: aiData.tailoredResume || aiData.tailoredContent
        });
        const savedAnalysis = await newAnalysis.save();

        res.status(200).json({
            success: true,
            analysisId: savedAnalysis._id,
            profileId: profile._id,
            targetJob: savedAnalysis.targetJob,
            scoring: savedAnalysis.scoring,
            audit: savedAnalysis.audit,
            tailoredResume: savedAnalysis.tailoredResume
        });
    } catch (error) {
        console.error('Analysis error:', error);
        res.status(500).json({ success: false, message: 'Analysis failed.' });
    }
});

router.patch('/profiles/:id/basic-info', async (req, res) => {
    try {
        const { field, value } = req.body;
        if (!field) return res.status(400).json({ success: false, message: 'Field name required.' });

        const cleanVal = typeof value === 'string' ? value.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '').trim() : value;
        const updateKey = `personalInfo.${field}`;

        const updated = await Profile.findByIdAndUpdate(
            req.params.id,
            { $set: { [updateKey]: cleanVal } },
            { new: true }
        );
        res.status(200).json({ success: true, profile: updated });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Update failed.' });
    }
});

module.exports = router;