# Clario Coach

## AI-Powered Real-Time Customer Support Coaching Assistant

> An AI-powered real-time customer support coaching assistant that analyses customer conversations, retrieves relevant knowledge using Retrieval-Augmented Generation (RAG), generates context-aware response suggestions, evaluates communication quality, and identifies escalation risk.

---

## 📌 Project Overview

**Clario Coach** is an **AI-Powered Real-Time Customer Support Coaching Assistant** designed to help customer-support representatives improve the quality, consistency, and effectiveness of customer interactions.

In a typical support conversation, a representative must understand the customer's issue, identify emotional signals, search for relevant support information, formulate an appropriate response, and determine whether the conversation may require escalation. Performing these activities simultaneously can increase response time and lead to inconsistent or unsupported responses.

Clario Coach brings these capabilities into a unified AI-assisted workflow.

The system combines:

* Large Language Models (LLMs)
* Natural Language Processing (NLP)
* Retrieval-Augmented Generation (RAG)
* Semantic Search
* Vector Embeddings
* ChromaDB
* Code-Based Multi-Agent Orchestration

The platform analyses relevant conversation turns and provides immediate support-agent guidance.

---

# 🎯 Problem Statement

Customer-support representatives frequently handle complex conversations while working under time pressure.

During a single interaction, they may need to:

* Understand what the customer is requesting.
* Identify the customer's emotional state.
* Search for relevant support information.
* Decide how to respond professionally.
* Avoid unsupported commitments.
* Recognise when the customer may require escalation.

Traditional training and review processes often provide feedback after an interaction has already ended. Clario Coach addresses this limitation by providing AI-assisted coaching during the interaction itself.

---

# 🎯 Project Objectives

The major objectives of Clario Coach are:

1. Analyse customer messages for intent and emotional signals.
2. Identify sentiment, frustration, and urgency.
3. Retrieve relevant information from a domain-specific knowledge base.
4. Generate context-aware customer-ready response suggestions.
5. Evaluate support-agent communication quality.
6. Provide actionable coaching recommendations.
7. Monitor escalation risk.
8. Maintain conversation context across multiple turns.
9. Support realistic customer-support training without requiring a live customer.
10. Reduce hallucinated names, identifiers, unsupported policies, and false completion claims.

---

# ✨ Key Features

## 🤖 AI-Powered Real-Time Coaching

The Coaching Agent analyses the current customer interaction and provides a suggested response together with communication coaching.

The coaching process can consider:

* Current customer message
* Current support-agent response
* Customer intent
* Sentiment
* Frustration
* Urgency
* Conversation history
* Retrieved knowledge
* Previous suggestions
* Previous coaching tips

---

## 💬 Dynamic Response Suggestions

Clario Coach generates context-aware response suggestions instead of repeatedly using one fixed response.

Suggestions adapt according to:

* Customer intent
* Emotional state
* Conversation stage
* Previous interaction
* Retrieved knowledge
* Previous coaching output

This allows the response to change naturally across multiple conversation turns.

---

## 🎯 Intent Detection

The Intent Analysis Agent determines what the customer is trying to accomplish.

The structured analysis includes:

* Intent
* Sentiment
* Sentiment Score
* Frustration
* Urgency
* Confidence
* Satisfaction Trend

---

## 😊 Sentiment and Frustration Analysis

The system analyses the customer's emotional state to help the support representative understand the current conversation.

For example:

```text
Low Frustration
      ↓
Direct and concise assistance

Moderate Frustration
      ↓
Acknowledgement + clear next step

High Frustration
      ↓
Empathy + ownership + escalation awareness
```

---

## 📚 Retrieval-Augmented Generation (RAG)

Clario Coach uses Retrieval-Augmented Generation to provide relevant project knowledge to the response-generation workflow.

### RAG Flow

