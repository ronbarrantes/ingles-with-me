import type { SVGProps } from "react";

type P = SVGProps<SVGSVGElement> & { filled?: boolean };

const base = (p: P) => ({
	width: 24,
	height: 24,
	viewBox: "0 0 24 24",
	fill: "none",
	stroke: "currentColor",
	strokeWidth: 1.8,
	strokeLinecap: "round" as const,
	strokeLinejoin: "round" as const,
	...p,
});

export const SpeakerIcon = ({ filled: _, ...p }: P) => (
	<svg aria-hidden="true" {...base(p)}>
		<path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" />
		<path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11" />
	</svg>
);

export const StarIcon = ({ filled, ...p }: P) => (
	<svg aria-hidden="true" {...base(p)} fill={filled ? "currentColor" : "none"}>
		<path d="m12 3.8 2.5 5.1 5.6.8-4 3.9.9 5.6-5-2.6-5 2.6.9-5.6-4-3.9 5.6-.8z" />
	</svg>
);

export const BookmarkIcon = ({ filled, ...p }: P) => (
	<svg aria-hidden="true" {...base(p)} fill={filled ? "currentColor" : "none"}>
		<path d="M6.5 3.5h11v17L12 16.5l-5.5 4z" />
	</svg>
);

export const CardsIcon = ({ filled: _, ...p }: P) => (
	<svg aria-hidden="true" {...base(p)}>
		<rect x="3.5" y="6.5" width="13" height="14" rx="1.5" />
		<path d="M7.5 3.5h11a2 2 0 0 1 2 2v12" />
	</svg>
);

export const ListIcon = ({ filled: _, ...p }: P) => (
	<svg aria-hidden="true" {...base(p)}>
		<path d="M9 6.5h11M9 12h11M9 17.5h11" />
		<path d="M4.5 6.5h.01M4.5 12h.01M4.5 17.5h.01" strokeWidth={2.6} />
	</svg>
);

export const RepeatIcon = ({ filled: _, ...p }: P) => (
	<svg aria-hidden="true" {...base(p)}>
		<path d="M4 11V9.5A3.5 3.5 0 0 1 7.5 6H19l-3-3M20 13v1.5a3.5 3.5 0 0 1-3.5 3.5H5l3 3" />
	</svg>
);

export const SearchIcon = ({ filled: _, ...p }: P) => (
	<svg aria-hidden="true" {...base(p)}>
		<circle cx="11" cy="11" r="6.5" />
		<path d="m16 16 4.5 4.5" />
	</svg>
);

export const CloseIcon = ({ filled: _, ...p }: P) => (
	<svg aria-hidden="true" {...base(p)}>
		<path d="M6 6l12 12M18 6 6 18" />
	</svg>
);

export const CheckIcon = ({ filled: _, ...p }: P) => (
	<svg aria-hidden="true" {...base(p)}>
		<path d="m5 12.5 4.5 4.5L19 7.5" />
	</svg>
);

export const FlipIcon = ({ filled: _, ...p }: P) => (
	<svg aria-hidden="true" {...base(p)}>
		<path d="M20 12a8 8 0 1 1-2.6-5.9" />
		<path d="M20 4v5h-5" />
	</svg>
);
