// src/App.tsx or any other React component
import React, { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";

function ChatComponent() {
  const [userPrompt, setUserPrompt] = useState("");
  const [aiResponse, setAiResponse] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Hook into the Convex mutation
  const sendPrompt = useMutation(api.openai.chatCompletion);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!userPrompt.trim()) return;

    setIsLoading(true);
    setAiResponse("");
    setError(null);

    try {
      // Call the Convex mutation
      const response = await sendPrompt({
        prompt: userPrompt,
        model: "gpt-3.5-turbo", // Or "gpt-4", etc.
      });
      setAiResponse(response);
      setUserPrompt(""); // Clear the input
    } catch (err) {
      console.error("Failed to get AI response:", err);
      setError(`Error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <h1>OpenAI Chat</h1>
      <form onSubmit={handleSubmit}>
        <textarea
          value={userPrompt}
          onChange={(e) => setUserPrompt(e.target.value)}
          placeholder="Type your message here..."
          rows={5}
          cols={50}
          disabled={isLoading}
        ></textarea>
        <br />
        <button type="submit" disabled={isLoading}>
          {isLoading ? "Generating..." : "Send to AI"}
        </button>
      </form>

      {error && <p style={{ color: "red" }}>{error}</p>}

      {aiResponse && (
        <div>
          <h2>AI Response:</h2>
          <p>{aiResponse}</p>
        </div>
      )}
    </div>
  );
}

export default ChatComponent;