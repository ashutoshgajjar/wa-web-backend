const express = require('express');
const router = express.Router();
const messageController = require('../controllers/messageController');
const chatController = require('../controllers/chatController');

const ProcessedMessage = require('../models/Message');

function formatWhatsAppNumber(waId) {
  if (!waId || waId.length < 10) return waId;

  const countryCode = waId.slice(0, -10);
  const number = waId.slice(-10);

  return `+${countryCode} ${number.slice(0, 3)} ${number.slice(
    3,
    6
  )} ${number.slice(6)}`;
}

router.get('/', async (req, res) => {
  try {
    const { businessPhoneId, page = 1, limit = 20, waId, search } = req.query;

    console.log('Loading chats with params:', {
      businessPhoneId,
      waId,
      search,
      page,
      limit,
    });

    const chats = await messageController.getChatsByWaId(
      businessPhoneId,
      parseInt(page),
      parseInt(limit),
      waId,
      search
    );

    const formattedChats = chats.map((chat) => ({
      waId: chat.waId,
      id: chat._id,
      contactName: chat.contactName || chat.waId,
      businessPhoneId: chat.businessPhoneId,
      lastMessage: chat.lastMessage,
      unreadCount: chat.unreadCount || 0,
      isRead: chat.isRead !== false,
      isPinned: chat.isPinned || false,
      isDeleted: chat.isDeleted || false,
      timestamp: chat.timestamp,
      updatedAt: chat.updatedAt,
      createdAt: chat.createdAt,

      formattedNumber: formatWhatsAppNumber(chat.waId),
      chatIdentifier: chat.waId,
    }));

    res.json({
      chats: formattedChats,
      total: formattedChats.length,
      page: parseInt(page),
      limit: parseInt(limit),
      filters: {
        businessPhoneId,
        waId: waId || 'all',
        search: search || null,
      },
    });
  } catch (error) {
    console.error('Error loading chats by wa_id:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/:waId/send', async (req, res) => {
  try {
    const { waId } = req.params;
    const { content, messageType = 'text' } = req.body;

    console.log(`Sending message to wa_id: ${waId}`, content);

    if (!content?.body) {
      return res.status(400).json({ error: 'Message content is required' });
    }

    const messageDoc = new ProcessedMessage({
      messageId: `sent_${Date.now()}_${Math.random()
        .toString(36)
        .substr(2, 9)}`,
      waId: waId,
      messageType: messageType,
      content: content,
      timestamp: new Date(),
      direction: 'outbound',
      status: 'sent',
      businessPhoneId: process.env.BUSINESS_PHONE_ID || 'default',
      isChat: false,
    });

    const savedMessage = await messageDoc.save();

    await ProcessedMessage.findOneAndUpdate(
      { waId: waId, isChat: true },
      {
        lastMessage: {
          content: content.body,
          timestamp: savedMessage.timestamp,
          messageId: savedMessage.messageId,
        },
        updatedAt: new Date(),
      },
      { upsert: true }
    );

    const { emitToChat, emitToAll } = require('../utils/socketManager');
    emitToChat(waId, 'new_message', savedMessage);
    emitToAll('chat_updated', { waId, message: savedMessage });

    console.log(`✓ Message sent to wa_id: ${waId}`);
    res.json(savedMessage);
  } catch (error) {
    console.error(`Error sending message to wa_id ${req.params.waId}:`, error);
    res.status(500).json({ error: error.message });
  }
});

router.put('/:waId/read', async (req, res) => {
  try {
    const { waId } = req.params;
    console.log(`API: Marking chat as read for wa_id: ${waId}`);

    const result = await chatController.markChatRead(waId);

    if (!result) {
      return res.status(404).json({
        error: 'Chat not found',
        waId: waId,
      });
    }

    console.log(`API: Successfully marked chat as read for wa_id: ${waId}`);
    res.json({
      success: true,
      waId: waId,
      isRead: true,
      unreadCount: 0,
      message: 'Chat marked as read',
    });
  } catch (error) {
    console.error(
      `API: Error marking chat read for wa_id ${req.params.waId}:`,
      error
    );
    res.status(500).json({ error: error.message });
  }
});

router.put('/:waId/unread', async (req, res) => {
  try {
    const { waId } = req.params;
    console.log(`API: Marking chat as unread for wa_id: ${waId}`);

    const result = await chatController.markChatUnread(waId);

    if (!result) {
      return res.status(404).json({
        error: 'Chat not found',
        waId: waId,
      });
    }

    console.log(`API: Successfully marked chat as unread for wa_id: ${waId}`);
    res.json({
      success: true,
      waId: waId,
      isRead: false,
      unreadCount: 1,
      message: 'Chat marked as unread',
    });
  } catch (error) {
    console.error(
      `API: Error marking chat unread for wa_id ${req.params.waId}:`,
      error
    );
    res.status(500).json({ error: error.message });
  }
});

router.put('/:waId/pin', async (req, res) => {
  try {
    const { waId } = req.params;
    console.log(`Pinning chat for wa_id: ${waId}`);
    const chat = await chatController.pinChat(waId);
    res.json(chat);
  } catch (error) {
    console.error(`Error pinning chat for wa_id ${waId}:`, error);
    res.status(500).json({ error: error.message });
  }
});

router.put('/:waId/unpin', async (req, res) => {
  try {
    const { waId } = req.params;
    console.log(`Unpinning chat for wa_id: ${waId}`);
    const chat = await chatController.unpinChat(waId);
    res.json(chat);
  } catch (error) {
    console.error(`Error unpinning chat for wa_id ${waId}:`, error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/:waId/messages', async (req, res) => {
  try {
    const { waId } = req.params;
    const { page = 1, limit = 50 } = req.query;

    console.log(
      `Getting messages for wa_id: ${waId}, page: ${page}, limit: ${limit}`
    );

    const messages = await messageController.getMessages(
      waId,
      parseInt(page),
      parseInt(limit)
    );

    console.log(`Found ${messages.length} messages for wa_id: ${waId}`);
    res.json(messages);
  } catch (error) {
    console.error(`Error getting messages for wa_id ${waId}:`, error);
    res.status(500).json({ error: error.message });
  }
});

router.put('/:waId/restore', async (req, res) => {
  try {
    const { waId } = req.params;
    console.log(`Restoring chat for wa_id: ${waId}`);
    const result = await chatController.restoreChat(waId);
    res.json(result);
  } catch (error) {
    console.error(`Error restoring chat for wa_id ${waId}:`, error);
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:waId', async (req, res) => {
  try {
    const { waId } = req.params;
    console.log(`Deleting chat for wa_id: ${waId}`);
    const result = await chatController.deleteChat(waId);
    res.json(result);
  } catch (error) {
    console.error(`Error deleting chat for wa_id ${waId}:`, error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/:waId', async (req, res) => {
  try {
    const { waId } = req.params;
    const { businessPhoneId } = req.query;

    console.log(
      `Getting chat details for wa_id: ${waId}, businessPhoneId: ${businessPhoneId}`
    );

    if (!waId || waId.trim() === '') {
      return res.status(400).json({
        error: 'Invalid wa_id provided',
        waId: waId,
      });
    }

    const chat = await messageController.getChatByWaId(waId, businessPhoneId);

    if (!chat) {
      console.log(`No chat found for wa_id: ${waId}`);
      return res.status(404).json({
        error: 'Chat not found',
        waId: waId,
        businessPhoneId: businessPhoneId,
      });
    }

    console.log(`Found chat for wa_id: ${waId}`, {
      contactName: chat.contactName,
      unreadCount: chat.unreadCount,
    });

    const formattedChat = {
      waId: chat.waId,
      id: chat._id,
      contactName: chat.contactName || chat.waId,
      businessPhoneId: chat.businessPhoneId,
      lastMessage: chat.lastMessage,
      unreadCount: chat.unreadCount || 0,
      isRead: chat.isRead !== false,
      isPinned: chat.isPinned || false,
      isDeleted: chat.isDeleted || false,
      timestamp: chat.timestamp,
      updatedAt: chat.updatedAt,
      createdAt: chat.createdAt,
      formattedNumber: formatWhatsAppNumber(chat.waId),
      chatIdentifier: chat.waId,
    };

    res.json(formattedChat);
  } catch (error) {
    console.error(`Error getting chat for wa_id ${req.params.waId}:`, error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
