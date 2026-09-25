import { Link } from "expo-router";
import { useState } from "react";
import { AuthFeedback, type Feedback } from "@/components/auth/auth-feedback";
import { AuthField } from "@/components/auth/auth-field";
import { AuthLayout } from "@/components/auth/auth-layout";
import { AuthSubmit } from "@/components/auth/auth-submit";
import { PasswordRules } from "@/components/auth/password-rules";
import { Text } from "@/components/ui/text";
import { useFocusRequest } from "@/hooks/use-focus-request";
import { describeAuthError } from "@/lib/auth-errors";
import { supabase } from "@/lib/supabase";
import {
  validateConfirmPassword,
  validateEmail,
  validateNewPassword,
} from "@/lib/validation";

type Errors = {
  email?: string | null;
  password?: string | null;
  confirm?: string | null;
};

const EMAIL = "email";
const PASSWORD = "password";
const CONFIRM = "confirm";

export default function SignUp() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  // After the first submit, every field validates live as it changes.
  const [attempted, setAttempted] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [pending, setPending] = useState(false);
  const { register, requestFocus } = useFocusRequest();

  function validateAll(): Errors {
    return {
      email: validateEmail(email),
      password: validateNewPassword(password),
      confirm: validateConfirmPassword(password, confirmPassword),
    };
  }

  function resetForm() {
    setEmail("");
    setPassword("");
    setConfirmPassword("");
    setErrors({});
    setAttempted(false);
  }

  async function handleSubmit() {
    setFeedback(null);
    setAttempted(true);

    const next = validateAll();
    setErrors(next);
    const firstInvalid = next.email
      ? EMAIL
      : next.password
        ? PASSWORD
        : next.confirm
          ? CONFIRM
          : null;
    if (firstInvalid) {
      requestFocus(firstInvalid);
      return;
    }

    setPending(true);
    const address = email.trim();
    const { data, error } = await supabase.auth.signUp({ email: address, password });

    if (error) {
      const { kind, message } = describeAuthError(error);
      if (kind === "user_exists") {
        setErrors({ email: message });
        requestFocus(EMAIL);
      } else if (kind === "weak_password") {
        setErrors({ password: message });
        requestFocus(PASSWORD);
      } else {
        setFeedback({ kind: "error", text: message });
      }
      setPending(false);
      return;
    }

    // Success either way: nothing typed should outlive the request.
    resetForm();
    setPending(false);

    // Confirmation off: signUp returns a session, the auth listener fires, and
    // the root layout's guard swaps this screen for the tracker.
    if (data.session) return;

    // Confirmation on: no session until the emailed link is followed. Supabase
    // returns this same shape for an address that already exists, so the copy
    // must not claim a new account was made.
    setFeedback({
      kind: "success",
      text: `Check ${address} for a confirmation link, then sign in.`,
    });
  }

  const revalidate = (field: keyof Errors, compute: () => string | null) => {
    if (attempted || errors[field]) {
      setErrors((current) => ({ ...current, [field]: compute() }));
    }
  };

  return (
    <AuthLayout
      title="Create your account"
      description="Start with one habit. You can always add more later."
      footer={
        <Text className="text-muted-foreground text-sm">
          Already have an account?{" "}
          <Link href="/sign-in" replace asChild>
            <Text className="font-medium text-foreground underline">Sign in</Text>
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
          revalidate("email", () => validateEmail(value));
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
        autoComplete="new-password"
        value={password}
        onChangeText={(value) => {
          setPassword(value);
          revalidate("password", () => validateNewPassword(value));
          if (confirmPassword) {
            setErrors((c) => ({
              ...c,
              confirm: validateConfirmPassword(value, confirmPassword),
            }));
          }
        }}
        // Marked invalid without a sentence: the checklist below already names
        // the failing rule, and saying it twice is saying it worse.
        error={password ? null : errors.password}
        invalid={Boolean(errors.password)}
        placeholder="Create a password"
        editable={!pending}
        returnKeyType="next"
        onSubmitEditing={() => requestFocus(CONFIRM)}
        submitBehavior="submit"
        hint={<PasswordRules value={password} showErrors={attempted} />}
      />

      <AuthField
        ref={register(CONFIRM)}
        label="Confirm password"
        secureTextEntry
        autoCapitalize="none"
        autoComplete="new-password"
        value={confirmPassword}
        onChangeText={(value) => {
          setConfirmPassword(value);
          revalidate("confirm", () => validateConfirmPassword(password, value));
        }}
        error={errors.confirm}
        placeholder="Type it again"
        editable={!pending}
        returnKeyType="go"
        onSubmitEditing={handleSubmit}
      />

      <AuthSubmit disabled={pending} onPress={handleSubmit}>
        {pending ? "Creating account…" : "Create account"}
      </AuthSubmit>

      <AuthFeedback feedback={feedback} />
    </AuthLayout>
  );
}
