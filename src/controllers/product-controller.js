'use strict';

const fs = require('fs');
const resizeOptimizeImages = require('resize-optimize-images');
const ValidationContract = require('../validators/fluent-validator');
const repository = require('../repositories/product-repository');
const Produto = require("../models/product");
const Fabricante = require("../models/fabricantes");
const Tipo = require("../models/tipos");
const Grupo = require("../models/grupos");
const azure = require('azure-storage');
const guid = require('guid');
var config = require('../config');
var firebird = require('node-firebird');
const conexao = require('../connection/firebird');
const { query } = require('express');




exports.getById = async(req, res, next) => {
    try {
        var pool = firebird.pool(5, conexao.options);
        pool.get(function(err, db) {
            try {db.query(
                "SELECT  P.CODPRD, P.NOMEFANTASIA, P.NUMNOFABRIC, P.NUMNOFABRIC2, "+
                "        P.NUMNOFABRIC3, P.NUMERONOCFO, P.CODFAB, P.CODTIP, P.CODGRUPO, "+
                "        F.NOME AS NOMEFABRICANTE, G.DESCRICAO AS NOMEGRUPO, "+
                "        TP.DESCRICAO AS NOMETIPO, P.DESCRICAO, P.APLICACAO, P.PESOLIQUIDO, "+
                "        P.PESOBRUTO, P.UNIDADE, P.COMPRIMENTO, P.LARGURA, P.ESPESSURA, P.COR, "+
                "        PRI.IDPROMOCAO, PRI.TIPO AS TIPOPROMOCAO, PRI.VALOR AS PRECOPROMOCAO "+
                "FROM TPRODUTO P "+
                "LEFT JOIN TFAB F ON P.CODFAB = F.CODFAB AND P.CODEMPRESA = F.CODEMPRESA "+
                "LEFT JOIN TGRUPO G ON P.CODGRUPO = G.CODGRUPO AND P.CODEMPRESA = F.CODEMPRESA "+
                "LEFT JOIN TTIPOPROD TP ON P.CODTIP = TP.CODTIPO AND P.CODEMPRESA = TP.CODEMPRESA "+
                "LEFT JOIN TPROMITEM PRI ON P.CODEMPRESA = PRI.CODEMPRESA AND P.CODPRD = PRI.CODPRD AND PRI.IDPROMOCAO = ( "+
                "            SELECT FIRST 1 IIF(PRD.NAOCONSSALDO = 'T', PR.IDPROMOCAO, IIF(PR.QTD_EXISTENTE > 0,PR.IDPROMOCAO,0)) AS IDPROMOCAO "+
                "            FROM TPROMOCAO PRD "+
                "            LEFT JOIN TPROMITEM PR ON PR.CODEMPRESA = PRD.CODEMPRESA AND PRD.IDPROMOCAO = PR.IDPROMOCAO "+
                "            WHERE   PR.INATIVO <> 'T' AND "+
                "                    PRD.INATIVO <> 'T' AND "+
                "                    PRD.DTA_INICIO <= CURRENT_DATE AND "+
                "                    PRD.DTA_TERMINIO >= CURRENT_DATE AND "+
                "                    PR.CODEMPRESA = P.CODEMPRESA AND "+
                "                    PR.CODPRD = P.CODPRD "+
                "            ORDER BY 1 DESC) "+
                "LEFT JOIN TPROMOCAO PRO ON PRI.CODEMPRESA = PRO.CODEMPRESA AND PRI.IDPROMOCAO = PRO.IDPROMOCAO "+
                "WHERE P.CODPRD = ? ", req.params.id, function(err, result){
                    try {
                        if (err) {return res.status(400).send({error:"Ocorreu um erro ao tentar fazer a consulta. Erro : " +err.toString});}    
                        if (result != undefined) {
                            console.log('Numero de Linhas: '+result.length);
                            function writeConsulta (i){
                                return new Promise((resolve, reject) => {
                                    var prod = new Produto();
                                    let buffersAplicacao = [];
                                    let buffersDescricao = [];
                                    prod.codigo = conexao.convertBuffer(result[i].CODPRD);
                                    prod.nomefantasia = conexao.convertBuffer(result[i].NOMEFANTASIA);
                                    prod.reffabric1 = conexao.convertBuffer(result[i].NUMNOFABRIC);
                                    prod.reffabric2 = conexao.convertBuffer(result[i].NUMNOFABRIC2);
                                    prod.reffabric3 = conexao.convertBuffer(result[i].NUMNOFABRIC3);
                                    prod.reffornec = conexao.convertBuffer(result[i].NUMERONOCFO);
                                    prod.codfab = conexao.convertBuffer(result[i].CODFAB);
                                    prod.codtip = conexao.convertBuffer(result[i].CODTIP);
                                    prod.codgrupo = conexao.convertBuffer(result[i].CODGRUPO);
                                    prod.nomefabricante = conexao.convertBuffer(result[i].NOMEFABRICANTE);
                                    prod.nomegrupo = conexao.convertBuffer(result[i].NOMEGRUPO);
                                    prod.nometipo = conexao.convertBuffer(result[i].NOMETIPO);
                                    prod.descricao = conexao.convertBuffer(result[i].DESCRICAO);
                                    prod.aplicacao = conexao.convertBuffer(result[i].APLICACAO);
                                    prod.pesoliquido = (result[i].PESOLIQUIDO);
                                    prod.pesobruto = (result[i].PESOBRUTO);
                                    prod.unidade = conexao.convertBuffer(result[i].UNIDADE);
                                    prod.comprimento = (result[i].COMPRIMENTO);
                                    prod.largura = (result[i].LARGURA);
                                    prod.espessura = (result[i].ESPESSURA);
                                    prod.cor = conexao.convertBuffer(result[i].COR);
                                    prod.idpromocao = (result[i].IDPROMOCAO);
                                    prod.tipopromocao = conexao.convertBuffer(result[i].TIPOPROMOCAO);
                                    prod.precopromocao = (result[i].PRECOPROMOCAO);

                                    function readDescricao(){
                                        return new Promise((resolve, reject) => {
                                            if(reject)('erro na execucao (descricao');
                                            if(result[0].DESCRICAO != undefined)
                                                result[0].DESCRICAO(function(err, name, e){
                                                if(err)
                                                    throw err;
                                                e.on('data', function(chunk){
                                                    buffersDescricao.push(chunk);
                                                });
                                                e.on('end', function(){
                                                    let buffer = Buffer.concat(buffersDescricao);                                            
                                                    prod.descricao = buffer.toString();
                                                    resolve(prod);            
                                                });
                                                e.on('error', (err) => {
                                                    reject('erro na leitura da descricao: '+err);
                                                });
                                            })
                                            else {
                                                prod.descricao = null
                                                resolve(prod);
                                            }                                    
                                        })                            
                                    }
                                    function readAplicacao(){
                                        return new Promise((resolve, reject) => {
                                            if(reject)('erro na execucao (aplicacao)');
                                            if(result[0].APLICACAO != undefined)
                                                result[0].APLICACAO(function(err, name, e){
                                                    if(err)
                                                        throw err;
                                                    e.on('data', function(chunk){
                                                        buffersAplicacao.push(chunk);
                                                    });
                                                    e.on('end', function(){
                                                        let buffer = Buffer.concat(buffersAplicacao);                                            
                                                        prod.aplicacao = buffer.toString();
                                                        resolve(prod);            
                                                    });
                                                    e.on('error', (err) => {
                                                        reject('erro na leitura da aplicacao: '+err);
                                                    });
                                                })
                                            else {
                                                prod.aplicacao = null
                                                resolve(prod);
                                            }                                   
                                        })                            
                                    }
                                    const promiseArray = []
                                    // for (let i=0; i<2; i++) 
                                        promiseArray[0] = readDescricao()
                                        promiseArray[1] = readAplicacao()
                                    Promise.all(promiseArray).then(data => resolve(prod));
                                    
                                    // resolve(prod);
                                    if(reject)('erro na consulta sql');
                                })                            
                            }
                            const promiseArray = []
                            for (let i=0; i<result.length; i++) promiseArray[i] = writeConsulta(i)
                            Promise.all(promiseArray).then(data => res.send(JSON.stringify(data)));
                        } else {
                            res.status(400).send({ error: "Não existem dados para ser retornados" });
                        }
                    } catch (e) {
                        console.log(e);
                        res.status(400).send({ error: "Falha ao buscar dados no banco" });
                    }
                });
                db.detach();
            } catch (e) {
                console.log(e);
                res.status(400).send({ error: "Falha na execução de dados: "+e });
            }        
        });
    } catch (e) {
        console.log(e);
        res.status(500).send({ error: "Falha ao carregar os dados de clientes do servidor" });
    }
}

