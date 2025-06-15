import { getAllManhwa } from "@/lib/manhwa-service"
import { getRecommendations } from "@/lib/recommendation-engine"
import { getFilteredRecommendations } from "@/lib/filtered-recommendation-engine"
import { calculateDetailedSimilarity } from "@/lib/similarity-calculator"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, TrendingUp, Calculator, Filter } from "lucide-react"
import Link from "next/link"
import { notFound } from "next/navigation"

interface AllCalculationsPageProps {
  params: {
    id: string
  }
  searchParams: {
    unwantedGenres?: string
    unwantedTags?: string
    yearMin?: string
    yearMax?: string
  }
}

// Helper function to safely get array with fallback
function safeArray<T>(arr: T[] | undefined | null): T[] {
  return Array.isArray(arr) ? arr : []
}

// Helper function to safely get object with fallback
function safeObject<T>(obj: T | undefined | null, fallback: T): T {
  return obj && typeof obj === "object" ? obj : fallback
}

export default async function AllCalculationsPage({ params, searchParams }: AllCalculationsPageProps) {
  // Await params and searchParams
  const awaitedParams = await params;
  const awaitedSearchParams = await searchParams;

  // Fetch all manhwa data first to ensure it's loaded
  const allManhwaData = await getAllManhwa();
  const sourceManhwa = allManhwaData.find(m => m.id === awaitedParams.id);

  if (!sourceManhwa) {
    notFound()
  }

  // Parse unwanted filters from URL
  const unwantedGenres = awaitedSearchParams.unwantedGenres ? awaitedSearchParams.unwantedGenres.split(",").filter(Boolean) : []
  const unwantedTags = awaitedSearchParams.unwantedTags ? awaitedSearchParams.unwantedTags.split(",").filter(Boolean) : []
  const yearRange: { min?: number; max?: number } = {}
  if (awaitedSearchParams.yearMin) yearRange.min = Number.parseInt(awaitedSearchParams.yearMin)
  if (awaitedSearchParams.yearMax) yearRange.max = Number.parseInt(awaitedSearchParams.yearMax)

  const hasFilters =
    unwantedGenres.length > 0 || unwantedTags.length > 0 || yearRange.min !== undefined || yearRange.max !== undefined

  // Get recommendations based on filters
  const recommendations = await (hasFilters // Added await and parenthesis for clarity
    ? getFilteredRecommendations(sourceManhwa, unwantedGenres, unwantedTags, yearRange)
    : getRecommendations(sourceManhwa))

  // allManhwaData is already fetched above
  const allManhwa = allManhwaData;

  // Calculate detailed similarity for each recommendation with comprehensive error handling
  const calculationResults = recommendations
    .map((manhwa) => {
      try {
        const calculation = calculateDetailedSimilarity(sourceManhwa, manhwa, allManhwa)

        // Ensure all required properties exist with safe fallbacks
        const safeCalculation = {
          tfidf: {
            genres: safeArray(calculation?.sourceTfidf?.genres),
            tags: safeArray(calculation?.sourceTfidf?.tags),
            themes: safeArray((calculation?.sourceTfidf as any)?.themes), // Keep both tags and themes for compatibility
          },
          targetTfidf: {
            genres: safeArray(calculation?.targetTfidf?.genres),
            tags: safeArray(calculation?.targetTfidf?.tags),
            themes: safeArray((calculation?.targetTfidf as any)?.themes), // Keep both tags and themes for compatibility
          },
          vectors: {
            source: safeArray(calculation?.vectors?.source),
            target: safeArray(calculation?.vectors?.target),
          },
          vectorTable: safeArray(calculation?.vectorTable),
          cosine: safeObject(calculation?.cosine, {
            similarity: 0,
            dotProduct: 0,
            magnitudeA: 0,
            magnitudeB: 0,
          }),
          dotProductSteps: safeArray(calculation?.dotProductSteps),
          magnitudeASteps: safeObject(calculation?.magnitudeASteps, {
            steps: [],
            sumOfSquares: 0,
          }),
          magnitudeBSteps: safeObject(calculation?.magnitudeBSteps, {
            steps: [],
            sumOfSquares: 0,
          }),
          additionalFactors: safeObject(calculation?.additionalFactors, { artStyle: { score: 0, weight: 0 }, status: { score: 0, weight: 0 }, yearSimilarity: { score: 0, weight: 0 }, ratingSimilarity: { score: 0, weight: 0 } }),
          finalScore: typeof calculation?.finalScore === "number" ? calculation.finalScore : 0,
          evaluationMetrics: safeObject(calculation?.evaluationMetrics, {
            threshold: 0.3,
            confusionMatrix: { tp: 0, fp: 0, tn: 0, fn: 0 },
            precision: 0,
            recall: 0,
            accuracy: 0,
            f1Score: 0,
          }),
        }

        return {
          manhwa,
          calculation: safeCalculation,
        }
      } catch (error) {
        console.error(`Error calculating similarity for ${manhwa.title}:`, error)
        // Return a comprehensive default calculation result
        return {
          manhwa,
          calculation: {
            tfidf: {
              genres: [],
              tags: [],
              themes: [], // Keep both for compatibility
            } as any,
            vectors: { source: [], target: [] },
            vectorTable: [],
            cosine: { similarity: 0, dotProduct: 0, magnitudeA: 0, magnitudeB: 0 },
            dotProductSteps: [],
            magnitudeASteps: { steps: [], sumOfSquares: 0 },
            magnitudeBSteps: { steps: [], sumOfSquares: 0 },
            additionalFactors: { // Added default structure here as well for consistency
              artStyle: { score: 0, weight: 0 },
              status: { score: 0, weight: 0 },
              yearSimilarity: { score: 0, weight: 0 },
              ratingSimilarity: { score: 0, weight: 0 }
            },
            finalScore: 0,
            evaluationMetrics: {
              threshold: 0.3,
              confusionMatrix: { tp: 0, fp: 0, tn: 0, fn: 0 },
              precision: 0,
              recall: 0,
              accuracy: 0,
              f1Score: 0,
            },
          },
        }
      }
    })
    .filter((result) => result && result.calculation && typeof result.calculation.cosine.similarity === "number") // Use cosine.similarity for filtering
    .sort((a, b) => (b.calculation.cosine.similarity || 0) - (a.calculation.cosine.similarity || 0)) // Sort by cosine similarity descending

  // Calculate overall evaluation metrics with safety check
  const overallMetrics =
    calculationResults.length > 0
      ? calculateOverallEvaluationMetrics(calculationResults)
      : {
          threshold: 0.3,
          confusionMatrix: { tp: 0, fp: 0, tn: 0, fn: 0 },
          precision: 0,
          recall: 0,
          accuracy: 0,
          f1Score: 0,
        }

  const getYearRangeText = () => {
    if (yearRange.min !== undefined && yearRange.max !== undefined) {
      return `${yearRange.min}-${yearRange.max}`
    } else if (yearRange.min !== undefined) {
      return `From ${yearRange.min}`
    } else if (yearRange.max !== undefined) {
      return `Until ${yearRange.max}`
    }
    return null
  }

  return (
    <main className="container mx-auto px-4 py-8">
      <Link href={`/manhwa/${awaitedParams.id}`}>
        <Button variant="ghost" className="mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to {sourceManhwa.title}
        </Button>
      </Link>

      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-4">
          {hasFilters ? "Filtered Recommendation Calculations" : "All Recommendation Calculations"}
        </h1>
        <div className="flex items-center gap-4 mb-4">
          <img
            src={sourceManhwa.coverImage || "/placeholder.svg"}
            alt={sourceManhwa.title}
            className="w-16 h-20 object-cover rounded"
          />
          <div>
            <h2 className="text-xl font-semibold">{sourceManhwa.title}</h2>
            <p className="text-muted-foreground">
              {hasFilters ? "Filtered calculations" : "Detailed calculations"} for all {recommendations.length}{" "}
              recommendations
            </p>
          </div>
        </div>

        {/* Show active filters */}
        {hasFilters && (
          <Card className="mb-6">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Active Filters</span>
              </div>
              <div className="space-y-2">
                {unwantedGenres.length > 0 && (
                  <div>
                    <span className="text-sm text-muted-foreground mr-2">Excluded Genres:</span>
                    <div className="inline-flex flex-wrap gap-1">
                      {unwantedGenres.map((genre) => (
                        <Badge key={genre} variant="destructive" className="text-xs">
                          {genre}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                {unwantedTags.length > 0 && (
                  <div>
                    <span className="text-sm text-muted-foreground mr-2">Excluded Tags:</span>
                    <div className="inline-flex flex-wrap gap-1">
                      {unwantedTags.map((theme) => (
                        <Badge key={theme} variant="destructive" className="text-xs">
                          {theme}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                {getYearRangeText() && (
                  <div>
                    <span className="text-sm text-muted-foreground mr-2">Excluded Years:</span>
                    <Badge variant="destructive" className="text-xs">
                      {getYearRangeText()}
                    </Badge>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {recommendations.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <h3 className="text-lg font-semibold mb-2">No Recommendations to Calculate</h3>
            <p className="text-muted-foreground mb-4">
              {hasFilters
                ? "Your current filters have excluded all potential recommendations."
                : "No recommendations are available for this manhwa."}
            </p>
            <Link href={`/manhwa/${awaitedParams.id}`}>
              <Button variant="outline">Go Back</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="detailed">Detailed Calculations</TabsTrigger>
            <TabsTrigger value="metrics">Evaluation Metrics</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Similarity Scores Overview
                  {hasFilters && <Badge variant="secondary">Filtered Results</Badge>}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {calculationResults.map((result, index) => (
                    <div key={result.manhwa.id} className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
                      <div className="text-lg font-semibold text-primary w-8">#{index + 1}</div>
                      <img
                        src={result.manhwa.coverImage || "/placeholder.svg"}
                        alt={result.manhwa.title}
                        className="w-12 h-16 object-cover rounded"
                      />
                      <div className="flex-1">
                        <h3 className="font-semibold">{result.manhwa.title}</h3>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {safeArray(result.manhwa.genres)
                            .slice(0, 3)
                            .map((genre) => (
                              <span key={genre} className="px-2 py-0.5 bg-primary/10 text-primary rounded text-xs">
                                {genre}
                              </span>
                            ))}
                          <span className="px-2 py-0.5 bg-muted text-muted-foreground rounded text-xs">
                            {result.manhwa.releaseYear}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-primary">
                          {((result.calculation.cosine?.similarity || 0) * 100).toFixed(1)}%
                        </div>
                        <div className="text-sm text-muted-foreground">Similarity</div>
                        <div className="text-xs text-muted-foreground mt-1">
                          Score: {(result.calculation.cosine?.similarity || 0).toFixed(4)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <div className="grid md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {calculationResults.length > 0
                      ? (
                          (calculationResults.reduce((sum, r) => sum + (r.calculation.cosine?.similarity || 0), 0) /
                            calculationResults.length) *
                          100
                        ).toFixed(1)
                      : "0.0"}
                    %
                  </div>
                  <div className="text-sm text-muted-foreground">Average Similarity</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {calculationResults.length > 0
                      ? Math.max(
                          ...calculationResults.map((r) => (r.calculation.cosine?.similarity || 0) * 100),
                        ).toFixed(1)
                      : "0.0"}
                    %
                  </div>
                  <div className="text-sm text-muted-foreground">Highest Similarity</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-orange-600">
                    {calculationResults.length > 0
                      ? Math.min(
                          ...calculationResults.map((r) => (r.calculation.cosine?.similarity || 0) * 100),
                        ).toFixed(1)
                      : "0.0"}
                    %
                  </div>
                  <div className="text-sm text-muted-foreground">Lowest Similarity</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-purple-600">{calculationResults.length}</div>
                  <div className="text-sm text-muted-foreground">
                    {hasFilters ? "Filtered" : "Total"} Recommendations
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Detailed Calculations Tab */}
          <TabsContent value="detailed" className="space-y-6">
            {calculationResults.map((result, index) => (
              <Card key={result.manhwa.id}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-3">
                    <span className="bg-primary text-primary-foreground w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold">
                      {index + 1}
                    </span>
                    {result.manhwa.title}
                    <span className="text-sm font-normal text-muted-foreground">
                      (Similarity: {((result.calculation.cosine?.similarity || 0) * 100).toFixed(2)}%)
                    </span>
                    <Badge variant="outline" className="text-xs">
                      {result.manhwa.releaseYear}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-3 gap-6">
                    {/* TF-IDF Scores */}
                    <div>
                      <h4 className="font-semibold mb-3">TF-IDF Scores</h4>
                      <div className="space-y-2 overflow-y-auto">
                        <div className="text-sm font-medium text-muted-foreground mb-2">Source Genres:</div>
                        {safeArray(result.calculation.tfidf?.genres)
                          .map((item: any) => (
                            <div key={item.term} className="flex justify-between text-sm p-2 bg-green-50 rounded">
                              <span>{item.term}</span>
                              <span className="font-mono">{(item.tfidf || 0).toFixed(4)}</span>
                            </div>
                          ))}
                        <div className="text-sm font-medium text-muted-foreground mb-2 mt-3">Source Tags:</div>
                        {safeArray(result.calculation.tfidf?.tags || result.calculation.tfidf?.themes)
                          .map((item: any) => (
                            <div key={item.term} className="flex justify-between text-sm p-2 bg-blue-50 rounded">
                              <span>{item.term}</span>
                              <span className="font-mono">{(item.tfidf || 0).toFixed(4)}</span>
                            </div>
                          ))}
                        <div className="text-sm font-medium text-muted-foreground mb-2 mt-3">Target Genres:</div>
                        {safeArray((result.calculation as any).targetTfidf?.genres)
                          .map((item: any) => (
                            <div key={item.term} className="flex justify-between text-sm p-2 bg-yellow-50 rounded">
                              <span>{item.term}</span>
                              <span className="font-mono">{(item.tfidf || 0).toFixed(4)}</span>
                            </div>
                          ))}
                        <div className="text-sm font-medium text-muted-foreground mb-2 mt-3">Target Tags:</div>
                        {safeArray((result.calculation as any).targetTfidf?.tags || (result.calculation as any).targetTfidf?.themes)
                          .map((item: any) => (
                            <div key={item.term} className="flex justify-between text-sm p-2 bg-orange-50 rounded">
                              <span>{item.term}</span>
                              <span className="font-mono">{(item.tfidf || 0).toFixed(4)}</span>
                            </div>
                          ))}
                      </div>
                    </div>

                    {/* Cosine Similarity Components */}
                    <div>
                      <h4 className="font-semibold mb-3">Cosine Similarity</h4>
                      <div className="space-y-3">
                        <div className="p-3 bg-muted rounded">
                          <div className="text-sm text-muted-foreground">Dot Product</div>
                          <div className="font-mono font-semibold">
                            {(result.calculation.cosine?.dotProduct || 0).toFixed(6)}
                          </div>
                        </div>
                        <div className="p-3 bg-muted rounded">
                          <div className="text-sm text-muted-foreground">Magnitude A</div>
                          <div className="font-mono font-semibold">
                            {(result.calculation.cosine?.magnitudeA || 0).toFixed(6)}
                          </div>
                        </div>
                        <div className="p-3 bg-muted rounded">
                          <div className="text-sm text-muted-foreground">Magnitude B</div>
                          <div className="font-mono font-semibold">
                            {(result.calculation.cosine?.magnitudeB || 0).toFixed(6)}
                          </div>
                        </div>
                        <div className="p-3 bg-primary/10 rounded">
                          <div className="text-sm text-muted-foreground">Final Similarity</div>
                          <div className="font-mono font-bold text-primary text-lg">
                            {(result.calculation.cosine?.similarity || 0).toFixed(6)}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Vector Information */}
                    <div>
                      <h4 className="font-semibold mb-3">Vector Analysis</h4>
                      <div className="space-y-3">
                        <div className="p-3 bg-muted rounded">
                          <div className="text-sm text-muted-foreground">Common Features</div>
                          <div className="font-semibold">
                            {
                              (() => {
                                const sourceVector: number[] | undefined = result.calculation.vectors?.source;
                                const targetVector: number[] | undefined = result.calculation.vectors?.target;
                                const safeSourceVector: number[] = safeArray<number>(sourceVector);
                                const safeTargetVector: number[] = safeArray<number>(targetVector);

                                const commonFeaturesArray: number[] = safeSourceVector.filter(
                                  (v: number, i: number) => v > 0 && (safeTargetVector[i] || 0) > 0
                                );
                                return commonFeaturesArray.length;
                              })()
                            }
                          </div>
                        </div>
                        <div className="p-3 bg-muted rounded">
                          <div className="text-sm text-muted-foreground">Source Features</div>
                          <div className="font-semibold">
                            {
                              (() => {
                                const sourceVector: number[] | undefined = result.calculation.vectors?.source;
                                const safeSourceVector: number[] = safeArray<number>(sourceVector);
                                const sourceFeaturesArray: number[] = safeSourceVector.filter((v: number) => v > 0);
                                return sourceFeaturesArray.length;
                              })()
                            }
                          </div>
                        </div>
                        <div className="p-3 bg-muted rounded">
                          <div className="text-sm text-muted-foreground">Target Features</div>
                          <div className="font-semibold">
                            {
                              (() => {
                                const targetVector: number[] | undefined = result.calculation.vectors?.target;
                                const safeTargetVector: number[] = safeArray<number>(targetVector);
                                const targetFeaturesArray: number[] = safeTargetVector.filter((v) => typeof v === 'number' && v > 0);
                                return targetFeaturesArray.length;
                              })()
                            }
                          </div>
                        </div>
                        <div className="p-3 bg-muted rounded">
                          <div className="text-sm text-muted-foreground">Total Dimensions</div>
                          <div className="font-semibold">
                            {
                              (() => {
                                const sourceVector: number[] | undefined = result.calculation.vectors?.source;
                                // Fallback to an empty array if sourceVector is undefined before passing to safeArray
                                const safeSourceVector: number[] = safeArray<number>(sourceVector || []); 
                                return safeSourceVector.length;
                              })()
                            }
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Quick Action */}
                  <div className="mt-4 pt-4 border-t">
                    <Link href={`/manhwa/${result.manhwa.id}/calculation?source=${sourceManhwa.id}`}>
                      <Button variant="outline" size="sm">
                        <Calculator className="h-4 w-4 mr-2" />
                        View Detailed Calculation
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          {/* Evaluation Metrics Tab */}
          <TabsContent value="metrics" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>{hasFilters ? "Filtered Recommendations" : "Overall"} Evaluation Metrics</CardTitle>
                <p className="text-muted-foreground">
                  Performance evaluation of the recommendation system based on {recommendations.length}{" "}
                  {hasFilters ? "filtered " : ""}recommendations
                </p>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-6">
                  {/* Confusion Matrix */}
                  <div>
                    <h4 className="font-semibold mb-3">Confusion Matrix</h4>
                    <p className="text-sm text-muted-foreground mb-3">
                      Based on similarity threshold of {overallMetrics.threshold.toFixed(3)}
                    </p>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-32"></TableHead>
                          <TableHead className="text-center bg-green-100">Predicted Relevant</TableHead>
                          <TableHead className="text-center bg-red-100">Predicted Not Relevant</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        <TableRow>
                          <TableCell className="font-semibold bg-green-100">Actually Relevant</TableCell>
                          <TableCell className="text-center font-mono bg-green-50 text-lg font-bold">
                            {overallMetrics.confusionMatrix.tp}
                          </TableCell>
                          <TableCell className="text-center font-mono bg-red-50 text-lg font-bold">
                            {overallMetrics.confusionMatrix.fn}
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="font-semibold bg-red-100">Actually Not Relevant</TableCell>
                          <TableCell className="text-center font-mono bg-red-50 text-lg font-bold">
                            {overallMetrics.confusionMatrix.fp}
                          </TableCell>
                          <TableCell className="text-center font-mono bg-green-50 text-lg font-bold">
                            {overallMetrics.confusionMatrix.tn}
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>

                  {/* Metrics Summary */}
                  <div>
                    <h4 className="font-semibold mb-3">Performance Metrics</h4>
                    <div className="space-y-4">
                      <div className="p-4 bg-blue-50 rounded-lg">
                        <div className="flex justify-between items-center">
                          <span className="font-medium">Precision</span>
                          <span className="text-2xl font-bold text-blue-600">
                            {(overallMetrics.precision * 100).toFixed(1)}%
                          </span>
                        </div>
                        <div className="text-sm text-muted-foreground mt-1">
                          {overallMetrics.confusionMatrix.tp} /{" "}
                          {overallMetrics.confusionMatrix.tp + overallMetrics.confusionMatrix.fp} ={" "}
                          {overallMetrics.precision.toFixed(4)}
                        </div>
                      </div>

                      <div className="p-4 bg-green-50 rounded-lg">
                        <div className="flex justify-between items-center">
                          <span className="font-medium">Recall</span>
                          <span className="text-2xl font-bold text-green-600">
                            {(overallMetrics.recall * 100).toFixed(1)}%
                          </span>
                        </div>
                        <div className="text-sm text-muted-foreground mt-1">
                          {overallMetrics.confusionMatrix.tp} /{" "}
                          {overallMetrics.confusionMatrix.tp + overallMetrics.confusionMatrix.fn} ={" "}
                          {overallMetrics.recall.toFixed(4)}
                        </div>
                      </div>

                      <div className="p-4 bg-purple-50 rounded-lg">
                        <div className="flex justify-between items-center">
                          <span className="font-medium">Accuracy</span>
                          <span className="text-2xl font-bold text-purple-600">
                            {(overallMetrics.accuracy * 100).toFixed(1)}%
                          </span>
                        </div>
                        <div className="text-sm text-muted-foreground mt-1">
                          {overallMetrics.confusionMatrix.tp + overallMetrics.confusionMatrix.tn} /{" "}
                          {calculationResults.length} = {overallMetrics.accuracy.toFixed(4)}
                        </div>
                      </div>

                      <div className="p-4 bg-orange-50 rounded-lg">
                        <div className="flex justify-between items-center">
                          <span className="font-medium">F1-Score</span>
                          <span className="text-2xl font-bold text-orange-600">
                            {(overallMetrics.f1Score * 100).toFixed(1)}%
                          </span>
                        </div>
                        <div className="text-sm text-muted-foreground mt-1">
                          2 × ({overallMetrics.precision.toFixed(3)} × {overallMetrics.recall.toFixed(3)}) / (
                          {overallMetrics.precision.toFixed(3)} + {overallMetrics.recall.toFixed(3)}) ={" "}
                          {overallMetrics.f1Score.toFixed(4)}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Individual Recommendation Metrics */}
            <Card>
              <CardHeader>
                <CardTitle>Individual Recommendation Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Rank</TableHead>
                        <TableHead>Manhwa</TableHead>
                        <TableHead className="text-center">Year</TableHead>
                        <TableHead className="text-center">Similarity Score</TableHead>
                        <TableHead className="text-center">Predicted</TableHead>
                        <TableHead className="text-center">Actually Relevant</TableHead>
                        <TableHead className="text-center">Result</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {calculationResults.map((result, index) => {
                        const predicted = (result.calculation.cosine?.similarity || 0) >= overallMetrics.threshold
                        const actuallyRelevant = hasSharedFeatures(sourceManhwa, result.manhwa)
                        const resultType =
                          predicted && actuallyRelevant
                            ? "TP"
                            : predicted && !actuallyRelevant
                              ? "FP"
                              : !predicted && actuallyRelevant
                                ? "FN"
                                : "TN"
                        const resultColor =
                          resultType === "TP"
                            ? "text-green-600"
                            : resultType === "FP"
                              ? "text-red-600"
                              : resultType === "FN"
                                ? "text-orange-600"
                                : "text-gray-600"

                        return (
                          <TableRow key={result.manhwa.id}>
                            <TableCell className="font-semibold">#{index + 1}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <img
                                  src={result.manhwa.coverImage || "/placeholder.svg"}
                                  alt={result.manhwa.title}
                                  className="w-8 h-10 object-cover rounded"
                                />
                                <div className="font-medium">{result.manhwa.title}</div>
                              </div>
                            </TableCell>
                            <TableCell className="text-center font-mono">{result.manhwa.releaseYear}</TableCell>
                            <TableCell className="text-center font-mono">
                              {(result.calculation.cosine?.similarity || 0).toFixed(4)}
                            </TableCell>
                            <TableCell className="text-center">
                              <span className={predicted ? "text-green-600" : "text-red-600"}>
                                {predicted ? "Relevant" : "Not Relevant"}
                              </span>
                            </TableCell>
                            <TableCell className="text-center">
                              <span className={actuallyRelevant ? "text-green-600" : "text-red-600"}>
                                {actuallyRelevant ? "Yes" : "No"}
                              </span>
                            </TableCell>
                            <TableCell className="text-center">
                              <span className={`font-semibold ${resultColor}`}>{resultType}</span>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>
                <div className="mt-4 text-sm text-muted-foreground">
                  <div>
                    <strong>TP:</strong> True Positive (Correctly predicted as relevant)
                  </div>
                  <div>
                    <strong>FP:</strong> False Positive (Incorrectly predicted as relevant)
                  </div>
                  <div>
                    <strong>TN:</strong> True Negative (Correctly predicted as not relevant)
                  </div>
                  <div>
                    <strong>FN:</strong> False Negative (Incorrectly predicted as not relevant)
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </main>
  )
}

// Helper function to calculate overall evaluation metrics
function calculateOverallEvaluationMetrics(calculationResults: any[]) {
  const threshold = 0.3
  let tp = 0,
    fp = 0,
    tn = 0,
    fn = 0

  calculationResults.forEach((result) => {
    const predicted = (result.calculation.cosine?.similarity || 0) >= threshold
    const actuallyRelevant = hasSharedFeatures(result.calculation.sourceManhwa || result.manhwa, result.manhwa)

    if (predicted && actuallyRelevant) tp++
    else if (predicted && !actuallyRelevant) fp++
    else if (!predicted && actuallyRelevant) fn++
    else tn++
  })

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

// Helper function to check if two manhwa have shared features
function hasSharedFeatures(manhwa1: any, manhwa2: any) {
  if (!manhwa1 || !manhwa2) return false

  const genres1 = safeArray(manhwa1.genres) as string[]
  const genres2 = safeArray(manhwa2.genres) as string[]
  const tags1 = safeArray(manhwa1.tags) as string[]
  const tags2 = safeArray(manhwa2.tags) as string[]

  const sharedGenres = genres1.filter((g: string) => genres2.includes(g)).length
  const sharedTags = tags1.filter((t: string) => tags2.includes(t)).length
  return sharedGenres > 0 || sharedTags > 0
}
