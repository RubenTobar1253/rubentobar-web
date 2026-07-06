// ---------------------------------------------------------
// Menú móvil
// ---------------------------------------------------------
const navToggle = document.querySelector('.nav-toggle');
const navLinks = document.querySelector('.nav-links');

if (navToggle && navLinks) {
  navToggle.addEventListener('click', () => {
    const isOpen = navLinks.classList.toggle('open');
    navToggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
  });
}

// ---------------------------------------------------------
// Esquema interactivo de la ecuación E × C × T = R
// En escritorio funciona con :hover (CSS). En táctil,
// alternamos la clase al tocar cada término.
// ---------------------------------------------------------
const eqTerms = document.querySelectorAll('.eq-term');

eqTerms.forEach((term) => {
  term.addEventListener('click', (e) => {
    const alreadyActive = term.classList.contains('is-active');
    eqTerms.forEach((t) => t.classList.remove('is-active'));
    if (!alreadyActive) term.classList.add('is-active');
  });
});

// ---------------------------------------------------------
// Revelado suave de secciones al hacer scroll (sutil)
// ---------------------------------------------------------
const revealTargets = document.querySelectorAll('[data-reveal]');

if ('IntersectionObserver' in window && revealTargets.length) {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0, rootMargin: '0px 0px -10% 0px' }
  );
  revealTargets.forEach((el) => observer.observe(el));
} else {
  revealTargets.forEach((el) => el.classList.add('is-visible'));
}

// Red de seguridad: si por cualquier motivo el observador no se dispara
// (navegadores integrados de apps, etc.), revelamos todo tras 1.5 s.
setTimeout(() => {
  revealTargets.forEach((el) => el.classList.add('is-visible'));
}, 1500);
