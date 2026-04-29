/* ═══════════════════════════════════════════════════════
   Planify — cookie.css
   Cookie banner, GDPR modaly, režim hosta, souhlas
═══════════════════════════════════════════════════════ */

/* ══ COOKIE BANNER ══ */
.cookie-banner {
  position: fixed;
  bottom: 0; left: 0; right: 0;
  background: var(--bg-elevated, #181924);
  border-top: 1px solid rgba(99,102,241,0.3);
  z-index: 10000;
  padding: 16px 20px;
  box-shadow: 0 -8px 32px rgba(0,0,0,0.4);
  transform: translateY(100%);
  transition: transform 0.4s cubic-bezier(0.34,1.2,0.64,1);
}

.cookie-banner.visible {
  transform: translateY(0);
}

.cookie-banner[aria-hidden="true"] {
  display: none;
}

.cookie-inner {
  max-width: 900px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}

.cookie-icon {
  font-size: 28px;
  flex-shrink: 0;
  line-height: 1;
}

.cookie-content {
  flex: 1;
  min-width: 200px;
}

.cookie-content h3 {
  font-family: 'Syne', sans-serif;
  font-size: 14px;
  font-weight: 700;
  color: var(--text-primary, #EEEEF5);
  margin-bottom: 4px;
}

.cookie-content p {
  font-size: 12.5px;
  color: var(--text-secondary, #8A8DA8);
  line-height: 1.5;
}

.cookie-actions {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}

.cookie-btn {
  padding: 8px 18px;
  border-radius: 7px;
  font-family: inherit;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
  border: none;
}

.cookie-reject {
  background: var(--bg-overlay, #1E1F2E);
  color: var(--text-secondary, #8A8DA8);
  border: 1px solid var(--border, rgba(255,255,255,0.08));
}

.cookie-reject:hover {
  color: var(--text-primary, #EEEEF5);
  border-color: var(--border-focus, rgba(99,102,241,0.65));
}

.cookie-accept {
  background: var(--accent, #6366F1);
  color: #fff;
  box-shadow: 0 2px 10px rgba(99,102,241,0.4);
}

.cookie-accept:hover {
  background: var(--accent-light, #818CF8);
  box-shadow: 0 4px 16px rgba(99,102,241,0.5);
  transform: translateY(-1px);
}

[data-theme="light"] .cookie-banner {
  background: #FFFFFF;
  border-top-color: rgba(99,102,241,0.2);
  box-shadow: 0 -4px 24px rgba(0,0,0,0.1);
}

/* ══ LEGAL OVERLAY ══ */
.legal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.75);
  backdrop-filter: blur(6px);
  z-index: 10001;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  animation: legalFadeIn 0.2s ease;
}

.legal-overlay.hidden {
  display: none !important;
}

@keyframes legalFadeIn {
  from { opacity: 0; }
  to   { opacity: 1; }
}

.legal-modal {
  background: var(--bg-surface, #11121A);
  border: 1px solid var(--border, rgba(255,255,255,0.07));
  border-radius: 20px;
  width: 100%;
  max-width: 600px;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 60px rgba(0,0,0,0.5);
  animation: legalSlideIn 0.25s cubic-bezier(0.34,1.2,0.64,1);
}

@keyframes legalSlideIn {
  from { opacity: 0; transform: scale(0.95) translateY(-12px); }
  to   { opacity: 1; transform: scale(1) translateY(0); }
}

[data-theme="light"] .legal-modal {
  background: #FFFFFF;
}

.legal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px 16px;
  border-bottom: 1px solid var(--border, rgba(255,255,255,0.07));
  flex-shrink: 0;
}

.legal-header h2 {
  font-family: 'Syne', sans-serif;
  font-size: 17px;
  font-weight: 700;
  color: var(--text-primary, #EEEEF5);
}

.legal-close {
  width: 28px; height: 28px;
  display: grid; place-items: center;
  background: var(--bg-elevated, #181924);
  border: 1px solid var(--border, rgba(255,255,255,0.07));
  border-radius: 50%;
  cursor: pointer;
  font-size: 12px;
  color: var(--text-secondary, #8A8DA8);
  transition: all 0.2s ease;
}

.legal-close:hover {
  background: rgba(248,113,113,0.15);
  border-color: var(--red, #F87171);
  color: var(--red, #F87171);
}

.legal-body {
  flex: 1;
  overflow-y: auto;
  padding: 20px 24px;
  font-size: 13.5px;
  line-height: 1.7;
  color: var(--text-secondary, #8A8DA8);
}

.legal-date {
  font-size: 11.5px;
  color: var(--text-muted, #52546A);
  margin-bottom: 20px;
  padding: 6px 12px;
  background: var(--bg-elevated, #181924);
  border-radius: 6px;
  display: inline-block;
}

.legal-body h3 {
  font-family: 'Syne', sans-serif;
  font-size: 14px;
  font-weight: 700;
  color: var(--text-primary, #EEEEF5);
  margin: 18px 0 8px;
}

.legal-body h3:first-of-type {
  margin-top: 0;
}

.legal-body p {
  margin-bottom: 10px;
}

.legal-body ul {
  padding-left: 20px;
  margin-bottom: 10px;
}

.legal-body li {
  margin-bottom: 5px;
}

.legal-body strong {
  color: var(--text-primary, #EEEEF5);
  font-weight: 600;
}

.legal-footer {
  padding: 14px 24px 20px;
  border-top: 1px solid var(--border, rgba(255,255,255,0.07));
  display: flex;
  justify-content: flex-end;
  flex-shrink: 0;
}

/* ══ SOUHLAS — checkbox ══ */
.consent-group {
  margin-bottom: 16px !important;
}

.checkbox-label {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  cursor: pointer;
  font-size: 13px !important;
  color: var(--text-secondary, #8A8DA8) !important;
  text-transform: none !important;
  letter-spacing: 0 !important;
  line-height: 1.5;
  user-select: none;
}

.checkbox-label input[type="checkbox"] {
  display: none;
}

.checkbox-custom {
  width: 18px; height: 18px;
  border: 2px solid var(--border, rgba(255,255,255,0.07));
  border-radius: 4px;
  background: var(--bg-elevated, #181924);
  flex-shrink: 0;
  margin-top: 1px;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  color: #fff;
}

.checkbox-label input[type="checkbox"]:checked + .checkbox-custom {
  background: var(--accent, #6366F1);
  border-color: var(--accent, #6366F1);
  box-shadow: 0 0 0 3px rgba(99,102,241,0.2);
}

.checkbox-label input[type="checkbox"]:checked + .checkbox-custom::after {
  content: '✓';
}

/* ══ ODKAZ-TLAČÍTKO ══ */
.link-btn {
  background: none;
  border: none;
  color: var(--accent-light, #818CF8);
  font-family: inherit;
  font-size: inherit;
  cursor: pointer;
  padding: 0;
  text-decoration: underline;
  transition: color 0.2s ease;
}

.link-btn:hover {
  color: var(--accent, #6366F1);
}

/* ══ ODDĚLOVAČ ══ */
.auth-divider {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 20px 0 16px;
  color: var(--text-muted, #52546A);
  font-size: 12px;
}

.auth-divider::before,
.auth-divider::after {
  content: '';
  flex: 1;
  height: 1px;
  background: var(--border, rgba(255,255,255,0.07));
}

/* ══ TLAČÍTKO HOSTA ══ */
.btn-guest {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 13px 16px;
  background: var(--bg-elevated, #181924);
  border: 1px dashed rgba(99,102,241,0.35);
  border-radius: var(--radius-sm, 7px);
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: left;
  font-family: inherit;
  color: var(--text-primary, #EEEEF5);
}

.btn-guest:hover {
  background: var(--bg-overlay, #1E1F2E);
  border-color: rgba(99,102,241,0.6);
  box-shadow: 0 0 0 3px var(--accent-dim, rgba(99,102,241,0.14));
  transform: translateY(-1px);
}

.guest-icon {
  font-size: 22px;
  flex-shrink: 0;
  line-height: 1;
}

.guest-text {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.guest-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary, #EEEEF5);
}

.guest-sub {
  font-size: 11.5px;
  color: var(--text-muted, #52546A);
}

.guest-arrow {
  color: var(--accent-light, #818CF8);
  font-size: 16px;
  flex-shrink: 0;
}

/* ══ GUEST BANNER (v app.html) ══ */
.guest-banner {
  position: fixed;
  top: var(--topbar-h, 58px);
  left: var(--sidebar-w, 248px);
  right: 0;
  z-index: 90;
  background: linear-gradient(135deg, rgba(245,158,11,0.12), rgba(251,191,36,0.08));
  border-bottom: 1px solid rgba(245,158,11,0.3);
  padding: 10px 22px;
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 13px;
  color: var(--orange, #FBBF24);
  animation: bannerSlide 0.3s ease;
  flex-wrap: wrap;
}

@keyframes bannerSlide {
  from { opacity: 0; transform: translateY(-100%); }
  to   { opacity: 1; transform: translateY(0); }
}

.guest-banner-icon { font-size: 16px; flex-shrink: 0; }
.guest-banner-text { flex: 1; line-height: 1.4; }
.guest-banner-text strong { color: var(--orange, #FBBF24); }

.guest-banner-actions {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}

.guest-banner-login {
  padding: 6px 14px;
  background: var(--orange, #FBBF24);
  color: #18192A;
  border: none;
  border-radius: 6px;
  font-family: inherit;
  font-size: 12.5px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
}

.guest-banner-login:hover {
  background: #F59E0B;
  transform: translateY(-1px);
}

.guest-banner-dismiss {
  padding: 6px 10px;
  background: rgba(245,158,11,0.15);
  color: var(--orange, #FBBF24);
  border: 1px solid rgba(245,158,11,0.3);
  border-radius: 6px;
  font-family: inherit;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.guest-banner-dismiss:hover { background: rgba(245,158,11,0.25); }

/* Na mobilu: banner pod topbarem, plná šířka */
@media (max-width: 960px) {
  .guest-banner { left: 0; }
}

/* Posunout sekci dolů pokud je banner viditelný */
.guest-mode-active .section {
  padding-top: calc(26px + 50px) !important;
}

/* ══ TOAST — uložení jako host ══ */
.guest-save-toast {
  background: rgba(245,158,11,0.15);
  border: 1px solid rgba(245,158,11,0.35);
  border-left: 3px solid var(--orange, #FBBF24) !important;
  color: var(--orange, #FBBF24) !important;
}

/* Scrollbar v legal modalu */
.legal-body::-webkit-scrollbar { width: 4px; }
.legal-body::-webkit-scrollbar-thumb { background: var(--bg-overlay); border-radius: 99px; }
