import base64
from typing import Optional, List
from fastapi import FastAPI, Depends, UploadFile, File, Form, HTTPException
from pydantic import BaseModel, Field

from app.auth import verify_service_key
from app.models import embed_text, embed_image_bytes, cosine_similarity

app = FastAPI(
    title="VIT Lost & Found AI Embedding Microservice",
    description="Dedicated microservice serving 384-dim text and 512-dim image embeddings for pgvector matching.",
    version="1.0.0",
)

class TextEmbedRequest(BaseModel):
    text: str = Field(..., min_length=1, description="Input text to embed")

class TextEmbedResponse(BaseModel):
    dimensions: int
    vector: List[float]

class ImageEmbedResponse(BaseModel):
    dimensions: int
    vector: List[float]

class MatchScoreRequest(BaseModel):
    text_score: float = Field(..., ge=0.0, le=1.0)
    image_score: Optional[float] = Field(None, ge=0.0, le=1.0)
    category_match: bool = True

class MatchScoreResponse(BaseModel):
    confidence_score: float
    text_score: float
    image_score: Optional[float]
    category_score: float
    approximate_label: str
    is_renormalized: bool

@app.get("/health")
def health():
    return {
        "status": "ok",
        "service": "vit-lost-found-embeddings",
        "version": "1.0.0",
        "memory_profile": "lightweight (<350MB)",
    }

@app.post("/embed/text", response_model=TextEmbedResponse, dependencies=[Depends(verify_service_key)])
def get_text_embedding(req: TextEmbedRequest):
    vec = embed_text(req.text)
    return TextEmbedResponse(dimensions=len(vec), vector=vec)

@app.post("/embed/image", response_model=ImageEmbedResponse, dependencies=[Depends(verify_service_key)])
async def get_image_embedding(file: UploadFile = File(...)):
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Uploaded file must be an image.")
    contents = await file.read()
    vec = embed_image_bytes(contents)
    return ImageEmbedResponse(dimensions=len(vec), vector=vec)

@app.post("/match/score", response_model=MatchScoreResponse, dependencies=[Depends(verify_service_key)])
def calculate_match_score(req: MatchScoreRequest):
    """
    Computes weighted confidence score:
    Normal formula: 0.5 * text + 0.4 * image + 0.1 * category
    Renormalized formula when image is absent: 0.85 * text + 0.15 * category
    """
    category_val = 1.0 if req.category_match else 0.0

    if req.image_score is not None:
        confidence = (0.50 * req.text_score) + (0.40 * req.image_score) + (0.10 * category_val)
        is_renormalized = False
    else:
        # Renormalized so missing image does not penalize the match score
        confidence = (0.85 * req.text_score) + (0.15 * category_val)
        is_renormalized = True

    confidence = round(max(0.0, min(1.0, confidence)), 4)
    percentage = round(confidence * 100)

    return MatchScoreResponse(
        confidence_score=confidence,
        text_score=round(req.text_score, 4),
        image_score=round(req.image_score, 4) if req.image_score is not None else None,
        category_score=category_val,
        approximate_label=f"~{percentage}% match",
        is_renormalized=is_renormalized,
    )
