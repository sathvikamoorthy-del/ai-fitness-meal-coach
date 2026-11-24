-- Reference rows for the profile (REQ-406, WI-070), as stated in the final DB design (db_design_tables.csv).
-- INSERT OR IGNORE: safe on a database where the rows already exist.
INSERT OR IGNORE INTO "goal_types" ("code", "label") VALUES
  ('lose', 'Lose weight'),
  ('gain', 'Gain weight'),
  ('maintain', 'Maintain weight');

INSERT OR IGNORE INTO "fitness_levels" ("code", "label") VALUES
  ('beginner', 'Beginner'),
  ('intermediate', 'Intermediate'),
  ('advanced', 'Advanced');