exports.getByIdImg = async(req, res, next) => {
    try {
        var pool = firebird.pool(5, conexao.options);
        pool.get(function(err, db) {
            try {db.query(
                "SELECT * FROM TPRODIMAGEM TI WHERE TI.CODPRD = ? ORDER BY TI.ORDEMPESQUISA, TI.CODIMAGEM ", req.params.codigo, function(err, result){
                    try {
                        if (err) {return res.status(400).send({error:"Ocorreu um erro ao tentar fazer a consulta. Erro : " +err.toString});}    
                        if (result != undefined) {
                            console.log('Numero de Linhas: '+result.length);
                            function writeConsulta (i){
                                return new Promise((resolve, reject) => {
                                    var prod = new Produto();
                                    let buffers = [];
                                    // prod.codigo = conexao.convertBuffer(result[i].CODPRD);
                                    // prod.nomefantasia = conexao.convertBuffer(result[i].NOMEFANTASIA);
                                    // prod.reffabric1 = conexao.convertBuffer(result[i].NUMNOFABRIC);
                                    // prod.reffabric2 = conexao.convertBuffer(result[i].NUMNOFABRIC2);
                                    // prod.reffabric3 = conexao.convertBuffer(result[i].NUMNOFABRIC3);
                                    // prod.reffornec = conexao.convertBuffer(result[i].NUMERONOCFO);
                                    // prod.codfab = conexao.convertBuffer(result[i].CODFAB);
                                    // prod.codtip = conexao.convertBuffer(result[i].CODTIP);
                                    // prod.codgrupo = conexao.convertBuffer(result[i].CODGRUPO);
                                    if(result[i].IMAGEM != undefined)
                                        result[i].IMAGEM(function(err, name, e){
                                            if(err)
                                                throw err;
                                            e.on('data', function(chunk){
                                                buffers.push(chunk);
                                            });
                                            e.on('end', function(){
                                                let buffer = Buffer.concat(buffers);                                            
                                                prod.imagem = buffer.toString('base64');
                                                resolve(prod);            
                                            });
                                            e.on('error', (err) => {
                                                reject('erro de buffer na imagem: '+err);
                                            });
                                        })
                                    else {
                                        prod.imagem = null
                                        resolve(prod);
                                    }
                                    if(reject)('erro na consulta sql');
                                })                            
                            }
                            const promiseArray = []
                            for (let i=0; i<result.length; i++) promiseArray[i] = writeConsulta(i)
                            Promise.all(promiseArray).then(data => res.send(JSON.stringify(data)));
                        } else {
                            res.status(400).send({ error: "Não existem dados para ser retornados" });
                        }
                    } catch (e) {
                        console.log(e);
                        res.status(400).send({ error: "Falha ao buscar dados no banco" });
                    }
                });
                db.detach();
            } catch (e) {
                console.log(e);
                res.status(400).send({ error: "Falha na execução de dados: "+e });
            }        
        });
    } catch (e) {
        console.log(e);
        res.status(500).send({ error: "Falha ao carregar os dados de clientes do servidor" });
    }
}

// exports.getBySlug = async(req, res, next) => {
//     try {
//         var data = await repository.getBySlug(req.params.slug);
//         res.status(200).send(data);
//     } catch (e) {
//         res.status(500).send({
//             message: 'Falha ao processar sua requisição'
//         });
//     }
// }

