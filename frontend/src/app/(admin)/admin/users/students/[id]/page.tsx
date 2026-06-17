import { UserDetailView } from "@/components/shared/users/user-detail";

export default function StudentDetailPage({
  params,
}: {
  params: { id: string };
}) {
  return <UserDetailView role="student" id={params.id} />;
}
