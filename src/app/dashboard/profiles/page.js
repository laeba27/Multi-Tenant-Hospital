'use client'

import { useState, useEffect } from 'react'
import { Building2, User, Edit2, Save, X, Upload, AlertCircle, Loader } from 'lucide-react'
import { useUserDetails } from '@/hooks/use-user-details'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { uploadDocument, getDocumentUrl } from '@/actions/documents'
import { readJsonResponse } from '@/lib/utils/safe-json'
import {
  Section,
  FieldGrid,
  TextInput,
  SelectInput,
  ReadField,
  Pill,
  CheckboxField,
  ServiceState,
} from '@/components/profile/fields'

export default function ProfilePage() {
  const { profile, hospital, isLoading, error } = useUserDetails()
  const [activeTab, setActiveTab] = useState('personal')
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [avatarPreview, setAvatarPreview] = useState(null)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [uploadingLogo, setUploadingLogo] = useState(false)

  const [profileData, setProfileData] = useState({
    name: '',
    email: '',
    mobile: '',
    avatar_url: '',
    status: 'active',
  })

  const [hospitalData, setHospitalData] = useState({
    name: '',
    license_number: '',
    address: '',
    city: '',
    state: '',
    postal_code: '',
    phone: '',
    email: '',
    administrator_name: '',
    hospital_type: '',
    website: '',
    total_beds: '',
    icu_beds: '',
    emergency_services: false,
    inpatient_services: false,
    ambulance_services: false,
    feedback_enabled: false,
    account_status: 'Active',
    logo_url: '',
  })

  const isHospitalAdmin = profile?.role === 'hospital_admin'

  // Initialize data when loaded
  useEffect(() => {
    if (profile) {
      setProfileData({
        name: profile.name || '',
        email: profile.email || '',
        mobile: profile.mobile || profile.phone || '',
        avatar_url: profile.avatar_url || '',
        status: profile.status || 'active',
      })
      setAvatarPreview(profile.avatar_url || null)
    }
  }, [profile])

  useEffect(() => {
    if (hospital) {
      setHospitalData({
        name: hospital.name || '',
        license_number: hospital.license_number || '',
        address: hospital.address || '',
        city: hospital.city || '',
        state: hospital.state || '',
        postal_code: hospital.postal_code || '',
        phone: hospital.phone || '',
        email: hospital.email || '',
        administrator_name: hospital.administrator_name || '',
        hospital_type: hospital.hospital_type || '',
        website: hospital.website || '',
        total_beds: hospital.total_beds || '',
        icu_beds: hospital.icu_beds || '',
        emergency_services: hospital.emergency_services || false,
        inpatient_services: hospital.inpatient_services || false,
        ambulance_services: hospital.ambulance_services || false,
        feedback_enabled: hospital.feedback_enabled || false,
        account_status: hospital.account_status || 'Active',
        logo_url: hospital.logo_url || '',
      })
    }
  }, [hospital])

  const handleProfileChange = (e) => {
    const { name, value } = e.target
    setProfileData(prev => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleHospitalChange = (e) => {
    const { name, value, type, checked } = e.target
    setHospitalData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }))
  }

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Show the picked image straight away; the upload is the slow part and the
    // user shouldn't stare at a stale avatar while it runs.
    const localPreview = URL.createObjectURL(file)
    setAvatarPreview(localPreview)
    setUploadingAvatar(true)

    try {
      const form = new FormData()
      form.append('file', file)
      form.append('scope', 'avatar')

      const res = await uploadDocument(form)
      if (!res.success) {
        toast.error(res.error || 'Could not upload that image')
        setAvatarPreview(profileData.avatar_url || null)
        return
      }

      const urlRes = await getDocumentUrl(res.document.id)
      if (urlRes.success) {
        setProfileData((prev) => ({ ...prev, avatar_url: urlRes.url }))
        setAvatarPreview(urlRes.url)
      }
      toast.success('Profile picture updated')
    } catch (error) {
      console.error(error)
      toast.error('Could not upload that image')
      setAvatarPreview(profileData.avatar_url || null)
    } finally {
      setUploadingAvatar(false)
      URL.revokeObjectURL(localPreview)
      e.target.value = ''
    }
  }

  // Goes to Cloudflare R2, like every other upload. Supabase Storage counts
  // against the free tier's disk quota; R2 does not.
  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingLogo(true)
    try {
      const form = new FormData()
      form.append('file', file)
      form.append('scope', 'hospital_media')
      form.append('hospitalId', profile?.hospital_id || '')
      form.append('title', 'Hospital logo')

      const res = await uploadDocument(form)
      if (!res.success) {
        toast.error(res.error || 'Could not upload the logo')
        return
      }

      const urlRes = await getDocumentUrl(res.document.id)
      if (urlRes.success) {
        setHospitalData((prev) => ({ ...prev, logo_url: urlRes.url }))
      }
      toast.success('Logo updated')
    } catch (error) {
      console.error(error)
      toast.error('Could not upload the logo')
    } finally {
      setUploadingLogo(false)
      e.target.value = ''
    }
  }

  const handleSave = async () => {
    try {
      setIsSaving(true)

      const updates = {
        type: activeTab === 'personal' ? 'profile' : isHospitalAdmin ? 'hospital' : 'profile',
      }

      if (activeTab === 'personal') {
        updates.profileData = {
          name: profileData.name,
          mobile: profileData.mobile,
          avatar_url: profileData.avatar_url,
          status: profileData.status,
        }
      } else if (isHospitalAdmin) {
        updates.hospitalData = {
          address: hospitalData.address,
          city: hospitalData.city,
          state: hospitalData.state,
          postal_code: hospitalData.postal_code,
          phone: hospitalData.phone,
          administrator_name: hospitalData.administrator_name,
          hospital_type: hospitalData.hospital_type,
          website: hospitalData.website,
          total_beds: hospitalData.total_beds ? parseInt(hospitalData.total_beds) : null,
          icu_beds: hospitalData.icu_beds ? parseInt(hospitalData.icu_beds) : null,
          emergency_services: hospitalData.emergency_services,
          inpatient_services: hospitalData.inpatient_services,
          ambulance_services: hospitalData.ambulance_services,
          feedback_enabled: hospitalData.feedback_enabled,
          logo_url: hospitalData.logo_url,
        }
      }

      const response = await fetch('/api/profile/update', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })

      const data = await readJsonResponse(response)

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update')
      }

      toast.success('Profile updated successfully')
      setIsEditing(false)
      
      // Refresh profile data from hook
      window.location.reload()
    } catch (error) {
      toast.error(error.message || 'Error updating profile')
      console.error(error)
    } finally {
      setIsSaving(false)
    }
  }

  // Roles that never own a hospital record. Patients get the personal tab only;
  // showing them an empty "Hospital Details" tab was one of the things that made
  // this screen feel unfinished.
  const roleLabel = profile?.role?.replace(/_/g, ' ') || 'user'
  const initial = (profile?.name || '?').charAt(0).toUpperCase()

  const statusTone =
    profile?.status === 'active'
      ? 'positive'
      : profile?.status === 'suspended'
        ? 'negative'
        : 'neutral'

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto">
        {/* Skeleton rather than a spinner: the page keeps its shape while it
            loads, so nothing jumps when the data lands. */}
        <div className="animate-pulse">
          <div className="h-7 w-32 rounded bg-slate-200" />
          <div className="mt-2 h-4 w-56 rounded bg-slate-100" />
          <div className="mt-8 rounded-xl border border-slate-200 bg-white p-6">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-full bg-slate-200" />
              <div className="space-y-2">
                <div className="h-4 w-40 rounded bg-slate-200" />
                <div className="h-3 w-24 rounded bg-slate-100" />
              </div>
            </div>
            <div className="mt-8 grid gap-5 sm:grid-cols-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="space-y-2">
                  <div className="h-3 w-20 rounded bg-slate-100" />
                  <div className="h-4 w-36 rounded bg-slate-200" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 flex items-start gap-3">
          <AlertCircle className="text-rose-600 shrink-0 mt-0.5" size={18} />
          <div>
            <p className="text-sm font-medium text-rose-900">Could not load your profile</p>
            <p className="mt-0.5 text-sm text-rose-700">{error}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto pb-16">
      {/* ── Page header ─────────────────────────────────────────────────────
          A plain title and one action. The old header put a filled button next
          to a 3xl bold heading, which fought for attention on a page whose job
          is mostly reading. */}
      <div className="flex items-start justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Profile</h1>
          <p className="mt-1 text-sm text-slate-500">
            Manage your account details{hospital ? ' and hospital information' : ''}.
          </p>
        </div>

        {!isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 transition hover:border-brand-blue hover:text-brand-blue"
          >
            <Edit2 size={15} />
            Edit
          </button>
        )}
      </div>

      {/* ── Identity card ───────────────────────────────────────────────────
          Who you are, shown once at the top. Every role gets this same card --
          it is the only place the avatar, name, role and registration number
          appear together, so a doctor's profile and a receptionist's profile
          read identically. */}
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-5">
          <div className="relative shrink-0">
            {avatarPreview ? (
              // eslint-disable-next-line @next/next/no-img-element -- remote R2 URL, not a static asset
              <img
                src={avatarPreview}
                alt=""
                className="h-16 w-16 rounded-full object-cover ring-1 ring-slate-200"
              />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-blue text-xl font-semibold text-white">
                {initial}
              </div>
            )}

            {uploadingAvatar && (
              <div className="absolute inset-0 flex items-center justify-center rounded-full bg-white/70">
                <Loader className="h-5 w-5 animate-spin text-brand-blue" />
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <p className="truncate text-base font-semibold text-slate-900">
              {profile?.name || '—'}
            </p>
            <p className="mt-0.5 text-sm capitalize text-slate-500">{roleLabel}</p>
            <div className="mt-2.5 flex flex-wrap items-center gap-2">
              <Pill tone={statusTone}>{profile?.status || 'active'}</Pill>
              {profile?.registration_no && (
                <span className="font-mono text-xs text-slate-500">
                  {profile.registration_no}
                </span>
              )}
            </div>
          </div>

          {isEditing && (
            <label
              className={`inline-flex shrink-0 cursor-pointer items-center gap-2 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 transition hover:border-brand-blue hover:text-brand-blue ${
                uploadingAvatar ? 'pointer-events-none opacity-50' : ''
              }`}
            >
              <Upload size={15} />
              {uploadingAvatar ? 'Uploading…' : 'Change photo'}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarUpload}
                disabled={uploadingAvatar}
              />
            </label>
          )}
        </div>
      </div>

      {/* ── Tabs ────────────────────────────────────────────────────────────
          Only rendered when there is a second tab to switch to. A lone tab is
          just a label, and patients (who have no hospital) saw exactly that. */}
      {hospital && (
        <div className="mt-8 border-b border-slate-200">
          <nav className="-mb-px flex gap-6">
            {[
              { id: 'personal', label: 'Personal details', icon: User },
              { id: 'hospital', label: 'Hospital', icon: Building2 },
            ].map((t) => {
              const Icon = t.icon
              const on = activeTab === t.id
              return (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id)}
                  className={`inline-flex items-center gap-2 border-b-2 px-1 pb-3 text-sm font-medium transition ${
                    on
                      ? 'border-brand-blue text-brand-blue'
                      : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-800'
                  }`}
                >
                  <Icon size={15} />
                  {t.label}
                  {t.id === 'hospital' && !isHospitalAdmin && (
                    <span className="ml-1 rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-normal text-slate-500">
                      Read only
                    </span>
                  )}
                </button>
              )
            })}
          </nav>
        </div>
      )}

      {/* ── Personal details ── */}
      {activeTab === 'personal' && (
        <div className="mt-8 rounded-xl border border-slate-200 bg-white p-6 sm:p-8">
          <Section
            title="Personal details"
            description={
              isEditing
                ? 'Your email address is managed by your hospital and cannot be changed here.'
                : undefined
            }
          >
            {isEditing ? (
              <FieldGrid>
                <TextInput
                  label="Full name"
                  name="name"
                  value={profileData.name}
                  onChange={handleProfileChange}
                  placeholder="Your full name"
                />
                <TextInput
                  label="Email"
                  name="email"
                  value={profileData.email}
                  disabled
                  hint="Contact your administrator to change this."
                />
                <TextInput
                  label="Mobile"
                  name="mobile"
                  value={profileData.mobile}
                  onChange={handleProfileChange}
                  placeholder="Phone number"
                />
                <SelectInput
                  label="Status"
                  name="status"
                  value={profileData.status}
                  onChange={handleProfileChange}
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="suspended">Suspended</option>
                </SelectInput>
              </FieldGrid>
            ) : (
              <dl className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2">
                <ReadField label="Full name" value={profile?.name} />
                <ReadField label="Email" value={profile?.email} />
                <ReadField label="Mobile" value={profile?.mobile || profile?.phone} />
                <div>
                  <dt className="text-sm text-slate-500">Status</dt>
                  <dd className="mt-1.5">
                    <Pill tone={statusTone}>{profile?.status || 'active'}</Pill>
                  </dd>
                </div>
              </dl>
            )}
          </Section>

          {/* Account facts the user cannot edit. Separated by a rule rather
              than boxed in a tinted panel. */}
          <div className="mt-8 border-t border-slate-200 pt-8">
            <Section title="Account">
              <dl className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2">
                <ReadField
                  label="Registration number"
                  value={profile?.registration_no}
                  mono
                />
                <ReadField label="Role" value={<span className="capitalize">{roleLabel}</span>} />
                <div>
                  <dt className="text-sm text-slate-500">Access granted</dt>
                  <dd className="mt-1.5">
                    <Pill tone={profile?.access_granted ? 'positive' : 'negative'}>
                      {profile?.access_granted ? 'Yes' : 'No'}
                    </Pill>
                  </dd>
                </div>
                {hospital && <ReadField label="Hospital" value={hospital?.name} />}
              </dl>
            </Section>
          </div>
        </div>
      )}

      {/* ── Hospital details ── */}
      {activeTab === 'hospital' && hospital && (
        <div className="mt-8 rounded-xl border border-slate-200 bg-white p-6 sm:p-8">
          {/* Non-admins see this tab read-only; say so once, plainly, instead
              of letting them discover it by finding no inputs. */}
          {!isHospitalAdmin && (
            <div className="mb-8 flex items-start gap-2.5 rounded-lg bg-slate-50 px-4 py-3">
              <AlertCircle size={16} className="mt-0.5 shrink-0 text-slate-400" />
              <p className="text-sm text-slate-600">
                Only a hospital administrator can change these details.
              </p>
            </div>
          )}

          <Section title="Hospital logo">
            <div className="flex items-center gap-5">
              {hospitalData.logo_url ? (
                // eslint-disable-next-line @next/next/no-img-element -- remote R2 URL
                <img
                  src={hospitalData.logo_url}
                  alt=""
                  className="h-20 w-20 rounded-lg border border-slate-200 object-contain p-2"
                />
              ) : (
                <div className="flex h-20 w-20 items-center justify-center rounded-lg border border-dashed border-slate-300 text-slate-300">
                  <Building2 size={22} />
                </div>
              )}

              {isEditing && isHospitalAdmin && (
                <label
                  className={`inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 transition hover:border-brand-blue hover:text-brand-blue ${
                    uploadingLogo ? 'pointer-events-none opacity-50' : ''
                  }`}
                >
                  {uploadingLogo ? (
                    <Loader size={15} className="animate-spin" />
                  ) : (
                    <Upload size={15} />
                  )}
                  {uploadingLogo ? 'Uploading…' : 'Upload logo'}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleLogoUpload}
                    disabled={uploadingLogo}
                  />
                </label>
              )}
            </div>
          </Section>

          <div className="mt-8 border-t border-slate-200 pt-8">
            {isEditing && isHospitalAdmin ? (
              <>
                <Section title="Hospital information">
                  <FieldGrid>
                    <TextInput
                      label="Hospital name"
                      value={hospitalData.name}
                      disabled
                      hint="Set at registration and cannot be edited."
                    />
                    <TextInput
                      label="License number"
                      value={hospitalData.license_number}
                      disabled
                    />
                    <TextInput
                      label="Administrator name"
                      name="administrator_name"
                      value={hospitalData.administrator_name}
                      onChange={handleHospitalChange}
                    />
                    <TextInput
                      label="Hospital type"
                      name="hospital_type"
                      value={hospitalData.hospital_type}
                      onChange={handleHospitalChange}
                      placeholder="e.g. Multi-speciality"
                    />
                    <TextInput
                      label="Phone"
                      name="phone"
                      value={hospitalData.phone}
                      onChange={handleHospitalChange}
                    />
                    <TextInput
                      label="Website"
                      name="website"
                      value={hospitalData.website}
                      onChange={handleHospitalChange}
                      placeholder="https://"
                    />
                    <TextInput
                      label="Address"
                      name="address"
                      value={hospitalData.address}
                      onChange={handleHospitalChange}
                      className="sm:col-span-2"
                    />
                    <TextInput
                      label="City"
                      name="city"
                      value={hospitalData.city}
                      onChange={handleHospitalChange}
                    />
                    <TextInput
                      label="State"
                      name="state"
                      value={hospitalData.state}
                      onChange={handleHospitalChange}
                    />
                    <TextInput
                      label="Postal code"
                      name="postal_code"
                      value={hospitalData.postal_code}
                      onChange={handleHospitalChange}
                    />
                    <TextInput
                      label="Total beds"
                      name="total_beds"
                      type="number"
                      min="0"
                      value={hospitalData.total_beds}
                      onChange={handleHospitalChange}
                    />
                    <TextInput
                      label="ICU beds"
                      name="icu_beds"
                      type="number"
                      min="0"
                      value={hospitalData.icu_beds}
                      onChange={handleHospitalChange}
                    />
                  </FieldGrid>
                </Section>

                <div className="mt-8 border-t border-slate-200 pt-8">
                  <Section title="Services & features">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <CheckboxField
                        label="Emergency services"
                        name="emergency_services"
                        checked={hospitalData.emergency_services}
                        onChange={handleHospitalChange}
                      />
                      <CheckboxField
                        label="Inpatient services"
                        name="inpatient_services"
                        checked={hospitalData.inpatient_services}
                        onChange={handleHospitalChange}
                      />
                      <CheckboxField
                        label="Ambulance services"
                        name="ambulance_services"
                        checked={hospitalData.ambulance_services}
                        onChange={handleHospitalChange}
                      />
                      <CheckboxField
                        label="Feedback enabled"
                        name="feedback_enabled"
                        checked={hospitalData.feedback_enabled}
                        onChange={handleHospitalChange}
                      />
                    </div>
                  </Section>
                </div>
              </>
            ) : (
              <>
                <Section title="Hospital information">
                  <dl className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2">
                    <ReadField label="Hospital name" value={hospital?.name} />
                    <ReadField label="License number" value={hospital?.license_number} mono />
                    <ReadField label="Administrator" value={hospital?.administrator_name} />
                    <ReadField label="Hospital type" value={hospital?.hospital_type} />
                    <ReadField label="Phone" value={hospital?.phone} />
                    <ReadField label="Email" value={hospital?.email} />
                    <ReadField
                      label="Address"
                      value={hospital?.address}
                      className="sm:col-span-2"
                    />
                    <ReadField
                      label="City / State"
                      value={
                        [hospital?.city, hospital?.state, hospital?.postal_code]
                          .filter(Boolean)
                          .join(', ') || null
                      }
                    />
                    <ReadField label="Website" value={hospital?.website} />
                    <ReadField label="Total beds" value={hospital?.total_beds} />
                    <ReadField label="ICU beds" value={hospital?.icu_beds} />
                    <ReadField label="Account status" value={hospital?.account_status} />
                  </dl>
                </Section>

                <div className="mt-8 border-t border-slate-200 pt-8">
                  <Section title="Available services">
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <ServiceState label="Emergency" on={hospital?.emergency_services} />
                      <ServiceState label="Inpatient" on={hospital?.inpatient_services} />
                      <ServiceState label="Ambulance" on={hospital?.ambulance_services} />
                      <ServiceState label="Feedback" on={hospital?.feedback_enabled} />
                    </div>
                  </Section>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Save bar ────────────────────────────────────────────────────────
          Sticks to the bottom of the viewport while editing, so on the long
          hospital form the actions are reachable without scrolling back. */}
      {isEditing && (
        <div className="sticky bottom-0 mt-6 flex items-center justify-end gap-3 rounded-xl border border-slate-200 bg-white/95 px-4 py-3 backdrop-blur">
          <button
            onClick={() => setIsEditing(false)}
            disabled={isSaving}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
          >
            <X size={15} />
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="inline-flex items-center gap-2 rounded-lg bg-brand-blue px-4 py-2.5 text-sm font-medium text-white transition hover:bg-brand-blue-deep disabled:opacity-50"
          >
            {isSaving ? <Loader size={15} className="animate-spin" /> : <Save size={15} />}
            {isSaving ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      )}
    </div>
  )
}
