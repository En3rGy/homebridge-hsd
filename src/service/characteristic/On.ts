import { API, Service } from 'homebridge';
import { HomeServerConnector } from '../../hs';

export const addOnCharacteristic = (api: API,
  service: Service,
  hsd: HomeServerConnector,
  setEndpoint: string,
  getEndpoint: string): void => {

  const on = service.getCharacteristic(api.hap.Characteristic.On);

  // @todo Implement waiting for retun value and getting it from hs.ts
  on.onGet(async () => {
    return (await hsd.getCo(getEndpoint));
  });

  on.onSet(async turnOn => {
    await hsd.setCo(setEndpoint, Number(turnOn));
  });
};

