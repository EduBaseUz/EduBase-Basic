import { UserForm } from "@/components/shared/users/user-form";

export default function EditMentorPage({
  params,
}: {
  params: { id: string };
}) {
  return <UserForm role="mentor" mode="edit" id={params.id} />;
}
