const fs = require('fs').promises;
const path = require('path');
require('dotenv').config();
const connectDB = require('../config/database');
const messageController = require('../controllers/messageController');

async function processSampleFiles() {
  try {
    await connectDB();

    const ProcessedMessage = require('../models/Message');
    await ProcessedMessage.deleteMany({});
    console.log('Cleared existing data');

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

    for (const file of files) {
      try {
        const filePath = path.join(__dirname, '..', 'sample-data', file);
        const data = await fs.readFile(filePath, 'utf8');
        const payload = JSON.parse(data);

        console.log(`Processing ${file}...`);
        await messageController.processWebhookPayload(payload);
        console.log(`✓ Processed ${file}`);

        await new Promise((resolve) => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(`Error processing ${file}:`, error.message);
      }
    }

    const chats = await ProcessedMessage.find({ isChat: true });
    const messages = await ProcessedMessage.find({ isChat: false });

    console.log('\n=== PROCESSING COMPLETE ===');
    console.log(`Total chats created: ${chats.length}`);
    console.log(`Total messages processed: ${messages.length}`);

    console.log('\n=== CHAT SUMMARY ===');
    chats.forEach((chat) => {
      console.log(
        `- ${chat.contactName || chat.waId}: ${
          chat.lastMessage?.content || 'No messages'
        } (Unread: ${chat.unreadCount})`
      );
    });

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

processSampleFiles();
