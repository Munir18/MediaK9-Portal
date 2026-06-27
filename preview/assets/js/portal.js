'use strict';

const MK9 = (() => {

  const ajax = (action, data = {}, options = {}) => {
    let formData;
    if (data instanceof FormData) {
      formData = data;
      formData.set('action', action);
      formData.set('nonce', mk9_ajax.nonce);
    } else {
      formData = new FormData();
      formData.append('action', action);
      formData.append('nonce', mk9_ajax.nonce);
      Object.keys(data).forEach(k => formData.append(k, data[k]));
    }

    return fetch(mk9_ajax.url, {
      method: 'POST',
      credentials: 'same-origin',
      body: formData,
    }).then(r => r.json());
  };

  let _toastContainer = null;

  const _getToastContainer = () => {
    if (!_toastContainer) {
      _toastContainer = document.createElement('div');
      _toastContainer.id = 'mk9-toast-container';
      _toastContainer.style.cssText = `
        position: fixed; top: 24px; right: 24px;
        z-index: 99999; display: flex; flex-direction: column; gap: 10px;
        pointer-events: none;
      `;
      document.body.appendChild(_toastContainer);
    }
    return _toastContainer;
  };

  const toast = (message, type = 'info', duration = 4000) => {
    const container = _getToastContainer();
    const icons = { success: '', error: '', info: 'ℹ', warning: '' };
    const colors = {
      success: { bg: 'rgba(6,78,59,0.95)', border: 'rgba(52,211,153,0.3)', text: '#34D399' },
      error:   { bg: 'rgba(127,29,29,0.95)', border: 'rgba(248,113,113,0.3)', text: '#F87171' },
      info:    { bg: 'rgba(30,58,138,0.95)', border: 'rgba(96,165,250,0.3)', text: '#60A5FA' },
      warning: { bg: 'rgba(120,53,15,0.95)', border: 'rgba(251,191,36,0.3)', text: '#FBBF24' },
    };
    const c = colors[type] || colors.info;

    const el = document.createElement('div');
    el.style.cssText = `
      display: flex; align-items: center; gap: 10px;
      padding: 14px 18px; border-radius: 10px;
      background: ${c.bg}; border: 1px solid ${c.border};
      color: ${c.text}; font-family: 'Inter', sans-serif;
      font-size: 0.875rem; font-weight: 500;
      backdrop-filter: blur(12px); pointer-events: all;
      box-shadow: 0 8px 32px rgba(0,0,0,0.4);
      transform: translateX(120px); opacity: 0;
      transition: all 0.4s cubic-bezier(0.34,1.56,0.64,1);
      max-width: 380px;
    `;
    el.innerHTML = `
      <span style="font-size:1.1rem;flex-shrink:0">${icons[type]}</span>
      <span style="color:#F5EDE0;flex:1">${message}</span>
      <button onclick="this.parentElement.remove()" style="
        background:none;border:none;color:rgba(245,237,224,0.4);
        cursor:pointer;font-size:1.1rem;padding:0;line-height:1;
      ">×</button>
    `;

    container.appendChild(el);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        el.style.transform = 'translateX(0)';
        el.style.opacity = '1';
      });
    });

    setTimeout(() => {
      el.style.transform = 'translateX(120px)';
      el.style.opacity = '0';
      setTimeout(() => el.remove(), 400);
    }, duration);
  };

  const modal = {
    _overlay: null,

    open(contentHTML, options = {}) {
      this.close();
      const overlay = document.createElement('div');
      overlay.className = 'mk9-overlay';
      overlay.id = 'mk9-modal-overlay';
      overlay.innerHTML = `
        <div class="mk9-modal" role="dialog" aria-modal="true">
          <div class="mk9-modal__header">
            <h3 class="mk9-modal__title">${options.title || ''}</h3>
            <button class="mk9-modal__close" id="mk9-modal-close" aria-label="Close">×</button>
          </div>
          <div class="mk9-modal__body">${contentHTML}</div>
          ${options.footer ? `<div class="mk9-modal__footer">${options.footer}</div>` : ''}
        </div>
      `;

      document.body.appendChild(overlay);
      this._overlay = overlay;
      document.body.style.overflow = 'hidden';

      overlay.addEventListener('click', e => {
        if (e.target === overlay) this.close();
      });
      overlay.querySelector('#mk9-modal-close').addEventListener('click', () => this.close());

      if (options.onOpen) options.onOpen(overlay);
      return overlay;
    },

    close() {
      if (this._overlay) {
        this._overlay.remove();
        this._overlay = null;
        document.body.style.overflow = '';
      }
    },

    confirm(message, onConfirm, options = {}) {
      const footer = `
        <button class="mk9-btn mk9-btn--ghost mk9-btn--sm" id="mk9-confirm-cancel">Cancel</button>
        <button class="mk9-btn mk9-btn--${options.danger ? 'danger' : 'primary'} mk9-btn--sm" id="mk9-confirm-ok">
          ${options.okText || 'Confirm'}
        </button>
      `;
      const overlay = this.open(`<p style="color:var(--mk9-cream-dim);margin:0">${message}</p>`, {
        title: options.title || 'Confirm',
        footer,
      });
      overlay.querySelector('#mk9-confirm-cancel').addEventListener('click', () => this.close());
      overlay.querySelector('#mk9-confirm-ok').addEventListener('click', () => {
        this.close();
        onConfirm();
      });
    },
  };

  const setButtonLoading = (btn, loading) => {
    if (!btn) return;
    if (loading) {
      btn._originalText = btn.innerHTML;
      btn.disabled = true;
      btn.classList.add('mk9-btn--loading');
      btn.innerHTML = `<span class="mk9-btn__text">${btn._originalText}</span>`;
    } else {
      btn.disabled = false;
      btn.classList.remove('mk9-btn--loading');
      btn.innerHTML = btn._originalText || btn.innerHTML;
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const escHtml = (str) => {
    const div = document.createElement('div');
    div.textContent = str ?? '';
    return div.innerHTML;
  };

  const init = () => {
    document.querySelectorAll('.mk9-logout-link').forEach(link => {
      link.addEventListener('click', async e => {
        e.preventDefault();
        try {
          await ajax('mk9_logout', {});
        } catch (_) {}
        window.location.href = '/login';
      });
    });
  };

  document.addEventListener('DOMContentLoaded', init);

  return { ajax, toast, modal, setButtonLoading, formatDate, escHtml };
})();

window.MK9 = MK9;
