import { CourseForm } from "@/components/shared/courses/course-form";

export default function EditCoursePage({
  params,
}: {
  params: { id: string };
}) {
  return <CourseForm mode="edit" id={params.id} />;
}
