import { useQuery, useMutation } from "convex/react";
import { useParams, Navigate } from "react-router-dom";
import { api } from "../../convex/_generated/api";
import { useState, useRef, useEffect } from "react";
import { Id } from "../../convex/_generated/dataModel";

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

export function ChatPage() {
  const { chatId } = useParams<{ chatId: string }>();
  const chat = useQuery(api.chats.get, chatId ? { id: chatId as Id<"chats"> } : "skip");
  const messages = useQuery(api.messages.list, chatId ? { chatId: chatId as Id<"chats"> } : "skip");
  const sendMessage = useMutation(api.messages.send);
  
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [localMessages, setLocalMessages] = useState<(Message | LocalMessage)[]>([]);
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
    if (!input.trim() || isSending) return;

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
      // Send message to Convex
      await sendMessage({
        chatId: chatId as Id<"chats">,
        content: messageContent,
      });

      // Add assistant placeholder
      const assistantPlaceholder: LocalMessage = {
        role: "assistant",
        content: "",
        createdAt: Date.now(),
      };
      setLocalMessages(prev => [...prev, assistantPlaceholder]);

      // The AI response will be handled by Convex's streaming system
      // and will automatically update the messages through the useQuery hook
    } catch (error) {
      console.error("Failed to send message:", error);
      setInput(messageContent); // Restore input on error
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col">
      {/* Chat Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
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
      <div className="bg-white border-t border-gray-200 p-6">
        <form onSubmit={handleSubmit} className="max-w-3xl mx-auto">
          <div className="flex space-x-4">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your message..."
              disabled={isSending}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!input.trim() || isSending}
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
