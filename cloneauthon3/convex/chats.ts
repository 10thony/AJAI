import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

// Get user's chats
export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return [];
    }
    
    const chats = await ctx.db
      .query("chats")
      .withIndex("by_user_archived", (q) => q.eq("userId", userId).eq("isArchived", false))
      .order("desc")
      .collect();
    
    // Get model info for each chat
    const chatsWithModels = await Promise.all(
      chats.map(async (chat) => {
        const model = await ctx.db.get(chat.modelId);
        return {
          ...chat,
          model,
        };
      })
    );
    
    return chatsWithModels;
  },
});

// Get specific chat
export const get = query({
  args: { id: v.id("chats") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return null;
    }
    
    const chat = await ctx.db.get(args.id);
    if (!chat || chat.userId !== userId) {
      return null;
    }
    
    const model = await ctx.db.get(chat.modelId);
    return {
      ...chat,
      model,
    };
  },
});

// Create new chat
export const create = mutation({
  args: {
    title: v.string(),
    modelId: v.id("aiModels"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }
    
    return await ctx.db.insert("chats", {
      userId,
      title: args.title,
      modelId: args.modelId,
      isArchived: false,
      createdAt: 0,
      updatedAt: 0
    });
  },
});

// Update chat title
export const updateTitle = mutation({
  args: {
    id: v.id("chats"),
    title: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }
    
    const chat = await ctx.db.get(args.id);
    if (!chat || chat.userId !== userId) {
      throw new Error("Chat not found");
    }
    
    await ctx.db.patch(args.id, { title: args.title });
  },
});

// Archive chat
export const archive = mutation({
  args: { id: v.id("chats") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }
    
    const chat = await ctx.db.get(args.id);
    if (!chat || chat.userId !== userId) {
      throw new Error("Chat not found");
    }
    
    await ctx.db.patch(args.id, { isArchived: true });
  },
});
