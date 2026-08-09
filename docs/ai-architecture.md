# AI Architecture — Hugging Face Operational Reasoner

## Purpose
Translates deterministic backend state, high-risk node alerts, and Python ML 10-minute density predictions into clear, human-readable operational recommendations for circuit organizers.

```mermaid
flowchart TD
    Facts[Node Risk Alerts & ML Density Predictions] --> CandidateGen[Candidate Action Generator]
    CandidateGen --> HFAdapter[`@huggingface/inference` Client]
    HFAdapter -->|Prompt| HFModel[Configured HF LLM Model]
    HFModel -->|Response| ValidatedOutput[Validated JSON Recommendation]
    HFAdapter -- Timeout/Error --> Fallback[Deterministic Rule-Based Fallback Engine]
    Fallback --> ValidatedOutput
```

## Resilience Architecture
- Model choice is configurable via `HF_MODEL` environment variable.
- Uses strict 5-second HTTP timeout.
- If Hugging Face API is unready, rate-limited, or fails, `DeterministicFallbackEngine` produces rule-based operational advice immediately.
- Hugging Face NEVER calculates numerical risk scores or graph routes; it strictly explains facts provided by the backend.
