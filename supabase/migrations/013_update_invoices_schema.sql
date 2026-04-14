-- Update invoices table to support new billing structure
-- Add new columns for better billing tracking
alter table public.invoices 
add column if not exists discount_type text default 'none' check (discount_type in ('none', 'percentage', 'fixed')),
add column if not exists discount_value numeric default 0 check (discount_value >= 0),
add column if not exists discount_amount numeric default 0 check (discount_amount >= 0),
add column if not exists tax_amount numeric default 0 check (tax_amount >= 0),
add column if not exists paid_amount numeric default 0 check (paid_amount >= 0),
add column if not exists due_amount numeric not null default 0 check (due_amount >= 0),
add column if not exists payment_status text default 'unpaid' check (payment_status in ('unpaid', 'partially_paid', 'paid'));

-- Drop payment_method column if it exists (from old schema)
alter table public.invoices 
drop column if not exists payment_method;

-- Add an index for payment status tracking
create index if not exists idx_invoices_payment_status on public.invoices(payment_status);
create index if not exists idx_invoices_hospital_id_payment_status on public.invoices(hospital_id, payment_status);

-- Add trigger function to automatically update payment_status based on paid vs due amounts
create or replace function update_invoice_payment_status()
returns trigger as $$
begin
  if new.paid_amount >= new.total_amount then
    new.payment_status := 'paid';
    new.due_amount := 0;
  elsif new.paid_amount > 0 then
    new.payment_status := 'partially_paid';
    new.due_amount := new.total_amount - new.paid_amount;
  else
    new.payment_status := 'unpaid';
    new.due_amount := new.total_amount;
  end if;
  return new;
end;
$$ language plpgsql;

-- Create or replace trigger
drop trigger if not exists trigger_update_invoice_payment_status on public.invoices;
create trigger trigger_update_invoice_payment_status
before update on public.invoices
for each row
execute function update_invoice_payment_status();

-- Create trigger for initial invoice creation to set due_amount
drop trigger if not exists trigger_init_invoice_due_amount on public.invoices;
create trigger trigger_init_invoice_due_amount
before insert on public.invoices
for each row
when (new.due_amount = 0)
execute function update_invoice_payment_status();
