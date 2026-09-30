# 🧠 AI Mistake Analyzer

> **Understand your mistakes. Learn smarter.**

AI Mistake Analyzer is an intelligent AI/ML-powered learning platform designed to help students understand **why an answer is incorrect**, rather than simply showing the correct answer.

The platform analyzes a student's response, identifies the type of mistake, explains what went wrong, provides personalized learning tips, and generates a similar practice question to help strengthen understanding.

---

## ✨ Features

### 🎯 Intelligent Mistake Analysis

AI Mistake Analyzer can identify different types of mistakes, including:

* 🧮 Calculation Mistake
* 🧠 Conceptual Mistake
* 💻 Syntax Mistake
* ⚠️ Careless Mistake
* 📝 Incomplete Answer
* 🔄 Wrong Method
* ✅ No Mistake

The system is designed to provide supportive, educational feedback rather than simply marking an answer as wrong.

### 🤖 AI-Powered Feedback

For every submitted answer, the platform can provide:

* Correct / Incorrect status
* Mistake type
* Confidence score
* Correct answer
* What went wrong
* Simple explanation
* Personalized learning tip
* Similar practice question
* Difficulty level

### 🧠 Hybrid ML + AI Architecture

The application combines traditional Machine Learning with Generative AI:

* **scikit-learn** provides fast initial mistake classification.
* **Google Gemini** provides deeper reasoning and educational explanations.
* Gemini can use the ML prediction as additional context and determine the final diagnosis.

### 📚 Learning History

Students can:

* View previous analyses
* Inspect detailed feedback
* Delete individual records
* Clear their analysis history
* Review recurring mistake patterns

### 📊 Learning Dashboard

The dashboard displays:

* Total Questions
* Correct Answers
* Mistakes
* Accuracy
* Mistake Breakdown
* Recent Mistakes

### 🎨 Modern Dark UI

The frontend is built with:

* Semantic HTML5
* Modern CSS3
* Vanilla JavaScript
* Responsive layouts
* Dark-only premium interface
* Mobile navigation

No frontend framework is required.

---

## 📸 Application Flow

```text
Welcome
   ↓
Register
   ↓
Login
   ↓
Dashboard
   ↓
Analyze Answer
   ↓
AI + ML Analysis
   ↓
Detailed Feedback
   ↓
Practice Question
   ↓
History & Progress
```

---

## 🛠️ Tech Stack

### Frontend

| Technology         | Purpose                              |
| ------------------ | ------------------------------------ |
| HTML5              | Page structure                       |
| CSS3               | Responsive UI and styling            |
| Vanilla JavaScript | Frontend logic and API communication |

### Backend

| Technology   | Purpose                         |
| ------------ | ------------------------------- |
| Python 3.10+ | Backend programming             |
| FastAPI      | REST API and application server |
| Uvicorn      | ASGI server                     |
| Pydantic     | Data validation                 |

### Machine Learning

| Technology          | Purpose                 |
| ------------------- | ----------------------- |
| scikit-learn        | Machine Learning        |
| TF-IDF              | Text feature extraction |
| Logistic Regression | Mistake classification  |

### Generative AI

| Technology        | Purpose                               |
| ----------------- | ------------------------------------- |
| Google Gemini API | AI reasoning and educational feedback |
| `google-genai`    | Gemini Python SDK                     |

### Database

| Technology | Purpose                       |
| ---------- | ----------------------------- |
| SQLite     | Persistent relational storage |

---

## 🏗️ System Architecture

```text
┌──────────────────────────────────────────────────────────────┐
│                     VANILLA FRONTEND                         │
│                                                              │
│  HTML5 + CSS3 + Vanilla JavaScript                           │
│                                                              │
│  Dashboard | Analyze | History | Profile | Contact | About  │
└─────────────────────────────┬────────────────────────────────┘
                              │
                         HTTP / JSON
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│                     FASTAPI BACKEND                          │
│                                                              │
│  Authentication | REST APIs | Validation | Business Logic   │
└───────────────┬──────────────────────┬───────────────────────┘
                │                      │
                ▼                      ▼
┌──────────────────────────┐   ┌──────────────────────────────┐
│   SCIKIT-LEARN MODEL     │   │       GOOGLE GEMINI         │
│                          │   │                              │
│  TF-IDF Vectorizer       │   │  Deep reasoning             │
│  Logistic Regression     │   │  Answer verification        │
│  Initial classification  │   │  Educational explanation    │
└──────────────┬───────────┘   │  Practice generation        │
               │               └──────────────┬───────────────┘
               │                              │
               └──────────────┬───────────────┘
                              ▼
                 ┌──────────────────────────┐
                 │      SQLITE DATABASE      │
                 │                          │
                 │ Users                    │
                 │ Mistake analyses         │
                 │ Contact messages         │
                 └──────────────────────────┘
```

