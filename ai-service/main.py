import os
import json
import asyncio
import time
import traceback
from fastapi import FastAPI, HTTPException
from google import genai
from google.genai import types
from dotenv import load_dotenv
from schemas import ProfileSchemaObject, AnalysisResponseSchema, TailoredSummaryOutput, PrioritizedSkillsOutput, OptimizedProjectsOutput,AuditAndScoringOutput,Scoring,AuditFeedback,TailoredResumeContent

load_dotenv()
api_key = os.getenv("GEMINI_API_KEY")

if not api_key:
    raise RuntimeError("GEMINI_API_KEY is missing from environment variables.")

client = genai.Client(api_key=api_key)
app = FastAPI(title="ATS AI Microservice", version="1.0")

MODELS = ["gemini-3.5-flash-lite", "gemini-3.8-flash"]

async def call_gemini_async(prompt: str, schema_class, temperature: float = 0.2):
    last_exception = None
    for model_name in MODELS:
        for attempt in range(2):
            try:
                print(f"[*] Calling {model_name} (attempt {attempt + 1})...")
                response = await client.aio.models.generate_content(
                    model=model_name,
                    contents=prompt,
                    config=types.GenerateContentConfig(
                        response_mime_type="application/json",
                        response_schema=schema_class,
                        temperature=temperature,
                    ),
                )
                if response.text:
                    return json.loads(response.text)
                elif response.parsed:
                    return response.parsed
                raise ValueError("Empty response received from Gemini.")
            except Exception as e:
                last_exception = e
                print(f"[!] Warning on {model_name}: {str(e)}")
                await asyncio.sleep(1.5)
    raise RuntimeError(f"All Gemini models/attempts failed. Last error: {last_exception}")

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
    
    prompt = f"""Extract structured candidate profile details strictly matching the schema.
    Do not hallucinate factual data.
    Raw Text:
    {raw_text}
    """
    return await call_gemini_async(prompt, ProfileSchemaObject, temperature=0.1)

async def generate_summary(candidate_summary: str, skills: dict, jd: str):
    prompt = f"""
    You are an expert ATS Resume Summary Writer.
    Candidate Current Summary / Background: "{candidate_summary}"
    Candidate Top Skills: {json.dumps(skills)}
    Target Job Description:
    {jd}

    TASK:
    Write a concise, high-impact 2-3 sentence Professional Career Summary/Objective.
    - Tailor it directly to the target role.
    - Highlight matched strengths and core value proposition.
    - Keep tone professional, authoritative, and ATS keyword-rich.
    """
    return await call_gemini_async(prompt, TailoredSummaryOutput, temperature=0.3)

async def generate_prioritized_skills(candidate_skills: dict, jd: str):
    prompt = f"""
    You are an ATS Keyword Strategist.
    Candidate Verified Skills: {json.dumps(candidate_skills)}
    Target Job Description:
    {jd}

    TASK:
    Re-order and categorize the candidate's skills into:
    - technical: programming languages, core web/software frameworks (prioritize JD keywords)
    - tools: developer tools, platforms, databases, IDEs
    - softSkills: communication, leadership, problem solving
    RULE: Preserve candidate skills. Do not invent unverified technologies.
    """
    return await call_gemini_async(prompt, PrioritizedSkillsOutput, temperature=0.1)

async def generate_optimized_projects(candidate_projects: list, jd: str):
    prompt = f"""
    You are an ATS Resume Project Optimizer.
    Candidate Projects: {json.dumps(candidate_projects)}
    Target Job Description:
    {jd}

    TASK:
    Optimize each project's bullet points:
    - Use Google X-Y-Z formula: "Accomplished [X] as measured by [Y], by doing [Z]".
    - Start with strong action verbs (Architected, Engineered, Implemented, Streamlined).
    - Align with skills and technologies mentioned in the JD.
    - NEVER hallucinate new project titles or fake repositories.
    """
    return await call_gemini_async(prompt, OptimizedProjectsOutput, temperature=0.2)

async def generate_audit_and_score(profile_data: dict, jd: str):
    prompt = f"""
    You are an ATS Parser and Candidate Evaluator.
    Candidate Profile: {json.dumps(profile_data)}
    Target Job Description:
    {jd}

    TASK:
    Conduct a gap analysis:
    1. Overall Match Score (0 to 100) and breakdown (keywordMatchScore, relevanceScore, impactMetricScore, formattingStructureScore).
    2. Pros: Matched candidate strengths relative to JD requirements.
    3. Cons: Gaps, missing skills, or formatting risks (severity: "HIGH", "MEDIUM", or "LOW").
    4. missingKeywords: Important keywords present in JD but absent in candidate profile.
    """
    return await call_gemini_async(prompt, AuditAndScoringOutput, temperature=0.1)

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
