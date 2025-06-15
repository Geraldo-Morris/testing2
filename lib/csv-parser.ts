// CSV Parser utility for manhwa data
export interface CSVManhwa {
  id: string
  title: string
  author: string
  description: string
  genres: string[]
  tags: string[]
  artStyle: string
  status: string
  releaseYear: number
  rating: number
  popularity: number
  coverImage: string
  chapters: number
}

export function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ""
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]

    if (char === '"') {
      inQuotes = !inQuotes
    } else if (char === "," && !inQuotes) {
      result.push(current.trim())
      current = ""
    } else {
      current += char
    }
  }

  result.push(current.trim())
  return result
}

export function parseCSVToManhwa(csvText: string): CSVManhwa[] {
  const lines = csvText.split("\n").filter((line) => line.trim())
  if (lines.length === 0) return []

  const headers = parseCSVLine(lines[0]).map((h) => h.replace(/"/g, "").trim())
  const manhwaList: CSVManhwa[] = []

  console.log("CSV Headers:", headers)

  for (let i = 1; i < lines.length; i++) {
    try {
      const values = parseCSVLine(lines[i])

      // Create a mapping object
      const rowData: { [key: string]: string } = {}
      headers.forEach((header, index) => {
        rowData[header] = values[index] || ""
      })

      // Map CSV columns to our interface
      // We'll need to adjust these based on the actual CSV structure
      const manhwa: CSVManhwa = {
        id: rowData["id"] || rowData["ID"] || i.toString(),
        title: rowData["title"] || rowData["Title"] || rowData["name"] || rowData["Name"] || "Unknown Title",
        author: rowData["author"] || rowData["Author"] || rowData["creator"] || rowData["Creator"] || "Unknown Author",
        description:
          rowData["description"] ||
          rowData["Description"] ||
          rowData["summary"] ||
          rowData["Summary"] ||
          "No description available",
        genres: parseArrayField(rowData["genres"] || rowData["Genres"] || rowData["genre"] || rowData["Genre"] || ""),
        tags: parseArrayField(rowData["tags"] || rowData["Tags"] || rowData["themes"] || rowData["Themes"] || ""),
        artStyle: rowData["artStyle"] || rowData["ArtStyle"] || rowData["art_style"] || rowData["style"] || "Unknown",
        status: rowData["status"] || rowData["Status"] || rowData["publication_status"] || "Unknown",
        releaseYear: Number.parseInt(
          rowData["releaseYear"] ||
            rowData["ReleaseYear"] ||
            rowData["release_year"] ||
            rowData["year"] ||
            rowData["Year"] ||
            "2020",
        ),
        rating: Number.parseFloat(
          rowData["rating"] || rowData["Rating"] || rowData["score"] || rowData["Score"] || "0",
        ),
        popularity: Number.parseFloat(
          rowData["popularity"] || rowData["Popularity"] || rowData["views"] || rowData["Views"] || "0",
        ),
        coverImage:
          rowData["coverImage"] ||
          rowData["CoverImage"] ||
          rowData["cover_image"] ||
          rowData["image"] ||
          "/placeholder.svg?height=450&width=300",
        chapters: Number.parseInt(rowData["chapters"] || rowData["Chapters"] || rowData["chapter_count"] || "0"),
      }

      manhwaList.push(manhwa)
    } catch (error) {
      console.error(`Error parsing row ${i}:`, error)
    }
  }

  console.log(`Successfully parsed ${manhwaList.length} manhwa entries`)
  return manhwaList
}

function parseArrayField(field: string): string[] {
  if (!field || field.trim() === "") return []

  // Handle different array formats
  // Format 1: "Action, Adventure, Fantasy"
  // Format 2: "['Action', 'Adventure', 'Fantasy']"
  // Format 3: "[Action, Adventure, Fantasy]"

  let cleaned = field.trim()

  // Remove outer brackets if present
  if (cleaned.startsWith("[") && cleaned.endsWith("]")) {
    cleaned = cleaned.slice(1, -1)
  }

  // Split by comma and clean each item
  return cleaned
    .split(",")
    .map((item) => item.trim().replace(/['"]/g, ""))
    .filter((item) => item.length > 0)
}
