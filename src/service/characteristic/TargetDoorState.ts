import { API, Service } from 'homebridge';
import { HomeServerConnector } from '../../hs';

export const addTargetDoorStateCharacteristic = (api: API,
  service: Service,
  hsd: HomeServerConnector,
  setEndpoint: string,
  getEndpoint: string): void => {

  const on = service.getCharacteristic(api.hap.Characteristic.TargetDoorState);

  // Add subscription
  hsd.addListener(reading => {
    on.updateValue(Number(reading));
  }, getEndpoint);

  on.onGet(async () => {
    return hsd.getCo(getEndpoint);
  });

  on.onSet(async state => {
    hsd.setCo(setEndpoint, Number(state));
  });
};
