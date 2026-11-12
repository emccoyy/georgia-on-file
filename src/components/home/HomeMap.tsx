"use client";

import dynamic from "next/dynamic";
import { LoadingScreen } from "@/components/explore/LoadingScreen";

// The explorer reads the URL and uses WebGL, so it renders on the client only.
// The loading screen doubles as the fallback so first paint is never blank.
const Explorer = dynamic(() => import("@/components/explore/Explorer"), {
  ssr: false,
  loading: () => <LoadingScreen show />,
});

export function HomeMap() {
  return <Explorer />;
}
