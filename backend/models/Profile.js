const mongoose = require('mongoose');

const ProfileSchema = new mongoose.Schema(
    {
        personalInfo: {
            fullName: { type: String, default: '' },
            email: { type: String, default: '' },
            phone: { type: String, default: '' },
            location: { type: String, default: '' },
            linkedinUrl: { type: String, default: '' },
            githubUrl: { type: String, default: '' },
            portfolioUrl: { type: String, default: '' },
            summary: { type: String, default: '' }, 
            dob: { type: String, default: '' },
            gender: { type: String, default: '' },
            nationality: { type: String, default: '' },
            fatherName: { type: String, default: '' },
            languages: { type: String, default: '' }
        },

        skills: {
            technical: [{ type: String }],
            tools: [{ type: String }],
            softSkills: [{ type: String }]
        },

        experience: [
            {
                title: { type: String, default: '' },
                organization: { type: String, default: '' },
                date: { type: String, default: '' },
                description: { type: String, default: '' }
            }
        ],

        projects: [
            {
                title: { type: String, default: '' },
                description: { type: String, default: '' },
                techStack: [{ type: String }],
                liveLink: { type: String, default: '' },
                githubLink: { type: String, default: '' }                
            }
        ],

        education: [
            {
                institution: { type: String, default: '' },
                degree: { type: String, default: '' },
                fieldOfStudy: { type: String, default: '' },
                startDate: { type: String, default: '' },
                endDate: { type: String, default: '' }
            }
        ],

        certifications: [
            {
                name: { type: String, default: '' },
                issuingOrganization: { type: String, default: '' },
                issueDate: { type: String, default: '' }
            }
        ],

        achievements: [
            {
                title: { type: String, default: '' },
                description: { type: String, default: '' },
                date: { type: String, default: '' }
            }
        ]
    },
    {
        timestamps: true
    } 
);

module.exports = mongoose.model('Profile', ProfileSchema);