import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1770000000000 implements MigrationInterface {
  name = 'InitialSchema1770000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto";`);

    // ---------------------------------------------------------------------
    // gyms
    // ---------------------------------------------------------------------
    await queryRunner.query(`
      CREATE TABLE "gyms" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "name" character varying(120) NOT NULL,
        "slug" character varying(120) NOT NULL,
        "description" character varying(500),
        "address" character varying(255),
        "city" character varying(120),
        "phone" character varying(50),
        "email" character varying(120),
        "logo_url" character varying(500),
        "max_capacity" integer NOT NULL DEFAULT '100',
        "currency" character varying(3) NOT NULL DEFAULT 'usd',
        "is_active" boolean NOT NULL DEFAULT true,
        "services" jsonb,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMPTZ,
        CONSTRAINT "PK_gyms_id" PRIMARY KEY ("id")
      );
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_gyms_name" ON "gyms" ("name") WHERE "deleted_at" IS NULL;`,
    );

    // ---------------------------------------------------------------------
    // users
    // ---------------------------------------------------------------------
    await queryRunner.query(`
      CREATE TABLE "users" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "email" character varying(120) NOT NULL,
        "password" character varying(255) NOT NULL,
        "first_name" character varying(100) NOT NULL,
        "last_name" character varying(100) NOT NULL,
        "phone" character varying(50),
        "birth_date" date,
        "gender" character varying(20),
        "role" character varying(30) NOT NULL DEFAULT 'client',
        "avatar_url" character varying(500),
        "is_super_admin" boolean NOT NULL DEFAULT false,
        "is_active" boolean NOT NULL DEFAULT true,
        "last_login_at" TIMESTAMPTZ,
        "gym_id" uuid,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMPTZ,
        CONSTRAINT "PK_users_id" PRIMARY KEY ("id")
      );
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_users_email" ON "users" ("email") WHERE "deleted_at" IS NULL;`,
    );
    await queryRunner.query(`CREATE INDEX "IDX_users_gym_id" ON "users" ("gym_id");`);
    await queryRunner.query(`CREATE INDEX "IDX_users_role" ON "users" ("role");`);
    await queryRunner.query(
      `ALTER TABLE "users" ADD CONSTRAINT "FK_users_gym" FOREIGN KEY ("gym_id") REFERENCES "gyms"("id") ON DELETE SET NULL;`,
    );

    // ---------------------------------------------------------------------
    // user_profiles
    // ---------------------------------------------------------------------
    await queryRunner.query(`
      CREATE TABLE "user_profiles" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "user_id" uuid NOT NULL,
        "height_cm" numeric(5,2),
        "weight_kg" numeric(5,2),
        "body_fat_pct" numeric(5,2),
        "goal" character varying(30),
        "activity_level" character varying(30),
        "medical_conditions" jsonb,
        "emergency_contact_name" character varying(120),
        "emergency_contact_phone" character varying(50),
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMPTZ,
        CONSTRAINT "PK_user_profiles_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_user_profiles_user_id" UNIQUE ("user_id")
      );
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_user_profiles_user_id" ON "user_profiles" ("user_id");`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_profiles" ADD CONSTRAINT "FK_user_profiles_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;`,
    );

    // ---------------------------------------------------------------------
    // refresh_tokens
    // ---------------------------------------------------------------------
    await queryRunner.query(`
      CREATE TABLE "refresh_tokens" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "user_id" uuid NOT NULL,
        "token_hash" character varying(255) NOT NULL,
        "expires_at" TIMESTAMPTZ NOT NULL,
        "revoked_at" TIMESTAMPTZ,
        "user_agent" character varying(255),
        "ip_address" character varying(45),
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMPTZ,
        CONSTRAINT "PK_refresh_tokens_id" PRIMARY KEY ("id")
      );
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_refresh_tokens_user_id" ON "refresh_tokens" ("user_id");`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_refresh_tokens_token_hash" ON "refresh_tokens" ("token_hash");`,
    );
    await queryRunner.query(
      `ALTER TABLE "refresh_tokens" ADD CONSTRAINT "FK_refresh_tokens_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;`,
    );

    // ---------------------------------------------------------------------
    // membership_types
    // ---------------------------------------------------------------------
    await queryRunner.query(`
      CREATE TABLE "membership_types" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "gym_id" uuid NOT NULL,
        "name" character varying(120) NOT NULL,
        "description" character varying(500),
        "duration_days" integer NOT NULL,
        "price" numeric(10,2) NOT NULL,
        "currency" character varying(3) NOT NULL DEFAULT 'usd',
        "features" jsonb,
        "max_classes_per_week" integer,
        "is_active" boolean NOT NULL DEFAULT true,
        "sort_order" integer NOT NULL DEFAULT '0',
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMPTZ,
        CONSTRAINT "PK_membership_types_id" PRIMARY KEY ("id")
      );
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_membership_types_gym_id" ON "membership_types" ("gym_id");`,
    );
    await queryRunner.query(
      `ALTER TABLE "membership_types" ADD CONSTRAINT "FK_membership_types_gym" FOREIGN KEY ("gym_id") REFERENCES "gyms"("id") ON DELETE CASCADE;`,
    );

    // ---------------------------------------------------------------------
    // user_memberships
    // ---------------------------------------------------------------------
    await queryRunner.query(`
      CREATE TABLE "user_memberships" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "gym_id" uuid NOT NULL,
        "user_id" uuid NOT NULL,
        "membership_type_id" uuid NOT NULL,
        "start_date" date NOT NULL,
        "end_date" date NOT NULL,
        "status" character varying(20) NOT NULL DEFAULT 'active',
        "auto_renew" boolean NOT NULL DEFAULT false,
        "price" numeric(10,2),
        "notes" character varying(500),
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMPTZ,
        CONSTRAINT "PK_user_memberships_id" PRIMARY KEY ("id")
      );
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_user_memberships_gym_id" ON "user_memberships" ("gym_id");`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_user_memberships_user_id" ON "user_memberships" ("user_id");`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_user_memberships_status" ON "user_memberships" ("status");`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_memberships" ADD CONSTRAINT "FK_um_gym" FOREIGN KEY ("gym_id") REFERENCES "gyms"("id") ON DELETE CASCADE;`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_memberships" ADD CONSTRAINT "FK_um_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_memberships" ADD CONSTRAINT "FK_um_membership_type" FOREIGN KEY ("membership_type_id") REFERENCES "membership_types"("id") ON DELETE RESTRICT;`,
    );

    // ---------------------------------------------------------------------
    // payments
    // ---------------------------------------------------------------------
    await queryRunner.query(`
      CREATE TABLE "payments" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "gym_id" uuid NOT NULL,
        "user_id" uuid NOT NULL,
        "membership_type_id" uuid,
        "amount" numeric(10,2) NOT NULL,
        "currency" character varying(3) NOT NULL DEFAULT 'usd',
        "status" character varying(20) NOT NULL DEFAULT 'pending',
        "payment_method" character varying(20) NOT NULL DEFAULT 'card',
        "stripe_payment_intent_id" character varying(100),
        "stripe_checkout_session_id" character varying(100),
        "transaction_id" character varying(100),
        "paid_at" TIMESTAMPTZ,
        "metadata" jsonb,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMPTZ,
        CONSTRAINT "PK_payments_id" PRIMARY KEY ("id")
      );
    `);
    await queryRunner.query(`CREATE INDEX "IDX_payments_gym_id" ON "payments" ("gym_id");`);
    await queryRunner.query(`CREATE INDEX "IDX_payments_user_id" ON "payments" ("user_id");`);
    await queryRunner.query(`CREATE INDEX "IDX_payments_status" ON "payments" ("status");`);
    await queryRunner.query(`CREATE INDEX "IDX_payments_paid_at" ON "payments" ("paid_at");`);
    await queryRunner.query(
      `ALTER TABLE "payments" ADD CONSTRAINT "FK_payments_gym" FOREIGN KEY ("gym_id") REFERENCES "gyms"("id") ON DELETE CASCADE;`,
    );
    await queryRunner.query(
      `ALTER TABLE "payments" ADD CONSTRAINT "FK_payments_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT;`,
    );
    await queryRunner.query(
      `ALTER TABLE "payments" ADD CONSTRAINT "FK_payments_membership_type" FOREIGN KEY ("membership_type_id") REFERENCES "membership_types"("id") ON DELETE SET NULL;`,
    );

    // ---------------------------------------------------------------------
    // exercises
    // ---------------------------------------------------------------------
    await queryRunner.query(`
      CREATE TABLE "exercises" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "name" character varying(150) NOT NULL,
        "description" character varying(2000),
        "category" character varying(30) NOT NULL,
        "muscle_group" character varying(60) NOT NULL,
        "equipment_needed" character varying(255),
        "difficulty" integer,
        "instructions" jsonb,
        "video_url" character varying(500),
        "image_url" character varying(500),
        "is_active" boolean NOT NULL DEFAULT true,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMPTZ,
        CONSTRAINT "PK_exercises_id" PRIMARY KEY ("id")
      );
    `);
    await queryRunner.query(`CREATE INDEX "IDX_exercises_category" ON "exercises" ("category");`);
    await queryRunner.query(`CREATE INDEX "IDX_exercises_name" ON "exercises" ("name");`);

    // ---------------------------------------------------------------------
    // routines
    // ---------------------------------------------------------------------
    await queryRunner.query(`
      CREATE TABLE "routines" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "gym_id" uuid NOT NULL,
        "title" character varying(150) NOT NULL,
        "description" character varying(1000),
        "objective" character varying(30) NOT NULL DEFAULT 'general',
        "difficulty" integer,
        "days_per_week" integer NOT NULL DEFAULT '3',
        "duration_weeks" integer,
        "status" character varying(20) NOT NULL DEFAULT 'draft',
        "is_template" boolean NOT NULL DEFAULT false,
        "assignee_id" uuid,
        "created_by_id" uuid NOT NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMPTZ,
        CONSTRAINT "PK_routines_id" PRIMARY KEY ("id")
      );
    `);
    await queryRunner.query(`CREATE INDEX "IDX_routines_gym_id" ON "routines" ("gym_id");`);
    await queryRunner.query(
      `CREATE INDEX "IDX_routines_assignee_id" ON "routines" ("assignee_id");`,
    );
    await queryRunner.query(`CREATE INDEX "IDX_routines_status" ON "routines" ("status");`);
    await queryRunner.query(
      `ALTER TABLE "routines" ADD CONSTRAINT "FK_routines_gym" FOREIGN KEY ("gym_id") REFERENCES "gyms"("id") ON DELETE CASCADE;`,
    );
    await queryRunner.query(
      `ALTER TABLE "routines" ADD CONSTRAINT "FK_routines_assignee" FOREIGN KEY ("assignee_id") REFERENCES "users"("id") ON DELETE SET NULL;`,
    );
    await queryRunner.query(
      `ALTER TABLE "routines" ADD CONSTRAINT "FK_routines_created_by" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT;`,
    );

    // ---------------------------------------------------------------------
    // routine_exercises
    // ---------------------------------------------------------------------
    await queryRunner.query(`
      CREATE TABLE "routine_exercises" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "routine_id" uuid NOT NULL,
        "exercise_id" uuid NOT NULL,
        "day_of_week" integer NOT NULL,
        "order" integer NOT NULL DEFAULT '1',
        "sets" integer NOT NULL,
        "reps" integer NOT NULL,
        "rest_seconds" integer,
        "weight" numeric(6,2),
        "notes" character varying(500),
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMPTZ,
        CONSTRAINT "PK_routine_exercises_id" PRIMARY KEY ("id")
      );
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_routine_exercises_routine_id" ON "routine_exercises" ("routine_id");`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_routine_exercises_exercise_id" ON "routine_exercises" ("exercise_id");`,
    );
    await queryRunner.query(
      `ALTER TABLE "routine_exercises" ADD CONSTRAINT "FK_re_routine" FOREIGN KEY ("routine_id") REFERENCES "routines"("id") ON DELETE CASCADE;`,
    );
    await queryRunner.query(
      `ALTER TABLE "routine_exercises" ADD CONSTRAINT "FK_re_exercise" FOREIGN KEY ("exercise_id") REFERENCES "exercises"("id") ON DELETE RESTRICT;`,
    );

    // ---------------------------------------------------------------------
    // gym_classes
    // ---------------------------------------------------------------------
    await queryRunner.query(`
      CREATE TABLE "gym_classes" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "gym_id" uuid NOT NULL,
        "name" character varying(120) NOT NULL,
        "description" character varying(1000),
        "category" character varying(60),
        "instructor_id" uuid NOT NULL,
        "capacity" integer NOT NULL DEFAULT '20',
        "start_time" TIMESTAMPTZ NOT NULL,
        "end_time" TIMESTAMPTZ NOT NULL,
        "room" character varying(100),
        "color" character varying(9),
        "status" character varying(20) NOT NULL DEFAULT 'scheduled',
        "is_active" boolean NOT NULL DEFAULT true,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMPTZ,
        CONSTRAINT "PK_gym_classes_id" PRIMARY KEY ("id")
      );
    `);
    await queryRunner.query(`CREATE INDEX "IDX_gym_classes_gym_id" ON "gym_classes" ("gym_id");`);
    await queryRunner.query(
      `CREATE INDEX "IDX_gym_classes_instructor_id" ON "gym_classes" ("instructor_id");`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_gym_classes_start_time" ON "gym_classes" ("start_time");`,
    );
    await queryRunner.query(
      `ALTER TABLE "gym_classes" ADD CONSTRAINT "FK_gym_classes_gym" FOREIGN KEY ("gym_id") REFERENCES "gyms"("id") ON DELETE CASCADE;`,
    );
    await queryRunner.query(
      `ALTER TABLE "gym_classes" ADD CONSTRAINT "FK_gym_classes_instructor" FOREIGN KEY ("instructor_id") REFERENCES "users"("id") ON DELETE RESTRICT;`,
    );

    // ---------------------------------------------------------------------
    // class_bookings
    // ---------------------------------------------------------------------
    await queryRunner.query(`
      CREATE TABLE "class_bookings" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "gym_id" uuid NOT NULL,
        "class_id" uuid NOT NULL,
        "user_id" uuid NOT NULL,
        "status" character varying(20) NOT NULL DEFAULT 'confirmed',
        "booked_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "attended" boolean NOT NULL DEFAULT false,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMPTZ,
        CONSTRAINT "PK_class_bookings_id" PRIMARY KEY ("id")
      );
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_class_bookings_gym_id" ON "class_bookings" ("gym_id");`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_class_bookings_class_id" ON "class_bookings" ("class_id");`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_class_bookings_user_id" ON "class_bookings" ("user_id");`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_class_bookings_class_user" ON "class_bookings" ("class_id","user_id") WHERE "deleted_at" IS NULL;`,
    );
    await queryRunner.query(
      `ALTER TABLE "class_bookings" ADD CONSTRAINT "FK_cb_gym" FOREIGN KEY ("gym_id") REFERENCES "gyms"("id") ON DELETE CASCADE;`,
    );
    await queryRunner.query(
      `ALTER TABLE "class_bookings" ADD CONSTRAINT "FK_cb_class" FOREIGN KEY ("class_id") REFERENCES "gym_classes"("id") ON DELETE CASCADE;`,
    );
    await queryRunner.query(
      `ALTER TABLE "class_bookings" ADD CONSTRAINT "FK_cb_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;`,
    );

    // ---------------------------------------------------------------------
    // attendance_records
    // ---------------------------------------------------------------------
    await queryRunner.query(`
      CREATE TABLE "attendance_records" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "gym_id" uuid NOT NULL,
        "user_id" uuid NOT NULL,
        "type" character varying(20) NOT NULL,
        "class_id" uuid,
        "method" character varying(20) NOT NULL DEFAULT 'member_card',
        "timestamp" TIMESTAMPTZ NOT NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMPTZ,
        CONSTRAINT "PK_attendance_records_id" PRIMARY KEY ("id")
      );
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_attendance_gym_id" ON "attendance_records" ("gym_id");`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_attendance_user_id" ON "attendance_records" ("user_id");`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_attendance_timestamp" ON "attendance_records" ("timestamp");`,
    );
    await queryRunner.query(
      `ALTER TABLE "attendance_records" ADD CONSTRAINT "FK_att_gym" FOREIGN KEY ("gym_id") REFERENCES "gyms"("id") ON DELETE CASCADE;`,
    );
    await queryRunner.query(
      `ALTER TABLE "attendance_records" ADD CONSTRAINT "FK_att_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;`,
    );
    await queryRunner.query(
      `ALTER TABLE "attendance_records" ADD CONSTRAINT "FK_att_class" FOREIGN KEY ("class_id") REFERENCES "gym_classes"("id") ON DELETE SET NULL;`,
    );

    // ---------------------------------------------------------------------
    // inventory_items
    // ---------------------------------------------------------------------
    await queryRunner.query(`
      CREATE TABLE "inventory_items" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "gym_id" uuid NOT NULL,
        "name" character varying(150) NOT NULL,
        "description" character varying(1000),
        "category" character varying(30) NOT NULL,
        "quantity" integer NOT NULL,
        "available_quantity" integer NOT NULL DEFAULT '0',
        "condition" character varying(20) NOT NULL DEFAULT 'good',
        "status" character varying(30) NOT NULL DEFAULT 'available',
        "replacement_cost" numeric(12,2),
        "purchased_at" date,
        "supplier" character varying(150),
        "location" character varying(100),
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMPTZ,
        CONSTRAINT "PK_inventory_items_id" PRIMARY KEY ("id")
      );
    `);
    await queryRunner.query(`CREATE INDEX "IDX_inventory_gym_id" ON "inventory_items" ("gym_id");`);
    await queryRunner.query(
      `CREATE INDEX "IDX_inventory_category" ON "inventory_items" ("category");`,
    );
    await queryRunner.query(`CREATE INDEX "IDX_inventory_status" ON "inventory_items" ("status");`);
    await queryRunner.query(
      `ALTER TABLE "inventory_items" ADD CONSTRAINT "FK_inventory_gym" FOREIGN KEY ("gym_id") REFERENCES "gyms"("id") ON DELETE CASCADE;`,
    );

    // ---------------------------------------------------------------------
    // inventory_maintenances
    // ---------------------------------------------------------------------
    await queryRunner.query(`
      CREATE TABLE "inventory_maintenances" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "item_id" uuid NOT NULL,
        "description" character varying(1000) NOT NULL,
        "scheduled_at" date NOT NULL,
        "completed_at" date,
        "cost" numeric(10,2),
        "technician" character varying(150),
        "status" character varying(20) NOT NULL DEFAULT 'scheduled',
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMPTZ,
        CONSTRAINT "PK_inventory_maintenances_id" PRIMARY KEY ("id")
      );
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_maintenance_item_id" ON "inventory_maintenances" ("item_id");`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_maintenance_status" ON "inventory_maintenances" ("status");`,
    );
    await queryRunner.query(
      `ALTER TABLE "inventory_maintenances" ADD CONSTRAINT "FK_maintenance_item" FOREIGN KEY ("item_id") REFERENCES "inventory_items"("id") ON DELETE CASCADE;`,
    );

    // ---------------------------------------------------------------------
    // foods
    // ---------------------------------------------------------------------
    await queryRunner.query(`
      CREATE TABLE "foods" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "name" character varying(150) NOT NULL,
        "category" character varying(30) NOT NULL,
        "serving_size_g" numeric(7,1) NOT NULL,
        "calories" numeric(7,1) NOT NULL,
        "protein" numeric(7,1) NOT NULL,
        "carbs" numeric(7,1) NOT NULL,
        "fats" numeric(7,1) NOT NULL,
        "fiber" numeric(7,1),
        "sugar" numeric(7,1),
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMPTZ,
        CONSTRAINT "PK_foods_id" PRIMARY KEY ("id")
      );
    `);
    await queryRunner.query(`CREATE INDEX "IDX_foods_name" ON "foods" ("name");`);
    await queryRunner.query(`CREATE INDEX "IDX_foods_category" ON "foods" ("category");`);

    // ---------------------------------------------------------------------
    // nutrition_logs
    // ---------------------------------------------------------------------
    await queryRunner.query(`
      CREATE TABLE "nutrition_logs" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "gym_id" uuid NOT NULL,
        "user_id" uuid NOT NULL,
        "food_id" uuid NOT NULL,
        "meal_type" character varying(30) NOT NULL,
        "quantity_g" numeric(8,1) NOT NULL,
        "eaten_at" TIMESTAMPTZ NOT NULL,
        "calculated_calories" numeric(8,1),
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMPTZ,
        CONSTRAINT "PK_nutrition_logs_id" PRIMARY KEY ("id")
      );
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_nutrition_logs_gym_id" ON "nutrition_logs" ("gym_id");`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_nutrition_logs_user_id" ON "nutrition_logs" ("user_id");`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_nutrition_logs_eaten_at" ON "nutrition_logs" ("eaten_at");`,
    );
    await queryRunner.query(
      `ALTER TABLE "nutrition_logs" ADD CONSTRAINT "FK_nl_gym" FOREIGN KEY ("gym_id") REFERENCES "gyms"("id") ON DELETE CASCADE;`,
    );
    await queryRunner.query(
      `ALTER TABLE "nutrition_logs" ADD CONSTRAINT "FK_nl_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;`,
    );
    await queryRunner.query(
      `ALTER TABLE "nutrition_logs" ADD CONSTRAINT "FK_nl_food" FOREIGN KEY ("food_id") REFERENCES "foods"("id") ON DELETE RESTRICT;`,
    );

    // ---------------------------------------------------------------------
    // notifications
    // ---------------------------------------------------------------------
    await queryRunner.query(`
      CREATE TABLE "notifications" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "user_id" uuid NOT NULL,
        "gym_id" uuid,
        "type" character varying(30) NOT NULL DEFAULT 'info',
        "channel" character varying(20) NOT NULL DEFAULT 'in_app',
        "title" character varying(200) NOT NULL,
        "body" character varying(2000),
        "data" jsonb,
        "sender_id" uuid,
        "is_read" boolean NOT NULL DEFAULT false,
        "read_at" TIMESTAMPTZ,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMPTZ,
        CONSTRAINT "PK_notifications_id" PRIMARY KEY ("id")
      );
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_notifications_user_id" ON "notifications" ("user_id");`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_notifications_gym_id" ON "notifications" ("gym_id");`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_notifications_read" ON "notifications" ("is_read");`,
    );
    await queryRunner.query(
      `ALTER TABLE "notifications" ADD CONSTRAINT "FK_notifications_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;`,
    );

    // ---------------------------------------------------------------------
    // campaigns
    // ---------------------------------------------------------------------
    await queryRunner.query(`
      CREATE TABLE "campaigns" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "gym_id" uuid NOT NULL,
        "created_by_id" uuid NOT NULL,
        "name" character varying(150) NOT NULL,
        "subject" character varying(200),
        "content" character varying(5000),
        "type" character varying(20) NOT NULL,
        "audience" jsonb,
        "status" character varying(20) NOT NULL DEFAULT 'draft',
        "scheduled_at" TIMESTAMPTZ,
        "sent_at" TIMESTAMPTZ,
        "stats" jsonb,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMPTZ,
        CONSTRAINT "PK_campaigns_id" PRIMARY KEY ("id")
      );
    `);
    await queryRunner.query(`CREATE INDEX "IDX_campaigns_gym_id" ON "campaigns" ("gym_id");`);
    await queryRunner.query(`CREATE INDEX "IDX_campaigns_status" ON "campaigns" ("status");`);
    await queryRunner.query(
      `ALTER TABLE "campaigns" ADD CONSTRAINT "FK_campaigns_gym" FOREIGN KEY ("gym_id") REFERENCES "gyms"("id") ON DELETE CASCADE;`,
    );
    await queryRunner.query(
      `ALTER TABLE "campaigns" ADD CONSTRAINT "FK_campaigns_created_by" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT;`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "campaigns";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "notifications";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "nutrition_logs";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "foods";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "inventory_maintenances";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "inventory_items";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "attendance_records";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "class_bookings";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "gym_classes";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "routine_exercises";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "routines";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "exercises";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "payments";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "user_memberships";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "membership_types";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "refresh_tokens";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "user_profiles";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "users";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "gyms";`);
  }
}
