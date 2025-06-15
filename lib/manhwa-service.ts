import type { Manhwa } from "./types"

// We'll store the CSV data here once loaded
let manhwaData: Manhwa[] = []
let isDataLoaded = false

// CSV file path - use relative URL path for production compatibility
const CSV_PATH = "https://manhwarecommender.netlify.app/manhwa_data.csv"

// Function to load CSV data
async function loadCSVData(): Promise<Manhwa[]> {
  if (isDataLoaded && manhwaData.length > 0) {
    return manhwaData
  }

  try {
    console.log("Loading CSV data from:", CSV_PATH)
    const response = await fetch(CSV_PATH)
    const csvText = await response.text()

    // Parse CSV
    const lines = csvText.split("\n").filter((line) => line.trim())
    if (lines.length === 0) {
      throw new Error("CSV file is empty")
    }

    // Get headers
    const headers = lines[0].split(",").map((h) => h.trim().replace(/"/g, ""))
    console.log("CSV Headers:", headers)

    const parsedData: Manhwa[] = []

    for (let i = 1; i < lines.length; i++) {
      try {
        const values = parseCSVLine(lines[i])

        // Create mapping object
        const rowData: { [key: string]: string } = {}
        headers.forEach((header, index) => {
          rowData[header] = (values[index] || "").replace(/"/g, "").trim()
        })

        // Map to our Manhwa interface with flexible column mapping
        const manhwa: Manhwa = {
          id: rowData["id"] || i.toString(),
          title: rowData["title_romaji"] || rowData["title_english"] || rowData["title_native"] || "Unknown Title",
          author: "Unknown Author", // Not provided in current CSV
          description: rowData["description"] || "No description available.",
          genres: (rowData["genres"] || "").split(",").map(g => g.trim()).filter(Boolean),
          tags: (rowData["tags"] || "").split(",").map(t => t.trim()).filter(Boolean),
          artStyle: "Unknown",
          status: "Unknown",
          releaseYear: parseInt(rowData["start_year"]) || new Date().getFullYear(),
          rating: 0,
          popularity: 0,
          coverImage: rowData["cover_image_url"] || "/placeholder.jpg",
          chapters: 0
        }

        // Validate required fields
        if (manhwa.title && manhwa.title !== "Unknown Title") {
          parsedData.push(manhwa)
        }
      } catch (error) {
        console.error(`Error parsing row ${i}:`, error)
      }
    }

    manhwaData = parsedData
    isDataLoaded = true

    console.log(`Successfully loaded ${manhwaData.length} manhwa entries from CSV`)
    return manhwaData
  } catch (error) {
    console.error("Error loading CSV data:", error)

    // Fallback to sample data if CSV loading fails
    console.log("Falling back to sample data")
    manhwaData = getSampleData()
    isDataLoaded = true
    return manhwaData
  }
}

// CSV parsing helper functions
function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ""
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]

    if (char === '"') {
      inQuotes = !inQuotes
    } else if (char === "," && !inQuotes) {
      result.push(current)
      current = ""
    } else {
      current += char
    }
  }

  result.push(current)
  return result
}

