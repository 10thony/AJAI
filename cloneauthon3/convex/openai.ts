// convex/openai.ts
import { v } from "convex/values";
import { mutation } from "./_generated/server";

export const chatCompletion = mutation({
  args: {
    prompt: v.string(),
    model: v.optional(v.string()), // Make model optional with a default value
  },
  handler: async (ctx, { prompt, model = "gpt-3.5-turbo" }) => {
    // 1. Get your API key from environment variables
    const openAiApiKey = process.env.OPENAI_API_KEY;

    if (!openAiApiKey) {
      throw new Error("OPENAI_API_KEY environment variable not set. Please set it in your Convex dashboard under Settings > Environment Variables.");
    }

    try {
      // 2. Make the request to OpenAI's Chat Completions API
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${openAiApiKey}`,
        },
        body: JSON.stringify({
          model: model,
          messages: [{ role: "user", content: prompt }],
          max_tokens: 150, // Adjust as needed
          temperature: 0.7, // Adjust as needed
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`OpenAI API error: ${response.status} - ${JSON.stringify(errorData)}`);
      }

      const data = await response.json();

      // 3. Extract the assistant's reply
      const assistantMessage = data.choices[0]?.message?.content;

      if (!assistantMessage) {
        throw new Error("No message content received from OpenAI.");
      }

      return assistantMessage;
    } catch (error) {
      console.error("Error calling OpenAI API:", error);
      throw new Error(`Failed to get response from OpenAI: ${error instanceof Error ? error.message : String(error)}`);
    }
  },
});