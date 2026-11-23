// Google Cloud access (Vertex AI + Text-to-Speech) with a service account.
// GOOGLE_SERVICE_ACCOUNT_JSON holds the whole JSON key (one line is fine).
// Optional: GOOGLE_CLOUD_PROJECT (defaults to the key's project) and
// GOOGLE_CLOUD_LOCATION (defaults to "global").

import { GoogleGenAI } from "@google/genai";
import { GoogleAuth } from "google-auth-library";
import { toJSONSchema, type ZodType } from "zod";

interface Credentials {
	project_id?: string;
	client_email?: string;
	private_key?: string;
}

function credentials(): Credentials | null {
	const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
	if (!raw) return null;
	try {
		return JSON.parse(raw) as Credentials;
	} catch {
		return null;
	}
}

export const googleReady = () => {
	const c = credentials();
	return Boolean(
		c?.client_email &&
			c.private_key &&
			(process.env.GOOGLE_CLOUD_PROJECT || c.project_id),
	);
};

const SCOPES = ["https://www.googleapis.com/auth/cloud-platform"];

let genai: GoogleGenAI | undefined;
export function gemini() {
	if (!genai) {
		const c = credentials() ?? {};
		genai = new GoogleGenAI({
			vertexai: true,
			project: process.env.GOOGLE_CLOUD_PROJECT || c.project_id,
			location: process.env.GOOGLE_CLOUD_LOCATION || "global",
			googleAuthOptions: { credentials: c, scopes: SCOPES },
		});
	}
	return genai;
}

let auth: GoogleAuth | undefined;
export async function googleToken() {
	auth ??= new GoogleAuth({ credentials: credentials() ?? {}, scopes: SCOPES });
	const token = await auth.getAccessToken();
	if (!token) throw new Error("no Google access token");
	return token;
}

/** A zod schema as plain JSON Schema for Gemini (without the "$schema" tag it may reject). */
export function geminiSchema(schema: ZodType) {
	const { $schema: _, ...rest } = toJSONSchema(schema) as Record<
		string,
		unknown
	>;
	return rest;
}
