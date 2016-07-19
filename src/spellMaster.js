'use strict';

var AlexaSkill = require('./AlexaSkill');
var eventHandlers = require('./eventHandlers');
var intentHandlers = require('./intentHandlers');
var auth = require('./auth.json');

//
var APP_ID = auth.APP_ID; //replace with your ams value
var skillContext = {};

/**
 * Make SpellMaster a child of AlexaSkill
 *
 */

var SpellMaster = function () {
    AlexaSkill.call(this, APP_ID);
    skillContext.needMoreHelp = true;
};

// Extend
SpellMaster.prototype = Object.create(AlexaSkill.prototype);
SpellMaster.prototype.constructor = SpellMaster;

eventHandlers.register(SpellMaster.prototype.eventHandlers, skillContext);
intentHandlers.register(SpellMaster.prototype.intentHandlers, skillContext);


module.exports = SpellMaster;