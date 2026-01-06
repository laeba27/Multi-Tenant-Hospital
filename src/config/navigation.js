export const NAVIGATION = {
  super_admin: [
    { label: 'Dashboard', href: '/super-admin', icon: 'LayoutDashboard' },
    { label: 'Hospitals', href: '/super-admin/hospitals', icon: 'Building2' },
    { label: 'Analytics', href: '/super-admin/analytics', icon: 'BarChart3' },
  ],
  hospital_admin: [
    { label: 'Dashboard', href: '/hospital', icon: 'LayoutDashboard' },
    { label: 'Departments', href: '/hospital/departments', icon: 'Building2' },
    { label: 'Staff', href: '/hospital/staff', icon: 'Users' },
    { label: 'Inventory', href: '/hospital/inventory', icon: 'Package' },
    { label: 'Finance', href: '/hospital/finance', icon: 'DollarSign' },
    { label: 'Analytics', href: '/hospital/analytics', icon: 'BarChart3' },
  ],
  doctor: [
    { label: 'Dashboard', href: '/doctor', icon: 'LayoutDashboard' },
    { label: 'Appointments', href: '/doctor/appointments', icon: 'Calendar' },
    { label: 'Patients', href: '/doctor/patients', icon: 'Users' },
    { label: 'Prescriptions', href: '/doctor/prescriptions', icon: 'Pill' },
  ],
  reception: [
    { label: 'Dashboard', href: '/reception', icon: 'LayoutDashboard' },
    { label: 'Book Appointment', href: '/reception/appointments/book', icon: 'Calendar' },
    { label: 'Check-in', href: '/reception/check-in', icon: 'CheckCircle2' },
    { label: 'Billing', href: '/reception/billing', icon: 'Receipt' },
  ],
  patient: [
    { label: 'Dashboard', href: '/patient', icon: 'LayoutDashboard' },
    { label: 'Appointments', href: '/patient/appointments', icon: 'Calendar' },
    { label: 'Medical Records', href: '/patient/records', icon: 'FileText' },
    { label: 'Prescriptions', href: '/patient/prescriptions', icon: 'Pill' },
  ],
}
