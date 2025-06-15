import requests
import pandas as pd
import time
import os
import re
from datetime import datetime

# Configure pandas to handle large fields
pd.set_option('display.max_colwidth', None)

def clean_html_tags(text):
    """Remove HTML tags from text and normalize line breaks
    
    Args:
        text (str): Text containing HTML tags
        
    Returns:
        str: Cleaned text without HTML tags
    """
    if pd.isna(text):
        return text
    
    # Remove HTML tags
    clean_text = re.sub(r'<.*?>', ' ', str(text))
    
    # Replace multiple spaces with a single space
    clean_text = re.sub(r'\s+', ' ', clean_text)
    
    # Trim leading/trailing whitespace
    clean_text = clean_text.strip()
    
    return clean_text

# Define the GraphQL endpoint
url = 'https://graphql.anilist.co'

# Define the GraphQL query
query = '''
query ($page: Int, $perPage: Int, $startYear: FuzzyDateInt, $countryOfOrigin: CountryCode) {
  Page(page: $page, perPage: $perPage) {
    pageInfo {
      total
      currentPage
      lastPage
      hasNextPage
      perPage
    }
    media(type: MANGA, countryOfOrigin: $countryOfOrigin, startDate_greater: $startYear, sort: START_DATE_DESC) {
      id
      title {
        romaji
        english
        native
      }
      synonyms
      startDate {
        year
      }
      genres
      tags {
        name
      }
      description
      coverImage {
        extraLarge
        large
        medium
      }
      siteUrl
    }
  }
}
'''

def fetch_manhwa_data(start_year=2010, limit=15000, existing_ids=None):
    """Fetch manhwa data from AniList GraphQL API
    
    Args:
        start_year (int): The year to start fetching data from
        limit (int): Maximum number of manhwa entries to fetch (default: 10)
        
    Returns:
        list: List of manhwa data dictionaries
    """
    if existing_ids is None:
        existing_ids = set()
    all_manhwa = []
    page = 1
    has_next_page = True
    
    print(f"Fetching manhwa data from {start_year} to present...")
    
    while has_next_page:
        # Define the variables for the query
        variables = {
            'page': page,
            'perPage': 50,  # Maximum allowed by AniList API
            'startYear': start_year * 10000,  # Format: YYYYMMDD -> YYYY0000
            'countryOfOrigin': 'KR'  # South Korea
        }
        
        # Make the request
        try:
            response = requests.post(url, json={'query': query, 'variables': variables})
            response.raise_for_status()
            data = response.json()
            
            # Extract the media data
            page_info = data['data']['Page']['pageInfo']
            media_list = data['data']['Page']['media']
            
            # Process each manhwa
            for media in media_list:
                if media['id'] in existing_ids:
                    # print(f"Skipping already existing manhwa ID: {media['id']}") # Optional: for debugging
                    continue

                # Create the site URL with romaji title
                romaji_title = media['title']['romaji'].replace(' ', '-')
                site_url = f"https://anilist.co/manga/{media['id']}/{romaji_title}/"
                
                cover_image_url = None
                if media.get('coverImage'):
                    if media['coverImage'].get('extraLarge'):
                        cover_image_url = media['coverImage']['extraLarge']
                    elif media['coverImage'].get('large'):
                        cover_image_url = media['coverImage']['large']
                    elif media['coverImage'].get('medium'):
                        cover_image_url = media['coverImage']['medium']

                manhwa = {
                    'id': media['id'],
                    'title_romaji': clean_html_tags(media['title']['romaji']),
                    'title_english': clean_html_tags(media['title']['english']),
                    'title_native': clean_html_tags(media['title']['native']),
                    'title_synonyms': clean_html_tags(', '.join(media['synonyms']) if media['synonyms'] else ''),
                    'start_year': media['startDate']['year'],
                    'genres': clean_html_tags(', '.join(media['genres']) if media['genres'] else ''),
                    'tags': clean_html_tags(', '.join([tag['name'] for tag in media['tags']]) if media['tags'] else ''),
                    'description': clean_html_tags(media['description']),
                    'cover_image_url': cover_image_url,
                    'site_url': site_url
                }
                all_manhwa.append(manhwa)
                
                # Check if we've reached the limit
                if len(all_manhwa) >= limit:
                    has_next_page = False
                    break
            
            # Check if there are more pages
            if has_next_page:
                has_next_page = page_info['hasNextPage']
                page += 1
            
            # Print progress
            print(f"Fetched page {page_info['currentPage']} of {page_info['lastPage']}")
            
            # Respect rate limits (2 requests per second)
            time.sleep(0.5)
            
        except requests.exceptions.RequestException as e:
            print(f"Error fetching data: {e}")
            # If we hit a rate limit, wait longer
            if response.status_code == 429:
                print("Rate limit hit, waiting 60 seconds...")
                time.sleep(60)
                continue
            else:
                break
    
    print(f"Fetched {len(all_manhwa)} manhwa entries")
    return all_manhwa

