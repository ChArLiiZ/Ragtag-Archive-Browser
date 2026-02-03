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
- **Icons**: lucide-react
- **Backend**: Supabase (auth, favorites, playlists, watch history)
- **API**: Ragtag Archive API (Elasticsearch-based search)
- **Video**: HLS-capable video player

## Project Structure

```
src/
├── app/                              # Next.js App Router pages
│   ├── api/image/                   # Image proxy API
│   ├── auth/callback/               # OAuth callback
│   ├── channel/[id]/                # Channel videos page
│   ├── favorites/                   # User favorites (search, sort, filter)
│   ├── history/                     # Watch history page
│   ├── playlists/                   # Playlists management
│   │   └── [id]/                    # Individual playlist view
│   ├── search/                      # Search results page
│   ├── settings/                    # User settings
│   ├── watch/[id]/                  # Video player page
│   ├── layout.tsx
│   ├── page.tsx                     # Home page (latest/popular videos)
│   └── globals.css
├── components/
│   ├── auth/                        # LoginModal, UserMenu
│   ├── features/                    # AddToPlaylistModal
│   ├── layout/                      # Header
│   ├── ui/                          # Reusable UI (shadcn/ui style)
│   │   ├── avatar.tsx, button.tsx, card.tsx
│   │   ├── dialog.tsx, dropdown-menu.tsx
│   │   ├── input.tsx, select.tsx, skeleton.tsx
│   └── video/
│       ├── ChatReplay.tsx           # Time-synced chat replay
│       ├── RecommendedVideoCard.tsx # Compact recommendation card
│       ├── RecommendedVideos.tsx    # Smart recommendation engine
│       ├── VideoCard.tsx            # Video card with progress
│       ├── VideoGrid.tsx            # Grid layout
│       └── VideoPlayer.tsx          # HLS video player
├── contexts/
│   ├── AuthContext.tsx              # Authentication state
│   └── ThemeContext.tsx             # Dark/light theme
├── hooks/
│   ├── useFavorites.ts              # Favorite management
│   ├── useSearch.ts                 # Search with pagination
│   ├── useUserLibrary.ts            # Library status (cached)
│   ├── useWatchProgress.ts          # Single video progress
│   └── useWatchProgressBatch.ts     # Batch progress loading
└── lib/
    ├── api.ts                       # Ragtag Archive API client
    ├── supabase.ts                  # Database operations
    ├── types.ts                     # TypeScript definitions
    └── utils.ts                     # Utility functions
```

## Key Files

- `src/lib/api.ts` - API client for video search, URL generation, keyword extraction
- `src/lib/supabase.ts` - Database operations (favorites, playlists, history, profiles)
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
// Search & Fetching
searchVideos(options)           // Search with filters and sorting
getVideoById(videoId)           // Fetch single video metadata
getChannelVideos(channelId)     // Get all videos from a channel
getLatestVideos(size)           // Recently archived videos
getPopularVideos(size)          // Most-viewed videos

// URL Generation
getThumbnailUrl(...)            // Primary thumbnail URL
getFallbackThumbnailUrls(...)   // Multiple fallback thumbnails
getVideoUrl(...)                // Video file URL (MP4/WebM/MKV priority)
getChatUrl(videoId)             // Chat replay JSON URL
getChannelAvatarUrl(channelId)  // Channel profile image
getEmbedUrl(videoId)            // Embedded player URL

// Formatting
formatDuration(seconds)         // HH:MM:SS or MM:SS
formatViewCount(count)          // 1M, 1K, or exact
formatUploadDate(dateStr)       // YYYYMMDD → YYYY/MM/DD
formatRelativeTime(dateString)  // "2 days ago" style
formatFileSize(bytes)           // KB, MB, GB

// Recommendations
extractKeywords(title, max)     // Smart keyword extraction (CJK-aware)
```

### Supabase Tables & Functions

**Tables:**
- `favorites` - User video favorites
- `playlists` - User playlists
- `playlist_items` - Videos in playlists
- `watch_history` - Watch progress tracking
- `user_profiles` - User display names/avatars

**Key Functions:**
```typescript
// Favorites
getFavorites(userId), addFavorite(...), removeFavorite(...), isFavorited(...)

// Playlists
getPlaylists(userId), getPlaylistsWithDetails(userId)  // With thumbnails & counts
createPlaylist(...), updatePlaylist(...), deletePlaylist(...)

// Playlist Items
getPlaylistItems(...), addToPlaylist(...), removeFromPlaylist(...)
getPlaylistPreview(playlistId, limit)  // Thumbnail previews
getPlaylistItemCount(playlistId)

// Watch History
getWatchHistory(...), updateWatchProgress(...), getWatchProgress(...)
getWatchProgressBatch(userId, videoIds)  // Batch fetch
clearWatchHistory(userId)

