# CLAUDE.md - Archive Browser Project Guide

## Project Overview

A modern video archive browser application for the Ragtag Archive (archive.ragtag.moe). Built with Next.js 14, React 18, Tailwind CSS, and Supabase for user features.

**Primary Language**: TypeScript with Traditional Chinese (繁體中文) UI/comments

## Quick Start

```bash
npm install    # Install dependencies
npm run dev    # Start development server (localhost:3000)
npm run build  # Production build
npm run lint   # Run ESLint
```

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **UI**: React 18, Tailwind CSS, Radix UI primitives
- **Animation**: Framer Motion
- **Backend**: Supabase (auth, favorites, playlists, watch history)
- **API**: Ragtag Archive API (Elasticsearch-based search)

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── page.tsx           # Home page (latest videos)
│   ├── search/            # Search page
│   ├── watch/[id]/        # Video player page
│   ├── channel/[id]/      # Channel page
│   ├── favorites/         # User favorites
│   ├── playlists/         # User playlists
│   ├── history/           # Watch history
│   └── settings/          # User settings
├── components/
│   ├── ui/                # Reusable UI components (shadcn/ui style)
│   ├── video/             # Video-related components
│   ├── auth/              # Authentication components
│   ├── features/          # Feature components
│   └── layout/            # Layout components
├── lib/
│   ├── api.ts             # Ragtag Archive API client
│   ├── supabase.ts        # Supabase client & database operations
│   ├── types.ts           # TypeScript type definitions
│   └── utils.ts           # Utility functions
├── hooks/                 # Custom React hooks
└── contexts/              # React contexts (Theme, Auth)
```

## Key Files

- `src/lib/api.ts` - API client for video search, URL generation
- `src/lib/supabase.ts` - Database operations (favorites, playlists, history)
- `src/lib/types.ts` - All TypeScript interfaces
- `src/contexts/AuthContext.tsx` - Authentication state management
- `src/contexts/ThemeContext.tsx` - Dark/light theme management

## API Architecture

### Ragtag Archive API
- Base URL: `https://archive.ragtag.moe/api`
- Content URL: `https://content.archive.ragtag.moe`
- Uses Next.js rewrites for CORS proxy in client-side calls

### Key API Functions
```typescript
searchVideos(options)      // Search with query, filters, sorting
getVideoById(videoId)      // Get single video metadata
getChannelVideos(channelId) // Get videos by channel
getThumbnailUrl(...)       // Generate thumbnail URLs
getVideoUrl(...)           // Generate video file URLs
```

### Supabase Tables
- `favorites` - User video favorites
- `playlists` - User playlists
- `playlist_items` - Videos in playlists
- `watch_history` - Watch progress tracking
- `user_profiles` - User display names/avatars

## Type Definitions

### Core Video Types
```typescript
interface VideoMetadata {
  video_id: string;
  channel_name: string;
  channel_id: string;
  title: string;
  description: string;
  duration: number;
  upload_date: string;
  files: VideoFile[];
  drive_base?: string;
  // ... more fields
}

interface SearchOptions {
  query?: string;
  videoId?: string;
  channelId?: string;
  sort?: SortField;
  sortOrder?: SortOrder;
  from?: number;
  size?: number;
}
```

## Environment Variables

```env
NEXT_PUBLIC_SUPABASE_URL=<supabase-url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<supabase-anon-key>
NEXT_PUBLIC_API_BASE_URL=https://archive.ragtag.moe
NEXT_PUBLIC_CONTENT_BASE_URL=https://content.archive.ragtag.moe
```

## Code Conventions

### Path Alias
Use `@/*` for imports from `src/*`:
```typescript
import { Button } from "@/components/ui/button";
import { searchVideos } from "@/lib/api";
```

### Component Pattern
- UI components in `src/components/ui/` follow shadcn/ui patterns
- Use Radix UI primitives for accessibility
- Apply variants with `class-variance-authority`

### Styling
- Tailwind CSS with custom theme extending CSS variables
- Dark mode via class strategy (`dark:` prefix)
- Custom colors: `dark-primary`, `dark-secondary`, `accent`

### Error Handling
- Supabase operations check for `PGRST116` (not found) errors
- API calls throw errors with Chinese messages
- Components should handle loading/error states

## Common Tasks

### Add a new page
1. Create directory in `src/app/`
2. Add `page.tsx` with `"use client"` if client-side
3. Use existing layout from `src/app/layout.tsx`

### Add a new UI component
1. Create in `src/components/ui/`
2. Follow existing patterns (variants, forwardRef, cn utility)
3. Export from component file

### Add new API endpoint integration
1. Add types to `src/lib/types.ts`
2. Add fetch function to `src/lib/api.ts`
3. Create custom hook in `src/hooks/` if needed

### Add Supabase table operation
1. Add types to `src/lib/types.ts`
2. Add CRUD functions to `src/lib/supabase.ts`
3. Check `isSupabaseConfigured` before operations

## Notes

- Video URLs follow pattern: `{CONTENT_BASE_URL}/{drive_base}/{video_id}/{filename}`
- Thumbnails: `.webp` preferred, `.jpg` fallback
- Chat replay files: `{video_id}.chat.json`
- The app works without Supabase (user features disabled)
