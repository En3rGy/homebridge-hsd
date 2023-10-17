/* eslint-disable @typescript-eslint/no-this-alias */
// @ts-check

import { WebSocket } from 'ws';
import console from 'console';
import { atob, btoa } from 'buffer';
import { setTimeout } from 'timers/promises';
import { clearInterval } from 'timers';

/**
 * @namespace
 */
var HomeServerConnector = {};

/**
 *
 * @param {string} msg
 * @param {*} e
 */
HomeServerConnector._exception = function(msg, e) {
  console.log(msg, e);
};

/**
 *
 * @param {string} msg
 */
HomeServerConnector._debug = function(msg) {
  console.log('DEBUG', msg);
};

/**
 *
 * @param {string} msg
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
HomeServerConnector._trace = function(msg) { /*console.log("TRACE", msg);*/ };

/**
 * Verbindungs-Status.
 * @enum {Number}
 */
HomeServerConnector.CONNECTION_STATE = {
  /** Initialisiert bzw. Initialisierung läuft
     * @type {Number}
     */
  INIT: 0,
  /** Verbindung wird aufgebaut
     * @type {Number}
     */
  CONNECTING: 1,
  /** Verbunden
     * @type {Number}
     */
  OPEN: 2,
  /** Verbindung wird geschlossen
     * @type {Number}
     */
  CLOSING: 3,
  /** Verbindung ist geschlossen
     * @type {Number}
     */
  CLOSED: 4,
  /** Objekt ist bereits freigegeben
     * @type {Number}
     */
  DESTROYED: 5,
};

/**
 *
 * @param {Number} s
 * @returns {String}
 */
HomeServerConnector._fill = function (s) {
  var x = '' + s;
  while (x.length < 2) {
    x = '0' + x;
  }
  return x;
};

/**
 *
 * @param {Date} dt
 * @returns {String}
 */
HomeServerConnector._convertDateToStr = function (dt) {
  var f = HomeServerConnector._fill;
  var shortYear = dt.getFullYear().toString().substring(2);
  var month = f(dt.getMonth() + 1);
  var day = f(dt.getDay());
  return shortYear + month + day;
};

/**
 *
 * @param {*} dt
 * @returns
 */
HomeServerConnector._convertFullDateToStr = function (dt) {
  var f = HomeServerConnector._fill;
  return '' + dt.getFullYear().toString() + f(dt.getMonth() + 1) + f(dt.getDate());
};

/**
 *
 * @param {*} dt
 * @returns
 */
HomeServerConnector._convertLongStrToDate = function (dt) {
  var y = parseInt(dt.substr(0, 4));
  var m = parseInt(dt.substr(4, 2)) - 1;
  var d = parseInt(dt.substr(6, 2));
  return new Date(y, m, d);
};

/**
 *
 * @param {Number} h
 * @param {Number} m
 * @returns
 */
HomeServerConnector._convertTimeToStr = function (h, m) {
  var f = HomeServerConnector._fill;
  return f(h) + f(m);
};

/**
 *
 * @param {String} t
 * @param {Boolean} _abs
 * @returns
 */
HomeServerConnector._parseInt = function (t, _abs) {
  if (t !== undefined) {
    var r = parseInt(t);
    if (!isNaN(r) && r !== 0) {
      if (_abs) {
        return Math.abs(r);
      } else {
        return r;
      }
    }
  }
  return null;
};

/**
 *
 */
HomeServerConnector._hsoBase = {};

/**
 *
 * @returns
 */
HomeServerConnector._hsoBase.getInternalId = function () {
  return this._interalId;
};

/**
 *
 * @returns
 */
HomeServerConnector._hsoBase.getKey = function () {
  return this._key;
};

/**
 * @type {HomeServerConnector}
 */
HomeServerConnector._conn = null;

/**
 *
 * @returns
 */
HomeServerConnector._hsoBase.destroy = function () {
  if (this._destroyed) {
    return;
  }
  this._destroyed = true;
  this._conn._removeObject(this);
  if (this._callback) {
    this._callback = null;
    this._conn._cache.unsubscribe([this._key], this);
  }
};

/**
 *
 * @param {*} objectKey
 * @param {*} error
 * @returns
 */
HomeServerConnector._hsoBase.onSubscribeError = function (objectKey, error) {
  if (this._destroyed) {
    return;
  }
  if (this._callback) {
    try {
      this._callback.apply(this, [error]);
    } catch (e) {
      HomeServerConnector._exception('_hsoBase.onSubscribeError.callback', e);
    }
  }
};

/**
 *
 * @param {*} objectKey
 * @param {*} data
 * @param {Boolean} isInit
 * @returns
 */
HomeServerConnector._hsoBase.onNewValue = function (objectKey, data, isInit) {
  if (this._destroyed) {
    return;
  }
  if (this._callback) {
    try {
      var args = [undefined, undefined];
      if (!isInit) {
        if ('_unpackValue' in this) {
          args[1] = this._unpackValue(data);
        } else {
          args[1] = data;
        }
      }
      this._callback.apply(this, args);
    } catch (e) {
      HomeServerConnector._exception('_hsoBase.onNewValue.callback', e);
    }
  }
};

/**
 *
 * @param {*} objectKey
 * @param {*} data
 * @param {Boolean} isInit
 * @returns
 */
HomeServerConnector._hsoBase.onNewValueAndInit = function (objectKey, data, isInit) {
  if (this._destroyed) {
    return;
  }
  if (this._callback) {
    try {
      var args = [undefined, undefined, isInit];
      if ('_unpackValue' in this) {
        args[1] = this._unpackValue(data);
      } else {
        args[1] = data;
      }
      this._callback.apply(this, args);
    } catch (e) {
      HomeServerConnector._exception('_hsoBase.onNewValue.callback', e);
    }
  }
};

/**
 *
 * @param {*} error
 * @param {*} data
 * @returns
 */
HomeServerConnector._hsoBase.valueHandler = function (error, data) {
  if (error) {
    return [error];
  } else {
    return [error, data];
  }
};

/**
 *
 * @param {*} callback
 */
HomeServerConnector._hsoBase.getMeta = function (callback) {
  HomeServerConnector._hsoBase.callMethod.apply(this, ['meta', callback, HomeServerConnector._hsoBase.valueHandler]);
};

/**
 *
 * @param {*} method
 * @param {*} parameter
 * @param {*} callback
 * @param {*} valueHandler
 * @param {*} valueContext
 * @returns
 */
HomeServerConnector._hsoBase.callMethodWithParameter = function (method, parameter, callback, valueHandler, valueContext) {
  if (this._destroyed) {
    return;
  }
  // eslint-disable-next-line @typescript-eslint/no-this-alias
  var that = this;
  var opt = {objectKey: this._key, method: method, parameter: parameter};
  this._conn._call(opt, (error, key, data) => {
    if (callback) {
      if (valueHandler !== undefined && typeof valueHandler === 'function') {
        callback.apply(that, valueHandler.apply(that, [error, data, valueContext]));
      } else if (valueHandler !== undefined && valueHandler === true) {
        callback.apply(that, [error, data]);
      } else {
        callback.apply(that, [error]);
      }
    }
  });
};

/**
 *
 * @param {*} method
 * @param {*} callback
 * @param {*} valueHandler
 * @param {*} valueContext
 * @returns
 */
HomeServerConnector._hsoBase.callMethod = function (method, callback, valueHandler, valueContext) {
  if (this._destroyed) {
    return;
  }
  // eslint-disable-next-line @typescript-eslint/no-this-alias
  var that = this;
  var opt = {objectKey: this._key, method: method};
  this._conn._call(opt, (error, key, data) => {
    if (callback) {
      if (valueHandler !== undefined && typeof valueHandler === 'function') {
        callback.apply(that, valueHandler.apply(that, [error, data, valueContext]));
      } else if (valueHandler !== undefined && valueHandler === true) {
        callback.apply(that, [error, data]);
      } else {
        callback.apply(that, [error]);
      }
    }
  });
};

/**
 * Kommunikations-Objekt (KO).
 * Darf **nicht** direkt instanziert werden. Eine Instanz der Klasse wird von der Methode
 * {@link HomeServerConnector._Connection#getCommunicationObject} erzeugt.
 * @class
 * @example <caption> </caption>
 * var co = conn.getCommunicationObject("CO@1_1_1", function(err, value, isInit) {});
 */
HomeServerConnector._CommunicationObject = function (parent, key, callback) {
  if (parent) {
    this._interalId = 'CO#' + parent._getNewObjectId();
  } else {
    this._interalId = 'CO#' + key;
  }
  this._destroyed = false;
  this._conn = parent;
  this._key = key;
  if (callback) {
    this._callback = callback;
    this._conn._cache.subscribe([key], this);
  }
};

/**
 * Subscription
 * @ignore
 * @param {*} data
 * @returns {*}
 */
HomeServerConnector._CommunicationObject.prototype._unpackValue = function (data) {
  var value;
  if ('value' in data) {
    if (typeof data['value'] === 'string') {
      value = atob(data['value']);
    } else {
      value = data['value'];
    }
  }
  return value;
};

HomeServerConnector._CommunicationObject.prototype._onSubscribeError = HomeServerConnector._hsoBase.onSubscribeError;
HomeServerConnector._CommunicationObject.prototype._onNewValue = HomeServerConnector._hsoBase.onNewValueAndInit;
HomeServerConnector._CommunicationObject.prototype._getId = HomeServerConnector._hsoBase.getInternalId;

/**
 * Liefert den Schlüssel des Objekts zurück.
 * @method
 * @returns {String}
 * @example
 * var object_key = co.getKey();
 */
HomeServerConnector._CommunicationObject.prototype.getKey = HomeServerConnector._hsoBase.getKey;

/**
 * Gibt das Objekt frei und hebt ein eventuell vorhandes Abonnement auf.
 * @method
 * @example
 * co.destroy();
 */
HomeServerConnector._CommunicationObject.prototype.destroy = HomeServerConnector._hsoBase.destroy;

/**
 * Ruft die Meta-Daten ab.
 * @method
 * @param {function} callback  {@link HomeServerConnector._CommunicationObject~getMetaCallback}
 * @example <caption>Abruf der Meta-Daten.</caption>
 * co.getMeta(function(err, data) {});
 */
HomeServerConnector._CommunicationObject.prototype.getMeta = HomeServerConnector._hsoBase.getMeta;

/**
 *
 * @param {*} err
 * @param {*} data
 * @returns
 */
HomeServerConnector._unpackCOValue = function (err, data) {
  if (err) {
    return [err];
  } else {
    var value;
    if ('value' in data) {
      if (typeof data['value'] === 'string') {
        value = atob(data['value']);
      } else {
        value = data['value'];
      }
    }
    return [err, value];
  }
};

/**
 * Ruft den aktuellen Wert ab.
 * @param {function} callback  {@link HomeServerConnector._CommunicationObject~getValueCallback}
 * @example <caption>Abfragen des aktuellen Werts des KO.</caption>
 * co.getValue(function(err, value) {});
 */
HomeServerConnector._CommunicationObject.prototype.getValue = function (callback) {
  HomeServerConnector._hsoBase.callMethod.apply(this, ['get', callback, HomeServerConnector._unpackCOValue]);
};

/**
 * Setzt den Wert.
 * @param {String|Number} value Wert, auf den das K.-Objekt gesetzt werden soll.
 * @param {function} callback  {@link HomeServerConnector._CommunicationObject~setValueCallback}
 * @example <caption>Setzen eines numerischen Werts.</caption>
 * co.setValue(1.0, function(err) {});
 * @example <caption>Setzen eines Strings.</caption>
 * co.setValue("Text Text Text", function(err) {});
 */
HomeServerConnector._CommunicationObject.prototype.setValue = function (value, callback) {
  var p = {};
  if (typeof value === 'string') {
    p['value'] = btoa(value);
    p['encoding'] = 'base64';
  } else {
    p['value'] = value;
  }
  HomeServerConnector._hsoBase.callMethodWithParameter.apply(this, ['set', p, callback]);
};

/**
 * Schaltet zwischen '0' und dem Wert um.
 * @param {Number} value Wert. Umschaltung erfolgt zwischen diesem Wert und '0'.
 * @param {function} callback  {@link HomeServerConnector._CommunicationObject~toggleCallback}
 * @example <caption>Toggeln zwischen (fix) '0' und '1'.</caption>
 * co.toggle(1, function(err) {});
 */
