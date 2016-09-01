'use strict';

var Alexa = require('alexa-sdk');
var util = require('util');
var DIALOG = require('./dialog.json');
var AUTH = require('./auth.json'); // Stores
var APP_ID = AUTH.APP_ID;
var SKILL_NAME = AUTH.SKILL_NAME;

// Define Skill's states:
// this means you can set intent handlers to
// only work when the skill is in a specific state
var states = {
    MENUMODE: '_MENUMODE', // Main menu state. Controls onboarding and main actions
    ADDWORDMODE: '_ADDWORDMODE', // Where user can add a word
    DELETEWORDMODE: '_DELETEWORDMODE', // Where user can delete a word
    DELETELISTMODE: '_DELETELISTMODE', // Where user can delete all words
    READLISTMODE: '_READLISTMODE', // Where user can have the skill repeat the words they have added to their spelling list
    SPELLTESTMODE: '_SPELLTESTMODE' // Where user can practice their spellings
};

exports.handler = function (event, context, callback) {
    var alexa = Alexa.handler(event, context);
    alexa.appId = APP_ID;
    alexa.dynamoDBTableName = AUTH.TABLE_NAME;
    // Add all handlers here:
    alexa.registerHandlers(initHandlers, mainMenuHandlers, addWordHandlers, deleteWordHandlers, deleteListHandlers, readListHandlers, spellTestHandlers);
    alexa.execute();
};


var initHandlers = {
    NewSession: function () {
        // First time user invokes skill
        //console.log("NewSession: " + JSON.stringify(this));
        this.emit('LaunchRequest', true);
    },
    LaunchRequest: function(isNewSession) {
        // User invokes skill without providing a specific intent.
        //console.log("LaunchRequest: " + JSON.stringify(this));
        // If no attributes have been set we need to define them here
        /*if (Object.keys(this.attributes).length === 0) {
            this.attributes['words'] = []; // spelling list
            this.attributes['score'] = 0; // user's current spelling test score
            this.attributes['currentWordIndex'] = 0; // current word user is on in spelling test
            this.attributes['spelt'] = EMPTY_STRING; // user spelt word - cannot be empty string
        }*/
        // Set the skill's state to main menu
        this.handler.state = states.MENUMODE;
        // Check if the user is invoking skill with an intent and that intent is not a new session
        if (this.event.request.type === "IntentRequest" && this.event.request.intent.name != "NewSession") {
            this.emitWithState(this.event.request.intent.name, isNewSession);
        } else {
            this.emitWithState('LaunchRequest', isNewSession);
        }
    },
    SessionEndedRequest: function () {
        // Sent when the current skill session ends for any reason other than code closing the session
        //console.log("SessionEndedRequest: " + JSON.stringify(this));
        this.handler.state = ''; // unset the state
        this.emit(':saveState', true); // Save session attributes to DynamoDB
    },
    Unhandled: function() {
        // When skill does not recognize intent
        //console.log("Unhandled: " + JSON.stringify(this));
        this.emit('LaunchRequest');
    }
};

