const STYLE_ID = 'dsh-gemini-subscription/main'

export function installStyles(): () => void {
  if (typeof document === 'undefined') return () => undefined
  let el = document.getElementById(STYLE_ID)
  if (!el) {
    el = document.createElement('style')
    el.id = STYLE_ID
    el.dataset.plugin = 'dsh-gemini-subscription'
    el.dataset.pluginCss = STYLE_ID
    el.textContent = CSS_TEXT
    document.head.appendChild(el)
  }
  return () => {
    el?.remove()
  }
}

const CSS_TEXT = `
.dsh-gemini-page {
  box-sizing: border-box;
  color: var(--dsw-alias-label-primary, #f1f5f9);
  display: flex;
  flex-direction: column;
  gap: 20px;
  max-width: 780px;
  min-width: 0;
  padding: 2px 0 30px;
}
.dsh-gemini-page * {
  box-sizing: border-box;
}
.dsh-gemini-title {
  font-size: 15px;
  font-weight: 650;
  line-height: 1.4;
  margin: 0 0 5px;
}
.dsh-gemini-intro,
.dsh-gemini-muted {
  color: var(--dsw-alias-label-secondary, #94a3b8);
  font-size: 13px;
  line-height: 1.55;
  margin: 0;
}
.dsh-gemini-group {
  border-top: 1px solid var(--dsw-alias-border-l2, rgba(255, 255, 255, 0.08));
  min-width: 0;
}
.dsh-gemini-grouphead {
  align-items: center;
  display: flex;
  gap: 12px;
  justify-content: space-between;
  min-height: 48px;
}
.dsh-gemini-grouphead h3 {
  font-size: 14px;
  font-weight: 650;
  margin: 0;
}
.dsh-gemini-row {
  align-items: center;
  border-bottom: 1px solid var(--dsw-alias-border-l2, rgba(255, 255, 255, 0.08));
  display: flex;
  gap: 20px;
  justify-content: space-between;
  min-height: 44px;
  padding: 8px 0;
}
.dsh-gemini-label {
  color: var(--dsw-alias-label-secondary, #94a3b8);
  font-size: 13px;
  flex: 0 0 auto;
}
.dsh-gemini-value {
  font-size: 13px;
  min-width: 0;
  overflow-wrap: anywhere;
  text-align: right;
}
.dsh-gemini-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: flex-end;
  padding-top: 12px;
}
.dsh-gemini-button {
  background: var(--dsw-alias-bg-layer-2, rgba(255, 255, 255, 0.06));
  border: 1px solid var(--dsw-alias-border-l2, rgba(255, 255, 255, 0.12));
  border-radius: 999px;
  color: var(--dsw-alias-label-primary, #f1f5f9);
  cursor: pointer;
  font: inherit;
  font-size: 13px;
  line-height: 1;
  padding: 8px 14px;
  white-space: nowrap;
  transition: all 0.15s ease;
}
.dsh-gemini-button:hover:not(:disabled) {
  background: var(--dsw-alias-interactive-bg-hover, rgba(255, 255, 255, 0.12));
}
.dsh-gemini-button:focus-visible,
.dsh-gemini-link:focus-visible {
  outline: 2px solid var(--dsw-alias-button-info-fill, #38bdf8);
  outline-offset: 2px;
}
.dsh-gemini-button:disabled {
  cursor: default;
  opacity: 0.5;
}
.dsh-gemini-button-primary {
  background: var(--dsw-alias-button-info-fill, #2563eb);
  border-color: transparent;
  color: var(--dsw-alias-button-info-label, #ffffff);
}
.dsh-gemini-button-primary:hover:not(:disabled) {
  background: #1d4ed8;
}
.dsh-gemini-button-danger {
  background: rgba(239, 68, 68, 0.15);
  border-color: rgba(239, 68, 68, 0.3);
  color: #f87171;
}
.dsh-gemini-button-danger:hover:not(:disabled) {
  background: rgba(239, 68, 68, 0.25);
}
.dsh-gemini-notice {
  background: var(--dsw-alias-bg-layer-2, rgba(255, 255, 255, 0.04));
  border: 1px solid var(--dsw-alias-border-l2, rgba(255, 255, 255, 0.08));
  border-radius: 7px;
  color: var(--dsw-alias-label-secondary, #94a3b8);
  font-size: 12px;
  line-height: 1.55;
  margin: 12px 0 0;
  padding: 10px 12px;
}
.dsh-gemini-error,
.dsh-gemini-warning,
.dsh-gemini-success {
  font-size: 12px;
  line-height: 1.5;
  margin: 8px 0 0;
}
.dsh-gemini-error {
  color: var(--dsw-alias-label-danger, #ef4444);
}
.dsh-gemini-warning {
  color: var(--dsw-alias-label-warning, #f59e0b);
}
.dsh-gemini-success {
  color: var(--dsw-alias-label-success, #10b981);
}
.dsh-gemini-errorbar {
  align-items: center;
  background: color-mix(in srgb, var(--dsw-alias-label-danger, #ef4444) 10%, transparent);
  border: 1px solid color-mix(in srgb, var(--dsw-alias-label-danger, #ef4444) 30%, transparent);
  border-radius: 7px;
  color: var(--dsw-alias-label-danger, #ef4444);
  display: flex;
  font-size: 13px;
  gap: 12px;
  justify-content: space-between;
  padding: 10px 12px;
}
.dsh-gemini-link {
  color: var(--dsw-alias-label-link, #38bdf8);
  display: inline-block;
  font-size: 13px;
  margin-top: 8px;
}
.dsh-gemini-models {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding-top: 12px;
}
.dsh-gemini-models code {
  background: var(--dsw-alias-bg-layer-2, rgba(255, 255, 255, 0.05));
  border: 1px solid var(--dsw-alias-border-l2, rgba(255, 255, 255, 0.08));
  border-radius: 5px;
  font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
  font-size: 11px;
  padding: 4px 6px;
  color: #cbd5e1;
}
.dsh-gemini-check {
  align-items: flex-start;
  border-bottom: 1px solid var(--dsw-alias-border-l2, rgba(255, 255, 255, 0.08));
  cursor: pointer;
  display: flex;
  gap: 10px;
  padding: 12px 0;
}
.dsh-gemini-check input {
  flex: none;
  margin-top: 2px;
}
.dsh-gemini-check strong {
  display: block;
  font-size: 13px;
  font-weight: 600;
  line-height: 1.35;
}
.dsh-gemini-check small {
  color: var(--dsw-alias-label-secondary, #94a3b8);
  display: block;
  font-size: 12px;
  line-height: 1.45;
  margin-top: 2px;
}

/* CPA Quota Card & Progress Meters */
.dsh-gemini-quota-card {
  background: var(--dsw-alias-bg-layer-2, rgba(255, 255, 255, 0.03));
  border: 1px solid var(--dsw-alias-border-l2, rgba(255, 255, 255, 0.08));
  border-radius: 8px;
  margin-top: 12px;
  padding: 12px 14px;
}
.dsh-gemini-quota-title {
  align-items: center;
  display: flex;
  font-size: 13px;
  gap: 8px;
  justify-content: space-between;
}
.dsh-gemini-quota-title span {
  color: #38bdf8;
  background: rgba(56, 189, 248, 0.12);
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 500;
}
.dsh-gemini-quota-fact {
  align-items: center;
  border-bottom: 1px solid var(--dsw-alias-border-l2, rgba(255, 255, 255, 0.08));
  display: flex;
  font-size: 13px;
  gap: 12px;
  justify-content: space-between;
  line-height: 1.45;
  padding: 10px 0;
}
.dsh-gemini-quota-fact span {
  color: var(--dsw-alias-label-secondary, #94a3b8);
  flex: none;
}
.dsh-gemini-quota-fact strong {
  color: #38bdf8;
  font-weight: 650;
  font-size: 14px;
}
.dsh-gemini-meter-wrap {
  margin-top: 10px;
}
.dsh-gemini-meter-row {
  display: flex;
  align-items: center;
  gap: 12px;
}
.dsh-gemini-meter-bar {
  flex: 1;
  background: var(--dsw-alias-bg-layer-1, rgba(255, 255, 255, 0.1));
  border-radius: 999px;
  height: 7px;
  overflow: hidden;
}
.dsh-gemini-meter-bar > span {
  border-radius: inherit;
  display: block;
  height: 100%;
  max-width: 100%;
  min-width: 0;
  transition: width 0.3s ease;
}
.dsh-gemini-meter-normal > span {
  background: linear-gradient(90deg, #10b981, #22c55e);
}
.dsh-gemini-meter-warning > span {
  background: #f59e0b;
}
.dsh-gemini-meter-danger > span {
  background: #ef4444;
}
.dsh-gemini-meter-pct {
  font-size: 14px;
  font-weight: 700;
  min-width: 44px;
  text-align: right;
  font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
}
.dsh-gemini-meter-pct.normal {
  color: #22c55e;
}
.dsh-gemini-meter-pct.warning {
  color: #f59e0b;
}
.dsh-gemini-meter-pct.danger {
  color: #ef4444;
}
.dsh-gemini-meter-meta {
  color: var(--dsw-alias-label-tertiary, #64748b);
  display: flex;
  justify-content: space-between;
  font-size: 11px;
  line-height: 1.45;
  margin-top: 6px;
}
.dsh-gemini-empty {
  border: 1px dashed var(--dsw-alias-border-l2, rgba(255, 255, 255, 0.1));
  border-radius: 7px;
  color: var(--dsw-alias-label-tertiary, #64748b);
  font-size: 12px;
  margin: 12px 0 0;
  padding: 16px;
  text-align: center;
}
.dsh-gemini-timestamp {
  color: var(--dsw-alias-label-tertiary, #64748b);
  font-size: 11px;
  margin: 10px 0 0;
  text-align: right;
}
.dsh-gemini-skeleton {
  display: grid;
  gap: 9px;
  padding-top: 10px;
}
.dsh-gemini-skeleton span {
  animation: dsh-gemini-pulse 1.4s ease-in-out infinite;
  background: var(--dsw-alias-bg-layer-2, rgba(255, 255, 255, 0.05));
  border-radius: 5px;
  height: 42px;
}
@keyframes dsh-gemini-pulse {
  0%, 100% { opacity: 0.55; }
  50% { opacity: 1; }
}
@media (max-width: 560px) {
  .dsh-gemini-row,
  .dsh-gemini-quota-fact {
    align-items: flex-start;
    flex-direction: column;
    gap: 3px;
  }
  .dsh-gemini-value,
  .dsh-gemini-quota-fact strong {
    text-align: left;
  }
  .dsh-gemini-actions {
    justify-content: flex-start;
  }
  .dsh-gemini-grouphead {
    align-items: flex-start;
    flex-direction: column;
    gap: 0;
    padding: 12px 0;
  }
  .dsh-gemini-meter-meta {
    align-items: flex-start;
    flex-direction: column;
    gap: 2px;
  }
}
`

