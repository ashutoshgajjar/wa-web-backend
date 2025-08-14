const ProcessedMessage = require('../models/Message');
const { emitToChat, emitToAll } = require('../utils/socketManager');

class MessageController {
  async processWebhookPayload(payload) {
    try {
      const { metaData } = payload;

      if (!metaData?.entry?.[0]?.changes?.[0]?.value) {
        throw new Error('Invalid payload structure');
      }

      const changeValue = metaData.entry[0].changes[0].value;

      if (changeValue.messages) {
        for (const message of changeValue.messages) {
          await this.processMessage(message, changeValue, payload);
        }
      }

      if (changeValue.statuses) {
        for (const status of changeValue.statuses) {
          await this.processStatusUpdate(status, changeValue);
        }
      }

      return { success: true };
    } catch (error) {
      console.error('Error processing webhook payload:', error);
      throw error;
    }
  }

  async processMessage(message, changeValue, payload) {
    try {
      const isInbound =
        message.from !== changeValue.metadata?.display_phone_number;
      const contact = changeValue.contacts?.[0];
      const waId = isInbound ? message.from : contact?.wa_id || message.from;

      const messageDoc = new ProcessedMessage({
        messageId: message.id,
        conversationId: payload.metaData.entry[0].id,
        from: message.from,
        to: isInbound
          ? changeValue.metadata?.display_phone_number
          : message.from,
        contactName: contact?.profile?.name,
        waId,
        messageType: message.type,
        content: {
          body: message.text?.body || message.caption,
          mediaUrl:
            message.image?.link ||
            message.document?.link ||
            message.audio?.link,
        },
        timestamp: new Date(parseInt(message.timestamp) * 1000),
        direction: isInbound ? 'inbound' : 'outbound',
        businessPhoneId: changeValue.metadata?.phone_number_id,
        appId: payload.metaData.gs_app_id,
        isChat: false,
      });

      const savedMessage = await messageDoc.save();

      await this.updateChatRecord(
        waId,
        savedMessage,
        contact?.profile?.name,
        changeValue.metadata?.phone_number_id,
        payload.metaData.gs_app_id
      );

      emitToChat(waId, 'new_message', savedMessage);
      emitToAll('chat_updated', { waId, message: savedMessage });

      console.log('Message processed:', savedMessage.messageId);
      return savedMessage;
    } catch (error) {
      if (error.code === 11000) {
        console.log('Duplicate message ignored:', message.id);
        return null;
      }
      throw error;
    }
  }

  async updateChatRecord(waId, message, contactName, businessPhoneId, appId) {
    try {
      const chatUpdate = {
        waId,
        contactName: contactName || waId,
        messageType: 'chat',
        isChat: true,
        lastMessage: {
          content: message.content.body,
          timestamp: message.timestamp,
          messageId: message.messageId,
        },
        businessPhoneId,
        appId,
        timestamp: message.timestamp,
        direction: 'inbound',
        updatedAt: new Date(),
      };

      const existingChat = await ProcessedMessage.findOne({
        waId,
        isChat: true,
        businessPhoneId,
      });

      if (existingChat) {
        const updateData = {
          lastMessage: chatUpdate.lastMessage,
          contactName: chatUpdate.contactName,
          timestamp: chatUpdate.timestamp,
          updatedAt: chatUpdate.updatedAt,
        };

        if (message.direction === 'inbound') {
          updateData.$inc = { unreadCount: 1 };
          updateData.isRead = false;
        }

        await ProcessedMessage.findByIdAndUpdate(existingChat._id, updateData);
      } else {
        if (message.direction === 'inbound') {
          chatUpdate.unreadCount = 1;
          chatUpdate.isRead = false;
        }

        const chatRecord = new ProcessedMessage(chatUpdate);
        await chatRecord.save();
      }

      return true;
    } catch (error) {
      console.error('Error updating chat record:', error);
      throw error;
    }
  }

  async processStatusUpdate(status, changeValue) {
    try {
      const messageId = status.id || status.meta_msg_id;

      const updatedMessage = await ProcessedMessage.findOneAndUpdate(
        {
          $or: [{ messageId: messageId }, { metaMessageId: messageId }],
          isChat: false,
        },
        {
          status: status.status,
          metaMessageId: status.meta_msg_id || status.id,
        },
        { new: true }
      );

      if (updatedMessage) {
        if (status.status === 'read') {
          await ProcessedMessage.findOneAndUpdate(
            { waId: status.recipient_id, isChat: true },
            {
              isRead: true,
              unreadCount: 0,
            }
          );
        }

        emitToChat(updatedMessage.waId, 'message_status_updated', {
          messageId: updatedMessage.messageId,
          status: status.status,
        });

        console.log('Status updated:', messageId, status.status);
      }

      return updatedMessage;
    } catch (error) {
      console.error('Error updating message status:', error);
      throw error;
    }
  }

  async getMessages(waId, page = 1, limit = 50) {
    try {
      const skip = (page - 1) * limit;

      const messages = await ProcessedMessage.find({
        waId,
        isChat: false,
        isDeleted: false,
      })
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(limit);

      return messages.reverse();
    } catch (error) {
      console.error('Error fetching messages:', error);
      throw error;
    }
  }

