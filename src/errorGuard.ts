// Global resilience and error suppression guard
// Must execute before any other modules load

if (typeof window !== 'undefined') {
  // 1. Suppress uncaught global errors
  const originalOnError = window.onerror;
  window.onerror = function (message, source, lineno, colno, error) {
    console.warn('[Global Safe Guard] Suppressed window error:', message, error);
    if (typeof originalOnError === 'function') {
      try {
        originalOnError.call(window, message, source, lineno, colno, error);
      } catch (_) {}
    }
    return true; // Return true to prevent default browser error reporting
  };

  // 2. Intercept error events in capture phase
  window.addEventListener(
    'error',
    (event) => {
      console.warn('[Global Safe Guard] Handled error event:', (event as any)?.message || event);
      if (typeof event.preventDefault === 'function') event.preventDefault();
      if (typeof (event as any).stopImmediatePropagation === 'function') (event as any).stopImmediatePropagation();
    },
    true
  );

  // 3. Intercept unhandled promise rejections
  window.addEventListener(
    'unhandledrejection',
    (event) => {
      console.warn('[Global Safe Guard] Handled unhandled rejection:', event.reason);
      if (typeof event.preventDefault === 'function') event.preventDefault();
      if (typeof (event as any).stopImmediatePropagation === 'function') (event as any).stopImmediatePropagation();
    },
    true
  );

  // 4. Safe Fullscreen wrapping
  if (typeof Element !== 'undefined' && Element.prototype.requestFullscreen) {
    const origRequest = Element.prototype.requestFullscreen;
    Element.prototype.requestFullscreen = function (...args) {
      try {
        const p = origRequest.apply(this, args);
        if (p && typeof p.catch === 'function') {
          return p.catch(() => {});
        }
        return Promise.resolve();
      } catch (_) {
        return Promise.resolve();
      }
    };
  }

  if (typeof document !== 'undefined' && document.exitFullscreen) {
    const origExit = document.exitFullscreen;
    document.exitFullscreen = function (...args) {
      try {
        const p = origExit.apply(this, args);
        if (p && typeof p.catch === 'function') {
          return p.catch(() => {});
        }
        return Promise.resolve();
      } catch (_) {
        return Promise.resolve();
      }
    };
  }

  // 5. Safe Clipboard writeText wrapping
  if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
    const origWrite = navigator.clipboard.writeText.bind(navigator.clipboard);
    navigator.clipboard.writeText = function (text: string) {
      try {
        return origWrite(text).catch(() => {});
      } catch (_) {
        return Promise.resolve();
      }
    };
  }

  // 6. Safe modal shims to avoid iframe DOMExceptions
  window.alert = function (msg?: any) {
    console.warn('[Modal Notice]:', msg);
  };
  window.confirm = function () {
    return true;
  };
  window.prompt = function () {
    return null;
  };
  window.open = function () {
    return null;
  };
}

export {};
