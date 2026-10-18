/**
 * J.H. Lab vNext shared motion contract.
 *
 * Every script that moves something imports this module instead of hard-coding
 * durations. The CSS counterpart lives in tokens.css (--motion-*, --ease-*).
 * All helpers are interruptible and degrade to an instant final state when the
 * visitor asks for reduced motion.
 */

export const motion = {
  press: 110,
  hover: 150,
  filter: 280,
  nav: 340,
  card: 400,
  page: 480,
} as const;

const reducedQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

export function prefersReducedMotion(): boolean {
  return reducedQuery.matches;
}

export function onReduceChange(callback: (reduced: boolean) => void): () => void {
  const listener = () => callback(reducedQuery.matches);
  reducedQuery.addEventListener?.("change", listener);
  return () => reducedQuery.removeEventListener?.("change", listener);
}

const running = new WeakMap<Element, Animation>();

/**
 * Animate one element. A new call replaces the previous animation on the same
 * element instead of stacking, so fast repeated input always converges.
 */
export function animate(
  element: Element,
  keyframes: Keyframe[],
  options: KeyframeAnimationOptions = {},
): Animation | null {
  if (prefersReducedMotion()) return null;
  running.get(element)?.cancel();
  const animation = element.animate(keyframes, {
    duration: motion.card,
    easing: "cubic-bezier(.22,1,.36,1)",
    fill: "both",
    ...options,
  });
  running.set(element, animation);
  const cleanup = () => {
    if (running.get(element) === animation) running.delete(element);
  };
  animation.finished.then(cleanup, cleanup);
  return animation;
}

export type RevealOptions = {
  /** CSS selector for items to reveal. */
  selector?: string;
  /** Delay between siblings, in ms. */
  stagger?: number;
  /** Root margin used by the observer. */
  rootMargin?: string;
};

/**
 * Editorial entrance. Content is visible by default (no-JS / first paint);
 * only when this module runs does `data-motion-ready` allow the hidden state.
 * Once revealed, items stay revealed.
 */
export function setupReveal({
  selector = "[data-reveal]",
  stagger = 70,
  rootMargin = "0px 0px 80px 0px",
}: RevealOptions = {}): () => void {
  const items = Array.from(document.querySelectorAll<HTMLElement>(selector));
  if (!items.length) return () => {};

  const show = (element: HTMLElement) => {
    element.classList.add("is-revealed");
  };

  if (prefersReducedMotion() || !("IntersectionObserver" in window)) {
    items.forEach(show);
    return () => {};
  }

  items.forEach((element, index) => {
    element.classList.add("motion-item");
    element.style.setProperty("--reveal-delay", `${Math.min(index, 8) * stagger}ms`);
  });

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        show(entry.target as HTMLElement);
        observer.unobserve(entry.target);
      }
    },
    { threshold: 0.06, rootMargin },
  );

  items.forEach((element) => {
    const box = element.getBoundingClientRect();
    // Anything already in the first viewport must never flash out and back.
    if (box.top < window.innerHeight * 0.88) show(element);
    else observer.observe(element);
  });

  document.documentElement.setAttribute("data-motion-ready", "");
  const stop = onReduceChange((reduced) => {
    if (reduced) {
      observer.disconnect();
      items.forEach(show);
      document.documentElement.removeAttribute("data-motion-ready");
    }
  });

  return () => {
    observer.disconnect();
    stop();
  };
}

/** Restore focus to a meaningful trigger after closing a panel/dialog. */
export function restoreFocus(element: Element | null): void {
  if (!(element instanceof HTMLElement)) return;
  requestAnimationFrame(() => element.focus({ preventScroll: true }));
}

/** Read a CSS motion token (already reduced-motion aware). */
export function motionMs(name: keyof typeof motion): number {
  if (prefersReducedMotion()) return 1;
  return motion[name];
}

// Auto-initialize the editorial reveal on every Astro route.
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => setupReveal(), { once: true });
} else {
  setupReveal();
}
