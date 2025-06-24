import type { Manhwa } from "./types"

// We'll store the CSV data here once loaded
let manhwaData: Manhwa[] = []
let isDataLoaded = false

// CSV file path - use relative URL path for production compatibility
const CSV_PATH = "https://testing-phi-beryl.vercel.app/manhwa_data.csv"

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

        // Parse title_synonyms as an array
        const titleSynonyms = rowData["title_synonyms"] ? 
          rowData["title_synonyms"].split(",").map(s => s.trim()).filter(Boolean) : 
          [];

        // Map to our Manhwa interface with flexible column mapping
        const manhwa: Manhwa = {
          id: rowData["id"] || i.toString(),
          title: rowData["title_romaji"] || rowData["title_english"] || rowData["title_native"] || "Unknown Title",
          title_english: rowData["title_english"] || "",
          title_native: rowData["title_native"] || "",
          title_synonyms: titleSynonyms,
          author: "Unknown Author", // Not provided in current CSV
          description: rowData["description"] || "No description available.",
          genres: (rowData["genres"] || "").split(",").map(g => g.trim()).filter(Boolean),
          tags: (rowData["tags"] || "").split(",").map(t => t.trim()).filter(Boolean),
          releaseYear: parseInt(rowData["start_year"]) || new Date().getFullYear(),
          coverImage: rowData["cover_image_url"] || "/placeholder.jpg"
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
      title_english: "Solo Leveling",
      title_native: "나 혼자만 레벨업",
      title_synonyms: ["I Level Up Alone", "Only I Level Up"],
      author: "Chugong",
      description:
        "10 years ago, after 'the Gate' that connected the real world with the monster world opened, some of the ordinary, everyday people received the power to hunt monsters within the Gate. They are known as 'Hunters'. However, not all Hunters are powerful. My name is Sung Jin-Woo, an E-rank Hunter. I'm someone who has to risk his life in the lowliest of dungeons, the 'World's Weakest'. Having no skills whatsoever to display, I barely earned the required money by fighting in low-level dungeons… at least until I found a hidden dungeon with the hardest difficulty within the D-rank dungeons! In the end, as I was accepting death, I suddenly received a strange power, a quest log that only I could see, a secret to leveling up that only I know about! If I trained in accordance with my quests and hunted monsters, my level would rise. Changing from the weakest Hunter to the strongest S-rank Hunter!",
      genres: ["Action", "Adventure", "Fantasy"],
      tags: ["Male Protagonist", "Dungeons", "Monsters", "System"],
      releaseYear: 2018,
      coverImage: "https://example.com/solo-leveling.jpg",
    },
    {
      id: "2",
      title: "Tower of God",
      title_english: "Tower of God",
      title_native: "신의 탑",
      title_synonyms: ["Sinui Tap", "Tower of God"],
      author: "SIU",
      description:
        "The story of a boy who enters a mysterious tower, climbing it to find the girl who entered it before him.",
      genres: ["Action", "Adventure", "Fantasy", "Mystery"],
      tags: ["Tower climbing", "Tests", "Betrayal"],
      releaseYear: 2010,
      coverImage: "/placeholder.svg?height=450&width=300",
    },
    {
      id: "3",
      title: "The God of High School",
      title_english: "The God of High School",
      title_native: "갓 오브 하이스쿨",
      title_synonyms: ["GOH", "God of High School"],
      author: "Yongje Park",
      description:
        "A high school student and his friends compete in an epic tournament borrowing power from the gods and uncovering a mysterious organization.",
      genres: ["Action", "Martial Arts", "Supernatural"],
      tags: ["Tournament", "Gods", "Friendship"],
      releaseYear: 2011,
      coverImage: "/placeholder.svg?height=450&width=300",
    },
    {
      id: "4",
      title: "Noblesse",
      title_english: "Noblesse",
      title_native: "노블레스",
      title_synonyms: [],
      author: "Son Jeho",
      description:
        "After 820 years of slumber, Cadis Etrama Di Raizel awakens in modern-day South Korea, starting a new life as a high school student.",
      genres: ["Action", "Supernatural", "Comedy", "School Life"],
      tags: ["Vampires", "Nobility", "Friendship"],
      releaseYear: 2007,
      coverImage: "/placeholder.svg?height=450&width=300",
    },
    {
      id: "5",
      title: "The Breaker",
      title_english: "The Breaker",
      title_native: "브레이커",
      title_synonyms: [],
      author: "Jeon Geuk-Jin",
      description:
        "A martial arts manhwa about a weak high school student who meets a mysterious martial arts teacher.",
      genres: ["Action", "Martial Arts", "School Life"],
      tags: ["Training", "Secret organizations", "Revenge"],
      releaseYear: 2007,
      coverImage: "/placeholder.svg?height=450&width=300",
    },
    {
      id: "6",
      title: "Sweet Home",
      title_english: "Sweet Home",
      title_native: "스위트홈",
      title_synonyms: [],
      author: "Kim Carnby",
      description:
        "After losing his family, a reclusive high school student is forced to leave his home when a monster apocalypse threatens to destroy humanity.",
      genres: ["Horror", "Thriller", "Supernatural"],
      tags: ["Monsters", "Survival", "Humanity"],
      releaseYear: 2017,
      coverImage: "/placeholder.svg?height=450&width=300",
    },
    {
      id: "7",
      title: "Omniscient Reader's Viewpoint",
      title_english: "Omniscient Reader's Viewpoint",
      title_native: "전지적 독자 시점",
      title_synonyms: ["ORV", "Omniscient Reader"],
      author: "Sing Shong",
      description:
        "A novel reader becomes the sole person who knows how the world will end and struggles to change the course of the story.",
      genres: ["Action", "Adventure", "Fantasy"],
      tags: ["Apocalypse", "Novel world", "Survival game"],
      releaseYear: 2020,
      coverImage: "/placeholder.svg?height=450&width=300",
    },
    {
      id: "8",
      title: "Bastard",
      title_english: "Bastard",
      title_native: "바스타드",
      title_synonyms: [],
      author: "Kim Carnby",
      description:
        "A boy tries to hide the fact that his father is a serial killer while attempting to rescue people from becoming his father's next victims.",
      genres: ["Thriller", "Horror", "Psychological"],
      tags: ["Serial killers", "Family", "Trauma"],
      releaseYear: 2014,
      coverImage: "/placeholder.svg?height=450&width=300",
    },
    {
      id: "9",
      title: "Lookism",
      title_english: "Lookism",
      title_native: "외모지상주의",
      title_synonyms: ["Oemojisonjuui"],
      author: "Park Tae-jun",
      description:
        "A high school student who is bullied for his appearance wakes up with two bodies that he can switch between at will.",
      genres: ["Drama", "School Life", "Comedy"],
      tags: ["Appearance", "Bullying", "Social hierarchy"],
      releaseYear: 2014,
      coverImage: "/placeholder.svg?height=450&width=300",
    },
    {
      id: "10",
      title: "The Beginning After the End",
      title_english: "The Beginning After the End",
      title_native: "",
      title_synonyms: ["TBATE"],
      author: "TurtleMe",
      description:
        "A king in his previous life is reborn into a world of magic and monsters, determined to live his new life to the fullest.",
      genres: ["Action", "Adventure", "Fantasy"],
      tags: ["Reincarnation", "Magic", "Coming of age"],
      releaseYear: 2018,
      coverImage: "/placeholder.svg?height=450&width=300",
    },
    {
      id: "11",
      title: "Eleceed",
      title_english: "Eleceed",
      title_native: "일렉시드",
      title_synonyms: [],
      author: "Son Jeho",
      description:
        "A story about Jiwoo, a kind-hearted young man with a secret power to move at supernatural speeds, and a mysterious cat named Kayden.",
      genres: ["Action", "Comedy", "Supernatural"],
      tags: ["Secret powers", "Cats", "Training"],
      releaseYear: 2018,
      coverImage: "/placeholder.svg?height=450&width=300",
    },
    {
      id: "12",
      title: "Hardcore Leveling Warrior",
      title_english: "Hardcore Leveling Warrior",
      title_native: "하드코어 레벨링 전사",
      title_synonyms: ["HLW", "Hardcorereberingjeonsayi"],
      author: "Sehoon Kim",
      description:
        "The story of the former number one ranked player in the game Lucid Adventure who loses all his powers and items and must start from scratch.",
      genres: ["Action", "Adventure", "Fantasy", "Game"],
      tags: ["Virtual reality", "Level up", "Revenge"],
      releaseYear: 2016,
      coverImage: "/placeholder.svg?height=450&width=300",
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
  return data.filter((manhwa) => {
    // Search across all title fields
    return manhwa.title.toLowerCase().includes(searchTerm) || 
           (manhwa.title_english && manhwa.title_english.toLowerCase().includes(searchTerm)) || 
           (manhwa.title_native && manhwa.title_native.toLowerCase().includes(searchTerm)) || 
           manhwa.title_synonyms.some(synonym => synonym.toLowerCase().includes(searchTerm))
  })
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
  return manhwaData.filter((manhwa) => {
    // Search across all title fields
    return manhwa.title.toLowerCase().includes(searchTerm) || 
           (manhwa.title_english && manhwa.title_english.toLowerCase().includes(searchTerm)) || 
           (manhwa.title_native && manhwa.title_native.toLowerCase().includes(searchTerm)) || 
           manhwa.title_synonyms.some(synonym => synonym.toLowerCase().includes(searchTerm))
  })
}
