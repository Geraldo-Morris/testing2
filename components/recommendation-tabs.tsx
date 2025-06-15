"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ManhwaSearch } from "@/components/manhwa-search"
import { GenreBasedRecommendations } from "@/components/genre-based-recommendations"
import { Search, Tags } from "lucide-react"

export function RecommendationTabs() {
  return (
    <Tabs defaultValue="search" className="w-full">
      <TabsList className="grid w-full grid-cols-2 mb-8">
        <TabsTrigger value="search" className="flex items-center gap-2">
          <Search className="h-4 w-4" />
          Search & Discover
        </TabsTrigger>
        <TabsTrigger value="preferences" className="flex items-center gap-2">
          <Tags className="h-4 w-4" />
          My Preferences
        </TabsTrigger>
      </TabsList>

      <TabsContent value="search" className="space-y-6">
        <div className="text-center mb-6">
          <p className="text-muted-foreground">
            Find a manhwa you like and get recommendations for similar titles based on content analysis.
          </p>
        </div>
        <ManhwaSearch />
      </TabsContent>

      <TabsContent value="preferences" className="space-y-6">
        <div className="text-center mb-6">
          <p className="text-muted-foreground">
            Select your favorite genres and themes to discover manhwa tailored to your taste.
          </p>
        </div>
        <GenreBasedRecommendations />
      </TabsContent>
    </Tabs>
  )
}
