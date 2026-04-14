'use client'

import { useEffect, useState } from 'react'
import {
  Building2,
  CheckCircle2,
  Clock3,
  Mail,
  RefreshCcw,
  Search,
  ShieldCheck,
  UserPlus,
} from 'lucide-react'
import { toast } from 'sonner'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  approveHospitalRegistration,
  createSuperAdminAccount,
  getSuperAdminDashboardData,
  requestHospitalDetails,
} from '@/actions/super-admin'

function normalizeStatus(status) {
  return (status || '').trim().toLowerCase()
}

function getStatusBadge(status, accessGranted) {
  const normalized = normalizeStatus(status)

  if (['active', 'approved'].includes(normalized) && accessGranted) {
    return <Badge className="bg-green-100 text-green-800 border-green-200">Active</Badge>
  }

  if (['pending', 'pending approval', 'pending_approval'].includes(normalized) || !accessGranted) {
    return <Badge className="bg-amber-100 text-amber-800 border-amber-200">Pending Approval</Badge>
  }

  return <Badge variant="destructive">{status || 'Unknown'}</Badge>
}

export default function SuperAdminPage() {
  const [loading, setLoading] = useState(true)
  const [querying, setQuerying] = useState(false)
  const [creatingSuperAdmin, setCreatingSuperAdmin] = useState(false)
  const [approvingHospital, setApprovingHospital] = useState('')
  const [requestingHospital, setRequestingHospital] = useState('')

  const [emailFilter, setEmailFilter] = useState('')
  const [dashboardData, setDashboardData] = useState({
    stats: {
      totalHospitals: 0,
      pendingHospitals: 0,
      approvedHospitals: 0,
      totalSuperAdmins: 0,
    },
    hospitals: [],
    pendingApprovalHospitals: [],
  })

  const [superAdminForm, setSuperAdminForm] = useState({
    name: '',
    email: '',
    mobile: '',
    password: '',
    registrationNo: '',
  })

  const loadDashboardData = async (filterValue = '') => {
    const shouldShowLoader = !querying && loading

    if (!shouldShowLoader) {
      setQuerying(true)
    }

    const result = await getSuperAdminDashboardData(filterValue)

    if (!result.success) {
      toast.error(result.error || 'Failed to load dashboard data')
      setDashboardData({
        stats: {
          totalHospitals: 0,
          pendingHospitals: 0,
          approvedHospitals: 0,
          totalSuperAdmins: 0,
        },
        hospitals: [],
        pendingApprovalHospitals: [],
      })
    } else {
      setDashboardData(result.data)
    }

    setLoading(false)
    setQuerying(false)
  }

  useEffect(() => {
    loadDashboardData('')
  }, [])

  const handleSearch = async (event) => {
    event.preventDefault()
    await loadDashboardData(emailFilter)
  }

  const handleReset = async () => {
    setEmailFilter('')
    await loadDashboardData('')
  }

  const handleApproveHospital = async (hospitalRegistrationNo) => {
    setApprovingHospital(hospitalRegistrationNo)

    const result = await approveHospitalRegistration(hospitalRegistrationNo)

    if (!result.success) {
      toast.error(result.error || 'Failed to approve hospital')
      setApprovingHospital('')
      return
    }

    toast.success(result.message || 'Hospital approved successfully')
    await loadDashboardData(emailFilter)
    setApprovingHospital('')
  }

  const handleRequestDetails = async (hospitalRegistrationNo) => {
    const note = window.prompt(
      'Enter details you want from hospital admin:',
      'Please share any missing registration/legal details for approval.'
    )

    if (note === null) return

    setRequestingHospital(hospitalRegistrationNo)

    const result = await requestHospitalDetails(hospitalRegistrationNo, note)

    if (!result.success) {
      toast.error(result.error || 'Failed to send details request email')
      setRequestingHospital('')
      return
    }

    toast.success(result.message || 'Details request email sent')
    setRequestingHospital('')
  }

  const handleCreateSuperAdmin = async (event) => {
    event.preventDefault()

    setCreatingSuperAdmin(true)

    const result = await createSuperAdminAccount(superAdminForm)

    if (!result.success) {
      toast.error(result.error || 'Failed to create super admin account')
      setCreatingSuperAdmin(false)
      return
    }

    toast.success(
      `Super admin created. Registration No: ${result.data?.registrationNo || 'Generated successfully'}`
    )

    setSuperAdminForm({
      name: '',
      email: '',
      mobile: '',
      password: '',
      registrationNo: '',
    })

    await loadDashboardData(emailFilter)
    setCreatingSuperAdmin(false)
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-75">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4" />
            <p className="text-gray-600">Loading super admin dashboard...</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Super Admin Dashboard</h1>
            <p className="text-gray-600 mt-1">
              Review hospital registrations, approve access, and manage super admin accounts.
            </p>
          </div>

          <form onSubmit={handleSearch} className="flex w-full lg:w-auto gap-2">
            <div className="relative flex-1 lg:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
              <Input
                value={emailFilter}
                onChange={(event) => setEmailFilter(event.target.value)}
                placeholder="Search by hospital email"
                className="pl-9"
              />
            </div>
            <Button type="submit" disabled={querying}>
              Search
            </Button>
            <Button type="button" variant="outline" onClick={handleReset} disabled={querying}>
              <RefreshCcw className="h-4 w-4" />
            </Button>
          </form>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          <Card>
            <CardHeader>
              <CardDescription>Total Hospitals</CardDescription>
              <CardTitle className="text-3xl flex items-center gap-2">
                <Building2 className="h-6 w-6 text-indigo-600" />
                {dashboardData.stats.totalHospitals}
              </CardTitle>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <CardDescription>Pending Approval</CardDescription>
              <CardTitle className="text-3xl flex items-center gap-2">
                <Clock3 className="h-6 w-6 text-amber-600" />
                {dashboardData.stats.pendingHospitals}
              </CardTitle>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <CardDescription>Approved Hospitals</CardDescription>
              <CardTitle className="text-3xl flex items-center gap-2">
                <CheckCircle2 className="h-6 w-6 text-green-600" />
                {dashboardData.stats.approvedHospitals}
              </CardTitle>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <CardDescription>Super Admins</CardDescription>
              <CardTitle className="text-3xl flex items-center gap-2">
                <ShieldCheck className="h-6 w-6 text-blue-600" />
                {dashboardData.stats.totalSuperAdmins}
              </CardTitle>
            </CardHeader>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Pending Hospital Registrations</CardTitle>
            <CardDescription>
              Approve hospitals to enable hospital admin login. Use "Request Details" to ask for additional information by email.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {dashboardData.pendingApprovalHospitals.length === 0 ? (
              <p className="text-sm text-gray-600">No pending registrations found.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Hospital</TableHead>
                    <TableHead>Reg. No</TableHead>
                    <TableHead>Admin Email</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Registered</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dashboardData.pendingApprovalHospitals.map((hospital) => (
                    <TableRow key={hospital.registration_no}>
                      <TableCell>
                        <div>
                          <p className="font-medium text-gray-900">{hospital.name}</p>
                          <p className="text-xs text-gray-600">{hospital.city}, {hospital.state}</p>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-xs">{hospital.registration_no}</TableCell>
                      <TableCell>{hospital.admin_profile?.email || hospital.email || '-'}</TableCell>
                      <TableCell>
                        {getStatusBadge(hospital.account_status, hospital.admin_profile?.access_granted === true)}
                      </TableCell>
                      <TableCell>
                        {hospital.created_at
                          ? new Date(hospital.created_at).toLocaleDateString()
                          : '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleRequestDetails(hospital.registration_no)}
                            disabled={requestingHospital === hospital.registration_no || approvingHospital === hospital.registration_no}
                          >
                            <Mail className="h-4 w-4" />
                            {requestingHospital === hospital.registration_no ? 'Sending...' : 'Request Details'}
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleApproveHospital(hospital.registration_no)}
                            disabled={approvingHospital === hospital.registration_no || requestingHospital === hospital.registration_no}
                          >
                            {approvingHospital === hospital.registration_no ? 'Approving...' : 'Approve'}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Add Another Super Admin
            </CardTitle>
            <CardDescription>
              Create a new super admin account in auth and profiles.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateSuperAdmin} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              <Input
                placeholder="Full name"
                value={superAdminForm.name}
                onChange={(event) =>
                  setSuperAdminForm((prev) => ({ ...prev, name: event.target.value }))
                }
                required
              />

              <Input
                placeholder="Email"
                type="email"
                value={superAdminForm.email}
                onChange={(event) =>
                  setSuperAdminForm((prev) => ({ ...prev, email: event.target.value }))
                }
                required
              />

              <Input
                placeholder="Mobile"
                value={superAdminForm.mobile}
                onChange={(event) =>
                  setSuperAdminForm((prev) => ({ ...prev, mobile: event.target.value }))
                }
                required
              />

              <Input
                placeholder="Password"
                type="password"
                value={superAdminForm.password}
                onChange={(event) =>
                  setSuperAdminForm((prev) => ({ ...prev, password: event.target.value }))
                }
                required
              />

              <Input
                placeholder="Registration No (optional)"
                value={superAdminForm.registrationNo}
                onChange={(event) =>
                  setSuperAdminForm((prev) => ({ ...prev, registrationNo: event.target.value }))
                }
              />

              <Button type="submit" disabled={creatingSuperAdmin}>
                {creatingSuperAdmin ? 'Creating...' : 'Create Super Admin'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
