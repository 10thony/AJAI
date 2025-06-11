import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    clerkUserId: v.string(),
    role: v.union(v.literal("authenticated"), v.literal("paidUser"), v.literal("admin")),
    settings: v.object({ darkMode: v.boolean() })
  }),
  chats: defineTable({
    userId: v.id("users"),
    title: v.string(),
    createdAt: v.number(),
    lastMessageAt: v.number(),
    modelUsed: v.id("aiModels")
  }),
  messages: defineTable({
    chatId: v.id("chats"),
    userId: v.optional(v.id("users")), // null for AI
    content: v.string(),
    type: v.union(v.literal("user"), v.literal("ai")),
    createdAt: v.number(),
    isEdited: v.boolean()
  }),
  aiModels: defineTable({
    name: v.string(),
    endpoint: v.string(),
    supportedDepths: v.array(v.string()),
    supportsDocumentIngestion: v.boolean(),
    isRestricted: v.boolean()
  }),
  documents: defineTable({
    messageId: v.id("messages"),
    fileName: v.string(),
    fileType: v.string(),
    storageId: v.string()
  }),
  logs: defineTable({
    type: v.union(v.literal("error"), v.literal("user_action"), v.literal("admin_action")),
    timestamp: v.number(),
    userId: v.optional(v.id("users")),
    details: v.any()
  }),
  config: defineTable({
    maxDocumentSize: v.number(),
    mockAiRateLimit: v.number()
  })
});