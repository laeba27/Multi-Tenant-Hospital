-- Create invoice_payments table for tracking individual payment transactions
create table
    public.invoice_payments (
        id uuid not null default gen_random_uuid (),
        invoice_id uuid not null,
        hospital_id text not null,
        patient_id uuid not null,
        payment_method text not null check (
            payment_method in ('upi', 'card', 'cash', 'cheque', 'bank_transfer')
        ),
        amount numeric not null check (amount > 0),
        reference_id text null,
        notes text null,
        paid_at timestamp
        with
            time zone not null default now (),
            created_by uuid not null,
            created_at timestamp
        with
            time zone not null default now (),
            updated_at timestamp
        with
            time zone null default now (),
            constraint invoice_payments_pkey primary key (id),
            constraint invoice_payments_invoice_id_fkey foreign key (invoice_id) references invoices (id) on delete cascade,
            constraint invoice_payments_hospital_id_fkey foreign key (hospital_id) references hospitals (registration_no) on delete cascade,
            constraint invoice_payments_patient_id_fkey foreign key (patient_id) references patients (id) on delete cascade,
            constraint invoice_payments_created_by_fkey foreign key (created_by) references profiles (id) on delete restrict
    ) tablespace pg_default;

-- Add indexes for better query performance
create index idx_invoice_payments_invoice_id on public.invoice_payments (invoice_id);

create index idx_invoice_payments_hospital_id on public.invoice_payments (hospital_id);

create index idx_invoice_payments_patient_id on public.invoice_payments (patient_id);

create index idx_invoice_payments_paid_at on public.invoice_payments (paid_at);

-- Enable RLS
alter table public.invoice_payments enable row level security;

-- RLS Policies for invoice_payments
create policy "Hospital staff can view payments for their hospital" on public.invoice_payments for
select
    using (
        exists (
            select
                1
            from
                public.staff
            where
                staff.hospital_id = invoice_payments.hospital_id
                and staff.employee_registration_no = auth.jwt () - > > 'registration_no'
        )
    );

create policy "Hospital staff can insert payments for their hospital" on public.invoice_payments for insert
with
    check (
        exists (
            select
                1
            from
                public.staff
            where
                staff.hospital_id = invoice_payments.hospital_id
                and staff.employee_registration_no = auth.jwt () - > > 'registration_no'
        )
    );

create policy "Hospital staff can update payments for their hospital" on public.invoice_payments for
update using (
    exists (
        select
            1
        from
            public.staff
        where
            staff.hospital_id = invoice_payments.hospital_id
            and staff.employee_registration_no = auth.jwt () - > > 'registration_no'
    )
)
with
    check (
        exists (
            select
                1
            from
                public.staff
            where
                staff.hospital_id = invoice_payments.hospital_id
                and staff.employee_registration_no = auth.jwt () - > > 'registration_no'
        )
    );

create policy "Patients can view their own payments" on public.invoice_payments for
select
    using (patient_id = auth.uid ());