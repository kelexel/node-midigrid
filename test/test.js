var assert = require('assert');
var should = require('should');
var _ = require('underscore');

describe('midigrid', function() {
  var device1 = createTestDevice();
  describe('device1', function() {
    // check assigned id
    it('has correct default properties', function() {
      device1._attributes.should.have.property('id', 1);
      device1._attributes.should.have.property('name', 'monome 64 (m0000001)');
      device1._attributes.should.have.property('prefix', '/midigrid');
      device1._attributes.should.have.property('sizeX', 8);
      device1._attributes.should.have.property('sizeY', 8);
    });

    // check invalid message handling
    it('returns false on non-note messages', function() {
      device1.midiInCB(0, [0,0,0]).should.equal(false);
    });

    // check note on result
      var noteOnResult = device1.midiInCB(0, [156, 44, 127]);
    it('returns correct serialosc message in response to note on', function() {

      noteOnResult[0].should.equal('/grid/key');
      // x coord
      noteOnResult[1].should.equal(4);
      // y coord
      noteOnResult[2].should.equal(5);
      // state
      noteOnResult[3].should.equal(1);
    });

    // check note off result
    var noteOffResult = device1.midiInCB(0, [140, 29, 0]);
    it('returns correct serialosc message in response to note off', function() {
      noteOffResult[0].should.equal('/grid/key');
      // x coord
      noteOffResult[1].should.equal(5);
      // y coord
      noteOffResult[2].should.equal(3);
      // state
      noteOffResult[3].should.equal(0);
    });
  });
  
  it('returns valid midi note on message in response to serialosc press', function(done) {
    device1._attributes.midiOutPort.sendMessage = function(data) {
      // note-on
      data[0].should.equal(156);
      // note number
      data[1].should.equal(26);
      // velocity
      data[2].should.equal(127);
      done();
    };
    device1._attributes.eventEmitter.emit('stateChange', {x: 2, y: 3, s: 1});
  });

  it('returns valid midi note off message in response to serialosc release', function(done) {
      device1._attributes.midiOutPort.sendMessage = function(data) {
      // note-off
      data[0].should.equal(140);
      // note number
      data[1].should.equal(63);
      // velocity
      data[2].should.equal(0);
      done();
    };
    device1._attributes.eventEmitter.emit('stateChange', {x: 7, y: 7, s: 0});
  });

  var device2 = createTestDevice();
  describe('device2', function() {
    // check assigned id
    it('has id = 2', function() {
      device2._attributes.should.have.property('id', 2);
    });
  });
});

function createTestDevice(options) {
  options = options || {};

  options.midiInPort = {
    on: function(event, cb) {
      if (event == "message") {
        device.midiInCB = cb;
      }
    }
  };

  var device = new (require('../lib/midigrid'))(options);
  device.start();
  return device;
}