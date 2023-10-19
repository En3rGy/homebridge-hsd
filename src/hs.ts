/* eslint-disable no-console */
import * as WebSocket from 'ws';

export enum CONNECTION_STATE {
  INIT = 0,
  CONNECTING = 1,
  OPEN = 2,
  CLOSING = 3,
  CLOSED = 4,
  DESTROYED = 5
}

export class HomeServerConnector {

  private _ws: WebSocket.WebSocket | null = null;
  private _connState = CONNECTION_STATE.INIT;
  private _transactionIdCnt = 0;
  private _msgQueue = {};

  constructor() {
    //
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
  createConnection(hsIp: string, hsPort: number, user: string, pw: string) {
    const hostname = hsIp;
    const port = hsPort;
    const prot = 'wss';
    const url = prot + '://' + hostname + ':' + port + '/endpoints/ws?authorization=' + encodeURIComponent(btoa(user + ':' + pw));
    this._ws = new WebSocket.WebSocket(url, { rejectUnauthorized: false });
    this._connState = CONNECTION_STATE.CONNECTING;

    this._ws.on('open', () => {
      this._connState = CONNECTION_STATE.OPEN;
      console.log((new Date()).getTime() + ' Conncted to HS');
    });

    this._ws.on('message', (message: string) => {
      this.receivedMessage(message);
    });

    this._ws.on('close', (code:number, reason:string) => {
      this._connState = CONNECTION_STATE.CLOSED;
      console.log((new Date()).getTime() + ' Connection with HS closed ' + code + reason);
    });

    this._ws.on('error', (errorMsg: string) => {
      this._connState = CONNECTION_STATE.CLOSED;
      console.log((new Date()).getTime() + 'Error ' + 'code: ' + errorMsg);
    });
  }

  /**
   *
   */
  receivedMessage(message: string): boolean {
    const jsonMsg = JSON.parse(message);
    console.log((new Date()).getTime() + ' Received from HS: ' + message);

    const code = jsonMsg.code;
    const type = jsonMsg.type;

    // const context = jsonMsg.request.context;

    if (code !== 0) {
      console.error('Received code ' + code);
      return false;
    }

    let data: string;

    if (type === 'select' || type === 'subscribe') {
      data = jsonMsg.data.items;
      console.log((new Date()).getTime() + ' ' + JSON.stringify(data, null, '  '));
    } else if( type === 'call') {
      const method = jsonMsg.method;
      const key = jsonMsg.request.key;

      if (method === 'get') {
        console.log((new Date()).getTime() + ' ' + key + ': ' + jsonMsg.data.value);
      }
    } else {
      console.log((new Date()).getTime() + ' ' + type);
    }

    return true;
  }

  /**
   *
   */
  disconnect() {
    if (this._connState === CONNECTION_STATE.OPEN) {
      this._ws.close();
    }
    this._connState === CONNECTION_STATE.CLOSED;
    console.log((new Date()).getTime() + ' Gently disconnected from HS.');
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
  sendJson(obj: object, retries = 3): boolean {
    if (this.getConnState() !== CONNECTION_STATE.OPEN) {
      if (retries > 0) {
        setTimeout(() => {
          this.sendJson(obj, retries - 1);
        }, 1000);
      } else {
        console.error('Max retries reached. Connction to HS failed.');
        return false;
      }
    } else {
      const s = JSON.stringify(obj);
      console.log((new Date()).getTime() + ' Send message: ' + s);
      this._ws.send(s);
      return true;
    }
    return false;
  }

  /**
   *
   * @param keys
   */
  subscribe(keys: string[]): boolean {
    const msg = {'type': 'subscribe', 'param': {'keys': keys, 'context': this._getNewTransactionId()}};
    if (this.sendJson(msg)) {
      this._msgQueue[msg['param']['context']] = {ts: (new Date()).getTime()};
      return true;
    }
    return false;
  }

  /**
   *
   * @param key
   * @param value
   */
  setCo(key: string, value: string|number): boolean {

    // const param = {'context': this._getNewTransactionId(), 'key': key, 'method': 'set', 'value': value};
    const param = {'key': key, 'method': 'set', 'value': value};
    if (typeof value === 'string') {
      param.value = btoa(value);
    }

    return this._call(param);
  }

  /**
   *
   * @param key
   * @param value
   */
  getCo(key: string): boolean {
    //const param = {'context': this._getNewTransactionId(), 'key': key, 'method': 'get'};
    const param = {'key': key, 'method': 'get'};
    return this._call(param);
  }

  /**
   *
   * @param key
   */
  _call(param: object): boolean {
    const msg = {'type': 'call', 'param': {}};
    msg['param'] = param;

    if (this.sendJson(msg)) {
      this._msgQueue[msg['param']['context']] = {ts: (new Date()).getTime()};
      return true;
    }
    return false;
  }

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
      this._msgQueue[msg['param']['context']] = {ts: (new Date()).getTime()};
      return true;
    }
    return false;
  }
}