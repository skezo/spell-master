'use strict';

var Alexa = require('alexa-sdk');
var util = require('util');
var DIALOG = require('./dialog.json');
var AUTH = require('./auth.json'); // Stores
var APP_ID = AUTH.APP_ID;
var SKILL_NAME = AUTH.SKILL_NAME;

var EMPTY_STRING = ' ';

// Define Skill's states:
// this means you can set intent handlers to
// only work when the skill is in a specific state
var states = {
    MENUMODE: '_MENUMODE', // User has not added any words
    ADDWORDMODE: '_ADDWORDMODE', // User has not added any words
    DELETEWORDMODE: '_DELETEWORDMODE', // User has not added any words
    DELETELISTMODE: '_DELETELISTMODE', // User has not added any words
    READLISTMODE: '_READLISTMODE', // User has not added any words
    SPELLTESTMODE: '_SPELLTESTMODE' // User has not added any words
};

exports.handler = function (event, context, callback) {
    var alexa = Alexa.handler(event, context);
    alexa.appId = APP_ID;
    alexa.dynamoDBTableName = AUTH.TABLE_NAME;
    alexa.registerHandlers(newSessionHandlers, menuModeHandlers, addWordModeHandlers, deleteWordModeHandlers, deleteListModeHandlers, readListModeHandlers, spellTestModeHandlers);
    alexa.execute();
};

// Define Handlers
var newSessionHandlers = {
    NewSession: function () {
        var speechOutput;
        var repromptSpeech;

        // If no attributes have been set we need to define them here
        if (Object.keys(this.attributes).length === 0) {
            this.attributes['words'] = []; // spelling list
            this.attributes['score'] = 0; // user's score
            this.attributes['currentWordIndex'] = 0; // current word user is on
            this.attributes['spelt'] = EMPTY_STRING; // user spelt word - cannot be empty string
        }

        // Set the current state, it will now use handlers defined in menuModeHandlers
        this.handler.state = states.MENUMODE;

        // Build welcome message
        speechOutput = util.format(DIALOG.welcome, this.attributes['words'].length, this.attributes['words'].length === 1 ? "" : "s");

        // Has the user added any words to their spelling list
        if (this.attributes['words'].length > 0) {
            // Yes, list actions they can do
            speechOutput += ' ' + DIALOG.youCanSay;
            repromptSpeech = DIALOG.youCanSay;
        } else {
            // No, then walk them through it
            speechOutput += ' ' + DIALOG.onBoarding;
            repromptSpeech = DIALOG.onBoardingReprompt;
        }

        // Welcome user and prompt them to get started
        this.emit(':ask', speechOutput, repromptSpeech);
    },
    Unhandled: function () {

    }
};

