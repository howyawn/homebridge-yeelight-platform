//
//  deviceService.js
//  Sahil Chaddha
//
//  Created by Sahil Chaddha on 31/10/2018.
//  Copyright © 2018 sahilchaddha.com. All rights reserved.
//
const YeePlatform = require('yeelight-platform')
const EventEmitter = require('events')

const YeeAgent = YeePlatform.Discovery
const YeeDevice = YeePlatform.Device


class YeeDeviceService extends EventEmitter {
  constructor() {
    super()
    this.agent = new YeeAgent()
    this.isDiscovering = false
    this.logger = null
    this.isDebug = false
    this.homebridge = null
    this.devices = {}
    this.interval = 15000
  }

  setHomebridge(homebridgeRef, pollInterval) {
    this.homebridge = homebridgeRef
    this.interval = pollInterval
  }

  setLogger(logger) {
    this.logger = logger
    this.isDebug = true
  }

  startDiscovery() {
    if (this.isDiscovering) return
    this.isDiscovering = true
    this.bindAgent()
    this.agent.listen()
  }

  bindAgent() {
    this.agent.on('started', () => {
      this.log('** Discovery Started **')
    })

    this.agent.on('didDiscoverDevice', (device) => {
      this.handleDeviceDiscovery(device)
    })
  }

  getDevice(lightID) {
    return this.devices[lightID]
  }

  addCachedDevice(device) {
    this.log('** Adding Cached Device', device)
    var newDevice = device
    newDevice.debug = this.isDebug
    newDevice.interval = this.interval
    this.devices[device.id] = {
      yeeDevice: new YeeDevice(newDevice),
    }
  }

  handleDeviceDiscovery(device) {
    // Check if device already exists
    if (this.devices[device.id] != null) {
      // Device already exists
      const oldDevice = this.devices[device.id]
      if (oldDevice.yeeDevice.device.Location !== device.Location) {
        oldDevice.yeeDevice.updateDevice(device)
        this.devices[device.id] = oldDevice
        this.emit('deviceUpdated', device)
      }
      return
    }
    // Add New Device
    var newDevice = device
    newDevice.debug = this.isDebug
    newDevice.interval = this.interval
    this.devices[device.id] = {
      yeeDevice: new YeeDevice(newDevice),
    }
    this.emit('deviceAdded', device)
  }

  resetLights(shouldTurnOff) {
    this.log('** Resetting all lights')
    this.sendCommand(Object.keys(this.devices), {
      id: -1,
      method: 'stop_cf',
      params: [],
    })
    if (shouldTurnOff) {
      setTimeout(() => {
        this.sendCommand(Object.keys(this.devices), {
          id: -1,
          method: 'set_power',
          params: ['off', 'smooth', '500'],
        })
      }, 2000)
    }
  }

  sendCommand(lights, cmd) {
    this.log('** Sending Command to ', lights, cmd)
    lights.forEach((light) => {
      if (this.devices[light] != null) {
        const device = this.devices[light]
        device.yeeDevice.sendCommand(cmd)
      }
    })
  }

  log(...args) {
    if (this.logger) {
      this.logger(args)
    }
  }
}
const service = new YeeDeviceService()
module.exports = service
