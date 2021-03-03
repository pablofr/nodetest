'use strict';

const express = require('express');
const router = express.Router();

router.get('/', (req, res, next) => {
    res.status(200).send({
        title: "Linceças TGA Mobile",
        content: "TGA MOBILE"
    });
});

module.exports = router;