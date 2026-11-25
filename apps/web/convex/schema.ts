// The database. Until sign-in exists (WorkOS), a profile belongs to a device:
// a random id kept on the phone. Only our server talks to Convex (with a
// shared secret), never the browser directly.

import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
	profiles: defineTable({
		deviceId: v.string(),
		/** What Ale remembers. Shapes match src/lib/bot/types.ts. */
		learner: v.optional(v.union(v.null(), v.object({ name: v.string() }))),
		hard: v.optional(v.array(v.any())),
		interests: v.optional(v.any()),
		updatedAt: v.number(),
	}).index("by_device", ["deviceId"]),
});