HomeServerConnector._CommunicationObject.prototype.toggle = function (value, callback) {
  HomeServerConnector._hsoBase.callMethodWithParameter.apply(this, ['toggle', {value: value}, callback]);
};

/**
 * Addiert den Wert.
 * @param {Number} value der zu addierende Wert
 * @param {function} callback  {@link HomeServerConnector._CommunicationObject~addValueCallback}
 * @example <caption>Addieren von '5' auf den aktuellen Wert des KO.</caption>
 * co.addValue(5, function(err) {});
 * @example <caption>Subtrahieren von '5' ( = Addieren von '-5') vom aktuellen Wert des KO.</caption>
 * co.addValue(-5, function(err) {});
 */
HomeServerConnector._CommunicationObject.prototype.addValue = function (value, callback) {
  HomeServerConnector._hsoBase.callMethodWithParameter.apply(this, ['add', {value: value}, callback]);
};

/**
 * Erhöht den Wert um die Schrittweite.
 * @param {function} callback  {@link HomeServerConnector._CommunicationObject~offsetPlusCallback}
 * @example <caption>Der Wert des KO wird um den im Experte im Feld 'Schrittgröße' angegebenen Wert erhöht.</caption>
 * co.offsetPlus(function(err) {});
 */
HomeServerConnector._CommunicationObject.prototype.offsetPlus = function (callback) {
  HomeServerConnector._hsoBase.callMethod.apply(this, ['offset_plus', callback]);
};

/**
 * Vermindert den Wert um die Schrittweite.
 * @param {function} callback  {@link HomeServerConnector._CommunicationObject~offsetMinusCallback}
 * @example <caption>Der Wert des KO wird um den im Experte im Feld 'Schrittgröße' angegebenen Wert vermindert.</caption>
 * co.offsetMinus(function(err) {});
 */
HomeServerConnector._CommunicationObject.prototype.offsetMinus = function (callback) {
  HomeServerConnector._hsoBase.callMethod.apply(this, ['offset_minus', callback]);
};

/**
 * Springt den nächsten Wert in der Liste an.
 * @param {function} callback  {@link HomeServerConnector._CommunicationObject~listNextCallback}
 * @example <caption>Setzen des KO auf den nächst-größeren der im  Experte im Feld 'Liste' angegebenen Werte.</caption>
 * co.listNext(function(err) {});
 */
HomeServerConnector._CommunicationObject.prototype.listNext = function (callback) {
  HomeServerConnector._hsoBase.callMethod.apply(this, ['list_next', callback]);
};

/**
 * Springt den vorherigen Wert in der Liste an.
 * @param {function} callback  {@link HomeServerConnector._CommunicationObject~listPreviousCallback}
 * @example <caption>Setzen des KO auf den nächst-kleineren der im  Experte im Feld 'Liste' angegebenen Werte.</caption>
 * co.listPrevious(function(err) {});
 */
HomeServerConnector._CommunicationObject.prototype.listPrevious = function (callback) {
  HomeServerConnector._hsoBase.callMethod.apply(this, ['list_prev', callback]);
};
/**
 * Datenarchiv.
 * Darf **nicht** direkt instanziert werden. Eine Instanz der Klasse wird von der Methode
 * {@link HomeServerConnector._Connection#getDataArchive} erzeugt.
 * @class
 * @example <caption> </caption>
 * var da = conn.getDataArchive("DA@DatenArchiv", function(err, data) {});
 */
HomeServerConnector._DataArchive = function(parent, key, callback) {
  if (parent) {
    this._interalId = 'DA#' + parent._getNewObjectId();
  } else {
    this._interalId = 'DA#' + key;
  }
  this._destroyed = false;
  this._conn = parent;
  this._key = key;
  if (callback) {
    this._callback = callback;
    this._conn._cache.subscribe([key], this);
  }
};

HomeServerConnector._DataArchive.prototype._onSubscribeError = HomeServerConnector._hsoBase.onSubscribeError;
HomeServerConnector._DataArchive.prototype._onNewValue = HomeServerConnector._hsoBase.onNewValue;
HomeServerConnector._DataArchive.prototype._getId = HomeServerConnector._hsoBase.getInternalId;

/**
 * Liefert den Schlüssel des Objekts zurück.
 * @method
 * @returns {String}
 * @example
 * var object_key = da.getKey();
 */
HomeServerConnector._DataArchive.prototype.getKey = HomeServerConnector._hsoBase.getKey;

/**
 * Gibt das Objekt frei und hebt ein eventuell vorhandes Abonnement auf.
 * @method
 * @example
 * da.destroy();
 */
HomeServerConnector._DataArchive.prototype.destroy = HomeServerConnector._hsoBase.destroy;

/**
 * Ruft die Meta-Daten ab.
 * @method
 * @param {function} callback  {@link HomeServerConnector._DataArchive~getMetaCallback}
 * @example <caption>Abruf der Meta-Daten</caption>
 * da.getMeta(function(err, data) {});
 */
HomeServerConnector._DataArchive.prototype.getMeta = HomeServerConnector._hsoBase.getMeta;

/**
 * Ruft eine Auswahl von Daten aus dem Archiv ab. Die Auswahl wird über die Parameter spezifiziert.
 * @param {Date}   startDate   Datum-Objekt. Start-Zeitpunkt ab dem die Daten geliefert werden sollen.
 * @param {Number} blockCount  Anzahl der Datenblöcke die ausgeliefert werden sollen.
 * @param {Number} blockSize   Größe eines Datenblocks (in Minuten).
 * @param {Array}  columnList  Liste von Spalten die angezeigt werden sollen. Entweder werden hier Schlüssel oder
 *                             Indizes aufgelistet. Handelt es sich um einen Index, muss dem Wert ein '#'
 *                             vorangestellt werden. Die Indizes entsprechen den von links nach rechts laufend
 *                             durchnummerierten Spalten des Archivs, beginnend mit '1'.
 * @param {function} callback  {@link HomeServerConnector._DataArchive~getDataCallback}
 * @example <caption>Abruf der Archiv-Spalten 1, 3 und 4 vom 01.01.2016, ab 14:00 Uhr für einen Zeitraum von 60 Minuten: 30 Einträge,
 * von denen jeder die Werte aus 2 Minuten zusammenfasst.</caption>
 * var startDate = new Date(2016, 0, 1, 14, 0);  // 01.01.2016 14:00
 * da.getData(startDate, 30, 2, ['#1', '#3', '#4'], function(err, data) {});
 * @example <caption>Abruf der Archiv-Spalten mit den Spaltentiteln "SOLL" und "IST" für einen Zeitraum, der vor 12 Stunden begann
 * und 6 Stunden dauert: 24 Einträge, von denen jeder die Werte aus 15 Minuten zusammenfasst.</caption>
 * var startDate = da.getStartDateFromHours(12);  // JETZT - 12 Stunden.
 * da.getData(startDate, 24, 15, ['SOLL', 'IST'], function(err, data) {});
 */

HomeServerConnector._DataArchive.prototype.getData = function (startDate, blockCount, blockSize, columnList, callback) {
  var startAt = this._getStartDateFromDate(startDate);
  var p = {cnt: blockCount, size: blockSize, startat: startAt, cols: columnList};
  HomeServerConnector._hsoBase.callMethodWithParameter.apply(this, ['get', p, callback, true]);
};

/**
 *
 * @param {Date} dt
 * @returns
 */
HomeServerConnector._DataArchive.prototype._getStartDateFromDate = function (dt) {
  var startAt = [(dt.getFullYear() % 100), dt.getMonth() + 1, dt.getDate(), dt.getHours(), dt.getMinutes()];
  var result = '';
  for (var i = 0; i < startAt.length; i++) {
    var tmp = '' + startAt[i];
    result += (tmp.length === 1) ? '0' + tmp : tmp;
  }
  return result;
};

/**
 * Liefert einen für den Archiv-Abruf {@link HomeServerConnector._DataArchive#getData|getData()} korrekt formatierten 'Start-Datum'-String.
 * Übergeben wird eine Stunden-Anzahl. Das erzeugte Datum ist *JETZT* - Stunden-Anzahl
 * @param  {Number} hours Anzahl Stunden, die vom aktuellen Zeitpunkt abgezogen werden.
 * @return {Date}   Datum.
 */
HomeServerConnector._DataArchive.prototype.getStartDateFromHours = function (hours) {
  return new Date((new Date()).getTime() - hours * 60 * 60000);
};

/**
 * Liefert einen für den Archiv-Abruf {@link HomeServerConnector._DataArchive#getData|getData()} korrekt formatierten 'Start-Datum'-String.
 * Übergeben wird eine Tages-Anzahl. Das erzeugte Datum ist *JETZT* - Tages-Anzahl
 * @param {Number} days Anzahl Tage, die vom aktuellen Zeitpunkt abgezogen werden.
 * @return {Date} Datum.
 */
HomeServerConnector._DataArchive.prototype.getStartDateFromDays = function (days) {
  return new Date((new Date()).getTime() - days * 24 * 60 * 60000);
};

/**
 * Liefert einen für den Archiv-Abruf {@link HomeServerConnector._DataArchive#getData|getData()} korrekt formatierten 'Start-Datum'-String.
 * Übergeben wird eine Wochen-Anzahl. Das erzeugte Datum ist *JETZT* - Wochen-Anzahl
 * @param {Number} weeks Anzahl Wochen, die vom aktuellen Zeitpunkt abgezogen werden.
 * @return {Date} Datum.
 */
HomeServerConnector._DataArchive.prototype.getStartDateFromWeeks = function (weeks) {
  return new Date((new Date()).getTime() - weeks * 7 * 24 * 60 * 60000);
};
/**
 * Meldungsarchiv.
 * Darf **nicht** direkt instanziert werden. Eine Instanz der Klasse wird von der Methode
 * {@link HomeServerConnector._Connection#getMessageArchive} erzeugt.
 * @class
 * @example <caption> </caption>
 * var ma = conn.getMessageArchive("MA@MeldungsArchiv", function(err, data) {});
 * @param {*} parent
 * @param {String} key
 * @param {function} callback
*/
HomeServerConnector._MessageArchive = function (parent, key, callback) {
  if (parent) {
    this._interalId = 'MA#' + parent._getNewObjectId();
  } else {
    this._interalId = 'MA#' + key;
  }
  this._destroyed = false;
  this._conn = parent;
  this._key = key;
  if (callback) {
    this._callback = callback;
    this._conn._cache.subscribe([key], this);
  }
};

HomeServerConnector._MessageArchive.prototype._onSubscribeError = HomeServerConnector._hsoBase.onSubscribeError;
HomeServerConnector._MessageArchive.prototype._onNewValue = HomeServerConnector._hsoBase.onNewValue;
HomeServerConnector._MessageArchive.prototype._getId = HomeServerConnector._hsoBase.getInternalId;

/**
 * Liefert den Schlüssel des Objekts zurück.
 * @method
 * @returns {String}
 * @example
 * var object_key = ma.getKey();
 */
HomeServerConnector._MessageArchive.prototype.getKey = HomeServerConnector._hsoBase.getKey;

/**
 * Gibt das Objekt frei und hebt ein eventuell vorhandes Abonnement auf.
 * @method
 * @example
 * ma.destroy();
 */
HomeServerConnector._MessageArchive.prototype.destroy = HomeServerConnector._hsoBase.destroy;

/**
 * Ruft die Meta-Daten ab.
 * @method
 * @param {function} callback  {@link HomeServerConnector._MessageArchive~getMetaCallback}
 * @example <caption>Abruf der Meta-Daten.</caption>
 * ma.getMeta(function(err, data) {});
 */
HomeServerConnector._MessageArchive.prototype.getMeta = HomeServerConnector._hsoBase.getMeta;

HomeServerConnector._unpackMAItems = function(err, data) {
  if (err) {
    return [err];
  } else {
    return [err, data['items']];
  }
};

/**
 * Ruft eine bestimmte Anzahl von Einträgen eines Meldungsarchivs ab. Es werden immer die neuesten Einträge zurückgeliefert.
 * @param {Number}   _count    Max. Anzahl an Einträgen, die zurückgeliefert werden sollen.
 * @param {function} callback  {@link HomeServerConnector._MessageArchive~getDataCallback}
 * @example <caption>Abruf der (max.) 10 letzten Einträge.</caption>
 * ma.getData(10, function(err, items) {});
 */