exports.get = async(req, res, next) => {
    try {
        var produtos = [];
        var pool = firebird.pool(5, conexao.options);
        pool.get(function(err, db) {
            try {db.query(
                "SELECT FIRST 15 SKIP(?*15) P.CODPRD, P.NOMEFANTASIA, P.NUMNOFABRIC, P.NUMNOFABRIC2, "+
                "       P.NUMNOFABRIC3, P.NUMERONOCFO, P.CODFAB, P.CODTIP, P.CODGRUPO, F.NOME AS NOMEFABRIC "+
                //"        (SELECT FIRST 1 TI.IMAGEM FROM TPRODIMAGEM TI WHERE TI.CODPRD = P.CODPRD ORDER BY TI.ORDEMPESQUISA, TI.CODIMAGEM) "+
                "FROM TPRODUTO P "+
                "LEFT JOIN TGRUPO G ON P.CODEMPRESA = G.CODEMPRESA AND P.CODGRUPO = G.CODGRUPO "+
                "LEFT JOIN TFAB F ON P.CODEMPRESA = F.CODEMPRESA AND F.CODFAB = P.CODFAB "+
                "WHERE P.INATIVO <> 'T' AND P.TIPO = 'P' AND G.DESCRICAO = ? "+
                "ORDER BY P.NOMEFANTASIA",                
                [req.query.page, req.query.groupname], function(err, result){
                    try {
                        if (err) {return res.status(400).send({error:"Ocorreu um erro ao tentar fazer a consulta. Erro : " +err.toString});}    
                        if (result != undefined) {
                            console.log('Numero de Linhas: '+result.length);
                            for(var i=0; i<result.length; i++){
                                var prod = new Produto();
                                let buffers = [];
                                prod.codigo = conexao.convertBuffer(result[i].CODPRD);
                                prod.nomefantasia = conexao.convertBuffer(result[i].NOMEFANTASIA);
                                prod.reffabric1 = conexao.convertBuffer(result[i].NUMNOFABRIC);
                                prod.reffabric2 = conexao.convertBuffer(result[i].NUMNOFABRIC2);
                                prod.reffabric3 = conexao.convertBuffer(result[i].NUMNOFABRIC3);
                                prod.reffornec = conexao.convertBuffer(result[i].NUMERONOCFO);
                                prod.codfab = conexao.convertBuffer(result[i].CODFAB);
                                prod.codtip = conexao.convertBuffer(result[i].CODTIP);
                                prod.codgrupo = conexao.convertBuffer(result[i].CODGRUPO);
                                prod.nomefabricante = conexao.convertBuffer(result[i].NOMEFABRIC);

                                let buffer2;     
                                try{ 
                                    let datas = fs.readFileSync('imgs/list/'+prod.codigo+'.jpg');  
                                    //console.log("File content is as follows:"); 
                                    buffer2 = (datas); 
                                    // Display the file data  
                                    //console.log(data);
                                    prod.imagem = buffer2.toString('base64');
                                    // resolve(prod);  
                                }catch(err){ 
                                    console.log('imagem nao encontrada no disco  -  '+err); 
                                    prod.imagem = null
                                    // resolve(prod);
                                }
                                produtos.push(prod);
                            }
                            return res.send(JSON.stringify(produtos));

                            // function writeConsulta (i){
                            //     return new Promise((resolve, reject) => {
                            //         var prod = new Produto();
                            //         let buffers = [];
                            //         prod.codigo = conexao.convertBuffer(result[i].CODPRD);
                            //         prod.nomefantasia = conexao.convertBuffer(result[i].NOMEFANTASIA);
                            //         prod.reffabric1 = conexao.convertBuffer(result[i].NUMNOFABRIC);
                            //         prod.reffabric2 = conexao.convertBuffer(result[i].NUMNOFABRIC2);
                            //         prod.reffabric3 = conexao.convertBuffer(result[i].NUMNOFABRIC3);
                            //         prod.reffornec = conexao.convertBuffer(result[i].NUMERONOCFO);
                            //         prod.codfab = conexao.convertBuffer(result[i].CODFAB);
                            //         prod.codtip = conexao.convertBuffer(result[i].CODTIP);
                            //         prod.codgrupo = conexao.convertBuffer(result[i].CODGRUPO);

                            //         let buffer2;     
                            //         try{ 
                            //             let datas = fs.readFileSync('imgs/list/'+prod.codigo+'.jpg');  
                            //             //console.log("File content is as follows:"); 
                            //             buffer2 = (datas); 
                            //             // Display the file data  
                            //             //console.log(data);
                            //             prod.imagem = buffer2.toString('base64');
                            //             resolve(prod);  
                            //         }catch(err){ 
                            //             console.log('imagem nao encontrada no disco  -  '+err); 
                            //             prod.imagem = null
                            //             resolve(prod);
                            //         }
                                     
                            //         // if(result[i].IMAGEM != undefined)
                            //         //     result[i].IMAGEM(function(err, name, e){
                            //         //         if(err)
                            //         //             throw err;
                            //         //         e.on('data', function(chunk){
                            //         //             buffers.push(chunk);
                            //         //         });
                            //         //         e.on('end', function(){
                            //         //             let buffer = Buffer.concat(buffers); 
                            //         //             prod.imagem = buffer2.toString('base64');
                            //         //             resolve(prod);      
                            //         //         });
                            //         //         e.on('error', (err) => {
                            //         //             reject('erro de buffer na imagem: '+err);
                            //         //         });
                            //         //     })
                            //         // else {
                            //         //     prod.imagem = null
                            //         //     resolve(prod);
                            //         // }
                            //         if(reject)('erro na consulta sql');
                            //     })                            
                            // }
                            // const promiseArray = []
                            // for (let i=0; i<result.length; i++) promiseArray[i] = writeConsulta(i)
                            // Promise.all(promiseArray).then(data => res.send(JSON.stringify(data)));
                                                
                            // function freeze(time) {
                            //     const stop = new Date().getTime() + time;
                            //     while(new Date().getTime() < stop);       
                            // }                        
                            // console.log("freeze 3s");
                            // freeze(50000);            
                        
                        } else {
                            res.status(400).send({ error: "Não existem dados para ser retornados" });
                        }
                    } catch (e) {
                        console.log(e);
                        res.status(400).send({ error: "Falha ao buscar dados no banco" });
                    }
                });
                db.detach();
            } catch (e) {
                console.log(e);
                res.status(400)
                .send({ error: "Ocorreu um erro ao gerar o pool conexões! Falha na conexão com Banco" });
            }
        });        
    } catch (e) {
        console.log(e);
        res.status(500).send({ error: "Falha ao carregar os dados de clientes do servidor" });
    }
}

exports.getProdRand = async(req, res, next) => {
    try {
        var produtos = [];
        var pool = firebird.pool(5, conexao.options);
        pool.get(function(err, db) {
            try {db.query(
                "SELECT FIRST 6 SKIP(trunc(rand()*10)*6) P.CODPRD, P.NOMEFANTASIA, P.NUMNOFABRIC, P.NUMNOFABRIC2, P.NUMNOFABRIC3, P.NUMERONOCFO, P.CODFAB, P.CODTIP, P.CODGRUPO "+
                "FROM TPRODUTO P "+
                "LEFT JOIN TGRUPO G ON P.CODGRUPO = G.CODGRUPO "+
                "WHERE P.INATIVO <> 'T' AND P.TIPO = 'P' "+
                "ORDER BY P.NOMEFANTASIA",                
                [req.query.page], function(err, result){
                    try {
                        if (err) {return res.status(400).send({error:"Ocorreu um erro ao tentar fazer a consulta. Erro : " +err.toString});}    
                        if (result != undefined) {
                            console.log('Numero de Linhas: '+result.length);
                            for(var i=0; i<result.length; i++){
                                var prod = new Produto();
                                let buffers = [];
                                prod.codigo = conexao.convertBuffer(result[i].CODPRD);
                                prod.nomefantasia = conexao.convertBuffer(result[i].NOMEFANTASIA);
                                prod.reffabric1 = conexao.convertBuffer(result[i].NUMNOFABRIC);
                                prod.reffabric2 = conexao.convertBuffer(result[i].NUMNOFABRIC2);
                                prod.reffabric3 = conexao.convertBuffer(result[i].NUMNOFABRIC3);
                                prod.reffornec = conexao.convertBuffer(result[i].NUMERONOCFO);
                                prod.codfab = conexao.convertBuffer(result[i].CODFAB);
                                prod.codtip = conexao.convertBuffer(result[i].CODTIP);
                                prod.codgrupo = conexao.convertBuffer(result[i].CODGRUPO);

                                let buffer2;     
                                try{ 
                                    let datas = fs.readFileSync('imgs/list/'+prod.codigo+'.jpg');  
                                    buffer2 = (datas); 
                                    prod.imagem = buffer2.toString('base64');
                                }catch(err){ 
                                    console.log('imagem nao encontrada no disco  -  '+err); 
                                    prod.imagem = null
                                }
                                produtos.push(prod);
                            }
                            return res.send(JSON.stringify(produtos));          
                        
                        } else {
                            res.status(400).send({ error: "Não existem dados para ser retornados" });
                        }
                    } catch (e) {
                        console.log(e);
                        res.status(400).send({ error: "Falha ao buscar dados no banco" });
                    }
                });
                db.detach();
            } catch (e) {
                console.log(e);
                res.status(400)
                .send({ error: "Ocorreu um erro ao gerar o pool conexões! Falha na conexão com Banco" });
            }
        });        
    } catch (e) {
        console.log(e);
        res.status(500).send({ error: "Falha ao carregar os dados de clientes do servidor" });
    }
}

