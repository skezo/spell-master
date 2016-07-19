'use strict';
var dialog = require('./dialog.json');
var storage = require('./storage');

var registerEventHandlers = function (eventHandlers, skillContext) {

    // Called when the session starts.
    eventHandlers.onSessionStarted = function (sessionStartedRequest, session) {
        // stop app from talking to much if one shot command was used to trigger an intent event
        skillContext.needMoreHelp = false;
    };

    // Called when the user launches the skill without specifying what they want.
    eventHandlers.onLaunch = function (launchRequest, session, response) {
        //
        storage.loadQuiz(session, function (currentQuiz) {
            var speechOutput = dialog.welcome;
            var reprompt;
            var wordCount = currentQuiz.data.words.length;//number of words in quiz

            if (wordCount === 0) {
                speechOutput += " " + dialog.onBoarding;
                reprompt = dialog.onBoarding;
            } else { 
                reprompt = " " + dialog.youCanSay + " " +
                        dialog.actions.spellingTest + " " +
                        dialog.actions.addWord + " " +
                        dialog.actions.deleteWord + " " +
                        dialog.actions.listWords + " " +
                        dialog.or + " " +
                        dialog.actions.help + " " +
                        ". " +
                        dialog.whatDo;
                speechOutput += " " + reprompt;
            }
            response.ask({type: 'SSML', speech: speechOutput}, {type: 'SSML', speech: reprompt});
        });
    };
};

exports.register = registerEventHandlers;