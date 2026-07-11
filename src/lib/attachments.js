import { supabase } from './supabase'
import { useAuthStore } from '../stores/authStore'

const BUCKET = 'attachments' // same bucket desktop's sync_manager.py uploads to

const EXT_BY_MIME = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/gif': 'gif',
  'image/webp': 'webp',
  'image/svg+xml': 'svg',
}

export function dataUrlToBlob(dataUrl) {
  const match = dataUrl.match(/^data:(.*?);base64,(.*)$/)
  if (!match) throw new Error('Not a base64 data URL')
  const [, mime, b64] = match
  const bin = atob(b64)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return new Blob([bytes], { type: mime })
}

/**
 * Uploads an image blob to Supabase Storage and records it in the
 * `attachments` Postgres table — the exact same bucket/path convention
 * and table schema desktop's sync_manager.py::_push_attachments() uses
 * (`<user_id>/<relative_path>` in Storage, `relative_path` = `<note_id>/<uuid>.<ext>`
 * in the row). This is what makes desktop's own `_pull_attachments()` able
 * to discover and download images that were added from web, exactly as if
 * another desktop instance had added them.
 *
 * Returns the `relative_path` to store in the image block's `local` field.
 * Throws on failure — callers should catch and fall back to keeping the
 * image as an inline data: URL rather than losing it.
 */
export async function uploadImageBlob(blob, noteId) {
  const uid = useAuthStore.getState().user?.id
  if (!uid) throw new Error('Chưa đăng nhập')
  if (!noteId) throw new Error('Thiếu note_id')

  const ext = EXT_BY_MIME[blob.type] || 'png'
  const relativePath = `${noteId}/${crypto.randomUUID()}.${ext}`
  const storagePath = `${uid}/${relativePath}`

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, blob, { contentType: blob.type || 'image/png', upsert: false })
  if (uploadError) throw uploadError

  const now = new Date().toISOString()
  const { error: dbError } = await supabase.from('attachments').insert({
    id: crypto.randomUUID(),
    user_id: uid,
    note_id: noteId,
    relative_path: relativePath,
    is_deleted: false,
    updated_at: now,
  })
  if (dbError) {
    // Metadata row failed but the file itself is safely in Storage —
    // clean it up so we don't leak an unreferenced object.
    await supabase.storage.from(BUCKET).remove([storagePath]).catch(() => {})
    throw dbError
  }

  return relativePath
}
