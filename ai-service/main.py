import os
import json
import asyncio
import time
import traceback
from fastapi import FastAPI, HTTPException
from groq import AsyncGroq
from dotenv import load_dotenv
from schemas import ProfileSchemaObject, AnalysisResponseSchema, TailoredSummaryOutput, PrioritizedSkillsOutput, OptimizedProjectsOutput,AuditAndScoringOutput,Scoring,AuditFeedback,TailoredResumeContent
from pydantic_core import to_jsonable_python

load_dotenv()
api_key = os.getenv("GROQ_API_KEY")

if not api_key:
    raise RuntimeError("API_KEY is missing from environment variables.")

client = AsyncGroq(api_key=api_key)
app = FastAPI(title="ATS AI Microservice", version="1.0")

MODELS = ["openai/gpt-oss-120b", "openai/gpt-oss-20b"]

async def _groq_structured(system_prompt: str, user_prompt: str, schema_class, temperature: float = 0.2):
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
    
    system_prompt = "You are an expert HR data parser. Extract structured candidate profile details without hallucinating facts."
    user_prompt = f"Extract all details into JSON from this raw LinkedIn text:\n{raw_text}"
    
    return await _groq_structured(system_prompt, user_prompt, ProfileSchemaObject, temperature=0.1)

async def generate_summary(candidate_summary: str, skills: dict, jd: str):
    system_prompt = """You are an elite ATS Resume Optimization Specialist and Technical Recruiter.
                    Your objective is to craft a high-impact, ATS-optimized Professional Summary (NOT an objective).

                    Strict Compliance Rules:
                    1. FACT PRESERVATION: NEVER invent or inflate years of experience, credentials, or unverified technical tools.
                    2. GRAMMAR & VOICE: Strictly write in implied first-person telegraphic resume voice. FORBIDDEN words: "I", "me", "my", "our", "he", "she".
                    3. NO EMPTY BUZZWORDS: FORBIDDEN phrases: "results-driven", "hard-working", "passionate", "synergistic", "fast learner", "think outside the box".
                    4. LENGTH & STRUCTURE: Exactly 2 to 3 concise, punchy sentences:
                    - Sentence 1: Professional identity and core verified tech stack directly matching the Job Description.
                    - Sentence 2: Tangible engineering capability (building systems, scaling databases, designing APIs).
                    - Sentence 3: Value alignment toward the specific challenges mentioned in the target Job Description.
                    5. KEYWORD DENSITY: Naturally integrate high-priority keywords from the JD that are factually grounded in the candidate's verified skills."""

    user_prompt = f"Candidate Current Summary: {candidate_summary}\nCandidate Skills: {json.dumps(skills)}\nTarget JD:\n{jd}"
    
    return await _groq_structured(system_prompt, user_prompt, TailoredSummaryOutput, temperature=0.3)

async def generate_prioritized_skills(candidate_skills: dict, jd: str):
    system_prompt = """
                    You are an elite ATS Technical Resume Categorizer and Keyword Strategist.
                    Your task is to categorize verified skills into 3 STRICT technical buckets and PURGE all non-technical hobbies.

                    STRICT TAXONOMY RULES:
                    1. "technical" (ONLY actual Programming Languages, Runtimes & Core Web Frameworks):
                    - ALLOWED: Python, JavaScript, TypeScript, Java, C++, SQL, React, Node.js, Express, HTML5, CSS3, etc.
                    - FORBIDDEN: Hobbies, soft skills, or non-software activities (e.g., "Wedding Photography", "Event Photography", "Tech Enthusiast" MUST BE DROPPED ENTIRELY).

                    2. "tools" (Developer Tools, Databases, Platforms & Infrastructure):
                    - ALLOWED: Git, GitHub, VS Code, Docker, AWS, PostgreSQL, MongoDB, Postman, Linux, Figma, etc.
                    - DO NOT place programming languages here.

                    3. "Core Concept" (Technical Concepts & Methodologies ONLY):
                    - ALLOWED: Data Structures & Algorithms, Object-Oriented Programming, REST APIs, Agile/Scrum, System Design etc.
                    - PURGE generic life skills or hobbies.

                    NEGATIVE CONSTRAINT:
                    If an item is an interest, personal hobby, or unrelated trade (e.g. Photography, Cooking, Sports), DO NOT output it in ANY category. Omit it completely."""
    user_prompt = f"Candidate Skills: {json.dumps(candidate_skills)}\nTarget JD:\n{jd}"
    return await _groq_structured(system_prompt, user_prompt, PrioritizedSkillsOutput, temperature=0.1)