exports.getPromoList = async(req, res, next) => {
    try {
        var produtos = [];
        var pool = firebird.pool(5, conexao.options);
        pool.get(function(err, db) {
            try {db.query(
                "SELECT FIRST 15 SKIP(?*15) IIF(PRD.NAOCONSSALDO = 'T', PR.IDPROMOCAO, IIF(PR.QTD_EXISTENTE > 0,PR.IDPROMOCAO,0)) AS IDPROMOCAO, "+
                "       PRD.DESCRICAO AS DESCPROMOCAO, PR.TIPO AS TIPOPROMOCAO, PR.VALOR AS PRECOPROMOCAO, PR.CODPRD, P.NOMEFANTASIA "+
                "FROM TPROMOCAO PRD "+
                "LEFT JOIN TPROMITEM PR ON PR.CODEMPRESA = PRD.CODEMPRESA AND PRD.IDPROMOCAO = PR.IDPROMOCAO "+
                "LEFT JOIN TPRODUTO P ON P.CODEMPRESA = PRD.CODEMPRESA AND P.CODPRD = PR.CODPRD "+
                "WHERE   PR.INATIVO <> 'T' AND "+
                "        PRD.INATIVO <> 'T' AND "+
                "        P.INATIVO <> 'T' AND "+
                "        PRD.DTA_INICIO <= CURRENT_DATE AND "+
                "        PRD.DTA_TERMINIO >= CURRENT_DATE AND "+
                "        PR.CODEMPRESA = P.CODEMPRESA "+
                "GROUP BY 1, 2, 3, 4, 5, 6 "+
                "HAVING IIF(PRD.NAOCONSSALDO = 'T', PR.IDPROMOCAO, IIF(PR.QTD_EXISTENTE > 0,PR.IDPROMOCAO,0)) > 0 ",
                [req.query.page],function(err, result){
                    try {
                        if (err) {return res.status(400).send({error:"Ocorreu um erro ao tentar fazer a consulta. Erro : " +err.toString});}    
                        if (result != undefined) {
                            console.log('Numero de Linhas: '+result.length);
                            for(var i=0; i<result.length; i++){
                                var prod = new Produto();
                                let buffers = [];
                                prod.codigo = conexao.convertBuffer(result[i].CODPRD);
                                prod.nomefantasia = conexao.convertBuffer(result[i].NOMEFANTASIA);
                                prod.idpromocao = (result[i].IDPROMOCAO);
                                prod.descricaopromocao = conexao.convertBuffer(result[i].DESCPROMOCAO);
                                prod.tipopromocao = conexao.convertBuffer(result[i].TIPOPROMOCAO);
                                prod.precopromocao = (result[i].PRECOPROMOCAO);
                                let buffer2;     
                                try{ 
                                    let datas = fs.readFileSync('imgs/list/'+prod.codigo+'.jpg');  
                                    //console.log("File content is as follows:"); 
                                    buffer2 = (datas); 
                                    // Display the file data  
                                    //console.log(data);
                                    prod.imagem = buffer2.toString('base64');
                                    // resolve(prod);  
                                }catch(err){ 
                                    console.log('imagem nao encontrada no disco  -  '+err); 
                                    prod.imagem = null
                                    // resolve(prod);
                                }
                                produtos.push(prod);
                            }
                            return res.send(JSON.stringify(produtos));
                                                
                            // function freeze(time) {
                            //     const stop = new Date().getTime() + time;
                            //     while(new Date().getTime() < stop);       
                            // }                        
                            // console.log("freeze 3s");
                            // freeze(50000);            
                        
                        } else {
                            res.status(400).send({ error: "Não existem dados para ser retornados" });
                        }
                    } catch (e) {
                        console.log(e);
                        res.status(400).send({ error: "Falha ao buscar dados no banco" });
                    }
                });
                db.detach();
            } catch (e) {
                console.log(e);
                res.status(400)
                .send({ error: "Ocorreu um erro ao gerar o pool conexões! Falha na conexão com Banco" });
            }
        });        
    } catch (e) {
        console.log(e);
        res.status(500).send({ error: "Falha ao carregar os dados de clientes do servidor" });
    }
}

