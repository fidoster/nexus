# Supabase Setup Guide for Nexus

This guide will help you set up your Supabase database for the Nexus LLM evaluation platform.

## Step 1: Create Supabase Project

1. Go to [https://supabase.com](https://supabase.com)
2. Sign up or log in
3. Click "New Project"
4. Fill in project details and wait for setup to complete

## Step 2: Configure Authentication Settings

1. In your Supabase dashboard, go to **Authentication** → **Providers**
2. Click on **Email**
3. **IMPORTANT**: For testing, you can disable email confirmation:
   - Toggle OFF "Confirm email"
   - This allows users to sign up without email verification
4. For production, keep email confirmation ON and configure your email provider

## Step 3: Create Database Tables

Go to **SQL Editor** in your Supabase dashboard and run the following SQL commands:

### Create Profiles Table

```sql
-- Create profiles table for user roles
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'instructor', 'admin')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can update any profile"
  ON profiles FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Create trigger to auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role)
  VALUES (NEW.id, NEW.email, 'student');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

### Create Queries Table

```sql
-- Create queries table for student submissions
CREATE TABLE queries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE queries ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own queries"
  ON queries FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own queries"
  ON queries FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins and instructors can view all queries"
  ON queries FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'instructor')
    )
  );
```

### Create Responses Table

```sql
-- Create responses table for AI model responses
CREATE TABLE responses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  query_id UUID REFERENCES queries(id) ON DELETE CASCADE NOT NULL,
  model_name TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE responses ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Anyone can view responses for queries they can see"
  ON responses FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM queries
      WHERE id = responses.query_id
      AND (user_id = auth.uid() OR EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid() AND role IN ('admin', 'instructor')
      ))
    )
  );

CREATE POLICY "Admins and instructors can insert responses"
  ON responses FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'instructor')
    )
  );
```

### Create Ratings Table

```sql
-- Create ratings table for student ratings
CREATE TABLE ratings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  response_id UUID REFERENCES responses(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  score INTEGER NOT NULL CHECK (score >= 1 AND score <= 5),
  feedback TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(response_id, user_id)
);

-- Enable Row Level Security
ALTER TABLE ratings ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own ratings"
  ON ratings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own ratings"
  ON ratings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own ratings"
  ON ratings FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all ratings"
  ON ratings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
```

## Step 4: Create Your First Admin User

After setting up the database:

1. Sign up through your app at `/signup`
2. Go to your Supabase dashboard
3. Navigate to **Table Editor** → **profiles**
4. Find your user record
5. Change the `role` column from `'student'` to `'admin'`
6. Save the changes

Now you can access the admin panel at `/admin`

## Step 5: Get Your Supabase Credentials

1. In your Supabase dashboard, go to **Settings** → **API**
2. Copy the following values:
   - **Project URL** (looks like: `https://xxxxx.supabase.co`)
   - **Anon/Public Key** (a long string starting with `eyJ...`)

3. Create a `.env` file in your project root:
   ```env
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key-here
   ```

## Step 6: Test Your Setup

1. Start your dev server: `npm run dev`
2. Sign up a new user
3. Check Supabase dashboard → **Authentication** → **Users** to see the new user
4. Check **Table Editor** → **profiles** to see the auto-created profile
5. Manually promote one user to admin (change role to 'admin')
6. Login as admin and visit `/admin` to access the admin panel

## Database Schema Overview

```
┌─────────────────┐
│     auth.users  │ (Managed by Supabase)
└────────┬────────┘
         │
         ├──────> profiles (role, email)
         │
         └──────> queries (content, status)
                    │
                    └──────> responses (model_name, content)
                               │
                               └──────> ratings (score, feedback)
```

## Troubleshooting

### Email Confirmation Issues
- If users can't sign up, check **Authentication** → **Email** settings
- Disable "Confirm email" for testing
- For production, configure an email provider (SMTP, SendGrid, etc.)

### Permission Errors
- Make sure Row Level Security policies are created
- Check that the trigger for auto-creating profiles is active
- Verify user roles in the profiles table

### Can't Access Admin Panel
- Make sure your user's role in the `profiles` table is set to `'admin'`
- Check browser console for errors
- Verify the `/admin` route is protected and checking roles correctly

## Security Best Practices

1. **Always use Row Level Security (RLS)** - Already configured in the setup above
2. **Never expose your service_role key** - Only use the anon key in your frontend
3. **Enable email confirmation in production** - Prevents spam signups
4. **Regularly review user roles** - Use the admin panel to manage access
5. **Monitor auth events** - Check Supabase logs for suspicious activity

## Next Steps

After completing this setup:
1. Test user registration and login
2. Create an admin user
3. Build the query submission feature
4. Implement the AI model response generation
5. Create the rating interface

For questions or issues, check the Supabase documentation at [https://supabase.com/docs](https://supabase.com/docs)
