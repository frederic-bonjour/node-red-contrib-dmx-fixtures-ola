module.exports = function(RED) {

  const CH1 = 0
  const CH2 = 1
  const CH3 = 2
  const CH4 = 3
  const CH5 = 4
  const CH6 = 5
  const CH7 = 6
  const CH8 = 7
  const CH9 = 8

  function DmxFixturePAR(config) {
    RED.nodes.createNode(this, config);
    const startChannel = parseInt(config.channel, 10)

    const getModeValue = (mode) => {
      if (typeof mode === 'number' && brightness >= 0 && brightness <= 255) {
        return mode
      }

      switch (mode) {
        case 'manual':
          return 0
        case 'colors selection':
          return 11
        case 'colors shade':
          return 61
        case 'colors pulse':
          return 111
        case 'colors transition':
          return 161
        case 'sound':
        case 'sound control':
          return 211
      }

      return false
    }

    const setMode = (data, mode, value) => {
      const modeValue = getModeValue(mode)
      if (modeValue !== false) {
        data.push({
          channel: startChannel + CH6,
          value: getModeValue(mode)
        })
        if (value !== undefined) {
          data.push({
            channel: startChannel + CH7,
            value
          })
        }
      } else {
        console.warn('dmx-fixtures(par): setMode(): invalid value for mode:', brightness)
      }
    }

    const setBrightness = (data, brightness) => {
      if (typeof brightness === 'number' && brightness >= 0 && brightness <= 255) {
        data.push({
          channel: startChannel + CH1,
          value: brightness
        })
      } else {
        console.warn('dmx-fixtures(par): setBrightness(): invalid value for brightness:', brightness)
      }
    }

    const setStrobe = (data, speed) => {
      if (typeof speed === 'number' && speed >= 0 && speed <= 255) {
        data.push({
          channel: startChannel + CH5,
          value: speed
        })
      } else {
        console.warn('dmx-fixtures(par): setStrobe(): invalid value for speed:', speed)
      }
    }

    const setRGB = (data, rgb) => {
      if (Array.isArray(rgb) && rgb.length >= 3) {
        data.push(...rgb.map((value, i) => ({
          channel: startChannel + CH2 + i,
          value
        })))
      } else {
        console.warn('dmx-fixtures(par): setRGB(): invalid value for color:', rgb)
      }
    }


    this.on('input', async (msg, send, done) => {
      const channels = Array.isArray(msg._channels) ? msg._channels : []
      switch (msg.topic) {
        case 'color':
          setMode(channels, 'manual')
          setRGB(channels, msg.payload)
          if (msg.brightness !== undefined) {
            setBrightness(channels, msg.brightness)
          }
          break;

        case 'brightness':
          setBrightness(channels, msg.payload)
          break;

        case 'mode':
          setMode(channels, msg.payload, msg.value)
          break;

        case 'strobe':
          setStrobe(channels, msg.payload)
          break;
      }
      send({
        payload: {
          channels
        },
        _channels: channels
      })
      done()
    });
  }

  RED.nodes.registerType("dmx par", DmxFixturePAR);

  function DmxFixtureScan(config) {
    RED.nodes.createNode(this, config);
    const startChannel = parseInt(config.channel, 10)

    const COLORS = ['white', 'red', 'amber', 'yellow', 'green', 'blue', 'azure', 'purple', 'rotation']
    const COLORS_FR = ['blanc', 'rouge', 'ambre', 'jaune', 'vert', 'bleu', 'azur', 'pourpre', 'rotation']

    const setColor = (data, colorName) => {
      let idx = COLORS.indexOf(colorName)
      if (idx === -1) {
        idx = COLORS_FR.indexOf(colorName)
      }
      if (idx !== -1) {
        data.push({
          channel: startChannel + CH6,
          value: idx * 16
        })
      } else {
        console.warn('dmx-fixtures(scan): setColor(): invalid value for color:', colorName)
      }
    }

    const setBrightness = (data, brightness) => {
      if (typeof brightness === 'number' && brightness >= 0 && brightness <= 255) {
        data.push({
          channel: startChannel + CH5,
          value: brightness
        })
      } else {
        console.warn('dmx-fixtures(scan): setBrightness(): invalid value for brightness:', brightness)
      }
    }

    const setStrobe = (data, speed) => {
      if (typeof speed === 'number' && speed >= 0 && speed <= 255) {
        data.push({
          channel: startChannel + CH8,
          value: speed
        })
      } else {
        console.warn('dmx-fixtures(scan): setStrobe(): invalid value for speed:', speed)
      }
    }

    const setPan = (data, value, speed) => {
      if (typeof value === 'number' && value >= 0 && value <= 255) {
        data.push({
          channel: startChannel + CH1,
          value
        })
        if (typeof speed === 'number' && value >= 0 && value <= 255) {
          data.push({
            channel: startChannel + CH2,
            value: speed
          })
        }
      } else {
        console.warn('dmx-fixtures(scan): setPan(): invalid value:', value)
      }
    }

    const setTilt = (data, value, speed) => {
      if (typeof value === 'number' && value >= 0 && value <= 255) {
        data.push({
          channel: startChannel + CH3,
          value
        })
        if (typeof speed === 'number' && value >= 0 && value <= 255) {
          data.push({
            channel: startChannel + CH4,
            value: speed
          })
        }
      } else {
        console.warn('dmx-fixtures(scan): setTilt(): invalid value:', value)
      }
    }

    const setGobo = (data, gobo, shake) => {
      if (typeof gobo === 'number' && gobo >= 0 && gobo <= 7) {
        const shakeOffset = shake ? 64 : 0
        data.push({
          channel: startChannel + CH7,
          value: shakeOffset + (gobo * 8)
        })
      } else {
        console.warn('dmx-fixtures(scan): setGobo(): invalid value:', gobo)
      }
    }

    this.on('input', async (msg, send, done) => {
      const channels = Array.isArray(msg._channels) ? msg._channels : []
      switch (msg.topic) {
        case 'color':
          setColor(channels, msg.payload)
          if (msg.brightness !== undefined) {
            setBrightness(channels, msg.brightness)
          }
          break;

        case 'brightness':
          setBrightness(channels, msg.payload)
          break;

        case 'pan':
          setPan(channels, msg.payload, msg.speed)
          break;

        case 'tilt':
          setTilt(channels, msg.payload, msg.speed)
          break;

        case 'gobo':
          setGobo(channels, msg.payload, msg.shake)
          break;

        case 'strobe':
          setStrobe(channels, msg.payload)
          break;
      }
      send({
        payload: {
          channels
        },
        _channels: channels
      })
      done()
    });
  }

  RED.nodes.registerType("dmx scan", DmxFixtureScan);
};