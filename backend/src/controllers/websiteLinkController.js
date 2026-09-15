const WebsiteLink = require('../models/WebsiteLink');
const { validationResult } = require('express-validator');

// @desc    Get all website links for a user
// @route   GET /api/feeds/website-links
// @access  Private
const getWebsiteLinks = async (req, res) => {
  try {
    const links = await WebsiteLink.find({ user: req.userId });
    res.json(links);
  } catch (err) {
    console.error('Error fetching website links:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Add a new website link
// @route   POST /api/feeds/website-links
// @access  Private
const addWebsiteLink = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { url, title, type } = req.body;

  try {
    const newLink = new WebsiteLink({
      user: req.userId,
      url,
      title: title || '',
      type: type || 'other'
    });

    const savedLink = await newLink.save();
    res.status(201).json(savedLink);
  } catch (err) {
    console.error('Error adding website link:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Update a website link
// @route   PUT /api/feeds/website-links/:id
// @access  Private
const updateWebsiteLink = async (req, res) => {
  const { url, title, type, isActive } = req.body;
  const linkFields = {};
  
  if (url) linkFields.url = url;
  if (title !== undefined) linkFields.title = title;
  if (type) linkFields.type = type;
  if (isActive !== undefined) linkFields.isActive = isActive;

  try {
    let link = await WebsiteLink.findById(req.params.id);

    if (!link) {
      return res.status(404).json({ message: 'Link not found' });
    }

    // Make sure user owns the link
    if (link.user.toString() !== req.userId.toString()) {
      return res.status(401).json({ message: 'Not authorized' });
    }

    link = await WebsiteLink.findByIdAndUpdate(
      req.params.id,
      { $set: linkFields },
      { new: true }
    );

    res.json(link);
  } catch (err) {
    console.error('Error updating website link:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Delete a website link
// @route   DELETE /api/feeds/website-links/:id
// @access  Private
const deleteWebsiteLink = async (req, res) => {
  try {
    const link = await WebsiteLink.findById(req.params.id);

    if (!link) {
      return res.status(404).json({ message: 'Link not found' });
    }

    // Make sure user owns the link
    if (link.user.toString() !== req.userId.toString()) {
      return res.status(401).json({ message: 'Not authorized' });
    }

    await WebsiteLink.findByIdAndDelete(req.params.id);
    res.json({ message: 'Link removed' });
  } catch (err) {
    console.error('Error deleting website link:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  getWebsiteLinks,
  addWebsiteLink,
  updateWebsiteLink,
  deleteWebsiteLink
};

