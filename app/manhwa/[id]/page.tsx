"use client"

import { getManhwaById, getAllManhwaSync } from "@/lib/manhwa-service"
import { getRecommendations } from "@/lib/recommendation-engine"
import { getFilteredRecommendations, getFilteringStats } from "@/lib/filtered-recommendation-engine"
import { ManhwaCard } from "@/components/manhwa-card"
import { UnwantedFilter } from "@/components/unwanted-filter"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ArrowLeft, Calculator, AlertCircle, Filter } from "lucide-react"
import Link from "next/link"
import { notFound } from "next/navigation"
import React, { useState, use } from 'react'

interface ManhwaPageProps {
  params: Promise<{
    id: string
  }>
}

export default function ManhwaPage({ params }: ManhwaPageProps) {
  const { id: manhwaId } = use(params);
  const manhwa = getManhwaById(manhwaId);
  const [unwantedGenres, setUnwantedGenres] = useState<string[]>([])
  const [unwantedTags, setUnwantedTags] = useState<string[]>([])
  const [yearRange, setYearRange] = useState<{ min?: number; max?: number }>({})

  if (!manhwa) {
    notFound()
  }

  // Get recommendations based on filters
  const hasFilters =
    unwantedGenres.length > 0 || unwantedTags.length > 0 || yearRange.min !== undefined || yearRange.max !== undefined
  const recommendations = hasFilters
    ? getFilteredRecommendations(manhwa, unwantedGenres, unwantedTags, yearRange)
    : getRecommendations(manhwa)

  // Get filtering statistics
  const filterStats = hasFilters ? getFilteringStats(manhwa, unwantedGenres, unwantedTags, yearRange) : null

  const handleFilterChange = (
    newUnwantedGenres: string[],
    newUnwantedTags: string[],
    newYearRange: { min?: number; max?: number },
  ) => {
    setUnwantedGenres(newUnwantedGenres)
    setUnwantedTags(newUnwantedTags)
    setYearRange(newYearRange)
  }

  // Create URL parameters for all calculations page
  const getCalculationsUrl = () => {
    const params = new URLSearchParams()
    if (unwantedGenres.length > 0) params.set("unwantedGenres", unwantedGenres.join(","))
    if (unwantedTags.length > 0) params.set("unwantedTags", unwantedTags.join(","))
    if (yearRange.min !== undefined) params.set("yearMin", yearRange.min.toString())
    if (yearRange.max !== undefined) params.set("yearMax", yearRange.max.toString())
    return `/manhwa/${manhwa.id}/all-calculations?${params.toString()}`
  }

  // Update UI text from "Themes" to "Tags"
  return (
    <main className="container mx-auto px-4 py-8">
      <Link href="/">
        <Button className="mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Search
        </Button>
      </Link>

      <div className="flex flex-col md:flex-row gap-8 mb-12">
        <div className="w-full md:w-1/3 lg:w-1/4">
          <img
            src={manhwa.coverImage || "/placeholder.svg"}
            alt={manhwa.title}
            className="w-full h-auto rounded-lg object-cover aspect-[2/3] shadow-lg"
          />
        </div>

        <div className="flex-1">
          <h1 className="text-3xl font-bold mb-2">{manhwa.title}</h1>

          <div className="flex flex-wrap gap-2 mb-6">
            {manhwa.genres.map((genre) => (
              <span key={genre} className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm font-medium">
                {genre}
              </span>
            ))}
          </div>

          <div className="mb-6">
            <h3 className="font-semibold mb-2 text-lg">Tags</h3>
            <div className="flex flex-wrap gap-2">
              {manhwa.tags.map((tag) => (
                <span key={tag} className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm">
                  {tag}
                </span>
              ))}
            </div>
          </div>

          <p className="text-lg leading-relaxed mb-6">{manhwa.description}</p>

          <div>
            <h4 className="font-semibold mb-1">Release Year</h4>
            <p className="text-muted-foreground">{manhwa.releaseYear}</p>
          </div>
        </div>
      </div>

      {/* Unwanted Filter Component */}
      <UnwantedFilter manhwa={manhwa} onFilterChange={handleFilterChange} />

      {/* Filtering Statistics */}
      {hasFilters && filterStats && (
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">Filtering Results</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div className="text-center p-3 bg-muted rounded">
                <div className="text-lg font-bold text-red-600">{filterStats.filteredByAny}</div>
                <div className="text-muted-foreground">Filtered Out</div>
              </div>
              <div className="text-center p-3 bg-muted rounded">
                <div className="text-lg font-bold text-green-600">{filterStats.remainingManhwa}</div>
                <div className="text-muted-foreground">Remaining</div>
              </div>
              <div className="text-center p-3 bg-muted rounded">
                <div className="text-lg font-bold text-blue-600">{filterStats.filteringPercentage.toFixed(1)}%</div>
                <div className="text-muted-foreground">Filtered</div>
              </div>
              <div className="text-center p-3 bg-muted rounded">
                <div className="text-lg font-bold text-purple-600">{recommendations.length}</div>
                <div className="text-muted-foreground">Recommendations</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold mb-2">
              {hasFilters ? "Filtered Recommendations" : "Recommended for You"}
            </h2>
            <p className="text-muted-foreground">
              {hasFilters
                ? `Based on "${manhwa.title}" excluding your unwanted genres, tags, and years`
                : `Based on the genres, tags, and style of "${manhwa.title}"`}
            </p>
          </div>
          {recommendations.length > 0 && (
            <Link href={getCalculationsUrl()}>
              <Button className="flex items-center gap-2">
                <Calculator className="h-4 w-4" />
                View All Calculations
              </Button>
            </Link>
          )}
        </div>

        {recommendations.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {recommendations.map((recommendedManhwa) => (
              <ManhwaCard key={recommendedManhwa.id} manhwa={recommendedManhwa} />
            ))}
          </div>
        ) : hasFilters ? (
          <Card>
            <CardContent className="p-8 text-center">
              <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Recommendations Found</h3>
              <p className="text-muted-foreground mb-4">
                Your current filters have excluded all potential recommendations. Try removing some filters to see more
                results.
              </p>
              <Button
                onClick={() => handleFilterChange([], [], {})}
                className="flex items-center gap-2 mx-auto"
              >
                <Filter className="h-4 w-4" />
                Clear All Filters
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-8 text-center">
              <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Recommendations Available</h3>
              <p className="text-muted-foreground">We couldn't find any similar manhwa to recommend at this time.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  )
}
