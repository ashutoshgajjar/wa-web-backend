const fs = require('fs').promises;
const path = require('path');
const connectDB = require('../config/database');
const messageController = require('../controllers/messageController');

class LocalDataProcessor {
  constructor() {
    this.ProcessedMessage = null;
  }

  async initialize() {
    await connectDB();
    this.ProcessedMessage = require('../models/Message');
  }

  async clearExistingData() {
    await this.ProcessedMessage.deleteMany({});
    console.log('Cleared existing data');
  }

  async processUploadedFiles(filesArray, clearData = true) {
    try {
      await this.initialize();
      
      if (clearData) {
        await this.clearExistingData();
      }

      const results = {
        processed: 0,
        failed: 0,
        errors: []
      };

      for (const fileData of filesArray) {
        try {
          console.log(`Processing ${fileData.filename || 'uploaded file'}...`);
          
          // Parse JSON data
          let payload;
          if (typeof fileData.content === 'string') {
            payload = JSON.parse(fileData.content);
          } else {
            payload = fileData.content;
          }

          await messageController.processWebhookPayload(payload);
          console.log(`✓ Processed ${fileData.filename || 'file'}`);
          
          results.processed++;
          
          // Add delay to prevent overwhelming the database
          await new Promise((resolve) => setTimeout(resolve, 500));
        } catch (error) {
          console.error(`Error processing ${fileData.filename || 'file'}:`, error.message);
          results.failed++;
          results.errors.push({
            filename: fileData.filename,
            error: error.message
          });
        }
      }

      return await this.generateSummary(results);
    } catch (error) {
      console.error('Error in processUploadedFiles:', error);
      throw error;
    }
  }

  async processSampleFiles() {
    try {
      await this.initialize();
      await this.clearExistingData();

      const files = [
        'conversation_1_message_1.json',
        'conversation_1_message_2.json',
        'conversation_1_status_1.json',
        'conversation_1_status_2.json',
        'conversation_2_message_1.json',
        'conversation_2_message_2.json',
        'conversation_2_status_1.json',
        'conversation_2_status_2.json',
      ];

      const filesArray = [];
      
      for (const file of files) {
        const filePath = path.join(__dirname, '..', 'sample-data', file);
        const content = await fs.readFile(filePath, 'utf8');
        filesArray.push({
          filename: file,
          content: content
        });
      }

      return await this.processUploadedFiles(filesArray, false);
    } catch (error) {
      console.error('Error:', error);
      throw error;
    }
  }

  async generateSummary(processingResults) {
    const chats = await this.ProcessedMessage.find({ isChat: true });
    const messages = await this.ProcessedMessage.find({ isChat: false });

    const summary = {
      processing: processingResults,
      data: {
        totalChats: chats.length,
        totalMessages: messages.length,
        chats: chats.map(chat => ({
          contact: chat.contactName || chat.waId,
          lastMessage: chat.lastMessage?.content || 'No messages',
          unreadCount: chat.unreadCount
        }))
      }
    };

    console.log('\n=== PROCESSING COMPLETE ===');
    console.log(`Files processed: ${processingResults.processed}`);
    console.log(`Files failed: ${processingResults.failed}`);
    console.log(`Total chats created: ${summary.data.totalChats}`);
    console.log(`Total messages processed: ${summary.data.totalMessages}`);

    console.log('\n=== CHAT SUMMARY ===');
    summary.data.chats.forEach((chat) => {
      console.log(`- ${chat.contact}: ${chat.lastMessage} (Unread: ${chat.unreadCount})`);
    });

    return summary;
  }
}

module.exports = LocalDataProcessor;
