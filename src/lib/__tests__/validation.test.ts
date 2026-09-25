import {
  PASSWORD_RULES,
  validateConfirmPassword,
  validateEmail,
  validateExistingPassword,
  validateNewPassword,
} from "@/lib/validation";

describe("validateEmail", () => {
  it("accepts an ordinary address", () => {
    expect(validateEmail("a@b.co")).toBeNull();
  });

  it("rejects blank, spaced and malformed addresses", () => {
    expect(validateEmail("")).not.toBeNull();
    expect(validateEmail("a b@c.co")).not.toBeNull();
    expect(validateEmail("a@b")).not.toBeNull();
    expect(validateEmail("@b.co")).not.toBeNull();
  });
});

describe("validateNewPassword", () => {
  it("accepts a password meeting every rule", () => {
    expect(validateNewPassword("Abcdef1!")).toBeNull();
  });

  it("rejects one that misses any single rule", () => {
    expect(validateNewPassword("Abcde1!")).not.toBeNull(); // too short
    expect(validateNewPassword("abcdef1!")).not.toBeNull(); // no upper
    expect(validateNewPassword("ABCDEF1!")).not.toBeNull(); // no lower
    expect(validateNewPassword("Abcdefg!")).not.toBeNull(); // no number
    expect(validateNewPassword("Abcdefg1")).not.toBeNull(); // no symbol
  });

  it("exposes the rules as a checklist the form can render", () => {
    expect(PASSWORD_RULES.length).toBeGreaterThan(0);
    for (const rule of PASSWORD_RULES) {
      expect(typeof rule.label).toBe("string");
      expect(rule.test("Abcdef1!")).toBe(true);
    }
  });
});

describe("validateExistingPassword", () => {
  // Sign-in deliberately does not apply the complexity rules, or accounts made
  // before they existed would be locked out.
  it("checks only presence and length", () => {
    expect(validateExistingPassword("abcdefgh")).toBeNull();
    expect(validateExistingPassword("")).not.toBeNull();
    expect(validateExistingPassword("short")).not.toBeNull();
  });
});

describe("validateConfirmPassword", () => {
  it("requires an exact match", () => {
    expect(validateConfirmPassword("Abcdef1!", "Abcdef1!")).toBeNull();
    expect(validateConfirmPassword("Abcdef1!", "Abcdef1?")).not.toBeNull();
    expect(validateConfirmPassword("Abcdef1!", "")).not.toBeNull();
  });
});
