const express = require('express');
const router = express.Router();
const redirectController = require('../controllers/redirectController');

router.get('/:slug', redirectController.handleRedirect);

module.exports = router;

