# Admin Queries - View Student Rankings

These SQL queries can be run by admins to analyze student rankings and model performance.

## View All Rankings with Actual Model Names

```sql
-- See what students ranked which models
SELECT
  q.content as question,
  u.email as student_email,
  r.model_name as actual_model,
  rt.score as ranking,
  CASE
    WHEN rt.score = 1 THEN '1st Best'
    WHEN rt.score = 2 THEN '2nd Best'
    WHEN rt.score = 3 THEN '3rd Best'
    ELSE 'Not ranked'
  END as rank_label,
  rt.created_at as rated_at
FROM ratings rt
JOIN responses r ON rt.response_id = r.id
JOIN queries q ON r.query_id = q.id
JOIN auth.users u ON rt.user_id = u.id
ORDER BY rt.created_at DESC;
```

## Model Performance Summary

```sql
-- Count how many times each model got each ranking
SELECT
  r.model_name,
  rt.score as ranking,
  COUNT(*) as times_ranked,
  CASE
    WHEN rt.score = 1 THEN '1st Best'
    WHEN rt.score = 2 THEN '2nd Best'
    WHEN rt.score = 3 THEN '3rd Best'
  END as rank_label
FROM ratings rt
JOIN responses r ON rt.response_id = r.id
GROUP BY r.model_name, rt.score
ORDER BY r.model_name, rt.score;
```

## Average Ranking by Model

```sql
-- Lower score = better (1 is best, 3 is worst)
SELECT
  r.model_name,
  AVG(rt.score) as average_ranking,
  COUNT(*) as total_ratings
FROM ratings rt
JOIN responses r ON rt.response_id = r.id
GROUP BY r.model_name
ORDER BY average_ranking ASC;
```

## Student Activity

```sql
-- See how many queries each student has submitted and rated
SELECT
  u.email,
  COUNT(DISTINCT q.id) as queries_submitted,
  COUNT(DISTINCT rt.id) as responses_rated
FROM auth.users u
LEFT JOIN queries q ON u.id = q.user_id
LEFT JOIN ratings rt ON u.id = rt.user_id
GROUP BY u.email
ORDER BY queries_submitted DESC;
```

## Recent Student Evaluations

```sql
-- See the most recent evaluations with full details
SELECT
  u.email as student,
  q.content as question,
  q.created_at as asked_at,
  r.model_name as actual_model,
  SUBSTRING(r.content, 1, 100) || '...' as response_preview,
  rt.score as ranking,
  rt.created_at as rated_at
FROM ratings rt
JOIN responses r ON rt.response_id = r.id
JOIN queries q ON r.query_id = q.id
JOIN auth.users u ON rt.user_id = u.id
ORDER BY rt.created_at DESC
LIMIT 50;
```

## Notes

- Students see "Model A", "Model B", "Model C" but these are randomized for each query
- The `responses` table stores the actual model name (GPT, Claude, Gemini)
- The `ratings` table links student rankings to the actual responses
- `score` field: 1 = 1st Best, 2 = 2nd Best, 3 = 3rd Best
- This ensures blind evaluation while maintaining data for analysis
