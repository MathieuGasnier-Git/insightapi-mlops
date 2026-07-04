export default function Footer() {
  return (
    <footer className="border-t border-zinc-200 px-6 py-4 text-center text-sm text-zinc-600 dark:border-zinc-800 dark:text-zinc-400">
      © {new Date().getFullYear()} InsightAPI. All rights reserved.
    </footer>
  );
}
