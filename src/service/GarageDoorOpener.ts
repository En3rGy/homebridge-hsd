import { HomeServerConnector } from '../hs';
import { API } from 'homebridge';

import { HsdPlatformAccessory } from '../hsdPlatformAccessory';
import { addCurrentDoorStateCharacteristic } from './characteristic/CurrentDoorState';
import { addTargetDoorStateCharacteristic } from './characteristic/TargetDoorState';
import { addObstructionDetectedCharacteristic } from './characteristic/ObstructionDetected';
import { HsdServiceConfig } from '../config';
import { AbstractHsdService } from './AbstractHsdService';
// import { addListener } from 'process';

export class GarageDoorOpener extends AbstractHsdService {

  public constructor (api: API, hsd: HomeServerConnector, accessory: HsdPlatformAccessory, config: HsdServiceConfig) {
    super(api, hsd, accessory, config);

    const service = this.getService(this.api.hap.Service.GarageDoorOpener);
    //service.setCharacteristic(this.api.hap.Service.name, config.serviceName);

    for (const characteristic of config.characteristics) {
      if (characteristic.characteristicName === 'CurrentDoorState') {
        addCurrentDoorStateCharacteristic(api, service, hsd, characteristic.endpoints[0]);
      } else if (characteristic.characteristicName === 'TargetDoorState') {
        addTargetDoorStateCharacteristic(api, service, hsd, characteristic.endpoints[0], characteristic.endpoints[1]);
      } else if (characteristic.characteristicName === 'ObstructionDetected') {
        addObstructionDetectedCharacteristic(api, service, hsd, characteristic.endpoints[0]);
      }
    }
  }
}
