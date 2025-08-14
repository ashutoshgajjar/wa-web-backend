const mongoose = require('mongoose');

const processedMessageSchema = new mongoose.Schema(
  {
    messageId: {
      type: String,
      sparse: true,
      index: true,
    },
    conversationId: String,
    from: String,
    to: String,
    contactName: String,
    waId: {
      type: String,
      required: true,
      index: true,
    },
    messageType: {
      type: String,
      enum: ['text', 'image', 'document', 'audio', 'video', 'chat'],
      default: 'text',
    },
    content: {
      body: String,
      caption: String,
      mediaUrl: String,
    },
    timestamp: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: ['sent', 'delivered', 'read', 'failed'],
      default: 'sent',
    },
    direction: {
      type: String,
      enum: ['inbound', 'outbound'],
      required: true,
    },
    metaMessageId: String,
    businessPhoneId: String,
    appId: String,

    isChat: {
      type: Boolean,
      default: false,
    },
    lastMessage: {
      content: String,
      timestamp: Date,
      messageId: String,
    },
    unreadCount: {
      type: Number,
      default: 0,
    },
    isRead: {
      type: Boolean,
      default: true,
    },
    isPinned: {
      type: Boolean,
      default: false,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

processedMessageSchema.index({ waId: 1, isChat: 1 });
processedMessageSchema.index({ waId: 1, timestamp: -1, isChat: 1 });
processedMessageSchema.index({ businessPhoneId: 1, isChat: 1, updatedAt: -1 });
processedMessageSchema.index({ isChat: 1, isPinned: -1, updatedAt: -1 });

module.exports = mongoose.model(
  'ProcessedMessage',
  processedMessageSchema,
  'processed_messages'
);
