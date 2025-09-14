// /api/chat.js
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  
  const { messages, ai } = req.body;
  
  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: "Invalid messages array" });
  }
  
  try {
    let responseText = "";
    
    // === GEMINI ===
    if (ai === "gemini") {
      const apiKey = process.env.GEMINI_API_KEY;
      const url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=" + apiKey;
      
      // Format messages for Gemini API
      const geminiMessages = messages.map(msg => ({
        role: msg.role === "user" ? "user" : "model",
        parts: [{ text: msg.content }]
      }));
      
      const r = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: geminiMessages
        })
      });
      
      const data = await r.json();
      responseText = data.candidates?.[0]?.content?.parts?.[0]?.text || "No response from Gemini.";
    }
    
    // === GROQ ===
    else if (ai === "groq") {
      const apiKey = process.env.GROQ_API_KEY;
      const url = "https://api.groq.com/openai/v1/chat/completions";
      
      const r = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: "llama3-8b-8192",
          messages: messages,
          temperature: 0.7,
          max_tokens: 1024
        })
      });
      
      const data = await r.json();
      responseText = data.choices?.[0]?.message?.content || "No response from Groq.";
    }
    
    // === Z-AI (using OpenAI API) ===
    else if (ai === "zai") {
      const apiKey = process.env.OPENAI_API_KEY;
      const url = "https://api.openai.com/v1/chat/completions";
      
      const r = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: "gpt-3.5-turbo",
          messages: messages,
          temperature: 0.7,
          max_tokens: 1024
        })
      });
      
      const data = await r.json();
      responseText = data.choices?.[0]?.message?.content || "No response from Z-AI.";
    }
    
    else {
      return res.status(400).json({ error: "Invalid AI provider" });
    }
    
    return res.status(200).json({ response: responseText });
  } catch (error) {
    console.error("API Error:", error);
    return res.status(500).json({ error: error.message });
  }
}
