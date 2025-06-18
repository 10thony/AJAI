# AJChat - AI-Powered Chat Application

A modern, real-time chat application built with React, Vite, Convex, and Clerk authentication, featuring AI-powered responses using multiple AI providers (OpenAI, Anthropic, Google AI, and Hugging Face).

## 🚀 Features

- **Real-time Chat**: Instant messaging with real-time updates
- **AI Integration**: Multi-provider AI responses (OpenAI, Anthropic, Google AI, Hugging Face)
- **Authentication**: Secure user authentication with Clerk
- **Modern UI**: Beautiful, responsive interface built with Tailwind CSS
- **TypeScript**: Full TypeScript support for better development experience
- **Real-time Database**: Powered by Convex for instant data synchronization

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (version 18 or higher) - [Download here](https://nodejs.org/)
- **npm** (comes with Node.js) or **yarn**
- **Git** - [Download here](https://git-scm.com/)

## 🛠️ Setup Instructions

### 1. Clone or Download the Repository

**Option A: Clone with Git**
```bash
git clone https://github.com/yourusername/AJChat.git
cd AJChat
```

**Option B: Download ZIP**
- Download the ZIP file from GitHub
- Extract it to your desired location
- Open terminal/command prompt in the extracted folder

### 2. Navigate to the Project Directory

```bash
cd cloneauthon3
```

### 3. Install Dependencies

```bash
npm install
```

### 4. Set Up Environment Variables

Create a `.env` file in the `cloneauthon3` directory with the following variables:

```env
# Convex Backend
VITE_CONVEX_URL=your_convex_url_here

# Clerk Authentication
VITE_CLERK_PUBLISHABLE_KEY=pk_test_your_clerk_publishable_key_here

# AI API Keys (for backend)
OPENAI_API_KEY=your_openai_api_key_here
ANTHROPIC_API_KEY=your_anthropic_api_key_here
GOOGLE_AI_API_KEY=your_google_ai_api_key_here
HF_API_KEY=your_huggingface_api_key_here
```

### 5. Set Up Convex Backend

1. **Install Convex CLI** (if not already installed):
   ```bash
   npm install -g convex
   ```

2. **Login to Convex**:
   ```bash
   npx convex dev --configure
   ```

3. **Deploy your backend**:
   ```bash
   npx convex dev
   ```

4. **Copy the Convex URL** from the terminal output and add it to your `.env` file as `VITE_CONVEX_URL`.

### 6. Set Up Clerk Authentication

1. **Create a Clerk Account**: Go to [clerk.com](https://clerk.com) and create an account

2. **Create a New Application**: 
   - Create a new application in your Clerk dashboard
   - Choose "Next.js" as your framework (works well with Vite/React)

3. **Get Your Publishable Key**:
   - In your Clerk dashboard, go to "API Keys"
   - Copy your "Publishable Key" (starts with `pk_test_` or `pk_live_`)
   - Add it to your `.env` file as `VITE_CLERK_PUBLISHABLE_KEY`

4. **Configure Authentication Methods**:
   - In your Clerk dashboard, go to "User & Authentication" > "Email, Phone, Username"
   - Enable the authentication methods you want (email/password, OAuth providers, etc.)

5. **Set Up Your Domain**:
   - Go to "Paths" in your Clerk dashboard
   - Add your development domain (e.g., `http://localhost:5173`)
   - Add your production domain when ready

### 7. Set Up AI API Keys

You'll need API keys from the AI providers you want to use:

- **OpenAI**: Get your API key from [OpenAI Platform](https://platform.openai.com/api-keys)
- **Anthropic**: Get your API key from [Anthropic Console](https://console.anthropic.com/)
- **Google AI**: Get your API key from [Google AI Studio](https://makersuite.google.com/app/apikey)
- **Hugging Face**: Get your API key from [Hugging Face Settings](https://huggingface.co/settings/tokens)

Add these keys to your `.env` file.

## 🚀 Running the Application

### Development Mode

1. **Start the development server**:
   ```bash
   npm run dev
   ```

   This command will:
   - Start the Vite development server for the frontend
   - Start the Convex development server for the backend
   - Open your browser automatically to `http://localhost:5173`

2. **Access the application**:
   - Open your browser and go to `http://localhost:5173`
   - Sign in using the authentication method you configured in Clerk
   - Start chatting!

### Production Build

To create a production build:

```bash
npm run build
```

The built files will be in the `dist` directory.

## 📁 Project Structure

```
cloneauthon3/
├── convex/                 # Backend code (Convex functions)
│   ├── schema.ts          # Database schema
│   ├── auth.ts            # Authentication functions
│   ├── chats.ts           # Chat management
│   ├── messages.ts        # Message handling
│   └── aiModels.ts        # AI integration
├── src/                   # Frontend code (React)
│   ├── components/        # React components
│   ├── pages/            # Page components
│   ├── lib/              # Utility functions
│   └── main.tsx          # App entry point
├── package.json          # Dependencies and scripts
├── vite.config.ts        # Vite configuration
├── tailwind.config.js    # Tailwind CSS configuration
└── .env                  # Environment variables (create this)
```

## 🔧 Available Scripts

- `npm run dev` - Start development servers (frontend + backend)
- `npm run dev:frontend` - Start only the frontend development server
- `npm run dev:backend` - Start only the Convex development server
- `npm run build` - Build the application for production
- `npm run lint` - Run TypeScript and ESLint checks

## 🐛 Troubleshooting

### Common Issues

1. **"Convex URL not found" error**:
   - Make sure you've set up Convex and added the URL to your `.env` file
   - Run `npx convex dev` to get the correct URL

2. **"Clerk key not found" error**:
   - Verify your Clerk publishable key is correctly set in `.env`
   - Make sure you've configured your domain in Clerk dashboard

3. **"AI API key not found" error**:
   - Ensure all required AI API keys are set in your `.env` file
   - Check that the API keys are valid and have sufficient credits

4. **Port already in use**:
   - The default port is 5173. If it's busy, Vite will automatically use the next available port
   - Check the terminal output for the actual URL being used

### Getting Help

- Check the [Convex documentation](https://docs.convex.dev/)
- Visit the [Clerk documentation](https://clerk.com/docs)
- Review the [Vite documentation](https://vitejs.dev/)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- Built with [Convex](https://convex.dev) for real-time backend
- Authentication powered by [Clerk](https://clerk.com)
- UI built with [Tailwind CSS](https://tailwindcss.com)
- Frontend framework: [React](https://reactjs.org) + [Vite](https://vitejs.dev) 