exports.getPromo = async(req, res, next) => {
    try {
        var produtos = [];
        var pool = firebird.pool(5, conexao.options);
        pool.get(function(err, db) {
            try {db.query(
                "SELECT FIRST 6 IIF(PRD.NAOCONSSALDO = 'T', PR.IDPROMOCAO, IIF(PR.QTD_EXISTENTE > 0,PR.IDPROMOCAO,0)) AS IDPROMOCAO, "+
                "       PRD.DESCRICAO AS DESCPROMOCAO, PR.TIPO AS TIPOPROMOCAO, PR.VALOR AS PRECOPROMOCAO, PR.CODPRD, P.NOMEFANTASIA "+
                "FROM TPROMOCAO PRD "+
                "LEFT JOIN TPROMITEM PR ON PR.CODEMPRESA = PRD.CODEMPRESA AND PRD.IDPROMOCAO = PR.IDPROMOCAO "+
                "LEFT JOIN TPRODUTO P ON P.CODEMPRESA = PRD.CODEMPRESA AND P.CODPRD = PR.CODPRD "+
                "WHERE   PR.INATIVO <> 'T' AND "+
                "        PRD.INATIVO <> 'T' AND "+
                "        P.INATIVO <> 'T' AND "+
                "        PRD.DTA_INICIO <= CURRENT_DATE AND "+
                "        PRD.DTA_TERMINIO >= CURRENT_DATE AND "+
                "        PR.CODEMPRESA = P.CODEMPRESA "+
                "GROUP BY 1, 2, 3, 4, 5, 6 "+
                "HAVING IIF(PRD.NAOCONSSALDO = 'T', PR.IDPROMOCAO, IIF(PR.QTD_EXISTENTE > 0,PR.IDPROMOCAO,0)) > 0 ",
                function(err, result){
                    try {
                        if (err) {return res.status(400).send({error:"Ocorreu um erro ao tentar fazer a consulta. Erro : " +err.toString});}    
                        if (result != undefined) {
                            console.log('Numero de Linhas: '+result.length);
                            for(var i=0; i<result.length; i++){
                                var prod = new Produto();
                                let buffers = [];
                                prod.codigo = conexao.convertBuffer(result[i].CODPRD);
                                prod.nomefantasia = conexao.convertBuffer(result[i].NOMEFANTASIA);
                                prod.idpromocao = (result[i].IDPROMOCAO);
                                prod.descricaopromocao = conexao.convertBuffer(result[i].DESCPROMOCAO);
                                prod.tipopromocao = conexao.convertBuffer(result[i].TIPOPROMOCAO);
                                prod.precopromocao = (result[i].PRECOPROMOCAO);
                                let buffer2;     
                                try{ 
                                    let datas = fs.readFileSync('imgs/list/'+prod.codigo+'.jpg');  
                                    //console.log("File content is as follows:"); 
                                    buffer2 = (datas); 
                                    // Display the file data  
                                    //console.log(data);
                                    prod.imagem = buffer2.toString('base64');
                                    // resolve(prod);  
                                }catch(err){ 
                                    console.log('imagem nao encontrada no disco  -  '+err); 
                                    prod.imagem = null
                                    // resolve(prod);
                                }
                                produtos.push(prod);
                            }
                            return res.send(JSON.stringify(produtos));
                                                
                            // function freeze(time) {
                            //     const stop = new Date().getTime() + time;
                            //     while(new Date().getTime() < stop);       
                            // }                        
                            // console.log("freeze 3s");
                            // freeze(50000);            
                        
                        } else {
                            res.status(400).send({ error: "Não existem dados para ser retornados" });
                        }
                    } catch (e) {
                        console.log(e);
                        res.status(400).send({ error: "Falha ao buscar dados no banco" });
                    }
                });
                db.detach();
            } catch (e) {
                console.log(e);
                res.status(400)
                .send({ error: "Ocorreu um erro ao gerar o pool conexões! Falha na conexão com Banco" });
            }
        });        
    } catch (e) {
        console.log(e);
        res.status(500).send({ error: "Falha ao carregar os dados de clientes do servidor" });
    }
}

exports.getSimilarByCodigo = async(req, res, next) => {
    try {
        var produtos = [];
        var pool = firebird.pool(5, conexao.options);
        pool.get(function(err, db) {
            try {db.query(
                "SELECT P.CODPRD, P.NOMEFANTASIA, P.NUMNOFABRIC, P.NUMNOFABRIC2, P.NUMNOFABRIC3, P.NUMERONOCFO, P.CODFAB, P.CODTIP, P.CODGRUPO "+
                "FROM TPRODUTO P "+
                "LEFT JOIN TGRUPO G ON P.CODGRUPO = G.CODGRUPO "+
                "WHERE P.INATIVO <> 'T' AND P.CODPRD IN ( "+
                "        SELECT S.CODPRDSIMILAR FROM TPRODSIMILAR S "+
                "        WHERE S.CODPRD = ? "+
                "        UNION ALL "+
                "        SELECT PS.CODPRD FROM TPRODSIMILAR PS "+
                "        WHERE PS.CODPRDSIMILAR = ? ) "+
                "ORDER BY P.NOMEFANTASIA ",                
                [req.params.codigo,req.params.codigo], function(err, result){
                    try {
                        if (err) {return res.status(400).send({error:"Ocorreu um erro ao tentar fazer a consulta. Erro : " +err.toString});}    
                        if (result != undefined) {
                            console.log('Numero de Linhas: '+result.length);
                            for(var i=0; i<result.length; i++){
                                var prod = new Produto();
                                let buffers = [];
                                prod.codigo = conexao.convertBuffer(result[i].CODPRD);
                                prod.nomefantasia = conexao.convertBuffer(result[i].NOMEFANTASIA);
                                prod.reffabric1 = conexao.convertBuffer(result[i].NUMNOFABRIC);
                                prod.reffabric2 = conexao.convertBuffer(result[i].NUMNOFABRIC2);
                                prod.reffabric3 = conexao.convertBuffer(result[i].NUMNOFABRIC3);
                                prod.reffornec = conexao.convertBuffer(result[i].NUMERONOCFO);
                                prod.codfab = conexao.convertBuffer(result[i].CODFAB);
                                prod.codtip = conexao.convertBuffer(result[i].CODTIP);
                                prod.codgrupo = conexao.convertBuffer(result[i].CODGRUPO);

                                let buffer2;     
                                try{ 
                                    let datas = fs.readFileSync('imgs/list/'+prod.codigo+'.jpg');  
                                    //console.log("File content is as follows:"); 
                                    buffer2 = (datas); 
                                    // Display the file data  
                                    //console.log(data);
                                    prod.imagem = buffer2.toString('base64');
                                    // resolve(prod);  
                                }catch(err){ 
                                    console.log('imagem nao encontrada no disco  -  '+err); 
                                    prod.imagem = null
                                    // resolve(prod);
                                }
                                produtos.push(prod);
                            }
                            return res.send(JSON.stringify(produtos));
                                                
                            // function freeze(time) {
                            //     const stop = new Date().getTime() + time;
                            //     while(new Date().getTime() < stop);       
                            // }                        
                            // console.log("freeze 3s");
                            // freeze(50000);            
                        
                        } else {
                            res.status(400).send({ error: "Não existem dados para ser retornados" });
                        }
                    } catch (e) {
                        console.log(e);
                        res.status(400).send({ error: "Falha ao buscar dados no banco" });
                    }
                });
                db.detach();
            } catch (e) {
                console.log(e);
                res.status(400)
                .send({ error: "Ocorreu um erro ao gerar o pool conexões! Falha na conexão com Banco" });
            }
        });        
    } catch (e) {
        console.log(e);
        res.status(500).send({ error: "Falha ao carregar os dados de clientes do servidor" });
    }
}

exports.getFab = async(req, res, next) => {
    try {
        var pool = firebird.pool(5, conexao.options);
        pool.get(function(err, db) {
            if(err) res.status(400).send({ erro: "Falha na conexão com Banco de dados Firebird do servidor", codigo: err });
            try {db.query(
                "SELECT F.CODFAB, F.NOME FROM TFAB F",                
                req.params.id, function(err, result){
                    try {
                        if (err) {return res.status(400).send({error:"Ocorreu um erro ao tentar fazer a consulta. Erro : " +err});}    
                        if (result != undefined) {
                            console.log('Numero de Linhas: '+result.length);
                            function writeConsulta (i){
                                return new Promise((resolve, reject) => {
                                    if(reject)('erro na consulta sql');
                                    var fab = new Fabricante();
                                    fab.codigo = conexao.convertBuffer(result[i].CODFAB);
                                    fab.nome = conexao.convertBuffer(result[i].NOME);
                                    resolve(fab);                                    
                                })                            
                            }
                            const promiseArray = []
                            for (let i=0; i<result.length; i++) promiseArray[i] = writeConsulta(i)
                            Promise.all(promiseArray).then(data => res.send(data));
                        } else {
                            res.status(400).send({ error: "Não existem dados para ser retornados" });
                        }
                    } catch (e) {
                        console.log(e);
                        res.status(400).send({ error: "Falha ao buscar dados no banco" });
                    }
                });
                db.detach();
            } catch (e) {
                console.log(e);
                res.status(400).send({ error: "Falha na execução de dados: "+e });
            }
        });        
    } catch (e) {
        console.log(e);
        res.status(500).send({ error: "Falha ao carregar os dados de clientes do servidor" });
    }
}