---

## 🔄 How the AI + ML Pipeline Works

### 1. Student Submission

The student enters:

* Question
* Their answer
* Subject

The frontend sends the information to the FastAPI backend.

### 2. Initial ML Classification

The submitted text is processed using:

```text
TF-IDF Vectorizer
       ↓
Logistic Regression
       ↓
Initial Mistake Category
       ↓
Confidence Score
```

The ML model provides a fast initial classification.

### 3. Gemini Analysis

The backend sends the question, student answer, subject, and relevant ML context to Gemini.

Gemini evaluates the response and determines:

* Whether the answer is correct
* What mistake occurred
* Why the mistake occurred
* What the correct answer is
* How the student can improve
* A similar practice question
* Difficulty level

### 4. Final Result

The backend validates the AI response and returns structured JSON to the frontend.

### 5. Persistence

The completed analysis is stored in SQLite and becomes available in:

* History
* Dashboard statistics
* Mistake breakdown

---

## 📁 Project Structure

```text
ai-mistake-analyzer/
│
├── backend/
│   ├── main.py
│   ├── database.py
│   ├── models.py
│   ├── schemas.py
│   ├── auth.py
│   ├── ai_service.py
│   ├── ml_model.py
│   │
│   └── routes/
│       ├── auth.py
│       ├── dashboard.py
│       ├── analyze.py
│       ├── history.py
│       ├── profile.py
│       └── contact.py
│
├── frontend/
│   ├── index.html
│   ├── register.html
│   ├── login.html
│   ├── dashboard.html
│   ├── analyze.html
│   ├── history.html
│   ├── profile.html
│   ├── contact.html
│   ├── about.html
│   │
│   ├── css/
│   │   └── style.css
│   │
│   └── js/
│       ├── auth.js
│       ├── dashboard.js
│       ├── analyze.js
│       ├── history.js
│       ├── profile.js
│       └── contact.js
│
├── data/
│   └── training_data.csv
│
├── .env.example
├── .gitignore
├── requirements.txt
├── README.md
└── LICENSE
```

---

## 🗄️ Database Structure

### Users

```text
users
├── id
├── full_name
├── email
├── password_hash
└── created_at
```

### Mistakes

```text
mistakes
├── id
├── user_id
├── question
├── student_answer
├── subject
├── is_correct
├── mistake_type
├── confidence
├── correct_answer
├── why_wrong
├── explanation
├── learning_tip
├── practice_question
├── difficulty
└── created_at
```

### Contact Messages

```text
contact_messages
├── id
├── name
├── email
├── message
└── created_at
```

Each mistake analysis is associated with the authenticated user so that users only access their own learning history.

---

## 📡 API Endpoints

| Method   | Endpoint            | Description                               |
| -------- | ------------------- | ----------------------------------------- |
| `POST`   | `/api/analyze`      | Analyze a submitted question and answer   |
| `GET`    | `/api/history`      | Retrieve the authenticated user's history |
| `GET`    | `/api/history/{id}` | Retrieve a specific analysis              |
| `DELETE` | `/api/history/{id}` | Delete one analysis                       |
| `DELETE` | `/api/history`      | Clear analysis history                    |
| `GET`    | `/api/stats`        | Retrieve dashboard statistics             |
| `GET`    | `/api/health`       | Check backend and ML status               |

Authentication endpoints may additionally include:

| Method | Endpoint             | Description             |
| ------ | -------------------- | ----------------------- |
| `POST` | `/api/auth/register` | Create an account       |
| `POST` | `/api/auth/login`    | Authenticate a user     |
| `POST` | `/api/auth/logout`   | End the current session |

---

## 🧪 Example Analysis Request

