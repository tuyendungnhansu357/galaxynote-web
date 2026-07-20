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
 * Uploads any file blob to Supabase Storage and records it in the
 * `attachments` Postgres table — the exact same bucket/path convention and
 * table schema desktop's sync_manager.py::_push_attachments() uses
 * (`<user_id>/<relative_path>` in Storage, `relative_path` = `<note_id>/<uuid>.<ext>`
 * in the row). This is what makes desktop's own `_pull_attachments()` able
 * to discover and download files that were added from web, exactly as if
 * another desktop instance had added them.
 *
 * Returns the `relative_path` to store in the block's `local` field.
 * Throws on failure — callers should catch and fall back to keeping the
 * file as an inline data: URL rather than losing it.
 */
export async function uploadFileBlob(blob, noteId, ext) {
  const uid = useAuthStore.getState().user?.id
  if (!uid) throw new Error('Chưa đăng nhập')
  if (!noteId) throw new Error('Thiếu note_id')

  const relativePath = `${noteId}/${crypto.randomUUID()}.${ext}`
  const storagePath = `${uid}/${relativePath}`

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, blob, { contentType: blob.type || 'application/octet-stream', upsert: false })
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

/** Thin wrapper over uploadFileBlob for images — picks the extension from MIME type. */
export async function uploadImageBlob(blob, noteId) {
  const ext = EXT_BY_MIME[blob.type] || 'png'
  return uploadFileBlob(blob, noteId, ext)
}

/** Thin wrapper over uploadFileBlob for PDFs. */
export async function uploadPdfBlob(blob, noteId) {
  return uploadFileBlob(blob, noteId, 'pdf')
}

// ── Orphan attachment cleanup ────────────────────────────────────────────
// Web port of core/attachment_cleanup.py. Scope is a little different from
// desktop by necessity, not oversight: desktop only scans its
// attachments/imported/ subfolder (files core/url_importer.py downloaded),
// since regular pasted/uploaded images live elsewhere on disk. Web has no
// such split — every image (pasted, uploaded, or imported) is one flat
// `attachments` table + Storage bucket — so this checks ALL of the user's
// attachment rows against what's still referenced, not just imported ones.

function collectReferencedPaths(notes) {
  const referenced = new Set()
  function walk(blocks) {
    for (const b of blocks || []) {
      if (b.t === 'image' && b.local) referenced.add(b.local)
      if (b.t === 'toggle' || b.t === 'callout') walk(b.children)
      if (b.t === 'columns') (b.cols || []).forEach(walk)
    }
  }
  for (const note of notes) {
    try {
      const data = JSON.parse(note.content || '{}')
      if (data.v === 4) walk(data.blocks)
    } catch { /* skip unparseable content */ }
  }
  return referenced
}

/**
 * Finds attachment rows whose file isn't referenced by any note's content
 * (note deleted, or the image block was removed but the file never got
 * cleaned up). Returns { orphans, total } — orphans is the list of rows
 * that would be deleted, total is how many attachment rows exist overall.
 */
export async function findOrphanAttachments(notes) {
  const uid = userIdFor()
  if (!uid) return { orphans: [], total: 0 }
  const { data, error } = await supabase
    .from('attachments')
    .select('id, relative_path, note_id')
    .eq('user_id', uid)
    .eq('is_deleted', false)
  if (error || !data) return { orphans: [], total: 0 }

  const referenced = collectReferencedPaths(notes)
  const orphans = data.filter((row) => !referenced.has(row.relative_path))
  return { orphans, total: data.length }
}

/** Deletes the given orphan attachment rows' Storage objects and marks the rows deleted. */
export async function deleteOrphanAttachments(orphans) {
  const uid = userIdFor()
  if (!uid || !orphans.length) return 0

  const storagePaths = orphans.map((o) => `${uid}/${o.relative_path}`)
  await supabase.storage.from(BUCKET).remove(storagePaths).catch(() => {})

  const now = new Date().toISOString()
  const ids = orphans.map((o) => o.id)
  const { error } = await supabase
    .from('attachments')
    .update({ is_deleted: true, updated_at: now })
    .in('id', ids)
  return error ? 0 : orphans.length
}

function userIdFor() {
  return useAuthStore.getState().user?.id
}