exports.getTipo = async(req, res, next) => {
    try {
        var pool = firebird.pool(5, conexao.options);
        pool.get(function(err, db) {
            if(err) res.status(400).send({ erro: "Falha na conexão com Banco de dados Firebird do servidor", codigo: err });
            try {db.query(
                "SELECT T.CODTIPO, T.DESCRICAO FROM TTIPOPROD T",                
                req.params.id, function(err, result){
                    try {
                        if (err) {return res.status(400).send({error:"Ocorreu um erro ao tentar fazer a consulta. Erro : " +err});}    
                        if (result != undefined) {
                            console.log('Numero de Linhas: '+result.length);
                            function writeConsulta (i){
                                return new Promise((resolve, reject) => {
                                    if(reject)('erro na consulta sql');
                                    var tip = new Tipo();
                                    tip.codigo = conexao.convertBuffer(result[i].CODTIPO);
                                    tip.descricao = conexao.convertBuffer(result[i].DESCRICAO);
                                    resolve(tip);                                    
                                })                            
                            }
                            const promiseArray = []
                            for (let i=0; i<result.length; i++) promiseArray[i] = writeConsulta(i)
                            Promise.all(promiseArray).then(data => res.send(data));
                        } else {
                            res.status(400).send({ error: "Não existem dados para ser retornados" });
                        }
                    } catch (e) {
                        console.log(e);
                        res.status(400).send({ error: "Falha ao buscar dados no banco" });
                    }
                });
                db.detach();
            } catch (e) {
                console.log(e);
                res.status(400).send({ error: "Falha na execução de dados: "+e });
            }
        });        
    } catch (e) {
        console.log(e);
        res.status(500).send({ error: "Falha ao carregar os dados de clientes do servidor" });
    }
}


exports.getGrupoAll = async(req, res, next) => {
    try {
        var grupos = [];
        var pool = firebird.pool(5, conexao.options);
        pool.get(function(err, db) {
            if(err) res.status(400).send({ erro: "Falha na conexão com Banco de dados Firebird do servidor", codigo: err });
            try {db.query(
                "SELECT FIRST 30 SKIP(?*30)  T.CODGRUPO, T.DESCRICAO, T.IDINTEGRACAO FROM TGRUPO T LEFT JOIN TGRUPOIMAGEM TI ON T.CODGRUPO = TI.CODGRUPO WHERE T.USAINTEGRACAO = 'T'",                
                req.query.page, function(err, result){
                    try {
                        if (err) {return res.status(400).send({error:"Ocorreu um erro ao tentar fazer a consulta. Erro : " +err});}    
                        if (result != undefined) {
                            console.log('Numero de Linhas: '+result.length);
                            for(var i=0; i<result.length; i++){
                                var grupo = new Grupo();
                                let buffers = [];
                                grupo.codigo = conexao.convertBuffer(result[i].CODGRUPO);
                                grupo.descricao = conexao.convertBuffer(result[i].DESCRICAO);
                                grupo.idintegracao = conexao.convertBuffer(result[i].IDINTEGRACAO);

                                let buffer2;     
                                try{ 
                                    let datas = fs.readFileSync('imgs/grupos/'+grupo.codigo+'.jpg');  
                                    //console.log("File content is as follows:"); 
                                    buffer2 = (datas); 
                                    // Display the file data  
                                    //console.log(data);
                                    grupo.imagem = buffer2.toString('base64');
                                    // resolve(prod);  
                                }catch(err){ 
                                    // console.log('imagem nao encontrada no disco  -  '+err); 
                                    grupo.imagem = null
                                    // resolve(prod);
                                }
                                grupos.push(grupo);   
                            }
                            return res.send(JSON.stringify(grupos));
                        } else {
                            res.status(400).send({ error: "Não existem dados para ser retornados" });
                        }
                    } catch (e) {
                        console.log(e);
                        res.status(400).send({ error: "Falha ao buscar dados no banco" });
                    }
                });
                db.detach();
            } catch (e) {
                console.log(e);
                res.status(400).send({ error: "Falha na execução de dados: "+e });
            }
        });        
    } catch (e) {
        console.log(e);
        res.status(500).send({ error: "Falha ao carregar os dados de clientes do servidor" });
    }
}

exports.getGrupo = async(req, res, next) => {
    try {
        var grupos = [];
        var pool = firebird.pool(5, conexao.options);
        pool.get(function(err, db) {
            if(err) res.status(400).send({ erro: "Falha na conexão com Banco de dados Firebird do servidor", codigo: err });
            try {db.query(
                "SELECT T.CODGRUPO, T.DESCRICAO, T.IDINTEGRACAO FROM TGRUPO T LEFT JOIN TGRUPOIMAGEM TI ON T.CODGRUPO = TI.CODGRUPO WHERE T.USAINTEGRACAO = 'T'",                
                function(err, result){
                    try {
                        if (err) {return res.status(400).send({error:"Ocorreu um erro ao tentar fazer a consulta. Erro : " +err});}    
                        if (result != undefined) {
                            console.log('Numero de Linhas: '+result.length);
                            for(var i=0; i<result.length; i++){
                                var grupo = new Grupo();
                                let buffers = [];
                                grupo.codigo = conexao.convertBuffer(result[i].CODGRUPO);
                                grupo.descricao = conexao.convertBuffer(result[i].DESCRICAO);
                                grupo.idintegracao = conexao.convertBuffer(result[i].IDINTEGRACAO);

                                let buffer2;     
                                try{ 
                                    let datas = fs.readFileSync('imgs/grupos/'+grupo.codigo+'.jpg');  
                                    //console.log("File content is as follows:"); 
                                    buffer2 = (datas); 
                                    // Display the file data  
                                    //console.log(data);
                                    grupo.imagem = buffer2.toString('base64');
                                    // resolve(prod);  
                                }catch(err){ 
                                    // console.log('imagem nao encontrada no disco  -  '+err); 
                                    grupo.imagem = null
                                    // resolve(prod);
                                }
                                grupos.push(grupo);   
                            }
                            return res.send(JSON.stringify(grupos));
                        } else {
                            res.status(400).send({ error: "Não existem dados para ser retornados" });
                        }
                    } catch (e) {
                        console.log(e);
                        res.status(400).send({ error: "Falha ao buscar dados no banco" });
                    }
                });
                db.detach();
            } catch (e) {
                console.log(e);
                res.status(400).send({ error: "Falha na execução de dados: "+e });
            }
        });        
    } catch (e) {
        console.log(e);
        res.status(500).send({ error: "Falha ao carregar os dados de clientes do servidor" });
    }
}