HomeServerConnector._MessageArchive.prototype.getData = function (_count, callback) {
  var p = {count: _count};
  HomeServerConnector._hsoBase.callMethodWithParameter.apply(this, ['get', p, callback, HomeServerConnector._unpackMAItems]);
};
/**
 * Szene.
 * Darf **nicht** direkt instanziert werden. Eine Instanz der Klasse wird von der Methode
 * {@link HomeServerConnector._Connection#getScene} erzeugt.
 * @class
 * @example <caption> </caption>
 * var sc = conn.getScene("SC@Szene", function(err, data) {});
 */
HomeServerConnector._Scene = function(parent, key, callback) {
  if (parent) {
    this._interalId = 'SC#' + parent._getNewObjectId();
  } else {
    this._interalId = 'SC#' + key;
  }
  this._destroyed = false;
  this._conn = parent;
  this._key = key;
  if (callback) {
    this._callback = callback;
    this._conn._cache.subscribe([key], this);
  }
};

HomeServerConnector._Scene.prototype._onSubscribeError = HomeServerConnector._hsoBase.onSubscribeError;
HomeServerConnector._Scene.prototype._onNewValue = HomeServerConnector._hsoBase.onNewValue;
HomeServerConnector._Scene.prototype._getId = HomeServerConnector._hsoBase.getInternalId;

/**
 * Liefert den Schlüssel des Objekts zurück.
 * @method
 * @returns {String}
 * @example
 * var object_key = sc.getKey();
 */
HomeServerConnector._Scene.prototype.getKey = HomeServerConnector._hsoBase.getKey;

/**
 * Gibt das Objekt frei und hebt ein eventuell vorhandes Abonnement auf.
 * @method
 * @example
 * sc.destroy();
 */
HomeServerConnector._Scene.prototype.destroy = HomeServerConnector._hsoBase.destroy;

/**
 * Ruft die Meta-Daten ab.
 * @method
 * @param {function} callback  {@link HomeServerConnector._Scene~getMetaCallback}
 * @example <caption>Abruf der Meta-Daten.</caption>
 * sc.getMeta(function(err, data) {});
 */
HomeServerConnector._Scene.prototype.getMeta = HomeServerConnector._hsoBase.getMeta;

/**
 * Lernt die Szene neu ein.
 * @param {function} callback  {@link HomeServerConnector._Scene~learnCallback}
 * @example <caption> </caption>
 * sc.learn(function(err) {});
 */
HomeServerConnector._Scene.prototype.learn = function (callback) {
  HomeServerConnector._hsoBase.callMethod.apply(this, ['learn', callback]);
};

/**
 * Ruft die Szene ab.
 * @param {function} callback  {@link HomeServerConnector._Scene~callCallback}
 * @example <caption> </caption>
 * sc.call(function(err) {});
 */
HomeServerConnector._Scene.prototype.call = function (callback) {
  HomeServerConnector._hsoBase.callMethod.apply(this, ['call', callback]);
};

/**
 *
 * @param {*} err
 * @param {*} data
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
HomeServerConnector._unpackSCActors = function(err, data) {
  //
};

/**
 * Abrufen einer Liste mit Daten zu jedem in der Szene verwendeten KO. Jeder Eintrag in der Liste enthält die Daten zu einem KO.
 * @param {function} callback  {@link HomeServerConnector._Scene~getActorsCallback}
 * @example <caption> </caption>
 * sc.getActors(function(err, actors) {});
 */
HomeServerConnector._Scene.prototype.getActors = function (callback) {
  HomeServerConnector._hsoBase.callMethod.apply(this, ['get_items', callback, true]);
};

/**
 * Der Wert aller KO in der Szene wird um den im Experte im Feld 'Schrittgröße' (beim KO) angegebenen Wert erhöht.
 * @param {function} callback  {@link HomeServerConnector._Scene~offsetPlusCallback}
 * @example <caption> </caption>
 * sc.offsetPlus(function(err) {});
 */
HomeServerConnector._Scene.prototype.offsetPlus = function (callback) {
  HomeServerConnector._hsoBase.callMethod.apply(this, ['offset_plus', callback]);
};

/**
 * Der Wert aller KO in der Szene wird um den im Experte im Feld 'Schrittgröße' (beim KO) angegebenen Wert vermindert.
 * @param {function} callback  {@link HomeServerConnector._Scene~offsetMinusCallback}
 * @example <caption> </caption>
 * sc.offsetMinus(function(err) {});
 */
HomeServerConnector._Scene.prototype.offsetMinus = function (callback) {
  HomeServerConnector._hsoBase.callMethod.apply(this, ['offset_minus', callback]);
};

/**
 * Setzen aller KO in der Szene auf den nächst-größeren der im  Experte im Feld 'Liste' (beim KO) angegebenen Werte.
 * @param {function} callback  {@link HomeServerConnector._Scene~listNextCallback}
 * @example <caption> </caption>
 * sc.listNext(function(err) {});
 */
HomeServerConnector._Scene.prototype.listNext = function (callback) {
  HomeServerConnector._hsoBase.callMethod.apply(this, ['list_next', callback]);
};

/**
 * Setzen aller KO in der Szene auf den nächst-kleineren der im  Experte im Feld 'Liste' (beim KO) angegebenen Werte.
 * @param {function} callback  {@link HomeServerConnector._Scene~listPreviousCallback}
 * @example <caption> </caption>
 * sc.listPrevious(function(err) {});
 */
HomeServerConnector._Scene.prototype.listPrevious = function (callback) {
  HomeServerConnector._hsoBase.callMethod.apply(this, ['list_prev', callback]);
};
/**
 * Sequenz.
 * Darf **nicht** direkt instanziert werden. Eine Instanz der Klasse wird von der Methode
 * {@link HomeServerConnector._Connection#getSequence} erzeugt.
 * @class
 * @example <caption> </caption>
 * var sq = conn.getSequence("SQ@Sequenz", function(err, data) {});
 */
HomeServerConnector._Sequence = function(parent, key, callback) {
  if (parent) {
    this._interalId = 'SQ#' + parent._getNewObjectId();
  } else {
    this._interalId = 'SQ#' + key;
  }
  this._destroyed = false;
  this._conn = parent;
  this._key = key;
  if (callback) {
    this._callback = callback;
    this._conn._cache.subscribe([key], this);
  }
};

HomeServerConnector._Sequence.prototype._onSubscribeError = HomeServerConnector._hsoBase.onSubscribeError;
HomeServerConnector._Sequence.prototype._onNewValue = HomeServerConnector._hsoBase.onNewValue;
HomeServerConnector._Sequence.prototype._getId = HomeServerConnector._hsoBase.getInternalId;

/**
 * Liefert den Schlüssel des Objekts zurück.
 * @method
 * @returns {String}
 * @example
 * var object_key = sq.getKey();
 */
HomeServerConnector._Sequence.prototype.getKey = HomeServerConnector._hsoBase.getKey;

/**
 * Gibt das Objekt frei und hebt ein eventuell vorhandes Abonnement auf.
 * @method
 * @example
 * sq.destroy();
 */
HomeServerConnector._Sequence.prototype.destroy = HomeServerConnector._hsoBase.destroy;

/**
 * Ruft die Meta-Daten ab.
 * @method
 * @param {function} callback  {@link HomeServerConnector._Sequence~getMetaCallback}
 * @example <caption>Abruf der Meta-Daten.</caption>
 * sq.getMeta(function(err, data) {});
 */
HomeServerConnector._Sequence.prototype.getMeta = HomeServerConnector._hsoBase.getMeta;

HomeServerConnector._unpackSQState = function(err, data) {
  if (err) {
    return [err];
  } else {
    return [err, data['running']];
  }
};

/**
 * Liefert den Status der Sequenz: Sequenz läuft / läuft nicht
 * @param {function} callback  {@link HomeServerConnector._Sequence~getStateCallback}
 * @example <caption>Abruf des Status.</caption>
 * sq.getState(function(err, state) {});
 */
HomeServerConnector._Sequence.prototype.getState = function (callback) {
  HomeServerConnector._hsoBase.callMethod.apply(this, ['get_state', callback, HomeServerConnector._unpackSQState]);
};

/**
 * Startet eine Sequenz.
 * @param {function} callback  {@link HomeServerConnector._Sequence~startCallback}
 * @example <caption>Sequenz starten.</caption>
 * sq.start(function(err) {});
 */
HomeServerConnector._Sequence.prototype.start = function (callback) {
  HomeServerConnector._hsoBase.callMethod.apply(this, ['start', callback]);
};

/**
 * Stoppt eine laufende Sequenz.
 * @param {function} callback  {@link HomeServerConnector._Sequence~stopCallback}
 * @example <caption>Sequenz anhalten.</caption>
 * sq.stop(function(err) {});
 */
HomeServerConnector._Sequence.prototype.stop = function (callback) {
  HomeServerConnector._hsoBase.callMethod.apply(this, ['stop', callback]);
};

/**
 * Abruf von Bildern einer im HS definierten Kamera.
 * Darf **nicht** direkt instanziert werden. Eine Instanz der Klasse wird von der Methode
 * {@link HomeServerConnector._Connection#getCameraPicture} erzeugt.
 * @class
 * @example <caption> </caption>
 * var cp = conn.getCameraPicture("CP@KameraBild");
 */
HomeServerConnector._CameraPicture = function(parent, key) {
  if (parent) {
    this._interalId = 'CP#' + parent._getNewObjectId();
  } else {
    this._interalId = 'CP#' + key;
  }
  this._destroyed = false;
  this._conn = parent;
  this._key = key;
};

/**
 * Liefert den Schlüssel des Objekts zurück.
 * @method
 * @returns {String}
 * @example
 * var object_key = cp.getKey();
 */
HomeServerConnector._CameraPicture.prototype.getKey = HomeServerConnector._hsoBase.getKey;


/**
 * Gibt das Objekt frei.
 * @method
 * @example
 * cp.destroy();
 */
HomeServerConnector._CameraPicture.prototype.destroy = HomeServerConnector._hsoBase.destroy;

/**
 * Ruft die Meta-Daten ab.
 * @method
 * @param {function} callback  {@link HomeServerConnector._CameraPicture~getMetaCallback}
 * @example <caption>Abruf der Meta-Daten.</caption>
 * cp.getMeta(function(err, data) {});
 */
HomeServerConnector._CameraPicture.prototype.getMeta = HomeServerConnector._hsoBase.getMeta;

/**
 *
 * @param {*} err
 * @param {*} data
 * @returns
 */
HomeServerConnector._unpackCameraPicture = function (err, data) {
  if (err) {
    return [err];
  } else {
    var url = undefined;
    if (data['encoding'] === 'base64') {
      url = 'data:' + data['content-type'] + ';base64,' + data['content'];
    }
    return [err, url];
  }
};

/**
 * Liefert das aktuelle Kamerabild.
 * @param {function} callback   {@link HomeServerConnector._CameraPicture~getPictureCallback}
 * @example <caption>Liefert ein Bild.</caption>
 * cp.getPicture(function(err, dataUrl) { document.getElementById("img").src = dataUrl; });
 */
HomeServerConnector._CameraPicture.prototype.getPicture = function (callback) {
  HomeServerConnector._hsoBase.callMethod.apply(this, ['get_picture', callback, HomeServerConnector._unpackCameraPicture]);
};
/**
 * Kameraarchiv.
 * Darf **nicht** direkt instanziert werden. Eine Instanz der Klasse wird von der Methode
 * {@link HomeServerConnector._Connection#getCameraArchive} erzeugt.
 * @class
 * @example <caption> </caption>
 * var ca = conn.getCameraArchive("CA@KameraArchiv", function(err, data) {});
 */
HomeServerConnector._CameraArchive = function (parent, key, callback) {
  if (parent) {
    this._interalId = 'CA#' + parent._getNewObjectId();
  } else {
    this._interalId = 'CA#' + key;
  }
  this._destroyed = false;
  this._conn = parent;
  this._key = key;
  if (callback) {
    this._callback = callback;
    this._conn._cache.subscribe([key], this);
  }
};

