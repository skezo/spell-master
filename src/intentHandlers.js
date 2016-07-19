'use strict';

var storage = require('./storage');
var dialog = require('./dialog.json');
var util = require('util');

var registerIntentHandlers = function (intentHandlers, skillContext) {

    var intentState;
    var speltWord = "";

    /**
     * Define Skill's Intent Handlers
     *
     *
     * For more info on built-in intents see:
     * https://developer.amazon.com/public/solutions/alexa/alexa-skills-kit/docs/implementing-the-built-in-intents#Available%20Built-in%20Intents
     */

    // Add word to quiz
    intentHandlers.AddWordIntent = function (intent, session, response) {
        var speechOutput;
        if (intentState === "StartSpellingTestIntent") {
            speechOutput = dialog.errors.spellTestInProgress;
            response.ask({type: 'SSML', speech: speechOutput});
            return;
        }
        intentState = "AddWordIntent";
        speechOutput = dialog.addWord;
        response.ask({type: 'SSML', speech: speechOutput}, {type: 'SSML', speech: speechOutput});
    };

    // Remove word from quiz
    intentHandlers.DeleteWordIntent = function (intent, session, response) {
        var speechOutput;
        if (intentState === "StartSpellingTestIntent") {
            speechOutput = dialog.errors.spellTestInProgress;
            response.ask({type: 'SSML', speech: speechOutput});
            return;
        }
        storage.loadQuiz(session, function (currentQuiz) {
            if (currentQuiz.data.words.length === 0) {
                response.ask({type: 'SSML', speech: dialog.errors.actions + " " + dialog.onBoarding});
                return;
            }
            intentState = "DeleteWordIntent";
            speechOutput = dialog.deleteWord;
            response.ask({type: 'SSML', speech: speechOutput}, {type: 'SSML', speech: speechOutput});
        });
    };

    // Delete all words from spelling list
    intentHandlers.DeleteSpellingListIntent = function (intent, session, response) {
        var speechOutput;
        if (intentState === "StartSpellingTestIntent") {
            speechOutput = dialog.errors.spellTestInProgress;
            response.ask({type: 'SSML', speech: speechOutput});
            return;
        }
        storage.loadQuiz(session, function (currentQuiz) {
            if (currentQuiz.data.words.length === 0) {
                response.ask({type: 'SSML', speech: dialog.errors.actions + " " + dialog.onBoarding});
                return;
            }
            // Set state
            intentState = "DeleteSpellingListIntent";
            // Reset quiz data
            currentQuiz.data.words = [];
            currentQuiz.data.currentWord = 0;
            currentQuiz.data.score = 0;
            currentQuiz.save(function () {
                response.ask({type: 'SSML', speech: dialog.allWordsDeleted + " " + dialog.onBoarding}, {type: 'SSML', speech: dialog.onBoarding});
            });

        });
    };

    // List/Read words in quiz
    intentHandlers.ReadWordsIntent = function (intent, session, response) {
        var speechOutput;
        if (intentState === "StartSpellingTestIntent") {
            speechOutput = dialog.errors.spellTestInProgress;
            response.ask({type: 'SSML', speech: speechOutput});
            return;
        }
        storage.loadQuiz(session, function (currentQuiz) {
            var wordCount = currentQuiz.data.words.length;
            var listOfWords;
            var plural = wordCount > 1 ? "s" : "";
            var youCanSay = dialog.youCanSay + " " +
                    dialog.actions.spellingTest + " " +
                    dialog.actions.addWord + " " +
                    dialog.actions.deleteWord + " " +
                    dialog.actions.listWords + " " +
                    dialog.or + " " +
                    dialog.actions.help + " " +
                    ". " +
                    dialog.whatDo;
            if (wordCount === 0) {
                response.ask({type: 'SSML', speech: dialog.errors.actions + " " + dialog.onBoarding});
                return;
            }
            intentState = "ReadWordsIntent";
            listOfWords = currentQuiz.data.words.join(",<break time=\"0.8s\"/>") + "<break time=\"0.8s\"/>";
            speechOutput = util.format(dialog.readWords, wordCount, plural) + " " + listOfWords + " " + youCanSay;
            response.ask({type: 'SSML', speech: speechOutput});
        });
    };

    // Spell word
    intentHandlers.SpellWordIntent = function (intent, session, response) {
        storage.loadQuiz(session, function (currentQuiz) {
            var speechOutput;
            var youCanSay;
            var wordToSpell;

            if (currentQuiz.data.words.length > 0) {
                youCanSay = dialog.youCanSay + " " +
                        dialog.actions.spellingTest + " " +
                        dialog.actions.addWord + " " +
                        dialog.actions.deleteWord + " " +
                        dialog.actions.listWords + " " +
                        dialog.or + " " +
                        dialog.actions.help + " " +
                        ". " +
                        dialog.whatDo;
            } else {
                youCanSay = dialog.onBoarding;
            }

            if (intentState !== "StartSpellingTestIntent") {
                speechOutput = dialog.errors.actions + " " + youCanSay;
                response.ask({type: 'SSML', speech: speechOutput});
                return;
            }

            wordToSpell = currentQuiz.data.words[currentQuiz.data.currentWord];
            response.ask({type: 'SSML', speech: util.format(dialog.spellingWord, wordToSpell, wordToSpell)});
        });
    };

    // Repeat word
    intentHandlers.RepeatWordIntent = function (intent, session, response) {
        storage.loadQuiz(session, function (currentQuiz) {
            var speechOutput;
            var youCanSay;
            if (currentQuiz.data.words.length > 0) {
                youCanSay = dialog.youCanSay + " " +
                        dialog.actions.spellingTest + " " +
                        dialog.actions.addWord + " " +
                        dialog.actions.deleteWord + " " +
                        dialog.actions.listWords + " " +
                        dialog.or + " " +
                        dialog.actions.help + " " +
                        ". " +
                        dialog.whatDo;
            } else {
                youCanSay = dialog.onBoarding;
            }

            if (intentState !== "StartSpellingTestIntent") {
                speechOutput = dialog.errors.actions + " " + youCanSay;
                response.ask({type: 'SSML', speech: speechOutput});
                return;
            }
            response.ask({type: 'SSML', speech: util.format(dialog.spellWord, currentQuiz.data.words[currentQuiz.data.currentWord])});
        });
    };

    // Let the user stop an action (but remain in the skill
    // Let the user completely exit the skill
    // Recommended to map to "CancelIntent" in most cases
    intentHandlers['AMAZON.StopIntent'] = function (intent, session, response) {
        var youCanSay = dialog.youCanSay + " " +
                dialog.actions.spellingTest + " " +
                dialog.actions.addWord + " " +
                dialog.actions.deleteWord + " " +
                dialog.actions.listWords + " " +
                dialog.or + " " +
                dialog.actions.help + " " +
                ". " +
                dialog.whatDo;
        intentState = "CancelIntent";
        if (intentState !== "StartSpellingTestIntent") {
            response.tell({type: 'SSML', speech: dialog.goodBye});
        } else {
            response.ask({type: 'SSML', speech: dialog.exitSpellingTest + " " + youCanSay});
        }
    };

    intentHandlers['AMAZON.CancelIntent'] = function (intent, session, response) {
        var youCanSay = dialog.youCanSay + " " +
                dialog.actions.spellingTest + " " +
                dialog.actions.addWord + " " +
                dialog.actions.deleteWord + " " +
                dialog.actions.listWords + " " +
                dialog.or + " " +
                dialog.actions.help + " " +
                ". " +
                dialog.whatDo;
        intentState = "CancelIntent";
        if (intentState !== "StartSpellingTestIntent") {
            response.tell({type: 'SSML', speech: dialog.goodBye});
        } else {
            response.ask({type: 'SSML', speech: dialog.exitSpellingTest + " " + youCanSay});
        }
    };

    // Provide help about how to use the skill.
    intentHandlers['AMAZON.HelpIntent'] = function (intent, session, response) {
        storage.loadQuiz(session, function (currentQuiz) {
            var youCanSay;
            // Spell test in progress
            if (intentState === "StartSpellingTestIntent") {
                response.ask({type: 'SSML', speech: dialog.help.spelltest + " " + dialog.whatDo});
            } else {
                if (currentQuiz.data.words.length > 0) {
                    youCanSay = dialog.youCanSay + " " +
                            dialog.actions.spellingTest + " " +
                            dialog.actions.addWord + " " +
                            dialog.actions.deleteWord + " " +
                            dialog.actions.listWords + " " +
                            dialog.or + " " +
                            dialog.actions.help + " " +
                            ". " +
                            dialog.whatDo;
                } else {
                    youCanSay = dialog.onBoarding;
                }
                response.ask({type: 'SSML', speech: youCanSay});
            }
        });
    };


    // Start Quiz
    intentHandlers.StartSpellingTestIntent = function (intent, session, response) {
        var speechOutput;
        var reprompt;
        storage.loadQuiz(session, function (currentQuiz) {
            // Check if words list is empty
            if (currentQuiz.data.words.length === 0) {
                response.ask({type: 'SSML', speech: dialog.errors.actions + " " + dialog.onBoarding});
                return;
            }
            // Already in spelling test
            if (intentState === "StartSpellingTestIntent") {
                response.ask({type: 'SSML', speech: dialog.errors.actions + " " + dialog.help.spelltest + " " + dialog.whatDo});
                return;
            }

            intentState = "StartSpellingTestIntent";
            // Reset currentWord and score
            currentQuiz.data.currentWord = 0;
            currentQuiz.data.score = 0;
            // Save and play
            currentQuiz.save(function () {
                speechOutput = dialog.help.spelltest + " " + dialog.startingSpellingTest + " " + util.format(dialog.spellWord, currentQuiz.data.words[currentQuiz.data.currentWord]);
                reprompt = util.format(dialog.spellWord, currentQuiz.data.words[currentQuiz.data.currentWord]);
                response.ask({type: 'SSML', speech: speechOutput}, {type: 'SSML', speech: reprompt});
            });
        });
    };

    // Get letters from user
    intentHandlers.SpellingIntent = function (intent, session, response) {
        var speechOutput;
        var reprompt;
        speltWord = intent.slots.Spelling.value.toLowerCase();

        if (intentState === "AddWordIntent") {
            speechOutput = util.format(dialog.confirmAddWord, speltWord);
            reprompt = speechOutput;
            response.ask({type: 'SSML', speech: speechOutput}, {type: 'SSML', speech: reprompt});
        } else if (intentState === "DeleteWordIntent") {
            speechOutput = util.format(dialog.confirmDeleteWord, speltWord);
            reprompt = speechOutput;
            response.ask({type: 'SSML', speech: speechOutput}, {type: 'SSML', speech: reprompt});
        } else if (intentState === "StartSpellingTestIntent") {
            // Doing spelling test
            speechOutput = util.format(dialog.confirmSpeltWord, speltWord);
            reprompt = speechOutput;
            response.ask({type: 'SSML', speech: speechOutput}, {type: 'SSML', speech: reprompt});
        } else {
            storage.loadQuiz(session, function (currentQuiz) {
                if (currentQuiz.data.words.length === 0) {
                    response.ask({type: 'SSML', speech: dialog.errors.actions + " " + dialog.onBoarding});
                } else {
                    speechOutput = dialog.errors.actions + " " +
                            dialog.youCanSay + " " +
                            dialog.actions.spellingTest + " " +
                            dialog.actions.addWord + " " +
                            dialog.actions.deleteWord + " " +
                            dialog.actions.listWords + " " +
                            dialog.or + " " +
                            dialog.actions.help + " " +
                            ". " +
                            dialog.whatDo;
                    response.ask({type: 'SSML', speech: speechOutput});
                }
            });
        }
    };

    // Let the user provide a positive response to a yes/no question for confirmation.
    intentHandlers['AMAZON.YesIntent'] = function (intent, session, response) {
        var speechOutput;
        var reprompt;
        var youCanSay = dialog.youCanSay + " " +
                dialog.actions.spellingTest + " " +
                dialog.actions.addWord + " " +
                dialog.actions.deleteWord + " " +
                dialog.actions.listWords + " " +
                dialog.or + " " +
                dialog.actions.help + " " +
                ". " +
                dialog.whatDo;
        if (intentState === "AddWordIntent") {
            storage.loadQuiz(session, function (currentQuiz) {
                intentState = "";
                // Check if word is a duplicate
                if (currentQuiz.data.words.indexOf(speltWord) !== -1) {
                    speechOutput = util.format(dialog.duplicateEntry, speltWord) + " " + youCanSay;
                    reprompt = youCanSay;
                    response.ask({type: 'SSML', speech: speechOutput}, {type: 'SSML', speech: reprompt});
                    return;
                }
                // Add word
                currentQuiz.data.words.push(speltWord);
                speechOutput = util.format(dialog.wordAdded, speltWord) + " " + youCanSay;
                reprompt = youCanSay;
                // Save
                currentQuiz.save(function () {
                    response.ask({type: 'SSML', speech: speechOutput}, {type: 'SSML', speech: reprompt});
                });
            });
        } else if (intentState === "DeleteWordIntent") {
            storage.loadQuiz(session, function (currentQuiz) {
                intentState = "";
                // Check if word is in list
                if (currentQuiz.data.words.indexOf(speltWord) === -1) {
                    speechOutput = util.format(dialog.cannotDeleteWord, speltWord) + " " + youCanSay;
                    reprompt = youCanSay;
                    response.ask({type: 'SSML', speech: speechOutput}, {type: 'SSML', speech: reprompt});
                    return;
                }
                // Remove from list
                currentQuiz.data.words.splice(currentQuiz.data.words.indexOf(speltWord), 1);
                speechOutput = util.format(dialog.wordDeleted, speltWord) + " " + (currentQuiz.data.words.length > 0 ? youCanSay : dialog.onBoarding);
                reprompt = youCanSay;
                currentQuiz.save(function () {
                    response.ask({type: 'SSML', speech: speechOutput}, {type: 'SSML', speech: reprompt});
                });
            });
        } else if (intentState === "StartSpellingTestIntent") {
            storage.loadQuiz(session, function (currentQuiz) {
                var currentWordIndex = currentQuiz.data.currentWord;
                var wordCount = currentQuiz.data.words.length;
                var nextWordIndex = currentWordIndex + 1;

                if (speltWord === currentQuiz.data.words[currentWordIndex]) {
                    // Correct
                    currentQuiz.data.score += 1;
                    speechOutput = dialog.correct;
                } else {
                    // Incorrect
                    speechOutput = dialog.incorrect;
                }
                if (nextWordIndex < wordCount) {
                    // Next word
                    currentQuiz.data.currentWord = nextWordIndex;
                    speechOutput += " " + util.format(dialog.spellWord, currentQuiz.data.words[nextWordIndex]);
                    reprompt = util.format(dialog.spellWord, currentQuiz.data.words[nextWordIndex]);
                } else {
                    // Spelling test over
                    intentState = "";
                    speechOutput += " " + util.format(dialog.testSummary, currentQuiz.data.score, wordCount) + " " + youCanSay;
                    reprompt = youCanSay;
                }

                response.ask({type: 'SSML', speech: speechOutput}, {type: 'SSML', speech: reprompt});
            });
        } else {
            storage.loadQuiz(session, function (currentQuiz) {
                if (currentQuiz.data.words.length === 0) {
                    response.ask({type: 'SSML', speech: dialog.errors.actions + " " + dialog.onBoarding});
                } else {
                    speechOutput = dialog.errors.actions + " " +
                            dialog.youCanSay + " " +
                            dialog.actions.spellingTest + " " +
                            dialog.actions.addWord + " " +
                            dialog.actions.deleteWord + " " +
                            dialog.actions.listWords + " " +
                            dialog.or + " " +
                            dialog.actions.help + " " +
                            ". " +
                            dialog.whatDo;
                    response.ask({type: 'SSML', speech: speechOutput});
                }
            });
        }
    };

    // Let the user provide a negative response to a yes/no question for confirmation.
    intentHandlers['AMAZON.NoIntent'] = function (intent, session, response) {
        var speechOutput;
        var reprompt;
        var youCanSay;
        if (intentState === "AddWordIntent") {
            storage.loadQuiz(session, function (currentQuiz) {
                intentState = "";
                if (currentQuiz.data.words.length > 0) {
                    youCanSay = dialog.youCanSay + " " +
                            dialog.actions.spellingTest + " " +
                            dialog.actions.addWord + " " +
                            dialog.actions.deleteWord + " " +
                            dialog.actions.listWords + " " +
                            dialog.or + " " +
                            dialog.actions.help + " " +
                            ". " +
                            dialog.whatDo;
                } else {
                    youCanSay = dialog.onBoarding;
                }
                // What to say
                speechOutput = util.format(dialog.wordNotAdded, speltWord) + " " + youCanSay;
                reprompt = youCanSay;
                // Next
                response.ask({type: 'SSML', speech: speechOutput}, {type: 'SSML', speech: reprompt});
            });
        } else if (intentState === "DeleteWordIntent") {
            intentState = "";
            youCanSay = dialog.youCanSay + " " +
                    dialog.actions.spellingTest + " " +
                    dialog.actions.addWord + " " +
                    dialog.actions.deleteWord + " " +
                    dialog.actions.listWords + " " +
                    dialog.or + " " +
                    dialog.actions.help + " " +
                    ". " +
                    dialog.whatDo;
            speechOutput = util.format(dialog.wordNotDeleted, speltWord) + " " + youCanSay;
            reprompt = youCanSay;
            response.ask({type: 'SSML', speech: speechOutput}, {type: 'SSML', speech: reprompt});
        } else if (intentState === "StartSpellingTestIntent") {
            storage.loadQuiz(session, function (currentQuiz) {
                var wordToSpell = currentQuiz.data.words[currentQuiz.data.currentWord];
                response.ask({type: 'SSML', speech: dialog.errors.sorry + " " + util.format(dialog.spellingWord, wordToSpell, wordToSpell)});
            });
        } else {
            storage.loadQuiz(session, function (currentQuiz) {
                if (currentQuiz.data.words.length === 0) {
                    response.ask({type: 'SSML', speech: dialog.errors.actions + " " + dialog.onBoarding});
                } else {
                    speechOutput = dialog.errors.actions + " " +
                            dialog.youCanSay + " " +
                            dialog.actions.spellingTest + " " +
                            dialog.actions.addWord + " " +
                            dialog.actions.deleteWord + " " +
                            dialog.actions.listWords + " " +
                            dialog.or + " " +
                            dialog.actions.help + " " +
                            ". " +
                            dialog.whatDo;
                    response.ask({type: 'SSML', speech: speechOutput});
                }
            });
        }
    };

};

exports.register = registerIntentHandlers;