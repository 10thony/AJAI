import { query, mutation, action, internalQuery, internalMutation, internalAction } from "./_generated/server";
import { v } from "convex/values";
import { getCurrentUserId } from "./auth";
import { api, internal } from "./_generated/api";
import OpenAI from "openai";
const client = new OpenAI();

// Get messages for a chat
export const list = query({
  args: { chatId: v.id("chats"), userId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    // Use explicit userId if provided, otherwise get from context
    const userId = args.userId ?? await getCurrentUserId(ctx);
    // Verify user owns the chat
    const chat = await ctx.db.get(args.chatId);
    if (!chat || chat.userId !== userId) {
      return [];
    }
    return await ctx.db
      .query("messages")
      .withIndex("by_chat", (q) => q.eq("chatId", args.chatId))
      .collect();
  },
});

// Send a message
export const send = mutation({
  args: {
    chatId: v.id("chats"),
    content: v.string(),
    apiKey: v.string(),
    modelId: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getCurrentUserId(ctx);
    // Verify user owns the chat
    const chat = await ctx.db.get(args.chatId);
    if (!chat || chat.userId !== userId) {
      throw new Error("Chat not found");
    }
    // Insert user message
    await ctx.db.insert("messages", {
      chatId: args.chatId,
      content: args.content,
      role: "user",
      userId,
      createdAt: Date.now(),
      updatedAt: Date.now()
    });
    // Create initial AI message for streaming
    const aiMessageId = await ctx.db.insert("messages", {
      chatId: args.chatId,
      content: "",
      role: "assistant",
      createdAt: Date.now(),
      updatedAt: Date.now()
    });
    // Schedule AI response with API key, model ID, and userId
    await ctx.scheduler.runAfter(0, internal.messages.generateAIResponse, {
      chatId: args.chatId,
      messageId: aiMessageId,
      apiKey: args.apiKey,
      modelId: args.modelId,
      userId, // pass userId explicitly
    });
  },
});


// Update streaming message (internal)
export const updateStreamingMessage = internalMutation({
  args: {
    messageId: v.id("messages"),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const message = await ctx.db.get(args.messageId);
    if (!message) return;
    
    // Append the new content to existing content for streaming
    const updatedContent = message.content + args.content;
    await ctx.db.patch(args.messageId, {
      content: updatedContent,
      updatedAt: Date.now()
    });
  },
});

// Generate AI response (internal)
export const generateAIResponse = internalAction({
  args: { 
    chatId: v.id("chats"),
    messageId: v.id("messages"),
    apiKey: v.string(),
    modelId: v.string(),
    userId: v.string(), // add userId
  },
  handler: async (ctx, args) => {
    // Get chat info
    const chat = await ctx.runQuery(internal.messages.getChat, {
      chatId: args.chatId,
    });
    if (!chat) {
      await ctx.runMutation(internal.messages.updateStreamingMessage, {
        messageId: args.messageId,
        content: "Error: Chat not found.",
      });
      return;
    }
    // Get recent messages for context, pass userId explicitly
    const messages = await ctx.runQuery(api.messages.list, {
      chatId: args.chatId,
      userId: args.userId,
    });
    // Format messages for the API
    const formattedMessages = messages.map(msg => ({
      role: msg.role,
      content: msg.content,
    }));
    try {
      // Determine provider from model ID
      let provider: string;
      if (args.modelId.startsWith("gpt-") || args.modelId.startsWith("o1-") || args.modelId.startsWith("o2-") || args.modelId.startsWith("o3-")) {
        provider = "openai";
      } else if (args.modelId.startsWith("claude-")) {
        provider = "anthropic";
      } else if (args.modelId.startsWith("gemini-")) {
        provider = "google";
      } else {
        provider = "huggingface"; // Default for other models
      }
      // Call the appropriate model API based on provider
      let response;
      switch (provider) {
        case "openai":
          response = await callOpenAI(args.apiKey, args.modelId, formattedMessages);
          break;
        case "anthropic":
          response = await callAnthropic(args.apiKey, args.modelId, formattedMessages);
          break;
        case "huggingface":
          response = await callHuggingFace(args.apiKey, args.modelId, formattedMessages);
          break;
        case "google":
          response = await callGoogle(args.apiKey, args.modelId, formattedMessages);
          break;
        default:
          throw new Error(`Unsupported provider: ${provider}. Please contact support.`);
      }
      // Stream the response
      for await (const chunk of response) {
        await ctx.runMutation(internal.messages.updateStreamingMessage, {
          messageId: args.messageId,
          content: chunk,
        });
      }
    } catch (error) {
      console.error("Error generating AI response:", error);
      // Provide more specific error messages
      let errorMessage = "Sorry, I encountered an error while generating a response.";
      if (error instanceof Error) {
        if (error.message.includes("API error")) {
          errorMessage = "Error: Failed to connect to the AI service. Please check your API key and try again.";
        } else if (error.message.includes("Unsupported provider")) {
          errorMessage = "Error: Unsupported AI model provider. Please contact support.";
        }
      }
      await ctx.runMutation(internal.messages.updateStreamingMessage, {
        messageId: args.messageId,
        content: errorMessage,
      });
    }
  },
});

