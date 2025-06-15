"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { X, Filter, RotateCcw } from "lucide-react"
import type { Manhwa } from "@/lib/types"

interface UnwantedFilterProps {
  manhwa: Manhwa
  onFilterChange: (unwantedGenres: string[], unwantedTags: string[], yearRange: { min?: number; max?: number }) => void
}

export function UnwantedFilter({ manhwa, onFilterChange }: UnwantedFilterProps) {
  const [unwantedGenres, setUnwantedGenres] = useState<string[]>([])
  const [unwantedTags, setUnwantedTags] = useState<string[]>([])
  const [yearRange, setYearRange] = useState<{ min?: number; max?: number }>({})
  const [isExpanded, setIsExpanded] = useState(false)

  const toggleGenre = (genre: string) => {
    const newUnwantedGenres = unwantedGenres.includes(genre)
      ? unwantedGenres.filter((g) => g !== genre)
      : [...unwantedGenres, genre]

    setUnwantedGenres(newUnwantedGenres)
    onFilterChange(newUnwantedGenres, unwantedTags, yearRange)
  }

  const toggleTag = (tag: string) => {
    const newUnwantedTags = unwantedTags.includes(tag) ? unwantedTags.filter((t) => t !== tag) : [...unwantedTags, tag]

    setUnwantedTags(newUnwantedTags)
    onFilterChange(unwantedGenres, newUnwantedTags, yearRange)
  }

  const handleYearRangeChange = (field: "min" | "max", value: string) => {
    const numValue = value === "" ? undefined : Number.parseInt(value)
    const newYearRange = { ...yearRange, [field]: numValue }
    setYearRange(newYearRange)
    onFilterChange(unwantedGenres, unwantedTags, newYearRange)
  }

  const clearAllFilters = () => {
    setUnwantedGenres([])
    setUnwantedTags([])
    setYearRange({})
    onFilterChange([], [], {})
  }

  const hasActiveFilters =
    unwantedGenres.length > 0 || unwantedTags.length > 0 || yearRange.min !== undefined || yearRange.max !== undefined

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

  if (!isExpanded) {
    return (
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">Filter Recommendations</span>
              <Badge className="ml-2">
                {unwantedGenres.length +
                  unwantedTags.length +
                  (yearRange.min !== undefined || yearRange.max !== undefined ? 1 : 0)}{" "}
                filters active
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              {hasActiveFilters && (
                <Button size="sm" onClick={clearAllFilters}>
                  <RotateCcw className="h-4 w-4 mr-1" />
                  Clear
                </Button>
              )}
              <Button size="sm" onClick={() => setIsExpanded(true)}>
                {hasActiveFilters ? "Edit Filters" : "Add Filters"}
              </Button>
            </div>
          </div>

          {hasActiveFilters && (
            <div className="mt-3 pt-3 border-t">
              <div className="text-sm text-muted-foreground mb-2">Excluding:</div>
              <div className="flex flex-wrap gap-1">
                {unwantedGenres.map((genre) => (
                  <Badge key={genre} variant="destructive" className="text-xs">
                    {genre}
                  </Badge>
                ))}
                {unwantedTags.map((tag) => (
                  <Badge key={tag} variant="destructive" className="text-xs">
                    {tag}
                  </Badge>
                ))}
                {getYearRangeText() && (
                  <Badge variant="destructive" className="text-xs">
                    Years: {getYearRangeText()}
                  </Badge>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="mb-6">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filter Recommendations
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={() => setIsExpanded(false)}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">
          Select genres, tags, and release years that you want to exclude from recommendations.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Genres Filter */}
        <div>
          <h4 className="font-semibold mb-3">Exclude Genres</h4>
          <p className="text-sm text-muted-foreground mb-3">Recommendations won't include manhwa with these genres:</p>
          <div className="flex flex-wrap gap-2">
            {manhwa.genres.map((genre) => (
              <Badge
                key={genre}
                variant={unwantedGenres.includes(genre) ? "destructive" : "outline"}
                className="cursor-pointer hover:bg-destructive/20 transition-colors"
                onClick={() => toggleGenre(genre)}
              >
                {unwantedGenres.includes(genre) && <X className="h-3 w-3 mr-1" />}
                {genre}
              </Badge>
            ))}
          </div>
          {unwantedGenres.length > 0 && (
            <div className="mt-2 text-sm text-muted-foreground">
              Excluding {unwantedGenres.length} of {manhwa.genres.length} genres
            </div>
          )}
        </div>

        {/* Themes Filter */}
        <div>
          <h4 className="font-semibold mb-3">Exclude Tags</h4>
          <p className="text-sm text-muted-foreground mb-3">Recommendations won't include manhwa with these tags:</p>
          <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
            {manhwa.tags.map((tag) => (
              <Badge
                key={tag}
                variant={unwantedTags.includes(tag) ? "destructive" : "outline"}
                className="cursor-pointer hover:bg-destructive/20 transition-colors"
                onClick={() => toggleTag(tag)}
              >
                {unwantedTags.includes(tag) && <X className="h-3 w-3 mr-1" />}
                {tag}
              </Badge>
            ))}
          </div>
          {unwantedTags.length > 0 && (
            <div className="mt-2 text-sm text-muted-foreground">
              Excluding {unwantedTags.length} of {manhwa.tags.length} tags
            </div>
          )}
        </div>

        {/* Release Year Filter */}
        <div>
          <h4 className="font-semibold mb-3">Exclude Release Years</h4>
          <p className="text-sm text-muted-foreground mb-3">
            Set a year range to exclude. "{manhwa.title}" was released in {manhwa.releaseYear}.
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="minYear" className="text-sm">
                From Year (inclusive)
              </Label>
              <Input
                id="minYear"
                type="number"
                placeholder="e.g., 2010"
                value={yearRange.min || ""}
                onChange={(e) => handleYearRangeChange("min", e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="maxYear" className="text-sm">
                To Year (inclusive)
              </Label>
              <Input
                id="maxYear"
                type="number"
                placeholder="e.g., 2020"
                value={yearRange.max || ""}
                onChange={(e) => handleYearRangeChange("max", e.target.value)}
                className="mt-1"
              />
            </div>
          </div>
          {(yearRange.min !== undefined || yearRange.max !== undefined) && (
            <div className="mt-2 p-2 bg-destructive/10 rounded text-sm">
              <span className="text-destructive font-medium">Excluding: </span>
              {yearRange.min !== undefined && yearRange.max !== undefined
                ? `Manhwa released between ${yearRange.min} and ${yearRange.max}`
                : yearRange.min !== undefined
                  ? `Manhwa released from ${yearRange.min} onwards`
                  : `Manhwa released until ${yearRange.max}`}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-4 border-t">
          <div className="text-sm text-muted-foreground">
            {hasActiveFilters
              ? `${unwantedGenres.length + unwantedTags.length + (yearRange.min !== undefined || yearRange.max !== undefined ? 1 : 0)} filters active`
              : "No filters applied"}
          </div>
          <div className="flex gap-2">
            {hasActiveFilters && (
              <Button size="sm" onClick={clearAllFilters}>
                <RotateCcw className="h-4 w-4 mr-1" />
                Clear
              </Button>
            )}
            <Button size="sm" onClick={() => setIsExpanded(false)}>
              {hasActiveFilters ? "Apply Filters" : "Close"}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