// Handlers for when user is in the Main Menu
var menuModeHandlers = Alexa.CreateStateHandler(states.MENUMODE, {
    NewSession: function () {
        this.handler.state = '';
        this.emitWithState('NewSession'); // Call 'NewSession' from newSessionHandlers
    },
    AddWordIntent: function () {
        this.attributes['spelt'] = EMPTY_STRING;
        this.handler.state = states.ADDWORDMODE;
        this.emit(':ask', DIALOG.addWord, DIALOG.addWord);
    },
    DeleteWordIntent: function () {
        if (this.attributes['words'].length > 0) {
            this.attributes['spelt'] = EMPTY_STRING;
            this.handler.state = states.DELETEWORDMODE;
            this.emit(':ask', DIALOG.deleteWord, DIALOG.deleteWord);
        } else {
           // no words in list
            this.emit(':ask', DIALOG.cantDoThis + ' ' + DIALOG.onBoarding, DIALOG.onBoardingReprompt); 
        }
    },
    DeleteAllWordsIntent: function () {
        if (this.attributes['words'].length > 0) {
            this.handler.state = states.DELETELISTMODE;
            this.emit(':ask', DIALOG.confirmDeleteList, DIALOG.confirmDeleteListReprompt);
        } else {
            // no words in list
            this.emit(':ask', DIALOG.cantDoThis + ' ' + DIALOG.onBoarding, DIALOG.onBoardingReprompt);
        }
    },
    ReadWordsIntent: function () {
        var listOfWords;
        if (this.attributes['words'].length > 0) {
            this.handler.state = states.READLISTMODE;
            listOfWords = this.attributes['words'].join(",<break time=\"0.6s\"/>") + "<break time=\"0.6s\"/>";
            this.emit(':ask', util.format(DIALOG.readWords, this.attributes['words'].length, (this.attributes['words'].length === 1 ? "" : "s"), listOfWords), DIALOG.readWordsReprompt);
        } else {
            // no words in list
            this.emit(':ask', DIALOG.cantDoThis + ' ' + DIALOG.onBoarding, DIALOG.onBoardingReprompt);
        }
    },
    StartTestIntent: function () {
        if (this.attributes['words'].length > 0) {
            this.attributes['spelt'] = EMPTY_STRING;
            this.handler.state = states.SPELLTESTMODE;
            if (this.attributes['currentWordIndex'] > 0) {
                // Resume
                this.emit(':ask', util.format(DIALOG.resumeSpellingTest, this.attributes['currentWordIndex'] + 1) + ' ' + util.format(DIALOG.spellWord, this.attributes['words'][this.attributes['currentWordIndex']]), util.format(DIALOG.spellWord, this.attributes['words'][this.attributes['currentWordIndex']]));
            } else {
                // New
                this.attributes['score'] = 0;
                this.emit(':ask', DIALOG.startingSpellingTest + ' ' + util.format(DIALOG.spellWord, this.attributes['words'][this.attributes['currentWordIndex']]), util.format(DIALOG.spellWord, this.attributes['words'][this.attributes['currentWordIndex']]));
            }
        } else {
            // no words in list
            this.emit(':ask', DIALOG.cantDoThis + ' ' + DIALOG.onBoarding, DIALOG.onBoardingReprompt);
        }
    },
    'AMAZON.StopIntent': function () {
        this.emitWithState('SessionEndedRequest');
    },
    'AMAZON.CancelIntent': function () {
        this.emitWithState('SessionEndedRequest');
    },
    SessionEndedRequest: function () {
        this.attributes['spelt'] = EMPTY_STRING;
        this.emit(':saveState', true); // Save session attributes to DynamoDB
        this.emit(':tell', DIALOG.goodBye);
    },
    Unhandled: function () {
        // Undefined intents will be caught by the 'Unhandled' handler
        if (this.attributes['words'].length > 0) {
            this.emit(':ask', DIALOG.sorry + ' ' + DIALOG.youCanSay, DIALOG.youCanSay);
        } else {
            this.emit(':ask', DIALOG.sorry + ' ' + DIALOG.onBoarding, DIALOG.onBoarding);
        }
    }
});

