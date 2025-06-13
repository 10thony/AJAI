// ChatPage.tsx (Client-side - UNSAFE FOR PRODUCTION)
import React, { useState } from 'react';
import { useAction } from "convex/react";
import { api } from "../../convex/_generated/api";

function TempChatPage() {
  const [message, setMessage] = useState('');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendMessage = useAction(api.chat.sendMessage);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const assistantResponse = await sendMessage({ message });
      setResponse(assistantResponse);
    } catch (err: any) {
      console.error('Error in chat submission:', err);
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setLoading(false);
      setMessage('');
    }
  };

  return (
    <div>
      <h1>Anthropic Chat (Server-side)</h1>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Type your message..."
          disabled={loading}
        />
        <button type="submit" disabled={loading}>
          {loading ? 'Sending...' : 'Send'}
        </button>
      </form>
      {error && <p style={{ color: 'red' }}>Error: {error}</p>}
      {response && (
        <div>
          <h2>Response:</h2>
          <p>{response}</p>
        </div>
      )}
    </div>
  );
}

export default TempChatPage;