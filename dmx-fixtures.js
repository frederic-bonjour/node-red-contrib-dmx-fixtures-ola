const YAML = require('yaml')

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

  const COLORS = {
    red: [255, 0, 0],
    green: [0, 255, 0],
    blue: [0, 0, 255],
    purple: [255, 0, 255],
    yellow: [255, 255, 0]
  }

  const isNumber = (val) => typeof val === 'number'
  const isByte = (val) => isNumber(val) && val >= 0 && val <= 255

  function DmxFixturePAR(config) {
    RED.nodes.createNode(this, config);
    const startChannel = parseInt(config.channel, 10)
    let blinkInterval
    let blinkIterations

    const getModeValue = (mode) => {
      if (isByte(mode)) {
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
      if (isByte(brightness)) {
        data.push({
          channel: startChannel + CH1,
          value: brightness
        })
      } else {
        console.warn('dmx-fixtures(par): setBrightness(): invalid value for brightness:', brightness)
      }
    }

    const setStrobe = (data, speed) => {
      if (isByte(speed)) {
        data.push({
          channel: startChannel + CH5,
          value: speed
        })
      } else {
        console.warn('dmx-fixtures(par): setStrobe(): invalid value for speed:', speed)
      }
    }

    const setColor = (data, color) => {
      const rgb = typeof color === 'string' ? COLORS[color] : color
      if (Array.isArray(rgb) && rgb.length >= 3) {
        data.push(...rgb.map((value, i) => ({
          channel: startChannel + CH2 + i,
          value
        })))
      } else {
        console.warn('dmx-fixtures(par): setColor(): invalid value for color:', color)
      }
    }

    this.on('input', async (msg, send, done) => {
      const channels = []
      if (msg.topic === 'off') {
        setMode(channels, 'manual')
        setBrightness(channels, 0)
      } else {
        if (msg.mode) {
          setMode(channels, msg.mode, msg.modeParam)
        }
        if (msg.color) {
          setMode(channels, 'manual')
          setColor(channels, msg.color)
        }
        if (isNumber(msg.brightness)) {
          setBrightness(channels, msg.brightness)
        }
        if (isNumber(msg.strobe)) {
          setStrobe(channels, msg.strobe)
        }

        if (isNumber(msg.blink)) {
          clearInterval(blinkInterval)
          if (msg.brightness >= 10) {
            let b = msg.brightness || 255
            blinkIterations = 0
            blinkInterval = setInterval(() => {
              blinkIterations += 1
              b = b ? 0 : 255
              const data = []
              setBrightness(data, b)
              send({ payload: { channels: data } })
              if (isNumber(msg.blinkCount) && blinkIterations >= msg.blinkCount) {
                clearInterval(blinkInterval)
              }
            }, msg.blink)
          }
        }
      }
      send({
        payload: {
          channels
        }
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
      if (brightness >= 0 && brightness <= 255) {
        data.push({
          channel: startChannel + CH5,
          value: brightness
        })
      } else {
        console.warn('dmx-fixtures(scan): setBrightness(): invalid value for brightness:', brightness)
      }
    }

    const setStrobe = (data, speed) => {
      if (speed >= 0 && speed <= 255) {
        data.push({
          channel: startChannel + CH8,
          value: speed
        })
      } else {
        console.warn('dmx-fixtures(scan): setStrobe(): invalid value for speed:', speed)
      }
    }

    const setPan = (data, value, speed) => {
      if (value >= 0 && value <= 255) {
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
      if (value >= 0 && value <= 255) {
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
      if (gobo >= 0 && gobo <= 7) {
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
      const channels = []
      if (msg.topic === 'off') {
        setBrightness(channels, 0)
      } else {
        if (msg.color) {
          setColor(channels, msg.color)
        }
        if (isNumber(msg.brightness)) {
          setBrightness(channels, msg.brightness)
        }
        if (isNumber(msg.tilt)) {
          setTilt(channels, msg.tilt, msg.tiltSpeed)
        }
        if (isNumber(msg.pan)) {
          setPan(channels, msg.pan, msg.panSpeed)
        }
        if (isNumber(msg.gobo)) {
          setGobo(channels, msg.gobo, msg.goboShake)
        }
        if (isNumber(msg.gobo)) {
          setGobo(channels, msg.gobo, msg.goboShake)
        }
        if (isNumber(msg.strobe)) {
          setStrobe(channels, msg.strobe)
        }
      }
      send({
        payload: {
          channels
        }
      })
      done()
    });
  }

  RED.nodes.registerType("dmx scan", DmxFixtureScan);


  function DmxScheduler(config) {
    RED.nodes.createNode(this, config);
    let timers = []
    const outputsCount = config.outputs
    const scenario = YAML.parse(config.scenario)

    const updateStatus = () => {
      this.status({ text: `timers: ${timers.length}`, shape: 'dot', fill: timers.length ? 'green' : 'grey' })      
    }

    const clearAll = () => {
      timers.forEach(t => clearTimeout(t.t))
      timers.length = 0
      console.log('dmx-fixtures(scheduler): clearAll()')
      updateStatus()
    }

    const sendEffect = (send, effectName) => {
      const effect = scenario.effects[effectName]
      if (effect) {
        let output
        if (Array.isArray(effect.output)) {
          output = effect.output
        } else if (isNumber(effect.output)) {
          output = [effect.output]
        } else if (effect.output === 'all') {
          output = Array.from({ length: outputsCount }, (v, i) => i)
        } else {
          output = [0]
        }
        const data = Array.from({ length: outputsCount })
        output.forEach(o => { data[o] = effect })
        console.log(`sending effect "${effectName}"`)
        send(data)
      } else {
        console.warn(`dmx-fixtures(scheduler): sendEffect(): effect "${effectName}" was not found in effects definition.`)
      }
    }

    const schedule = (delay, effects, send) => {
      const id = timers.length
      const t = setTimeout(() => {
        if (Array.isArray(effects)) {
          effects.forEach(effect => sendEffect(send, effect))
        } else {
          sendEffect(send, effects)
        }
        timers.splice(timers.findIndex(t => t.id === id), 1)
        updateStatus()
      }, delay)
      timers.push({t, id})
      console.log(`dmx-fixtures(scheduler): schedule(): scheduled effects "${effects}" with delay ${delay}.`)
      console.log('dmx-fixtures(scheduler): schedule(): timers=', timers.length)
    }

    this.on('input', async (msg, send, done) => {
      clearAll()
      if (msg.topic !== 'stop') {
        Object.keys(scenario.timeline).forEach(k => {
          const delay = (k === 'start') ? 0 : parseInt(k)
          if (!isNaN(delay)) {
            schedule(delay, scenario.timeline[k], send)
            updateStatus()
          }
        })
      }
      done()
    });
  }

  RED.nodes.registerType("scheduler", DmxScheduler);
};