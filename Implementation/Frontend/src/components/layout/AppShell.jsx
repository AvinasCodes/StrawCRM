import React, { useState, useEffect, useRef } from 'react';
import {
  Menu,
  LayoutDashboard,
  Ticket,
  Users,
  Bot,
} from 'lucide-react';
import Sidebar from './Sidebar';
import TeamChatPanel from '../chat/TeamChatPanel';
import TicketDetailModal from '../tickets/TicketDetailModal';
import NotificationToastContainer from '../ui/NotificationToastContainer';
import { useTeamChat } from '../../context/TeamChatContext';
import { useAuth } from '../../context/useAuth';
import { useScrollDirection } from '../../hooks/useScrollDirection';
import { subscribeTickets } from '../../services/firestoreService';
import { dispatchTicketNotification } from '../../services/notificationService';

export default function AppShell({ currentPath, onNavigate, children }) {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [modalTicketId, setModalTicketId] = useState(null);

  const { isNavVisible } = useScrollDirection({ threshold: 10, topOffset: 30 });
  const { chatOpen, closeChat, chatTicketMention } = useTeamChat();
  const { user } = useAuth();
  const knownTicketIdsRef = useRef(null);

  // App-wide Real-Time Urgent & Assigned Ticket Notification Listener
  useEffect(() => {
    const unsubscribe = subscribeTickets({}, (allTickets) => {
      if (!Array.isArray(allTickets)) return;

      // On first load, record existing tickets to prevent playing sounds for old tickets
      if (knownTicketIdsRef.current === null) {
        knownTicketIdsRef.current = new Set(allTickets.map((t) => t.ticket_id));
        return;
      }

      allTickets.forEach((t) => {
        if (!knownTicketIdsRef.current.has(t.ticket_id)) {
          knownTicketIdsRef.current.add(t.ticket_id);

          const isUrgent = (t.priority || '').toLowerCase() === 'urgent';
          const userEmail = (user?.email || '').toLowerCase();
          const isAssignedToUser =
            userEmail &&
            (t.assigned_to_email || '').toLowerCase() === userEmail;

          if (isUrgent || isAssignedToUser) {
            dispatchTicketNotification({
              ticket: t,
              recipientEmail: user?.email || 'heyavinashs@gmail.com',
              type: isUrgent ? 'urgent' : 'assigned',
            });
          }
        }
      });
    });

    return () => unsubscribe();
  }, [user]);

  return (
    <div className="h-screen max-h-screen w-full bg-[#F7F9FC] flex flex-col md:flex-row text-slate-900 font-sans overflow-hidden relative">
      {/* Mobile Top Header (LOCKED / PERMANENTLY PINNED AT TOP ON MOBILE) */}
      <header
        className="md:hidden flex items-center justify-between px-4 h-13 bg-[#011662] text-white border-b border-[#011E79] shrink-0 z-40 shadow-sm select-none"
      >
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setMobileSidebarOpen(true)}
            aria-label="Open sidebar navigation"
            className="p-1.5 rounded-xl text-blue-200 hover:text-white hover:bg-white/10 active:bg-white/20 transition-all cursor-pointer"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div
            className="flex items-center gap-1.5 font-black tracking-tight text-white text-base cursor-pointer"
            onClick={() => onNavigate && onNavigate('/dashboard')}
          >
            <span>Straw</span>
            <span className="text-sky-400">CRM</span>
          </div>
        </div>

        <span className="text-[10px] bg-brand-electric px-2.5 py-0.5 rounded-full font-bold shadow-xs">
          Active
        </span>
      </header>

      {/* Sidebar (Desktop hover-to-reveal arrow logic, Mobile sliding drawer) */}
      <Sidebar
        currentPath={currentPath}
        onNavigate={onNavigate}
        mobileOpen={mobileSidebarOpen}
        onCloseMobile={() => setMobileSidebarOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden relative">
        {children}
      </div>

      {/* Mobile Bottom Tab Bar (LOCKED / PERMANENTLY PINNED AT BOTTOM ON MOBILE) */}
      <nav
        aria-label="Mobile Navigation Bar"
        className={`md:hidden fixed bottom-0 inset-x-0 bg-[#011662]/95 backdrop-blur-md border-t border-[#011E79] text-white z-40 px-2 py-1.5 shadow-[0_-4px_20px_rgba(1,22,98,0.4)] transition-transform duration-200 select-none ${
          mobileSidebarOpen
            ? 'opacity-0 pointer-events-none translate-y-full'
            : 'opacity-100 translate-y-0'
        }`}
      >
        <div className="flex items-center justify-around">
          <button
            type="button"
            onClick={() => onNavigate && onNavigate('/dashboard')}
            className={`flex flex-col items-center gap-1 py-1 px-2.5 rounded-lg text-[10px] font-medium transition-colors cursor-pointer ${
              currentPath === '/dashboard' || currentPath === '/'
                ? 'text-brand-cyan font-bold'
                : 'text-blue-200/80 hover:text-white'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>Home</span>
          </button>

          <button
            type="button"
            onClick={() => onNavigate && onNavigate('/tickets')}
            className={`flex flex-col items-center gap-1 py-1 px-2.5 rounded-lg text-[10px] font-medium transition-colors cursor-pointer ${
              currentPath && currentPath.startsWith('/tickets') && currentPath !== '/tickets/create'
                ? 'text-brand-cyan font-bold'
                : 'text-blue-200/80 hover:text-white'
            }`}
          >
            <Ticket className="w-4 h-4" />
            <span>Tickets</span>
          </button>

          <button
            type="button"
            onClick={() => onNavigate && onNavigate('/customers')}
            className={`flex flex-col items-center gap-1 py-1 px-2.5 rounded-lg text-[10px] font-medium transition-colors cursor-pointer ${
              currentPath && currentPath.startsWith('/customers')
                ? 'text-brand-cyan font-bold'
                : 'text-blue-200/80 hover:text-white'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Customers</span>
          </button>

          <button
            type="button"
            onClick={() => onNavigate && onNavigate('/ai')}
            className={`flex flex-col items-center gap-1 py-1 px-2.5 rounded-lg text-[10px] font-medium transition-colors cursor-pointer ${
              currentPath && currentPath.startsWith('/ai')
                ? 'text-brand-cyan font-bold'
                : 'text-blue-200/80 hover:text-white'
            }`}
          >
            <Bot className="w-4 h-4" />
            <span>AI</span>
          </button>
        </div>
      </nav>

      {/* Global Team Workspace Chat Slide-Over Panel */}
      <TeamChatPanel
        isOpen={chatOpen}
        onClose={closeChat}
        onOpenTicket={(tId) => setModalTicketId(tId)}
        initialTicketMention={chatTicketMention}
      />

      {/* Ticket Details Inspection Modal (from Chat ticket mentions) */}
      <TicketDetailModal
        ticketId={modalTicketId}
        isOpen={Boolean(modalTicketId)}
        onClose={() => setModalTicketId(null)}
        onUpdated={() => {}}
        onDelete={() => setModalTicketId(null)}
      />

      {/* Floating Real-Time Notifications & Sound Alert Toasts */}
      <NotificationToastContainer onOpenTicket={(tId) => setModalTicketId(tId)} />
    </div>
  );
}
