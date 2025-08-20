# Notify Me App Expansion: Scholarships & Predefined Feed Categories

## Overview

This expansion adds scholarship functionality and predefined RSS feed categories to make the app more user-friendly for non-technical users. Users can now choose between remote jobs and scholarships, and browse curated feed categories instead of manually entering RSS URLs.

## Key Features Added

### 1. Dual Content Types
- **Jobs**: Remote job opportunities (existing functionality)
- **Scholarships**: Academic scholarships and funding opportunities (new)

### 2. Predefined Feed Categories
- **Job Categories**: Remote Jobs, Tech Jobs, Startup Jobs
- **Scholarship Categories**: General Scholarships, Research Scholarships, International Scholarships, STEM Scholarships, Diversity Scholarships

### 3. User-Friendly Interface
- Homepage with content type selection
- Tabbed preferences page for managing both job and scholarship feeds
- Browse and add feeds from predefined categories
- Separate dashboards for jobs and scholarships

## Database Changes

### New Models

#### 1. PredefinedFeed Model
```javascript
{
  name: String,           // Feed name
  description: String,    // Feed description
  category: String,       // Category (e.g., 'remote-jobs', 'stem-scholarships')
  type: String,          // 'job' or 'scholarship'
  url: String,           // RSS feed URL
  source: String,        // Source name (e.g., 'Remote.co', 'NSF')
  isActive: Boolean      // Whether feed is active
}
```

#### 2. Scholarship Model
```javascript
{
  title: String,         // Scholarship title
  description: String,   // Description
  link: String,         // Application link
  pubDate: Date,        // Publication date
  feed: ObjectId,       // Reference to RssFeed
  categories: [String], // Categories
  amount: String,       // Scholarship amount
  deadline: Date,       // Application deadline
  eligibility: String,  // Eligibility criteria
  level: String,        // Undergraduate, Graduate, PhD, etc.
  country: String,      // Country
  field: String         // Field of study
}
```

### Updated Models

#### RssFeed Model
```javascript
// Added fields:
type: String,           // 'job' or 'scholarship' (default: 'job')
category: String        // Category for predefined feeds
```

## Backend Changes

### New Controllers

#### 1. predefinedFeedController.js
- `getCategories()` - Get all predefined feed categories
- `getFeedsByCategory()` - Get feeds by category
- `addToUserFeeds()` - Add predefined feed to user's feeds
- Admin functions for managing predefined feeds

#### 2. scholarshipController.js
- `getScholarships()` - Get scholarships with filtering
- `getScholarshipCalendar()` - Get calendar data for scholarships
- `getRawScholarshipFeed()` - Get raw scholarship feed data
- `processScholarshipFromRSS()` - Process RSS items into scholarship objects

### New Routes

#### 1. /api/predefined-feeds
- `GET /categories` - Get all categories
- `GET /categories/:type/:category` - Get feeds by category
- `POST /add-to-user` - Add feed to user's list
- Admin routes for managing predefined feeds

#### 2. /api/scholarships
- `GET /` - Get scholarships with filtering
- `GET /calendar` - Get scholarship calendar data
- `GET /raw/:feedId` - Get raw scholarship feed data

### Updated Services

#### rssService.js
- Refactored to handle both jobs and scholarships
- Added `fetchScholarshipsFromRSS()` function
- Generic `fetchItemsFromRSS()` function for reusability

### Updated Worker

#### agenda.js
- Now processes both job and scholarship feeds
- Uses scholarship processing logic to extract details
- Maintains separate tracking for jobs and scholarships

## Frontend Changes

### New Pages

#### 1. Updated Homepage (index.js)
- Content type selection (Jobs vs Scholarships)
- User preference saving
- Modern card-based interface

#### 2. Updated Dashboard (dashboard.js)
- Dynamic content based on selected type
- Scholarship card component
- Unified interface for both content types

#### 3. Updated Preferences (preferences.js)
- Tabbed interface for jobs and scholarships
- Predefined feed category browsing
- Category-based feed selection
- Separate management for each content type

### New Components

#### ScholarshipCard Component
- Displays scholarship information
- Shows amount, deadline, level, country, field
- Color-coded badges for different attributes

## Installation & Setup

### 1. Database Setup
```bash
# Run the predefined feeds seeder
cd backend
node seed-predefined-feeds.js
```

### 2. Environment Variables
No new environment variables required.

### 3. Dependencies
No new dependencies required.

## Usage

### For Users

1. **Choose Content Type**: On homepage, select between Jobs or Scholarships
2. **Browse Categories**: In preferences, browse predefined feed categories
3. **Add Feeds**: Click the plus button to add feeds from categories
4. **Manage Feeds**: Use the existing RSS feed management interface
5. **View Content**: Dashboard shows content based on selected type

### For Administrators

1. **Manage Predefined Feeds**: Use admin routes to add/update/delete predefined feeds
2. **Monitor Processing**: Check worker logs for both job and scholarship processing
3. **Update Categories**: Modify the seeder script to add new categories

## API Endpoints

### Predefined Feeds
```
GET /api/predefined-feeds/categories?type=job
GET /api/predefined-feeds/categories?type=scholarship
GET /api/predefined-feeds/categories/job/remote-jobs
POST /api/predefined-feeds/add-to-user
```

### Scholarships
```
GET /api/scholarships?date=2024-01-01&level=undergraduate
GET /api/scholarships/calendar?month=1&year=2024
GET /api/scholarships/raw/:feedId
```

### Updated User Routes
```
GET /api/user/rss-feeds?type=job
GET /api/user/rss-feeds?type=scholarship
```

## Data Processing

### Scholarship Processing
The system automatically extracts scholarship details from RSS content:
- **Amount**: Extracts monetary values using regex patterns
- **Deadline**: Finds application deadlines in content
- **Level**: Identifies academic level (undergraduate, graduate, etc.)
- **Country**: Detects country mentions
- **Field**: Identifies field of study

### Feed Categories
Predefined categories help users find relevant feeds:
- **Jobs**: remote-jobs, tech-jobs, startup-jobs
- **Scholarships**: general-scholarships, research-scholarships, international-scholarships, stem-scholarships, diversity-scholarships

## Migration Notes

### Existing Users
- Existing RSS feeds will be marked as type 'job' by default
- Users can add scholarship feeds through the new interface
- No data loss or breaking changes

### Database Migration
- New fields are added with defaults
- Existing data remains intact
- No migration script required

## Future Enhancements

1. **Advanced Filtering**: More sophisticated scholarship filtering
2. **Deadline Alerts**: Special notifications for approaching deadlines
3. **Application Tracking**: Track scholarship applications
4. **More Categories**: Additional predefined categories
5. **Feed Validation**: Validate RSS feeds before adding
6. **Analytics**: Track which feeds are most popular

## Troubleshooting

### Common Issues

1. **Feeds Not Loading**: Check if RSS URLs are accessible
2. **Scholarship Processing**: Verify RSS feed format
3. **Worker Issues**: Check MongoDB connection and agenda logs

### Debug Commands
```bash
# Check predefined feeds
curl http://localhost:4000/api/predefined-feeds/categories?type=job

# Test scholarship processing
curl http://localhost:4000/api/scholarships

# Check worker status
# Look for agenda logs in console
```

## Contributing

When adding new predefined feeds:
1. Update the seeder script
2. Test the RSS feed URL
3. Verify the feed type and category
4. Run the seeder to populate the database

## License

This expansion maintains the same license as the original project. 