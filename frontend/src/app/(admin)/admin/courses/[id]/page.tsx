import { CourseDetail } from "@/components/shared/courses/course-detail";

export default function CourseDetailPage({
  params,
}: {
  params: { id: string };
}) {
  return <CourseDetail id={params.id} />;
}
