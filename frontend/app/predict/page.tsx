"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4000";

type PredictResult = {
  sentiment: "positive" | "negative";
  confidence: number;
};

type HistoryItem = {
  id: number;
  input_text: string;
  sentiment: "positive" | "negative";
  confidence: number;
  created_at: string;
};

export default function PredictPage() {
  const { data: session, status } = useSession();
  const [text, setText] = useState("");
  const [result, setResult] = useState<PredictResult | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function getToken(): Promise<string> {
    const tokenRes = await fetch("/api/token", { method: "POST" });
    if (!tokenRes.ok) {
      throw new Error("Could not authenticate with backend-main");
    }
    const { token } = await tokenRes.json();
    return token;
  }

  async function loadHistory(token: string) {
    try {
      const historyRes = await fetch(`${BACKEND_URL}/api/predict/history`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!historyRes.ok) return;
      const { predictions } = await historyRes.json();
      setHistory(predictions);
    } catch {
      // History is a nice-to-have alongside the prediction itself - a failed
      // fetch here shouldn't surface as an error to the user.
    }
  }

  useEffect(() => {
    if (!session) return;
    getToken()
      .then(loadHistory)
      .catch(() => {});
  }, [session]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const token = await getToken();

      const predictRes = await fetch(`${BACKEND_URL}/api/predict`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ text }),
      });
      if (!predictRes.ok) {
        throw new Error("Prediction request failed");
      }
      setResult(await predictRes.json());
      await loadHistory(token);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  if (status === "loading") {
    return null;
  }

  if (!session) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-24 text-center">
        <p className="text-lg text-zinc-600 dark:text-zinc-400">
          Log in to try sentiment prediction.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col items-center px-6 py-24">
      <h1 className="text-3xl font-semibold tracking-tight">Sentiment Prediction</h1>

      <form onSubmit={handleSubmit} className="mt-8 w-full max-w-lg">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Enter some text to analyze..."
          rows={4}
          required
          className="w-full rounded-lg border border-zinc-300 bg-transparent p-3 text-base dark:border-zinc-700"
        />
        <button
          type="submit"
          disabled={loading}
          className="mt-4 rounded-full bg-foreground px-5 py-2 text-sm font-medium text-background transition-colors hover:bg-[#383838] disabled:opacity-50 dark:hover:bg-[#ccc]"
        >
          {loading ? "Analyzing..." : "Submit"}
        </button>
      </form>

      {error && <p className="mt-6 text-red-600 dark:text-red-400">{error}</p>}

      {result && (
        <div className="mt-6 rounded-lg border border-zinc-300 p-4 text-center dark:border-zinc-700" data-testid="predict-result">
          <p className="text-xl font-medium capitalize">{result.sentiment}</p>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Confidence: {(result.confidence * 100).toFixed(1)}%
          </p>
        </div>
      )}

      {history.length > 0 && (
        <div className="mt-12 w-full max-w-lg" data-testid="predict-history">
          <h2 className="text-lg font-semibold tracking-tight">Your recent searches</h2>
          <ul className="mt-4 divide-y divide-zinc-200 dark:divide-zinc-800">
            {history.map((item) => (
              <li key={item.id} className="flex items-start justify-between gap-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm text-zinc-700 dark:text-zinc-300">
                    {item.input_text}
                  </p>
                  <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-500">
                    {new Date(item.created_at).toLocaleString()}
                  </p>
                </div>
                <div className="flex-none text-right">
                  <p className="text-sm font-medium capitalize">{item.sentiment}</p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-500">
                    {(item.confidence * 100).toFixed(1)}%
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