// Handlers for when user is in the Main Menu
var mainMenuHandlers = Alexa.CreateStateHandler(states.MENUMODE, {
    LaunchRequest: function(isNewSession) {
        var speechOutput = "";
        //console.log("MainMenu/LaunchRequest: " + isNewSession + " --- " + JSON.stringify(this));
        // Add welcome message if new session
        if (isNewSession) {
            speechOutput += DIALOG.welcome + " ";
        }
        // Check if user needs onBoarding
        if (this.attributes.hasOwnProperty('words') && this.attributes['words'].length > 0) {
            // List main menu
            speechOutput += util.format(DIALOG.mainMenu, this.attributes['words'].length, this.attributes['words'].length === 1 ? "" : "s");
            speechOutput += " " + DIALOG.youCanSay;
            this.emit(':ask', speechOutput, DIALOG.youCanSay);
        } else {
            // onboarding
            speechOutput += DIALOG.onBoarding;
            this.emit(':ask', speechOutput, DIALOG.onBoardingReprompt);
        }
    },
    AddWordIntent: function (isNewSession) {
        //console.log("MainMenu/AddWordIntent: " + JSON.stringify(this));
        this.handler.state = states.ADDWORDMODE;
        this.emit(':ask', DIALOG.addWord + ' ' + DIALOG.cancelEdit, DIALOG.addWord + ' ' + DIALOG.cancelEdit);
    },
    DeleteWordIntent: function (isNewSession) {
        //console.log("MainMenu/DeleteWordIntent: " + JSON.stringify(this));
        if (this.attributes.hasOwnProperty('words') && this.attributes['words'].length > 0) {
            this.handler.state = states.DELETEWORDMODE;
            this.emit(':ask', DIALOG.deleteWord + ' ' + DIALOG.cancelEdit, DIALOG.deleteWord + ' ' + DIALOG.cancelEdit);
        } else {
            this.emit(':ask', DIALOG.cantDoThis + " " + DIALOG.onBoarding, DIALOG.onBoardingReprompt);
        }
    },
    DeleteAllWordsIntent: function (isNewSession) {
        //console.log("MainMenu/DeleteAllWordsIntent: " + JSON.stringify(this));
        if (this.attributes.hasOwnProperty('words') && this.attributes['words'].length > 0) {
            this.handler.state = states.DELETELISTMODE;
            this.emit(':ask', DIALOG.confirmDeleteList, DIALOG.confirmDeleteListReprompt + ' ' + DIALOG.cancelEdit);
        } else {
            this.emit(':ask', DIALOG.cantDoThis + " " + DIALOG.onBoarding, DIALOG.onBoardingReprompt);
        }
    },
    ReadWordsIntent: function (isNewSession) {
        //console.log("MainMenu/ReadWordsIntent: " + JSON.stringify(this));
        if (this.attributes.hasOwnProperty('words') && this.attributes['words'].length > 0) {
            this.handler.state = states.READLISTMODE;
            var listOfWords = this.attributes['words'].join(",<break time=\"0.6s\"/>") + "<break time=\"0.6s\"/>";
            this.emit(':ask', util.format(DIALOG.readWords, this.attributes['words'].length, (this.attributes['words'].length === 1 ? "" : "s"), listOfWords), DIALOG.readWordsReprompt);
        } else {
            this.emit(':ask', DIALOG.cantDoThis + " " + DIALOG.onBoarding, DIALOG.onBoardingReprompt);
        }
    },
    StartTestIntent: function (isNewSession) {
        //console.log("MainMenu/StartTestIntent: " + JSON.stringify(this));
        if (this.attributes.hasOwnProperty('words') && this.attributes['words'].length > 0) {
            this.handler.state = states.SPELLTESTMODE;
            // New
            this.attributes['currentWordIndex'] = 0;
            this.attributes['score'] = 0;
            this.emit(':ask', DIALOG.startingSpellingTest + ' ' + util.format(DIALOG.spellWord, this.attributes['words'][0]), util.format(DIALOG.spellWord, this.attributes['words'][0]));
        } else {
            this.emit(':ask', DIALOG.cantDoThis + " " + DIALOG.onBoarding, DIALOG.onBoardingReprompt);
        }
    },
    'AMAZON.StopIntent': function () {
        //console.log("MainMenu/StopIntent: " + JSON.stringify(this));
        this.emitWithState('AMAZON.CancelIntent');
    },
    'AMAZON.CancelIntent': function () {
        //console.log("MainMenu/CancelIntent: " + JSON.stringify(this));
        this.emit(':saveState', true); // Save session attributes to DynamoDB
        this.emit(':tell', DIALOG.goodBye);
    },
    SessionEndedRequest: function () {
        //console.log("MainMenu/SessionEndedRequest: " + JSON.stringify(this));
        this.emit(':saveState', true); // Save session attributes to DynamoDB
    },
    'AMAZON.HelpIntent': function () {
        if (this.attributes.hasOwnProperty('words') && this.attributes['words'].length > 0) {
            this.emit(':ask', DIALOG.helpMenu + ' ' + DIALOG.helpNav, DIALOG.helpNav);
        } else {
            this.emit(':ask', DIALOG.helpMenu + ' ' + DIALOG.helpOnBoarding, DIALOG.helpOnBoarding);
        }
    },
    Unhandled: function(isNewSession) {
        // When skill does not recognize intent
        //console.log("Unhandled: " + JSON.stringify(this));
        if (this.attributes.hasOwnProperty('words') && this.attributes['words'].length > 0) {
            this.emit(':ask', DIALOG.sorry + ' ' + DIALOG.youCanSay, DIALOG.youCanSay);
        } else {
            this.emit(':ask', DIALOG.sorry + ' ' + DIALOG.onBoarding, DIALOG.onBoardingReprompt);
        }
    }
});