// Handlers for ADD WORD state
// This allows for the user to add words to their spelling list
var addWordModeHandlers = Alexa.CreateStateHandler(states.ADDWORDMODE, {
    NewSession: function () {
        this.handler.state = '';
        this.emitWithState('NewSession'); // Call 'NewSession' from newSessionHandlers
    },
    SpellingIntent: function () {
        if (this.event.request.intent.name === "SpellingIntent") {
            this.attributes['spelt'] = this.event.request.intent.slots.Spelling.value.toLowerCase();
        }
        this.emit(':ask', util.format(DIALOG.confirmAddWord, this.attributes['spelt']), DIALOG.confirmAddWordReprompt);
    },
    'AMAZON.YesIntent': function () {
        var speechOutput;
        // Is it empty
        if (this.attributes['spelt'] === EMPTY_STRING || !this.attributes['spelt']) {
            this.emitWithState('Unhandled');
            return;
        }
        // Is word a duplicate? 
        if (this.attributes['words'].indexOf(this.attributes['spelt']) !== -1) {
            speechOutput = util.format(DIALOG.duplicateEntry, this.attributes['spelt']) + ' ' + DIALOG.addWord + ' ' + DIALOG.cancelEdit;
            this.attributes['spelt'] = EMPTY_STRING;
            this.emit(':ask', speechOutput, DIALOG.addWord + ' ' + DIALOG.cancelEdit);
            return;
        }
        // Ok to save
        speechOutput = util.format(DIALOG.wordAdded, this.attributes['spelt']) + ' ' + DIALOG.cancelEdit;
        this.attributes['words'].push(this.attributes['spelt'].toString());
        this.attributes['spelt'] = EMPTY_STRING;
        this.emit(':ask', speechOutput, DIALOG.addWord + ' ' + DIALOG.cancelEdit);
    },
    'AMAZON.NoIntent': function () {        
        this.attributes['spelt'] = EMPTY_STRING;
        this.emit(':ask', DIALOG.addWord + ' ' + DIALOG.cancelEdit);
    },
    'AMAZON.RepeatIntent': function () {
        if (this.attributes['spelt'] !== EMPTY_STRING) {
            this.emitWithState('SpellingIntent');
        } else {
            this.emitWithState('AMAZON.StartOverIntent');
        }
    },
    'AMAZON.StartOverIntent': function () {
        this.handler.state = states.MENUMODE;
        this.emitWithState('AddWordIntent');
    },
    'AMAZON.PreviousIntent': function () {
        this.emitWithState('AMAZON.CancelIntent');
    },
    'AMAZON.StopIntent': function () {
        this.emitWithState('AMAZON.CancelIntent');
    },
    'AMAZON.CancelIntent': function () {
        this.attributes['spelt'] = EMPTY_STRING;
        this.emitWithState('NewSession');
    },
    SessionEndedRequest: function () {
        this.attributes['spelt'] = EMPTY_STRING;
        this.emit(':saveState', true); // Save session attributes to DynamoDB 
    },
    Unhandled: function () {
        // Undefined intents will be caught by the 'Unhandled' handler
        if (this.attributes['spelt'] !== EMPTY_STRING) {
            this.emit(':ask', DIALOG.confirmAddWord, DIALOG.confirmAddWordReprompt);
        } else {
            this.emit(':ask', DIALOG.sorry + ' ' + DIALOG.addWord + ' ' + DIALOG.cancelEdit, DIALOG.addWord + ' ' + DIALOG.cancelEdit);
        }
    }
});


// Handlers for DELETE WORD state
// This allows for the user to delete words from their spelling list
var deleteWordModeHandlers = Alexa.CreateStateHandler(states.DELETEWORDMODE, {
    NewSession: function () {
        this.handler.state = '';
        this.emitWithState('NewSession'); // Call 'NewSession' from newSessionHandlers
    },
    SpellingIntent: function () {
        if (this.event.request.intent.name === "SpellingIntent") {
            this.attributes['spelt'] = this.event.request.intent.slots.Spelling.value.toLowerCase();
        }
        this.emit(':ask', util.format(DIALOG.confirmDeleteWord, this.attributes['spelt']), DIALOG.confirmDeleteWordReprompt);
    },
    'AMAZON.YesIntent': function () {
        var speechOutput;
        // Is it empty
        if (this.attributes['spelt'] === EMPTY_STRING || !this.attributes['spelt']) {
            this.emitWithState('Unhandled');
            return;
        }
        // Is word in list
        if (this.attributes['words'].indexOf(this.attributes['spelt']) === -1) {
            speechOutput = util.format(DIALOG.cannotDeleteWord, this.attributes['spelt']) + ' ' + DIALOG.deleteWord + ' ' + DIALOG.cancelEdit;
            this.attributes['spelt'] = EMPTY_STRING;
            this.emit(':ask', speechOutput, DIALOG.deleteWord + ' ' + DIALOG.cancelEdit);
            return;
        }
        // Ok to remove
        speechOutput = util.format(DIALOG.wordDeleted, this.attributes['spelt']) + ' ' + DIALOG.cancelEdit;
        this.attributes['words'].splice(this.attributes['words'].indexOf(this.attributes['spelt'].toString()), 1);
        this.attributes['spelt'] = EMPTY_STRING;
        this.emit(':ask', speechOutput, DIALOG.deleteWord + ' ' + DIALOG.cancelEdit);
    },
    'AMAZON.NoIntent': function () {        
        this.attributes['spelt'] = EMPTY_STRING;
        this.emit(':ask', DIALOG.deleteWord + ' ' + DIALOG.cancelEdit);
    },
    'AMAZON.RepeatIntent': function () {
        if (this.attributes['spelt'] !== EMPTY_STRING) {
            this.emitWithState('SpellingIntent');
        } else {
            this.emitWithState('AMAZON.StartOverIntent');
        }
    },
    'AMAZON.StartOverIntent': function () {
        this.handler.state = states.MENUMODE;
        this.emitWithState('DeleteWordIntent');
    },
    'AMAZON.PreviousIntent': function () {
        this.emitWithState('AMAZON.CancelIntent');
    },
    'AMAZON.StopIntent': function () {
        this.emitWithState('AMAZON.CancelIntent');
    },
    'AMAZON.CancelIntent': function () {
        this.attributes['spelt'] = EMPTY_STRING;
        this.emitWithState('NewSession');
    },
    SessionEndedRequest: function () {
        this.attributes['spelt'] = EMPTY_STRING;
        this.emit(':saveState', true); // Save session attributes to DynamoDB 
    },
    Unhandled: function () {
        // Undefined intents will be caught by the 'Unhandled' handler
        if (this.attributes['spelt'] !== EMPTY_STRING) {
            this.emit(':ask', DIALOG.confirmDeleteWord, DIALOG.confirmDeleteWordReprompt);
        } else {
            this.emit(':ask', DIALOG.sorry + ' ' + DIALOG.deleteWord + ' ' + DIALOG.cancelEdit, DIALOG.deleteWord + ' ' + DIALOG.cancelEdit);
        }
    }
});


