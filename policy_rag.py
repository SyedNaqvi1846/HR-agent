import os
import re
import json
import hashlib
from pathlib import Path
from typing import List, Dict, Any, Optional

import numpy as np
from dotenv import load_dotenv
from google import genai

load_dotenv()

# Embedding model verified on Gemini API
EMBEDDING_MODEL = "gemini-embedding-001"
VECTOR_DB_CACHE_PATH = Path("policy_vector_db.json")


# =========================================================
# STEP 1: CHUNKING
# =========================================================
class PolicyChunk:
    def __init__(self, chunk_id: str, title: str, content: str, metadata: Dict[str, Any]):
        self.chunk_id = chunk_id
        self.title = title
        self.content = content.strip()
        self.metadata = metadata

    def to_dict(self) -> Dict[str, Any]:
        return {
            "chunk_id": self.chunk_id,
            "title": self.title,
            "content": self.content,
            "metadata": self.metadata,
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "PolicyChunk":
        return cls(
            chunk_id=data["chunk_id"],
            title=data["title"],
            content=data["content"],
            metadata=data["metadata"],
        )


def chunk_hiring_policy(policy_text: str) -> List[PolicyChunk]:
    """
    Step 1: Chunking
    Splits the hiring policy document into structured, semantic chunks:
    - Role Overview
    - Numbered Responsibilities & Duties (1 through 8)
    - Role Variations & Job Titles
    - Skill Requirements
    """
    chunks: List[PolicyChunk] = []
    
    if not policy_text.strip():
        return chunks

    # Detect primary role title at the top
    first_line = policy_text.strip().split("\n")[0].strip().rstrip(":")
    primary_role = first_line if first_line else "General Engineering"

    # 1. Chunk Overview / Role Intro
    overview_match = re.search(r"^(.*?)(?=Responsibilities & Duties|\d+\.\s+[A-Z])", policy_text, re.DOTALL | re.IGNORECASE)
    if overview_match:
        overview_text = overview_match.group(1).strip()
        if overview_text:
            chunks.append(PolicyChunk(
                chunk_id="policy_role_overview",
                title=f"{primary_role} - Role Profile & Organizational Impact",
                content=overview_text,
                metadata={"role": primary_role, "category": "overview", "index": 0}
            ))

    # 2. Chunk Individual Numbered Responsibilities & Duties (e.g., 1. Architecting... 2. Designing...)
    duty_pattern = r"(?:^|\n)(\d+)\.\s+([^\n]+)\n(.*?)(?=(?:\n\d+\.\s+[^\n]+\n)|\n[A-Z][a-zA-Z\s]{4,}:|\Z)"
    matches = list(re.finditer(duty_pattern, policy_text, re.DOTALL))
    
    for match in matches:
        num = match.group(1).strip()
        duty_title = match.group(2).strip()
        duty_body = match.group(3).strip()
        full_content = f"{num}. {duty_title}\n{duty_body}"
        
        chunks.append(PolicyChunk(
            chunk_id=f"policy_duty_{num}",
            title=f"Core Duty #{num}: {duty_title}",
            content=full_content,
            metadata={"role": primary_role, "category": "duty", "duty_number": int(num), "title": duty_title}
        ))

    # 3. Chunk Common Job Titles / Variations
    titles_match = re.search(r"(Common Full Stack Engineer Job Titles.*?)(?=Skill Requirements|\Z)", policy_text, re.DOTALL | re.IGNORECASE)
    if titles_match:
        titles_content = titles_match.group(1).strip()
        chunks.append(PolicyChunk(
            chunk_id="policy_job_titles_variations",
            title="Role Variations & Experience Level Focus Areas",
            content=titles_content,
            metadata={"role": primary_role, "category": "variations"}
        ))

    # 4. Chunk Skill Requirements
    skills_match = re.search(r"(Skill Requirements for.*?)(?=\Z)", policy_text, re.DOTALL | re.IGNORECASE)
    if skills_match:
        skills_content = skills_match.group(1).strip()
        chunks.append(PolicyChunk(
            chunk_id="policy_skill_requirements",
            title=f"{primary_role} - Required Core Competencies",
            content=skills_content,
            metadata={"role": primary_role, "category": "skill_requirements"}
        ))

    # Fallback if text didn't match structured headers
    if not chunks:
        paragraphs = [p.strip() for p in policy_text.split("\n\n") if p.strip()]
        for idx, p in enumerate(paragraphs):
            chunks.append(PolicyChunk(
                chunk_id=f"policy_chunk_{idx+1}",
                title=f"Hiring Policy Segment #{idx+1}",
                content=p,
                metadata={"role": primary_role, "category": "general", "index": idx+1}
            ))

    return chunks


# =========================================================
# STEP 2: EMBEDDINGS
# =========================================================
def get_embedding(client: genai.Client, text: str) -> List[float]:
    """
    Step 2: Embeddings
    Calls Gemini gemini-embedding-001 to generate dense 3072-dimensional vector.
    """
    response = client.models.embed_content(
        model=EMBEDDING_MODEL,
        contents=text,
    )
    if not response.embeddings or not response.embeddings[0].values:
        raise ValueError("Failed to generate embedding vector from Gemini.")
    return list(response.embeddings[0].values)


# =========================================================
# STEP 3: VECTOR DATABASE
# =========================================================
class PolicyVectorDatabase:
    """
    Step 3: Vector Database
    Stores chunks, metadata, and embedding vectors.
    Provides local JSON persistence and fast vectorized Cosine Similarity Search.
    """
    def __init__(self, cache_file: Path = VECTOR_DB_CACHE_PATH):
        self.cache_file = cache_file
        self.chunks: List[PolicyChunk] = []
        self.embeddings: Optional[np.ndarray] = None
        self.policy_hash: str = ""

    def _compute_hash(self, text: str) -> str:
        return hashlib.sha256(text.encode("utf-8")).hexdigest()

    def build_or_load(self, client: genai.Client, policy_text: str) -> None:
        current_hash = self._compute_hash(policy_text)

        # Check if cached vectors exist and are up to date
        if self.cache_file.exists():
            try:
                data = json.loads(self.cache_file.read_text(encoding="utf-8"))
                if data.get("policy_hash") == current_hash and "vectors" in data:
                    self.chunks = [PolicyChunk.from_dict(c) for c in data["chunks"]]
                    self.embeddings = np.array(data["vectors"], dtype=np.float32)
                    self.policy_hash = current_hash
                    return
            except Exception:
                pass

        # Step 1: Chunking
        self.chunks = chunk_hiring_policy(policy_text)
        if not self.chunks:
            self.embeddings = None
            return

        # Step 2: Generate Embeddings
        vectors: List[List[float]] = []
        for chunk in self.chunks:
            # Embed Title + Content for maximum semantic retrieval fidelity
            text_to_embed = f"{chunk.title}\n{chunk.content}"
            emb = get_embedding(client, text_to_embed)
            vectors.append(emb)

        self.embeddings = np.array(vectors, dtype=np.float32)
        self.policy_hash = current_hash

        # Step 3: Persist Vector Database to disk
        cache_data = {
            "policy_hash": self.policy_hash,
            "chunks": [c.to_dict() for c in self.chunks],
            "vectors": vectors,
        }
        self.cache_file.write_text(json.dumps(cache_data, indent=2), encoding="utf-8")


# =========================================================
# STEP 4: RETRIEVAL
# =========================================================
    def search(self, client: genai.Client, query: str, top_k: int = 3) -> List[Dict[str, Any]]:
        """
        Step 4: Retrieval
        Computes cosine similarity between query vector and database vectors,
        returning top-k ranked chunks with score and metadata.
        """
        if self.embeddings is None or len(self.chunks) == 0:
            return []

        query_vector = np.array(get_embedding(client, query), dtype=np.float32)
        
        # Cosine similarity calculation: (A . B) / (||A|| * ||B||)
        norm_query = np.linalg.norm(query_vector)
        norm_embeddings = np.linalg.norm(self.embeddings, axis=1)

        denominator = norm_query * norm_embeddings
        denominator = np.where(denominator == 0, 1e-10, denominator)
        
        scores = np.dot(self.embeddings, query_vector) / denominator
        
        # Rank by score descending
        ranked_indices = np.argsort(scores)[::-1][:top_k]

        results = []
        for idx in ranked_indices:
            results.append({
                "chunk": self.chunks[idx],
                "score": float(scores[idx]),
                "title": self.chunks[idx].title,
                "content": self.chunks[idx].content,
                "metadata": self.chunks[idx].metadata,
            })
        return results


# Global singleton instance
_vector_db_instance: Optional[PolicyVectorDatabase] = None

def get_policy_vector_db(client: genai.Client, policy_text: str) -> PolicyVectorDatabase:
    global _vector_db_instance
    if _vector_db_instance is None:
        _vector_db_instance = PolicyVectorDatabase()
    _vector_db_instance.build_or_load(client, policy_text)
    return _vector_db_instance


def retrieve_relevant_policy_context(client: genai.Client, policy_text: str, query: str, top_k: int = 3) -> str:
    """
    Convenience wrapper to retrieve and format top-k relevant policy sections.
    """
    if not policy_text.strip():
        return ""

    db = get_policy_vector_db(client, policy_text)
    results = db.search(client, query, top_k=top_k)

    if not results:
        return ""

    formatted_sections = []
    for i, r in enumerate(results, 1):
        formatted_sections.append(
            f"--- [POLICY DUTY #{i}: {r['title']} (Match Confidence: {round(r['score']*100, 1)}%)] ---\n{r['content']}"
        )
    return "\n\n".join(formatted_sections)


def load_company_hiring_policy(job_title: str = "") -> str:
    """Reads the company hiring policy from workspace file (e.g. Hiring policy.txt)."""
    candidates = [
        Path("Hiring policy.txt"),
        Path("Hiring policy"),
        Path("hiring_policy.txt"),
        Path("hiring policy.txt"),
    ]
    for p in candidates:
        if p.exists():
            try:
                content = p.read_text(encoding="utf-8").strip()
                if content:
                    return content
            except Exception:
                continue
    return ""
