const ProcessedMessage = require('../models/Message');
const { emitToAll } = require('../utils/socketManager');

class ChatController {
  async markChatRead(waId) {
    try {
      const chat = await ProcessedMessage.findOneAndUpdate(
        { waId, isChat: true },
        {
          isRead: true,
          unreadCount: 0,
        },
        { new: true }
      );

      if (chat) {
        emitToAll('chat_read', { waId });
      }

      return chat;
    } catch (error) {
      console.error('Error marking chat as read:', error);
      throw error;
    }
  }

  async markChatUnread(waId) {
    try {
      const chat = await ProcessedMessage.findOneAndUpdate(
        { waId, isChat: true },
        { isRead: false },
        { new: true }
      );

      if (chat) {
        emitToAll('chat_unread', { waId });
      }

      return chat;
    } catch (error) {
      console.error('Error marking chat as unread:', error);
      throw error;
    }
  }

  async pinChat(waId) {
    try {
      const chat = await ProcessedMessage.findOneAndUpdate(
        { waId, isChat: true },
        { isPinned: true },
        { new: true }
      );

      if (chat) {
        emitToAll('chat_pinned', { waId });
      }

      return chat;
    } catch (error) {
      console.error('Error pinning chat:', error);
      throw error;
    }
  }

  async unpinChat(waId) {
    try {
      const chat = await ProcessedMessage.findOneAndUpdate(
        { waId, isChat: true },
        { isPinned: false },
        { new: true }
      );

      if (chat) {
        emitToAll('chat_unpinned', { waId });
      }

      return chat;
    } catch (error) {
      console.error('Error unpinning chat:', error);
      throw error;
    }
  }

  async deleteChat(waId) {
    try {
      await ProcessedMessage.updateMany({ waId }, { isDeleted: true });

      emitToAll('chat_deleted', { waId });

      return { success: true };
    } catch (error) {
      console.error('Error deleting chat:', error);
      throw error;
    }
  }

  async restoreChat(waId) {
    try {
      await ProcessedMessage.updateMany({ waId }, { isDeleted: false });

      emitToAll('chat_restored', { waId });

      return { success: true };
    } catch (error) {
      console.error('Error restoring chat:', error);
      throw error;
    }
  }
}

module.exports = new ChatController();
