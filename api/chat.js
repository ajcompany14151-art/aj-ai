export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  
  try {
    const { ai, messages } = req.body;
    
    if (!ai) {
      return res.status(400).json({ error: "Missing 'ai' field (groq, gemini, or zai)" });
    }
    
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: "Invalid chat history provided" });
    }
    
    console.log(`Processing request with AI model: ${ai}`);
    console.log(`Messages count: ${messages.length}`);
    
    let url = "";
    let headers = { "Content-Type": "application/json" };
    let body = {};
    
    // GROQ branch
    if (ai === "groq") {
      const GROQ_API_KEY = process.env.GROQ_API_KEY;
      if (!GROQ_API_KEY || GROQ_API_KEY === "your_groq_api_key_here") {
        console.log("GROQ_API_KEY not set or using placeholder - using fallback response");
        // Fallback response for demonstration
        const lastMessage = messages[messages.length - 1];
        const userMessage = lastMessage?.content || lastMessage?.text || '';
        
        return res.status(200).json({ 
          response: `I'm AJ-Fast, your Groq-powered assistant. I'm currently running in demonstration mode since the GROQ_API_KEY is not configured. 
        
You asked: "${userMessage}"
In a real deployment, I would provide intelligent responses using Groq's Llama 3 model. To enable full functionality, please add your Groq API key to the environment variables.
This is a simulated response for demonstration purposes. The actual AI would provide much more detailed and accurate responses based on your query.`
        });
      }
      
      url = "https://api.groq.com/openai/v1/chat/completions";
      headers.Authorization = `Bearer ${GROQ_API_KEY}`;
      
      body = {
        model: "llama3-70b-8192",
        messages: messages.map(m => ({
          role: m.role || (m.sender === "ai" ? "assistant" : "user"),
          content: m.content || m.text
        })),
        temperature: 0.7,
        max_tokens: 1024
      };
    }
    // GEMINI branch
    else if (ai === "gemini") {
      const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
      if (!GEMINI_API_KEY || GEMINI_API_KEY === "your_gemini_api_key_here") {
        console.log("GEMINI_API_KEY not set or using placeholder - using fallback response");
        // Fallback response for demonstration
        const lastMessage = messages[messages.length - 1];
        const userMessage = lastMessage?.content || lastMessage?.text || '';
        
        return res.status(200).json({ 
          response: `I'm AJ-Creative, your Gemini-powered assistant. I'm currently running in demonstration mode since the GEMINI_API_KEY is not configured.
        
You asked: "${userMessage}"
In a real deployment, I would provide creative and intelligent responses using Google's Gemini model. To enable full functionality, please add your Gemini API key to the environment variables.
This is a simulated response for demonstration purposes. The actual AI would provide much more detailed, creative, and accurate responses based on your query.`
        });
      }
      
      url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${GEMINI_API_KEY}`;
      
      let systemInstruction = null;
      const contents = messages
        .map(turn => {
          if (turn.role === "system") {
            systemInstruction = { parts: [{ text: turn.content || turn.text }] };
            return null;
          }
          return {
            role: turn.role === "assistant" ? "model" : "user",
            parts: [{ text: turn.content || turn.text }]
          };
        })
        .filter(Boolean);
      
      body = {
        contents,
        ...(systemInstruction && { systemInstruction }),
        safetySettings: [
          { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
          { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
          { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
          { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" }
        ],
        generationConfig: {
          temperature: 0.8,
          topK: 1,
          topP: 1,
          maxOutputTokens: 2048
        }
      };
    }
    // Z-AI branch
    else if (ai === "zai") {
      try {
        // For Vercel deployment, we'll simulate Z-AI functionality
        // In a real deployment with proper backend, this would use the Z-AI SDK
        console.log("Processing Z-AI request (simulated for Vercel deployment)");
        
        const lastMessage = messages[messages.length - 1];
        const userMessage = lastMessage?.content || lastMessage?.text || '';
        
        // Check if we need to perform web search
        if (shouldPerformWebSearch(userMessage)) {
          console.log("Web search would be performed for:", userMessage);
          // In a real implementation, this would use Z-AI web search
          return res.status(200).json({ 
            response: `I'm AJ-Advanced, your Z-AI powered assistant. I detected that you're asking about current information that would require web search.
You asked: "${userMessage}"
In a real deployment with proper Z-AI SDK integration, I would search the web for the most current information and provide you with up-to-date results.
This is a simulated response for demonstration purposes. The actual AI would perform real web searches and provide current, accurate information.`
          });
        }
        
        // Check if we need to generate an image
        if (shouldGenerateImage(userMessage)) {
          console.log("Image generation would be performed for:", userMessage);
          // In a real implementation, this would use Z-AI image generation
          return res.status(200).json({ 
            response: `I'm AJ-Advanced, your Z-AI powered assistant. I detected that you're requesting an image generation.
You asked: "${userMessage}"
In a real deployment with proper Z-AI SDK integration, I would generate an image based on your description and provide it to you.
This is a simulated response for demonstration purposes. The actual AI would generate real images based on your prompts.`
          });
        }
        
        // Regular response for Z-AI
        return res.status(200).json({ 
          response: `I'm AJ-Advanced, your Z-AI powered assistant. I'm currently running in demonstration mode for Vercel deployment.
You asked: "${userMessage}"
In a real deployment with proper Z-AI SDK integration, I would provide advanced responses with capabilities like web search, image generation, and more sophisticated AI processing.
This is a simulated response for demonstration purposes. The actual Z-AI assistant would provide much more comprehensive and feature-rich responses.`
        });
        
      } catch (zaiError) {
        console.error('Z-AI Error:', zaiError);
        return res.status(500).json({
          error: "Z-AI service error",
          details: zaiError.message || 'Unknown error'
        });
      }
    }
    // Unknown AI model
    else {
      return res.status(400).json({ error: "Invalid AI model specified" });
    }
    
    // Call the API
    console.log(`Calling ${ai} API at: ${url}`);
    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body)
    });
    
    console.log(`${ai} API response status:`, response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error("API Error:", errorText);
      return res.status(response.status).json({
        error: "Upstream API error",
        details: errorText
      });
    }
    
    const data = await response.json();
    console.log(`${ai} API response data:`, data);
    
    // Extract AI response
    let botResponse = "No response";
    
    if (ai === "groq") {
      botResponse = data.choices?.[0]?.message?.content || "No response";
    } else if (ai === "gemini") {
      if (data.candidates?.[0]?.content?.parts) {
        botResponse = data.candidates[0].content.parts.map(p => p.text).join("\n");
      } else {
        botResponse = `I am unable to provide a response. Reason: ${data.promptFeedback?.blockReason || "Unknown"}`;
      }
    }
    
    console.log(`Final response from ${ai}:`, botResponse);
    
    return res.status(200).json({ response: botResponse });
    
  } catch (err) {
    console.error("Server error:", err);
    return res.status(500).json({
      error: "Server error",
      details: err.message
    });
  }
}

// Helper functions
function shouldPerformWebSearch(message) {
  const webSearchKeywords = [
    'latest', 'recent', 'current', 'today', 'yesterday', 'news', 'update',
    'what is happening', 'what happened', 'weather', 'stock price', 'score',
    'who won', 'election', 'sports', 'market', 'price', 'trending'
  ];
  
  const lowerMessage = message.toLowerCase();
  return webSearchKeywords.some(keyword => lowerMessage.includes(keyword));
}

function shouldGenerateImage(message) {
  const imageKeywords = [
    'generate', 'create', 'draw', 'make', 'show me', 'image of', 'picture of',
    'visualize', 'illustration', 'art', 'design', 'painting', 'photo'
  ];
  
  const lowerMessage = message.toLowerCase();
  return imageKeywords.some(keyword => lowerMessage.includes(keyword));
}
