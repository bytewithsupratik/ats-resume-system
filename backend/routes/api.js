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

        // AI Microservice Call
        const aiResponse = await axios.post(`${AI_SERVICE_URL}/ai/analyze-and-tailor`, {
            profileData: profile,
            jobDescription: jobDescription
        });

        const aiData = aiResponse.data;
        const pInfo = profile.personalInfo || {};

        // Run Deterministic Checks
        const linkedInCon = checkLinkedInUrl(pInfo.linkedinUrl);
        const basicInfoCons = checkBasicInfo(pInfo);

        const finalCons = [...basicInfoCons];
        if (linkedInCon) finalCons.unshift(linkedInCon);
        if (aiData.audit?.cons) finalCons.push(...aiData.audit.cons);

        const newAnalysis = new JobAnalysis({
            profileId: profile._id,
            targetJob: {
                jobTitle: aiData.targetJobTitle || 'Professional',
                rawJobDescription: jobDescription
            },
            scoring: aiData.scoring,
            audit: {
                pros: aiData.audit?.pros || [],
                cons: finalCons,
                missingKeywords: aiData.audit?.missingKeywords || []
            },
            tailoredResume: aiData.tailoredResume || aiData.tailoredContent
        });
        const savedAnalysis = await newAnalysis.save();

        res.status(200).json({
            success: true,
            analysisId: savedAnalysis._id,
            profileId: profile._id,
            scoring: savedAnalysis.scoring,
            audit: savedAnalysis.audit,
            tailoredResume: savedAnalysis.tailoredResume
        });
    } catch (error) {
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