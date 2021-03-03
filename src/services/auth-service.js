'use strict';
const jwt = require('jsonwebtoken');

exports.generateToken = async (data) => {
    return jwt.sign(data, global.SALT_KEY, { expiresIn: '1d' });
}

exports.decodeToken = async (token) => {
    var data = await jwt.verify(token, global.SALT_KEY);
    return data;
}

exports.authorize2 = function (req, res, next) {
    var token = req.body.token || req.query.token || req.headers['x-access-token'];

    if (!token) {
        res.status(401).json({
            message: 'Acesso Restrito'
        });
    } else {
        jwt.verify(token, global.SALT_KEY, function (error, decoded) {
            if (error) {
                res.status(401).json({
                    message: 'Token Inválido'
                });
            } else {
                next();
            }
        });
    }
};

exports.authorize = function (req, res, next) {
    var key = req.body.key || req.query.key || req.headers['token'];

    if (!key) {
        res.status(401).json({
            message: 'Acesso Restrito'
        });
    } else {
        if (key == global.KEY){
            next();
        }
        else{
            res.status(401).json({
                message: 'Token Inválido'
            }); 
        }
    }
};

exports.isAdmin = function (req, res, next) {
    var token = req.body.token || req.query.token || req.headers['x-access-token'];

    if (!token) {
        res.status(401).json({
            message: 'Token Inválido'
        });
    } else {
        jwt.verify(token, global.SALT_KEY, function (error, decoded) {
            if (error) {
                res.status(401).json({
                    message: 'Token Inválido'
                });
            } else {
                if (decoded.roles.includes('admin')) {
                    next();
                } else {
                    res.status(403).json({
                        message: 'Esta funcionalidade é restrita para administradores'
                    });
                }
            }
        });
    }
};