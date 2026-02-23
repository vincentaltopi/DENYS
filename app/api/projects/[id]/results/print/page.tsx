import ResultsPanel from "@/app/projects/[id]/results/ResultsPanel";

export const dynamic = "force-dynamic";

export default function PrintResultsPage({
  params,
}: {
  params: { id: string };
}) {
  return (
    <div className="bg-white p-8">
      <ResultsPanel projectId={params.id} />
    </div>
  );
}