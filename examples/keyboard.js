var prime = require('prime');
var midigrid = require('../lib/midigrid.js');

var testDevice = prime({
  inherits: midigrid,
  constructor: function(options) {
    midigrid.prototype.constructor.call(this, options);
  },
  _serialoscMapFunc: function(noteNum) {
    var x = noteNum % device.sizeX;
    var y = Math.floor(noteNum / device.sizeX);
    console.log('press event: converted note ' + noteNum + ' to ' + x + ', ' + y)
    return [x, y];
  },

  // this should map an x/y coordinate to a midi note number
  _midiMapFunc: function(data) {
    var noteNum = data.x + (data.y * device.sizeX);
    console.log('led event: converted ' + data.x + ', ' + data.y + ' to note ' + noteNum);
    return noteNum;
  }
});

var options = {
  serialoscId: 'keyboardgrid',
  name: 'monome 64 (k0000001)',
  prefix: '/keyboardgrid',
  // set these to valid midi devices, use listmidi.js to see what you have
  midiIn: 'Akai APC40',
  midiOut: 'Gestionnaire IAC Bus IAC 1'
};
var device = new testDevice(options);
device.start();

var stdin = process.openStdin();