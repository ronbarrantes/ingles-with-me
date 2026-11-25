import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { dbReady, deleteProfile, getProfile, saveProfile } from "#/server/db";
import { checkPasscode } from "#/server/guard";
import { reportError } from "#/server/telemetry";

// What Ale remembers about this device: name, hard words, topic interests.
// Without a database configured, the page keeps using the phone only.

const DeviceId = z.string().regex(/^[0-9a-f-]{36}$/);

const Patch = z.object({
	learner: z
		.object({ name: z.string().max(60) })
		.nullable()
		.optional(),
	hard: z
		.array(
			z.object({
				word: z.string().max(40),
				misses: z.number(),
				last: z.number(),
				best: z.number(),
				streak: z.number(),
				note: z.string().max(120),
				at: z.number(),
			}),
		)
		.max(40)
		.optional(),
	interests: z
		.object({
			counts: z.record(z.string().max(30), z.number()),
			last: z.string().max(30).optional(),
		})
		.optional(),
});

function guard(request: Request) {
	const denied = checkPasscode(request);
	if (denied) return { denied };
	if (!dbReady()) return { denied: new Response(null, { status: 204 }) };
	const id = DeviceId.safeParse(request.headers.get("x-device-id"));
	if (!id.success)
		return { denied: Response.json({ error: "bad_request" }, { status: 400 }) };
	return { deviceId: id.data };
}

async function run(fn: () => Promise<Response>) {
	try {
		return await fn();
	} catch (e) {
		reportError(e, { stage: "db" });
		return Response.json({ error: "db_error" }, { status: 502 });
	}
}

export const Route = createFileRoute("/api/bot/profile")({
	server: {
		handlers: {
			GET: ({ request }) => {
				const g = guard(request);
				if (g.denied) return g.denied;
				return run(async () => {
					const p = await getProfile(g.deviceId);
					return Response.json(
						p
							? {
									learner: p.learner ?? null,
									hard: p.hard ?? [],
									interests: p.interests ?? null,
									updatedAt: p.updatedAt,
								}
							: null,
					);
				});
			},
			POST: async ({ request }) => {
				const g = guard(request);
				if (g.denied) return g.denied;
				const patch = Patch.safeParse(await request.json().catch(() => null));
				if (!patch.success)
					return Response.json({ error: "bad_request" }, { status: 400 });
				return run(async () => {
					await saveProfile(g.deviceId, patch.data);
					return Response.json({ ok: true });
				});
			},
			DELETE: ({ request }) => {
				const g = guard(request);
				if (g.denied) return g.denied;
				return run(async () => {
					await deleteProfile(g.deviceId);
					return Response.json({ ok: true });
				});
			},
		},
	},
});
