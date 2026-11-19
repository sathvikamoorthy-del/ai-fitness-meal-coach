-- 0001_db_design: the 29 tables of docs/project/db_design.md, written by hand from the design (the KNM generator does not map CHECK, combined or partial UNIQUE, COLLATE NOCASE, combined indexes or the strftime default)
-- Times are ISO-8601 UTC text, dates YYYY-MM-DD text, ids TEXT UUIDs from the app. A UNIQUE also serves as the index of its leading column(s), so no separate index is created for those
-- Statements are split on semicolons by src/db/migrate.ts, so no semicolon may appear inside a statement or a comment

-- Reference tables (seeded with the codes in their descriptions)
CREATE TABLE "goal_types" (
  "code" TEXT PRIMARY KEY,
  "label" TEXT NOT NULL
);

CREATE TABLE "diet_types" (
  "code" TEXT PRIMARY KEY,
  "label" TEXT NOT NULL
);

CREATE TABLE "fitness_levels" (
  "code" TEXT PRIMARY KEY,
  "label" TEXT NOT NULL
);

CREATE TABLE "plan_sources" (
  "code" TEXT PRIMARY KEY,
  "label" TEXT NOT NULL
);

CREATE TABLE "meal_types" (
  "code" TEXT PRIMARY KEY,
  "label" TEXT NOT NULL
);

CREATE TABLE "user_goal_types" (
  "code" TEXT PRIMARY KEY,
  "label" TEXT NOT NULL,
  "unit" TEXT NOT NULL
);

-- Libraries (seeded)
CREATE TABLE "exercises" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT NOT NULL COLLATE NOCASE UNIQUE,
  "created_at" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  "updated_at" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE "foods" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT NOT NULL COLLATE NOCASE UNIQUE,
  "calories" REAL NOT NULL CHECK ("calories" >= 0),
  "protein_g" REAL NOT NULL CHECK ("protein_g" >= 0),
  "carbs_g" REAL NOT NULL CHECK ("carbs_g" >= 0),
  "fat_g" REAL NOT NULL CHECK ("fat_g" >= 0),
  "created_at" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  "updated_at" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

