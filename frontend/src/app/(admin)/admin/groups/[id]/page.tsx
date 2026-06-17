import { GroupDetail } from "@/components/shared/groups/group-detail";

export default function GroupDetailPage({
  params,
}: {
  params: { id: string };
}) {
  return <GroupDetail id={params.id} />;
}
