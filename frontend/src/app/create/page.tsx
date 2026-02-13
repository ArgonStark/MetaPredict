"use client";

import { CreateMarketForm } from "@/components/CreateMarketForm";

export default function CreatePage() {
  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-2">Create Market</h1>
        <p className="text-muted text-sm">
          Create a prediction market about prediction market platforms. Markets
          are settled using Chainlink CRE with your chosen data source.
        </p>
      </div>
      <CreateMarketForm />
    </div>
  );
}
