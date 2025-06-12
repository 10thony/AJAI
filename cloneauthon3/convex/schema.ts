import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

const applicationTables = {
  // AI Model configurations that admins can manage
  aiModels: defineTable({
    name: v.string(),
    provider: v.string(), // "openai", "anthropic", "google", etc.
    modelId: v.string(), // "gpt-4", "claude-3", etc.
    apiKeyEnvVar: v.string(), // environment variable name
    isActive: v.boolean(),
    description: v.optional(v.string()),
    maxTokens: v.optional(v.number()),
    temperature: v.optional(v.number()),
  }).index("by_provider", ["provider"])
    .index("by_active", ["isActive"]),

  // User roles for admin access
  userRoles: defineTable({
    userId: v.id("users"),
    role: v.union(v.literal("admin"), v.literal("user")),
  }).index("by_user", ["userId"])
    .index("by_role", ["role"]),

  // Chat conversations
  chats: defineTable({
    userId: v.id("users"),
    title: v.string(),
    modelId: v.id("aiModels"),
    isArchived: v.optional(v.boolean()),
  }).index("by_user", ["userId"])
    .index("by_user_archived", ["userId", "isArchived"]),

  // Messages within chats
  messages: defineTable({
    chatId: v.id("chats"),
    content: v.string(),
    role: v.union(v.literal("user"), v.literal("assistant")),
    userId: v.optional(v.id("users")), // null for AI messages
  }).index("by_chat", ["chatId"]),
};

export default defineSchema({
  ...authTables,
  ...applicationTables,
});
