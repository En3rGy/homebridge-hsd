import { HomeServerConnector } from '../hs';
import { API } from 'homebridge';

import { HsdPlatformAccessory } from '../hsdPlatformAccessory';
import { addCurrentTemperature } from './characteristic/CurrentTemperature';
import { HsdServiceConfig } from '../config';
import { AbstractHsdService } from './AbstractHsdService';

export class TemperatureSensor extends AbstractHsdService {

  public constructor (api: API, hsd: HomeServerConnector, accessory: HsdPlatformAccessory, config: HsdServiceConfig) {
    super(api, hsd, accessory, config);

    const service = this.getService(this.api.hap.Service.TemperatureSensor);
    //service.setCharacteristic(this.api.hap.Service.name, config.serviceName);

    for (const characteristic of config.characteristics) {
      if (characteristic.characteristicName === 'CurrentTemperature') {
        addCurrentTemperature(api, service, hsd, characteristic.endpoints[0]);
      }
    }
  }
}

