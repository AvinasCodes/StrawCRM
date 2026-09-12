import { useState, useEffect, useRef } from 'react';

/**
 * useScrollDirection
 * Detects scroll direction (up / down) and manages hide/display visibility
 * mimicking the modern YouTube mobile tab bar and responsive app bar behavior.
 */
export function useScrollDirection({ threshold = 8, topOffset = 30 } = {}) {
  const [isNavVisible, setIsNavVisible] = useState(true);
  const [scrollDirection, setScrollDirection] = useState('up');
  const lastScrollTopRef = useRef(0);
  const touchStartYRef = useRef(0);

  useEffect(() => {
    let ticking = false;

    const handleScroll = (e) => {
      if (ticking) return;
      ticking = true;

      requestAnimationFrame(() => {
        const target = e.target;
        const currentScroll =
          target && typeof target.scrollTop === 'number' && target !== document
            ? target.scrollTop
            : (window.pageYOffset || document.documentElement.scrollTop || 0);

        const lastScroll = lastScrollTopRef.current;
        const diff = currentScroll - lastScroll;

        // When near top, always keep navigation visible
        if (currentScroll <= topOffset) {
          setIsNavVisible(true);
          setScrollDirection('up');
          lastScrollTopRef.current = Math.max(0, currentScroll);
          ticking = false;
          return;
        }

        if (Math.abs(diff) >= threshold) {
          if (diff > 0) {
            // Scrolling down -> Hide navigation (YouTube mobile style)
            setIsNavVisible(false);
            setScrollDirection('down');
          } else {
            // Scrolling up -> Display navigation immediately
            setIsNavVisible(true);
            setScrollDirection('up');
          }
          lastScrollTopRef.current = Math.max(0, currentScroll);
        }

        ticking = false;
      });
    };

    const handleTouchStart = (e) => {
      if (e.touches && e.touches[0]) {
        touchStartYRef.current = e.touches[0].clientY;
      }
    };

    const handleTouchMove = (e) => {
      if (!e.touches || !e.touches[0]) return;
      const currentY = e.touches[0].clientY;
      const diff = touchStartYRef.current - currentY; // positive = dragging finger upwards / scrolling down

      if (Math.abs(diff) > 15) {
        if (diff > 0) {
          setIsNavVisible(false);
          setScrollDirection('down');
        } else {
          setIsNavVisible(true);
          setScrollDirection('up');
        }
        touchStartYRef.current = currentY;
      }
    };

    // Use capture phase so we capture scroll events from any nested overflow-y-auto container!
    window.addEventListener('scroll', handleScroll, { capture: true, passive: true });
    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll, { capture: true });
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
    };
  }, [threshold, topOffset]);

  return { isNavVisible, setIsNavVisible, scrollDirection };
}

export default useScrollDirection;
