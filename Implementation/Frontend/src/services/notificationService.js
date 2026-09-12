/**
 * StrawCRM Notification & Audio Alert Service
 * 
 * Manages sound alerts via Web Audio API (zero external assets, 100% offline/online reliability)
 * and dispatches email alert simulations / browser notifications for urgent and assigned tickets.
 */

let audioCtx = null;

/**
 * Synthesizes a crisp, professional two-tone harmonic alert chime via Web Audio API.
 */
export function playUrgentAlertSound() {
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;

    if (!audioCtx || audioCtx.state === 'closed') {
      audioCtx = new AudioContextClass();
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }

    const now = audioCtx.currentTime;

    // Tone 1: E5 (659.25 Hz) bell chime
    const osc1 = audioCtx.createOscillator();
    const gain1 = audioCtx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(659.25, now);
    gain1.gain.setValueAtTime(0.22, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
    osc1.connect(gain1);
    gain1.connect(audioCtx.destination);
    osc1.start(now);
    osc1.stop(now + 0.28);

    // Tone 2: A5 (880.00 Hz) pure harmonic strike
    const osc2 = audioCtx.createOscillator();
    const gain2 = audioCtx.createGain();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(880.0, now + 0.12);
    gain2.gain.setValueAtTime(0.25, now + 0.12);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.48);
    osc2.connect(gain2);
    gain2.connect(audioCtx.destination);
    osc2.start(now + 0.12);
    osc2.stop(now + 0.48);
  } catch (e) {
    console.warn('[NotificationService] Audio chime error:', e);
  }
}

/**
 * Read current notification preferences from durable storage.
 */
export function getNotificationPreferences() {
  try {
    const raw = localStorage.getItem('strawcrm_preferences');
    if (raw) {
      const p = JSON.parse(raw);
      return {
        emailNotifications: p.emailNotifications !== undefined ? Boolean(p.emailNotifications) : true,
        soundAlerts: p.soundAlerts !== undefined ? Boolean(p.soundAlerts) : true,
      };
    }
  } catch {}
  return { emailNotifications: true, soundAlerts: true };
}

/**
 * Persist notification preferences and notify the entire application immediately.
 */
export function setNotificationPreference(key, value) {
  try {
    const raw = localStorage.getItem('strawcrm_preferences');
    const prefs = raw ? JSON.parse(raw) : {};
    prefs[key] = Boolean(value);
    localStorage.setItem('strawcrm_preferences', JSON.stringify(prefs));

    window.dispatchEvent(
      new CustomEvent('notification-prefs-change', {
        detail: { ...prefs, [key]: Boolean(value) },
      })
    );
  } catch (e) {
    console.warn('[NotificationService] Failed to save preference:', e);
  }
}

/**
 * Request native browser notification permission if available.
 */
export async function requestBrowserNotificationPermission() {
  if (typeof window !== 'undefined' && 'Notification' in window) {
    if (Notification.permission === 'default') {
      try {
        return await Notification.requestPermission();
      } catch {}
    }
    return Notification.permission;
  }
  return 'unsupported';
}

/**
 * Dispatch an alert notification (with audio chime and email banner) if preferences permit.
 */
export function dispatchTicketNotification({
  ticket,
  recipientEmail,
  type = 'urgent',
}) {
  const prefs = getNotificationPreferences();

  // 1. Play sound alert if enabled and condition met
  if (prefs.soundAlerts) {
    playUrgentAlertSound();
  }

  // 2. Dispatch email / in-app notification toast event
  if (prefs.emailNotifications || prefs.soundAlerts) {
    const toastEvent = new CustomEvent('strawcrm-notification-toast', {
      detail: {
        id: `toast_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        type,
        ticketId: ticket?.ticket_id || 'TKT',
        subject: ticket?.subject || 'Support Ticket Update',
        priority: ticket?.priority || 'Urgent',
        recipientEmail: recipientEmail || 'agent@strawcrm.io',
        soundPlayed: prefs.soundAlerts,
        emailDispatched: prefs.emailNotifications,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    });
    window.dispatchEvent(toastEvent);
  }

  // 3. Optional native browser notification
  if (
    prefs.emailNotifications &&
    typeof window !== 'undefined' &&
    'Notification' in window &&
    Notification.permission === 'granted'
  ) {
    try {
      new Notification(`StrawCRM Alert: #${ticket?.ticket_id || ''} ${ticket?.priority || ''}`, {
        body: `${ticket?.subject || 'Urgent ticket update'}\nEmail alert sent to ${recipientEmail}`,
        icon: '/brand-logo.png',
      });
    } catch {}
  }
}

/**
 * Dispatch an agent assignment notification toast indicating automated email sent to support agent.
 */
export function dispatchAssignmentNotification({
  ticket,
  agentName,
  agentEmail,
}) {
  const prefs = getNotificationPreferences();

  // 1. Play chime if sound alerts enabled
  if (prefs.soundAlerts) {
    playUrgentAlertSound();
  }

  // 2. Dispatch in-app corner toast
  const toastEvent = new CustomEvent('strawcrm-notification-toast', {
    detail: {
      id: `toast_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      type: 'assignment',
      ticketId: ticket?.ticket_id || 'TKT',
      subject: ticket?.subject || 'Support Ticket Assignment',
      priority: ticket?.priority || 'Normal',
      agentName: agentName || 'Support Agent',
      recipientEmail: agentEmail || 'agent@strawcrm.io',
      soundPlayed: prefs.soundAlerts,
      emailDispatched: true,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  });
  window.dispatchEvent(toastEvent);

  // 3. Optional browser notification
  if (
    prefs.emailNotifications &&
    typeof window !== 'undefined' &&
    'Notification' in window &&
    Notification.permission === 'granted'
  ) {
    try {
      new Notification(`StrawCRM: #${ticket?.ticket_id || ''} Assigned`, {
        body: `Ticket assigned to ${agentName}. Notification email dispatched to ${agentEmail}.`,
        icon: '/brand-logo.png',
      });
    } catch {}
  }
}