// exports.getById = async(req, res, next) => {
//     try {
//         var pool = firebird.pool(5, conexao.options);

//         pool.get(function(err, db) {
//             try {
//             db.query(
//                 "SELECT P.CODPRD, P.NOMEFANTASIA, P.CODFAB, P.NUMNOFABRIC AS REF_FABRIC,"+
//                 "P.PRECO1, P.PRECO2, P.PRECO3, P.PRECO4, P.PRECO5, P.UNIDADE, P.CODTIP, P.SALDOGERALFISICO,"+
//                 "P.SALDOGERALFISICO2, P.SALDOGERALFISICO3, P.SALDOGERALFISICO4, P.SALDOGERALFISICO5,"+
//                 "P.SALDOGERALFISICO6, P.SALDOGERALFISICO7, P.SALDOGERALFISICO8, P.SALDOGERALFISICO9,"+
//                 "P.SALDOGERALFISICO10, P.DESCONTOMAX, P.IDPROMOCAO "+
//                 "FROM TPRODUTO P "+
//                 "WHERE P.INATIVO <> 'T' AND P.TIPO = 'P' AND P.naoexportarpalm <> 'T' AND P.CODPRD = ? ", req.params.id,
//                 function(err, result) {
//                     try {
//                         if (err) {
//                             return res.status(400).send({error:"Ocorreu um erro ao tentar fazer a consulta. Erro : " +err});
//                         }
    
//                         if (result != undefined) {
//                         console.log('Numero de Linhas: '+result.length);
//                         for (var i=0;i<result.length;i++) {
//                             result[i].CODPRD = conexao.convertBuffer(result[i].CODPRD) ;
//                             result[i].NOMEFANTASIA = conexao.convertBuffer(result[i].NOMEFANTASIA); 
//                             result[i].CODFAB = conexao.convertBuffer(result[i].CODFAB); 
//                             result[i].REF_FABRIC = conexao.convertBuffer(result[i].REF_FABRIC); 
//                             result[i].UNIDADE = conexao.convertBuffer(result[i].UNIDADE); 
//                             result[i].CODTIP = conexao.convertBuffer(result[i].CODTIP); 
//                         }
    
//                         return res.send(JSON.stringify(result));
//                         } else {
//                             res.status(400).send({ error: "Não existem dados para ser retornados" });
//                         }
//                     } catch (e) {
//                         console.log(e);
//                         res.status(400).send({ error: "Falha ao buscar dados no banco" });
//                     }
//                 }
//             );
//             db.detach();
//             } catch (e) {
//                 console.log(e);
//                 res.status(400)
//                 .send({ error: "Ocorreu um erro ao gerar o pool conexões! Falha na conexão com Banco" });
//             }
//         });
//     } catch (e) {
//         console.log(e);
//         res.status(500).send({ error: "Falha ao carregar os dados de clientes do servidor" });
//     }
// }


exports.post = async(req, res, next) => {
    let contract = new ValidationContract();
    // contract.hasMinLen(req.body.title, 3, 'O título deve conter pelo menos 3 caracteres');
    // contract.hasMinLen(req.body.slug, 3, 'O título deve conter pelo menos 3 caracteres');
    // contract.hasMinLen(req.body.description, 3, 'O título deve conter pelo menos 3 caracteres');

    // Se os dados forem inválidos
    // if (!contract.isValid()) {
    //     res.status(400).send(contract.errors()).end();
    //     return;
    // }

    try {
        firebird.attach(conexao.options, function(err, db) {
            if (err){
                console.log(err);
                throw err;
            }
            // db = DATABASE
            db.transaction(firebird.ISOLATION_READ_COMMITED, function(err, transaction) {
            try{
                transaction.query(
                    // 'INSERT INTO FCFO (CODEMPRESA, CODCFO, NOMEFANTASIA) VALUES(?,?,?)',
                    'INSERT INTO TMOV ('+
                        'CODEMPRESA, IDMOV, CODFILIAL, CODLOC, CODCFO, NUMEROMOV, SERIE, CODTMV, TIPO, STATUS, DATAEMISSAO,'+
                        'DATASAIDA, CODCPG, VALORBRUTO, VALORLIQUIDO, VALOROUTROS, OBSERVACAO, PERCENTUALFRETE, VALORFRETE,'+
                        'PERCENTUALDESC, VALORDESC, PERCENTUALDESP, VALORDESP, PERCCOMISSAO, DATAMOVIMENTO, CODCCUSTO, CODVEN1,'+
                        'CODUSUARIO, DATAENTREGA, STATUSPEDIDO, NOMECONSUMIDOR, CODTABPRECO'+
                    ') '+ 
                    'VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ? )',
                    // [1, 'C019979', 'PABLO TESTE NODE2'],
                    [1, 89999, 1, '001', 'F000007', '0110623', 'UN', '2.2.03', '1', 'N', '15.10.2020', '15.10.2020', null, 500, 500, 0,
                    null, 0, 0, 0, 0, 0, 0, 0, '15.10.2020', null, '004', 1, '15.10.2020', null, null, null],
                    function(err, result) {
                        if (err) {
                            console.log(err);
                            transaction.rollback();
                            return res.status(400).send('falha na inserção de informações no banco de dados - '+err);
                        }
                        console.log('resultado: '+result);
                        transaction.commit(function(err) {
                            if (err)
                                transaction.rollback();
                            else{
                                db.detach();
                                return res.status(201).send('Operação realizada com sucesso!');
                            }
                        });
                });
            }
            catch(e){
                console.log(e);
                res.status(500).send({message: 'Falha na validação dos dados! '+e});
            }
            });
        });
    } catch (e) {
        console.log(e);
        res.status(500).send({
            message: 'Falha ao processar sua requisição'
        });
    }
};

exports.put = async(req, res, next) => {
    try {
        await repository.update(req.params.id, req.body);
        res.status(200).send({
            message: 'Produto atualizado com sucesso!'
        });
    } catch (e) {
        res.status(500).send({
            message: 'Falha ao processar sua requisição'
        });
    }
};

exports.delete = async(req, res, next) => {
    try {
        await repository.delete(req.body.id)
        res.status(200).send({
            message: 'Produto removido com sucesso!'
        });
    } catch (e) {
        res.status(500).send({
            message: 'Falha ao processar sua requisição'
        });
    }
};


