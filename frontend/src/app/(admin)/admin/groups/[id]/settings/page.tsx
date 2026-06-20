import { GroupSettings } from "@/components/shared/groups/group-settings";

export default function GroupSettingsPage({
  params,
}: {
  params: { id: string };
}) {
  return <GroupSettings id={params.id} />;
}
