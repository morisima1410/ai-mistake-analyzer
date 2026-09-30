# 🧠 AI Mistake Analyzer

> **“Understand your mistakes. Learn smarter.”**

An intelligent, educational AI/ML web application designed to help students deeply comprehend *why* an answer is incorrect rather than just giving away the solution. 

Instead of simple right/wrong feedback or judgmental criticism, **AI Mistake Analyzer** diagnoses the underlying cognitive pattern (calculation slip, conceptual misunderstanding, syntax omission, wrong methodology, or incomplete work), provides supportive step-by-step reasoning, gives actionable learning tips, and generates a personalized practice question.

---

## 📸 Screenshots

| Analyze Page | Diagnostic Feedback |
| :---: | :---: |
| *Intuitive question & answer input with subject presets* | *Pedagogical diagnosis with mistake taxonomy & practice questions* |

| Mistake History | Learning Dashboard |
| :---: | :---: |
| *Searchable log of previous analyses with detail modal* | *Accuracy analytics & horizontal CSS mistake breakdowns* |

---

## 🌟 Key Features

1. **Non-Judgmental Pedagogical Feedback**:
   - Classifies error patterns without discouraging the student.
   - Distinct recognition of correct answers vs. 6 mistake classifications.
2. **Pedagogical Breakdown**:
   - **Correct/Incorrect Status**
   - **Mistake Classification**: Conceptual, Calculation, Syntax, Careless, Incomplete, Wrong Method, or No Mistake.
   - **Targeted Rationale**: "Why is this incorrect?"
   - **Clear Explanation**: Student-friendly, step-by-step breakdown.
   - **Learning Tip**: Actionable strategies to avoid similar mistakes in exams.
   - **Follow-up Practice Question**: Custom problem to cement comprehension immediately.
3. **Hybrid AI + Machine Learning Architecture**:
   - Fast initial categorization via local **scikit-learn** model (`ml_model.py`).
   - Deep reasoning, explanations, and dynamic questions powered by **Google Gemini** (`ai_service.py`).
4. **Learning History & Session Tracking**:
   - Automatically saves every analysis to a lightweight **SQLite** database (`mistakes` table).
   - Review past questions, inspect detailed modals, or clear history anytime.
5. **Interactive Analytics Dashboard**:
   - Real-time calculations: Total Questions, Correct Answers, Mistakes Diagnosed, and Accuracy Percentage.
   - Visual horizontal bar charts illustrating most common mistake patterns.
6. **Pure Vanilla Frontend**:
   - Built entirely with semantic HTML5, modern CSS3 (custom properties, responsive grid, zero framework bloat), and clean Vanilla JavaScript.

---

## 🛠️ Tech Stack

- **Frontend**:
  - HTML5 (Semantic, Accessible)
  - CSS3 (Variables, Flexbox, Grid, Keyframe Animations, Horizontal Progress Bars)
  - Vanilla JavaScript (ES6+ `async`/`await`, `fetch` API)
- **Backend**:
  - Python 3.10+
  - FastAPI (High-performance async REST API & Static File Server)
  - Uvicorn (ASGI web server)
  - Pydantic v2 (Strict request/response schema validation)
- **Machine Learning**:
  - Python `scikit-learn`
  - `TfidfVectorizer` (N-gram feature extraction)
  - `LogisticRegression` (Multi-class classification)
- **Generative AI**:
  - Google Gemini API (`gemini-3.1-flash-lite`, `gemini-3.8-flash`) via the modern `google-genai` SDK
- **Database**:
  - SQLite3 (zero-configuration, persistent relational storage)

---

## 🏗️ System Architecture

```text
┌─────────────────────────────────────────────────────────────┐
│                      Vanilla Frontend                       │
│     (index.html / history.html / dashboard.html / style.css)│
└──────────────────────────────▲──────────────────────────────┘
                               │ HTTP / JSON
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                    FastAPI Backend Engine                   │
│                       (backend/main.py)                     │
├──────────────────────────────┬──────────────────────────────┤
│  REST API Routes             │  Static File Server          │
│  - POST /api/analyze         │  - /css/style.css            │
│  - GET  /api/history         │  - /js/*.js                  │
│  - GET  /api/stats           │  - /*.html                   │
└──────────────┬───────────────┴──────────────┬───────────────┘
               │                              │
               ▼                              ▼
┌──────────────────────────────┐ ┌─────────────────────────────┐
│  scikit-learn Classifier     │ │  Google Gemini API          │
│  (backend/ml_model.py)       │ │  (backend/ai_service.py)    │
│  - TF-IDF Vectorizer         │ │  - Deep reasoning           │
│  - Logistic Regression       │ │  - Structured JSON outputs  │
│  - Rapid initial suggestion  │ │  - Educational diagnosis    │
└──────────────────────────────┘ └─────────────────────────────┘
                               ▲
                               │
               ┌───────────────┴──────────────┐
               │    SQLite Database (mistakes)│
               │    (backend/database.py)     │
               └──────────────────────────────┘
```

