import { query, mutation, action, internalQuery, internalMutation, internalAction } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { api, internal } from "./_generated/api";

// Get messages for a chat
export const list = query({
  args: { chatId: v.id("chats") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return [];
    }
    
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
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }
    
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
    });
    
    // Create initial AI message for streaming
    const aiMessageId = await ctx.db.insert("messages", {
      chatId: args.chatId,
      content: "",
      role: "assistant",
    });
    
    // Schedule AI response
    await ctx.scheduler.runAfter(0, internal.messages.generateAIResponse, {
      chatId: args.chatId,
      messageId: aiMessageId,
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
    await ctx.db.patch(args.messageId, {
      content: args.content,
    });
  },
});

// Generate AI response (internal)
export const generateAIResponse = internalAction({
  args: { 
    chatId: v.id("chats"),
    messageId: v.id("messages"),
  },
  handler: async (ctx, args) => {
    // Get chat and model info
    const chat = await ctx.runQuery(internal.messages.getChatWithModel, {
      chatId: args.chatId,
    });
    
    if (!chat || !chat.model) {
      await ctx.runMutation(internal.messages.updateStreamingMessage, {
        messageId: args.messageId,
        content: "Error: Chat or model configuration not found.",
      });
      return;
    }
    
    // Get recent messages for context
    const messages = await ctx.runQuery(api.messages.list, {
      chatId: args.chatId,
    });
    
    // Format messages for the API
    const formattedMessages = messages.map(msg => ({
      role: msg.role,
      content: msg.content,
    }));
    
    try {
      // Get API key from environment
      const apiKey = process.env[chat.model.apiKeyEnvVar];
      if (!apiKey) {
        throw new Error(`API key not found for model ${chat.model.name}. Please check your environment variables.`);
      }
      
      // Call the appropriate model API based on provider
      let response;
      switch (chat.model.provider) {
        case "openai":
          response = await callOpenAI(apiKey, chat.model.modelId, formattedMessages);
          break;
        case "anthropic":
          response = await callAnthropic(apiKey, chat.model.modelId, formattedMessages);
          break;
        default:
          throw new Error(`Unsupported provider: ${chat.model.provider}. Please contact support.`);
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
        if (error.message.includes("API key not found")) {
          errorMessage = "Error: API key not configured. Please contact your administrator.";
        } else if (error.message.includes("API error")) {
          errorMessage = "Error: Failed to connect to the AI service. Please try again later.";
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

// Get chat with model (internal)
export const getChatWithModel = internalQuery({
  args: { chatId: v.id("chats") },
  handler: async (ctx, args) => {
    const chat = await ctx.db.get(args.chatId);
    if (!chat) {
      return null;
    }
    
    const model = await ctx.db.get(chat.modelId);
    return {
      ...chat,
      model,
    };
  },
});

// Helper functions for different model providers
async function* callOpenAI(apiKey: string, modelId: string, messages: any[]) {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: modelId,
      messages,
      stream: true,
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.statusText}`);
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
          const content = parsed.choices[0]?.delta?.content;
          if (content) {
            yield content;
          }
        } catch (e) {
          console.error("Error parsing OpenAI response:", e);
        }
      }
    }
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
