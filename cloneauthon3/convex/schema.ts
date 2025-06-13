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
    createdAt: v.number(), // Track when model was added
    updatedAt: v.number(), // Track when model was last updated
  }).index("by_provider", ["provider"])
    .index("by_active", ["isActive"]),

  // User roles for admin access
  userRoles: defineTable({
    userId: v.id("users"),
    role: v.union(v.literal("admin"), v.literal("user")),
    createdAt: v.number(), // Track when role was assigned
    updatedAt: v.number(), // Track when role was last updated
  }).index("by_user", ["userId"])
    .index("by_role", ["role"]),

  // Chat conversations
  chats: defineTable({
    userId: v.id("users"),
    title: v.string(),
    modelId: v.id("aiModels"),
    isArchived: v.optional(v.boolean()),
    createdAt: v.number(), // Track when chat was created
    updatedAt: v.number(), // Track when chat was last updated
    lastMessageAt: v.optional(v.number()), // Track when last message was sent
  }).index("by_user", ["userId"])
    .index("by_user_archived", ["userId", "isArchived"])
    .index("by_last_message", ["lastMessageAt"]), // For sorting by recent activity

  // Messages within chats
  messages: defineTable({
    chatId: v.id("chats"),
    content: v.string(),
    role: v.union(v.literal("user"), v.literal("assistant")),
    userId: v.optional(v.id("users")), // null for AI messages
    createdAt: v.number(), // Track when message was created
    updatedAt: v.number(), // Track when message was last updated
    isStreaming: v.optional(v.boolean()), // Track if message is still being streamed
    error: v.optional(v.string()), // Store any error messages
  }).index("by_chat", ["chatId"])
    .index("by_creation", ["createdAt"]), // For sorting messages chronologically
};

export default defineSchema({
  ...authTables,
  ...applicationTables,
});
