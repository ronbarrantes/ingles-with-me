import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Only our server knows APP_SECRET (set in the Convex dashboard, or by the
// Vercel build from CONVEX_APP_SECRET). Calls without it are refused.
function check(secret: string) {
	const expected = process.env.APP_SECRET;
	if (!expected || secret !== expected) throw new Error("forbidden");
}

export const get = query({
	args: { secret: v.string(), deviceId: v.string() },
	handler: async (ctx, { secret, deviceId }) => {
		check(secret);
		return await ctx.db
			.query("profiles")
			.withIndex("by_device", (q) => q.eq("deviceId", deviceId))
			.unique();
	},
});

export const save = mutation({
	args: {
		secret: v.string(),
		deviceId: v.string(),
		learner: v.optional(v.union(v.null(), v.object({ name: v.string() }))),
		hard: v.optional(v.array(v.any())),
		interests: v.optional(v.any()),
	},
	handler: async (ctx, { secret, deviceId, ...patch }) => {
		check(secret);
		const existing = await ctx.db
			.query("profiles")
			.withIndex("by_device", (q) => q.eq("deviceId", deviceId))
			.unique();
		const fields = { ...patch, updatedAt: Date.now() };
		if (existing) await ctx.db.patch(existing._id, fields);
		else await ctx.db.insert("profiles", { deviceId, ...fields });
	},
});

/** "Delete what Ale knows about me." */
export const remove = mutation({
	args: { secret: v.string(), deviceId: v.string() },
	handler: async (ctx, { secret, deviceId }) => {
		check(secret);
		const existing = await ctx.db
			.query("profiles")
			.withIndex("by_device", (q) => q.eq("deviceId", deviceId))
			.unique();
		if (existing) await ctx.db.delete(existing._id);
	},
});
