'use strict';

var SpellMaster = require('./spellMaster');

exports.handler = function (event, context) {
    var spellMaster = new SpellMaster();
    spellMaster.execute(event, context);
};