AJ AI Assistant
A modern AI assistant built by AJ STUDIOZ with multiple AI models and advanced features.

Features
Multiple AI Models: Switch between AJ-Fast (Groq), AJ-Creative (Gemini), and AJ-Advanced (Z-AI)
Voice Input: Record and send messages using your voice
Web Search: Automatic web search integration for current information
Image Generation: AI-powered image generation and display
Chat History: Persistent chat history with search functionality
Responsive Design: Works perfectly on desktop, tablet, and mobile
Dark/Light Mode: Theme switching with system detection
Typing Animations: Realistic typing effects with configurable speeds
Deployment
This project is designed to work as both a Next.js application and a static HTML site.

Static Deployment (Vercel)
The static version includes:

index.html - Main application
api/chat.js - API endpoint for AI models
vercel.json - Vercel configuration
Environment Variables
For the API to work, you need to set these environment variables in Vercel:


Line Wrapping

Collapse
Copy
1
2
GROQ_API_KEY=your_groq_api_key
GEMINI_API_KEY=your_gemini_api_key
Usage
Start a new chat: Click the "New Chat" button
Switch AI models: Use the settings modal to switch between models
Voice input: Enable voice input in settings and click the microphone button
Generate images: Ask the AI to create images (works with Z-AI model)
Web search: Ask about current events or latest information
Customize: Adjust font size, typing speed, and theme in settings
Files
index.html - Main static HTML application
api/chat.js - Serverless API function
vercel.json - Vercel deployment configuration
src_backup/ - Next.js source code backup
Technology Stack
Frontend: HTML5, Tailwind CSS, Vanilla JavaScript
Backend: Node.js (Vercel Serverless Functions)
AI Models: Groq, Google Gemini, Z-AI SDK
Deployment: Vercel
License
Created by AJ STUDIOZ
