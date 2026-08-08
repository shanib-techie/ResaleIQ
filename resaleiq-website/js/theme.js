// Theme + nav chrome shared across every page
(function(){
  const root = document.documentElement;
  const saved = localStorage.getItem('resaleiq-theme');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  root.setAttribute('data-theme', saved || (prefersDark ? 'dark' : 'light'));

  function applyToggleLabel(){
    document.querySelectorAll('[data-theme-label]').forEach(el=>{
      el.textContent = root.getAttribute('data-theme') === 'dark' ? 'Dark' : 'Light';
    });
  }

  document.addEventListener('DOMContentLoaded', ()=>{
    applyToggleLabel();

    document.querySelectorAll('[data-theme-toggle]').forEach(btn=>{
      btn.addEventListener('click', ()=>{
        const next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
        root.setAttribute('data-theme', next);
        localStorage.setItem('resaleiq-theme', next);
        applyToggleLabel();
      });
    });

    // mobile sidebar
    const sidebar = document.querySelector('.sidebar');
    document.querySelectorAll('[data-menu-toggle]').forEach(btn=>{
      btn.addEventListener('click', ()=> sidebar && sidebar.classList.toggle('open'));
    });
    document.querySelectorAll('.nav a').forEach(a=>{
      a.addEventListener('click', ()=> sidebar && sidebar.classList.remove('open'));
    });

    // active link
    const path = location.pathname.split('/').pop() || 'index.html';
    document.querySelectorAll('.nav a').forEach(a=>{
      const href = a.getAttribute('href');
      if (href === path) a.classList.add('active');
    });

    // animate any feature bars into view
    const bars = document.querySelectorAll('.fbar-fill, .brand-row .fill');
    const io = new IntersectionObserver((entries)=>{
      entries.forEach(e=>{
        if(e.isIntersecting){
          const el = e.target;
          el.style.width = el.dataset.width || el.style.width;
          io.unobserve(el);
        }
      });
    }, {threshold:.3});
    bars.forEach(b=>{
      b.dataset.width = b.style.width;
      b.style.width = '0%';
      io.observe(b);
    });
  });
})();
