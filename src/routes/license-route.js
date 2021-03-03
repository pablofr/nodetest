'use strict';

const express = require('express');
const router = express.Router();
const controller = require('../controllers/license-controller');
const authService = require('../services/auth-service');

// router.get('/', controller.get);
// router.get('/:id', controller.getById);
// router.get('/similar/:codigo', controller.getSimilarByCodigo);
// router.get('/imagens/:codigo', controller.getByIdImg);
// router.post('/', controller.post);
router.post('/getLicense',authService.authorize, controller.getLicense);
// router.put('/:id', authService.isAdmin, controller.put);
// router.delete('/', authService.isAdmin, controller.delete);

module.exports = router;