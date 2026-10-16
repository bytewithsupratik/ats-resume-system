const mongoose = require('mongoose');

const ProfileSchema = new mongoose.Schema({
    personalInfo: {
        fullName: { type: String, required: true },
        email: { type: String, required: true },
        phone: { type: String },
        location: { type: String },
        linkedinUrl: { type: String },
        githubUrl: { type: String },
        portfolioUrl: { type: String },
        summary: { type: String }
    },
    skills: {
        technical: [String],
        tools: [String],
        softSkills: [String]
    },
    projects: [{
        title: { type: String, required: true },
        techStack: [String],
        liveLink: String,
        repoLink: String,
        bullets: [String]
    }],
    education: [{
        institution: { type: String, required: true },
        degree: { type: String, required: true },
        fieldOfStudy: String,
        gradYear: String,
        score: String
    }],
    certifications: [{
        name: { type: String, required: true },
        issuingOrganization: String,
        issueDate: String,
        credentialUrl: String
    }],
    achievements: [{
        title: { type: String, required: true },
        description: String,
        date: String
    }]
}, { timestamps: true });

module.exports = mongoose.model('Profile', ProfileSchema);