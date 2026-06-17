import { UserDetailView } from "@/components/shared/users/user-detail";

export default function ParentDetailPage({
  params,
}: {
  params: { id: string };
}) {
  return <UserDetailView role="parent" id={params.id} />;
}
