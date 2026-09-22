export interface MatchCalculationResult {
  confidence_score: number;
  text_score: number;
  image_score?: number | null;
  category_score: number;
  approximate_label: string;
  is_renormalized: boolean;
}

export function computeClientMatchScore(
  textScore: number,
  imageScore: number | null,
  categoryMatch: boolean
): MatchCalculationResult {
  const catScore = categoryMatch ? 1.0 : 0.0;
  let confidence: number;
  let isRenormalized = false;

  if (imageScore !== null && imageScore !== undefined) {
    confidence = 0.50 * textScore + 0.40 * imageScore + 0.10 * catScore;
  } else {
    confidence = 0.85 * textScore + 0.15 * catScore;
    isRenormalized = true;
  }

  const bounded = Math.max(0, Math.min(1, confidence));
  const percent = Math.round(bounded * 100);

  return {
    confidence_score: Number(bounded.toFixed(4)),
    text_score: Number(textScore.toFixed(4)),
    image_score: imageScore !== null ? Number(imageScore.toFixed(4)) : null,
    category_score: catScore,
    approximate_label: `~${percent}% match`,
    is_renormalized: isRenormalized,
  };
}
