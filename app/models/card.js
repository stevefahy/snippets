var mongoose = require('mongoose');

var Schema = mongoose.Schema;
var cardSchema = new Schema({
    title: String,
    content: String,
    user: String,
    lang: String,
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

cardSchema.pre('save', function(next) {
    var currentTime = new Date().toISOString();
    if (currentTime != this.createdAt.toISOString()) {
        this.updatedAt = currentTime;
    }
    next();
});

var conn = mongoose.createConnection('mongodb://127.0.0.1:27017/card');
var Card = conn.model('Card', cardSchema);
//var Card = mongoose.model('Card', cardSchema);
module.exports = Card;
