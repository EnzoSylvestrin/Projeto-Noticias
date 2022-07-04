const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const fileUpload = require('express-fileUpload');
const fs = require('fs');

const app = express();

const Posts = require('./posts.js');

var session = require('express-session');

app.use(session({
    secret: 'KEYBORD_CAT-SESSION',
    cookie: {
        maxAge: 60000
    }
}));

app.use(fileUpload({
    useTempFiles: true,
    tempFileDir: path.join(__dirname, 'tmp')
}));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
    extended: true
}));

mongoose.connect("mongodb+srv://root:gZzRTdmLQ6Ly5nEy@cluster0.ufa7o.mongodb.net/dankicode?retryWrites=true&w=majority", {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(function () {
    console.log('Conectado ao MongoDB');
}).catch(function (err) {
    console.log('Erro ao conectar ao MongoDB: ' + err.message);
});

app.engine('html', require('ejs').renderFile);
app.set('view engine', 'html');
app.use('/public', express.static(path.join(__dirname, 'public')));
app.set('views', path.join(__dirname, '/pages'));

app.get('/', (req, res) => {
    if (req.query.busca == null) {
        Posts.find({}).sort({
            '_id': -1
        }).exec(function (err, posts) {
            posts = posts.map(function (val) {
                return {
                    titulo: val.titulo,
                    conteudo: val.conteudo,
                    descricaoCurta: val.conteudo.substr(0, 120),
                    imagem: val.imagem,
                    slug: val.slug,
                    categoria: val.categoria
                }
            });

            Posts.find({}).sort({
                'views': -1
            }).limit(3).exec(function (err, postsTop) {
                postsTop = postsTop.map(function (val) {
                    return {
                        titulo: val.titulo,
                        conteudo: val.conteudo,
                        descricaoCurta: val.conteudo.substr(0, 120),
                        imagem: val.imagem,
                        slug: val.slug,
                        categoria: val.categoria,
                        views: val.views
                    }
                });
                res.render('home', {
                    posts: posts,
                    postsTop: postsTop
                });
            });


        });
    } else {
        Posts.find({
            titulo: {
                $regex: req.query.busca,
                $options: 'i'
            }
        }).sort({
            'views': -1
        }).limit(10).exec(function (err, posts) {
            posts = posts.map(function (val) {
                return {
                    titulo: val.titulo,
                    conteudo: val.conteudo,
                    descricaoCurta: val.conteudo.substr(0, 200),
                    imagem: val.imagem,
                    slug: val.slug,
                    categoria: val.categoria
                }
            });
            res.render('busca', {
                posts: posts,
                contagem: posts.length
            });
        });
    }
});

app.get('/:slug', (req, res) => {
    Posts.findOneAndUpdate({
        slug: req.params.slug
    }, {
        $inc: {
            views: 1
        }
    }, {
        new: true
    }, (err, result) => {
        if (result != null) {
            Posts.find({}).sort({
                'views': -1
            }).limit(3).exec(function (err, postsTop) {
                postsTop = postsTop.map(function (val) {
                    return {
                        titulo: val.titulo,
                        conteudo: val.conteudo,
                        descricaoCurta: val.conteudo.substr(0, 120),
                        imagem: val.imagem,
                        slug: val.slug,
                        categoria: val.categoria,
                        views: val.views
                    }
                });
                res.render('single', {
                    noticia: result,
                    postsTop: postsTop
                });
            });
        } else {
            res.redirect('/');
        }
    });
});

var usuarios = [{
        login: 'admin',
        senha: '123'
    },
    {
        login: 'Enzo',
        senha: 'crysis154'
    }
];

app.post('/admin/login', (req, res) => {
    for (let i = 0; i < usuarios.length; i++) {
        if (req.body.usuario == usuarios[i].login && req.body.senha == usuarios[i].senha) {
            req.session.login = usuarios[i].login;
        }
    }
    // Duas formas diferentes de fazer a mesma coisa
    // usuarios.map(function (val) {
    //     if (val.login == req.body.login && val.senha == req.body.senha) {
    //         req.session.login = 'enzo';
    //     }
    // });

    res.redirect('/admin/login');
});

app.get('/admin/deletar/:id', (req, res) => {
    Posts.deleteOne({
        _id: req.params.id
    }).then(() => {
        res.redirect('/admin/login');
    });
});

app.post('/admin/cadastro', (req, res) => {

    let formato = req.files.arquivo.name.split(".");
    let imagem = "";
    if (formato[formato.length - 1] == "jpg" || formato[formato.length - 1] == "png") {
        imagem = new Date().getTime() + "." + formato[formato.length - 1];
        req.files.arquivo.mv(__dirname + "/public/images/" + imagem);
    } else {
        fs.unlinkSync(req.files.arquivo.tempFilePath);
    }

    Posts.create({
        titulo: req.body.titulo_noticia,
        conteudo: req.body.conteudo_noticia,
        imagem: 'http://localhost:5000/public/images/' + imagem,
        categoria: req.body.categoria,
        slug: criaSlug(req.body.titulo_noticia),
        autor: req.session.login,
        views: 0
    }).then(function () {
        res.redirect('/admin/login');
    });
});

function criaSlug(slug) {
    slug = slug.normalize('NFD').replace(/[\u0300-\u036f]/g, "");
    slug = slug.replace(/ /g, '-');
    return slug.toLowerCase();
}

app.get('/admin/login', (req, res) => {
    if (req.session.login == null) {
        res.render('login')
    } else {
        Posts.find({}).sort({
            '_id': -1
        }).exec(function (err, posts) {
            posts = posts.map(function (val) {
                return {
                    id: val._id,
                    titulo: val.titulo,
                    conteudo: val.conteudo,
                    descricaoCurta: val.conteudo.substr(0, 120),
                    imagem: val.imagem,
                    slug: val.slug,
                    categoria: val.categoria
                }
            });
            res.render('admin-panel', {
                posts: posts,
            });
        });
    }
});

app.listen(5000, () => {
    console.log('Servidor criado');
});