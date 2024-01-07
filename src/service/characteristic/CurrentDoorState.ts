import { API, Service } from 'homebridge';
import { HomeServerConnector } from '../../hs';

export const addCurrentDoorStateCharacteristic = (api: API,
  service: Service,
  hsd: HomeServerConnector,
  getEndpoint: string): void => {

  const currentDoorStat = service.getCharacteristic(api.hap.Characteristic.CurrentDoorState);

  // Add subscription
  hsd.addListener(reading => {
    currentDoorStat.updateValue(Number(reading));
  }, getEndpoint);

  currentDoorStat.onGet(async () => {
    return Number(hsd.getCo(getEndpoint));
  });
};

