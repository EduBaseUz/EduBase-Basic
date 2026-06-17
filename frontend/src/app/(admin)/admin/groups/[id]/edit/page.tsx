import { GroupForm } from "@/components/shared/groups/group-form";

export default function EditGroupPage({
  params,
}: {
  params: { id: string };
}) {
  return <GroupForm mode="edit" id={params.id} />;
}
