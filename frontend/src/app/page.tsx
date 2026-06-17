import { redirect } from "next/navigation";

// Middleware handles authenticated redirects; this is the fallback.
export default function RootPage() {
  redirect("/login");
}
