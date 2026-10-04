-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "WorkspaceType" AS ENUM ('PERSONAL', 'BUSINESS');

-- CreateEnum
CREATE TYPE "WorkspaceStatus" AS ENUM ('ACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "WorkspaceRole" AS ENUM ('OWNER', 'ADMIN', 'STAFF', 'VIEWER');

-- CreateEnum
CREATE TYPE "WorkspaceMemberStatus" AS ENUM ('ACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "InvitationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'EXPIRED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "FinancialAccountType" AS ENUM ('CASH', 'BANK', 'DIGITAL_WALLET', 'SAVINGS', 'OTHER');

-- CreateEnum
CREATE TYPE "CategoryType" AS ENUM ('INCOME', 'EXPENSE');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('INCOME', 'EXPENSE');

-- CreateEnum
CREATE TYPE "RecurrenceFrequency" AS ENUM ('DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" VARCHAR(320) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "email_verified" BOOLEAN NOT NULL DEFAULT false,
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "last_login_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "deleted_at" TIMESTAMPTZ(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_profiles" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "first_name" VARCHAR(100) NOT NULL,
    "middle_name" VARCHAR(100),
    "paternal_last_name" VARCHAR(100) NOT NULL,
    "maternal_last_name" VARCHAR(100),
    "document_type" VARCHAR(30),
    "document_number" VARCHAR(50),
    "phone" VARCHAR(30),
    "secondary_phone" VARCHAR(30),
    "birth_date" DATE,
    "country_code" CHAR(2) NOT NULL DEFAULT 'PE',
    "department" VARCHAR(100),
    "province" VARCHAR(100),
    "district" VARCHAR(100),
    "address_line_1" VARCHAR(200),
    "address_line_2" VARCHAR(200),
    "postal_code" VARCHAR(20),
    "timezone" VARCHAR(64) NOT NULL DEFAULT 'America/Lima',
    "preferred_currency" CHAR(3) NOT NULL DEFAULT 'PEN',
    "language" VARCHAR(10) NOT NULL DEFAULT 'es',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "user_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth_sessions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "refresh_token_hash" VARCHAR(255) NOT NULL,
    "expires_at" TIMESTAMPTZ(3) NOT NULL,
    "revoked_at" TIMESTAMPTZ(3),
    "last_used_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "auth_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workspaces" (
    "id" UUID NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "type" "WorkspaceType" NOT NULL,
    "currency_code" CHAR(3) NOT NULL DEFAULT 'PEN',
    "country_code" CHAR(2) NOT NULL DEFAULT 'PE',
    "timezone" VARCHAR(64) NOT NULL DEFAULT 'America/Lima',
    "description" VARCHAR(500),
    "status" "WorkspaceStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "deleted_at" TIMESTAMPTZ(3),

    CONSTRAINT "workspaces_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business_profiles" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "legal_name" VARCHAR(200) NOT NULL,
    "trade_name" VARCHAR(200),
    "tax_id" VARCHAR(50),
    "email" VARCHAR(320),
    "phone" VARCHAR(30),
    "website" VARCHAR(255),
    "country_code" CHAR(2) NOT NULL DEFAULT 'PE',
    "department" VARCHAR(100),
    "province" VARCHAR(100),
    "district" VARCHAR(100),
    "address_line_1" VARCHAR(200),
    "address_line_2" VARCHAR(200),
    "postal_code" VARCHAR(20),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "business_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workspace_members" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "role" "WorkspaceRole" NOT NULL,
    "status" "WorkspaceMemberStatus" NOT NULL DEFAULT 'ACTIVE',
    "joined_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "workspace_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workspace_invitations" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "email" VARCHAR(320) NOT NULL,
    "role" "WorkspaceRole" NOT NULL,
    "token_hash" VARCHAR(255) NOT NULL,
    "status" "InvitationStatus" NOT NULL DEFAULT 'PENDING',
    "expires_at" TIMESTAMPTZ(3) NOT NULL,
    "invited_by_user_id" UUID NOT NULL,
    "accepted_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "workspace_invitations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "financial_accounts" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "type" "FinancialAccountType" NOT NULL,
    "currency_code" CHAR(3) NOT NULL DEFAULT 'PEN',
    "initial_balance" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "description" VARCHAR(500),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "deleted_at" TIMESTAMPTZ(3),

    CONSTRAINT "financial_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "financial_account_accesses" (
    "workspace_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "account_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "financial_account_accesses_pkey" PRIMARY KEY ("workspace_id","user_id","account_id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "type" "CategoryType" NOT NULL,
    "parent_id" UUID,
    "icon" VARCHAR(80),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "deleted_at" TIMESTAMPTZ(3),

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transactions" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "account_id" UUID NOT NULL,
    "category_id" UUID NOT NULL,
    "created_by_user_id" UUID NOT NULL,
    "type" "TransactionType" NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "currency_code" CHAR(3) NOT NULL,
    "transaction_date" DATE NOT NULL,
    "description" VARCHAR(250) NOT NULL,
    "notes" VARCHAR(1000),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "deleted_at" TIMESTAMPTZ(3),

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transfers" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "source_account_id" UUID NOT NULL,
    "destination_account_id" UUID NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "currency_code" CHAR(3) NOT NULL,
    "transaction_date" DATE NOT NULL,
    "description" VARCHAR(250),
    "created_by_user_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "deleted_at" TIMESTAMPTZ(3),

    CONSTRAINT "transfers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "budgets" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "category_id" UUID NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "month" SMALLINT NOT NULL,
    "year" SMALLINT NOT NULL,
    "alert_percentage" DECIMAL(5,2),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "deleted_at" TIMESTAMPTZ(3),

    CONSTRAINT "budgets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recurring_transactions" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "account_id" UUID NOT NULL,
    "category_id" UUID NOT NULL,
    "type" "TransactionType" NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "frequency" "RecurrenceFrequency" NOT NULL,
    "start_date" DATE NOT NULL,
    "next_execution_date" DATE NOT NULL,
    "description" VARCHAR(250) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_by_user_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "recurring_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_status_created_at_idx" ON "users"("status", "created_at");

-- CreateIndex
CREATE INDEX "users_created_at_idx" ON "users"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "user_profiles_user_id_key" ON "user_profiles"("user_id");

-- CreateIndex
CREATE INDEX "user_profiles_created_at_idx" ON "user_profiles"("created_at");

-- CreateIndex
CREATE INDEX "auth_sessions_user_id_revoked_at_expires_at_idx" ON "auth_sessions"("user_id", "revoked_at", "expires_at");

-- CreateIndex
CREATE INDEX "auth_sessions_created_at_idx" ON "auth_sessions"("created_at");

-- CreateIndex
CREATE INDEX "workspaces_status_created_at_idx" ON "workspaces"("status", "created_at");

-- CreateIndex
CREATE INDEX "workspaces_created_at_idx" ON "workspaces"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "business_profiles_workspace_id_key" ON "business_profiles"("workspace_id");

-- CreateIndex
CREATE INDEX "business_profiles_tax_id_idx" ON "business_profiles"("tax_id");

-- CreateIndex
CREATE INDEX "business_profiles_created_at_idx" ON "business_profiles"("created_at");

-- CreateIndex
CREATE INDEX "workspace_members_workspace_id_status_role_idx" ON "workspace_members"("workspace_id", "status", "role");

-- CreateIndex
CREATE INDEX "workspace_members_user_id_status_idx" ON "workspace_members"("user_id", "status");

-- CreateIndex
CREATE INDEX "workspace_members_created_at_idx" ON "workspace_members"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "workspace_members_workspace_id_user_id_key" ON "workspace_members"("workspace_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "workspace_invitations_token_hash_key" ON "workspace_invitations"("token_hash");

-- CreateIndex
CREATE INDEX "workspace_invitations_workspace_id_status_expires_at_idx" ON "workspace_invitations"("workspace_id", "status", "expires_at");

-- CreateIndex
CREATE INDEX "workspace_invitations_email_status_idx" ON "workspace_invitations"("email", "status");

-- CreateIndex
CREATE INDEX "workspace_invitations_invited_by_user_id_idx" ON "workspace_invitations"("invited_by_user_id");

-- CreateIndex
CREATE INDEX "workspace_invitations_created_at_idx" ON "workspace_invitations"("created_at");

-- CreateIndex
CREATE INDEX "financial_accounts_workspace_id_active_created_at_idx" ON "financial_accounts"("workspace_id", "active", "created_at");

-- CreateIndex
CREATE INDEX "financial_accounts_created_at_idx" ON "financial_accounts"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "financial_accounts_workspace_id_id_key" ON "financial_accounts"("workspace_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "financial_accounts_workspace_id_id_currency_code_key" ON "financial_accounts"("workspace_id", "id", "currency_code");

-- CreateIndex
CREATE INDEX "financial_account_accesses_account_id_idx" ON "financial_account_accesses"("account_id");

-- CreateIndex
CREATE INDEX "financial_account_accesses_user_id_idx" ON "financial_account_accesses"("user_id");

-- CreateIndex
CREATE INDEX "financial_account_accesses_created_at_idx" ON "financial_account_accesses"("created_at");

-- CreateIndex
CREATE INDEX "categories_workspace_id_type_active_idx" ON "categories"("workspace_id", "type", "active");

-- CreateIndex
CREATE INDEX "categories_workspace_id_parent_id_idx" ON "categories"("workspace_id", "parent_id");

-- CreateIndex
CREATE INDEX "categories_created_at_idx" ON "categories"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "categories_workspace_id_id_key" ON "categories"("workspace_id", "id");

-- CreateIndex
CREATE INDEX "transactions_workspace_id_transaction_date_created_at_idx" ON "transactions"("workspace_id", "transaction_date" DESC, "created_at" DESC);

-- CreateIndex
CREATE INDEX "transactions_workspace_id_account_id_transaction_date_idx" ON "transactions"("workspace_id", "account_id", "transaction_date" DESC);

-- CreateIndex
CREATE INDEX "transactions_workspace_id_category_id_transaction_date_idx" ON "transactions"("workspace_id", "category_id", "transaction_date" DESC);

-- CreateIndex
CREATE INDEX "transactions_workspace_id_created_by_user_id_transaction_da_idx" ON "transactions"("workspace_id", "created_by_user_id", "transaction_date" DESC);

-- CreateIndex
CREATE INDEX "transactions_account_id_idx" ON "transactions"("account_id");

-- CreateIndex
CREATE INDEX "transactions_category_id_idx" ON "transactions"("category_id");

-- CreateIndex
CREATE INDEX "transactions_created_by_user_id_idx" ON "transactions"("created_by_user_id");

-- CreateIndex
CREATE INDEX "transactions_created_at_idx" ON "transactions"("created_at");

-- CreateIndex
CREATE INDEX "transfers_workspace_id_transaction_date_created_at_idx" ON "transfers"("workspace_id", "transaction_date" DESC, "created_at" DESC);

-- CreateIndex
CREATE INDEX "transfers_workspace_id_source_account_id_transaction_date_idx" ON "transfers"("workspace_id", "source_account_id", "transaction_date" DESC);

-- CreateIndex
CREATE INDEX "transfers_workspace_id_destination_account_id_transaction_d_idx" ON "transfers"("workspace_id", "destination_account_id", "transaction_date" DESC);

-- CreateIndex
CREATE INDEX "transfers_source_account_id_idx" ON "transfers"("source_account_id");

-- CreateIndex
CREATE INDEX "transfers_destination_account_id_idx" ON "transfers"("destination_account_id");

-- CreateIndex
CREATE INDEX "transfers_created_by_user_id_idx" ON "transfers"("created_by_user_id");

-- CreateIndex
CREATE INDEX "transfers_created_at_idx" ON "transfers"("created_at");

-- CreateIndex
CREATE INDEX "budgets_workspace_id_year_month_idx" ON "budgets"("workspace_id", "year", "month");

-- CreateIndex
CREATE INDEX "budgets_workspace_id_category_id_year_month_idx" ON "budgets"("workspace_id", "category_id", "year", "month");

-- CreateIndex
CREATE INDEX "budgets_category_id_idx" ON "budgets"("category_id");

-- CreateIndex
CREATE INDEX "budgets_created_at_idx" ON "budgets"("created_at");

-- CreateIndex
CREATE INDEX "recurring_transactions_workspace_id_active_next_execution_d_idx" ON "recurring_transactions"("workspace_id", "active", "next_execution_date");

-- CreateIndex
CREATE INDEX "recurring_transactions_workspace_id_account_id_idx" ON "recurring_transactions"("workspace_id", "account_id");

-- CreateIndex
CREATE INDEX "recurring_transactions_workspace_id_category_id_idx" ON "recurring_transactions"("workspace_id", "category_id");

-- CreateIndex
CREATE INDEX "recurring_transactions_account_id_idx" ON "recurring_transactions"("account_id");

-- CreateIndex
CREATE INDEX "recurring_transactions_category_id_idx" ON "recurring_transactions"("category_id");

-- CreateIndex
CREATE INDEX "recurring_transactions_created_by_user_id_idx" ON "recurring_transactions"("created_by_user_id");

-- CreateIndex
CREATE INDEX "recurring_transactions_created_at_idx" ON "recurring_transactions"("created_at");

-- AddForeignKey
ALTER TABLE "user_profiles" ADD CONSTRAINT "user_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auth_sessions" ADD CONSTRAINT "auth_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_profiles" ADD CONSTRAINT "business_profiles_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspace_members" ADD CONSTRAINT "workspace_members_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspace_members" ADD CONSTRAINT "workspace_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspace_invitations" ADD CONSTRAINT "workspace_invitations_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspace_invitations" ADD CONSTRAINT "workspace_invitations_workspace_id_invited_by_user_id_fkey" FOREIGN KEY ("workspace_id", "invited_by_user_id") REFERENCES "workspace_members"("workspace_id", "user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_accounts" ADD CONSTRAINT "financial_accounts_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_account_accesses" ADD CONSTRAINT "financial_account_accesses_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_account_accesses" ADD CONSTRAINT "financial_account_accesses_workspace_id_user_id_fkey" FOREIGN KEY ("workspace_id", "user_id") REFERENCES "workspace_members"("workspace_id", "user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_account_accesses" ADD CONSTRAINT "financial_account_accesses_workspace_id_account_id_fkey" FOREIGN KEY ("workspace_id", "account_id") REFERENCES "financial_accounts"("workspace_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_workspace_id_parent_id_fkey" FOREIGN KEY ("workspace_id", "parent_id") REFERENCES "categories"("workspace_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_workspace_id_account_id_currency_code_fkey" FOREIGN KEY ("workspace_id", "account_id", "currency_code") REFERENCES "financial_accounts"("workspace_id", "id", "currency_code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_workspace_id_category_id_fkey" FOREIGN KEY ("workspace_id", "category_id") REFERENCES "categories"("workspace_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_workspace_id_created_by_user_id_fkey" FOREIGN KEY ("workspace_id", "created_by_user_id") REFERENCES "workspace_members"("workspace_id", "user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transfers" ADD CONSTRAINT "transfers_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transfers" ADD CONSTRAINT "transfers_workspace_id_source_account_id_currency_code_fkey" FOREIGN KEY ("workspace_id", "source_account_id", "currency_code") REFERENCES "financial_accounts"("workspace_id", "id", "currency_code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transfers" ADD CONSTRAINT "transfers_workspace_id_destination_account_id_currency_cod_fkey" FOREIGN KEY ("workspace_id", "destination_account_id", "currency_code") REFERENCES "financial_accounts"("workspace_id", "id", "currency_code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transfers" ADD CONSTRAINT "transfers_workspace_id_created_by_user_id_fkey" FOREIGN KEY ("workspace_id", "created_by_user_id") REFERENCES "workspace_members"("workspace_id", "user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "budgets" ADD CONSTRAINT "budgets_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "budgets" ADD CONSTRAINT "budgets_workspace_id_category_id_fkey" FOREIGN KEY ("workspace_id", "category_id") REFERENCES "categories"("workspace_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recurring_transactions" ADD CONSTRAINT "recurring_transactions_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recurring_transactions" ADD CONSTRAINT "recurring_transactions_workspace_id_account_id_fkey" FOREIGN KEY ("workspace_id", "account_id") REFERENCES "financial_accounts"("workspace_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recurring_transactions" ADD CONSTRAINT "recurring_transactions_workspace_id_category_id_fkey" FOREIGN KEY ("workspace_id", "category_id") REFERENCES "categories"("workspace_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recurring_transactions" ADD CONSTRAINT "recurring_transactions_workspace_id_created_by_user_id_fkey" FOREIGN KEY ("workspace_id", "created_by_user_id") REFERENCES "workspace_members"("workspace_id", "user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Domain integrity constraints not representable in Prisma Schema Language.
ALTER TABLE "users"
  ADD CONSTRAINT "users_email_lowercase_check" CHECK ("email" = lower("email"));

ALTER TABLE "workspace_invitations"
  ADD CONSTRAINT "workspace_invitations_email_lowercase_check" CHECK ("email" = lower("email"));

ALTER TABLE "user_profiles"
  ADD CONSTRAINT "user_profiles_country_code_check" CHECK ("country_code" ~ '^[A-Z]{2}$'),
  ADD CONSTRAINT "user_profiles_preferred_currency_check" CHECK ("preferred_currency" ~ '^[A-Z]{3}$');

ALTER TABLE "workspaces"
  ADD CONSTRAINT "workspaces_country_code_check" CHECK ("country_code" ~ '^[A-Z]{2}$'),
  ADD CONSTRAINT "workspaces_currency_code_check" CHECK ("currency_code" ~ '^[A-Z]{3}$');

ALTER TABLE "business_profiles"
  ADD CONSTRAINT "business_profiles_country_code_check" CHECK ("country_code" ~ '^[A-Z]{2}$');

ALTER TABLE "financial_accounts"
  ADD CONSTRAINT "financial_accounts_currency_code_check" CHECK ("currency_code" ~ '^[A-Z]{3}$');

ALTER TABLE "categories"
  ADD CONSTRAINT "categories_not_self_parent_check" CHECK ("parent_id" IS NULL OR "parent_id" <> "id");

ALTER TABLE "transactions"
  ADD CONSTRAINT "transactions_amount_positive_check" CHECK ("amount" > 0),
  ADD CONSTRAINT "transactions_currency_code_check" CHECK ("currency_code" ~ '^[A-Z]{3}$');

ALTER TABLE "transfers"
  ADD CONSTRAINT "transfers_amount_positive_check" CHECK ("amount" > 0),
  ADD CONSTRAINT "transfers_distinct_accounts_check" CHECK ("source_account_id" <> "destination_account_id"),
  ADD CONSTRAINT "transfers_currency_code_check" CHECK ("currency_code" ~ '^[A-Z]{3}$');

ALTER TABLE "budgets"
  ADD CONSTRAINT "budgets_amount_positive_check" CHECK ("amount" > 0),
  ADD CONSTRAINT "budgets_month_check" CHECK ("month" BETWEEN 1 AND 12),
  ADD CONSTRAINT "budgets_alert_percentage_check"
    CHECK ("alert_percentage" IS NULL OR "alert_percentage" BETWEEN 0 AND 100);

ALTER TABLE "recurring_transactions"
  ADD CONSTRAINT "recurring_transactions_amount_positive_check" CHECK ("amount" > 0),
  ADD CONSTRAINT "recurring_transactions_next_execution_check"
    CHECK ("next_execution_date" >= "start_date");

-- PostgreSQL treats NULL values as distinct in ordinary unique constraints. A partial
-- unique index expresses the requested uniqueness only for non-deleted budgets.
CREATE UNIQUE INDEX "budgets_active_workspace_category_month_year_key"
  ON "budgets" ("workspace_id", "category_id", "month", "year")
  WHERE "deleted_at" IS NULL;