HomeServerConnector._CameraArchive.prototype._onSubscribeError = HomeServerConnector._hsoBase.onSubscribeError;
HomeServerConnector._CameraArchive.prototype._onNewValue = HomeServerConnector._hsoBase.onNewValue;
HomeServerConnector._CameraArchive.prototype._getId = HomeServerConnector._hsoBase.getInternalId;

/**
 * Liefert den Schlüssel des Objekts zurück.
 * @method
 * @returns {String}
 * @example
 * var object_key = ca.getKey();
 */
HomeServerConnector._CameraArchive.prototype.getKey = HomeServerConnector._hsoBase.getKey;

/**
 * Gibt das Objekt frei und hebt ein eventuell vorhandes Abonnement auf.
 * @method
 * @example
 * ca.destroy();
 */
HomeServerConnector._CameraArchive.prototype.destroy = HomeServerConnector._hsoBase.destroy;

/**
 * Ruft die Meta-Daten ab.
 * @method
 * @param {function} callback  {@link HomeServerConnector._CameraArchive~getMetaCallback}
 * @example <caption>Abruf der Meta-Daten.</caption>
 * ca.getMeta(function(err, data) {});
 */
HomeServerConnector._CameraArchive.prototype.getMeta = HomeServerConnector._hsoBase.getMeta;

HomeServerConnector._unpackCAItems = function(err, data) {
  if (data) {
    return [err, data['items']];
  } else {
    return [err];
  }
};

/**
 * Ruft eine Liste der Bilder im Kameraarchiv ab. Für jedes Bild wird der Zeitstempel und die Bild-ID zurückgeliefert.
 * @param {function} callback  {@link HomeServerConnector._CameraArchive~getListCallback}
 * @example <caption>Abruf der Bilder-Liste.</caption>
 * ca.getList(function(err, items) {});
 */
HomeServerConnector._CameraArchive.prototype.getList = function (callback) {
  HomeServerConnector._hsoBase.callMethod.apply(this, ['get_list', callback, HomeServerConnector._unpackCAItems]);
};

/**
 *
 * @param {*} err
 * @param {*} data
 * @param {*} pictureId
 * @returns
 */
HomeServerConnector._unpackCAPicture = function(err, data, pictureId) {
  if (err) {
    return [err];
  } else {
    var url = undefined;
    if (data['encoding'] === 'base64') {
      url = 'data:' + data['content-type'] + ';base64,' + data['content'];
    }
    return [err, pictureId, url];
  }
};

/**
 * Ruft ein Bild aus dem Archiv anhand der BILD-ID ab.
 * @param {Number} pictureId  Eindeutige ID des Bildes. Die Methode
 * {@link HomeServerConnector._CameraArchive#getList|getList()} liefert alle möglichen IDs.
 * @param {function} callback   {@link HomeServerConnector._CameraArchive~getPictureCallback}
 * @example <caption>Abruf eines Bildes.</caption>
 * ca.getPicture(123, function(err, pictureId, dataUrl) {});
 */
HomeServerConnector._CameraArchive.prototype.getPicture = function (pictureId, callback) {
  var p = {'pic_id': pictureId};
  HomeServerConnector._hsoBase.callMethodWithParameter.apply(this,
    ['get_picture', p, callback, HomeServerConnector._unpackCAPicture, pictureId]);
};

/**
 * Datum-Typen.
 * @enum {Number}
 * @readonly
 */
HomeServerConnector.DATE_TYPE = {
  /** Wochentage
     * @type {Number}
     */
  WEEKDAY: 1,
  /** Zeitraum
     * @type {Number}
     */
  RANGE: 2,
  /** Einzeltag (mit Platzhalter)
     * @type {Number}
     */
  DAY: 3,
};

/**
 * Zeit-Typen.
 * @enum {Number}
 * @readonly
 */
HomeServerConnector.TIME_TYPE = {
  /** Uhrzeit
     * @type {Number}
     */
  TIME: 1,
  /** Sonnenaufgang
     * @type {Number}
     */
  SUNRISE: 2,
  /** Sonnenuntergang
     * @type {Number}
     */
  SUNSET: 3,
};

/**
 * Tages-Arten.
 * @enum {Number}
 * @readonly
 */
HomeServerConnector.EVENT_FILTER = {
  /** Immer
     * @type {Number}
     */
  ALWAYS: 0,
  /** Nur normale Tage (kein Feiertag oder Urlaubstag)
     * @type {Number}
     */
  NORMAL: 1,
  /** Feiertag
     * @type {Number}
     */
  HOLIDAY: 2,
  /** Urlaub
     * @type {Number}
     */
  VACATION: 3,
  /** Nie
     * @type {Number}
     */
  NEVER: 4,
};

/**
 * Universal-Zeitschaltuhr.
 * Darf **nicht** direkt instanziert werden. Eine Instanz der Klasse wird von der Methode
 * {@link HomeServerConnector._Connection#getUniversalTimer} erzeugt.
 * @class
 * @example <caption> </caption>
 * var ti = conn.getUniversalTimer("TI@Zeitschaltuhr", function(err, data) {});
 * @param {*} parent
 * @param {String} key
 * @param {function} callback
*/
HomeServerConnector._UniversalTimer = function (parent, key, callback) {
  if (parent) {
    this._interalId = 'TI#' + parent._getNewObjectId();
  } else {
    this._interalId = 'TI#' + key;
  }
  this._destroyed = false;
  this._conn = parent;
  this._key = key;
  if (callback) {
    this._callback = callback;
    this._conn._cache.subscribe([key], this);
  }
};

HomeServerConnector._UniversalTimer.prototype._onSubscribeError = HomeServerConnector._hsoBase.onSubscribeError;
HomeServerConnector._UniversalTimer.prototype._onNewValue = HomeServerConnector._hsoBase.onNewValue;
HomeServerConnector._UniversalTimer.prototype._getId = HomeServerConnector._hsoBase.getInternalId;

/**
 * Liefert den Schlüssel des Objekts zurück.
 * @method
 * @returns {String}
 * @example
 * var object_key = ti.getKey();
 */
HomeServerConnector._UniversalTimer.prototype.getKey = HomeServerConnector._hsoBase.getKey;

/**
 * Gibt das Objekt frei und hebt ein eventuell vorhandes Abonnement auf.
 * @method
 * @example
 * ti.destroy();
 */
HomeServerConnector._UniversalTimer.prototype.destroy = HomeServerConnector._hsoBase.destroy;

/**
 * Ruft die Meta-Daten ab.
 * @method
 * @param {function} callback  {@link HomeServerConnector._UniversalTimer~getMetaCallback}
 * @example <caption>Abruf der Meta-Daten.</caption>
 * ti.getMeta(function(err, data) {});
 */
HomeServerConnector._UniversalTimer.prototype.getMeta = HomeServerConnector._hsoBase.getMeta;

HomeServerConnector._unpackTIState = function (err, data) {
  if (err) {
    return [err];
  } else {
    return [err, data['active']];
  }
};

/**
 * Ruft den Status (aktiv/inaktiv) der UZSU ab.
 * @method
 * @param {function} callback  {@link HomeServerConnector._UniversalTimer~getStateCallback}
 * @example <caption>Abruf des Status.</caption>
 * ti.getState(function(err, active) {});
 */
HomeServerConnector._UniversalTimer.prototype.getState = function (callback) {
  HomeServerConnector._hsoBase.callMethod.apply(this, ['get_state', callback, HomeServerConnector._unpackTIState]);
};

/**
 * Setzt den Status (aktiv/inaktiv) der UZSU.
 * @param {boolean}  state   **true**: UZSU wird aktiviert (oder  bleibt eingeschaltet)
 *     **false**: UZSU wird deaktiviert (oder bleibt abgeschaltet)
 * @param {function} callback  {@link HomeServerConnector._UniversalTimer~setStateCallback}
 * @example <caption>Setzen des Status.</caption>
 * ti.setState(true, function(err) {});
 */
HomeServerConnector._UniversalTimer.prototype.setState = function (state, callback) {
  if (state) {
    HomeServerConnector._hsoBase.callMethod.apply(this, ['set_active', callback]);
  } else {
    HomeServerConnector._hsoBase.callMethod.apply(this, ['set_inactive', callback]);
  }
};

HomeServerConnector._unpackTIEvents = function (err, data) {
  if (err) {
    return [err];
  } else {
    return [err, data['events']];
  }
};

/**
 * Liefert eine Liste mit allen [Ereignissen]{@tutorial event} der Zeitschaltuhr.
 * @param {function} callback  {@link HomeServerConnector._UniversalTimer~getEventsCallback}
 * @example
 * ti.getEvents(function(err, events) {});
 */
HomeServerConnector._UniversalTimer.prototype.getEvents = function (callback) {
  HomeServerConnector._hsoBase.callMethod.apply(this, ['get_events', callback, HomeServerConnector._unpackTIEvents]);
};

/**
 * Fügt der UZSU ein neues [Ereignis]{@tutorial event} hinzu.
 * @param {Object}   eventObj   Ereignis-Objekt
 * @param {function} callback  {@link HomeServerConnector._UniversalTimer~addEventCallback}
 * @example
 * var evt = {"date_type": 1, "weekdays": [0,1,2,3,4], "time_type": 1, "time": "1200", "filter": 0, "action": 1};
 * ti.addEvent(evt, function(err) {});
 */
HomeServerConnector._UniversalTimer.prototype.addEvent = function (eventObj, callback) {
  HomeServerConnector._hsoBase.callMethodWithParameter.apply(this, ['add_event', eventObj, callback]);
};

/**
 * Ändert/Setzt die Werte eines [Ereignisses]{@tutorial event}.
 * @param {Number} eventId      Die ID des Ereignisses, das neu gesetzt werden soll.
 * @param {Object} eventObj     Das Ereignis-Objekt, das verwendet werden soll.
 * @param {function} callback   {@link HomeServerConnector._UniversalTimer~updateEventCallback}
 * @example
 * var evt = {"date_type": 1, "weekdays": [0,1,2,3,4], "time_type": 1, "time": "1200", "filter": 0, "action": 1};
 * ti.updateEvent(47, evt, function(err) {});
 */
HomeServerConnector._UniversalTimer.prototype.updateEvent = function (eventId, eventObj, callback) {
  eventObj['event_id'] = eventId;
  HomeServerConnector._hsoBase.callMethodWithParameter.apply(this, ['set_event', eventObj, callback]);
};

/**
 * Löscht ein [Ereignis]{@tutorial event} aus der UZSU.
 * @param {Number} eventId  Die ID eines Ereignisses.
 * @param {function} callback  {@link HomeServerConnector._UniversalTimer~deleteEventCallback}
 * @example
 * var eventId = evt.getId();
 * ti.deleteEvent(eventId, function(err) {});
 */
HomeServerConnector._UniversalTimer.prototype.deleteEvent = function (eventId, callback) {
  var p = {event_id: eventId};
  HomeServerConnector._hsoBase.callMethodWithParameter.apply(this, ['del_event', p, callback]);
};

HomeServerConnector._unpackTISimulation = function (err, data) {
  if (err) {
    return [err];
  } else {
    return [err, data['events']];
  }
};

/**
 * Liefert die Zeitpunkte innerhalb des angegebenen Zeitraums, an denen [Ereignisse]{@tutorial event} ausgelöst werden.
 * @param {Number}   days      Anzahl Tage (ab jetzt), die berechnet werden sollen.
 * @param {function} callback  {@link HomeServerConnector._UniversalTimer~getSimulationCallback}
 * @example <caption>Abruf der Ereignisse für die kommenden 7 Tage.</caption>
 * ti.getSimulation(7, function(err, events) {});
 */
HomeServerConnector._UniversalTimer.prototype.getSimulation = function (days, callback) {
  var p = {days: days};
  HomeServerConnector._hsoBase.callMethodWithParameter.apply(this, ['simulate', p, callback, HomeServerConnector._unpackTISimulation]);
};

/**
 * Prüft ein [Ereignis-Objekt]{@tutorial event}. Liefert zurück, ob es in sich stimmig ist.
 * @param   {Object} eventObj    Das zu prüfende Ereignis-Objekt
 * @returns {boolean}
 * @example
 * ti.verify({});  // Liefert false
 * ti.verfiy({"date_type": 1, "weekdays": [0,1,2,3,4], "time_type": 1, "time": "1200", "filter": 0, "action": 1});  // Liefert true
 */
