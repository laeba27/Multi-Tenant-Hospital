import 'server-only'

import { randomUUID } from 'crypto'
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

/**
 * Cloudflare R2. Speaks the S3 API, so we drive it with the AWS SDK.
 *
 * The bucket is PRIVATE. R2 has no row-level security, so Postgres (the
 * `documents` table) is the only authority on who may read a file, and nothing
 * is ever served from a stable public URL -- private objects are fetched via a
 * short-lived signed URL minted only after a server action has checked
 * ownership. Leaking an object key is therefore harmless on its own.
 */

const ACCOUNT_ID = process.env.R2_ACCOUNT_ID
const ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID
const SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY
const BUCKET = process.env.R2_BUCKET_NAME

// Only set this if you attach a public custom domain / r2.dev URL to the bucket
// for the genuinely public assets (hospital gallery, notice images). Medical
// files are never served through it.
const PUBLIC_BASE_URL = process.env.NEXT_PUBLIC_R2_PUBLIC_URL || null

export function isR2Configured() {
  return Boolean(ACCOUNT_ID && ACCESS_KEY_ID && SECRET_ACCESS_KEY && BUCKET)
}

let _client = null
function client() {
  if (!isR2Configured()) {
    throw new Error(
      'Cloudflare R2 is not configured. Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, ' +
        'R2_SECRET_ACCESS_KEY and R2_BUCKET_NAME in .env.local'
    )
  }
  if (!_client) {
    _client = new S3Client({
      region: 'auto',
      endpoint: `https://${ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId: ACCESS_KEY_ID, secretAccessKey: SECRET_ACCESS_KEY },
    })
  }
  return _client
}

/** What each surface is allowed to receive, and how big. */
export const UPLOAD_RULES = {
  avatar: {
    maxBytes: 5 * 1024 * 1024, // 5 MB
    mimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
    isPublic: false,
  },
  hospital_media: {
    maxBytes: 10 * 1024 * 1024, // 10 MB
    mimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
    isPublic: true,
  },
  notice_media: {
    maxBytes: 10 * 1024 * 1024,
    mimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
    isPublic: true,
  },
  prescription: {
    maxBytes: 20 * 1024 * 1024, // 20 MB -- scanned PDFs get large
    mimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
    isPublic: false,
  },
  medical_report: {
    maxBytes: 20 * 1024 * 1024,
    mimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
    isPublic: false,
  },
}

/**
 * Reject anything we would not want in the bucket. Called on the SERVER with
 * the real bytes -- never trust a size or type the browser reported.
 */
export function validateUpload(scope, { mimeType, sizeBytes }) {
  const rule = UPLOAD_RULES[scope]
  if (!rule) return { ok: false, error: `Unknown upload type: ${scope}` }

  if (!rule.mimeTypes.includes(mimeType)) {
    const allowed = rule.mimeTypes.map((m) => m.split('/')[1].toUpperCase()).join(', ')
    return { ok: false, error: `That file type isn't allowed here. Accepted: ${allowed}.` }
  }
  if (!sizeBytes || sizeBytes <= 0) {
    return { ok: false, error: 'That file is empty.' }
  }
  if (sizeBytes > rule.maxBytes) {
    return {
      ok: false,
      error: `That file is too large. Maximum ${Math.round(rule.maxBytes / 1024 / 1024)} MB.`,
    }
  }
  return { ok: true, rule }
}

const EXT_BY_MIME = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'application/pdf': 'pdf',
}

/**
 * Build the object key. Namespaced by scope + owner so a listing is cheap and
 * one hospital's media can never collide with another's.
 *
 * The filename is a fresh UUID, never the user's: an uploaded name like
 * "../../secret.pdf" must not be able to escape its prefix, and two patients
 * uploading "report.pdf" must not collide.
 */
export function buildStorageKey(scope, { hospitalId, patientId, profileId, mimeType }) {
  const ext = EXT_BY_MIME[mimeType] || 'bin'
  const id = randomUUID()

  switch (scope) {
    case 'avatar':
      return `avatar/${profileId}/${id}.${ext}`
    case 'hospital_media':
      return `hospital_media/${hospitalId}/${id}.${ext}`
    case 'notice_media':
      return `notice_media/${hospitalId}/${id}.${ext}`
    case 'prescription':
      return `prescription/${hospitalId}/${patientId}/${id}.${ext}`
    case 'medical_report':
      return `medical_report/${hospitalId}/${patientId}/${id}.${ext}`
    default:
      throw new Error(`Unknown scope: ${scope}`)
  }
}

/** Put the bytes in the bucket. Returns nothing useful -- the key is the handle. */
export async function putObject({ key, body, mimeType }) {
  await client().send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: body,
      ContentType: mimeType,
    })
  )
  return key
}

/**
 * A time-limited URL for a PRIVATE object. Callers must have already checked
 * that this user is allowed the file -- this function does no authorisation.
 *
 * Short-lived on purpose: if a URL is copied out of a browser or into a log, it
 * stops working quickly.
 */
export async function getSignedDownloadUrl(key, { expiresIn = 300, fileName } = {}) {
  const command = new GetObjectCommand({
    Bucket: BUCKET,
    Key: key,
    // Makes the browser download with the original name rather than the UUID.
    ...(fileName
      ? { ResponseContentDisposition: `inline; filename="${fileName.replace(/"/g, '')}"` }
      : {}),
  })
  return getSignedUrl(client(), command, { expiresIn })
}

/**
 * The stable URL for a PUBLIC object (hospital gallery, notice images). Returns
 * null when no public domain is configured, so callers fall back to signing.
 */
export function getPublicUrl(key) {
  if (!PUBLIC_BASE_URL) return null
  return `${PUBLIC_BASE_URL.replace(/\/$/, '')}/${key}`
}

export async function deleteObject(key) {
  await client().send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }))
}
