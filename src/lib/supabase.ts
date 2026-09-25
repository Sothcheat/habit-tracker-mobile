import { createClient } from "@supabase/supabase-js";
import { AppState } from "react-native";
import { storage } from "@/lib/storage";
import type { Database } from "@/types/database.types";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing Supabase environment variables. Copy .env.example to .env.local and fill in EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY.",
  );
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage,
    persistSession: true,
    autoRefreshToken: true,
    // No URL bar on native. The web build parses the session out of the URL
    // fragment; here a deep link would have to be exchanged explicitly.
    detectSessionInUrl: false,
  },
});

// autoRefreshToken relies on timers, so it has to follow the app lifecycle
// rather than run forever in the background and drain the battery.
AppState.addEventListener("change", (state) => {
  if (state === "active") {
    supabase.auth.startAutoRefresh();
  } else {
    supabase.auth.stopAutoRefresh();
  }
});
