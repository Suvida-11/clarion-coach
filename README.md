# Clario Coach – AI-Powered Customer Support Coaching Assistant

An AI-powered customer support coaching platform designed to help support agents improve their communication, understand customer intent and sentiment, and generate context-aware response suggestions using Large Language Models and Retrieval-Augmented Generation (RAG).

---

## 📌 Project Overview

**Clario Coach** is an intelligent customer support coaching assistant that assists support agents during customer interactions.

The system analyzes customer messages to identify **intent and sentiment**, retrieves relevant information from a domain-specific knowledge base, and uses **Google Gemini** to generate context-aware coaching suggestions and response recommendations.

By combining **Natural Language Processing (NLP), Large Language Models (LLMs), semantic search, and Retrieval-Augmented Generation**, Clario Coach aims to make customer support interactions more consistent, accurate, and effective.

---

## 🎯 Objectives

* Assist customer support agents with context-aware response suggestions.
* Analyze customer messages for sentiment and intent.
* Retrieve relevant information from organizational knowledge bases.
* Reduce the time required to search for support information.
* Improve consistency and quality of customer responses.
* Provide AI-assisted coaching during customer interactions.
* Ground AI-generated responses using relevant retrieved information.

---

## ✨ Key Features

### 🤖 AI-Powered Coaching

Provides intelligent coaching suggestions to support agents based on customer conversations.

### 💬 Response Suggestions

Generates context-aware response recommendations using customer input and retrieved knowledge.

### 😊 Sentiment Analysis

Identifies the overall sentiment of customer messages to help agents understand customer tone and urgency.

### 🎯 Intent Detection

Determines the likely intent behind a customer's message to support appropriate response generation.

### 📚 Retrieval-Augmented Generation (RAG)

Retrieves relevant information from a knowledge base before generating responses, helping provide more contextually grounded answers.

### 📄 Document Processing

Allows knowledge-base documents to be uploaded, processed, chunked, embedded, and indexed for retrieval.

### 🔍 Semantic Search

Uses vector embeddings to retrieve information based on semantic similarity rather than simple keyword matching.

### 📊 Session Management

Supports starting and retrieving customer-support coaching sessions.

### 📖 API Documentation

Provides interactive API documentation through FastAPI and Swagger UI.

---

## 🏗️ System Workflow

```text
Customer Message
       │
       ▼
┌─────────────────────┐
│   Intent Detection  │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Sentiment Analysis  │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Knowledge Retrieval │
│       (RAG)         │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│    Google Gemini    │
│       LLM           │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Coaching & Response │
│     Suggestions     │
└─────────────────────┘
```

---

## 🧠 RAG Pipeline

The Retrieval-Augmented Generation pipeline follows these stages:

1. Upload knowledge-base documents.
2. Extract and preprocess document text.
3. Split the text into smaller chunks.
4. Generate vector embeddings for each chunk.
5. Store embeddings in ChromaDB.
6. Convert the user's query into an embedding.
7. Perform semantic similarity search.
8. Retrieve the most relevant knowledge-base content.
9. Provide the retrieved context to the Gemini model.
10. Generate a context-aware coaching response.

---

## 🛠️ Technology Stack

### Frontend

* React
* TypeScript
* Vite
* Tailwind CSS

### Backend

* Python
* FastAPI
* Uvicorn
* Pydantic

### Artificial Intelligence & NLP

* Google Gemini
* Sentence Transformers
* `all-MiniLM-L6-v2`
* Natural Language Processing
* Semantic Search
* Retrieval-Augmented Generation (RAG)

### Vector Database

* ChromaDB

### Development Tools

* Git
* GitHub
* REST APIs
* Swagger / OpenAPI

---

## 📂 Project Structure

```text
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
│   │
│   └── requirements.txt
│
├── public/
│
├── src/
│
├── .env.example
├── .gitignore
├── LICENSE
├── package.json
├── vite.config.ts
├── tsconfig.json
└── README.md
```

