import os
import re
import json
import asyncio
import traceback
from fastapi import FastAPI, HTTPException
from groq import AsyncGroq
from dotenv import load_dotenv
from schemas import (
    ProfileSchemaObject,
    AnalysisResponseSchema,
    TailoredSummaryOutput,
    PrioritizedSkillsOutput,
    OptimizedProjectsOutput,
    AuditAndScoringOutput,
    AuditFeedback,
    TailoredResumeContent
)
from pydantic_core import to_jsonable_python

load_dotenv()
api_key = os.getenv("GROQ_API_KEY")

if not api_key:
    raise RuntimeError("GROQ_API_KEY is missing from environment variables.")

client = AsyncGroq(api_key=api_key)
app = FastAPI(title="ATS AI Microservice", version="1.0")

MODELS = ["openai/gpt-oss-120b", "openai/gpt-oss-20b"]

async def _groq_structured(system_prompt: str, user_prompt: str, schema_class, temperature: float = 0.1):
    clean_schema = to_jsonable_python(schema_class.model_json_schema())
    schema_str = json.dumps(clean_schema)
    full_system = f"{system_prompt}\n\nSTRICT REQUIREMENT: Output MUST be valid JSON matching this schema:\n{schema_str}"
    last_err = None
    for model_name in MODELS:
        try:
            print(f"[*] Calling {model_name}...")
            response = await client.chat.completions.create(
                model=model_name,
                messages=[
                    {"role": "system", "content": full_system},
                    {"role": "user", "content": str(user_prompt)}
                ],
                response_format={"type": "json_object"},
                temperature=temperature
            )
            raw_content = response.choices[0].message.content
            return json.loads(raw_content)
        except Exception as e:
            last_err = e
            print(f"[!] Warning on {model_name}: {e}")
            await asyncio.sleep(1.0)
            continue
            
    raise RuntimeError(f"All Groq models failed. Last error: {last_err}")

@app.get("/")
async def root():
    return {"message": "ATS AI Microservice is running successfully", "docs": "/docs"}

@app.get("/health")
async def health_check():
    return {"status": "ok"}

@app.post("/ai/parse-linkedin")
async def parse_linkedin(payload: dict):
    raw_text = payload.get("rawText")
    if not raw_text:
        raise HTTPException(status_code=400, detail="rawText is required.")
    
    system_prompt = """You are an expert HR data parser.
STRICT ACCURACY RULES:
1. Extract ALL actual work experience entries into the 'experience' array.
2. If phone, linkedin, or github are NOT in the text, you MUST output null. NEVER invent mock contact details.
3. If candidate has no experience, output 'experience': []."""
    user_prompt = f"Extract all details into JSON from this raw LinkedIn text:\n{raw_text}"
    
    return await _groq_structured(system_prompt, user_prompt, ProfileSchemaObject, temperature=0.0)

async def generate_summary(candidate_summary: str, skills: dict, jd: str):
    system_prompt = """You are an elite ATS Resume Optimization Specialist and Technical Recruiter.
Your objective is to craft a high-impact, ATS-optimized Professional Summary.

Strict Compliance Rules:
1. FACT PRESERVATION: NEVER invent or inflate years of experience, credentials, or unverified technical tools.
2. NO EMPTY BUZZWORDS: Avoid generic adjectives like 'hard-working', 'passionate', or 'enthusiastic'.
3. LENGTH & STRUCTURE: Exactly 2 to 3 concise sentences highlighting core verified stack and engineering capability.
4. FORBIDDEN: NEVER mention salary, pay scale, remuneration, or 'UGC norms' anywhere in the output."""
    user_prompt = f"Candidate Current Summary: {candidate_summary}\nCandidate Skills: {json.dumps(skills)}\nTarget JD:\n{jd}"
    return await _groq_structured(system_prompt, user_prompt, TailoredSummaryOutput, temperature=0.2)

async def generate_prioritized_skills(candidate_skills: dict, jd: str):
    system_prompt = """You are an elite ATS Technical Resume Categorizer and Keyword Strategist.
Your task is to categorize verified skills into 3 STRICT technical buckets:
1. 'technical': Programming Languages, Runtimes & Core Web Frameworks.
2. 'tools': Developer Tools, Databases, Platforms & Infrastructure.
3. 'softSkills': Core Technical Concepts & Methodologies (DSA, OOP, System Design).
NEGATIVE CONSTRAINT: Drop all personal hobbies, photography, sports, or unrelated trades completely."""
    user_prompt = f"Candidate Skills: {json.dumps(candidate_skills)}\nTarget JD:\n{jd}"
    return await _groq_structured(system_prompt, user_prompt, PrioritizedSkillsOutput, temperature=0.1)

