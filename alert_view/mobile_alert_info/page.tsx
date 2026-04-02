import { requireSession } from "@/lib/require-session";
import MobileAlertInfo from "./mobile_info";

export default async function MobileAlertInfoPage() {
  const session = await requireSession("/alert_view/mobile_alert_info");
  return <MobileAlertInfo currentUserId={session.user.id} />;
}