```text
Knowledge Document
        ↓
Text Extraction
        ↓
Text Chunking
        ↓
Embedding Generation
        ↓
ChromaDB
        ↓
Semantic Search
        ↓
Relevant Knowledge
        ↓
Coaching Context
        ↓
Response Generation
```

---

## 🔍 Semantic Search

The knowledge layer uses vector embeddings to compare the semantic meaning of a customer's query with stored knowledge.

This allows relevant support information to be retrieved even when the wording of the customer query does not exactly match the wording in the source document.

---

## 📄 Knowledge Document Processing

Knowledge-base documents are processed and indexed before they are used for retrieval.

```text
Upload
  ↓
Extract Text
  ↓
Split into Chunks
  ↓
Generate Embeddings
  ↓
Store in ChromaDB
```

At query time:

```text
Customer Query
  ↓
Query Embedding
  ↓
Semantic Similarity Search
  ↓
Relevant Chunks
  ↓
Knowledge Recommendation
```

---

## 🚨 Escalation Risk Monitoring

The Escalation Monitor Agent evaluates the conversation for signals that may indicate the need for escalation.

The structured result includes:

* Escalation Probability
* Risk Level
* Reasoning
* Recommended Action
* Repeated Complaints
* Resolution Status
* Relevant Signals

The system therefore provides both a risk assessment and an explanation for that assessment.

---

# 🛡️ Anti-Hallucination and Response Safety

A major quality requirement of Clario Coach is to prevent unsupported information from appearing in customer-facing response suggestions.

The system should not invent:

* Customer names
* Order IDs
* Transaction IDs
* Tracking numbers
* Ticket IDs
* Product details
* Policy names
* Dates
* Delivery timelines
* Refund timelines
* Unsupported completed actions

Information should only be used when supported by:

* The current conversation
* Previous conversation context
* Session or application data
* Retrieved knowledge
* Confirmed application actions

### Example

#### ❌ Unsafe

```text
I understand your concern, Marcus. I've checked order ORD-21028.
```

when neither the name nor the order ID exists in the conversation.

#### ✅ Safer

```text
I understand your concern. I can help you with the next step.
```

---

# 🔐 Identifier Grounding

When a customer provides a real identifier:

```text
ORD-12345
```

the system may use the exact supplied identifier.

However, it should not replace it with another invented identifier.

The same principle applies to:

* Transaction IDs
* Tracking IDs
* Ticket IDs
* Reference numbers

---

# 🚫 Unsupported Action Prevention

The customer-facing response must not claim that an action has already been completed unless the application has actually confirmed that action.

For example:

#### ❌ Not acceptable

```text
I've already processed your refund.
```

when no refund has actually been confirmed.

#### ✅ Appropriate

```text
I can help you with the available refund process and the next step.
```

---

# 🧠 Multi-Agent Architecture

Clario Coach uses a **code-based multi-agent architecture**.

Specialized agents are implemented as application-level Python modules/functions, while a central **Orchestrator** coordinates the workflow.

The project does not rely on an external multi-agent framework for orchestration.

---

## 🔄 High-Level Architecture

```text
                         FRONTEND
                            |
                            v
                     FastAPI Backend
                            |
                            v
                       ORCHESTRATOR
                            |
          +-----------------+----------------+
          |                 |                |
          v                 v                v
    Intent Agent      Knowledge Agent   Coaching Agent
                           |                 |
                           v                 v
                        ChromaDB           Gemini
          \_________________________________/
                            |
                            v
                   Escalation Agent
                            |
                            v
                      Final Response
                            |
                            v
                         Frontend
```

---

# 🔗 How the Agents Communicate

Agents communicate through Python function calls and structured return objects.

A simplified representation is:

```python
analysis = analyze_intent(customer_message)

knowledge = recommend(customer_message)

coaching = coach(
    customer_message,
    analysis,
    knowledge
)

risk = monitor(
    customer_message,
    analysis
)
```

The Orchestrator:

1. Receives the request.
2. Determines the active workflow.
3. Builds the current session context.
4. Calls the required agents.
5. Stores their outputs.
6. Passes required results to downstream components.
7. Combines the results.
8. Returns the final structured response.

The final response is serialized through FastAPI and returned to the frontend as JSON.

---

# 🤖 AI Agent Responsibilities

## 1. Customer Simulator Agent

### Purpose

Generates realistic customer responses during Simulator Mode.

### Inputs

* Persona
* Scenario
* Product
* Difficulty
* Conversation history
* Previous customer messages
* Latest support-agent response
* Turn information

### Responsibilities

* Maintain customer persona consistency.
* Follow the selected scenario.
* Maintain context across turns.
* Adjust emotional state.
* Avoid unnecessary repetition.
* Produce a realistic next customer message.

---

## 2. Intent Analysis Agent

### Purpose

Understands the customer's current request and emotional state.

### Output

```text
Intent
Sentiment
Sentiment Score
Frustration
Urgency
Confidence
Satisfaction Trend
```

---

## 3. Knowledge Recommendation Agent

### Purpose

Retrieves relevant information from the ChromaDB knowledge base.

### Responsibilities

* Receive the customer query.
* Perform semantic retrieval.
* Identify relevant knowledge.
* Return structured knowledge recommendations.
* Provide useful context for the Coaching Agent.

---

## 4. Coaching Agent

### Purpose

Generates the customer-ready response and evaluates support-agent communication.

### Inputs

The Coaching Agent can use:

* Customer message
* Agent message
* Intent analysis
* Conversation history
* Retrieved knowledge
* Previous suggestions
* Previous coaching tips
* Agent identity where available

### Output

The coaching output includes:

* Suggested Response
* Tone Notes
* Clarity Notes
* Grammar Notes
* Empathy Notes
* Professionalism Notes
* Improvement Tips
* Communication Scores
* Overall Coaching Score
* Score Reasoning

---

## 5. Escalation Monitor Agent

### Purpose

Determines whether the conversation contains signals that may require escalation.

### Inputs

* Customer message
* Intent analysis
* Conversation history
* Frustration history
* Intent history
* Current turn information

### Output

```text
Escalation Probability
Risk Level
Reasoning
Recommended Action
Repeated Complaints
Resolution Status
Signals
```

---

# 📊 Coaching Evaluation

The Coaching Agent evaluates communication using five primary criteria.

| Criterion           | What It Evaluates                                 |
| ------------------- | ------------------------------------------------- |
| **Tone**            | Politeness, respect and emotional appropriateness |
| **Clarity**         | Understandability and clarity of next steps       |
| **Grammar**         | Grammar, spelling and sentence structure          |
| **Professionalism** | Responsible and suitable support communication    |
| **Empathy**         | Recognition of customer feelings and frustration  |

The system also produces:

* Overall coaching score
* Score reasoning
* Improvement tips

---

# 🎭 Interaction Modes

Clario Coach provides three interaction modes.

## 1. Simulator Mode

Simulator Mode is designed for practice without requiring a real customer.

```text
Support Agent Response
        ↓
Customer Simulator
        ↓
Intent Analysis
        ↓
Knowledge Retrieval
        ↓
Coaching
        ↓
Escalation
        ↓
Frontend
```

The simulator maintains context across turns and produces customer responses based on the configured scenario and persona.

---

## 2. Manual Mode

Manual Mode allows the trainee to enter or paste a customer message.

The simulator is skipped because the customer message is supplied directly.

```text
Customer Message
        ↓
Intent Analysis
        ↓
Knowledge Retrieval
        ↓
Coaching
        ↓
Escalation
        ↓
Frontend
```

---

## 3. Replay Mode

Replay Mode processes an existing customer-support transcript turn by turn.

It can be used for:

* Historical interaction analysis
* Response practice
* Coaching review
* Demonstrations
* Conversation improvement

---

# 🔁 Conversation Context