HomeServerConnector._UniversalTimer.prototype.verify = function (eventObj) {
  try {
    var allowKeys = ['date_type', 'weekdays', 'date1', 'date2', 'day', 'month', 'year',
      'time_type', 'time', 'offset', 'random', 'filter', 'action'];
    for (var key in eventObj) {
      if (allowKeys.indexOf(key.toLowerCase()) === -1) {
        throw new Error('Invalid key:' + key);
      }
    }
    if (eventObj['date_type'] === 1) {
      if (eventObj['weekdays'].length <= 0) {
        throw new Error('Invalid value. No weekday(s) defined.');
      }
      for (var i = 0; i < eventObj['weekdays'].length; i++) {
        if (typeof eventObj['weekdays'][i] !== 'number') {
          throw new Error('Invalid value. Field \'weekday\' not between 0..6: ' + eventObj['weekdays'][i]);
        } else if (eventObj['weekdays'][i] < 0 || eventObj['weekdays'][i] > 6) {
          throw new Error('Invalid value. Field \'weekday\' not between 0..6: ' + eventObj['weekdays'][i]);
        }
      }
    } else if (eventObj['date_type'] === 2) {
      if (eventObj['date1'].length !== 6) {
        throw new Error('Invalid value. Wrong format for \'date1\' (yymmdd): ' + eventObj['date1']);
      }
      if (eventObj['date2'].length !== 6) {
        throw new Error('Invalid value. Wrong format for \'date2\' (yymmdd): ' + eventObj['date2']);
      }
    } else if (eventObj['date_type'] === 3) {
      if ('day' in eventObj && eventObj['day'] !== null && (eventObj['day'] < 1 || eventObj['day'] > 31)) {
        throw new Error('Invalid value. Field \'day\' should be null or 1..31: ' + eventObj['day']);
      }
      if ('month' in eventObj && eventObj['month'] !== null && (eventObj['month'] < 1 || eventObj['month'] > 12)) {
        throw new Error('Invalid value. Field \'month\' should be null or 1..12: ' + eventObj['month']);
      }
      if ('year' in eventObj && eventObj['year'] !== null && (eventObj['year'] < 1 || eventObj['year'] > 99)) {
        throw new Error('Invalid value. Field \'year\' should be null or 1..99: ' + eventObj['year']);
      }
    } else {
      throw new Error('Invalid or missing: date_type');
    }
    if (eventObj['time_type'] === 1) {
      if (eventObj['time'].length !== 4) {
        throw new Error('Invalid value. Wrong format for \'time\' (hhmm): ' + eventObj['date1']);
      }
    } else if (eventObj['time_type'] === 2) {
      if ('offset' in eventObj && typeof eventObj['offset'] !== 'number') {
        throw new Error('Invalid value. Field \'offset\' must be a Number.');
      }
    } else if (eventObj['time_type'] === 3) {
      if ('offset' in eventObj && typeof eventObj['offset'] !== 'number') {
        throw new Error('Invalid value. Field \'offset\' must be a Number.');
      }
    } else {
      return false;
    }
    if ('random' in eventObj && typeof eventObj['random'] !== 'number') {
      throw new Error('Invalid value. Field \'offset\' must be a Number.');
    }

    var filter = parseInt(eventObj['filter'].valueOf(), 10);
    if (isNaN(filter) || (filter < 0 && filter > 4)) {
      throw new Error('Invalid value. Field \'filter\' must be a Number between 0..4.');
    }
    var actionId = parseInt(eventObj['action'].valueOf(), 10);
    if (isNaN(actionId) || actionId <= 0) {
      throw new Error('Invalid value. Field \'action\' must be a Number greater than 0.');
    }
    return true;
  } catch (e) {
    HomeServerConnector._exception('universaltimer.verify', e);
    return false;
  }
};

/**
 * Urlaubskalender.
 * Darf **nicht** direkt instanziert werden. Eine Instanz der Klasse wird von der Methode
 * {@link HomeServerConnector._Connection#getVacationCalendar} erzeugt.
 * @class
 * @example <caption> </caption>
 * var vc = conn.getVacationCalendar("VC@MeinKalender", function(err, data) {});
 * @param {*} parent
 * @param {String} key
 * @param {function} callback
*/
HomeServerConnector._VacationCalendar = function (parent, key, callback) {
  if (parent) {
    this._interalId = 'VC#' + parent._getNewObjectId();
  } else {
    this._interalId = 'VC#' + key;
  }
  this._destroyed = false;
  this._conn = parent;
  this._key = key;
  if (callback) {
    this._callback = callback;
    this._conn._cache.subscribe([key], this);
  }
};

HomeServerConnector._VacationCalendar.prototype._onSubscribeError = HomeServerConnector._hsoBase.onSubscribeError;
HomeServerConnector._VacationCalendar.prototype._onNewValue = HomeServerConnector._hsoBase.onNewValue;
HomeServerConnector._VacationCalendar.prototype._getId = HomeServerConnector._hsoBase.getInternalId;

/**
 * Liefert den Schlüssel des Objekts zurück.
 * @method
 * @returns {String}
 * @example
 * var object_key = vc.getKey();
 */
HomeServerConnector._VacationCalendar.prototype.getKey = HomeServerConnector._hsoBase.getKey;

/**
 * Gibt das Objekt frei und hebt ein eventuell vorhandes Abonnement auf.
 * @method
 * @example
 * vc.destroy();
 */
HomeServerConnector._VacationCalendar.prototype.destroy = HomeServerConnector._hsoBase.destroy;

/**
 * Ruft die Meta-Daten ab.
 * @method
 * @param {function} callback  {@link HomeServerConnector._VacationCalendar~getMetaCallback}
 * @example <caption>Abruf der Meta-Daten.</caption>
 * vc.getMeta(function(err, data) {});
 */
HomeServerConnector._VacationCalendar.prototype.getMeta = HomeServerConnector._hsoBase.getMeta;

HomeServerConnector._unpackVCState = function(err, data) {
  if (err) {
    return [err];
  } else {
    var from = HomeServerConnector._convertLongStrToDate(data['from']);
    var to = HomeServerConnector._convertLongStrToDate(data['to']);
    return [err, data['active'], from, to];
  }
};


/**
 * Liefert den Status eines Urlaubskalenders
 * @param {function} callback  {@link HomeServerConnector._VacationCalendar~getCallback}
 * @example <caption>Abruf des Status.</caption>
 * vc.get(function(err, active, from, to) {});
 */
HomeServerConnector._VacationCalendar.prototype.get = function (callback) {
  //var that = this;
  HomeServerConnector._hsoBase.callMethod.apply(this, ['get', callback, HomeServerConnector._unpackVCState]);
};

/**
 * Ändert die Werte eines Urlaubskalenders.
 * @param    {Boolean}           active    **true**: der Urlaubskalender ist aktiv.
 * @param    {Date}              from      Start des Zeitraums.
 * @param    {Date}              to        Ende des Zeitraums.
 * @param    {function}          callback  {@link HomeServerConnector._VacationCalendar~setCallback}
 * @example <caption>Urlaubskalender setzen.</caption>
 * vc.set(true, new Date(2016, 6, 1), new Date(2016, 6, 31), function(err) {}); // Aktiv von 1.7.2016 bis 31.7.2016
 */
HomeServerConnector._VacationCalendar.prototype.set = function (active, from, to, callback) {
  var p = {
    'active': active,
    'from': HomeServerConnector._convertFullDateToStr(from),
    'to': HomeServerConnector._convertFullDateToStr(to),
  };
  HomeServerConnector._hsoBase.callMethodWithParameter.apply(this, ['set', p, callback]);
};
HomeServerConnector._SubscriptionCache = function(parent) {
  this._isActive = true;
  this._subscribedItems = {};
  this._conn = parent;
  this._buffer = null;
  this._transactionTimer = null;
};

HomeServerConnector._SubscriptionCache.prototype.beginTransaction = function () {
  if (this._buffer === null) {
    this._buffer = [];
    var that = this;
    this._transactionTimer = setTimeout(() => {
      that.endTransaction();
    }, 0);
  }
};

HomeServerConnector._SubscriptionCache.prototype.endTransaction = function () {
  if (this._transactionTimer) {
    clearTimeout(this._transactionTimer);
    this._transactionTimer = null;
  }
  if (this._buffer !== null) {
    var subscribeList = [];
    for (var i=0; i<this._buffer.length; i++) {
      for (var k=0; k<this._buffer[i].length; k++) {
        subscribeList.push(this._buffer[i][k]);
      }
    }
    this._conn._subscribe(subscribeList, this, this._parseSubscribeResult);
    this._buffer = null;
  }
};

HomeServerConnector._SubscriptionCache.prototype.close = function () {
  this._isActive = false;
  for (var key in this._subscribedItems) {
    if (this._subscribedItems.hasOwnProperty.call(key)) {
      for (var hdlrKey in this._subscribedItems[key]['cb']) {
        if (this._subscribedItems[key]['cb'].hasOwnProperty.call(hdlrKey)) {
          delete this._subscribedItems[key]['cb'][hdlrKey];
        }
      }
      delete this._subscribedItems[key]['cb'];
      delete this._subscribedItems[key]['state'];
    }
  }
};

HomeServerConnector._SubscriptionCache.prototype._fireCallbacks = function (code, key, data, isInit) {
  for (var hdlrKey in this._subscribedItems[key]['cb']) {
    try {
      if (!this._subscribedItems[key]['cb'].hasOwnProperty.call(hdlrKey)) {
        continue;
      }
      var hdlr = this._subscribedItems[key]['cb'][hdlrKey];
      if (code == 0) {
        if (hdlr._onNewValue) {
          hdlr._onNewValue(key, data, isInit);
        }
      } else {
        if (hdlr._onSubscribeError) {
          hdlr._onSubscribeError(key, new Error('Can\'t subscribe: ' + key + ' (code: ' + code + ')'));
        }
      }
    } catch (e) {
      HomeServerConnector._exception('cache.firecallbacks.callback', e);
    }
  }
};

/**
 *
 * @param {String} objectKey
 * @returns {Number}
 */
HomeServerConnector._SubscriptionCache.prototype._getCallbackCount = function (objectKey) {
  var cnt = 0;
  for (var hdlrKey in this._subscribedItems[objectKey]['cb']) {
    if (this._subscribedItems[objectKey]['cb'].hasOwnProperty.call(hdlrKey)) {
      cnt++;
    }
  }
  return cnt;
};

/**
 *
 * @param {*} code
 * @param {String} key
 * @param {*} data
 * @returns
 */
HomeServerConnector._SubscriptionCache.prototype.dispatchPushMessage = function (code, key, data) {
  if (!this._isActive) {
    return;
  }
  if (key in this._subscribedItems) {
    this._subscribedItems[key]['data'] = data;
    this._fireCallbacks(code, key, data, false);
  }
};

/**
 *
 * @param {*} err
 * @param {*} items
 * @returns
 */
HomeServerConnector._SubscriptionCache.prototype._parseSubscribeResult = function (err, items) {
  if (!this._isActive) {
    return;
  }
  for (var i = 0; i < items.length; i++) {
    var key = items[i]['key'];
    if (key in this._subscribedItems && this._subscribedItems[key]['state'] === 0) {
      this._subscribedItems[key]['state'] = 1;
      this._subscribedItems[key]['data'] = items[i]['data'];
      this._fireCallbacks(items[i]['code'], key, items[i]['data'], true);
    }
  }
};

/**
 *
 * @param {[*]} objectKeys
 * @param {*} handler
 * @returns
 */
