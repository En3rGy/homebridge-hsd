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
    const ret = hsd.getCo(getEndpoint);
    if (typeof(ret) === 'object') {
      return Promise.reject(0);
      //return Promise.reject(new Error('CurrentDoorState.ts | CurrentDoorStat.onGet | Invalid return object!'));
    }
    return Number(ret);
  });
};

