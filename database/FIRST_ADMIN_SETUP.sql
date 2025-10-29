-- =====================================================
-- OPTIONAL: Make the first user automatically an admin
-- =====================================================
-- Run this SQL in Supabase SQL Editor if you want the
-- very first user who signs up to become an admin automatically

-- First, drop the existing trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Create updated function that makes first user admin
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  user_count INTEGER;
  user_role TEXT;
BEGIN
  -- Count existing profiles
  SELECT COUNT(*) INTO user_count FROM public.profiles;

  -- If this is the first user, make them admin
  IF user_count = 0 THEN
    user_role := 'admin';
  ELSE
    user_role := 'student';
  END IF;

  -- Insert profile with appropriate role
  INSERT INTO public.profiles (id, email, role)
  VALUES (NEW.id, NEW.email, user_role);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Done! Now the first user to sign up will automatically be an admin