Multi-turn context is an important part of the system.

Depending on the workflow, context can include:

```text
Conversation History
Previous Customer Messages
Previous Agent Responses
Previous Suggested Responses
Previous Coaching Tips
Frustration History
Intent History
Current Turn
Latest Agent Response
```

This allows subsequent coaching responses to consider what has already happened in the conversation.

---

# 🏗️ End-to-End System Workflow

```text
Customer / Training Input
          ↓
        Frontend
          ↓
      FastAPI API
          ↓
      Orchestrator
          ↓
   +------+------+
   |             |
   v             v
Intent       Knowledge
Analysis     Retrieval
   |             |
   +------+------+
          |
          v
       Coaching
          |
          v
      Escalation
          |
          v
  Structured Response
          |
          v
       Frontend
```

In Simulator Mode, the Customer Simulator is executed before the analysis stages.

---

# 💾 Structured Data Flow

The system uses structured request and response objects to maintain predictable data exchange.

Typical models/components include:

```text
ChatRequest
IntentAnalysis
RetrievedChunk
CoachingSuggestion
EscalationRisk
ChatTurnResponse
```

This structured approach allows the frontend to consume predictable API results.

---

# 🌐 Frontend

The frontend provides the user-facing coaching experience.

Major responsibilities include:

* Session interaction
* Customer conversation display
* Support-agent response entry
* Coaching suggestions
* Communication feedback
* Knowledge recommendations
* Escalation information
* Agent execution trace
* Session and report views

The frontend communicates with the backend through the FastAPI API layer.

---

# ⚙️ Backend

The backend is implemented using Python and FastAPI.

Major responsibilities include:

* API routing
* Request validation
* Session processing
* Orchestration
* Agent execution
* RAG integration
* Coaching generation
* Escalation analysis
* Structured response generation
* Reporting

---

# 🔌 API Endpoints

The application exposes endpoints for the major backend functions.

| Method | Endpoint            | Purpose                                   |
| ------ | ------------------- | ----------------------------------------- |
| `GET`  | `/`                 | Backend root/health response              |
| `GET`  | `/docs`             | Interactive Swagger/OpenAPI documentation |
| `POST` | `/chat`             | Process a customer-support coaching turn  |
| `POST` | `/upload`           | Upload/process knowledge documents        |
| `POST` | `/knowledge/search` | Search the knowledge base                 |
| `GET`  | `/session/latest`   | Retrieve the latest session               |
| `POST` | `/session/start`    | Start a new coaching session              |

---

# 🔄 API Data Flow

```text
Frontend Request
       ↓
ChatRequest
       ↓
FastAPI /chat
       ↓
Orchestrator
       ↓
AI Agent Pipeline
       ↓
Structured Pydantic Result
       ↓
ChatTurnResponse
       ↓
JSON Serialization
       ↓
Frontend
```

---

# 👤 Logged-In Agent Identity

The application supports passing the signed-in support representative's identity through the existing user/API flow.

The identity is represented as:

```text
agent_name
```

The intended flow is:

```text
Logged-In User
      ↓
Frontend User Layer
      ↓
api.chat()
      ↓
ChatRequest
      ↓
Orchestrator
      ↓
Coaching Agent
```

The support representative's identity remains separate from customer identity.

---

# 🛠️ Technology Stack

## Frontend

| Technology   | Purpose                            |
| ------------ | ---------------------------------- |
| React        | User interface                     |
| TypeScript   | Type-safe frontend implementation  |
| Vite         | Frontend development/build tooling |
| Tailwind CSS | Styling                            |

## Backend

| Technology | Purpose                     |
| ---------- | --------------------------- |
| Python     | Backend implementation      |
| FastAPI    | REST API                    |
| Uvicorn    | ASGI application server     |
| Pydantic   | Request/response validation |

## AI / NLP

