const mongoose = require('mongoose');

const JobAnalysisSchema = new mongoose.Schema(
    {
        profileId: 
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Profile',
            required: true
        },

        targetJob:
        {
            jobTitle: { type: String, required: true },
            rawJobDescription: { type: String, required: true },
            // extractedKeywords: 
            // {
            //     technicalSkills: [{ type: String }],
            //     softSkills: [{ type: String }],
            //     domainKnowledge: [{ type: String }]
            // }
        },

        scoring:
        {
            overallMatchScore: { type: Number, required: true },
            breakdown: 
            {
                keywordMatchScore: { type: Number, default: 0 },
                relevanceScore: { type: Number, default: 0 },
                impactMetricScore: { type: Number, default: 0 },
                formattingStructureScore: { type: Number, default: 0 }
            }
        },

        audit: 
        {
            pros:
            [
                {
                    point: { type: String },
                    category: { type: String, default: 'General' }
                }
            ],
            cons: 
            [
                {
                    issue: { type: String },
                    severity: { type: String, enum: ['LOW', 'MEDIUM', 'HIGH'], default: 'MEDIUM' },
                    suggestion: { type: String, default: '' }
                }
            ],
            missingKeywords: [{ type: String }]
        },

        tailoredResume: 
        {
            tailoredSummary: { type: String, default: '' },
            prioritizedSkills: 
            {
                technicalSkills: [{ type: String }],
                tools: [{ type: String }],
                softSkills: [{ type: String }]
            },
            optimizedProjects:
            [
                {
                    title: { type: String, default: '' },
                    techStack: [{ type: String }],
                    liveLink: { type: String, default: '' },
                    repoLink: { type: String, default: '' },
                    optimizedDescription: [{ type: String }]
                }
            ]
        }        
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model('JobAnalysis', JobAnalysisSchema);