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
      console.log('received msg:', msg)
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

        if (isNumber(msg.value)) {
          console.log('send raw value', msg.value, 'to channel', startChannel)
          channels.push({
            channel: startChannel,
            value: msg.value
          })
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
    let nestedTimers = []
    const outputsCount = config.outputs
    const scenario = YAML.parse(config.scenario)

    const updateStatus = () => {
      this.status({ text: `timers: ${timers.length}`, shape: 'dot', fill: timers.length ? 'green' : 'grey' })      
    }

    const clearAll = () => {
      timers.forEach(t => clearTimeout(t.t))
      timers.length = 0
      nestedTimers.forEach(i => clearTimeout(i))
      nestedTimers.length = 0
      console.log('dmx-fixtures(scheduler): clearAll()')
      updateStatus()
    }

    const sendEffect = (send, effect) => {
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
      send(data)
      scheduleNestedEffects(send, effect)
    }


    const sendEffectByName = (send, effectName) => {
      const effect = scenario.effects[effectName]
      if (effect) {
        sendEffect(send, effect)
      } else {
        console.warn(`dmx-fixtures(scheduler): sendEffectByName(): effect "${effectName}" was not found in effects definition.`)
      }
    }
  

    const schedule = (delay, effectNames, send) => {
      const id = timers.length
      const t = setTimeout(() => {
        if (Array.isArray(effectNames)) {
          effectNames.forEach(effect => sendEffectByName(send, effect))
        } else {
          sendEffectByName(send, effectNames)
        }
        timers.splice(timers.findIndex(t => t.id === id), 1)
        updateStatus()
      }, delay)

      timers.push({t, id})
      console.log(`dmx-fixtures(scheduler): schedule(): scheduled effectNames "${effectNames}" with delay ${delay}.`)
      console.log('dmx-fixtures(scheduler): schedule(): timers=', timers.length)
    }


    const scheduleNestedEffects = (send, effect) => {
      if (effect.fade) {
        const { duration, steps, prop, to } = effect.fade
        if (!steps) {
          console.warn(`invalid value for "steps":`, steps)
          return
        }
        const src = effect[prop]
        if (typeof src !== typeof to) {
          console.warn(`invalid "to" value: must be of the same type as the "${prop}" property.`)
          return
        }

        const effectCopy = JSON.parse(JSON.stringify(effect))
        if (isNumber(src)) {
          const stepVal = (to - src) / steps
          delete effectCopy.fade
          // console.log(`will fade "${prop}" from "${src}" to "${to}" over ${steps} steps (stepVal=${stepVal}).`)
          for (let s = 0; s < steps; s++) {
            nestedTimers.push(setTimeout(() => {
              effectCopy[prop] += stepVal
              if (effectCopy[prop] < 0) effectCopy[prop] = 0
              if (effectCopy[prop] > 255) effectCopy[prop] = 255
              sendEffect(send, effectCopy)
            }, (duration / steps) * (s + 1)))
          }
        } else if (Array.isArray(src)) {
          const stepVals = src.map((v, i) => (to[i] - v) / steps)
          delete effectCopy.fade
          // console.log(`will fade "${prop}" from "${src}" to "${to}" over ${steps} steps (stepVals=${stepVals}).`)
          for (let s = 0; s < steps; s++) {
            nestedTimers.push(setTimeout(() => {
              effectCopy[prop].forEach((v, i, a) => {
                a[i] = v += stepVals[i]
                if (a[i] < 0) a[i] = 0
                if (a[i] > 255) a[i] = 255
              })
              sendEffect(send, effectCopy)
            }, (duration / steps) * (s + 1)))
          }
        }
      }
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


  function parseTimeKey(time) {
    if (time.endsWith('s')) {
      return parseFloat(time) * 1000
    }
    return parseInt(time)
  }


  function generateFadeEffects(baseTimeKey, effect) {
    if (!effect || !effect.fade) return
    const { duration, steps, prop, to } = effect.fade

    if (!steps) {
      console.warn(`invalid value for "steps":`, steps)
      return
    }
    const src = effect[prop]
    if (typeof src !== typeof to) {
      console.warn(`invalid "to" value: must be of the same type as the "${prop}" property.`)
      return
    }

    const nestedEffects = {}

    if (isNumber(src)) {
      const stepVal = (to - src) / steps
      // console.log(`will fade "${prop}" from "${src}" to "${to}" over ${steps} steps (stepVal=${stepVal}).`)
      for (let s = 1; s <= steps; s++) {
        const effectCopy = JSON.parse(JSON.stringify(effect))
        delete effectCopy.fade
        effectCopy[prop] = Math.round(effectCopy[prop] + (stepVal * s))
        if (effectCopy[prop] < 0) effectCopy[prop] = 0
        if (effectCopy[prop] > 255) effectCopy[prop] = 255
        nestedEffects[baseTimeKey + (duration / steps) * s] = effectCopy
      }
    } else if (Array.isArray(src)) {
      const stepVals = src.map((v, i) => (to[i] - v) / steps)
      // console.log(`will fade "${prop}" from "${src}" to "${to}" over ${steps} steps (stepVals=${stepVals}).`)
      for (let s = 1; s <= steps; s++) {
        const effectCopy = JSON.parse(JSON.stringify(effect))
        delete effectCopy.fade
        effectCopy[prop].forEach((v, i, a) => {
          a[i] = Math.round(v += (stepVals[i] * s))
          if (a[i] < 0) a[i] = 0
          if (a[i] > 255) a[i] = 255
        })
        nestedEffects[baseTimeKey + (duration / steps) * s] = effectCopy
      }
    }

    return nestedEffects
  }

  function mergeNestedEffects(timeline, effects) {
    for (const [time, effect] of Object.entries(effects)) {
      if (timeline[time]) {
        if (Array.isArray(timeline[time].effect)) {
          timeline[time].effect.push(effect)
        } else {
          timeline[time].effect = [timeline[time].effect, effect]
        }
      } else {
        timeline[time] = { effect }
      }
    }
  }


  function DmxSceneDefinition(config) {
    RED.nodes.createNode(this, config);
    const name = config.name

    const buildScene = () => {
      const scenario = YAML.parse(config.scenario)
      return buildTimeline(scenario, scenario.timeline)
    }

    const buildNestedTimeline = (scenario, prevTimeKey, srcTimeline, dstTimeline) => {
      const nested = {}
      for (let [time, entry] of Object.entries(srcTimeline)) {

        let effectNames = entry.e ? entry.e : entry
        // Trim
        if (Array.isArray(effectNames)) {
          effectNames = effectNames.map(en => en.trim())
        } else if (typeof effectNames === 'string') {
          effectNames = effectNames.trim()
        }

        const effects = Array.isArray(effectNames)
          ? effectNames.map(en => scenario.effects[en])
          : [scenario.effects[effectNames]]

        const timeKey = parseTimeKey(time) + prevTimeKey

        // The "END" and "ROOT" effects are special ones that end the scene.
        if (effectNames !== 'END' && effectNames !== 'ROOT') dstTimeline[timeKey] = { effect: effectNames }

        for (effect of effects) {
          const nestedEffects = generateFadeEffects(timeKey, effect)
          if (nestedEffects) {
            mergeNestedEffects(timeline, nestedEffects)
          }
        }

        if (entry.e && entry.t) {
          const nestedEffects = buildNestedTimeline(scenario, timeKey, entry.t, dstTimeline)
          mergeNestedEffects(dstTimeline, nestedEffects)
        }
      }
      return nested
    }


    const buildTimeline = (scenario, timeline) => {
      for (let [time, entry] of Object.entries(timeline)) {

        let effectNames = entry.e ? entry.e : entry
        // Trim
        if (Array.isArray(effectNames)) {
          effectNames = effectNames.map(en => en.trim())
        } else if (typeof effectNames === 'string') {
          effectNames = effectNames.trim()
        }

        const effects = Array.isArray(effectNames)
          ? effectNames.map(en => scenario.effects[en])
          : [scenario.effects[effectNames]]

        const timeKey = parseTimeKey(time)

        // The "END" and "ROOT" effects are special ones that end the scene.
        if (effectNames !== 'END' && effectNames !== 'ROOT') timeline[timeKey] = { effect: effectNames }

        for (effect of effects) {
          const nestedEffects = generateFadeEffects(timeKey, effect)
          if (nestedEffects) {
            mergeNestedEffects(timeline, nestedEffects)
          }
        }

        if (entry.e && entry.t) {
          const nestedEffects = buildNestedTimeline(scenario, timeKey, entry.t, timeline)
          mergeNestedEffects(timeline, nestedEffects)
        }
      }

      console.log(JSON.stringify(scenario, null, 3))
      return scenario
    }
    
    this.send({
      topic: 'define',
      name,
      payload: buildScene()
    })

    this.on('input', async (msg, send, done) => {
      send({
        topic: 'define',
        name,
        payload: buildScene()
      })
      done()
    });
  }

  RED.nodes.registerType("scene definition", DmxSceneDefinition);

  const makeSceneEntry = (entry) => {
    return {
      time: 0,
      scene: entry
    }
  }

  function Stack() {
    this.entries = []
    this.cursor = -1

    this.push = (scene) => {
      this.pause()
      this.entries.push(makeSceneEntry(scene))
      this.cursor = this.entries.length - 1
      this.resetCurrentEntry()
    }

    this.overlay = (scene) => {
      this.entries.push(makeSceneEntry(scene))
      this.cursor = this.entries.length - 1
      this.resetCurrentEntry()
    }

    this.pause = () => {
      const E = this.getCurrentEntry()
      if (E) {
        E.paused = true
        console.log('paused scene', this.cursor, 'at', E.time)
      } else {
        console.warn('could not pause: current entry is null.')
      }
    }

    this.resetCurrentEntry = () => {
      const E = this.getCurrentEntry()
      delete E.lastSentEffects
      if (E) {
        for (const [key, item] of Object.entries(E.scene.timeline)) {
          item._handled = false
        }
      }
    }

    this.resume = () => {
      const E = this.getCurrentEntry()
      if (E) {
        E.paused = false
      } else {
        console.warn('could not resume: current entry is null.')
      }
    }

    this.pop = () => {
      this.entries.pop()
      this.cursor = this.entries.length - 1
      this.resume()
    }

    this.root = () => {
      if (this.entries.length > 1) this.entries.length = 1
      this.cursor = this.entries.length - 1
      this.resume()
    }

    this.replace = (scene) => {
      this.entries = [makeSceneEntry(scene)]
      this.cursor = 0
      this.resetCurrentEntry()
    }

    this.getCurrentEntry = () => {
      if (this.cursor !== -1) {
        return this.entries[this.cursor]
      }
      return null
    }

    this.tick = (interval) => {
      this.entries.forEach(entry => {
        if (!entry.paused) {
          entry.time += interval
        }
      })
    }
  }


  function DmxScenesPlayer(config) {
    // Config
    RED.nodes.createNode(this, config)
    const outputsCount = parseInt(config.outputs, 10)
    const INTERVAL = config.interval ? parseInt(config.interval) : 10

    // Internal vars

    const STACK = new Stack()
    const SCENES = {}

    // Internal funcs
    const handlePlay = (payload) => {
      console.log('dmx-fixtures(scenes player): playing scene:', payload)
      const SCENE = typeof payload === 'string' ? SCENES[payload] : payload
      if (SCENE) {
        STACK.replace(SCENE)
      }
      else console.warn('dmx-fixtures(scenes player): play: undefined scene:', SCENE)
    }
    
    const handlePush = (payload) => {
        const SCENE = typeof payload === 'string' ? SCENES[payload] : payload
        if (SCENE) {
          STACK.push(SCENE)
        }
        else console.warn('dmx-fixtures(scenes player): push: undefined scene:', SCENE)
    }
    
    const handleOverlay = (payload) => {
        const SCENE = typeof payload === 'string' ? SCENES[payload] : payload
        if (SCENE) {
          STACK.overlay(SCENE)
        }
        else console.warn('dmx-fixtures(scenes player): overlay: undefined scene:', SCENE)
    }

    const sendEffect = (send, effect) => {
      if (!effect) return
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
      send(data)
    }

    const resumeScene = (send) => {
      const E = STACK.getCurrentEntry()
      if (!E) return
      if (E.lastSentEffects) {
        E.lastSentEffects.forEach(effect => sendEffect(send, effect))
      }
    }

    const makeTick = (send) => {
      return () => {
        STACK.tick(INTERVAL)
        const E = STACK.getCurrentEntry()
        if (!E || E.paused) return
        let prevTimeKey = 0
        for (const [key, item] of Object.entries(E.scene.timeline)) {
          if (!item._handled) {
            const offset = parseTimeKey(key, prevTimeKey)
            prevTimeKey = offset
            if (offset <= E.time) {
              if (item === 'END') {
                STACK.pop()
                resumeScene(send)
              } else if (item === 'ROOT') {
                STACK.root()
                resumeScene(send)
              } else {
                item._handled = true
                E.lastSentEffects = []
                if (Array.isArray(item.effect)) {
                  item.effect.forEach(e => {
                    if (typeof e === 'string') {
                      e = E.scene.effects[e]
                    }
                    sendEffect(send, e)
                    E.lastSentEffects.push(e)
                  })
                } else if (item.effect) {
                  const e = typeof item.effect === 'string' ? E.scene.effects[item.effect] : item.effect
                  sendEffect(send, e)
                  E.lastSentEffects.push(e)
                }
              }
            }
          }
        }
      }
    }

    let interval = null

    this.on('input', async (msg, send, done) => {
      switch (msg.topic) {
        case 'define':
            SCENES[msg.name] = msg.payload
            console.log(`dmx-fixtures(scenes player): defined scene "${msg.name}"`)
            break
        case 'play':
            handlePlay(msg.payload)
            break
        case 'push':
            handlePush(msg.payload)
            break
        case 'overlay':
            handleOverlay(msg.payload)
            break
        case 'pop':
            STACK.pop()
            resumeScene(send)
            break
        case 'root':
            STACK.root()
            resumeScene(send)
            break
        case 'pause':
            STACK.pause()
            break
        case 'resume':
            STACK.resume()
            resumeScene(send)
            break
        case 'reset':
            // TODO
            break
      }

      if (!interval) {
        interval = setInterval(makeTick(send), INTERVAL)
        console.log('dmx-fixtures(scenes player): started ticker.')
      }
      done()
    });

    this.on('close', function() {
      clearInterval(interval)
      console.log('dmx-fixtures(scenes player): stopped ticker.')
    })
  }

  RED.nodes.registerType("scenes player", DmxScenesPlayer);

};