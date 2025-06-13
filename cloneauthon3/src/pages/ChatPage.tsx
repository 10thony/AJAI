import { useQuery, useAction } from "convex/react";
import { useParams, Navigate } from "react-router-dom";
import { api } from "../../convex/_generated/api";
import { useState, useRef, useEffect } from "react";
import { Id } from "../../convex/_generated/dataModel";
import Anthropic from "@anthropic-ai/sdk";

type Message = {
  _id: Id<"messages">;
  _creationTime: number;
  chatId: Id<"chats">;
  content: string;
  role: "user" | "assistant";
  userId?: Id<"users">;
};

type LocalMessage = {
  content: string;
  role: "user" | "assistant";
  createdAt: number;
};

type LLMProvider = "anthropic" | "openai";

export function ChatPage() {
  const { chatId } = useParams<{ chatId: string }>();
  const chat = useQuery(api.chats.get, chatId ? { id: chatId as Id<"chats"> } : "skip");
  const messages = useQuery(api.messages.list, chatId ? { chatId: chatId as Id<"chats"> } : "skip");
  const sendAnthropicMessage = useAction(api.chat.sendAnthropicMessage);
  const sendOpenAIMessage = useAction(api.chat.sendOpenAIMessage);
  
  const [input, setInput] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [localMessages, setLocalMessages] = useState<(Message | LocalMessage)[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<LLMProvider>("anthropic");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Mirror convex messages to local state
  useEffect(() => {
    if (messages) {
      setLocalMessages(messages);
    }
  }, [messages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [localMessages]);

  if (!chatId) {
    return <Navigate to="/" replace />;
  }

  if (chat === undefined || messages === undefined) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (chat === null) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isSending || !apiKey.trim()) return;

    const messageContent = input.trim();
    setInput("");
    setIsSending(true);

    // Add user message to local state
    const userMsg: LocalMessage = {
      role: "user",
      content: messageContent,
      createdAt: Date.now(),
    };
    setLocalMessages(prev => [...prev, userMsg]);

    try {
      // Send message based on selected provider
      const response = await (selectedProvider === "anthropic" 
        ? sendAnthropicMessage({ message: messageContent })
        : sendOpenAIMessage({ message: messageContent }));

      // Add AI response to local state
      const aiMsg: LocalMessage = {
        role: "assistant",
        content: response,
        createdAt: Date.now(),
      };
      setLocalMessages(prev => [...prev, aiMsg]);
    } catch (error) {
      console.error("Failed to send message:", error);
      setInput(messageContent); // Restore input on error
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      {/* Chat Header */}
      <div className="flex-none bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">{chat.title}</h2>
            <p className="text-sm text-gray-500">
              Using {chat.model?.name || "Unknown Model"}
            </p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-3xl mx-auto space-y-6">
          {localMessages.length === 0 && (
            <div className="text-center text-gray-500 py-12">
              <p>Start a conversation with the AI!</p>
            </div>
          )}
          
          {localMessages.map((message, index) => (
            <div
              key={'_id' in message ? message._id : `local-${index}`}
              className={`flex ${
                message.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                  message.role === "user"
                    ? "bg-blue-600 text-white"
                    : "bg-white border border-gray-200 text-gray-900"
                }`}
              >
                <p className="text-sm whitespace-pre-wrap">
                  {message.content || (message.role === "assistant" && isSending ? (
                    <span className="inline-flex items-center">
                      <span className="animate-pulse">AI is thinking</span>
                      <span className="ml-1">...</span>
                    </span>
                  ) : null)}
                </p>
              </div>
            </div>
          ))}
          
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Form */}
      <div className="flex-none bg-white border-t border-gray-200 p-6">
        <form onSubmit={handleSubmit} className="max-w-3xl mx-auto space-y-4">
          <div className="flex space-x-4">
            <div className="flex-1">
              <label htmlFor="apiKey" className="block text-sm font-medium text-gray-700 mb-1">
                API Key
              </label>
              <input
                id="apiKey"
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Enter your API key..."
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="w-48">
              <label htmlFor="provider" className="block text-sm font-medium text-gray-700 mb-1">
                AI Provider
              </label>
              <select
                id="provider"
                value={selectedProvider}
                onChange={(e) => setSelectedProvider(e.target.value as LLMProvider)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="anthropic">Anthropic (Claude)</option>
                <option value="openai">OpenAI (GPT-4)</option>
              </select>
            </div>
          </div>
          <div className="flex space-x-4">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your message..."
              disabled={isSending || !apiKey.trim()}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!input.trim() || isSending || !apiKey.trim()}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSending ? "Sending..." : "Send"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
