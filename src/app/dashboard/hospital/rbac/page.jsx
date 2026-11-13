'use client'

import { useState, useEffect, useMemo } from 'react'
import { useAuthGuard } from '@/hooks/use-auth-guard'
import { getRbacRules, getStaffForRbac, upsertRbacRule, deleteRbacRule } from '@/actions/rbac'
import {
  PERMISSIONS,
  PERMISSION_KEYS,
  ASSIGNABLE_ROLES,
  labelForRole,
  defaultsForRole,
  resolvePermissions,
} from '@/lib/rbac/permissions'
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import {
  Lock, Plus, Pencil, Trash2, Shield, User, Globe, Check, Minus, RotateCcw,
} from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { cn } from '@/lib/utils'

/**
 * Each permission in a rule is one of three choices:
 *   default -- the rule doesn't mention it; the level below decides
 *   allow / deny -- the rule overrides it
 * Only allow/deny are saved, which is exactly what the resolver expects: a
 * rule overrides only the keys it contains.
 */
const allDefault = () => Object.fromEntries(PERMISSION_KEYS.map((k) => [k, 'default']))

const choicesFromRule = (rule) => {
  const perms = rule?.permissions || {}
  return Object.fromEntries(
    PERMISSION_KEYS.map((k) => [k, k in perms ? (perms[k] === true ? 'allow' : 'deny') : 'default'])
  )
}

const permissionsFromChoices = (choices) =>
  Object.fromEntries(
    PERMISSION_KEYS.filter((k) => choices[k] !== 'default').map((k) => [k, choices[k] === 'allow'])
  )

const emptyForm = () => ({
  target_type: 'role',
  role: '',
  staff_id: '',
  choices: allDefault(),
})