function parseArrayField(field: string): string[] {
  if (!field || field.trim() === "") return []

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

// Sample data as fallback
function getSampleData(): Manhwa[] {
  return [
    {
      id: "1",
      title: "Solo Leveling",
      author: "Chugong",
      description:
        "In a world where hunters must battle deadly monsters to protect humanity, Sung Jin-Woo, the weakest of hunters, finds himself in a situation that changes his life forever.",
      genres: ["Action", "Adventure", "Fantasy"],
      tags: ["Level up", "Dungeons", "Monster battles"],
      artStyle: "Detailed, Dynamic",
      status: "Completed",
      releaseYear: 2018,
      rating: 9.2,
      popularity: 98,
      coverImage: "/placeholder.svg?height=450&width=300",
      chapters: 179,
    },
    {
      id: "2",
      title: "Tower of God",
      author: "SIU",
      description:
        "The story of a boy who enters a mysterious tower, climbing it to find the girl who entered it before him.",
      genres: ["Action", "Adventure", "Fantasy", "Mystery"],
      tags: ["Tower climbing", "Tests", "Betrayal"],
      artStyle: "Unique, Colorful",
      status: "Ongoing",
      releaseYear: 2010,
      rating: 8.9,
      popularity: 95,
      coverImage: "/placeholder.svg?height=450&width=300",
      chapters: 550,
    },
    {
      id: "3",
      title: "The God of High School",
      author: "Yongje Park",
      description:
        "A high school student and his friends compete in an epic tournament borrowing power from the gods and uncovering a mysterious organization.",
      genres: ["Action", "Martial Arts", "Supernatural"],
      tags: ["Tournament", "Gods", "Friendship"],
      artStyle: "Clean, Action-focused",
      status: "Ongoing",
      releaseYear: 2011,
      rating: 8.5,
      popularity: 90,
      coverImage: "/placeholder.svg?height=450&width=300",
      chapters: 500,
    },
    {
      id: "4",
      title: "Noblesse",
      author: "Son Jeho",
      description:
        "After 820 years of slumber, Cadis Etrama Di Raizel awakens in modern-day South Korea, starting a new life as a high school student.",
      genres: ["Action", "Supernatural", "Comedy", "School Life"],
      tags: ["Vampires", "Nobility", "Friendship"],
      artStyle: "Elegant, Detailed",
      status: "Completed",
      releaseYear: 2007,
      rating: 8.7,
      popularity: 88,
      coverImage: "/placeholder.svg?height=450&width=300",
      chapters: 544,
    },
    {
      id: "5",
      title: "The Breaker",
      author: "Jeon Geuk-Jin",
      description:
        "A martial arts manhwa about a weak high school student who meets a mysterious martial arts teacher.",
      genres: ["Action", "Martial Arts", "School Life"],
      tags: ["Training", "Secret organizations", "Revenge"],
      artStyle: "Realistic, Detailed action",
      status: "Completed",
      releaseYear: 2007,
      rating: 8.8,
      popularity: 85,
      coverImage: "/placeholder.svg?height=450&width=300",
      chapters: 72,
    },
    {
      id: "6",
      title: "Sweet Home",
      author: "Kim Carnby",
      description:
        "After losing his family, a reclusive high school student is forced to leave his home when a monster apocalypse threatens to destroy humanity.",
      genres: ["Horror", "Thriller", "Supernatural"],
      tags: ["Monsters", "Survival", "Humanity"],
      artStyle: "Gritty, Detailed",
      status: "Completed",
      releaseYear: 2017,
      rating: 8.6,
      popularity: 87,
      coverImage: "/placeholder.svg?height=450&width=300",
      chapters: 141,
    },
    {
      id: "7",
      title: "Omniscient Reader's Viewpoint",
      author: "Sing Shong",
      description:
        "A novel reader becomes the sole person who knows how the world will end and struggles to change the course of the story.",
      genres: ["Action", "Adventure", "Fantasy"],
      tags: ["Apocalypse", "Novel world", "Survival game"],
      artStyle: "Detailed, Expressive",
      status: "Ongoing",
      releaseYear: 2020,
      rating: 9.0,
      popularity: 92,
      coverImage: "/placeholder.svg?height=450&width=300",
      chapters: 100,
    },
    {
      id: "8",
      title: "Bastard",
      author: "Kim Carnby",
      description:
        "A boy tries to hide the fact that his father is a serial killer while attempting to rescue people from becoming his father's next victims.",
      genres: ["Thriller", "Horror", "Psychological"],
      tags: ["Serial killers", "Family", "Trauma"],
      artStyle: "Realistic, Expressive",
      status: "Completed",
      releaseYear: 2014,
      rating: 8.9,
      popularity: 84,
      coverImage: "/placeholder.svg?height=450&width=300",
      chapters: 94,
    },
    {
      id: "9",
      title: "Lookism",
      author: "Park Tae-jun",
      description:
        "A high school student who is bullied for his appearance wakes up with two bodies that he can switch between at will.",
      genres: ["Drama", "School Life", "Comedy"],
      tags: ["Appearance", "Bullying", "Social hierarchy"],
      artStyle: "Detailed, Realistic",
      status: "Ongoing",
      releaseYear: 2014,
      rating: 8.4,
      popularity: 83,
      coverImage: "/placeholder.svg?height=450&width=300",
      chapters: 400,
    },
    {
      id: "10",
      title: "The Beginning After the End",
      author: "TurtleMe",
      description:
        "A king in his previous life is reborn into a world of magic and monsters, determined to live his new life to the fullest.",
      genres: ["Action", "Adventure", "Fantasy"],
      tags: ["Reincarnation", "Magic", "Coming of age"],
      artStyle: "Colorful, Detailed",
      status: "Ongoing",
      releaseYear: 2018,
      rating: 8.8,
      popularity: 91,
      coverImage: "/placeholder.svg?height=450&width=300",
      chapters: 150,
    },
    {
      id: "11",
      title: "Eleceed",
      author: "Son Jeho",
      description:
        "A story about Jiwoo, a kind-hearted young man with a secret power to move at supernatural speeds, and a mysterious cat named Kayden.",
      genres: ["Action", "Comedy", "Supernatural"],
      tags: ["Secret powers", "Cats", "Training"],
      artStyle: "Clean, Expressive",
      status: "Ongoing",
      releaseYear: 2018,
      rating: 9.1,
      popularity: 89,
      coverImage: "/placeholder.svg?height=450&width=300",
      chapters: 200,
    },
    {
      id: "12",
      title: "Hardcore Leveling Warrior",
      author: "Sehoon Kim",
      description:
        "The story of the former number one ranked player in the game Lucid Adventure who loses all his powers and items and must start from scratch.",
      genres: ["Action", "Adventure", "Fantasy", "Game"],
      tags: ["Virtual reality", "Level up", "Revenge"],
      artStyle: "Colorful, Game-like",
      status: "Completed",
      releaseYear: 2016,
      rating: 8.6,
      popularity: 86,
      coverImage: "/placeholder.svg?height=450&width=300",
      chapters: 300,
    },
  ]
}

// Public API functions
// export async function getAllManhwa(): Promise<Manhwa[]> { // Remove this duplicate
//   return await loadCSVData()
// }

// export async function getManhwaById(id: string): Promise<Manhwa | undefined> { // Remove this duplicate
//   const data = await loadCSVData()
//   return data.find((manhwa) => manhwa.id === id)
// }

export async function getManhwaByTitle(title: string): Promise<Manhwa[]> {
  const data = await loadCSVData()
  const searchTerm = title.toLowerCase()
  return data.filter((manhwa) => manhwa.title.toLowerCase().includes(searchTerm))
}

// Synchronous versions for backward compatibility (will use cached data)
// Synchronous function to get manhwa by ID from loaded data
export function getManhwaById(id: string): Manhwa | undefined {
  if (!isDataLoaded) {
    console.warn("Attempted to get manhwa by ID before data was loaded. Call loadCSVData first.");
    // Optionally, trigger loading or return undefined/error
    // For now, let's try to load it, though this makes getManhwaById potentially async in effect
    // A better pattern might be to ensure loadCSVData is always called at app startup.
    // However, the current structure seems to rely on it being called by consumers if needed.
    // Given the error, let's assume data *should* be loaded.
  }
  const manhwa = manhwaData.find((m) => m.id === id);
  if (manhwa) {
    return {
      ...manhwa,
      genres: Array.isArray(manhwa.genres) ? manhwa.genres : [],
      tags: Array.isArray(manhwa.tags) ? manhwa.tags : [],
    };
  }
  return undefined;
}

// Synchronous function to get all manhwa data (once loaded)
export function getAllManhwaSync(): Manhwa[] {
  if (!isDataLoaded) {
    console.warn("Attempted to get all manhwa data before it was loaded. Call loadCSVData first.");
    // As above, this indicates a potential lifecycle issue with data loading.
    // Fallback to sample or empty array if not loaded.
    return getSampleData(); // Or return []
  }
  return manhwaData.map(manhwa => ({
    ...manhwa,
    genres: Array.isArray(manhwa.genres) ? manhwa.genres : [],
    tags: Array.isArray(manhwa.tags) ? manhwa.tags : [],
  }));
}

// Asynchronous function to get all manhwa data (loads if needed)
export async function getAllManhwa(): Promise<Manhwa[]> {
  if (!isDataLoaded || manhwaData.length === 0) {
    await loadCSVData();
  }
  return manhwaData.map(manhwa => ({
    ...manhwa,
    genres: Array.isArray(manhwa.genres) ? manhwa.genres : [],
    tags: Array.isArray(manhwa.tags) ? manhwa.tags : [],
  }));
}

export function getManhwaByTitleSync(title: string): Manhwa[] {
  const searchTerm = title.toLowerCase()
  return manhwaData.filter((manhwa) => manhwa.title.toLowerCase().includes(searchTerm))
}
