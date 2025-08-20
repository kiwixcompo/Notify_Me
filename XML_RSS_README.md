# XML/RSS Feed Support for Notify Me

This document describes the enhanced XML and RSS feed support that has been added to the Notify Me application for both jobs and scholarships.

## Overview

The application now supports:
- **RSS feeds** (traditional RSS 2.0 and Atom formats)
- **XML files** (custom XML formats for jobs and scholarships)
- **Direct XML file uploads** through the API
- **Automatic format detection** based on URL or explicit flags

## Features

### 1. RSS Feed Support
- Traditional RSS 2.0 feeds
- Atom feeds
- Automatic parsing and item extraction
- Support for both job and scholarship feeds

### 2. XML File Support
- Custom XML formats for jobs and scholarships
- Automatic detection of XML structure
- Flexible parsing for various XML layouts
- Support for both remote XML files and direct uploads

### 3. XML Code Support
- Direct XML code input and parsing
- Store and manage XML content in the database
- Edit and update XML code for existing feeds
- Real-time validation of XML syntax and content

### 4. Feed Types
- **Jobs**: `type: 'job'`
- **Scholarships**: `type: 'scholarship'`

### 5. Content Types
- **RSS**: `contentType: 'rss'` (default)
- **XML**: `contentType: 'xml'`
- **Atom**: `contentType: 'atom'`

## API Endpoints

### Add RSS/XML Feed
```http
POST /api/user/rss-feeds
Content-Type: application/json

{
  "url": "https://example.com/feed.xml",
  "name": "My Feed",
  "type": "job",
  "category": "Engineering",
  "isXML": true,
  "contentType": "xml"
}
```

### Upload XML File Directly
```http
POST /api/user/xml-upload
Content-Type: multipart/form-data

xmlFile: [XML file]
type: "job"
name: "My XML Feed"
category: "Engineering"
```

### Add XML Code Directly
```http
POST /api/user/xml-code
Content-Type: application/json

{
  "xmlCode": "<?xml version=\"1.0\"?><jobs><job><title>Software Engineer</title>...</job></jobs>",
  "name": "My Custom XML",
  "type": "job",
  "category": "Engineering"
}
```

### Get XML Code Content
```http
GET /api/user/xml-code/:id
```

### Update XML Code Content
```http
PUT /api/user/xml-code/:id
Content-Type: application/json

{
  "xmlCode": "<?xml version=\"1.0\"?><jobs><job><title>Updated Job</title>...</job></jobs>",
  "name": "Updated Name",
  "category": "Updated Category"
}
```

### Test Feeds
```http
GET /api/user/rss-feeds/test
```

### Get Raw Feed Data
```http
GET /api/user/rss-feeds/raw
GET /api/user/rss-feeds/:id/raw
```

## XML Format Support

### Job XML Format
```xml
<?xml version="1.0" encoding="UTF-8"?>
<jobs>
  <job>
    <title>Software Engineer</title>
    <link>https://example.com/job1</link>
    <description>Job description here</description>
    <pubDate>2024-01-15T10:00:00Z</pubDate>
    <guid>job1</guid>
    <categories>Engineering, Remote</categories>
  </job>
</jobs>
```

### Scholarship XML Format
```xml
<?xml version="1.0" encoding="UTF-8"?>
<scholarships>
  <scholarship>
    <title>Computer Science Scholarship</title>
    <link>https://example.com/scholarship1</link>
    <description>Scholarship description here</description>
    <pubDate>2024-01-20T12:00:00Z</pubDate>
    <guid>scholarship1</guid>
    <categories>Computer Science, Undergraduate</categories>
  </scholarship>
</scholarships>
```

### RSS Format (also supported)
```xml
<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Feed Title</title>
    <link>https://example.com</link>
    <description>Feed description</description>
    <item>
      <title>Item Title</title>
      <link>https://example.com/item</link>
      <description>Item description</description>
      <pubDate>2024-01-15T10:00:00Z</pubDate>
      <guid>item1</guid>
      <category>Category</category>
    </item>
  </channel>
</rss>
```

## Automatic Detection

The system automatically detects the feed type based on:

1. **URL extension**: `.xml` files are automatically marked as XML
2. **Explicit flags**: `isXML: true` or `contentType: 'xml'`
3. **Content analysis**: The system tries to parse content as RSS first, then falls back to XML

## Database Schema Updates

The `RssFeed` model has been enhanced with new fields:

