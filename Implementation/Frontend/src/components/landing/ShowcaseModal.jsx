import React, { useState, useEffect } from 'react';
import {
  X, LayoutDashboard, Ticket, Sparkles, BarChart3,
  Plus, Search, Check, AlertCircle, Clock, TrendingUp,
  ArrowRight, ChevronRight, Zap, Users, Activity
} from 'lucide-react';

/* ─── Demo data ──────────────────────────────────────────── */
const tickets = [
  { id: '#TKT-1045', customer: 'Rahul Mehta',   subject: 'Login issue after update',       status: 'Open',        priority: 'High',   time: '2m ago' },
  { id: '#TKT-1044', customer: 'Sneha Kapoor',  subject: 'Payment not going through',      status: 'In Progress', priority: 'High',   time: '14m ago' },
  { id: '#TKT-1043', customer: 'Amit Shah',     subject: 'Feature request — bulk export',  status: 'Open',        priority: 'Medium', time: '1h ago' },
  { id: '#TKT-1042', customer: 'Priya Nair',    subject: 'Bug in dashboard chart',         status: 'Closed',      priority: 'Low',    time: '3h ago' },
  { id: '#TKT-1041', customer: 'Karan Verma',   subject: 'Account recovery request',       status: 'In Progress', priority: 'Medium', time: '5h ago' },
];

const statusStyle = {
  'Open':        'bg-red-100 text-red-600 border-red-200',
  'In Progress': 'bg-blue-100 text-blue-700 border-blue-200',
  'Closed':      'bg-green-100 text-green-700 border-green-200',
};

const priorityStyle = {
  'High':   'text-red-500',
  'Medium': 'text-amber-500',
  'Low':    'text-slate-400',
};

const aiResponses = [
  { label: 'Summary', content: 'Customer Sneha Kapoor is unable to complete a payment. The issue began after the latest update. Transaction logs show 3 failed attempts in the last hour.' },
  { label: 'Suggested Reply', content: 'Hi Sneha, I\'m sorry you\'re experiencing this. Our team is investigating the payment gateway. Could you please confirm the payment method used? We\'ll resolve this within 2 hours.' },
  { label: 'Priority', content: 'HIGH — Revenue-impacting issue affecting active customer. Recommend immediate escalation to the payments team.' },
];

