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
/* AGY Theme & Container */
.agy-dashboard {
  box-sizing: border-box;
  color: var(--dsw-alias-label-primary, #f1f5f9);
  display: flex;
  flex-direction: column;
  gap: 22px;
  max-width: 820px;
  min-width: 0;
  padding: 4px 0 36px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
}
.agy-dashboard * {
  box-sizing: border-box;
}

/* Hero Header */
.agy-hero {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding-bottom: 6px;
}
.agy-hero-title-wrap {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.agy-hero-title {
  font-size: 18px;
  font-weight: 700;
  letter-spacing: -0.3px;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 8px;
  background: linear-gradient(135deg, #38bdf8 0%, #818cf8 50%, #c084fc 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}
.agy-hero-desc {
  color: var(--dsw-alias-label-secondary, #94a3b8);
  font-size: 13px;
  line-height: 1.5;
  margin: 0;
}
.agy-status-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
  flex: none;
}
.agy-status-pill.online {
  background: rgba(34, 197, 94, 0.12);
  border: 1px solid rgba(34, 197, 94, 0.3);
  color: #4ade80;
}
.agy-status-pill.offline {
  background: rgba(148, 163, 184, 0.12);
  border: 1px solid rgba(148, 163, 184, 0.25);
  color: #94a3b8;
}
.agy-status-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: currentColor;
  box-shadow: 0 0 8px currentColor;
}

/* Glass Card Component */
.agy-card {
  background: var(--dsw-alias-bg-layer-2, rgba(255, 255, 255, 0.03));
  border: 1px solid var(--dsw-alias-border-l2, rgba(255, 255, 255, 0.08));
  border-radius: 12px;
  padding: 16px 18px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  position: relative;
  overflow: hidden;
}
.agy-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: linear-gradient(90deg, transparent, rgba(56, 189, 248, 0.25), transparent);
}

.agy-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.agy-card-title {
  font-size: 14px;
  font-weight: 650;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--dsw-alias-label-primary, #f8fafc);
}
.agy-card-title-icon {
  font-size: 14px;
}

/* Info Grid (Account & Security) */
.agy-info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 12px 20px;
}
.agy-info-cell {
  display: flex;
  flex-direction: column;
  gap: 3px;
}
.agy-info-k {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--dsw-alias-label-secondary, #94a3b8);
}
.agy-info-v {
  font-size: 13px;
  font-weight: 500;
  color: var(--dsw-alias-label-primary, #f1f5f9);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.agy-info-v.highlight {
  color: #38bdf8;
  font-weight: 600;
}
.agy-info-v.secure {
  color: #4ade80;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.agy-security-banner {
  background: rgba(56, 189, 248, 0.05);
  border: 1px solid rgba(56, 189, 248, 0.15);
  border-radius: 8px;
  padding: 9px 12px;
  font-size: 12px;
  line-height: 1.5;
  color: #93c5fd;
  display: flex;
  align-items: center;
  gap: 8px;
}

/* Button & Action Bar */
.agy-actions {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  padding-top: 4px;
}
.agy-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 7px 14px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  border: 1px solid var(--dsw-alias-border-l2, rgba(255, 255, 255, 0.12));
  background: var(--dsw-alias-bg-layer-2, rgba(255, 255, 255, 0.06));
  color: var(--dsw-alias-label-primary, #f1f5f9);
  transition: all 0.18s ease;
  white-space: nowrap;
  user-select: none;
}
.agy-btn:hover:not(:disabled) {
  background: var(--dsw-alias-interactive-bg-hover, rgba(255, 255, 255, 0.14));
  border-color: rgba(255, 255, 255, 0.22);
}
.agy-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
.agy-btn-primary {
  background: linear-gradient(135deg, #2563eb, #3b82f6);
  border-color: transparent;
  color: #ffffff;
  box-shadow: 0 2px 8px rgba(37, 99, 235, 0.35);
}
.agy-btn-primary:hover:not(:disabled) {
  background: linear-gradient(135deg, #1d4ed8, #2563eb);
}
.agy-btn-danger {
  background: rgba(239, 68, 68, 0.12);
  border-color: rgba(239, 68, 68, 0.25);
  color: #f87171;
}
.agy-btn-danger:hover:not(:disabled) {
  background: rgba(239, 68, 68, 0.22);
  border-color: rgba(239, 68, 68, 0.4);
}
.agy-btn-sm {
  padding: 5px 10px;
  font-size: 12px;
  border-radius: 6px;
}

.agy-ping-badge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 3px 8px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
  background: rgba(34, 197, 94, 0.1);
  border: 1px solid rgba(34, 197, 94, 0.25);
  color: #4ade80;
  font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
}

/* AGY Live Quota Matrix */
.agy-quota-matrix {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.agy-quota-window-card {
  background: rgba(0, 0, 0, 0.18);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 10px;
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.agy-quota-window-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.agy-window-tag {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
  font-size: 11px;
  font-weight: 700;
  color: #38bdf8;
  background: rgba(56, 189, 248, 0.12);
  border: 1px solid rgba(56, 189, 248, 0.28);
  border-radius: 999px;
  padding: 2px 8px;
}
.agy-window-reset {
  font-size: 11px;
  color: var(--dsw-alias-label-secondary, #94a3b8);
}

.agy-quota-columns {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.agy-quota-track {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.agy-track-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.agy-track-title {
  font-size: 13px;
  font-weight: 650;
  color: var(--dsw-alias-label-primary, #f8fafc);
  display: flex;
  align-items: center;
  gap: 6px;
}
.agy-track-pct {
  font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
  font-size: 14px;
  font-weight: 700;
}
.agy-track-pct.normal { color: #4ade80; }
.agy-track-pct.warning { color: #fbbf24; }
.agy-track-pct.danger { color: #f87171; }

.agy-progress-bar {
  background: rgba(255, 255, 255, 0.08);
  height: 8px;
  border-radius: 999px;
  overflow: hidden;
}
.agy-progress-fill {
  height: 100%;
  border-radius: inherit;
  transition: width 0.4s ease;
}
.agy-progress-fill.normal {
  background: linear-gradient(90deg, #10b981, #22c55e);
  box-shadow: 0 0 10px rgba(34, 197, 94, 0.3);
}
.agy-progress-fill.warning {
  background: linear-gradient(90deg, #d97706, #f59e0b);
  box-shadow: 0 0 10px rgba(245, 158, 11, 0.3);
}
.agy-progress-fill.danger {
  background: linear-gradient(90deg, #dc2626, #ef4444);
  box-shadow: 0 0 10px rgba(239, 68, 68, 0.3);
}

.agy-track-meta {
  display: flex;
  justify-content: space-between;
  font-size: 11px;
  color: var(--dsw-alias-label-secondary, #94a3b8);
}

/* Credits Bar */
.agy-credit-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: rgba(56, 189, 248, 0.04);
  border: 1px dashed rgba(56, 189, 248, 0.2);
  border-radius: 8px;
  padding: 10px 14px;
}
.agy-credit-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 500;
  color: var(--dsw-alias-label-primary, #f1f5f9);
}
.agy-credit-val {
  font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
  font-size: 14px;
  font-weight: 700;
  color: #38bdf8;
}

/* Curated Models Grid */
.agy-models-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 8px;
}
.agy-model-card {
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid var(--dsw-alias-border-l2, rgba(255, 255, 255, 0.06));
  border-radius: 8px;
  padding: 10px 12px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  transition: all 0.15s ease;
}
.agy-model-card:hover {
  background: rgba(255, 255, 255, 0.05);
  border-color: rgba(56, 189, 248, 0.25);
}
.agy-model-card-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
}
.agy-model-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--dsw-alias-label-primary, #f8fafc);
}
.agy-model-badge {
  font-size: 10px;
  padding: 1px 6px;
  border-radius: 4px;
  font-weight: 600;
  white-space: nowrap;
  flex-shrink: 0;
  background: rgba(99, 102, 241, 0.15);
  color: #818cf8;
  border: 1px solid rgba(99, 102, 241, 0.25);
}
.agy-model-badge.fire {
  background: rgba(245, 158, 11, 0.15);
  color: #fbbf24;
  border-color: rgba(245, 158, 11, 0.3);
}
.agy-model-badge.claude {
  background: rgba(217, 119, 6, 0.15);
  color: #fb923c;
  border-color: rgba(217, 119, 6, 0.3);
}
.agy-model-badge.pro {
  background: rgba(14, 165, 233, 0.15);
  color: #38bdf8;
  border-color: rgba(14, 165, 233, 0.3);
}

.dsh-gemini-composer-quota {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 2px 8px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  color: var(--dsw-alias-label-secondary, #94a3b8);
  user-select: none;
  font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
}
.dsh-gemini-composer-quota span {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
.dsh-gemini-composer-quota strong {
  font-weight: 700;
  color: #38bdf8;
}
.dsh-gemini-composer-quota[data-level='warning'] strong {
  color: #fbbf24;
}
.dsh-gemini-composer-quota[data-level='danger'] strong {
  color: #f87171;
}
.agy-model-desc {
  font-size: 11px;
  color: var(--dsw-alias-label-secondary, #94a3b8);
  line-height: 1.35;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

/* Preferences Toggle */
/* Preferences & Context Window Settings */
.agy-context-section {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.agy-context-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  padding: 6px 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
}
.agy-context-row:last-child {
  border-bottom: none;
}
.agy-context-label {
  font-size: 13px;
  font-weight: 500;
  color: var(--dsw-alias-label-primary, #f1f5f9);
}
.agy-context-controls {
  display: flex;
  align-items: center;
  gap: 8px;
}
.agy-context-select {
  background: rgba(0, 0, 0, 0.35);
  border: 1px solid var(--dsw-alias-border-l2, rgba(255, 255, 255, 0.15));
  border-radius: 7px;
  color: #38bdf8;
  font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
  font-size: 13px;
  font-weight: 600;
  padding: 6px 12px;
  min-width: 120px;
  cursor: pointer;
  outline: none;
  transition: all 0.15s ease;
}
.agy-context-select:focus {
  border-color: #38bdf8;
  box-shadow: 0 0 0 1px #38bdf8;
}
.agy-context-select option {
  background: #1e293b;
  color: #f1f5f9;
}

.agy-toggle-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 4px 0;
}
.agy-toggle-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.agy-toggle-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--dsw-alias-label-primary, #f8fafc);
}
.agy-toggle-sub {
  font-size: 12px;
  color: var(--dsw-alias-label-secondary, #94a3b8);
}

/* Responsive */
@media (max-width: 640px) {
  .agy-quota-columns {
    grid-template-columns: 1fr;
  }
  .agy-models-grid {
    grid-template-columns: 1fr;
  }
}

/* 醒目高亮 Gemini 3.7 Flash (High) 和 Claude 4.6 系列 */
button[title*="3.7 Flash (High)"] {
  background: rgba(245, 158, 11, 0.1) !important;
  border-left: 3px solid #f59e0b !important;
}
button[title*="3.7 Flash (High)"]:hover {
  background: rgba(245, 158, 11, 0.18) !important;
}
button[title*="3.7 Flash (High)"] span[class*="modelName"] {
  color: #fbbf24 !important;
  font-weight: 700 !important;
}

button[title*="Claude Sonnet 4.6"],
button[title*="Claude Opus 4.6"] {
  background: rgba(234, 88, 12, 0.1) !important;
  border-left: 3px solid #ea580c !important;
}
button[title*="Claude Sonnet 4.6"]:hover,
button[title*="Claude Opus 4.6"]:hover {
  background: rgba(234, 88, 12, 0.18) !important;
}
button[title*="Claude Sonnet 4.6"] span[class*="modelName"],
button[title*="Claude Opus 4.6"] span[class*="modelName"] {
  color: #fb923c !important;
  font-weight: 700 !important;
}

@media (max-width: 620px) {
  .agy-hero {
    flex-direction: column;
    align-items: flex-start;
  }
  .agy-info-grid {
    grid-template-columns: 1fr;
  }
  .agy-context-row {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }
}
`
