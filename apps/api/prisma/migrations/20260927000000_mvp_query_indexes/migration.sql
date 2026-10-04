-- Reports and dashboard filter transactions by workspace, type, and business date.
CREATE INDEX "transactions_workspace_id_type_transaction_date_idx"
  ON "transactions" ("workspace_id", "type", "transaction_date" DESC);

-- Prevent concurrent duplicate pending invitations while preserving invitation history.
CREATE UNIQUE INDEX "workspace_invitations_pending_workspace_email_key"
  ON "workspace_invitations" ("workspace_id", "email")
  WHERE "status" = 'PENDING';
