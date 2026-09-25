import { Link } from "expo-router";
import { useState } from "react";
import { AuthFeedback, type Feedback } from "@/components/auth/auth-feedback";
import { AuthField } from "@/components/auth/auth-field";
import { AuthLayout } from "@/components/auth/auth-layout";
import { AuthSubmit } from "@/components/auth/auth-submit";
import { Text } from "@/components/ui/text";
import { useFocusRequest } from "@/hooks/use-focus-request";
import { describeAuthError } from "@/lib/auth-errors";
import { supabase } from "@/lib/supabase";
import { validateEmail, validateExistingPassword } from "@/lib/validation";

type Errors = { email?: string | null; password?: string | null };

const EMAIL = "email";
const PASSWORD = "password";

export default function SignIn() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [pending, setPending] = useState(false);
  const { register, requestFocus } = useFocusRequest();

  async function handleSubmit() {
    setFeedback(null);

    const next: Errors = {
      email: validateEmail(email),
      password: validateExistingPassword(password),
    };
    setErrors(next);
    if (next.email || next.password) {
      requestFocus(next.email ? EMAIL : PASSWORD);
      return;
    }

    setPending(true);
    const address = email.trim();
    const { error } = await supabase.auth.signInWithPassword({
      email: address,
      password,
    });

    // On success the auth listener flips the guard in the root layout, which
    // replaces this screen and discards its state. Nothing navigates by hand.
    if (!error) return;

    const { kind, message } = describeAuthError(error);
    if (kind === "invalid_credentials") {
      // Never says which of the two was wrong.
      setErrors({ password: message });
      setPassword("");
      requestFocus(PASSWORD);
    } else {
      setFeedback({ kind: "error", text: message });
    }
    setPending(false);
  }

  return (
    <AuthLayout
      title="Welcome back"
      description="Pick up where you left off. No streak pressure — just continue."
      footer={
        <Text className="text-muted-foreground text-sm">
          New here?{" "}
          <Link href="/sign-up" replace asChild>
            <Text className="font-medium text-foreground underline">Create an account</Text>
          </Link>
        </Text>
      }
    >
      <AuthField
        ref={register(EMAIL)}
        label="Email"
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        autoCorrect={false}
        value={email}
        onChangeText={(value) => {
          setEmail(value);
          // Once a field has an error it validates live, so the message clears
          // as soon as it is fixed rather than at the next submit.
          if (errors.email) {
            setErrors((current) => ({ ...current, email: validateEmail(value) }));
          }
        }}
        onBlur={() => {
          if (email) setErrors((c) => ({ ...c, email: validateEmail(email) }));
        }}
        error={errors.email}
        placeholder="you@example.com"
        editable={!pending}
        returnKeyType="next"
        onSubmitEditing={() => requestFocus(PASSWORD)}
        submitBehavior="submit"
      />

      <AuthField
        ref={register(PASSWORD)}
        label="Password"
        secureTextEntry
        autoCapitalize="none"
        autoComplete="current-password"
        value={password}
        onChangeText={(value) => {
          setPassword(value);
          if (errors.password) {
            setErrors((current) => ({
              ...current,
              password: validateExistingPassword(value),
            }));
          }
        }}
        error={errors.password}
        // Words, not dots: "••••••••" in an empty field reads as a password
        // that is already filled in.
        placeholder="Enter your password"
        editable={!pending}
        returnKeyType="go"
        onSubmitEditing={handleSubmit}
      />

      <AuthSubmit disabled={pending} onPress={handleSubmit}>
        {pending ? "Signing in…" : "Sign in"}
      </AuthSubmit>

      <AuthFeedback feedback={feedback} />
    </AuthLayout>
  );
}
