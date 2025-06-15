"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { getAllManhwa } from "@/lib/manhwa-service"
import { Card, CardContent } from "@/components/ui/card"
import { Loader2, CheckCircle, AlertCircle } from "lucide-react"

interface DataLoaderProps {
  children: React.ReactNode
}

export function DataLoader({ children }: DataLoaderProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dataCount, setDataCount] = useState(0)

  useEffect(() => {
    async function loadData() {
      try {
        setIsLoading(true)
        setError(null)

        console.log("Loading manhwa data...")
        const data = await getAllManhwa()
        setDataCount(data.length)

        console.log(`Successfully loaded ${data.length} manhwa entries`)
        setIsLoading(false)
      } catch (err) {
        console.error("Error loading data:", err)
        setError(err instanceof Error ? err.message : "Failed to load data")
        setIsLoading(false)
      }
    }

    loadData()
  }, [])

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="p-8 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
            <h3 className="text-lg font-semibold mb-2">Loading Manhwa Database</h3>
            <p className="text-muted-foreground">Fetching and processing manhwa data from CSV...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="p-8 text-center">
            <AlertCircle className="h-8 w-8 mx-auto mb-4 text-destructive" />
            <h3 className="text-lg font-semibold mb-2">Error Loading Data</h3>
            <p className="text-muted-foreground mb-4">{error}</p>
            <p className="text-sm text-muted-foreground">The application has fallen back to sample data.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div>
      {/* Data loaded successfully indicator */}
      <div className="container mx-auto px-4 py-2">
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <span>Database loaded: {dataCount} manhwa entries</span>
        </div>
      </div>
      {children}
    </div>
  )
}
