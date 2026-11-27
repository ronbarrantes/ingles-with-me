// Are headphones connected? Browsers don't say directly, but once the mic is
// allowed, device names are visible ("AirPods Pro", "Beats Fit Pro", …).
// Used to pick the reliable mic mode automatically: with headphones, volume
// isn't a problem and switching audio modes can drop Bluetooth.

const HEADPHONES =
	/airpods|bluetooth|headset|headphone|earphone|earbud|buds|beats|bose|sony wh|sony wf|jabra|audífono|auricular/i;

export async function hasHeadphones(): Promise<boolean> {
	try {
		const devices = await navigator.mediaDevices.enumerateDevices();
		return devices.some(
			(d) =>
				(d.kind === "audioinput" || d.kind === "audiooutput") &&
				HEADPHONES.test(d.label),
		);
	} catch {
		return false;
	}
}

/** Call `fn` when devices change (headphones connected or removed). */
export function onDevicesChange(fn: () => void) {
	try {
		navigator.mediaDevices.addEventListener("devicechange", fn);
		return () => navigator.mediaDevices.removeEventListener("devicechange", fn);
	} catch {
		return () => {};
	}
}