async def generate_optimized_projects(candidate_projects: list, jd: str):
    system_prompt = "You are an ATS Resume Project Optimizer. Optimize each project's bullet points using Google's X-Y-Z formula with strong action verbs. NEVER hallucinate new project titles or fake links.""""
                    You are an elite Technical Resume Architect and Senior Engineering Hiring Manager.
                    Your objective is to rewrite and optimize candidate project bullet points to maximize ATS ranking and technical authority against the target Job Description (JD).

                    Strict Compliance Rules:
                    1. FACT PRESERVATION & METRIC TRUTH (Golden Rule):
                    - NEVER hallucinate fake numerical metrics (e.g., DO NOT invent "improved speed by 43%" or "scaled to 100k users" if not in the source text).
                    - If numbers exist in the source, preserve and highlight them. If no metrics exist, quantify via technical scope, architecture, or operational efficiency (e.g., "streamlined database transactions", "automated manual error logging").
                    - PRESERVE all original project titles, repositories, live links, and verified tech stacks without alteration.
                    2. POWER VERB DISCIPLINE:
                    - EVERY bullet must begin with a strong, past-tense technical action verb (e.g., Architected, Engineered, Implemented, Streamlined, Spearheaded, Automated, Refactored, Containerized).
                    - STRICTLY FORBIDDEN openers: "Helped", "Assisted", "Worked on", "Responsible for", "Created a system to", "Built a small".
                    3. GOOGLE X-Y-Z BULLET STRUCTURE:
                    - Structure: "Accomplished [X: technical deliverable] using [Y: tools/languages/techniques matching target JD], resulting in [Z: engineering/workflow outcome]".
                    4. FORMATTING & LENGTH:
                    - Exactly 2 to 3 focused bullet points per project.
                    - Each bullet must be concise, punchy, and between 15 to 25 words (avoid rambling paragraphs).
                    5. TARGET JD KEYWORD INJECTION:
                    - Naturally integrate target JD terminology (e.g., RESTful APIs, relational schema design, modular state management) where factually supported by the candidate's project implementation."""
    user_prompt = f"Candidate Projects: {json.dumps(candidate_projects)}\nTarget JD:\n{jd}"
    return await _groq_structured(system_prompt, user_prompt, OptimizedProjectsOutput, temperature=0.2)

async def generate_audit_and_score(profile_data: dict, jd: str):
    system_prompt = """
                    You are an enterprise-grade Applicant Tracking System (ATS) Parser and Principal Technical Recruiter.
                    Your objective is to conduct a mathematically rigorous audit and gap analysis of a candidate's profile against a target Job Description (JD).

                    Strict Evaluation Rubrics:

                    1. MATHEMATICAL SCORING STANDARDS (0 - 100 Scale):
                    - keywordMatchScore (40% weight): Ratio of hard required technical skills/tools in the JD that are verified in the candidate's profile.
                    - relevanceScore (30% weight): Alignment of project deliverables, domain experience, and core stack with the role's primary responsibilities.
                    - impactMetricScore (15% weight): Depth of engineering outcomes, measurable indicators, and technical complexity demonstrated.
                    - formattingStructureScore (15% weight): Completeness of profile data (contact details, GitHub/LinkedIn links, clear education credentials).
                    - overallMatchScore: Weighted composite of the above metrics. Do NOT inflate scores arbitrarily.

                    2. EXPERIENCE & QUALIFICATION HIERARCHY:
                    - SURPLUS EXPERIENCE IS A PRO: If the JD asks for 2+ years and the candidate has more, categorize this strictly as a PRO (Strength), NEVER a gap.
                    - EQUIVALENCY: Consider equivalent degrees (e.g., BCA/MCA/B.Tech in Computer Science or related STEM disciplines) as satisfying general CS degree requirements.

                    3. CON SEVERITY TAXONOMY:
                    - "HIGH": Candidate lacks a core, mandatory technical skill or non-negotiable domain requirement explicitly demanded in the JD.
                    - "MEDIUM": Candidate lacks a secondary skill, secondary database, or architectural practice that is heavily utilized in the role.
                    - "LOW": Candidate lacks an optional, "nice-to-have", or preferred bonus qualification.
                    - EVERY Con MUST include an actionable "suggestion" explaining how the candidate can bridge the gap (e.g., via a portfolio project, certification, or open-source contribution).

                    4. SANITIZED 'missingKeywords' RULES:
                    - ONLY include concrete technical nouns: programming languages, databases, cloud platforms, developer tools, libraries, or recognized industry certifications.
                    - STRICTLY FORBIDDEN in missingKeywords:
                        * Numerical metrics or durations (e.g., "3 years", "5+ years", "4-year degree").
                        * Generic verbs and adjectives (e.g., "collaborate", "fast-paced", "enthusiastic", "leadership", "proficient").
                        * Job titles or general company requirements (e.g., "software engineer", "responsibilities")."""
    user_prompt = f"Candidate Profile:\n{json.dumps(profile_data)}\n\nTarget Job Description:\n{jd}"
    return await _groq_structured(system_prompt, user_prompt, AuditAndScoringOutput, temperature=0.1)

@app.post("/ai/analyze-and-tailor",response_model=AnalysisResponseSchema)
async def analyse_and_tailor(payload:dict):
    profile_data=payload.get("profileData")
    job__description=payload.get("jobDescription")

    if not profile_data or not job__description:
        raise HTTPException(status_code=400, detail="profileData and jobDescription are required.")

    personal_info = profile_data.get("personalInfo", {})
    existing_skills = profile_data.get("skills", {})
    existing_projects = profile_data.get("projects", [])

    try:
        summary_res = await generate_summary(personal_info.get("summary", ""), existing_skills, job__description)
        skills_res = await generate_prioritized_skills(existing_skills, job__description)
        projects_res = await generate_optimized_projects(existing_projects, job__description)
        audit_res = await generate_audit_and_score(profile_data, job__description)

        print(payload)
        return AnalysisResponseSchema(
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
                optimizedProjects=projects_res["optimizedProjects"],
                education=profile_data.get("education", []),
                certifications=profile_data.get("certifications", []),
                achievements=profile_data.get("achievements", [])
            )
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Multi-prompt pipeline failed: {str(e)}")
