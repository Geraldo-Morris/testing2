import type { Manhwa } from "./types"
import { getAllManhwa } from "./manhwa-service"

const ALL_GENRES = [
  "Action",
  "Adventure",
  "Fantasy",
  "Romance",
  "Comedy",
  "Drama",
  "Horror",
  "Thriller",
  "Mystery",
  "Supernatural",
  "Martial Arts",
  "School Life",
  "Psychological",
  "Game",
  "Slice of Life",
]

// Calculate detailed similarity with step-by-step breakdown
export function calculateDetailedSimilarity(sourceManhwa: Manhwa, targetManhwa: Manhwa, allManhwaData: Manhwa[]) {
  const allManhwa = allManhwaData

  // Create vocabulary (all unique genres and tags)
  const allGenres = [...new Set(allManhwa.flatMap((m) => m.genres))]
  const allTags = [...new Set(allManhwa.flatMap((m) => m.tags))]
  const vocabulary = [...allGenres, ...allTags]

  // Calculate TF-IDF for both manhwa
  const sourceTFIDF = calculateManhwaTFIDF(sourceManhwa, allManhwa, vocabulary)
  const targetTFIDF = calculateManhwaTFIDF(targetManhwa, allManhwa, vocabulary)

  // Create vectors
  const sourceVector = vocabulary.map((term) => sourceTFIDF[term] || 0)
  const targetVector = vocabulary.map((term) => targetTFIDF[term] || 0)

  // Calculate detailed cosine similarity
  const cosineData = calculateDetailedCosineSimilarity(sourceVector, targetVector, vocabulary)

  // Create vector table for display
  const vectorTable = vocabulary.map((term, index) => ({
    term,
    sourceValue: sourceVector[index],
    targetValue: targetVector[index],
    hasValue: sourceVector[index] > 0 || targetVector[index] > 0,
  }))

  // Additional factors
  const additionalFactors = {
    artStyle: {
      score: sourceManhwa.artStyle === targetManhwa.artStyle ? 1 : 0,
      weight: 0.1,
    },
    status: {
      score: sourceManhwa.status === targetManhwa.status ? 1 : 0,
      weight: 0.05,
    },
    yearSimilarity: {
      score: 1 - Math.min(Math.abs(sourceManhwa.releaseYear - targetManhwa.releaseYear) / 10, 1),
      weight: 0.05,
    },
    ratingSimilarity: {
      score: 1 - Math.abs(sourceManhwa.rating - targetManhwa.rating) / 10,
      weight: 0.1,
    },
  }

  // Calculate final score
  const additionalScore = Object.values(additionalFactors).reduce(
    (sum, factor) => sum + factor.score * factor.weight,
    0,
  )
  const finalScore = cosineData.cosine.similarity + additionalScore

  // Calculate evaluation metrics
  const evaluationMetrics = calculateEvaluationMetrics(finalScore, sourceManhwa, targetManhwa)

  const corpusForIDF = allManhwa.map((m) => [...m.genres, ...m.tags]);

  return {
    sourceTfidf: {
      genres: allGenres
        .map((genre) => ({
          term: genre,
          tf: calculateTF(genre, [...sourceManhwa.genres, ...sourceManhwa.tags]),
          idf: calculateIDF(genre, corpusForIDF),
          tfidf: sourceTFIDF[genre] || 0,
        }))
        .filter((item) => item.tfidf > 0),
      tags: allTags
        .map((tag) => ({
          term: tag,
          tf: calculateTF(tag, [...sourceManhwa.genres, ...sourceManhwa.tags]),
          idf: calculateIDF(tag, corpusForIDF),
          tfidf: sourceTFIDF[tag] || 0,
        }))
        .filter((item) => item.tfidf > 0),
    },
    targetTfidf: {
      genres: allGenres
        .map((genre) => ({
          term: genre,
          tf: calculateTF(genre, [...targetManhwa.genres, ...targetManhwa.tags]),
          idf: calculateIDF(genre, corpusForIDF),
          tfidf: targetTFIDF[genre] || 0,
        }))
        .filter((item) => item.tfidf > 0),
      tags: allTags
        .map((tag) => ({
          term: tag,
          tf: calculateTF(tag, [...targetManhwa.genres, ...targetManhwa.tags]),
          idf: calculateIDF(tag, corpusForIDF),
          tfidf: targetTFIDF[tag] || 0,
        }))
        .filter((item) => item.tfidf > 0),
    },
    vectors: {
      source: sourceVector,
      target: targetVector,
    },
    vectorTable,
    cosine: cosineData.cosine,
    dotProductSteps: cosineData.dotProductSteps,
    magnitudeASteps: cosineData.magnitudeASteps,
    magnitudeBSteps: cosineData.magnitudeBSteps,
    additionalFactors,
    finalScore,
    evaluationMetrics,
  }
}