| Technology            | Purpose                            |
| --------------------- | ---------------------------------- |
| Google Gemini         | LLM-based generation and reasoning |
| Sentence Transformers | Text embeddings                    |
| `all-MiniLM-L6-v2`    | Embedding model                    |
| NLP                   | Conversation analysis              |

## RAG / Vector Storage

| Technology      | Purpose                                              |
| --------------- | ---------------------------------------------------- |
| ChromaDB        | Vector storage and semantic retrieval                |
| Semantic Search | Relevant knowledge retrieval                         |
| RAG             | Grounding response generation with project knowledge |

## Reporting

| Technology | Purpose               |
| ---------- | --------------------- |
| ReportLab  | PDF report generation |

## Development

| Tool              | Purpose                        |
| ----------------- | ------------------------------ |
| Git               | Version control                |
| GitHub            | Repository hosting             |
| REST API          | Frontend/backend communication |
| Swagger / OpenAPI | Interactive API documentation  |

---

# 📂 Project Structure

```text
clarion-coach/
│
├── backend/
│   ├── app/
│   │   ├── agents/
│   │   ├── api/
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
├── docs/
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

# ⚙️ Installation and Setup

## Prerequisites

Install:

* Python
* Node.js
* npm
* Git

A valid Google Gemini API key is required for live AI functionality.

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

Create a virtual environment:

```bash
python -m venv .venv
```

### Windows

```powershell
.\.venv\Scripts\Activate.ps1
```

### Linux / macOS

```bash
source .venv/bin/activate
```

Install backend dependencies:

```bash
pip install -r requirements.txt
```

---

## 3. Configure the Gemini API Key

Create:

```text
backend/.env
```

Add:

```env
GEMINI_API_KEY=YOUR_GEMINI_API_KEY
```

### Security Notice

Never commit the real API key to GitHub.

The `.env` file should remain local.

Use `.env.example` as the safe configuration reference.

---

# 🚀 Running the Backend

From the `backend` directory:

```bash
python -m uvicorn app.main:app --reload --port 8000
```

Backend URL:

```text
http://127.0.0.1:8000
```

Swagger UI:

```text
http://127.0.0.1:8000/docs
```

---

# 💻 Running the Frontend

Open a new terminal and return to the project root:

```bash
cd clarion-coach
```

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

For real backend mode, configure the frontend API base URL through the project environment configuration.

Example:

```env
VITE_API_BASE_URL=http://127.0.0.1:8000
```

The actual frontend development port depends on the Vite configuration.

---

# 🧪 Testing and Validation

Testing covers both individual components and the complete application workflow.

## Core Testing Areas

* Orchestrator
* Intent Analysis Agent
* Knowledge Recommendation Agent
* Coaching Agent
* Escalation Agent
* Customer Simulator
* RAG retrieval
* Simulator Mode
* Manual Mode
* Replay Mode
* API integration
* Error handling
* Security
* Reporting

---

## No Customer Name Test

Input:

```text
My password still isn't working. What should I do?
```

Expected:

* No invented customer name
* No invented order ID
* No invented transaction ID
* No unsupported completed action

---

## Real Order ID Test

Input:

```text
My order ORD-12345 still hasn't arrived.
```

Expected:

* `ORD-12345` may be referenced.
* A different order ID must not be generated.

---

## Unsupported Action Test

Condition:

No refund, reset, replacement, dispatch, or other system action has been confirmed.

Expected:

The system provides an appropriate next step instead of falsely claiming that an action has already been completed.

---

## Dynamic Multi-Turn Test

Run several consecutive turns.

Verify that:

* Conversation history is retained.
* Suggestions change according to the current turn.
* Previous suggestions are considered.
* Previous coaching tips are considered.
* Customer emotion remains context-aware.
* Responses do not unnecessarily repeat earlier wording.

---

## Knowledge Retrieval Test

Ask a question represented in the knowledge base.

Expected:

* Relevant knowledge is retrieved.
* Retrieved context reaches the coaching stage.
* The suggested response is grounded in available context.

---

# 🛠️ Reliability and Error Handling

The frontend API layer is designed to handle:

* Backend unavailable
* Request timeout
* Non-success HTTP response
* Invalid JSON response
* Knowledge-upload failure

The application should present a meaningful error to the user instead of silently treating an actual backend failure as a successful response.

---

# 🐞 Engineering Challenges and Improvements

## Hallucinated Customer Names

### Problem

The model could generate a customer name even when the name was not available.

### Improvement

Customer-name grounding rules were strengthened so that only available customer names can be used.

---

## Hallucinated Order and Transaction IDs

### Problem

The model could generate realistic-looking identifiers that were not part of the conversation.

### Improvement

Identifier grounding rules were strengthened so unsupported values are not introduced.

---

## Unsupported Completed Actions

### Problem

Generated responses could imply that a refund, reset, dispatch, replacement, or similar action had already occurred without confirmation.

### Improvement

Response-generation rules were changed to provide the appropriate next step unless the action has been explicitly confirmed.

---

## Repetitive Multi-Turn Responses

### Problem

Repeated suggestions can reduce the usefulness of coaching during longer conversations.

### Improvement

Previous suggestions and coaching tips are passed into the current coaching context.

---

## Frontend API Error Handling

### Problem

Backend failures need to be surfaced clearly to the user.

### Improvement

The API layer was strengthened with request timeout and explicit handling for unreachable backend, non-2xx responses, and invalid JSON.

---

## Knowledge Upload Error Handling

### Problem

An unsuccessful knowledge-upload response could be interpreted incorrectly.

### Improvement

Knowledge-upload handling was updated so unsuccessful responses are treated as errors.

---

# 📅 Four Project Milestones

## Milestone 1 — Project Foundation

### Major Work

* React/Vite frontend setup
* FastAPI backend setup
* API structure
* Pydantic models
* Session configuration
* Code-based Orchestrator

### Outcome

The project foundation and application-level orchestration flow were established.

---

## Milestone 2 — AI and Knowledge Pipeline

### Major Work

* Intent analysis
* Sentiment analysis
* Frustration and urgency analysis
* Knowledge ingestion
* Text chunking
* Sentence Transformer embeddings
* ChromaDB integration
* Semantic retrieval
* Gemini integration

### Outcome

The application could understand customer messages and retrieve relevant support knowledge.

---

## Milestone 3 — Coaching and Training Experience

### Major Work

* Coaching Agent
* Escalation Monitor
* Customer Simulator
* Simulator Mode
* Manual Mode
* Replay Mode
* Conversation history
* Coaching scores
* Agent execution trace

### Outcome

The system became a practical customer-support training and coaching platform.

---

## Milestone 4 — Quality and Finalization

### Major Work

* Dynamic multi-turn responses
* Previous-suggestion memory
* Previous-coaching memory
* Anti-hallucination safeguards
* Customer-name grounding
* Order/transaction-ID grounding
* Unsupported-action prevention
* Logged-in agent-name flow
* API error handling
* Security cleanup
* Reporting/PDF functionality
* Testing
* Detailed project documentation

### Outcome

The project was prepared for final review, demonstration, and submission.

---

# 📊 Evaluation Criteria

| Evaluation Area        | How Clario Coach Addresses It                                                       |
| ---------------------- | ----------------------------------------------------------------------------------- |
| Customer simulation    | Uses persona, scenario and conversation context to generate practice interactions.  |
| Intent analysis        | Produces structured intent and emotional information.                               |
| Knowledge relevance    | Uses ChromaDB and semantic retrieval to surface relevant support information.       |
| Coaching usefulness    | Generates suggested responses, communication feedback, scores and improvement tips. |
| Communication quality  | Evaluates tone, clarity, grammar, professionalism and empathy.                      |
| Escalation awareness   | Provides probability, risk level, reasoning and recommended action.                 |
| Multi-turn consistency | Uses conversation history and previous coaching context.                            |
| Response safety        | Prevents unsupported names, identifiers and completed actions.                      |
| Mode coverage          | Supports Simulator, Manual and Replay workflows.                                    |
| API reliability        | Provides explicit timeout and error handling.                                       |
| Security               | Keeps Gemini credentials backend-only.                                              |

---

# 📑 Project Documentation

Detailed technical documentation is maintained under the `docs/` directory.

```text
docs/
├── PROJECT_DOCUMENTATION.md
├── architecture.md
├── agents.md
├── modes.md
├── rag_pipeline.md
├── coaching_and_scoring.md
├── setup_and_run.md
├── testing.md
└── milestones.md
```

These files provide detailed information about:

* System architecture
* Agent responsibilities
* Interaction modes
* RAG pipeline
* Coaching and scoring
* Setup and execution
* Testing and validation
* Four project milestones

---

# 📌 Project Applications

Clario Coach can be used in customer-support environments for:

* Support-agent training
* Customer communication improvement
* Customer issue classification
* Knowledge-base assistance
* Response drafting
* Sentiment understanding
* Frustration monitoring
* Escalation awareness
* Conversation review
* AI-assisted coaching

---

# 🚀 Future Enhancements

Potential future improvements include:

## Real-Time Production Chat Integration

Connect the coaching workflow to an actual customer-support chat platform.

## Personalised Coaching

Maintain individual coaching profiles and adapt recommendations according to recurring communication patterns.

## Advanced Analytics

Introduce richer analytics for:

* Communication trends
* Escalation patterns
* Frequently encountered intents
* Coaching improvement
* Knowledge gaps

## Multi-Language Support

Extend the system to additional languages and regional customer-service requirements.

## Voice-Based Coaching

Introduce voice-based interaction analysis and coaching.

## Advanced Retrieval

Potential improvements include:

* Metadata filtering
* Retrieval reranking
* Retrieval evaluation
* Improved document-level controls

## Role-Based Access

Introduce authentication and role-based access for representatives, supervisors, and administrators.

## Configurable Escalation Rules

Allow supervisors to configure escalation thresholds according to organizational requirements.

---

# 👤 Author

**Sangaraju Suvida**

---

# 📄 License

This project is licensed under the **MIT License**.

See the [`LICENSE`](LICENSE) file for complete license information.

---

# 🙏 Acknowledgements

Clario Coach uses and integrates the following technologies and open-source tools:

* React
* TypeScript
* Vite
* FastAPI
* Uvicorn
* Pydantic
* Google Gemini
* ChromaDB
* Sentence Transformers
* Tailwind CSS
* ReportLab

---

# ⭐ Conclusion

Clario Coach demonstrates how **Large Language Models, Retrieval-Augmented Generation, semantic search, and code-based multi-agent orchestration** can be combined to create an **AI-Powered Real-Time Customer Support Coaching Assistant**.

The system separates major responsibilities across specialized components:

* The **Customer Simulator Agent** creates realistic practice conversations.
* The **Intent Analysis Agent** interprets customer intent and emotional signals.
* The **Knowledge Recommendation Agent** retrieves relevant information.
* The **Coaching Agent** generates customer-ready responses and evaluates communication quality.
* The **Escalation Monitor Agent** identifies potential escalation situations.
* The **Orchestrator** coordinates the overall workflow and combines structured outputs.

The project was developed through **four milestones**, progressing from application foundation and orchestration to AI/RAG integration, coaching functionality, response-quality improvements, testing, and final documentation.

The resulting platform provides a unified environment for **practising, analysing, and improving customer-support interactions through AI-assisted real-time coaching**.

---

## 🔗 Repository

[https://github.com/Suvida-11/clarion-coach](https://github.com/Suvida-11/clarion-coach)

---

## 💡 Project Tagline

> **Understand the customer. Retrieve the right knowledge. Coach the right response.**
