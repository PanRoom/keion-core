-- Example insert for live_attendance_registrations table
INSERT INTO live_attendance_registrations (
  event_id,
  member_id,
  available_times,
  memo
) VALUES (
  1,
  999,
  '[ ["2025-11-08", "13:00", "15:00"], ["2025-11-09", "10:00", "12:00"] ]'::jsonb,
  'Practice after lunch'
);
