import { nameInitials } from "@/lib/utils";
import type { User } from "@/types";

type AvatarUser = Pick<User, "avatarUrl" | "lastName" | "firstName" | "fullName">;

/** Round user avatar — shows the image, or initials as a fallback. */
export function UserAvatar({
  user,
  size = 36,
}: {
  user: AvatarUser;
  size?: number;
}) {
  return (
    <span
      className="relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full border bg-muted"
      style={{ width: size, height: size }}
    >
      {user.avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={user.avatarUrl}
          alt=""
          className="h-full w-full object-cover"
        />
      ) : (
        <span className="text-xs font-semibold text-muted-foreground">
          {nameInitials(user)}
        </span>
      )}
    </span>
  );
}
