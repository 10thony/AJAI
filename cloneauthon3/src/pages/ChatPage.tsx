import { useQuery, useAction } from "convex/react";
import { useParams, Navigate } from "react-router-dom";
import { api } from "../../convex/_generated/api";
import { useState, useRef, useEffect } from "react";
import { Id } from "../../convex/_generated/dataModel";
import Anthropic from "@anthropic-ai/sdk";
import { Settings } from "lucide-react";
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

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

type LLMProvider = "anthropic" | "openai" | "huggingface";

type GroupedModels = {
  [key in LLMProvider]?: {
    _id: Id<"aiModels">;
    name: string;
    modelId: string;
    description?: string;
  }[];
};

function formatMessageContent(content: string) {
  // Split content by code blocks
  const parts = content.split(/(```[\s\S]*?```)/g);
  
  return parts.map((part, index) => {
    if (part.startsWith('```') && part.endsWith('```')) {
      // Extract language and code
      const [lang, ...codeParts] = part.slice(3, -3).split('\n');
      const code = codeParts.join('\n');
      
      return (
        <SyntaxHighlighter
          key={index}
          language={lang || 'text'}
          style={vscDarkPlus}
          customStyle={{
            margin: '0.5em 0',
            borderRadius: '0.375rem',
            fontSize: '0.875rem',
          }}
        >
          {code}
        </SyntaxHighlighter>
      );
    }
    return <span key={index}>{part}</span>;
  });
}

export function ChatPage() {
  const { chatId } = useParams<{ chatId: string }>();
  const chat = useQuery(api.chats.get, chatId ? { id: chatId as Id<"chats"> } : "skip");
  const messages = useQuery(api.messages.list, chatId ? { chatId: chatId as Id<"chats"> } : "skip");
  const sendAnthropicMessage = useAction(api.chat.sendAnthropicMessage);
  const sendOpenAIMessage = useAction(api.chat.sendOpenAIMessage);
  const sendHuggingFaceMessage = useAction(api.chat.sendHuggingFaceMessage);
  const activeModels = useQuery(api.aiModels.listActive) || [];
  
  const [input, setInput] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [localMessages, setLocalMessages] = useState<(Message | LocalMessage)[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<LLMProvider>("anthropic");
  const [showSettings, setShowSettings] = useState(true);
  const [selectedModelId, setSelectedModelId] = useState<Id<"aiModels"> | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Group models by provider
  const groupedModels = activeModels.reduce<GroupedModels>((acc, model) => {
    const provider = model.provider as LLMProvider;
    if (!acc[provider]) {
      acc[provider] = [];
    }
    acc[provider]?.push({
      _id: model._id,
      name: model.name,
      modelId: model.modelId,
      description: model.description,
    });
    return acc;
  }, {});

  // Set initial model when chat loads
  useEffect(() => {
    if (chat && activeModels.length > 0) {
      setSelectedModelId(chat.modelId);
      // Set provider based on the selected model
      const selectedModel = activeModels.find(m => m._id === chat.modelId);
      if (selectedModel) {
        setSelectedProvider(selectedModel.provider as LLMProvider);
      }
    }
  }, [chat, activeModels]);

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
      <div className="flex-1 flex flex-col items-center justify-center space-y-4">
        <div className="relative">
          <div className="w-12 h-12 border-4 border-blue-200 rounded-full"></div>
          <div className="w-12 h-12 border-4 border-blue-600 rounded-full animate-spin absolute top-0 left-0 border-t-transparent"></div>
        </div>
        <p className="text-gray-600">Loading chat...</p>
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
      let response;
      switch (selectedProvider) {
        case "anthropic":
          response = await sendAnthropicMessage({ message: messageContent });
          break;
        case "openai":
          response = await sendOpenAIMessage({ message: messageContent });
          break;
        case "huggingface":
          response = await sendHuggingFaceMessage({ message: messageContent });
          break;
        default:
          throw new Error(`Unsupported provider: ${selectedProvider}`);
      }

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
          <div className="flex items-center space-x-4">
            {activeModels.length > 0 && (
              <select
                value={selectedModelId || ""}
                onChange={(e) => {
                  const modelId = e.target.value as Id<"aiModels">;
                  setSelectedModelId(modelId);
                  const model = activeModels.find(m => m._id === modelId);
                  if (model) {
                    setSelectedProvider(model.provider as LLMProvider);
                  }
                }}
                className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select a model</option>
                {activeModels.map((model) => (
                  <option key={model._id} value={model._id}>
                    {model.name} ({model.provider})
                  </option>
                ))}
              </select>
            )}
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-2 text-gray-500 hover:text-gray-700"
            >
              <Settings size={20} />
            </button>
          </div>
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="absolute top-16 right-4 bg-white border border-gray-200 rounded-lg shadow-lg p-4 z-10">
          <h3 className="text-lg font-semibold mb-4">Settings</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                API Key
              </label>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Enter your API key..."
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                AI Provider
              </label>
              <select
                value={selectedProvider}
                onChange={(e) => {
                  const provider = e.target.value as LLMProvider;
                  setSelectedProvider(provider);
                  // Reset selected model when provider changes
                  setSelectedModelId(null);
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {Object.keys(groupedModels).map((provider) => (
                  <option key={provider} value={provider}>
                    {provider.charAt(0).toUpperCase() + provider.slice(1)}
                  </option>
                ))}
              </select>
            </div>
            {groupedModels[selectedProvider] && groupedModels[selectedProvider]!.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Model
                </label>
                <select
                  value={selectedModelId || ""}
                  onChange={(e) => setSelectedModelId(e.target.value as Id<"aiModels">)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select a model</option>
                  {groupedModels[selectedProvider]!.map((model) => (
                    <option key={model._id} value={model._id}>
                      {model.name} ({model.modelId})
                    </option>
                  ))}
                </select>
                {groupedModels[selectedProvider]!.find(m => m._id === selectedModelId)?.description && (
                  <p className="mt-1 text-sm text-gray-500">
                    {groupedModels[selectedProvider]!.find(m => m._id === selectedModelId)?.description}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      )}

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
                  {message.content ? (
                    formatMessageContent(message.content)
                  ) : (message.role === "assistant" && isSending ? (
                    <span className="inline-flex items-center space-x-1">
                      <span>AI is thinking</span>
                      <span className="flex space-x-1">
                        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                      </span>
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
        <form onSubmit={handleSubmit} className="max-w-3xl mx-auto">
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
