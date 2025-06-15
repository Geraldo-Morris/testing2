import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { DataLoader } from "@/components/data-loader"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Manhwa Recommendation System",
  description: "Discover your next favorite manhwa with AI-powered recommendations",
    generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <DataLoader>{children}</DataLoader>
        </ThemeProvider>
      </body>
    </html>
  )
}
