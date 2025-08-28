# AmanMap - Morocco Safety & Amenities Heatmap

Community-powered heatmap for safety, amenities, and livability in Morocco. Built with Next.js 15, Mapbox, and MongoDB.

## Features

- **Interactive Heatmap**: Visualize community ratings for safety, amenities, and livability
- **Anonymous Ratings**: Submit ratings for points or areas without revealing personal data
- **Real-time Updates**: Heatmap updates as new ratings are submitted
- **Category Filtering**: Switch between safety, amenities, and livability views
- **Admin Moderation**: Built-in admin panel for content moderation
- **Rate Limiting**: Prevents abuse with 10 submissions per day per user
- **Privacy-First**: Location data is quantized and jittered for privacy

## Tech Stack

- **Frontend**: Next.js 15, React 18, TypeScript, Tailwind CSS
- **Authentication**: NextAuth.js with credentials provider
- **Database**: MongoDB with Mongoose ODM
- **Maps**: Mapbox GL JS with drawing tools
- **Validation**: Zod for schema validation
- **Forms**: React Hook Form
- **Testing**: Vitest + React Testing Library

## Quick Start

### Prerequisites

- Node.js 18+ and pnpm
- MongoDB Atlas account
- Mapbox account with API token

### 1. Clone and Install

```bash
git clone <repository-url>
cd amanmap
pnpm install
```

### 2. Environment Setup

Copy `.env.example` to `.env.local` and fill in your credentials:

```bash
cp .env.example .env.local
```

Required environment variables:
```
NEXT_PUBLIC_MAPBOX_TOKEN=pk.your_mapbox_token_here
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/amanmap
NEXTAUTH_SECRET=your_strong_secret_here
NEXTAUTH_URL=http://localhost:3000
```

### 3. Seed Database

```bash
pnpm seed
```

This creates:
- Admin user: `admin@amanmap.com` / `admin123`
- 10 test users: `user1@example.com` / `user1123` (through user10)
- ~500 sample ratings across Morocco cities
- 5 pending ratings for admin review

### 4. Run Development Server

```bash
pnpm dev
```

Visit:
- **Main App**: http://localhost:3000
- **Admin Panel**: http://localhost:3000/admin

## Usage

### For Users

1. **View Heatmap**: Browse the map to see community ratings
2. **Switch Categories**: Use tabs to view Safety, Amenities, or Livability
3. **Add Ratings**: Sign up/login, click "Add Rating", draw on map, submit scores
4. **Style Options**: Toggle between Light, Dark, and Satellite map styles

### For Admins

1. **Access Admin Panel**: Login with admin credentials, visit `/admin`
2. **Review Pending**: Approve or reject flagged content
3. **Moderate Content**: Delete inappropriate ratings
4. **Monitor Activity**: View approved/rejected ratings

## API Endpoints

### Authentication
- `POST /api/auth/register` - Create new user account
- `POST /api/auth/[...nextauth]` - NextAuth handlers

### Ratings
- `POST /api/ratings` - Submit new rating (auth required)
- `GET /api/ratings` - List ratings (admin only)
- `PATCH /api/ratings/[id]` - Update rating status (admin only)
- `DELETE /api/ratings/[id]` - Delete rating (admin only)
- `POST /api/ratings/flag` - Flag rating for review (auth required)

### Heatmap Data
- `GET /api/heatmap` - Get aggregated heatmap data
  - Query params: `bbox`, `category`, `zoom`

## Security Features

- **Input Validation**: Zod schemas validate all inputs
- **Rate Limiting**: 10 submissions per user per day
- **Profanity Filter**: Basic word filter for notes
- **Location Privacy**: Coordinates quantized to ~100m grid with jitter
- **Authentication**: JWT sessions via NextAuth
- **RBAC**: Role-based access control for admin features

## Database Schema

### User
```typescript
{
  email: string (unique)
  passwordHash: string
  roles: ['user' | 'moderator' | 'admin']
  provider: 'credentials' | 'google'
  timestamps: true
}
```

### Rating
```typescript
{
  userId: ObjectId (ref User)
  geometry: GeoJSON (Point | Polygon)
  centroid: GeoJSON Point (quantized)
  scores: { safety: 0-10, amenities: 0-10, livability: 0-10 }
  note?: string (max 140 chars)
  city?: string
  status: 'pending' | 'approved' | 'rejected'
  deviceId?: string
  timestamps: true
}
```

## Deployment

### Vercel (Recommended)

1. **Push to GitHub**: Commit your code to a GitHub repository

2. **Deploy to Vercel**:
   ```bash
   npx vercel
   ```

3. **Set Environment Variables**: In Vercel dashboard, add all environment variables from `.env.local`

4. **Update NEXTAUTH_URL**: Set to your production domain

### Manual Deployment

1. **Build**:
   ```bash
   pnpm build
   ```

2. **Start**:
   ```bash
   pnpm start
   ```

## Testing

Run tests:
```bash
pnpm test
```

Test coverage includes:
- API route validation
- Geospatial utility functions
- Component rendering
- Authentication flows

## Development

### Project Structure

```
├── app/                    # Next.js app router
│   ├── api/               # API routes
│   ├── admin/             # Admin panel
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Homepage
├── components/            # React components
├── lib/                   # Utilities and configs
├── models/                # Mongoose models
├── hooks/                 # Custom React hooks
├── scripts/               # Database scripts
└── styles/                # Global styles
```

### Key Components

- **Map.tsx**: Main map component with Mapbox integration
- **AuthDialog.tsx**: Login/register modal
- **AddRatingPanel.tsx**: Rating submission form
- **Legend.tsx**: Heatmap legend and disclaimer

### Adding Features

1. **New API Route**: Add to `app/api/`
2. **Database Model**: Add to `models/`
3. **Validation Schema**: Add to `lib/zod-schemas.ts`
4. **UI Component**: Add to `components/`

## Troubleshooting

### Common Issues

1. **Map not loading**: Check `NEXT_PUBLIC_MAPBOX_TOKEN`
2. **Database connection**: Verify `MONGODB_URI` and network access
3. **Authentication issues**: Check `NEXTAUTH_SECRET` and `NEXTAUTH_URL`
4. **Build errors**: Ensure all dependencies are installed with `pnpm install`

### Debug Mode

Set environment variable for detailed logs:
```bash
DEBUG=1 pnpm dev
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details.

## Support

For issues and questions:
- Create an issue on GitHub
- Check the troubleshooting section
- Review the API documentation
