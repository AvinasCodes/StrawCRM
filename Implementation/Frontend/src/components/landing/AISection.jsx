import React, { useState } from 'react';
import { Sparkles, Bot, Send, Check, Copy, Loader2, ArrowRight, ShieldAlert, CheckCircle2 } from 'lucide-react';

const DEMO_RESPONSES = {
  empathetic:
    "Hi Sneha, I completely understand how frustrating it is when a charge goes through without a confirmation. I've investigated your transaction with our payment processor — the 3D-Secure timeout triggered a temporary hold, and the amount has already been scheduled for release back to your account. I've also emailed you the trace reference ID #TX-99201. Please let me know if you need anything else!",
  professional:
    "Dear Sneha, thank you for reaching out to Datastraw Operations Support regarding your recent inquiry. Our team telemetry indicates an authentication timeout. The temporary hold is voided and will reflect in your account within 1-2 business banking days. Your support ticket has been prioritized under ref #TKT-1044.",
  direct:
    "Hello Sneha. The charge you see is a temporary pre-authorization hold caused by a payment gateway timeout. It was automatically cancelled and no funds were captured. You will see this reversed on your statement within 24-48 hours. Ticket #TKT-1044 is resolved.",
};

export default function AISection({ onNavigate }) {
  const [tone, setTone] = useState('empathetic');
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState(true);
  const [copied, setCopied] = useState(false);

  const handleGenerate = () => {
    setGenerating(true);
    setGenerated(false);
    setTimeout(() => {
      setGenerating(false);
      setGenerated(true);
    }, 900);
  };

  const handleCopy = () => {
    navigator.clipboard?.writeText?.(DEMO_RESPONSES[tone]);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section id="ai" className="relative py-24 px-4 sm:px-6 lg:px-8 bg-[#020B1F] overflow-hidden">
      {/* Background Volumetric Glows */}
      <div className="absolute top-1/3 left-1/4 w-[600px] h-[600px] bg-brand-cyan/10 rounded-full blur-[180px] pointer-events-none" />
      <div className="absolute bottom-10 right-1/4 w-[500px] h-[500px] bg-brand-electric/15 rounded-full blur-[160px] pointer-events-none" />

      <div className="max-w-6xl mx-auto space-y-12 relative z-10">
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-cyan/10 border border-brand-cyan/30 text-brand-cyan text-xs font-semibold uppercase tracking-wider shadow-glow">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Datastraw AI Intelligence Core</span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight">
            AI Copilot for Datastraw Operators
          </h2>
          <p className="text-sm text-slate-400">
            Accelerate internal triage. Summarize lengthy client inquiry logs in seconds, auto-detect urgency, and draft accurate responses with one click.
          </p>
        </div>

        {/* AI Processing Flow Diagram */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 max-w-4xl mx-auto text-center">
          {[
            { step: '01', title: 'Ticket Ingest', desc: 'Raw customer query' },
            { step: '02', title: 'AI Analysis', desc: 'Intent & sentiment' },
            { step: '03', title: 'AI Summary', desc: 'Instant 2-sentence brief' },
            { step: '04', title: 'Reply Synthesis', desc: 'Multi-tone response' },
            { step: '05', title: 'Fast Resolution', desc: 'Verified by agent' },
          ].map((item, idx) => (
            <div
              key={item.step}
              className="p-3.5 rounded-2xl bg-white/[0.04] border border-white/10 backdrop-blur-md relative group hover:border-cyan-400/40 transition-colors"
            >
              <span className="text-[10px] font-mono text-brand-cyan font-bold tracking-widest block mb-1">
                STEP {item.step}
              </span>
              <p className="text-xs font-bold text-white">{item.title}</p>
              <p className="text-[10px] text-slate-400 mt-0.5">{item.desc}</p>
            </div>
          ))}
        </div>

        {/* Interactive Mini Demonstration Arena */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch max-w-5xl mx-auto">
          {/* Incoming Ticket Context (Left 5 Cols) */}
          <div className="lg:col-span-5 rounded-3xl border border-white/15 bg-[#011662]/50 backdrop-blur-xl p-6 flex flex-col justify-between shadow-elevated">
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <span className="text-xs font-bold font-mono text-brand-cyan">#TKT-1044</span>
                <span className="text-[10px] bg-rose-500/20 text-rose-300 px-2 py-0.5 rounded-full font-semibold border border-rose-500/30">
                  Priority: High
                </span>
              </div>

              <div>
                <p className="text-xs text-slate-400">Customer</p>
                <p className="text-sm font-bold text-white">Sneha Kapoor</p>
                <p className="text-[11px] text-slate-400">sneha@example.com</p>
              </div>

              <div>
                <p className="text-xs text-slate-400">Subject</p>
                <p className="text-xs font-semibold text-white">Payment not working on checkout</p>
              </div>

              <div className="p-3.5 rounded-xl bg-black/30 border border-white/10 text-xs text-slate-200 leading-relaxed">
                "Payment failed but money was deducted from my bank. It shows an error every time I try. Please help!"
              </div>
            </div>

            <div className="pt-5 border-t border-white/10 space-y-2">
              <p className="text-[11px] text-slate-400 font-medium">Select Output Tone:</p>
              <div className="grid grid-cols-3 gap-1.5">
                {['empathetic', 'professional', 'direct'].map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTone(t)}
                    className={`py-1.5 px-2 rounded-xl text-[11px] font-semibold capitalize transition-all cursor-pointer ${
                      tone === t
                        ? 'bg-brand-electric text-white shadow-sm'
                        : 'bg-white/[0.05] text-slate-400 hover:text-white'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={handleGenerate}
                disabled={generating}
                className="w-full mt-3 py-2.5 rounded-xl bg-gradient-to-r from-brand-cyan/90 to-brand-electric text-slate-950 text-xs font-bold hover:brightness-110 shadow-glow flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 transition-all"
              >
                {generating ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Analyzing ticket context...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Regenerate Response</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* AI Response Output (Right 7 Cols) */}
          <div className="lg:col-span-7 rounded-3xl border border-cyan-500/30 bg-[#011E79]/60 backdrop-blur-xl p-6 flex flex-col justify-between shadow-elevated relative overflow-hidden">
            <div className="space-y-4">
              {/* Header */}
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <div className="flex items-center gap-2 text-xs font-bold text-white">
                  <Bot className="w-4 h-4 text-brand-cyan" />
                  <span>AI Suggested Response</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full font-mono font-bold">
                    99.2% Accuracy
                  </span>
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-colors cursor-pointer"
                    title="Copy response"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* Response Text */}
              <div className="p-4 rounded-2xl bg-black/40 border border-white/10 min-h-[160px] flex items-start">
                {generating ? (
                  <div className="w-full flex flex-col items-center justify-center py-8 space-y-2 text-slate-400">
                    <Loader2 className="w-6 h-6 animate-spin text-brand-cyan" />
                    <p className="text-xs">Synthesizing {tone} reply draft...</p>
                  </div>
                ) : (
                  <p className="text-xs sm:text-sm text-slate-100 leading-relaxed font-sans">
                    {DEMO_RESPONSES[tone]}
                  </p>
                )}
              </div>

              {/* Insights Grid */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="p-3 rounded-xl bg-white/[0.04] border border-white/10">
                  <p className="text-[10px] text-slate-400 font-medium">Issue Diagnosis</p>
                  <p className="text-xs font-semibold text-brand-cyan mt-0.5">3DS Gateway Timeout</p>
                </div>
                <div className="p-3 rounded-xl bg-white/[0.04] border border-white/10">
                  <p className="text-[10px] text-slate-400 font-medium">Recommended Action</p>
                  <p className="text-xs font-semibold text-emerald-400 mt-0.5">Auto-Release Pre-Auth</p>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-white/10 flex items-center justify-between">
              <span className="text-[11px] text-slate-400">Agent approval required before sending</span>
              <button
                type="button"
                onClick={() => onNavigate && onNavigate('/ai')}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-cyan hover:underline cursor-pointer"
              >
                <span>Launch AI Assistant</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
