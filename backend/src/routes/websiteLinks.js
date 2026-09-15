const express = require('express');
const { check } = require('express-validator');
const { requireAuth } = require('../controllers/userController');
const websiteLinkController = require('../controllers/websiteLinkController');

const router = express.Router();

// @route   GET /api/feeds/website-links
// @desc    Get all website links for the authenticated user
// @access  Private
router.get('/', requireAuth, websiteLinkController.getWebsiteLinks);

// @route   POST /api/feeds/website-links
// @desc    Add a new website link
// @access  Private
router.post(
  '/',
  [
    requireAuth,
    [
      check('url', 'Please include a valid URL').isURL(),
      check('type', 'Please include a valid type').optional().isIn(['job', 'scholarship', 'other'])
    ]
  ],
  websiteLinkController.addWebsiteLink
);

// @route   PUT /api/feeds/website-links/:id
// @desc    Update a website link
// @access  Private
router.put(
  '/:id',
  [
    requireAuth,
    [
      check('url', 'Please include a valid URL').optional().isURL(),
      check('type', 'Please include a valid type').optional().isIn(['job', 'scholarship', 'other']),
      check('isActive', 'isActive must be a boolean').optional().isBoolean()
    ]
  ],
  websiteLinkController.updateWebsiteLink
);

// @route   DELETE /api/feeds/website-links/:id
// @desc    Delete a website link
// @access  Private
router.delete('/:id', requireAuth, websiteLinkController.deleteWebsiteLink);

module.exports = router;
