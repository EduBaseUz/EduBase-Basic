import { UserForm } from "@/components/shared/users/user-form";

export default function EditStudentPage({
  params,
}: {
  params: { id: string };
}) {
  return <UserForm role="student" mode="edit" id={params.id} />;
}
