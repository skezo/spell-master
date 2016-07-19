'use strict';

var AWS = require('aws-sdk');
var auth = require('./auth.json');

var storage = (function () {
    var dynamodb = new AWS.DynamoDB({apiVersion: '2012-08-10'});

    /**
     * Quiz class stores all quiz states for user
     */
    function Quiz(session, data) {
        this.data = data || {words: [], currentWord: 0, score: 0};
        this._session = session;
    }

    // Extend
    Quiz.prototype = {
        save: function (callback) {
            this._session.attributes.currentQuiz = this.data;
            dynamodb.putItem({
                TableName: auth.TABLE_NAME,
                Item: {
                    CustomerId: {
                        S: this._session.user.userId
                    },
                    Data: {
                        S: JSON.stringify(this.data)
                    }
                }
            }, function (err, data) {
                if (err) {
                    console.error(err, err.stack);
                }
                if (callback) {
                    callback();
                }
            });
        }
    };

    return {
        loadQuiz: function (session, callback) {
            if (session.attributes.currentQuiz) {
                callback(new Quiz(session, session.attributes.currentQuiz));
                return;
            }
            dynamodb.getItem({
                TableName: auth.TABLE_NAME,
                Key: {
                    CustomerId: {
                        S: session.user.userId
                    }
                }
            }, function (err, data) {
                var currentQuiz;
                if (err) {
                    console.error(err, err.stack);
                    currentQuiz = new Quiz(session);
                    session.attributes.currentQuiz = currentQuiz.data;
                    callback(currentQuiz);
                } else if (data.Item === undefined) {
                    currentQuiz = new Quiz(session);
                    session.attributes.currentQuiz = currentQuiz.data;
                    callback(currentQuiz);
                } else {
                    currentQuiz = new Quiz(session, JSON.parse(data.Item.Data.S));
                    session.attributes.currentQuiz = currentQuiz.data;
                    callback(currentQuiz);
                }
            });

        },
        newQuiz: function (session) {
            return new Quiz(session);
        }
    };

}());

module.exports = storage;