// Handlers for ADD WORD state
// This allows for the user to add words to their spelling list
var addWordHandlers = Alexa.CreateStateHandler(states.ADDWORDMODE, {
    SpellingIntent: function () {
        //console.log("SpellingIntent" + JSON.stringify(this));
        if (this.event.request.intent.name === "SpellingIntent") {
            this.attributes['spelt'] = this.event.request.intent.slots.Spelling.value.toLowerCase();
        }
        this.emit(':ask', util.format(DIALOG.confirmAddWord, this.attributes['spelt']), DIALOG.confirmAddWordReprompt);
    },
    'AMAZON.YesIntent': function () {
        // Is it empty
       if (this.attributes.hasOwnProperty('spelt') && this.attributes['spelt'].length > 0) {
            var currentWord = this.attributes['spelt'].toString();
            delete(this.attributes['spelt']);
            // Create words array if it does not exist
            if (!this.attributes.hasOwnProperty('words')) {
                this.attributes['words'] = [];
            }
            // Is word a duplicate? 
            if (this.attributes['words'].indexOf(currentWord) !== -1) {
                // Duplicate
                this.emit(':ask', util.format(DIALOG.duplicateEntry, currentWord) + ' ' + DIALOG.addWord + ' ' + DIALOG.cancelEdit, DIALOG.addWord + ' ' + DIALOG.cancelEdit);
            } else {
                // OK To save
                this.attributes['words'].push(currentWord);
                this.emit(':ask', util.format(DIALOG.wordAdded, currentWord) + ' ' + DIALOG.cancelEdit, DIALOG.addWord + ' ' + DIALOG.cancelEdit);
            }
        } else {
            // Empty
            this.emitWithState('Unhandled');
        }
    },
    SpellWordIntent: function() {
        // Is there a word?
        if (this.attributes.hasOwnProperty('spelt') && this.attributes['spelt'].length > 0) {
            var currentWord = this.attributes['spelt'].toString();
            this.emit(':ask', util.format(DIALOG.spellingWordAddToList, currentWord, spellOutWord(currentWord)),  DIALOG.confirmAddWordReprompt);
        } else {
            this.emitWithState('Unhandled');
        }
    },
    'AMAZON.NoIntent': function () {        
        this.emitWithState('AMAZON.StartOverIntent');
    },
    'AMAZON.RepeatIntent': function () {
        if (this.attributes.hasOwnProperty('spelt') && this.attributes['spelt'].length > 0) {
            this.emitWithState('SpellingIntent');
        } else {
            this.emitWithState('AMAZON.StartOverIntent');
        }
    },
    'AMAZON.PreviousIntent': function () {
        this.emitWithState('AMAZON.CancelIntent');
    },
    'AMAZON.StopIntent': function () {
        this.emitWithState('AMAZON.CancelIntent');
    },
    'AMAZON.StartOverIntent': function () {
        delete(this.attributes['spelt']);
        this.handler.state = states.MENUMODE;
        this.emitWithState('AddWordIntent');
    },
    'AMAZON.CancelIntent': function () {
        delete(this.attributes['spelt']);
        this.handler.state = states.MENUMODE;
        this.emitWithState('LaunchRequest');
    },
    SessionEndedRequest: function () {
        delete(this.attributes['spelt']);
        this.handler.state = states.MENUMODE;
        this.emit(':saveState', true); // Save session attributes to DynamoDB 
    },
    'AMAZON.HelpIntent': function () {
        if (this.attributes.hasOwnProperty('spelt') && this.attributes['spelt'].length > 0) {
            this.emit(':ask', DIALOG.helpMenu + ' ' + util.format(DIALOG.confirmAddWordHelp, this.attributes['spelt']) + ' ' + DIALOG.cancelToMenu, DIALOG.confirmAddWordReprompt + ' ' + DIALOG.cancelToMenu);
        } else {
            this.emit(':ask', DIALOG.helpMenu + ' ' + DIALOG.addWord + ' ' + DIALOG.cancelToMenu, DIALOG.addWord + ' ' + DIALOG.cancelToMenu);
        }
    },
    Unhandled: function () {
        // Undefined intents will be caught by the 'Unhandled' handler
        if (this.attributes.hasOwnProperty('spelt') && this.attributes['spelt'].length > 0) {
            this.emit(':ask', DIALOG.sorry + ' ' + util.format(DIALOG.confirmAddWord, this.attributes['spelt']), DIALOG.confirmAddWordReprompt);
        } else {
            this.emit(':ask', DIALOG.sorry + ' ' + DIALOG.addWord + ' ' + DIALOG.cancelEdit, DIALOG.addWord + ' ' + DIALOG.cancelEdit);
        }
    }
});