### How the Hybrid ML + AI Pipeline Works

1. **Initial ML Screen**: When a student submits an answer, the input text is transformed via a `TfidfVectorizer` and evaluated with a trained `LogisticRegression` model. This quickly produces an initial mistake hypothesis and confidence score.
2. **Deep Reasoning with Gemini**: The question, answer, subject, and ML classifier context are passed to the Gemini model. Gemini evaluates the validity of the work, checks the mathematical or conceptual steps, overrides the ML hypothesis if necessary, and writes the friendly pedagogical explanation and follow-up practice problem.
3. **Persistence**: The verified diagnosis, mistake category, tips, and difficulty are stored in SQLite for the history and dashboard analytics.

---

## 🗄️ Database Structure

SQLite table schema (`mistakes`):

| Column | Type | Description |
| :--- | :--- | :--- |
| `id` | `INTEGER PRIMARY KEY AUTOINCREMENT` | Unique record ID |
| `question` | `TEXT` | The original question |
| `student_answer` | `TEXT` | Student's submitted answer |
| `subject` | `TEXT` | Subject (Math, Programming, etc.) |
| `is_correct` | `BOOLEAN` | Whether the answer is correct (1 or 0) |
| `mistake_type` | `TEXT` | Mistake category or "No Mistake" |
| `confidence` | `REAL` | Confidence score between 0.0 and 1.0 |
| `correct_answer` | `TEXT` | The actual correct solution |
| `why_wrong` | `TEXT` | Short diagnostic statement of the flaw |
| `explanation` | `TEXT` | Step-by-step friendly explanation |
| `learning_tip` | `TEXT` | Actionable advice for future problems |
| `practice_question` | `TEXT` | Follow-up question to test understanding |
| `difficulty` | `TEXT` | Problem difficulty (Easy, Medium, Hard) |
| `created_at` | `TIMESTAMP` | Automatic timestamp of submission |

---

## 📡 API Endpoints

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/analyze` | Evaluates question & answer, returns structured diagnosis |
| `GET` | `/api/history` | Retrieves all past analyses ordered newest first |
| `GET` | `/api/history/{id}` | Retrieves full details for a specific analysis record |
| `DELETE` | `/api/history/{id}` | Deletes a single analysis record |
| `DELETE` | `/api/history` | Clears all history records |
| `GET` | `/api/stats` | Returns total counts, accuracy %, and mistake breakdown |
| `GET` | `/api/health` | Returns server health and ML model training state |

### Sample Analysis Request

```http
POST /api/analyze
Content-Type: application/json

{
  "question": "What is 5 × 6?",
  "student_answer": "35",
  "subject": "Mathematics"
}
```

### Sample Analysis Response

```json
{
  "is_correct": false,
  "mistake_type": "Calculation Mistake",
  "confidence": 0.95,
  "correct_answer": "30",
  "why_wrong": "The multiplication was calculated incorrectly.",
  "explanation": "5 multiplied by 6 equals 30, not 35.",
  "learning_tip": "Double-check your times tables, or break 5 × 6 down into 5 × 5 (25) + 5 (30).",
  "practice_question": "What is 7 × 8?",
  "difficulty": "Easy"
}
```

---

## 🚀 Installation & Local Setup

### Prerequisites
- Python 3.10 or higher
- A Gemini API Key from [Google AI Studio](https://aistudio.google.com/)

### Step 1: Clone or Navigate to the Repository
```bash
git clone <your-repo-url>
cd ai-mistake-analyzer
```

### Step 2: Create and Activate Virtual Environment
```bash
# macOS/Linux
python3 -m venv venv
source venv/bin/activate

# Windows
python -m venv venv
venv\Scripts\activate
```

### Step 3: Install Dependencies
```bash
pip install -r requirements.txt
```

### Step 4: Configure Environment Variables
Copy the `.env.example` file to `.env`:
```bash
cp .env.example .env
```
Edit `.env` and insert your Gemini API Key:
```env
GEMINI_API_KEY=your_actual_api_key_here
PORT=8000
HOST=0.0.0.0
```

### Step 5: Run the Server
```bash
uvicorn backend.main:app --reload --port 8000
```

### Step 6: Open the Web Application
Open your browser and navigate to:
```
http://localhost:8000
```
FastAPI automatically serves the HTML/CSS/JavaScript frontend directly from the root URL.
