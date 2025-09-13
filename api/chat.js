// /api/chat.js

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { messages, provider = "gemini" } = req.body;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: "Invalid messages array" });
  }

  try {
    let responseText = "";

    // === GEMINI ===
    if (provider === "gemini") {
      const apiKey = process.env.GEMINI_API_KEY;
      const url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=" + apiKey;

      const r = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [{ text: messages.map(m => m.content).join("\n") }]
            }
          ]
        })
      });
      const data = await r.json();
      responseText = data.candidates?.[0]?.content?.parts?.[0]?.text || "No response from Gemini.";
    }

    // === GROQ ===
    else if (provider === "groq") {
      const apiKey = process.env.GROQ_API_KEY;
      const url = "https://api.groq.com/openai/v1/chat/completions";

      const r = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: "llama-3.1-70b-versatile", // updated model
          messages
        })
      });
      const data = await r.json();
      responseText = data.choices?.[0]?.message?.content || "No response from Groq.";
    }

    // === Z-AI Fallback ===
    else if (provider === "zai") {
      try {
        const { ZAIClient } = await import("z-ai-web-dev-sdk");
        const client = new ZAIClient({ apiKey: process.env.ZAI_API_KEY });

        const reply = await client.chat(messages);
        responseText = reply?.content || "No response from Z-AI.";
      } catch (err) {
        responseText = "Z-AI SDK not installed or failed.";
      }
    }

    return res.status(200).json({ reply: responseText });

  } catch (error) {
    console.error("API Error:", error);
    return res.status(500).json({ error: error.message });
  }
}