-- Accounts
CREATE TABLE "users" (
  "id" TEXT PRIMARY KEY,
  "email" TEXT NOT NULL COLLATE NOCASE UNIQUE,
  "password_hash" TEXT NOT NULL,
  "created_at" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  "updated_at" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE "sessions" (
  "id" TEXT PRIMARY KEY,
  "user_id" TEXT NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "expires_at" TEXT NOT NULL,
  "created_at" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX "idx_sessions_user_id" ON "sessions" ("user_id");
CREATE INDEX "idx_sessions_expires_at" ON "sessions" ("expires_at");

CREATE TABLE "profiles" (
  "user_id" TEXT PRIMARY KEY REFERENCES "users"("id") ON DELETE CASCADE,
  "age" INTEGER CHECK ("age" > 0),
  "sex" TEXT CHECK ("sex" IN ('male', 'female')),
  "height_cm" REAL CHECK ("height_cm" > 0),
  "weight_kg" REAL CHECK ("weight_kg" > 0),
  "goal_type" TEXT REFERENCES "goal_types"("code"),
  "fitness_level" TEXT REFERENCES "fitness_levels"("code"),
  "diet_type" TEXT REFERENCES "diet_types"("code"),
  "daily_calorie_target" REAL CHECK ("daily_calorie_target" > 0),
  "daily_water_target_ml" INTEGER NOT NULL DEFAULT 2000 CHECK ("daily_water_target_ml" > 0),
  "created_at" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  "updated_at" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE "user_allergies" (
  "id" TEXT PRIMARY KEY,
  "user_id" TEXT NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "name" TEXT NOT NULL,
  "created_at" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  UNIQUE ("user_id", "name")
);

CREATE TABLE "user_goals" (
  "id" TEXT PRIMARY KEY,
  "user_id" TEXT NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "goal_type" TEXT NOT NULL REFERENCES "user_goal_types"("code"),
  "target_value" REAL NOT NULL CHECK ("target_value" > 0),
  "created_at" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  "updated_at" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  UNIQUE ("user_id", "goal_type")
);

-- Workouts
CREATE TABLE "workout_plans" (
  "id" TEXT PRIMARY KEY,
  "user_id" TEXT NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "source" TEXT NOT NULL REFERENCES "plan_sources"("code"),
  "is_active" INTEGER NOT NULL DEFAULT 0 CHECK ("is_active" IN (0, 1)),
  "created_at" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  "updated_at" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX "idx_workout_plans_user_id" ON "workout_plans" ("user_id");
CREATE UNIQUE INDEX "uq_workout_plans_one_active" ON "workout_plans" ("user_id") WHERE "is_active" = 1;

CREATE TABLE "workout_plan_days" (
  "id" TEXT PRIMARY KEY,
  "workout_plan_id" TEXT NOT NULL REFERENCES "workout_plans"("id") ON DELETE CASCADE,
  "day_number" INTEGER NOT NULL CHECK ("day_number" >= 1),
  UNIQUE ("workout_plan_id", "day_number")
);

CREATE TABLE "workout_plan_exercises" (
  "id" TEXT PRIMARY KEY,
  "workout_plan_day_id" TEXT NOT NULL REFERENCES "workout_plan_days"("id") ON DELETE CASCADE,
  "exercise_id" TEXT NOT NULL REFERENCES "exercises"("id") ON DELETE RESTRICT,
  "position" INTEGER NOT NULL CHECK ("position" >= 1),
  "sets" INTEGER NOT NULL CHECK ("sets" > 0),
  "reps" INTEGER NOT NULL CHECK ("reps" > 0)
);
CREATE INDEX "idx_workout_plan_exercises_workout_plan_day_id" ON "workout_plan_exercises" ("workout_plan_day_id");
CREATE INDEX "idx_workout_plan_exercises_exercise_id" ON "workout_plan_exercises" ("exercise_id");

CREATE TABLE "workout_sessions" (
  "id" TEXT PRIMARY KEY,
  "user_id" TEXT NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "session_date" TEXT NOT NULL CHECK (date("session_date") IS "session_date"),
  "created_at" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  "updated_at" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX "idx_workout_sessions_user_id_session_date" ON "workout_sessions" ("user_id", "session_date");

CREATE TABLE "workout_session_exercises" (
  "id" TEXT PRIMARY KEY,
  "workout_session_id" TEXT NOT NULL REFERENCES "workout_sessions"("id") ON DELETE CASCADE,
  "exercise_id" TEXT NOT NULL REFERENCES "exercises"("id") ON DELETE RESTRICT,
  "position" INTEGER NOT NULL CHECK ("position" >= 1),
  "sets" INTEGER NOT NULL CHECK ("sets" > 0),
  "reps" INTEGER NOT NULL CHECK ("reps" > 0),
  "weight_kg" REAL NOT NULL CHECK ("weight_kg" >= 0)
);
CREATE INDEX "idx_workout_session_exercises_workout_session_id" ON "workout_session_exercises" ("workout_session_id");
CREATE INDEX "idx_workout_session_exercises_exercise_id_weight_kg" ON "workout_session_exercises" ("exercise_id", "weight_kg");

-- Meals
CREATE TABLE "meal_logs" (
  "id" TEXT PRIMARY KEY,
  "user_id" TEXT NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "log_date" TEXT NOT NULL CHECK (date("log_date") IS "log_date"),
  "meal_type" TEXT NOT NULL REFERENCES "meal_types"("code"),
  "created_at" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  "updated_at" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX "idx_meal_logs_user_id_log_date" ON "meal_logs" ("user_id", "log_date");

CREATE TABLE "meal_log_items" (
  "id" TEXT PRIMARY KEY,
  "meal_log_id" TEXT NOT NULL REFERENCES "meal_logs"("id") ON DELETE CASCADE,
  "food_id" TEXT NOT NULL REFERENCES "foods"("id") ON DELETE RESTRICT,
  "amount_g" REAL NOT NULL CHECK ("amount_g" > 0)
);
CREATE INDEX "idx_meal_log_items_meal_log_id" ON "meal_log_items" ("meal_log_id");
CREATE INDEX "idx_meal_log_items_food_id" ON "meal_log_items" ("food_id");

CREATE TABLE "meal_plans" (
  "id" TEXT PRIMARY KEY,
  "user_id" TEXT NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "period" TEXT NOT NULL CHECK ("period" IN ('day', 'week')),
  "created_at" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  "updated_at" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX "idx_meal_plans_user_id" ON "meal_plans" ("user_id");

CREATE TABLE "meal_plan_meals" (
  "id" TEXT PRIMARY KEY,
  "meal_plan_id" TEXT NOT NULL REFERENCES "meal_plans"("id") ON DELETE CASCADE,
  "day_number" INTEGER NOT NULL DEFAULT 1 CHECK ("day_number" >= 1),
  "meal_type" TEXT NOT NULL REFERENCES "meal_types"("code"),
  "name" TEXT NOT NULL,
  "description" TEXT,
  "updated_at" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  UNIQUE ("meal_plan_id", "day_number", "meal_type")
);

CREATE TABLE "meal_plan_ingredients" (
  "id" TEXT PRIMARY KEY,
  "meal_plan_meal_id" TEXT NOT NULL REFERENCES "meal_plan_meals"("id") ON DELETE CASCADE,
  "name" TEXT NOT NULL CHECK ("name" = lower(trim("name"))),
  "quantity_g" REAL CHECK ("quantity_g" > 0),
  "is_ticked" INTEGER NOT NULL DEFAULT 0 CHECK ("is_ticked" IN (0, 1))
);
CREATE INDEX "idx_meal_plan_ingredients_meal_plan_meal_id" ON "meal_plan_ingredients" ("meal_plan_meal_id");

-- Body tracking
CREATE TABLE "weight_logs" (
  "id" TEXT PRIMARY KEY,
  "user_id" TEXT NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "log_date" TEXT NOT NULL CHECK (date("log_date") IS "log_date"),
  "weight_kg" REAL NOT NULL CHECK ("weight_kg" > 0),
  "created_at" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX "idx_weight_logs_user_id_log_date" ON "weight_logs" ("user_id", "log_date");

CREATE TABLE "water_logs" (
  "id" TEXT PRIMARY KEY,
  "user_id" TEXT NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "log_date" TEXT NOT NULL CHECK (date("log_date") IS "log_date"),
  "amount_ml" INTEGER NOT NULL CHECK ("amount_ml" > 0),
  "created_at" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX "idx_water_logs_user_id_log_date" ON "water_logs" ("user_id", "log_date");

CREATE TABLE "body_measurements" (
  "id" TEXT PRIMARY KEY,
  "user_id" TEXT NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "log_date" TEXT NOT NULL CHECK (date("log_date") IS "log_date"),
  "waist_cm" REAL CHECK ("waist_cm" > 0),
  "chest_cm" REAL CHECK ("chest_cm" > 0),
  "hips_cm" REAL CHECK ("hips_cm" > 0),
  "created_at" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  CHECK ("waist_cm" IS NOT NULL OR "chest_cm" IS NOT NULL OR "hips_cm" IS NOT NULL)
);
CREATE INDEX "idx_body_measurements_user_id_log_date" ON "body_measurements" ("user_id", "log_date");

-- Coaching and reports
CREATE TABLE "weekly_reports" (
  "id" TEXT PRIMARY KEY,
  "user_id" TEXT NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "week_start" TEXT NOT NULL CHECK (date("week_start") IS "week_start"),
  "summary" TEXT NOT NULL,
  "created_at" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  UNIQUE ("user_id", "week_start")
);

CREATE TABLE "coach_messages" (
  "id" TEXT PRIMARY KEY,
  "user_id" TEXT NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "role" TEXT NOT NULL CHECK ("role" IN ('user', 'coach')),
  "content" TEXT NOT NULL,
  "created_at" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX "idx_coach_messages_user_id_created_at" ON "coach_messages" ("user_id", "created_at");

CREATE TABLE "checklist_ticks" (
  "id" TEXT PRIMARY KEY,
  "user_id" TEXT NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "item_date" TEXT NOT NULL CHECK (date("item_date") IS "item_date"),
  "workout_plan_day_id" TEXT REFERENCES "workout_plan_days"("id") ON DELETE CASCADE,
  "meal_plan_meal_id" TEXT REFERENCES "meal_plan_meals"("id") ON DELETE CASCADE,
  "created_at" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  CHECK (("workout_plan_day_id" IS NULL) <> ("meal_plan_meal_id" IS NULL))
);
CREATE INDEX "idx_checklist_ticks_user_id_item_date" ON "checklist_ticks" ("user_id", "item_date");
CREATE UNIQUE INDEX "uq_checklist_ticks_workout" ON "checklist_ticks" ("user_id", "item_date", "workout_plan_day_id") WHERE "workout_plan_day_id" IS NOT NULL;
CREATE UNIQUE INDEX "uq_checklist_ticks_meal" ON "checklist_ticks" ("user_id", "item_date", "meal_plan_meal_id") WHERE "meal_plan_meal_id" IS NOT NULL;
