import { useQuery } from "convex/react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { api } from "../convex/_generated/api";
import { SignInForm } from "./SignInForm";
import { Toaster } from "sonner";
import { Layout } from "./components/Layout";
import { ChatPage } from "./pages/ChatPage";
import { AdminPage } from "./pages/AdminPage";
import { HomePage } from "./pages/HomePage";
import TempChatPage from "./pages/TempChatPage";
import { useAuth } from "@clerk/clerk-react";
import { ThemeProvider } from "./lib/ThemeContext";

export default function App() {
  return (
    <ThemeProvider>
      <Router>
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
          <Routes>
            <Route path="/temp-chat" element={<TempChatPage />} />
            <Route path="*" element={<AppContent />} />
          </Routes>
          <Toaster />
        </div>
      </Router>
    </ThemeProvider>
  );
}

function AppContent() {
  const { isSignedIn, isLoaded } = useAuth();
  
  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 dark:border-blue-400"></div>
      </div>
    );
  }

  if (!isSignedIn) {
    return <UnauthenticatedApp />;
  }

  return <AuthenticatedApp />;
}

function AuthenticatedApp() {
  const userRole = useQuery(api.userRoles.getCurrentUserRole);
  
  if (userRole === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 dark:border-blue-400"></div>
      </div>
    );
  }

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/chat/:chatId" element={<ChatPage />} />
        {userRole === "admin" && (
          <Route path="/admin" element={<AdminPage />} />
        )}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}

function UnauthenticatedApp() {
  return (
    <div className="min-h-screen flex items-center justify-center p-8">
      <div className="w-full max-w-md mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">T3.Chat</h1>
          <p className="text-xl text-gray-600 dark:text-gray-300">Sign in to start chatting with AI</p>
        </div>
        <SignInForm />
      </div>
    </div>
  );
}
