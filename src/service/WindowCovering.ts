import { HomeServerConnector } from '../hs';
import { API } from 'homebridge';

import { HsdPlatformAccessory } from '../hsdPlatformAccessory';
import { addCurrentPositionCharacteristic } from './characteristic/CurrentPosition';
import { addPositionStateCharacteristic } from './characteristic/PositionState';
import { addTargetPositionCharacteristic } from './characteristic/TargetPosition';
import { addObstructionDetectedCharacteristic } from './characteristic/ObstructionDetected';
import { addHoldPositionCharacteristic } from './characteristic/HoldPosition';
import { HsdServiceConfig } from '../config';
import { AbstractHsdService } from './AbstractHsdService';
// import { addListener } from 'process';

export class WindowCovering extends AbstractHsdService {

  public constructor (api: API, hsd: HomeServerConnector, accessory: HsdPlatformAccessory, config: HsdServiceConfig) {
    super(api, hsd, accessory, config);

    const service = this.getService(this.api.hap.Service.Window);
    //service.setCharacteristic(this.api.hap.Service.name, config.serviceName);

    for (const characteristic of config.characteristics) {
      if (characteristic.characteristicName === 'CurrentPosition') {
        addCurrentPositionCharacteristic(api, service, hsd, characteristic.endpoints[0]);
      } else if (characteristic.characteristicName === 'PositionState') {
        addPositionStateCharacteristic(api, service, hsd, characteristic.endpoints[0]);
      } else if (characteristic.characteristicName === 'TargetPosition') {
        addTargetPositionCharacteristic(api, service, hsd, characteristic.endpoints[0], characteristic.endpoints[1]);
      } else if (characteristic.characteristicName === 'ObstructionDetected') {
        addObstructionDetectedCharacteristic(api, service, hsd, characteristic.endpoints[0]);
      } else if (characteristic.characteristicName === 'HoldPosition') {
        addHoldPositionCharacteristic(api, service, hsd, characteristic.endpoints[0]);
      }
    }
  }
}
