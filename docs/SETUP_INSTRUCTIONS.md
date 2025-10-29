# Setup Instructions for Ranking System

## Important: Database Update Required

Before testing the ranking system, you MUST run this SQL update in Supabase:

### Step 1: Open Supabase SQL Editor
1. Go to your Supabase project dashboard
2. Click on "SQL Editor" in the left sidebar
3. Click "New query"

### Step 2: Run Response Policy Update
Copy and paste the contents of `database/UPDATE_RESPONSE_POLICY.sql` and click "Run"

This allows students to generate AI responses when they submit queries.

### Step 3: Test the System
1. Open http://localhost:5174
2. Login as a student
3. Submit a question
4. Wait for 3 anonymous responses (Model A, B, C)
5. Rank them using the buttons (1st Best, 2nd Best, 3rd Best)
6. Check browser console for confirmation: "Saved ranking: Response [id] ranked as #[rank]"

### Step 4: Verify Database Storage (As Admin)
1. In Supabase, go to "Table Editor"
2. Check `responses` table - should show 3 responses with actual model names (GPT, Claude, Gemini)
3. Check `ratings` table - should show your rankings with response_id and score (1, 2, or 3)

### Step 5: View Rankings
Run queries from `database/ADMIN_QUERIES.md` to see:
- Which student ranked which model
- Model performance statistics
- Average rankings per model

## What Changed

### Visual Updates
- ✅ 2nd Best button now has slate color (silver-like)
- ✅ Cards show colored borders when ranked (gold, silver, bronze)
- ✅ Models show as "Model A", "Model B", "Model C" (anonymous)
- ✅ Ranking buttons instead of star ratings

### Database Integration
- ✅ Responses saved to `responses` table with actual model names
- ✅ Rankings saved to `ratings` table when buttons clicked
- ✅ Rankings can be deleted by clicking same button again
- ✅ Prevents duplicate rankings (can't assign same rank twice)

## Troubleshooting

**Error: "Failed to generate responses"**
- Make sure you ran `UPDATE_RESPONSE_POLICY.sql`
- Check Supabase logs for RLS policy errors

**Error: "Failed to save rating"**
- Check that `ratings` table exists
- Verify RLS policies allow student inserts

**Responses not appearing**
- Check browser console for errors
- Verify query was created in `queries` table
- Check network tab for API calls

## Next Steps

After testing, you can:
1. Review admin queries in `ADMIN_QUERIES.md`
2. Read full system explanation in `BLIND_EVALUATION_SYSTEM.md`
3. Customize AI models in Admin panel
4. Add actual AI API integrations
