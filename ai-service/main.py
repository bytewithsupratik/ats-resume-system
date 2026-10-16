import os
import json
import time
import traceback
from fastapi import FastAPI, HTTPException
from google import genai
from google.genai import types
from dotenv import load_dotenv
from schemas import ProfileSchemaObject, AnalysisResponseSchema

load_dotenv()
api_key = os.getenv("GEMINI_API_KEY")

if not api_key:
    raise RuntimeError("GEMINI_API_KEY is missing from environment variables.")

client = genai.Client(api_key=api_key)
app = FastAPI(title="ATS AI Microservice", version="1.0")

# Primary & Fallback models
MODELS = ["gemini-2.5-flash", "gemini-2.0-flash"]

def call_gemini_structured(prompt: str, schema_class, temperature: float = 0.2):
    last_exception = None
    for model_name in MODELS:
        for attempt in range(2):
            try:
                print(f"[*] Calling {model_name} (attempt {attempt + 1})...")
                response = client.models.generate_content(
                    model=model_name,
                    contents=prompt,
                    config=types.GenerateContentConfig(
                        response_mime_type="application/json",
                        response_schema=schema_class,
                        temperature=temperature,
                    ),
                )
                
                # Check response text
                if response.text:
                    parsed_json = json.loads(response.text)
                    return parsed_json
                elif response.parsed:
                    return response.parsed
                else:
                    raise ValueError("Empty response received from Gemini.")
            except Exception as e:
                last_exception = e
                print(f"[!] Warning on {model_name}: {str(e)}")
                time.sleep(1.5)
                continue

    # If all retries and models failed, print the stack trace for easy debugging
    traceback.print_exc()
    raise HTTPException(status_code=500, detail=f"Gemini generation error: {str(last_exception)}")

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
    
    prompt = f"""
    You are an expert HR data parser. Extract structured candidate profile details 
    strictly matching the target schema from the following raw LinkedIn profile text. 
    Do not hallucinate factual data like dates, degrees, or company names. 
    If a field is missing, leave it empty or omit optional fields.

    Raw Text:
    {raw_text}
    """
    return call_gemini_structured(prompt, ProfileSchemaObject, temperature=0.1)

@app.post("/ai/analyze-and-tailor")
async def analyze_and_tailor(payload: dict):
    profile_data = payload.get("profileData")
    job_description = payload.get("jobDescription")
    
    if not profile_data or not job_description:
        raise HTTPException(status_code=400, detail="profileData and jobDescription are required.")
        
    prompt = f"""
    You are an advanced ATS (Applicant Tracking System) Auditor and Resume Optimizer.
    Analyze the candidate's base profile against the target Job Description below.

    Core Rules:
    1. Fact Preservation: NEVER hallucinate or alter factual history (employers, degrees, graduation years).
    2. Quantitative Scoring: Calculate scores (0-100) based on keyword overlap, project relevance, and impact metrics.
    3. Contextual Tailoring: Rewrite project bullets and summary using strong action verbs aligning with the job description.

    Candidate Profile JSON:
    {json.dumps(profile_data)}

    Target Job Description:
    {job_description}
    """
    return call_gemini_structured(prompt, AnalysisResponseSchema, temperature=0.2)