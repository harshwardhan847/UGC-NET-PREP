# UGC NET CS Study Hub & Reinforcement Learning Portal

An interactive web application designed to help students prepare for the UGC NET Computer Science & General Paper 1 examinations. It leverages past year questions (PYQs), categorizes them into syllabus units, analyzes performance, and uses AI-powered reinforcement learning to explain incorrect answers.

---

## 🚀 Quick Start (Local Setup)

Follow these steps to get the study portal running locally on your machine.

### Prerequisites
Make sure you have the following installed:
* **Node.js** (v18 or higher)
* **npm** (comes packaged with Node.js)
* **Python 3.x** (only required if parsing new PDF question papers)

---

### Step 1: Clone & Navigate to App Directory
Open your terminal and navigate to the `quiz-app` directory:
```bash
cd quiz-app
```

### Step 2: Install Node.js Dependencies
Install all package dependencies:
```bash
npm install
```

### Step 3: Configure Environment Variables
Create a file named `.env.local` in the `quiz-app` directory (if it doesn't already exist):
```bash
touch .env.local
```
Add your Gemini API Key inside it. This key is used by the AI study assistant to explain questions in real-time:
```env
GEMINI_API_KEY=your_gemini_api_key_here
```

### Step 4: Initialize and Seed the Database
The app uses **Prisma** with a local **SQLite** database to store questions, quiz sessions, and user attempt history.
1. Apply the database migrations to your local SQLite file:
   ```bash
   npx prisma migrate dev
   ```
   *(Already have the app set up? Run this again after pulling changes, then restart `npm run dev`, so new tables such as bookmarks exist and the Prisma client is regenerated.)*
2. Seed the database with the pre-compiled questions:
   ```bash
   node prisma/seed.js
   ```

### Step 5: Start the Development Server
Run the local next.js development server:
```bash
npm run dev
```
Open your browser and navigate to **[http://localhost:3000](http://localhost:3000)** to start practicing!

---

## ✨ Features

* **Overview dashboard**: daily goal ring, day streak, exam-date countdown, a practice-activity heatmap, the last 14 days of correct/incorrect answers, mastery per syllabus unit, and your weakest concepts with one-click practice.
* **Practice modes**: smart practice (prioritises recent mistakes, unseen questions and weak units), by unit, full mock papers (adjustable time), and a custom builder (units, papers, unanswered / mistakes / bookmarked, length, timer).
* **Exam-style quiz**: question palette, mark for review, feedback after each question or only at the end, pause, time tracking per question, keyboard shortcuts (press `?` in a quiz), and a results screen with marks, a per-unit breakdown and "redo incorrect".
* **Question bank**: search every question, filter by status, unit, concept and paper, bookmark questions and keep notes on them.
* **AI tutor** (Gemini): a chat about the current question, and an optional follow-up drill when you answer wrongly.
* **Settings**: light/dark/system theme, accent colour, question typeface and size, quiz defaults, daily goal and exam date, plus progress export and reset. Settings are stored in the browser; progress lives in the SQLite database.

---

## 📂 Project Structure

```
.
├── UGC_Comp_*.pdf            # Raw UGC NET Computer Science PDF papers
├── generate_json.py          # Script to parse and extract CS questions from PDFs
├── generate_paper1_json.py    # Script to parse Paper 1 PDFs and merge with CS questions
├── paper_1/                  # Folder containing raw General Paper 1 PDFs
├── ugc_net_cs_pyqs.json      # Merged JSON file containing all compiled questions
└── quiz-app/                 # Next.js web application
    ├── prisma/
    │   ├── dev.db            # SQLite database file (created after db push)
    │   ├── schema.prisma     # Prisma database schema definition
    │   └── seed.js           # Seeds the SQLite db from the compiled JSON
    ├── src/
    │   ├── app/              # Next.js pages and routing
    │   ├── components/       # UI elements (Dashboard, Quiz Arena, Sidebar, etc.)
    │   ├── data/
    │   │   └── ugc_net_cs_pyqs.json # Local copy of the questions JSON
    │   └── hooks/            # Custom React hooks (state management, API handling)
    └── package.json          # Node dependencies and scripts
```

---

## 📝 How to Upload Custom Question Papers & Study

If you have new question papers (PDFs) that you want to upload, parse, and practice with, follow this guide.

### Requirements for the PDFs
The Python scripts use pattern matching (regex) to extract questions. For the scripts to run successfully, your PDFs should be structured with the following standard formats:
1. **Answer Key Section:** Must contain a section titled "Answer Key" containing text like `Q1 (A)`, `Q2 (B)`.
2. **Hints & Solutions Section:** Must contain a section starting with "Hints & Solutions" or "Hints and Solutions" where each explanation starts with `Q1. Text Solution` or `Q1 Text Solution`.
3. **Question Layout:** Questions should start with `Q1`, `Q2`, etc., and end with option options listed as `(A)`, `(B)`, `(C)`, `(D)` or `(1)`, `(2)`, `(3)`, `(4)`.

### Step-by-Step Guide to Add a New Paper

#### 1. Place the PDF in the Project Root
* For **Computer Science (Paper 2)**: Save the PDF in the root directory and name it `UGC_Comp_[Identifier].pdf` (e.g., `UGC_Comp_Dec2026.pdf`).
* For **General Paper 1**: Save the PDF inside the `paper_1` directory and name it `NTA UGC General Paper [Identifier].pdf` (e.g., `NTA UGC General Paper 2026.pdf`).

#### 2. Update the Python Script Configurations
The parsing scripts map filenames to user-friendly titles and contain strict validation checks.

##### For Computer Science (Paper 2):
Open `generate_json.py` and modify:
* **`FILE_YEAR_MAP`** (around line 23): Add your new filename and its friendly display name:
  ```python
  FILE_YEAR_MAP = {
      ...
      "UGC_Comp_Dec2026.pdf": "December 2026",
  }
  ```
* **Validation Assertions** (around line 417): The script asserts that the total questions collected equals a specific count (e.g., `assert len(all_questions) == 1500`). Since you are adding 100 new questions, update this number accordingly (e.g., `1600`) or comment it out to bypass:
  ```python
  # Change or comment out:
  # assert len(all_questions) == 1600
  ```

##### For General Paper 1:
Open `generate_paper1_json.py` and modify:
* **`FILE_YEAR_MAP`** (around line 7): Add the Paper 1 filename map:
  ```python
  FILE_YEAR_MAP = {
      ...
      "NTA UGC General Paper 2026.pdf": "General Paper 2026"
  }
  ```
* **`files` configuration** (around line 14): Map the year to the PDF filename and the page number where the question section ends:
  ```python
  files = {
      ...
      2026: ("NTA UGC General Paper 2026.pdf", 5) # 5 represents the page index where the answers/solutions begin
  }
  ```
* **Validation Assertions** (around lines 159, 167, 172): Update the assertions for `len(all_new_questions)`, `len(all_questions)` and `len(merged_questions)` depending on your new counts, or comment them out.

#### 3. Run the Extraction Scripts
To parse your newly added PDFs and compile them into a unified JSON file, run the following commands in the project root:

1. **Install python dependency** (if not already installed):
   ```bash
   pip install pypdf
   ```
2. **Generate CS Questions JSON**:
   ```bash
   python generate_json.py
   ```
3. **Generate Paper 1 Questions and Merge**:
   ```bash
   python generate_paper1_json.py
   ```
   *(This script automatically updates `ugc_net_cs_pyqs.json` in the root and copies it to `quiz-app/src/data/ugc_net_cs_pyqs.json`)*.

#### 4. Seed the Database
Now, update your local database with the new questions:
```bash
cd quiz-app
# Reset and re-seed the SQLite database
node prisma/seed.js
```

Restart your local dev server (`npm run dev`), and your new paper will be loaded and ready for study in the practice portal!

---

## 🛠️ Tech Stack

* **Frontend**: [Next.js (App Router)](https://nextjs.org/) + [React](https://react.dev/)
* **Styles**: [Tailwind CSS v4](https://tailwindcss.com/) & [Framer Motion](https://www.framer.com/motion/) (for premium animations and glassmorphism)
* **Database**: [SQLite](https://www.sqlite.org/) managed via [Prisma ORM](https://www.prisma.io/)
* **AI Explanations**: [Google Gemini Pro API](https://ai.google.dev/) via `@google/generative-ai`
