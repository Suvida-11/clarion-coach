# 🚀 Clario Coach – AI-Powered Customer Support Coaching Assistant

Clario Coach is an AI-powered customer support coaching platform that helps support agents improve their communication by providing real-time guidance, response suggestions, sentiment analysis, and knowledge retrieval using Retrieval-Augmented Generation (RAG).

---

## 📌 Features

- 🤖 AI-powered customer support coaching
- 💬 Real-time response suggestions
- 😊 Customer sentiment analysis
- 🎯 Intent detection
- 📚 RAG-based knowledge retrieval
- 📄 Document upload and indexing
- 🔍 Semantic search using vector embeddings
- ⚡ FastAPI backend
- 🌐 React + Vite frontend
- 🧠 Google Gemini integration
- 🗂️ ChromaDB vector database

---

## 🏗️ Tech Stack

### Frontend
- React
- Vite
- TypeScript
- Tailwind CSS

### Backend
- FastAPI
- Python
- Uvicorn
- Pydantic

### AI & Machine Learning
- Google Gemini
- Sentence Transformers
- all-MiniLM-L6-v2 Embedding Model

### Vector Database
- ChromaDB

---

## 📂 Project Structure

```
clarion-coach/
│
├── backend/
│   ├── app/
│   │   ├── agents/
│   │   ├── api/
│   │   ├── core/
│   │   ├── rag/
│   │   ├── schemas/
│   │   └── main.py
│   └── requirements.txt
│
├── src/
├── public/
├── package.json
├── vite.config.ts
└── README.md
```

---

## ⚙️ Installation

### 1. Clone Repository

```bash
git clone https://github.com/Suvida-11/clarion-coach.git
cd clarion-coach
```

---

## Backend Setup

Navigate to backend

```bash
cd backend
```

Create virtual environment

```bash
python -m venv .venv
```

Activate virtual environment

### Windows

```bash
.venv\Scripts\activate
```

### Linux / macOS

```bash
source .venv/bin/activate
```

Install dependencies

```bash
pip install -r requirements.txt
```

Create a `.env` file inside the backend directory.

Example:

```env
GEMINI_API_KEY=YOUR_GEMINI_API_KEY
```

Run the backend

```bash
uvicorn app.main:app --reload
```

Backend runs on:

```
http://127.0.0.1:8000
```

Swagger API Docs:

```
http://127.0.0.1:8000/docs
```

---

## Frontend Setup

From the project root

```bash
npm install
```

Run frontend

```bash
npm run dev
```

Frontend runs on

```
http://localhost:8081
```

---

## AI Workflow

```
User Query
      │
      ▼
Intent Detection
      │
      ▼
Sentiment Analysis
      │
      ▼
Knowledge Retrieval (RAG)
      │
      ▼
Google Gemini
      │
      ▼
Coaching Suggestions
      │
      ▼
Response Returned to User
```

---

## RAG Pipeline

1. Upload documents
2. Extract text
3. Split into chunks
4. Generate embeddings
5. Store embeddings in ChromaDB
6. Perform semantic similarity search
7. Retrieve relevant context
8. Generate AI response using Gemini

---

## API Endpoints

| Method | Endpoint | Description |
|----------|----------|-------------|
| GET | `/` | Health Check |
| GET | `/docs` | Swagger Documentation |
| POST | `/chat` | Chat with AI Coach |
| POST | `/upload` | Upload Knowledge Base |
| POST | `/knowledge/search` | Semantic Search |
| GET | `/session/latest` | Latest Session |
| POST | `/session/start` | Start New Session |

---

## Future Enhancements

- Voice-based coaching
- Live chat integration
- Agent performance dashboard
- Analytics and reporting
- Multi-language support
- Conversation history
- Authentication and role-based access

---

## Contributors

- **Suvida S**


---

## License

This project is licensed under the MIT License.

---

## Acknowledgements

- FastAPI
- React
- Google Gemini
- ChromaDB
- Sentence Transformers
- Hugging Face