HomeServerConnector._SubscriptionCache.prototype.subscribe = function (objectKeys, handler) {
  if (!this._isActive) {
    return;
  }

  var resultList = [];
  var errorList = [];
  var subscribeList = [];
  for (var i = 0; i < objectKeys.length; i++) {
    var key = objectKeys[i];
    if (key.indexOf('*') > -1) {
      errorList.push([key, new Error('invalid key:' + key)]);
      continue;
    }
    if (!(key in this._subscribedItems)) {
      this._subscribedItems[key] = {'state': 0, 'data': null, 'cb': {}};
      subscribeList.push(key);
    }
    var handlerId = handler._getId();
    if (!(handlerId in this._subscribedItems[key]['cb'])) {
      this._subscribedItems[key]['cb'][handlerId] = handler;
    }
    if (this._subscribedItems[key]['state'] > 0) {
      resultList.push([key, this._subscribedItems[key]['data']]);
    }
  }
  if (subscribeList.length > 0) {
    if (this._buffer !== null) {
      this._buffer.push(subscribeList);
    } else {
      this._conn._subscribe(subscribeList, this, this._parseSubscribeResult);
    }
  }
  for (i = 0; i < errorList.length; i++) {
    try {
      if (handler._onSubscribeError) {
        handler._onSubscribeError(errorList[i][0], errorList[i][1]);
      }
    } catch (e) {
      HomeServerConnector._exception('cache.subscribe.key_error.callback', e);
    }
  }
  for (i = 0; i < resultList.length; i++) {
    try {
      if (handler._onNewValue) {
        handler._onNewValue(resultList[i][0], resultList[i][1], true);
      }
    } catch (e) {
      HomeServerConnector._exception('cache.subscribe.value_in_cache.callback', e);
    }
  }
};

/**
 *
 * @param {*} err
 * @param {*} items
 * @param {*} ctx
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
HomeServerConnector._SubscriptionCache.prototype._parseUnsubscribeResult = function (err, items, ctx) {
  // ... NOOP
};

/**
 *
 * @param {*} objectKeys
 * @param {*} handler
 * @returns
 */
HomeServerConnector._SubscriptionCache.prototype.unsubscribe = function (objectKeys, handler) {
  if (!this._isActive) {
    return;
  }

  var unsubscribeList = [];
  for (var i = 0; i < objectKeys.length; i++) {
    var key = objectKeys[i];
    if (key in this._subscribedItems) {
      var hdlrKey = handler._getId();
      if (hdlrKey in this._subscribedItems[key]['cb']) {
        delete this._subscribedItems[key]['cb'][hdlrKey];

      }
      if (this._getCallbackCount(key) === 0) {
        delete this._subscribedItems[key];
        unsubscribeList.push(key);
      }
    }
  }
  if (unsubscribeList.length > 0) {
    this._conn._unsubscribe(unsubscribeList, this, this._parseUnsubscribeResult);
  }
};

/**
 *
 * @param {*} handler
 * @returns
 */
HomeServerConnector._SubscriptionCache.prototype.getCount = function (handler) {
  if (!this._isActive) {
    return 0;
  }
  var hdlrKey = handler._getId();
  var cnt = 0;
  for (var objKey in this._subscribedItems) {
    if (hdlrKey in this._subscribedItems[objKey]['cb']) {
      if (this._subscribedItems[objKey]['state'] > 0) {
        cnt++;
      }
    }
  }
  return cnt;
};

/**
 *
 * @param {*} objectKey
 * @param {*} handler
 * @returns
 */
HomeServerConnector._SubscriptionCache.prototype.getValue = function (objectKey, handler) {
  if (objectKey in this._subscribedItems) {
    var hdlrKey = handler._getId();
    if (hdlrKey in this._subscribedItems[objectKey]['cb']) {
      if (this._subscribedItems[objectKey]['data']) {
        return this._subscribedItems[objectKey]['data'];
      }
    }
  }
  return null;
};

/**
 *
 * @param {*} handler
 * @returns
 */
HomeServerConnector._SubscriptionCache.prototype.removeHandler = function (handler) {
  if (!this._isActive) {
    return;
  }
  var hdlrKey = handler._getId();
  for (var key in this._subscribedItems) {
    if (hdlrKey in this._subscribedItems[key]['cb']) {
      delete this._subscribedItems[key]['cb'][hdlrKey];
    }
    if (this._getCallbackCount(key) === 0) {
      delete this._subscribedItems[key];
    }
  }
};

/**
 *
 * @returns
 */
HomeServerConnector._SubscriptionCache.prototype.resubscribe = function () {
  if (!this._isActive) {
    return;
  }
  var subscribeList = [];
  for (var key in this._subscribedItems) {
    if (this._subscribedItems.hasOwnProperty.call(key) && this._subscribedItems[key].hasOwnProperty.call('state')) {
      this._subscribedItems[key]['state'] = 0;
      subscribeList.push(key);
    }
  }
  if (subscribeList.length > 0) {
    this._conn._subscribe(subscribeList, this, this._parseSubscribeResult);
  }
};

/**
 * Bildet eine Verbindung zum HomeServer ab.
 * Darf **nicht** direkt instanziert werden. Eine Instanz der Klasse
 * wird von der Methode {@link HomeServerConnector.createConnection|createConnection()} erzeugt.
 * @class
 * @private
 * @example <caption>Aufruf der 'createConnection()'-Methode.</caption>
 * var conn = HomeServerConnector.createConnection("user1", "pw1", {"hostname": "192.168.123.234", "port": 80, "protocol": "http"});
 * @param {*} _url
*/
HomeServerConnector._Connection = function (_url) {
  /**
   * @type Number
   */
  this._internalId = 0;
  /**
   * @type Number
   */
  this._objectIdCnt = 0;
  /**
   * @type Number
   */
  this._transactionIdCnt = 0;
  this._url = _url;
  this._state = HomeServerConnector.CONNECTION_STATE.INIT;
  this._reconnect = true;
  /**
   * @type Number
   */
  this._reconnectInterval = 60;
  /**
   * @type WebSocket|null
   */
  this._ws = null;
  /**
   * @type Number
   */
  this._queueInterval = 0;
  this._destroyed = false;
  this._projectId = null;
  /**
   * @type {{}}
   */
  this._msgQueue = {};
  this._objects = [];
  this._cache = new HomeServerConnector._SubscriptionCache(this);
};

/**
 * @ignore
 * @param {*} newState
 * @param {*} errorObj
*/
HomeServerConnector._Connection.prototype.changeState = function (newState, errorObj = null) {
  if (this._state !== newState) {
    var oldState = this._state;
    this._state = newState;
    if (this.onStateChanged) {
      try {
        this.onStateChanged.apply(this, [oldState, newState, errorObj]);
      } catch (e) {
        HomeServerConnector._exception('connection.changeState.callback', e);
      }
    }
  }
};

HomeServerConnector._Connection.prototype._getNewObjectId = function () {
  this._objectIdCnt++;
  return this._objectIdCnt;
};

/**
 * Verbindungs-Aufbau wird angestoßen.<br>
 * Es wird sofort ein Verbindungs-Versuch gestartet, falls nicht bereits eine Verbindung besteht.<br>
 * @method HomeServerConnector._Connection#connect
 * @param {Boolean} [_reconnect=true]
 *       <i>true</i>: Bei Verbindungs-Verlust wird nach dem
 *          {@link HomeServerConnector._Connection#getReconnectInterval|Reconnect-Intervall} ein
 *          neuer Verbindungsversuch angestoßen.<br>
 *       <i>false</i>: Bei Verbindungs-Verlust wird <b>kein</b> neuer Verbindungsversuch angestoßen.
 * @example <caption>Versucht, sich mit dem HomeServer zu verbinden. Bei Verbindungsverlust soll neu verbunden werden</caption>
 * var conn = HomeServerConnector.createConnection("user1", "pw1");
 * conn.connect(true);
 * @return {Boolean}
 *       **true**: Verbindungs-Versuch wurde angestoßen.
 *       **false**: Es konnte kein Verbindungs-Versuch angestoßen werden, weil bereits ein
 *                     Verbindungs-Versuch angestoßen wurde oder eine Verbindung besteht.
 */
HomeServerConnector._Connection.prototype.connect = function (_reconnect) {
  var that = this;
  if (that._destroyed) {
    HomeServerConnector._debug('connect: instance already destroyed.');
    return false;
  }
  if (that._state !== HomeServerConnector.CONNECTION_STATE.INIT &&
    that._state !== HomeServerConnector.CONNECTION_STATE.CLOSED && that._state) {
    HomeServerConnector._debug('connect: wrong state(' + that._state + ')');
    return false;
  }
  if (that._url.length === 0) {
    HomeServerConnector._debug('connect: url not set');
    return false;
  }
  if (_reconnect !== undefined) {
    that._reconnect = _reconnect;
  }
  that.changeState(HomeServerConnector.CONNECTION_STATE.CONNECTING);
  if (that._queueInterval) {
    clearInterval(that._queueInterval);
  }
  that._queueInterval = setInterval(() => {
    that._checkQueue(that._msgQueue, that._state);
  }, 5000);
  that._ws = new WebSocket(that._url);
  that._ws.onopen = function () {
    if (that._destroyed) {
      HomeServerConnector._debug('onopen: destroyed');
    }
    that.changeState(HomeServerConnector.CONNECTION_STATE.OPEN);
    that._requestInfo();
    that._cache.resubscribe();
    if (that.onConnect) {
      try {
        that.onConnect.apply(that, []);
      } catch (e) {
        HomeServerConnector._exception('connection.websocket.onopen.callback.error', e);
      }
    }
  };
  that._ws.onclose = function (evt) {
    if (that._destroyed) {
      HomeServerConnector._debug('onclose: destroyed');
    }
    that.changeState(HomeServerConnector.CONNECTION_STATE.CLOSED);
    if (that.onDisconnect) {
      try {
        that.onDisconnect.apply(that, [evt.code, evt.reason]);
      } catch (e) {
        HomeServerConnector._exception('connection.websocket.onclose.callback.error', e);
      }
    }
    if (that._reconnect) {
      setTimeout(() => {
        that.connect(true);
      }, that._reconnectInterval * 1000);
    }
  };
  that._ws.onerror = function (error) {
    if (that._destroyed) {
      HomeServerConnector._debug('onerror: destroyed');
    }
    that.changeState(HomeServerConnector.CONNECTION_STATE.CLOSED, error);
    try {
      that._ws.close(4004, 'MSG');
    } catch (e) {
      HomeServerConnector._exception('connection.websocket.onerror.close', e);
    }
    if (that.onError) {
      try {
        that.onError.apply(that, [error]);
      } catch (e) {
        HomeServerConnector._exception('connection.websocket.onerror.callback.error', e);
      }
    }
  };
  that._ws.onmessage = function (e) {
    if (that._destroyed) {
      HomeServerConnector._debug('onmessage: destroyed');
      return;
    }
    HomeServerConnector._trace('MSG_IN: ' + e.data);
    try {
      var msg = JSON.parse(e.data.toString());
      if ('type' in msg && msg['type'] === 'push') {
        that._cache.dispatchPushMessage(msg['code'], msg['subscription']['key'], msg['data']);
      } else if ('type' in msg) {
        if ('request' in msg && 'context' in msg['request']) {
          var ctx = msg['request']['context'];
          if (ctx in that._msgQueue) {
            if ('cb' in that._msgQueue[ctx] && that._msgQueue[ctx]['cb']) {
              try {
                var errorObj = undefined;
                if (msg['code'] !== 0) {
                  errorObj = new Error('Error code:' + msg['code']);
                  errorObj.code = msg['code'];
                }
                var cbThis = that;
                var cbArgs;
                switch (msg['type'].toLowerCase()) {
                  case 'call':
                  {
                    cbArgs = [errorObj, msg['request']['key'], msg['data'], that._msgQueue[ctx]['ctx']];
                    break;
                  }
                  case 'select':
                  {
                    cbArgs = [errorObj, msg['data']['items'], that._msgQueue[ctx]['ctx']];
                    break;
                  }
                  case 'subscribe':
                  {
                    cbThis = that._msgQueue[ctx]['ctx'];
                    cbArgs = [errorObj, msg['data']['items']];
                    break;
                  }
                  case 'unsubscribe':
                  {
                    cbThis = that._msgQueue[ctx]['ctx'];
                    cbArgs = [errorObj, msg['data']['items'], that._msgQueue[ctx]['ctx']];
                    break;
                  }
                  case 'info':
                  {
                    cbArgs = [errorObj, msg['data'], that._msgQueue[ctx]['ctx']];
                    break;
                  }
                }
                if (cbArgs) {
                  that._msgQueue[ctx]['cb'].apply(cbThis, cbArgs);
                }
              } catch (eCallback) {
                HomeServerConnector._exception('connection.websocket.onmessage.callback', eCallback);
              }
            }
            delete that._msgQueue[ctx];
          }
        }
      }
    } catch (eParse) {
      HomeServerConnector._exception('connection.websocket.onmessage.parse', eParse);
    }
  };
  return true;
};


