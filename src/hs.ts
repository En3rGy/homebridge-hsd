/* eslint-disable no-console */
import * as WebSocket from 'ws';
import { Logging } from 'homebridge';
import { HsdAccessory } from './hsdAccessory';
import { randomUUID } from 'crypto';

export enum CONNECTION_STATE {
  INIT = 0,
  CONNECTING = 1,
  OPEN = 2,
  CLOSING = 3,
  CLOSED = 4,
  DESTROYED = 5
}

export class HomeServerConnector {

  private static _instance: HomeServerConnector;

  private _ws: WebSocket.WebSocket | null = null;
  private _connState = CONNECTION_STATE.INIT;
  private _transactionIdCnt = 0;
  private _listeners: Map<string, (reading: string) => void> = new Map();
  private _msgQueu = {};
  private _uuid = '';

  private requestPromiseResolver: Map<string, (value: string | PromiseLike<string>) => void> = new Map();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private requestPromiseRejecter: Map<string, (reason?: any) => void> = new Map();
  private lastSet: Map<string, string> = new Map();

  private _hsIp = '';
  private _hsPort = 0;
  private _user = '';
  private _pw = '';

  private _errorCodes = {
    0: 'Everything is fine.',
    400: 'Invalid request (Bad Request).',
    403: 'Access denied (Forbidden). Check if the read/write flag is set for the user groups on the Endpoint-tab.',
    404: 'The requested HS-Object does not exist in the called context.',
    500: 'An error occurred in the server when generating the response.',
    901: 'The specified key is invalid.',
    902: 'reserved',
    903: 'The object parameters are invalid.',
    904: 'The object is not subscribed.',
  };

  /**
   *
   */
  private constructor(private logger: Logging, private accessory: Map<string, HsdAccessory>) {
    this._uuid = randomUUID();
  }

  // This static method controls the access to the singleton instance.
  // On the first run, it creates the instance and stores it in a static field.
  // On subsequent runs, it returns the stored instance.
  public static getInstance(logger: Logging, accessory: Map<string, HsdAccessory>): HomeServerConnector {
    if (!HomeServerConnector._instance) {
      HomeServerConnector._instance = new HomeServerConnector(logger, accessory);
    }
    return HomeServerConnector._instance;
  }

  /**
   *
   * @returns
   */
  getConnState() {
    return this._connState;
  }

  /**
   *
   * @param hsIp
   * @param hsPort
   * @param user
   * @param pw
   */
  connect(hsIp: string, hsPort: number, user: string, pw: string) {
    if ((this._connState === CONNECTION_STATE.OPEN) || (this._connState === CONNECTION_STATE.CONNECTING)) {
      return; // already connected
    }
    this.logger.info('hs.ts | HomeServerConnector | connect > Current connection state is %d', this._connState);

    this._hsIp = hsIp;
    this._hsPort = hsPort;
    this._user = user;
    this._pw = pw;
    const prot = 'wss';
    const url = prot + '://' + this._hsIp + ':' + this._hsPort + '/endpoints/ws?authorization=' + encodeURIComponent(btoa(user + ':' + pw));
    this._ws = new WebSocket.WebSocket(url, { rejectUnauthorized: false });
    this._connState = CONNECTION_STATE.CONNECTING;

    this._ws.on('open', () => {
      this._connState = CONNECTION_STATE.OPEN;
      this.logger.info('Connected to HS by %s', this._uuid);
    });

    this._ws.on('message', (message: string) => {
      this.receivedMessage(message);
    });

    this._ws.on('close', (code:number, reason:string) => {
      this._connState = CONNECTION_STATE.CLOSED;
      this.logger.info('Connection with HS closed ' + code + reason);
    });

    this._ws.on('error', (errorMsg: string) => {
      this._connState = CONNECTION_STATE.CLOSED;
      this.logger.info('Error ' + 'code: ' + errorMsg);
    });
  }

