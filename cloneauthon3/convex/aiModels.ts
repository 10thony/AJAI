import { query, mutation, QueryCtx } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

// Check if user is admin
async function requireAdmin(ctx: QueryCtx) {
  const userId = await getAuthUserId(ctx);
  if (!userId) {
    throw new Error("Not authenticated");
  }
  
  const userRole = await ctx.db
    .query("userRoles")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .first();
  
  if (!userRole || userRole.role !== "admin") {
    throw new Error("Admin access required");
  }
  
  return userId;
}

// Get all active AI models
export const listActive = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("aiModels")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .collect();
  },
});

// Get all AI models (admin only)
export const listAll = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    return await ctx.db.query("aiModels").collect();
  },
});

// Create new AI model (admin only)
export const create = mutation({
  args: {
    name: v.string(),
    provider: v.string(),
    modelId: v.string(),
    apiKeyEnvVar: v.string(),
    description: v.optional(v.string()),
    maxTokens: v.optional(v.number()),
    temperature: v.optional(v.number()),
    helpLinks: v.optional(v.array(v.object({
      title: v.string(),
      url: v.string(),
      description: v.optional(v.string()),
    }))),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    
    return await ctx.db.insert("aiModels", {
      ...args,
      isActive: true,
      createdAt: Date.now(),
      updatedAt: Date.now()
    });
  },
});

// Update AI model (admin only)
export const update = mutation({
  args: {
    id: v.id("aiModels"),
    name: v.optional(v.string()),
    provider: v.optional(v.string()),
    modelId: v.optional(v.string()),
    apiKeyEnvVar: v.optional(v.string()),
    description: v.optional(v.string()),
    maxTokens: v.optional(v.number()),
    temperature: v.optional(v.number()),
    isActive: v.optional(v.boolean()),
    helpLinks: v.optional(v.array(v.object({
      title: v.string(),
      url: v.string(),
      description: v.optional(v.string()),
    }))),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    
    const { id, ...updates } = args;
    await ctx.db.patch(id, {
      ...updates,
      updatedAt: Date.now()
    });
  },
});

// Delete AI model (admin only)
export const remove = mutation({
  args: { id: v.id("aiModels") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    await ctx.db.delete(args.id);
  },
});

// Seed initial AI models
export const seedModels = mutation({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db.query("aiModels").collect();
    if (existing.length > 0) return;

    const models = [
      {
        name: "GPT-4",
        provider: "openai",
        modelId: "gpt-4",
        apiKeyEnvVar: "OPENAI_API_KEY",
        description: "Most capable GPT-4 model",
        isActive: true,
      },
      {
        name: "Claude 3 Sonnet",
        provider: "anthropic",
        modelId: "claude-3-sonnet",
        apiKeyEnvVar: "ANTHROPIC_API_KEY",
        description: "Balanced performance",
        isActive: true,
      },
      {
        name: "Gemini Pro",
        provider: "google",
        modelId: "gemini-pro",
        apiKeyEnvVar: "GOOGLE_AI_API_KEY",
        description: "Google's most capable text generation model",
        isActive: true,
      },
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
      }
    ];
    for (const model of models) {
      await ctx.db.insert("aiModels", {
        ...model,
        createdAt: Date.now(),
        updatedAt: Date.now()
      });
    }
  },
});
