export const REVIEW_LISTS = {
	due: { color: "#111111", emoji: "⏰" },
	marked: { color: "#29335C", emoji: "🔖" },
	favorites: { color: "#E0A100", emoji: "★" },
} as const;

export type ReviewList = keyof typeof REVIEW_LISTS;
