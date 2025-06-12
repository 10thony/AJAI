import { useQuery, useMutation } from "convex/react";
import { Link, useParams } from "react-router-dom";
import { api } from "../../convex/_generated/api";
import { useState } from "react";

export function Sidebar() {
  const chats = useQuery(api.chats.list) || [];
  const aiModels = useQuery(api.aiModels.listActive) || [];
  const createChat = useMutation(api.chats.create);
  const { chatId } = useParams();
  
  const [isCreating, setIsCreating] = useState(false);

  const handleNewChat = async () => {
    if (aiModels.length === 0) return;
    
    setIsCreating(true);
    try {
      const defaultModel = aiModels[0];
      await createChat({
        title: "New Chat",
        modelId: defaultModel._id,
      });
    } catch (error) {
      console.error("Failed to create chat:", error);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
      {/* New Chat Button */}
      <div className="p-4 border-b border-gray-200">
        <button
          onClick={handleNewChat}
          disabled={isCreating || aiModels.length === 0}
          className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isCreating ? "Creating..." : "New Chat"}
        </button>
      </div>

      {/* Chat List */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4">
          <h3 className="text-sm font-medium text-gray-500 mb-3">Recent Chats</h3>
          <div className="space-y-2">
            {chats.map((chat) => (
              <Link
                key={chat._id}
                to={`/chat/${chat._id}`}
                className={`block p-3 rounded-md text-sm ${
                  chatId === chat._id
                    ? "bg-blue-100 text-blue-700"
                    : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                <div className="font-medium truncate">{chat.title}</div>
                <div className="text-xs text-gray-500 mt-1">
                  {chat.model?.name || "Unknown Model"}
                </div>
              </Link>
            ))}
            {chats.length === 0 && (
              <p className="text-gray-500 text-sm">No chats yet</p>
            )}
          </div>
        </div>
      </div>

      {/* Model Info */}
      <div className="p-4 border-t border-gray-200">
        <h3 className="text-sm font-medium text-gray-500 mb-2">Available Models</h3>
        <div className="space-y-1">
          {aiModels.map((model) => (
            <div key={model._id} className="text-xs text-gray-600">
              {model.name}
            </div>
          ))}
          {aiModels.length === 0 && (
            <p className="text-xs text-gray-500">No models configured</p>
          )}
        </div>
      </div>
    </div>
  );
}