// Handlers for DELETE SPELLING LIST state
// This allows for the user to delete all words from their spelling list
var deleteListModeHandlers = Alexa.CreateStateHandler(states.DELETELISTMODE, {
    NewSession: function () {
        this.handler.state = '';
        this.emitWithState('NewSession'); // Call 'NewSession' from newSessionHandlers
    },
    'AMAZON.YesIntent': function () {
        this.handler.state = states.MENUMODE;
        this.attributes['words'] = [];
        this.emit(':ask', DIALOG.listDeleted + ' ' + DIALOG.onBoarding , DIALOG.onBoardingReprompt);
    },
    'AMAZON.NoIntent': function () {
        this.emitWithState('AMAZON.CancelIntent');
    },
    'AMAZON.RepeatIntent': function () {
        this.emitWithState('AMAZON.StartOverIntent');
    },
    'AMAZON.StartOverIntent': function () {
        this.handler.state = states.MENUMODE;
        this.emitWithState('DeleteAllWordsIntent');
    },
    'AMAZON.PreviousIntent': function () {
        this.emitWithState('AMAZON.CancelIntent');
    },
    'AMAZON.StopIntent': function () {
        this.emitWithState('AMAZON.CancelIntent');
    },
    'AMAZON.CancelIntent': function () {
        this.emitWithState('NewSession');
    },
    SessionEndedRequest: function () {
        this.emit(':saveState', true); // Save session attributes to DynamoDB 
    },
    Unhandled: function () {
        // Undefined intents will be caught by the 'Unhandled' handler
        this.emit(':ask', DIALOG.sorry + ' ' + DIALOG.confirmDeleteList, DIALOG.confirmDeleteListReprompt);
    }
});


// Handlers for READ LIST state
// This allows for the user to hear all words on their spelling list
var readListModeHandlers = Alexa.CreateStateHandler(states.READLISTMODE, {
    NewSession: function () {
        this.handler.state = '';
        this.emitWithState('NewSession'); // Call 'NewSession' from newSessionHandlers
    },
    'AMAZON.YesIntent': function () {
        this.emitWithState('AMAZON.StartOverIntent');
    },
    'AMAZON.NoIntent': function () {
        this.emitWithState('AMAZON.CancelIntent');
    },
    'AMAZON.RepeatIntent': function () {
        this.emitWithState('AMAZON.StartOverIntent');
    },
    'AMAZON.StartOverIntent': function () {
        this.handler.state = states.MENUMODE;
        this.emitWithState('ReadWordsIntent');
    },
    'AMAZON.PreviousIntent': function () {
        this.emitWithState('AMAZON.CancelIntent');
    },
    'AMAZON.StopIntent': function () {
        this.emitWithState('AMAZON.CancelIntent');
    },
    'AMAZON.CancelIntent': function () {
        this.emitWithState('NewSession');
    },
    SessionEndedRequest: function () {
        this.emit(':saveState', true); // Save session attributes to DynamoDB 
    },
    Unhandled: function () {
        // Undefined intents will be caught by the 'Unhandled' handler
        this.emit(':ask', DIALOG.sorry + ' ' + DIALOG.readWordsReprompt, DIALOG.readWordsReprompt);
    }
});


