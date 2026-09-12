import React, { createContext, useContext, useState } from 'react';

const TeamChatContext = createContext({
  chatOpen: false,
  openChat: () => {},
  closeChat: () => {},
  toggleChat: () => {},
  chatTicketMention: null,
});

export function TeamChatProvider({ children }) {
  const [chatOpen, setChatOpen] = useState(false);
  const [chatTicketMention, setChatTicketMention] = useState(null);

  const openChat = (ticketId = null) => {
    setChatTicketMention(ticketId);
    setChatOpen(true);
  };

  const closeChat = () => {
    setChatOpen(false);
    setChatTicketMention(null);
  };

  const toggleChat = () => {
    setChatOpen((prev) => !prev);
  };

  return (
    <TeamChatContext.Provider
      value={{
        chatOpen,
        openChat,
        closeChat,
        toggleChat,
        chatTicketMention,
      }}
    >
      {children}
    </TeamChatContext.Provider>
  );
}

export function useTeamChat() {
  return useContext(TeamChatContext);
}