// Handlers for DELETE WORD state
// This allows for the user to delete words from their spelling list
var deleteWordHandlers = Alexa.CreateStateHandler(states.DELETEWORDMODE, {
    SpellingIntent: function () {
        //console.log("SpellingIntent" + JSON.stringify(this));
        if (this.event.request.intent.name === "SpellingIntent") {
            this.attributes['spelt'] = this.event.request.intent.slots.Spelling.value.toLowerCase();
        }
        this.emit(':ask', util.format(DIALOG.confirmDeleteWord, this.attributes['spelt']), DIALOG.confirmDeleteWordReprompt);
    },
    'AMAZON.YesIntent': function () {
        // Is it empty
       if (this.attributes.hasOwnProperty('spelt') && this.attributes['spelt'].length > 0) {
            var currentWord = this.attributes['spelt'].toString();
            delete(this.attributes['spelt']);
            // Create words array if it does not exist
            if (!this.attributes.hasOwnProperty('words')) {
                this.attributes['words'] = [];
            }
            // Is word in spelling list? 
            //console.log("YES: " + this.attributes['words'].indexOf(currentWord) + " | " + currentWord + " | " + this.attributes['words'])
            if (this.attributes['words'].indexOf(currentWord) === -1) {
                // Not in list
                this.emit(':ask', util.format(DIALOG.cannotDeleteWord, currentWord) + ' ' + DIALOG.deleteWord + ' ' + DIALOG.cancelEdit, DIALOG.deleteWord + ' ' + DIALOG.cancelEdit);
            } else {
                // OK To remove
                this.attributes['words'].splice(this.attributes['words'].indexOf(currentWord), 1);
                this.emit(':ask', util.format(DIALOG.wordDeleted, currentWord) + ' ' + DIALOG.cancelEdit, DIALOG.deleteWord + ' ' + DIALOG.cancelEdit);
            }
        } else {
            // Empty
            this.emitWithState('Unhandled');
        }
    },
    SpellWordIntent: function() {
        // Is there a word?
        if (this.attributes.hasOwnProperty('spelt') && this.attributes['spelt'].length > 0) {
            var currentWord = this.attributes['spelt'].toString();
            this.emit(':ask', util.format(DIALOG.spellingWordDeleteToList, currentWord, spellOutWord(currentWord)),  DIALOG.confirmDeleteWordReprompt);
        } else {
            this.emitWithState('Unhandled');
        }
    },
    'AMAZON.NoIntent': function () {        
        this.emitWithState('AMAZON.StartOverIntent');
    },
    'AMAZON.RepeatIntent': function () {
        if (this.attributes.hasOwnProperty('spelt') && this.attributes['spelt'].length > 0) {
            this.emitWithState('SpellingIntent');
        } else {
            this.emitWithState('AMAZON.StartOverIntent');
        }
    },
    'AMAZON.PreviousIntent': function () {
        this.emitWithState('AMAZON.CancelIntent');
    },
    'AMAZON.StopIntent': function () {
        this.emitWithState('AMAZON.CancelIntent');
    },
    'AMAZON.StartOverIntent': function () {
        delete(this.attributes['spelt']);
        this.handler.state = states.MENUMODE;
        this.emitWithState('DeleteWordIntent');
    },
    'AMAZON.CancelIntent': function () {
        delete(this.attributes['spelt']);
        this.handler.state = states.MENUMODE;
        this.emitWithState('LaunchRequest');
    },
    SessionEndedRequest: function () {
        delete(this.attributes['spelt']);
        this.handler.state = states.MENUMODE;
        this.emit(':saveState', true); // Save session attributes to DynamoDB 
    },
    'AMAZON.HelpIntent': function () {
        if (this.attributes.hasOwnProperty('spelt') && this.attributes['spelt'].length > 0) {
            this.emit(':ask', DIALOG.helpMenu + ' ' + util.format(DIALOG.confirmDeleteWordHelp, this.attributes['spelt']) + ' ' + DIALOG.cancelToMenu, DIALOG.confirmDeleteWordReprompt + ' ' + DIALOG.cancelToMenu);
        } else {
            this.emit(':ask', DIALOG.helpMenu + ' ' + DIALOG.deleteWord + ' ' + DIALOG.cancelToMenu, DIALOG.deleteWord + ' ' + DIALOG.cancelToMenu);
        }
    },
    Unhandled: function () {
        // Undefined intents will be caught by the 'Unhandled' handler
        if (this.attributes.hasOwnProperty('spelt') && this.attributes['spelt'].length > 0) {
            this.emit(':ask', DIALOG.sorry + ' ' + util.format(DIALOG.confirmDeleteWord, this.attributes['spelt']), DIALOG.confirmDeleteListReprompt);
        } else {
            this.emit(':ask', DIALOG.sorry + ' ' + DIALOG.deleteWord + ' ' + DIALOG.cancelEdit, DIALOG.deleteWord + ' ' + DIALOG.cancelEdit);
        }
    }
});