  async getChats(businessPhoneId, page = 1, limit = 20) {
    try {
      const skip = (page - 1) * limit;

      const chats = await ProcessedMessage.find({
        businessPhoneId,
        isChat: true,
        isDeleted: false,
      })
        .sort({ isPinned: -1, updatedAt: -1 })
        .skip(skip)
        .limit(limit);

      return chats;
    } catch (error) {
      console.error('Error fetching chats:', error);
      throw error;
    }
  }

  async getChatsByWaId(
    businessPhoneId,
    page = 1,
    limit = 20,
    specificWaId = null,
    searchTerm = null
  ) {
    try {
      const skip = (page - 1) * limit;

      const query = {
        isChat: true,
        isDeleted: false,
      };

      if (businessPhoneId) {
        query.businessPhoneId = businessPhoneId;
      }

      if (specificWaId) {
        query.waId = specificWaId;
        console.log(`Filtering by specific wa_id: ${specificWaId}`);
      }

      if (searchTerm) {
        query.$or = [
          { waId: { $regex: searchTerm, $options: 'i' } },
          { contactName: { $regex: searchTerm, $options: 'i' } },
        ];
        console.log(`Searching chats with term: ${searchTerm}`);
      }

      console.log('Chat query by wa_id:', JSON.stringify(query, null, 2));

      const chats = await ProcessedMessage.find(query)
        .sort({
          isPinned: -1,
          updatedAt: -1,
        })
        .skip(skip)
        .limit(limit);

      console.log(`Found ${chats.length} chats by wa_id`);

      chats.forEach((chat) => {
        console.log(
          `- wa_id: ${chat.waId}, contact: ${
            chat.contactName || 'No name'
          }, unread: ${chat.unreadCount}`
        );
      });

      return chats;
    } catch (error) {
      console.error('Error fetching chats by wa_id:', error);
      throw error;
    }
  }

  async getChatByWaId(waId, businessPhoneId = null) {
    try {
      console.log(
        `Searching for chat with waId: ${waId}, businessPhoneId: ${businessPhoneId}`
      );

      if (!waId || typeof waId !== 'string') {
        throw new Error('Invalid wa_id provided');
      }

      const query = {
        waId: waId.trim(),
        isChat: true,
        isDeleted: false,
      };

      if (businessPhoneId) {
        query.businessPhoneId = businessPhoneId;
      }

      console.log('Individual chat query:', JSON.stringify(query, null, 2));

      const chat = await ProcessedMessage.findOne(query);

      if (chat) {
        console.log(`✓ Found chat for ${waId}:`, {
          contactName: chat.contactName,
          unreadCount: chat.unreadCount,
          lastMessage: chat.lastMessage?.content,
          isPinned: chat.isPinned,
        });
      } else {
        console.log(`✗ No chat found for waId: ${waId}`);

        const anyChat = await ProcessedMessage.findOne({ waId: waId.trim() });
        if (anyChat) {
          console.log(
            `Found chat but it's ${
              anyChat.isChat ? 'chat' : 'message'
            } type, deleted: ${anyChat.isDeleted}`
          );
        }
      }

      return chat;
    } catch (error) {
      console.error('Error fetching chat by waId:', error);
      throw error;
    }
  }

  async getAllWaIds(businessPhoneId) {
    try {
      const query = {
        isChat: true,
        isDeleted: false,
      };

      if (businessPhoneId) {
        query.businessPhoneId = businessPhoneId;
      }

      const waIds = await ProcessedMessage.distinct('waId', query);

      console.log(`Found ${waIds.length} unique wa_ids:`, waIds);

      return waIds;
    } catch (error) {
      console.error('Error fetching wa_ids:', error);
      throw error;
    }
  }

  async getChatsGroupedByWaId(businessPhoneId) {
    try {
      const pipeline = [
        {
          $match: {
            isChat: true,
            isDeleted: false,
            ...(businessPhoneId && { businessPhoneId }),
          },
        },

        {
          $group: {
            _id: '$waId',
            waId: { $first: '$waId' },
            contactName: { $first: '$contactName' },
            chatRecord: { $first: '$$ROOT' },
            totalUnread: { $sum: '$unreadCount' },
            isPinned: { $first: '$isPinned' },
            lastActivity: { $max: '$updatedAt' },
          },
        },

        {
          $sort: { lastActivity: -1 },
        },
      ];

      const groupedChats = await ProcessedMessage.aggregate(pipeline);

      console.log(`Grouped ${groupedChats.length} chats by wa_id`);

      return groupedChats.map((group) => ({
        waId: group.waId,
        contactName: group.contactName,
        totalUnread: group.totalUnread,
        isPinned: group.isPinned,
        lastActivity: group.lastActivity,
        chat: group.chatRecord,
      }));
    } catch (error) {
      console.error('Error grouping chats by wa_id:', error);
      throw error;
    }
  }
}

module.exports = new MessageController();
