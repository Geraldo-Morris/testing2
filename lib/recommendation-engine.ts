import type { Manhwa } from "./types"
import { getAllManhwaSync } from "./manhwa-service"

// Content-based filtering recommendation engine
export function getRecommendations(targetManhwa: Manhwa, limit = 5): Manhwa[] {
  const allManhwa = getAllManhwaSync()

  // Calculate similarity scores for all manhwa compared to the target
  const scoredManhwa = allManhwa
    .filter((manhwa) => manhwa.id !== targetManhwa.id) // Exclude the target manhwa
    .map((manhwa) => {
      const similarityScore = calculateSimilarity(targetManhwa, manhwa)
      return { manhwa, similarityScore }
    })

  // Sort by similarity score (highest first)
  scoredManhwa.sort((a, b) => b.similarityScore - a.similarityScore)

  // Return the top N recommendations
  return scoredManhwa.slice(0, limit).map((item) => item.manhwa)
}

// Calculate similarity between two manhwa based on their attributes
function calculateSimilarity(manhwa1: Manhwa, manhwa2: Manhwa): number {
  let score = 0

  // Genre similarity (highest weight)
  const genreSimilarity = calculateJaccardSimilarity(manhwa1.genres, manhwa2.genres)
  score += genreSimilarity * 0.6

  // Tag similarity
  const tagSimilarity = calculateJaccardSimilarity(manhwa1.tags, manhwa2.tags)
  score += tagSimilarity * 0.3

  // Release year proximity (normalized)
  const yearDifference = Math.abs(manhwa1.releaseYear - manhwa2.releaseYear)
  const yearSimilarity = 1 - Math.min(yearDifference / 10, 1) // Max difference considered is 10 years
  score += yearSimilarity * 0.1

  return score
}

// Jaccard similarity coefficient for comparing sets (like genres and themes)
function calculateJaccardSimilarity(set1: string[] | undefined, set2: string[] | undefined): number {
  if (!set1 || !set2) return 0

  const intersection = set1.filter((item) => set2.includes(item)).length
  const union = new Set([...set1, ...set2]).size

  return union === 0 ? 0 : intersection / union
}

// Get recommendations based on user's preferred genres and themes
export function getRecommendationsByPreferences(
  preferredGenres: string[],
  preferredTags: string[],
  limit = 10,
): Manhwa[] {
  const allManhwa = getAllManhwaSync()

  // Calculate preference scores for all manhwa
  const scoredManhwa = allManhwa.map((manhwa) => {
    let score = 0

    // Genre matching score
    const genreMatches = manhwa.genres.filter((genre) => preferredGenres.includes(genre)).length
    const genreScore = preferredGenres.length > 0 ? genreMatches / preferredGenres.length : 0
    score += genreScore * 0.6 // 60% weight for genres

    // Tag matching score
    const tagMatches = manhwa.tags.filter((tag) => preferredTags.includes(tag)).length
    const tagScore = preferredTags.length > 0 ? tagMatches / preferredTags.length : 0
    score += tagScore * 0.4 // 40% weight for tags

   

    return { manhwa, score }
  })

  // Sort by score (highest first) and filter out manhwa with zero score
  const filteredAndSorted = scoredManhwa.filter((item) => item.score > 0).sort((a, b) => b.score - a.score)

  // Return the top N recommendations
  return filteredAndSorted.slice(0, limit).map((item) => item.manhwa)
}