// Handlers for SPELL TEST state
// This allows for the user to practice their spellings
var spellTestModeHandlers = Alexa.CreateStateHandler(states.SPELLTESTMODE, {
    NewSession: function () {
        this.handler.state = '';
        this.emitWithState('NewSession'); // Call 'NewSession' from newSessionHandlers
    },
    SpellingIntent: function () {
        if (this.event.request.intent.name === "SpellingIntent") {
            this.attributes['spelt'] = this.event.request.intent.slots.Spelling.value.toLowerCase();
        }
        this.emit(':ask', util.format(DIALOG.confirmSpeltWord, spellOutWord(this.attributes['spelt'])), DIALOG.confirmSpeltWordReprompt);
    },
    SpellWordIntent: function() {
        var currentWord = this.attributes['words'][this.attributes['currentWordIndex']];
        this.emit(':ask', util.format(DIALOG.spellingWord, currentWord, spellOutWord(currentWord), currentWord),  util.format(DIALOG.spellWord, currentWord));
    },
    'AMAZON.YesIntent': function () {
        var currentWord = this.attributes['words'][this.attributes['currentWordIndex']];
        var speechOutput;

        //Is it correct?
        if (this.attributes['spelt'] === currentWord ) {
            this.attributes['score'] += 1;
            speechOutput = DIALOG.correct;
        } else {
            speechOutput = DIALOG.incorrect;
        }

        // Clear spelt word
        this.attributes['spelt'] = EMPTY_STRING;

        //Is this last word?
        if (this.attributes['currentWordIndex'] + 2 < this.attributes['words'].length) {
            this.attributes['currentWordIndex'] += 1;
            currentWord = this.attributes['words'][this.attributes['currentWordIndex']];
            this.emit(':ask', speechOutput + ' ' + util.format(DIALOG.spellWord, currentWord), util.format(DIALOG.spellWord, currentWord));
        } else {
            // Quiz Over
            this.attributes['currentWordIndex'] = 0;
            this.handler.state = states.MENUMODE;
            this.emit(':ask', speechOutput + ' ' + util.format(DIALOG.testSummary, this.attributes['score'], this.attributes['words'].length) + ' ' + DIALOG.youCanSay, DIALOG.youCanSay);
        }
    },
    'AMAZON.NoIntent': function () {
        
    },
    'AMAZON.RepeatIntent': function () {
        var currentWord = this.attributes['words'][this.attributes['currentWordIndex']];
        if (this.attributes['spelt'] !== EMPTY_STRING) {
            this.emitWithState('SpellingIntent');
        } else {
            this.emit(':ask', util.format(DIALOG.spellWord, currentWord), util.format(DIALOG.spellWord, currentWord));
        }
    },
    'AMAZON.StartOverIntent': function () {
        this.attributes['currentWordIndex'] = 0;
        this.handler.state = states.MENUMODE;
        this.emitWithState('StartTestIntent');
    },
    'AMAZON.PreviousIntent': function () {
        this.emitWithState('AMAZON.CancelIntent');
    },
    'AMAZON.StopIntent': function () {
        this.emitWithState('AMAZON.CancelIntent');
    },
    'AMAZON.CancelIntent': function () {
        this.emitWithState('NewSession');
    },
    SessionEndedRequest: function () {
        this.emit(':saveState', true); // Save session attributes to DynamoDB 
    },
    Unhandled: function () {
        var currentWord = this.attributes['words'][this.attributes['currentWordIndex']];
        // Undefined intents will be caught by the 'Unhandled' handler
        this.emit(':ask', DIALOG.sorry + ' ' + util.format(DIALOG.spellWord, currentWord) + ' ' + DIALOG.cancelEdit, util.format(DIALOG.spellWord, currentWord) + ' ' + DIALOG.cancelEdit);
    }
});


function spellOutWord(spelling) {
    return spelling.toUpperCase().split('').join(",<break time=\"0.6s\"/>") + "<break time=\"0.6s\"/>";
}