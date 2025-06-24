// CSV Parser utility for manhwa data
export interface CSVManhwa {
  id: string
  title: string
  title_english: string
  title_native: string
  title_synonyms: string[]
  author: string
  description: string
  genres: string[]
  tags: string[]
  releaseYear: number
  coverImage: string
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

export function parseCSVToManhwa(rowData: Record<string, string>): CSVManhwa {
  // Handle potential missing or differently named fields
  return {
    id: rowData["id"] || rowData["ID"] || rowData["manhwa_id"] || "",
    title: rowData["title"] || rowData["Title"] || rowData["name"] || rowData["Name"] || "",
    title_english: rowData["title_english"] || rowData["Title_English"] || rowData["english_title"] || "",
    title_native: rowData["title_native"] || rowData["Title_Native"] || rowData["native_title"] || "",
    title_synonyms: parseArrayField(
      rowData["title_synonyms"] || rowData["Title_Synonyms"] || rowData["synonyms"] || rowData["alternative_titles"] || "",
    ),
    author: rowData["author"] || rowData["Author"] || rowData["creator"] || rowData["artist"] || "",
    description: rowData["description"] || rowData["Description"] || rowData["synopsis"] || rowData["summary"] || "",
    genres: parseArrayField(rowData["genres"] || rowData["Genres"] || rowData["genre"] || rowData["Genre"] || ""),
    tags: parseArrayField(rowData["tags"] || rowData["Tags"] || rowData["themes"] || rowData["Themes"] || ""),
    releaseYear: Number.parseInt(
      rowData["releaseYear"] ||
        rowData["ReleaseYear"] ||
        rowData["release_year"] ||
        rowData["year"] ||
        rowData["Year"] ||
        "0",
    ),
    coverImage:
      rowData["coverImage"] ||
      rowData["CoverImage"] ||
      rowData["cover"] ||
      rowData["Cover"] ||
      rowData["image"] ||
      rowData["Image"] ||
      "",
  }
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
