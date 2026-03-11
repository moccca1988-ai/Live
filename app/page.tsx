import Link from "next/link";
import { Video, Users } from "lucide-react";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6 bg-zinc-950 text-zinc-50">
      <div className="max-w-md w-full space-y-8 text-center">
        <div className="space-y-4">
          <h1 className="text-4xl font-bold tracking-tight text-white">
            Shopify Live Stream
          </h1>
          <p className="text-zinc-400">
            A minimalist, high-performance live shopping experience.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Link
            href="/host"
            className="flex flex-col items-center justify-center p-8 rounded-2xl bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 hover:border-zinc-700 transition-all group"
          >
            <div className="p-4 rounded-full bg-emerald-500/10 text-emerald-500 group-hover:bg-emerald-500/20 group-hover:scale-110 transition-all mb-4">
              <Video className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-semibold mb-2">Go Live</h2>
            <p className="text-sm text-zinc-400 text-center">
              Start streaming and pin products for your audience.
            </p>
          </Link>

          <Link
            href="/viewer"
            className="flex flex-col items-center justify-center p-8 rounded-2xl bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 hover:border-zinc-700 transition-all group"
          >
            <div className="p-4 rounded-full bg-indigo-500/10 text-indigo-500 group-hover:bg-indigo-500/20 group-hover:scale-110 transition-all mb-4">
              <Users className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-semibold mb-2">Watch Stream</h2>
            <p className="text-sm text-zinc-400 text-center">
              Join as a viewer and shop live products.
            </p>
          </Link>
        </div>
      </div>
    </main>
  );
}
