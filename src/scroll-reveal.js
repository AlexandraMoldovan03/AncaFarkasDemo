const initAutoRevealTargets = () => {
  document.querySelectorAll('[data-reveal]').forEach((el) => {
    el.classList.add('reveal');
  });

  document.querySelectorAll('[data-auto-reveal]').forEach((container) => {
    const selector = container.dataset.autoReveal?.trim();
    const targets = selector ? container.querySelectorAll(selector) : container.children;
    Array.from(targets).forEach((el) => {
      el.classList.add('reveal');
    });
  });
};

const initStaggerBlocks = () => {
  document.querySelectorAll('[data-stagger]').forEach((block) => {
    const step = Number(block.dataset.staggerStep ?? 80);
    const start = Number(block.dataset.staggerStart ?? 0);
    Array.from(block.children).forEach((child, index) => {
      child.style.setProperty('--delay', `${start + index * step}ms`);
    });
  });
};

const initRevealObserver = () => {
  const items = Array.from(document.querySelectorAll('.reveal'));
  if (!items.length) return;

  const show = (el) => {
    el.classList.add('visible');
  };

  const prefersReduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  if (prefersReduced || !('IntersectionObserver' in window)) {
    items.forEach(show);
    return;
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      const el = entry.target;
      if (entry.isIntersecting) {
        if (el.dataset.revealDelay) {
          el.style.setProperty('transition-delay', el.dataset.revealDelay);
        }
        show(el);
        if (!el.hasAttribute('data-reveal-repeat')) {
          observer.unobserve(el);
        }
      } else if (el.hasAttribute('data-reveal-repeat')) {
        el.classList.remove('visible');
      }
    });
  }, {
    rootMargin: '0px 0px -10% 0px',
    threshold: 0.15,
  });

  items.forEach((el) => observer.observe(el));

  window.addEventListener('load', () => {
    items.forEach((el) => {
      if (el.classList.contains('visible')) return;
      const rect = el.getBoundingClientRect();
      const inView = rect.top < window.innerHeight * 0.9 && rect.bottom > 0;
      if (inView) show(el);
    });
  });
};

const initScrollReveal = () => {
  initAutoRevealTargets();
  initStaggerBlocks();
  initRevealObserver();
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initScrollReveal, { once: true });
} else {
  initScrollReveal();
}
