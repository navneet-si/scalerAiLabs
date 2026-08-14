import React from "react";
import Link from "next/link";

export default function ComingSoonPage() {
  return (
    <div className="flex flex-col items-center justify-center h-full w-full bg-[var(--color-background)]">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-[var(--color-gray-900)] mb-4">Coming Soon</h1>
        <p className="text-[var(--color-gray-500)] mb-8">This feature is not yet available.</p>
        <Link 
          href="/"
          className="px-6 py-2 bg-[var(--color-purple-600)] text-white rounded-md hover:bg-[var(--color-purple-700)] transition-colors"
        >
          Go Back Home
        </Link>
      </div>
    </div>
  );
}