  /**
   *
   */
  receivedMessage(message: string): boolean {
    const jsonMsg = JSON.parse(message);

    if (! jsonMsg) {
      this.logger.error('hs.ts | HomeserverConnector | receivedMessage: JSON parser failed für %s', message);
      return false;
    }

    const code = jsonMsg.code;
    const type = jsonMsg.type;
    const data = jsonMsg.data;

    if (code !== 0) {
      if ('request' in jsonMsg) {
        if (code in this._errorCodes) {
          this.logger.error('hs.ts | HomeserverConnector | receivedMessage > Error and aborting due to "%s" for %s requesting %s',
            this._errorCodes[code],
            jsonMsg.request.key,
            jsonMsg.request.method);
        } else {
          this.logger.error('hs.ts | HomeserverConnector | receivedMessage > Error and aborting due to code %d for %s requesting %s',
            code,
            jsonMsg.request.key,
            jsonMsg.request.method);
        }
      } else {
        this.logger.error('hs.ts | HomeserverConnector | receivedMessage > Error and aborting due to %s', message);
      }
      return false;
    }

    // let data: string;
    let endpoint: string;
    let value: string;

    if (type === 'select' || type === 'subscribe') {
      this.logger.debug('hs.ts | HomeserverConnector | Received select/subscribe message');
      for (const item of data.items) {
        if (item.code !== 0) {
          if ('request' in jsonMsg) {
            if (code in this._errorCodes) {
              this.logger.error('hs.ts | HomeserverConnector | receivedMessage > Error and aborting due to "%s" for %s requesting %s',
                this._errorCodes[ item.code],
                item.key,
                type);
            } else {
              this.logger.error('hs.ts | HomeserverConnector | receivedMessage > Error and aborting due to code %d for %s requesting %s',
                item.code,
                item.key,
                type);
            }
            return false;
          }

          endpoint = item.key;
          value = String(item.data.value);

          /// return value via callback
          const callback = this._listeners.get(endpoint);
          if (callback) {
            callback(value);
          } else {
            this.logger.warn('hs.ts | HomeserverConnector | No callback for %s registered', endpoint);
          }
        }
      }

    } else if (type === 'push') {
      endpoint = jsonMsg.subscription.key;
      value = jsonMsg.data.value;
      this.logger.debug('hs.ts | HomeserverConnector | Received push message with %s: "%s"', endpoint, value);

      /// return value via callback
      const callback = this._listeners.get(endpoint);
      if (callback) {
        callback(value);
      } else {
        this.logger.warn('hs.ts | HomeserverConnector | No callback for %s registered', endpoint);
      }

    } else if( type === 'call') {
      const method = jsonMsg['request'].method;
      endpoint = jsonMsg['request'].key;

      // ### reply on previous get call ###
      if (method === 'get') {
        value = jsonMsg.data.value;
        this.logger.debug('hs.ts | HomeserverConnector | Received as get-reply for %s: "%s"', endpoint, value);

        // returns the get value if getCo was called before
        const resolver = this.requestPromiseResolver.get(endpoint);

        if (resolver) {
          resolver(String(value));
          this.requestPromiseResolver.delete(endpoint);
          this.requestPromiseRejecter.delete(endpoint);
        }

        if (method in this._msgQueu) {  // @todo Check if required.
          if (endpoint in this._msgQueu[method]) {
            this.logger.debug('Found received method and endpoint in msgQue');
            this._msgQueu[method][endpoint] = value;
          }
        }

      // ### reply on previous set call ###
      } else if (method === 'set') {
        // returns the get value if getCo was called before
        const resolver = this.requestPromiseResolver.get(endpoint);
        this.logger.debug('hs.ts | HomeserverConnector | Received set confirmation for %s' + endpoint);

        if (resolver) {
          resolver(String(this.lastSet.get(endpoint)));
          this.requestPromiseResolver.delete(endpoint);
          this.requestPromiseRejecter.delete(endpoint);
          this.lastSet.delete(endpoint);
        }
      } else {
        this.logger.warn('hs.ts | HomeserverConnector | Received unknown method: %s', method);
        value = '';
      }

      /*if ( endpoint in this._listeners) {
        this._listeners[endpoint](value);
      }*/
    } else {
      this.logger.warn('hs.ts | HomeserverConnector | Received unknown msg type: %s', type);
    }

    return true;
  }

