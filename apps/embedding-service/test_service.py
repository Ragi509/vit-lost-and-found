import pytest
from app.models import embed_text, embed_image_bytes, cosine_similarity
from app.main import app
from fastapi.testclient import TestClient

client = TestClient(app)
VALID_HEADER = {"X-Embedding-Service-Key": "vit_sec_embed_live_948fbc2a10e7b4382c7"}

def test_health():
    res = client.get("/health")
    assert res.status_code == 200
    assert res.json()["status"] == "ok"

def test_auth_rejection():
    # Attempting to call embed without key
    res = client.post("/embed/text", json={"text": "TI-84 Calculator"})
    assert res.status_code == 401

def test_text_embedding_dimensions():
    res = client.post("/embed/text", json={"text": "Blue Decathlon Water Bottle"}, headers=VALID_HEADER)
    assert res.status_code == 200
    data = res.json()
    assert data["dimensions"] == 384
    assert len(data["vector"]) == 384

def test_match_score_with_image():
    # 0.5 * 0.9 + 0.4 * 0.8 + 0.1 * 1.0 = 0.45 + 0.32 + 0.1 = 0.87 (~87%)
    res = client.post(
        "/match/score",
        json={"text_score": 0.90, "image_score": 0.80, "category_match": True},
        headers=VALID_HEADER,
    )
    assert res.status_code == 200
    data = res.json()
    assert data["confidence_score"] == 0.87
    assert data["approximate_label"] == "~87% match"
    assert data["is_renormalized"] is False

def test_match_score_renormalization_without_image():
    # 0.85 * 0.9 + 0.15 * 1.0 = 0.765 + 0.15 = 0.915 (~92%)
    res = client.post(
        "/match/score",
        json={"text_score": 0.90, "image_score": None, "category_match": True},
        headers=VALID_HEADER,
    )
    assert res.status_code == 200
    data = res.json()
    assert data["is_renormalized"] is True
    assert "~92% match" in data["approximate_label"]
