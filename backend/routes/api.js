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
    limit: { fileSize: 10 * 1024 * 1024 } //10MB
});

const AI_SERVICE_URL = (process.env.AI_SERVICE_URL || 'http://localhost:8000').trim().replace(/\/$/, '');

router.post('/profiles/manual', async (req, res) => {
    try {
        const profileData = req.body;

        const newProfile = new Profile(profileData);
        const savedProfile = await newProfile.save();

        res.status(201).json({
            success: true,
            profileId: savedProfile._id,
            profileData: savedProfile
        });
    } catch (error) {
        console.error('Error creating manual profile:', error);
        res.status(422).json({
            success: false,
            message: error.message || 'Validation error occured'
        });
    }
});

router.post('/profiles/upload-pdf', upload.single('file'), async (req,res) => {
    try {
        if (!req.file) {
            return res.status(400).json ({
                success: false,
                message: 'No file uploaded or invalid file format. PDF required.' 
            });
        }
        const parsedPdf = await pdfParse(req.file.buffer);
        const rawText = parsedPdf.text;

        if (!rawText || rawText.trim().length == 0)
        {
            return res.status(400).json ({
                success: false,
                message: 'Failed to extract text from the PDF'
            });     
        }

        let aiResponse;
        try {
            aiResponse = await axios.post(`${AI_SERVICE_URL}/ai/parse-linkedin`, {
                rawText: rawText
            });
        } catch (aiErr) {
            console.error('Ai Microservice Error: ', aiErr.message);
            return res.status(502).json ({
                success: false,
                message: 'Ai microservice is offline or returned an error'
            });    
        }

        const structuredData = aiResponse.data;
        const newProfile = new Profile(structuredData);
        const savedProfile = await newProfile.save();

        res.status(201).json ({
            success: true,
            profileId: savedProfile._id,
            profileData: savedProfile
        });
    } catch (error) {
        console.error('Error in PDF upload route', error);
        res.status(500).json ({
            success: false,
            message: 'Internal server error occured while passing pdf.'
        });
    }
});

router.post('/profiles/:id/analyze', async (req, res) => {
    try {
        const { id } = req.params;
        const { jobDescription } = req.body;

        if (!jobDescription || jobDescription.trim().length == 0) {
            return res.status(400).json ({
                success: false,
                message: 'Job Description text is required.'
            });
        }
        const profile = await Profile.findById(id);
        if (!profile) {
            return res.status(404).json ({
                success: false,
                message: 'Profile not found!'
            });
        }
        let aiResponse;
        try {
            aiResponse = await axios.post(`${AI_SERVICE_URL}/ai/analyze-and-tailor`, {
                profileData: profile,
                jobDescription: jobDescription
            });
        } catch (aiErr) {
            console.error('Ai Microservice Analyze Error: ', aiErr.message);
            return res.status(502).json ({
                success: false,
                message: 'Ai microservice failed to evaluate the resume.'
            });    
        }
        
        const aiData = aiResponse.data;
        const pInfo = profile.personalInfo || {};

        // 1. Run your deterministic checks
        const linkedInCon = checkLinkedInUrl(pInfo.linkedinUrl);
        const basicInfoCons = checkBasicInfo(pInfo);

        // 2. Build the final cons list
        const finalCons = [...basicInfoCons];
        if (linkedInCon) {
            finalCons.unshift(linkedInCon);
        }
        if (aiData.audit?.cons) {
            finalCons.push(...aiData.audit.cons);
        }

        // 3. Save with finalCons
        const newAnalysis = new JobAnalysis ({
            profileId: profile._id,
            targetJob: {
                jobTitle: aiData.targetJobTitle || 'Professional',
                rawJobDescription: jobDescription
            },
            scoring: aiData.scoring,
            audit: {
                pros: aiData.audit?.pros || [],
                cons: finalCons, // ✅ Pass our combined cons!
                missingKeywords: aiData.audit?.missingKeywords || []
            },
            tailoredResume: aiData.tailoredResume || aiData.tailoredContent
        });
        const savedAnalysis = await newAnalysis.save();

        res.status(200).json ({
            success: true,
            analysisId: savedAnalysis._id,
            profileId: profile._id,
            scoring: savedAnalysis.scoring,
            audit: savedAnalysis.audit, // ✅ Now contains LinkedIn + Basic Info cons!
            tailoredResume: savedAnalysis.tailoredResume
        });
    } catch (error) {
        console.error('Error during analysis', error);
        return res.status(500).json ({
            success: false,
            message: 'Failed to process ATS analysis.'
        });
    }
});

router.patch('/profiles/:id/linkedin', async (req, res) => {
    try {
        const { id } = req.params;
        const { linkedinUrl } = req.body;

        if (!linkedinUrl || !linkedinUrl.trim()) {
            return res.status(400).json({
                success: false,
                message: 'A shortened LinkedIn URL is required.'
            });
        }

        // Clean user input (strip https://, www., trailing slash)
        const cleanUrl = linkedinUrl.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '').trim();

        // Update profile in MongoDB
        const updatedProfile = await Profile.findByIdAndUpdate(
            id,
            { $set: { 'personalInfo.linkedinUrl': cleanUrl } },
            { new: true }
        );

        if (!updatedProfile) {
            return res.status(404).json({
                success: false,
                message: 'Profile not found.'
            });
        }

        res.status(200).json({
            success: true,
            message: 'LinkedIn URL updated successfully.',
            updatedUrl: cleanUrl,
            profile: updatedProfile
        });
    } catch (error) {
        console.error('Error updating LinkedIn URL:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update LinkedIn URL.'
        });
    }
});

module.exports = router;