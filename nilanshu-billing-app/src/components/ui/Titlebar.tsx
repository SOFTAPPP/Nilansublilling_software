import { useState, useEffect } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { Minus, Square, X, Copy } from 'lucide-react';

export const Titlebar = () => {
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    const appWindow = getCurrentWindow();
    
    appWindow.isMaximized().then(setIsMaximized).catch(() => {});
    
    let unlisten: (() => void) | undefined;
    appWindow.onResized(async () => {
      try {
        const maximized = await appWindow.isMaximized();
        setIsMaximized(maximized);
      } catch (_) {}
    }).then(fn => { unlisten = fn; }).catch(() => {});
    
    return () => {
      if (unlisten) unlisten();
    };
  }, []);

  const doMinimize = async () => {
    try { await getCurrentWindow().minimize(); } catch (e) { console.error('minimize failed', e); }
  };

  const doToggleMaximize = async () => {
    try { await getCurrentWindow().toggleMaximize(); } catch (e) { console.error('toggleMaximize failed', e); }
  };

  const doClose = async () => {
    try { await getCurrentWindow().close(); } catch (e) { console.error('close failed', e); }
  };

  const startDrag = async (e: React.MouseEvent) => {
    // Only on primary (left) button, and not on interactive children
    if (e.button !== 0) return;
    e.preventDefault();
    try {
      await getCurrentWindow().startDragging();
    } catch (err) {
      console.error('startDragging failed', err);
    }
  };

  return (
    <div
      style={{
        height: '40px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        flexShrink: 0,
        zIndex: 9999,
        background: 'var(--card, #1a1a2e)',
        borderBottom: '1px solid rgba(128,128,128,0.2)',
      }}
    >
      {/* ===== DRAG ZONE (left side with logo) ===== */}
      <div
        onMouseDown={startDrag}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          paddingLeft: '16px',
          height: '100%',
          flex: 1,
          cursor: 'default',
          color: 'var(--muted-foreground, #888)',
        }}
      >
        <img
          src="/logo.png"
          alt="Logo"
          draggable={false}
          style={{
            width: '16px',
            height: '16px',
            objectFit: 'contain',
            borderRadius: '50%',
            background: 'white',
            padding: '1px',
            pointerEvents: 'none',
          }}
        />
        <span
          style={{
            fontSize: '12px',
            fontWeight: 700,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            pointerEvents: 'none',
          }}
        >
          NP Billing Software
        </span>
      </div>

      {/* ===== WINDOW CONTROL BUTTONS ===== */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '2px',
          paddingRight: '8px',
          height: '100%',
          flexShrink: 0,
        }}
      >
        {/* Minimize */}
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); doMinimize(); }}
          onMouseDown={(e) => e.stopPropagation()}
          className="titlebar-btn titlebar-btn-default"
          title="Minimize"
        >
          <Minus size={15} strokeWidth={2.5} />
        </button>

        {/* Maximize / Restore */}
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); doToggleMaximize(); }}
          onMouseDown={(e) => e.stopPropagation()}
          className="titlebar-btn titlebar-btn-default"
          title={isMaximized ? 'Restore' : 'Maximize'}
        >
          {isMaximized ? (
            <Copy size={13} strokeWidth={2.5} style={{ transform: 'rotate(180deg)' }} />
          ) : (
            <Square size={13} strokeWidth={2.5} />
          )}
        </button>

        {/* Close */}
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); doClose(); }}
          onMouseDown={(e) => e.stopPropagation()}
          className="titlebar-btn titlebar-btn-close"
          title="Close"
        >
          <X size={15} strokeWidth={2.5} />
        </button>
      </div>
    </div>
  );
};
