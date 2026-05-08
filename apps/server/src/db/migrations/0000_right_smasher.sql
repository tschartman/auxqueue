CREATE TABLE IF NOT EXISTS "friendships" (
	"user_id" uuid NOT NULL,
	"friend_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "friendships_user_id_friend_id_pk" PRIMARY KEY("user_id","friend_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "guest_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"party_id" uuid NOT NULL,
	"display_name" varchar(50) NOT NULL,
	"avatar" varchar(10) DEFAULT '🎵' NOT NULL,
	"device_fingerprint" varchar(255),
	"session_token" varchar(255),
	"status" varchar(10) DEFAULT 'active' NOT NULL,
	"user_id" uuid,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "parties" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"host_user_id" uuid NOT NULL,
	"room_code" varchar(10) NOT NULL,
	"party_name" varchar(100),
	"streaming_service" varchar(20) NOT NULL,
	"settings" jsonb DEFAULT '{}' NOT NULL,
	"status" varchar(10) DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ended_at" timestamp with time zone,
	CONSTRAINT "parties_room_code_unique" UNIQUE("room_code")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "queue_item_scores" (
	"queue_item_id" uuid PRIMARY KEY NOT NULL,
	"upvotes" integer DEFAULT 0 NOT NULL,
	"downvotes" integer DEFAULT 0 NOT NULL,
	"net_score" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "queue_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"party_id" uuid NOT NULL,
	"track_title" varchar(255) NOT NULL,
	"track_artist" varchar(255) NOT NULL,
	"track_duration" varchar(10),
	"track_uri" varchar(500) NOT NULL,
	"track_album_art" varchar(500),
	"added_by_user" uuid,
	"added_by_guest" uuid,
	"status" varchar(15) DEFAULT 'queued' NOT NULL,
	"position" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "streaming_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"service" varchar(20) NOT NULL,
	"access_token" text NOT NULL,
	"refresh_token" text,
	"token_expires_at" timestamp with time zone,
	"service_user_id" varchar(255),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user_stats" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"total_songs_queued" integer DEFAULT 0 NOT NULL,
	"total_upvotes_received" integer DEFAULT 0 NOT NULL,
	"total_parties_attended" integer DEFAULT 0 NOT NULL,
	"total_songs_played" integer DEFAULT 0 NOT NULL,
	"total_songs_voted_out" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255) NOT NULL,
	"display_name" varchar(50) NOT NULL,
	"avatar" varchar(10) DEFAULT '🎧' NOT NULL,
	"password_hash" varchar(255),
	"oauth_provider" varchar(20),
	"oauth_id" varchar(255),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "votes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"queue_item_id" uuid NOT NULL,
	"voter_user_id" uuid,
	"voter_guest_id" uuid,
	"direction" smallint NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_guest_sessions_party" ON "guest_sessions" ("party_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_guest_sessions_fingerprint" ON "guest_sessions" ("device_fingerprint","party_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_guest_sessions_token" ON "guest_sessions" ("session_token");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_parties_room_code" ON "parties" ("room_code");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_parties_host" ON "parties" ("host_user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_queue_items_party" ON "queue_items" ("party_id","status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_queue_items_added_by_user" ON "queue_items" ("added_by_user");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_queue_items_added_by_guest" ON "queue_items" ("added_by_guest");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "unique_user_service" ON "streaming_accounts" ("user_id","service");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_votes_queue_item" ON "votes" ("queue_item_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "unique_user_vote" ON "votes" ("queue_item_id","voter_user_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "unique_guest_vote" ON "votes" ("queue_item_id","voter_guest_id");--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "friendships" ADD CONSTRAINT "friendships_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "friendships" ADD CONSTRAINT "friendships_friend_id_users_id_fk" FOREIGN KEY ("friend_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "guest_sessions" ADD CONSTRAINT "guest_sessions_party_id_parties_id_fk" FOREIGN KEY ("party_id") REFERENCES "parties"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "guest_sessions" ADD CONSTRAINT "guest_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "parties" ADD CONSTRAINT "parties_host_user_id_users_id_fk" FOREIGN KEY ("host_user_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "queue_item_scores" ADD CONSTRAINT "queue_item_scores_queue_item_id_queue_items_id_fk" FOREIGN KEY ("queue_item_id") REFERENCES "queue_items"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "queue_items" ADD CONSTRAINT "queue_items_party_id_parties_id_fk" FOREIGN KEY ("party_id") REFERENCES "parties"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "queue_items" ADD CONSTRAINT "queue_items_added_by_user_users_id_fk" FOREIGN KEY ("added_by_user") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "queue_items" ADD CONSTRAINT "queue_items_added_by_guest_guest_sessions_id_fk" FOREIGN KEY ("added_by_guest") REFERENCES "guest_sessions"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "streaming_accounts" ADD CONSTRAINT "streaming_accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "user_stats" ADD CONSTRAINT "user_stats_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "votes" ADD CONSTRAINT "votes_queue_item_id_queue_items_id_fk" FOREIGN KEY ("queue_item_id") REFERENCES "queue_items"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "votes" ADD CONSTRAINT "votes_voter_user_id_users_id_fk" FOREIGN KEY ("voter_user_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "votes" ADD CONSTRAINT "votes_voter_guest_id_guest_sessions_id_fk" FOREIGN KEY ("voter_guest_id") REFERENCES "guest_sessions"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
