/**
 * Vercel Serverless Function to proxy requests to Grok & Gemini APIs.
 * Place this file in the /api directory.
 */
export default async function handler(req, res) {
  // 1. Only allow POST requests
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  
  try {
    // 2. Get input from frontend
    const { ai, messages } = req.body;
    if (!ai) {
      return res.status(400).json({ error: "Missing 'ai' field (grok or gemini)" });
    }
    
    // Support both history[] and messages[]
    const chatHistory = messages;
    if (!chatHistory || !Array.isArray(chatHistory)) {
      return res.status(400).json({ error: "Invalid chat history provided" });
    }
    
    let url = "";
    let headers = { "Content-Type": "application/json" };
    let body = {};
    
    // 3. GROK branch
    if (ai === "grok") {
      const GROQ_API_KEY = process.env.GROQ_API_KEY;
      if (!GROQ_API_KEY) {
        return res.status(500).json({ error: "GROQ_API_KEY not set" });
      }
      
      url = "https://api.groq.com/openai/v1/chat/completions";
      headers.Authorization = `Bearer ${GROQ_API_KEY}`;
      
      body = {
        model: "llama-3.3-70b-versatile", // default Grok model
        messages: chatHistory.map(m => ({
          role: m.role || (m.sender === "ai" ? "assistant" : "user"),
          content: m.content || m.text
        }))
      };
    }
    // 4. GEMINI branch
    else if (ai === "gemini") {
      const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
      if (!GEMINI_API_KEY) {
        return res.status(500).json({ error: "GEMINI_API_KEY not set" });
      }
      
      url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${GEMINI_API_KEY}`;
      
      let systemInstruction = null;
      const contents = chatHistory
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
          temperature: 0.7,
          topK: 1,
          topP: 1,
          maxOutputTokens: 1024
        }
      };
    }
    // 5. Use Z-AI SDK as primary or specific request
    else if (ai === "zai") {
      try {
        // Import the Z-AI SDK dynamically
        const ZAI = await import('z-ai-web-dev-sdk');
        const zai = await ZAI.create();
        
        // Convert messages to the format expected by ZAI
        const formattedMessages = chatHistory.map((msg) => ({
          role: msg.role === 'assistant' ? 'assistant' : 'user',
          content: msg.content || msg.text
        }));
        
        // Add system message if not present
        if (!formattedMessages.some(msg => msg.role === 'system')) {
          formattedMessages.unshift({
            role: 'system',
            content: 'You are AJ, an advanced AI assistant created by AJ STUDIOZ. You are helpful, creative, and knowledgeable. Provide clear, concise, and accurate responses to user questions and requests. You have access to real-time information and can help with a wide range of tasks including coding, writing, analysis, research, and creative projects.'
          });
        }
        
        const completion = await zai.chat.completions.create({
          messages: formattedMessages,
          temperature: 0.7,
          max_tokens: 2048,
        });
        
        const botResponse = completion.choices[0]?.message?.content || "I apologize, but I'm unable to generate a response at the moment.";
        return res.status(200).json({ 
          response: botResponse,
          model: "AJ-ZAI (Z-AI SDK)",
          timestamp: new Date().toISOString()
        });
        
      } catch (zaiError) {
        console.error('Z-AI SDK Error:', zaiError);
        return res.status(500).json({
          error: "Z-AI SDK service error",
          details: zaiError.message || "Z-AI SDK failed to process the request"
        });
      }
    }
    // 6. Use Z-AI SDK as fallback for other models
    else {
      try {
        // Import the Z-AI SDK dynamically
        const ZAI = await import('z-ai-web-dev-sdk');
        const zai = await ZAI.create();
        
        // Convert messages to the format expected by ZAI
        const formattedMessages = chatHistory.map((msg) => ({
          role: msg.role === 'assistant' ? 'assistant' : 'user',
          content: msg.content || msg.text
        }));
        
        // Add system message if not present
        if (!formattedMessages.some(msg => msg.role === 'system')) {
          formattedMessages.unshift({
            role: 'system',
            content: 'You are a helpful AI assistant. Provide clear, concise, and accurate responses.'
          });
        }
        
        const completion = await zai.chat.completions.create({
          messages: formattedMessages,
          temperature: 0.7,
          max_tokens: 1024,
        });
        
        const botResponse = completion.choices[0]?.message?.content || "No response";
        return res.status(200).json({ response: botResponse });
        
      } catch (zaiError) {
        console.error('Z-AI SDK Error:', zaiError);
        return res.status(500).json({
          error: "AI service error",
          details: "Both external APIs and Z-AI SDK failed"
        });
      }
    }
    
    // 6. Call the API
    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error("API Error:", errorText);
      return res.status(response.status).json({
        error: "Upstream API error",
        details: errorText
      });
    }
    
    const data = await response.json();
    
    // 7. Extract AI response
    let botResponse = "No response";
    
    if (ai === "grok") {
      botResponse = data.choices?.[0]?.message?.content || "No response";
    } else if (ai === "gemini") {
      if (data.candidates?.[0]?.content?.parts) {
        botResponse = data.candidates[0].content.parts.map(p => p.text).join("\n");
      } else {
        botResponse = `I am unable to provide a response. Reason: ${data.promptFeedback?.blockReason || "Unknown"}`;
      }
    }
    
    return res.status(200).json({ response: botResponse });
    
  } catch (err) {
    console.error("Server error:", err);
    return res.status(500).json({
      error: "Server error",
      details: err.message
    });
  }
}
