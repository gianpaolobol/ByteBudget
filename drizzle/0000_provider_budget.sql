CREATE TABLE `provider_budget` (
	`scope` text PRIMARY KEY NOT NULL,
	`searches` integer DEFAULT 0 NOT NULL,
	CONSTRAINT "provider_budget_searches_check" CHECK("provider_budget"."searches" >= 0 AND "provider_budget"."searches" <= 500)
);
