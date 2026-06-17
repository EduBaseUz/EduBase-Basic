import { UserDetailView } from "@/components/shared/users/user-detail";

export default function MentorDetailPage({
  params,
}: {
  params: { id: string };
}) {
  return <UserDetailView role="mentor" id={params.id} />;
}
