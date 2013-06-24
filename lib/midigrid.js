var events = require('events');
var serialosc = require('serialosc');
var midi = require('midi');

var prime = require('prime');
var type = require('prime/type');
var object = require('prime/shell/object');

// var parentize = require('prime-util/prime/parentize')
// var array = require('prime/es5/array')
// var mixin = require('prime-util/prime/mixin')

// var NOTE_ON = 156;
// var NOTE_OFF = 140;

var nextId = 1;

// creates a virtual device and responds like serialosc would
// the device can be used with node-monome or any other monome app

var MidiGrid = prime({
  inherits: serialosc,
  _options: false,
  _device: false,
  constructor: function(options) {

    var defaults = {
      serialoscId: 'emulator',
      name: 'monome 64 (m0000001)',
      prefix: '/midigrid',
      sizeX: 8,
      sizeY: 8,
      midiIn: 'unknown',
      midiOut: 'unknown',
      midiInPort: false,
      midiOutPort: false,
      NOTE_ON: 156,
      NOTE_OFF: 140,
      module: false
    };

    options = options || {};
    for (var key in options) {
      defaults[key] = options[key];
    }
    // this.parent(defaults);
    MidiGrid.parent.constructor.call(this, defaults);
    // serialosc.prototype.constructor.call(this, defaults);
    this.on('stateChange', this._eventOnStateChange.bind(this));
    return this;
  },
  // override start method to initialize midi ports
  start: function() {
    // this.parent();
    MidiGrid.parent.start.call(this);
    // serialosc.prototype.start.call(this);

    // start midi input
    if (!this._attributes.midiInPort) {
      this._attributes.midiInPort = new midi.input();
      for (var i = 0; i < this._attributes.midiInPort.getPortCount(); i++) {
        if (this._attributes.midiInPort.getPortName(i) === this._attributes.midiIn) {
          this._attributes.midiInPort.openPort(i);
          this._startMidiInPort();
        }
      }
    } else
      this._startMidiInPort();

    if (!this._attributes.midiOutPort) {
      // start midi output
      this._attributes.midiOutPort = new midi.output();
      for (i = 0; i < this._attributes.midiOutPort.getPortCount(); i++) {
        if (this._attributes.midiOutPort.getPortName(i) === this._attributes.midiOut) {
          this._attributes.midiOutPort.openPort(i);
        }
      }
    }
  },

  // override stop method to turn off midi ports
  stop: function() {
    if (this._attributes.midiInPort) {
      this._attributes.midiInPort.closePort();
    }
    if (this._attributes.midiOutPort) {
      this._attributes.midiOutPort.closePort();
    }
  },
  getConfig: function() {
    var conf = {};
    var exclude = ['ad', 'eventEmitter', 'midiInPort', 'midiOutPort', 'oscClient', 'oscServer'];
    object.each(this._attributes, function(v, k){
      if (type(v) != 'function' && exclude.indexOf(k) == -1)
        conf[k] = v;
    });
    return conf;
  },
  _startMidiInPort: function() {
    this._attributes.midiInPort.on('message', function(deltaTime, message) {
      // emulate serialosc press message
      if (message[0] != this._attributes.NOTE_ON && message[0] != this._attributes.NOTE_OFF) {
        return false;
      }
      var coords = this._serialoscMapFunc(message[1]);
      var s = 0;
      if (message[0] == this._attributes.NOTE_ON) {
        s = 1;
      }
      var msg = ['/grid/key',
        this._translateX(coords[0], coords[1]),
        this._translateY(coords[0], coords[1]),
        s];
      this.oscOut.apply(this, msg);
      return msg;
    }.bind(this));
  },

  // when led on/off is changed send midi message
  _eventOnStateChange: function(data) {
    // send midi to set led
    var note = this._midiMapFunc(data);
    var velo = this._velocityOff(data);
    var msg = this._attributes.NOTE_OFF;
    if (data.s == 1) {
      velo = this._velocityOn(data);
      msg = this._attributes.NOTE_ON;
    }
    this._attributes.midiOutPort.sendMessage([msg, note, velo]);
  },
  // this should map a midi note number to an x/y coordinate
  _serialoscMapFunc: function(noteNum) {
    return [Math.floor(noteNum % this._attributes.sizeX), Math.floor(noteNum / this._attributes.sizeX)];
  },
   // this should map an x/y coordinate to a midi note number
  _midiMapFunc: function(data) {
    return data.x + (data.y * this._attributes.sizeX);
  },
  // the velocity to use when turning a led on
   _velocityOn: function(data) {
    return 127;
  },
  // the velocity to use when turning a led off
  _velocityOff: function(data) {
    return 0;
  }

});
// mixin(MidiGrid, parentize)
module.exports = MidiGrid;