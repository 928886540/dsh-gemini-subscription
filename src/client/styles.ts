const STYLE_ID = 'dsh-gemini-subscription-styles'

export function installStyles(): () => void {
  if (typeof document === 'undefined') return () => undefined
  let el = document.getElementById(STYLE_ID)
  if (!el) {
    el = document.createElement('style')
    el.id = STYLE_ID
    el.textContent = CSS_TEXT
    document.head.appendChild(el)
  }
  return () => {
    el?.remove()
  }
}

const CSS_TEXT = `
.dsh-gemini-section {
  display: flex;
  flex-direction: column;
  gap: 20px;
  max-width: 800px;
  color: var(--dsh-text-primary, #f8fafc);
}

.dsh-gemini-card {
  background: var(--dsh-card-bg, #1e293b);
  border: 1px solid var(--dsh-border-color, #334155);
  border-radius: 12px;
  padding: 20px 24px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}

.dsh-gemini-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.dsh-gemini-title {
  font-size: 16px;
  font-weight: 600;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 8px;
}

.dsh-gemini-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 8px 16px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
  border: 1px solid transparent;
}

.dsh-gemini-btn-primary {
  background: #2563eb;
  color: #ffffff;
}
.dsh-gemini-btn-primary:hover {
  background: #1d4ed8;
}

.dsh-gemini-btn-secondary {
  background: #334155;
  color: #f8fafc;
  border-color: #475569;
}
.dsh-gemini-btn-secondary:hover {
  background: #475569;
}

.dsh-gemini-btn-danger {
  background: rgba(239, 68, 68, 0.15);
  color: #f87171;
  border-color: rgba(239, 68, 68, 0.3);
}
.dsh-gemini-btn-danger:hover {
  background: rgba(239, 68, 68, 0.25);
}

.dsh-gemini-account-info {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  margin-top: 16px;
}

.dsh-gemini-info-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.dsh-gemini-info-label {
  font-size: 12px;
  color: var(--dsh-text-muted, #94a3b8);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.dsh-gemini-info-val {
  font-size: 14px;
  font-weight: 500;
}

.dsh-gemini-badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;
}
.dsh-gemini-badge-success {
  background: rgba(34, 197, 94, 0.2);
  color: #4ade80;
}
.dsh-gemini-badge-neutral {
  background: rgba(148, 163, 184, 0.2);
  color: #cbd5e1;
}

.dsh-gemini-composer-quota {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #94a3b8;
  background: rgba(30, 41, 59, 0.7);
  border: 1px solid rgba(51, 65, 85, 0.8);
  border-radius: 6px;
  padding: 2px 8px;
}
.dsh-gemini-composer-quota[data-level="danger"] {
  color: #f87171;
  border-color: rgba(239, 68, 68, 0.4);
}
.dsh-gemini-composer-quota[data-level="warning"] {
  color: #fbbf24;
  border-color: rgba(251, 191, 36, 0.4);
}
`
