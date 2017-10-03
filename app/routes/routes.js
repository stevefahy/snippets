var Card = require('../models/card');
var formidable = require('formidable');
var fs = require('fs');
var path = require('path');

function getCards(res) {
    Card.find(function(err, cards) {
        // if there is an error retrieving, send the error. nothing after res.send(err) will execute
        if (err) {
            return res.send(err);
        }
        res.json(cards);
    });
}

module.exports = function(app) {

    app.post('/api/cards/search_user/:username', function(req, res) {
        var username = req.params.username;
        Card.find({ 'user': new RegExp('^' + username + '$', "i") }, function(err, cards) {
            if (err) {
                return res.send(err);
            }
            res.json(cards);
        }).limit(2);
    });

    app.post('/api/cards/search_id/:snip', function(req, res) {
        var snip = req.params.snip;
        Card.find({ '_id': snip }, function(err, cards) {
            if (err) {
                return res.send(err);
            }
            res.json(cards);
        });
    });

    app.get('/api/cards/', function(req, res) {
        // use mongoose to get all cards in the database
        getCards(res);
    });

    app.post('/api/cards/search/:input', function(req, res) {
        // use mongoose to search all cards in the database
        var input = req.params.input;
        Card.find()
            .or([{ 'title': new RegExp(input, "i") }, { 'content': new RegExp(input, "i") }])
            .sort('title').exec(function(err, results) {
                if (err) {
                    return res.send(err);
                }
                res.json(results);
            });
    });

    // create card and send back the created card after creation
    app.post('/api/cards', function(req, res) {
        Card.create({
            title: req.body.title,
            content: req.body.content,
            user: req.body.user,
            lang: req.body.lang,
            done: false
        }, function(err, card) {
            if (err) {
                res.send(err);
            }
            // return the created card
            res.send(card);
        });
    });

    // update a card
    app.put('/api/cards/:card_id', function(req, res) {
        Card.findById({ _id: req.params.card_id }, function(err, card) {
            if (err) {
                res.send(err);
            }
            var toupdate = req.body.card;
            if (card.length < req.body.card.length) {
                card.push({ title: '', content: '', user: '', lang: '' });
            }
            card.name = toupdate.name;
            card.title = toupdate.title;
            card.content = toupdate.content;
            card.user = toupdate.user;
            card.lang = toupdate.lang;
            var newcard = new Card(card);
            newcard.save(function(err, card) {
                if (err) {
                    console.log('error: ' + err);
                    res.send(err);
                } else {
                    console.log('success: ' + card);
                }
            });
        });
    });

    // delete a card
    app.delete('/api/cards/:card_id', function(req, res) {
        Card.remove({
            _id: req.params.card_id
        }, function(err, card) {
            if (err)
                res.send(err);
            res.json(card);
        });
    });

};