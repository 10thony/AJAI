"use client";
import { SignIn } from "@clerk/clerk-react";

export function SignInForm() {
  return (
    <div className="w-full">
      <SignIn 
        appearance={{
          elements: {
            formButtonPrimary: "auth-button",
            formFieldInput: "auth-input-field",
            card: "bg-white dark:bg-gray-800 shadow-lg rounded-lg p-6",
          },
        }}
      />
    </div>
  );
}