// Recommendations Support
getUserLibraryVideoIds(userId)           // All favorited/playlist video IDs
getUserPreferredChannels(userId, limit)  // Based on favorites/watch time
getRecentWatchedChannels(userId, ...)    // Recently watched channels

// Profiles
getUserProfile(userId), updateUserProfile(...)
```

## Custom Hooks

### useFavorites
```typescript
const { favorites, loading, error, add, remove, toggle, isFavorited, refresh } = useFavorites()
```

### useSearch
```typescript
const {
  query, sort, sortOrder, page, videos, totalCount, totalPages, loading, error,
  search, setQuery, setSort, setSortOrder, toggleSortOrder,
  goToPage, nextPage, prevPage
} = useSearch({ initialQuery, initialSort, pageSize })
```

### useUserLibrary
```typescript
// Global caching (30s TTL), window focus re-validation
const { favorites, playlistItems, loading, refresh } = useUserLibrary()
// favorites: Set<string>, playlistItems: Set<string>
```

### useWatchProgress
```typescript
// Debounced auto-save (10s interval), skips saves < 5s difference
const { progress, duration, progressPercent, updateProgress, saveImmediately } = useWatchProgress(videoId)
```

### useWatchProgressBatch
```typescript
// Efficient batch loading with cache
const { progressMap, loading, error, getProgressPercent, reload } = useWatchProgressBatch(videoIds)
```

## Type Definitions

### Core Types
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
  view_count?: number;
  like_count?: number;
  dislike_count?: number;
  width?: number;
  height?: number;
  fps?: number;
}

interface SearchOptions {
  query?: string;
  videoId?: string;
  channelId?: string;
  sort?: SortField;  // relevance, archived_timestamp, upload_date, duration, view_count, like_count, dislike_count
  sortOrder?: SortOrder;  // "asc" | "desc"
  from?: number;
  size?: number;
}

interface Playlist {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

interface WatchHistory {
  id: string;
  user_id: string;
  video_id: string;
  progress: number;
  duration: number;
  watched_at: string;
  video_title?: string;
  channel_name?: string;
  thumbnail_url?: string;
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

### Component Patterns
- UI components in `src/components/ui/` follow shadcn/ui patterns
- Use Radix UI primitives for accessibility
- Apply variants with `class-variance-authority`
- Use `forwardRef` for DOM element refs
- Use `cn()` utility for conditional classes

### Styling
- Tailwind CSS with custom theme extending CSS variables
- Dark mode via class strategy (`dark:` prefix)
- Custom colors: `dark-primary`, `dark-secondary`, `accent`

### Error Handling
- Supabase operations check for `PGRST116` (not found) errors
- API calls throw errors with Chinese messages
- Components should handle loading/error states
- Graceful fallback when Supabase not configured (`isSupabaseConfigured`)

### Performance Patterns
- Batch loading with `useWatchProgressBatch()` for multiple videos
- Global caching in `useUserLibrary()` with 30s TTL
- Parallel API calls where possible
- Debounced auto-save for watch progress (10s interval)
- Lazy loading for images
- Skeleton loading states

## Key Features

### Video Cards
- Thumbnail with hover effects and intelligent fallback
- Duration badge, view count, upload date
- Watch progress bar (visual indicator)
- Library indicators: ❤️ for favorited, 📋 for in playlists
- Lazy loading support

### Smart Recommendations (RecommendedVideos)
**Logged-in users:**
- Same channel (4 videos)
- User preferred channels (3 videos)
- Keyword-based (3 videos)
- Recently watched channels (2 videos)

**Guests:**
- Same channel (5 videos)
- Keyword-based (4 videos)
- Popular videos (3 videos)

### Watch Page Features
- HLS video player with progress tracking
- Resume from last position
- Playlist navigation (next/previous/shuffle)
- Auto-play next in playlist
- Favorite toggle and "Add to Playlist" modal
- Expandable description
- Video metadata (resolution, FPS, duration, counts)
- File list with sizes

### Favorites Page
- Grid/list view toggle
- Live search filtering
- Sort by: created_at, title, channel (asc/desc)
- Remove with hover buttons

### Playlists Page
- 2×2 thumbnail preview grid
- Item count badge
- Public/private indicator
- Inline playlist creation
- Delete with confirmation

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

### Add a new custom hook
1. Create in `src/hooks/`
2. Follow naming convention: `use{Feature}.ts`
3. Export state and methods as object
4. Handle loading/error states
5. Consider caching for frequently accessed data

## Notes

- Video URLs: `{CONTENT_BASE_URL}/{drive_base}/{video_id}/{filename}`
- Thumbnails: `.webp` preferred, `.jpg` fallback
- Chat replay files: `{video_id}.chat.json`
- The app works without Supabase (user features disabled)
- Default search sort: `relevance` (when query present)
- Keyword extraction supports CJK text with n-grams and stop word filtering
