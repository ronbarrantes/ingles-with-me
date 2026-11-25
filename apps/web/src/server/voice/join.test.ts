import { describe, expect, it } from "vitest";
import { joinWavs } from "./index";

function wav(samples: number[], rate = 24_000) {
	const b = new ArrayBuffer(44 + samples.length * 2);
	const v = new DataView(b);
	const tag = (at: number, s: string) => {
		for (let i = 0; i < 4; i++) v.setUint8(at + i, s.charCodeAt(i));
	};
	tag(0, "RIFF");
	v.setUint32(4, 36 + samples.length * 2, true);
	tag(8, "WAVE");
	tag(12, "fmt ");
	v.setUint32(16, 16, true);
	v.setUint16(20, 1, true);
	v.setUint16(22, 1, true);
	v.setUint32(24, rate, true);
	v.setUint32(28, rate * 2, true);
	v.setUint16(32, 2, true);
	v.setUint16(34, 16, true);
	tag(36, "data");
	v.setUint32(40, samples.length * 2, true);
	samples.forEach((s, i) => {
		v.setInt16(44 + i * 2, s, true);
	});
	return b;
}

describe("joinWavs", () => {
	it("joins the samples of several WAVs under one header", () => {
		const out = new DataView(joinWavs([wav([1, 2]), wav([3]), wav([4, 5])]));
		expect(out.getUint32(40, true)).toBe(10);
		expect(out.getUint32(24, true)).toBe(24_000);
		const samples = [0, 1, 2, 3, 4].map((i) => out.getInt16(44 + i * 2, true));
		expect(samples).toEqual([1, 2, 3, 4, 5]);
	});
});
