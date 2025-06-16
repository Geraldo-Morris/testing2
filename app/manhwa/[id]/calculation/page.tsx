import { getManhwaById, getAllManhwa } from "@/lib/manhwa-service"
import { calculateDetailedSimilarity, calculateTFIDF } from "@/lib/similarity-calculator"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { notFound, redirect } from "next/navigation"

interface CalculationPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    targetManhwaId?: string;
    userGenres?: string;
    userTags?: string;
    source?: string; // Added to accept 'source' query parameter
  }>;
}

// Helper function to safely get array with fallback
function safeArray<T>(arr: T[] | undefined | null): T[] {
  return Array.isArray(arr) ? arr : []
}

// Helper function to safely get object with fallback
function safeObject<T>(obj: T | undefined | null, fallback: T): T {
  return obj && typeof obj === "object" ? obj : fallback
}

async function CalculationPage(props: CalculationPageProps) {
  // Await params and searchParams from the props object as they are Promises
  const params = await props.params;
  const searchParams = await props.searchParams;

  // Now that params and searchParams are resolved, access their properties
  const pageId = params.id;
  const queryTargetManhwaId = searchParams.targetManhwaId || searchParams.source; // Accept 'source' as an alias for 'targetManhwaId'
  const queryUserGenres = searchParams.userGenres;
  const queryUserTags = searchParams.userTags;

  // Perform other async operations
  const allManhwaData = await getAllManhwa();

  // Use the resolved values
  const manhwaId = parseInt(pageId, 10);
  const manhwa = allManhwaData.find(m => m.id === pageId);

  if (!manhwa) {
    // If the primary manhwa for the page isn't found after loading all data, show not found.
    // This replaces the earlier direct div return for consistency with notFound().
    notFound();
  }

  // Correct and consolidated declarations
  const targetManhwaId = queryTargetManhwaId
    ? parseInt(queryTargetManhwaId, 10)
    : null;
  const userGenres = queryUserGenres
    ? queryUserGenres.split(',')
    : [];
  const userTags = queryUserTags
    ? queryUserTags.split(',')
    : [];
  
  let calculationData: any = null; // Single declaration
  let sourceManhwa = null; // To be used for targetManhwa data

  try {
    if (targetManhwaId && manhwaId !== targetManhwaId) {
      // Content-based filtering calculation (manhwa to manhwa)
      sourceManhwa = allManhwaData.find(m => m.id === String(targetManhwaId));
      if (!sourceManhwa) {
        calculationData = {
          error: `Source manhwa with ID ${targetManhwaId} for comparison not found. Please check the ID or link.`,
          finalScore: 0,
          tfidf: { genres: [], tags: [] },
          vectors: { source: [], target: [] },
          vectorTable: [],
          cosine: { similarity: 0, dotProduct: 0, magnitudeA: 0, magnitudeB: 0 },
          dotProductSteps: [],
          magnitudeASteps: { steps: [], sumOfSquares: 0 },
          magnitudeBSteps: { steps: [], sumOfSquares: 0 },
          evaluationMetrics: {
            threshold: 0.3,
            confusionMatrix: { tp: 0, fp: 0, tn: 0, fn: 0 },
            precision: 0,
            recall: 0,
            accuracy: 0,
            f1Score: 0,
          },
        };
      } else { // sourceManhwa is found, and manhwa (page's primary) is guaranteed by earlier check
        const rawCalculation = calculateDetailedSimilarity(sourceManhwa, manhwa, allManhwaData);
        // Ensure all required properties exist with safe fallbacks
        calculationData = {
          sourceTfidf: {
            genres: safeArray(rawCalculation?.sourceTfidf?.genres),
            tags: safeArray(rawCalculation?.sourceTfidf?.tags),
          },
          targetTfidf: {
            genres: safeArray(rawCalculation?.targetTfidf?.genres),
            tags: safeArray(rawCalculation?.targetTfidf?.tags),
          },
          vectors: {
            source: safeArray(rawCalculation?.vectors?.source),
            target: safeArray(rawCalculation?.vectors?.target),
          },
          vectorTable: safeArray(rawCalculation?.vectorTable),
          cosine: safeObject(rawCalculation?.cosine, {
            similarity: 0,
            dotProduct: 0,
            magnitudeA: 0,
            magnitudeB: 0,
          }),
          dotProductSteps: safeArray(rawCalculation?.dotProductSteps),
          magnitudeASteps: safeObject(rawCalculation?.magnitudeASteps, {
            steps: [],
            sumOfSquares: 0,
          }),
          magnitudeBSteps: safeObject(rawCalculation?.magnitudeBSteps, {
            steps: [],
            sumOfSquares: 0,
          }),
          finalScore: typeof rawCalculation?.finalScore === "number" ? rawCalculation.finalScore : 0,
          evaluationMetrics: safeObject(rawCalculation?.evaluationMetrics, {
            threshold: 0.3,
            confusionMatrix: { tp: 0, fp: 0, tn: 0, fn: 0 },
            precision: 0,
            recall: 0,
            accuracy: 0,
            f1Score: 0,
          }),
        };
      }
    } else if (userGenres.length > 0 || userTags.length > 0) {
      // Preference-based calculation (user preferences to manhwa)
      const rawCalculation = await calculateTFIDF(manhwa, userGenres, userTags)

      // Ensure all required properties exist with safe fallbacks
      calculationData = {
        userTfidf: {
          genres: safeArray(rawCalculation?.userTfidf?.genres),
          tags: safeArray(rawCalculation?.userTfidf?.tags),
        },
        targetTfidf: {
          genres: safeArray(rawCalculation?.targetTfidf?.genres),
          tags: safeArray(rawCalculation?.targetTfidf?.tags),
        },
        vectors: {
          source: safeArray(rawCalculation?.vectors?.source),
          target: safeArray(rawCalculation?.vectors?.target),
        },
        vectorTable: safeArray(rawCalculation?.vectorTable),
        cosine: safeObject(rawCalculation?.cosine, {
          similarity: 0,
          dotProduct: 0,
          magnitudeA: 0,
          magnitudeB: 0,
        }),
        dotProductSteps: safeArray(rawCalculation?.dotProductSteps),
        magnitudeASteps: safeObject(rawCalculation?.magnitudeASteps, {
          steps: [],
          sumOfSquares: 0,
        }),
        magnitudeBSteps: safeObject(rawCalculation?.magnitudeBSteps, {
          steps: [],
          sumOfSquares: 0,
        }),
        finalScore: typeof rawCalculation?.finalScore === "number" ? rawCalculation.finalScore : 0,
        evaluationMetrics: safeObject(rawCalculation?.evaluationMetrics, {
          threshold: 0.3,
          confusionMatrix: { tp: 0, fp: 0, tn: 0, fn: 0 },
          precision: 0,
          recall: 0,
          accuracy: 0,
          f1Score: 0,
        }),
      }
    }
  } catch (error: any) {
    console.error("Error calculating similarity:", error);
    calculationData = {
      error: `An unexpected error occurred during calculation: ${error.message || String(error)}`,
      finalScore: 0,
      tfidf: { genres: [], tags: [] },
      vectors: { source: [], target: [] },
      vectorTable: [],
      cosine: { similarity: 0, dotProduct: 0, magnitudeA: 0, magnitudeB: 0 },
      dotProductSteps: [],
      magnitudeASteps: { steps: [], sumOfSquares: 0 },
      magnitudeBSteps: { steps: [], sumOfSquares: 0 },
      evaluationMetrics: {
        threshold: 0.3,
        confusionMatrix: { tp: 0, fp: 0, tn: 0, fn: 0 },
        precision: 0,
        recall: 0,
        accuracy: 0,
        f1Score: 0,
      },
    };

  }

  // If calculation failed or data is missing, redirect to the manhwa page
  if (!calculationData) {
    redirect(`/manhwa/${params.id}`)
  }

  return (
    <main className="container mx-auto px-4 py-8">
      <Link href={sourceManhwa ? `/manhwa/${targetManhwaId}` : "/"}>
        <Button variant="ghost" className="mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to {sourceManhwa ? sourceManhwa.title : "Search"}
        </Button>
      </Link>

      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-4">Similarity Calculation Details</h1>
        {(calculationData as any)?.error && (
          <div className="mb-4 p-4 bg-red-100 text-red-700 border border-red-400 rounded">
            <p className="font-bold">Error:</p>
            <p>{(calculationData as any).error}</p>
          </div>
        )}
        <div className="flex items-center gap-4 mb-4">
          <div className="flex items-center gap-2">
            <img
              src={sourceManhwa?.coverImage || "/placeholder.svg"}
              alt={sourceManhwa?.title || "User Preferences"}
              className="w-12 h-16 object-cover rounded"
            />
            <span className="font-medium">{sourceManhwa?.title || "Your Preferences"}</span>
          </div>
          <span className="text-2xl">→</span>
          <div className="flex items-center gap-2">
            <img
              src={manhwa.coverImage || "/placeholder.svg"}
              alt={manhwa.title}
              className="w-12 h-16 object-cover rounded"
            />
            <span className="font-medium">{manhwa.title}</span>
          </div>
        </div>
        <div className="text-lg font-semibold text-primary">
          Cosine Similarity Score: {(calculationData.cosine.similarity || 0).toFixed(6)}
        </div>
      </div>

      <div className="space-y-6">
        {/* Pre-processing */}
        <Card>
          <CardHeader>
            <CardTitle>Step 1: Pre-processing</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-muted-foreground">
                Pre-processing involves extracting and preparing the features (genres and tags) from each manhwa for
                analysis.
              </p>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="p-4 bg-muted rounded">
                  <h4 className="font-semibold mb-3">{sourceManhwa?.title || "User Preferences"} Features</h4>
                  <div className="space-y-3">
                    <div>
                      <h5 className="font-medium text-sm mb-2">Genres:</h5>
                      <div className="flex flex-wrap gap-1">
                        {(sourceManhwa?.genres || safeArray(calculationData.tfidf.genres).map((g: any) => g.term)).map(
                          (genre: string) => (
                            <span key={genre} className="px-2 py-1 bg-primary/10 text-primary rounded text-xs">
                              {genre}
                            </span>
                          ),
                        )}
                      </div>
                    </div>
                    <div>
                      <h5 className="font-medium text-sm mb-2">Tags:</h5>
                      <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
                        {(
                          sourceManhwa?.tags ||
                          safeArray(calculationData.tfidf.tags || calculationData.tfidf.themes).map((t: any) => t.term)
                        ).map((tag: string) => (
                          <span key={tag} className="px-2 py-1 bg-primary/10 text-primary rounded text-xs">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-muted rounded">
                  <h4 className="font-semibold mb-3">{manhwa.title} Features</h4>
                  <div className="space-y-3">
                    <div>
                      <h5 className="font-medium text-sm mb-2">Genres:</h5>
                      <div className="flex flex-wrap gap-1">
                        {safeArray(manhwa.genres).map((genre) => (
                          <span key={genre} className="px-2 py-1 bg-primary/10 text-primary rounded text-xs">
                            {genre}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div>
                      <h5 className="font-medium text-sm mb-2">Tags:</h5>
                      <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
                        {safeArray(manhwa.tags).map((tag) => (
                          <span key={tag} className="px-2 py-1 bg-primary/10 text-primary rounded text-xs">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 p-4 rounded">
                <h4 className="font-semibold mb-2">Feature Extraction Summary</h4>
                <div className="text-sm space-y-1">
                  <div>
                    Features from {sourceManhwa?.title || "user preferences"}:{" "}
                    {(safeArray(calculationData.vectors.source) as number[]).filter((v: number) => v > 0).length}
                  </div>
                  <div>
                    Features from {manhwa.title}:{" "}
                    {(safeArray(calculationData.vectors.target) as number[]).filter((v: number) => v > 0).length}
                  </div>
                  <div>
                    Common features:{" "}
                    {
                      (safeArray(calculationData.vectors.source) as number[]).filter(
                        (v: number, i: number) => v > 0 && ((safeArray(calculationData.vectors.target) as number[])[i] || 0) > 0,
                      ).length
                    }
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* TF-IDF Calculation */}
        <Card>
          <CardHeader>
            <CardTitle>Step 2: TF-IDF (Term Frequency-Inverse Document Frequency) Calculation</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <p className="text-muted-foreground">
                TF-IDF measures the importance of terms (genres/tags) in a document (manhwa) relative to a collection of
                documents.
              </p>

              {/* TF Calculation */}
              <div>
                <h4 className="font-semibold mb-3">2.1 Term Frequency (TF) Calculation</h4>
                <p className="text-sm text-muted-foreground mb-3">
                  TF = (Number of times term appears in document) / (Total number of terms in document)
                </p>
                <div className="grid md:grid-cols-2 gap-6">
                  {/* Source/User TF Scores */}
                  <div>
                    <h5 className="font-medium mb-2 text-center">{(sourceManhwa?.title || "User") + " TF Scores"}</h5>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <div>
                            <h6 className="font-medium mb-2 text-sm">Genre TF</h6>
                            <div className="space-y-2 overflow-y-auto">
                            {(calculationData.sourceTfidf?.genres || calculationData.userTfidf?.genres)?.map((item: any) => (
                                <div key={item.term} className="flex justify-between items-center p-2 bg-green-50 rounded">
                                <span className="font-medium text-xs">{item.term}</span>
                                <div className="text-right">
                                    <div className="text-xs text-muted-foreground">
                                    {/* Show calculation: count / total terms */}
                                    {Math.round(item.tf * ((sourceManhwa?.genres.length || userGenres.length || 1) + (sourceManhwa?.tags.length || userTags.length || 0)))} / {(sourceManhwa?.genres.length || userGenres.length || 1) + (sourceManhwa?.tags.length || userTags.length || 0)}
                                    </div>
                                    <div className="font-mono font-semibold text-xs">{(item.tf || 0).toFixed(4)}</div>
                                </div>
                                </div>
                            ))}
                            {(calculationData.sourceTfidf?.genres || calculationData.userTfidf?.genres)?.length === 0 && (
                                <div className="p-2 text-muted-foreground text-xs">No genre data</div>
                            )}
                            </div>
                        </div>
                        <div>
                            <h6 className="font-medium mb-2 text-sm">Tag TF</h6>
                            <div className="space-y-2 overflow-y-auto">
                            {(calculationData.sourceTfidf?.tags || calculationData.userTfidf?.tags)?.map((item: any) => (
                                <div key={item.term} className="flex justify-between items-center p-2 bg-green-50 rounded">
                                <span className="font-medium text-xs">{item.term}</span>
                                <div className="text-right">
                                    <div className="text-xs text-muted-foreground">
                                    {/* Show calculation: count / total terms */}
                                    {Math.round(item.tf * ((sourceManhwa?.genres.length || userGenres.length || 0) + (sourceManhwa?.tags.length || userTags.length || 1)))} / {(sourceManhwa?.genres.length || userGenres.length || 0) + (sourceManhwa?.tags.length || userTags.length || 1)}
                                    </div>
                                    <div className="font-mono font-semibold text-xs">{(item.tf || 0).toFixed(4)}</div>
                                </div>
                                </div>
                            ))}
                            {(calculationData.sourceTfidf?.tags || calculationData.userTfidf?.tags)?.length === 0 && (
                                <div className="p-2 text-muted-foreground text-xs">No tag data</div>
                            )}
                            </div>
                        </div>
                    </div>
                  </div>

                  {/* Target TF Scores */}
                  <div>
                    <h5 className="font-medium mb-2 text-center">{manhwa.title + " TF Scores"}</h5>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <div>
                            <h6 className="font-medium mb-2 text-sm">Genre TF</h6>
                            <div className="space-y-2 overflow-y-auto">
                            {safeArray(calculationData.targetTfidf?.genres).map((item: any) => (
                                <div key={item.term} className="flex justify-between items-center p-2 bg-teal-50 rounded">
                                <span className="font-medium text-xs">{item.term}</span>
                                <div className="text-right">
                                    <div className="text-xs text-muted-foreground">
                                    {/* Show calculation: count / total terms */}
                                    {Math.round(item.tf * (manhwa.genres.length + manhwa.tags.length))} / {manhwa.genres.length + manhwa.tags.length}
                                    </div>
                                    <div className="font-mono font-semibold text-xs">{(item.tf || 0).toFixed(4)}</div>
                                </div>
                                </div>
                            ))}
                            {safeArray(calculationData.targetTfidf?.genres).length === 0 && (
                                <div className="p-2 text-muted-foreground text-xs">No genre data</div>
                            )}
                            </div>
                        </div>
                        <div>
                            <h6 className="font-medium mb-2 text-sm">Tag TF</h6>
                            <div className="space-y-2 overflow-y-auto">
                            {safeArray(calculationData.targetTfidf?.tags).map((item: any) => (
                                <div key={item.term} className="flex justify-between items-center p-2 bg-teal-50 rounded">
                                <span className="font-medium text-xs">{item.term}</span>
                                <div className="text-right">
                                    <div className="text-xs text-muted-foreground">
                                    {/* Show calculation: count / total terms */}
                                    {Math.round(item.tf * (manhwa.genres.length + manhwa.tags.length))} / {manhwa.genres.length + manhwa.tags.length}
                                    </div>
                                    <div className="font-mono font-semibold text-xs">{(item.tf || 0).toFixed(4)}</div>
                                </div>
                                </div>
                            ))}
                            {safeArray(calculationData.targetTfidf?.tags).length === 0 && (
                                <div className="p-2 text-muted-foreground text-xs">No tag data</div>
                            )}
                            </div>
                        </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* IDF Calculation */}
              <div>
                <h4 className="font-semibold mb-3">2.2 Inverse Document Frequency (IDF) Calculation</h4>
                <p className="text-sm text-muted-foreground mb-3">
                  IDF = log(Total number of documents / Number of documents containing the term)
                </p>
                <div className="grid md:grid-cols-2 gap-6">
                    {/* Source/User IDF Scores */}
                    <div>
                        <h5 className="font-medium mb-2 text-center">{(sourceManhwa?.title || "User") + " IDF Scores"}</h5>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            <div>
                                <h6 className="font-medium mb-2 text-sm">Genre IDF</h6>
                                <div className="space-y-2 overflow-y-auto">
                                {(calculationData.sourceTfidf?.genres || calculationData.userTfidf?.genres)?.map((item: any) => (
                                    <div key={item.term} className="flex justify-between items-center p-2 bg-blue-50 rounded">
                                    <span className="font-medium text-xs">{item.term}</span>
                                    <div className="text-right">
                                        <div className="text-xs text-muted-foreground">
                                        {/* Show calculation: log(total docs / docs with term) */}
                                        log({allManhwaData.length} / {Math.max(1, Math.round(allManhwaData.length / Math.exp(item.idf)))})
                                        </div>
                                        <div className="font-mono font-semibold text-xs">{(item.idf || 0).toFixed(4)}</div>
                                    </div>
                                    </div>
                                ))}
                                {!(calculationData.sourceTfidf?.genres || calculationData.userTfidf?.genres)?.length && (
                                    <div className="p-2 text-muted-foreground text-xs">No genre IDF data</div>
                                )}
                                </div>
                            </div>
                            <div>
                                <h6 className="font-medium mb-2 text-sm">Tag IDF</h6>
                                <div className="space-y-2 overflow-y-auto">
                                {(calculationData.sourceTfidf?.tags || calculationData.userTfidf?.tags)?.map((item: any) => (
                                    <div key={item.term} className="flex justify-between items-center p-2 bg-blue-50 rounded">
                                    <span className="font-medium text-xs">{item.term}</span>
                                    <div className="text-right">
                                        <div className="text-xs text-muted-foreground">
                                        {/* Show calculation: log(total docs / docs with term) */}
                                        log({allManhwaData.length} / {Math.max(1, Math.round(allManhwaData.length / Math.exp(item.idf)))})
                                        </div>
                                        <div className="font-mono font-semibold text-xs">{(item.idf || 0).toFixed(4)}</div>
                                    </div>
                                    </div>
                                ))}
                                {!(calculationData.sourceTfidf?.tags || calculationData.userTfidf?.tags)?.length && (
                                    <div className="p-2 text-muted-foreground text-xs">No tag IDF data</div>
                                )}
                                </div>
                            </div>
                        </div>
                    </div>
                    {/* Target IDF Scores */}
                    <div>
                        <h5 className="font-medium mb-2 text-center">{manhwa.title + " IDF Scores"}</h5>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            <div>
                                <h6 className="font-medium mb-2 text-sm">Genre IDF</h6>
                                <div className="space-y-2 overflow-y-auto">
                                {safeArray(calculationData.targetTfidf?.genres).map((item: any) => (
                                    <div key={item.term} className="flex justify-between items-center p-2 bg-blue-50 rounded">
                                    <span className="font-medium text-xs">{item.term}</span>
                                    <div className="text-right">
                                        <div className="text-xs text-muted-foreground">
                                        {/* Show calculation: log(total docs / docs with term) */}
                                        log({allManhwaData.length} / {Math.max(1, Math.round(allManhwaData.length / Math.exp(item.idf)))})
                                        </div>
                                        <div className="font-mono font-semibold text-xs">{(item.idf || 0).toFixed(4)}</div>
                                    </div>
                                    </div>
                                ))}
                                {!safeArray(calculationData.targetTfidf?.genres).length && (
                                    <div className="p-2 text-muted-foreground text-xs">No genre IDF data</div>
                                )}
                                </div>
                            </div>
                            <div>
                                <h6 className="font-medium mb-2 text-sm">Tag IDF</h6>
                                <div className="space-y-2 overflow-y-auto">
                                {safeArray(calculationData.targetTfidf?.tags).map((item: any) => (
                                    <div key={item.term} className="flex justify-between items-center p-2 bg-blue-50 rounded">
                                    <span className="font-medium text-xs">{item.term}</span>
                                    <div className="text-right">
                                        <div className="text-xs text-muted-foreground">
                                        {/* Show calculation: log(total docs / docs with term) */}
                                        log({allManhwaData.length} / {Math.max(1, Math.round(allManhwaData.length / Math.exp(item.idf)))})
                                        </div>
                                        <div className="font-mono font-semibold text-xs">{(item.idf || 0).toFixed(4)}</div>
                                    </div>
                                    </div>
                                ))}
                                {!safeArray(calculationData.targetTfidf?.tags).length && (
                                    <div className="p-2 text-muted-foreground text-xs">No tag IDF data</div>
                                )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
              </div>

              {/* TF-IDF Final Scores */}
              <div>
                <h4 className="font-semibold mb-3">2.3 Final TF-IDF Scores</h4>
                <p className="text-sm text-muted-foreground mb-3">
                  TF-IDF = TF × IDF (Higher scores indicate more important/distinctive terms)
                </p>
                <div className="grid md:grid-cols-2 gap-6">
                  {/* Source/User TF-IDF Scores */}
                  <div>
                    <h5 className="font-medium mb-2 text-center">{(sourceManhwa?.title || "User") + " TF-IDF Scores"}</h5>
                     <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <div>
                            <h6 className="font-medium mb-2 text-sm">Genre TF-IDF</h6>
                            <div className="space-y-2 overflow-y-auto">
                            {(calculationData.sourceTfidf?.genres || calculationData.userTfidf?.genres)?.map((item: any) => (
                                <div key={item.term} className="flex justify-between items-center p-2 bg-purple-50 rounded">
                                <span className="font-medium text-xs">{item.term}</span>
                                <div className="text-right">
                                    <div className="text-xs text-muted-foreground">
                                    {(item.tf || 0).toFixed(3)} × {(item.idf || 0).toFixed(3)}
                                    </div>
                                    <div className="font-mono font-semibold text-xs">{(item.tfidf || 0).toFixed(4)}</div>
                                </div>
                                </div>
                            ))}
                            {(calculationData.sourceTfidf?.genres || calculationData.userTfidf?.genres)?.length === 0 && (
                                <div className="p-2 text-muted-foreground text-xs">No genre data</div>
                            )}
                            </div>
                        </div>
                        <div>
                            <h6 className="font-medium mb-2 text-sm">Tag TF-IDF</h6>
                            <div className="space-y-2 overflow-y-auto">
                            {(calculationData.sourceTfidf?.tags || calculationData.userTfidf?.tags)?.map((item: any) => (
                                <div key={item.term} className="flex justify-between items-center p-2 bg-purple-50 rounded">
                                <span className="font-medium text-xs">{item.term}</span>
                                <div className="text-right">
                                    <div className="text-xs text-muted-foreground">
                                    {(item.tf || 0).toFixed(3)} × {(item.idf || 0).toFixed(3)}
                                    </div>
                                    <div className="font-mono font-semibold text-xs">{(item.tfidf || 0).toFixed(4)}</div>
                                </div>
                                </div>
                            ))}
                            {(calculationData.sourceTfidf?.tags || calculationData.userTfidf?.tags)?.length === 0 && (
                                <div className="p-2 text-muted-foreground text-xs">No tag data</div>
                            )}
                            </div>
                        </div>
                    </div>
                  </div>

                  {/* Target TF-IDF Scores */}
                  <div>
                    <h5 className="font-medium mb-2 text-center">{manhwa.title + " TF-IDF Scores"}</h5>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <div>
                            <h6 className="font-medium mb-2 text-sm">Genre TF-IDF</h6>
                            <div className="space-y-2 overflow-y-auto">
                            {safeArray(calculationData.targetTfidf?.genres).map((item: any) => (
                                <div key={item.term} className="flex justify-between items-center p-2 bg-indigo-50 rounded">
                                <span className="font-medium text-xs">{item.term}</span>
                                 <div className="text-right">
                                    <div className="text-xs text-muted-foreground">
                                    {(item.tf || 0).toFixed(3)} × {(item.idf || 0).toFixed(3)}
                                    </div>
                                    <div className="font-mono font-semibold text-xs">{(item.tfidf || 0).toFixed(4)}</div>
                                </div>
                                </div>
                            ))}
                            {safeArray(calculationData.targetTfidf?.genres).length === 0 && (
                                <div className="p-2 text-muted-foreground text-xs">No genre data</div>
                            )}
                            </div>
                        </div>
                        <div>
                            <h6 className="font-medium mb-2 text-sm">Tag TF-IDF</h6>
                            <div className="space-y-2 overflow-y-auto">
                            {safeArray(calculationData.targetTfidf?.tags).map((item: any) => (
                                <div key={item.term} className="flex justify-between items-center p-2 bg-indigo-50 rounded">
                                <span className="font-medium text-xs">{item.term}</span>
                                 <div className="text-right">
                                    <div className="text-xs text-muted-foreground">
                                    {(item.tf || 0).toFixed(3)} × {(item.idf || 0).toFixed(3)}
                                    </div>
                                    <div className="font-mono font-semibold text-xs">{(item.tfidf || 0).toFixed(4)}</div>
                                </div>
                                </div>
                            ))}
                            {safeArray(calculationData.targetTfidf?.tags).length === 0 && (
                                <div className="p-2 text-muted-foreground text-xs">No tag data</div>
                            )}
                            </div>
                        </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Vector Representation */}
              <div>
                <h4 className="font-semibold mb-3">2.4 Vector Representation</h4>
                <p className="text-sm text-muted-foreground mb-3">
                  Each manhwa/preference is represented as a vector where each dimension corresponds to a genre or tag's
                  TF-IDF score.
                </p>

                {safeArray(calculationData.vectorTable).length > 0 && (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[200px]">Feature</TableHead>
                          <TableHead className="text-center">{sourceManhwa?.title || "User Preferences"}</TableHead>
                          <TableHead className="text-center">{manhwa.title}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {safeArray(calculationData.vectorTable)
                          .filter((row: any) => row.hasValue)
                          // .slice(0, 15) // Removed slice to show all features
                          .map((row: any, index: number) => (
                            <TableRow key={index} className="bg-muted/50">
                              <TableCell className="font-medium">{row.term}</TableCell>
                              <TableCell className="text-center font-mono">
                                {(row.sourceValue || 0).toFixed(4)}
                              </TableCell>
                              <TableCell className="text-center font-mono">
                                {(row.targetValue || 0).toFixed(4)}
                              </TableCell>
                            </TableRow>
                          ))}
                        {/* Removed the conditional message about showing only 15 features
                        {safeArray(calculationData.vectorTable).filter((row: any) => row.hasValue).length > 15 && (
                          <TableRow>
                            <TableCell colSpan={3} className="text-center text-muted-foreground">
                              Showing 15 of{" "}
                              {safeArray(calculationData.vectorTable).filter((row: any) => row.hasValue).length}{" "}
                              features with non-zero values
                            </TableCell>
                          </TableRow>
                        )}
                        */}
                      </TableBody>
                    </Table>
                  </div>
                )}

                <div className="grid md:grid-cols-2 gap-4 mt-4">
                  <div className="p-4 bg-muted rounded">
                    <h5 className="font-semibold mb-2">{sourceManhwa?.title || "User Preferences"} Vector Summary</h5>
                    <div className="text-sm space-y-1">
                      <div>Vector dimensions: {(safeArray(calculationData.vectors.source) as number[]).length}</div>
                      <div>
                        Non-zero values: {(safeArray(calculationData.vectors.source) as number[]).filter((v: number) => v > 0).length}
                      </div>
                      <div>
                        Max TF-IDF score:{" "}
                        {(safeArray(calculationData.vectors.source) as number[]).length > 0
                          ? Math.max(...(safeArray(calculationData.vectors.source) as number[])).toFixed(4)
                          : "0.0000"}
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-muted rounded">
                    <h5 className="font-semibold mb-2">{manhwa.title} Vector Summary</h5>
                    <div className="text-sm space-y-1">
                      <div>Vector dimensions: {(safeArray(calculationData.vectors.target) as number[]).length}</div>
                      <div>
                        Non-zero values: {(safeArray(calculationData.vectors.target) as number[]).filter((v: number) => v > 0).length}
                      </div>
                      <div>
                        Max TF-IDF score:{" "}
                        {(safeArray(calculationData.vectors.target) as number[]).length > 0
                          ? Math.max(...(safeArray(calculationData.vectors.target) as number[])).toFixed(4)
                          : "0.0000"}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Cosine Similarity */}
        <Card>
          <CardHeader>
            <CardTitle>Step 3: Cosine Similarity Calculation</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <p className="text-muted-foreground">
                Cosine similarity measures the cosine of the angle between two vectors, ranging from 0 (no similarity)
                to 1 (identical). Formula: cos(θ) = (A · B) / (||A|| × ||B||)
              </p>

              {/* Dot Product Calculation */}
              {safeArray(calculationData.dotProductSteps).length > 0 && (
                <div>
                  <h4 className="font-semibold mb-3">3.1 Dot Product Calculation (A · B)</h4>
                  <p className="text-sm text-muted-foreground mb-3">
                    Dot Product = Σ(A[i] × B[i]) for all dimensions i
                  </p>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Feature</TableHead>
                          <TableHead className="text-center">A[i]</TableHead>
                          <TableHead className="text-center">B[i]</TableHead>
                          <TableHead className="text-center">A[i] × B[i]</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {safeArray(calculationData.dotProductSteps)
                          .filter((step: any) => (step.product || 0) > 0)
                          .slice(0, 10)
                          .map((step: any, index: number) => (
                            <TableRow key={index} className="bg-green-50">
                              <TableCell className="font-medium">{step.term}</TableCell>
                              <TableCell className="text-center font-mono">{(step.valueA || 0).toFixed(4)}</TableCell>
                              <TableCell className="text-center font-mono">{(step.valueB || 0).toFixed(4)}</TableCell>
                              <TableCell className="text-center font-mono font-semibold text-green-700">
                                {(step.product || 0).toFixed(6)}
                              </TableCell>
                            </TableRow>
                          ))}
                        {safeArray(calculationData.dotProductSteps).filter((step: any) => (step.product || 0) > 0)
                          .length > 10 && (
                          <TableRow>
                            <TableCell colSpan={4} className="text-center text-muted-foreground">
                              Showing 10 of{" "}
                              {
                                safeArray(calculationData.dotProductSteps).filter(
                                  (step: any) => (step.product || 0) > 0,
                                ).length
                              }{" "}
                              features with non-zero products
                            </TableCell>
                          </TableRow>
                        )}
                        <TableRow className="bg-primary/10 font-semibold">
                          <TableCell colSpan={3} className="text-right">
                            Total Dot Product (A · B):
                          </TableCell>
                          <TableCell className="text-center font-mono text-lg text-primary">
                            {(calculationData.cosine.dotProduct || 0).toFixed(6)}
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}

              {/* Magnitude Calculations */}
              {safeArray(calculationData.magnitudeASteps?.steps).length > 0 &&
                safeArray(calculationData.magnitudeBSteps?.steps).length > 0 && (
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-semibold mb-3">3.2 Magnitude A Calculation (||A||)</h4>
                      <p className="text-sm text-muted-foreground mb-3">||A|| = √(Σ(A[i]²))</p>
                      <div className="max-h-64 overflow-y-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Feature</TableHead>
                              <TableHead className="text-center">A[i]</TableHead>
                              <TableHead className="text-center">A[i]²</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {safeArray(calculationData.magnitudeASteps.steps)
                              .filter((step: any) => (step.square || 0) > 0)
                              .slice(0, 8)
                              .map((step: any, index: number) => (
                                <TableRow key={index} className="bg-blue-50">
                                  <TableCell className="font-medium">{step.term}</TableCell>
                                  <TableCell className="text-center font-mono">
                                    {(step.value || 0).toFixed(4)}
                                  </TableCell>
                                  <TableCell className="text-center font-mono">
                                    {(step.square || 0).toFixed(6)}
                                  </TableCell>
                                </TableRow>
                              ))}
                            {safeArray(calculationData.magnitudeASteps.steps).filter(
                              (step: any) => (step.square || 0) > 0,
                            ).length > 8 && (
                              <TableRow>
                                <TableCell colSpan={3} className="text-center text-muted-foreground">
                                  Showing 8 of{" "}
                                  {
                                    safeArray(calculationData.magnitudeASteps.steps).filter(
                                      (step: any) => (step.square || 0) > 0,
                                    ).length
                                  }{" "}
                                  features with non-zero squares
                                </TableCell>
                              </TableRow>
                            )}
                            <TableRow className="bg-blue-100 font-semibold">
                              <TableCell colSpan={2} className="text-right">
                                Sum of Squares (Σ(A[i]²)):
                              </TableCell>
                              <TableCell className="text-center font-mono">
                                {(calculationData.magnitudeASteps.sumOfSquares || 0).toFixed(6)}
                              </TableCell>
                            </TableRow>
                            <TableRow className="bg-blue-200 font-semibold">
                              <TableCell colSpan={2} className="text-right">
                                Magnitude ||A||:
                              </TableCell>
                              <TableCell className="text-center font-mono text-lg text-blue-700">
                                {(calculationData.cosine.magnitudeA || 0).toFixed(6)}
                              </TableCell>
                            </TableRow>
                          </TableBody>
                        </Table>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-semibold mb-3">3.3 Magnitude B Calculation (||B||)</h4>
                      <p className="text-sm text-muted-foreground mb-3">||B|| = √(Σ(B[i]²))</p>
                      <div className="max-h-64 overflow-y-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Feature</TableHead>
                              <TableHead className="text-center">B[i]</TableHead>
                              <TableHead className="text-center">B[i]²</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {safeArray(calculationData.magnitudeBSteps.steps)
                              .filter((step: any) => (step.square || 0) > 0)
                              .slice(0, 8)
                              .map((step: any, index: number) => (
                                <TableRow key={index} className="bg-orange-50">
                                  <TableCell className="font-medium">{step.term}</TableCell>
                                  <TableCell className="text-center font-mono">
                                    {(step.value || 0).toFixed(4)}
                                  </TableCell>
                                  <TableCell className="text-center font-mono">
                                    {(step.square || 0).toFixed(6)}
                                  </TableCell>
                                </TableRow>
                              ))}
                            {safeArray(calculationData.magnitudeBSteps.steps).filter(
                              (step: any) => (step.square || 0) > 0,
                            ).length > 8 && (
                              <TableRow>
                                <TableCell colSpan={3} className="text-center text-muted-foreground">
                                  Showing 8 of{" "}
                                  {
                                    safeArray(calculationData.magnitudeBSteps.steps).filter(
                                      (step: any) => (step.square || 0) > 0,
                                    ).length
                                  }{" "}
                                  features with non-zero squares
                                </TableCell>
                              </TableRow>
                            )}
                            <TableRow className="bg-orange-100 font-semibold">
                              <TableCell colSpan={2} className="text-right">
                                Sum of Squares (Σ(B[i]²)):
                              </TableCell>
                              <TableCell className="text-center font-mono">
                                {(calculationData.magnitudeBSteps.sumOfSquares || 0).toFixed(6)}
                              </TableCell>
                            </TableRow>
                            <TableRow className="bg-orange-200 font-semibold">
                              <TableCell colSpan={2} className="text-right">
                                Magnitude ||B||:
                              </TableCell>
                              <TableCell className="text-center font-mono text-lg text-orange-700">
                                {(calculationData.cosine.magnitudeB || 0).toFixed(6)}
                              </TableCell>
                            </TableRow>
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  </div>
                )}

              {/* Final Cosine Similarity */}
              <div className="bg-gradient-to-r from-primary/10 to-primary/5 p-6 rounded-lg">
                <h4 className="font-semibold mb-4 text-lg">3.4 Final Cosine Similarity Result</h4>
                <div className="space-y-3">
                  <div className="font-mono text-sm space-y-2">
                    <div className="text-muted-foreground">Formula: cos(θ) = (A · B) / (||A|| × ||B||)</div>
                    <div>
                      = {(calculationData.cosine.dotProduct || 0).toFixed(6)} / (
                      {(calculationData.cosine.magnitudeA || 0).toFixed(6)} ×{" "}
                      {(calculationData.cosine.magnitudeB || 0).toFixed(6)})
                    </div>
                    <div>
                      = {(calculationData.cosine.dotProduct || 0).toFixed(6)} /{" "}
                      {((calculationData.cosine.magnitudeA || 0) * (calculationData.cosine.magnitudeB || 0)).toFixed(6)}
                    </div>
                  </div>
                  <div className="text-center p-4 bg-primary/20 rounded-lg">
                    <div className="text-sm text-muted-foreground mb-1">Final Similarity Score</div>
                    <div className="text-3xl font-bold text-primary">
                      {(calculationData.cosine.similarity || 0).toFixed(6)}
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">
                      ({((calculationData.cosine.similarity || 0) * 100).toFixed(2)}% similarity)
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}

export default CalculationPage;
