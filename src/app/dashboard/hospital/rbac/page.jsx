'use client'

import { useState, useEffect } from 'react'
import { useAuthGuard } from '@/hooks/use-auth-guard'
import { getRbacRules, getStaffForRbac, upsertRbacRule, deleteRbacRule } from '@/actions/rbac'
import { toast } from 'sonner'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Lock, Plus, Pencil, Trash2, Shield, User, Globe } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'

export default function RbacPage() {
  const { user, loading: userLoading, isAuthenticated } = useAuthGuard()
  const [rules, setRules] = useState([])
  const [staff, setStaff] = useState([])
  const [loading, setLoading] = useState(true)
  const [showDialog, setShowDialog] = useState(false)
  const [editingRule, setEditingRule] = useState(null)
  const [formData, setFormData] = useState({
    target_type: 'all',
    role: '',
    staff_id: '',
    permissions: {
      book_appointment: false,
    },
    is_allowed: true,
  })

  // Available permissions
  const availablePermissions = [
    { key: 'book_appointment', label: 'Book Appointment' },
  ]

  const roles = ['doctor', 'nurse', 'receptionist', 'lab_technician', 'pharmacist', 'admin', 'other']

  useEffect(() => {
    if (isAuthenticated && user?.profile?.hospital_id) {
      loadData()
    }
  }, [isAuthenticated, user])

  const loadData = async () => {
    setLoading(true)
    try {
      const [rulesRes, staffRes] = await Promise.all([
        getRbacRules(user.profile.hospital_id),
        getStaffForRbac(user.profile.hospital_id),
      ])

      if (rulesRes.error) toast.error(rulesRes.error)
      else setRules(rulesRes.data || [])

      if (staffRes.error) toast.error(staffRes.error)
      else setStaff(staffRes.data || [])
    } catch (error) {
      toast.error('Failed to load RBAC data')
    } finally {
      setLoading(false)
    }
  }

  const handleOpenDialog = (rule = null) => {
    if (rule) {
      setEditingRule(rule)
      setFormData({
        target_type: rule.target_type,
        role: rule.role || '',
        staff_id: rule.staff_id || '',
        permissions: rule.permissions || { book_appointment: false },
        is_allowed: rule.is_allowed,
      })
    } else {
      setEditingRule(null)
      setFormData({
        target_type: 'all',
        role: '',
        staff_id: '',
        permissions: { book_appointment: false },
        is_allowed: true,
      })
    }
    setShowDialog(true)
  }

  const handleCloseDialog = () => {
    setShowDialog(false)
    setEditingRule(null)
    setFormData({
      target_type: 'all',
      role: '',
      staff_id: '',
      permissions: { book_appointment: false },
      is_allowed: true,
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    // Validation
    if (formData.target_type === 'role' && !formData.role) {
      toast.error('Please select a role')
      return
    }
    if (formData.target_type === 'user' && !formData.staff_id) {
      toast.error('Please select a staff member')
      return
    }

    try {
      const result = await upsertRbacRule(formData, user.profile.hospital_id)

      if (result.success) {
        toast.success(editingRule ? 'Rule updated successfully' : 'Rule created successfully')
        handleCloseDialog()
        loadData()
      } else {
        toast.error(result.error || 'Failed to save rule')
      }
    } catch (error) {
      toast.error('Failed to save rule')
    }
  }

  const handleDelete = async (ruleId) => {
    if (!confirm('Are you sure you want to delete this rule?')) return

    try {
      const result = await deleteRbacRule(ruleId)

      if (result.success) {
        toast.success('Rule deleted successfully')
        loadData()
      } else {
        toast.error(result.error || 'Failed to delete rule')
      }
    } catch (error) {
      toast.error('Failed to delete rule')
    }
  }

  const togglePermission = (permissionKey) => {
    setFormData({
      ...formData,
      permissions: {
        ...formData.permissions,
        [permissionKey]: !formData.permissions[permissionKey],
      },
    })
  }

  const getTargetDisplay = (rule) => {
    if (rule.target_type === 'all') {
      return (
        <div className="flex items-center gap-2">
          <Globe className="w-4 h-4" />
          <span>Everyone</span>
        </div>
      )
    }
    if (rule.target_type === 'role') {
      return (
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4" />
          <span className="capitalize">{rule.role}</span>
        </div>
      )
    }
    if (rule.target_type === 'user') {
      const staffMember = staff.find((s) => s.id === rule.staff_id)
      return (
        <div className="flex items-center gap-2">
          <User className="w-4 h-4" />
          <span>{staffMember?.name || 'Unknown User'}</span>
        </div>
      )
    }
    return 'Unknown'
  }

  const getPermissionBadges = (permissions) => {
    const granted = availablePermissions.filter((p) => permissions[p.key])
    const denied = availablePermissions.filter((p) => !permissions[p.key])

    return (
      <div className="flex flex-wrap gap-1">
        {granted.map((p) => (
          <Badge key={p.key} variant="default" className="text-xs">
            ✓ {p.label}
          </Badge>
        ))}
        {denied.map((p) => (
          <Badge key={p.key} variant="outline" className="text-xs">
            ✗ {p.label}
          </Badge>
        ))}
      </div>
    )
  }

  // Show loading state while checking authentication
  if (userLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4">
        <div className="animate-spin">
          <Lock className="h-8 w-8 text-gray-400" />
        </div>
        <p className="text-gray-600">Verifying your access...</p>
      </div>
    )
  }

  // Only hospital_admin can access this page
  if (user?.profile?.role !== 'hospital_admin' && user?.profile?.role !== 'super_admin') {
    return (
      <div className="flex items-center justify-center h-screen">
        <Card className="border-red-200 bg-red-50 max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Access Denied
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-700">
              You do not have permission to access the RBAC management page. Only hospital
              administrators can manage permissions.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Role-Based Access Control</h1>
          <p className="text-gray-600 mt-2">Manage permissions for hospital staff and roles</p>
        </div>
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogTrigger asChild>
            <Button onClick={() => handleOpenDialog(null)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Rule
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{editingRule ? 'Edit Rule' : 'Add New Rule'}</DialogTitle>
              <DialogDescription>
                Configure access permissions for hospital resources
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              {/* Target Type */}
              <div className="space-y-2">
                <Label>Apply To</Label>
                <Select
                  value={formData.target_type}
                  onValueChange={(value) => setFormData({ ...formData, target_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Everyone</SelectItem>
                    <SelectItem value="role">Specific Role</SelectItem>
                    <SelectItem value="user">Specific User</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Role Selection */}
              {formData.target_type === 'role' && (
                <div className="space-y-2">
                  <Label>Role</Label>
                  <Select
                    value={formData.role}
                    onValueChange={(value) => setFormData({ ...formData, role: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      {roles.map((role) => (
                        <SelectItem key={role} value={role}>
                          {role.replace('_', ' ').toUpperCase()}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* User Selection */}
              {formData.target_type === 'user' && (
                <div className="space-y-2">
                  <Label>Staff Member</Label>
                  <Select
                    value={formData.staff_id}
                    onValueChange={(value) => setFormData({ ...formData, staff_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select staff" />
                    </SelectTrigger>
                    <SelectContent>
                      {staff.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name} ({s.role})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Permissions */}
              <div className="space-y-3">
                <Label>Permissions</Label>
                <div className="space-y-2">
                  {availablePermissions.map((permission) => (
                    <div key={permission.key} className="flex items-center justify-between">
                      <Label className="text-sm">{permission.label}</Label>
                      <Switch
                        checked={formData.permissions[permission.key] || false}
                        onCheckedChange={() => togglePermission(permission.key)}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Is Allowed */}
              <div className="flex items-center justify-between">
                <Label>Allow Access</Label>
                <Switch
                  checked={formData.is_allowed}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_allowed: checked })}
                />
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-4">
                <Button type="button" variant="outline" onClick={handleCloseDialog} className="flex-1">
                  Cancel
                </Button>
                <Button type="submit" className="flex-1">
                  {editingRule ? 'Update' : 'Create'} Rule
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Info Banner */}
      <Alert className="border-blue-200 bg-blue-50">
        <Shield className="h-4 w-4" />
        <AlertDescription>
          <span className="font-medium">How RBAC works:</span> Rules are evaluated in order: User
          specific → Role-based → Everyone. First match wins. If no rule matches, access is denied.
          Hospital admins always have full access.
        </AlertDescription>
      </Alert>

      {/* Rules List */}
      <Card>
        <CardHeader>
          <CardTitle>Access Rules</CardTitle>
          <CardDescription>
            {rules.length === 0
              ? 'No rules configured. Add rules to control access.'
              : `${rules.length} rule${rules.length === 1 ? '' : 's'} configured`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-gray-500">Loading rules...</div>
          ) : rules.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Shield className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>No access rules configured yet.</p>
              <p className="text-sm mt-2">Click "Add Rule" to create your first rule.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {rules.map((rule) => (
                <div
                  key={rule.id}
                  className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        {getTargetDisplay(rule)}
                        <Badge variant={rule.is_allowed ? 'default' : 'destructive'}>
                          {rule.is_allowed ? 'Allowed' : 'Denied'}
                        </Badge>
                      </div>
                      <div className="text-sm">{getPermissionBadges(rule.permissions)}</div>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenDialog(rule)}
                        className="h-8 w-8 p-0"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(rule.id)}
                        className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
