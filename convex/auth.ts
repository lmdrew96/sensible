import { convexAuth } from "@convex-dev/auth/server";
import { Password } from "@convex-dev/auth/providers/Password";
import { ResendOTP, sendWelcomeEmail } from "./emails";
import type { MutationCtx } from "./_generated/server";

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [Password({ verify: ResendOTP })],
  callbacks: {
    // Declared against GenericMutationCtx<AnyDataModel>, which can't see our
    // schema's indexes -- cast to our generated MutationCtx to query it.
    async beforeSessionCreation(genericCtx, { userId }) {
      const ctx = genericCtx as unknown as MutationCtx;
      const existingSession = await ctx.db
        .query("authSessions")
        .withIndex("userId", (q) => q.eq("userId", userId))
        .first();
      if (existingSession === null) {
        const user = await ctx.db.get(userId);
        if (user?.email) {
          await sendWelcomeEmail(ctx, user.email);
        }
      }
    },
  },
});