// Handlers for DELETE SPELLING LIST state
// This allows for the user to delete all words from their spelling list
var deleteListHandlers = Alexa.CreateStateHandler(states.DELETELISTMODE, {
    'AMAZON.YesIntent': function () {
        this.handler.state = states.MENUMODE;
        delete(this.attributes['words']);
        this.emit(':ask', DIALOG.listDeleted + ' ' + DIALOG.onBoarding , DIALOG.onBoardingReprompt);
    },
    'AMAZON.NoIntent': function () {
        this.emitWithState('AMAZON.CancelIntent');
    },
    'AMAZON.RepeatIntent': function () {
        this.emitWithState('AMAZON.StartOverIntent');
    },
    'AMAZON.PreviousIntent': function () {
        this.emitWithState('AMAZON.CancelIntent');
    },
    'AMAZON.StopIntent': function () {
        this.emitWithState('AMAZON.CancelIntent');
    },
    'AMAZON.StartOverIntent': function () {
        this.handler.state = states.MENUMODE;
        this.emitWithState('DeleteAllWordsIntent');
    },
    'AMAZON.CancelIntent': function () {
        this.handler.state = states.MENUMODE;
        this.emitWithState('LaunchRequest');
    },
    SessionEndedRequest: function () {
        this.handler.state = states.MENUMODE;
        this.emit(':saveState', true); // Save session attributes to DynamoDB 
    },
    'AMAZON.HelpIntent': function () {
        this.emit(':ask', DIALOG.helpMenu + ' ' + DIALOG.confirmDeleteList + ' ' + DIALOG.cancelToMenu, DIALOG.confirmDeleteListReprompt + ' ' + DIALOG.cancelToMenu);
    },
    Unhandled: function () {
        // Undefined intents will be caught by the 'Unhandled' handler
        this.emit(':ask', DIALOG.sorry + ' ' + DIALOG.confirmDeleteList, DIALOG.confirmDeleteListReprompt);
    }
});

