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
    system_prompt = "You are an expert ATS Resume Summary Writer. Write a 2-3 sentence high-impact career objective tailored to the target JD."
    user_prompt = f"Candidate Current Summary: {candidate_summary}\nCandidate Skills: {json.dumps(skills)}\nTarget JD:\n{jd}"
    
    return await _groq_structured(system_prompt, user_prompt, TailoredSummaryOutput, temperature=0.3)

async def generate_prioritized_skills(candidate_skills: dict, jd: str):
    system_prompt = "You are an ATS Keyword Strategist. Reorder and categorize candidate skills into technical, tools, and softSkills, prioritizing keywords from the JD without inventing unverified skills."
    user_prompt = f"Candidate Skills: {json.dumps(candidate_skills)}\nTarget JD:\n{jd}"
    return await _groq_structured(system_prompt, user_prompt, PrioritizedSkillsOutput, temperature=0.1)

async def generate_optimized_projects(candidate_projects: list, jd: str):
    system_prompt = "You are an ATS Resume Project Optimizer. Optimize each project's bullet points using Google's X-Y-Z formula with strong action verbs. NEVER hallucinate new project titles or fake links."
    user_prompt = f"Candidate Projects: {json.dumps(candidate_projects)}\nTarget JD:\n{jd}"
    return await _groq_structured(system_prompt, user_prompt, OptimizedProjectsOutput, temperature=0.2)

async def generate_audit_and_score(profile_data: dict, jd: str):
    system_prompt = "You are an ATS Parser and Candidate Evaluator. Perform a rigorous gap analysis: calculate overallMatchScore (0-100), breakdown, pros, cons with severity (HIGH/MEDIUM/LOW), and missing keywords."
    user_prompt = f"Candidate Profile: {json.dumps(profile_data)}\nTarget JD:\n{jd}"
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
