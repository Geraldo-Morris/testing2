import { getAllManhwa } from "@/lib/manhwa-service"
import { getRecommendationsByPreferences } from "@/lib/recommendation-engine"
import { calculateTFIDF } from "@/lib/similarity-calculator"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, TrendingUp, Calculator, Filter, ExternalLink } from "lucide-react"
import Link from "next/link"
import { redirect } from "next/navigation"

interface PreferenceCalculationsPageProps {
  searchParams: {
    userGenres?: string
    userTags?: string
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

// Calculate overall evaluation metrics
function calculateOverallEvaluationMetrics(results: any[]) {
  const totalMetrics = results.reduce(
    (acc, result) => {
      const metrics = result.calculation.evaluationMetrics
      return {
        confusionMatrix: {
          tp: acc.confusionMatrix.tp + metrics.confusionMatrix.tp,
          fp: acc.confusionMatrix.fp + metrics.confusionMatrix.fp,
          tn: acc.confusionMatrix.tn + metrics.confusionMatrix.tn,
          fn: acc.confusionMatrix.fn + metrics.confusionMatrix.fn,
        },
      }
    },
    { confusionMatrix: { tp: 0, fp: 0, tn: 0, fn: 0 } },
  )

  const totalSamples = results.length
  const { tp, fp, tn, fn } = totalMetrics.confusionMatrix

  const precision = tp + fp > 0 ? tp / (tp + fp) : 0
  const recall = tp + fn > 0 ? tp / (tp + fn) : 0
  const accuracy = totalSamples > 0 ? (tp + tn) / totalSamples : 0
  const f1Score = precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0

  return {
    threshold: 0.3, // Default threshold
    confusionMatrix: totalMetrics.confusionMatrix,
    precision,
    recall,
    accuracy,
    f1Score,
  }
}

export default async function PreferenceCalculationsPage({ searchParams }: PreferenceCalculationsPageProps) {
  // Parse user preferences from URL
  const params = await searchParams
  const userGenres = params.userGenres ? params.userGenres.split(",").filter(Boolean) : []
  const userTags = params.userTags ? params.userTags.split(",").filter(Boolean) : []

  // If no preferences are provided, redirect to home
  if (userGenres.length === 0 && userTags.length === 0) {
    redirect("/")
  }

  // Fetch all manhwa data
  const allManhwa = await getAllManhwa()

  // Get recommendations based on user preferences (get more initially to find the best matches after TF-IDF calculation)
  const recommendations = getRecommendationsByPreferences(userGenres, userTags, 20)

  // Calculate detailed similarity for each recommendation with comprehensive error handling
  const calculationResults = await Promise.all(
    recommendations.map(async (manhwa) => {
      try {
        const calculation = await calculateTFIDF(manhwa, userGenres, userTags)

        // Ensure all required properties exist with safe fallbacks
        const safeCalculation = {
          userTfidf: {
            genres: safeArray(calculation?.userTfidf?.genres),
            tags: safeArray(calculation?.userTfidf?.tags),
          },
          targetTfidf: {
            genres: safeArray(calculation?.targetTfidf?.genres),
            tags: safeArray(calculation?.targetTfidf?.tags),
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
            userTfidf: {
              genres: [],
              tags: [],
            },
            targetTfidf: {
              genres: [],
              tags: [],
            },
            vectors: { source: [], target: [] },
            vectorTable: [],
            cosine: { similarity: 0, dotProduct: 0, magnitudeA: 0, magnitudeB: 0 },
            dotProductSteps: [],
            magnitudeASteps: { steps: [], sumOfSquares: 0 },
            magnitudeBSteps: { steps: [], sumOfSquares: 0 },
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
  )
    .then((results) => results.filter((result) => result && result.calculation && typeof result.calculation.cosine.similarity === "number"))
    .then((results) => results.sort((a, b) => (b.calculation.cosine.similarity || 0) - (a.calculation.cosine.similarity || 0)))
    // Limit to top 5 recommendations after sorting by cosine similarity
    .then((results) => results.slice(0, 5))

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

  return (
    <main className="container mx-auto px-4 py-8">
      <Link href="/">
        <Button variant="ghost" className="mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Home
        </Button>
      </Link>

      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-4">Preference-Based Recommendation Calculations</h1>
        <div className="flex items-center gap-4 mb-4">
          <div>
            <h2 className="text-xl font-semibold">Your Preferences</h2>
            <p className="text-muted-foreground">
              Detailed calculations for top 5 recommendations based on your preferences
            </p>
          </div>
        </div>

        {/* Show active preferences */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">Your Preferences</span>
            </div>
            <div className="space-y-4">
              {userGenres.length > 0 && (
                <div className="space-y-2">
                  <div>
                    <span className="text-sm text-muted-foreground mr-2">Selected Genres (Before Pre-processing):</span>
                    <div className="inline-flex flex-wrap gap-1">
                      {userGenres.map((genre) => (
                        <Badge key={genre} variant="secondary" className="text-xs">
                          {genre}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground mr-2">Selected Genres (After Pre-processing):</span>
                    <div className="inline-flex flex-wrap gap-1">
                      {userGenres.map((genre) => (
                        <Badge key={genre} variant="outline" className="text-xs bg-blue-100 text-blue-700 border-blue-200">
                          {genre.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, '_')}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              {userTags.length > 0 && (
                <div className="space-y-2">
                  <div>
                    <span className="text-sm text-muted-foreground mr-2">Selected Tags (Before Pre-processing):</span>
                    <div className="inline-flex flex-wrap gap-1">
                      {userTags.map((tag) => (
                        <Badge key={tag} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground mr-2">Selected Tags (After Pre-processing):</span>
                    <div className="inline-flex flex-wrap gap-1">
                      {userTags.map((tag) => (
                        <Badge key={tag} variant="outline" className="text-xs bg-blue-100 text-blue-700 border-blue-200">
                          {tag.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, '_')}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {recommendations.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <h3 className="text-lg font-semibold mb-2">No Recommendations Found</h3>
            <p className="text-muted-foreground mb-4">
              No recommendations match your selected preferences. Try selecting different genres or tags.
            </p>
            <Link href="/">
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
                  <div className="text-sm text-muted-foreground">Total Recommendations</div>
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
                    <Link 
                      href={`/manhwa/${result.manhwa.id}/calculation?userGenres=${userGenres.join(',')}&userTags=${userTags.join(',')}`}
                      className="ml-auto"
                    >
                      <Button variant="outline" size="sm" className="flex items-center gap-1">
                        <Calculator className="h-3 w-3" />
                        <span>View Detailed Calculation</span>
                        <ExternalLink className="h-3 w-3 ml-1" />
                      </Button>
                    </Link>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-3 gap-6">
                    {/* TF-IDF Scores */}
                    <div>
                      <h4 className="font-semibold mb-3">TF-IDF Scores</h4>
                      <div className="space-y-2 overflow-y-auto">
                        <div className="text-sm font-medium text-muted-foreground mb-2">User Genres:</div>
                        {safeArray(result.calculation.userTfidf?.genres)
                          .map((item: any) => (
                            <div key={item.term} className="flex justify-between text-sm p-2 bg-green-50 rounded">
                              <span>{item.term}</span>
                              <span className="font-mono">{(item.tfidf || 0).toFixed(4)}</span>
                            </div>
                          ))}
                        <div className="text-sm font-medium text-muted-foreground mb-2 mt-3">User Tags:</div>
                        {safeArray(result.calculation.userTfidf?.tags)
                          .map((item: any) => (
                            <div key={item.term} className="flex justify-between text-sm p-2 bg-blue-50 rounded">
                              <span>{item.term}</span>
                              <span className="font-mono">{(item.tfidf || 0).toFixed(4)}</span>
                            </div>
                          ))}
                        <div className="text-sm font-medium text-muted-foreground mb-2 mt-3">Manhwa Genres:</div>
                        {safeArray(result.calculation.targetTfidf?.genres)
                          .map((item: any) => (
                            <div key={item.term} className="flex justify-between text-sm p-2 bg-yellow-50 rounded">
                              <span>{item.term}</span>
                              <span className="font-mono">{(item.tfidf || 0).toFixed(4)}</span>
                            </div>
                          ))}
                        <div className="text-sm font-medium text-muted-foreground mb-2 mt-3">Manhwa Tags:</div>
                        {safeArray(result.calculation.targetTfidf?.tags)
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
                          <div className="text-xl font-semibold">{(result.calculation.cosine?.dotProduct || 0).toFixed(4)}</div>
                        </div>
                        <div className="p-3 bg-muted rounded">
                          <div className="text-sm text-muted-foreground">Magnitude A (User)</div>
                          <div className="text-xl font-semibold">{(result.calculation.cosine?.magnitudeA || 0).toFixed(4)}</div>
                        </div>
                        <div className="p-3 bg-muted rounded">
                          <div className="text-sm text-muted-foreground">Magnitude B (Manhwa)</div>
                          <div className="text-xl font-semibold">{(result.calculation.cosine?.magnitudeB || 0).toFixed(4)}</div>
                        </div>
                        <div className="p-3 bg-green-100 rounded">
                          <div className="text-sm font-medium">Cosine Similarity</div>
                          <div className="text-xl font-bold text-green-700">
                            {(result.calculation.cosine?.similarity || 0).toFixed(4)}
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            Formula: Dot Product / (Magnitude A × Magnitude B)
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Vector Analysis */}
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
                          <div className="text-sm text-muted-foreground">Source Features (User)</div>
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
                          <div className="text-sm text-muted-foreground">Target Features (Manhwa)</div>
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

                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          {/* Evaluation Metrics Tab */}
          <TabsContent value="metrics" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Evaluation Metrics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-semibold mb-3">Confusion Matrix</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 bg-green-100 rounded text-center">
                          <div className="text-sm text-muted-foreground">True Positives</div>
                          <div className="text-2xl font-bold">{overallMetrics.confusionMatrix.tp}</div>
                        </div>
                        <div className="p-4 bg-red-100 rounded text-center">
                          <div className="text-sm text-muted-foreground">False Positives</div>
                          <div className="text-2xl font-bold">{overallMetrics.confusionMatrix.fp}</div>
                        </div>
                        <div className="p-4 bg-blue-100 rounded text-center">
                          <div className="text-sm text-muted-foreground">True Negatives</div>
                          <div className="text-2xl font-bold">{overallMetrics.confusionMatrix.tn}</div>
                        </div>
                        <div className="p-4 bg-yellow-100 rounded text-center">
                          <div className="text-sm text-muted-foreground">False Negatives</div>
                          <div className="text-2xl font-bold">{overallMetrics.confusionMatrix.fn}</div>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-semibold mb-3">Performance Metrics</h4>
                      <div className="space-y-3">
                        <div className="p-3 bg-muted rounded flex justify-between items-center">
                          <div>
                            <div className="text-sm text-muted-foreground">Precision</div>
                            <div className="text-xs text-muted-foreground">TP / (TP + FP)</div>
                          </div>
                          <div className="text-xl font-semibold">{(overallMetrics.precision * 100).toFixed(1)}%</div>
                        </div>
                        <div className="p-3 bg-muted rounded flex justify-between items-center">
                          <div>
                            <div className="text-sm text-muted-foreground">Recall</div>
                            <div className="text-xs text-muted-foreground">TP / (TP + FN)</div>
                          </div>
                          <div className="text-xl font-semibold">{(overallMetrics.recall * 100).toFixed(1)}%</div>
                        </div>
                        <div className="p-3 bg-muted rounded flex justify-between items-center">
                          <div>
                            <div className="text-sm text-muted-foreground">Accuracy</div>
                            <div className="text-xs text-muted-foreground">(TP + TN) / Total</div>
                          </div>
                          <div className="text-xl font-semibold">{(overallMetrics.accuracy * 100).toFixed(1)}%</div>
                        </div>
                        <div className="p-3 bg-green-100 rounded flex justify-between items-center">
                          <div>
                            <div className="text-sm font-medium">F1 Score</div>
                            <div className="text-xs text-muted-foreground">2 × (Precision × Recall) / (Precision + Recall)</div>
                          </div>
                          <div className="text-xl font-bold text-green-700">{(overallMetrics.f1Score * 100).toFixed(1)}%</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-3">Threshold</h4>
                    <div className="p-4 bg-muted rounded">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm text-muted-foreground">Similarity Threshold</span>
                        <span className="font-semibold">{overallMetrics.threshold}</span>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Manhwa with similarity scores above this threshold are considered relevant recommendations.
                      </div>
                    </div>
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