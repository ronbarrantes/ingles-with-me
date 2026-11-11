export const REVIEW_LISTS = {
	due: { color: "#E4572E", emoji: "⏰" },
	marked: { color: "#2B59C3", emoji: "🔖" },
	favorites: { color: "#E0A100", emoji: "★" },
} as const;

export type ReviewList = keyof typeof REVIEW_LISTS;
