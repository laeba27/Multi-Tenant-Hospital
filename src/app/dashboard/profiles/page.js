'use client'

import { useState, useEffect } from 'react'
import { Mail, Phone, Building2, User, Edit2, Save, X, Upload, AlertCircle, Loader } from 'lucide-react'
import { useUserDetails } from '@/hooks/use-user-details'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'

export default function ProfilePage() {
  const { profile, hospital, isLoading, error } = useUserDetails()
  const [activeTab, setActiveTab] = useState('personal')
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [avatarPreview, setAvatarPreview] = useState(null)

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

    try {
      const supabase = createClient()
      const fileName = `avatar-${Date.now()}-${file.name}`
      const { data, error } = await supabase.storage
        .from('hospital')
        .upload(`avatar/${fileName}`, file)

      if (error) throw error

      const { data: { publicUrl } } = supabase.storage
        .from('hospital')
        .getPublicUrl(`avatar/${fileName}`)

      setProfileData(prev => ({
        ...prev,
        avatar_url: publicUrl,
      }))
      setAvatarPreview(publicUrl)
      toast.success('Avatar uploaded successfully')
    } catch (error) {
      toast.error('Error uploading avatar')
      console.error(error)
    }
  }

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      const supabase = createClient()
      const fileName = `logo-${Date.now()}-${file.name}`
      const { data, error } = await supabase.storage
        .from('hospital')
        .upload(`logo/${fileName}`, file)

      if (error) throw error

      const { data: { publicUrl } } = supabase.storage
        .from('hospital')
        .getPublicUrl(`logo/${fileName}`)

      setHospitalData(prev => ({
        ...prev,
        logo_url: publicUrl,
      }))
      toast.success('Logo uploaded successfully')
    } catch (error) {
      toast.error('Error uploading logo')
      console.error(error)
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
          account_status: hospitalData.account_status,
          logo_url: hospitalData.logo_url,
        }
      }

      const response = await fetch('/api/profile/update', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })

      const data = await response.json()

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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader className="animate-spin h-12 w-12 text-indigo-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading profile...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
        <AlertCircle className="text-red-600 flex-shrink-0 mt-0.5" size={20} />
        <p className="text-red-700">{error}</p>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Profile</h1>
          <p className="text-gray-600 mt-1">Manage your account information</p>
        </div>
        {!isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
          >
            <Edit2 size={18} />
            Edit Profile
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-gray-200 mb-6">
        <button
          onClick={() => setActiveTab('personal')}
          className={`px-4 py-3 font-medium transition flex items-center gap-2 ${
            activeTab === 'personal'
              ? 'text-indigo-600 border-b-2 border-indigo-600 -mb-[2px]'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <User size={18} />
          Personal Details
        </button>
        {hospital && (
          <button
            onClick={() => setActiveTab('hospital')}
            className={`px-4 py-3 font-medium transition flex items-center gap-2 ${
              activeTab === 'hospital'
                ? 'text-indigo-600 border-b-2 border-indigo-600 -mb-[2px]'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Building2 size={18} />
            Hospital Details
            {!isHospitalAdmin && <span className="ml-2 text-xs bg-gray-200 px-2 py-1 rounded">Read Only</span>}
          </button>
        )}
      </div>

      {/* Personal Details Tab */}
      {activeTab === 'personal' && (
        <div className="bg-white rounded-lg shadow p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Avatar Section */}
            <div className="md:col-span-1">
              <div className="space-y-4">
                <h3 className="font-semibold text-gray-900">Profile Picture</h3>
                <div className="flex flex-col items-center">
                  {avatarPreview ? (
                    <img
                      src={avatarPreview}
                      alt="Avatar"
                      className="w-32 h-32 rounded-full object-cover border-4 border-indigo-100 mb-4"
                    />
                  ) : (
                    <div className="w-32 h-32 bg-indigo-600 rounded-full flex items-center justify-center text-white text-4xl font-bold mb-4">
                      {profile?.name?.charAt(0).toUpperCase()}
                    </div>
                  )}
                  {isEditing && (
                    <label className="flex items-center gap-2 cursor-pointer px-4 py-2 bg-indigo-100 text-indigo-600 rounded-lg hover:bg-indigo-200 transition">
                      <Upload size={16} />
                      Upload Avatar
                      <input type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
                    </label>
                  )}
                </div>
              </div>
            </div>

            {/* Profile Form */}
            <div className="md:col-span-2 space-y-4">
              {isEditing ? (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
                    <input
                      type="text"
                      name="name"
                      value={profileData.name}
                      onChange={handleProfileChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Email (Read Only)</label>
                    <input
                      type="email"
                      value={profileData.email}
                      disabled
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-500 cursor-not-allowed"
                    />
                    <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Mobile Number</label>
                    <input
                      type="tel"
                      name="mobile"
                      value={profileData.mobile}
                      onChange={handleProfileChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                    <select
                      name="status"
                      value={profileData.status}
                      onChange={handleProfileChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                      <option value="suspended">Suspended</option>
                    </select>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <p className="text-sm text-gray-600">Full Name</p>
                    <p className="text-lg font-semibold text-gray-900">{profile?.name}</p>
                  </div>

                  <div>
                    <p className="text-sm text-gray-600">Email</p>
                    <p className="text-lg font-semibold text-gray-900">{profile?.email}</p>
                  </div>

                  <div>
                    <p className="text-sm text-gray-600">Mobile</p>
                    <p className="text-lg font-semibold text-gray-900">{profile?.mobile || profile?.phone || '-'}</p>
                  </div>

                  <div>
                    <p className="text-sm text-gray-600">Status</p>
                    <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${
                      profile?.status === 'active'
                        ? 'bg-green-100 text-green-800'
                        : profile?.status === 'inactive'
                        ? 'bg-gray-100 text-gray-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {profile?.status || 'active'}
                    </span>
                  </div>
                </>
              )}

              {/* Info Card */}
              <div className="bg-indigo-50 rounded-lg p-4 mt-6 space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-700">Registration No.</span>
                  <span className="font-mono font-semibold">{profile?.registration_no}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-700">Role</span>
                  <span className="font-semibold capitalize">{profile?.role?.replace('_', ' ')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-700">Access Granted</span>
                  <span className={`font-semibold ${profile?.access_granted ? 'text-green-600' : 'text-red-600'}`}>
                    {profile?.access_granted ? 'Yes' : 'No'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Hospital Details Tab */}
      {activeTab === 'hospital' && hospital && (
        <div className="bg-white rounded-lg shadow p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Hospital Logo */}
            <div className="md:col-span-1">
              <h3 className="font-semibold text-gray-900 mb-4">Hospital Logo</h3>
              <div className="flex flex-col items-center">
                {hospitalData.logo_url ? (
                  <img
                    src={hospitalData.logo_url}
                    alt="Hospital Logo"
                    className="w-40 h-40 object-contain border-2 border-gray-200 rounded-lg p-2 mb-4"
                  />
                ) : (
                  <div className="w-40 h-40 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400 mb-4">
                    <Building2 size={48} />
                  </div>
                )}
                {isEditing && isHospitalAdmin && (
                  <label className="flex items-center gap-2 cursor-pointer px-4 py-2 bg-indigo-100 text-indigo-600 rounded-lg hover:bg-indigo-200 transition">
                    <Upload size={16} />
                    Upload Logo
                    <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                  </label>
                )}
              </div>
            </div>

            {/* Read-Only Basic Info */}
            <div className="md:col-span-1 space-y-4">
              <div>
                <p className="text-sm text-gray-600">Hospital Name</p>
                <p className="text-lg font-semibold text-gray-900">{hospital?.name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">License Number</p>
                <p className="text-lg font-semibold text-gray-900 font-mono">{hospital?.license_number}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Registration No.</p>
                <p className="text-lg font-semibold text-gray-900 font-mono">{hospital?.registration_no}</p>
              </div>
            </div>
          </div>

          {/* Editable Hospital Details */}
          {isEditing && isHospitalAdmin && (
            <div className="border-t pt-6 space-y-4">
              <h3 className="font-semibold text-gray-900">Edit Hospital Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                  <input
                    type="text"
                    name="address"
                    value={hospitalData.address}
                    onChange={handleHospitalChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                  <input
                    type="text"
                    name="city"
                    value={hospitalData.city}
                    onChange={handleHospitalChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                  <input
                    type="text"
                    name="state"
                    value={hospitalData.state}
                    onChange={handleHospitalChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Postal Code</label>
                  <input
                    type="text"
                    name="postal_code"
                    value={hospitalData.postal_code}
                    onChange={handleHospitalChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <input
                    type="tel"
                    name="phone"
                    value={hospitalData.phone}
                    onChange={handleHospitalChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Administrator Name</label>
                  <input
                    type="text"
                    name="administrator_name"
                    value={hospitalData.administrator_name}
                    onChange={handleHospitalChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Hospital Type</label>
                  <input
                    type="text"
                    name="hospital_type"
                    value={hospitalData.hospital_type}
                    onChange={handleHospitalChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Website</label>
                  <input
                    type="url"
                    name="website"
                    value={hospitalData.website}
                    onChange={handleHospitalChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Total Beds</label>
                  <input
                    type="number"
                    name="total_beds"
                    value={hospitalData.total_beds}
                    onChange={handleHospitalChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">ICU Beds</label>
                  <input
                    type="number"
                    name="icu_beds"
                    value={hospitalData.icu_beds}
                    onChange={handleHospitalChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Account Status</label>
                  <select
                    name="account_status"
                    value={hospitalData.account_status}
                    onChange={handleHospitalChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                    <option value="Suspended">Suspended</option>
                  </select>
                </div>
              </div>

              {/* Services */}
              <div className="border-t pt-4 mt-4">
                <h4 className="font-semibold text-gray-900 mb-3">Services & Features</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      name="emergency_services"
                      checked={hospitalData.emergency_services}
                      onChange={handleHospitalChange}
                      className="w-4 h-4 text-indigo-600 rounded"
                    />
                    <span className="text-sm text-gray-700">Emergency Services</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      name="inpatient_services"
                      checked={hospitalData.inpatient_services}
                      onChange={handleHospitalChange}
                      className="w-4 h-4 text-indigo-600 rounded"
                    />
                    <span className="text-sm text-gray-700">Inpatient Services</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      name="ambulance_services"
                      checked={hospitalData.ambulance_services}
                      onChange={handleHospitalChange}
                      className="w-4 h-4 text-indigo-600 rounded"
                    />
                    <span className="text-sm text-gray-700">Ambulance Services</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      name="feedback_enabled"
                      checked={hospitalData.feedback_enabled}
                      onChange={handleHospitalChange}
                      className="w-4 h-4 text-indigo-600 rounded"
                    />
                    <span className="text-sm text-gray-700">Feedback Enabled</span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Read-Only Hospital Details */}
          {!isEditing && (
            <div className="border-t pt-6 space-y-4">
              <h3 className="font-semibold text-gray-900">Hospital Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <p className="text-sm text-gray-600">Address</p>
                  <p className="text-gray-900">{hospital?.address}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">City / State</p>
                  <p className="text-gray-900">{hospital?.city}, {hospital?.state} {hospital?.postal_code}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Phone</p>
                  <p className="text-gray-900">{hospital?.phone}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Email</p>
                  <p className="text-gray-900">{hospital?.email}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Hospital Type</p>
                  <p className="text-gray-900">{hospital?.hospital_type || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Beds</p>
                  <p className="text-gray-900">{hospital?.total_beds || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">ICU Beds</p>
                  <p className="text-gray-900">{hospital?.icu_beds || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Status</p>
                  <p className="text-gray-900">{hospital?.account_status}</p>
                </div>
              </div>

              {/* Services Info */}
              <div className="border-t pt-4">
                <h4 className="font-semibold text-gray-900 mb-3">Available Services</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className={`p-2 rounded text-sm text-center font-medium ${hospital?.emergency_services ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                    Emergency
                  </div>
                  <div className={`p-2 rounded text-sm text-center font-medium ${hospital?.inpatient_services ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                    Inpatient
                  </div>
                  <div className={`p-2 rounded text-sm text-center font-medium ${hospital?.ambulance_services ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                    Ambulance
                  </div>
                  <div className={`p-2 rounded text-sm text-center font-medium ${hospital?.feedback_enabled ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                    Feedback
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Action Buttons */}
      {isEditing && (
        <div className="flex gap-3 mt-6">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50 font-medium"
          >
            <Save size={18} />
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
          <button
            onClick={() => setIsEditing(false)}
            disabled={isSaving}
            className="flex items-center gap-2 px-6 py-3 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition disabled:opacity-50 font-medium"
          >
            <X size={18} />
            Cancel
          </button>
        </div>
      )}
    </div>
  )
}
