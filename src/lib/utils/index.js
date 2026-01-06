import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

export function formatDate(date) {
  if (!date) return ''
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export function formatTime(date) {
  if (!date) return ''
  return new Date(date).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  })
}

export function formatDateTime(date) {
  if (!date) return ''
  return new Date(date).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  })
}

export function formatCurrency(amount) {
  if (amount == null) return '$0.00'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount)
}

export function generateHospitalId() {
  const randomNum = Math.floor(Math.random() * 100000)
    .toString()
    .padStart(5, '0')
  return `HOSP${randomNum}`
}

export function generateUserId(role = 'user') {
  const rolePrefix = {
    super_admin: 'SADM',
    hospital_admin: 'HADM',
    doctor: 'DOCT',
    reception: 'RECEP',
    nurse: 'NURS',
    patient: 'PATI',
  }
  const prefix = rolePrefix[role] || role.substring(0, 4).toUpperCase()
  const randomNum = Math.floor(Math.random() * 100000)
    .toString()
    .padStart(5, '0')
  return `${prefix}${randomNum}`
}

export function generateId() {
  return Math.random().toString(36).substring(2, 15)
}
