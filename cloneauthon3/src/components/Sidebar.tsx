import { useQuery, useMutation } from "convex/react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { api } from "../../convex/_generated/api";
import { useState } from "react";
import { Id } from "../../convex/_generated/dataModel";

export function Sidebar() {
  const chats = useQuery(api.chats.list) || [];
  const aiModels = useQuery(api.aiModels.listActive) || [];
  const createChat = useMutation(api.chats.create);
  const archiveChat = useMutation(api.chats.archive);
  const { chatId } = useParams();
  const navigate = useNavigate();
  
  const [isCreating, setIsCreating] = useState(false);
  const [deletingChatId, setDeletingChatId] = useState<Id<"chats"> | null>(null);

  const handleNewChat = async () => {
    if (aiModels.length === 0) return;
    
    setIsCreating(true);
    try {
      const defaultModel = aiModels[0];
      const newChatId = await createChat({
        title: "New Chat",
        modelId: defaultModel._id,
      });
      navigate(`/chat/${newChatId}`);
    } catch (error) {
      console.error("Failed to create chat:", error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteChat = async (chatId: Id<"chats">, e: React.MouseEvent) => {
    e.preventDefault(); // Prevent navigation when clicking delete
    e.stopPropagation(); // Prevent event bubbling
    
    setDeletingChatId(chatId);
    try {
      await archiveChat({ id: chatId });
      // If we're currently viewing the deleted chat, navigate to home
      if (chatId === chatId) {
        navigate('/');
      }
    } catch (error) {
      console.error("Failed to delete chat:", error);
    } finally {
      setDeletingChatId(null);
    }
  };

  return (
    <div className="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col">
      {/* New Chat Button */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
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
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">Recent Chats</h3>
          <div className="space-y-2">
            {chats.map((chat) => (
              <Link
                key={chat._id}
                to={`/chat/${chat._id}`}
                className={`block p-3 rounded-md text-sm group relative ${
                  chatId === chat._id
                    ? "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300"
                    : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                }`}
              >
                <div className="font-medium truncate">{chat.title}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {chat.model?.name || "Unknown Model"}
                </div>
                <button
                  onClick={(e) => handleDeleteChat(chat._id, e)}
                  disabled={deletingChatId === chat._id}
                  className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 dark:hover:text-red-400 disabled:opacity-50"
                >
                  {deletingChatId === chat._id ? "Deleting..." : "×"}
                </button>
              </Link>
            ))}
            {chats.length === 0 && (
              <p className="text-gray-500 dark:text-gray-400 text-sm">No chats yet</p>
            )}
          </div>
        </div>
      </div>

      {/* Model Info */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700">
        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Available Models</h3>
        <div className="space-y-1">
          {aiModels.map((model) => (
            <div key={model._id} className="text-xs text-gray-600 dark:text-gray-300">
              {model.name}
            </div>
          ))}
          {aiModels.length === 0 && (
            <p className="text-xs text-gray-500 dark:text-gray-400">No models configured</p>
          )}
        </div>
      </div>
    </div>
  );
}
