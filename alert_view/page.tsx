import { getMachineList } from "@/lib/frontendData";
import AlertViewClient from "./alert_viewClient";
import { requireSession } from "@/lib/require-session";
import { fetchMachinePredictions } from "@/lib/actions";

export default async function AlertView({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const session = await requireSession("/alert_view");
  const resolvedSearchParams = await searchParams;
  const initialMachine = resolvedSearchParams?.machine as string | undefined;

  const { ok, groups, machines, error } = await getMachineList();
  const { ok: predictionsOk, data: allAlerts } = await fetchMachinePredictions();
  if (!predictionsOk || !ok) return <div>Error: {error}</div>;
  return (

    <AlertViewClient 
      groups={groups} 
      machines={machines} 
      allAlerts={allAlerts} 
      initialMachine={initialMachine}
      currentUserId={session.user.id}
    />

  );
}