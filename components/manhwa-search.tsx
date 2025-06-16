"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Search, Filter, X, ChevronDown } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button, type ButtonProps } from "@/components/ui/button"
import { Badge, type BadgeProps } from "@/components/ui/badge"
import { Slider } from "@/components/ui/slider"
import { getManhwaByTitleSync, getAllManhwaSync } from "@/lib/manhwa-service"
import { ManhwaCard } from "@/components/manhwa-card"
import type { Manhwa } from "@/lib/types"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Collapsible, CollapsibleContent } from "@/components/ui/collapsible"

// Dynamic genre and tag extraction from loaded data
// Define unethical content to filter out
const BLOCKED_GENRES = ["Hentai"];
const BLOCKED_TAGS = ["Nudity", "Boys' Love", "Heterosexual"];

function getAvailableGenres(): string[] {
  const allManhwa = getAllManhwaSync();
  const genresSet = new Set<string>();

  allManhwa.forEach((manhwa) => {
    manhwa.genres.forEach((genre) => {
      // Filter out blocked genres
      if (!BLOCKED_GENRES.includes(genre)) {
        genresSet.add(genre);
      }
    });
  });

  return Array.from(genresSet).sort();
}

function getAvailableTags(): string[] {
  const allManhwa = getAllManhwaSync();
  const tagsSet = new Set<string>();

  allManhwa.forEach((manhwa) => {
    manhwa.tags.forEach((tag) => {
      // Filter out blocked tags
      if (!BLOCKED_TAGS.includes(tag)) {
        tagsSet.add(tag);
      }
    });
  });

  return Array.from(tagsSet).sort();
}

function getYearRange(): { min: number; max: number } {
  const allManhwa = getAllManhwaSync()
  if (allManhwa.length === 0) {
    return { min: 2000, max: 2024 }
  }

  let min = Number.POSITIVE_INFINITY
  let max = Number.NEGATIVE_INFINITY

  allManhwa.forEach((manhwa) => {
    if (manhwa.releaseYear < min) min = manhwa.releaseYear
    if (manhwa.releaseYear > max) max = manhwa.releaseYear
  })

  return { min: min === Number.POSITIVE_INFINITY ? 2000 : min, max: max === Number.NEGATIVE_INFINITY ? 2024 : max }
}

