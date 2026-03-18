"use client";

import dynamic from "next/dynamic";
import HUD from "@/components/HUD";
import LibraryPanel from "@/components/LibraryPanel";
import PlayerBar from "@/components/PlayerBar";

const DynamicCanvas = dynamic(() => import("@/components/DynamicCanvas"), {
  ssr: false,
});

export default function Home() {
  return (
    <main className="relative w-screen h-screen overflow-hidden bg-[#000005]">
      <DynamicCanvas />
      <HUD />
      <LibraryPanel />
      <PlayerBar />
    </main>
  );
}