// Calculate TF-IDF for user preferences
export async function calculateTFIDF(targetManhwa: Manhwa, userGenres: string[], userTags: string[]) {
  const allManhwa = await getAllManhwa();
  const userTerms = [...userGenres, ...userTags];

  // Create vocabulary
  const allGenres = [...new Set(allManhwa.flatMap((m) => m.genres))];
  const allTags = [...new Set(allManhwa.flatMap((m) => m.tags))];
  const vocabulary = [...allGenres, ...allTags];

  // Calculate TF-IDF for user preferences and target manhwa
  const userTFIDF = await calculateUserTFIDF(userTerms, allManhwa, vocabulary);
  const targetTFIDF = calculateManhwaTFIDF(targetManhwa, allManhwa, vocabulary);

  // Create vectors
  const userVector = vocabulary.map((term) => userTFIDF[term] || 0);
  const targetVector = vocabulary.map((term) => targetTFIDF[term] || 0);

  // Calculate detailed cosine similarity
  const cosineData = calculateDetailedCosineSimilarity(userVector, targetVector, vocabulary);

  // Create vector table for display
  const vectorTable = vocabulary.map((term, index) => ({
    term,
    sourceValue: userVector[index],
    targetValue: targetVector[index],
    hasValue: userVector[index] > 0 || targetVector[index] > 0,
  }));

  // Calculate evaluation metrics
  const evaluationMetrics = calculateEvaluationMetrics(cosineData.cosine.similarity, null, targetManhwa, userTerms);
  const corpusForIDF = allManhwa.map((m: Manhwa) => [...m.genres, ...m.tags]);

  return {
    userTfidf: {
      genres: userGenres.map((genre) => ({
        term: genre,
        tf: calculateTF(genre, userTerms),
        idf: calculateIDF(genre, corpusForIDF),
        tfidf: userTFIDF[genre] || 0,
      })).filter(item => item.tfidf > 0),
      tags: userTags.map((tag) => ({
        term: tag,
        tf: calculateTF(tag, userTerms),
        idf: calculateIDF(tag, corpusForIDF),
        tfidf: userTFIDF[tag] || 0,
      })).filter(item => item.tfidf > 0),
    },
    targetTfidf: {
      genres: allGenres.map((genre) => ({
        term: genre,
        tf: calculateTF(genre, [...targetManhwa.genres, ...targetManhwa.tags]),
        idf: calculateIDF(genre, corpusForIDF),
        tfidf: targetTFIDF[genre] || 0,
      })).filter(item => item.tfidf > 0),
      tags: allTags.map((tag) => ({
        term: tag,
        tf: calculateTF(tag, [...targetManhwa.genres, ...targetManhwa.tags]),
        idf: calculateIDF(tag, corpusForIDF),
        tfidf: targetTFIDF[tag] || 0,
      })).filter(item => item.tfidf > 0),
    },
    vectors: {
      source: userVector,
      target: targetVector,
    },
    vectorTable,
    cosine: cosineData.cosine,
    dotProductSteps: cosineData.dotProductSteps,
    magnitudeASteps: cosineData.magnitudeASteps,
    magnitudeBSteps: cosineData.magnitudeBSteps,
    finalScore: cosineData.cosine.similarity,
    evaluationMetrics,
  };
}

// Calculate detailed cosine similarity with step-by-step breakdown
function calculateDetailedCosineSimilarity(vectorA: number[], vectorB: number[], vocabulary: string[]) {
  // Dot product calculation steps
  const dotProductSteps = vocabulary.map((term, index) => ({
    term,
    valueA: vectorA[index],
    valueB: vectorB[index],
    product: vectorA[index] * vectorB[index],
  }))

  const dotProduct = dotProductSteps.reduce((sum, step) => sum + step.product, 0)

  // Magnitude A calculation steps
  const magnitudeASteps = {
    steps: vocabulary.map((term, index) => ({
      term,
      value: vectorA[index],
      square: vectorA[index] * vectorA[index],
    })),
    sumOfSquares: 0,
  }
  magnitudeASteps.sumOfSquares = magnitudeASteps.steps.reduce((sum, step) => sum + step.square, 0)
  const magnitudeA = Math.sqrt(magnitudeASteps.sumOfSquares)

  // Magnitude B calculation steps
  const magnitudeBSteps = {
    steps: vocabulary.map((term, index) => ({
      term,
      value: vectorB[index],
      square: vectorB[index] * vectorB[index],
    })),
    sumOfSquares: 0,
  }
  magnitudeBSteps.sumOfSquares = magnitudeBSteps.steps.reduce((sum, step) => sum + step.square, 0)
  const magnitudeB = Math.sqrt(magnitudeBSteps.sumOfSquares)

  const similarity = magnitudeA && magnitudeB ? dotProduct / (magnitudeA * magnitudeB) : 0

  return {
    cosine: {
      dotProduct,
      magnitudeA,
      magnitudeB,
      similarity,
    },
    dotProductSteps,
    magnitudeASteps,
    magnitudeBSteps,
  }
}

