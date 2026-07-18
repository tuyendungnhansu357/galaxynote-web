import { create } from 'zustand'

// Lets the global TopBar → Edit menu call Undo/Redo on whichever note is
// currently open, without threading the EditorFrame ref through
// HomePage → TopBar as props. NoteEditorWidget registers/clears this as
// notes open, close, or switch.
export const useActiveEditorStore = create((set) => ({
  editor: null, // the EditorFrame imperative handle ({ exec, execRaw, isReady, ... })
  ready: false, // mirrors NoteEditorWidget's `ready` (iframe's on_ready fired)
  setEditor: (editor) => set({ editor }),
  setReady: (ready) => set({ ready }),
}))