exports.writeImage = async() => {
    try {
        var pool = firebird.pool(5, conexao.options);
        pool.get(function(err, db) {
            try {db.query(
                "SELECT first 50 Z.CODEMPRESA, Z.CODPRD, "+
                "        (SELECT FIRST 1 TP.IMAGEM FROM TPRODIMAGEM TP "+
                "        WHERE TP.codprd = Z.CODPRD "+
                "        ORDER BY coalesce(TP.ordempesquisa,99), TP.codimagem ASC) AS IMAGEM "+
                "FROM ZPRODIMAGEM Z WHERE Z.IMAGEMGRAVADA = 'F' ",
                function(err, result){
                    try {
                        if (err) {console.log("Ocorreu um erro ao tentar fazer a consulta. Erro : " +err.toString);}    
                        if (result != undefined) {
                            console.log('Numero de Linhas: '+result.length);

                            function writeConsulta (i){
                                return new Promise((resolve, reject) => {
                                    var prod = new Produto();
                                    let buffers = [];
                                    prod.codigo = conexao.convertBuffer(result[i].CODPRD);
                                    if(result[i].IMAGEM != undefined)
                                        result[i].IMAGEM(function(err, name, e){
                                            if(err) throw err;
                                            e.on('data', function(chunk){
                                                buffers.push(chunk);
                                            });
                                            e.on('end', function(){
                                                let buffer = Buffer.concat(buffers); 
                                                
                                                try { 
                                                    fs.writeFileSync('imgs/list/'+prod.codigo+'.jpg', Buffer.from(new Uint8Array(buffer))); 
                                                    //console.log("File written successfully"); 
                                                } 
                                                catch(err) {console.error("## Erro ao gravar imagem no disco!  ###"+err);} 
                                                (async () => {
                                                    // Set the options.
                                                    const options = {
                                                        images: ['imgs/list/'+prod.codigo+'.jpg'],
                                                        width: 300,
                                                        quality: 90
                                                    };
                                                    
                                                    // Run the module.
                                                    await resizeOptimizeImages(options);
                                                    console.log("File written convert successfully  "+prod.codigo); 
                                                
                                                    db.query("UPDATE ZPRODIMAGEM SET IMAGEMGRAVADA = 'T' WHERE CODPRD = ?", prod.codigo,
                                                        function(err, result){
                                                            if (err) {console.log("Ocorreu um erro ao tentar fazer o update zprodimagem. Erro : " +err.toString);} 
                                                        }
                                                    )
                                                    db.detach();
                                                    resolve(prod); 
                                                })();
                                            });
                                            e.on('error', (err) => {reject('erro de buffer na imagem: '+err);});
                                        })
                                    else {
                                        prod.imagem = null
                                        console.log("Imagem nao encontrada!");
                                        resolve(prod);  
                                    }
                                    if(reject)('erro na consulta sql');
                                })                            
                            }
                            const promiseArray = []
                            for (let i=0; i<result.length; i++) promiseArray[i] = writeConsulta(i)
                            Promise.all(promiseArray).then(data => console.log("finalizado"));
                                                
                            // function freeze(time) {
                            //     const stop = new Date().getTime() + time;
                            //     while(new Date().getTime() < stop);       
                            // }                        
                            // console.log("freeze 3s");
                            // freeze(50000);            
                        
                        } else {
                            console.log("Não existem dados para ser retornados");
                        }
                    } catch (e) {
                        console.log("Falha ao buscar dados no banco!   "+e);
                        
                    }
                });
                db.detach();
            } catch (e) {
                console.log( "Ocorreu um erro ao gerar o pool conexões! Falha na conexão com Banco!! "+e);
            }
        });        
    } catch (e) {
        console.log("Falha ao carregar os dados de clientes do servidor!  "+e);
    }
};

exports.writeImageGroup = async() => {
    try {
        var pool = firebird.pool(5, conexao.options);
        pool.get(function(err, db) {
            try {db.query(
                "SELECT first 15 Z.CODEMPRESA, Z.CODGRUPO, "+
                "        (SELECT FIRST 1 TP.IMAGEM FROM TGRUPOIMAGEM TP "+
                "        WHERE TP.CODGRUPO = Z.CODGRUPO) AS IMAGEM "+
                "FROM ZGRUPOIMAGEM Z WHERE Z.IMAGEMGRAVADA = 'F' ",
                function(err, result){
                    try {
                        if (err) {console.log("Ocorreu um erro ao tentar fazer a consulta. Erro : " +err.toString);}    
                        if (result != undefined) {
                            console.log('Numero de Linhas: '+result.length);

                            function writeConsulta (i){
                                return new Promise((resolve, reject) => {
                                    var grupo = new Grupo();
                                    let buffers = [];
                                    grupo.codigo = conexao.convertBuffer(result[i].CODGRUPO);
                                    if(result[i].IMAGEM != undefined)
                                        result[i].IMAGEM(function(err, name, e){
                                            if(err) throw err;
                                            e.on('data', function(chunk){
                                                buffers.push(chunk);
                                            });
                                            e.on('end', function(){
                                                let buffer = Buffer.concat(buffers); 
                                                
                                                try { 
                                                    fs.writeFileSync('imgs/grupos/'+grupo.codigo+'.jpg', Buffer.from(new Uint8Array(buffer))); 
                                                    //console.log("File written successfully"); 
                                                } 
                                                catch(err) {console.error("## Erro ao gravar imagem no disco!  ###"+err);} 
                                                (async () => {
                                                    // Set the options.
                                                    const options = {
                                                        images: ['imgs/grupos/'+grupo.codigo+'.jpg'],
                                                        width: 200,
                                                        quality: 60
                                                    };
                                                    
                                                    // Run the module.
                                                    await resizeOptimizeImages(options);
                                                    console.log("File written convert successfully  "+grupo.codigo); 
                                                
                                                    db.query("UPDATE ZGRUPOIMAGEM SET IMAGEMGRAVADA = 'T' WHERE CODGRUPO = ?", grupo.codigo,
                                                        function(err, result){
                                                            if (err) {console.log("Ocorreu um erro ao tentar fazer o update zgrupoimagem. Erro : " +err.toString);} 
                                                        }
                                                    )
                                                    db.detach();
                                                    resolve(grupo); 
                                                })();
                                            });
                                            e.on('error', (err) => {reject('erro de buffer na imagem: '+err);});
                                        })
                                    else {
                                        grupo.imagem = null
                                        console.log("Imagem nao encontrada!");
                                        resolve(grupo);  
                                    }
                                    if(reject)('erro na consulta sql');
                                })                            
                            }
                            const promiseArray = []
                            for (let i=0; i<result.length; i++) promiseArray[i] = writeConsulta(i)
                            Promise.all(promiseArray).then(data => console.log("finalizado"));
                                                
                            // function freeze(time) {
                            //     const stop = new Date().getTime() + time;
                            //     while(new Date().getTime() < stop);       
                            // }                        
                            // console.log("freeze 3s");
                            // freeze(50000);            
                        
                        } else {
                            console.log("Não existem dados para ser retornados");
                        }
                    } catch (e) {
                        console.log("Falha ao buscar dados no banco!   "+e);
                        
                    }
                });
                db.detach();
            } catch (e) {
                console.log( "Ocorreu um erro ao gerar o pool conexões! Falha na conexão com Banco!! "+e);
            }
        });        
    } catch (e) {
        console.log("Falha ao carregar os dados de clientes do servidor!  "+e);
    }
};