// Handlers for READ LIST state
// This allows for the user to hear all words on their spelling list
var readListHandlers = Alexa.CreateStateHandler(states.READLISTMODE, {
    'AMAZON.YesIntent': function () {
        this.emitWithState('AMAZON.StartOverIntent');
    },
    'AMAZON.NoIntent': function () {
        this.emitWithState('AMAZON.CancelIntent');
    },
    'AMAZON.RepeatIntent': function () {
        this.emitWithState('AMAZON.StartOverIntent');
    },
    'AMAZON.StopIntent': function () {
        this.emitWithState('AMAZON.CancelIntent');
    },
    'AMAZON.PreviousIntent': function () {
        this.emitWithState('AMAZON.CancelIntent');
    },
    'AMAZON.StartOverIntent': function () {
        this.handler.state = states.MENUMODE;
        this.emitWithState('ReadWordsIntent');
    },
    'AMAZON.CancelIntent': function () {
        this.handler.state = states.MENUMODE;
        this.emitWithState('LaunchRequest');
    },
    SessionEndedRequest: function () {
        this.handler.state = states.MENUMODE;
        this.emit(':saveState', true); // Save session attributes to DynamoDB 
    },
    'AMAZON.HelpIntent': function () {
        this.emit(':ask', DIALOG.helpMenu + ' ' + DIALOG.readWordsReprompt, DIALOG.readWordsReprompt);
    },
    Unhandled: function () {
        // Undefined intents will be caught by the 'Unhandled' handler
        this.emit(':ask', DIALOG.sorry + ' ' + DIALOG.readWordsReprompt, DIALOG.readWordsReprompt);
    }
});

