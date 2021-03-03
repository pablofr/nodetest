'use strict';

module.exports = class Produto {
    //propriedades e funções da classe aqui
    constructor(codigo, nomefantasia, reffabric1, reffabric2, reffabric3, reffornec, codfab, codtip, codgrupo, imagem,
        nomefabricante, nomegrupo, nometipo, descricao, aplicacao, pesoliquido, pesobruto, unidade, comprimento, largura,
        cor, espessura, idpromocao, tipopromocao, precopromocao, descricaopromocao ) {
        this.codigo = codigo;
        this.nomefantasia = nomefantasia;
        this.reffabric1 = reffabric1;
        this.reffabric2 = reffabric2;
        this.reffabric3 = reffabric3;
        this.reffornec = reffornec;
        this.codfab = codfab;
        this.codtip = codtip;
        this.codgrupo = codgrupo;
        this.imagem = imagem;
        this.nomefabricante = nomefabricante;
        this.nomegrupo = nomegrupo;
        this.nometipo = nometipo;
        this.descricao = descricao;
        this.aplicacao = aplicacao;
        this.pesoliquido = pesoliquido;
        this.pesobruto = pesobruto;
        this.unidade = unidade;
        this.comprimento = comprimento;
        this.largura = largura;
        this.espessura = espessura;
        this.cor = cor;
        this.idpromocao = idpromocao;
        this.tipopromocao = tipopromocao;
        this.precopromocao = precopromocao;
        this.descricaopromocao = descricaopromocao;
    }
}


// const mongoose = require('mongoose');
// const Schema = mongoose.Schema;

// const schema = new Schema({
//     title: {
//         type: String,
//         required: true,
//         trim: true
//     },
//     slug: {
//         type: String,
//         required: [true, 'O slug é obrigatório'],
//         trim: true,
//         index: true,
//         unique: true
//     },
//     description: {
//         type: String,
//         required: true
//     },
//     price: {
//         type: Number,
//         required: true
//     },
//     active: {
//         type: Boolean,
//         required: true,
//         default: true
//     },
//     tags: [{
//         type: String,
//         required: false
//     }],
//     image: {
//         type: String,
//         required: false,
//         trim: true
//     }
// });

// module.exports = mongoose.model('Product', schema);