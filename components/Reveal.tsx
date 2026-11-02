'use client';

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ElementType,
  type ReactNode,
} from 'react';

type RevealProps = {
  children: ReactNode;
  className?: string;
  as?: ElementType;
  delayMs?: number;
  variant?: 'up' | 'left' | 'scale';
  stagger?: boolean;
  once?: boolean;
  style?: CSSProperties;
  id?: string;
};

export default function Reveal({
  children,
  className = '',
  as: Tag = 'div',
  delayMs = 0,
  variant = 'up',
  stagger = false,
  once = true,
  style,
  id,
}: RevealProps) {
  const ref = useRef<HTMLElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setVisible(true);
      return;
    }

    const revealIfVisible = () => {
      const rect = el.getBoundingClientRect();
      if (rect.top < window.innerHeight * 0.92 && rect.bottom > 0) {
        setVisible(true);
        return true;
      }
      return false;
    };

    if (revealIfVisible()) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          if (once) observer.disconnect();
        } else if (!once) {
          setVisible(false);
        }
      },
      { threshold: 0.08, rootMargin: '0px 0px -4% 0px' }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [once]);

  const base =
    variant === 'left' ? 'hs-reveal-left' : variant === 'scale' ? 'hs-reveal-scale' : 'hs-reveal';

  const Comp = Tag as ElementType;

  return (
    <Comp
      id={id}
      ref={ref}
      className={[base, visible ? 'hs-reveal-in' : '', stagger ? 'hs-stagger' : '', className]
        .filter(Boolean)
        .join(' ')}
      style={{
        ...style,
        transitionDelay: visible && delayMs ? `${delayMs}ms` : undefined,
      }}
    >
      {children}
    </Comp>
  );
}
