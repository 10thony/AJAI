import { action, internalQuery, query, internalAction } from "./_generated/server";
import { v } from "convex/values";
import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { internal, api } from "./_generated/api";
import { Doc } from "./_generated/dataModel";

// Available models for each provider
const OPENAI_MODELS = {
  "gpt-4-turbo-preview": "GPT-4 Turbo (Latest)",
  "gpt-4": "GPT-4",
  "gpt-3.5-turbo": "GPT-3.5 Turbo",
  "gpt-3.5-turbo-16k": "GPT-3.5 Turbo 16K",
} as const;

const ANTHROPIC_MODELS = {
  "claude-3-opus-20240229": "Claude 3 Opus",
  "claude-3-sonnet-20240229": "Claude 3 Sonnet",
  "claude-3-haiku-20240307": "Claude 3 Haiku",
  "claude-2.1": "Claude 2.1",
} as const;

const GOOGLE_MODELS = {
  "gemini-pro": "Gemini Pro",
  "gemini-pro-vision": "Gemini Pro Vision",
  "gemini-1.5-pro": "Gemini 1.5 Pro",
  "gemini-1.5-pro-vision": "Gemini 1.5 Pro Vision",
} as const;

const HUGGINGFACE_MODELS = {
  "mistralai/Mistral-7B-Instruct-v0.2": "Mistral 7B Instruct",
  "meta-llama/Llama-2-70b-chat-hf": "Llama 2 70B Chat",
  "google/flan-t5-xxl": "FLAN-T5 XXL",
  "bigscience/bloom": "BLOOM",
} as const;

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

// Fetch available models from OpenAI
const fetchOpenAIModels = async (apiKey: string) => {
  const response = await fetch("https://api.openai.com/v1/models", {
    headers: {
      "Authorization": `Bearer ${apiKey}`,
    },
  });
  
  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.status}`);
  }
  
  const data = await response.json();
  const models: Record<string, string> = {};
  
  for (const model of data.data) {
    if (model.id.startsWith("gpt-")) {
      models[model.id] = model.id;
    }
  }
  
  return models;
};

// Fetch available models from Anthropic
const fetchAnthropicModels = async (apiKey: string) => {
  const response = await fetch("https://api.anthropic.com/v1/models", {
    headers: {
      "x-api-key": apiKey,
    },
  });
  
  if (!response.ok) {
    throw new Error(`Anthropic API error: ${response.status}`);
  }
  
  const data = await response.json();
  const models: Record<string, string> = {};
  
  for (const model of data.models) {
    if (model.id.startsWith("claude-")) {
      models[model.id] = model.id;
    }
  }
  
  return models;
};

// Fetch available models from Google AI
const fetchGoogleModels = async (apiKey: string) => {
  const response = await fetch("https://generativelanguage.googleapis.com/v1beta/models", {
    headers: {
      "x-goog-api-key": apiKey,
    },
  });
  
  if (!response.ok) {
    throw new Error(`Google AI API error: ${response.status}`);
  }
  
  const data = await response.json();
  const models: Record<string, string> = {};
  
  for (const model of data.models) {
    if (model.name.startsWith("models/gemini-")) {
      const modelId = model.name.replace("models/", "");
      models[modelId] = modelId;
    }
  }
  
  return models;
};

// Action to fetch models from all providers
export const fetchAvailableModels = internalAction({
  args: {
    openaiKey: v.string(),
    anthropicKey: v.string(),
    googleKey: v.string(),
  },
  returns: v.object({
    openai: v.record(v.string(), v.string()),
    anthropic: v.record(v.string(), v.string()),
    google: v.record(v.string(), v.string()),
    huggingface: v.record(v.string(), v.string()),
  }),
  handler: async (ctx, args) => {
    try {
      const [openaiModels, anthropicModels, googleModels] = await Promise.all([
        fetchOpenAIModels(args.openaiKey),
        fetchAnthropicModels(args.anthropicKey),
        fetchGoogleModels(args.googleKey),
      ]);

      return {
        openai: openaiModels,
        anthropic: anthropicModels,
        google: googleModels,
        huggingface: HUGGINGFACE_MODELS, // Keep this static for now as Hugging Face requires different auth
      };
    } catch (error: any) {
      console.error("Error fetching models:", error);
      throw new Error(`Failed to fetch models: ${error.message}`);
    }
  },
});

// Update the getAvailableModels to be an action
export const getAvailableModels = action({
  args: {},
  returns: v.object({
    openai: v.record(v.string(), v.string()),
    anthropic: v.record(v.string(), v.string()),
    google: v.record(v.string(), v.string()),
    huggingface: v.record(v.string(), v.string()),
  }),
  handler: async (ctx): Promise<{
    openai: Record<string, string>;
    anthropic: Record<string, string>;
    google: Record<string, string>;
    huggingface: Record<string, string>;
  }> => {
    // Get API keys from environment variables
    const openaiKey = process.env.OPENAI_API_KEY;
    const anthropicKey = process.env.ANTHROPIC_API_KEY;
    const googleKey = process.env.GOOGLE_AI_API_KEY;

    if (!openaiKey || !anthropicKey || !googleKey) {
      throw new Error("Missing required API keys in environment variables");
    }

    // Call the action to fetch models
    return await ctx.runAction(internal.chat.fetchAvailableModels, {
      openaiKey,
      anthropicKey,
      googleKey,
    });
  },
});