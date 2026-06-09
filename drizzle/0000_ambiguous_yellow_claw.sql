CREATE TYPE "public"."notification_type" AS ENUM('price_drop', 'new_match');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('user', 'admin');--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"type" "notification_type" NOT NULL,
	"title" varchar(200) NOT NULL,
	"body" text,
	"listingId" varchar(64),
	"vin" varchar(17),
	"savedSearchId" integer,
	"data" jsonb,
	"readAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "price_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"listingId" varchar(64) NOT NULL,
	"vin" varchar(17),
	"price" integer NOT NULL,
	"recordedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "saved_searches" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"name" varchar(160),
	"criteria" jsonb NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"lastCheckedAt" timestamp,
	"lastSeenListingIds" jsonb,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "saved_vehicles" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"vin" varchar(17) NOT NULL,
	"listingId" varchar(64),
	"make" varchar(64),
	"model" varchar(128),
	"modelYear" varchar(8),
	"mileage" integer,
	"score" integer,
	"grade" varchar(4),
	"priceAtSave" integer,
	"lastKnownPrice" integer,
	"nickname" varchar(128),
	"notes" text,
	"vehicleData" jsonb,
	"scoreData" jsonb,
	"isSaved" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "search_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"vin" varchar(17) NOT NULL,
	"make" varchar(64),
	"model" varchar(128),
	"modelYear" varchar(8),
	"mileage" integer,
	"score" integer,
	"grade" varchar(4),
	"vehicleData" jsonb,
	"scoreData" jsonb,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "seller_inquiries" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"vin" varchar(17),
	"listingId" varchar(64),
	"sellerType" varchar(32),
	"templateKind" varchar(64),
	"message" text,
	"status" varchar(24) DEFAULT 'drafted' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"openId" varchar(64) NOT NULL,
	"name" text,
	"email" varchar(320),
	"loginMethod" varchar(64),
	"role" "user_role" DEFAULT 'user' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"lastSignedIn" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_openId_unique" UNIQUE("openId")
);
