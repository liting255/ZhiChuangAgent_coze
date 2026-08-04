"use client";

import { useParams } from "next/navigation";
import NotebookLMLayout from "@/components/panels/notebooklm-layout";

export default function ProjectLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const params = useParams();
  const projectId = params.projectId as string;

  // If the route is one of the legacy 4-stage pages, render them inside the layout
  // Otherwise, render the NotebookLM view
  return (
    <NotebookLMLayout>
      {children}
    </NotebookLMLayout>
  );
}