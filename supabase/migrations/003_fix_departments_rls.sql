-- Drop incorrect policies if they exist (will error if department table doesn't exist, but that's fine if we run in order)
drop policy if exists "Hospitals can view their own departments" on departments;
drop policy if exists "Hospitals can insert their own departments" on departments;
drop policy if exists "Hospitals can update their own departments" on departments;
drop policy if exists "Hospitals can delete their own departments" on departments;

-- Re-create policies using the correct link between profiles and hospitals
-- Profiles table links to hospitals via hospital_id (which is registration_no in hospitals table)

create policy "Hospital admins can view their own departments"
  on departments for select
  using (
    auth.uid() in (
      select p.id 
      from profiles p
      join hospitals h on p.hospital_id = h.registration_no
      where h.id = departments.hospital_id
    )
  );

create policy "Hospital admins can insert their own departments"
  on departments for insert
  with check (
    auth.uid() in (
      select p.id 
      from profiles p
      join hospitals h on p.hospital_id = h.registration_no
      where h.id = departments.hospital_id
      and p.role = 'hospital_admin'
    )
  );

create policy "Hospital admins can update their own departments"
  on departments for update
  using (
    auth.uid() in (
      select p.id 
      from profiles p
      join hospitals h on p.hospital_id = h.registration_no
      where h.id = departments.hospital_id
      and p.role = 'hospital_admin'
    )
  );

create policy "Hospital admins can delete their own departments"
  on departments for delete
  using (
    auth.uid() in (
      select p.id 
      from profiles p
      join hospitals h on p.hospital_id = h.registration_no
      where h.id = departments.hospital_id
      and p.role = 'hospital_admin'
    )
  );
