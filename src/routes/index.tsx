import { createFileRoute } from "@tanstack/react-router";
import { ExhibitionRoad } from "@/components/ExhibitionRoad";

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Exhibition Road — a walk through life's milestones" },
      { name: "description", content: "Walk a tiny 3D road past three exhibits about family time, peace of mind and freedom in retirement." },
      { property: "og:title", content: "Exhibition Road — a walk through life's milestones" },
      { property: "og:description", content: "A calm 3D walk past three exhibits about retirement and life insurance." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ExhibitionRoad,
});
