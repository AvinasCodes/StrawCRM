import React from 'react';
import { Check } from 'lucide-react';

/* Scattered channel cards */
const scatterCards = [
  { label: 'Email', icon: '✉', cls: 'scatter-email' },
  { label: 'Chat', icon: '●', cls: 'scatter-chat' },
  { label: 'Spreadsheets', icon: '▦', cls: 'scatter-sheet' },
  { label: 'Customer\nMessages', icon: '●', cls: 'scatter-customer' },
  { label: 'Support Inbox', icon: '✉', cls: 'scatter-inbox' },
];

function Brand() {
  return (
    <div className="cs-brand">
      <img
        src="/brand-logo.png"
        alt="StrawCRM"
        className="w-6 h-6 object-contain drop-shadow-[0_2px_8px_rgba(34,211,238,0.5)] shrink-0"
      />
      <span>Straw<span>CRM</span></span>
    </div>
  );
}

export default function ChallengeSolution({ onNavigate }) {
  return (
    <section id="features" className="challenge-solution">
      {/* Left — the challenge */}
      <div className="cs-copy">
        <span className="cs-pill">OPERATIONS CHALLENGE</span>
        <h2>Client issues shouldn't<br />feel scattered.</h2>
        <p>
          Inquiries arrive across email chains, client chats, and scattered sheets.
          Without a centralized hub, ticket tracking slips and SLA targets become hard to guarantee.
        </p>
      </div>

      {/* Center — scatter visual */}
      <div className="cs-scatter-wrap">
        {scatterCards.map(c => (
          <div className={`cs-scatter-card ${c.cls}`} key={c.label}>
            {c.icon} <b>{c.label}</b>
          </div>
        ))}
        {/* Solution card */}
        <div className="cs-solution-card">
          <Brand />
          <ul>
            {['Unified Datastraw queue', 'Categorized tickets', 'Gemini AI insights', 'Consistent client SLA'].map(item => (
              <li key={item}><Check size={10} />{item}</li>
            ))}
          </ul>
        </div>
      </div>

      {/* Right — the solution */}
      <div className="cs-copy cs-solution-copy">
        <span className="cs-pill cs-cyan-pill">THE INTERNAL SOLUTION</span>
        <h2>Datastraw Service<br />Console.</h2>
        <p>
          StrawCRM unifies every client ticket into a single, high-performance internal workspace.
        </p>
      </div>
    </section>
  );
}
