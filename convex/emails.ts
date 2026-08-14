import { Resend } from "@convex-dev/resend";
import { Email } from "@convex-dev/auth/providers/Email";
import { components } from "./_generated/api";
import type { GenericMutationCtx } from "convex/server";

export const resend: Resend = new Resend(components.resend, {
  testMode: false,
});

const FROM = "Sensible <nae@adhdesigns.dev>";

function wrapper(bodyHtml: string): string {
  return `<div style="font-family: Georgia, 'Times New Roman', serif; max-width: 480px; margin: 0 auto; padding: 32px 24px; color: #171717;">
    <h1 style="font-size: 22px; margin: 0 0 24px;">Sensible</h1>
    ${bodyHtml}
    <p style="margin-top: 32px; font-size: 12px; color: #a3a3a3;">Old writings, put in common language so they make sense.</p>
  </div>`;
}

// Password provider's `verify` option: sends a one-time code during
// signUp/signIn when the account's email isn't verified yet.
export const ResendOTP = Email({
  id: "resend-otp",
  maxAge: 60 * 15,
  async generateVerificationToken() {
    const digits = "0123456789";
    let code = "";
    for (let i = 0; i < 6; i++) {
      code += digits[Math.floor(Math.random() * digits.length)];
    }
    return code;
  },
  // Convex Auth actually calls this with a second `ctx` argument (see
  // implementation/signIn.ts) even though the Auth.js-derived type it's
  // checked against only declares one parameter -- the library itself
  // suppresses this exact mismatch with @ts-expect-error internally.
  async sendVerificationRequest(
    { identifier: email, token }: { identifier: string; token: string },
    ctx?: unknown,
  ) {
    await resend.sendEmail(ctx as GenericMutationCtx<any>, {
      from: FROM,
      to: email,
      subject: `${token} is your Sensible confirmation code`,
      html: wrapper(`
        <p>Someone (hopefully you!) is signing in to Sensible with this address.</p>
        <p style="font-size: 32px; font-weight: bold; letter-spacing: 4px; margin: 24px 0;">${token}</p>
        <p>This code expires in 15 minutes. If you didn't request it, you can ignore this email.</p>
      `),
    });
  },
});

export async function sendWelcomeEmail(
  ctx: GenericMutationCtx<any>,
  email: string,
) {
  await resend.sendEmail(ctx, {
    from: FROM,
    to: email,
    subject: "Welcome to Sensible",
    html: wrapper(`
      <p>You're in! Your account is confirmed and ready.</p>
      <p>Sensible takes old writing — the kind that's technically English but reads like a foreign language — and puts it side by side with a plain-spoken version, so the ideas actually land.</p>
      <p>Go take a look at the library and find something to read!</p>
    `),
  });
}
