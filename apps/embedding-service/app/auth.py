import os
from fastapi import HTTPException, Security, status
from fastapi.security import APIKeyHeader

API_KEY_HEADER = APIKeyHeader(name="X-Internal-Api-Key", auto_error=False)
LEGACY_KEY_HEADER = APIKeyHeader(name="X-Embedding-Service-Key", auto_error=False)

def verify_service_key(
    internal_key: str = Security(API_KEY_HEADER),
    legacy_key: str = Security(LEGACY_KEY_HEADER),
):
    expected_key = os.getenv("EMBEDDING_SERVICE_API_KEY") or os.getenv("EMBEDDING_SERVICE_SECRET_KEY")
    if not expected_key:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Embedding service secret key environment variable not configured",
        )
    presented_key = internal_key or legacy_key

    if not presented_key or presented_key != expected_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing X-Internal-Api-Key header",
        )
    return presented_key
