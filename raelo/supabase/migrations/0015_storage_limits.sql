-- 0015_storage_limits.sql
-- Server-side upload limits for the buckets created in 0011. The app checks
-- the same limits in the browser, but only these are enforced.

update storage.buckets
set
  file_size_limit = 5 * 1024 * 1024,
  allowed_mime_types = array['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']
where id = 'brand-assets';

-- Designed content: images, video and PDFs (carousels). 50 MB matches the
-- default per-file limit on Supabase's free plan; raise it in the dashboard
-- on paid plans if the team uploads longer videos.
update storage.buckets
set
  file_size_limit = 50 * 1024 * 1024,
  allowed_mime_types = array[
    'image/png', 'image/jpeg', 'image/webp', 'image/gif',
    'video/mp4', 'video/quicktime',
    'application/pdf'
  ]
where id = 'content';
