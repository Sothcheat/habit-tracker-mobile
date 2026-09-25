import { Check, ImageUp, LogOut, Trash2, X } from "lucide-react-native";
import { useRef, useState } from "react";
import { Pressable, type View as RNView, View } from "react-native";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { type Anchor, Popover } from "@/components/ui/popover";
import { Text } from "@/components/ui/text";
import { pickAvatar, validateAvatar } from "@/lib/avatar";
import { useAuth } from "@/lib/auth";
import { identity } from "@/lib/identity";
import { supabase } from "@/lib/supabase";
import { avatarPublicUrl } from "@/lib/tasks/api";
import { useTrackerContext } from "@/lib/tasks/tracker-context";

/**
 * Wide enough for an email on one line without crowding the screen edge.
 * The web sized this to its content; absolute positioning needs a number, and
 * `Popover` clamps it to the screen anyway. On the 4pt grid.
 */
const PANEL_WIDTH = 280;

/**
 * The account, reached from the avatar in the top bar.
 *
 * A popover rather than a menu — the web made the same call for the same
 * reason: it is mostly who you are signed in as, with the actions beneath.
 * Anchored rather than a bottom sheet because it belongs to the avatar.
 */
export function ProfileMenu() {
  const { user } = useAuth();
  const tracker = useTrackerContext();
  const { data } = tracker;
  const trigger = useRef<RNView>(null);
  const [anchor, setAnchor] = useState<Anchor | null>(null);
  const [signingOut, setSigningOut] = useState(false);
  const [busy, setBusy] = useState<"upload" | "remove" | null>(null);
  const [error, setError] = useState<string | null>(null);
  /**
   * A pick waiting to be saved. Choosing a photo is not uploading it: the
   * large avatar previews the choice and Save confirms it, so a mis-tap costs
   * nothing and Save has something visible to be about.
   */
  const [chosen, setChosen] = useState<string | null>(null);

  if (!user) return null;

  // A storage path, not a URL: the bucket is public, so this resolves without
  // a signed URL and the image needs no auth header.
  const photoUrl = data?.avatarPath ? avatarPublicUrl(data.avatarPath) : null;
  const { name, email, photo, initial } = identity(user, photoUrl);
  const shown = chosen ?? photo;
  const working = busy !== null;

  // Measured at open rather than on layout: the bar can move between the two.
  const open = () => {
    trigger.current?.measureInWindow((x, y, width, height) => {
      setAnchor({ x, y, width, height });
    });
  };

  async function handleChoose() {
    setError(null);
    try {
      const picked = await pickAvatar();
      if (!picked) return;
      const reason = validateAvatar(picked);
      if (reason) {
        // A rejection leaves any existing preview alone.
        setError(reason);
        return;
      }
      setChosen(picked.uri);
    } catch (problem) {
      setError((problem as Error).message);
    }
  }

  async function handleSave() {
    if (!chosen) return;
    setBusy("upload");
    setError(null);
    const result = await tracker.setAvatar(chosen);
    setBusy(null);
    // A failed save keeps the preview, so Save can be retried without picking
    // the photo again.
    if (result.error) setError(result.error);
    else setChosen(null);
  }

  async function handleRemove() {
    setBusy("remove");
    setError(null);
    const result = await tracker.removeAvatar();
    setBusy(null);
    if (result.error) setError(result.error);
  }

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
        ref={trigger}
        onPress={open}
        accessibilityRole="button"
        accessibilityLabel={`Account: ${email}`}
        accessibilityState={{ expanded: anchor !== null }}
        hitSlop={8}
        className="rounded-full active:opacity-80"
      >
        <Avatar photo={shown} initial={initial} size={32} />
      </Pressable>

      <Popover
        anchor={anchor}
        onClose={() => setAnchor(null)}
        width={PANEL_WIDTH}
        contentClassName=""
      >
        <View className="flex-row items-center gap-3 p-4">
          <Avatar photo={shown} initial={initial} size={48} />
          <View className="flex-1">
            <Text
              accessibilityRole="header"
              numberOfLines={1}
              className="font-semibold text-popover-foreground text-sm"
            >
              {name}
            </Text>
            <Text numberOfLines={2} className="text-muted-foreground text-sm leading-snug">
              {email}
            </Text>
          </View>
        </View>

        <View className="gap-2 border-border border-t px-4 py-3">
          <View className="flex-row flex-wrap gap-2">
            {chosen ? (
              <>
                <Button size="sm" disabled={working} onPress={handleSave}>
                  <Icon as={Check} size={14} className="text-primary-foreground" />
                  <Text className="font-medium text-primary-foreground text-sm">
                    {busy === "upload" ? "Saving…" : "Save photo"}
                  </Text>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={working}
                  onPress={() => {
                    setChosen(null);
                    setError(null);
                  }}
                >
                  <Icon as={X} size={14} className="text-muted-foreground" />
                  <Text className="text-muted-foreground text-sm">Cancel</Text>
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={working}
                  onPress={handleChoose}
                >
                  <Icon as={ImageUp} size={14} className="text-foreground" />
                  <Text className="font-medium text-foreground text-sm">
                    {photo ? "Change photo" : "Add photo"}
                  </Text>
                </Button>
                {photoUrl ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={working}
                    onPress={handleRemove}
                  >
                    <Icon as={Trash2} size={14} className="text-muted-foreground" />
                    <Text className="text-muted-foreground text-sm">
                      {busy === "remove" ? "Removing…" : "Remove"}
                    </Text>
                  </Button>
                ) : null}
              </>
            )}
          </View>
          {error ? (
            <Text
              accessibilityLiveRegion="polite"
              className="text-destructive text-xs leading-relaxed"
            >
              {error}
            </Text>
          ) : null}
        </View>

        <View className="border-border border-t p-2">
          <Pressable
            onPress={handleSignOut}
            disabled={signingOut}
            accessibilityRole="button"
            accessibilityLabel="Sign out"
            accessibilityState={{ disabled: signingOut }}
            className="h-10 flex-row items-center gap-2 rounded-md px-2 active:bg-accent"
          >
            <Icon as={LogOut} size={16} className="text-popover-foreground" />
            <Text className="font-medium text-popover-foreground text-sm">
              {signingOut ? "Signing out…" : "Sign out"}
            </Text>
          </Pressable>
        </View>
      </Popover>
    </>
  );
}
