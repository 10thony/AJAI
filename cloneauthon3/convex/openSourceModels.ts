import { mutation } from "./_generated/server";
import { v } from "convex/values";

// Define open source models configuration
export const OPEN_SOURCE_MODELS = [
  { 
    name: "Llama 2 7B",
    provider: "huggingface",
    modelId: "llama2",
    apiKeyEnvVar: "HF_API_KEY",
    description: "Meta's Llama 2 7B model",
    isActive: true,
  },
  { 
    name: "Mistral 7B",
    provider: "huggingface",
    modelId: "mistral",
    apiKeyEnvVar: "HF_API_KEY",
    description: "Mistral AI's 7B model",
    isActive: true,
  },
  { 
    name: "Code Llama",
    provider: "huggingface",
    modelId: "codellama",
    apiKeyEnvVar: "HF_API_KEY",
    description: "Meta's Code Llama model",
    isActive: true,
  },
  { 
    name: "Phi-2",
    provider: "huggingface",
    modelId: "phi-2",
    apiKeyEnvVar: "HF_API_KEY",
    description: "Microsoft's Phi-2 model",
    isActive: true,
  },
];

// Seed open source models into the database
export const seedOpenSourceModels = mutation({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db
      .query("aiModels")
      .withIndex("by_provider", (q) => q.eq("provider", "huggingface"))
      .collect();

    if (existing.length > 0) return;
    for (const model of OPEN_SOURCE_MODELS) {
      await ctx.db.insert("aiModels", {
        ...model,
        createdAt: Date.now(),
        updatedAt: Date.now()
      });
    }
  },
}); 