/* ─── Tab views ─────────────────────────────────────────── */
function OverviewTab() {
  return (
    <div className="sc-overview">
      <div className="sc-stat-row">
        {[
          { icon: Ticket,     label: 'Open Tickets',   val: 12, delta: '-2 today',  color: '#f97316' },
          { icon: Clock,      label: 'Avg. Response',  val: '4m', delta: '-30% ↓',  color: '#0b63f6' },
          { icon: Check,      label: 'Resolved',       val: 25,  delta: '+12 today', color: '#22c55e' },
          { icon: TrendingUp, label: 'CSAT Score',     val: '94%', delta: '+2% ↑',  color: '#a855f7' },
        ].map(({ icon: Icon, label, val, delta, color }) => (
          <div className="sc-stat-card" key={label}>
            <div className="sc-stat-icon" style={{ background: color + '18', color }}>
              <Icon size={18} />
            </div>
            <div>
              <p className="sc-stat-val">{val}</p>
              <p className="sc-stat-label">{label}</p>
              <p className="sc-stat-delta">{delta}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Mini bar chart */}
      <div className="sc-chart-card">
        <div className="sc-chart-header">
          <span>Ticket Volume — Last 7 Days</span>
          <span className="sc-chart-badge"><Activity size={11} /> Live</span>
        </div>
        <div className="sc-bars">
          {[
            { day: 'Mon', open: 65, closed: 45 },
            { day: 'Tue', open: 80, closed: 60 },
            { day: 'Wed', open: 55, closed: 70 },
            { day: 'Thu', open: 90, closed: 55 },
            { day: 'Fri', open: 75, closed: 80 },
            { day: 'Sat', open: 40, closed: 60 },
            { day: 'Sun', open: 30, closed: 50 },
          ].map(({ day, open, closed }) => (
            <div className="sc-bar-col" key={day}>
              <div className="sc-bar-stack">
                <div className="sc-bar open" style={{ height: `${open}%` }} title={`Open: ${open}`} />
                <div className="sc-bar closed" style={{ height: `${closed}%` }} title={`Closed: ${closed}`} />
              </div>
              <span>{day}</span>
            </div>
          ))}
        </div>
        <div className="sc-chart-legend">
          <span><span className="dot open" />Open</span>
          <span><span className="dot closed" />Resolved</span>
        </div>
      </div>
    </div>
  );
}

function TicketsTab() {
  const [selected, setSelected] = useState(null);
  return (
    <div className="sc-tickets">
      {/* Toolbar */}
      <div className="sc-toolbar">
        <div className="sc-search"><Search size={13} /> Search tickets, customers, subjects…</div>
        <div className="sc-filters">
          <span>All Status ⌄</span><span>All Priority ⌄</span><span>Last 7 days ⌄</span>
        </div>
        <button className="sc-create-btn"><Plus size={13} /> Create Ticket</button>
      </div>
      {/* Table */}
      <div className="sc-table">
        <div className="sc-table-head">
          <span>ID</span><span>Customer</span><span>Subject</span>
          <span>Status</span><span>Priority</span><span>Time</span><span></span>
        </div>
        {tickets.map(t => (
          <div
            className={`sc-table-row ${selected === t.id ? 'selected' : ''}`}
            key={t.id}
            onClick={() => setSelected(selected === t.id ? null : t.id)}
          >
            <code>{t.id}</code>
            <span className="sc-customer">
              <span className="sc-avatar">{t.customer[0]}</span>{t.customer}
            </span>
            <span className="sc-subject">{t.subject}</span>
            <span className={`sc-status-pill ${statusStyle[t.status]}`}>{t.status}</span>
            <span className={`sc-priority ${priorityStyle[t.priority]}`}>● {t.priority}</span>
            <span className="sc-time">{t.time}</span>
            <ChevronRight size={13} className="sc-chevron" />
          </div>
        ))}
      </div>
    </div>
  );
}

function AITab() {
  const [activeAI, setActiveAI] = useState(0);
  const [typing, setTyping] = useState(false);
  const [shown, setShown] = useState(false);

  const runAI = () => {
    setTyping(true);
    setShown(false);
    setTimeout(() => { setTyping(false); setShown(true); }, 1400);
  };

  return (
    <div className="sc-ai">
      {/* Ticket context */}
      <div className="sc-ai-ticket">
        <div className="sc-ai-ticket-head">
          <span className="sc-demo-label">TICKET #TKT-1044</span>
          <span className="sc-status-pill bg-blue-100 text-blue-700 border-blue-200">In Progress</span>
        </div>
        <h3>Payment not going through</h3>
        <p className="sc-ai-from">Sneha Kapoor · sneha@example.com</p>
        <p className="sc-ai-body">I am unable to complete the payment. It shows an error every time I try to checkout. Please help me resolve this quickly.</p>
      </div>

      {/* AI panel */}
      <div className="sc-ai-panel">
        <div className="sc-ai-panel-head"><Sparkles size={16} /> Gemini AI Copilot</div>

        {/* Mode tabs */}
        <div className="sc-ai-tabs">
          {aiResponses.map((r, i) => (
            <button key={r.label} onClick={() => setActiveAI(i)} className={`sc-ai-tab ${activeAI === i ? 'active' : ''}`}>
              {r.label}
            </button>
          ))}
        </div>

        {/* Output */}
        <div className="sc-ai-output">
          {!shown && !typing && (
            <div className="sc-ai-idle">
              <Sparkles size={24} className="sc-ai-idle-icon" />
              <p>Ready to analyze ticket #{`TKT-1044`}</p>
            </div>
          )}
          {typing && (
            <div className="sc-ai-thinking">
              <span /><span /><span />
              <p>Analyzing ticket context…</p>
            </div>
          )}
          {shown && (
            <div className="sc-ai-result">
              <p className="sc-ai-result-label">{aiResponses[activeAI].label}</p>
              <p className="sc-ai-result-text">{aiResponses[activeAI].content}</p>
            </div>
          )}
        </div>

        <button className="sc-ai-run-btn" onClick={runAI}>
          <Sparkles size={14} /> {shown ? 'Re-generate' : 'Generate with Gemini AI'}
          <ArrowRight size={14} />
        </button>
      </div>
    </div>
  );
}

function ReportsTab() {
  return (
    <div className="sc-reports">
      <div className="sc-reports-grid">
        {/* Resolution rate */}
        <div className="sc-report-card wide">
          <div className="sc-report-head"><span>Resolution Rate</span><span className="sc-badge green">+12.4% ↑</span></div>
          <div className="sc-big-number">94.8%</div>
          <div className="sc-mini-bars">
            {[60, 75, 55, 90, 70, 95, 85].map((h, i) => (
              <div key={i} className="sc-mini-bar" style={{ height: `${h}%` }} />
            ))}
          </div>
        </div>

        {/* Team load */}
        <div className="sc-report-card">
          <div className="sc-report-head"><span>Team Workload</span></div>
          {[
            { name: 'Aaryan Singh', load: 80, count: 8 },
            { name: 'Priya Nair',   load: 55, count: 5 },
            { name: 'Karan Verma',  load: 35, count: 3 },
          ].map(a => (
            <div className="sc-agent-row" key={a.name}>
              <span className="sc-agent-av">{a.name[0]}</span>
              <div className="sc-agent-info">
                <span>{a.name}</span>
                <div className="sc-load-bar"><div style={{ width: `${a.load}%` }} /></div>
              </div>
              <span className="sc-agent-count">{a.count}</span>
            </div>
          ))}
        </div>

        {/* CSAT */}
        <div className="sc-report-card">
          <div className="sc-report-head"><span>CSAT Distribution</span></div>
          {[
            { label: '⭐⭐⭐⭐⭐ Excellent', pct: 68 },
            { label: '⭐⭐⭐⭐ Good',      pct: 22 },
            { label: '⭐⭐⭐ Average',     pct: 7 },
            { label: '⭐⭐ Poor',          pct: 3 },
          ].map(row => (
            <div className="sc-csat-row" key={row.label}>
              <span>{row.label}</span>
              <div className="sc-csat-bar"><div style={{ width: `${row.pct}%` }} /></div>
              <span>{row.pct}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── Main Modal ─────────────────────────────────────────── */
const TABS = [
  { id: 'overview', label: 'Overview',   icon: LayoutDashboard },
  { id: 'tickets',  label: 'Tickets',    icon: Ticket },
  { id: 'ai',       label: 'AI Copilot', icon: Sparkles },
  { id: 'reports',  label: 'Reports',    icon: BarChart3 },
];

export default function ShowcaseModal({ onClose, onNavigate }) {
  const [tab, setTab] = useState('overview');

  // Lock body scroll when open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  // Close on Escape
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="sc-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="sc-modal">
        {/* Header */}
        <div className="sc-modal-header">
          <div className="sc-modal-brand">
            <div className="sc-brand-dot" />
            <span>StrawCRM <span>— Product Tour</span></span>
          </div>
          <div className="sc-modal-tabs">
            {TABS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                className={`sc-modal-tab ${tab === id ? 'active' : ''}`}
              >
                <Icon size={14} />{label}
              </button>
            ))}
          </div>
          <div className="sc-modal-actions">
            <button
              className="sc-get-started"
              onClick={() => { onClose(); onNavigate && onNavigate('/login'); }}
            >
              Get Started <ArrowRight size={14} />
            </button>
            <button className="sc-close-btn" onClick={onClose} aria-label="Close showcase">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="sc-modal-body">
          {tab === 'overview' && <OverviewTab />}
          {tab === 'tickets'  && <TicketsTab />}
          {tab === 'ai'       && <AITab />}
          {tab === 'reports'  && <ReportsTab />}
        </div>

        {/* Footer */}
        <div className="sc-modal-footer">
          <span className="sc-footer-live"><span />Live Demo Environment</span>
          <span>All data is simulated for demonstration purposes.</span>
          <button
            className="sc-footer-cta"
            onClick={() => { onClose(); onNavigate && onNavigate('/login'); }}
          >
            Start for free <ArrowRight size={13} />
          </button>
        </div>
      </div>
    </div>
  );
}