  /**
   *
   */
  disconnect() {
    if (this._connState === CONNECTION_STATE.OPEN) {
      if (this._ws !== null) {
        this._ws.close();
      }
    }
    this._connState === CONNECTION_STATE.CLOSED;
    this.logger.info('Gently disconnected from HS.');
  }

  /**
   *
   * @returns
   */
  _getNewTransactionId () {
    this._transactionIdCnt += 1;
    return 'T_' + this._transactionIdCnt;
  }

  /**
   *
   * @param obj
   * @returns
   */
  sendJson(msg: object, retries = 3): string|number {

    // Create a promise to wait for the response

    if (this.getConnState() !== CONNECTION_STATE.OPEN) {
      this.connect(this._hsIp, this._hsPort, this._user, this._pw);
      if (retries > 0) {
        setTimeout(() => {
          this.sendJson(msg, retries - 1);
        }, 1000);
      } else {
        this.logger.error('Max retries reached. Connction to HS failed.');
      }
    } else {

      const params: object = msg['param'];
      const method = params['method'];

      if (method in this._msgQueu) {
        //
      } else {
        this._msgQueu[method] = {};
      }

      if (msg['type'] === 'call') {
        const key: string = params['key'];

        if (key in this._msgQueu[method]) {
          return this._msgQueu[method][key];
        }

      } else if (msg['type'] === 'subscribe') {
        //

      } else {
        this.logger.warn('hs.ts | HomeServerConnector | Message type %s not implemented yet.', msg['type']);
        return '';
      }

      const smsg = JSON.stringify(msg);
      this.logger.debug('hs.ts | Send message: %s', smsg);
      if (this._ws !== null) {
        this._ws.send(smsg);
      }
    }
    return '';
  }

  /**
   *
   * @param listener
   * @param endpoint
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  addListener(listener: (reading: string | number) => void, endpoint: string) {
    this.logger.debug('hs.ts | HomeServerConnector | Adding listener for', endpoint);
    this._listeners.set(endpoint, listener);
    this.subscribe([endpoint]);
  }

  /**
   * Subscribes to a list of given endpoints.
   * @param keys List of entpoints to subscribe
   * @returns True if subscription was successfull.
   */
  subscribe(keys: string[]): boolean {
    this.logger.debug('Subscribing to', keys);
    const msg = {'type': 'subscribe', 'param': {'keys': keys, 'context': this._getNewTransactionId()}};
    if (this.sendJson(msg)) {
      return true;
    }
    return false;
  }

  /**
   * Writes the given value to the endpoint
   * @param key Name of endpoint, e.g. CO@1_2_3
   * @param value Value to set
   * @returns True if set was successfull.
   */
  setCo(key: string, value: string|number|boolean): boolean {

    // const param = {'context': this._getNewTransactionId(), 'key': key, 'method': 'set', 'value': value};
    const param = {'key': key, 'method': 'set', 'value': value};
    if (typeof value === 'string') {
      param.value = btoa(value);
    }

    const msg = {'type': 'call', 'param': param};

    if (this.sendJson(msg)) {
      this.lastSet.set(key, String(value));
      return true;
    }
    return false;
  }

  /**
   * Request the value of the given endpoint from Homeserver
   * @param key Name of endpoint, e.g. CO@1_2_3
   * @returns True the characteristic value received from Homeserver.
   */
  getCo(key: string): Promise<string> {
    const param = {'key': key, 'method': 'get'};
    const msg = {'type': 'call', 'param': param};

    return new Promise<string>((resolve, reject) => {
      this.requestPromiseResolver.set(key, resolve);
      this.requestPromiseRejecter.set(key, reject);

      this.sendJson(msg);
    });
  }

  /**
   *
   * @param key
   * @param tags
   * @param search
   * @param meta
   * @returns True if request was successfull.
   */
  select(key: string, tags: string[], search: string, meta: boolean): boolean {
    const msg = {'type': 'select', 'param': {}};
    msg['param']['context'] = this._getNewTransactionId();
    msg['param']['key'] = key;
    //msg['param']['tags'] = tags;
    //msg['param']['search'] = search;
    msg['param']['meta'] = meta || false;
    msg['param']['from'] = 0;
    msg['param']['count'] = 1000;
    if (this.sendJson(msg)) {
      return true;
    }
    return false;
  }
}