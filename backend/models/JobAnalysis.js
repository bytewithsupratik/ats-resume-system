const mongoose = require('mongoose');

const JobAnalysisSchema = new mongoose.Schema(
    {
        profileId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Profile',
            default: ''
        },
        targetJob: {
            jobTitle: { type: String },
            rawJobDescription: { type: String }
        },
        scoring: {
            overallMatchScore: { type: Number, default: 0 },
            breakdown: {
                keywordMatchScore: { type: Number, default: 0 },
                relevanceScore: { type: Number, default: 0 },
                impactMetricScore: { type: Number, default: 0 },
                formattingStructureScore: { type: Number, default: 0 }
            }
        },
        audit: {
            pros: [
                {
                    point: { type: String },
                    category: { type: String, default: 'General' }
                }
            ],
            cons: [
                {
                    issue: { type: String },
                    severity: { type: String, default: 'MEDIUM' },
                    suggestion: { type: String, default: '' },
                    actionType: { type: String, default: '' },
                    targetField: { type: String, default: '' },
                    fieldLabel: { type: String, default: '' },
                    placeholder: { type: String, default: '' },
                    videoUrl: { type: String, default: '' }
                }
            ],
            missingKeywords: [{ type: String }]
        },
        tailoredResume: {
            type: mongoose.Schema.Types.Mixed,
            default: {}
        }        
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model('JobAnalysis', JobAnalysisSchema);