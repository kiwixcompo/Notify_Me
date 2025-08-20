const Job = require('../models/Job');
const User = require('../models/User');
const searchService = require('../services/searchService');

// GET /api/jobs - Get jobs for a specific date or today
async function getUserJobs(req, res, next) {
  try {
    const userId = req.userId;
    const User = require('../models/User');
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    const { date, last24h } = req.query;
    let jobs = [];
    if (last24h === 'true') {
      // Fetch jobs from the last 24 hours
      const now = new Date();
      const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      jobs = await Job.find({
        publishedDate: { $gte: dayAgo, $lte: now }
      }).sort({ publishedDate: -1 });
      return res.json({
        jobs,
        last24h: true,
        totalJobs: jobs.length
      });
    }
    let targetDate;
    if (date) {
      // Parse as local time (YYYY-MM-DD)
      const [yyyy, mm, dd] = date.split('-');
      targetDate = new Date(Number(yyyy), Number(mm) - 1, Number(dd));
      if (isNaN(targetDate.getTime())) {
        return res.status(400).json({ error: 'Invalid date format' });
      }
    } else {
      targetDate = new Date();
    }
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);
    jobs = await Job.find({
      publishedDate: {
        $gte: startOfDay,
        $lte: endOfDay
      }
    }).sort({ publishedDate: -1 });
    res.json({
      jobs,
      date: `${startOfDay.getFullYear()}-${String(startOfDay.getMonth() + 1).padStart(2, '0')}-${String(startOfDay.getDate()).padStart(2, '0')}`,
      totalJobs: jobs.length
    });
  } catch (err) {
    console.error('Error in getUserJobs:', err);
    next(err);
  }
}

// GET /api/jobs/calendar - Get job counts for calendar view
async function getJobCalendar(req, res, next) {
  try {
    const userId = req.userId;
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const { month, year, filterByPreferences = true } = req.query;
    
    // Parse month/year or use current
    const targetMonth = month ? parseInt(month) : new Date().getMonth() + 1;
    const targetYear = year ? parseInt(year) : new Date().getFullYear();
    
    // Set date range for the entire month
    const startOfMonth = new Date(targetYear, targetMonth - 1, 1);
    const endOfMonth = new Date(targetYear, targetMonth, 0, 23, 59, 59, 999);

    // Build query
    let query = {
      publishedDate: {
        $gte: startOfMonth,
        $lte: endOfMonth
      }
    };

    // Add preference filtering if requested
    if (filterByPreferences === true && user.jobPreferences && user.jobPreferences.length > 0) {
      const preferenceRegex = user.jobPreferences.map(pref => 
        new RegExp(pref, 'i')
      );
      
      query.$and = [
        {
          $or: [
            { title: { $in: preferenceRegex } },
            { description: { $in: preferenceRegex } }
          ]
        }
      ];
    }

    // Aggregate jobs by date
    const jobCounts = await Job.aggregate([
      { $match: query },
      {
        $group: {
          _id: {
            $dateToString: {
              format: "%Y-%m-%d",
              date: "$publishedDate"
            }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Convert to object for easier frontend consumption
    const calendarData = {};
    jobCounts.forEach(item => {
      calendarData[item._id] = item.count;
    });

    res.json({
      calendarData,
      month: targetMonth,
      year: targetYear,
      filterByPreferences: filterByPreferences === true
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/jobs/stats - Get job statistics
async function getJobStats(req, res, next) {
  try {
    const userId = req.userId;
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const { days = 30 } = req.query;
    
    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    // Build query
    let query = {
      publishedDate: {
        $gte: startDate,
        $lte: endDate
      }
    };

    // Add preference filtering
    if (user.jobPreferences && user.jobPreferences.length > 0) {
      const preferenceRegex = user.jobPreferences.map(pref => 
        new RegExp(pref, 'i')
      );
      
      query.$and = [
        {
          $or: [
            { title: { $in: preferenceRegex } },
            { description: { $in: preferenceRegex } }
          ]
        }
      ];
    }

    // Get total jobs
    const totalJobs = await Job.countDocuments(query);
    
    // Get jobs by source
    const jobsBySource = await Job.aggregate([
      { $match: query },
      {
        $group: {
          _id: "$source",
          count: { $sum: 1 }
        }
      }
    ]);

    // Get jobs by day
    const jobsByDay = await Job.aggregate([
      { $match: query },
      {
        $group: {
          _id: {
            $dateToString: {
              format: "%Y-%m-%d",
              date: "$publishedDate"
            }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: -1 } },
      { $limit: 7 }
    ]);

    res.json({
      totalJobs,
      jobsBySource,
      jobsByDay,
      dateRange: {
        start: startDate.toISOString().split('T')[0],
        end: endDate.toISOString().split('T')[0]
      }
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/jobs/search - Real-time job search from multiple sources
async function searchJobsRealTime(req, res, next) {
  try {
    const { query = '', limit = 50 } = req.query;
    
    // Get real-time search results
    const searchResults = await searchService.searchJobs(query, parseInt(limit));
    
    res.json({
      success: true,
      jobs: searchResults,
      total: searchResults.length,
      query,
      sources: searchResults.map(job => job.source)
    });
  } catch (err) {
    console.error('Error in searchJobsRealTime:', err);
    res.status(500).json({ error: 'Failed to search jobs' });
  }
}

module.exports = { getUserJobs, getJobCalendar, getJobStats, searchJobsRealTime }; 