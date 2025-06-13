import { action, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { internal, api } from "./_generated/api";
import { Doc } from "./_generated/dataModel";

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

// Initialize Google AI client
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY!);

export const sendAnthropicMessage = action({
  args: {
    message: v.string(),
  },
  returns: v.string(),
  handler: async (ctx, args) => {
    try {
      const msg = await anthropic.messages.create({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 1024,
        messages: [
          {
            role: "user",
            content: args.message,
          },
        ],
      });

      const assistantResponse =
        msg.content[0].type === "text"
          ? msg.content[0].text
          : "No text response.";
      return assistantResponse;
    } catch (error: any) {
      console.error("Error in Anthropic chat submission:", error);
      throw new Error(error.message || "An unexpected error occurred.");
    }
  },
});

export const sendOpenAIMessage = action({
  args: {
    message: v.string(),
  },
  returns: v.string(),
  handler: async (ctx, args) => {
    try {
      const completion = await openai.chat.completions.create({
        model: "o3-mini",
        messages: [
          {
            role: "user",
            content: args.message,
          },
        ],
        max_completion_tokens: 1024,
      });

      const assistantResponse = completion.choices[0]?.message?.content || "No response.";
      return assistantResponse;
    } catch (error: any) {
      console.error("Error in OpenAI chat submission:", error);
      throw new Error(error.message || "An unexpected error occurred.");
    }
  },
});

// Send message to Hugging Face model
export const sendHuggingFaceMessage = action({
  args: { message: v.string() },
  returns: v.string(),
  handler: async (ctx, args) => {
    // For now, return a mock response
    return `[Hugging Face] I received your message: "${args.message}"`;
  },
});

// Send message to Gemini AI
export const sendGeminiMessage = action({
  args: { message: v.string() },
  returns: v.string(),
  handler: async (ctx, args) => {
    try {
      const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
      
      const result = await model.generateContent(args.message);
      const response = await result.response;
      const text = response.text();
      
      return text || "No response.";
    } catch (error: any) {
      console.error("Error in Gemini chat submission:", error);
      throw new Error(error.message || "An unexpected error occurred.");
    }
  },
});

// Get model info (internal)
export const getModelInfo = internalQuery({
  args: { modelId: v.id("aiModels") },
  returns: v.union(v.object({
    _id: v.id("aiModels"),
    _creationTime: v.number(),
    name: v.string(),
    provider: v.string(),
    modelId: v.string(),
    apiKeyEnvVar: v.string(),
    isActive: v.boolean(),
    description: v.optional(v.string()),
    maxTokens: v.optional(v.number()),
    temperature: v.optional(v.number()),
    helpLinks: v.optional(v.array(v.object({
      title: v.string(),
      url: v.string(),
      description: v.optional(v.string()),
    }))),
    createdAt: v.number(),
    updatedAt: v.number(),
  }), v.null()),
  handler: async (ctx, args) => {
    return await ctx.db.get(args.modelId);
  },
});

// Send message to any provider
export const sendMessage = action({
  args: {
    message: v.string(),
    modelId: v.id("aiModels"),
    apiKey: v.string(),
  },
  returns: v.string(),
  handler: async (ctx, args) => {
    // Get model info
    const model = await ctx.runQuery(internal.chat.getModelInfo, {
      modelId: args.modelId,
    });
    
    if (!model) {
      throw new Error("Model not found");
    }

    try {
      // Call the appropriate model API based on provider
      let response: string;
      switch (model.provider) {
        case "openai":
          response = await ctx.runAction(api.chat.sendOpenAIMessage, { message: args.message });
          break;
        case "anthropic":
          response = await ctx.runAction(api.chat.sendAnthropicMessage, { message: args.message });
          break;
        case "huggingface":
          response = await ctx.runAction(api.chat.sendHuggingFaceMessage, { message: args.message });
          break;
        case "google":
          response = await ctx.runAction(api.chat.sendGeminiMessage, { message: args.message });
          break;
        default:
          throw new Error(`Unsupported provider: ${model.provider}. Please contact support.`);
      }
      
      return response;
    } catch (error: any) {
      console.error("Error in chat submission:", error);
      throw new Error(error.message || "An unexpected error occurred.");
    }
  },
});