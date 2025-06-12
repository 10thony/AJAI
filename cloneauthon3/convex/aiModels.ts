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
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    
    return await ctx.db.insert("aiModels", {
      ...args,
      isActive: true,
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
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    
    const { id, ...updates } = args;
    await ctx.db.patch(id, updates);
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
    ];

    for (const model of models) {
      await ctx.db.insert("aiModels", model);
    }
  },
});
