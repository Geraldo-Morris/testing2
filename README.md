# Manhwa Recommendation System

## Overview
This is a Next.js application that provides manhwa recommendations based on user preferences, genres, and similarity calculations.

## Features
- Search for manhwa by title
- Get recommendations based on genres and tags
- View detailed similarity calculations between manhwas
- Filter recommendations by unwanted genres and tags

## Deployment to Netlify

### Prerequisites
- A Netlify account
- Git repository with your project

### Automatic Deployment (Recommended)

1. Push your code to a Git repository (GitHub, GitLab, or Bitbucket)
2. Log in to your Netlify account
3. Click "New site from Git"
4. Select your repository
5. Configure build settings:
   - Build command: `npm run build`
   - Publish directory: `.next`
6. Click "Deploy site"

### Manual Deployment

1. Build your project locally:
   ```
   npm run build
   ```
2. Install Netlify CLI:
   ```
   npm install -g netlify-cli
   ```
3. Login to Netlify:
   ```
   netlify login
   ```
4. Deploy the site:
   ```
   netlify deploy --prod
   ```

## Environment Variables
No environment variables are required for basic functionality.

## Data Source
The application uses a CSV file located in the `public` directory for manhwa data. The file is loaded at runtime.

## Local Development

1. Install dependencies:
   ```
   npm install
   ```
2. Run the development server:
   ```
   npm run dev
   ```
3. Open [http://localhost:3000](http://localhost:3000) in your browser.