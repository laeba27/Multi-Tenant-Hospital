-- =========================================================
-- Invoice purpose ("Payment for")
--
-- An invoice recorded amounts but never WHAT they were for: the only free
-- text was `notes`, which is optional and reads as an afterthought. A patient
-- holding a printout -- or an auditor reading the ledger -- could not tell a
-- consultation from a root canal.
--
-- `description` is the one-line purpose printed prominently on the invoice.
-- Nullable so existing rows stay valid; the app requires it for new invoices.
-- =========================================================

alter table public.invoices
  add column if not exists description text;
