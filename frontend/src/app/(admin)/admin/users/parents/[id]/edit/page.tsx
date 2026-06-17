import { UserForm } from "@/components/shared/users/user-form";

export default function EditParentPage({
  params,
}: {
  params: { id: string };
}) {
  return <UserForm role="parent" mode="edit" id={params.id} />;
}
