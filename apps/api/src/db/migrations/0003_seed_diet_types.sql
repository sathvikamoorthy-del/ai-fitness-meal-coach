-- Reference rows for the diet preference (REQ-407, WI-071), as stated in the final DB design (db_design_tables.csv).
-- INSERT OR IGNORE: safe on a database where the rows already exist.
INSERT OR IGNORE INTO "diet_types" ("code", "label") VALUES
  ('vegetarian', 'Vegetarian'),
  ('non_vegetarian', 'Non-vegetarian');
