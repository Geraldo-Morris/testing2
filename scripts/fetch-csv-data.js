// Fetch and analyze the CSV data structure
const csvUrl = "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/manhwa_data-3FB6mhpxCsszncE08ab1OOx2GQq8d3.csv"

async function fetchAndAnalyzeCSV() {
  try {
    console.log("Fetching CSV data...")
    const response = await fetch(csvUrl)
    const csvText = await response.text()

    console.log("CSV fetched successfully. Size:", csvText.length, "characters")

    // Parse CSV manually (simple approach)
    const lines = csvText.split("\n").filter((line) => line.trim())
    const headers = lines[0].split(",").map((h) => h.trim().replace(/"/g, ""))

    console.log("Headers found:", headers)
    console.log("Total rows (including header):", lines.length)
    console.log("Data rows:", lines.length - 1)

    // Analyze first few rows
    console.log("\nFirst 3 data rows:")
    for (let i = 1; i <= Math.min(3, lines.length - 1); i++) {
      const row = lines[i].split(",")
      console.log(`Row ${i}:`, row.slice(0, 5), "...") // Show first 5 columns
    }

    // Show sample of each column
    console.log("\nColumn analysis:")
    const sampleRow = lines[1].split(",")
    headers.forEach((header, index) => {
      console.log(`${header}: "${sampleRow[index] || "N/A"}"`)
    })

    return { headers, lines, csvText }
  } catch (error) {
    console.error("Error fetching CSV:", error)
  }
}

fetchAndAnalyzeCSV()
