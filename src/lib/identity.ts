import type { User } from "@supabase/supabase-js";

export type Identity = {
  name: string;
  email: string;
  /** The photo to show, or undefined to fall back to the initial. */
  photo: string | undefined;
  initial: string;
};

/**
 * Who the signed-in person is, as far as the app can tell.
 *
 * Supabase stores nothing but the email for a password account, so the name
 * falls back through whatever an OAuth provider happened to supply and then to
 * the email's local part. "You" is the last resort — better than an empty
 * heading, and true of everyone.
 *
 * The uploaded photo wins over the provider's, because it is the one the user
 * chose here.
 */
export function identity(user: User, photoUrl: string | null): Identity {
  const meta = user.user_metadata ?? {};
  const email = user.email ?? "";
  const name: string =
    meta.full_name || meta.name || meta.display_name || email.split("@")[0] || "You";
  const providerPhoto =
    typeof meta.avatar_url === "string" ? meta.avatar_url : undefined;

  return {
    name,
    email,
    photo: photoUrl ?? providerPhoto,
    // trim() first: a name of only spaces would otherwise give a blank circle.
    initial: (name.trim()[0] ?? "?").toUpperCase(),
  };
}
