import { File } from "expo-file-system";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";

/**
 * Turning whatever the user picked into the one image we store.
 *
 * The bucket accepts 2 MiB, but nothing here gets close: an avatar is shown at
 * 32pt in the top bar and 48pt in the account popover, so a 512px square is
 * already several times what the densest screen can use.
 *
 * This is a rewrite rather than a port. The web did its own centre-crop with
 * `createImageBitmap` and a `<canvas>`, then probed whether the browser could
 * encode WebP at all — `toBlob` answers an unsupported format with PNG rather
 * than an error. None of that exists here, and none of it is needed: the
 * system picker crops, and expo-image-manipulator encodes WebP on both
 * platforms without asking.
 */

/** The stored square. Several times the largest size the UI renders. */
const SIZE = 512;

/**
 * The largest file a user may choose, checked before anything is decoded.
 *
 * It caps the file *chosen*, not the file uploaded: everything here is
 * re-encoded to a 512px square first, so what reaches the bucket is well under
 * 100 KB regardless. 15 MB rather than something stricter-sounding because a
 * modern phone photo is 3-8 MB, and a limit that refuses one refuses the most
 * common legitimate case for no benefit. The limit that actually protects the
 * bucket is its own 2 MiB, server-side, where a hostile client cannot reach it.
 */
const MAX_INPUT_BYTES = 15 * 1024 * 1024;

const QUALITY = 0.92;

export type PickedAvatar = { uri: string; fileSize?: number };

export type PreparedAvatar = {
  bytes: ArrayBuffer;
  extension: "webp";
  contentType: string;
};

function formatSize(bytes: number) {
  const mb = bytes / (1024 * 1024);
  return `${mb < 10 ? mb.toFixed(1) : Math.round(mb)} MB`;
}

/**
 * Opens the system picker, cropped square.
 *
 * `allowsEditing` is what replaces the web's centre-crop: the user decides
 * what the square contains, which is better than guessing from the middle of
 * their photo. Returns null when they back out — dismissing is a choice, not
 * an error.
 */
export async function pickAvatar(): Promise<PickedAvatar | null> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    throw new Error("Cadence needs permission to open your photos.");
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    // A string array in SDK 57; MediaTypeOptions is deprecated.
    mediaTypes: ["images"],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 1,
  });

  if (result.canceled || !result.assets?.length) return null;
  const asset = result.assets[0];
  return { uri: asset.uri, fileSize: asset.fileSize };
}

/**
 * The one guard on what a user may choose, run the moment they choose it, so
 * the answer is immediate and nothing is uploaded to find out.
 *
 * Returns the reason to show them, or null if the image is fine. It is not the
 * only check: the bucket enforces its own size and MIME limits server-side,
 * because a client-side guard is a courtesy to honest users and nothing at all
 * to a hostile one.
 */
export function validateAvatar(picked: PickedAvatar): string | null {
  if (picked.fileSize !== undefined && picked.fileSize > MAX_INPUT_BYTES) {
    return `That image is ${formatSize(picked.fileSize)}. Choose one under ${formatSize(MAX_INPUT_BYTES)}.`;
  }
  return null;
}

/**
 * Re-encodes the picked image to the one square that gets stored.
 *
 * WebP rather than JPEG: the same encoder call, roughly 25-30% smaller at a
 * matched quality, and it keeps transparency, which a cropped logo may rely on.
 *
 * Throws messages written for the user — the caller shows them as they are.
 */
export async function prepareAvatar(uri: string): Promise<PreparedAvatar> {
  let savedUri: string;
  try {
    const context = ImageManipulator.manipulate(uri);
    context.resize({ width: SIZE, height: SIZE });
    const rendered = await context.renderAsync();
    const saved = await rendered.saveAsync({
      format: SaveFormat.WEBP,
      compress: QUALITY,
    });
    savedUri = saved.uri;
  } catch {
    throw new Error("That image couldn't be read. Try a different one.");
  }

  try {
    const bytes = await new File(savedUri).arrayBuffer();
    return { bytes, extension: "webp", contentType: "image/webp" };
  } catch {
    throw new Error("That image couldn't be read. Try a different one.");
  }
}
