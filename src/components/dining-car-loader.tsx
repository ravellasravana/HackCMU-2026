"use client";

import dynamic from "next/dynamic";

function Skeleton() {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-6 md:px-8 md:py-10" aria-busy>
      <div className="h-24 w-2/3 animate-pulse rounded-xl bg-card" />
      <div className="grid gap-4 md:grid-cols-3">
        <div className="h-40 animate-pulse rounded-xl bg-card md:col-span-3" />
        <div className="h-96 animate-pulse rounded-xl bg-card md:col-span-2" />
        <div className="h-96 animate-pulse rounded-xl bg-card" />
      </div>
    </div>
  );
}

/** The app reads localStorage on first render, so it is client-only; the server ships a skeleton. */
export const DiningCarLoader = dynamic(() => import("./dining-car").then((m) => m.DiningCar), {
  ssr: false,
  loading: Skeleton,
});
