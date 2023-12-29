import { HomeServerConnector } from '../hs';
import { API } from 'homebridge';

import { HsdPlatformAccessory } from '../hsdPlatformAccessory';
import { addCurrentDoorStateCharacteristic } from './characteristic/CurrentDoorState';
import { addTargetDoorStateCharacteristic } from './characteristic/TargetDoorState';
import { addObstructionDetectedCharacteristic } from './characteristic/ObstructionDetected';
import { HsdServiceConfig } from '../config';
import { AbstractHsdService } from './AbstractHsdService';
// import { addListener } from 'process';

export class Window extends AbstractHsdService {

  public constructor (api: API, hsd: HomeServerConnector, accessory: HsdPlatformAccessory, config: HsdServiceConfig) {
    super(api, hsd, accessory, config);

    const service = this.getService(this.api.hap.Service.Window);

    addCurrentDoorStateCharacteristic(api, service, hsd, this.config.endpoints[0]);
    addTargetDoorStateCharacteristic(api, service, hsd, this.config.endpoints[1], this.config.endpoints[2]);
    addObstructionDetectedCharacteristic(api, service, hsd, this.config.endpoints[3]);
  }
}

/*
- Current Position
- Position State
- Target Position

Optional Characteristics
- Name
- Obstruction Detected
- Hold Position
*/