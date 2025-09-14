export async function handler(event, context) {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  }

  try {
    const { messages, ai } = JSON.parse(event.body);

    if (!messages || !Array.isArray(messages)) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Invalid messages array" }),
      };
    }

    let responseText = "";

    // === GEMINI ===
    if (ai === "gemini") {
      const apiKey = process.env.GEMINI_API_KEY;
      const url =
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=" +
        apiKey;

      const geminiMessages = messages.map((msg) => ({
        role: msg.role === "user" ? "user" : "model",
        parts: [{ text: msg.content }],
      }));

      const r = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: geminiMessages,
        }),
      });

      const data = await r.json();
      responseText =
        data.candidates?.[0]?.content?.parts?.[0]?.text || "No response from Gemini.";
    }

    // === GROQ ===
    else if (ai === "groq") {
      const apiKey = process.env.GROQ_API_KEY;
      const url = "https://api.groq.com/openai/v1/chat/completions";

      const r = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "llama3-8b-8192",
          messages: messages,
          temperature: 0.7,
          max_tokens: 1024,
        }),
      });

      const data = await r.json();
      responseText = data.choices?.[0]?.message?.content || "No response from Groq.";
    }

    // === Z-AI (OpenAI) ===
    else if (ai === "zai") {
      const apiKey = process.env.OPENAI_API_KEY;
      const url = "https://api.openai.com/v1/chat/completions";

      const r = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-3.5-turbo",
          messages: messages,
          temperature: 0.7,
          max_tokens: 1024,
        }),
      });

      const data = await r.json();
      responseText = data.choices?.[0]?.message?.content || "No response from Z-AI.";
    } else {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Invalid AI provider" }),
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ response: responseText }),
    };
  } catch (error) {
    console.error("API Error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
}
