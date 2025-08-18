# WhatsApp Business Chat Backend

A robust Node.js backend service for processing WhatsApp Business API webhooks and managing chat conversations with real-time messaging capabilities.

## Overview

This backend handles WhatsApp webhook payloads, stores conversation data in MongoDB, and provides REST APIs for chat management. Perfect for businesses looking to integrate WhatsApp messaging into their applications.

## Features

- 🔗 **WhatsApp Webhook Processing** - Handles incoming messages and status updates
- 💬 **Real-time Messaging** - WebSocket support for live chat updates
- 📊 **Chat Management** - Complete CRUD operations for conversations
- 👤 **Account Profiles** - Business profile management with contact details
- 🔒 **Secure CORS** - Environment-specific security configurations
- 📱 **Message Status Tracking** - Delivery, read receipts, and error handling
- ☁️ **Cloud Ready** - Optimized for Render deployment with MongoDB Atlas


## Tech Stack

- **Runtime:** Node.js 18+
- **Framework:** Express.js
- **Database:** MongoDB Atlas
- **Real-time:** Socket.IO


## Quick Start

### Prerequisites

- Node.js 18 or higher
- MongoDB Atlas account
<!-- - WhatsApp Business API credentials -->


### Installation

1. Clone the repository
```bash
git clone https://github.com/ashutoshgajjar/wa-web-backend
cd wa-web-backend
```

2. Install dependencies
```bash
npm install
```

3. Set up environment variables
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. Start the development server
```bash
npm run dev
```

Your server will be running at `http://localhost:3000`

## API Endpoints

### Chat Management

- `GET /api/chats` - Get all chats
- `GET /api/chats/:waId` - Get specific chat by WhatsApp ID
- `GET /api/chats/:waId/messages` - Get messages for a chat
- `POST /api/chats/:waId/send` - Send a message
- `PUT /api/chats/:waId/read` - Mark chat as read
- `DELETE /api/chats/:waId` - Delete chat


### Account Profiles

- `GET /api/account-profile/:businessPhoneId` - Get business profile
- `POST /api/account-profile` - Create business profile
- `PUT /api/account-profile/:businessPhoneId` - Update business profile


### WebSocket Events

- `join_chat` - Join a chat room
- `new_message` - New message received
- `message_status_updated` - Message status changed
- `chat_updated` - Chat information updated