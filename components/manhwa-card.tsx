import type { Manhwa } from "@/lib/types"
import { Card, CardContent } from "@/components/ui/card"
import Link from "next/link"

interface ManhwaCardProps {
  manhwa: Manhwa
  showCalculation?: boolean
  userPreferences?: {
    genres: string[]
    themes: string[]
  }
  sourceManhwaId?: string
}

export function ManhwaCard({ manhwa, showCalculation = false, userPreferences, sourceManhwaId }: ManhwaCardProps) {
  // Create the link to the manhwa detail page
  const href = `/manhwa/${manhwa.id}`

  return (
    <Link href={href}>
      <Card className="overflow-hidden h-full transition-all hover:shadow-lg hover:scale-105 cursor-pointer">
        <div className="aspect-[2/3] relative overflow-hidden">
          <img
            src={manhwa.coverImage || "/placeholder.svg"}
            alt={manhwa.title}
            className="object-cover w-full h-full transition-transform hover:scale-110"
          />
        </div>
        <CardContent className="p-4">
          <h3 className="font-semibold line-clamp-2 mb-1">{manhwa.title}</h3>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-muted-foreground">{manhwa.releaseYear}</span>
          </div>
          <div className="flex flex-wrap gap-1">
            {manhwa.genres.slice(0, 2).map((genre) => (
              <span key={genre} className="px-2 py-0.5 bg-primary/10 text-primary rounded-full text-xs">
                {genre}
              </span>
            ))}
            {manhwa.genres.length > 2 && (
              <span className="px-2 py-0.5 bg-muted text-muted-foreground rounded-full text-xs">
                +{manhwa.genres.length - 2}
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
