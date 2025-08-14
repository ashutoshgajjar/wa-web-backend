const mongoose = require('mongoose');

const chatSchema = new mongoose.Schema({
  waId: {
    type: String,
    required: true,
    unique: true
  },
  contactName: String,
  conversationId: String,
  lastMessage: {
    content: String,
    timestamp: Date,
    messageId: String
  },
  unreadCount: {
    type: Number,
    default: 0
  },
  isRead: {
    type: Boolean,
    default: true
  },
  isPinned: {
    type: Boolean,
    default: false
  },
  isDeleted: {
    type: Boolean,
    default: false
  },
  businessPhoneId: String,
  appId: String
}, {
  timestamps: true
});

chatSchema.index({ waId: 1 });
chatSchema.index({ businessPhoneId: 1, updatedAt: -1 });

module.exports = mongoose.model('Chat', chatSchema);