```javascript
{
  user: ObjectId,
  url: String,
  name: String,
  type: String, // 'job' or 'scholarship'
  category: String,
  apiBackupUrl: String,
  isXML: Boolean, // New: indicates if this is an XML file
  contentType: String, // New: 'rss', 'xml', or 'atom'
  xmlContent: String, // New: stores XML content for code-based feeds
  createdAt: Date
}
```

### Feed URL Types

The system now supports three types of feed sources:

1. **RSS/XML URLs**: `https://example.com/feed.xml`
2. **File Uploads**: `uploaded://filename.xml`
3. **Code-based**: `code://feedname-timestamp`

## Worker Updates

The background worker (`agenda.js`) now:
- Processes both RSS and XML feeds
- Automatically detects feed types
- Handles XML parsing for both jobs and scholarships
- Updates the source field to indicate 'xml' vs 'rss'

## Error Handling

The system includes robust error handling:
- Fallback from XML to RSS parsing
- Retry logic for failed requests
- User-friendly error messages
- Graceful degradation when feeds are unavailable

## Testing

Run the XML test script to verify functionality:

```bash
cd backend
node test-xml.js
```

## Dependencies Added

- `xml2js`: XML parsing library
- `multer`: File upload handling

## Usage Examples

### Adding an XML Feed
```javascript
// Add XML feed via URL
const response = await fetch('/api/user/rss-feeds', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    url: 'https://example.com/jobs.xml',
    name: 'Engineering Jobs',
    type: 'job',
    isXML: true
  })
});
```

### Uploading XML File
```javascript
// Upload XML file directly
const formData = new FormData();
formData.append('xmlFile', xmlFile);
formData.append('type', 'job');
formData.append('name', 'My Job Feed');

const response = await fetch('/api/user/xml-upload', {
  method: 'POST',
  body: formData
});
```

### Adding XML Code Directly
```javascript
// Add XML code as a feed
const response = await fetch('/api/user/xml-code', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    xmlCode: `
      <?xml version="1.0" encoding="UTF-8"?>
      <jobs>
        <job>
          <title>Software Engineer</title>
          <link>https://example.com/job</link>
          <description>We are looking for a software engineer</description>
          <pubDate>2024-01-15T10:00:00Z</pubDate>
          <guid>job1</guid>
          <categories>Engineering, Remote</categories>
        </job>
      </jobs>
    `,
    name: 'My Custom Jobs',
    type: 'job',
    category: 'Engineering'
  })
});
```

### Updating XML Code
```javascript
// Update existing XML code feed
const response = await fetch(`/api/user/xml-code/${feedId}`, {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    xmlCode: updatedXMLCode,
    name: 'Updated Feed Name',
    category: 'Updated Category'
  })
});
```

## Frontend Integration

The frontend should be updated to:
- Show feed type indicators (RSS/XML/Code)
- Provide XML file upload interface
- Display content type in feed lists
- Handle XML-specific error messages
- Include XML code input/editor interface
- Show feed source type (URL/File/Code)

## XML Code Benefits

### 1. **Quick Testing**
- Test XML formats without creating files
- Validate XML structure in real-time
- Debug feed issues quickly

### 2. **Custom Feeds**
- Create personalized job/scholarship feeds
- Combine multiple sources into one feed
- Add custom metadata and formatting

### 3. **Development & Debugging**
- Test new XML schemas
- Debug parsing issues
- Validate feed formats before deployment

### 4. **Content Management**
- Edit feed content directly in the application
- Update job/scholarship information
- Maintain feed consistency

## Security Considerations

- File size limits (10MB for XML uploads)
- File type validation (XML only)
- User authentication required for all operations
- Input sanitization for XML content

## Performance

- XML parsing is optimized for large files
- Caching mechanisms for frequently accessed feeds
- Background processing to avoid blocking user requests
- Efficient memory usage for file uploads

## Troubleshooting

### Common Issues

1. **XML not parsing**: Check if the XML structure matches supported formats
2. **Large files**: Ensure files are under 10MB limit
3. **Authentication errors**: Verify user is logged in
4. **Feed not updating**: Check worker is running and feeds are accessible

### Debug Mode

Enable debug logging by setting environment variables:
```bash
DEBUG=xml-parser,feed-worker
```

## Future Enhancements

- Support for more XML formats
- XML schema validation
- Batch XML processing
- XML feed scheduling
- Advanced XML filtering options 