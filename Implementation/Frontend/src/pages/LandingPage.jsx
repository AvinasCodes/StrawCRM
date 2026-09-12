import React, { useEffect, useState } from 'react';
import Navbar from '../components/landing/Navbar';
import Hero from '../components/landing/Hero';
import ChallengeSolution from '../components/landing/ChallengeSolution';
import TicketShowcase from '../components/landing/TicketShowcase';
import AISection from '../components/landing/AISection';
import WorkflowSection from '../components/landing/WorkflowSection';
import AnalyticsSection from '../components/landing/AnalyticsSection';
import FinalCTA from '../components/landing/FinalCTA';
import ShowcaseModal from '../components/landing/ShowcaseModal';

export default function LandingPage({ onNavigate }) {
  const [showShowcase, setShowShowcase] = useState(false);
  useEffect(() => {
    // Dynamic SEO title
    document.title = 'StrawCRM · Datastraw.in Internal Support & Operations Desk';

    // Update meta description
    let metaDesc = document.querySelector('meta[name="description"]');
    if (!metaDesc) {
      metaDesc = document.createElement('meta');
      metaDesc.name = 'description';
      document.head.appendChild(metaDesc);
    }
    metaDesc.content =
      'Internal customer support ticketing and service operations system for Datastraw.in teams, powered by AI.';

    // Smooth scroll behavior
    document.documentElement.style.scrollBehavior = 'smooth';
    return () => {
      document.documentElement.style.scrollBehavior = 'auto';
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#020B1F] text-slate-100 font-sans selection:bg-brand-cyan selection:text-slate-950 overflow-x-hidden">
      {/* Fixed Glass Navbar */}
      <Navbar onNavigate={onNavigate} />

      {/* 1. Full-Viewport Hero — Dashboard visual + 3D Torus */}
      <Hero onNavigate={onNavigate} onShowcase={() => setShowShowcase(true)} />

      {/* 2. Challenge → Solution */}
      <ChallengeSolution onNavigate={onNavigate} />

      {/* 3. Ticket Management Workspace */}
      <TicketShowcase onNavigate={onNavigate} />

      {/* 4. AI Support Intelligence */}
      <AISection onNavigate={onNavigate} />

      {/* 5. 5-Stage Workflow Pipeline */}
      <WorkflowSection onNavigate={onNavigate} />

      {/* 6. Operational Analytics & Reports */}
      <AnalyticsSection onNavigate={onNavigate} />

      {/* 7. Final Call to Action & Footer */}
      <FinalCTA onNavigate={onNavigate} />

      {/* Showcase Modal */}
      {showShowcase && (
        <ShowcaseModal
          onClose={() => setShowShowcase(false)}
          onNavigate={onNavigate}
        />
      )}
    </div>
  );
}