export function ManhwaSearch() {
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<Manhwa[]>([])
  const [isInitialized, setIsInitialized] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [isLoading, setIsLoading] = useState(false)
  const ITEMS_PER_PAGE = 24

  // Dynamic data
  const [availableGenres, setAvailableGenres] = useState<string[]>([])
  const [availableTags, setAvailableTags] = useState<string[]>([])
  const [yearRange, setYearRange] = useState<{ min: number; max: number }>({ min: 2000, max: 2024 })

  // Filter states
  const [selectedGenres, setSelectedGenres] = useState<string[]>(["Action"]) // Default to Action genre
  const [selectedTags, setSelectedTags] = useState<string[]>(["Dungeon"]) // Default to Dungeon tag
  const [yearRangeFilter, setYearRangeFilter] = useState<[number, number]>([2000, 2024])
  const [tagSearchQuery, setTagSearchQuery] = useState("")

  // Initialize data when component mounts
  useEffect(() => {
    const genres = getAvailableGenres()
    const tags = getAvailableTags()
    const years = getYearRange()

    setAvailableGenres(genres)
    setAvailableTags(tags)
    setYearRange(years)
    setYearRangeFilter([years.min, years.max])

    console.log(`Loaded ${genres.length} genres, ${tags.length} tags, year range: ${years.min}-${years.max}`)
  }, [])

  // Filtered tags based on search
  const filteredTags = tagSearchQuery
    ? availableTags.filter((tag) => tag.toLowerCase().includes(tagSearchQuery.toLowerCase()))
    : availableTags; // Show all tags by default

  // Auto-search effect
  useEffect(() => {
    if (!isInitialized) {
      setIsInitialized(true)
      return
    }

    const debounceTimer = setTimeout(() => {
      setPage(1) // Reset page when search criteria changes
      handleSearch(true) // true means reset results
    }, 300)

    return () => clearTimeout(debounceTimer)
  }, [searchQuery, selectedGenres, selectedTags, yearRangeFilter, isInitialized])

  // Scroll event listener for infinite scrolling
  useEffect(() => {
    const handleScroll = () => {
      if (isLoading || !hasMore) return
      
      const scrollHeight = document.documentElement.scrollHeight
      const scrollTop = document.documentElement.scrollTop
      const clientHeight = document.documentElement.clientHeight
      
      // If scrolled to bottom (with a small threshold)
      if (scrollTop + clientHeight >= scrollHeight - 100) {
        loadMoreItems()
      }
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [isLoading, hasMore])

  const loadMoreItems = () => {
    if (isLoading || !hasMore) return
    setIsLoading(true)
    setPage(prevPage => prevPage + 1)
    handleSearch(false) // false means append results
  }

  const handleSearch = (resetResults = true) => {
    let results: Manhwa[];

    if (searchQuery.trim() === "") {
      results = getAllManhwaSync();
    } else {
      results = getManhwaByTitleSync(searchQuery);
    }

    // Filter out unethical content
    results = results.filter((manhwa) => {
      // Filter out manhwa with blocked genres
      if (manhwa.genres.some(genre => BLOCKED_GENRES.includes(genre))) {
        return false;
      }
      
      // Filter out manhwa with blocked tags
      if (manhwa.tags.some(tag => BLOCKED_TAGS.includes(tag))) {
        return false;
      }

      // Apply user-selected filters
      // Filter by selected genres
      if (selectedGenres.length > 0 && !manhwa.genres.some((genre) => selectedGenres.includes(genre))) {
        return false;
      }

      // Filter by selected tags
      if (selectedTags.length > 0 && !manhwa.tags.some((tag) => selectedTags.includes(tag))) {
        return false;
      }

      // Filter by year range
      if (manhwa.releaseYear < yearRangeFilter[0] || manhwa.releaseYear > yearRangeFilter[1]) {
        return false;
      }

      return true;
    });

    // Calculate pagination
    const startIndex = resetResults ? 0 : (page - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    const newResults = results.slice(startIndex, endIndex);
    
    // Update state
    setSearchResults(prevResults => resetResults ? newResults : [...prevResults, ...newResults]);
    setHasMore(endIndex < results.length);
    setIsLoading(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value)
  }

  const toggleGenre = (genre: string) => {
    setSelectedGenres((prev) => (prev.includes(genre) ? prev.filter((g) => g !== genre) : [...prev, genre]))
  }

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]))
  }

  const clearFilters = () => {
    setSelectedGenres([])
    setSelectedTags([])
    setYearRangeFilter([yearRange.min, yearRange.max])
    setTagSearchQuery("")
  }

  const showAllManhwa = () => {
    setSearchQuery("")
    clearFilters()
    setPage(1)
    setSearchResults(getAllManhwaSync().slice(0, ITEMS_PER_PAGE))
    setHasMore(getAllManhwaSync().length > ITEMS_PER_PAGE)
  }

  const hasActiveFilters =
    selectedGenres.length > 0 ||
    selectedTags.length > 0 ||
    yearRangeFilter[0] > yearRange.min ||
    yearRangeFilter[1] < yearRange.max

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-3">
        {/* Search input */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search for a manhwa title..."
            value={searchQuery}
            onChange={handleInputChange}
            className="pl-10"
          />
        </div>

        {/* Filter button */}
        <Button
          variant="outline"
          type="button"
          onClick={() => setShowFilters(!showFilters)}
          className="md:w-auto w-full"
        >
          <Filter className="h-4 w-4 mr-2" />
          Filters
          {hasActiveFilters && (
            <Badge variant="secondary" className="ml-2">
              {selectedGenres.length +
                selectedTags.length +
                (yearRangeFilter[0] > yearRange.min || yearRangeFilter[1] < yearRange.max ? 1 : 0)}
            </Badge>
          )}
        </Button>

        {hasActiveFilters && (
          <Button className="md:w-auto w-full" onClick={clearFilters}>
            <X className="h-4 w-4 mr-2" />
            Clear
          </Button>
        )}
      </div>

      {/* Filter options */}
      <Collapsible open={showFilters} onOpenChange={setShowFilters}>
        <CollapsibleContent>
          <div className="p-4 border rounded-lg bg-card">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Genre filter */}
              <div>
                <h4 className="font-medium mb-2 text-sm">Genres ({availableGenres.length} available)</h4>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" type="button" className="w-full justify-between">
                      {selectedGenres.length > 0 ? `${selectedGenres.length} selected` : "Select genres"}
                      <ChevronDown className="h-4 w-4 ml-2 opacity-50" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56 max-h-[300px] overflow-y-auto">
                    <DropdownMenuLabel>Genres</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {availableGenres.map((genre) => (
                      <DropdownMenuCheckboxItem
                        key={genre}
                        checked={selectedGenres.includes(genre)}
                        onCheckedChange={() => toggleGenre(genre)}
                      >
                        {genre}
                      </DropdownMenuCheckboxItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
                {selectedGenres.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {selectedGenres.map((genre) => (
                      <Badge
                        key={genre}
                        className="cursor-pointer hover:bg-destructive/20 transition-colors"
                        onClick={() => toggleGenre(genre)}
                      >
                        {genre}
                        <X className="ml-1 h-3 w-3" />
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              {/* Tag filter */}
              <div>
                <h4 className="font-medium mb-2 text-sm">Tags ({availableTags.length} available)</h4>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" type="button" className="w-full justify-between">
                      {selectedTags.length > 0 ? `${selectedTags.length} selected` : "Select tags"}
                      <ChevronDown className="h-4 w-4 ml-2 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80 p-0" align="start">
                    <div className="p-4 border-b">
                      <div className="relative">
                        <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Search tags..."
                          value={tagSearchQuery}
                          onChange={(e) => setTagSearchQuery(e.target.value)}
                          className="pl-8"
                        />
                      </div>
                    </div>
                    <div className="p-4 max-h-[300px] overflow-y-auto">
                      <div className="flex flex-wrap gap-1">
                        {filteredTags.map((tag) => (
                          <Badge
                            key={tag}
                            variant={selectedTags.includes(tag) ? "default" : "outline"}
                            className="cursor-pointer"
                            onClick={() => toggleTag(tag)}
                          >
                            {tag}
                          </Badge>
                        ))}
                        {tagSearchQuery && filteredTags.length === 0 && (
                          <div className="text-sm text-muted-foreground py-2">
                            No tags found matching "{tagSearchQuery}"
                          </div>
                        )}
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
                {selectedTags.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {selectedTags.slice(0, 3).map((tag) => (
                      <Badge key={tag} variant="secondary" className="cursor-pointer" onClick={() => toggleTag(tag)}>
                        {tag}
                        <X className="ml-1 h-3 w-3" />
                      </Badge>
                    ))}
                    {selectedTags.length > 3 && <Badge variant="outline">+{selectedTags.length - 3} more</Badge>}
                  </div>
                )}
              </div>

              {/* Year range filter */}
              <div>
                <div className="flex justify-between mb-2">
                  <h4 className="font-medium text-sm">Release Year</h4>
                  <span className="text-sm text-muted-foreground">
                    {yearRangeFilter[0]} - {yearRangeFilter[1]}
                  </span>
                </div>
                <Slider
                  min={yearRange.min}
                  max={yearRange.max}
                  step={1}
                  value={yearRangeFilter}
                  onValueChange={(value: number[]) => setYearRangeFilter(value as [number, number])}
                  className="py-4"
                />
              </div>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Search results */}
      {(searchResults.length > 0 || searchQuery.trim() !== "" || hasActiveFilters) && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-semibold">
              {searchQuery.trim() === "" && !hasActiveFilters ? "All Manhwa" : "Search Results"}
              <span className="text-sm font-normal text-muted-foreground ml-2">({searchResults.length} found)</span>
            </h3>
            {(searchQuery.trim() !== "" || hasActiveFilters) && (
              <Button variant="ghost" type="button" size="sm" onClick={showAllManhwa}>
                Show All
              </Button>
            )}
          </div>

          {searchResults.length > 0 ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {searchResults.map((manhwa, index) => (
                  <ManhwaCard key={`${manhwa.id}-${index}`} manhwa={manhwa} />
                ))}
              </div>
              {isLoading && (
                <div className="text-center py-4 mt-4">
                  <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]"></div>
                  <p className="mt-2 text-sm text-muted-foreground">Loading more...</p>
                </div>
              )}
              {!isLoading && !hasMore && searchResults.length > ITEMS_PER_PAGE && (
                <div className="text-center py-4 mt-4">
                  <p className="text-sm text-muted-foreground">You've reached the end of the list</p>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">No manhwa found matching your search criteria.</p>
              <Button variant="outline" type="button" onClick={showAllManhwa}>
                Show All Manhwa
              </Button>
            </div>
          )}
        </div>
      )}

      {searchResults.length === 0 && searchQuery.trim() === "" && !hasActiveFilters && isInitialized && (
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-4">Start typing to search for manhwa titles or use filters</p>
          <Button variant="outline" type="button" onClick={showAllManhwa}>
            Browse All Manhwa
          </Button>
        </div>
      )}
    </div>
  )
}
