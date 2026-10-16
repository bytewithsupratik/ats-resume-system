const mongoose = require('mongoose');

const JobAnalysisSchema = new mongoose.Schema({
    profileId: { type: mongoose.Schema.Types.ObjectId, ref: 'Profile', required: true },
    targetJob: {
        jobTitle: String,
        rawJobDescription: { type: String, required: true },
        extractedKeywords: {
            technicalSkills: [String],
            softSkills: [String],
            domainKnowledge: [String]
        }
    },
    scoring: {
        overallMatchScore: { type: Number, required: true, min: 0, max: 100 },
        breakdown: {
            keywordMatchScore: Number,
            projectRelevanceScore: Number,
            impactMetricScore: Number,
            formattingStructureScore: Number
        }
    },
    feedback: {
        pros: [{ point: String, category: String }],
        cons: [{ issue: String, severity: { type: String, enum: ['HIGH', 'MEDIUM', 'LOW'] }, suggestion: String }],
        missingKeywords: [String]
    },
    tailoredResume: {
        tailoredSummary: String,
        prioritizedSkills: {
            technical: [String],
            tools: [String],
            softSkills: [String]
        },
        optimizedProjects: [{
            title: String,
            techStack: [String],
            liveLink: String,
            repoLink: String,
            optimizedBullets: [String]
        }],
        education: [mongoose.Schema.Types.Mixed],
        certifications: [mongoose.Schema.Types.Mixed],
        achievements: [mongoose.Schema.Types.Mixed]
    }
}, { timestamps: { createdAt: true, updatedAt: false } });

module.exports = mongoose.model('JobAnalysis', JobAnalysisSchema);