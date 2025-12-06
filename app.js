(function() {
  const tabButtons = document.querySelectorAll('.tabbtn');
  const tabPanels = document.querySelectorAll('.tabpanel');

  function activateTab(targetId, btn) {
    tabButtons.forEach(b => {
      b.classList.toggle('active', b === btn);
      b.setAttribute('aria-selected', b === btn ? 'true' : 'false');
    });

    tabPanels.forEach(p => {
      const active = p.id === targetId;
      p.classList.toggle('active', active);
      p.setAttribute('aria-hidden', active ? 'false' : 'true');
    });

    try { localStorage.setItem('fs_active_tab', targetId); } catch(e){};
  }

  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      activateTab(btn.dataset.target, btn);
    });
  });

  const last = localStorage.getItem('fs_active_tab') || 'tab-dashboard';
  const btn = Array.from(tabButtons).find(b => b.dataset.target === last) || tabButtons[0];
  activateTab(btn.dataset.target, btn);
})();