HomeServerConnector._Connection.prototype._checkQueue = function () {
  var ts = (new Date()).getTime();
  var invalid = [];
  for (var key in this._msgQueue) {
    if (this._msgQueue.hasOwnProperty.call(key)) {
      var item = this._msgQueue[key];
      if (item['ts'] + 5000 < ts) {
        if (item['cb']) {
          var errorObj = new Error('Message timeout', 'E_MSG_TIMEOUT');
          try {
            item['cb'](errorObj);
          } catch(eCallback) {
            HomeServerConnector._exception('connection.queue.error', eCallback);
          }
        }
        invalid.push(key);
      }
    }
  }
  for (var i = 0; i < invalid.length; i++) {
    delete this._msgQueue[invalid[i]];
  }
};

/**
 * Liefert die Angabe, ob bei Verbindungs-Verlust ein erneuter Verbindungs-Versuch erfolgen soll.<br>
 * Diese Angabe kann in der {@link HomeServerConnector._Connection#connect|connect()}-Methode
 * gesetzt werden.
 * @method HomeServerConnector._Connection#getReconnect
 * @example <caption>Reconnect-Status abfragen</caption>
 * var conn = HomeServerConnector.createConnection("user1", "pw1");
 * ...
 * rc = conn.getReconnect()
 * @return {Boolean} **true**: Bei Verbindungs-Abbruch sollen neue Verbindungs-Versuche durchgeführt werden.
 */
HomeServerConnector._Connection.prototype.getReconnect = function () {
  return this._reconnect;
};

/**
 * Reconnect-Versuch-Intervall abfragen. Angabe in Sekunden.
 * @method HomeServerConnector._Connection#getReconnectInterval
 * @example <caption>Liefert das Intervall, in dem Reconnect-Versuche stattfinden, falls die Verbindung unterbrochen wurde.</caption>
 * var conn = HomeServerConnector.createConnection("user1", "pw1");
 * ...
 * ri = conn.getReconnectInterval();
 * @return {Number} Intervall (in Sekunden), in dem neue Verbindungs-Versuche unternommen werden.
 */
HomeServerConnector._Connection.prototype.getReconnectInterval = function () {
  return this._reconnectInterval;
};

/**
 * Reconnect-Versuch-Intervall setzen. Angabe in Sekunden.
 * @method HomeServerConnector._Connection#setReconnectInterval
 * @example <caption>Setzt das Reconnect-Versuch-Intervall auf 30 Sekunden</caption>
 * var conn = HomeServerConnector.createConnection("user1", "pw1");
 * ...
 * conn.setReconnectInterval(30);
 * @param {Number} [interval=60] Definiert das Intervall.
 */
HomeServerConnector._Connection.prototype.setReconnectInterval = function (interval) {
  this._reconnectInterval = interval;
};

/**
 * Verbindungs-Trennung wird angestoßen.
 * @method
 * @example
 * conn.disconnect();
 * @return {Boolean} **true**: Verbindungs-Trennung wurde angestoßen.
 *                   **false**: Es besteht keine Verbindung.
 */
HomeServerConnector._Connection.prototype.disconnect = function () {
  if (this._destroyed) {
    HomeServerConnector._debug('disconnect: destroyed');
    return false;
  }
  if (this._state !== HomeServerConnector.CONNECTION_STATE.OPEN && this._state !== HomeServerConnector.CONNECTION_STATE.CONNECTING) {
    HomeServerConnector._debug('disconnect: wrong state');
    return false;
  }
  if (!this._ws) {
    HomeServerConnector._debug('disconnect: no websocket-object');
    return false;
  }
  this._reconnect = false;
  this.changeState(HomeServerConnector.CONNECTION_STATE.CLOSING);
  try {
    this._ws.close(1000);
  } catch (e) {
    HomeServerConnector._exception('connection.disconnect.close', e);
  }
  return true;
};

/**
 * Alle Events und Referenzen werden aufgelöst. Der WebSocket wird geschlossen.<br>
 * Eine Verwendung der Instanz ist nach Aufruf dieser Methode nicht mehr möglich.
 * @method
 * @example
 * conn.destroy();
 */
HomeServerConnector._Connection.prototype.destroy = function () {
  if (this._destroyed) {
    return;
  }
  try {
    this.disconnect();
    if (this._queueInterval) {
      clearInterval(this._queueInterval);
    }
    for (var key in this._msgQueue) {
      if (this._msgQueue.hasOwnProperty.call(key)) {
        this._msgQueue[key]['ctx'] = null;
        this._msgQueue[key]['cb'] = null;
        delete this._msgQueue[key];
      }
    }
    this._msgQueue = {};
    this.reset();
    this._cache.close();
  } catch (e) {
    HomeServerConnector._exception('connection.destory', e);
  }
  this._destroyed = true;
};

HomeServerConnector._Connection.prototype._call = function (options, callback) {
  if (this._destroyed) {
    return;
  }
  var msg = {'type': 'call', 'param': {}};
  var msg_context = this._getNewTransactionId();
  msg['param']['context'] = msg_context;
  msg['param']['key'] = options.objectKey;
  msg['param']['method'] = options.method;
  if (options.hasOwnProperty.call('parameter')) {
    for (var key in options['parameter']) {
      if (options['parameter'].hasOwnProperty.call(key)) {
        msg['param'][key] = options['parameter'][key];
      }
    }
  }
  if (this._sendJson(msg)) {
    var user_ctx = options['context'];
    this._msgQueue[msg_context] = {ts: (new Date()).getTime(), ctx: user_ctx, cb: callback};
  }
};

/**
 * Liefert eine Liste von Objekt-Schlüsseln mit Bezeichnungen, optional zusätzlich die Meta-Daten der Objekte. <br>
 * Übergeben wird das Objekt *options*.
 * @method HomeServerConnector._Connection#select
 * @param {Object} options Optionen (siehe 'Properties')
 * @property {String} options.objectKey [Filter] Objekt-Typ: (siehe [Doku]{@tutorial object_types}).
 * @property {String} [options.tags] [Filter] Liste von Tags. Ein angegebenes Tag muss mit dem im Experte
 *                    definierten Tag vollständig übereinstimmen.
 * @property {String} [options.search] [Filter] Liste von Such-Wörtern.
 *                    Gefunden werden alle Objekte in deren Bezeichnung oder Beschreibung ein beliebiges
 *                    Wort mit dem angegeben Such-Wort beginnt.
 * @property {Number} [options.from=0] Position als laufende Nummer, beginnend bei '0'.
 * @property {Number} [options.count=1000] Maximale Anzahl der zurückgelieferten Objekt-Schlüssel.
 *                    (Maximal-Wert: 1000)
 * @property {Boolean} [options.meta=false]
 *                     **true**: Meta-Daten der ausgwählten Objekte werden zusätzlich mit zurückgeliefert.
 * @property {Object} [options.context] Die {@link HomeServerConnector._Connection~selectCallback|Callback-Methode}
 *                 liefert dieses Objekt unbearbeitet zurück.<br>
 * @param {function} [Callback] Die {@link HomeServerConnector._Connection~selectCallback|Callback-Methode}, die die Rückgabe-Werte liefert.
 * @example <caption>Liefert maximal 1000 K-Objekte mit Tag "EG" oder "OG" und keine Meta-Daten</caption>
 * var conn = HomeServerConnector.createConnection("user1", "pw1");
 * ...
 * function mySelectResponse(error, result, context) {
     *   ...
     * }
 * ...
 * conn.select({"objectKey": "CO@*", "tags": ["EG", "Licht"], "meta": False, "context": "test002"}, mySelectResponse)
 */
HomeServerConnector._Connection.prototype.select = function (options, callback) {
  if (this._destroyed) {
    return;
  }
  var msg = {'type': 'select', 'param': {}};
  msg['param']['context'] = this._getNewTransactionId();
  msg['param']['key'] = options.objectKey;
  msg['param']['tags'] = options.tags;
  msg['param']['search'] = options.search;
  msg['param']['meta'] = options.meta || false;
  msg['param']['from'] = options.from || 0;
  msg['param']['count'] = options.count || 1000;
  if (this._sendJson(msg)) {
    var user_ctx = options['context'];
    this._msgQueue[msg['param']['context']] = {ts: (new Date()).getTime(), ctx: user_ctx, cb: callback};
  }
};


HomeServerConnector._Connection.prototype._removeObject = function (obj) {
  var idx = this._objects.indexOf(obj);
  if (idx > -1) {
    this._objects.splice(idx, 1);
  }
};

/**
 * Bereinigt alle aktiven HS-Objekte und hebt die entsprechenden Abonnements auf.
 * Alle über diese Verbindung erzeugten HS-Objekte können nach dem Aufruf nicht mehr verwendet werden.
 */
HomeServerConnector._Connection.prototype.reset = function () {
  var unsubscribeList = [];
  while (this._objects.length > 0) {
    var obj = this._objects.pop();
    try {
      obj._destroyed = true;
      if (obj._callback) {
        obj._callback = null;
        unsubscribeList.push(obj._key);
      }
      obj.destroy();
    } catch (e) {
      HomeServerConnector._exception('connection.reset.destroy', e);
    }
  }
};

/**
 * Liefert eine Instanz eines Kommunikations-Objekts (KO) zurück
 * @param {String}   key                    Schlüssel des Kommunikationsobjekts.
 * @param {function} [subscriptionCallback] Die {@link HomeServerConnector._Connection~getCommunicationObjectCallback|Callback-Methode}
 * wird beim Abonnieren und bei Wertänderung des K-Objekts aufgerufen.
 * @returns {HomeServerConnector._CommunicationObject}
 * @example <caption> </caption>
 * var co = conn.getCommunicationObject("CO@1_1_1", function(err, value, isInit) {});
 */
HomeServerConnector._Connection.prototype.getCommunicationObject = function (key, subscriptionCallback) {
  var co = new HomeServerConnector._CommunicationObject(this, key, subscriptionCallback);
  this._objects.push(co);
  return co;
};

/**
 * Liefert eine Instanz eines Datenarchivs zurück.
 * @param {String}   key                    Schlüssel des Datenarchivs.
 * @param {function} [subscriptionCallback] Die {@link HomeServerConnector._Connection~getDataArchiveCallback|Callback-Methode}
 * wird beim Abonnieren und beim Hinzufügen eines neuen Eintrags aufgerufen.
 * @returns {HomeServerConnector._DataArchive}
 * @example <caption> </caption>
 * var da = conn.getDataArchive("DA@DatenArchiv", function(err, data) {});
 */
HomeServerConnector._Connection.prototype.getDataArchive = function (key, subscriptionCallback) {
  var da = new HomeServerConnector._DataArchive(this, key, subscriptionCallback);
  this._objects.push(da);
  return da;
};

/**
 * Liefert eine Instanz eines Meldungsarchivs zurück.
 * @param {String}   key                    Schlüssel des Meldungsarchivs.
 * @param {function} [subscriptionCallback] Die {@link HomeServerConnector._Connection~getMessageArchiveCallback|Callback-Methode}
 * wird beim Abonnieren und beim Hinzufügen eines neuen Eintrags aufgerufen.
 * @returns {HomeServerConnector._MessageArchive}
 * @example <caption> </caption>
 * var ma = conn.getMessageArchive("MA@MeldungsArchiv", function(err, data) {});
 */
HomeServerConnector._Connection.prototype.getMessageArchive = function (key, subscriptionCallback) {
  var ma = new HomeServerConnector._MessageArchive(this, key, subscriptionCallback);
  this._objects.push(ma);
  return ma;
};

/**
 * Liefert eine Instanz einer Szene zurück.
 * @param {String}   key                    Schlüssel der Szene
 * @param {function} [subscriptionCallback] Die {@link HomeServerConnector._Connection~getSceneCallback|Callback-Methode}
 * wird beim Abonnieren und beim Lernen einer Szene aufgerufen.
 * @returns {HomeServerConnector._Scene}
 * @example <caption> </caption>
 * var sc = conn.getScene("SC@Szene", function(err, data) {});
 */
HomeServerConnector._Connection.prototype.getScene = function (key, subscriptionCallback) {
  var sc = new HomeServerConnector._Scene(this, key, subscriptionCallback);
  this._objects.push(sc);
  return sc;
};

