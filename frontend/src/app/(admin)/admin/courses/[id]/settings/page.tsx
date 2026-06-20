import { CourseSettingsForm } from "@/components/shared/courses/course-settings-form";

export default function CourseSettingsPage({
  params,
}: {
  params: { id: string };
}) {
  return <CourseSettingsForm id={params.id} />;
}
