import { Image } from "expo-image";
import { useState } from "react";
import { View } from "react-native";
import { Text } from "@/components/ui/text";
import { cn } from "@/lib/utils";

/**
 * A person's photo, or their initial when there isn't one.
 *
 * expo-image rather than RN's Image: it caches remote photos on disk, which on
 * the web was the service worker's job. A failed load falls back to the
 * initial, so a dead provider URL shows a letter rather than a broken box.
 */
export function Avatar({
  photo,
  initial,
  size,
  className,
  accessibilityLabel,
}: {
  photo: string | undefined;
  initial: string;
  /** Rendered size in points. */
  size: number;
  className?: string;
  accessibilityLabel?: string;
}) {
  const [failed, setFailed] = useState(false);
  const showPhoto = Boolean(photo) && !failed;

  return (
    <View
      accessibilityLabel={accessibilityLabel}
      style={{ width: size, height: size, borderRadius: size / 2 }}
      className={cn("items-center justify-center overflow-hidden bg-secondary", className)}
    >
      {showPhoto ? (
        <Image
          source={{ uri: photo }}
          style={{ width: size, height: size }}
          contentFit="cover"
          transition={120}
          onError={() => setFailed(true)}
          accessibilityIgnoresInvertColors
        />
      ) : (
        <Text
          className="font-semibold text-secondary-foreground"
          style={{ fontSize: Math.round(size * 0.42) }}
        >
          {initial}
        </Text>
      )}
    </View>
  );
}