// Get chat (internal) - simplified version without model lookup
export const getChat = internalQuery({
  args: { chatId: v.id("chats") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.chatId);
  },
});

// Helper functions for different model providers
async function* callOpenAI(apiKey: string, modelId: string, messages: any[]) {
  const client = new OpenAI({ apiKey });
  
  try {
    const stream = await client.chat.completions.create({
      model: modelId,
      messages,
      stream: true,
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        yield content;
      }
    }
  } catch (error) {
    console.error("Error in OpenAI stream:", error);
    throw new Error(`OpenAI API error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

async function* callAnthropic(apiKey: string, modelId: string, messages: any[]) {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: modelId,
      messages,
      stream: true,
    }),
  });

  if (!response.ok) {
    throw new Error(`Anthropic API error: ${response.statusText}`);
  }

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error("Failed to get response reader");
  }

  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      if (line.startsWith("data: ")) {
        const data = line.slice(6);
        if (data === "[DONE]") continue;
        
        try {
          const parsed = JSON.parse(data);
          const content = parsed.delta?.text;
          if (content) {
            yield content;
          }
        } catch (e) {
          console.error("Error parsing Anthropic response:", e);
        }
      }
    }
  }
}

// Call Hugging Face API
async function* callHuggingFace(apiKey: string, modelId: string, messages: { role: string; content: string }[]) {
  const response = await fetch(`https://api-inference.huggingface.co/models/${modelId}`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      inputs: messages.map(m => m.content).join("\n"),
      parameters: {
        max_new_tokens: 250,
        temperature: 0.7,
        return_full_text: false,
      },
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Hugging Face API error: ${response.status} - ${JSON.stringify(error)}`);
  }

  const data = await response.json();
  yield data[0].generated_text;
}

// Call Google AI API
async function* callGoogle(apiKey: string, modelId: string, messages: { role: string; content: string }[]) {
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelId}:streamGenerateContent?key=${apiKey}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      contents: [
        {
          parts: messages.map(m => ({
            text: `${m.role}: ${m.content}`
          }))
        }
      ],
      generationConfig: {
        maxOutputTokens: 1024,
        temperature: 0.7,
      },
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Google AI API error: ${error.error?.message || response.statusText}`);
  }

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error("Failed to get response reader");
  }

  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      if (line.startsWith("data: ")) {
        const data = line.slice(6);
        if (data === "[DONE]") continue;
        
        try {
          const parsed = JSON.parse(data);
          const content = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
          if (content) {
            yield content;
          }
        } catch (e) {
          console.error("Error parsing Google response:", e);
        }
      }
    }
  }
}
