import type { User } from "@supabase/supabase-js";
import { identity } from "@/lib/identity";

const user = (over: Partial<User> = {}): User =>
  ({ id: "u1", email: "ada@example.com", user_metadata: {}, ...over }) as User;

describe("identity", () => {
  it("prefers a provider's full name", () => {
    const meta = { full_name: "Ada Lovelace", name: "ada", display_name: "AL" };
    expect(identity(user({ user_metadata: meta }), null).name).toBe("Ada Lovelace");
  });

  it("falls through name, then display_name, then the email's local part", () => {
    expect(identity(user({ user_metadata: { name: "ada" } }), null).name).toBe("ada");
    expect(identity(user({ user_metadata: { display_name: "AL" } }), null).name).toBe("AL");
    expect(identity(user(), null).name).toBe("ada");
  });

  it("says You rather than nothing when there is no name at all", () => {
    expect(identity(user({ email: undefined }), null).name).toBe("You");
  });

  it("prefers the uploaded photo over the provider's", () => {
    const withProvider = user({ user_metadata: { avatar_url: "https://p/provider.png" } });
    expect(identity(withProvider, "https://p/uploaded.png").photo).toBe(
      "https://p/uploaded.png",
    );
    expect(identity(withProvider, null).photo).toBe("https://p/provider.png");
    expect(identity(user(), null).photo).toBeUndefined();
  });

  it("ignores a non-string provider photo", () => {
    const odd = user({ user_metadata: { avatar_url: 42 } });
    expect(identity(odd, null).photo).toBeUndefined();
  });

  it("takes the initial from the resolved name, uppercased", () => {
    expect(identity(user({ user_metadata: { full_name: "ada" } }), null).initial).toBe("A");
    // A name of only spaces has no letter to take, so it falls back to "?"
    // rather than showing a blank circle.
    expect(identity(user({ user_metadata: { full_name: "   " } }), null).initial).toBe("?");
    expect(identity(user({ email: undefined }), null).initial).toBe("Y");
  });
});