export default function RbacPage() {
  const { user, loading: userLoading, isAuthenticated } = useAuthGuard()
  const [rules, setRules] = useState([])
  const [staff, setStaff] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showDialog, setShowDialog] = useState(false)
  const [editingRule, setEditingRule] = useState(null)
  const [formData, setFormData] = useState(emptyForm)

  const hospitalId = user?.profile?.hospital_id

  useEffect(() => {
    if (isAuthenticated && hospitalId) loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, hospitalId])

  const loadData = async () => {
    setLoading(true)
    try {
      const [rulesRes, staffRes] = await Promise.all([
        getRbacRules(hospitalId),
        getStaffForRbac(hospitalId),
      ])

      if (rulesRes.error) toast.error(rulesRes.error)
      else setRules(rulesRes.data || [])

      if (staffRes.error) toast.error(staffRes.error)
      else setStaff(staffRes.data || [])
    } catch (error) {
      toast.error('Failed to load access rules')
    } finally {
      setLoading(false)
    }
  }

  const staffCountByRole = useMemo(() => {
    const counts = {}
    for (const s of staff) counts[s.role] = (counts[s.role] || 0) + 1
    return counts
  }, [staff])

  // Show the roles this hospital actually has staff in first; the rest
  // follow, so an admin can still set a rule up before hiring.
  const orderedRoles = useMemo(
    () => [...ASSIGNABLE_ROLES].sort(
      (a, b) => (staffCountByRole[b] ? 1 : 0) - (staffCountByRole[a] ? 1 : 0)
    ),
    [staffCountByRole]
  )

  const roleRuleFor = (role) =>
    rules.find((r) => r.target_type === 'role' && r.role === role) || null

  const openDialog = (rule = null, preset = null) => {
    if (rule) {
      setEditingRule(rule)
      setFormData({
        target_type: rule.target_type,
        role: rule.role || '',
        staff_id: rule.staff_id || '',
        choices: choicesFromRule(rule),
      })
    } else {
      setEditingRule(null)
      setFormData({ ...emptyForm(), ...(preset || {}) })
    }
    setShowDialog(true)
  }

  // The matrix's per-role edit button: edit that role's rule if it has one,
  // otherwise start a new one for it.
  const openRole = (role) => {
    const existing = roleRuleFor(role)
    if (existing) openDialog(existing)
    else openDialog(null, { target_type: 'role', role })
  }

  const closeDialog = () => {
    setShowDialog(false)
    setEditingRule(null)
    setFormData(emptyForm())
  }

  // Changing the target of an existing rule while editing would create a
  // second rule and leave the old one behind, so the target is locked once a
  // rule exists. Starting a new rule against a target that already has one
  // switches to editing that rule instead of silently overwriting it.
  const setTarget = (patch) => {
    const next = { ...formData, ...patch }
    const existing = rules.find((r) =>
      next.target_type === 'all' ? r.target_type === 'all'
        : next.target_type === 'role' ? r.target_type === 'role' && r.role === next.role
          : r.target_type === 'user' && r.staff_id === next.staff_id
    )
    if (existing && (next.target_type === 'all' || next.role || next.staff_id)) {
      setEditingRule(existing)
      setFormData({ ...next, choices: choicesFromRule(existing) })
    } else {
      setFormData(next)
    }
  }

  // What "Default" means for each permission in the rule being edited.
  const inherited = useMemo(() => {
    const { target_type, role, staff_id } = formData
    if (target_type === 'role' && role) {
      return resolvePermissions({ role, rules, below: 'role' })
    }
    if (target_type === 'user' && staff_id) {
      const member = staff.find((s) => s.id === staff_id)
      if (!member) return null
      return resolvePermissions({ role: member.role, staffId: staff_id, rules, below: 'user' })
    }
    return null // 'all': the default differs per role
  }, [formData, rules, staff])

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (formData.target_type === 'role' && !formData.role) {
      toast.error('Please select a role')
      return
    }
    if (formData.target_type === 'user' && !formData.staff_id) {
      toast.error('Please select a staff member')
      return
    }

    const permissions = permissionsFromChoices(formData.choices)
    if (Object.keys(permissions).length === 0) {
      if (editingRule) {
        // Everything back on Default is the same as having no rule.
        await removeRule(editingRule, { skipConfirm: true })
        closeDialog()
      } else {
        toast.error('Set at least one permission to Allow or Deny.')
      }
      return
    }

    setSaving(true)
    try {
      const result = await upsertRbacRule(
        {
          target_type: formData.target_type,
          role: formData.role,
          staff_id: formData.staff_id,
          permissions,
        },
        hospitalId
      )

      if (result.success) {
        toast.success(editingRule ? 'Rule updated' : 'Rule created')
        closeDialog()
        loadData()
      } else {
        toast.error(result.error || 'Failed to save rule')
      }
    } catch (error) {
      toast.error('Failed to save rule')
    } finally {
      setSaving(false)
    }
  }

  const removeRule = async (rule, { skipConfirm = false } = {}) => {
    if (
      !skipConfirm &&
      !confirm('Remove this rule? The people it covers go back to the default permissions.')
    ) {
      return
    }

    try {
      const result = await deleteRbacRule(rule.id)
      if (result.success) {
        toast.success('Rule removed. Defaults apply again.')
        loadData()
      } else {
        toast.error(result.error || 'Failed to remove rule')
      }
    } catch (error) {
      toast.error('Failed to remove rule')
    }
  }

  const setChoice = (key, value) =>
    setFormData((f) => ({ ...f, choices: { ...f.choices, [key]: value } }))

  const targetLabel = (rule) => {
    if (rule.target_type === 'all') return { icon: Globe, text: 'Everyone (all staff roles)' }
    if (rule.target_type === 'role') return { icon: Shield, text: labelForRole(rule.role) }
    const member = staff.find((s) => s.id === rule.staff_id)
    return {
      icon: User,
      text: member ? `${member.name} (${labelForRole(member.role)})` : 'Former staff member',
    }
  }

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

  // Rules are listed most specific first, matching how they're applied.
  const sortedRules = [...rules].sort((a, b) => {
    const order = { user: 0, role: 1, all: 2 }
    return (order[a.target_type] ?? 3) - (order[b.target_type] ?? 3)
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Role-Based Access Control</h1>
          <p className="text-gray-600 mt-2">
            Decide who at your hospital can book, confirm requests, view prescriptions and bill.
          </p>
        </div>
        <Button onClick={() => openDialog(null)} className="w-full sm:w-auto">
          <Plus className="mr-2 h-4 w-4" />
          Add Rule
        </Button>
      </div>

      <Alert className="border-blue-200 bg-blue-50">
        <Shield className="h-4 w-4" />
        <AlertDescription>
          <span>
            <span className="font-medium">How it works:</span> every role starts with sensible
            defaults. For example, receptionists can book appointments and doctors can view
            prescriptions. Add a rule to change that <em>for your hospital only</em>. A rule
            for a specific person beats a role rule, which beats an Everyone rule. Hospital
            admins always have full access.
          </span>
        </AlertDescription>
      </Alert>

      {/* Effective access per role */}
      <Card>
        <CardHeader>
          <CardTitle>Who can do what</CardTitle>
          <CardDescription>
            Current access for each role at your hospital: the built-in defaults plus any
            rules below. Per-person rules aren&apos;t shown here.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-gray-500">Loading…</div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left">
                      <th className="py-2 pr-2 sm:pr-3 text-xs sm:text-sm font-medium text-gray-600">Role</th>
                      {PERMISSIONS.map((p) => (
                        <th key={p.key} className="py-2 px-1 sm:px-2 text-xs sm:text-sm font-medium leading-tight text-gray-600 text-center">
                          <span className="hidden md:inline">{p.label}</span>
                          <span className="md:hidden">{p.short}</span>
                        </th>
                      ))}
                      <th className="py-2 pl-1 sm:pl-2"><span className="sr-only">Actions</span></th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b bg-gray-50/60">
                      <td className="py-2.5 pr-2 sm:pr-3">
                        <p className="font-medium">Hospital Admin</p>
                        <p className="text-xs text-gray-500">Always full access</p>
                      </td>
                      {PERMISSIONS.map((p) => (
                        <td key={p.key} className="py-2.5 px-1 sm:px-2 text-center">
                          <AccessMark allowed />
                        </td>
                      ))}
                      <td className="py-2.5 pl-1 sm:pl-2" />
                    </tr>
                    {orderedRoles.map((role) => {
                      const effective = resolvePermissions({ role, rules })
                      const defaults = defaultsForRole(role)
                      const count = staffCountByRole[role] || 0
                      const hasRoleRule = Boolean(roleRuleFor(role))
                      return (
                        <tr key={role} className="border-b last:border-0">
                          <td className="py-2.5 pr-2 sm:pr-3">
                            <p className="font-medium">{labelForRole(role)}</p>
                            <p className="text-xs text-gray-500">
                              {count ? `${count} staff` : 'No staff yet'}
                              {hasRoleRule && ' · custom rule'}
                            </p>
                          </td>
                          {PERMISSIONS.map((p) => (
                            <td key={p.key} className="py-2.5 px-1 sm:px-2 text-center">
                              <AccessMark
                                allowed={effective[p.key]}
                                changed={effective[p.key] !== defaults[p.key]}
                              />
                            </td>
                          ))}
                          <td className="py-2.5 pl-1 sm:pl-2 text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                              onClick={() => openRole(role)}
                              aria-label={`Change access for ${labelForRole(role)}`}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500">
                <span className="flex items-center gap-1.5"><AccessMark allowed /> Allowed</span>
                <span className="flex items-center gap-1.5"><AccessMark allowed={false} /> Not allowed</span>
                <span className="flex items-center gap-1.5"><AccessMark allowed changed /> Changed from default by your rules</span>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Rules List */}
      <Card>
        <CardHeader>
          <CardTitle>Your hospital&apos;s rules</CardTitle>
          <CardDescription>
            {rules.length === 0
              ? 'No rules yet: everyone has the default access shown above.'
              : `${rules.length} rule${rules.length === 1 ? '' : 's'}. Remove a rule to go back to the defaults.`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-gray-500">Loading rules...</div>
          ) : rules.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Shield className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>No custom rules.</p>
              <p className="text-sm mt-2">
                Use the pencil next to a role above, or &quot;Add Rule&quot; for one person.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {sortedRules.map((rule) => {
                const { icon: Icon, text } = targetLabel(rule)
                const perms = rule.permissions || {}
                const setKeys = PERMISSIONS.filter((p) => p.key in perms)
                return (
                  <div
                    key={rule.id}
                    className="border rounded-lg p-3 sm:p-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <Icon className="w-4 h-4 text-gray-500 shrink-0" />
                          <span className="font-medium wrap-anywhere">{text}</span>
                          {rule.is_allowed === false && (
                            <Badge variant="outline" className="text-amber-700 border-amber-300">
                              Switched off: not applied
                            </Badge>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {setKeys.map((p) => (
                            <Badge
                              key={p.key}
                              variant="outline"
                              className={cn(
                                'text-xs',
                                perms[p.key] === true
                                  ? 'border-green-200 bg-green-50 text-green-800'
                                  : 'border-red-200 bg-red-50 text-red-700'
                              )}
                            >
                              {perms[p.key] === true ? '✓' : '✗'} {p.label}
                            </Badge>
                          ))}
                          {setKeys.length === 0 && (
                            <span className="text-xs text-gray-500">Changes nothing</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 sm:gap-2 ml-2 sm:ml-4 shrink-0">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openDialog(rule)}
                          className="h-8 w-8 p-0"
                          aria-label="Edit rule"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeRule(rule)}
                          className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                          aria-label="Remove rule"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add / edit rule */}
      <Dialog open={showDialog} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader className="text-left pr-6">
            <DialogTitle>{editingRule ? 'Edit Rule' : 'Add Rule'}</DialogTitle>
            <DialogDescription>
              &quot;Default&quot; keeps what they&apos;d have without this rule. Choose Allow or
              Deny only for what you want to change.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Apply to</Label>
              <Select
                value={formData.target_type}
                onValueChange={(value) =>
                  setTarget({ target_type: value, role: '', staff_id: '', choices: allDefault() })
                }
                disabled={Boolean(editingRule)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="role">A role</SelectItem>
                  <SelectItem value="user">One staff member</SelectItem>
                  <SelectItem value="all">Everyone (all staff roles)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formData.target_type === 'role' && (
              <div className="space-y-2">
                <Label>Role</Label>
                <Select
                  value={formData.role}
                  onValueChange={(value) => setTarget({ role: value, choices: allDefault() })}
                  disabled={Boolean(editingRule)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    {orderedRoles.map((role) => (
                      <SelectItem key={role} value={role}>
                        {labelForRole(role)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {formData.target_type === 'user' && (
              <div className="space-y-2">
                <Label>Staff member</Label>
                <Select
                  value={formData.staff_id}
                  onValueChange={(value) => setTarget({ staff_id: value, choices: allDefault() })}
                  disabled={Boolean(editingRule)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select staff" />
                  </SelectTrigger>
                  <SelectContent>
                    {staff.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name} ({labelForRole(s.role)})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {formData.target_type === 'all' && (
              <p className="text-xs text-gray-600 rounded-md bg-amber-50 border border-amber-200 px-3 py-2">
                An Everyone rule applies to every staff role at once, including roles that
                don&apos;t have it by default. Role and per-person rules still win over it.
              </p>
            )}

            <div className="space-y-3">
              <Label>Permissions</Label>
              <div className="divide-y rounded-md border">
                {PERMISSIONS.map((permission) => (
                  <div
                    key={permission.key}
                    className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
                  >
                    <div className="min-w-0 space-y-0.5">
                      <p className="text-sm font-medium">{permission.label}</p>
                      <p className="text-xs text-gray-500">{permission.description}</p>
                    </div>
                    <ChoiceToggle
                      value={formData.choices[permission.key]}
                      onChange={(v) => setChoice(permission.key, v)}
                      inheritedAllowed={inherited ? inherited[permission.key] : null}
                    />
                  </div>
                ))}
              </div>
            </div>

            <DialogFooter className="pt-2 sm:justify-between">
              {editingRule ? (
                <Button
                  type="button"
                  variant="ghost"
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  onClick={async () => {
                    await removeRule(editingRule)
                    closeDialog()
                  }}
                >
                  <RotateCcw className="mr-2 h-4 w-4" /> Reset to defaults
                </Button>
              ) : <span className="hidden sm:block" />}
              <div className="flex flex-col-reverse gap-2 sm:flex-row">
                <Button type="button" variant="outline" onClick={closeDialog}>
                  Cancel
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving ? 'Saving…' : editingRule ? 'Save Changes' : 'Create Rule'}
                </Button>
              </div>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function AccessMark({ allowed, changed = false }) {
  return (
    <span
      className={cn(
        'inline-flex h-6 w-6 items-center justify-center rounded-full',
        allowed ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400',
        changed && 'ring-2 ring-amber-400 ring-offset-1'
      )}
      aria-label={`${allowed ? 'Allowed' : 'Not allowed'}${changed ? ', changed from default' : ''}`}
    >
      {allowed ? <Check className="h-3.5 w-3.5" /> : <Minus className="h-3.5 w-3.5" />}
    </span>
  )
}

function ChoiceToggle({ value, onChange, inheritedAllowed }) {
  const defaultLabel =
    inheritedAllowed === null ? 'Default' : `Default (${inheritedAllowed ? 'on' : 'off'})`
  const options = [
    { value: 'default', label: defaultLabel, active: 'bg-white text-gray-900 shadow-sm' },
    { value: 'allow', label: 'Allow', active: 'bg-green-600 text-white shadow-sm' },
    { value: 'deny', label: 'Deny', active: 'bg-red-600 text-white shadow-sm' },
  ]
  return (
    <div className="grid grid-cols-3 gap-1 rounded-md bg-gray-100 p-1 sm:inline-grid sm:shrink-0">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          aria-pressed={value === o.value}
          className={cn(
            'rounded px-2.5 py-1.5 text-xs font-medium whitespace-nowrap transition-colors',
            value === o.value ? o.active : 'text-gray-600 hover:text-gray-900'
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
