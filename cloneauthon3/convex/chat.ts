import { action } from "./_generated/server";
import { v } from "convex/values";
import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { internal } from "./_generated/api";

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

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
        model: "o3-mini-2025-01-31",
        messages: [
          {
            role: "user",
            content: args.message,
          },
        ],
        max_tokens: 1024,
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