import { redirect } from 'next/navigation'

export default async function DashboardPage() {
  await redirect('/dashboard/hospital')
}
