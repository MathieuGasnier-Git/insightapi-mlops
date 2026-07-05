import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-24 text-center">
      <h1 className="max-w-xl text-4xl font-semibold tracking-tight">
        InsightAPI
      </h1>
      <p className="mt-4 max-w-md text-lg text-zinc-600 dark:text-zinc-400">
        Frontend scaffold for the InsightAPI platform.
      </p>
      <Link
        href="/predict"
        className="mt-8 rounded-full bg-foreground px-5 py-2 text-sm font-medium text-background transition-colors hover:bg-[#383838] dark:hover:bg-[#ccc]"
      >
        Try sentiment prediction
      </Link>
    </div>
  );
}
