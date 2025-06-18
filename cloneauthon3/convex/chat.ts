import { action, internalQuery, query, internalAction } from "./_generated/server";
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

export const sendAnthropicMessage = action({
  args: {
    message: v.string(),
    modelId: v.string(),
  },
  returns: v.string(),
  handler: async (ctx, args) => {
    try {
      const msg = await anthropic.messages.create({
        model: args.modelId,
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

// Helper function to determine the correct token parameter for OpenAI models
const getOpenAITokenParameter = (modelId: string) => {
  // o3 models use max_completion_tokens instead of max_tokens
  if (modelId.startsWith("o3-")) {
    return { max_completion_tokens: 1024 };
  }
  // All other models use max_tokens
  return { max_tokens: 1024 };
};

export const sendOpenAIMessage = action({
  args: {
    message: v.string(),
    modelId: v.string(),
  },
  returns: v.string(),
  handler: async (ctx, args) => {
    try {
      const tokenParameter = getOpenAITokenParameter(args.modelId);
      
      const completion = await openai.chat.completions.create({
        model: args.modelId,
        messages: [
          {
            role: "user",
            content: args.message,
          },
        ],
        ...tokenParameter,
      });

      const assistantResponse = completion.choices[0]?.message?.content || "No response.";
      return assistantResponse;
    } catch (error: any) {
      console.error("Error in OpenAI chat submission:", error);
      throw new Error(error.message || "An unexpected error occurred.");
    }
  },
});

// Helper function to send OpenAI message with custom API key and model
const sendOpenAIMessageWithKey = async (message: string, modelId: string, apiKey: string) => {
  const tokenParameter = getOpenAITokenParameter(modelId);
  
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: modelId,
      messages: [
        {
          role: "user",
          content: message,
        },
      ],
      ...tokenParameter,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`OpenAI API error: ${error.error?.message || response.statusText}`);
  }

  const data = await response.json();
  return data.choices[0]?.message?.content || "No response.";
};

// Send message to Hugging Face model
export const sendHuggingFaceMessage = action({
  args: { 
    message: v.string(),
    modelId: v.string(),
  },
  returns: v.string(),
  handler: async (ctx, args) => {
    // For now, return a mock response
    return `[Hugging Face - ${args.modelId}] I received your message: "${args.message}"`;
  },
});

// Send message to Gemini AI
export const sendGeminiMessage = action({
  args: { 
    message: v.string(),
    modelId: v.string(),
  },
  returns: v.string(),
  handler: async (ctx, args) => {
    try {
      const model = genAI.getGenerativeModel({ model: args.modelId });
      
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
    modelId: v.string(),
    apiKey: v.string(),
  },
  returns: v.string(),
  handler: async (ctx, args) => {
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
      let response: string;
      switch (provider) {
        case "openai":
          response = await sendOpenAIMessageWithKey(args.message, args.modelId, args.apiKey);
          break;
        case "anthropic":
          response = await sendAnthropicMessageWithKey(args.message, args.modelId, args.apiKey);
          break;
        case "huggingface":
          response = await sendHuggingFaceMessageWithKey(args.message, args.modelId, args.apiKey);
          break;
        case "google":
          response = await sendGeminiMessageWithKey(args.message, args.modelId, args.apiKey);
          break;
        default:
          throw new Error(`Unsupported provider: ${provider}. Please contact support.`);
      }
      
      return response;
    } catch (error: any) {
      console.error("Error in chat submission:", error);
      throw new Error(error.message || "An unexpected error occurred.");
    }
  },
});

// Helper function to send Anthropic message with custom API key and model
const sendAnthropicMessageWithKey = async (message: string, modelId: string, apiKey: string) => {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "Content-Type": "application/json",
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: modelId,
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: message,
        },
      ],
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Anthropic API error: ${error.error?.message || response.statusText}`);
  }

  const data = await response.json();
  return data.content[0]?.type === "text" ? data.content[0].text : "No text response.";
};

// Helper function to send Google message with custom API key and model
const sendGeminiMessageWithKey = async (message: string, modelId: string, apiKey: string) => {
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${apiKey}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            {
              text: message,
            },
          ],
        },
      ],
      generationConfig: {
        maxOutputTokens: 1024,
      },
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Google AI API error: ${error.error?.message || response.statusText}`);
  }

  const data = await response.json();
  return data.candidates[0]?.content?.parts[0]?.text || "No response.";
};

