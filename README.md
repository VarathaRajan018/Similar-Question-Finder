# Similar Question Finder

> **EdTech Hiring Assignment — Option: Full-Stack AI Study Tool**

A web application where students type study questions and instantly receive:
- Semantically similar past questions (cosine similarity on local embeddings)
- An automatic subject tag (zero-shot classification via the same embeddings)
- A filterable history of all past questions

**No external AI APIs are used. The ML runs entirely on the server using `sentence-transformers`.**

---

## 🚀 Live Demo

| Service | URL |
|---|---|
| **Frontend** (Vercel) | [https://similar-question-finder.vercel.app/](https://similar-question-finder.vercel.app/) |
| **Backend** (Render) | [https://similar-question-finder-budo.onrender.com/](https://similar-question-finder-budo.onrender.com/) |

> **Note:** The Render free tier spins down after inactivity — the first request may take ~30 seconds to wake up.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, React Router v6 |
| Backend | FastAPI (Python 3.10+), Uvicorn |
| Database | MongoDB Atlas (free tier), Motor (async driver) |
| Auth | JWT (`python-jose`) + bcrypt (`passlib`) |
| ML | `sentence-transformers`, `all-MiniLM-L6-v2` |

---

## Local Setup

### Prerequisites

- Python 3.10+
- Node.js 18+
- A MongoDB Atlas free cluster (or use the pre-configured connection string)

---

### Backend

```bash
cd backend

# 1. Create and activate a virtual environment
python -m venv venv
venv\Scripts\activate          # Windows
# source venv/bin/activate    # macOS/Linux

# 2. Install dependencies
pip install -r requirements.txt

# 3. Configure environment (copy and edit as needed)
copy .env.example .env        # Windows
# cp .env.example .env       # macOS/Linux
# Edit .env to set JWT_SECRET_KEY and confirm MONGO_URI

# 4. Run the ML sanity-check (no server needed)
python tests/test_ml.py

# 5. Start the backend server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

API docs available at **http://localhost:8000/docs** (Swagger UI).

---

### Frontend

```bash
cd frontend

# 1. Install dependencies
npm install

# 2. Configure environment
copy .env.example .env        # Windows
# cp .env.example .env       # macOS/Linux
# Edit .env: VITE_API_URL=http://localhost:8000

# 3. Start the dev server
npm run dev
```

Frontend available at **http://localhost:5173**.

---

## How the ML Logic Works

### 1. Embedding (`embed_text`)

Every question is converted into a **384-dimensional dense vector** by the
`all-MiniLM-L6-v2` model from Hugging Face. This model was pre-trained on
hundreds of millions of sentence pairs to place semantically related text
close together in this vector space.

Embeddings are **L2-normalised** (unit vectors), which means:
- Every vector lies on the unit hypersphere
- Cosine similarity reduces to a simple dot product (fast, stable)

### 2. Similarity Search (`find_similar_questions`)

For each newly submitted question:
1. Its embedding is compared against the embeddings of **all stored questions** via cosine similarity.
2. Only matches above `threshold = 0.55` are returned (prevents false positives on short/generic questions).
3. Results are sorted by score descending; top 5 are returned.

**Why cosine over Euclidean?**
Cosine similarity measures *direction* (meaning), not magnitude. Two questions
about the same topic will point in the same direction regardless of length.
Euclidean distance conflates length differences with semantic differences —
wrong metric for this use case.

### 3. Zero-Shot Topic Tagging (`assign_topic_tag`)

Each topic (Biology, Physics, etc.) is described by a rich natural-language phrase, e.g.:

> "Biology: living organisms, cells, genetics, DNA, evolution, photosynthesis…"

These phrases are **embedded once at startup** using the same model. For a new question,
we find the topic whose embedding is most similar — the model generalises from its
training to map conceptually related questions to the right topic without any
hardcoded if/else or keyword lists.

This is genuine **zero-shot classification**: the model was never trained on this
specific topic taxonomy, yet it correctly classifies novel questions by leveraging
the semantic structure learned during pre-training.

### 4. Why `threshold = 0.55`?

Short or vague questions ("What is this?" / "Why?") tend to cluster near the
centre of embedding space and can score 0.40–0.50 against totally unrelated
questions. A threshold of 0.55 ensures that only genuinely similar questions
are surfaced, avoiding confusing false-positive matches.

### 5. Why load the model once?

`SentenceTransformer` loads tokeniser weights from disk and initialises PyTorch
tensors — this takes 1–2 seconds. Doing it per request would make every API
call unacceptably slow. Loading once at module import means all requests share
the same stateless, thread-safe model instance at zero marginal cost.

---

## Deployment

### Backend (Render)

**Deployed at:** [https://similar-question-finder-budo.onrender.com/](https://similar-question-finder-budo.onrender.com/)

1. Create a **Web Service** on [render.com](https://render.com).
2. Set **Build Command**: `pip install -r requirements.txt`
3. Set **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
4. Add environment variables from `backend/.env.example`.

### Frontend (Vercel)

**Deployed at:** [https://similar-question-finder.vercel.app/](https://similar-question-finder.vercel.app/)

1. Push `frontend/` to GitHub.
2. Import the repository on [vercel.com](https://vercel.com).
3. Set `VITE_API_URL` to your Render backend URL.
4. Deploy.

### Database (MongoDB Atlas)

1. Create a free M0 cluster on [mongodb.com/atlas](https://mongodb.com/atlas).
2. Whitelist `0.0.0.0/0` in Network Access (or Render's IPs).
3. Copy the connection string into `MONGO_URI`.

---

## Project Structure

```
backend/
├── app/
│   ├── main.py                  FastAPI app, CORS, routers
│   ├── auth.py                  bcrypt hashing, JWT creation/verification
│   ├── database.py              Motor async MongoDB client
│   ├── models.py                Pydantic request/response schemas
│   ├── routes/
│   │   ├── auth_routes.py       POST /auth/signup, POST /auth/login
│   │   └── question_routes.py   POST /questions, GET /questions
│   └── services/
│       └── embedding_service.py ML core (model, embed, similarity, tagging)
├── tests/
│   └── test_ml.py               Standalone ML sanity-check script
├── requirements.txt
├── .env / .env.example

frontend/
├── src/
│   ├── api/client.js            Central API client (all fetch calls here)
│   ├── context/AuthContext.jsx  Auth state, localStorage persistence
│   ├── components/
│   │   └── ProtectedRoute.jsx   Redirects unauthenticated users to /login
│   └── pages/
│       ├── Home.jsx             Landing page
│       ├── Signup.jsx           Registration form
│       ├── Login.jsx            Login form
│       ├── AskQuestion.jsx      Question submission + results
│       └── History.jsx          Past questions with tag filter
├── index.html
├── .env / .env.example
```
