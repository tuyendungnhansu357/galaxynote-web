# galaxynote-web — Sprint 4 skeleton

Web companion to the GalaxyNote desktop app. Same Supabase project, same
account, same data — "Tag = hành tinh, Note = vệ tinh" trên trình duyệt.

## Stack

- Vite + React 19 (JS, not TS — matches the fast-iteration style of the rest
  of the project; easy to add TS later if you want it)
- Tailwind CSS v4 (via `@tailwindcss/vite`, no `tailwind.config.js` needed —
  tokens live in `src/index.css` under `@theme`)
- Zustand for state (`src/stores`)
- `@supabase/supabase-js` for Auth + Postgres + Realtime
- `3d-force-graph` + `three` for the Galaxy view (same library the desktop
  app's `graph_template.html` uses)
- `react-router-dom` for the 3 routes: `/auth`, `/`, `/graph`

## Getting started

```bash
npm install
npm run dev
```

`.env.local` already has the real `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`
(the anon key is safe to ship in a client bundle — that's what it's for).
`.env.example` is the template if you ever rotate keys or spin up a second
Supabase project.

Sign in with the **same account you use on desktop** — Supabase Auth is
shared, and this reads/writes the exact same `notes` / `tags` / `tag_relations`
/ `note_tags` / `links` / `tasks` tables `sync_manager.py` already pushes to.

## Folder structure

```
src/
├── components/
│   ├── editor/     EditorFrame (iframe + bridge), NoteEditorWidget (title+chips+editor)
│   ├── sidebar/     Sidebar, NoteList, TagTree
│   ├── graph/        GalaxyGraph (3d-force-graph wrapper)
│   └── ui/              Button, Input, LoadingScreen
├── pages/            AuthPage, HomePage, GraphPage
├── stores/          authStore, noteStore, tagStore (Zustand)
├── lib/                 supabase.js (client), graphBuilder.js (JS port of graph_builder.py)
└── hooks/             useNotes, useTags, useSync (Realtime)
public/editor/
├── editor_template.html   <- copied verbatim from desktop resources/html/
└── bridge_shim.js             <- the ONLY web-specific addition, see below
```

## How the block editor works in the browser

`public/editor/editor_template.html` is **byte-for-byte the desktop file**
except for one added `<script>` tag near the top that loads `bridge_shim.js`
before the original `qrc:///qtwebchannel/qwebchannel.js` tag (which 404s
harmlessly in a browser and is otherwise ignored).

- Desktop: `window.bridge` is a real Python `QObject`, wired by PySide6's
  `QWebChannel` over a native socket.
- Web: `bridge_shim.js` polyfills `window.QWebChannel` and
  `qt.webChannelTransport` so the *same* `new QWebChannel(...)` call inside
  `editor_template.html` still runs — it just forwards every `bridge.*` call
  to the parent window via `postMessage`, and `EditorFrame.jsx` answers them.

This means all 4 editor bugs already fixed on desktop (SPEC section 9.6),
the task-block behavior, and the `#tag` autocomplete all keep working
unchanged on web — there's exactly one editor implementation, not two.

**Not wired up yet (flagged in `EditorFrame.jsx` with a comment):**
image/PDF attachment round-tripping (`request_image_data`, `request_pdf_data`,
`request_save_pasted_image`, `request_delete_image`). Pasted images that end
up as inline `data:` URLs in the block JSON still work fine; only the
"re-fetch a locally-stored attachment by path" flow needs a Supabase Storage
version of what desktop's `storage.py` does. That's the natural next slice
of work, not a blocker for Auth + basic note/tag CRUD.

## What's done vs. what's next

**Done in this pass:**
- Auth (sign in / sign up / sign out, session persistence)
- Notes: list, create, rename (debounced), soft-delete, pin
- Tags: full CRUD via a `TagManagerModal` (name, color, icon, description,
  **Space flag**, parent/child relations) — opened from the "Quản lý Tag"
  button on the sidebar's Tags tab. Mirrors `ui/tag_manager_dialog.py`
  (same 12-color preset palette, same Space checkbox, same Parent/Child
  panels); tag merge isn't ported yet (see below)
- Realtime sync: a change on desktop appears in the browser tab within ~1s,
  and vice versa (`useSync.js`, via Supabase Postgres Changes)
- Galaxy 3D view at `/graph`, same node-sizing/coloring/edge rules as
  `core/graph_builder.py` (ported line-for-line in `lib/graphBuilder.js`)
- Block editor fully functional for text editing, reusing the desktop HTML/JS

**Natural next steps:**
- Tag merge (source → target), matching `tag_manager.merge_tags()`
- Attachment upload from the browser (paste/drop image → Supabase Storage)
- Backlinks panel, search bar with the `#tag` / `done:no` / `pinned:yes`
  syntax, daily notes
- Deploy to Vercel (`vercel.json` already has the SPA rewrite rule)
