// netlify/functions/chat.js
exports.handler = async (event, context) => {
  // Set CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };
  
  // Handle preflight OPTIONS request
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers,
      body: ""
    };
  }
  
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  }
  
  try {
    const { messages, ai } = JSON.parse(event.body);
    
    // Validate input
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "Invalid or empty messages array" }),
      };
    }
    
    // Check for required environment variables
    const requiredEnvVars = {
      'groq': 'GROQ_API_KEY',
      'gemini': 'GEMINI_API_KEY',
      'zai': 'OPENAI_API_KEY'
    };
    
    const envVar = requiredEnvVars[ai];
    if (!envVar || !process.env[envVar]) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: `API key not configured for ${ai}` }),
      };
    }
    
    let responseText = "";
    let apiUrl = "";
    let requestBody = {};
    let requestHeaders = {
      'Content-Type': 'application/json'
    };
    
    // === GEMINI ===
    if (ai === "gemini") {
      const apiKey = process.env.GEMINI_API_KEY;
      apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
      
      // Convert messages to Gemini format
      const geminiMessages = messages.map((msg) => ({
        role: msg.role === "user" ? "user" : "model",
        parts: [{ text: msg.content }]
      }));
      
      requestBody = {
        contents: geminiMessages,
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 1024,
        }
      };
    }
    // === GROQ ===
    else if (ai === "groq") {
      const apiKey = process.env.GROQ_API_KEY;
      apiUrl = "https://api.groq.com/openai/v1/chat/completions";
      
      requestHeaders['Authorization'] = `Bearer ${apiKey}`;
      requestBody = {
        model: "llama3-8b-8192",
        messages: messages,
        temperature: 0.7,
        max_tokens: 1024,
      };
    }
    // === Z-AI (OpenAI) ===
    else if (ai === "zai") {
      const apiKey = process.env.OPENAI_API_KEY;
      apiUrl = "https://api.openai.com/v1/chat/completions";
      
      requestHeaders['Authorization'] = `Bearer ${apiKey}`;
      requestBody = {
        model: "gpt-3.5-turbo",
        messages: messages,
        temperature: 0.7,
        max_tokens: 1024,
      };
    } else {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "Invalid AI provider" }),
      };
    }
    
    console.log(`Sending request to ${ai} API...`);
    
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: requestHeaders,
      body: JSON.stringify(requestBody),
    });
    
    if (!response.ok) {
      const errorData = await response.text();
      console.error(`API Error (${response.status}):`, errorData);
      return {
        statusCode: response.status,
        headers,
        body: JSON.stringify({ 
          error: `API request failed with status ${response.status}`,
          details: errorData
        }),
      };
    }
    
    const data = await response.json();
    
    // Extract response text based on AI provider
    if (ai === "gemini") {
      responseText = data.candidates?.[0]?.content?.parts?.[0]?.text || "No response from Gemini.";
    } else if (ai === "groq") {
      responseText = data.choices?.[0]?.message?.content || "No response from Groq.";
    } else if (ai === "zai") {
      responseText = data.choices?.[0]?.message?.content || "No response from Z-AI.";
    }
    
    if (!responseText) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: "Empty response from AI provider" }),
      };
    }
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ response: responseText }),
    };
  } catch (error) {
    console.error("Function error:", error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: "Internal server error",
        details: error.message 
      }),
    };
  }
};