// Handlers for SPELL TEST state
// This allows for the user to practice their spellings
var spellTestHandlers = Alexa.CreateStateHandler(states.SPELLTESTMODE, {
    SpellingIntent: function () {
        //console.log("spellTestHandlers/SpellingIntent" + JSON.stringify(this));
        if (this.event.request.intent.name === "SpellingIntent") {
            this.attributes['spelt'] = this.event.request.intent.slots.Spelling.value.toLowerCase();
        }
        this.emit(':ask', util.format(DIALOG.confirmSpeltWord, spellOutWord(this.attributes['spelt'])), DIALOG.confirmSpeltWordReprompt);
    },
    /**/
    'AMAZON.YesIntent': function () {
        // Is it empty
        if (this.attributes.hasOwnProperty('spelt') && this.attributes['spelt'].length > 0) {
            var usersWord = this.attributes['spelt'].toString();
            var currentWord = this.attributes['words'][this.attributes['currentWordIndex']];
            var speechOutput;
            var score;
            delete(this.attributes['spelt']);

            // Is word spelt correctly? 
            if (usersWord !== currentWord ) {
                // No
                speechOutput = util.format(DIALOG.incorrect, currentWord, spellOutWord(currentWord));
            } else {
                // Yes
                this.attributes['score'] += 1;
                speechOutput = DIALOG.correct;
            }
            // Is last word?
            if (this.attributes['currentWordIndex'] + 2 <= this.attributes['words'].length) {
                // No
                this.attributes['currentWordIndex'] += 1;
                currentWord = this.attributes['words'][this.attributes['currentWordIndex']];
                this.emit(':ask', speechOutput + ' ' + util.format(DIALOG.spellWord, currentWord), util.format(DIALOG.spellWord, currentWord));
            } else {
                // Yes
                score = this.attributes['score'];
                delete(this.attributes['currentWordIndex']);
                delete(this.attributes['score']);
                this.handler.state = states.MENUMODE;
                this.emit(':ask', speechOutput + ' ' + util.format(DIALOG.testSummary, score, this.attributes['words'].length) + ' ' + DIALOG.youCanSay, DIALOG.youCanSay);
            }
        } else {
            // Empty
            this.emitWithState('Unhandled');
        }
    },
    /*'AMAZON.PauseIntent': function () {
        this.emitWithState('AMAZON.CancelIntent');
    },*/
    SpellWordIntent: function() {
        var currentWord = this.attributes['words'][this.attributes['currentWordIndex']];
        this.emit(':ask', util.format(DIALOG.spellingWord, currentWord, spellOutWord(currentWord), currentWord),  util.format(DIALOG.spellWord, currentWord));
    },
    'AMAZON.NoIntent': function () {
        delete(this.attributes['spelt']);
        this.emitWithState('AMAZON.RepeatIntent');
    },
    'AMAZON.RepeatIntent': function () {
        var currentWord = this.attributes['words'][this.attributes['currentWordIndex']];
        if (this.attributes.hasOwnProperty('spelt') && this.attributes['spelt'].length > 0) {
            this.emitWithState('SpellingIntent');
        } else {
            this.emit(':ask', util.format(DIALOG.spellWord, currentWord), util.format(DIALOG.spellWord, currentWord));
        }
    },
    'AMAZON.PreviousIntent': function () {
        this.emitWithState('AMAZON.CancelIntent');
    },
    'AMAZON.StopIntent': function () {
        this.emitWithState('AMAZON.CancelIntent');
    },
    'AMAZON.StartOverIntent': function () {
        delete(this.attributes['spelt']);
        delete(this.attributes['currentWordIndex']);
        delete(this.attributes['score']);
        this.handler.state = states.MENUMODE;
        this.emitWithState('StartTestIntent');
    },
    'AMAZON.CancelIntent': function () {
        delete(this.attributes['spelt']);
        delete(this.attributes['currentWordIndex']);
        delete(this.attributes['score']);
        this.handler.state = states.MENUMODE;
        this.emitWithState('LaunchRequest');
    },
    SessionEndedRequest: function () {
        delete(this.attributes['spelt']);
        delete(this.attributes['currentWordIndex']);
        delete(this.attributes['score']);
        this.handler.state = states.MENUMODE;
        this.emit(':saveState', true); // Save session attributes to DynamoDB 
    },
    'AMAZON.HelpIntent': function () {
        this.emit(':ask', DIALOG.helpMenu + ' ' + DIALOG.helpSpellTest + ' ' + DIALOG.cancelToMenu, DIALOG.helpSpellTest + ' ' + DIALOG.cancelToMenu);
    },
    Unhandled: function () {
        var currentWord = this.attributes['words'][this.attributes['currentWordIndex']];
        // Undefined intents will be caught by the 'Unhandled' handler
        if (this.attributes.hasOwnProperty('spelt') && this.attributes['spelt'].length > 0) {
            this.emitWithState('SpellingIntent');
        } else {
            this.emit(':ask', DIALOG.sorry + ' ' + util.format(DIALOG.spellWord, currentWord) + ' ' + DIALOG.cancelEdit, util.format(DIALOG.spellWord, currentWord) + ' ' + DIALOG.cancelEdit);
        }
    }
});

function spellOutWord(spelling) {
    return spelling.toUpperCase().split('').join("<break time=\"0.6s\"/>") + "<break time=\"0.6s\"/>";
}