# Chat Application Frontend

A modern real-time chat application frontend built with React, TypeScript, and Tailwind CSS.

## Features

- 🔐 User Authentication with JWT
- 📱 OTP Verification via Email/SMS
- 💬 Real-time Chat with WebSockets
- 👥 Group Chat Management
- 📁 File Uploads
- 📊 Message Status Tracking (sent, delivered, read)
- 🎨 Responsive UI with Tailwind CSS

## Tech Stack

- **React**: Frontend library for building user interfaces
- **TypeScript**: Type-safe JavaScript
- **Tailwind CSS**: Utility-first CSS framework
- **React Router**: For navigation
- **Formik & Yup**: Form handling and validation
- **Axios**: HTTP client
- **WebSockets**: For real-time communication
- **React Hot Toast**: For toast notifications

## Setup Instructions

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Create a `.env` file in the frontend directory with the following variables:

```
REACT_APP_API_URL=http://localhost:8000
REACT_APP_WS_URL=ws://localhost:8000
```

### 3. Start the development server

```bash
npm start
```

The application will be available at `http://localhost:3000`.

## Project Structure

```
src/
├── components/       # Reusable UI components
├── context/          # React context for state management
├── pages/            # Application pages
├── utils/            # Utility functions
├── App.tsx           # Main application component
└── index.tsx         # Application entry point
```

## Available Scripts

- `npm start`: Start the development server
- `npm build`: Build the application for production
- `npm test`: Run tests
- `npm eject`: Eject from Create React App

## Authentication Flow

1. User registers with email/phone and password
2. OTP is sent to the provided email/phone
3. User verifies OTP
4. User can now log in with email/phone and password
5. JWT token is stored for authenticated requests

## Chat Features

- Real-time messaging with WebSockets
- Message status tracking (sent, delivered, read)
- File uploads (images, audio, etc.)
- Group chat creation and management
- Typing indicators

## Deployment

To build the application for production, run:

```bash
npm run build
```

This will create a `build` directory with optimized production build. 