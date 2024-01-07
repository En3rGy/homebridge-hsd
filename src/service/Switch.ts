import { HomeServerConnector } from '../hs';
import { API } from 'homebridge';

import { HsdPlatformAccessory } from '../hsdPlatformAccessory';
import { addOnCharacteristic } from './characteristic/On';
import { HsdServiceConfig } from '../config';
import { AbstractHsdService } from './AbstractHsdService';

export class Switch extends AbstractHsdService {

  public constructor (api: API, hsd: HomeServerConnector, accessory: HsdPlatformAccessory, config: HsdServiceConfig) {
    super(api, hsd, accessory, config);

    const service = this.getService(this.api.hap.Service.Switch);
    //service.setCharacteristic(this.api.hap.Service.name, config.serviceName);

    for (const characteristic of config.characteristics) {
      if (characteristic.characteristicName === 'On') {
        addOnCharacteristic(api, service, hsd, characteristic.endpoints[0], characteristic.endpoints[1]);
      }
    }
  }
}

