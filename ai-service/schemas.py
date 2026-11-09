from pydantic import BaseModel, Field
from typing import List, Optional

class PersonalInfo(BaseModel):
    fullName: str
    email: str
    phone: Optional[str] = None
    location: Optional[str] = None
    linkedinUrl: Optional[str] = None
    githubUrl: Optional[str] = None
    portfolioUrl: Optional[str] = None
    summary: Optional[str] = None

class AnalysisResponseSchema(BaseModel):
    targetJobTitle: str = Field
    scoring: Scoring
    audit: AuditFeedback
    tailoredContent: TailoredResumeContent
class Skills(BaseModel):
    technical: List[str] = []
    tools: List[str] = []
    softSkills: List[str] = []

class Project(BaseModel):
    title: str
    techStack: List[str] = []
    liveLink: Optional[str] = None
    repoLink: Optional[str] = None
    bullets: List[str] = []

class OptimizedProject(BaseModel):
    title: str
    techStack: List[str] = []
    liveLink: Optional[str] = None
    repoLink: Optional[str] = None
    optimizedBullets: List[str] = []

class Education(BaseModel):
    institution: str
    degree: str
    fieldOfStudy: Optional[str] = None
    gradYear: Optional[str] = None
    score: Optional[str] = None

class ExperienceItem(BaseModel):
    title: str
    organization: Optional[str] = None
    date: Optional[str] = None
    description: Optional[str] = None

class Certification(BaseModel):
    name: str
    issuingOrganization: Optional[str] = None
    issueDate: Optional[str] = None
    credentialUrl: Optional[str] = None

class Achievement(BaseModel):
    title: str
    description: Optional[str] = None
    date: Optional[str] = None

class ProfileSchemaObject(BaseModel):
    personalInfo: PersonalInfo
    skills: Skills
    experience: List[ExperienceItem] = []
    projects: List[Project] = []
    education: List[Education] = []
    certifications: List[Certification] = []
    achievements: List[Achievement] = []

class TailoredSummaryOutput(BaseModel):
    tailoredSummary: str

class PrioritizedSkillsOutput(BaseModel):
    technical: List[str]
    tools: List[str]
    softSkills: List[str]

class OptimizedProjectsOutput(BaseModel):
    optimizedProjects: List[OptimizedProject]

class ScoreBreakdown(BaseModel):
    keywordMatchScore: float
    relevanceScore: float
    impactMetricScore: float
    formattingStructureScore: float

class Scoring(BaseModel):
    overallMatchScore: float = Field(..., ge=0, le=100)
    breakdown: ScoreBreakdown

class ProItem(BaseModel):
    point: str
    category: str

class ConItem(BaseModel):
    issue: str
    severity: str 
    suggestion: str

class AuditAndScoringOutput(BaseModel):
    scoring: Scoring
    pros: List[ProItem]
    cons: List[ConItem]
    missingKeywords: List[str]

class AuditFeedback(BaseModel):
    pros: List[ProItem]
    cons: List[ConItem]
    missingKeywords: List[str]

class TailoredResumeContent(BaseModel):
    personalInfo: PersonalInfo
    tailoredSummary: str
    prioritizedSkills: Skills
    experience: List[ExperienceItem] = []
    optimizedProjects: List[OptimizedProject]
    education: List[Education] = []
    certifications: List[Certification] = []
    achievements: List[Achievement] = []

class AnalysisResponseSchema(BaseModel):
    scoring: Scoring
    audit: AuditFeedback
    tailoredContent: TailoredResumeContent