def save_to_csv(data, output_path):
    """Save the manhwa data to a CSV file
    
    Args:
        data (list): List of manhwa data dictionaries
        output_path (str): Path to save the CSV file
    """
    # Convert to DataFrame
    df = pd.DataFrame(data)
    
    # Save to CSV with proper quoting
    df.to_csv(output_path, index=False, quoting=1)  # quoting=1 means quote all non-numeric fields
    print(f"Saved {len(df)} cleaned entries to {output_path}")



def main():
    # Define output paths
    output_dir = r"D:\Myfile\Geral_File\Kuliah\Skripsi\App\test\enhanced_anilist_data"
    os.makedirs(output_dir, exist_ok=True)
    
    # Define output filenames
    current_date = datetime.now().strftime("%Y%m%d")
    all_manhwa_file = os.path.join(output_dir, f"manhwa_{current_date}.csv")
    updated_manhwa_filepath = os.path.join(output_dir, "manhwa_updated.csv")

    existing_ids = set()
    try:
        if os.path.exists(updated_manhwa_filepath):
            existing_df = pd.read_csv(updated_manhwa_filepath)
            existing_ids = set(existing_df['id'].unique())
            print(f"Loaded {len(existing_ids)} existing manhwa IDs.")
        else:
            print(f"'{updated_manhwa_filepath}' not found. Starting fresh scrape for this file.")
    except Exception as e:
        print(f"Error loading existing manhwa data from '{updated_manhwa_filepath}': {e}. Proceeding with fresh scrape.")

    # Fetch data
    # Pass existing_ids to fetch_manhwa_data to skip already fetched items
    manhwa_data = fetch_manhwa_data(start_year=2010, existing_ids=existing_ids)
    
    if manhwa_data:
        # Save all newly fetched manhwa data for the current date
        save_to_csv(manhwa_data, all_manhwa_file)
    else:
        print("No new manhwa data fetched.")
    
    # Optionally merge with existing data
    # Optionally merge with existing data
    if manhwa_data: # Only merge if new data was fetched
        try:
            # Load existing data if it exists, otherwise start with new data
            if os.path.exists(updated_manhwa_filepath):
                existing_manhwa_df = pd.read_csv(updated_manhwa_filepath)
            else:
                # If manhwa_updated.csv doesn't exist, existing_manhwa_df is an empty DataFrame
                # or we can initialize it with the columns of manhwa_data to ensure concat works smoothly
                if manhwa_data:
                    existing_manhwa_df = pd.DataFrame(columns=pd.DataFrame(manhwa_data).columns)
                else: # Should not happen if manhwa_data is empty check above passes
                    existing_manhwa_df = pd.DataFrame()
            
            # Convert newly fetched data to DataFrame
            new_manhwa_df = pd.DataFrame(manhwa_data)
            
            # Merge with new data
            all_manhwa_merged = pd.concat([existing_manhwa_df, new_manhwa_df]).drop_duplicates(subset=['id'], keep='last')
            
            # Save merged data
            all_manhwa_merged.to_csv(updated_manhwa_filepath, index=False, quoting=1)
            
            print(f"Merged data saved to '{updated_manhwa_filepath}'. Total entries: {len(all_manhwa_merged)} manhwa")
        except Exception as e:
            print(f"Error merging with existing data: {e}")
    elif os.path.exists(updated_manhwa_filepath):
        print(f"No new manhwa to merge. '{updated_manhwa_filepath}' remains unchanged.")
    else:
        print("No new manhwa fetched and no existing 'manhwa_updated.csv' to preserve.")


if __name__ == "__main__":
    main()