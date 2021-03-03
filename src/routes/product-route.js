'use strict';

const express = require('express');
const router = express.Router();
const controller = require('../controllers/product-controller');
const authService = require('../services/auth-service');

router.get('/', controller.get);
router.get('/prodrand', controller.getProdRand);
router.get('/promocoes-home/', controller.getPromo);
router.get('/promocoes-list/', controller.getPromoList);
router.get('/fabricantes/', controller.getFab);
router.get('/grupos/', controller.getGrupo);
router.get('/grupos/list/', controller.getGrupoAll);
router.get('/tipos/', controller.getTipo);
router.get('/:id', controller.getById);
router.get('/similar/:codigo', controller.getSimilarByCodigo);
router.get('/imagens/:codigo', controller.getByIdImg);
router.post('/', controller.post);
router.put('/:id', authService.isAdmin, controller.put);
router.delete('/', authService.isAdmin, controller.delete);

module.exports = router;