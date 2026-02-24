-- Migration: Platform Settings for Super Admin Branding
-- Description: Creates platform_settings table for storing platform-wide settings like logo, theme, etc.
-- Date: 2024-02-24

-- Create platform_settings table
CREATE TABLE IF NOT EXISTS platform_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  value JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add comment
COMMENT ON TABLE platform_settings IS 'Stores platform-wide settings for super admin configuration';

-- Insert default branding settings
INSERT INTO platform_settings (key, value) VALUES
  ('branding', '{
    "platform_name": "Menu Hub",
    "logo_url": null,
    "icon_72": null,
    "icon_96": null,
    "icon_128": null,
    "icon_144": null,
    "icon_152": null,
    "icon_192": null,
    "icon_384": null,
    "icon_512": null,
    "theme_color": "#6262bd",
    "background_color": "#ffffff"
  }'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- Create storage bucket for platform assets if it doesn't exist
-- Note: Run this in Supabase dashboard or via Supabase CLI:
-- INSERT INTO storage.buckets (id, name, public) VALUES ('platform-assets', 'platform-assets', true);

-- Create RLS policies for platform_settings
ALTER TABLE platform_settings ENABLE ROW LEVEL SECURITY;

-- Only admins can read platform settings
CREATE POLICY "Admins can read platform settings" ON platform_settings
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM admins WHERE user_id = auth.uid()
    )
  );

-- Only admins can update platform settings
CREATE POLICY "Admins can update platform settings" ON platform_settings
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM admins WHERE user_id = auth.uid()
    )
  );

-- Allow public read access for branding (needed for manifest and logo display)
CREATE POLICY "Public can read branding settings" ON platform_settings
  FOR SELECT
  USING (key = 'branding');

-- Verify the migration
SELECT
  'Migration complete!' as status,
  COUNT(*) as settings_count
FROM platform_settings;
