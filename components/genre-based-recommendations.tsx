"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Sparkles, Search, Calculator } from "lucide-react"
import { getRecommendationsByPreferences } from "@/lib/recommendation-engine"
import { ManhwaCard } from "@/components/manhwa-card"
import type { Manhwa } from "@/lib/types"
import { getAllManhwaSync } from "@/lib/manhwa-service"

// Extract unique genres and tags from the dataset
function extractUniqueGenresAndTags() {
  const allManhwa = getAllManhwaSync()
  const uniqueGenres = new Set<string>()
  const uniqueTags = new Set<string>()

  allManhwa.forEach((manhwa) => {
    manhwa.genres.forEach((genre) => uniqueGenres.add(genre))
    manhwa.tags.forEach((tag) => uniqueTags.add(tag))
  })

  return {
    genres: Array.from(uniqueGenres).sort(),
    tags: Array.from(uniqueTags).sort()
  }
}

function toggleGenre(genre: string, selectedGenres: string[], setSelectedGenres: any) {
  setSelectedGenres((prev: string[]) =>
    prev.includes(genre) ? prev.filter((g: string) => g !== genre) : [...prev, genre],
  )
}

export function GenreBasedRecommendations() {
  const [selectedGenres, setSelectedGenres] = useState<string[]>([])
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [recommendations, setRecommendations] = useState<Manhwa[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [tagSearchQuery, setTagSearchQuery] = useState("")
  const [availableGenres, setAvailableGenres] = useState<string[]>([])
  const [allTags, setAllTags] = useState<string[]>([])

  useEffect(() => {
    const { genres, tags } = extractUniqueGenresAndTags()
    setAvailableGenres(genres)
    setAllTags(tags)
  }, [])

  const filteredTags = allTags.filter((tag) => tag.toLowerCase().includes(tagSearchQuery.toLowerCase()))

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]))
  }

  const getRecommendations = async () => {
    if (selectedGenres.length === 0 && selectedTags.length === 0) {
      return
    }

    setIsLoading(true)

    // Import the calculateTFIDF function dynamically to avoid SSR issues
    const { calculateTFIDF } = await import('@/lib/similarity-calculator')

    // Simulate loading delay for better UX
    setTimeout(async () => {
      // Get more recommendations initially to find the best matches after TF-IDF calculation
      const initialResults = getRecommendationsByPreferences(selectedGenres, selectedTags, 20)
      
      // Calculate detailed similarity for each recommendation
      const calculationPromises = initialResults.map(manhwa => 
        calculateTFIDF(manhwa, selectedGenres, selectedTags)
      )
      
      const calculations = await Promise.all(calculationPromises)
      
      // Combine manhwa with their calculations
      const resultsWithCalculations = initialResults.map((manhwa, index) => ({
        manhwa,
        calculation: calculations[index]
      }))
      
      // Filter valid results, sort by cosine similarity, and take top 5
      const sortedResults = resultsWithCalculations
        .filter(result => result && result.calculation && typeof result.calculation.cosine?.similarity === 'number')
        .sort((a, b) => (b.calculation.cosine.similarity || 0) - (a.calculation.cosine.similarity || 0))
        .slice(0, 5)
        .map(result => result.manhwa)
      
      setRecommendations(sortedResults)
      setIsLoading(false)
    }, 500)
  }

  const clearSelections = () => {
    setSelectedGenres([])
    setSelectedTags([])
    setRecommendations([])
    setTagSearchQuery("")
  }

  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-2 gap-6">
        {/* Genres Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Select Genres</CardTitle>
            <p className="text-sm text-muted-foreground">Choose the genres you enjoy reading</p>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {availableGenres.map((genre) => (
                <Badge
                  key={genre}
                  variant={selectedGenres.includes(genre) ? "default" : "outline"}
                  className="cursor-pointer hover:bg-primary/20 transition-colors"
                  onClick={() => toggleGenre(genre, selectedGenres, setSelectedGenres)}
                >
                  {genre}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Themes Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Select Tags</CardTitle>
            <p className="text-sm text-muted-foreground">Pick tags and elements you find interesting ({allTags.length} total)</p>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search tags..."
                  value={tagSearchQuery}
                  onChange={(e) => setTagSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="max-h-48 overflow-y-auto">
                <div className="flex flex-wrap gap-2">
                  {filteredTags.map((tag) => (
                    <Badge
                      key={tag}
                      variant={selectedTags.includes(tag) ? "default" : "outline"}
                      className="cursor-pointer hover:bg-primary/20 transition-colors"
                      onClick={() => toggleTag(tag)}
                    >
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
              {tagSearchQuery && (
                <p className="text-sm text-muted-foreground">
                  Showing {Math.min(filteredTags.length, 50)} of {filteredTags.length} matching tags
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Selected Preferences Summary */}
      {(selectedGenres.length > 0 || selectedTags.length > 0) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Your Preferences</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {selectedGenres.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Selected Genres ({selectedGenres.length}):</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedGenres.map((genre) => (
                      <Badge key={genre} variant="default">
                        {genre}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              {selectedTags.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Selected Tags ({selectedTags.length}):</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedTags.map((tag) => (
                      <Badge key={tag} variant="secondary">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3 justify-center">
        <Button
          onClick={getRecommendations}
          disabled={(selectedGenres.length === 0 && selectedTags.length === 0) || isLoading}
          size="lg"
        >
          <Sparkles className="h-4 w-4 mr-2" />
          {isLoading ? "Finding Recommendations..." : "Get Recommendations"}
        </Button>
        {(selectedGenres.length > 0 || selectedTags.length > 0) && (
          <Button variant="outline" onClick={clearSelections} size="lg">
            Clear All
          </Button>
        )}
      </div>

      {/* Recommendations Results */}
      {recommendations.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-2xl font-bold mb-2">Recommended for You</h3>
              <p className="text-muted-foreground">
                Based on the genres, tags, and style of your preferences
              </p>
            </div>
            <Button 
              className="flex items-center gap-2"
              onClick={() => {
                // Create URL parameters for user preferences
                const params = new URLSearchParams();
                if (selectedGenres.length > 0) {
                  params.append('userGenres', selectedGenres.join(','));
                }
                if (selectedTags.length > 0) {
                  params.append('userTags', selectedTags.join(','));
                }
                // Navigate to the all-calculations page with the user's preferences
                window.location.href = `/preferences/calculations?${params.toString()}`;
              }}
            >
              <Calculator className="h-4 w-4" />
              View All Calculations
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {recommendations.slice(0, 5).map((manhwa) => (
              <ManhwaCard key={manhwa.id} manhwa={manhwa} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