// Helper function to send Hugging Face message with custom API key and model
const sendHuggingFaceMessageWithKey = async (message: string, modelId: string, apiKey: string) => {
  const response = await fetch(`https://api-inference.huggingface.co/models/${modelId}`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      inputs: message,
      parameters: {
        max_new_tokens: 1024,
        temperature: 0.7,
      },
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Hugging Face API error: ${error.error || response.statusText}`);
  }

  const data = await response.json();
  return data[0]?.generated_text || "No response.";
};

// Fetch available models from OpenAI
const fetchOpenAIModels = async (apiKey: string) => {
  const response = await fetch("https://api.openai.com/v1/models", {
    headers: {
      "Authorization": `Bearer ${apiKey}`,
    },
  });
  
  if (!response.ok) {
    if (response.status === 401) {
      throw new Error("Invalid API key. Please check your OpenAI API key.");
    } else if (response.status === 403) {
      throw new Error("API key doesn't have access to models. Please check your OpenAI subscription.");
    } else {
      throw new Error(`OpenAI API error: ${response.status} - ${response.statusText}`);
    }
  }
  
  const data = await response.json();
  const models: Array<{id: string, name: string, description?: string}> = [];
  
  for (const model of data.data) {
    if (model.id.startsWith("gpt-") || model.id.startsWith("o1-") || model.id.startsWith("o2-") || model.id.startsWith("o3-")) {
      models.push({
        id: model.id,
        name: model.id,
        description: model.description || undefined
      });
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
    if (response.status === 401) {
      throw new Error("Invalid API key. Please check your Anthropic API key.");
    } else if (response.status === 403) {
      throw new Error("API key doesn't have access to models. Please check your Anthropic subscription.");
    } else {
      throw new Error(`Anthropic API error: ${response.status} - ${response.statusText}`);
    }
  }
  
  const data = await response.json();
  const models: Array<{id: string, name: string, description?: string}> = [];
  
  for (const model of data.models) {
    if (model.id.startsWith("claude-")) {
      models.push({
        id: model.id,
        name: model.id,
        description: model.description || undefined
      });
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
    if (response.status === 400) {
      throw new Error("Invalid API key. Please check your Google AI API key.");
    } else if (response.status === 403) {
      throw new Error("API key doesn't have access to models. Please check your Google AI API access.");
    } else {
      throw new Error(`Google AI API error: ${response.status} - ${response.statusText}`);
    }
  }
  
  const data = await response.json();
  const models: Array<{id: string, name: string, description?: string}> = [];
  
  for (const model of data.models) {
    if (model.name.startsWith("models/gemini-")) {
      const modelId = model.name.replace("models/", "");
      models.push({
        id: modelId,
        name: modelId,
        description: model.description || undefined
      });
    }
  }
  
  return models;
};

// Fetch available models from Hugging Face
const fetchHuggingFaceModels = async (apiKey: string) => {
  const response = await fetch("https://huggingface.co/api/models?filter=text-generation&sort=downloads&direction=-1&limit=50", {
    headers: {
      "Authorization": `Bearer ${apiKey}`,
    },
  });
  
  if (!response.ok) {
    if (response.status === 401) {
      throw new Error("Invalid API key. Please check your Hugging Face API key.");
    } else if (response.status === 403) {
      throw new Error("API key doesn't have access to models. Please check your Hugging Face access permissions.");
    } else {
      throw new Error(`Hugging Face API error: ${response.status} - ${response.statusText}`);
    }
  }
  
  const data = await response.json();
  const models: Array<{id: string, name: string, description?: string}> = [];
  
  for (const model of data) {
    if (model.modelId && model.downloads > 1000) { // Only include popular models
      models.push({
        id: model.modelId,
        name: model.modelId,
        description: model.description || undefined
      });
    }
  }
  
  return models;
};

// Action to fetch models for a specific provider using user's API key
export const fetchModelsForProvider = action({
  args: {
    provider: v.string(),
    apiKey: v.string(),
  },
  returns: v.array(v.object({
    id: v.string(),
    name: v.string(),
    description: v.optional(v.string()),
  })),
  handler: async (ctx, args) => {
    try {
      let models: Array<{id: string, name: string, description?: string}> = [];
      
      switch (args.provider) {
        case "openai":
          models = await fetchOpenAIModels(args.apiKey);
          break;
        case "anthropic":
          models = await fetchAnthropicModels(args.apiKey);
          break;
        case "google":
          models = await fetchGoogleModels(args.apiKey);
          break;
        case "huggingface":
          models = await fetchHuggingFaceModels(args.apiKey);
          break;
        default:
          throw new Error(`Unsupported provider: ${args.provider}`);
      }
      
      return models;
    } catch (error: any) {
      console.error(`Error fetching ${args.provider} models:`, error);
      throw new Error(`Failed to fetch ${args.provider} models: ${error.message}`);
    }
  },
});

// Action to fetch models from all providers
export const fetchAvailableModels = internalAction({
  args: {
    openaiKey: v.string(),
    anthropicKey: v.string(),
    googleKey: v.string(),
  },
  returns: v.object({
    openai: v.array(v.object({
      id: v.string(),
      name: v.string(),
      description: v.optional(v.string()),
    })),
    anthropic: v.array(v.object({
      id: v.string(),
      name: v.string(),
      description: v.optional(v.string()),
    })),
    google: v.array(v.object({
      id: v.string(),
      name: v.string(),
      description: v.optional(v.string()),
    })),
    huggingface: v.array(v.object({
      id: v.string(),
      name: v.string(),
      description: v.optional(v.string()),
    })),
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
        huggingface: [], // Will be fetched separately when needed
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
    openai: v.array(v.object({
      id: v.string(),
      name: v.string(),
      description: v.optional(v.string()),
    })),
    anthropic: v.array(v.object({
      id: v.string(),
      name: v.string(),
      description: v.optional(v.string()),
    })),
    google: v.array(v.object({
      id: v.string(),
      name: v.string(),
      description: v.optional(v.string()),
    })),
    huggingface: v.array(v.object({
      id: v.string(),
      name: v.string(),
      description: v.optional(v.string()),
    })),
  }),
  handler: async (ctx): Promise<{
    openai: Array<{id: string, name: string, description?: string}>;
    anthropic: Array<{id: string, name: string, description?: string}>;
    google: Array<{id: string, name: string, description?: string}>;
    huggingface: Array<{id: string, name: string, description?: string}>;
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