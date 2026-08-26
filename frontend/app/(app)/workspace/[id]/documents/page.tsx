"use client";

import { DocumentsTab } from "@/components/workspace/DocumentsTab";
import { useParams } from "next/navigation";

export default function DocumentsPage() {
  const params = useParams();
  return <DocumentsTab workspaceId={params.id as string} onDocCountChange={() => {}} />;
}
