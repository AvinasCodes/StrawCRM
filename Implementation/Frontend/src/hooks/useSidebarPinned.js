import { useState, useEffect } from 'react';

/**
 * Hook to observe whether the desktop sidebar is pinned or in auto-hide mode.
 * Listens to localStorage and custom 'sidebar-pinned-change' event.
 */
export function useSidebarPinned() {
  const [isPinned, setIsPinned] = useState(() => {
    try {
      return localStorage.getItem('strawcrm_sidebar_pinned') === 'true';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    const handleStorage = () => {
      try {
        setIsPinned(localStorage.getItem('strawcrm_sidebar_pinned') === 'true');
      } catch {}
    };

    const handleCustomEvent = (e) => {
      if (e?.detail?.isPinned !== undefined) {
        setIsPinned(Boolean(e.detail.isPinned));
      } else {
        handleStorage();
      }
    };

    window.addEventListener('storage', handleStorage);
    window.addEventListener('sidebar-pinned-change', handleCustomEvent);

    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('sidebar-pinned-change', handleCustomEvent);
    };
  }, []);

  return isPinned;
}

export default useSidebarPinned;
