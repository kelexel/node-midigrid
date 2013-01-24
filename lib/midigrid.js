var events = require('events');
var serialosc = require('serialosc');
var midi = require('midi');

var NOTE_ON = 156;
var NOTE_OFF = 140;

var nextId = 1;

// creates a virtual device and responds like serialosc would
// the device can be used with node-monome or any other monome app
exports.create = function(options) {

  var defaults = {
    serialoscId: 'midigrid',
    name: 'monome 64 (m0000001)',
    prefix: '/midigrid',
    sizeX: 8,
    sizeY: 8,
    midiIn: 'unknown',
    midiOut: 'unknown',

    // this should map a midi note number to an x/y coordinate
    serialoscMapFunc: function(noteNum) {
      return [Math.floor(noteNum % device.sizeX), Math.floor(noteNum / device.sizeX)];
    },

    // this should map an x/y coordinate to a midi note number
    midiMapFunc: function(data) {
      return data.x + (data.y * device.sizeX);
    },

    // the velocity to use when turning a led on
    velocityOn: function(data) {
      return 127;
    },
    
    // the velocity to use when turning a led off
    velocityOff: function(data) {
      return 0;
    }
  };

  options = options || {};
  for (var key in options) {
    defaults[key] = options[key];
  }

  var device = serialosc.createDevice(defaults);

  // override start method to initialize midi ports
  device.parentStart = device.start;
  device.start = function() {
    device.parentStart();
    // start midi input
    device.midiInPort = new midi.input();
    for (var i = 0; i < device.midiInPort.getPortCount(); i++) {
      if (device.midiInPort.getPortName(i) === defaults.midiIn) {
        device.midiInPort.openPort(i);
        device.startMidiInPort();
      }
    }
    // start midi output
    device.midiOutPort = new midi.output();
    for (i = 0; i < device.midiOutPort.getPortCount(); i++) {
      if (device.midiOutPort.getPortName(i) === defaults.midiOut) {
        device.midiOutPort.openPort(i);
      }
    }
  };

  // override stop method to turn off midi ports
  device.parentStop = device.stop;
  device.stop = function() {
    device.parentStop();
    if (device.midiInPort) {
      device.midiInPort.closePort();
    }
    if (device.midiOutPort) {
      device.midiOutPort.closePort();
    }
  };

  device.startMidiInPort = function() {
    device.midiInPort.on('message', function(deltaTime, message) {
      // emulate serialosc press message
      if (message[0] != NOTE_ON && message[0] != NOTE_OFF) {
        return false;
      }
      var coords = device.serialoscMapFunc(message[1]);
      var s = 0;
      if (message[0] == NOTE_ON) {
        s = 1;
      }
      var msg = ['/grid/key', coords[0], coords[1], s];
      device.oscOut.apply(null, msg);
      return msg;
    });
  };

  // when led on/off is changed send midi message
  device.on('stateChange', function(data) {
    // send midi to set led
    var note = device.midiMapFunc(data);
    var velo = device.velocityOff(data);
    var msg = NOTE_OFF;
    if (data.s == 1) {
      velo = device.velocityOn(data);
      msg = NOTE_ON;
    }
    device.midiOutPort.sendMessage([msg, note, velo]);
  });
  
  device.id = nextId;
  nextId++;
  return device;
}