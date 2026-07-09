// bridge_shim.js — makes the desktop block-editor HTML run unmodified inside
// a browser <iframe>. On desktop, PySide6's QWebChannel wires up
// `window.bridge` to a real Python QObject over a native transport. Here we
// fake just enough of that API surface (`QWebChannel` + `qt.webChannelTransport`)
// that editor_template.html's own init code (`new QWebChannel(...)`) works
// unchanged, and instead of talking to Python, `bridge.<method>(...)` calls
// get forwarded to the parent window (EditorFrame.jsx) via postMessage.
//
// Methods that take a JS callback as their last argument (e.g.
// `get_theme(cb)`, `request_image_data(path, cb)`) are supported: we generate
// a call id, stash the callback, and resolve it when the parent replies with
// a matching `bridge-response` message.
(function () {
  'use strict';

  window.qt = { webChannelTransport: {} };

  let _seq = 0;
  const _pending = new Map(); // callId -> callback fn

  // Methods known to accept a trailing JS-callback argument (mirrors the
  // Python side's @Slot(..., result=...) equivalents used with a JS callback).
  const CALLBACK_METHODS = new Set([
    'get_theme',
    'get_note_list',
    'request_image_data',
    'request_pdf_data',
  ]);

  function postToParent(method, args) {
    const callId = `${method}-${++_seq}`;
    window.parent.postMessage(
      { source: 'galaxynote-editor', type: 'bridge-call', method, args, callId },
      '*'
    );
    return callId;
  }

  function makeBridge() {
    const bridge = {};
    const handler = {
      get(_target, method) {
        return function (...args) {
          if (CALLBACK_METHODS.has(method) && typeof args[args.length - 1] === 'function') {
            const cb = args.pop();
            const callId = postToParent(method, args);
            _pending.set(callId, cb);
          } else {
            postToParent(method, args);
          }
        };
      },
    };
    return new Proxy(bridge, handler);
  }

  window.addEventListener('message', (event) => {
    const data = event.data;
    if (!data || data.source !== 'galaxynote-host') return;
    if (data.type === 'bridge-response') {
      const cb = _pending.get(data.callId);
      if (cb) { _pending.delete(data.callId); cb(data.result); }
    } else if (data.type === 'set-content') {
      // Host tells us which note to load. `_loading` guard inside the editor
      // itself prevents this from firing spurious on_change events.
      try { window.editorCmd && window.editorCmd.setContent(data.content); } catch (e) { console.error(e); }
    } else if (data.type === 'apply-theme') {
      try { window.editorCmd && window.editorCmd.applyTheme(data.theme); } catch (e) { console.error(e); }
    }
  });

  // "Open containing folder" (📂) only makes sense with a local filesystem —
  // on web there's no folder to open, so we relabel it to a download icon.
  // This is COSMETIC ONLY: we don't touch the button's click handler or any
  // other editor logic, it still calls bridge.open_local_folder(path) exactly
  // as before — EditorFrame.jsx just answers that call differently on web
  // (triggers a browser download instead of opening a folder).
  function relabelFolderButtons(root) {
    root.querySelectorAll('.img-bar button').forEach((btn) => {
      if (btn.textContent === '📂' && btn.dataset.webRelabeled !== '1') {
        btn.textContent = '💾';
        btn.title = 'Tải ảnh về máy';
        btn.dataset.webRelabeled = '1';
      }
    });
  }
  const relabelObserver = new MutationObserver(() => relabelFolderButtons(document.body));
  document.addEventListener('DOMContentLoaded', () => {
    relabelFolderButtons(document.body);
    relabelObserver.observe(document.body, { childList: true, subtree: true });
  });

  window.QWebChannel = function (_transport, callback) {
    // Real QWebChannel is async over a socket; ours can resolve on the next
    // microtask so any listeners the caller attaches synchronously still run.
    Promise.resolve().then(() => callback({ objects: { bridge: makeBridge() } }));
  };

  // Let the host know the iframe document is alive (before QWebChannel's own
  // on_ready handshake, which needs get_theme/on_ready to round-trip).
  window.parent.postMessage({ source: 'galaxynote-editor', type: 'shim-ready' }, '*');
})();
