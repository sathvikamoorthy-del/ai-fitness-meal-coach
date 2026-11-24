-- Reference rows for workout plans (REQ-410, WI-073), as stated in the final DB design (db_design_tables.csv).
-- INSERT OR IGNORE makes it safe to run twice. No semicolons in these comments: the runner splits statements on them.
INSERT OR IGNORE INTO "plan_sources" ("code", "label") VALUES
  ('manual', 'Manual'),
  ('ai', 'AI');
