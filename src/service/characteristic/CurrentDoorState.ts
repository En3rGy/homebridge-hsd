import { API, Service } from 'homebridge';
import { HomeServerConnector } from '../../hs';

export const addCurrentDoorStateCharacteristic = (api: API,
  service: Service,
  hsd: HomeServerConnector,
  getEndpoint: string): void => {

  const on = service.getCharacteristic(api.hap.Characteristic.CurrentDoorState);

  // Add subscription
  hsd.addListener(reading => {
    on.updateValue(Number(reading));
  }, getEndpoint);

  on.onGet(async () => {
    return hsd.getCo(getEndpoint);
  });
};