// Calculate evaluation metrics
function calculateEvaluationMetrics(
  similarityScore: number,
  sourceManhwa: Manhwa | null,
  targetManhwa: Manhwa,
  userTerms?: string[],
) {
  // Define threshold for relevance (can be adjusted)
  const threshold = 0.3

  // Determine if prediction is relevant based on similarity score
  const predictedRelevant = similarityScore >= threshold

  // Determine ground truth relevance
  let actuallyRelevant = false

  if (sourceManhwa) {
    // For manhwa-to-manhwa comparison, consider relevant if they share genres/tags
    const sharedGenres = sourceManhwa.genres.filter((g) => targetManhwa.genres.includes(g)).length
    const sharedTags = sourceManhwa.tags.filter((t) => targetManhwa.tags.includes(t)).length
    actuallyRelevant = sharedGenres > 0 || sharedTags > 0
  } else if (userTerms) {
    // For user preferences, consider relevant if manhwa has any of the preferred terms
    const manhwaTerms = [...targetManhwa.genres, ...targetManhwa.tags]
    actuallyRelevant = userTerms.some((term) => manhwaTerms.includes(term))
  }

  // Calculate confusion matrix
  const tp = predictedRelevant && actuallyRelevant ? 1 : 0 // True Positive
  const fp = predictedRelevant && !actuallyRelevant ? 1 : 0 // False Positive
  const tn = !predictedRelevant && !actuallyRelevant ? 1 : 0 // True Negative
  const fn = !predictedRelevant && actuallyRelevant ? 1 : 0 // False Negative

  // Calculate metrics
  const precision = tp + fp > 0 ? tp / (tp + fp) : 0
  const recall = tp + fn > 0 ? tp / (tp + fn) : 0
  const accuracy = (tp + tn) / (tp + tn + fp + fn)
  const f1Score = precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0

  return {
    threshold,
    confusionMatrix: { tp, fp, tn, fn },
    precision,
    recall,
    accuracy,
    f1Score,
  }
}

// Calculate TF-IDF for a manhwa
function calculateManhwaTFIDF(manhwa: Manhwa, allManhwa: Manhwa[], vocabulary: string[]) {
  const document = [...manhwa.genres, ...manhwa.tags]
  const corpus = allManhwa.map((m) => [...m.genres, ...m.tags])

  const tfidf: { [key: string]: number } = {}

  for (const term of vocabulary) {
    const tf = calculateTF(term, document)
    const idf = calculateIDF(term, corpus)
    tfidf[term] = tf * idf
  }

  return tfidf
}

// Calculate TF-IDF for user preferences
// Ensure this function is async if it performs async operations or calls other async functions
async function calculateUserTFIDF(terms: string[], corpus: Manhwa[], vocabulary: string[]) {
  const tfidf: { [key: string]: number } = {}

  // If this function needs to be async, ensure it returns a Promise
  // For example, if calculateTF or calculateIDF were async:
  // for (const term of vocabulary) {
  //   if (terms.includes(term)) {
  //     const tf = await calculateTF(term, terms) // Example async call
  //     const idf = await calculateIDF(term, corpus.map(doc => [...doc.genres, ...doc.tags])) // Example async call
  //     tfidf[term] = tf * idf
  //   } else {
  //     tfidf[term] = 0
  //   }
  // }
  // For now, assuming calculateTF and calculateIDF are synchronous as per previous context
  for (const term of vocabulary) {
    if (terms.includes(term)) {
      const tf = calculateTF(term, terms);
      const idf = calculateIDF(term, corpus.map(doc => [...doc.genres, ...doc.tags]));
      tfidf[term] = tf * idf;
    } else {
      tfidf[term] = 0;
    }
  }
  return tfidf;
}

// Calculate Term Frequency
function calculateTF(term: string, document: string[]): number {
  const termCount = document.filter((t) => t === term).length
  return termCount / document.length
}

// Calculate Inverse Document Frequency
function calculateIDF(term: string, corpus: string[][]): number {
  const documentsWithTerm = corpus.filter((doc) => doc.includes(term)).length
  return Math.log(corpus.length / (documentsWithTerm + 1)) // +1 to avoid division by zero
}