async def generate_optimized_projects(candidate_projects: list, jd: str):
    system_prompt = """You are an elite Technical Resume Architect.
Optimize project bullet points to maximize ATS ranking and technical authority:
1. FACT PRESERVATION: NEVER invent fake numerical metrics (e.g. do not invent 'scaled to 100k users').
2. POWER VERB DISCIPLINE: Every bullet must start with a strong action verb (Architected, Engineered, Implemented, Streamlined).
3. GOOGLE X-Y-Z FORMULA: 'Accomplished [X] using [Y], resulting in [Z]'.
4. Exactly 2 to 3 focused bullet points per project. NEVER invent new project titles or fake links."""
    user_prompt = f"Candidate Projects: {json.dumps(candidate_projects)}\nTarget JD:\n{jd}"
    return await _groq_structured(system_prompt, user_prompt, OptimizedProjectsOutput, temperature=0.2)

async def generate_audit_and_score(profile_data: dict, jd: str):
    system_prompt = """You are an enterprise-grade Applicant Tracking System (ATS) Parser and Principal Technical Recruiter.
Conduct a mathematically rigorous gap analysis:

1. DYNAMIC JOB TITLE EXTRACTION: Extract the exact target job title/role targeted in the JD (e.g., 'Frontend Developer', 'Assistant Professor - Computer Science', 'DevOps Engineer').
   - MUST be 2 to 5 words in Title Case.
   - FORBIDDEN: NEVER output 'About the job', 'Job Description', 'UGC Norms', or company names.
2. EXPERIENCE SURPLUS RULE: If the JD asks for X years (e.g. 3 years) and the candidate has MORE experience, that is a PRO (strength), NEVER a con or gap.
3. DURATION IS NOT A KEYWORD: NEVER output numbers or durations (e.g., '3 years', '5+ years') in missingKeywords.
4. missingKeywords must ONLY contain concrete missing technical skills, tools, or frameworks.
5. FORBIDDEN: Do NOT mention salary, pay scale, or UGC norms."""
    user_prompt = f"Candidate Profile:\n{json.dumps(profile_data)}\n\nTarget Job Description:\n{jd}"
    return await _groq_structured(system_prompt, user_prompt, AuditAndScoringOutput, temperature=0.1)

@app.post("/ai/analyze-and-tailor", response_model=AnalysisResponseSchema)
async def analyse_and_tailor(payload: dict):
    profile_data = payload.get("profileData")
    job_description = payload.get("jobDescription")

    if not profile_data or not job_description:
        raise HTTPException(status_code=400, detail="profileData and jobDescription are required.")

    personal_info = profile_data.get("personalInfo", {})
    existing_skills = profile_data.get("skills", {})
    existing_projects = profile_data.get("projects", [])
    existing_experience = profile_data.get("experience", [])

    try:
        summary_res = await generate_summary(personal_info.get("summary", ""), existing_skills, job_description)
        skills_res = await generate_prioritized_skills(existing_skills, job_description)
        projects_res = await generate_optimized_projects(existing_projects, job_description)
        audit_res = await generate_audit_and_score(profile_data, job_description)

        # Python-safe dynamic title cleaning (replaces JS regex bug)
        raw_title = audit_res.get("targetJobTitle") or ""
        extracted_title = str(raw_title).strip()
        if not extracted_title or re.search(r"about the job|job description|ugc norms", extracted_title, re.IGNORECASE):
            extracted_title = "Full Stack - Web Developer"

        return AnalysisResponseSchema(
            targetJobTitle=extracted_title,
            scoring=audit_res["scoring"],
            audit=AuditFeedback(
                pros=audit_res["pros"],
                cons=audit_res["cons"],
                missingKeywords=audit_res["missingKeywords"]
            ),
            tailoredContent=TailoredResumeContent(
                personalInfo=personal_info,
                tailoredSummary=summary_res["tailoredSummary"],
                prioritizedSkills=skills_res,
                experience=existing_experience,
                optimizedProjects=projects_res["optimizedProjects"],
                education=profile_data.get("education", []),
                certifications=profile_data.get("certifications", []),
                achievements=profile_data.get("achievements", [])
            )
        )
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Pipeline error: {str(e)}")