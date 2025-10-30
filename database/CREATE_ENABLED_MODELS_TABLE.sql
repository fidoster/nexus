-- Create table to store which AI models are enabled
CREATE TABLE IF NOT EXISTS enabled_models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_name TEXT UNIQUE NOT NULL,
  is_enabled BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Insert default enabled models (GPT, Claude, Gemini as originally planned)
INSERT INTO enabled_models (model_name, is_enabled, display_order) VALUES
  ('GPT', true, 1),
  ('Claude', true, 2),
  ('Gemini', true, 3),
  ('DeepSeek', false, 4),
  ('Mistral', false, 5),
  ('Groq', false, 6),
  ('Perplexity', false, 7)
ON CONFLICT (model_name) DO NOTHING;

-- Create RLS policies
ALTER TABLE enabled_models ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to view enabled models
CREATE POLICY "Anyone can view enabled models"
  ON enabled_models FOR SELECT
  TO authenticated
  USING (true);

-- Only admins can modify enabled models
CREATE POLICY "Admins can update enabled models"
  ON enabled_models FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Create function to update timestamp
CREATE OR REPLACE FUNCTION update_enabled_models_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update updated_at
CREATE TRIGGER update_enabled_models_timestamp
  BEFORE UPDATE ON enabled_models
  FOR EACH ROW
  EXECUTE FUNCTION update_enabled_models_updated_at();

-- Add comment
COMMENT ON TABLE enabled_models IS 'Stores which AI models are enabled for evaluation. Admin can enable/disable models from Admin Panel.';
