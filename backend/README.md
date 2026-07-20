# Clario AI — FastAPI Backend

## Setup

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # then edit and set GEMINI_API_KEY
uvicorn app.main:app --reload --port 8000
```

## Frontend wiring

In the project root, create `.env`:

```
VITE_API_BASE_URL=http://localhost:8000
```

Then `npm run dev` — the frontend will call the FastAPI backend instead of mocks.
