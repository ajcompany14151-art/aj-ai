export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  
  try {
    const { ai, messages } = req.body;
    
    if (!ai) {
      return res.status(400).json({ error: "Missing 'ai' field (grok, gemini, or zai)" });
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
    if (ai === "grok") {
      const GROQ_API_KEY = process.env.GROQ_API_KEY;
      if (!GROQ_API_KEY) {
        console.log("GROQ_API_KEY not set");
        return res.status(500).json({ error: "GROQ_API_KEY not set" });
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
      if (!GEMINI_API_KEY) {
        console.log("GEMINI_API_KEY not set");
        return res.status(500).json({ error: "GEMINI_API_KEY not set" });
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
        // Import the Z-AI SDK
        const ZAI = await import('z-ai-web-dev-sdk');
        const zai = await ZAI.create();
        
        // Convert messages to the format expected by ZAI
        const formattedMessages = messages.map((msg) => ({
          role: msg.role === 'assistant' ? 'assistant' : 'user',
          content: msg.content || msg.text
        }));
        
        // Add system message if not present
        if (!formattedMessages.some(msg => msg.role === 'system')) {
          formattedMessages.unshift({
            role: 'system',
            content: 'You are AJ, an advanced AI assistant created by AJ STUDIOZ. Provide helpful, accurate, and insightful responses.'
          });
        }
        
        // Check if we need to perform web search
        const lastMessage = messages[messages.length - 1];
        const userMessage = lastMessage?.content || lastMessage?.text || '';
        
        if (shouldPerformWebSearch(userMessage)) {
          try {
            console.log("Performing web search for:", userMessage);
            const searchResults = await performWebSearch(zai, userMessage);
            
            if (searchResults && searchResults.length > 0) {
              // Add web search context to the system message
              const searchContext = searchResults.slice(0, 3).map((result) => 
                `- ${result.name}: ${result.snippet}`
              ).join('\n');
              
              formattedMessages[0].content += `\n\nRecent web search results for context:\n${searchContext}`;
            }
          } catch (searchError) {
            console.error('Web search error:', searchError);
          }
        }
        
        // Check if we need to generate an image
        if (shouldGenerateImage(userMessage)) {
          try {
            const imagePrompt = extractImagePrompt(userMessage);
            if (imagePrompt) {
              console.log("Generating image for prompt:", imagePrompt);
              const imageData = await generateImage(zai, imagePrompt);
              
              if (imageData) {
                // Add image generation note to the response
                return res.status(200).json({ 
                  response: `I've generated an image based on your request. Here's what I created for "${imagePrompt}":\n\n[Image generated: ${imagePrompt}]\n\n${imageData ? 'The image has been generated successfully.' : 'Image generation failed.'}`,
                  imageData: imageData,
                  imagePrompt: imagePrompt
                });
              }
            }
          } catch (imageError) {
            console.error('Image generation error:', imageError);
          }
        }
        
        console.log("Calling Z-AI SDK with messages:", formattedMessages);
        
        const completion = await zai.chat.completions.create({
          messages: formattedMessages,
          temperature: 0.7,
          max_tokens: 2048,
        });
        
        console.log("Z-AI response:", completion);
        
        const botResponse = completion.choices[0]?.message?.content || "I'm sorry, I couldn't generate a response.";
        return res.status(200).json({ response: botResponse });
        
      } catch (zaiError) {
        console.error('Z-AI SDK Error:', zaiError);
        return res.status(500).json({
          error: "Z-AI service error",
          details: zaiError.message
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
    
    if (ai === "grok") {
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

async function performWebSearch(zai, query) {
  try {
    const searchResult = await zai.functions.invoke("web_search", {
      query: query,
      num: 5
    });
    
    return searchResult || [];
  } catch (error) {
    console.error('Web search error:', error);
    return [];
  }
}

function shouldGenerateImage(message) {
  const imageKeywords = [
    'generate', 'create', 'draw', 'make', 'show me', 'image of', 'picture of',
    'visualize', 'illustration', 'art', 'design', 'painting', 'photo'
  ];
  
  const lowerMessage = message.toLowerCase();
  return imageKeywords.some(keyword => lowerMessage.includes(keyword));
}

function extractImagePrompt(message) {
  const patterns = [
    /generate (an? )?image of (.+)/i,
    /create (an? )?(picture|image|art) of (.+)/i,
    /draw (.+)/i,
    /show me (an? )?image of (.+)/i,
    /make (an? )?(visual|illustration) of (.+)/i
  ];
  
  for (const pattern of patterns) {
    const match = message.match(pattern);
    if (match) {
      return match[2] || match[1] || match[3];
    }
  }
  
  // If no pattern matches, use the whole message as the prompt
  return message;
}

async function generateImage(zai, prompt) {
  try {
    const response = await zai.images.generations.create({
      prompt: prompt,
      size: '1024x1024'
    });
    
    return response.data[0]?.base64 || null;
  } catch (error) {
    console.error('Image generation error:', error);
    return null;
  }
}
