import { LogOut } from "lucide-react-native";
import { useState } from "react";
import { Pressable, View } from "react-native";
import { Avatar } from "@/components/ui/avatar";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { useAuth } from "@/lib/auth";
import { identity } from "@/lib/identity";
import { supabase } from "@/lib/supabase";
import { avatarPublicUrl } from "@/lib/tasks/api";
import { useTrackerContext } from "@/lib/tasks/tracker-context";

/**
 * The account, reached from the avatar in the top bar.
 *
 * A sheet of information rather than a menu — the web made the same call, and
 * for the same reason: it is mostly who you are signed in as, with one action
 * at the foot.
 */
export function ProfileSheet() {
  const { user } = useAuth();
  const { data } = useTrackerContext();
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  if (!user) return null;

  // A storage path, not a URL: the bucket is public, so this resolves without
  // a signed URL and the image needs no auth header.
  const photoUrl = data?.avatarPath ? avatarPublicUrl(data.avatarPath) : null;
  const { name, email, photo, initial } = identity(user, photoUrl);

  async function handleSignOut() {
    setSigningOut(true);
    const { error } = await supabase.auth.signOut();
    // On success the auth listener clears the session and the guard swaps the
    // whole tree, unmounting this. Only a failure needs the button back.
    if (error) setSigningOut(false);
  }

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={`Account: ${email}`}
        hitSlop={8}
        className="rounded-full active:opacity-80"
      >
        <Avatar photo={photo} initial={initial} size={32} />
      </Pressable>

      <BottomSheet visible={open} onClose={() => setOpen(false)}>
        {() => (
          <View>
            <View className="flex-row items-center gap-3 px-5 py-5">
              <Avatar photo={photo} initial={initial} size={48} />
              <View className="flex-1">
                <Text
                  accessibilityRole="header"
                  numberOfLines={1}
                  className="font-semibold text-foreground text-sm"
                >
                  {name}
                </Text>
                <Text className="text-muted-foreground text-sm leading-snug">
                  {email}
                </Text>
              </View>
            </View>

            <View className="border-border border-t p-3">
              <Button
                variant="ghost"
                size="touch"
                disabled={signingOut}
                onPress={handleSignOut}
                className="w-full justify-start gap-2"
              >
                <Icon as={LogOut} size={16} className="text-foreground" />
                <Text className="font-medium text-foreground text-sm">
                  {signingOut ? "Signing out…" : "Sign out"}
                </Text>
              </Button>
            </View>
          </View>
        )}
      </BottomSheet>
    </>
  );
}
