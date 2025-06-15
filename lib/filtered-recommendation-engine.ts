import type { Manhwa } from "./types"
import { getAllManhwaSync } from "./manhwa-service"

// Enhanced recommendation engine with filtering capabilities
export function getFilteredRecommendations(
  targetManhwa: Manhwa,
  unwantedGenres: string[] = [],
  unwantedTags: string[] = [],
  yearRange: { min?: number; max?: number } = {},
  limit = 5,
): Manhwa[] {
  const allManhwa = getAllManhwaSync()

  // First, filter out manhwa that contain unwanted genres, tags, or release years
  const filteredManhwa = allManhwa.filter((manhwa) => {
    // Exclude the target manhwa itself
    if (manhwa.id === targetManhwa.id) return false

    // Check if manhwa contains any unwanted genres
    const hasUnwantedGenre = unwantedGenres.some((genre) => manhwa.genres.includes(genre))
    if (hasUnwantedGenre) return false

    // Check if manhwa contains any unwanted tags
    const hasUnwantedTag = unwantedTags.some((tag) => manhwa.tags.includes(tag))
    if (hasUnwantedTag) return false

    // Check if manhwa release year falls within unwanted range
    if (yearRange.min !== undefined && manhwa.releaseYear < yearRange.min) return false // Should be < to exclude years before min
    if (yearRange.max !== undefined && manhwa.releaseYear > yearRange.max) return false // Should be > to exclude years after max

    return true
  })

  // If no manhwa left after filtering, return empty array
  if (filteredManhwa.length === 0) {
    return []
  }

  // Calculate similarity scores for filtered manhwa
  const scoredManhwa = filteredManhwa.map((manhwa) => {
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
  score += genreSimilarity * 0.5

  // Tag similarity
  const tagSimilarity = calculateJaccardSimilarity(manhwa1.tags, manhwa2.tags)
  score += tagSimilarity * 0.4

  // Release year proximity (normalized)
  const yearDifference = Math.abs(manhwa1.releaseYear - manhwa2.releaseYear)
  const yearSimilarity = 1 - Math.min(yearDifference / 10, 1) // Max difference considered is 10 years
  score += yearSimilarity * 0.1

  return score
}

// Jaccard similarity coefficient for comparing sets (like genres and themes)
function calculateJaccardSimilarity(set1: string[], set2: string[]): number {
  const intersection = set1.filter((item) => set2.includes(item)).length
  const union = new Set([...set1, ...set2]).size

  return union === 0 ? 0 : intersection / union
}

// Get statistics about filtering results
export function getFilteringStats(
  targetManhwa: Manhwa,
  unwantedGenres: string[] = [],
  unwantedTags: string[] = [],
  yearRange: { min?: number; max?: number } = {},
) {
  const allManhwa = getAllManhwaSync()
  const totalManhwa = allManhwa.length - 1 // Exclude target manhwa

  // Count manhwa filtered out by genres
  const filteredByGenres = allManhwa.filter((manhwa) => {
    if (manhwa.id === targetManhwa.id) return false
    return unwantedGenres.some((genre) => manhwa.genres.includes(genre))
  }).length

  // Count manhwa filtered out by tags
  const filteredByTags = allManhwa.filter((manhwa) => {
    if (manhwa.id === targetManhwa.id) return false
    return unwantedTags.some((tag) => manhwa.tags.includes(tag))
  }).length

  // Count manhwa filtered out by release year
  const filteredByYear = allManhwa.filter((manhwa) => {
    if (manhwa.id === targetManhwa.id) return false
    if (yearRange.min !== undefined && manhwa.releaseYear < yearRange.min) return true // Corrected logic
    if (yearRange.max !== undefined && manhwa.releaseYear > yearRange.max) return true // Corrected logic
    return false
  }).length

  // Count manhwa filtered out by any criteria
  const filteredByAny = allManhwa.filter((manhwa) => {
    if (manhwa.id === targetManhwa.id) return false
    const hasUnwantedGenre = unwantedGenres.some((genre) => manhwa.genres.includes(genre))
    const hasUnwantedTag = unwantedTags.some((tag) => manhwa.tags.includes(tag))
    const hasUnwantedYear =
      (yearRange.min !== undefined && manhwa.releaseYear < yearRange.min) || // Corrected logic
      (yearRange.max !== undefined && manhwa.releaseYear > yearRange.max) // Corrected logic
    return hasUnwantedGenre || hasUnwantedTag || hasUnwantedYear
  }).length

  const remainingManhwa = totalManhwa - filteredByAny

  return {
    totalManhwa,
    filteredByGenres,
    filteredByTags,
    filteredByYear,
    filteredByAny,
    remainingManhwa,
    filteringPercentage: totalManhwa > 0 ? (filteredByAny / totalManhwa) * 100 : 0,
  }
}
