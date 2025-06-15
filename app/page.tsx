import { RecommendationTabs } from "@/components/recommendation-tabs"

export default function Home() {
  return (
    <main className="container mx-auto px-4 py-8">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-4">Manhwa Recommendation System</h1>
        
      </div>
      <RecommendationTabs />
    </main>
  )
}
