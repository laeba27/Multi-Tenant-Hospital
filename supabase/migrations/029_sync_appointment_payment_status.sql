-- =========================================================
-- Keep appointments.payment_status honest.
--
-- 028 added payment_status/amount_due to appointments and defaulted every
-- existing row to 'unpaid' with 0 due. That was wrong: invoices already carried
-- the real payment state, so appointments that had been paid in full for months
-- started rendering a red "Unpaid" badge in the reception list.
--
-- The invoice is, and stays, the source of truth for money. The columns on
-- appointments are a denormalised mirror that exists so a *pending request*
-- (which has no invoice yet) can still show an amount due. This migration:
--
--   1. backfills the mirror from existing invoices, and
--   2. adds a trigger so it can never drift again -- invoices.payment_status is
--      itself maintained by a trigger from 011/013, so this chains off that.
-- =========================================================

-- ---------------------------------------------------------
-- 1. Backfill from the invoices that already exist.
--
-- An appointment can in principle have more than one invoice; take the most
-- recent, matching how billing treats the latest invoice as current.
-- ---------------------------------------------------------

with latest_invoice as (
  select distinct on (appointment_id)
    appointment_id,
    total_amount,
    paid_amount,
    due_amount,
    payment_status
  from public.invoices
  where appointment_id is not null
  order by appointment_id, created_at desc
)
update public.appointments a
set
  payment_status = li.payment_status,
  -- amount_due mirrors what the invoice says is still outstanding, but a fully
  -- paid appointment should still show what it cost -- so fall back to the
  -- invoice total when nothing is outstanding.
  amount_due = case
    when li.due_amount > 0 then li.due_amount
    else li.total_amount
  end,
  updated_at = now()
from latest_invoice li
where a.id = li.appointment_id
  and (
    a.payment_status is distinct from li.payment_status
    or a.amount_due is distinct from case when li.due_amount > 0 then li.due_amount else li.total_amount end
  );

-- ---------------------------------------------------------
-- 2. Keep it in sync from here on.
--
-- Fires whenever an invoice is created or its money columns move. invoices'
-- own trigger derives payment_status from paid_amount vs total_amount first,
-- so by the time we read NEW.payment_status it is already correct.
-- ---------------------------------------------------------

create or replace function public.sync_appointment_payment_from_invoice()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.appointment_id is null then
    return new;
  end if;

  update public.appointments
  set
    payment_status = new.payment_status,
    amount_due = case
      when new.due_amount > 0 then new.due_amount
      else new.total_amount
    end,
    updated_at = now()
  where id = new.appointment_id;

  return new;
end $$;

drop trigger if exists trg_sync_appointment_payment on public.invoices;
create trigger trg_sync_appointment_payment
  after insert or update of payment_status, paid_amount, total_amount, due_amount
  on public.invoices
  for each row
  execute function public.sync_appointment_payment_from_invoice();

comment on function public.sync_appointment_payment_from_invoice is
  'Mirrors an invoice''s payment state onto its appointment, so the reception list can badge Paid/Partial/Unpaid without joining invoices. The invoice remains the source of truth.';
