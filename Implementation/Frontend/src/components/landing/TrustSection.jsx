import React from 'react';
import { ShieldCheck, Database, KeyRound, Lock, Server, Cpu } from 'lucide-react';

const TRUST_ITEMS = [
  {
    icon: KeyRound,
    title: 'Firebase JWT Authentication',
    desc: 'Encrypted bearer token verification with short-lived session rotation and secure multi-factor options.',
  },
  {
    icon: Database,
    title: 'Google Cloud Firestore',
    desc: 'Real-time NoSQL document architecture with persistent offline multi-tab synchronization and strict security rules.',
  },
  {
    icon: Server,
    title: 'FastAPI Backend Architecture',
    desc: 'Pydantic-validated request pipelines with asynchronous high-throughput I/O and sub-50ms endpoint latencies.',
  },
  {
    icon: Cpu,
    title: 'AI Data Isolation',
    desc: 'Customer ticket context is processed transiently for synthesis and response drafting without training public models.',
  },
  {
    icon: ShieldCheck,
    title: 'Cloudflare Turnstile Defense',
    desc: 'Invisible, privacy-first bot mitigation safeguarding registration and intake endpoints from abuse.',
  },
  {
    icon: Lock,
    title: 'End-to-End HTTPS / TLS 1.3',
    desc: 'All data in transit is encrypted using modern TLS cipher suites and strict security transport headers.',
  },
];

export default function TrustSection() {
  return (
    <section id="security" className="relative py-24 px-4 sm:px-6 lg:px-8 bg-[#020B1F] overflow-hidden">
      <div className="max-w-6xl mx-auto space-y-12 relative z-10">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-400/20 text-brand-cyan text-xs font-semibold uppercase tracking-wider">
            <span>Security & Architecture</span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight">
            Built for real support teams.
          </h2>
          <p className="text-sm text-slate-400">
            Engineered on battle-tested infrastructure with strict verification, hardened APIs, and zero compromises on customer data privacy.
          </p>
        </div>

        {/* 6-Card Security Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {TRUST_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.title}
                className="p-6 rounded-3xl bg-white/[0.03] border border-white/10 hover:border-cyan-400/30 backdrop-blur-xl transition-all duration-300 hover:bg-white/[0.06] hover:shadow-elevated flex flex-col justify-between"
              >
                <div>
                  <div className="w-10 h-10 rounded-2xl bg-brand-royal/60 border border-cyan-400/20 flex items-center justify-center text-brand-cyan mb-4">
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-bold text-white tracking-tight">{item.title}</h3>
                  <p className="text-xs text-slate-300 mt-2 leading-relaxed font-normal">
                    {item.desc}
                  </p>
                </div>

                <div className="mt-6 pt-3 border-t border-white/[0.08] flex items-center gap-1.5 text-[11px] text-brand-cyan font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span>Production Verified</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
