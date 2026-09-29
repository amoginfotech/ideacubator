/**
 * Ideacubator UI Helpers & Interaction Handlers (assets/js/ui.js)
 */
(function () {
  'use strict';

  // Modal helpers
  window.openModal = function (modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    modal.classList.add('open');
    document.body.classList.add('locked');
  };

  window.closeModal = function (modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    modal.classList.remove('open');
    document.body.classList.remove('locked');
  };

  // Global escape key to dismiss modals
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      document.querySelectorAll('.modal.open, .modal-overlay.open').forEach(m => {
        m.classList.remove('open');
      });
      document.body.classList.remove('locked');
    }
  });
})();
