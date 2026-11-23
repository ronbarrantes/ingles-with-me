// Azure AI Speech: the browser gets a short-lived token (10 minutes), never the key.

export const speechReady = () =>
	Boolean(process.env.AZURE_SPEECH_KEY && process.env.AZURE_SPEECH_REGION);

export async function issueSpeechToken() {
	const key = process.env.AZURE_SPEECH_KEY ?? "";
	const region = process.env.AZURE_SPEECH_REGION ?? "";
	const res = await fetch(
		`https://${region}.api.cognitive.microsoft.com/sts/v1.0/issueToken`,
		{
			method: "POST",
			headers: { "Ocp-Apim-Subscription-Key": key, "Content-Length": "0" },
		},
	);
	if (!res.ok) throw new Error(`Azure token request failed: ${res.status}`);
	return { token: await res.text(), region };
}
