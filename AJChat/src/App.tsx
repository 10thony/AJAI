import { SignIn, SignUp, SignedIn, SignedOut, UserButton } from '@clerk/clerk-react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import './App.css'

function App() {
  return (
    <BrowserRouter>
      <div className="app-container">
        <header className="app-header">
          <h1>AJChat</h1>
          <div className="auth-buttons">
            <SignedIn>
              <UserButton afterSignOutUrl="/sign-in" />
            </SignedIn>
            <SignedOut>
              <a href="/sign-in" className="sign-in-button">Sign In</a>
            </SignedOut>
          </div>
        </header>

        <main>
          <Routes>
            <Route
              path="/"
              element={
                <SignedIn>
                  <div className="chat-container">
                    <h2>Welcome to AJChat!</h2>
                    {/* Add your chat components here */}
                  </div>
                </SignedIn>
              }
            />
            <Route
              path="/sign-in/*"
              element={
                <SignedOut>
                  <SignIn routing="path" path="/sign-in" />
                </SignedOut>
              }
            />
            <Route
              path="/sign-up/*"
              element={
                <SignedOut>
                  <SignUp routing="path" path="/sign-up" />
                </SignedOut>
              }
            />
            <Route
              path="*"
              element={<Navigate to="/" replace />}
            />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}

export default App
