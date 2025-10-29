# Nexus - Blind AI Model Evaluation System

## Overview

Nexus uses a **blind evaluation system** to ensure unbiased rankings of AI model responses. Students see anonymized model names while the system tracks actual model identities for admin analysis.

## How It Works

### Student Experience (Frontend)

1. **Submit Query**: Student enters a question
2. **Anonymous Responses**: Student sees 3 responses labeled:
   - "Model A"
   - "Model B"
   - "Model C"
3. **Ranking**: Student ranks responses using buttons:
   - **1st Best** (Gold) - Best response
   - **2nd Best** (Silver) - Second best response
   - **3rd Best** (Bronze) - Third best response
4. **No Model Identity**: Students never see which AI (GPT, Claude, Gemini) generated which response

### Backend Data Storage

#### 1. Query Submission
```
queries table:
- id: UUID
- user_id: Student's user ID
- content: "What is machine learning?"
- status: "pending"
```

#### 2. Response Generation
```
responses table:
- id: UUID (e.g., "abc123")
- query_id: Links to query
- model_name: "GPT" ← Actual model name stored!
- content: "Machine learning is..."

- id: UUID (e.g., "def456")
- query_id: Same query
- model_name: "Claude" ← Actual model name stored!
- content: "Machine learning refers to..."

- id: UUID (e.g., "ghi789")
- query_id: Same query
- model_name: "Gemini" ← Actual model name stored!
- content: "ML is a subset of AI..."
```

**Key Point**: Responses are **randomized** before display. Student might see:
- "Model A" → Actually Gemini (id: ghi789)
- "Model B" → Actually GPT (id: abc123)
- "Model C" → Actually Claude (id: def456)

#### 3. Student Rankings
```
ratings table:
- response_id: "ghi789" (Gemini, shown as "Model A")
- user_id: Student ID
- score: 1 (Student ranked this 1st Best)

- response_id: "abc123" (GPT, shown as "Model B")
- user_id: Student ID
- score: 3 (Student ranked this 3rd Best)

- response_id: "def456" (Claude, shown as "Model C")
- user_id: Student ID
- score: 2 (Student ranked this 2nd Best)
```

### Admin View (Backend Analysis)

Admins can run SQL queries to see:

```sql
SELECT
  r.model_name,      -- Actual model: "GPT", "Claude", "Gemini"
  rt.score,          -- Ranking: 1, 2, or 3
  q.content,         -- Original question
  u.email            -- Which student rated it
FROM ratings rt
JOIN responses r ON rt.response_id = r.id
JOIN queries q ON r.query_id = q.id
JOIN auth.users u ON rt.user_id = u.id;
```

**Example Results**:
| model_name | score | question | student_email |
|------------|-------|----------|---------------|
| Gemini | 1 | What is ML? | student@example.com |
| Claude | 2 | What is ML? | student@example.com |
| GPT | 3 | What is ML? | student@example.com |

## Database Schema

### Responses Table
```sql
CREATE TABLE responses (
  id UUID PRIMARY KEY,
  query_id UUID REFERENCES queries(id),
  model_name TEXT NOT NULL,        -- Stores: "GPT", "Claude", "Gemini"
  content TEXT NOT NULL
);
```

### Ratings Table
```sql
CREATE TABLE ratings (
  id UUID PRIMARY KEY,
  response_id UUID REFERENCES responses(id),  -- Links to actual model
  user_id UUID REFERENCES auth.users(id),
  score INTEGER CHECK (score >= 1 AND score <= 3),  -- 1=best, 3=worst
  UNIQUE(response_id, user_id)  -- One ranking per response per user
);
```

## Why This Works

1. ✅ **Students see anonymous labels** → Prevents bias
2. ✅ **Responses randomized** → Can't guess based on position
3. ✅ **Actual model names stored in database** → Admin can analyze
4. ✅ **Rankings saved to database** → Permanent record for research
5. ✅ **One ranking per response** → Ensures complete evaluation

## Setup Required

### Step 1: Update Response Insertion Policy
Run this SQL in Supabase to allow students to trigger AI responses:

```sql
-- See database/UPDATE_RESPONSE_POLICY.sql
```

### Step 2: Admin Queries
Use queries from `database/ADMIN_QUERIES.md` to view rankings:
- Model performance summary
- Student activity
- Recent evaluations
- Average rankings by model

## Benefits

- **Unbiased Evaluation**: Students don't know which AI they're rating
- **Research Data**: Admins can analyze which models perform best
- **Educational**: Students learn to evaluate quality objectively
- **Scalable**: System works for any number of students/queries

## Future Enhancements

- [ ] Actual AI API integration (OpenAI, Anthropic, Google)
- [ ] More models (Llama, Mistral, etc.)
- [ ] Export rankings to CSV
- [ ] Instructor dashboard with visualizations
- [ ] Student feedback text (in addition to rankings)