/**
 * Liefert eine Instanz einer Sequenz zurück.
 * @param {String}   key                    Schlüssel der Sequenz
 * @param {function} [subscriptionCallback] Die {@link HomeServerConnector._Connection~getSequenceCallback|Callback-Methode}
 * wird beim Abonnieren, beim Starten, beim Stoppen oder bei Ablauf der Sequenz aufgerufen.
 * @returns {HomeServerConnector._Sequence}
 * @example <caption> </caption>
 * var sq = conn.getSequence("SQ@Sequenz", function(err, data) {});
 */
HomeServerConnector._Connection.prototype.getSequence = function (key, subscriptionCallback) {
  var sq = new HomeServerConnector._Sequence(this, key, subscriptionCallback);
  this._objects.push(sq);
  return sq;
};

/**
 * Liefert ein Kamerabild zurück.
 * @param {String} key Schlüssel der Kamera
 * @returns {HomeServerConnector._CameraPicture}
 * @example <caption> </caption>
 * var cp = conn.getCameraPicture("CP@KameraBild");
 */
HomeServerConnector._Connection.prototype.getCameraPicture = function (key) {
  var cp = new HomeServerConnector._CameraPicture(this, key);
  this._objects.push(cp);
  return cp;
};

/**
 * Liefert eine Instanz eines Kameraarchivs zurück.
 * @param {String}   key                    Schlüssel des Kameraarchivs
 * @param {function} [subscriptionCallback] Die {@link HomeServerConnector._Connection~getCameraArchiveCallback|Callback-Methode}
 * wird beim Abonnieren und beim Hinzufügen eines neuen Eintrags aufgerufen.
 * @returns {HomeServerConnector._CameraArchive}
 * @example <caption> </caption>
 * var ca = conn.getCameraArchive("CA@KameraArchiv", function(err, data) {});
 */
HomeServerConnector._Connection.prototype.getCameraArchive = function (key, subscriptionCallback) {
  var ca = new HomeServerConnector._CameraArchive(this, key, subscriptionCallback);
  this._objects.push(ca);
  return ca;
};

/**
 * Liefert eine Instanz einer Universal-Zeitschaltuhr (UZSU) zurück.
 * @param {String}   key                    Schlüssel der Zeitschaltuhr
 * @param {function} [subscriptionCallback] Die {@link HomeServerConnector._Connection~getUniversalTimerCallback|Callback-Methode}
 * wird beim Abonnieren und beim Ändern der Zeitschaltuhr aufgerufen.
 * @returns {HomeServerConnector._UniversalTimer}
 * @example <caption> </caption>
 * var ca = conn.getUniversalTimer("TI@UZSU", function(err, data) {});
 */
HomeServerConnector._Connection.prototype.getUniversalTimer = function (key, subscriptionCallback) {
  var ti = new HomeServerConnector._UniversalTimer(this, key, subscriptionCallback);
  this._objects.push(ti);
  return ti;
};

/**
 * Liefert eine Instanz eines Urlaubskalenders zurück.
 * @param {String}   key                       Schlüssel des Urlaubskalenders
 * @param {function} [subscriptionCallback]    Die {@link HomeServerConnector._Connection~getVacationCalendarCallback|Callback-Methode}
 * wird beim Abonnieren und beim Ändern des Urlaubskalenders aufgerufen.
 * @returns {HomeServerConnector._VacationCalendar}
 * @example <caption> </caption>
 * var vc = conn.getVacationCalendar("VC@MeinKalender", function(err, data) {});
 */
HomeServerConnector._Connection.prototype.getVacationCalendar = function (key, subscriptionCallback) {
  var vc = new HomeServerConnector._VacationCalendar(this, key, subscriptionCallback);
  this._objects.push(vc);
  return vc;
};


/**
 * Einleiten einer Transaktion, um mehrere Abonnements gleichzeitig durchzuführen.
 * Um die Kommunikation zwischen Client und HS zu optimieren, können mehrere Abonnements zu einer Transaktion
 * zusammengefasst werden. Der Client muss dann nur einmal mit dem HS kommunizieren, anstatt den Vorgang für jedes
 * Abonnement separat durchzuführen.
 * Mit dieser Methode wird die Transaktion eingeleitet.
 * Um die Transaktion zu beenden, wird {@link HomeServerConnector._Connection#endSubscription|endSubscription()} aufgerufen.
 * @example <caption>Abonnieren von 4 Kommunikations-Objekten und einem Datenarchiv in einer Transaktion.</caption>
 * conn.beginSubscription():
 * var ko_1 = conn.getCommunicationObject("CO@1_1_1", function(err, value, isInit) {});
 * var ko_2 = conn.getCommunicationObject("CO@MeinKoNr2", function(err, value, isInit) {});
 * var ko_3 = conn.getCommunicationObject("CO@TEST_KO_3", function(err, value, isInit) {});
 * var ko_4 = conn.getCommunicationObject("CO:31", function(err, value, isInit) {});
 * var arch = conn.getDataArchive("DA@Test-Daten", function(err, data) {});
 * conn.endSubscription():
 */
HomeServerConnector._Connection.prototype.beginSubscription = function () {
  this._cache.beginTransaction();
};

/**
 * Beenden einer Abonnements-Transaktion.
 * Die Funktionsweise wird bei der Methode zur Einleitung der Transaktion erklärt:
 * {@link HomeServerConnector._Connection#beginSubscription|beginSubscription()}.
 */
HomeServerConnector._Connection.prototype.endSubscription = function () {
  this._cache.endTransaction();
};


/**
 * Fragt die Projekt-Informationen beim HS ab. Löst onprojectInfo aus. liefert die Projekt-ID.
 * @ignore
 */
HomeServerConnector._Connection.prototype._requestInfo = function () {
  var msg = {'type': 'info', 'param': {}};
  msg['param']['context'] = this._getNewTransactionId();
  if (this._sendJson(msg)) {
    this._msgQueue[msg['param']['context']] = {ts: (new Date()).getTime(), ctx: null, cb: this._parseInfo};
  }
};

/**
 * @param {*} errorObj
 * @param {*} data
 * @param {*} userContext
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
HomeServerConnector._Connection.prototype._parseInfo = function (errorObj, data, userContext) {
  this._projectId = data['project_id'];
  if (this.onProjectInfo) {
    try {
      this.onProjectInfo(this._projectId);
    } catch (e) {
      HomeServerConnector._exception('connection.info.callback', e);
    }
  }
};

HomeServerConnector._Connection.prototype._getNewTransactionId = function () {
  this._transactionIdCnt += 1;
  return 'T_' + this._transactionIdCnt;
};

HomeServerConnector._Connection.prototype._sendJson = function (obj) {
  if (this.getState() == HomeServerConnector.CONNECTION_STATE.OPEN) {
    var s = JSON.stringify(obj);
    HomeServerConnector._trace('MSG_OUT' + s);
    this._ws.send(s);
    return true;
  }
  return false;
};

/**
 *
 * @param {*} keys
 * @param {*} context
 * @param {*} callback
 */
HomeServerConnector._Connection.prototype._subscribe = function (keys, context, callback) {
  var msg = {'type': 'subscribe', 'param': {'keys': keys, 'context': this._getNewTransactionId()}};
  if (this._sendJson(msg)) {
    this._msgQueue[msg['param']['context']] = {ts: (new Date()).getTime(), ctx: context, cb: callback};
  }
};

HomeServerConnector._Connection.prototype._unsubscribe = function (keys, context, callback) {
  var msg = {'type': 'unsubscribe', 'param': {'keys': keys, 'context': this._getNewTransactionId()}};
  if (this._sendJson(msg)) {
    this._msgQueue[msg['param']['context']] = {ts: (new Date()).getTime(), ctx: context, cb: callback};
  }
};

/**
 * Status der Verbindung als Code.
 * Siehe {@link HomeServerConnector.CONNECTION_STATE|CONNECTION_STATE}.
 * @method HomeServerConnector._Connection#getState
 * @example <caption>Status abfragen</caption>
 * var conn = HomeServerConnector.createConnection("user1", "pw1");
 * ...
 * var st = conn.getState()
 * @return {Number} {@link HomeServerConnector.CONNECTION_STATE|Status-Code}.
 */
HomeServerConnector._Connection.prototype.getState = function () {
  return this._state;
};

/**
 * Projekt-ID. Steht erst zur Verfügung, sobald eine Verbindung zum HomeServer besteht.
 * @method HomeServerConnector._Connection#getProjectId
 * @example <caption>Projekt-ID abfragen</caption>
 * var conn = HomeServerConnector.createConnection("user1", "pw1");
 * ...
 * var pid = conn.getProjectId()
 * @return {String|Undefined} Projekt-ID des HomeServer-Projekts.
 */
HomeServerConnector._Connection.prototype.getProjectId = function () {
  return this._projectId;
};

/**
 * Die hier zugewiesene Callback-Methode wird aufgerufen, sobald eine Verbindung hergestellt wurde.
 * @member {HomeServerConnector._Connection~onConnectCallback}
 * @example <caption>Verbindung wurde hergestellt</caption>
 * function myConnectResponse() {
     *   ...
     * }
 * ...
 * conn.onConnect = myConnectResponse;
 */
HomeServerConnector._Connection.prototype.onConnect = null;

/**
 * Die hier zugewiesene Callback-Funktion wird aufgerufen, sobald keine Verbindung mehr besteht.
 * @member {HomeServerConnector._Connection~onDisconnectCallback}
 * @example <caption>Verbindung wurde getrennt</caption>
 * function myDisconnectResponse(cause) {
     *   ...
     * }
 * ...
 * conn.onDisconnect = myDisonnectResponse;
 */
HomeServerConnector._Connection.prototype.onDisconnect = null;


/**
 * Die hier zugewiesene Callback-Funktion wird aufgerufen, wenn ein Fehler aufgetritt.
 * @member {HomeServerConnector._Connection~onErrorCallback}
 * @example <caption>Fehler tritt auf</caption>
 * function myErrorResponse(error) {
     *   ...
     * }
 * ...
 * conn.onError = myErrorResponse;
 */
HomeServerConnector._Connection.prototype.onError = null;

/**
 * Die hier zugewiesene Callback-Funktion wird aufgerufen,
 * wenn sich der Status der aktuellen Verbindung ändert.
 * @member {HomeServerConnector._Connection~onStateChangedCallback}
 * @example <caption>Verbindungs-Status hat sich geändert</caption>
 * function myStChgResponse(oldState, newState, error) {
     *   ...
     * }
 * ...
 * conn.onStateChanged = myStChgResponse;
 */
HomeServerConnector._Connection.prototype.onStateChanged = null;

/**
 * Die hier zugewiesene Callback-Funktion wird aufgerufen,
 * wenn die Informationen zur Verfügung stehen.
 * @member {HomeServerConnector._Connection~onProjectInfoCallback}
 * @type {null}
 * @example
 * conn.onProjectInfo = function(projectID) {};
 */
HomeServerConnector._Connection.prototype.onProjectInfo = null;


/**
 * Liefert eine Instanz der Klasse {@link HomeServerConnector._Connection|HomeServerConnector._Connection}.
 * @method HomeServerConnector.createConnection
 * @param {String} user User-Name zum Einloggen am HS.
 * @param {String} pw Passwort für den <i>user</i>.
 * @param {Object} [options] Verbindungs-Informationen: <br>
 *                 Werden keine Angaben gemacht, werden die entsprechenden Werte der abgerufenen umschließenden HTML-Seite verwendet.
 * @property {String} [options.host] IP-Adresse des HS.
 * @property {Number} [options.port] Port des HS.
 * @property {String} [options.protocol] Protokoll, mit dem der HS angesprochen werden soll. Ist entweder <i>"ws"</i> oder <i>"wss"</i>
 * (Default Wert).
 * @return {Object} Instanz der Klasse {@link HomeServerConnector._Connection|HomeServerConnector._Connection}.
 * @example <caption>Aufruf</caption>
 * var conn = HomeServerConnector.createConnection("user1", "pw1", {"host": "192.168.123.234", "port": 443, "protocol": "wss"});
 */
HomeServerConnector.createConnection = function (user, pw, options) {
  if (options === undefined) {
    options = {};
  }
  var hostname = options.host || window.location.hostname;
  var port = options.port || window.location.port;
  var prot = options.protocol || 'wss';
  var url = prot + '://' + hostname + ':' + port + '/endpoints/ws?authorization=' + encodeURIComponent(btoa(user + ':' + pw));
  return new HomeServerConnector._Connection(url);
};