---

# ⚙️ Installation & Setup

## Prerequisites

Make sure the following are installed:

* Python 3.9+
* Node.js 18+
* npm
* Git

A Google Gemini API key is also required for AI functionality.

---

## 1. Clone the Repository

```bash
git clone https://github.com/Suvida-11/clarion-coach.git
cd clarion-coach
```

---

## 2. Backend Setup

Navigate to the backend directory:

```bash
cd backend
```

Create a Python virtual environment:

```bash
python -m venv .venv
```

### Windows

```bash
.venv\Scripts\activate
```

### Linux / macOS

```bash
source .venv/bin/activate
```

Install the required dependencies:

```bash
pip install -r requirements.txt
```

---

## 3. Configure Environment Variables

Create a `.env` file inside the `backend` directory.

```env
GEMINI_API_KEY=YOUR_GEMINI_API_KEY
```

> **Security:** Never commit your actual API key or `.env` file to GitHub. Use `.env.example` as a reference.

---

## 4. Start the Backend

From the `backend` directory:

```bash
uvicorn app.main:app --reload
```

The backend will be available at:

```text
http://127.0.0.1:8000
```

### Swagger API Documentation

Interactive API documentation:

```text
http://127.0.0.1:8000/docs
```

---

## 5. Frontend Setup

Open a new terminal and return to the project root:

```bash
cd clarion-coach
```

Install frontend dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

The frontend will be available at:

```text
http://localhost:8081
```

> The frontend port may vary depending on the Vite configuration.

---

# 🔌 API Endpoints

| Method | Endpoint            | Description                             |
| ------ | ------------------- | --------------------------------------- |
| GET    | `/`                 | Health check                            |
| GET    | `/docs`             | Swagger API documentation               |
| POST   | `/chat`             | Interact with the AI coaching assistant |
| POST   | `/upload`           | Upload knowledge-base documents         |
| POST   | `/knowledge/search` | Perform semantic knowledge search       |
| GET    | `/session/latest`   | Retrieve the latest session             |
| POST   | `/session/start`    | Start a new coaching session            |

---

# 🔐 Security & Configuration

The project uses environment variables for sensitive configuration.

Sensitive information such as:

* API keys
* Authentication credentials
* Database credentials
* Environment-specific secrets

should **never be committed to the repository**.

The repository includes `.env.example` to demonstrate the required configuration without exposing actual credentials.

---

# 🚀 Future Enhancements

Potential future improvements include:

* 🎙️ Voice-based customer support coaching
* 💬 Real-time live-chat integration
* 📊 Agent performance analytics
* 📈 Support quality dashboards
* 🌍 Multi-language support
* 🗃️ Advanced conversation history
* 🔐 Authentication and role-based access control
* 🎯 Personalized coaching recommendations
* 📱 Responsive mobile experience

---

# 📌 Project Applications

Clario Coach can be applied in customer-support environments where agents need assistance with:

* Customer communication
* Issue classification
* Knowledge-base navigation
* Response generation
* Customer sentiment understanding
* Consistent support quality

---

# 👤 Author

**Suvida S**

---

# 📄 License

This project is licensed under the **MIT License**.

See the [`LICENSE`](LICENSE) file for the complete license text.

---

# 🙏 Acknowledgements

This project makes use of the following technologies and open-source tools:

* FastAPI
* React
* Vite
* Google Gemini
* ChromaDB
* Sentence Transformers
* Hugging Face
* Tailwind CSS

---

## ⭐ Project Summary

**Clario Coach** combines AI-powered conversation analysis, semantic knowledge retrieval, and Retrieval-Augmented Generation to provide intelligent assistance to customer support agents.

The project demonstrates the integration of **React, FastAPI, NLP, vector embeddings, ChromaDB, RAG, and Google Gemini** into a unified AI-powered customer support coaching platform.
