export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  
  try {
    const { ai, messages } = req.body;
    
    if (!ai || !['groq', 'gemini', 'zai'].includes(ai)) {
      return res.status(400).json({ error: "Missing or invalid 'ai' field (must be groq, gemini, or zai)" });
    }
    
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: "Invalid or missing 'messages' array" });
    }

    const lastUserMessage = messages[messages.length - 1]?.content || '';
    
    let url = "";
    let headers = { "Content-Type": "application/json" };
    let body = {};
    let model = "";

    // --- MODEL CONFIGURATION ---

    if (ai === "groq") {
      const GROQ_API_KEY = process.env.GROQ_API_KEY;
      if (!GROQ_API_KEY || GROQ_API_KEY === "your_groq_api_key_here") {
        return res.status(200).json({ response: `This is a fallback response for AJ-Fast (Groq). Please set your GROQ_API_KEY in the environment variables to enable the live model. You asked: "${lastUserMessage}"` });
      }
      url = "https://api.groq.com/openai/v1/chat/completions";
      headers.Authorization = `Bearer ${GROQ_API_KEY}`;
      model = "llama-3.1-70b-versatile"; // Fast model
      body = {
        model,
        messages: messages.map(m => ({
          role: m.role,
          content: m.content
        })),
        temperature: 0.7,
      };

    } else if (ai === "gemini" || ai === "zai") {
      const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
      if (!GEMINI_API_KEY || GEMINI_API_KEY === "your_gemini_api_key_here") {
        const modelName = ai === 'gemini' ? 'AJ-Creative (Gemini)' : 'AJ-Advanced (Z-AI)';
        return res.status(200).json({ response: `This is a fallback response for ${modelName}. Please set your GEMINI_API_KEY in the environment variables to enable the live model. You asked: "${lastUserMessage}"` });
      }
      
      // 'zai' uses the more powerful Gemini Pro model
      model = ai === "zai" ? "gemini-1.5-pro-latest" : "gemini-1.5-flash-latest";
      url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;

      // Convert OpenAI message format to Gemini's format
      const contents = messages.map(msg => ({
        role: msg.role === "assistant" ? "model" : "user",
        parts: [{ text: msg.content }]
      }));
      
      body = {
        contents,
        generationConfig: {
          temperature: 0.8,
          maxOutputTokens: 2048,
        }
      };
    }
    
    // --- API CALL ---
    
    console.log(`Calling ${ai} (${model}) API...`);
    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`${ai} API Error Response:`, errorText);
      return res.status(response.status).json({
        error: `Upstream API error from ${ai.toUpperCase()}`,
        details: errorText
      });
    }
    
    const data = await response.json();
    
    // --- RESPONSE EXTRACTION ---

    let botResponse = "";
    if (ai === "groq") {
      botResponse = data.choices?.[0]?.message?.content;
    } else if (ai === "gemini" || ai === "zai") {
      botResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!botResponse) {
         // Handle cases where the model blocks the response for safety reasons
         const blockReason = data.promptFeedback?.blockReason || "unknown reason";
         botResponse = `[SYSTEM: My response was blocked. Reason: ${blockReason}. Please rephrase your prompt.]`;
      }
    }
    
    if (!botResponse) {
      console.error(`Could not extract response from ${ai} API data:`, data);
      return res.status(500).json({ error: `Failed to parse response from ${ai}` });
    }
    
    return res.status(200).json({ response: botResponse });
    
  } catch (err) {
    console.error("Server-side error in /api/chat:", err);
    return res.status(500).json({
      error: "Internal Server Error",
      details: err.message
    });
  }
}
