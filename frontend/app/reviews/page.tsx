"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4000";

type Sentiment = "POSITIVE" | "NEUTRAL" | "NEGATIVE";

type Review = {
  id: string;
  text: string;
  sentiment: Sentiment | null;
  createdAt: string;
};

type Stats = {
  total: number;
  positive: number;
  neutral: number;
  negative: number;
};

const REVIEWS_AND_STATS_QUERY = `
  query {
    reviews(limit: 20) { id text sentiment createdAt }
    reviewStats { total positive neutral negative }
  }
`;

const CREATE_REVIEW_MUTATION = `
  mutation CreateReview($input: CreateReviewInput!) {
    createReview(input: $input) { id }
  }
`;

export default function ReviewsPage() {
  const { data: session, status } = useSession();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [text, setText] = useState("");
  const [sentiment, setSentiment] = useState<Sentiment | "">("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Same fetch-based pattern as /predict — no GraphQL client library needed
  // for one query and one mutation.
  async function getToken(): Promise<string> {
    const tokenRes = await fetch("/api/token", { method: "POST" });
    if (!tokenRes.ok) {
      throw new Error("Could not authenticate with backend-main");
    }
    const { token } = await tokenRes.json();
    return token;
  }

  async function graphql(token: string, query: string, variables?: Record<string, unknown>) {
    const res = await fetch(`${BACKEND_URL}/api/graphql`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ query, variables }),
    });
    const { data, errors } = await res.json();
    if (errors?.length) {
      throw new Error(errors[0].message);
    }
    return data;
  }

  async function loadReviews(token: string) {
    const data = await graphql(token, REVIEWS_AND_STATS_QUERY);
    setReviews(data.reviews);
    setStats(data.reviewStats);
  }

  useEffect(() => {
    if (!session) return;
    getToken()
      .then(loadReviews)
      .catch((err) => setError(err instanceof Error ? err.message : "Something went wrong"));
    // Only re-run on login/logout - loadReviews is redefined every render but
    // isn't meant to retrigger this fetch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const token = await getToken();
      await graphql(token, CREATE_REVIEW_MUTATION, {
        input: { text, sentiment: sentiment || null },
      });
      setText("");
      setSentiment("");
      await loadReviews(token);
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
        <p className="text-lg text-zinc-600 dark:text-zinc-400">Log in to browse reviews.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col items-center px-6 py-24">
      <h1 className="text-3xl font-semibold tracking-tight">Reviews</h1>

      {stats && (
        <div
          className="mt-6 flex gap-6 text-sm text-zinc-600 dark:text-zinc-400"
          data-testid="review-stats"
        >
          <span>Total: {stats.total}</span>
          <span>Positive: {stats.positive}</span>
          <span>Neutral: {stats.neutral}</span>
          <span>Negative: {stats.negative}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-8 w-full max-w-lg">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Write a review..."
          rows={3}
          required
          className="w-full rounded-lg border border-zinc-300 bg-transparent p-3 text-base dark:border-zinc-700"
        />
        <div className="mt-3 flex items-center gap-3">
          <select
            value={sentiment}
            onChange={(e) => setSentiment(e.target.value as Sentiment | "")}
            className="rounded-lg border border-zinc-300 bg-transparent p-2 text-sm dark:border-zinc-700"
          >
            <option value="">No sentiment</option>
            <option value="POSITIVE">Positive</option>
            <option value="NEUTRAL">Neutral</option>
            <option value="NEGATIVE">Negative</option>
          </select>
          <button
            type="submit"
            disabled={loading}
            className="rounded-full bg-foreground px-5 py-2 text-sm font-medium text-background transition-colors hover:bg-[#383838] disabled:opacity-50 dark:hover:bg-[#ccc]"
          >
            {loading ? "Posting..." : "Post review"}
          </button>
        </div>
      </form>

      {error && <p className="mt-6 text-red-600 dark:text-red-400">{error}</p>}

      <ul
        className="mt-10 w-full max-w-lg divide-y divide-zinc-200 dark:divide-zinc-800"
        data-testid="review-list"
      >
        {reviews.map((review) => (
          <li key={review.id} className="py-3">
            <p className="text-sm text-zinc-700 dark:text-zinc-300">{review.text}</p>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-500">
              {review.sentiment ? review.sentiment.toLowerCase() : "no sentiment"} ·{" "}
              {new Date(review.createdAt).toLocaleString()}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
