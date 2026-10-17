const mongoose = require('mongoose');

const ProfileSchema = new mongoose.Schema(
    {
        personalInfo: {
            fullName: { type: String, required: true },
            email: { type: String, required: true, match: [/\S+@\S+\.\S+/, 'Please enter a valid email address']  },
            phone: { type: String, default: '' },
            location: { type: String, default: '' },
            linkedinUrl: { type: String, default: '' },
            portfolioUrl: { type: String, default: '' },
            summary: { type: String, default: '' }, 
        },

        skills: {
            technical: [{ type: String }],
            tools: [{ type: String }],
            softSkills: [{ type: String }]
        },

        projects: 
        [
            {
                title: { type: String, required: true },
                description: { type: String, default: '' },
                techStack: [{ type: String }],
                liveLink: { type: String, default: '' },
                githubLink: { type: String, default: '' }                
            }
        ],

        education: 
        [
            {
                institution: { type: String, required: true },
                degree: { type: String, required: true },
                fieldOfStudy: { type: String, required: true },
                startDate: { type: String, default: ' ' },
                endDate: { type: String, default: ' ' }
            }
        ],

        achievements: 
        [
            {
                title: { type: String, required: true },
                description: { type: String, default: '' },
                date: { type: String, default: ' ' }
            }
        ]
    },

    {
        timestamps: true
    } 
);

module.exports = mongoose.model('Profile', ProfileSchema);