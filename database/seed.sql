-- database/seed.sql
-- PLACEHOLDER DATA for local testing only. Never run this against the live database.

INSERT INTO testimonials (quote, attribution, permission_confirmed, published) VALUES
  ('Placeholder quote one, used only to check the card layout.', 'Test Parent A.', 1, 1),
  ('Placeholder quote two, a little longer so we can see how wrapping looks on a phone screen.', 'Test Parent B.', 1, 1),
  ('Placeholder draft that should NOT appear on the public page.', 'Test Parent C.', 1, 0);