```http
POST /api/analyze
Content-Type: application/json
```

```json
{
  "question": "What is 5 × 6?",
  "student_answer": "35",
  "subject": "Mathematics"
}
```

### Example Response

```json
{
  "is_correct": false,
  "mistake_type": "Calculation Mistake",
  "confidence": 0.95,
  "correct_answer": "30",
  "why_wrong": "The multiplication was calculated incorrectly.",
  "explanation": "5 multiplied by 6 equals 30, not 35.",
  "learning_tip": "Double-check the multiplication before submitting your answer.",
  "practice_question": "What is 7 × 8?",
  "difficulty": "Easy"
}
```

---

# 🚀 Installation & Local Setup

## Prerequisites

Make sure you have:

* Python 3.10 or higher
* Git
* A Google Gemini API key

---

## 1. Clone the Repository

```bash
git clone <your-repository-url>

cd ai-mistake-analyzer
```

---

## 2. Create a Virtual Environment

### Windows

```bash
python -m venv venv

venv\Scripts\activate
```

### macOS / Linux

```bash
python3 -m venv venv

source venv/bin/activate
```

---

## 3. Install Dependencies

```bash
pip install -r requirements.txt
```

---

## 4. Configure Environment Variables

Create a `.env` file from `.env.example`.

```env
GEMINI_API_KEY=your_actual_api_key_here
HOST=0.0.0.0
PORT=8000
```

**Never commit your real API key to GitHub.**

Make sure `.env` is included in `.gitignore`.

---

## 5. Run the Application

```bash
uvicorn backend.main:app --reload --port 8000
```

---

## 6. Open the Application

Open:

```text
http://localhost:8000
```

---

# 🔐 Security

The project follows basic security practices including:

* Password hashing
* Session-based authentication
* Protected application routes
* User-specific mistake history
* Environment variables for API secrets
* No Gemini API key exposed in frontend JavaScript
* Backend validation of incoming requests
* Users cannot access another user's analysis records

> For production deployment, additional security hardening such as HTTPS, secure cookie configuration, CSRF protection where applicable, rate limiting, secret management, and stronger session management should be considered.

---

# 🎨 UI Pages

The application contains the following main pages:

```text
Welcome
│
├── Register
├── Login
│
└── Dashboard
    │
    ├── Dashboard
    ├── Analyze
    ├── History
    ├── Contact
    ├── Profile
    ├── About Us
    └── Logout
```

The interface uses a dark-only design and is responsive across:

* 💻 Desktop
* 📱 Mobile
* 📟 Tablet

---

# 📈 Learning Philosophy

AI Mistake Analyzer is built around a simple idea:

> **A mistake is not just an incorrect answer — it is information about what needs to be learned.**

Instead of focusing only on the final answer, the platform focuses on:

```text
Mistake
   ↓
Understand
   ↓
Learn
   ↓
Practice
   ↓
Improve
```

---

# 🧩 Future Improvements

Possible future improvements include:

* More advanced ML training data
* Subject-specific mistake detection
* More detailed learning analytics
* Improved practice-question generation
* Additional language support
* Production deployment
* Advanced progress tracking

---

# 🤝 Contributing

Contributions, suggestions, and improvements are welcome.

To contribute:

```bash
git fork <your-repository-url>
```

Create a new branch:

```bash
git checkout -b feature/your-feature
```

Commit your changes:

```bash
git commit -m "Add your feature"
```

Push the branch:

```bash
git push origin feature/your-feature
```

Then open a Pull Request.

---

# 📄 License

This project is licensed under the **MIT License**.

See the [`LICENSE`](LICENSE) file for details.

---

# 👩‍💻 Author

**AI Mistake Analyzer**

Built as an AI/ML learning project combining:

* Full-stack web development
* Machine Learning
* Generative AI
* Database management
* Responsive UI design

---

## ⭐ If You Like This Project

If you find **AI Mistake Analyzer** useful or interesting, consider giving the repository a ⭐ on GitHub.

---

## 📌 Project Summary

**AI Mistake Analyzer** combines:

```text
FastAPI
   +
Vanilla JavaScript
   +
SQLite
   +
Scikit-learn
   +
Google Gemini
   =
AI-Powered Learning Platform
```

> **Understand your mistakes. Learn smarter.**
