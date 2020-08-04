if (!window.hasOwnProperty("altspace")) {
	Object.defineProperty(window, 'altspace', {
		configurable: false,
		enumerable: true,
		value: {},
		writable: false
	});

	altspace._internal = {};
	altspace._internal.Alt = window.Alt = {};
}

/* global jQuery, ActiveXObject, ArrayBuffer, DataView, Uint8Array */
(function (exports) {
'use strict';

var inherits = function(constructor, superConstructor, overrides) {
  function F() {}
  F.prototype = superConstructor.prototype;
  constructor.prototype = new F();
  if(overrides) {
    for(var prop in overrides)
      constructor.prototype[prop] = overrides[prop];
  }
};
/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements. See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership. The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License. You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied. See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
var Thrift = {
    Version: '0.8.0',
/*
    Description: 'JavaScript bindings for the Apache Thrift RPC system',
    License: 'http://www.apache.org/licenses/LICENSE-2.0',
    Homepage: 'http://thrift.apache.org',
    BugReports: 'https://issues.apache.org/jira/browse/THRIFT',
    Maintainer: 'dev@thrift.apache.org',
*/

    Type: {
        'STOP' : 0,
        'VOID' : 1,
        'BOOL' : 2,
        'BYTE' : 3,
        'I08' : 3,
        'DOUBLE' : 4,
        'I16' : 6,
        'I32' : 8,
        'I64' : 10,
        'STRING' : 11,
        'UTF7' : 11,
        'STRUCT' : 12,
        'MAP' : 13,
        'SET' : 14,
        'LIST' : 15,
        'UTF8' : 16,
        'UTF16' : 17
    },

    MessageType: {
        'CALL' : 1,
        'REPLY' : 2,
        'EXCEPTION' : 3
    },

    objectLength: function(obj) {
        var length = 0;
        for (var k in obj) {
            if (obj.hasOwnProperty(k)) {
                length++;
            }
        }

        return length;
    },

    inherits: function(constructor, superConstructor) {
      //Prototypal Inheritance http://javascript.crockford.com/prototypal.html
      function F() {}
      F.prototype = superConstructor.prototype;
      constructor.prototype = new F();
    }
};



Thrift.TException = function(message) {
    this.message = message;
};
Thrift.inherits(Thrift.TException, Error);
Thrift.TException.prototype.name = 'TException';

Thrift.TApplicationExceptionType = {
    'UNKNOWN' : 0,
    'UNKNOWN_METHOD' : 1,
    'INVALID_MESSAGE_TYPE' : 2,
    'WRONG_METHOD_NAME' : 3,
    'BAD_SEQUENCE_ID' : 4,
    'MISSING_RESULT' : 5,
    'INTERNAL_ERROR' : 6,
    'PROTOCOL_ERROR' : 7
};

Thrift.TApplicationException = function(message, code) {
    this.message = message;
    this.code = (code === null) ? 0 : code;
};
Thrift.inherits(Thrift.TApplicationException, Thrift.TException);
Thrift.TApplicationException.prototype.name = 'TApplicationException';

Thrift.TApplicationException.prototype.read = function(input) {
    while (1) {
        var ret = input.readFieldBegin();

        if (ret.ftype == Thrift.Type.STOP) {
            break;
        }

        var fid = ret.fid;

        switch (fid) {
            case 1:
                if (ret.ftype == Thrift.Type.STRING) {
                    ret = input.readString();
                    this.message = ret.value;
                } else {
                    ret = input.skip(ret.ftype);
                }
                break;
            case 2:
                if (ret.ftype == Thrift.Type.I32) {
                    ret = input.readI32();
                    this.code = ret.value;
                } else {
                    ret = input.skip(ret.ftype);
                }
                break;
           default:
                ret = input.skip(ret.ftype);
                break;
        }

        input.readFieldEnd();
    }

    input.readStructEnd();
};

Thrift.TApplicationException.prototype.write = function(output) {
    var xfer = 0;

    output.writeStructBegin('TApplicationException');

    if (this.message) {
        output.writeFieldBegin('message', Thrift.Type.STRING, 1);
        output.writeString(this.getMessage());
        output.writeFieldEnd();
    }

    if (this.code) {
        output.writeFieldBegin('type', Thrift.Type.I32, 2);
        output.writeI32(this.code);
        output.writeFieldEnd();
    }

    output.writeFieldStop();
    output.writeStructEnd();
};

Thrift.TApplicationException.prototype.getCode = function() {
    return this.code;
};

Thrift.TApplicationException.prototype.getMessage = function() {
    return this.message;
};

/**
 *If you do not specify a url then you must handle ajax on your own.
 *This is how to use js bindings in a async fashion.
 */
Thrift.TXHRTransport = function(url) {
    this.url = url;
    this.wpos = 0;
    this.rpos = 0;

    this.send_buf = '';
    this.recv_buf = '';
};

Thrift.TXHRTransport.prototype = {

    //Gets the browser specific XmlHttpRequest Object
    getXmlHttpRequestObject: function() {
        try { return new XMLHttpRequest(); } catch (e1) { }
        try { return new ActiveXObject('Msxml2.XMLHTTP'); } catch (e2) { }
        try { return new ActiveXObject('Microsoft.XMLHTTP'); } catch (e3) { }

        throw "Your browser doesn't support the XmlHttpRequest object.";
    },

    flush: function(async) {
        //async mode
        if (async || this.url === undefined || this.url === '') {
            return this.send_buf;
        }

        var xreq = this.getXmlHttpRequestObject();

        if (xreq.overrideMimeType) {
            xreq.overrideMimeType('application/json');
        }

        xreq.open('POST', this.url, false);
        xreq.send(this.send_buf);

        if (xreq.readyState != 4) {
            throw 'encountered an unknown ajax ready state: ' + xreq.readyState;
        }

        if (xreq.status != 200) {
            throw 'encountered a unknown request status: ' + xreq.status;
        }

        this.recv_buf = xreq.responseText;
        this.recv_buf_sz = this.recv_buf.length;
        this.wpos = this.recv_buf.length;
        this.rpos = 0;
    },

    jqRequest: function(client, postData, args, recv_method) {
        if (typeof jQuery === 'undefined' ||
            typeof jQuery.Deferred === 'undefined') {
            throw 'Thrift.js requires jQuery 1.5+ to use asynchronous requests';
        }

        // Deferreds
        var deferred = jQuery.Deferred();
        var completeDfd = jQuery._Deferred();
        var dfd = deferred.promise();
        dfd.success = dfd.done;
        dfd.error = dfd.fail;
        dfd.complete = completeDfd.done;

        var jqXHR = jQuery.ajax({
            url: this.url,
            data: postData,
            type: 'POST',
            cache: false,
            dataType: 'text',
            context: this,
            success: this.jqResponse,
            error: function(xhr, status, e) {
                deferred.rejectWith(client, jQuery.merge([e], xhr.tArgs));
            },
            complete: function(xhr, status) {
                completeDfd.resolveWith(client, [xhr, status]);
            }
        });

        deferred.done(jQuery.makeArray(args).pop()); //pop callback from args
        jqXHR.tArgs = args;
        jqXHR.tClient = client;
        jqXHR.tRecvFn = recv_method;
        jqXHR.tDfd = deferred;
        return dfd;
    },

    jqResponse: function(responseData, textStatus, jqXHR) {
      this.setRecvBuffer(responseData);
      try {
          var value = jqXHR.tRecvFn.call(jqXHR.tClient);
          jqXHR.tDfd.resolveWith(jqXHR, jQuery.merge([value], jqXHR.tArgs));
      } catch (ex) {
          jqXHR.tDfd.rejectWith(jqXHR, jQuery.merge([ex], jqXHR.tArgs));
      }
    },

    setRecvBuffer: function(buf) {
        this.recv_buf = buf;
        this.recv_buf_sz = this.recv_buf.length;
        this.wpos = this.recv_buf.length;
        this.rpos = 0;
    },

    isOpen: function() {
        return true;
    },

    open: function() {},

    close: function() {},

    read: function(len) {
        var avail = this.wpos - this.rpos;

        if (avail === 0) {
            return '';
        }

        var give = len;

        if (avail < len) {
            give = avail;
        }

        var ret = this.read_buf.substr(this.rpos, give);
        this.rpos += give;

        //clear buf when complete?
        return ret;
    },

    readAll: function() {
        return this.recv_buf;
    },

    write: function(buf) {
        this.send_buf = buf;
    },

    getSendBuffer: function() {
        return this.send_buf;
    }

};

Thrift.TStringTransport = function(recv_buf, callback) {
    this.send_buf = '';
    this.recv_buf = recv_buf || '';
    this.onFlush = callback;
};

Thrift.TStringTransport.prototype = {

    flush: function() {
      if(this.onFlush)
        this.onFlush(this.send_buf);
    },

    isOpen: function() {
        return true;
    },

    open: function() {},

    close: function() {},

    read: function(len) {
        return this.recv_buf;
    },

    readAll: function() {
        return this.recv_buf;
    },

    write: function(buf) {
        this.send_buf = buf;
    }

};

Thrift.Protocol = function(transport) {
    this.transport = transport;
};

Thrift.Protocol.Type = {};
Thrift.Protocol.Type[Thrift.Type.BOOL] = '"tf"';
Thrift.Protocol.Type[Thrift.Type.BYTE] = '"i8"';
Thrift.Protocol.Type[Thrift.Type.I16] = '"i16"';
Thrift.Protocol.Type[Thrift.Type.I32] = '"i32"';
Thrift.Protocol.Type[Thrift.Type.I64] = '"i64"';
Thrift.Protocol.Type[Thrift.Type.DOUBLE] = '"dbl"';
Thrift.Protocol.Type[Thrift.Type.STRUCT] = '"rec"';
Thrift.Protocol.Type[Thrift.Type.STRING] = '"str"';
Thrift.Protocol.Type[Thrift.Type.MAP] = '"map"';
Thrift.Protocol.Type[Thrift.Type.LIST] = '"lst"';
Thrift.Protocol.Type[Thrift.Type.SET] = '"set"';


Thrift.Protocol.RType = {};
Thrift.Protocol.RType.tf = Thrift.Type.BOOL;
Thrift.Protocol.RType.i8 = Thrift.Type.BYTE;
Thrift.Protocol.RType.i16 = Thrift.Type.I16;
Thrift.Protocol.RType.i32 = Thrift.Type.I32;
Thrift.Protocol.RType.i64 = Thrift.Type.I64;
Thrift.Protocol.RType.dbl = Thrift.Type.DOUBLE;
Thrift.Protocol.RType.rec = Thrift.Type.STRUCT;
Thrift.Protocol.RType.str = Thrift.Type.STRING;
Thrift.Protocol.RType.map = Thrift.Type.MAP;
Thrift.Protocol.RType.lst = Thrift.Type.LIST;
Thrift.Protocol.RType.set = Thrift.Type.SET;

Thrift.Protocol.Version = 1;

Thrift.Protocol.prototype = {

    getTransport: function() {
        return this.transport;
    },

    //Write functions
    writeMessageBegin: function(name, messageType, seqid) {
        this.tstack = [];
        this.tpos = [];

        this.tstack.push([Thrift.Protocol.Version, '"' +
            name + '"', messageType, seqid]);
    },

    writeMessageEnd: function() {
        var obj = this.tstack.pop();

        this.wobj = this.tstack.pop();
        this.wobj.push(obj);

        this.wbuf = '[' + this.wobj.join(',') + ']';

        this.transport.write(this.wbuf);
     },


    writeStructBegin: function(name) {
        this.tpos.push(this.tstack.length);
        this.tstack.push({});
    },

    writeStructEnd: function() {

        var p = this.tpos.pop();
        var struct = this.tstack[p];
        var str = '{';
        var first = true;
        for (var key in struct) {
            if (first) {
                first = false;
            } else {
                str += ',';
            }

            str += key + ':' + struct[key];
        }

        str += '}';
        this.tstack[p] = str;
    },

    writeFieldBegin: function(name, fieldType, fieldId) {
        this.tpos.push(this.tstack.length);
        this.tstack.push({ 'fieldId': '"' +
            fieldId + '"', 'fieldType': Thrift.Protocol.Type[fieldType]
        });

    },

    writeFieldEnd: function() {
        var value = this.tstack.pop();
        var fieldInfo = this.tstack.pop();

        this.tstack[this.tstack.length - 1][fieldInfo.fieldId] = '{' +
            fieldInfo.fieldType + ':' + value + '}';
        this.tpos.pop();
    },

    writeFieldStop: function() {
        //na
    },

    writeMapBegin: function(keyType, valType, size) {
        //size is invalid, we'll set it on end.
        this.tpos.push(this.tstack.length);
        this.tstack.push([Thrift.Protocol.Type[keyType],
            Thrift.Protocol.Type[valType], 0]);
    },

    writeMapEnd: function() {
        var p = this.tpos.pop();

        if (p == this.tstack.length) {
            return;
        }

        if ((this.tstack.length - p - 1) % 2 !== 0) {
            this.tstack.push('');
        }

        var size = (this.tstack.length - p - 1) / 2;

        this.tstack[p][this.tstack[p].length - 1] = size;

        var map = '}';
        var first = true;
        while (this.tstack.length > p + 1) {
            var v = this.tstack.pop();
            var k = this.tstack.pop();
            if (first) {
                first = false;
            } else {
                map = ',' + map;
            }

            if (! isNaN(k)) { k = '"' + k + '"'; } //json "keys" need to be strings
            map = k + ':' + v + map;
        }
        map = '{' + map;

        this.tstack[p].push(map);
        this.tstack[p] = '[' + this.tstack[p].join(',') + ']';
    },

    writeListBegin: function(elemType, size) {
        this.tpos.push(this.tstack.length);
        this.tstack.push([Thrift.Protocol.Type[elemType], size]);
    },

    writeListEnd: function() {
        var p = this.tpos.pop();

        while (this.tstack.length > p + 1) {
            var tmpVal = this.tstack[p + 1];
            this.tstack.splice(p + 1, 1);
            this.tstack[p].push(tmpVal);
        }

        this.tstack[p] = '[' + this.tstack[p].join(',') + ']';
    },

    writeSetBegin: function(elemType, size) {
        this.tpos.push(this.tstack.length);
        this.tstack.push([Thrift.Protocol.Type[elemType], size]);
    },

    writeSetEnd: function() {
        var p = this.tpos.pop();

        while (this.tstack.length > p + 1) {
            var tmpVal = this.tstack[p + 1];
            this.tstack.splice(p + 1, 1);
            this.tstack[p].push(tmpVal);
        }

        this.tstack[p] = '[' + this.tstack[p].join(',') + ']';
    },

    writeBool: function(value) {
        this.tstack.push(value ? 1 : 0);
    },

    writeByte: function(i8) {
        this.tstack.push(i8);
    },

    writeI16: function(i16) {
        this.tstack.push(i16);
    },

    writeI32: function(i32) {
        this.tstack.push(i32);
    },

    writeI64: function(i64) {
        this.tstack.push(i64);
    },

    writeDouble: function(dbl) {
        this.tstack.push(dbl);
    },

    writeString: function(str) {
        // We do not encode uri components for wire transfer:
        if (str === null) {
            this.tstack.push(null);
        } else {
            // concat may be slower than building a byte buffer
            var escapedString = '';
            for (var i = 0; i < str.length; i++) {
                var ch = str.charAt(i);      // a single double quote: "
                if (ch === '\"') {
                    escapedString += '\\\"'; // write out as: \"
                } else if (ch === '\\') {    // a single backslash: \
                    escapedString += '\\\\'; // write out as: \\
                /* Currently escaped forward slashes break TJSONProtocol.
                 * As it stands, we can simply pass forward slashes into
                 * our strings across the wire without being escaped.
                 * I think this is the protocol's bug, not thrift.js
                 * } else if(ch === '/') {   // a single forward slash: /
                 *  escapedString += '\\/';  // write out as \/
                 * }
                 */
                } else if (ch === '\b') {    // a single backspace: invisible
                    escapedString += '\\b';  // write out as: \b"
                } else if (ch === '\f') {    // a single formfeed: invisible
                    escapedString += '\\f';  // write out as: \f"
                } else if (ch === '\n') {    // a single newline: invisible
                    escapedString += '\\n';  // write out as: \n"
                } else if (ch === '\r') {    // a single return: invisible
                    escapedString += '\\r';  // write out as: \r"
                } else if (ch === '\t') {    // a single tab: invisible
                    escapedString += '\\t';  // write out as: \t"
                } else {
                    escapedString += ch;     // Else it need not be escaped
                }
            }
            this.tstack.push('"' + escapedString + '"');
        }
    },

    writeBinary: function(str) {
        this.writeString(str);
    },



    // Reading functions
    readMessageBegin: function(name, messageType, seqid) {
        this.rstack = [];
        this.rpos = [];

        if (typeof jQuery !== 'undefined') {
            this.robj = jQuery.parseJSON(this.transport.readAll());
        } else {
            this.robj = eval(this.transport.readAll());
        }

        var r = {};
        var version = this.robj.shift();

        if (version != Thrift.Protocol.Version) {
            throw 'Wrong thrift protocol version: ' + version;
        }

        r.fname = this.robj.shift();
        r.mtype = this.robj.shift();
        r.rseqid = this.robj.shift();


        //get to the main obj
        this.rstack.push(this.robj.shift());

        return r;
    },

    readMessageEnd: function() {
    },

    readStructBegin: function(name) {
        var r = {};
        r.fname = '';

        //incase this is an array of structs
        if (this.rstack[this.rstack.length - 1] instanceof Array) {
            this.rstack.push(this.rstack[this.rstack.length - 1].shift());
        }

        return r;
    },

    readStructEnd: function() {
        if (this.rstack[this.rstack.length - 2] instanceof Array) {
            this.rstack.pop();
        }
    },

    readFieldBegin: function() {
        var r = {};

        var fid = -1;
        var ftype = Thrift.Type.STOP;

        //get a fieldId
        for (var f in (this.rstack[this.rstack.length - 1])) {
            if (f === null) {
              continue;
            }

            fid = parseInt(f, 10);
            this.rpos.push(this.rstack.length);

            var field = this.rstack[this.rstack.length - 1][fid];

            //remove so we don't see it again
            delete this.rstack[this.rstack.length - 1][fid];

            this.rstack.push(field);

            break;
        }

        if (fid != -1) {

            //should only be 1 of these but this is the only
            //way to match a key
            for (var i in (this.rstack[this.rstack.length - 1])) {
                if (Thrift.Protocol.RType[i] === null) {
                    continue;
                }

                ftype = Thrift.Protocol.RType[i];
                this.rstack[this.rstack.length - 1] =
                    this.rstack[this.rstack.length - 1][i];
            }
        }

        r.fname = '';
        r.ftype = ftype;
        r.fid = fid;

        return r;
    },

    readFieldEnd: function() {
        var pos = this.rpos.pop();

        //get back to the right place in the stack
        while (this.rstack.length > pos) {
            this.rstack.pop();
        }

    },

    readMapBegin: function(keyType, valType, size) {
        var map = this.rstack.pop();

        var r = {};
        r.ktype = Thrift.Protocol.RType[map.shift()];
        r.vtype = Thrift.Protocol.RType[map.shift()];
        r.size = map.shift();


        this.rpos.push(this.rstack.length);
        this.rstack.push(map.shift());

        return r;
    },

    readMapEnd: function() {
        this.readFieldEnd();
    },

    readListBegin: function(elemType, size) {
        var list = this.rstack[this.rstack.length - 1];

        var r = {};
        r.etype = Thrift.Protocol.RType[list.shift()];
        r.size = list.shift();

        this.rpos.push(this.rstack.length);
        this.rstack.push(list);

        return r;
    },

    readListEnd: function() {
        this.readFieldEnd();
    },

    readSetBegin: function(elemType, size) {
        return this.readListBegin(elemType, size);
    },

    readSetEnd: function() {
        return this.readListEnd();
    },

    readBool: function() {
        var r = this.readI32();

        if (r !== null && r.value == '1') {
            r.value = true;
        } else {
            r.value = false;
        }

        return r;
    },

    readByte: function() {
        return this.readI32();
    },

    readI16: function() {
        return this.readI32();
    },

    readI32: function(f) {
        if (f === undefined) {
            f = this.rstack[this.rstack.length - 1];
        }

        var r = {};

        if (f instanceof Array) {
            if (f.length === 0) {
                r.value = undefined;
            } else {
                r.value = f.shift();
            }
        } else if (f instanceof Object) {
           for (var i in f) {
                if (i === null) {
                  continue;
                }
                this.rstack.push(f[i]);
                delete f[i];

                r.value = i;
                break;
           }
        } else {
            r.value = f;
            this.rstack.pop();
        }

        return r;
    },

    readI64: function() {
        return this.readI32();
    },

    readDouble: function() {
        return this.readI32();
    },

    readString: function() {
        var r = this.readI32();
        return r;
    },

    readBinary: function() {
        return this.readString();
    },


    //Method to arbitrarily skip over data.
    skip: function(type) {
        throw 'skip not supported yet';
    }
};

Thrift.TJSONProtocol = function(transport) {
    this.transport = transport;
    this.reset();
};

Thrift.TJSONProtocol.Type = {};
Thrift.TJSONProtocol.Type[Thrift.Type.BOOL] = 'tf';
Thrift.TJSONProtocol.Type[Thrift.Type.BYTE] = 'i8';
Thrift.TJSONProtocol.Type[Thrift.Type.I16] = 'i16';
Thrift.TJSONProtocol.Type[Thrift.Type.I32] = 'i32';
Thrift.TJSONProtocol.Type[Thrift.Type.I64] = 'i64';
Thrift.TJSONProtocol.Type[Thrift.Type.DOUBLE] = 'dbl';
Thrift.TJSONProtocol.Type[Thrift.Type.STRUCT] = 'rec';
Thrift.TJSONProtocol.Type[Thrift.Type.STRING] = 'str';
Thrift.TJSONProtocol.Type[Thrift.Type.MAP] = 'map';
Thrift.TJSONProtocol.Type[Thrift.Type.LIST] = 'lst';
Thrift.TJSONProtocol.Type[Thrift.Type.SET] = 'set';

Thrift.TJSONProtocol.getValueFromScope = function(scope) {
  var listvalue = scope.listvalue;
  return listvalue ? listvalue.shift() : scope.value;
};

Thrift.TJSONProtocol.getScopeFromScope = function(scope) {
  var listvalue = scope.listvalue;
  if(listvalue)
    scope = {value:listvalue.shift()};
  return scope;
};

Thrift.TJSONProtocol.prototype = {

    reset: function() {
      this.elementStack = [];
    },

    //Write functions
    writeMessageBegin: function(name, messageType, seqid) {
      throw new Error("TJSONProtocol: Message not supported");
    },

    writeMessageEnd: function() {
    },

    writeStructBegin: function(name) {
      var container = {};
      this.elementStack.unshift(container);
    },

    writeStructEnd: function() {
      var container = this.elementStack.shift();
      if(this.elementStack.length == 0)
        this.transport.write(JSON.stringify(container));
      else
        this.elementStack[0].value.push(container);
    },

    writeFieldBegin: function(name, fieldType, fieldId) {
      var field = {name:name, fieldType:Thrift.TJSONProtocol.Type[fieldType], fieldId:fieldId, value:[]};
      this.elementStack.unshift(field);
    },

    writeFieldEnd: function() {
      var field = this.elementStack.shift();
      var fieldValue = {};
      fieldValue[field.fieldType] = field.value[0];
      this.elementStack[0][field.fieldId] = fieldValue;
    },

    writeFieldStop: function() {
        //na
    },

    writeMapBegin: function(keyType, valType, size) {
      var map = {value:[
        Thrift.TJSONProtocol.Type[keyType],
        Thrift.TJSONProtocol.Type[valType],
        size
      ]};
      this.elementStack.unshift(map);
    },

    writeMapEnd: function() {
      var map = this.elementStack.shift();
      this.elementStack[0].value.push(map.value);
    },

    writeListBegin: function(elemType, size) {
      var list = {name:name, value:[
        Thrift.TJSONProtocol.Type[elemType],
        size
      ]};
      this.elementStack.unshift(list);
    },

    writeListEnd: function() {
      var list = this.elementStack.shift();
      this.elementStack[0].value.push(list.value);
    },

    writeSetBegin: function(elemType, size) {
      var set = {name:name, value:[
        Thrift.TJSONProtocol.Type[elemType],
        size
      ]};
      this.elementStack.unshift(set);
    },

    writeSetEnd: function() {
      var set = this.elementStack.shift();
      this.elementStack[0].value.push(set.value);
    },

    writeBool: function(value) {
      this.elementStack[0].value.push(value ? 1 : 0);
    },

    writeByte: function(i8) {
      this.elementStack[0].value.push(i8);
    },

    writeI16: function(i16) {
      this.elementStack[0].value.push(i16);
    },

    writeI32: function(i32) {
      this.elementStack[0].value.push(i32);
    },

    writeI64: function(i64) {
      this.elementStack[0].value.push(i64);
    },

    writeDouble: function(dbl) {
      this.elementStack[0].value.push(dbl);
    },

    writeString: function(str) {
      this.elementStack[0].value.push(str);
    },

    writeBinary: function(str) {
      this.elementStack[0].value.push(str);
    },

    // Reading functions
    readMessageBegin: function(name, messageType, seqid) {
      throw new Error("TJSONProtocol: Message not supported");
    },

    readMessageEnd: function() {
    },

    readStructBegin: function(name) {
      var value;
      if(this.elementStack.length == 0)
        value = JSON.parse(this.transport.readAll());
      else
        value = Thrift.TJSONProtocol.getValueFromScope(this.elementStack[0]);

      var fields = [];
      for(var field in value)
        fields.push(field);
      this.elementStack.unshift({
        fields:fields,
        value:value
      });
      return {
        fname:''
      };
    },

    readStructEnd: function() {
      this.elementStack.shift();
    },

    readFieldBegin: function() {
      var scope = this.elementStack[0];
      var scopeValue = Thrift.TJSONProtocol.getValueFromScope(scope);
      var fid = scope.fields.shift();
      if(!fid)
        return {fname:'', ftype:Thrift.Type.STOP};

      var fieldValue = scopeValue[fid];
      for(var soleMember in fieldValue) {
        this.elementStack.unshift({value:fieldValue[soleMember]});
        return {
          fname:'',
          fid:Number(fid),
          ftype:Thrift.Protocol.RType[soleMember]
        };
      }
      /* there are no members, which is a format error */
      throw new Error("TJSONProtocol: parse error reading field value");
    },

    readFieldEnd: function() {
      this.elementStack.shift();
    },

    readMapBegin: function(keyType, valType, size) {
      var scope = this.elementStack[0];
      var value = Thrift.TJSONProtocol.getValueFromScope(scope);
      var result = {
        ktype:Thrift.Protocol.RType[value.shift()],
        vtype:Thrift.Protocol.RType[value.shift()],
        size:value.shift()
      };
      this.elementStack.unshift({listvalue:value});
      return result;
    },

    readMapEnd: function() {
      this.elementStack.shift();
    },

    readListBegin: function(elemType, size) {
      var scope = this.elementStack[0];
      var value = Thrift.TJSONProtocol.getValueFromScope(scope);
      var result = {
        etype:Thrift.Protocol.RType[value.shift()],
        size:value.shift()
      };
      this.elementStack.unshift({listvalue:value});
      return result;
    },

    readListEnd: function() {
      this.elementStack.shift();
    },

    readSetBegin: function(elemType, size) {
      var scope = this.elementStack[0];
      var value = Thrift.TJSONProtocol.getValueFromScope(scope);
      var result = {
        etype:Thrift.Protocol.RType[value.shift()],
        size:value.shift()
      };
      this.elementStack.unshift({listvalue:value});
      return result;
    },

    readSetEnd: function() {
      this.elementStack.shift();
    },

    readBool: function() {
      return !!Thrift.TJSONProtocol.getValueFromScope(this.elementStack[0]);
    },

    readByte: function() {
      return Thrift.TJSONProtocol.getValueFromScope(this.elementStack[0]);
    },

    readI16: function() {
      return Thrift.TJSONProtocol.getValueFromScope(this.elementStack[0]);
    },

    readI32: function(f) {
      return Thrift.TJSONProtocol.getValueFromScope(this.elementStack[0]);
    },

    readI64: function() {
      return Thrift.TJSONProtocol.getValueFromScope(this.elementStack[0]);
    },

    readDouble: function() {
      return Thrift.TJSONProtocol.getValueFromScope(this.elementStack[0]);
    },

    readString: function() {
      return Thrift.TJSONProtocol.getValueFromScope(this.elementStack[0]);
    },

    readBinary: function() {
      return Thrift.TJSONProtocol.getValueFromScope(this.elementStack[0]);
    },

    flush: function() {
      this.transport.flush();
    }
};
var Utf8 = {
  encode: function(string, view, off) {
    var pos = off;
    for(var n = 0; n < string.length; n++) {
      var c = string.charCodeAt(n);
      if (c < 128) {
        view.setInt8(pos++, c);
      } else if((c > 127) && (c < 2048)) {
        view.setInt8(pos++, (c >> 6) | 192);
        view.setInt8(pos++, (c & 63) | 128);
      } else {
        view.setInt8(pos++, (c >> 12) | 224);
        view.setInt8(pos++, ((c >> 6) & 63) | 128);
        view.setInt8(pos++, (c & 63) | 128);
      }
    }
    return (pos - off);
  },
  decode : function(view, off, length) {
    var string = "";
    var i = off;
    length += off;
    var c, c1, c2, c3;
    c = c1 = c2 = 0;
    while ( i < length ) {
      c = view.getInt8(i++);
      if (c < 128) {
        string += String.fromCharCode(c);
      } else if((c > 191) && (c < 224)) {
        c2 = view.getInt8(i++);
        string += String.fromCharCode(((c & 31) << 6) | (c2 & 63));
      } else {
        c2 = view.getInt8(i++);
        c3 = view.getInt8(i++);
        string += String.fromCharCode(((c & 15) << 12) | ((c2 & 63) << 6) | (c3 & 63));
      }
    }
    return string;
  }
};

/* constructor simply creates a buffer of a specified length */
var Buffer = function(length) {
  this.offset = 0;
  this.length = length;
  if(length) {
    var buf = this.buf = new ArrayBuffer(length);
    this.view = new DataView(buf);
  }
};
Thrift.Buffer = Buffer;

Buffer.prototype = {
  getArray: function() {
    if(!this.array)
      this.array = new Uint8Array(this.buf, this.offset, this.length);
    return this.array;
  },
  slice: function(start, end) {
    start = start || 0;
    end = end || this.length;
    var result = new Buffer();
    var length = result.length = end - start;
    var offset = result.offset = this.offset + start;
    var buf = result.buf = this.buf;
    result.view = new DataView(buf, offset, length);
    return result;
  },
  getInt8: function(off) {
    return this.view.getInt8(off);
  },
  getInt16: function(off) {
    return this.view.getInt16(off, false);
  },
  getInt32: function(off) {
    return this.view.getInt32(off, false);
  },
  getInt64: function(off) {
    var hi = this.view.getInt32(off, false);
    var lo = this.view.getUint32(off + 4, false);
    return new Int64(hi, lo);
  },
  getFloat64: function(off) {
    return this.view.getFloat64(off, false);
  },
  getUtf8String: function(off, utflen) {
    return Utf8.decode(this.view, off, utflen);
  },
  setInt8: function(off, v) {
    this.view.setInt8(off, v);
  },
  setInt16: function(off, v) {
    this.view.setInt16(off, v, false);
  },
  setInt32: function(off, v) {
    this.view.setInt32(off, v, false);
  },
  setInt64: function(off, v) {
    this.getArray().set(v.buffer, off);
  },
  setFloat64: function(off, v) {
    this.view.setFloat64(off, v, false);
  },
  setBuffer: function(off, v) {
    this.getArray().set(v.getArray(), off);
  },
  setRawString: function(off, v) {
    var arr = this.getArray();

    for (var i = 0, len = v.length; i < len; i++) {
      arr[i + off] = v.charCodeAt(i);
    }
  },
  setUtf8String: function(off, v) {
    return Utf8.encode(v, this.view, off);
  },
  inspect: function() {
    var result = 'length: ' + this.length + '\n';
    var idx = 0;
    while(idx < this.length) {
      for(var i = 0; (idx < this.length) && (i < 32); i++)
        result += this.view.getInt8(idx++).toString(16) + ' ';
      result += '\n';
    }
    return result;
  }
};

var CheckedBuffer = Thrift.CheckedBuffer = function(length) {
  Buffer.call(this, length);
};
inherits(CheckedBuffer, Buffer, {
  grow: function(extra) {
    extra = extra || 0;
    var len = this.length + Math.max(extra, this.length*0.41);
    var src = this.getArray();
    this.buf = new ArrayBuffer(len);
    this.view = new DataView(this.buf);
    this.getArray().set(src);
    this.offset = 0;
    this.length = len;
  },
  checkAvailable: function(off, extra) {
    if(off + extra >= this.length)
      this.grow(extra);
  },
  setInt8: function(off, v) {
    this.checkAvailable(1);
    this.view.setInt8(off, v);
  },
  setInt16: function(off, v) {
    this.checkAvailable(2);
    this.view.setInt16(off, v, false);
  },
  setInt32: function(off, v) {
    this.checkAvailable(4);
    this.view.setInt32(off, v, false);
  },
  setInt64: function(off, v) {
    this.checkAvailable(8);
    this.getArray().set(v.buffer, off);
  },
  setFloat64: function(off, v) {
    this.checkAvailable(8);
    this.view.setFloat64(off, v, false);
  },
  setBuffer: function(off, v) {
    this.checkAvailable(v.length);
    this.getArray().set(v.getArray(), off);
  },
  setUtf8String: function(off, v) {
    while(true) {
      try {
        return Utf8.encode(v, this.view, off);
      } catch(e) {
        this.grow();
      }
    }
  }
});
var emptyBuf = new Buffer(0);

var InputBufferUnderrunError = function() {
};

var TTransport = Thrift.TTransport = function(buffer, callback) {
  this.buf = buffer || emptyBuf;
  this.onFlush = callback;
  this.reset();
};

TTransport.receiver = function(callback) {
  return function(data) {
    callback(new TTransport(data));
  };
};

TTransport.prototype = {
  commitPosition: function(){},
  rollbackPosition: function(){},

  reset: function() {
    this.pos = 0;
  },

  // TODO: Implement open/close support
  isOpen: function() {return true;},
  open: function() {},
  close: function() {},

  read: function(len) { // this function will be used for each frames.
    var end = this.pos + len;

    if (this.buf.length < end) {
      throw new Error('read(' + len + ') failed - not enough data');
    }

    var buf = this.buf.slice(this.pos, end);
    this.pos = end;
    return buf;
  },

  readByte: function() {
    return this.buf.getInt8(this.pos++);
  },

  readI16: function() {
    var i16 = this.buf.getInt16(this.pos);
    this.pos += 2;
    return i16;
  },

  readI32: function() {
    var i32 = this.buf.getInt32(this.pos);
    this.pos += 4;
    return i32;
  },

  readDouble: function() {
    var d = this.buf.getFloat64(this.pos);
    this.pos += 8;
    return d;
  },

  readString: function(len) {
    var str = this.buf.getUtf8String(this.pos, len);
    this.pos += len;
    return str;
  },

  readAll: function() {
    return this.buf;
  },

  writeByte: function(v) {
    this.buf.setInt8(this.pos++, v);
  },

  writeI16: function(v) {
    this.buf.setInt16(this.pos, v);
    this.pos += 2;
  },

  writeI32: function(v) {
    this.buf.setInt32(this.pos, v);
    this.pos += 4;
  },

  writeI64: function(v) {
    this.buf.setInt64(this.pos, v);
    this.pos += 8;
  },

  writeDouble: function(v) {
    this.buf.setFloat64(this.pos, v);
    this.pos += 8;
  },

  write: function(buf) {
    if (typeof(buf) === 'string') {
      this.pos += this.setUtf8String(this.pos, buf);
    } else {
      this.setBuffer(this.pos, buf);
      this.pos += buf.length;
    }
  },

  writeWithLength: function(buf) {
    var len;
    if (typeof(buf) === 'string') {
      len = this.buf.setUtf8String(this.pos + 4, buf);
    } else {
      this.buf.setBuffer(this.pos + 4, buf);
      len = buf.length;
    }
    this.buf.setInt32(this.pos, len);
    this.pos += len + 4;
  },

  flush: function(flushCallback) {
    flushCallback = flushCallback || this.onFlush;
    if(flushCallback) {
      var out = this.buf.slice(0, this.pos);
      flushCallback(out);
    }
  }
};

var TFramedTransport = Thrift.TFramedTransport = function(buffer, callback) {
  TTransport.call(this, buffer, callback);
};
Thrift.TFramedTransport = TFramedTransport;

TFramedTransport.receiver = function(callback) {
  var frameLeft = 0,
      framePos = 0,
      frame = null;
  var residual = null;

  return function(data) {
    // Prepend any residual data from our previous read
    if (residual) {
      var dat = new Buffer(data.length + residual.length);
      residual.copy(dat, 0, 0);
      data.copy(dat, residual.length, 0);
      residual = null;
    }

    // framed transport
    while (data.length) {
      if (frameLeft === 0) {
        // TODO assumes we have all 4 bytes
        if (data.length < 4) {
          console.log("Expecting > 4 bytes, found only " + data.length);
          residual = data;
          break;
          //throw Error("Expecting > 4 bytes, found only " + data.length);
        }
        frameLeft = binary.readI32(data, 0);
        frame = new Buffer(frameLeft);
        framePos = 0;
        data = data.slice(4, data.length);
      }

      if (data.length >= frameLeft) {
        data.copy(frame, framePos, 0, frameLeft);
        data = data.slice(frameLeft, data.length);

        frameLeft = 0;
        callback(new TFramedTransport(frame));
      } else if (data.length) {
        data.copy(frame, framePos, 0, data.length);
        frameLeft -= data.length;
        framePos += data.length;
        data = data.slice(data.length, data.length);
      }
    }
  };
};

inherits(TFramedTransport, TTransport, {
  flush: function() {
    var that = this;
    // TODO: optimize this better, allocate one buffer instead of both:
    var framedBuffer = function(out) {
      if(that.onFlush) {
        var msg = new Buffer(out.length + 4);
        binary.writeI32(msg, out.length);
        out.copy(msg, 4, 0, out.length);
        that.onFlush(msg);
      }
    };
    TTransport.prototype.flush.call(this, framedBuffer);
  }
});
/**
 * Support for handling 64-bit int numbers in Javascript (node.js)
 *
 * JS Numbers are IEEE-754 binary double-precision floats, which limits the
 * range of values that can be represented with integer precision to:
 *
 * 2^^53 <= N <= 2^53
 *
 * Int64 objects wrap a node Buffer that holds the 8-bytes of int64 data.  These
 * objects operate directly on the buffer which means that if they are created
 * using an existing buffer then setting the value will modify the Buffer, and
 * vice-versa.
 *
 * Internal Representation
 *
 * The internal buffer format is Big Endian.  I.e. the most-significant byte is
 * at buffer[0], the least-significant at buffer[7].  For the purposes of
 * converting to/from JS native numbers, the value is assumed to be a signed
 * integer stored in 2's complement form.
 *
 * For details about IEEE-754 see:
 * http://en.wikipedia.org/wiki/Double_precision_floating-point_format
 */

// Useful masks and values for bit twiddling
var MASK31 =  0x7fffffff, VAL31 = 0x80000000;
var MASK32 =  0xffffffff, VAL32 = 0x100000000;

// Map for converting hex octets to strings
var _HEX = [];
for (var j = 0; j < 256; j++) {
  _HEX[j] = (j > 0xF ? '' : '0') + j.toString(16);
}

//
// Int64
//

/**
 * Constructor accepts any of the following argument types:
 *
 * new Int64(buffer[, offset=0]) - Existing Array or Uint8Array with element offset
 * new Int64(string)             - Hex string (throws if n is outside int64 range)
 * new Int64(number)             - Number (throws if n is outside int64 range)
 * new Int64(hi, lo)             - Raw bits as two 32-bit values
 */
var Int64 = function(a1, a2) {
  if (a1 instanceof Array) {
    this.buffer = a1;
    this.offset = a2 || 0;
  } else {
    this.buffer = this.buffer || new Array(8);
    this.offset = 0;
    this.setValue.apply(this, arguments);
  }
};


// Max integer value that JS can accurately represent
Int64.MAX_INT = Math.pow(2, 53);

// Min integer value that JS can accurately represent
Int64.MIN_INT = -Math.pow(2, 53);

Int64.prototype = {
  /**
   * Do in-place 2's compliment.  See
   * http://en.wikipedia.org/wiki/Two's_complement
   */
  _2scomp: function() {
    var b = this.buffer, o = this.offset, carry = 1;
    for (var i = o + 7; i >= o; i--) {
      var v = (b[i] ^ 0xff) + carry;
      b[i] = v & 0xff;
      carry = v >> 8;
    }
  },

  /**
   * Set the value. Takes any of the following arguments:
   *
   * setValue(string) - A hexidecimal string
   * setValue(number) - Number (throws if n is outside int64 range)
   * setValue(hi, lo) - Raw bits as two 32-bit values
   */
  setValue: function(hi, lo) {
    var negate = false;
    if (arguments.length == 1) {
      if (typeof(hi) == 'number') {
        // Simplify bitfield retrieval by using abs() value.  We restore sign
        // later
        negate = hi < 0;
        hi = Math.abs(hi);
        lo = hi % VAL32;
        hi = hi / VAL32;
        if (hi > VAL32) throw new RangeError(hi  + ' is outside Int64 range');
        hi = hi | 0;
      } else if (typeof(hi) == 'string') {
        hi = (hi + '').replace(/^0x/, '');
        lo = hi.substr(-8);
        hi = hi.length > 8 ? hi.substr(0, hi.length - 8) : '';
        hi = parseInt(hi, 16);
        lo = parseInt(lo, 16);
      } else {
        throw new Error(hi + ' must be a Number or String');
      }
    }

    // Technically we should throw if hi or lo is outside int32 range here, but
    // it's not worth the effort. Anything past the 32'nd bit is ignored.

    // Copy bytes to buffer
    var b = this.buffer, o = this.offset;
    for (var i = 7; i >= 0; i--) {
      b[o+i] = lo & 0xff;
      lo = i == 4 ? hi : lo >>> 8;
    }

    // Restore sign of passed argument
    if (negate) this._2scomp();
  },

  /**
   * Convert to a native JS number.
   *
   * WARNING: Do not expect this value to be accurate to integer precision for
   * large (positive or negative) numbers!
   *
   * @param allowImprecise If true, no check is performed to verify the
   * returned value is accurate to integer precision.  If false, imprecise
   * numbers (very large positive or negative numbers) will be forced to +/-
   * Infinity.
   */
  toNumber: function(allowImprecise) {
    var b = this.buffer, o = this.offset;

    // Running sum of octets, doing a 2's complement
    var negate = b[0] & 0x80, x = 0, carry = 1;
    for (var i = 7, m = 1; i >= 0; i--, m *= 256) {
      var v = b[o+i];

      // 2's complement for negative numbers
      if (negate) {
        v = (v ^ 0xff) + carry;
        carry = v >> 8;
        v = v & 0xff;
      }

      x += v * m;
    }

    // Return Infinity if we've lost integer precision
    if (!allowImprecise && x >= Int64.MAX_INT) {
      return negate ? -Infinity : Infinity;
    }

    return negate ? -x : x;
  },

  /**
   * Convert to a JS Number. Returns +/-Infinity for values that can't be
   * represented to integer precision.
   */
  valueOf: function() {
    return this.toNumber(false);
  },

  /**
   * Return string value
   *
   * @param radix Just like Number#toString()'s radix
   */
  toString: function(radix) {
    return this.valueOf().toString(radix || 10);
  },

  /**
   * Return a string showing the buffer octets, with MSB on the left.
   *
   * @param sep separator string. default is '' (empty string)
   */
  toOctetString: function(sep) {
    var out = new Array(8);
    var b = this.buffer, o = this.offset;
    for (var i = 0; i < 8; i++) {
      out[i] = _HEX[b[o+i]];
    }
    return out.join(sep || '');
  },

  /**
   * Pretty output in console.log
   */
  inspect: function() {
    return '[Int64 value:' + this + ' octets:' + this.toOctetString(' ') + ']';
  }
};/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements. See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership. The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License. You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied. See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
var Type = Thrift.Type;

var UNKNOWN = 0,
    INVALID_DATA = 1,
    NEGATIVE_SIZE = 2,
    SIZE_LIMIT = 3,
    BAD_VERSION = 4;

var TProtocolException = function(type, message) {
  Error.call(this, message);
  this.name = 'TProtocolException';
  this.type = type;
};
inherits(TProtocolException, Error);

var TBinaryProtocol = Thrift.TBinaryProtocol = function(trans, strictRead, strictWrite) {
  this.trans = trans;
  this.strictRead = (strictRead !== undefined ? strictRead : false);
  this.strictWrite = (strictWrite !== undefined ? strictWrite : true);
};
Thrift.TBinaryProtocol = TBinaryProtocol;

TBinaryProtocol.prototype.flush = function() {
  return this.trans.flush();
};

// NastyHaxx. JavaScript forces hex constants to be
// positive, converting this into a long. If we hardcode the int value
// instead it'll stay in 32 bit-land.

var VERSION_MASK = -65536, // 0xffff0000
    VERSION_1 = -2147418112, // 0x80010000
    TYPE_MASK = 0x000000ff;

TBinaryProtocol.prototype.writeMessageBegin = function(name, type, seqid) {
    if (this.strictWrite) {
      this.writeI32(VERSION_1 | type);
      this.writeString(name);
      this.writeI32(seqid);
    } else {
      this.writeString(name);
      this.writeByte(type);
      this.writeI32(seqid);
    }
};

TBinaryProtocol.prototype.writeMessageEnd = function() {
};

TBinaryProtocol.prototype.writeStructBegin = function(name) {
};

TBinaryProtocol.prototype.writeStructEnd = function() {
};

TBinaryProtocol.prototype.writeFieldBegin = function(name, type, id) {
  this.writeByte(type);
  this.writeI16(id);
};

TBinaryProtocol.prototype.writeFieldEnd = function() {
};

TBinaryProtocol.prototype.writeFieldStop = function() {
  this.writeByte(Type.STOP);
};

TBinaryProtocol.prototype.writeMapBegin = function(ktype, vtype, size) {
  this.writeByte(ktype);
  this.writeByte(vtype);
  this.writeI32(size);
};

TBinaryProtocol.prototype.writeMapEnd = function() {
};

TBinaryProtocol.prototype.writeListBegin = function(etype, size) {
  this.writeByte(etype);
  this.writeI32(size);
};

TBinaryProtocol.prototype.writeListEnd = function() {
};

TBinaryProtocol.prototype.writeSetBegin = function(etype, size) {
  this.writeByte(etype);
  this.writeI32(size);
};

TBinaryProtocol.prototype.writeSetEnd = function() {
};

TBinaryProtocol.prototype.writeBool = function(bool) {
  this.writeByte(bool ? 1 : 0);
};

TBinaryProtocol.prototype.writeByte = function(i8) {
  this.trans.writeByte(i8);
};

TBinaryProtocol.prototype.writeI16 = function(i16) {
  this.trans.writeI16(i16);
};

TBinaryProtocol.prototype.writeI32 = function(i32) {
  this.trans.writeI32(i32);
};

TBinaryProtocol.prototype.writeI64 = function(i64) {
  if (i64.buffer) {
    this.trans.writeI64(i64);
  } else {
    this.trans.writeI64(new Int64(i64));
  }
};

TBinaryProtocol.prototype.writeDouble = function(dub) {
  this.trans.writeDouble(dub);
};

TBinaryProtocol.prototype.writeString = function(arg) {
  this.trans.writeWithLength(arg);
};

TBinaryProtocol.prototype.writeBinary = function(arg) {
  this.trans.writeWithLength(arg);
};

TBinaryProtocol.prototype.readMessageBegin = function() {
  var sz = this.readI32();
  var type, name, seqid;

  if (sz < 0) {
    var version = sz & VERSION_MASK;
    if (version != VERSION_1) {
      console.log("BAD: " + version);
      throw TProtocolException(BAD_VERSION, "Bad version in readMessageBegin: " + sz);
    }
    type = sz & TYPE_MASK;
    name = this.readString();
    seqid = this.readI32();
  } else {
    if (this.strictRead) {
      throw TProtocolException(BAD_VERSION, "No protocol version header");
    }
    name = this.trans.read(sz);
    type = this.readByte();
    seqid = this.readI32();
  }
  return {fname: name, mtype: type, rseqid: seqid};
};

TBinaryProtocol.prototype.readMessageEnd = function() {
};

TBinaryProtocol.prototype.readStructBegin = function() {
  return {fname: ''};
};

TBinaryProtocol.prototype.readStructEnd = function() {
};

TBinaryProtocol.prototype.readFieldBegin = function() {
  var type = this.readByte();
  if (type == Type.STOP) {
    return {fname: null, ftype: type, fid: 0};
  }
  var id = this.readI16();
  return {fname: null, ftype: type, fid: id};
};

TBinaryProtocol.prototype.readFieldEnd = function() {
};

TBinaryProtocol.prototype.readMapBegin = function() {
  var ktype = this.readByte();
  var vtype = this.readByte();
  var size = this.readI32();
  return {ktype: ktype, vtype: vtype, size: size};
};

TBinaryProtocol.prototype.readMapEnd = function() {
};

TBinaryProtocol.prototype.readListBegin = function() {
  var etype = this.readByte();
  var size = this.readI32();
  return {etype: etype, size: size};
};

TBinaryProtocol.prototype.readListEnd = function() {
};

TBinaryProtocol.prototype.readSetBegin = function() {
  var etype = this.readByte();
  var size = this.readI32();
  return {etype: etype, size: size};
};

TBinaryProtocol.prototype.readSetEnd = function() {
};

TBinaryProtocol.prototype.readBool = function() {
  var i8 = this.readByte();
  if (i8 == 0) {
    return false;
  }
  return true;
};

TBinaryProtocol.prototype.readByte = function() {
  return this.trans.readByte();
};

TBinaryProtocol.prototype.readI16 = function() {
  return this.trans.readI16();
};

TBinaryProtocol.prototype.readI32 = function() {
  return this.trans.readI32();
};

TBinaryProtocol.prototype.readI64 = function() {
  return this.trans.readI64();
};

TBinaryProtocol.prototype.readDouble = function() {
  return this.trans.readDouble();
};

TBinaryProtocol.prototype.readBinary = function() {
  var len = this.readI32();
  return this.trans.read(len);
};

TBinaryProtocol.prototype.readString = function() {
  var len = this.readI32();
  return this.trans.readString(len);
};

TBinaryProtocol.prototype.getTransport = function() {
  return this.trans;
};

TBinaryProtocol.prototype.skip = function(type) {
  // console.log("skip: " + type);
  var r, i;
  switch (type) {
    case Type.STOP:
      return;
    case Type.BOOL:
      this.readBool();
      break;
    case Type.BYTE:
      this.readByte();
      break;
    case Type.I16:
      this.readI16();
      break;
    case Type.I32:
      this.readI32();
      break;
    case Type.I64:
      this.readI64();
      break;
    case Type.DOUBLE:
      this.readDouble();
      break;
    case Type.STRING:
      this.readString();
      break;
    case Type.STRUCT:
      this.readStructBegin();
      while (true) {
        r = this.readFieldBegin();
        if (r.ftype === Type.STOP) {
          break;
        }
        this.skip(r.ftype);
        this.readFieldEnd();
      }
      this.readStructEnd();
      break;
    case Type.MAP:
      r = this.readMapBegin();
      for (i = 0; i < r.size; ++i) {
        this.skip(r.ktype);
        this.skip(r.vtype);
      }
      this.readMapEnd();
      break;
    case Type.SET:
      r = this.readSetBegin();
      for (i = 0; i < r.size; ++i) {
        this.skip(r.etype);
      }
      this.readSetEnd();
      break;
    case Type.LIST:
      r = this.readListBegin();
      for (i = 0; i < r.size; ++i) {
        this.skip(r.etype);
      }
      this.readListEnd();
      break;
    default:
      throw Error("Invalid type: " + type);
  }
};

exports.Thrift = Thrift;

}(window));

altspace._internal.DynamicThriftBuffer = (function () {
	var constr = function() {
		var buffer;
		var transport;
		var protocol;
		var length;
		var bufferByteArray;

		var switchToBufferOfLength = function(newLength) {
			buffer = new Thrift.Buffer(newLength);
			bufferByteArray = new Uint8Array(buffer.buf);
			transport = new Thrift.TFramedTransport(buffer);
			protocol = new Thrift.TBinaryProtocol(transport);
			length = newLength;
		};

		this.grow = function(newLength) {
			// This reaches inside of the buffer object, kind of hacky.
			var oldArray = buffer.getArray();

			length = Math.floor(newLength);

			switchToBufferOfLength(length);
			buffer.getArray().set(oldArray);
			buffer.offset = 0;
			buffer.length = length;
		};

		this.getBinaryString = function(thriftObject) {
			transport.reset();

			while (true) {
				try {
					thriftObject.write(protocol);
					break;
				} catch (e) {
					if (length < 1024 * 1024 * 64) {
						this.grow(length * 1.4);
						if (this.profile) {
							console.warn(
								'Resizing the serialization buffer. ' +
								'Set the initialSerializationBufferSize option when getting the renderer to avoid this.',
								length);
						}
					} else {
						throw e;
					}
				}
			}

			return constr.toBinaryString(bufferByteArray, transport.pos);
		};

		// Start off with 1024 byte length.
		switchToBufferOfLength(1024);
	};

	constr.toBinaryString = function (arr, len) {
		var chunkSize = 0xffff;
		var numChunks = Math.floor(len / chunkSize) + (len % chunkSize == 0 ? 0 : 1);
		var outputStr = new Array(numChunks);

		for (var i = 0, c = 0; c < len; i++, c = i * chunkSize) {
			var lastIndex = i == numChunks - 1 ? len : (i + 1) * chunkSize;
			outputStr[i] = String.fromCharCode.apply(null, arr.subarray(c, lastIndex));
		}

		return outputStr.join("");
	};

	return constr;
}());


altspace._internal.ScratchThriftBuffer = new altspace._internal.DynamicThriftBuffer();

/* jslint browser: true, nomen: true, plusplus: true */
/* global module, define, global */

/// @file coherent.js
/// @namespace engine

/// Coherent Browser JavaScript interface.
/// The `engine` module contains all functions for communication between the UI and the game / application.
(function (factory) {
	if (typeof module === 'object' && module.exports) {
		module.exports = factory(global, global.engine, false);
	}
	if (typeof define === 'function') {
		define(function () {
			return factory(window, window.engine, true);
		});
	} else {
		window.engine = factory(window, window.engine, true);
	}

	// altvr, fired so we can extend window.engine ourselves immediately
	document.dispatchEvent(new Event("WindowEngineCreated"));
})(function (global, engine, hasOnLoad) {
	'use strict';


	/**
	* Event emitter
	*
	* @class Emitter
	*/
	function Emitter() {
		this.events = {};
	}

	function Handler(code, context) {
		this.code = code;
		this.context = context;
	}

	Emitter.prototype._createClear = function (object, name, handler) {
		return function() {
			var handlers = object.events[name];
			if (handlers) {
				var index = handlers.indexOf(handler);
				if (index != -1) {
					handlers.splice(index, 1);
					if (handlers.length === 0) {
						delete object.events[name];
					}
				}
			}
		};
	};

	/// @file coherent.js

	/**
	* Add a handler for an event
	*
	* @method on
	* @param name the event name
	* @param callback function to be called when the event is triggered
	* @param context this binding for executing the handler, defaults to the Emitter
	* @return connection object
	*/
	Emitter.prototype.on = function (name, callback, context) {
		var handlers = this.events[name];

		if (handlers === undefined) {
			handlers = this.events[name] = [];
		}

		var handler = new Handler(callback, context || this);
		handlers.push(handler);
		return { clear: this._createClear(this, name, handler) };
	};

	/**
	* Remove a handler from an event
	*
	* @method off
	* @param name the event name
	* @param callback function to be called when the event is triggered
	* @param context this binding for executing the handler, defaults to the Emitter
	* @return connection object
	*/
	Emitter.prototype.off = function (name, handler, context) {
		var handlers = this.events[name];

		if (handlers !== undefined) {
			context = context || this;

			var index;
			var length = handlers.length;
			for (index = 0; index < length; ++index) {
				var reg = handlers[index];
				if (reg.code == handler && reg.context == context) {
					break;
				}
			}
			if (index < length) {
				handlers.splice(index, 1);
				if (handlers.length === 0) {
					delete this.events[name];
				}
			}
		}
	};

	/**
	* Remove a handler from an event
	*
	* @method off
	* @param name the event name
	* @param callback function to be called when the event is triggered
	* @param context this binding for executing the handler, defaults to the Emitter
	* @return connection object
	*/
	Emitter.prototype.trigger = function (name) {
		var handlers = this.events[name];

		if (handlers !== undefined) {
			var args = Array.prototype.slice.call(arguments, 1);

			handlers.forEach(function (handler) {
				handler.code.apply(handler.context, args);
			});
		}
	};

	Emitter.prototype.merge = function (emitter) {
		var lhs = this.events,
			rhs = emitter.events,
			push = Array.prototype.push,
			events;

		for (var e in rhs) {
			events = lhs[e] = lhs[e] || [];
			push.apply(events, rhs[e]);
		}
	};

	var pending = 'pending';
	var fulfilled = 'fulfilled';
	var broken = 'broken';

	function callAsync(code, context, argument) {
		var async = function () {
			code.call(context, argument);
		};
		setTimeout(async);
	}

	function Promise () {
		this.emitter = new Emitter();
		this.state = pending;
		this.result = null;
	}

	Promise.prototype.resolve = function (result) {
		this.state = fulfilled;
		this.result = result;

		this.emitter.trigger(fulfilled, result);
	};

	Promise.prototype.reject = function (result) {
		this.state = broken;
		this.result = result;

		this.emitter.trigger(broken, result);
	};

	Promise.prototype.success = function (code, context) {
		if (this.state !== fulfilled) {
			this.emitter.on(fulfilled, code, context);
		} else {
			callAsync(code, context || this, this.result);
		}
		return this;
	};

	Promise.prototype.always = function (code, context) {
		this.success(code, context);
		this.otherwise(code, context);
		return this;
	};

	Promise.prototype.otherwise = function (code, context) {
		if (this.state !== broken) {
			this.emitter.on(broken, code, context);
		} else {
			callAsync(code, context || this, this.result);
		}
		return this;
	};
	Promise.prototype.catch = Promise.prototype.otherwise;

	Promise.prototype.merge = function (other) {
		if (this.state === pending) {
			this.emitter.merge(other.emitter);
		} else {
			var handlers = other.emitter.events[this.state];
			var self = this;
			if (handlers !== undefined) {
				handlers.forEach(function (handler) {
					handler.code.call(handler.context, self.result);
				});
			}
		}
	};

	Promise.prototype.make_chain = function (handler, promise, ok) {
		return function (result) {
			var handlerResult;
			try {
				handlerResult = handler.code.call(handler.context, result);
				if (handlerResult instanceof Promise) {
					handlerResult.merge(promise);
				} else if (this.state === ok) {
					promise.resolve(handlerResult);
				} else {
					promise.reject(handlerResult);
				}
			} catch (error) {
				console.error('Error in promise.', error.stack);
				promise.reject(error);
			}
		};
	};

	function makeDefaultHandler(promise) {
		return function () {
			return promise;
		};
	}

	Promise.prototype.then = function (callback, errback) {
		var promise = new Promise();

		var handler = new Handler(callback || makeDefaultHandler(this), this);

		this.success(this.make_chain(handler, promise, fulfilled), this);

		var errorHandler = new Handler(errback || makeDefaultHandler(this), this);
		this.otherwise(this.make_chain(errorHandler, promise, broken), this);


		return promise;
	};

	var isAttached = engine !== undefined;

	engine = engine || {};

	engine.events = {};
	for (var property in Emitter.prototype) {
		engine[property] = Emitter.prototype[property];
	}

	/// @function engine.on
	/// Register handler for and event
	/// @param {String} name name of the event
	/// @param {Function} callback callback function to be executed when the event has been triggered
	/// @param context *this* context for the function, by default the engine object

	/// @function engine.off
	/// Remove handler for an event
	/// @param {String} name name of the event, by default removes all events
	/// @param {Function} callback the callback function to be removed, by default removes all callbacks for a given event
	/// @param context *this* context for the function, by default all removes all callbacks, regardless of context
	/// @warning Removing all handlers for `engine` will remove some *Coherent Browser* internal events, breaking some functionality.

	/// @function engine.trigger
	/// Trigger an event
	/// This function will trigger any C++ handler registered for this event with `Coherent::UI::View::RegisterForEvent`
	/// @param {String} name name of the event
	/// @param ... any extra arguments to be passed to the event handlers

	engine._trigger = Emitter.prototype.trigger;
	var concatArguments = Array.prototype.concat;
	engine.trigger = function (name) {
		this._trigger.apply(this, arguments);
		if (this._eventHandles[name] === undefined && this.IsAttached)
		{
			this.TriggerEvent.apply(this, arguments);
		}
		if (this.events.all !== undefined) {
			var allArguments = concatArguments.apply(['all'], arguments);
			this._trigger.apply(this, allArguments);
		}
	};

	engine.IsAttached = isAttached;
	engine._BindingsReady = false;
	engine._WindowLoaded = false;
	engine._RequestId = Math.floor(Math.random() * Math.pow(2, 15) - 1) << 16;//AltspaceVR, start each frame's RequestId at a random number so that they don't collide
	engine._ActiveRequests = {};

	// Begin AltspaceVR //
    // This enables the cascading of _Return events to lower iframes
	var iframes = document.getElementsByTagName('iframe');//This is a live NodeList
	function propagateToIFrames(event) {
	    if (!window.Alt || !window.Alt.shouldSupportIFrames) return;

	    for (var i = 0, max = iframes.length; i < max; i++) {
	        var iframe = iframes[i];
	        iframe.contentWindow.postMessage(event, '*');
	    }
	}
	window.addEventListener('message', function (event) {
	    if (event.data.isAltspaceIFrameResult) {
	        engine._Result.apply(engine, event.data.args);
	    }
	});
    // End AltspaceVR //

	if (!engine.IsAttached) {
		engine.SendMessage = function (name, id) {
			var args = Array.prototype.slice.call(arguments, 2);
			var deferred = engine._ActiveRequests[id];

			delete engine._ActiveRequests[id];

			args.push(deferred);

			var call = (function (name, args) {
				return function () {
					var mock = engine['Mock_' + name];

					if (mock !== undefined) {
						var callMock = function () {
							mock.apply(engine, args);
						};
						window.setTimeout(callMock, 16);
					}
				};
			}(name, args));

			window.setTimeout(call, 16);
		};

		engine.TriggerEvent = function () {
			var args = Array.prototype.slice.call(arguments),
				trigger;

			args[0] = 'Fake_' + args[0];

			trigger = (function (args) {
				return function () {
					engine.trigger.apply(engine, args);
				};
			}(args));

			window.setTimeout(trigger, 16);
		};

		engine.BindingsReady = function () {
			engine._OnReady();
		};

		engine.__observeLifetime = function () {
		};
	}

	/// @function engine.createDeferred
	/// Create a new deferred object.
	/// Use this to create deferred / promises that can be used together with `engine.call`.
	/// @return {Deferred} a new deferred object
	/// @see @ref CustomizingPromises
	engine.createDeferred = (global.engineCreateDeferred === undefined) ?
		function () { return new Promise(); }
		: global.engineCreateDeferred;

	/// @function engine.call
	/// Call asynchronously a C++ handler and retrieve the result
	/// The C++ handler must have been registered with `Coherent::UI::View::BindCall`
	/// @param {String} name name of the C++ handler to be called
	/// @param ... any extra parameters to be passed to the C++ handler
	/// @return {Deferred} deferred object whose promise is resolved with the result of the C++ handler
	engine.call = function () {
		engine._RequestId++;
		var id = engine._RequestId;

		var deferred = engine.createDeferred();
		engine._ActiveRequests[id] = deferred;
		var messageArguments = Array.prototype.slice.call(arguments);
		messageArguments.splice(1, 0, id);

		engine.SendMessage.apply(this, messageArguments);
		return deferred;
	};

	engine._Result = function (requestId) {
		var deferred = engine._ActiveRequests[requestId];
		if (deferred !== undefined)
		{
			delete engine._ActiveRequests[requestId];

			var resultArguments = Array.prototype.slice.call(arguments);
			resultArguments.shift();
			deferred.resolve.apply(deferred, resultArguments);
		} else // AltspaceVR, propagate any returned calls that we don't recognize to lower iframes (since they probabably made the call).
		{
		    propagateToIFrames({ isAltspaceIFrameResult: true, args: Array.prototype.slice.call(arguments) });
		}
	};

	engine._Errors = [ 'Success', 'ArgumentType', 'NoSuchMethod', 'NoResult' ];

	engine._ForEachError = function (errors, callback) {
		var length = errors.length;

		for (var i = 0; i < length; ++i) {
			callback(errors[i].first, errors[i].second);
		}
	};

	engine._MapErrors = function (errors) {
		var length = errors.length;

		for (var i = 0; i < length; ++i) {
			errors[i].first = engine._Errors[errors[i].first];
		}
	};

	engine._TriggerError = function (type, message) {
		engine.trigger('Error', type, message);
	};

	engine._OnError = function (requestId, errors) {
		engine._MapErrors(errors);

		if (requestId === null || requestId === 0) {
			engine._ForEachError(errors, engine._TriggerError);
		}
		else {
			var deferred = engine._ActiveRequests[requestId];

			delete engine._ActiveRequests[requestId];

			deferred.reject(errors);
		}
	};

	engine._eventHandles = {};

	engine._Register = function (eventName) {
		var trigger = (function (name, engine) {
			return function () {
				var eventArguments = [name];
				eventArguments.push.apply(eventArguments, arguments);
				engine.TriggerEvent.apply(this, eventArguments);
			};
		}(eventName, engine));

		engine._eventHandles[eventName] = engine.on(eventName, trigger);
	};

	engine._removeEventThunk = function (name) {
		var handle = engine._eventHandles[name];
		handle.clear();
		delete engine._eventHandles[name];
	};

	engine._Unregister = function (name) {
		if (typeof name === 'string') {
			engine._removeEventThunk(name);
		} else {
			name.forEach(engine._removeEventThunk, engine);
		}
	};

	function createMethodStub(name) {
		var stub = function() {
			var args = Array.prototype.slice.call(arguments);
			args.splice(0, 0, name, this._id);
			return engine.call.apply(engine, args);
		};
		return stub;
	}

	engine._boundTypes = {};

	engine._createInstance = function (args) {
		var type = args[0],
			id = args[1],
			methods = args[2],
			Constructor = engine._boundTypes[type];

		if (Constructor === undefined) {
			Constructor = function (id) {
				this._id = id;
			};
			Constructor.prototype.__Type = type;
			methods.forEach(function (name) {
				Constructor.prototype[name] = createMethodStub(type + '_' + name);
			});
			engine._boundTypes[type] = Constructor;
		}

		var instance = new Constructor(id);
		engine.__observeLifetime(instance);
		return instance;
	};

	engine._OnReady = function () {
		engine._BindingsReady = true;
		if (engine._WindowLoaded) {
			engine.trigger('Ready');
		}
	};

	engine._OnWindowLoaded = function () {
		engine._WindowLoaded = true;
		if (engine._BindingsReady) {
			engine.trigger('Ready');
		}
	};

	if (hasOnLoad) {
		global.onload = (function (originalWindowLoaded) {
			return function () {
				if (originalWindowLoaded) {
					originalWindowLoaded();
				}
				engine._OnWindowLoaded();
			};
		}(global.onload));
	} else {
		engine._WindowLoaded = true;
	}

	engine._coherentGlobalCanvas = document.createElement('canvas');
	engine._coherentGlobalCanvas.id     = "coherentGlobalCanvas";
	engine._coherentGlobalCanvas.width  = 1;
	engine._coherentGlobalCanvas.height = 1;
	engine._coherentGlobalCanvas.style.zIndex   = 0;
	engine._coherentGlobalCanvas.style.position = "absolute";
	engine._coherentGlobalCanvas.style.border   = "0px solid";

	engine._coherentLiveImageData = [];
	engine._coherentCreateImageData = function(name, guid) {
		var ctx = engine._coherentGlobalCanvas.getContext("2d");

		var coherentImage = ctx.coherentCreateImageData(guid);
		engine._coherentLiveImageData[name] = coherentImage;
	};
	engine._coherentUpdatedImageData = function(name) {
		engine._coherentLiveImageData[name].coherentUpdate();
		var canvases = document.getElementsByTagName('canvas');
		for(var i = 0; i < canvases.length; ++i) {
			if(!!canvases[i].onEngineImageDataUpdated) {
				canvases[i].onEngineImageDataUpdated(name,
					engine._coherentLiveImageData[name]);
			}
		}
	};

	engine.on("_coherentCreateImageData", engine._coherentCreateImageData);
	engine.on("_coherentUpdatedImageData", engine._coherentUpdatedImageData);

	engine.on('_Result', engine._Result, engine);
	engine.on('_Register', engine._Register, engine);
	engine.on('_Unregister', engine._Unregister, engine);
	engine.on('_OnReady', engine._OnReady, engine);
	engine.on('_OnError', engine._OnError, engine);

	engine.BindingsReady();

	return engine;
});


//     Underscore.js 1.6.0
//     http://underscorejs.org
//     (c) 2009-2014 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
//     Underscore may be freely distributed under the MIT license.

(function() {

  // Baseline setup
  // --------------

  // Establish the root object, `window` in the browser, or `exports` on the server.
  var root = this;

  // Save the previous value of the `_` variable.
  var previousUnderscore = root._;

  // Establish the object that gets returned to break out of a loop iteration.
  var breaker = {};

  // Save bytes in the minified (but not gzipped) version:
  var ArrayProto = Array.prototype, ObjProto = Object.prototype, FuncProto = Function.prototype;

  // Create quick reference variables for speed access to core prototypes.
  var
    push             = ArrayProto.push,
    slice            = ArrayProto.slice,
    concat           = ArrayProto.concat,
    toString         = ObjProto.toString,
    hasOwnProperty   = ObjProto.hasOwnProperty;

  // All **ECMAScript 5** native function implementations that we hope to use
  // are declared here.
  var
    nativeForEach      = ArrayProto.forEach,
    nativeMap          = ArrayProto.map,
    nativeReduce       = ArrayProto.reduce,
    nativeReduceRight  = ArrayProto.reduceRight,
    nativeFilter       = ArrayProto.filter,
    nativeEvery        = ArrayProto.every,
    nativeSome         = ArrayProto.some,
    nativeIndexOf      = ArrayProto.indexOf,
    nativeLastIndexOf  = ArrayProto.lastIndexOf,
    nativeIsArray      = Array.isArray,
    nativeKeys         = Object.keys,
    nativeBind         = FuncProto.bind;

  // Create a safe reference to the Underscore object for use below.
  var _ = function(obj) {
    if (obj instanceof _) return obj;
    if (!(this instanceof _)) return new _(obj);
    this._wrapped = obj;
  };

  // Export the Underscore object for **Node.js**, with
  // backwards-compatibility for the old `require()` API. If we're in
  // the browser, add `_` as a global object via a string identifier,
  // for Closure Compiler "advanced" mode.
  if (typeof exports !== 'undefined') {
    if (typeof module !== 'undefined' && module.exports) {
      exports = module.exports = _;
    }
    exports._ = _;
  } else {
    root._ = _;
  }

  // Current version.
  _.VERSION = '1.6.0';

  // Collection Functions
  // --------------------

  // The cornerstone, an `each` implementation, aka `forEach`.
  // Handles objects with the built-in `forEach`, arrays, and raw objects.
  // Delegates to **ECMAScript 5**'s native `forEach` if available.
  var each = _.each = _.forEach = function(obj, iterator, context) {
    if (obj == null) return obj;
    if (nativeForEach && obj.forEach === nativeForEach) {
      obj.forEach(iterator, context);
    } else if (obj.length === +obj.length) {
      for (var i = 0, length = obj.length; i < length; i++) {
        if (iterator.call(context, obj[i], i, obj) === breaker) return;
      }
    } else {
      var keys = _.keys(obj);
      for (var i = 0, length = keys.length; i < length; i++) {
        if (iterator.call(context, obj[keys[i]], keys[i], obj) === breaker) return;
      }
    }
    return obj;
  };

  // Return the results of applying the iterator to each element.
  // Delegates to **ECMAScript 5**'s native `map` if available.
  _.map = _.collect = function(obj, iterator, context) {
    var results = [];
    if (obj == null) return results;
    if (nativeMap && obj.map === nativeMap) return obj.map(iterator, context);
    each(obj, function(value, index, list) {
      results.push(iterator.call(context, value, index, list));
    });
    return results;
  };

  var reduceError = 'Reduce of empty array with no initial value';

  // **Reduce** builds up a single result from a list of values, aka `inject`,
  // or `foldl`. Delegates to **ECMAScript 5**'s native `reduce` if available.
  _.reduce = _.foldl = _.inject = function(obj, iterator, memo, context) {
    var initial = arguments.length > 2;
    if (obj == null) obj = [];
    if (nativeReduce && obj.reduce === nativeReduce) {
      if (context) iterator = _.bind(iterator, context);
      return initial ? obj.reduce(iterator, memo) : obj.reduce(iterator);
    }
    each(obj, function(value, index, list) {
      if (!initial) {
        memo = value;
        initial = true;
      } else {
        memo = iterator.call(context, memo, value, index, list);
      }
    });
    if (!initial) throw new TypeError(reduceError);
    return memo;
  };

  // The right-associative version of reduce, also known as `foldr`.
  // Delegates to **ECMAScript 5**'s native `reduceRight` if available.
  _.reduceRight = _.foldr = function(obj, iterator, memo, context) {
    var initial = arguments.length > 2;
    if (obj == null) obj = [];
    if (nativeReduceRight && obj.reduceRight === nativeReduceRight) {
      if (context) iterator = _.bind(iterator, context);
      return initial ? obj.reduceRight(iterator, memo) : obj.reduceRight(iterator);
    }
    var length = obj.length;
    if (length !== +length) {
      var keys = _.keys(obj);
      length = keys.length;
    }
    each(obj, function(value, index, list) {
      index = keys ? keys[--length] : --length;
      if (!initial) {
        memo = obj[index];
        initial = true;
      } else {
        memo = iterator.call(context, memo, obj[index], index, list);
      }
    });
    if (!initial) throw new TypeError(reduceError);
    return memo;
  };

  // Return the first value which passes a truth test. Aliased as `detect`.
  _.find = _.detect = function(obj, predicate, context) {
    var result;
    any(obj, function(value, index, list) {
      if (predicate.call(context, value, index, list)) {
        result = value;
        return true;
      }
    });
    return result;
  };

  // Return all the elements that pass a truth test.
  // Delegates to **ECMAScript 5**'s native `filter` if available.
  // Aliased as `select`.
  _.filter = _.select = function(obj, predicate, context) {
    var results = [];
    if (obj == null) return results;
    if (nativeFilter && obj.filter === nativeFilter) return obj.filter(predicate, context);
    each(obj, function(value, index, list) {
      if (predicate.call(context, value, index, list)) results.push(value);
    });
    return results;
  };

  // Return all the elements for which a truth test fails.
  _.reject = function(obj, predicate, context) {
    return _.filter(obj, function(value, index, list) {
      return !predicate.call(context, value, index, list);
    }, context);
  };

  // Determine whether all of the elements match a truth test.
  // Delegates to **ECMAScript 5**'s native `every` if available.
  // Aliased as `all`.
  _.every = _.all = function(obj, predicate, context) {
    predicate || (predicate = _.identity);
    var result = true;
    if (obj == null) return result;
    if (nativeEvery && obj.every === nativeEvery) return obj.every(predicate, context);
    each(obj, function(value, index, list) {
      if (!(result = result && predicate.call(context, value, index, list))) return breaker;
    });
    return !!result;
  };

  // Determine if at least one element in the object matches a truth test.
  // Delegates to **ECMAScript 5**'s native `some` if available.
  // Aliased as `any`.
  var any = _.some = _.any = function(obj, predicate, context) {
    predicate || (predicate = _.identity);
    var result = false;
    if (obj == null) return result;
    if (nativeSome && obj.some === nativeSome) return obj.some(predicate, context);
    each(obj, function(value, index, list) {
      if (result || (result = predicate.call(context, value, index, list))) return breaker;
    });
    return !!result;
  };

  // Determine if the array or object contains a given value (using `===`).
  // Aliased as `include`.
  _.contains = _.include = function(obj, target) {
    if (obj == null) return false;
    if (nativeIndexOf && obj.indexOf === nativeIndexOf) return obj.indexOf(target) != -1;
    return any(obj, function(value) {
      return value === target;
    });
  };

  // Invoke a method (with arguments) on every item in a collection.
  _.invoke = function(obj, method) {
    var args = slice.call(arguments, 2);
    var isFunc = _.isFunction(method);
    return _.map(obj, function(value) {
      return (isFunc ? method : value[method]).apply(value, args);
    });
  };

  // Convenience version of a common use case of `map`: fetching a property.
  _.pluck = function(obj, key) {
    return _.map(obj, _.property(key));
  };

  // Convenience version of a common use case of `filter`: selecting only objects
  // containing specific `key:value` pairs.
  _.where = function(obj, attrs) {
    return _.filter(obj, _.matches(attrs));
  };

  // Convenience version of a common use case of `find`: getting the first object
  // containing specific `key:value` pairs.
  _.findWhere = function(obj, attrs) {
    return _.find(obj, _.matches(attrs));
  };

  // Return the maximum element or (element-based computation).
  // Can't optimize arrays of integers longer than 65,535 elements.
  // See [WebKit Bug 80797](https://bugs.webkit.org/show_bug.cgi?id=80797)
  _.max = function(obj, iterator, context) {
    if (!iterator && _.isArray(obj) && obj[0] === +obj[0] && obj.length < 65535) {
      return Math.max.apply(Math, obj);
    }
    var result = -Infinity, lastComputed = -Infinity;
    each(obj, function(value, index, list) {
      var computed = iterator ? iterator.call(context, value, index, list) : value;
      if (computed > lastComputed) {
        result = value;
        lastComputed = computed;
      }
    });
    return result;
  };

  // Return the minimum element (or element-based computation).
  _.min = function(obj, iterator, context) {
    if (!iterator && _.isArray(obj) && obj[0] === +obj[0] && obj.length < 65535) {
      return Math.min.apply(Math, obj);
    }
    var result = Infinity, lastComputed = Infinity;
    each(obj, function(value, index, list) {
      var computed = iterator ? iterator.call(context, value, index, list) : value;
      if (computed < lastComputed) {
        result = value;
        lastComputed = computed;
      }
    });
    return result;
  };

  // Shuffle an array, using the modern version of the
  // [Fisher-Yates shuffle](http://en.wikipedia.org/wiki/Fisher–Yates_shuffle).
  _.shuffle = function(obj) {
    var rand;
    var index = 0;
    var shuffled = [];
    each(obj, function(value) {
      rand = _.random(index++);
      shuffled[index - 1] = shuffled[rand];
      shuffled[rand] = value;
    });
    return shuffled;
  };

  // Sample **n** random values from a collection.
  // If **n** is not specified, returns a single random element.
  // The internal `guard` argument allows it to work with `map`.
  _.sample = function(obj, n, guard) {
    if (n == null || guard) {
      if (obj.length !== +obj.length) obj = _.values(obj);
      return obj[_.random(obj.length - 1)];
    }
    return _.shuffle(obj).slice(0, Math.max(0, n));
  };

  // An internal function to generate lookup iterators.
  var lookupIterator = function(value) {
    if (value == null) return _.identity;
    if (_.isFunction(value)) return value;
    return _.property(value);
  };

  // Sort the object's values by a criterion produced by an iterator.
  _.sortBy = function(obj, iterator, context) {
    iterator = lookupIterator(iterator);
    return _.pluck(_.map(obj, function(value, index, list) {
      return {
        value: value,
        index: index,
        criteria: iterator.call(context, value, index, list)
      };
    }).sort(function(left, right) {
      var a = left.criteria;
      var b = right.criteria;
      if (a !== b) {
        if (a > b || a === void 0) return 1;
        if (a < b || b === void 0) return -1;
      }
      return left.index - right.index;
    }), 'value');
  };

  // An internal function used for aggregate "group by" operations.
  var group = function(behavior) {
    return function(obj, iterator, context) {
      var result = {};
      iterator = lookupIterator(iterator);
      each(obj, function(value, index) {
        var key = iterator.call(context, value, index, obj);
        behavior(result, key, value);
      });
      return result;
    };
  };

  // Groups the object's values by a criterion. Pass either a string attribute
  // to group by, or a function that returns the criterion.
  _.groupBy = group(function(result, key, value) {
    _.has(result, key) ? result[key].push(value) : result[key] = [value];
  });

  // Indexes the object's values by a criterion, similar to `groupBy`, but for
  // when you know that your index values will be unique.
  _.indexBy = group(function(result, key, value) {
    result[key] = value;
  });

  // Counts instances of an object that group by a certain criterion. Pass
  // either a string attribute to count by, or a function that returns the
  // criterion.
  _.countBy = group(function(result, key) {
    _.has(result, key) ? result[key]++ : result[key] = 1;
  });

  // Use a comparator function to figure out the smallest index at which
  // an object should be inserted so as to maintain order. Uses binary search.
  _.sortedIndex = function(array, obj, iterator, context) {
    iterator = lookupIterator(iterator);
    var value = iterator.call(context, obj);
    var low = 0, high = array.length;
    while (low < high) {
      var mid = (low + high) >>> 1;
      iterator.call(context, array[mid]) < value ? low = mid + 1 : high = mid;
    }
    return low;
  };

  // Safely create a real, live array from anything iterable.
  _.toArray = function(obj) {
    if (!obj) return [];
    if (_.isArray(obj)) return slice.call(obj);
    if (obj.length === +obj.length) return _.map(obj, _.identity);
    return _.values(obj);
  };

  // Return the number of elements in an object.
  _.size = function(obj) {
    if (obj == null) return 0;
    return (obj.length === +obj.length) ? obj.length : _.keys(obj).length;
  };

  // Array Functions
  // ---------------

  // Get the first element of an array. Passing **n** will return the first N
  // values in the array. Aliased as `head` and `take`. The **guard** check
  // allows it to work with `_.map`.
  _.first = _.head = _.take = function(array, n, guard) {
    if (array == null) return void 0;
    if ((n == null) || guard) return array[0];
    if (n < 0) return [];
    return slice.call(array, 0, n);
  };

  // Returns everything but the last entry of the array. Especially useful on
  // the arguments object. Passing **n** will return all the values in
  // the array, excluding the last N. The **guard** check allows it to work with
  // `_.map`.
  _.initial = function(array, n, guard) {
    return slice.call(array, 0, array.length - ((n == null) || guard ? 1 : n));
  };

  // Get the last element of an array. Passing **n** will return the last N
  // values in the array. The **guard** check allows it to work with `_.map`.
  _.last = function(array, n, guard) {
    if (array == null) return void 0;
    if ((n == null) || guard) return array[array.length - 1];
    return slice.call(array, Math.max(array.length - n, 0));
  };

  // Returns everything but the first entry of the array. Aliased as `tail` and `drop`.
  // Especially useful on the arguments object. Passing an **n** will return
  // the rest N values in the array. The **guard**
  // check allows it to work with `_.map`.
  _.rest = _.tail = _.drop = function(array, n, guard) {
    return slice.call(array, (n == null) || guard ? 1 : n);
  };

  // Trim out all falsy values from an array.
  _.compact = function(array) {
    return _.filter(array, _.identity);
  };

  // Internal implementation of a recursive `flatten` function.
  var flatten = function(input, shallow, output) {
    if (shallow && _.every(input, _.isArray)) {
      return concat.apply(output, input);
    }
    each(input, function(value) {
      if (_.isArray(value) || _.isArguments(value)) {
        shallow ? push.apply(output, value) : flatten(value, shallow, output);
      } else {
        output.push(value);
      }
    });
    return output;
  };

  // Flatten out an array, either recursively (by default), or just one level.
  _.flatten = function(array, shallow) {
    return flatten(array, shallow, []);
  };

  // Return a version of the array that does not contain the specified value(s).
  _.without = function(array) {
    return _.difference(array, slice.call(arguments, 1));
  };

  // Split an array into two arrays: one whose elements all satisfy the given
  // predicate, and one whose elements all do not satisfy the predicate.
  _.partition = function(array, predicate) {
    var pass = [], fail = [];
    each(array, function(elem) {
      (predicate(elem) ? pass : fail).push(elem);
    });
    return [pass, fail];
  };

  // Produce a duplicate-free version of the array. If the array has already
  // been sorted, you have the option of using a faster algorithm.
  // Aliased as `unique`.
  _.uniq = _.unique = function(array, isSorted, iterator, context) {
    if (_.isFunction(isSorted)) {
      context = iterator;
      iterator = isSorted;
      isSorted = false;
    }
    var initial = iterator ? _.map(array, iterator, context) : array;
    var results = [];
    var seen = [];
    each(initial, function(value, index) {
      if (isSorted ? (!index || seen[seen.length - 1] !== value) : !_.contains(seen, value)) {
        seen.push(value);
        results.push(array[index]);
      }
    });
    return results;
  };

  // Produce an array that contains the union: each distinct element from all of
  // the passed-in arrays.
  _.union = function() {
    return _.uniq(_.flatten(arguments, true));
  };

  // Produce an array that contains every item shared between all the
  // passed-in arrays.
  _.intersection = function(array) {
    var rest = slice.call(arguments, 1);
    return _.filter(_.uniq(array), function(item) {
      return _.every(rest, function(other) {
        return _.contains(other, item);
      });
    });
  };

  // Take the difference between one array and a number of other arrays.
  // Only the elements present in just the first array will remain.
  _.difference = function(array) {
    var rest = concat.apply(ArrayProto, slice.call(arguments, 1));
    return _.filter(array, function(value){ return !_.contains(rest, value); });
  };

  // Zip together multiple lists into a single array -- elements that share
  // an index go together.
  _.zip = function() {
    var length = _.max(_.pluck(arguments, 'length').concat(0));
    var results = new Array(length);
    for (var i = 0; i < length; i++) {
      results[i] = _.pluck(arguments, '' + i);
    }
    return results;
  };

  // Converts lists into objects. Pass either a single array of `[key, value]`
  // pairs, or two parallel arrays of the same length -- one of keys, and one of
  // the corresponding values.
  _.object = function(list, values) {
    if (list == null) return {};
    var result = {};
    for (var i = 0, length = list.length; i < length; i++) {
      if (values) {
        result[list[i]] = values[i];
      } else {
        result[list[i][0]] = list[i][1];
      }
    }
    return result;
  };

  // If the browser doesn't supply us with indexOf (I'm looking at you, **MSIE**),
  // we need this function. Return the position of the first occurrence of an
  // item in an array, or -1 if the item is not included in the array.
  // Delegates to **ECMAScript 5**'s native `indexOf` if available.
  // If the array is large and already in sort order, pass `true`
  // for **isSorted** to use binary search.
  _.indexOf = function(array, item, isSorted) {
    if (array == null) return -1;
    var i = 0, length = array.length;
    if (isSorted) {
      if (typeof isSorted == 'number') {
        i = (isSorted < 0 ? Math.max(0, length + isSorted) : isSorted);
      } else {
        i = _.sortedIndex(array, item);
        return array[i] === item ? i : -1;
      }
    }
    if (nativeIndexOf && array.indexOf === nativeIndexOf) return array.indexOf(item, isSorted);
    for (; i < length; i++) if (array[i] === item) return i;
    return -1;
  };

  // Delegates to **ECMAScript 5**'s native `lastIndexOf` if available.
  _.lastIndexOf = function(array, item, from) {
    if (array == null) return -1;
    var hasIndex = from != null;
    if (nativeLastIndexOf && array.lastIndexOf === nativeLastIndexOf) {
      return hasIndex ? array.lastIndexOf(item, from) : array.lastIndexOf(item);
    }
    var i = (hasIndex ? from : array.length);
    while (i--) if (array[i] === item) return i;
    return -1;
  };

  // Generate an integer Array containing an arithmetic progression. A port of
  // the native Python `range()` function. See
  // [the Python documentation](http://docs.python.org/library/functions.html#range).
  _.range = function(start, stop, step) {
    if (arguments.length <= 1) {
      stop = start || 0;
      start = 0;
    }
    step = arguments[2] || 1;

    var length = Math.max(Math.ceil((stop - start) / step), 0);
    var idx = 0;
    var range = new Array(length);

    while(idx < length) {
      range[idx++] = start;
      start += step;
    }

    return range;
  };

  // Function (ahem) Functions
  // ------------------

  // Reusable constructor function for prototype setting.
  var ctor = function(){};

  // Create a function bound to a given object (assigning `this`, and arguments,
  // optionally). Delegates to **ECMAScript 5**'s native `Function.bind` if
  // available.
  _.bind = function(func, context) {
    var args, bound;
    if (nativeBind && func.bind === nativeBind) return nativeBind.apply(func, slice.call(arguments, 1));
    if (!_.isFunction(func)) throw new TypeError;
    args = slice.call(arguments, 2);
    return bound = function() {
      if (!(this instanceof bound)) return func.apply(context, args.concat(slice.call(arguments)));
      ctor.prototype = func.prototype;
      var self = new ctor;
      ctor.prototype = null;
      var result = func.apply(self, args.concat(slice.call(arguments)));
      if (Object(result) === result) return result;
      return self;
    };
  };

  // Partially apply a function by creating a version that has had some of its
  // arguments pre-filled, without changing its dynamic `this` context. _ acts
  // as a placeholder, allowing any combination of arguments to be pre-filled.
  _.partial = function(func) {
    var boundArgs = slice.call(arguments, 1);
    return function() {
      var position = 0;
      var args = boundArgs.slice();
      for (var i = 0, length = args.length; i < length; i++) {
        if (args[i] === _) args[i] = arguments[position++];
      }
      while (position < arguments.length) args.push(arguments[position++]);
      return func.apply(this, args);
    };
  };

  // Bind a number of an object's methods to that object. Remaining arguments
  // are the method names to be bound. Useful for ensuring that all callbacks
  // defined on an object belong to it.
  _.bindAll = function(obj) {
    var funcs = slice.call(arguments, 1);
    if (funcs.length === 0) throw new Error('bindAll must be passed function names');
    each(funcs, function(f) { obj[f] = _.bind(obj[f], obj); });
    return obj;
  };

  // Memoize an expensive function by storing its results.
  _.memoize = function(func, hasher) {
    var memo = {};
    hasher || (hasher = _.identity);
    return function() {
      var key = hasher.apply(this, arguments);
      return _.has(memo, key) ? memo[key] : (memo[key] = func.apply(this, arguments));
    };
  };

  // Delays a function for the given number of milliseconds, and then calls
  // it with the arguments supplied.
  _.delay = function(func, wait) {
    var args = slice.call(arguments, 2);
    return setTimeout(function(){ return func.apply(null, args); }, wait);
  };

  // Defers a function, scheduling it to run after the current call stack has
  // cleared.
  _.defer = function(func) {
    return _.delay.apply(_, [func, 1].concat(slice.call(arguments, 1)));
  };

  // Returns a function, that, when invoked, will only be triggered at most once
  // during a given window of time. Normally, the throttled function will run
  // as much as it can, without ever going more than once per `wait` duration;
  // but if you'd like to disable the execution on the leading edge, pass
  // `{leading: false}`. To disable execution on the trailing edge, ditto.
  _.throttle = function(func, wait, options) {
    var context, args, result;
    var timeout = null;
    var previous = 0;
    options || (options = {});
    var later = function() {
      previous = options.leading === false ? 0 : _.now();
      timeout = null;
      result = func.apply(context, args);
      context = args = null;
    };
    return function() {
      var now = _.now();
      if (!previous && options.leading === false) previous = now;
      var remaining = wait - (now - previous);
      context = this;
      args = arguments;
      if (remaining <= 0) {
        clearTimeout(timeout);
        timeout = null;
        previous = now;
        result = func.apply(context, args);
        context = args = null;
      } else if (!timeout && options.trailing !== false) {
        timeout = setTimeout(later, remaining);
      }
      return result;
    };
  };

  // Returns a function, that, as long as it continues to be invoked, will not
  // be triggered. The function will be called after it stops being called for
  // N milliseconds. If `immediate` is passed, trigger the function on the
  // leading edge, instead of the trailing.
  _.debounce = function(func, wait, immediate) {
    var timeout, args, context, timestamp, result;

    var later = function() {
      var last = _.now() - timestamp;
      if (last < wait) {
        timeout = setTimeout(later, wait - last);
      } else {
        timeout = null;
        if (!immediate) {
          result = func.apply(context, args);
          context = args = null;
        }
      }
    };

    return function() {
      context = this;
      args = arguments;
      timestamp = _.now();
      var callNow = immediate && !timeout;
      if (!timeout) {
        timeout = setTimeout(later, wait);
      }
      if (callNow) {
        result = func.apply(context, args);
        context = args = null;
      }

      return result;
    };
  };

  // Returns a function that will be executed at most one time, no matter how
  // often you call it. Useful for lazy initialization.
  _.once = function(func) {
    var ran = false, memo;
    return function() {
      if (ran) return memo;
      ran = true;
      memo = func.apply(this, arguments);
      func = null;
      return memo;
    };
  };

  // Returns the first function passed as an argument to the second,
  // allowing you to adjust arguments, run code before and after, and
  // conditionally execute the original function.
  _.wrap = function(func, wrapper) {
    return _.partial(wrapper, func);
  };

  // Returns a function that is the composition of a list of functions, each
  // consuming the return value of the function that follows.
  _.compose = function() {
    var funcs = arguments;
    return function() {
      var args = arguments;
      for (var i = funcs.length - 1; i >= 0; i--) {
        args = [funcs[i].apply(this, args)];
      }
      return args[0];
    };
  };

  // Returns a function that will only be executed after being called N times.
  _.after = function(times, func) {
    return function() {
      if (--times < 1) {
        return func.apply(this, arguments);
      }
    };
  };

  // Object Functions
  // ----------------

  // Retrieve the names of an object's properties.
  // Delegates to **ECMAScript 5**'s native `Object.keys`
  _.keys = function(obj) {
    if (!_.isObject(obj)) return [];
    if (nativeKeys) return nativeKeys(obj);
    var keys = [];
    for (var key in obj) if (_.has(obj, key)) keys.push(key);
    return keys;
  };

  // Retrieve the values of an object's properties.
  _.values = function(obj) {
    var keys = _.keys(obj);
    var length = keys.length;
    var values = new Array(length);
    for (var i = 0; i < length; i++) {
      values[i] = obj[keys[i]];
    }
    return values;
  };

  // Convert an object into a list of `[key, value]` pairs.
  _.pairs = function(obj) {
    var keys = _.keys(obj);
    var length = keys.length;
    var pairs = new Array(length);
    for (var i = 0; i < length; i++) {
      pairs[i] = [keys[i], obj[keys[i]]];
    }
    return pairs;
  };

  // Invert the keys and values of an object. The values must be serializable.
  _.invert = function(obj) {
    var result = {};
    var keys = _.keys(obj);
    for (var i = 0, length = keys.length; i < length; i++) {
      result[obj[keys[i]]] = keys[i];
    }
    return result;
  };

  // Return a sorted list of the function names available on the object.
  // Aliased as `methods`
  _.functions = _.methods = function(obj) {
    var names = [];
    for (var key in obj) {
      if (_.isFunction(obj[key])) names.push(key);
    }
    return names.sort();
  };

  // Extend a given object with all the properties in passed-in object(s).
  _.extend = function(obj) {
    each(slice.call(arguments, 1), function(source) {
      if (source) {
        for (var prop in source) {
          obj[prop] = source[prop];
        }
      }
    });
    return obj;
  };

  // Return a copy of the object only containing the whitelisted properties.
  _.pick = function(obj) {
    var copy = {};
    var keys = concat.apply(ArrayProto, slice.call(arguments, 1));
    each(keys, function(key) {
      if (key in obj) copy[key] = obj[key];
    });
    return copy;
  };

   // Return a copy of the object without the blacklisted properties.
  _.omit = function(obj) {
    var copy = {};
    var keys = concat.apply(ArrayProto, slice.call(arguments, 1));
    for (var key in obj) {
      if (!_.contains(keys, key)) copy[key] = obj[key];
    }
    return copy;
  };

  // Fill in a given object with default properties.
  _.defaults = function(obj) {
    each(slice.call(arguments, 1), function(source) {
      if (source) {
        for (var prop in source) {
          if (obj[prop] === void 0) obj[prop] = source[prop];
        }
      }
    });
    return obj;
  };

  // Create a (shallow-cloned) duplicate of an object.
  _.clone = function(obj) {
    if (!_.isObject(obj)) return obj;
    return _.isArray(obj) ? obj.slice() : _.extend({}, obj);
  };

  // Invokes interceptor with the obj, and then returns obj.
  // The primary purpose of this method is to "tap into" a method chain, in
  // order to perform operations on intermediate results within the chain.
  _.tap = function(obj, interceptor) {
    interceptor(obj);
    return obj;
  };

  // Internal recursive comparison function for `isEqual`.
  var eq = function(a, b, aStack, bStack) {
    // Identical objects are equal. `0 === -0`, but they aren't identical.
    // See the [Harmony `egal` proposal](http://wiki.ecmascript.org/doku.php?id=harmony:egal).
    if (a === b) return a !== 0 || 1 / a == 1 / b;
    // A strict comparison is necessary because `null == undefined`.
    if (a == null || b == null) return a === b;
    // Unwrap any wrapped objects.
    if (a instanceof _) a = a._wrapped;
    if (b instanceof _) b = b._wrapped;
    // Compare `[[Class]]` names.
    var className = toString.call(a);
    if (className != toString.call(b)) return false;
    switch (className) {
      // Strings, numbers, dates, and booleans are compared by value.
      case '[object String]':
        // Primitives and their corresponding object wrappers are equivalent; thus, `"5"` is
        // equivalent to `new String("5")`.
        return a == String(b);
      case '[object Number]':
        // `NaN`s are equivalent, but non-reflexive. An `egal` comparison is performed for
        // other numeric values.
        return a != +a ? b != +b : (a == 0 ? 1 / a == 1 / b : a == +b);
      case '[object Date]':
      case '[object Boolean]':
        // Coerce dates and booleans to numeric primitive values. Dates are compared by their
        // millisecond representations. Note that invalid dates with millisecond representations
        // of `NaN` are not equivalent.
        return +a == +b;
      // RegExps are compared by their source patterns and flags.
      case '[object RegExp]':
        return a.source == b.source &&
               a.global == b.global &&
               a.multiline == b.multiline &&
               a.ignoreCase == b.ignoreCase;
    }
    if (typeof a != 'object' || typeof b != 'object') return false;
    // Assume equality for cyclic structures. The algorithm for detecting cyclic
    // structures is adapted from ES 5.1 section 15.12.3, abstract operation `JO`.
    var length = aStack.length;
    while (length--) {
      // Linear search. Performance is inversely proportional to the number of
      // unique nested structures.
      if (aStack[length] == a) return bStack[length] == b;
    }
    // Objects with different constructors are not equivalent, but `Object`s
    // from different frames are.
    var aCtor = a.constructor, bCtor = b.constructor;
    if (aCtor !== bCtor && !(_.isFunction(aCtor) && (aCtor instanceof aCtor) &&
                             _.isFunction(bCtor) && (bCtor instanceof bCtor))
                        && ('constructor' in a && 'constructor' in b)) {
      return false;
    }
    // Add the first object to the stack of traversed objects.
    aStack.push(a);
    bStack.push(b);
    var size = 0, result = true;
    // Recursively compare objects and arrays.
    if (className == '[object Array]') {
      // Compare array lengths to determine if a deep comparison is necessary.
      size = a.length;
      result = size == b.length;
      if (result) {
        // Deep compare the contents, ignoring non-numeric properties.
        while (size--) {
          if (!(result = eq(a[size], b[size], aStack, bStack))) break;
        }
      }
    } else {
      // Deep compare objects.
      for (var key in a) {
        if (_.has(a, key)) {
          // Count the expected number of properties.
          size++;
          // Deep compare each member.
          if (!(result = _.has(b, key) && eq(a[key], b[key], aStack, bStack))) break;
        }
      }
      // Ensure that both objects contain the same number of properties.
      if (result) {
        for (key in b) {
          if (_.has(b, key) && !(size--)) break;
        }
        result = !size;
      }
    }
    // Remove the first object from the stack of traversed objects.
    aStack.pop();
    bStack.pop();
    return result;
  };

  // Perform a deep comparison to check if two objects are equal.
  _.isEqual = function(a, b) {
    return eq(a, b, [], []);
  };

  // Is a given array, string, or object empty?
  // An "empty" object has no enumerable own-properties.
  _.isEmpty = function(obj) {
    if (obj == null) return true;
    if (_.isArray(obj) || _.isString(obj)) return obj.length === 0;
    for (var key in obj) if (_.has(obj, key)) return false;
    return true;
  };

  // Is a given value a DOM element?
  _.isElement = function(obj) {
    return !!(obj && obj.nodeType === 1);
  };

  // Is a given value an array?
  // Delegates to ECMA5's native Array.isArray
  _.isArray = nativeIsArray || function(obj) {
    return toString.call(obj) == '[object Array]';
  };

  // Is a given variable an object?
  _.isObject = function(obj) {
    return obj === Object(obj);
  };

  // Add some isType methods: isArguments, isFunction, isString, isNumber, isDate, isRegExp.
  each(['Arguments', 'Function', 'String', 'Number', 'Date', 'RegExp'], function(name) {
    _['is' + name] = function(obj) {
      return toString.call(obj) == '[object ' + name + ']';
    };
  });

  // Define a fallback version of the method in browsers (ahem, IE), where
  // there isn't any inspectable "Arguments" type.
  if (!_.isArguments(arguments)) {
    _.isArguments = function(obj) {
      return !!(obj && _.has(obj, 'callee'));
    };
  }

  // Optimize `isFunction` if appropriate.
  if (typeof (/./) !== 'function') {
    _.isFunction = function(obj) {
      return typeof obj === 'function';
    };
  }

  // Is a given object a finite number?
  _.isFinite = function(obj) {
    return isFinite(obj) && !isNaN(parseFloat(obj));
  };

  // Is the given value `NaN`? (NaN is the only number which does not equal itself).
  _.isNaN = function(obj) {
    return _.isNumber(obj) && obj != +obj;
  };

  // Is a given value a boolean?
  _.isBoolean = function(obj) {
    return obj === true || obj === false || toString.call(obj) == '[object Boolean]';
  };

  // Is a given value equal to null?
  _.isNull = function(obj) {
    return obj === null;
  };

  // Is a given variable undefined?
  _.isUndefined = function(obj) {
    return obj === void 0;
  };

  // Shortcut function for checking if an object has a given property directly
  // on itself (in other words, not on a prototype).
  _.has = function(obj, key) {
    return hasOwnProperty.call(obj, key);
  };

  // Utility Functions
  // -----------------

  // Run Underscore.js in *noConflict* mode, returning the `_` variable to its
  // previous owner. Returns a reference to the Underscore object.
  _.noConflict = function() {
    root._ = previousUnderscore;
    return this;
  };

  // Keep the identity function around for default iterators.
  _.identity = function(value) {
    return value;
  };

  _.constant = function(value) {
    return function () {
      return value;
    };
  };

  _.property = function(key) {
    return function(obj) {
      return obj[key];
    };
  };

  // Returns a predicate for checking whether an object has a given set of `key:value` pairs.
  _.matches = function(attrs) {
    return function(obj) {
      if (obj === attrs) return true; //avoid comparing an object to itself.
      for (var key in attrs) {
        if (attrs[key] !== obj[key])
          return false;
      }
      return true;
    }
  };

  // Run a function **n** times.
  _.times = function(n, iterator, context) {
    var accum = Array(Math.max(0, n));
    for (var i = 0; i < n; i++) accum[i] = iterator.call(context, i);
    return accum;
  };

  // Return a random integer between min and max (inclusive).
  _.random = function(min, max) {
    if (max == null) {
      max = min;
      min = 0;
    }
    return min + Math.floor(Math.random() * (max - min + 1));
  };

  // A (possibly faster) way to get the current timestamp as an integer.
  _.now = Date.now || function() { return new Date().getTime(); };

  // List of HTML entities for escaping.
  var entityMap = {
    escape: {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#x27;'
    }
  };
  entityMap.unescape = _.invert(entityMap.escape);

  // Regexes containing the keys and values listed immediately above.
  var entityRegexes = {
    escape:   new RegExp('[' + _.keys(entityMap.escape).join('') + ']', 'g'),
    unescape: new RegExp('(' + _.keys(entityMap.unescape).join('|') + ')', 'g')
  };

  // Functions for escaping and unescaping strings to/from HTML interpolation.
  _.each(['escape', 'unescape'], function(method) {
    _[method] = function(string) {
      if (string == null) return '';
      return ('' + string).replace(entityRegexes[method], function(match) {
        return entityMap[method][match];
      });
    };
  });

  // If the value of the named `property` is a function then invoke it with the
  // `object` as context; otherwise, return it.
  _.result = function(object, property) {
    if (object == null) return void 0;
    var value = object[property];
    return _.isFunction(value) ? value.call(object) : value;
  };

  // Add your own custom functions to the Underscore object.
  _.mixin = function(obj) {
    each(_.functions(obj), function(name) {
      var func = _[name] = obj[name];
      _.prototype[name] = function() {
        var args = [this._wrapped];
        push.apply(args, arguments);
        return result.call(this, func.apply(_, args));
      };
    });
  };

  // Generate a unique integer id (unique within the entire client session).
  // Useful for temporary DOM ids.
  var idCounter = 0;
  _.uniqueId = function(prefix) {
    var id = ++idCounter + '';
    return prefix ? prefix + id : id;
  };

  // By default, Underscore uses ERB-style template delimiters, change the
  // following template settings to use alternative delimiters.
  _.templateSettings = {
    evaluate    : /<%([\s\S]+?)%>/g,
    interpolate : /<%=([\s\S]+?)%>/g,
    escape      : /<%-([\s\S]+?)%>/g
  };

  // When customizing `templateSettings`, if you don't want to define an
  // interpolation, evaluation or escaping regex, we need one that is
  // guaranteed not to match.
  var noMatch = /(.)^/;

  // Certain characters need to be escaped so that they can be put into a
  // string literal.
  var escapes = {
    "'":      "'",
    '\\':     '\\',
    '\r':     'r',
    '\n':     'n',
    '\t':     't',
    '\u2028': 'u2028',
    '\u2029': 'u2029'
  };

  var escaper = /\\|'|\r|\n|\t|\u2028|\u2029/g;

  // JavaScript micro-templating, similar to John Resig's implementation.
  // Underscore templating handles arbitrary delimiters, preserves whitespace,
  // and correctly escapes quotes within interpolated code.
  _.template = function(text, data, settings) {
    var render;
    settings = _.defaults({}, settings, _.templateSettings);

    // Combine delimiters into one regular expression via alternation.
    var matcher = new RegExp([
      (settings.escape || noMatch).source,
      (settings.interpolate || noMatch).source,
      (settings.evaluate || noMatch).source
    ].join('|') + '|$', 'g');

    // Compile the template source, escaping string literals appropriately.
    var index = 0;
    var source = "__p+='";
    text.replace(matcher, function(match, escape, interpolate, evaluate, offset) {
      source += text.slice(index, offset)
        .replace(escaper, function(match) { return '\\' + escapes[match]; });

      if (escape) {
        source += "'+\n((__t=(" + escape + "))==null?'':_.escape(__t))+\n'";
      }
      if (interpolate) {
        source += "'+\n((__t=(" + interpolate + "))==null?'':__t)+\n'";
      }
      if (evaluate) {
        source += "';\n" + evaluate + "\n__p+='";
      }
      index = offset + match.length;
      return match;
    });
    source += "';\n";

    // If a variable is not specified, place data values in local scope.
    if (!settings.variable) source = 'with(obj||{}){\n' + source + '}\n';

    source = "var __t,__p='',__j=Array.prototype.join," +
      "print=function(){__p+=__j.call(arguments,'');};\n" +
      source + "return __p;\n";

    try {
      render = new Function(settings.variable || 'obj', '_', source);
    } catch (e) {
      e.source = source;
      throw e;
    }

    if (data) return render(data, _);
    var template = function(data) {
      return render.call(this, data, _);
    };

    // Provide the compiled function source as a convenience for precompilation.
    template.source = 'function(' + (settings.variable || 'obj') + '){\n' + source + '}';

    return template;
  };

  // Add a "chain" function, which will delegate to the wrapper.
  _.chain = function(obj) {
    return _(obj).chain();
  };

  // OOP
  // ---------------
  // If Underscore is called as a function, it returns a wrapped object that
  // can be used OO-style. This wrapper holds altered versions of all the
  // underscore functions. Wrapped objects may be chained.

  // Helper function to continue chaining intermediate results.
  var result = function(obj) {
    return this._chain ? _(obj).chain() : obj;
  };

  // Add all of the Underscore functions to the wrapper object.
  _.mixin(_);

  // Add all mutator Array functions to the wrapper.
  each(['pop', 'push', 'reverse', 'shift', 'sort', 'splice', 'unshift'], function(name) {
    var method = ArrayProto[name];
    _.prototype[name] = function() {
      var obj = this._wrapped;
      method.apply(obj, arguments);
      if ((name == 'shift' || name == 'splice') && obj.length === 0) delete obj[0];
      return result.call(this, obj);
    };
  });

  // Add all accessor Array functions to the wrapper.
  each(['concat', 'join', 'slice'], function(name) {
    var method = ArrayProto[name];
    _.prototype[name] = function() {
      return result.call(this, method.apply(this._wrapped, arguments));
    };
  });

  _.extend(_.prototype, {

    // Start chaining a wrapped Underscore object.
    chain: function() {
      this._chain = true;
      return this;
    },

    // Extracts the result from a wrapped and chained object.
    value: function() {
      return this._wrapped;
    }

  });

  // AMD registration happens at the end for compatibility with AMD loaders
  // that may not enforce next-turn semantics on modules. Even though general
  // practice for AMD registration is to be anonymous, underscore registers
  // as a named module because, like jQuery, it is a base library that is
  // popular enough to be bundled in a third party lib, but not be part of
  // an AMD load request. Those cases could generate an error when an
  // anonymous define() is called outside of a loader request.
  if (typeof define === 'function' && define.amd) {
    define('underscore', [], function() {
      return _;
    });
  }
}).call(this);

(function(t,e){if(typeof define==="function"&&define.amd){define(["underscore","jquery","exports"],function(i,r,s){t.Backbone=e(t,s,i,r)})}else if(typeof exports!=="undefined"){var i=require("underscore");e(t,exports,i)}else{t.Backbone=e(t,{},t._,t.jQuery||t.Zepto||t.ender||t.$)}})(this,function(t,e,i,r){var s=t.Backbone;var n=[];var a=n.push;var o=n.slice;var h=n.splice;e.VERSION="1.1.2";e.$=r;e.noConflict=function(){t.Backbone=s;return this};e.emulateHTTP=false;e.emulateJSON=false;var u=e.Events={on:function(t,e,i){if(!c(this,"on",t,[e,i])||!e)return this;this._events||(this._events={});var r=this._events[t]||(this._events[t]=[]);r.push({callback:e,context:i,ctx:i||this});return this},once:function(t,e,r){if(!c(this,"once",t,[e,r])||!e)return this;var s=this;var n=i.once(function(){s.off(t,n);e.apply(this,arguments)});n._callback=e;return this.on(t,n,r)},off:function(t,e,r){var s,n,a,o,h,u,l,f;if(!this._events||!c(this,"off",t,[e,r]))return this;if(!t&&!e&&!r){this._events=void 0;return this}o=t?[t]:i.keys(this._events);for(h=0,u=o.length;h<u;h++){t=o[h];if(a=this._events[t]){this._events[t]=s=[];if(e||r){for(l=0,f=a.length;l<f;l++){n=a[l];if(e&&e!==n.callback&&e!==n.callback._callback||r&&r!==n.context){s.push(n)}}}if(!s.length)delete this._events[t]}}return this},trigger:function(t){if(!this._events)return this;var e=o.call(arguments,1);if(!c(this,"trigger",t,e))return this;var i=this._events[t];var r=this._events.all;if(i)f(i,e);if(r)f(r,arguments);return this},stopListening:function(t,e,r){var s=this._listeningTo;if(!s)return this;var n=!e&&!r;if(!r&&typeof e==="object")r=this;if(t)(s={})[t._listenId]=t;for(var a in s){t=s[a];t.off(e,r,this);if(n||i.isEmpty(t._events))delete this._listeningTo[a]}return this}};var l=/\s+/;var c=function(t,e,i,r){if(!i)return true;if(typeof i==="object"){for(var s in i){t[e].apply(t,[s,i[s]].concat(r))}return false}if(l.test(i)){var n=i.split(l);for(var a=0,o=n.length;a<o;a++){t[e].apply(t,[n[a]].concat(r))}return false}return true};var f=function(t,e){var i,r=-1,s=t.length,n=e[0],a=e[1],o=e[2];switch(e.length){case 0:while(++r<s)(i=t[r]).callback.call(i.ctx);return;case 1:while(++r<s)(i=t[r]).callback.call(i.ctx,n);return;case 2:while(++r<s)(i=t[r]).callback.call(i.ctx,n,a);return;case 3:while(++r<s)(i=t[r]).callback.call(i.ctx,n,a,o);return;default:while(++r<s)(i=t[r]).callback.apply(i.ctx,e);return}};var d={listenTo:"on",listenToOnce:"once"};i.each(d,function(t,e){u[e]=function(e,r,s){var n=this._listeningTo||(this._listeningTo={});var a=e._listenId||(e._listenId=i.uniqueId("l"));n[a]=e;if(!s&&typeof r==="object")s=this;e[t](r,s,this);return this}});u.bind=u.on;u.unbind=u.off;i.extend(e,u);var p=e.Model=function(t,e){var r=t||{};e||(e={});this.cid=i.uniqueId("c");this.attributes={};if(e.collection)this.collection=e.collection;if(e.parse)r=this.parse(r,e)||{};r=i.defaults({},r,i.result(this,"defaults"));this.set(r,e);this.changed={};this.initialize.apply(this,arguments)};i.extend(p.prototype,u,{changed:null,validationError:null,idAttribute:"id",initialize:function(){},toJSON:function(t){return i.clone(this.attributes)},sync:function(){return e.sync.apply(this,arguments)},get:function(t){return this.attributes[t]},escape:function(t){return i.escape(this.get(t))},has:function(t){return this.get(t)!=null},set:function(t,e,r){var s,n,a,o,h,u,l,c;if(t==null)return this;if(typeof t==="object"){n=t;r=e}else{(n={})[t]=e}r||(r={});if(!this._validate(n,r))return false;a=r.unset;h=r.silent;o=[];u=this._changing;this._changing=true;if(!u){this._previousAttributes=i.clone(this.attributes);this.changed={}}c=this.attributes,l=this._previousAttributes;if(this.idAttribute in n)this.id=n[this.idAttribute];for(s in n){e=n[s];if(!i.isEqual(c[s],e))o.push(s);if(!i.isEqual(l[s],e)){this.changed[s]=e}else{delete this.changed[s]}a?delete c[s]:c[s]=e}if(!h){if(o.length)this._pending=r;for(var f=0,d=o.length;f<d;f++){this.trigger("change:"+o[f],this,c[o[f]],r)}}if(u)return this;if(!h){while(this._pending){r=this._pending;this._pending=false;this.trigger("change",this,r)}}this._pending=false;this._changing=false;return this},unset:function(t,e){return this.set(t,void 0,i.extend({},e,{unset:true}))},clear:function(t){var e={};for(var r in this.attributes)e[r]=void 0;return this.set(e,i.extend({},t,{unset:true}))},hasChanged:function(t){if(t==null)return!i.isEmpty(this.changed);return i.has(this.changed,t)},changedAttributes:function(t){if(!t)return this.hasChanged()?i.clone(this.changed):false;var e,r=false;var s=this._changing?this._previousAttributes:this.attributes;for(var n in t){if(i.isEqual(s[n],e=t[n]))continue;(r||(r={}))[n]=e}return r},previous:function(t){if(t==null||!this._previousAttributes)return null;return this._previousAttributes[t]},previousAttributes:function(){return i.clone(this._previousAttributes)},fetch:function(t){t=t?i.clone(t):{};if(t.parse===void 0)t.parse=true;var e=this;var r=t.success;t.success=function(i){if(!e.set(e.parse(i,t),t))return false;if(r)r(e,i,t);e.trigger("sync",e,i,t)};q(this,t);return this.sync("read",this,t)},save:function(t,e,r){var s,n,a,o=this.attributes;if(t==null||typeof t==="object"){s=t;r=e}else{(s={})[t]=e}r=i.extend({validate:true},r);if(s&&!r.wait){if(!this.set(s,r))return false}else{if(!this._validate(s,r))return false}if(s&&r.wait){this.attributes=i.extend({},o,s)}if(r.parse===void 0)r.parse=true;var h=this;var u=r.success;r.success=function(t){h.attributes=o;var e=h.parse(t,r);if(r.wait)e=i.extend(s||{},e);if(i.isObject(e)&&!h.set(e,r)){return false}if(u)u(h,t,r);h.trigger("sync",h,t,r)};q(this,r);n=this.isNew()?"create":r.patch?"patch":"update";if(n==="patch")r.attrs=s;a=this.sync(n,this,r);if(s&&r.wait)this.attributes=o;return a},destroy:function(t){t=t?i.clone(t):{};var e=this;var r=t.success;var s=function(){e.trigger("destroy",e,e.collection,t)};t.success=function(i){if(t.wait||e.isNew())s();if(r)r(e,i,t);if(!e.isNew())e.trigger("sync",e,i,t)};if(this.isNew()){t.success();return false}q(this,t);var n=this.sync("delete",this,t);if(!t.wait)s();return n},url:function(){var t=i.result(this,"urlRoot")||i.result(this.collection,"url")||M();if(this.isNew())return t;return t.replace(/([^\/])$/,"$1/")+encodeURIComponent(this.id)},parse:function(t,e){return t},clone:function(){return new this.constructor(this.attributes)},isNew:function(){return!this.has(this.idAttribute)},isValid:function(t){return this._validate({},i.extend(t||{},{validate:true}))},_validate:function(t,e){if(!e.validate||!this.validate)return true;t=i.extend({},this.attributes,t);var r=this.validationError=this.validate(t,e)||null;if(!r)return true;this.trigger("invalid",this,r,i.extend(e,{validationError:r}));return false}});var v=["keys","values","pairs","invert","pick","omit"];i.each(v,function(t){p.prototype[t]=function(){var e=o.call(arguments);e.unshift(this.attributes);return i[t].apply(i,e)}});var g=e.Collection=function(t,e){e||(e={});if(e.model)this.model=e.model;if(e.comparator!==void 0)this.comparator=e.comparator;this._reset();this.initialize.apply(this,arguments);if(t)this.reset(t,i.extend({silent:true},e))};var m={add:true,remove:true,merge:true};var y={add:true,remove:false};i.extend(g.prototype,u,{model:p,initialize:function(){},toJSON:function(t){return this.map(function(e){return e.toJSON(t)})},sync:function(){return e.sync.apply(this,arguments)},add:function(t,e){return this.set(t,i.extend({merge:false},e,y))},remove:function(t,e){var r=!i.isArray(t);t=r?[t]:i.clone(t);e||(e={});var s,n,a,o;for(s=0,n=t.length;s<n;s++){o=t[s]=this.get(t[s]);if(!o)continue;delete this._byId[o.id];delete this._byId[o.cid];a=this.indexOf(o);this.models.splice(a,1);this.length--;if(!e.silent){e.index=a;o.trigger("remove",o,this,e)}this._removeReference(o,e)}return r?t[0]:t},set:function(t,e){e=i.defaults({},e,m);if(e.parse)t=this.parse(t,e);var r=!i.isArray(t);t=r?t?[t]:[]:i.clone(t);var s,n,a,o,h,u,l;var c=e.at;var f=this.model;var d=this.comparator&&c==null&&e.sort!==false;var v=i.isString(this.comparator)?this.comparator:null;var g=[],y=[],_={};var b=e.add,w=e.merge,x=e.remove;var E=!d&&b&&x?[]:false;for(s=0,n=t.length;s<n;s++){h=t[s]||{};if(h instanceof p){a=o=h}else{a=h[f.prototype.idAttribute||"id"]}if(u=this.get(a)){if(x)_[u.cid]=true;if(w){h=h===o?o.attributes:h;if(e.parse)h=u.parse(h,e);u.set(h,e);if(d&&!l&&u.hasChanged(v))l=true}t[s]=u}else if(b){o=t[s]=this._prepareModel(h,e);if(!o)continue;g.push(o);this._addReference(o,e)}o=u||o;if(E&&(o.isNew()||!_[o.id]))E.push(o);_[o.id]=true}if(x){for(s=0,n=this.length;s<n;++s){if(!_[(o=this.models[s]).cid])y.push(o)}if(y.length)this.remove(y,e)}if(g.length||E&&E.length){if(d)l=true;this.length+=g.length;if(c!=null){for(s=0,n=g.length;s<n;s++){this.models.splice(c+s,0,g[s])}}else{if(E)this.models.length=0;var k=E||g;for(s=0,n=k.length;s<n;s++){this.models.push(k[s])}}}if(l)this.sort({silent:true});if(!e.silent){for(s=0,n=g.length;s<n;s++){(o=g[s]).trigger("add",o,this,e)}if(l||E&&E.length)this.trigger("sort",this,e)}return r?t[0]:t},reset:function(t,e){e||(e={});for(var r=0,s=this.models.length;r<s;r++){this._removeReference(this.models[r],e)}e.previousModels=this.models;this._reset();t=this.add(t,i.extend({silent:true},e));if(!e.silent)this.trigger("reset",this,e);return t},push:function(t,e){return this.add(t,i.extend({at:this.length},e))},pop:function(t){var e=this.at(this.length-1);this.remove(e,t);return e},unshift:function(t,e){return this.add(t,i.extend({at:0},e))},shift:function(t){var e=this.at(0);this.remove(e,t);return e},slice:function(){return o.apply(this.models,arguments)},get:function(t){if(t==null)return void 0;return this._byId[t]||this._byId[t.id]||this._byId[t.cid]},at:function(t){return this.models[t]},where:function(t,e){if(i.isEmpty(t))return e?void 0:[];return this[e?"find":"filter"](function(e){for(var i in t){if(t[i]!==e.get(i))return false}return true})},findWhere:function(t){return this.where(t,true)},sort:function(t){if(!this.comparator)throw new Error("Cannot sort a set without a comparator");t||(t={});if(i.isString(this.comparator)||this.comparator.length===1){this.models=this.sortBy(this.comparator,this)}else{this.models.sort(i.bind(this.comparator,this))}if(!t.silent)this.trigger("sort",this,t);return this},pluck:function(t){return i.invoke(this.models,"get",t)},fetch:function(t){t=t?i.clone(t):{};if(t.parse===void 0)t.parse=true;var e=t.success;var r=this;t.success=function(i){var s=t.reset?"reset":"set";r[s](i,t);if(e)e(r,i,t);r.trigger("sync",r,i,t)};q(this,t);return this.sync("read",this,t)},create:function(t,e){e=e?i.clone(e):{};if(!(t=this._prepareModel(t,e)))return false;if(!e.wait)this.add(t,e);var r=this;var s=e.success;e.success=function(t,i){if(e.wait)r.add(t,e);if(s)s(t,i,e)};t.save(null,e);return t},parse:function(t,e){return t},clone:function(){return new this.constructor(this.models)},_reset:function(){this.length=0;this.models=[];this._byId={}},_prepareModel:function(t,e){if(t instanceof p)return t;e=e?i.clone(e):{};e.collection=this;var r=new this.model(t,e);if(!r.validationError)return r;this.trigger("invalid",this,r.validationError,e);return false},_addReference:function(t,e){this._byId[t.cid]=t;if(t.id!=null)this._byId[t.id]=t;if(!t.collection)t.collection=this;t.on("all",this._onModelEvent,this)},_removeReference:function(t,e){if(this===t.collection)delete t.collection;t.off("all",this._onModelEvent,this)},_onModelEvent:function(t,e,i,r){if((t==="add"||t==="remove")&&i!==this)return;if(t==="destroy")this.remove(e,r);if(e&&t==="change:"+e.idAttribute){delete this._byId[e.previous(e.idAttribute)];if(e.id!=null)this._byId[e.id]=e}this.trigger.apply(this,arguments)}});var _=["forEach","each","map","collect","reduce","foldl","inject","reduceRight","foldr","find","detect","filter","select","reject","every","all","some","any","include","contains","invoke","max","min","toArray","size","first","head","take","initial","rest","tail","drop","last","without","difference","indexOf","shuffle","lastIndexOf","isEmpty","chain","sample"];i.each(_,function(t){g.prototype[t]=function(){var e=o.call(arguments);e.unshift(this.models);return i[t].apply(i,e)}});var b=["groupBy","countBy","sortBy","indexBy"];i.each(b,function(t){g.prototype[t]=function(e,r){var s=i.isFunction(e)?e:function(t){return t.get(e)};return i[t](this.models,s,r)}});var w=e.View=function(t){this.cid=i.uniqueId("view");t||(t={});i.extend(this,i.pick(t,E));this._ensureElement();this.initialize.apply(this,arguments);this.delegateEvents()};var x=/^(\S+)\s*(.*)$/;var E=["model","collection","el","id","attributes","className","tagName","events"];i.extend(w.prototype,u,{tagName:"div",$:function(t){return this.$el.find(t)},initialize:function(){},render:function(){return this},remove:function(){this.$el.remove();this.stopListening();return this},setElement:function(t,i){if(this.$el)this.undelegateEvents();this.$el=t instanceof e.$?t:e.$(t);this.el=this.$el[0];if(i!==false)this.delegateEvents();return this},delegateEvents:function(t){if(!(t||(t=i.result(this,"events"))))return this;this.undelegateEvents();for(var e in t){var r=t[e];if(!i.isFunction(r))r=this[t[e]];if(!r)continue;var s=e.match(x);var n=s[1],a=s[2];r=i.bind(r,this);n+=".delegateEvents"+this.cid;if(a===""){this.$el.on(n,r)}else{this.$el.on(n,a,r)}}return this},undelegateEvents:function(){this.$el.off(".delegateEvents"+this.cid);return this},_ensureElement:function(){if(!this.el){var t=i.extend({},i.result(this,"attributes"));if(this.id)t.id=i.result(this,"id");if(this.className)t["class"]=i.result(this,"className");var r=e.$("<"+i.result(this,"tagName")+">").attr(t);this.setElement(r,false)}else{this.setElement(i.result(this,"el"),false)}}});e.sync=function(t,r,s){var n=T[t];i.defaults(s||(s={}),{emulateHTTP:e.emulateHTTP,emulateJSON:e.emulateJSON});var a={type:n,dataType:"json"};if(!s.url){a.url=i.result(r,"url")||M()}if(s.data==null&&r&&(t==="create"||t==="update"||t==="patch")){a.contentType="application/json";a.data=JSON.stringify(s.attrs||r.toJSON(s))}if(s.emulateJSON){a.contentType="application/x-www-form-urlencoded";a.data=a.data?{model:a.data}:{}}if(s.emulateHTTP&&(n==="PUT"||n==="DELETE"||n==="PATCH")){a.type="POST";if(s.emulateJSON)a.data._method=n;var o=s.beforeSend;s.beforeSend=function(t){t.setRequestHeader("X-HTTP-Method-Override",n);if(o)return o.apply(this,arguments)}}if(a.type!=="GET"&&!s.emulateJSON){a.processData=false}if(a.type==="PATCH"&&k){a.xhr=function(){return new ActiveXObject("Microsoft.XMLHTTP")}}var h=s.xhr=e.ajax(i.extend(a,s));r.trigger("request",r,h,s);return h};var k=typeof window!=="undefined"&&!!window.ActiveXObject&&!(window.XMLHttpRequest&&(new XMLHttpRequest).dispatchEvent);var T={create:"POST",update:"PUT",patch:"PATCH","delete":"DELETE",read:"GET"};e.ajax=function(){return e.$.ajax.apply(e.$,arguments)};var $=e.Router=function(t){t||(t={});if(t.routes)this.routes=t.routes;this._bindRoutes();this.initialize.apply(this,arguments)};var S=/\((.*?)\)/g;var H=/(\(\?)?:\w+/g;var A=/\*\w+/g;var I=/[\-{}\[\]+?.,\\\^$|#\s]/g;i.extend($.prototype,u,{initialize:function(){},route:function(t,r,s){if(!i.isRegExp(t))t=this._routeToRegExp(t);if(i.isFunction(r)){s=r;r=""}if(!s)s=this[r];var n=this;e.history.route(t,function(i){var a=n._extractParameters(t,i);n.execute(s,a);n.trigger.apply(n,["route:"+r].concat(a));n.trigger("route",r,a);e.history.trigger("route",n,r,a)});return this},execute:function(t,e){if(t)t.apply(this,e)},navigate:function(t,i){e.history.navigate(t,i);return this},_bindRoutes:function(){if(!this.routes)return;this.routes=i.result(this,"routes");var t,e=i.keys(this.routes);while((t=e.pop())!=null){this.route(t,this.routes[t])}},_routeToRegExp:function(t){t=t.replace(I,"\\$&").replace(S,"(?:$1)?").replace(H,function(t,e){return e?t:"([^/?]+)"}).replace(A,"([^?]*?)");return new RegExp("^"+t+"(?:\\?([\\s\\S]*))?$")},_extractParameters:function(t,e){var r=t.exec(e).slice(1);return i.map(r,function(t,e){if(e===r.length-1)return t||null;return t?decodeURIComponent(t):null})}});var N=e.History=function(){this.handlers=[];i.bindAll(this,"checkUrl");if(typeof window!=="undefined"){this.location=window.location;this.history=window.history}};var R=/^[#\/]|\s+$/g;var O=/^\/+|\/+$/g;var P=/msie [\w.]+/;var C=/\/$/;var j=/#.*$/;N.started=false;i.extend(N.prototype,u,{interval:50,atRoot:function(){return this.location.pathname.replace(/[^\/]$/,"$&/")===this.root},getHash:function(t){var e=(t||this).location.href.match(/#(.*)$/);return e?e[1]:""},getFragment:function(t,e){if(t==null){if(this._hasPushState||!this._wantsHashChange||e){t=decodeURI(this.location.pathname+this.location.search);var i=this.root.replace(C,"");if(!t.indexOf(i))t=t.slice(i.length)}else{t=this.getHash()}}return t.replace(R,"")},start:function(t){if(N.started)throw new Error("Backbone.history has already been started");N.started=true;this.options=i.extend({root:"/"},this.options,t);this.root=this.options.root;this._wantsHashChange=this.options.hashChange!==false;this._wantsPushState=!!this.options.pushState;this._hasPushState=!!(this.options.pushState&&this.history&&this.history.pushState);var r=this.getFragment();var s=document.documentMode;var n=P.exec(navigator.userAgent.toLowerCase())&&(!s||s<=7);this.root=("/"+this.root+"/").replace(O,"/");if(n&&this._wantsHashChange){var a=e.$('<iframe src="javascript:0" tabindex="-1">');this.iframe=a.hide().appendTo("body")[0].contentWindow;this.navigate(r)}if(this._hasPushState){e.$(window).on("popstate",this.checkUrl)}else if(this._wantsHashChange&&"onhashchange"in window&&!n){e.$(window).on("hashchange",this.checkUrl)}else if(this._wantsHashChange){this._checkUrlInterval=setInterval(this.checkUrl,this.interval)}this.fragment=r;var o=this.location;if(this._wantsHashChange&&this._wantsPushState){if(!this._hasPushState&&!this.atRoot()){this.fragment=this.getFragment(null,true);this.location.replace(this.root+"#"+this.fragment);return true}else if(this._hasPushState&&this.atRoot()&&o.hash){this.fragment=this.getHash().replace(R,"");this.history.replaceState({},document.title,this.root+this.fragment)}}if(!this.options.silent)return this.loadUrl()},stop:function(){e.$(window).off("popstate",this.checkUrl).off("hashchange",this.checkUrl);if(this._checkUrlInterval)clearInterval(this._checkUrlInterval);N.started=false},route:function(t,e){this.handlers.unshift({route:t,callback:e})},checkUrl:function(t){var e=this.getFragment();if(e===this.fragment&&this.iframe){e=this.getFragment(this.getHash(this.iframe))}if(e===this.fragment)return false;if(this.iframe)this.navigate(e);this.loadUrl()},loadUrl:function(t){t=this.fragment=this.getFragment(t);return i.any(this.handlers,function(e){if(e.route.test(t)){e.callback(t);return true}})},navigate:function(t,e){if(!N.started)return false;if(!e||e===true)e={trigger:!!e};var i=this.root+(t=this.getFragment(t||""));t=t.replace(j,"");if(this.fragment===t)return;this.fragment=t;if(t===""&&i!=="/")i=i.slice(0,-1);if(this._hasPushState){this.history[e.replace?"replaceState":"pushState"]({},document.title,i)}else if(this._wantsHashChange){this._updateHash(this.location,t,e.replace);if(this.iframe&&t!==this.getFragment(this.getHash(this.iframe))){if(!e.replace)this.iframe.document.open().close();this._updateHash(this.iframe.location,t,e.replace)}}else{return this.location.assign(i)}if(e.trigger)return this.loadUrl(t)},_updateHash:function(t,e,i){if(i){var r=t.href.replace(/(javascript:|#).*$/,"");t.replace(r+"#"+e)}else{t.hash="#"+e}}});e.history=new N;var U=function(t,e){var r=this;var s;if(t&&i.has(t,"constructor")){s=t.constructor}else{s=function(){return r.apply(this,arguments)}}i.extend(s,r,e);var n=function(){this.constructor=s};n.prototype=r.prototype;s.prototype=new n;if(t)i.extend(s.prototype,t);s.__super__=r.prototype;return s};p.extend=g.extend=$.extend=w.extend=N.extend=U;var M=function(){throw new Error('A "url" property or function must be specified')};var q=function(t,e){var i=e.error;e.error=function(r){if(i)i(t,r,e);t.trigger("error",t,r,e)}};return e});
//# sourceMappingURL=backbone-min.map

/**
 * @author mrdoob / http://mrdoob.com/
 */

var EventDispatcher = function () {}

EventDispatcher.prototype = {

	constructor: EventDispatcher,

	apply: function ( object ) {

		object.addEventListener = EventDispatcher.prototype.addEventListener;
		object.hasEventListener = EventDispatcher.prototype.hasEventListener;
		object.removeEventListener = EventDispatcher.prototype.removeEventListener;
		object.dispatchEvent = EventDispatcher.prototype.dispatchEvent;

	},

	addEventListener: function ( type, listener ) {

		if ( this._listeners === undefined ) this._listeners = {};

		var listeners = this._listeners;

		if ( listeners[ type ] === undefined ) {

			listeners[ type ] = [];

		}

		if ( listeners[ type ].indexOf( listener ) === - 1 ) {

		    //dispatch before pushing so that a listeneradded listener does not trigger itself
			this.dispatchEvent( { type: 'listeneradded', listenerType: type, listener: listener } );

			listeners[ type ].push( listener );

		}

	},

	hasEventListener: function ( type, listener ) {

		if ( this._listeners === undefined ) return false;

		var listeners = this._listeners;

		if ( listeners[ type ] !== undefined && listeners[ type ].indexOf( listener ) !== - 1 ) {

			return true;

		}

		return false;

	},

	removeEventListener: function ( type, listener ) {

		if ( this._listeners === undefined ) return;

		var listeners = this._listeners;
		var listenerArray = listeners[ type ];

		if ( listenerArray !== undefined ) {

			var index = listenerArray.indexOf( listener );

			if ( index !== - 1 ) {

				listenerArray.splice( index, 1 );

			    this.dispatchEvent( { type: 'listenerremoved', listenerType: type, listener: listener } );
			    //dispatch after splicing so that a listenerremoved listener does not trigger itself
			}

		}

	},

	dispatchEvent: function ( event ) {
			
		if ( this._listeners === undefined ) return;

		var listeners = this._listeners;
		var listenerArray = listeners[ event.type ];

		if ( listenerArray !== undefined ) {

			event.target = this;

			var array = [];
			var length = listenerArray.length;

			for ( var i = 0; i < length; i ++ ) {

				array[ i ] = listenerArray[ i ];

			}

			for ( var i = 0; i < length; i ++ ) {

				array[ i ].call( this, event );

			}

		}

	}

};

//
// Autogenerated by Thrift Compiler (0.9.3-GFODOR)
//
// DO NOT EDIT UNLESS YOU ARE SURE THAT YOU KNOW WHAT YOU ARE DOING
//


ThreeJSSceneObject = function(args) {
  this.MeshId = null;
  this.PositionX = null;
  this.PositionY = null;
  this.PositionZ = null;
  this.RotationX = null;
  this.RotationY = null;
  this.RotationZ = null;
  this.RotationW = null;
  this.ScaleX = null;
  this.ScaleY = null;
  this.ScaleZ = null;
  this.IsVisible = null;
  if (args) {
    if (args.MeshId !== undefined && args.MeshId !== null) {
      this.MeshId = args.MeshId;
    } else {
      throw new Thrift.TProtocolException(Thrift.TProtocolExceptionType.UNKNOWN, 'Required field MeshId is unset!');
    }
    if (args.PositionX !== undefined && args.PositionX !== null) {
      this.PositionX = args.PositionX;
    } else {
      throw new Thrift.TProtocolException(Thrift.TProtocolExceptionType.UNKNOWN, 'Required field PositionX is unset!');
    }
    if (args.PositionY !== undefined && args.PositionY !== null) {
      this.PositionY = args.PositionY;
    } else {
      throw new Thrift.TProtocolException(Thrift.TProtocolExceptionType.UNKNOWN, 'Required field PositionY is unset!');
    }
    if (args.PositionZ !== undefined && args.PositionZ !== null) {
      this.PositionZ = args.PositionZ;
    } else {
      throw new Thrift.TProtocolException(Thrift.TProtocolExceptionType.UNKNOWN, 'Required field PositionZ is unset!');
    }
    if (args.RotationX !== undefined && args.RotationX !== null) {
      this.RotationX = args.RotationX;
    } else {
      throw new Thrift.TProtocolException(Thrift.TProtocolExceptionType.UNKNOWN, 'Required field RotationX is unset!');
    }
    if (args.RotationY !== undefined && args.RotationY !== null) {
      this.RotationY = args.RotationY;
    } else {
      throw new Thrift.TProtocolException(Thrift.TProtocolExceptionType.UNKNOWN, 'Required field RotationY is unset!');
    }
    if (args.RotationZ !== undefined && args.RotationZ !== null) {
      this.RotationZ = args.RotationZ;
    } else {
      throw new Thrift.TProtocolException(Thrift.TProtocolExceptionType.UNKNOWN, 'Required field RotationZ is unset!');
    }
    if (args.RotationW !== undefined && args.RotationW !== null) {
      this.RotationW = args.RotationW;
    } else {
      throw new Thrift.TProtocolException(Thrift.TProtocolExceptionType.UNKNOWN, 'Required field RotationW is unset!');
    }
    if (args.ScaleX !== undefined && args.ScaleX !== null) {
      this.ScaleX = args.ScaleX;
    } else {
      throw new Thrift.TProtocolException(Thrift.TProtocolExceptionType.UNKNOWN, 'Required field ScaleX is unset!');
    }
    if (args.ScaleY !== undefined && args.ScaleY !== null) {
      this.ScaleY = args.ScaleY;
    } else {
      throw new Thrift.TProtocolException(Thrift.TProtocolExceptionType.UNKNOWN, 'Required field ScaleY is unset!');
    }
    if (args.ScaleZ !== undefined && args.ScaleZ !== null) {
      this.ScaleZ = args.ScaleZ;
    } else {
      throw new Thrift.TProtocolException(Thrift.TProtocolExceptionType.UNKNOWN, 'Required field ScaleZ is unset!');
    }
    if (args.IsVisible !== undefined && args.IsVisible !== null) {
      this.IsVisible = args.IsVisible;
    } else {
      throw new Thrift.TProtocolException(Thrift.TProtocolExceptionType.UNKNOWN, 'Required field IsVisible is unset!');
    }
  }
};
ThreeJSSceneObject.prototype = {};
ThreeJSSceneObject.prototype.read = function(input) {
  input.readStructBegin();
  while (true)
  {
    var ret = input.readFieldBegin();
    var fname = ret.fname;
    var ftype = ret.ftype;
    var fid = ret.fid;
    if (ftype == Thrift.Type.STOP) {
      break;
    }
    switch (fid)
    {
      case 1:
      if (ftype == Thrift.Type.I32) {
        this.MeshId = input.readI32().value;
      } else {
        input.skip(ftype);
      }
      break;
      case 2:
      if (ftype == Thrift.Type.DOUBLE) {
        this.PositionX = input.readDouble().value;
      } else {
        input.skip(ftype);
      }
      break;
      case 3:
      if (ftype == Thrift.Type.DOUBLE) {
        this.PositionY = input.readDouble().value;
      } else {
        input.skip(ftype);
      }
      break;
      case 4:
      if (ftype == Thrift.Type.DOUBLE) {
        this.PositionZ = input.readDouble().value;
      } else {
        input.skip(ftype);
      }
      break;
      case 5:
      if (ftype == Thrift.Type.DOUBLE) {
        this.RotationX = input.readDouble().value;
      } else {
        input.skip(ftype);
      }
      break;
      case 6:
      if (ftype == Thrift.Type.DOUBLE) {
        this.RotationY = input.readDouble().value;
      } else {
        input.skip(ftype);
      }
      break;
      case 7:
      if (ftype == Thrift.Type.DOUBLE) {
        this.RotationZ = input.readDouble().value;
      } else {
        input.skip(ftype);
      }
      break;
      case 8:
      if (ftype == Thrift.Type.DOUBLE) {
        this.RotationW = input.readDouble().value;
      } else {
        input.skip(ftype);
      }
      break;
      case 9:
      if (ftype == Thrift.Type.DOUBLE) {
        this.ScaleX = input.readDouble().value;
      } else {
        input.skip(ftype);
      }
      break;
      case 10:
      if (ftype == Thrift.Type.DOUBLE) {
        this.ScaleY = input.readDouble().value;
      } else {
        input.skip(ftype);
      }
      break;
      case 11:
      if (ftype == Thrift.Type.DOUBLE) {
        this.ScaleZ = input.readDouble().value;
      } else {
        input.skip(ftype);
      }
      break;
      case 12:
      if (ftype == Thrift.Type.BOOL) {
        this.IsVisible = input.readBool().value;
      } else {
        input.skip(ftype);
      }
      break;
      default:
        input.skip(ftype);
    }
    input.readFieldEnd();
  }
  input.readStructEnd();
  return;
};

ThreeJSSceneObject.prototype.write = function(output) {
  output.writeStructBegin('ThreeJSSceneObject');
  if (this.MeshId !== null && this.MeshId !== undefined) {
    output.writeFieldBegin('MeshId', Thrift.Type.I32, 1);
    output.writeI32(this.MeshId);
    output.writeFieldEnd();
  }
  if (this.PositionX !== null && this.PositionX !== undefined) {
    output.writeFieldBegin('PositionX', Thrift.Type.DOUBLE, 2);
    output.writeDouble(this.PositionX);
    output.writeFieldEnd();
  }
  if (this.PositionY !== null && this.PositionY !== undefined) {
    output.writeFieldBegin('PositionY', Thrift.Type.DOUBLE, 3);
    output.writeDouble(this.PositionY);
    output.writeFieldEnd();
  }
  if (this.PositionZ !== null && this.PositionZ !== undefined) {
    output.writeFieldBegin('PositionZ', Thrift.Type.DOUBLE, 4);
    output.writeDouble(this.PositionZ);
    output.writeFieldEnd();
  }
  if (this.RotationX !== null && this.RotationX !== undefined) {
    output.writeFieldBegin('RotationX', Thrift.Type.DOUBLE, 5);
    output.writeDouble(this.RotationX);
    output.writeFieldEnd();
  }
  if (this.RotationY !== null && this.RotationY !== undefined) {
    output.writeFieldBegin('RotationY', Thrift.Type.DOUBLE, 6);
    output.writeDouble(this.RotationY);
    output.writeFieldEnd();
  }
  if (this.RotationZ !== null && this.RotationZ !== undefined) {
    output.writeFieldBegin('RotationZ', Thrift.Type.DOUBLE, 7);
    output.writeDouble(this.RotationZ);
    output.writeFieldEnd();
  }
  if (this.RotationW !== null && this.RotationW !== undefined) {
    output.writeFieldBegin('RotationW', Thrift.Type.DOUBLE, 8);
    output.writeDouble(this.RotationW);
    output.writeFieldEnd();
  }
  if (this.ScaleX !== null && this.ScaleX !== undefined) {
    output.writeFieldBegin('ScaleX', Thrift.Type.DOUBLE, 9);
    output.writeDouble(this.ScaleX);
    output.writeFieldEnd();
  }
  if (this.ScaleY !== null && this.ScaleY !== undefined) {
    output.writeFieldBegin('ScaleY', Thrift.Type.DOUBLE, 10);
    output.writeDouble(this.ScaleY);
    output.writeFieldEnd();
  }
  if (this.ScaleZ !== null && this.ScaleZ !== undefined) {
    output.writeFieldBegin('ScaleZ', Thrift.Type.DOUBLE, 11);
    output.writeDouble(this.ScaleZ);
    output.writeFieldEnd();
  }
  if (this.IsVisible !== null && this.IsVisible !== undefined) {
    output.writeFieldBegin('IsVisible', Thrift.Type.BOOL, 12);
    output.writeBool(this.IsVisible);
    output.writeFieldEnd();
  }
  output.writeFieldStop();
  output.writeStructEnd();
  return;
};

ThreeJSGeometryData = function(args) {
  this.Vertices = null;
  this.Faces = null;
  this.Uvs = null;
  this.Uvs2 = null;
  this.IsBufferedGeometry = null;
  this.Colors = null;
  if (args) {
    if (args.Vertices !== undefined && args.Vertices !== null) {
      this.Vertices = Thrift.copyList(args.Vertices, [null]);
    } else {
      throw new Thrift.TProtocolException(Thrift.TProtocolExceptionType.UNKNOWN, 'Required field Vertices is unset!');
    }
    if (args.Faces !== undefined && args.Faces !== null) {
      this.Faces = Thrift.copyList(args.Faces, [null]);
    } else {
      throw new Thrift.TProtocolException(Thrift.TProtocolExceptionType.UNKNOWN, 'Required field Faces is unset!');
    }
    if (args.Uvs !== undefined && args.Uvs !== null) {
      this.Uvs = Thrift.copyList(args.Uvs, [null]);
    } else {
      throw new Thrift.TProtocolException(Thrift.TProtocolExceptionType.UNKNOWN, 'Required field Uvs is unset!');
    }
    if (args.Uvs2 !== undefined && args.Uvs2 !== null) {
      this.Uvs2 = Thrift.copyList(args.Uvs2, [null]);
    } else {
      throw new Thrift.TProtocolException(Thrift.TProtocolExceptionType.UNKNOWN, 'Required field Uvs2 is unset!');
    }
    if (args.IsBufferedGeometry !== undefined && args.IsBufferedGeometry !== null) {
      this.IsBufferedGeometry = args.IsBufferedGeometry;
    } else {
      throw new Thrift.TProtocolException(Thrift.TProtocolExceptionType.UNKNOWN, 'Required field IsBufferedGeometry is unset!');
    }
    if (args.Colors !== undefined && args.Colors !== null) {
      this.Colors = Thrift.copyList(args.Colors, [null]);
    } else {
      throw new Thrift.TProtocolException(Thrift.TProtocolExceptionType.UNKNOWN, 'Required field Colors is unset!');
    }
  }
};
ThreeJSGeometryData.prototype = {};
ThreeJSGeometryData.prototype.read = function(input) {
  input.readStructBegin();
  while (true)
  {
    var ret = input.readFieldBegin();
    var fname = ret.fname;
    var ftype = ret.ftype;
    var fid = ret.fid;
    if (ftype == Thrift.Type.STOP) {
      break;
    }
    switch (fid)
    {
      case 1:
      if (ftype == Thrift.Type.LIST) {
        var _size0 = 0;
        var _rtmp34;
        this.Vertices = [];
        var _etype3 = 0;
        _rtmp34 = input.readListBegin();
        _etype3 = _rtmp34.etype;
        _size0 = _rtmp34.size;
        for (var _i5 = 0; _i5 < _size0; ++_i5)
        {
          var elem6 = null;
          elem6 = input.readDouble().value;
          this.Vertices.push(elem6);
        }
        input.readListEnd();
      } else {
        input.skip(ftype);
      }
      break;
      case 2:
      if (ftype == Thrift.Type.LIST) {
        var _size7 = 0;
        var _rtmp311;
        this.Faces = [];
        var _etype10 = 0;
        _rtmp311 = input.readListBegin();
        _etype10 = _rtmp311.etype;
        _size7 = _rtmp311.size;
        for (var _i12 = 0; _i12 < _size7; ++_i12)
        {
          var elem13 = null;
          elem13 = input.readI32().value;
          this.Faces.push(elem13);
        }
        input.readListEnd();
      } else {
        input.skip(ftype);
      }
      break;
      case 3:
      if (ftype == Thrift.Type.LIST) {
        var _size14 = 0;
        var _rtmp318;
        this.Uvs = [];
        var _etype17 = 0;
        _rtmp318 = input.readListBegin();
        _etype17 = _rtmp318.etype;
        _size14 = _rtmp318.size;
        for (var _i19 = 0; _i19 < _size14; ++_i19)
        {
          var elem20 = null;
          elem20 = input.readDouble().value;
          this.Uvs.push(elem20);
        }
        input.readListEnd();
      } else {
        input.skip(ftype);
      }
      break;
      case 4:
      if (ftype == Thrift.Type.LIST) {
        var _size21 = 0;
        var _rtmp325;
        this.Uvs2 = [];
        var _etype24 = 0;
        _rtmp325 = input.readListBegin();
        _etype24 = _rtmp325.etype;
        _size21 = _rtmp325.size;
        for (var _i26 = 0; _i26 < _size21; ++_i26)
        {
          var elem27 = null;
          elem27 = input.readDouble().value;
          this.Uvs2.push(elem27);
        }
        input.readListEnd();
      } else {
        input.skip(ftype);
      }
      break;
      case 5:
      if (ftype == Thrift.Type.BOOL) {
        this.IsBufferedGeometry = input.readBool().value;
      } else {
        input.skip(ftype);
      }
      break;
      case 6:
      if (ftype == Thrift.Type.LIST) {
        var _size28 = 0;
        var _rtmp332;
        this.Colors = [];
        var _etype31 = 0;
        _rtmp332 = input.readListBegin();
        _etype31 = _rtmp332.etype;
        _size28 = _rtmp332.size;
        for (var _i33 = 0; _i33 < _size28; ++_i33)
        {
          var elem34 = null;
          elem34 = input.readDouble().value;
          this.Colors.push(elem34);
        }
        input.readListEnd();
      } else {
        input.skip(ftype);
      }
      break;
      default:
        input.skip(ftype);
    }
    input.readFieldEnd();
  }
  input.readStructEnd();
  return;
};

ThreeJSGeometryData.prototype.write = function(output) {
  output.writeStructBegin('ThreeJSGeometryData');
  if (this.Vertices !== null && this.Vertices !== undefined) {
    output.writeFieldBegin('Vertices', Thrift.Type.LIST, 1);
    output.writeListBegin(Thrift.Type.DOUBLE, this.Vertices.length);
    for (var iter35 in this.Vertices)
    {
      if (this.Vertices.hasOwnProperty(iter35))
      {
        iter35 = this.Vertices[iter35];
        output.writeDouble(iter35);
      }
    }
    output.writeListEnd();
    output.writeFieldEnd();
  }
  if (this.Faces !== null && this.Faces !== undefined) {
    output.writeFieldBegin('Faces', Thrift.Type.LIST, 2);
    output.writeListBegin(Thrift.Type.I32, this.Faces.length);
    for (var iter36 in this.Faces)
    {
      if (this.Faces.hasOwnProperty(iter36))
      {
        iter36 = this.Faces[iter36];
        output.writeI32(iter36);
      }
    }
    output.writeListEnd();
    output.writeFieldEnd();
  }
  if (this.Uvs !== null && this.Uvs !== undefined) {
    output.writeFieldBegin('Uvs', Thrift.Type.LIST, 3);
    output.writeListBegin(Thrift.Type.DOUBLE, this.Uvs.length);
    for (var iter37 in this.Uvs)
    {
      if (this.Uvs.hasOwnProperty(iter37))
      {
        iter37 = this.Uvs[iter37];
        output.writeDouble(iter37);
      }
    }
    output.writeListEnd();
    output.writeFieldEnd();
  }
  if (this.Uvs2 !== null && this.Uvs2 !== undefined) {
    output.writeFieldBegin('Uvs2', Thrift.Type.LIST, 4);
    output.writeListBegin(Thrift.Type.DOUBLE, this.Uvs2.length);
    for (var iter38 in this.Uvs2)
    {
      if (this.Uvs2.hasOwnProperty(iter38))
      {
        iter38 = this.Uvs2[iter38];
        output.writeDouble(iter38);
      }
    }
    output.writeListEnd();
    output.writeFieldEnd();
  }
  if (this.IsBufferedGeometry !== null && this.IsBufferedGeometry !== undefined) {
    output.writeFieldBegin('IsBufferedGeometry', Thrift.Type.BOOL, 5);
    output.writeBool(this.IsBufferedGeometry);
    output.writeFieldEnd();
  }
  if (this.Colors !== null && this.Colors !== undefined) {
    output.writeFieldBegin('Colors', Thrift.Type.LIST, 6);
    output.writeListBegin(Thrift.Type.DOUBLE, this.Colors.length);
    for (var iter39 in this.Colors)
    {
      if (this.Colors.hasOwnProperty(iter39))
      {
        iter39 = this.Colors[iter39];
        output.writeDouble(iter39);
      }
    }
    output.writeListEnd();
    output.writeFieldEnd();
  }
  output.writeFieldStop();
  output.writeStructEnd();
  return;
};

ThreeJSGeometry = function(args) {
  this.Uuid = null;
  this.Data = null;
  if (args) {
    if (args.Uuid !== undefined && args.Uuid !== null) {
      this.Uuid = args.Uuid;
    } else {
      throw new Thrift.TProtocolException(Thrift.TProtocolExceptionType.UNKNOWN, 'Required field Uuid is unset!');
    }
    if (args.Data !== undefined && args.Data !== null) {
      this.Data = new ThreeJSGeometryData(args.Data);
    } else {
      throw new Thrift.TProtocolException(Thrift.TProtocolExceptionType.UNKNOWN, 'Required field Data is unset!');
    }
  }
};
ThreeJSGeometry.prototype = {};
ThreeJSGeometry.prototype.read = function(input) {
  input.readStructBegin();
  while (true)
  {
    var ret = input.readFieldBegin();
    var fname = ret.fname;
    var ftype = ret.ftype;
    var fid = ret.fid;
    if (ftype == Thrift.Type.STOP) {
      break;
    }
    switch (fid)
    {
      case 1:
      if (ftype == Thrift.Type.STRING) {
        this.Uuid = input.readString().value;
      } else {
        input.skip(ftype);
      }
      break;
      case 2:
      if (ftype == Thrift.Type.STRUCT) {
        this.Data = new ThreeJSGeometryData();
        this.Data.read(input);
      } else {
        input.skip(ftype);
      }
      break;
      default:
        input.skip(ftype);
    }
    input.readFieldEnd();
  }
  input.readStructEnd();
  return;
};

ThreeJSGeometry.prototype.write = function(output) {
  output.writeStructBegin('ThreeJSGeometry');
  if (this.Uuid !== null && this.Uuid !== undefined) {
    output.writeFieldBegin('Uuid', Thrift.Type.STRING, 1);
    output.writeString(this.Uuid);
    output.writeFieldEnd();
  }
  if (this.Data !== null && this.Data !== undefined) {
    output.writeFieldBegin('Data', Thrift.Type.STRUCT, 2);
    this.Data.write(output);
    output.writeFieldEnd();
  }
  output.writeFieldStop();
  output.writeStructEnd();
  return;
};

ThreeJSMaterial = function(args) {
  this.Uuid = null;
  this.Visible = null;
  this.Color = null;
  this.Side = null;
  this.Transparent = null;
  this.Opacity = null;
  this.Map = null;
  this.LightMap = null;
  this.LightMapIntensity = null;
  if (args) {
    if (args.Uuid !== undefined && args.Uuid !== null) {
      this.Uuid = args.Uuid;
    } else {
      throw new Thrift.TProtocolException(Thrift.TProtocolExceptionType.UNKNOWN, 'Required field Uuid is unset!');
    }
    if (args.Visible !== undefined && args.Visible !== null) {
      this.Visible = args.Visible;
    } else {
      throw new Thrift.TProtocolException(Thrift.TProtocolExceptionType.UNKNOWN, 'Required field Visible is unset!');
    }
    if (args.Color !== undefined && args.Color !== null) {
      this.Color = args.Color;
    } else {
      throw new Thrift.TProtocolException(Thrift.TProtocolExceptionType.UNKNOWN, 'Required field Color is unset!');
    }
    if (args.Side !== undefined && args.Side !== null) {
      this.Side = args.Side;
    } else {
      throw new Thrift.TProtocolException(Thrift.TProtocolExceptionType.UNKNOWN, 'Required field Side is unset!');
    }
    if (args.Transparent !== undefined && args.Transparent !== null) {
      this.Transparent = args.Transparent;
    } else {
      throw new Thrift.TProtocolException(Thrift.TProtocolExceptionType.UNKNOWN, 'Required field Transparent is unset!');
    }
    if (args.Opacity !== undefined && args.Opacity !== null) {
      this.Opacity = args.Opacity;
    } else {
      throw new Thrift.TProtocolException(Thrift.TProtocolExceptionType.UNKNOWN, 'Required field Opacity is unset!');
    }
    if (args.Map !== undefined && args.Map !== null) {
      this.Map = args.Map;
    } else {
      throw new Thrift.TProtocolException(Thrift.TProtocolExceptionType.UNKNOWN, 'Required field Map is unset!');
    }
    if (args.LightMap !== undefined && args.LightMap !== null) {
      this.LightMap = args.LightMap;
    } else {
      throw new Thrift.TProtocolException(Thrift.TProtocolExceptionType.UNKNOWN, 'Required field LightMap is unset!');
    }
    if (args.LightMapIntensity !== undefined && args.LightMapIntensity !== null) {
      this.LightMapIntensity = args.LightMapIntensity;
    } else {
      throw new Thrift.TProtocolException(Thrift.TProtocolExceptionType.UNKNOWN, 'Required field LightMapIntensity is unset!');
    }
  }
};
ThreeJSMaterial.prototype = {};
ThreeJSMaterial.prototype.read = function(input) {
  input.readStructBegin();
  while (true)
  {
    var ret = input.readFieldBegin();
    var fname = ret.fname;
    var ftype = ret.ftype;
    var fid = ret.fid;
    if (ftype == Thrift.Type.STOP) {
      break;
    }
    switch (fid)
    {
      case 1:
      if (ftype == Thrift.Type.STRING) {
        this.Uuid = input.readString().value;
      } else {
        input.skip(ftype);
      }
      break;
      case 2:
      if (ftype == Thrift.Type.BOOL) {
        this.Visible = input.readBool().value;
      } else {
        input.skip(ftype);
      }
      break;
      case 3:
      if (ftype == Thrift.Type.I32) {
        this.Color = input.readI32().value;
      } else {
        input.skip(ftype);
      }
      break;
      case 4:
      if (ftype == Thrift.Type.BYTE) {
        this.Side = input.readByte().value;
      } else {
        input.skip(ftype);
      }
      break;
      case 5:
      if (ftype == Thrift.Type.BOOL) {
        this.Transparent = input.readBool().value;
      } else {
        input.skip(ftype);
      }
      break;
      case 6:
      if (ftype == Thrift.Type.DOUBLE) {
        this.Opacity = input.readDouble().value;
      } else {
        input.skip(ftype);
      }
      break;
      case 7:
      if (ftype == Thrift.Type.STRING) {
        this.Map = input.readString().value;
      } else {
        input.skip(ftype);
      }
      break;
      case 8:
      if (ftype == Thrift.Type.STRING) {
        this.LightMap = input.readString().value;
      } else {
        input.skip(ftype);
      }
      break;
      case 9:
      if (ftype == Thrift.Type.DOUBLE) {
        this.LightMapIntensity = input.readDouble().value;
      } else {
        input.skip(ftype);
      }
      break;
      default:
        input.skip(ftype);
    }
    input.readFieldEnd();
  }
  input.readStructEnd();
  return;
};

ThreeJSMaterial.prototype.write = function(output) {
  output.writeStructBegin('ThreeJSMaterial');
  if (this.Uuid !== null && this.Uuid !== undefined) {
    output.writeFieldBegin('Uuid', Thrift.Type.STRING, 1);
    output.writeString(this.Uuid);
    output.writeFieldEnd();
  }
  if (this.Visible !== null && this.Visible !== undefined) {
    output.writeFieldBegin('Visible', Thrift.Type.BOOL, 2);
    output.writeBool(this.Visible);
    output.writeFieldEnd();
  }
  if (this.Color !== null && this.Color !== undefined) {
    output.writeFieldBegin('Color', Thrift.Type.I32, 3);
    output.writeI32(this.Color);
    output.writeFieldEnd();
  }
  if (this.Side !== null && this.Side !== undefined) {
    output.writeFieldBegin('Side', Thrift.Type.BYTE, 4);
    output.writeByte(this.Side);
    output.writeFieldEnd();
  }
  if (this.Transparent !== null && this.Transparent !== undefined) {
    output.writeFieldBegin('Transparent', Thrift.Type.BOOL, 5);
    output.writeBool(this.Transparent);
    output.writeFieldEnd();
  }
  if (this.Opacity !== null && this.Opacity !== undefined) {
    output.writeFieldBegin('Opacity', Thrift.Type.DOUBLE, 6);
    output.writeDouble(this.Opacity);
    output.writeFieldEnd();
  }
  if (this.Map !== null && this.Map !== undefined) {
    output.writeFieldBegin('Map', Thrift.Type.STRING, 7);
    output.writeString(this.Map);
    output.writeFieldEnd();
  }
  if (this.LightMap !== null && this.LightMap !== undefined) {
    output.writeFieldBegin('LightMap', Thrift.Type.STRING, 8);
    output.writeString(this.LightMap);
    output.writeFieldEnd();
  }
  if (this.LightMapIntensity !== null && this.LightMapIntensity !== undefined) {
    output.writeFieldBegin('LightMapIntensity', Thrift.Type.DOUBLE, 9);
    output.writeDouble(this.LightMapIntensity);
    output.writeFieldEnd();
  }
  output.writeFieldStop();
  output.writeStructEnd();
  return;
};

ThreeJSTexture = function(args) {
  this.Uuid = null;
  this.SourceHash = null;
  this.Src = null;
  this.TextureDataUri = null;
  this.FlipY = null;
  this.OffsetX = null;
  this.OffsetY = null;
  this.RepeatX = null;
  this.RepeatY = null;
  this.WrapS = null;
  if (args) {
    if (args.Uuid !== undefined && args.Uuid !== null) {
      this.Uuid = args.Uuid;
    } else {
      throw new Thrift.TProtocolException(Thrift.TProtocolExceptionType.UNKNOWN, 'Required field Uuid is unset!');
    }
    if (args.SourceHash !== undefined && args.SourceHash !== null) {
      this.SourceHash = args.SourceHash;
    } else {
      throw new Thrift.TProtocolException(Thrift.TProtocolExceptionType.UNKNOWN, 'Required field SourceHash is unset!');
    }
    if (args.Src !== undefined && args.Src !== null) {
      this.Src = args.Src;
    } else {
      throw new Thrift.TProtocolException(Thrift.TProtocolExceptionType.UNKNOWN, 'Required field Src is unset!');
    }
    if (args.TextureDataUri !== undefined && args.TextureDataUri !== null) {
      this.TextureDataUri = args.TextureDataUri;
    } else {
      throw new Thrift.TProtocolException(Thrift.TProtocolExceptionType.UNKNOWN, 'Required field TextureDataUri is unset!');
    }
    if (args.FlipY !== undefined && args.FlipY !== null) {
      this.FlipY = args.FlipY;
    } else {
      throw new Thrift.TProtocolException(Thrift.TProtocolExceptionType.UNKNOWN, 'Required field FlipY is unset!');
    }
    if (args.OffsetX !== undefined && args.OffsetX !== null) {
      this.OffsetX = args.OffsetX;
    } else {
      throw new Thrift.TProtocolException(Thrift.TProtocolExceptionType.UNKNOWN, 'Required field OffsetX is unset!');
    }
    if (args.OffsetY !== undefined && args.OffsetY !== null) {
      this.OffsetY = args.OffsetY;
    } else {
      throw new Thrift.TProtocolException(Thrift.TProtocolExceptionType.UNKNOWN, 'Required field OffsetY is unset!');
    }
    if (args.RepeatX !== undefined && args.RepeatX !== null) {
      this.RepeatX = args.RepeatX;
    } else {
      throw new Thrift.TProtocolException(Thrift.TProtocolExceptionType.UNKNOWN, 'Required field RepeatX is unset!');
    }
    if (args.RepeatY !== undefined && args.RepeatY !== null) {
      this.RepeatY = args.RepeatY;
    } else {
      throw new Thrift.TProtocolException(Thrift.TProtocolExceptionType.UNKNOWN, 'Required field RepeatY is unset!');
    }
    if (args.WrapS !== undefined && args.WrapS !== null) {
      this.WrapS = args.WrapS;
    } else {
      throw new Thrift.TProtocolException(Thrift.TProtocolExceptionType.UNKNOWN, 'Required field WrapS is unset!');
    }
  }
};
ThreeJSTexture.prototype = {};
ThreeJSTexture.prototype.read = function(input) {
  input.readStructBegin();
  while (true)
  {
    var ret = input.readFieldBegin();
    var fname = ret.fname;
    var ftype = ret.ftype;
    var fid = ret.fid;
    if (ftype == Thrift.Type.STOP) {
      break;
    }
    switch (fid)
    {
      case 1:
      if (ftype == Thrift.Type.STRING) {
        this.Uuid = input.readString().value;
      } else {
        input.skip(ftype);
      }
      break;
      case 2:
      if (ftype == Thrift.Type.I64) {
        this.SourceHash = input.readI64().value;
      } else {
        input.skip(ftype);
      }
      break;
      case 3:
      if (ftype == Thrift.Type.STRING) {
        this.Src = input.readString().value;
      } else {
        input.skip(ftype);
      }
      break;
      case 4:
      if (ftype == Thrift.Type.STRING) {
        this.TextureDataUri = input.readBinary().value;
      } else {
        input.skip(ftype);
      }
      break;
      case 5:
      if (ftype == Thrift.Type.BOOL) {
        this.FlipY = input.readBool().value;
      } else {
        input.skip(ftype);
      }
      break;
      case 6:
      if (ftype == Thrift.Type.DOUBLE) {
        this.OffsetX = input.readDouble().value;
      } else {
        input.skip(ftype);
      }
      break;
      case 7:
      if (ftype == Thrift.Type.DOUBLE) {
        this.OffsetY = input.readDouble().value;
      } else {
        input.skip(ftype);
      }
      break;
      case 8:
      if (ftype == Thrift.Type.DOUBLE) {
        this.RepeatX = input.readDouble().value;
      } else {
        input.skip(ftype);
      }
      break;
      case 9:
      if (ftype == Thrift.Type.DOUBLE) {
        this.RepeatY = input.readDouble().value;
      } else {
        input.skip(ftype);
      }
      break;
      case 10:
      if (ftype == Thrift.Type.I16) {
        this.WrapS = input.readI16().value;
      } else {
        input.skip(ftype);
      }
      break;
      default:
        input.skip(ftype);
    }
    input.readFieldEnd();
  }
  input.readStructEnd();
  return;
};

ThreeJSTexture.prototype.write = function(output) {
  output.writeStructBegin('ThreeJSTexture');
  if (this.Uuid !== null && this.Uuid !== undefined) {
    output.writeFieldBegin('Uuid', Thrift.Type.STRING, 1);
    output.writeString(this.Uuid);
    output.writeFieldEnd();
  }
  if (this.SourceHash !== null && this.SourceHash !== undefined) {
    output.writeFieldBegin('SourceHash', Thrift.Type.I64, 2);
    output.writeI64(this.SourceHash);
    output.writeFieldEnd();
  }
  if (this.Src !== null && this.Src !== undefined) {
    output.writeFieldBegin('Src', Thrift.Type.STRING, 3);
    output.writeString(this.Src);
    output.writeFieldEnd();
  }
  if (this.TextureDataUri !== null && this.TextureDataUri !== undefined) {
    output.writeFieldBegin('TextureDataUri', Thrift.Type.STRING, 4);
    output.writeBinary(this.TextureDataUri);
    output.writeFieldEnd();
  }
  if (this.FlipY !== null && this.FlipY !== undefined) {
    output.writeFieldBegin('FlipY', Thrift.Type.BOOL, 5);
    output.writeBool(this.FlipY);
    output.writeFieldEnd();
  }
  if (this.OffsetX !== null && this.OffsetX !== undefined) {
    output.writeFieldBegin('OffsetX', Thrift.Type.DOUBLE, 6);
    output.writeDouble(this.OffsetX);
    output.writeFieldEnd();
  }
  if (this.OffsetY !== null && this.OffsetY !== undefined) {
    output.writeFieldBegin('OffsetY', Thrift.Type.DOUBLE, 7);
    output.writeDouble(this.OffsetY);
    output.writeFieldEnd();
  }
  if (this.RepeatX !== null && this.RepeatX !== undefined) {
    output.writeFieldBegin('RepeatX', Thrift.Type.DOUBLE, 8);
    output.writeDouble(this.RepeatX);
    output.writeFieldEnd();
  }
  if (this.RepeatY !== null && this.RepeatY !== undefined) {
    output.writeFieldBegin('RepeatY', Thrift.Type.DOUBLE, 9);
    output.writeDouble(this.RepeatY);
    output.writeFieldEnd();
  }
  if (this.WrapS !== null && this.WrapS !== undefined) {
    output.writeFieldBegin('WrapS', Thrift.Type.I16, 10);
    output.writeI16(this.WrapS);
    output.writeFieldEnd();
  }
  output.writeFieldStop();
  output.writeStructEnd();
  return;
};

ThreeJSColliderFlags = function(args) {
  this.Enabled = null;
  if (args) {
    if (args.Enabled !== undefined && args.Enabled !== null) {
      this.Enabled = args.Enabled;
    } else {
      throw new Thrift.TProtocolException(Thrift.TProtocolExceptionType.UNKNOWN, 'Required field Enabled is unset!');
    }
  }
};
ThreeJSColliderFlags.prototype = {};
ThreeJSColliderFlags.prototype.read = function(input) {
  input.readStructBegin();
  while (true)
  {
    var ret = input.readFieldBegin();
    var fname = ret.fname;
    var ftype = ret.ftype;
    var fid = ret.fid;
    if (ftype == Thrift.Type.STOP) {
      break;
    }
    switch (fid)
    {
      case 1:
      if (ftype == Thrift.Type.BOOL) {
        this.Enabled = input.readBool().value;
      } else {
        input.skip(ftype);
      }
      break;
      case 0:
        input.skip(ftype);
        break;
      default:
        input.skip(ftype);
    }
    input.readFieldEnd();
  }
  input.readStructEnd();
  return;
};

ThreeJSColliderFlags.prototype.write = function(output) {
  output.writeStructBegin('ThreeJSColliderFlags');
  if (this.Enabled !== null && this.Enabled !== undefined) {
    output.writeFieldBegin('Enabled', Thrift.Type.BOOL, 1);
    output.writeBool(this.Enabled);
    output.writeFieldEnd();
  }
  output.writeFieldStop();
  output.writeStructEnd();
  return;
};

ThreeJSAltspaceFlags = function(args) {
  this.ColliderFlags = null;
  if (args) {
    if (args.ColliderFlags !== undefined && args.ColliderFlags !== null) {
      this.ColliderFlags = new ThreeJSColliderFlags(args.ColliderFlags);
    } else {
      throw new Thrift.TProtocolException(Thrift.TProtocolExceptionType.UNKNOWN, 'Required field ColliderFlags is unset!');
    }
  }
};
ThreeJSAltspaceFlags.prototype = {};
ThreeJSAltspaceFlags.prototype.read = function(input) {
  input.readStructBegin();
  while (true)
  {
    var ret = input.readFieldBegin();
    var fname = ret.fname;
    var ftype = ret.ftype;
    var fid = ret.fid;
    if (ftype == Thrift.Type.STOP) {
      break;
    }
    switch (fid)
    {
      case 1:
      if (ftype == Thrift.Type.STRUCT) {
        this.ColliderFlags = new ThreeJSColliderFlags();
        this.ColliderFlags.read(input);
      } else {
        input.skip(ftype);
      }
      break;
      case 0:
        input.skip(ftype);
        break;
      default:
        input.skip(ftype);
    }
    input.readFieldEnd();
  }
  input.readStructEnd();
  return;
};

ThreeJSAltspaceFlags.prototype.write = function(output) {
  output.writeStructBegin('ThreeJSAltspaceFlags');
  if (this.ColliderFlags !== null && this.ColliderFlags !== undefined) {
    output.writeFieldBegin('ColliderFlags', Thrift.Type.STRUCT, 1);
    this.ColliderFlags.write(output);
    output.writeFieldEnd();
  }
  output.writeFieldStop();
  output.writeStructEnd();
  return;
};

ThreeJSMesh = function(args) {
  this.MeshId = null;
  this.Geometry = null;
  this.Material = null;
  this.AltspaceFlags = null;
  if (args) {
    if (args.MeshId !== undefined && args.MeshId !== null) {
      this.MeshId = args.MeshId;
    } else {
      throw new Thrift.TProtocolException(Thrift.TProtocolExceptionType.UNKNOWN, 'Required field MeshId is unset!');
    }
    if (args.Geometry !== undefined && args.Geometry !== null) {
      this.Geometry = args.Geometry;
    } else {
      throw new Thrift.TProtocolException(Thrift.TProtocolExceptionType.UNKNOWN, 'Required field Geometry is unset!');
    }
    if (args.Material !== undefined && args.Material !== null) {
      this.Material = args.Material;
    } else {
      throw new Thrift.TProtocolException(Thrift.TProtocolExceptionType.UNKNOWN, 'Required field Material is unset!');
    }
    if (args.AltspaceFlags !== undefined && args.AltspaceFlags !== null) {
      this.AltspaceFlags = new ThreeJSAltspaceFlags(args.AltspaceFlags);
    } else {
      throw new Thrift.TProtocolException(Thrift.TProtocolExceptionType.UNKNOWN, 'Required field AltspaceFlags is unset!');
    }
  }
};
ThreeJSMesh.prototype = {};
ThreeJSMesh.prototype.read = function(input) {
  input.readStructBegin();
  while (true)
  {
    var ret = input.readFieldBegin();
    var fname = ret.fname;
    var ftype = ret.ftype;
    var fid = ret.fid;
    if (ftype == Thrift.Type.STOP) {
      break;
    }
    switch (fid)
    {
      case 1:
      if (ftype == Thrift.Type.I32) {
        this.MeshId = input.readI32().value;
      } else {
        input.skip(ftype);
      }
      break;
      case 2:
      if (ftype == Thrift.Type.STRING) {
        this.Geometry = input.readString().value;
      } else {
        input.skip(ftype);
      }
      break;
      case 3:
      if (ftype == Thrift.Type.STRING) {
        this.Material = input.readString().value;
      } else {
        input.skip(ftype);
      }
      break;
      case 4:
      if (ftype == Thrift.Type.STRUCT) {
        this.AltspaceFlags = new ThreeJSAltspaceFlags();
        this.AltspaceFlags.read(input);
      } else {
        input.skip(ftype);
      }
      break;
      default:
        input.skip(ftype);
    }
    input.readFieldEnd();
  }
  input.readStructEnd();
  return;
};

ThreeJSMesh.prototype.write = function(output) {
  output.writeStructBegin('ThreeJSMesh');
  if (this.MeshId !== null && this.MeshId !== undefined) {
    output.writeFieldBegin('MeshId', Thrift.Type.I32, 1);
    output.writeI32(this.MeshId);
    output.writeFieldEnd();
  }
  if (this.Geometry !== null && this.Geometry !== undefined) {
    output.writeFieldBegin('Geometry', Thrift.Type.STRING, 2);
    output.writeString(this.Geometry);
    output.writeFieldEnd();
  }
  if (this.Material !== null && this.Material !== undefined) {
    output.writeFieldBegin('Material', Thrift.Type.STRING, 3);
    output.writeString(this.Material);
    output.writeFieldEnd();
  }
  if (this.AltspaceFlags !== null && this.AltspaceFlags !== undefined) {
    output.writeFieldBegin('AltspaceFlags', Thrift.Type.STRUCT, 4);
    this.AltspaceFlags.write(output);
    output.writeFieldEnd();
  }
  output.writeFieldStop();
  output.writeStructEnd();
  return;
};

ThreeJSScene = function(args) {
  this.Geometries = null;
  this.Materials = null;
  this.Meshes = null;
  this.Textures = null;
  this.Initialized = null;
  if (args) {
    if (args.Geometries !== undefined && args.Geometries !== null) {
      this.Geometries = Thrift.copyList(args.Geometries, [ThreeJSGeometry]);
    } else {
      throw new Thrift.TProtocolException(Thrift.TProtocolExceptionType.UNKNOWN, 'Required field Geometries is unset!');
    }
    if (args.Materials !== undefined && args.Materials !== null) {
      this.Materials = Thrift.copyList(args.Materials, [ThreeJSMaterial]);
    } else {
      throw new Thrift.TProtocolException(Thrift.TProtocolExceptionType.UNKNOWN, 'Required field Materials is unset!');
    }
    if (args.Meshes !== undefined && args.Meshes !== null) {
      this.Meshes = Thrift.copyList(args.Meshes, [ThreeJSMesh]);
    } else {
      throw new Thrift.TProtocolException(Thrift.TProtocolExceptionType.UNKNOWN, 'Required field Meshes is unset!');
    }
    if (args.Textures !== undefined && args.Textures !== null) {
      this.Textures = Thrift.copyList(args.Textures, [ThreeJSTexture]);
    } else {
      throw new Thrift.TProtocolException(Thrift.TProtocolExceptionType.UNKNOWN, 'Required field Textures is unset!');
    }
    if (args.Initialized !== undefined && args.Initialized !== null) {
      this.Initialized = args.Initialized;
    } else {
      throw new Thrift.TProtocolException(Thrift.TProtocolExceptionType.UNKNOWN, 'Required field Initialized is unset!');
    }
  }
};
ThreeJSScene.prototype = {};
ThreeJSScene.prototype.read = function(input) {
  input.readStructBegin();
  while (true)
  {
    var ret = input.readFieldBegin();
    var fname = ret.fname;
    var ftype = ret.ftype;
    var fid = ret.fid;
    if (ftype == Thrift.Type.STOP) {
      break;
    }
    switch (fid)
    {
      case 1:
      if (ftype == Thrift.Type.LIST) {
        var _size40 = 0;
        var _rtmp344;
        this.Geometries = [];
        var _etype43 = 0;
        _rtmp344 = input.readListBegin();
        _etype43 = _rtmp344.etype;
        _size40 = _rtmp344.size;
        for (var _i45 = 0; _i45 < _size40; ++_i45)
        {
          var elem46 = null;
          elem46 = new ThreeJSGeometry();
          elem46.read(input);
          this.Geometries.push(elem46);
        }
        input.readListEnd();
      } else {
        input.skip(ftype);
      }
      break;
      case 2:
      if (ftype == Thrift.Type.LIST) {
        var _size47 = 0;
        var _rtmp351;
        this.Materials = [];
        var _etype50 = 0;
        _rtmp351 = input.readListBegin();
        _etype50 = _rtmp351.etype;
        _size47 = _rtmp351.size;
        for (var _i52 = 0; _i52 < _size47; ++_i52)
        {
          var elem53 = null;
          elem53 = new ThreeJSMaterial();
          elem53.read(input);
          this.Materials.push(elem53);
        }
        input.readListEnd();
      } else {
        input.skip(ftype);
      }
      break;
      case 3:
      if (ftype == Thrift.Type.LIST) {
        var _size54 = 0;
        var _rtmp358;
        this.Meshes = [];
        var _etype57 = 0;
        _rtmp358 = input.readListBegin();
        _etype57 = _rtmp358.etype;
        _size54 = _rtmp358.size;
        for (var _i59 = 0; _i59 < _size54; ++_i59)
        {
          var elem60 = null;
          elem60 = new ThreeJSMesh();
          elem60.read(input);
          this.Meshes.push(elem60);
        }
        input.readListEnd();
      } else {
        input.skip(ftype);
      }
      break;
      case 4:
      if (ftype == Thrift.Type.LIST) {
        var _size61 = 0;
        var _rtmp365;
        this.Textures = [];
        var _etype64 = 0;
        _rtmp365 = input.readListBegin();
        _etype64 = _rtmp365.etype;
        _size61 = _rtmp365.size;
        for (var _i66 = 0; _i66 < _size61; ++_i66)
        {
          var elem67 = null;
          elem67 = new ThreeJSTexture();
          elem67.read(input);
          this.Textures.push(elem67);
        }
        input.readListEnd();
      } else {
        input.skip(ftype);
      }
      break;
      case 5:
      if (ftype == Thrift.Type.BOOL) {
        this.Initialized = input.readBool().value;
      } else {
        input.skip(ftype);
      }
      break;
      default:
        input.skip(ftype);
    }
    input.readFieldEnd();
  }
  input.readStructEnd();
  return;
};

ThreeJSScene.prototype.write = function(output) {
  output.writeStructBegin('ThreeJSScene');
  if (this.Geometries !== null && this.Geometries !== undefined) {
    output.writeFieldBegin('Geometries', Thrift.Type.LIST, 1);
    output.writeListBegin(Thrift.Type.STRUCT, this.Geometries.length);
    for (var iter68 in this.Geometries)
    {
      if (this.Geometries.hasOwnProperty(iter68))
      {
        iter68 = this.Geometries[iter68];
        iter68.write(output);
      }
    }
    output.writeListEnd();
    output.writeFieldEnd();
  }
  if (this.Materials !== null && this.Materials !== undefined) {
    output.writeFieldBegin('Materials', Thrift.Type.LIST, 2);
    output.writeListBegin(Thrift.Type.STRUCT, this.Materials.length);
    for (var iter69 in this.Materials)
    {
      if (this.Materials.hasOwnProperty(iter69))
      {
        iter69 = this.Materials[iter69];
        iter69.write(output);
      }
    }
    output.writeListEnd();
    output.writeFieldEnd();
  }
  if (this.Meshes !== null && this.Meshes !== undefined) {
    output.writeFieldBegin('Meshes', Thrift.Type.LIST, 3);
    output.writeListBegin(Thrift.Type.STRUCT, this.Meshes.length);
    for (var iter70 in this.Meshes)
    {
      if (this.Meshes.hasOwnProperty(iter70))
      {
        iter70 = this.Meshes[iter70];
        iter70.write(output);
      }
    }
    output.writeListEnd();
    output.writeFieldEnd();
  }
  if (this.Textures !== null && this.Textures !== undefined) {
    output.writeFieldBegin('Textures', Thrift.Type.LIST, 4);
    output.writeListBegin(Thrift.Type.STRUCT, this.Textures.length);
    for (var iter71 in this.Textures)
    {
      if (this.Textures.hasOwnProperty(iter71))
      {
        iter71 = this.Textures[iter71];
        iter71.write(output);
      }
    }
    output.writeListEnd();
    output.writeFieldEnd();
  }
  if (this.Initialized !== null && this.Initialized !== undefined) {
    output.writeFieldBegin('Initialized', Thrift.Type.BOOL, 5);
    output.writeBool(this.Initialized);
    output.writeFieldEnd();
  }
  output.writeFieldStop();
  output.writeStructEnd();
  return;
};

ThreeJSUpdate = function(args) {
  this.SceneObjectUpdates = null;
  this.SceneObjectsToRemove = null;
  this.Index = null;
  if (args) {
    if (args.SceneObjectUpdates !== undefined && args.SceneObjectUpdates !== null) {
      this.SceneObjectUpdates = Thrift.copyList(args.SceneObjectUpdates, [ThreeJSSceneObject]);
    }
    if (args.SceneObjectsToRemove !== undefined && args.SceneObjectsToRemove !== null) {
      this.SceneObjectsToRemove = Thrift.copyList(args.SceneObjectsToRemove, [null]);
    }
    if (args.Index !== undefined && args.Index !== null) {
      this.Index = args.Index;
    } else {
      throw new Thrift.TProtocolException(Thrift.TProtocolExceptionType.UNKNOWN, 'Required field Index is unset!');
    }
  }
};
ThreeJSUpdate.prototype = {};
ThreeJSUpdate.prototype.read = function(input) {
  input.readStructBegin();
  while (true)
  {
    var ret = input.readFieldBegin();
    var fname = ret.fname;
    var ftype = ret.ftype;
    var fid = ret.fid;
    if (ftype == Thrift.Type.STOP) {
      break;
    }
    switch (fid)
    {
      case 1:
      if (ftype == Thrift.Type.LIST) {
        var _size72 = 0;
        var _rtmp376;
        this.SceneObjectUpdates = [];
        var _etype75 = 0;
        _rtmp376 = input.readListBegin();
        _etype75 = _rtmp376.etype;
        _size72 = _rtmp376.size;
        for (var _i77 = 0; _i77 < _size72; ++_i77)
        {
          var elem78 = null;
          elem78 = new ThreeJSSceneObject();
          elem78.read(input);
          this.SceneObjectUpdates.push(elem78);
        }
        input.readListEnd();
      } else {
        input.skip(ftype);
      }
      break;
      case 2:
      if (ftype == Thrift.Type.LIST) {
        var _size79 = 0;
        var _rtmp383;
        this.SceneObjectsToRemove = [];
        var _etype82 = 0;
        _rtmp383 = input.readListBegin();
        _etype82 = _rtmp383.etype;
        _size79 = _rtmp383.size;
        for (var _i84 = 0; _i84 < _size79; ++_i84)
        {
          var elem85 = null;
          elem85 = input.readI32().value;
          this.SceneObjectsToRemove.push(elem85);
        }
        input.readListEnd();
      } else {
        input.skip(ftype);
      }
      break;
      case 3:
      if (ftype == Thrift.Type.I32) {
        this.Index = input.readI32().value;
      } else {
        input.skip(ftype);
      }
      break;
      default:
        input.skip(ftype);
    }
    input.readFieldEnd();
  }
  input.readStructEnd();
  return;
};

ThreeJSUpdate.prototype.write = function(output) {
  output.writeStructBegin('ThreeJSUpdate');
  if (this.SceneObjectUpdates !== null && this.SceneObjectUpdates !== undefined) {
    output.writeFieldBegin('SceneObjectUpdates', Thrift.Type.LIST, 1);
    output.writeListBegin(Thrift.Type.STRUCT, this.SceneObjectUpdates.length);
    for (var iter86 in this.SceneObjectUpdates)
    {
      if (this.SceneObjectUpdates.hasOwnProperty(iter86))
      {
        iter86 = this.SceneObjectUpdates[iter86];
        iter86.write(output);
      }
    }
    output.writeListEnd();
    output.writeFieldEnd();
  }
  if (this.SceneObjectsToRemove !== null && this.SceneObjectsToRemove !== undefined) {
    output.writeFieldBegin('SceneObjectsToRemove', Thrift.Type.LIST, 2);
    output.writeListBegin(Thrift.Type.I32, this.SceneObjectsToRemove.length);
    for (var iter87 in this.SceneObjectsToRemove)
    {
      if (this.SceneObjectsToRemove.hasOwnProperty(iter87))
      {
        iter87 = this.SceneObjectsToRemove[iter87];
        output.writeI32(iter87);
      }
    }
    output.writeListEnd();
    output.writeFieldEnd();
  }
  if (this.Index !== null && this.Index !== undefined) {
    output.writeFieldBegin('Index', Thrift.Type.I32, 3);
    output.writeI32(this.Index);
    output.writeFieldEnd();
  }
  output.writeFieldStop();
  output.writeStructEnd();
  return;
};

BindCallMessage = function(args) {
  this.BindingName = null;
  this.RequestID = null;
  this.ThreeJSUpdate = null;
  this.ThreeJSScene = null;
  this.ArgumentObjectType = null;
  this.ArgumentObjectArg0Name = null;
  this.ArgumentObjectArg0StringValue = null;
  this.ArgumentObjectArg0NumericValue = null;
  this.ArgumentObjectArg1Name = null;
  this.ArgumentObjectArg1StringValue = null;
  this.ArgumentObjectArg1NumericValue = null;
  this.ArgumentObjectArg2Name = null;
  this.ArgumentObjectArg2StringValue = null;
  this.ArgumentObjectArg2NumericValue = null;
  this.ArgumentObjectArg3Name = null;
  this.ArgumentObjectArg3StringValue = null;
  this.ArgumentObjectArg3NumericValue = null;
  this.ArgumentObjectArg4Name = null;
  this.ArgumentObjectArg4StringValue = null;
  this.ArgumentObjectArg4NumericValue = null;
  this.ArgumentObjectArg5Name = null;
  this.ArgumentObjectArg5StringValue = null;
  this.ArgumentObjectArg5NumericValue = null;
  this.ArgumentObjectArg6Name = null;
  this.ArgumentObjectArg6StringValue = null;
  this.ArgumentObjectArg6NumericValue = null;
  this.ArgumentObjectArg7Name = null;
  this.ArgumentObjectArg7StringValue = null;
  this.ArgumentObjectArg7NumericValue = null;
  this.ArgumentObjectArg8Name = null;
  this.ArgumentObjectArg8StringValue = null;
  this.ArgumentObjectArg8NumericValue = null;
  this.ArgumentObjectArg9Name = null;
  this.ArgumentObjectArg9StringValue = null;
  this.ArgumentObjectArg9NumericValue = null;
  if (args) {
    if (args.BindingName !== undefined && args.BindingName !== null) {
      this.BindingName = args.BindingName;
    } else {
      throw new Thrift.TProtocolException(Thrift.TProtocolExceptionType.UNKNOWN, 'Required field BindingName is unset!');
    }
    if (args.RequestID !== undefined && args.RequestID !== null) {
      this.RequestID = args.RequestID;
    } else {
      throw new Thrift.TProtocolException(Thrift.TProtocolExceptionType.UNKNOWN, 'Required field RequestID is unset!');
    }
    if (args.ThreeJSUpdate !== undefined && args.ThreeJSUpdate !== null) {
      this.ThreeJSUpdate = new ThreeJSUpdate(args.ThreeJSUpdate);
    }
    if (args.ThreeJSScene !== undefined && args.ThreeJSScene !== null) {
      this.ThreeJSScene = new ThreeJSScene(args.ThreeJSScene);
    }
    if (args.ArgumentObjectType !== undefined && args.ArgumentObjectType !== null) {
      this.ArgumentObjectType = args.ArgumentObjectType;
    }
    if (args.ArgumentObjectArg0Name !== undefined && args.ArgumentObjectArg0Name !== null) {
      this.ArgumentObjectArg0Name = args.ArgumentObjectArg0Name;
    }
    if (args.ArgumentObjectArg0StringValue !== undefined && args.ArgumentObjectArg0StringValue !== null) {
      this.ArgumentObjectArg0StringValue = args.ArgumentObjectArg0StringValue;
    }
    if (args.ArgumentObjectArg0NumericValue !== undefined && args.ArgumentObjectArg0NumericValue !== null) {
      this.ArgumentObjectArg0NumericValue = args.ArgumentObjectArg0NumericValue;
    }
    if (args.ArgumentObjectArg1Name !== undefined && args.ArgumentObjectArg1Name !== null) {
      this.ArgumentObjectArg1Name = args.ArgumentObjectArg1Name;
    }
    if (args.ArgumentObjectArg1StringValue !== undefined && args.ArgumentObjectArg1StringValue !== null) {
      this.ArgumentObjectArg1StringValue = args.ArgumentObjectArg1StringValue;
    }
    if (args.ArgumentObjectArg1NumericValue !== undefined && args.ArgumentObjectArg1NumericValue !== null) {
      this.ArgumentObjectArg1NumericValue = args.ArgumentObjectArg1NumericValue;
    }
    if (args.ArgumentObjectArg2Name !== undefined && args.ArgumentObjectArg2Name !== null) {
      this.ArgumentObjectArg2Name = args.ArgumentObjectArg2Name;
    }
    if (args.ArgumentObjectArg2StringValue !== undefined && args.ArgumentObjectArg2StringValue !== null) {
      this.ArgumentObjectArg2StringValue = args.ArgumentObjectArg2StringValue;
    }
    if (args.ArgumentObjectArg2NumericValue !== undefined && args.ArgumentObjectArg2NumericValue !== null) {
      this.ArgumentObjectArg2NumericValue = args.ArgumentObjectArg2NumericValue;
    }
    if (args.ArgumentObjectArg3Name !== undefined && args.ArgumentObjectArg3Name !== null) {
      this.ArgumentObjectArg3Name = args.ArgumentObjectArg3Name;
    }
    if (args.ArgumentObjectArg3StringValue !== undefined && args.ArgumentObjectArg3StringValue !== null) {
      this.ArgumentObjectArg3StringValue = args.ArgumentObjectArg3StringValue;
    }
    if (args.ArgumentObjectArg3NumericValue !== undefined && args.ArgumentObjectArg3NumericValue !== null) {
      this.ArgumentObjectArg3NumericValue = args.ArgumentObjectArg3NumericValue;
    }
    if (args.ArgumentObjectArg4Name !== undefined && args.ArgumentObjectArg4Name !== null) {
      this.ArgumentObjectArg4Name = args.ArgumentObjectArg4Name;
    }
    if (args.ArgumentObjectArg4StringValue !== undefined && args.ArgumentObjectArg4StringValue !== null) {
      this.ArgumentObjectArg4StringValue = args.ArgumentObjectArg4StringValue;
    }
    if (args.ArgumentObjectArg4NumericValue !== undefined && args.ArgumentObjectArg4NumericValue !== null) {
      this.ArgumentObjectArg4NumericValue = args.ArgumentObjectArg4NumericValue;
    }
    if (args.ArgumentObjectArg5Name !== undefined && args.ArgumentObjectArg5Name !== null) {
      this.ArgumentObjectArg5Name = args.ArgumentObjectArg5Name;
    }
    if (args.ArgumentObjectArg5StringValue !== undefined && args.ArgumentObjectArg5StringValue !== null) {
      this.ArgumentObjectArg5StringValue = args.ArgumentObjectArg5StringValue;
    }
    if (args.ArgumentObjectArg5NumericValue !== undefined && args.ArgumentObjectArg5NumericValue !== null) {
      this.ArgumentObjectArg5NumericValue = args.ArgumentObjectArg5NumericValue;
    }
    if (args.ArgumentObjectArg6Name !== undefined && args.ArgumentObjectArg6Name !== null) {
      this.ArgumentObjectArg6Name = args.ArgumentObjectArg6Name;
    }
    if (args.ArgumentObjectArg6StringValue !== undefined && args.ArgumentObjectArg6StringValue !== null) {
      this.ArgumentObjectArg6StringValue = args.ArgumentObjectArg6StringValue;
    }
    if (args.ArgumentObjectArg6NumericValue !== undefined && args.ArgumentObjectArg6NumericValue !== null) {
      this.ArgumentObjectArg6NumericValue = args.ArgumentObjectArg6NumericValue;
    }
    if (args.ArgumentObjectArg7Name !== undefined && args.ArgumentObjectArg7Name !== null) {
      this.ArgumentObjectArg7Name = args.ArgumentObjectArg7Name;
    }
    if (args.ArgumentObjectArg7StringValue !== undefined && args.ArgumentObjectArg7StringValue !== null) {
      this.ArgumentObjectArg7StringValue = args.ArgumentObjectArg7StringValue;
    }
    if (args.ArgumentObjectArg7NumericValue !== undefined && args.ArgumentObjectArg7NumericValue !== null) {
      this.ArgumentObjectArg7NumericValue = args.ArgumentObjectArg7NumericValue;
    }
    if (args.ArgumentObjectArg8Name !== undefined && args.ArgumentObjectArg8Name !== null) {
      this.ArgumentObjectArg8Name = args.ArgumentObjectArg8Name;
    }
    if (args.ArgumentObjectArg8StringValue !== undefined && args.ArgumentObjectArg8StringValue !== null) {
      this.ArgumentObjectArg8StringValue = args.ArgumentObjectArg8StringValue;
    }
    if (args.ArgumentObjectArg8NumericValue !== undefined && args.ArgumentObjectArg8NumericValue !== null) {
      this.ArgumentObjectArg8NumericValue = args.ArgumentObjectArg8NumericValue;
    }
    if (args.ArgumentObjectArg9Name !== undefined && args.ArgumentObjectArg9Name !== null) {
      this.ArgumentObjectArg9Name = args.ArgumentObjectArg9Name;
    }
    if (args.ArgumentObjectArg9StringValue !== undefined && args.ArgumentObjectArg9StringValue !== null) {
      this.ArgumentObjectArg9StringValue = args.ArgumentObjectArg9StringValue;
    }
    if (args.ArgumentObjectArg9NumericValue !== undefined && args.ArgumentObjectArg9NumericValue !== null) {
      this.ArgumentObjectArg9NumericValue = args.ArgumentObjectArg9NumericValue;
    }
  }
};
BindCallMessage.prototype = {};
BindCallMessage.prototype.read = function(input) {
  input.readStructBegin();
  while (true)
  {
    var ret = input.readFieldBegin();
    var fname = ret.fname;
    var ftype = ret.ftype;
    var fid = ret.fid;
    if (ftype == Thrift.Type.STOP) {
      break;
    }
    switch (fid)
    {
      case 1:
      if (ftype == Thrift.Type.STRING) {
        this.BindingName = input.readString().value;
      } else {
        input.skip(ftype);
      }
      break;
      case 2:
      if (ftype == Thrift.Type.I32) {
        this.RequestID = input.readI32().value;
      } else {
        input.skip(ftype);
      }
      break;
      case 3:
      if (ftype == Thrift.Type.STRUCT) {
        this.ThreeJSUpdate = new ThreeJSUpdate();
        this.ThreeJSUpdate.read(input);
      } else {
        input.skip(ftype);
      }
      break;
      case 4:
      if (ftype == Thrift.Type.STRUCT) {
        this.ThreeJSScene = new ThreeJSScene();
        this.ThreeJSScene.read(input);
      } else {
        input.skip(ftype);
      }
      break;
      case 5:
      if (ftype == Thrift.Type.STRING) {
        this.ArgumentObjectType = input.readString().value;
      } else {
        input.skip(ftype);
      }
      break;
      case 6:
      if (ftype == Thrift.Type.STRING) {
        this.ArgumentObjectArg0Name = input.readString().value;
      } else {
        input.skip(ftype);
      }
      break;
      case 7:
      if (ftype == Thrift.Type.STRING) {
        this.ArgumentObjectArg0StringValue = input.readString().value;
      } else {
        input.skip(ftype);
      }
      break;
      case 8:
      if (ftype == Thrift.Type.DOUBLE) {
        this.ArgumentObjectArg0NumericValue = input.readDouble().value;
      } else {
        input.skip(ftype);
      }
      break;
      case 9:
      if (ftype == Thrift.Type.STRING) {
        this.ArgumentObjectArg1Name = input.readString().value;
      } else {
        input.skip(ftype);
      }
      break;
      case 10:
      if (ftype == Thrift.Type.STRING) {
        this.ArgumentObjectArg1StringValue = input.readString().value;
      } else {
        input.skip(ftype);
      }
      break;
      case 11:
      if (ftype == Thrift.Type.DOUBLE) {
        this.ArgumentObjectArg1NumericValue = input.readDouble().value;
      } else {
        input.skip(ftype);
      }
      break;
      case 12:
      if (ftype == Thrift.Type.STRING) {
        this.ArgumentObjectArg2Name = input.readString().value;
      } else {
        input.skip(ftype);
      }
      break;
      case 13:
      if (ftype == Thrift.Type.STRING) {
        this.ArgumentObjectArg2StringValue = input.readString().value;
      } else {
        input.skip(ftype);
      }
      break;
      case 14:
      if (ftype == Thrift.Type.DOUBLE) {
        this.ArgumentObjectArg2NumericValue = input.readDouble().value;
      } else {
        input.skip(ftype);
      }
      break;
      case 15:
      if (ftype == Thrift.Type.STRING) {
        this.ArgumentObjectArg3Name = input.readString().value;
      } else {
        input.skip(ftype);
      }
      break;
      case 16:
      if (ftype == Thrift.Type.STRING) {
        this.ArgumentObjectArg3StringValue = input.readString().value;
      } else {
        input.skip(ftype);
      }
      break;
      case 17:
      if (ftype == Thrift.Type.DOUBLE) {
        this.ArgumentObjectArg3NumericValue = input.readDouble().value;
      } else {
        input.skip(ftype);
      }
      break;
      case 18:
      if (ftype == Thrift.Type.STRING) {
        this.ArgumentObjectArg4Name = input.readString().value;
      } else {
        input.skip(ftype);
      }
      break;
      case 19:
      if (ftype == Thrift.Type.STRING) {
        this.ArgumentObjectArg4StringValue = input.readString().value;
      } else {
        input.skip(ftype);
      }
      break;
      case 20:
      if (ftype == Thrift.Type.DOUBLE) {
        this.ArgumentObjectArg4NumericValue = input.readDouble().value;
      } else {
        input.skip(ftype);
      }
      break;
      case 21:
      if (ftype == Thrift.Type.STRING) {
        this.ArgumentObjectArg5Name = input.readString().value;
      } else {
        input.skip(ftype);
      }
      break;
      case 22:
      if (ftype == Thrift.Type.STRING) {
        this.ArgumentObjectArg5StringValue = input.readString().value;
      } else {
        input.skip(ftype);
      }
      break;
      case 23:
      if (ftype == Thrift.Type.DOUBLE) {
        this.ArgumentObjectArg5NumericValue = input.readDouble().value;
      } else {
        input.skip(ftype);
      }
      break;
      case 24:
      if (ftype == Thrift.Type.STRING) {
        this.ArgumentObjectArg6Name = input.readString().value;
      } else {
        input.skip(ftype);
      }
      break;
      case 25:
      if (ftype == Thrift.Type.STRING) {
        this.ArgumentObjectArg6StringValue = input.readString().value;
      } else {
        input.skip(ftype);
      }
      break;
      case 26:
      if (ftype == Thrift.Type.DOUBLE) {
        this.ArgumentObjectArg6NumericValue = input.readDouble().value;
      } else {
        input.skip(ftype);
      }
      break;
      case 27:
      if (ftype == Thrift.Type.STRING) {
        this.ArgumentObjectArg7Name = input.readString().value;
      } else {
        input.skip(ftype);
      }
      break;
      case 28:
      if (ftype == Thrift.Type.STRING) {
        this.ArgumentObjectArg7StringValue = input.readString().value;
      } else {
        input.skip(ftype);
      }
      break;
      case 29:
      if (ftype == Thrift.Type.DOUBLE) {
        this.ArgumentObjectArg7NumericValue = input.readDouble().value;
      } else {
        input.skip(ftype);
      }
      break;
      case 30:
      if (ftype == Thrift.Type.STRING) {
        this.ArgumentObjectArg8Name = input.readString().value;
      } else {
        input.skip(ftype);
      }
      break;
      case 31:
      if (ftype == Thrift.Type.STRING) {
        this.ArgumentObjectArg8StringValue = input.readString().value;
      } else {
        input.skip(ftype);
      }
      break;
      case 32:
      if (ftype == Thrift.Type.DOUBLE) {
        this.ArgumentObjectArg8NumericValue = input.readDouble().value;
      } else {
        input.skip(ftype);
      }
      break;
      case 33:
      if (ftype == Thrift.Type.STRING) {
        this.ArgumentObjectArg9Name = input.readString().value;
      } else {
        input.skip(ftype);
      }
      break;
      case 34:
      if (ftype == Thrift.Type.STRING) {
        this.ArgumentObjectArg9StringValue = input.readString().value;
      } else {
        input.skip(ftype);
      }
      break;
      case 35:
      if (ftype == Thrift.Type.DOUBLE) {
        this.ArgumentObjectArg9NumericValue = input.readDouble().value;
      } else {
        input.skip(ftype);
      }
      break;
      default:
        input.skip(ftype);
    }
    input.readFieldEnd();
  }
  input.readStructEnd();
  return;
};

BindCallMessage.prototype.write = function(output) {
  output.writeStructBegin('BindCallMessage');
  if (this.BindingName !== null && this.BindingName !== undefined) {
    output.writeFieldBegin('BindingName', Thrift.Type.STRING, 1);
    output.writeString(this.BindingName);
    output.writeFieldEnd();
  }
  if (this.RequestID !== null && this.RequestID !== undefined) {
    output.writeFieldBegin('RequestID', Thrift.Type.I32, 2);
    output.writeI32(this.RequestID);
    output.writeFieldEnd();
  }
  if (this.ThreeJSUpdate !== null && this.ThreeJSUpdate !== undefined) {
    output.writeFieldBegin('ThreeJSUpdate', Thrift.Type.STRUCT, 3);
    this.ThreeJSUpdate.write(output);
    output.writeFieldEnd();
  }
  if (this.ThreeJSScene !== null && this.ThreeJSScene !== undefined) {
    output.writeFieldBegin('ThreeJSScene', Thrift.Type.STRUCT, 4);
    this.ThreeJSScene.write(output);
    output.writeFieldEnd();
  }
  if (this.ArgumentObjectType !== null && this.ArgumentObjectType !== undefined) {
    output.writeFieldBegin('ArgumentObjectType', Thrift.Type.STRING, 5);
    output.writeString(this.ArgumentObjectType);
    output.writeFieldEnd();
  }
  if (this.ArgumentObjectArg0Name !== null && this.ArgumentObjectArg0Name !== undefined) {
    output.writeFieldBegin('ArgumentObjectArg0Name', Thrift.Type.STRING, 6);
    output.writeString(this.ArgumentObjectArg0Name);
    output.writeFieldEnd();
  }
  if (this.ArgumentObjectArg0StringValue !== null && this.ArgumentObjectArg0StringValue !== undefined) {
    output.writeFieldBegin('ArgumentObjectArg0StringValue', Thrift.Type.STRING, 7);
    output.writeString(this.ArgumentObjectArg0StringValue);
    output.writeFieldEnd();
  }
  if (this.ArgumentObjectArg0NumericValue !== null && this.ArgumentObjectArg0NumericValue !== undefined) {
    output.writeFieldBegin('ArgumentObjectArg0NumericValue', Thrift.Type.DOUBLE, 8);
    output.writeDouble(this.ArgumentObjectArg0NumericValue);
    output.writeFieldEnd();
  }
  if (this.ArgumentObjectArg1Name !== null && this.ArgumentObjectArg1Name !== undefined) {
    output.writeFieldBegin('ArgumentObjectArg1Name', Thrift.Type.STRING, 9);
    output.writeString(this.ArgumentObjectArg1Name);
    output.writeFieldEnd();
  }
  if (this.ArgumentObjectArg1StringValue !== null && this.ArgumentObjectArg1StringValue !== undefined) {
    output.writeFieldBegin('ArgumentObjectArg1StringValue', Thrift.Type.STRING, 10);
    output.writeString(this.ArgumentObjectArg1StringValue);
    output.writeFieldEnd();
  }
  if (this.ArgumentObjectArg1NumericValue !== null && this.ArgumentObjectArg1NumericValue !== undefined) {
    output.writeFieldBegin('ArgumentObjectArg1NumericValue', Thrift.Type.DOUBLE, 11);
    output.writeDouble(this.ArgumentObjectArg1NumericValue);
    output.writeFieldEnd();
  }
  if (this.ArgumentObjectArg2Name !== null && this.ArgumentObjectArg2Name !== undefined) {
    output.writeFieldBegin('ArgumentObjectArg2Name', Thrift.Type.STRING, 12);
    output.writeString(this.ArgumentObjectArg2Name);
    output.writeFieldEnd();
  }
  if (this.ArgumentObjectArg2StringValue !== null && this.ArgumentObjectArg2StringValue !== undefined) {
    output.writeFieldBegin('ArgumentObjectArg2StringValue', Thrift.Type.STRING, 13);
    output.writeString(this.ArgumentObjectArg2StringValue);
    output.writeFieldEnd();
  }
  if (this.ArgumentObjectArg2NumericValue !== null && this.ArgumentObjectArg2NumericValue !== undefined) {
    output.writeFieldBegin('ArgumentObjectArg2NumericValue', Thrift.Type.DOUBLE, 14);
    output.writeDouble(this.ArgumentObjectArg2NumericValue);
    output.writeFieldEnd();
  }
  if (this.ArgumentObjectArg3Name !== null && this.ArgumentObjectArg3Name !== undefined) {
    output.writeFieldBegin('ArgumentObjectArg3Name', Thrift.Type.STRING, 15);
    output.writeString(this.ArgumentObjectArg3Name);
    output.writeFieldEnd();
  }
  if (this.ArgumentObjectArg3StringValue !== null && this.ArgumentObjectArg3StringValue !== undefined) {
    output.writeFieldBegin('ArgumentObjectArg3StringValue', Thrift.Type.STRING, 16);
    output.writeString(this.ArgumentObjectArg3StringValue);
    output.writeFieldEnd();
  }
  if (this.ArgumentObjectArg3NumericValue !== null && this.ArgumentObjectArg3NumericValue !== undefined) {
    output.writeFieldBegin('ArgumentObjectArg3NumericValue', Thrift.Type.DOUBLE, 17);
    output.writeDouble(this.ArgumentObjectArg3NumericValue);
    output.writeFieldEnd();
  }
  if (this.ArgumentObjectArg4Name !== null && this.ArgumentObjectArg4Name !== undefined) {
    output.writeFieldBegin('ArgumentObjectArg4Name', Thrift.Type.STRING, 18);
    output.writeString(this.ArgumentObjectArg4Name);
    output.writeFieldEnd();
  }
  if (this.ArgumentObjectArg4StringValue !== null && this.ArgumentObjectArg4StringValue !== undefined) {
    output.writeFieldBegin('ArgumentObjectArg4StringValue', Thrift.Type.STRING, 19);
    output.writeString(this.ArgumentObjectArg4StringValue);
    output.writeFieldEnd();
  }
  if (this.ArgumentObjectArg4NumericValue !== null && this.ArgumentObjectArg4NumericValue !== undefined) {
    output.writeFieldBegin('ArgumentObjectArg4NumericValue', Thrift.Type.DOUBLE, 20);
    output.writeDouble(this.ArgumentObjectArg4NumericValue);
    output.writeFieldEnd();
  }
  if (this.ArgumentObjectArg5Name !== null && this.ArgumentObjectArg5Name !== undefined) {
    output.writeFieldBegin('ArgumentObjectArg5Name', Thrift.Type.STRING, 21);
    output.writeString(this.ArgumentObjectArg5Name);
    output.writeFieldEnd();
  }
  if (this.ArgumentObjectArg5StringValue !== null && this.ArgumentObjectArg5StringValue !== undefined) {
    output.writeFieldBegin('ArgumentObjectArg5StringValue', Thrift.Type.STRING, 22);
    output.writeString(this.ArgumentObjectArg5StringValue);
    output.writeFieldEnd();
  }
  if (this.ArgumentObjectArg5NumericValue !== null && this.ArgumentObjectArg5NumericValue !== undefined) {
    output.writeFieldBegin('ArgumentObjectArg5NumericValue', Thrift.Type.DOUBLE, 23);
    output.writeDouble(this.ArgumentObjectArg5NumericValue);
    output.writeFieldEnd();
  }
  if (this.ArgumentObjectArg6Name !== null && this.ArgumentObjectArg6Name !== undefined) {
    output.writeFieldBegin('ArgumentObjectArg6Name', Thrift.Type.STRING, 24);
    output.writeString(this.ArgumentObjectArg6Name);
    output.writeFieldEnd();
  }
  if (this.ArgumentObjectArg6StringValue !== null && this.ArgumentObjectArg6StringValue !== undefined) {
    output.writeFieldBegin('ArgumentObjectArg6StringValue', Thrift.Type.STRING, 25);
    output.writeString(this.ArgumentObjectArg6StringValue);
    output.writeFieldEnd();
  }
  if (this.ArgumentObjectArg6NumericValue !== null && this.ArgumentObjectArg6NumericValue !== undefined) {
    output.writeFieldBegin('ArgumentObjectArg6NumericValue', Thrift.Type.DOUBLE, 26);
    output.writeDouble(this.ArgumentObjectArg6NumericValue);
    output.writeFieldEnd();
  }
  if (this.ArgumentObjectArg7Name !== null && this.ArgumentObjectArg7Name !== undefined) {
    output.writeFieldBegin('ArgumentObjectArg7Name', Thrift.Type.STRING, 27);
    output.writeString(this.ArgumentObjectArg7Name);
    output.writeFieldEnd();
  }
  if (this.ArgumentObjectArg7StringValue !== null && this.ArgumentObjectArg7StringValue !== undefined) {
    output.writeFieldBegin('ArgumentObjectArg7StringValue', Thrift.Type.STRING, 28);
    output.writeString(this.ArgumentObjectArg7StringValue);
    output.writeFieldEnd();
  }
  if (this.ArgumentObjectArg7NumericValue !== null && this.ArgumentObjectArg7NumericValue !== undefined) {
    output.writeFieldBegin('ArgumentObjectArg7NumericValue', Thrift.Type.DOUBLE, 29);
    output.writeDouble(this.ArgumentObjectArg7NumericValue);
    output.writeFieldEnd();
  }
  if (this.ArgumentObjectArg8Name !== null && this.ArgumentObjectArg8Name !== undefined) {
    output.writeFieldBegin('ArgumentObjectArg8Name', Thrift.Type.STRING, 30);
    output.writeString(this.ArgumentObjectArg8Name);
    output.writeFieldEnd();
  }
  if (this.ArgumentObjectArg8StringValue !== null && this.ArgumentObjectArg8StringValue !== undefined) {
    output.writeFieldBegin('ArgumentObjectArg8StringValue', Thrift.Type.STRING, 31);
    output.writeString(this.ArgumentObjectArg8StringValue);
    output.writeFieldEnd();
  }
  if (this.ArgumentObjectArg8NumericValue !== null && this.ArgumentObjectArg8NumericValue !== undefined) {
    output.writeFieldBegin('ArgumentObjectArg8NumericValue', Thrift.Type.DOUBLE, 32);
    output.writeDouble(this.ArgumentObjectArg8NumericValue);
    output.writeFieldEnd();
  }
  if (this.ArgumentObjectArg9Name !== null && this.ArgumentObjectArg9Name !== undefined) {
    output.writeFieldBegin('ArgumentObjectArg9Name', Thrift.Type.STRING, 33);
    output.writeString(this.ArgumentObjectArg9Name);
    output.writeFieldEnd();
  }
  if (this.ArgumentObjectArg9StringValue !== null && this.ArgumentObjectArg9StringValue !== undefined) {
    output.writeFieldBegin('ArgumentObjectArg9StringValue', Thrift.Type.STRING, 34);
    output.writeString(this.ArgumentObjectArg9StringValue);
    output.writeFieldEnd();
  }
  if (this.ArgumentObjectArg9NumericValue !== null && this.ArgumentObjectArg9NumericValue !== undefined) {
    output.writeFieldBegin('ArgumentObjectArg9NumericValue', Thrift.Type.DOUBLE, 35);
    output.writeDouble(this.ArgumentObjectArg9NumericValue);
    output.writeFieldEnd();
  }
  output.writeFieldStop();
  output.writeStructEnd();
  return;
};


window.Alt.PositronHost = "account.altvr.com";
window.Alt.PositronProtocol = "https";
window.Alt.PositronPort = 443;
window.Alt.UseAuthToken = true; // AUTHMIGRATE remove when rails endpoints are updated to use users/reauth template

window.engine.call("GetPositronHost").then(function(host) {
	Alt.PositronHost = host;
});

window.engine.call("GetPositronProtocol").then(function(protocol) {
	Alt.PositronProtocol = protocol;
});

window.engine.call("GetPositronPort").then(function(port) {
	Alt.PositronPort = port;
});

window.Alt.Log = function(m) {
	console.log(m);
};

// These overrides are required- these webkitAudioContext methods cause the main Unity
// thread to stop responding (with coherent in-client audio streaming enabled)
// Probably _all_ methods that return AudioNodes will do this, but these are the only
// ones currently in use.
(function () {
	var audioContext = window.webkitAudioContext || window.AudioContext;
	if(!audioContext) {
		console.warn("Altspace: Browser doesn't have an AudioContext API. Could not override prototype.");
		return;
	}
	audioContext.prototype.createMediaElementSource = function(myMediaElement) {
		console.error("createMediaElementSource is disabled in AltspaceVR.");
		return null;
	}
	audioContext.prototype.createAnalyser = function() {
		console.error("createAnalyser is disabled in AltspaceVR.");
		return null;
	}
})();

// Override window.open. Used to prevent pages from creating a pop-up,
// which Altspace's browser can't handle currently.
window.nativeOpen = window.open;
window.nativeOpen.bind(window);
window.open = function(url, name, features, replace){
	return window.nativeOpen(url, '_self', features, replace);
};

// Stub out alert, confirm, and prompt
window.alert = function(alert) { };
window.confirm = function(confirm) { return true; };
window.prompt = function(message, defaultValue) { return defaultValue; };

if (!window.chrome) {
	window.chrome = {};
}

// Protect console
Object.defineProperty(window, 'console', {value: window.console, configurable : false});

// Called by YouTube API on YouTube.com.
window.onYouTubePlayerReady = function(player) {
	window.Alt.CapturedYouTubePlayer = player;
};

if (typeof(_) != "undefined") {
	window.Alt._ = _.noConflict();
}

// Set up overrides to requestAnimationFrame to throttle its framerate.
// Unthrottled in coherent it seems to run at 1000+ FPS, still unclear why.
// Unpatched version works fine on GearVR so leave it as is.
if (navigator.userAgent.indexOf('Mobile') === -1) {
	((function(){
		var id = 0;
		var renderQueue = [];
		var fps = 60;
		var frameDelay = 1000 / fps;
		var last = 0;

		var processRenderQueue = function(now) {
			var tmp = renderQueue.slice(0);
			renderQueue.length = 0;
			for (var i = 0; i < tmp.length; i++) {
				try {
					if (!tmp[i].canceled) {
						tmp[i].callback.call(null, now);
					}
				} catch (e) {
					setTimeout(function() { throw e }, 0);
				}
			}
		};

		window.requestAnimationFrame = function(callback) {
			if (renderQueue.length === 0) {
				var now = window.performance.now(),
					next = Math.max(0, frameDelay - (now - last));
				last = next + now;
				setTimeout(function () { processRenderQueue(last); }, Math.round(next));
			}
			renderQueue.push({
				id: ++id,
				callback: callback,
				canceled: false
			});
			return id;
		};

		window.cancelAnimationFrame = function(id) {
			for (var i = 0; i < renderQueue.length; i++) {
				if (renderQueue[i].id === id) {
					renderQueue[i].canceled = true;
				}
			}
		};
	})(window.requestAnimationFrame, window.cancelAnimationFrame));
}

(function () {
		var iframeWhitelist = ['codepen.io', 's.codepen.io', 'localhost', 'rawgit.com', 'cdn.rawgit.com'];

		window.Alt.shouldSupportIFrames = iframeWhitelist.indexOf(location.hostname) >= 0;

		var inIFrame = self !== top;

		if (window.Alt.shouldSupportIFrames && inIFrame) {
				//Since ExecuteScript only works on the topmost document, we 'inject' loaded.min.js manually if we are in an iframe
				window.addEventListener('DOMContentLoaded', function () {
						[
								(/Mobile/.test(navigator.userAgent) ? 'http://altvr.localhost/' : 'coui://') + 'uiresources/Altspace/loaded.min.js'
						].forEach(function (src) {
								var script = document.createElement('script');
								script.src = src;
								script.async = false;
								document.head.appendChild(script);
						});
				});
		}
}());

(function () {
	var isMobile = navigator.userAgent.indexOf('Mobile') !== -1;

	// Ugly hack to fix CSS on slides.com. A CSS rule on slides.com uses a calc() expression with vh units, which does
	// not work in the version of WebKit used by our current version of Coherent.
	// This fix simply polyfills the calc() expression in javascript.
	// TODO Remove this when we upgrate Coherent (https://altspacevr.atlassian.net/browse/UNC-54)
	if (/slides\.com$/.test(location.host)) {
		setInterval(function () {
			var slides = document.querySelector('html.decks.show .marquee .reveal-frame');
			if (slides) {
				var desiredHeight = (window.innerHeight - 90) + 'px';
				if (slides.style.height !== desiredHeight) {
					slides.style.height = desiredHeight;
				}
			}
		}, 500);
	}

	// In order to support 360 videos from YouTube, we inject some JS into the embed iframe that listens for a
	// postMessage and then removes various UI, leaving the raw equirectangular 360 video.
	// We don't do this on mobile since AndroidWebView doesn't inject JS into iframes.
	if (/youtube.com\/embed\//.test(location.href) && !isMobile) {
		window.addEventListener('message', function (event) {
			if (!event.data.isAltspaceYoutubeMessage || !event.data.remove360UI) { return; }
			// scale the video so that it fills the browser window
			var video = document.querySelector('video')
			if (video) {
				var frameHeight = parseFloat(video.style.height);
				var frameWidth = parseFloat(video.style.width);
				var videoHeight = video.videoHeight;
				var videoWidth = video.videoWidth;
				video.style.transform = (
					'scaleY(' + (window.innerHeight / frameHeight) + ') ');
				if (videoWidth / videoHeight !== frameWidth / frameHeight) {
					video.style.transform += (
						'scaleX(' + frameWidth / frameHeight * window.innerHeight / window.innerWidth + ')');
				}
			}

			// hide the 360 webgl renderer
			var webgls = Array.prototype.slice.call(document.querySelectorAll('.webgl'));
			if (webgls.length) {
				webgls.forEach(function (webgl) {
					webgl.style.display = 'none';
				});
				var canvases = Array.prototype.slice.call(document.querySelectorAll('.webgl canvas'));
				canvases.forEach(function (canvas) {
					// helps with performance if there's no canvas surface area to draw on
					canvas.width = canvas.height = 0;
				});
			}

			// hide the 360 pan controls
			var webglControls = Array.prototype.slice.call(document.querySelectorAll('.ytp-webgl-spherical-control'));
			if (webglControls) {
				webglControls.forEach(function (webglControl) {
					webglControl.style.display = 'none';
				});
			}
		});
	}

	// We don't need to do this on Mobile since the Chrome WebView has up-to-date DOM APIs.
	if (location.href.indexOf('player.twitch.tv/?channel=') !== -1 && !isMobile) {
		// Twitch tries to use shadowRoot, which does not have a property descriptor in our version of Coherent
		// so we fake its getter here with a noop.
		Object.defineProperty(window.Element.prototype, 'shadowRoot', {get: function () {}});
	}
}());

/// <reference path="../deps/EventDispatcher.js" />
/* global EventDispatcher, THREE */
// New SDK APIs
(function () {
	var altspace = window.altspace;
	var internal = altspace._internal;
	// TODO: Ideally this gets deleted from here or never is placed on window in the first place
	internal.couiEngine = window.engine;

	// Wrapper around coherent's engine.call.
	// Eventually this could take authentication info, or utilize other channels like a local websocket.
	// Catch on Unity side via WebViewFacade.BindCall(name, ...)
	internal.callClientFunction = function (name, args, config) {
		var couiArgs = {};

		if (args !== undefined) {
			if (!config || !config.hasOwnProperty('argsType')) {
				console.warn('To use COUI engine.call with arguments, argsType must be defined in the config');
				return null;
			}

			// This must be the first property on the object. COUI weirdness
			couiArgs.__Type = config.argsType;
			for (var k in args) if (args.hasOwnProperty(k)) couiArgs[k] = args[k];
		}

		return internal.couiEngine.call(name, couiArgs);
	};

	// Wrapper around coherent's engine.triggerEvent.
	// Eventually this could take authentication info, or utilize other channels like a local websocket.
	// Catch on Unity side via WebViewFacade.BindCall(name, ...)
	internal.callClientAction = function (name, args, config) {
		var couiArgs = {};

		if (args !== undefined) {
			if (!config || !config.hasOwnProperty('argsType')) {
				console.warn('To use COUI engine.call with arguments, argsType must be defined in the config');
				return null;
			}

			// This must be the first property on the object. COUI weirdness
			couiArgs.__Type = config.argsType;
			for (var k in args) if (args.hasOwnProperty(k)) couiArgs[k] = args[k];
		}

		return internal.couiEngine.trigger(name, couiArgs);
	};

	internal.onClientEvent = function (name, callback, context) {
		return internal.couiEngine.on(name, callback, context);
	};

	function executeFunction(func, args) {
		var target = null;
		var f = window;

		var splitFunc = func.split('.');
		for (var i = 0, max = splitFunc.length; i < max; i++) {
			var name = splitFunc[i];
			target = f;
			f = f[name];
			if (!f) {
				break;
			}
		}

		if (target && f) {
			return f.call(target, args);
		}
		return false;
	}

	function chainWhenFunctionExists(funcPath, args) {
		var spinPromise = engine.createDeferred();
		var interval;
		function spin() {
			var funcPromise = executeFunction(funcPath, args);
			// This will not fire if the executedFunction does not return a promise
			if (funcPromise) {
				clearInterval(interval);
				interval = null;
				funcPromise.then(function () {
					spinPromise.resolve.apply(spinPromise, arguments);
				}, function () {
					spinPromise.reject.apply(spinPromise, arguments);
				});
			}
		}
		interval = setInterval(spin, 10);
		setTimeout(spin, 0);// Fire immediately but don't unleash Zalgo
		return spinPromise;
	}

	// iFrame Events //

	var iframes = document.getElementsByTagName('iframe');// This is a live NodeList

	internal.forwardEventToChildIFrames = function (eventName, eventArgs) {
		if (!internal.Alt.shouldSupportIFrames) return;

		var event = { isAltspaceIFrameEvent: true, eventName: eventName, eventArgs: eventArgs };

		for (var i = 0, max = iframes.length; i < max; i++) {
			var iframe = iframes[i];
			iframe.contentWindow.postMessage(event, '*');
		}
	};

	window.addEventListener('message', function (event) {
		// Pretty bad. No origin checks. Maybe have it come from a proxy iframe or something?
		if (!event.data.isAltspaceIFrameEvent) return;

		var nameAndArgs = event.data.eventArgs;
		nameAndArgs.unshift(event.data.eventName);

		window.altspace._internal.couiEngine.trigger.apply(window.altspace._internal.couiEngine, nameAndArgs);
	});

	// Visibility
	(function () {
		var _hidden = false;

		altspace._internal.onClientEvent('VisibilityChanged', function (args) {
			if (_hidden !== args.Hidden) {
				_hidden = args.Hidden;
				document.dispatchEvent(new Event('visibilitychange'));
			}
		});

		Object.defineProperty(document, 'hidden', {
			configurable: false,
			get: function () { return _hidden; }
		});

		Object.defineProperty(document, 'visibilityState', {
			configurable: false,
			get: function () { return _hidden ? 'hidden' : 'visible'; }
		});
	}());


	// User //
	altspace.getUser = function () {
		return chainWhenFunctionExists('altspace._internal.Alt.Users.getLocalUser');
	};

	// Spaces //
	altspace.getSpace = function () {
		return internal.callClientFunction('GetSpace').then(function (args) {
			return {
				sid: args.SID,
				name: args.Name,
				templateSid: args.TemplateSID,
			};
		});
	};

	// Events //

	EventDispatcher.prototype.apply(altspace);

	// Three.js

	(function () {
		var currentScene;
		var renderer;

		altspace.getThreeJSRenderer = function (options) {
			options = options || {};
			if (!window.THREE) {
				console.warn('The AltspaceVR three.js renderer cannot be used without a ' +
					'valid version of three.js loaded to window.THREE');
				return null;
			}
			if (parseInt(window.THREE.REVISION, 10) < 69) {
				console.warn('The AltspaceVR three.js renderer cannot be used with a ' +
					'revision of three.js less than 69');
				return null;
			}
			if (renderer) return renderer;

			if (options.profile) {
				altspace._internal.ScratchThriftBuffer.profile = options.profile;
			}
			if (options.initialSerializationBufferSize) {
				if (
					isNaN(options.initialSerializationBufferSize) ||
					options.initialSerializationBufferSize <= 1024 ||
					options.initialSerializationBufferSize >= 1024 * 1024 * 64
				) {
					console.warn('initialSerializationBufferSize must be between 1,024 and 67,108,864.');
					return null;
				}
				altspace._internal.ScratchThriftBuffer.grow(options.initialSerializationBufferSize);
			}
			renderer = new altspace._internal.AltRenderer(options);

			internal.callClientFunction('ThreeJSApiUsed');
			return renderer;
		};

		internal.setThreeJSScene = function (scene) {
			currentScene = scene;
		};

		internal.getThreeJSScene = function () {
			return currentScene;
		};
	})();

	altspace.setHighPerfMode = function (enabled) {
		internal.callClientFunction('SetHighPerfMode', { Enabled: enabled }, { argsType: 'SetHighPerfModeOptions' });
	};

	altspace.setConfigBasedUserAgent = function (enabled) {
		internal.callClientFunction(
			'SetConfigBasedUserAgent', { Enabled: enabled }, { argsType: 'SetConfigBasedUserAgentOptions' });
	};

	Object.defineProperty(altspace, 'inClient', {
		configurable: false,
		enumerable: true,
		value: true,
		writable: false
	});

	Object.defineProperty(altspace, 'utilities', {
		configurable: false,
		enumerable: true,
		value: {},
		writable: false
	});

	// added for aframe component stubs
	Object.defineProperty(altspace, 'components', {
		configurable: false,
		enumerable: true,
		value: {},
		writable: false
	});
})();

(function() {

	var cachedObject3DTargets = {};
	var internal = altspace._internal;

	function getObjectByProperty(name, value) {
		if (this[name] === value) return this;

		for (var i = 0, l = this.children.length; i < l; i++) {
			var child = this.children[i];
			var object = getObjectByProperty.call(child, name, value);

			if (object !== undefined) {
				return object;
			}
		}

		return undefined;
	}

	internal.getObject3DById = function (targetMeshId) {
		var target = cachedObject3DTargets[targetMeshId];
		var currentScene = internal.getThreeJSScene();

		if (!target) {
			var findTarget = currentScene.getObjectByProperty || getObjectByProperty;
			target = findTarget.call(currentScene, 'id', targetMeshId);
			cachedObject3DTargets[targetMeshId] = target;
		}
		return target;
	}

	internal.dispatchObject3DEvent = function(event) {
		var shouldStopPropagation;
		var shouldStopPropagationImmediately;

		if (event.bubbles) {
			event.currentTarget = this;

			event.stopPropagation = function () {
				shouldStopPropagation = true;
			};

			event.stopImmediatePropagation = function () {
				shouldStopPropagationImmediately = true;
			};
		}

		if (!event.target) {
			event.target = this;
		}

		if (this._listeners) {
			var listeners = this._listeners;
			var listenerArray = listeners[event.type];

			if (listenerArray) {
				var array = [];
				var length = listenerArray.length;

				var i;
				for (i = 0; i < length; i++) {
					array[i] = listenerArray[i];
				}

				for (i = 0; i < length; i++) {
					array[i].call(this, event);

					if (shouldStopPropagationImmediately) return;
				}
			}
		}


		if (event.bubbles && this.parent && this.parent.dispatchEvent && !shouldStopPropagation) {
			internal.dispatchObject3DEvent.call(this.parent, event);
		}
	}
})();

(function () {
	var internal = altspace._internal;
	internal.enclosure = {// TODO: This should be top level when back / forward bug is fixed
		innerWidth: 0,
		innerHeight: 0,
		innerDepth: 0,
		pixelsPerMeter: 0,
		hasFocus: false,
		fullspace: false,
		requestFullspace: requestFullspace,
		exitFullspace: exitFullspace
	};

	EventDispatcher.prototype.apply(internal.enclosure);

	function requestFullspace() {
		return new Promise(function (resolve, reject) {
			internal.callClientFunction('RequestFullspace').then(function (succeeded) {
				if (succeeded) {
					internal.enclosure.fullspace = true;
					resolve();
				}
				else {
					reject();
				}
			});
		});
	}


	function exitFullspace() {
		return internal.callClientFunction('ExitFullspace').then(function () {
			internal.enclosure.fullspace = false;
		});
	}


	internal.onClientEvent('FullspaceChanged', function (args) {
		internal.forwardEventToChildIFrames('FullspaceChanged', [args]);
		internal.enclosure.fullspace = args.IsFullspace;
		internal.enclosure.pixelsPerMeter = args.PixelsPerMeter;
		internal.enclosure.dispatchEvent({type: 'fullspacechange'});
	});

	internal.onClientEvent('DimensionsChanged', function (args) {
		internal.forwardEventToChildIFrames('DimensionsChanged', [args]);
		internal.enclosure.innerWidth = args.Width;
		internal.enclosure.innerHeight = args.Height;
		internal.enclosure.innerDepth = args.Depth;
	});
	internal.onClientEvent('PixelsPerMeterChanged', function (args) {
		internal.forwardEventToChildIFrames('PixelsPerMeterChanged', [args]);
		internal.enclosure.pixelsPerMeter = args.PixelsPerMeter;
	});

	window.addEventListener('focus', function () {
		internal.enclosure.hasFocus = true;
	});

	window.addEventListener('blur', function () {
		internal.enclosure.hasFocus = false;
	});

	altspace.getEnclosure = function () {
		return internal.callClientFunction('GetEnclosure').then(function (args) {
			internal.enclosure.innerWidth = args.Width;
			internal.enclosure.innerHeight = args.Height;
			internal.enclosure.innerDepth = args.Depth;
			internal.enclosure.pixelsPerMeter = args.PixelsPerMeter;
			internal.enclosure.hasFocus = args.HasFocus;
			internal.enclosure.fullspace = args.IsFullspace;
			return internal.enclosure;
		});
	};
}());

(function () {
	var internal = altspace._internal;
	var shouldSendTouchpadUpdates = false;


	function hasTouchpadListeners() {
		function hasListeners(type) {
			return altspace._listeners[type] && altspace._listeners[type].length;
		}
		return (
			hasListeners('touchpadup') || hasListeners('touchpaddown') ||
			hasListeners('touchpadmove') || hasListeners('touchpadgesture'));
	}
	function isTouchpadUpdateEvent(type) {
		return (
			type === 'touchpadup' || type === 'touchpaddown' ||
			type === 'touchpadmove' || type === 'touchpadgesture');
	}
	function onListenerAdded(event) {
		if (isTouchpadUpdateEvent(event.listenerType) && !shouldSendTouchpadUpdates) {
			internal.callClientFunction('EnableTouchpadUpdates');
			shouldSendTouchpadUpdates = true;
		}
	}
	function onListenerRemoved(event) {
		if (isTouchpadUpdateEvent(event.listenerType) && !hasTouchpadListeners()) {
			internal.callClientFunction('DisableTouchpadUpdates');
			shouldSendTouchpadUpdates = false;
		}
	}
	altspace.addEventListener('listeneradded', onListenerAdded);
	altspace.addEventListener('listenerremoved', onListenerRemoved);

	var lastX;
	var lastY;
	internal.onClientEvent('TouchpadUpdated', function () {
		var args = arguments;
		internal.forwardEventToChildIFrames('TouchpadUpdated', args);

		var x = args[0];
		var y = args[1];
		var up = args[2];
		var down = args[3];

		if (up) {
			altspace.dispatchEvent({
				type: 'touchpadup',
				displacementX: x,
				displacementY: y
			});
		}
		if (down) {
			altspace.dispatchEvent({
				type: 'touchpaddown',
				displacementX: 0,
				displacementY: 0
			});
		}
		var displacementChanged = x !== lastX || y !== lastY;
		var hasDisplacement = !(x === 0 && y === 0);
		if (hasDisplacement && displacementChanged) {
			altspace.dispatchEvent({
				type: 'touchpadmove',
				displacementX: x,
				displacementY: y
			});
		}

		lastX = x;
		lastY = y;
	});


	internal.onClientEvent('TouchpadGesture', function () {
		var args = arguments;
		internal.forwardEventToChildIFrames('TouchpadGesture', args);

		altspace.dispatchEvent({
			type: 'touchpadgesture',
			gesture: TouchpadGesture[args[0]]
		});
	});
}());

(function () {
	function filterInternalInfo(debugInfoObj) {
		for (var key in debugInfoObj) {
			if (debugInfoObj.hasOwnProperty(key)) {
				if (key[0] === '_') {
					delete debugInfoObj[key];
				}
				if (typeof debugInfoObj[key] === 'object') {
					filterInternalInfo(debugInfoObj[key]);
				}
			}
		}
	}

	altspace.getThreeJSDebugInfo = function () {
		return altspace._internal.callClientFunction('GetThreeJSDebugInfo').then(
			function (debugInfo) {
				debugInfo.forEach(filterInternalInfo);
				return debugInfo;
			}
		);
	};
}());

/* global THREE */
(function () {
	var internal = altspace._internal;
	// TODO: optimize cursor events by ensuring that event listeners exist before turning on the firehose

	internal.onClientEvent('ThreeJSCursorEvent', function () {
		var args = Array.prototype.slice.call(arguments);
		internal.forwardEventToChildIFrames('ThreeJSCursorEvent', args);

		var currentScene = internal.getThreeJSScene();
		if (!currentScene) return;
		if (!window.THREE) return;

		var eventType = args[0];
		var targetMeshId = args[1];
		var hasTargetMesh = args[2];
		var cursorHitPosition = new THREE.Vector3(args[3], args[4], args[5]);// TODO reuse
		var ray = new THREE.Ray(new THREE.Vector3(args[6], args[7], args[8]),
		new THREE.Vector3(args[9], args[10], args[11]));

		var target = currentScene;

		if (hasTargetMesh) {
			target = internal.getObject3DById(targetMeshId) || target;
		}

		var event = { type: eventType, ray: ray, point: cursorHitPosition, bubbles: true };

		internal.dispatchObject3DEvent.call(target, event);
	});
}());

/* global THREE */
(function () {
	var internal = altspace._internal;
	var gamepads = [];
	var requestedGamepads = false;

	altspace.getGamepads = function () {
		if (!requestedGamepads) {
			internal.callClientFunction('StartUpdatingGamepad');
			requestedGamepads = true;
		}
		return gamepads;
	};

	var GamepadButton = function () {
		this.pressed = false;
		this.touched = false;
		this.nearlyTouched = false;
		this.value = 0;
	};
	Object.defineProperties(GamepadButton.prototype, {
		nearTouch: {
			get: function () {
				console.warn('GamepadButton.nearTouch is now .nearlyTouched');
				return this.nearlyTouched;
			}
		}
	});

	var Gamepad = function (mapping) {
		var numButtons = 0;
		var numAxes = 0;

		if (mapping === 'standard') {
			numButtons = 16;
			numAxes = 4;
		} else if (mapping === 'steamvr') {
			numButtons = 7;
			numAxes = 2;
		} else if (mapping === 'touch') {
			numButtons = 6;
			numAxes = 2;
		}

		if (mapping === 'steamvr' || mapping === 'touch') {
			this.position = { x: 0, y: 0, z: 0 };
			this.rotation = { x: 0, y: 0, z: 0, w: 0 };
			this.pose = {
				position: [],
				orientation: []
			};
		}

		this.mapping = mapping; // 0
		this.id = 0;						// 1
		this.index = 0;				 // 2
		this.timestamp = 0;		 // 3
		this.connected = false; // 4

		this.axes = [];
		this.buttons = [];

		var i;
		for (i = 0; i < numAxes; i++) {
			this.axes[i] = 0;
		}

		for (i = 0; i < numButtons; i++) {
			this.buttons[i] = new GamepadButton();
		}
	};
	Gamepad.prototype.preventDefault = function (axes, buttons) {
		// Convert bool array to string "mask" of zeros and ones,
		// since passing arrays or lists through coui isn't working.
		var a = '';
		var b = '';
		var i;
		for (i = 0; i < axes.length; i++) a += axes[i] ? '1' : '0';
		for (i = 0; i < buttons.length; i++) b += buttons[i] ? '1' : '0';
		internal.callClientFunction('BlockGamepad', {
			Index: this.index,
			Axes: a,
			Buttons: b
		}, { argsType: 'BlockGamepadType' });
	};

	var poseQuaternion;
	internal.onClientEvent('GamepadUpdated', function () {
		var args = Array.prototype.slice.call(arguments); // do we need to do this?
		internal.forwardEventToChildIFrames('GamepadUpdated', args);

		var o = 0;

		var mapping = args[o++];
		var id = args[o++];
		var index = args[o++];
		var timestamp = args[o++];
		var connected = args[o++];


		if (!gamepads[index]) {
			gamepads[index] = new Gamepad(mapping);
		}

		var gamepad = gamepads[index];
		gamepad.id = id;
		gamepad.index = index;
		gamepad.timestamp = timestamp;
		gamepad.connected = connected;

		var i;
		var numAxes = gamepad.axes.length;
		var numButtons = gamepad.buttons.length;
		for (i = 0; i < numAxes; i++) {
			gamepad.axes[i] = args[o++];
		}
		for (i = 0; i < numButtons; i++) {
			gamepad.buttons[i].nearlyTouched = args[o++];
		}
		for (i = 0; i < numButtons; i++) {
			gamepad.buttons[i].touched = args[o++];
		}
		for (i = 0; i < numButtons; i++) {
			gamepad.buttons[i].pressed = args[o++];
		}
		for (i = 0; i < numButtons; i++) {
			gamepad.buttons[i].value = args[o++];
		}

		if (gamepad.mapping === 'steamvr' || gamepad.mapping === 'touch') {
			gamepad.hand = args[o++];

			// Set position and rotation for existing apps
			gamepad.position.x = args[o++];
			gamepad.position.y = args[o++];
			gamepad.position.z = args[o++];

			gamepad.rotation.x = args[o++];
			gamepad.rotation.y = args[o++];
			gamepad.rotation.z = args[o++];
			gamepad.rotation.w = args[o++];

			// This is the proper WebVR Gamepad spec
			if (internal.enclosure.pixelsPerMeter) {
				gamepad.pose.position[0] = gamepad.position.x / internal.enclosure.pixelsPerMeter;
				gamepad.pose.position[1] = gamepad.position.y / internal.enclosure.pixelsPerMeter;
				gamepad.pose.position[2] = gamepad.position.z / internal.enclosure.pixelsPerMeter;
			} else {
				gamepad.pose.position[0] = gamepad.position.x;
				gamepad.pose.position[1] = gamepad.position.y;
				gamepad.pose.position[2] = gamepad.position.z;
			}

			// Rotate pose by 180 degrees on the y axis for WebVR
			if (!poseQuaternion) {
				poseQuaternion = new THREE.Quaternion();
			}
			poseQuaternion.copy(gamepad.rotation);
			poseQuaternion.multiply(new THREE.Quaternion(0, 1, 0, 0));
			gamepad.pose.orientation[0] = poseQuaternion.x;
			gamepad.pose.orientation[1] = poseQuaternion.y;
			gamepad.pose.orientation[2] = poseQuaternion.z;
			gamepad.pose.orientation[3] = poseQuaternion.w;
		}
	});
}());

/* global THREE */
(function () {
	var internal = window.altspace._internal;
	var document;
	var Document;
	altspace.getDocument = function () {
		var promise = engine.createDeferred();

		if (!document) {
			defineClasses();
			altspace.getEnclosure().then(function (enclosure) {
				document = new Document(enclosure);
				if (internal.getThreeJSScene()) {
					document.reset();
				}
				promise.resolve(document);
			});
		} else {
			setTimeout(function () {
				promise.resolve(document);
			}, 0);
		}

		return promise;
	};


	function defineClasses() {
		Document = function (enclosure) {
			var geometry = new THREE.PlaneGeometry(-enclosure.innerWidth / 1000, enclosure.innerHeight / 1000, 1, 1);
			this.originalGeometry = geometry;
			var texture = new THREE.Texture();
			texture.image = window.document.createElement('canvas');
			var material = new THREE.MeshBasicMaterial({
				side: THREE.DoubleSide,
				map: new THREE.Texture()
			});

			THREE.Mesh.call(this, geometry, material);

			this.type = 'Document';
			material.uuid = 'altspace-document';
			material.visible = false;

			var _inputEnabled = false;
			Object.defineProperty(this, 'inputEnabled', {
				set: function (value) {
					if (value === _inputEnabled) return;

					_inputEnabled = value;

					if (value) {
						internal.callClientFunction('EnableDOMInput');
					} else {
						internal.callClientFunction('DisableDOMInput');
					}
				},
				get: function () {
					return _inputEnabled;
				},
				enumerable: true,
				configurable: false
			});

			var _audioSpatializationEnabled = true;
			Object.defineProperty(this, 'audioSpatializationEnabled', {
				set: function (value) {
					if (value === _audioSpatializationEnabled) { return; }
					_audioSpatializationEnabled = value;
					if (value) {
						internal.callClientFunction('EnableAudioSpatialization');
					} else {
						internal.callClientFunction('DisbleAudioSpatialization');
					}
				},
				get: function () {
					return _audioSpatializationEnabled;
				},
				enumerable: true,
				configurable: false
			});
		};
		Document.prototype = Object.create(THREE.Mesh.prototype);
		Document.prototype.constructor = Document;
		Document.prototype.reset = function () {
			var currentScene = internal.getThreeJSScene();
			if (!currentScene) {
				console.warn('Document cannot be reset before render has been called');
				return;
			}
			currentScene.add(this);
			this.geometry = this.originalGeometry;
			this.geometry.verticesNeedUpdate = true;
			this.material.map.repeat.set(1, 1);
			this.material.side = THREE.DoubleSide;
			this.matrix.identity();
			this.matrix.getInverse(currentScene.matrix);
			this.applyMatrix(this.matrix);
		};
	}
}());

/* global THREE */
(function () {
	var internal = altspace._internal;
	var TrackingSkeleton;
	var TrackingJoint;

	var trackingSkeleton;
	var skeletonPromise;
	var resolvePromise;

	var firstUpdate = true;
	function init(trackingSkeletonFrame) {
		firstUpdate = false;
		trackingSkeleton = new TrackingSkeleton(trackingSkeletonFrame);
		resolvePromise(trackingSkeleton);
	}

	internal.onClientEvent('UpdateTrackingSkeleton', function () {
		var args = Array.prototype.slice.call(arguments);

		internal.forwardEventToChildIFrames('UpdateTrackingSkeleton', args);
		// Don't automatically create or update a skeleton if we are just passing the event to a lower iframe
		if (!skeletonPromise) return;

		var trackingSkeletonFrame = args;
		if (firstUpdate) {
			init(trackingSkeletonFrame);
			return;
		}
		trackingSkeleton.updateFromFrame(trackingSkeletonFrame);
	});

	function defineClasses() {
		TrackingJoint = function (skeletonFrame, offset) {
			THREE.Object3D.call(this);

			this.type = 'TrackingJoint';

			this.confidence = skeletonFrame[offset + 1];// TODO: nice string

			this.name = this.location = skeletonFrame[offset];// TODO: three part break;
		};
		TrackingJoint.prototype = Object.create(THREE.Object3D.prototype);
		TrackingJoint.prototype.constructor = TrackingJoint;
		TrackingJoint.prototype.updateFromFrame = function (skeletonFrame, offset) {
			this.confidence = skeletonFrame[offset + 1];
			this.position.set(
				skeletonFrame[offset + 2], skeletonFrame[offset + 3], skeletonFrame[offset + 4]);
			var quaternion = new THREE.Quaternion(
				skeletonFrame[offset + 5], skeletonFrame[offset + 6],
				skeletonFrame[offset + 7], skeletonFrame[offset + 8]);
			this.rotation.setFromQuaternion(quaternion);
		};


		TrackingSkeleton = function (initialFrame) {
			THREE.Object3D.call(this);

			this.type = 'TrackingSkeleton';

			this.trackingJoints = {};
			this.updateFromFrame(initialFrame);
		};
		TrackingSkeleton.prototype = Object.create(THREE.Object3D.prototype);
		TrackingSkeleton.prototype.constructor = TrackingSkeleton;
		TrackingSkeleton.prototype.updateFromFrame = function (skeletonFrame) {
			// Reset all joints to a confidence of 0 since the client doesn't send frames for
			// joints that are no longer tracked
			for (var jointLocation in this.trackingJoints) {
				if (this.trackingJoints.hasOwnProperty(jointLocation)) {
					this.trackingJoints[jointLocation].confidence = 0;
				}
			}

			// Frame is array of location, confidence, p.x, p.y, p.z, r.x, r.y, r.z, r.w
			for (var offset = 0, max = skeletonFrame.length; offset < max; offset += 9) {
				var frameJoint = skeletonFrame[offset];
				var trackingJoint = this.trackingJoints[frameJoint];

				if (!trackingJoint) {
					trackingJoint = this.trackingJoints[frameJoint] =
						new TrackingJoint(skeletonFrame, offset);
					this.add(trackingJoint);
				}

				trackingJoint.updateFromFrame(skeletonFrame, offset);
			}
		};
		TrackingSkeleton.prototype.getJoint = function (bodyPart, side, subIndex) {
			side = side || 'Center';
			subIndex = subIndex === undefined ? 0 : subIndex;
			// They are stored and accessed in pascal case, but this seems fine given the analogy
			// to TypeScript enums.
			return this.trackingJoints[side + bodyPart + subIndex];// Might be a faster way to do this.
		};
	}

	altspace.getThreeJSTrackingSkeleton = function () {
		if (skeletonPromise && !trackingSkeleton) { return skeletonPromise; }

		skeletonPromise = new Promise(function (resolve) {
			if (trackingSkeleton) {
				resolve(trackingSkeleton);
				return;
			}

			resolvePromise = resolve;
			defineClasses();
			internal.callClientFunction('GetTrackingSkeleton');
		});
		return skeletonPromise;
	};
}());

/* global THREE */
(function () {
	var tempInverseMatrix;
	var pooledWorldPosition;
	var pooledWorldQuaternion;
	var colliderExclusions = {};
	altspace._internal.onClientEvent('NativeTransformUpdateEvent', function (
		meshId,
		positionX,
		positionY,
		positionZ,
		rotationX,
		rotationY,
		rotationZ,
		rotationW) {

		tempInverseMatrix = tempInverseMatrix || new THREE.Matrix4();
		pooledWorldPosition = pooledWorldPosition || new THREE.Vector3();
		pooledWorldQuaternion = pooledWorldQuaternion || new THREE.Quaternion();

		var mesh = altspace._internal.getObject3DById(meshId);

		tempInverseMatrix.getInverse(altspace._internal.getThreeJSScene().matrix);

		pooledWorldPosition.set(positionX, positionY, positionZ);
		pooledWorldPosition.applyMatrix4(tempInverseMatrix);

		pooledWorldQuaternion.set(rotationX, rotationY, rotationZ, rotationW);
		//TODO: This function doesn't exist. Not taking scene rotation into account at the moment because of this.
		//Possibly compose the position and rotation into a single Matrix4 and apply the inverse scene matrix and then decompose the matrix.
		//pooledWorldQuaternion.applyMatrix4(tempInverseMatrix);

		var event = {
			type: 'native-transform-update',
			target: mesh,
			worldPosition: pooledWorldPosition,
			worldQuaternion: pooledWorldQuaternion
		}

		altspace._internal.dispatchObject3DEvent.call(mesh, event);

	});

	altspace.addNativeComponent = function (mesh, componentType) {

		switch (componentType) {
			case 'n-box-collider':
			case 'n-sphere-collider':
			case 'n-capsule-collider':
			case 'n-mesh-collider':
				if (!colliderExclusions[mesh.id]) {
					colliderExclusions[mesh.id] = componentType;
				}
				else {
					console.error('AltspaceVR: Mesh', mesh.id, 'already has a native collider, ignoring duplicate request.');
					return;
				}
		}

		altspace._internal.callClientFunction('AddNativeComponent', {
			MeshId: mesh.id,
			Type: componentType
		}, { argsType: 'JSTypeAddNativeComponent' });
	}

	altspace.removeNativeComponent = function (mesh, componentType) {
		altspace._internal.callClientFunction('RemoveNativeComponent', {
			MeshId: mesh.id,
			Type: componentType
		}, { argsType: 'JSTypeRemoveNativeComponent' });
	}

	altspace.updateNativeComponent = function (mesh, componentType, data) {
		if (data instanceof Object) {
			data = JSON.stringify(data);
		} else {
			data = JSON.stringify({ singularProperty: data });
		}

		altspace._internal.callClientFunction('UpdateNativeComponent', {
			MeshId: mesh.id,
			ComponentName: componentType,
			Attributes: data
		}, { argsType: 'JSTypeUpdateNativeComponent' });
	}

	altspace.callNativeComponentAction = function (mesh, componentType, functionName, functionArguments) {
		altspace._internal.callClientFunction('CallNativeComponentAction', {
			MeshId: mesh.id,
			ComponentName: componentType,
			FunctionName: functionName,
			Arguments: JSON.stringify(functionArguments)
		}, { argsType: 'JSTypeCallNativeComponent' });
	}

	altspace.callNativeComponentFunc = function (mesh, componentType, functionName, functionArguments) {
		return altspace._internal.callClientFunction('CallNativeComponentFunc', {
			MeshId: mesh.id,
			ComponentName: componentType,
			FunctionName: functionName,
			Arguments: JSON.stringify(functionArguments)
		}, { argsType: 'JSTypeCallNativeComponent' })
			.then(function (jsonStr) {
				return JSON.parse(jsonStr);
			});
	}

	altspace._internal.onClientEvent('NativeSoundLoadedEvent', function (meshId) {
		altspace._internal.forwardEventToChildIFrames('NativeSoundLoadedEvent', arguments);

		var object3D = altspace._internal.getObject3DById(meshId);
		var targetEl = object3D.el;

		if (targetEl) {
			targetEl.emit('n-sound-loaded', null, true);
		}
	});

	altspace._internal.onClientEvent('NativeGLTFLoadedEvent', function (meshId) {
		altspace._internal.forwardEventToChildIFrames('NativeGLTFLoadedEvent', arguments);

		var object3D = altspace._internal.getObject3DById(meshId);
		var targetEl = object3D.el;

		if (targetEl) {
			targetEl.emit('n-gltf-loaded', null, true);
		}
	});

})();


altspace.open = function (url, target, opts) {
	opts = opts || {};

	return altspace._internal.callClientFunction('OpenPopup', {
		Target: target || '_blank',
		Url: url,
		Hidden: !!opts.hidden,
		Icon: opts.icon,
	}, { argsType: 'OpenPopupOptions' }).then(function (winId) {
		var closed = false;
		return {
			show: function () {
				if (closed) { return undefined; }
				return altspace._internal.callClientFunction(
					'ShowPopup', { Id: winId }, { argsType: 'PopupIdOptions' });
			},
			close: function () {
				if (closed) { return undefined; }

				closed = true;
				return altspace._internal.callClientFunction(
					'ClosePopup', { Id: winId }, { argsType: 'PopupIdOptions' });
			}
		};
	});
};

(function () {
	var internal = altspace._internal;

	internal.onClientEvent('NativeCollisionEvent', function (
				type,
				thisMeshId,
				otherMeshId,
				relativeVelocityX,
				relativeVelocityY,
				relativeVelocityZ,
				normalX,
				normalY,
				normalZ,
				pointX,
				pointY,
				pointZ
			) {

		internal.forwardEventToChildIFrames('NativeCollisionEvent', arguments);//todo: do i need to do more here?

		var thisObject3D = internal.getObject3DById(thisMeshId);
		var otherObject3D = internal.getObject3DById(otherMeshId);

		var event = {
			type: type,
			bubbles: true,
			target: thisObject3D,
			other: otherObject3D,
			relativeVelocity: {
				x: relativeVelocityX,
				y: relativeVelocityY,
				z: relativeVelocityZ
			}
		}
		//TODO BUG: the position needs to be transformed by the scene
		//Some collision events (such as exit) seem to sometimes have no contact points
		if (normalX) {
			event.point = {
				position: {
					x: pointX,
					y: pointY,
					z: pointZ
				},
				normal: {
					x: normalX,
					y: normalY,
					z: normalZ
				}
			}
		}
		internal.dispatchObject3DEvent.call(thisObject3D, event);
	});
	internal.onClientEvent('NativeTriggerEvent', function (
				type,
				thisMeshId,
				otherMeshId
			) {

		internal.forwardEventToChildIFrames('NativeTriggerEvent', arguments);

		var thisObject3D = internal.getObject3DById(thisMeshId);
		var otherObject3D = internal.getObject3DById(otherMeshId);

		var event = {
			type: type,
			bubbles: true,
			target: thisObject3D,
			other: otherObject3D
		}
		internal.dispatchObject3DEvent.call(thisObject3D, event);
	});

	internal.onClientEvent('NativeContainerCountChanged', function (meshId, count, oldCount) {
		internal.forwardEventToChildIFrames('NativeContainerCountChanged', arguments);

		var object3D = internal.getObject3DById(meshId);
		var targetEl = object3D.el;

		if (targetEl) {
			targetEl.emit('container-count-changed', {
				count: count,
				oldCount: oldCount
			}, true);
		}
	});

	internal.onClientEvent('NativeContainerStateChanged', function (meshId, stateName, didGain) {
		internal.forwardEventToChildIFrames('NativeContainerStateChanged', arguments);

		var object3D = internal.getObject3DById(meshId);
		var targetEl = object3D.el;

		if (targetEl) {
			if (didGain) {
				targetEl.addState(stateName);
			} else {
				targetEl.removeState(stateName);
			}
		}
	});
}());

// Warning, this is only a shallow freeze. You should freeze any other functions or properties that should not be
// messed with.
Object.freeze(window.altspace);

altspace._internal.AltThriftHelper = (function () {
	var thriftString = Thrift.Type.STRING;
	var thriftInt = Thrift.Type.I32;
	var thriftMap = Thrift.Type.MAP;
	var thriftList = Thrift.Type.LIST;
	var thriftSet = Thrift.Type.SET;
	var thriftStruct = Thrift.Type.STRUCT;
	var thriftBool = Thrift.Type.BOOL;
	var thriftDouble = Thrift.Type.DOUBLE;

	var constr = function (buf) {
		this.buf = buf;
		this.pos = 0;
	}

	constr.prototype.writeFieldHeader = function (type, fieldId) {
		this.buf.setInt8(this.pos, type);
		this.buf.setInt16(this.pos + 1, fieldId);
		this.pos += 1 + 2;
	};

	constr.prototype.writeIntField = function(val, fieldId) {
		this.writeFieldHeader(thriftInt, fieldId);
		this.buf.setInt32(this.pos, val);
		this.pos += 4;
	};

	constr.prototype.writeStructFieldHeader = function(fieldId) {
		this.writeFieldHeader(thriftStruct, fieldId);
	};

	constr.prototype.writeInt = function(val) {
		this.buf.setInt32(this.pos, val);
		this.pos += 4;
	};

	constr.prototype.writeDoubleField = function(val, fieldId) {
		if (isNaN(val)) { throw new Error('Value cannot be NaN.'); }
		this.writeFieldHeader(thriftDouble, fieldId);
		this.buf.setFloat64(this.pos, val);
		this.pos += 8;
	};

	constr.prototype.writeBoolField = function(val, fieldId) {
		this.writeFieldHeader(thriftBool, fieldId);
		this.buf.setInt8(this.pos, val ? 1 : 0);
		this.pos += 1;
	};

	constr.prototype.writeStringBufferField = function (strBuffer, len, fieldId) {
		this.writeFieldHeader(thriftString, fieldId);
		this.buf.setInt32(this.pos, len);
		this.buf.setBuffer(this.pos + 4, strBuffer);
		this.pos += 4 + len;
	};

	constr.prototype.writeStringField = function(val, fieldId) {
		this.writeFieldHeader(thriftString, fieldId);
		this.writeString(val);
	};

	constr.prototype.writeString = function(val) {
		var len = this.buf.setUtf8String(this.pos + 4, val);
		this.buf.setInt32(this.pos, len);
		this.pos += 4 + len;
	};

	constr.prototype.writeStop = function() {
		this.buf.setInt8(this.pos, Thrift.Type.STOP);
		this.pos += 1;
	};

	constr.prototype.writeMapFieldAndGetCountPos = function(keyType, valueType, fieldId) {
		this.writeFieldHeader(thriftMap, fieldId);
		this.buf.setInt8(this.pos, keyType);
		this.buf.setInt8(this.pos + 1, valueType);

		var countPos = this.pos + 2;
		this.pos += 1 + 1 + 4;

		return countPos;
	};

	constr.prototype.writeListFieldAndGetCountPos = function(valueType, fieldId) {
		this.writeFieldHeader(thriftList, fieldId);
		this.buf.setInt8(this.pos, valueType);

		var countPos = this.pos + 1;
		this.pos += 1 + 4;

		return countPos;
	};

	constr.prototype.writeObjectCount = function(countPos, objCount) {
		this.buf.setInt32(countPos, objCount);
	};

	constr.prototype.writeObjectCountAndStop = function(countPos, objCount) {
		this.writeObjectCount(countPos, objCount);
		this.writeStop();
	};

	constr.prototype.getArray = function() {
		return this.buf.getArray().subarray(0, this.pos)
	}

	constr.prototype.getBinaryString = function () {
		var arr = this.getArray();
		return altspace._internal.DynamicThriftBuffer.toBinaryString(arr, arr.length);
	};

	return constr;
}());

/*
 * AltSceneUpdateSerializer serializes scene object updates into a Thrift message.
 *
 * Copyright (c) 2015 AltspaceVR
 */

altspace._internal.AltSceneUpdateSerializer = function (filter) {
	var buf = new Thrift.Buffer(1024 * 1024); // Allocate a meg of RAM for updates
	var bindingName = new Thrift.Buffer(255);
	var bindingNameLen = bindingName.setUtf8String(0, "UpdateThreeJSScene");
	var thriftHelper = new altspace._internal.AltThriftHelper(buf);
	var lastSceneObjectIds;
	var lastSceneTransforms = {};
	var lastSceneVisibilities = {};
	var serializeCount = 0;

	var worldPosition = new THREE.Vector3();
	var worldRotation = new THREE.Quaternion();
	var worldScale = new THREE.Vector3();

	var walk = function(obj, f) {
		if (filter(obj)) {
			f(obj);
		}

		var children = obj.children;
		
		for(var i = 0, max = children.length; i < max; i++) {
			walk(children[i], f);
		}
	};

	var matrixEquals = function(x, y) {
		// This is now in THREE.js on Matrix4, but is relatively
		// recent addition
		var xElements = x.elements;
		var yElements = y.elements;

		for (var i = 0; i < 16; i++) {
			if (xElements[i] !== yElements[i]) return false;
		}

		return true;
	};

	this.serializeScene = function (scene) {
		var updateCount = 0;
		var newSceneObjectIds = {};
		var removeCountPos = -1;
		var removeCount = 0;

		thriftHelper.pos = 0;

		thriftHelper.writeStringBufferField(bindingName, bindingNameLen, 1); // BindingName

		thriftHelper.writeIntField(0, 2); // RequestID

		thriftHelper.writeStructFieldHeader(3); // ThreeJSUpdate

		var updateCountPos = thriftHelper.writeListFieldAndGetCountPos(Thrift.Type.STRUCT, 1); // SceneObjectUpdates

		walk(scene, function(object3d) {
			var meshId = object3d.id;

			var isDirtyTransform = true;
			var isDirtyVisibility = true;

			var lastTransform = lastSceneTransforms[meshId];
			var newTransform = object3d.matrixWorld;

			var hasLastVisibility = lastSceneVisibilities.hasOwnProperty(meshId);
			var newVisibility = object3d.visible;

			if (lastTransform) {
				isDirtyTransform = !matrixEquals(lastTransform, newTransform);
			}

			if (isDirtyTransform || !lastTransform) {
				lastSceneTransforms[meshId] = newTransform.clone();
			}

			if (hasLastVisibility) {
				isDirtyVisibility = lastSceneVisibilities[meshId] != newVisibility;
			}

			if (isDirtyVisibility || !hasLastVisibility) {
				lastSceneVisibilities[meshId] = newVisibility;
			}

			newSceneObjectIds[meshId] = true;

			if (!isDirtyTransform && !isDirtyVisibility) return;

			object3d.matrixWorld.decompose( worldPosition, worldRotation, worldScale );

			try {
				thriftHelper.writeIntField(meshId, 1);
				thriftHelper.writeDoubleField(worldPosition.x, 2);
				thriftHelper.writeDoubleField(worldPosition.y, 3);
				thriftHelper.writeDoubleField(worldPosition.z, 4);
				thriftHelper.writeDoubleField(worldRotation.x, 5);
				thriftHelper.writeDoubleField(worldRotation.y, 6);
				thriftHelper.writeDoubleField(worldRotation.z, 7);
				thriftHelper.writeDoubleField(worldRotation.w, 8);
				thriftHelper.writeDoubleField(worldScale.x, 9);
				thriftHelper.writeDoubleField(worldScale.y, 10);
				thriftHelper.writeDoubleField(worldScale.z, 11);
				thriftHelper.writeBoolField(newVisibility, 12);
				thriftHelper.writeStop();
			}
			catch (e) {
				throw new Error('AltspaceVR: Could not serialize update for Mesh ' + object3d.uuid + '. ' + e.message);
			}
			updateCount++;
		});

		thriftHelper.writeObjectCount(updateCountPos, updateCount);

		if (lastSceneObjectIds) {
			for (var objId in lastSceneObjectIds) {
				if (lastSceneObjectIds.hasOwnProperty(objId)) {
					if (!newSceneObjectIds[objId]) {
						if (removeCount === 0) {
							// SceneObjectsToRemove
							removeCountPos = thriftHelper.writeListFieldAndGetCountPos(Thrift.Type.I32, 2);
						}

						thriftHelper.writeInt(objId);
						removeCount++;

						delete lastSceneTransforms[objId];
					}
				}
			}
		}

		if (removeCount > 0) {
			thriftHelper.writeObjectCount(removeCountPos, removeCount);
		}

		thriftHelper.writeIntField(serializeCount, 3); // Index, ordering updates

		thriftHelper.writeStop(); // /ThreeJsUpdate
		thriftHelper.writeStop(); // /BindCallMessage

		lastSceneObjectIds = newSceneObjectIds;

		serializeCount++;

		// Need to convert to a string type on the way out unfortunately :(
		// The WebView layer runs slow if you pass byte[] directly.
		return thriftHelper.getBinaryString();
	};
};

(function(exports){
'use strict';

	var prevTexStates = {};

	/**
	* Whether the texture should send update
	* @param {THREE.Texture} texture
	* @returns {boolean}
	*/
	exports.needsUpdate = function(texture)
	{
		if(!texture) return false;

		var prevTex = prevTexStates[texture.uuid];

		return !prevTex ||
			texture.needsUpdate ||
			texture.version !== prevTex.version ||
			texture.image && texture.image.src !== prevTex.src ||
			texture.offset.x !== prevTex.offsetX ||
			texture.offset.y !== prevTex.offsetY ||
			texture.repeat.x !== prevTex.repeatX ||
			texture.repeat.y !== prevTex.repeatY ||
			// Note: We only use wrapS because Unity does not support wrap modes on each axis.
			texture.wrapS !== prevTex.wrapS;
	}

	function updatePreviousTexState(texture, sourceHash)
	{
		if(!prevTexStates[texture.uuid])
			prevTexStates[texture.uuid] = {};

		var prevState = prevTexStates[texture.uuid];
		prevState.src = texture.image && texture.image.src || '';
		prevState.version = texture.version;
		prevState.offsetX = texture.offset.x;
		prevState.offsetY = texture.offset.y;
		prevState.repeatX = texture.repeat.x;
		prevState.repeatY = texture.repeat.y;
		prevState.wrapS = texture.wrapS;
		prevState.sourceHash = sourceHash;
	}

	function hashString(str)
	{
		var hash = 5381;
		var i = str.length - 1;
		var step = Math.max(Math.floor(i / 1024), 1); // Hack, take 1024 sampled bytes from really large data for perf.

		while (i >= 0) {
			hash = (hash * 33) ^ str.charCodeAt(i);
			i -= step;
		}

		return hash >>> 0;
	}

	function getDataUri(image)
	{
		var canvas;
		if (image.nodeName === 'CANVAS') {
			canvas = image;
		}
		else {
			canvas = document.createElement('canvas');
			canvas.width = image.width;
			canvas.height = image.height;
			var context = canvas.getContext('2d');
			context.drawImage(image, 0, 0, image.width, image.height);
		}
		return canvas.toDataURL('image/png');
	}

	/**
	* Get all textures in the scene,
	* loop over them,
	* and copy key fields from three object to thrift struct
	* @param {THREE.Scene} scene
	* @param {ThreeJSScene} thriftScene
	*/
	exports.serializeTextures = function(scene, thriftScene)
	{
		if(!thriftScene.Textures) return;
		var textures = {};
		getTextures(scene, textures);

		thriftScene.Textures.forEach(function(outTex)
		{
			var inTex = textures[outTex.Uuid];

			outTex.FlipY = inTex.flipY;
			outTex.OffsetX = inTex.offset.x;
			outTex.OffsetY = inTex.offset.y;
			outTex.RepeatX = inTex.repeat.x;
			outTex.RepeatY = inTex.repeat.y;
			// Note: We only use wrapS because Unity does not support wrap modes on each axis.
			outTex.WrapS = inTex.wrapS || THREE.ClampToEdgeWrapping;

			var prevState = prevTexStates[inTex.uuid];
			var prevSrc = prevState && prevState.src;
			var prevVersion = prevState && prevState.version;
			var prevSourceHash = prevState && prevState.sourceHash;

			// normal texture needs update
			if (inTex.image && inTex.image.src && prevSrc !== inTex.image.src)
			{
				outTex.Src = inTex.image.src;
				outTex.SourceHash = hashString(outTex.Src);
				outTex.TextureDataUri = '';
			}

			// canvas texture needs update
			else if( inTex.image &&
				(inTex.image.nodeName === 'CANVAS' || inTex.image.nodeName === 'VIDEO') &&
				(inTex.needsUpdate || inTex.version !== prevVersion)
			)
			{
				var dataUri = getDataUri(inTex.image);
				var textureData = new Thrift.Buffer(dataUri.length);
				textureData.setRawString(0, dataUri);
				outTex.TextureDataUri = textureData;
				outTex.SourceHash = hashString(dataUri);
				outTex.Src = '';
			}

			// texture parameter update only
			else if (prevSourceHash)
			{
				outTex.SourceHash = prevSourceHash;
				outTex.TextureDataUri = '';
				outTex.Src = '';
			}

			// should never happen
			else {
				outTex.SourceHash = 0;
				outTex.TextureDataUri = '';
				outTex.Src = '';
			}

			updatePreviousTexState(inTex, outTex.SourceHash);
			inTex.needsUpdate = false;
		});
	}

	/**
	* Create new thrift struct with given uuid
	* @param {string} texUuid
	* @returns {ThreeJSTexture}
	*/
	exports.getThriftTexture = function(tex)
	{
		var thriftTex = new ThreeJSTexture();
		thriftTex.Uuid = tex.uuid;
		return thriftTex;
	}

	/**
	* Recursively extract textures from tree, add to UUID-indexed map
	* @param {THREE.Object3D} obj
	* @param {Map[uuid: THREE.Texture]} texs - Output only
	*/
	function getTextures(obj, texs)
	{
		var mat = obj.material;
		if(mat && (mat.type === 'MultiMaterial' || mat.isMultiMaterial)){
			mat = mat.materials[0];
		}

		var map = mat && mat.map;
		if(map && !texs[map.uuid])
			texs[map.uuid] = map;

		var lightMap = mat && mat.lightMap;
		if(lightMap && !texs[lightMap.uuid])
			texs[lightMap.uuid] = lightMap;

		obj.children.forEach(function(c){
			getTextures(c, texs);
		});
	}

})(altspace._internal.TextureSerializer = {});

/*
 * AltGeoMatSerializer serializes a Three.js scene into a Thrift message.
 *
 * Copyright (c) 2015 AltspaceVR
 */
altspace._internal.AltGeoMatSerializer = function (options) {
	var PROFILE = options.profile;
	var TextureSerializer = altspace._internal.TextureSerializer;

	var getGeometries = function (obj, geometries) {
		if (obj.geometry) {
			geometries[obj.geometry.uuid] = obj.geometry;
		}
		for (var i = 0, l = obj.children.length; i < l; i ++) {
			getGeometries(obj.children[i], geometries);
		}
	};
	var geoNeedsUpdate = function (geo) {
		return (
			geo.needsUpdate === undefined ||
			geo.verticesNeedUpdate ||
			geo.elementsNeedUpdate ||
			geo.uvsNeedUpdate ||
			geo.normalsNeedUpdate ||
			geo.tangentsNeedUpdate ||
			geo.colorsNeedUpdate ||
			geo.lineDistancesNeedUpdate ||
			geo.groupsNeedUpdate
		);
	};
	var resetGeoFlags = function (geo) {
		if (geo) {
			geo.needsUpdate = false;
			geo.verticesNeedUpdate = false;
			geo.elementsNeedUpdate = false;
			geo.uvsNeedUpdate = false;
			geo.normalsNeedUpdate = false;
			geo.tangentsNeedUpdate = false;
			geo.colorsNeedUpdate = false;
			geo.lineDistancesNeedUpdate = false;
			geo.groupsNeedUpdate = false;
		}
	};

	var getThriftGeometryData = function (geometry) {
		var thriftGeometryData = new ThreeJSGeometryData();
		var jsonData;
		if (geometry instanceof THREE.Geometry) {
			jsonData = THREE.Geometry.prototype.toJSON.call(geometry).data;
			thriftGeometryData.Vertices = jsonData.vertices;
			thriftGeometryData.Faces = jsonData.faces;
			thriftGeometryData.Colors = jsonData.colors || [];
			thriftGeometryData.Uvs = jsonData.uvs && jsonData.uvs[0] || [];
			thriftGeometryData.Uvs2 = jsonData.uvs && jsonData.uvs[1] || [];
			thriftGeometryData.IsBufferedGeometry = false;
		}
		else if (geometry instanceof THREE.BufferGeometry) {
			jsonData = THREE.BufferGeometry.prototype.toJSON.call(geometry).data;
			thriftGeometryData.Vertices = jsonData.attributes.position.array;
			thriftGeometryData.Faces = jsonData.index && jsonData.index.array || [];
			if (jsonData.attributes.color && jsonData.attributes.color.type !== 'Float32Array') {
				throw new Error('AltspaceVR: geometry color array must be a Float32Array. Geometry ' + geometry.uuid);
			}
			thriftGeometryData.Colors = jsonData.attributes.color && jsonData.attributes.color.array || [];
			thriftGeometryData.Uvs = jsonData.attributes.uv && jsonData.attributes.uv.array || [];
			thriftGeometryData.Uvs2 = jsonData.attributes.uv2 && jsonData.attributes.uv2.array || [];
			thriftGeometryData.IsBufferedGeometry = true;
		}
		else {
			throw new Error('AltspaceVR: Unrecognized geometry type for geometry ' + geometry.uuid);
		}
		return thriftGeometryData;
	};

	var serializeGeometries = function (scene, thriftScene) {
		if (!thriftScene.Geometries) { return; }
		var geometries = {};
		getGeometries(scene, geometries);
		for (var j = 0, l = thriftScene.Geometries.length; j < l; j++) {
			var geometry = geometries[thriftScene.Geometries[j].Uuid];
			resetGeoFlags(geometry);
			var origParams = geometry.parameters;
			// Temporarily delete geo params so that toJSON actually serializes
			// vertices.
			delete geometry.parameters;
			thriftScene.Geometries[j].Data = getThriftGeometryData(geometry);
			geometry.parameters = origParams;
		}
	};

	var matWarns = [];
	var warnCutoff = 25;
	var matWhitelist = ['MeshBasicMaterial', 'MeshPhongMaterial', 'MeshLambertMaterial', 'MeshStandardMaterial'];
	var errorMats = {};

	// Phong and lambert aren't really supported, but various loaders only output these
	// types, and we don't want to spam users who can't actually fix it easily.
	var getMaterials = function (obj, materials)
	{
		if (obj.material)
		{
			if(obj.material.isMultiMaterial)
				var thisMat = obj.material[0];
			else
				thisMat = obj.material;
		
			// THIS IS THE ONLY IMPORTANT PART
			materials[thisMat.uuid] = thisMat;

			if( matWhitelist.indexOf(thisMat.type) === -1 && matWarns.indexOf(obj.uuid) === -1){
				if(matWarns.length < warnCutoff){
					console.warn(
						'AltspaceVR: Mesh ' + obj.uuid + ' uses unsupported material type "' + thisMat.type +
						'". This material will be approximated.' +
						' (This message will not be shown again for this object until the app is reloaded)'
					);
					matWarns.push(obj.uuid);
					if(matWarns.length === warnCutoff){
						console.warn('AltspaceVR: Maximum material warning count reached.');
					}
				}
			}
		}
		if (!obj.children) { return; }
		for (var i = 0, l = obj.children.length; i < l; i ++) {
			getMaterials(obj.children[i], materials);
		}
	};

	var previousMatStates = {};
	var matNeedsUpdate = function (mat)
	{
		if(mat.isMultiMaterial){
			mat = mat[0];
		}

		if (!mat) { return false; }

		var prevMat = previousMatStates[mat.uuid];

		if(mat.type === 'MultiMaterial'){
			var multimat = mat;
			mat = multimat.materials[0];
		}

		if(/^(Raw)?ShaderMaterial$/.test(mat.type))
		{
			if(!errorMats[mat.uuid]){
				errorMats[mat.uuid] = new THREE.MeshBasicMaterial();
				errorMats[mat.uuid].uuid = mat.uuid;
			}

			if(mat.visible !== undefined)
				errorMats[mat.uuid].visible = mat.visible;
			if(mat.color !== undefined )
				errorMats[mat.uuid].color.copy(mat.color);
			if(mat.map !== undefined)
				errorMats[mat.uuid].map = mat.map;
			if(mat.lightMap !== undefined)
				errorMats[mat.uuid].lightMap = mat.lightMap;
			if(mat.lightMapIntensity !== undefined)
				errorMats[mat.uuid].lightMapIntensity = mat.lightMapIntensity;
			if(mat.transparent !== undefined)
				errorMats[mat.uuid].transparent = mat.transparent;
			if(mat.opacity !== undefined)
				errorMats[mat.uuid].opacity = mat.opacity;
			if(mat.side !== undefined)
				errorMats[mat.uuid].side = mat.side;

			mat = errorMats[mat.uuid];
		}

		return prevMat === undefined ||
			(multimat ? multimat.visible : mat.visible) !== prevMat.visible ||
			mat.side !== prevMat.side ||
			mat.transparent !== prevMat.transparent ||
			mat.opacity !== prevMat.opacity ||
			mat.color.getHex() !== prevMat.color ||
			mat.map && mat.map.uuid !== prevMat.map ||
			mat.lightMap && mat.lightMap.uuid !== prevMat.lightMap ||
			mat.lightMapIntensity !== prevMat.lightMapIntensity;
	};

	var updatePreviousMatStates = function (mat)
	{
		if(mat.isMultiMaterial){
			mat = mat[0];
		}
	
		var prevMat = previousMatStates[mat.uuid];
		if (prevMat === undefined) {
			prevMat = previousMatStates[mat.uuid] = {};
		}

		if(mat.type === 'MultiMaterial'){
			var multimat = mat;
			mat = multimat.materials[0];
		}
	
		if(/^(Raw)?ShaderMaterial$/.test(mat.type)){
			mat = errorMats[mat.uuid];
		}

		prevMat.visible = multimat ? multimat.visible : mat.visible;
		prevMat.side = mat.side;
		prevMat.transparent = mat.transparent;
		prevMat.opacity = mat.opacity;
		prevMat.color = mat.color && mat.color.getHex();
		prevMat.map = mat.map && mat.map.uuid || '';
		prevMat.lightMap = mat.lightMap && mat.lightMap.uuid || '';
		prevMat.lightMapIntensity = mat.lightMapIntensity;
	};

	var serializeMaterials = function (scene, thriftScene)
	{
		if (!thriftScene.Materials) { return; }
		var materials = {};
		getMaterials(scene, materials);

		for (var j = 0, l = thriftScene.Materials.length; j < l; j++)
		{
			var outMaterial = thriftScene.Materials[j];
			var material = materials[outMaterial.Uuid];

			if(material.isMultiMaterial){
				material = material[0] || {};
			}
			else if(material.type === 'MultiMaterial'){
				var multimat = material;
				material = multimat.materials[0] || {};
			}
			
			if(/^(Raw)?ShaderMaterial$/.test(material.type)){
				material = errorMats[material.uuid];
			}

			outMaterial.Visible = multimat ? multimat.visible : material.visible;
			outMaterial.Side = material.side;
			outMaterial.Transparent = material.transparent;
			outMaterial.Opacity = material.opacity;
			outMaterial.Color = material.color ? material.color.getHex() : -1;
			outMaterial.Map = material.map && material.map.uuid || '';
			outMaterial.LightMap = material.lightMap && material.lightMap.uuid || '';
			outMaterial.LightMapIntensity =
				material.lightMapIntensity !== undefined ? material.lightMapIntensity : 1;

			updatePreviousMatStates(material);
		}
	};

	var sceneMeshes = {};

	var getThriftGeometry = function (geoUuid) {
		var thriftGeometry = new ThreeJSGeometry();
		thriftGeometry.Uuid = geoUuid;
		return thriftGeometry;
	};

	var getThriftMaterial = function (material) {
		var thriftMaterial = new ThreeJSMaterial();
		// Note: Here we take the original material uuid even if it's a MultiMaterial.
		// When we actually go ahead and serialize the MultiMaterial, we take the definition from the first material.
		thriftMaterial.Uuid = material.isMultiMaterial ? material[0].uuid : material.uuid;
		return thriftMaterial;
	};

	var getVertexCount = function (geometry) {
		return (
			// THREE.Geometry
			geometry.faces && geometry.faces.length * 3 ||
			// BufferGeometry
			geometry.attributes && geometry.attributes.position && geometry.attributes.position.count
		);
	};

	var hasValidGeometry = function (obj) {
		if (!obj.geometry) { return false; }
		return getVertexCount(obj.geometry) > 0;
	};

	var previousAltspaceFlagStates = {};
	var altspaceFlagsNeedUpdate = function (obj) {
		var userData = obj.userData;
		if (!(userData && userData.altspace && userData.altspace.collider)) {
			return false;
		}
		var prevState = previousAltspaceFlagStates[obj.uuid];
		if (!prevState && userData.altspace.collider.enabled === false) {
			return true;
		}
		if (prevState && prevState.collider.enabled !== userData.altspace.collider.enabled) {
			return true;
		}
	};
	var updatePreviousAltspaceFlags = function (obj) {
		var userData = obj.userData;
		if (!(userData && userData.altspace && userData.altspace.collider)) { return; }
		if (!previousAltspaceFlagStates[obj.uuid]) {
			previousAltspaceFlagStates[obj.uuid] = {collider: {}};
		}
		previousAltspaceFlagStates[obj.uuid].collider.enabled = userData.altspace.collider.enabled;
	};

	// Unity cannot load meshes with more than 65000 vertices.
	var maxVertexCount = 65535;

	var getMeshesGeosMatsTexs = function (obj, meshes, geos, mats, texs)
	{
		if (obj instanceof THREE.Mesh && hasValidGeometry(obj)) {
			var vertexCount = getVertexCount(obj.geometry);
			if (vertexCount > maxVertexCount) {
				if (!sceneMeshes[obj.uuid]) {
					console.error(
						'AltspaceVR: Skipping mesh ' + obj.uuid +
						' since its vertex count (' + vertexCount.toLocaleString() + ') exceeds ' +
						maxVertexCount.toLocaleString() +
						' (This message will not be shown again for this object until the app is reloaded)'
					);
					sceneMeshes[obj.uuid] = true;
				}
				return;
			}
			var geoNeededUpdate, matNeededUpdate, texNeededUpdate, altspaceFlagsNeededUpdate;
			if (!geos[obj.geometry.uuid] && geoNeedsUpdate(obj.geometry)) {
				geos[obj.geometry.uuid] = getThriftGeometry(obj.geometry.uuid);
				geoNeededUpdate = true;
			}

			var mat = obj.material;

			// Note that we use the uuid of the MultiMaterial above but we serizlize the textures of the first material
			if(mat.isMultiMaterial){
				mat = mat[0] || {};
			}

			if (!mats[mat.uuid] && matNeedsUpdate(mat)) {
				mats[mat.uuid] = getThriftMaterial(mat);
				matNeededUpdate = true;
			}
			
			if(mat.map && !texs[mat.map.uuid] &&
				TextureSerializer.needsUpdate(mat.map))
			{
				texs[mat.map.uuid] = TextureSerializer.getThriftTexture(mat.map);
				texNeededUpdate = true;
			}
			
			if(mat.lightMap && !texs[mat.lightMap.uuid] &&
				TextureSerializer.needsUpdate(mat.lightMap))
			{
				texs[mat.lightMap.uuid] = TextureSerializer.getThriftTexture(mat.lightMap);
				texNeededUpdate = true;
			}

			if (altspaceFlagsNeedUpdate(obj)) {
				altspaceFlagsNeededUpdate = true;
			}
			if (
				geoNeededUpdate ||
				matNeededUpdate ||
				texNeededUpdate ||
				altspaceFlagsNeededUpdate ||
				!sceneMeshes[obj.uuid]
			) {
				var thriftMesh = new ThreeJSMesh();
				thriftMesh.Geometry = obj.geometry.uuid;
				thriftMesh.Material = mat.uuid;
				thriftMesh.MeshId = obj.id;

				thriftMesh.AltspaceFlags = new ThreeJSAltspaceFlags();
				thriftMesh.AltspaceFlags.ColliderFlags = new ThreeJSColliderFlags();
				thriftMesh.AltspaceFlags.ColliderFlags.Enabled = !!(
					// The collider should be enabled by default
					!(obj.userData && obj.userData.altspace && obj.userData.altspace.collider) ||
					obj.userData.altspace.collider.enabled === undefined ||
					obj.userData.altspace.collider.enabled
				);


				meshes.push(thriftMesh);
				sceneMeshes[obj.uuid] = true;
				updatePreviousAltspaceFlags(obj);
			}
		}
		if (!obj.children) { return; }
		for (var i = 0; i < obj.children.length; i++) {
			getMeshesGeosMatsTexs(obj.children[i], meshes, geos, mats, texs);
		}
	};
	var getValues = function (obj) {
		var values = [];
		for (var key in obj) {
			if (obj.hasOwnProperty(key)) {
				values.push(obj[key]);
			}
		}
		return values;
	};
	var getThriftScene = function (scene) {
		var thriftScene = new ThreeJSScene();
		var meshes = [];
		var geos = {};
		var mats = {};
		var texs = {};
		getMeshesGeosMatsTexs(scene, meshes, geos, mats, texs);
		thriftScene.Geometries = getValues(geos);
		thriftScene.Materials = getValues(mats);
		thriftScene.Textures = getValues(texs);
		thriftScene.Meshes = meshes;

		thriftScene.Initialized = false;
		if (scene.userData.altspace) {
			var initialized = scene.userData.altspace.initialized;
			thriftScene.Initialized = initialized;
			previousAltspaceFlagStates[scene.uuid] = previousAltspaceFlagStates[scene.uuid] || {};
			previousAltspaceFlagStates[scene.uuid].initialized = initialized;
		}

		return thriftScene;
	};
	var sceneUuidList = [];
	var lastMeshCount = 0;

	var serializeCount = 0;
	var totalSerializeLength = 0;
	var serializeLength = 0;
	var totalTime = 0;
	var needsUpdateTime = 0;
	var needsUpdateCount = 0;
	var serializeTime = 0;
	var lastLog = performance.now();
	var logPerformance = function () {
		var serializeLengthKB = serializeLength / 1024;
		console.info(
			'\nNeedsUpdate Count', needsUpdateCount,
			'\nAverage NeedsUpdate MS', (needsUpdateTime / needsUpdateCount).toFixed(3),
			'\nSerialize Count:', serializeCount,
			'\nAverage Serialize MS', (serializeTime / serializeCount).toFixed(3),
			'\nAverage Serialize KB', (serializeLengthKB / serializeCount).toFixed(3),
			'\nTotal MS', totalTime.toFixed(3),
			'\nTotal Serialized KB', (totalSerializeLength / 1024).toFixed(3)
		);
	};

	this.sceneNeedsUpdate = function (scene) {
		var start;
		if (PROFILE) {
			start = performance.now();
		}

		var needsUpdate = false;
		var objCounter = 0;
		var meshCounter = 0;
		scene.traverse(function (obj) {
			var sceneListChanged = sceneUuidList[objCounter] !== obj.uuid;
			var objHasValidGeometry = hasValidGeometry(obj);
			if (objHasValidGeometry) {
				meshCounter++;
				if (sceneMeshes[obj.uuid]) {
					// The scene still has the mesh, so flip it to false so that we can prune removed meshes below.
					sceneMeshes[obj.uuid] = false;
				}
			}
			if (
				sceneListChanged ||
				objHasValidGeometry &&
				(
					geoNeedsUpdate(obj.geometry) ||
					matNeedsUpdate(obj.material) ||
					TextureSerializer.needsUpdate(obj.material.map) ||
					TextureSerializer.needsUpdate(obj.material.lightMap) ||
					altspaceFlagsNeedUpdate(obj)
				)
			) {
				needsUpdate = true;
			}
			sceneUuidList[objCounter] = obj.uuid;
			objCounter++;
		});
		if (meshCounter > lastMeshCount) {
			needsUpdate = true;
		}
		Object.keys(sceneMeshes).forEach(function (key) {
			if (sceneMeshes[key] === false) {
				// This mesh was found in the traversal above. Flip it to indicate that it's still in the scene.
				sceneMeshes[key] = true;
			} else {
				// This mesh was not found in the traversal. It's been removed, so remove it from sceneMeshes as well.
				delete sceneMeshes[key];
			}
		});
		lastMeshCount = meshCounter;
		var prevFlagState = previousAltspaceFlagStates[scene.uuid];
		var sceneFlags = scene.userData.altspace;
		if (sceneFlags && (!prevFlagState || prevFlagState.initialized !== sceneFlags.initialized)) {
			needsUpdate = true;
		}

		if (PROFILE) {
			var delta = performance.now() - start;
			needsUpdateTime += delta;
			totalTime += delta;
			needsUpdateCount++;
			if (performance.now() - lastLog > 1000) {
				logPerformance();
				serializeCount = serializeLength = serializeTime = needsUpdateTime = needsUpdateCount = 0;
				lastLog = performance.now();
			}
		}

		return needsUpdate;
	};
	this.serializeScene = function (scene) {
		var start;
		if (PROFILE) {
			start = performance.now();
		}

		var thriftScene = getThriftScene(scene);
		serializeGeometries(scene, thriftScene);
		serializeMaterials(scene, thriftScene);
		TextureSerializer.serializeTextures(scene, thriftScene);

		var bindCallMessage = new BindCallMessage();
		bindCallMessage.BindingName = "RenderThreeJSScene";
		bindCallMessage.RequestID = 0;
		bindCallMessage.ThreeJSScene = thriftScene;

		var output = altspace._internal.ScratchThriftBuffer.getBinaryString(bindCallMessage);

		if (PROFILE) {
			var delta = performance.now() - start;
			serializeTime += delta;
			serializeCount++;
			serializeLength += output.length;
			totalSerializeLength += output.length;
			totalTime += delta;
		}
		return output;
	};
	this.hasValidGeometry = hasValidGeometry;
};

/*
 * AltRenderer renders a Three.js scene in the Altspace web browser.
 *
 * Author: Gavan Wilhite
 * Copyright (c) 2015 AltspaceVR
 */

var GEO_MAT_VERSION = '0.2.0';

altspace._internal.AltRenderer = function ( options ) {
	options = options || {};
	console.log( 'THREE.AltRenderer', THREE.REVISION );

	var serializationFilter;
	var geoMatSerializer;

	if (!options.version || options.version === GEO_MAT_VERSION) {
		options.version = GEO_MAT_VERSION;
		geoMatSerializer = new altspace._internal.AltGeoMatSerializer({profile: options.profile});
		serializationFilter = function (object3d) {
			return (
				object3d instanceof THREE.Mesh &&
				geoMatSerializer.hasValidGeometry(object3d)
			);
		};
	}
	else {
		// TODO Deprecate v0.1
		options.version = '0.1.0';
		serializationFilter = function (object3d) {
			// Objects loaded by AltOBJMTLLoader have a 'src' property.
			return object3d.userData.hasOwnProperty('src');
		};
	}
	console.log("AltRenderer version " + options.version);

	var sceneUpdateSerializer = new altspace._internal.AltSceneUpdateSerializer(serializationFilter);

	Object.defineProperty(this, "domElement", {
		get : function(){
			console.log("AltRenderer.domElement not implemented");
			return null;
		},
		configurable: true
	});

	function sendClientThriftMessage(func, message) {
		altspace._internal.callClientFunction(
			func,
			{ Message: message },
			{ argsType: "ThriftMessage" }
		);
	}

	function sendClientThriftAction(func, message) {
		altspace._internal.callClientAction(
			func,
			{ Message: message },
			{ argsType: "ThriftMessage" }
		);
	}

	function sendSceneToAltspace(serializedScene){
		sendClientThriftMessage("RenderThreeJSScene", serializedScene);
	}

	function sendUpdatesToAltspace(sceneUpdateMessage){
		sendClientThriftMessage("UpdateThreeJSScene", sceneUpdateMessage);
	}

	var initialRender = true;
	var exceptionCount = 0;
	this.render = function ( scene ) {
		altspace._internal.setThreeJSScene(scene);
		scene.updateMatrixWorld();
		if (options.version === GEO_MAT_VERSION)
		{
			try {
				if(geoMatSerializer.sceneNeedsUpdate(scene) || initialRender) {
					initialRender = false;
					var serializedScene = geoMatSerializer.serializeScene(scene);
					sendSceneToAltspace( serializedScene );
				}
			}
			catch(err){
				if(exceptionCount++ < 20){
					console.error('Error serializing scene:', err.stack);
				}
				else if(exceptionCount === 21){
					console.error('Maximum exception count reached. Suppressing errors.');
				}
				return;
			}
		}

		var sceneUpdateMessage = sceneUpdateSerializer.serializeScene(scene);
		sendUpdatesToAltspace(sceneUpdateMessage);
	};
};

// NOTE: This is a *patched* version that sets name of global object to AltAWS
// to ensure we don't clobber page's AWS version.
// AWS SDK for JavaScript v2.0.15
// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// License at https://sdk.amazonaws.com/js/BUNDLE_LICENSE.txt
(function e(t,r,n){function i(a,o){if(!r[a]){if(!t[a]){var u=typeof require=="function"&&require;if(!o&&u)return u(a,!0);if(s)return s(a,!0);throw new Error("Cannot find module '"+a+"'")}var c=r[a]={exports:{}};t[a][0].call(c.exports,function(e){var r=t[a][1][e];return i(r?r:e)},c,c.exports,e,t,r,n)}return r[a].exports}var s=typeof require=="function"&&require;for(var a=0;a<n.length;a++)i(n[a]);return i})({1:[function(e,t,r){var n=e("base64-js");var i=e("ieee754");r.Buffer=s;r.SlowBuffer=s;r.INSPECT_MAX_BYTES=50;s.poolSize=8192;s._useTypedArrays=function(){try{var e=new ArrayBuffer(0);var t=new Uint8Array(e);t.foo=function(){return 42};return 42===t.foo()&&typeof t.subarray==="function"}catch(r){return false}}();function s(e,t,r){if(!(this instanceof s))return new s(e,t,r);var n=typeof e;if(t==="base64"&&n==="string"){e=L(e);while(e.length%4!==0){e=e+"="}}var i;if(n==="number")i=j(e);else if(n==="string")i=s.byteLength(e,t);else if(n==="object")i=j(e.length);else throw new Error("First argument needs to be a number, array or string.");var a;if(s._useTypedArrays){a=s._augment(new Uint8Array(i))}else{a=this;a.length=i;a._isBuffer=true}var o;if(s._useTypedArrays&&typeof e.byteLength==="number"){a._set(e)}else if(O(e)){for(o=0;o<i;o++){if(s.isBuffer(e))a[o]=e.readUInt8(o);else a[o]=e[o]}}else if(n==="string"){a.write(e,0,t)}else if(n==="number"&&!s._useTypedArrays&&!r){for(o=0;o<i;o++){a[o]=0}}return a}s.isEncoding=function(e){switch(String(e).toLowerCase()){case"hex":case"utf8":case"utf-8":case"ascii":case"binary":case"base64":case"raw":case"ucs2":case"ucs-2":case"utf16le":case"utf-16le":return true;default:return false}};s.isBuffer=function(e){return!!(e!==null&&e!==undefined&&e._isBuffer)};s.byteLength=function(e,t){var r;e=e+"";switch(t||"utf8"){case"hex":r=e.length/2;break;case"utf8":case"utf-8":r=D(e).length;break;case"ascii":case"binary":case"raw":r=e.length;break;case"base64":r=H(e).length;break;case"ucs2":case"ucs-2":case"utf16le":case"utf-16le":r=e.length*2;break;default:throw new Error("Unknown encoding")}return r};s.concat=function(e,t){W(k(e),"Usage: Buffer.concat(list, [totalLength])\n"+"list should be an Array.");if(e.length===0){return new s(0)}else if(e.length===1){return e[0]}var r;if(typeof t!=="number"){t=0;for(r=0;r<e.length;r++){t+=e[r].length}}var n=new s(t);var i=0;for(r=0;r<e.length;r++){var a=e[r];a.copy(n,i);i+=a.length}return n};function a(e,t,r,n){r=Number(r)||0;var i=e.length-r;if(!n){n=i}else{n=Number(n);if(n>i){n=i}}var a=t.length;W(a%2===0,"Invalid hex string");if(n>a/2){n=a/2}for(var o=0;o<n;o++){var u=parseInt(t.substr(o*2,2),16);W(!isNaN(u),"Invalid hex string");e[r+o]=u}s._charsWritten=o*2;return o}function o(e,t,r,n){var i=s._charsWritten=M(D(t),e,r,n);return i}function u(e,t,r,n){var i=s._charsWritten=M(B(t),e,r,n);return i}function c(e,t,r,n){return u(e,t,r,n)}function f(e,t,r,n){var i=s._charsWritten=M(H(t),e,r,n);return i}function l(e,t,r,n){var i=s._charsWritten=M(U(t),e,r,n);return i}s.prototype.write=function(e,t,r,n){if(isFinite(t)){if(!isFinite(r)){n=r;r=undefined}}else{var i=n;n=t;t=r;r=i}t=Number(t)||0;var s=this.length-t;if(!r){r=s}else{r=Number(r);if(r>s){r=s}}n=String(n||"utf8").toLowerCase();var h;switch(n){case"hex":h=a(this,e,t,r);break;case"utf8":case"utf-8":h=o(this,e,t,r);break;case"ascii":h=u(this,e,t,r);break;case"binary":h=c(this,e,t,r);break;case"base64":h=f(this,e,t,r);break;case"ucs2":case"ucs-2":case"utf16le":case"utf-16le":h=l(this,e,t,r);break;default:throw new Error("Unknown encoding")}return h};s.prototype.toString=function(e,t,r){var n=this;e=String(e||"utf8").toLowerCase();t=Number(t)||0;r=r!==undefined?Number(r):r=n.length;if(r===t)return"";var i;switch(e){case"hex":i=m(n,t,r);break;case"utf8":case"utf-8":i=p(n,t,r);break;case"ascii":i=d(n,t,r);break;case"binary":i=v(n,t,r);break;case"base64":i=h(n,t,r);break;case"ucs2":case"ucs-2":case"utf16le":case"utf-16le":i=g(n,t,r);break;default:throw new Error("Unknown encoding")}return i};s.prototype.toJSON=function(){return{type:"Buffer",data:Array.prototype.slice.call(this._arr||this,0)}};s.prototype.copy=function(e,t,r,n){var i=this;if(!r)r=0;if(!n&&n!==0)n=this.length;if(!t)t=0;if(n===r)return;if(e.length===0||i.length===0)return;W(n>=r,"sourceEnd < sourceStart");W(t>=0&&t<e.length,"targetStart out of bounds");W(r>=0&&r<i.length,"sourceStart out of bounds");W(n>=0&&n<=i.length,"sourceEnd out of bounds");if(n>this.length)n=this.length;if(e.length-t<n-r)n=e.length-t+r;var a=n-r;if(a<100||!s._useTypedArrays){for(var o=0;o<a;o++)e[o+t]=this[o+r]}else{e._set(this.subarray(r,r+a),t)}};function h(e,t,r){if(t===0&&r===e.length){return n.fromByteArray(e)}else{return n.fromByteArray(e.slice(t,r))}}function p(e,t,r){var n="";var i="";r=Math.min(e.length,r);for(var s=t;s<r;s++){if(e[s]<=127){n+=z(i)+String.fromCharCode(e[s]);i=""}else{i+="%"+e[s].toString(16)}}return n+z(i)}function d(e,t,r){var n="";r=Math.min(e.length,r);for(var i=t;i<r;i++)n+=String.fromCharCode(e[i]);return n}function v(e,t,r){return d(e,t,r)}function m(e,t,r){var n=e.length;if(!t||t<0)t=0;if(!r||r<0||r>n)r=n;var i="";for(var s=t;s<r;s++){i+=N(e[s])}return i}function g(e,t,r){var n=e.slice(t,r);var i="";for(var s=0;s<n.length;s+=2){i+=String.fromCharCode(n[s]+n[s+1]*256)}return i}s.prototype.slice=function(e,t){var r=this.length;e=P(e,r,0);t=P(t,r,r);if(s._useTypedArrays){return s._augment(this.subarray(e,t))}else{var n=t-e;var i=new s(n,undefined,true);for(var a=0;a<n;a++){i[a]=this[a+e]}return i}};s.prototype.get=function(e){console.log(".get() is deprecated. Access using array indexes instead.");return this.readUInt8(e)};s.prototype.set=function(e,t){console.log(".set() is deprecated. Access using array indexes instead.");return this.writeUInt8(e,t)};s.prototype.readUInt8=function(e,t){if(!t){W(e!==undefined&&e!==null,"missing offset");W(e<this.length,"Trying to read beyond buffer length")}if(e>=this.length)return;return this[e]};function y(e,t,r,n){if(!n){W(typeof r==="boolean","missing or invalid endian");W(t!==undefined&&t!==null,"missing offset");W(t+1<e.length,"Trying to read beyond buffer length")}var i=e.length;if(t>=i)return;var s;if(r){s=e[t];if(t+1<i)s|=e[t+1]<<8}else{s=e[t]<<8;if(t+1<i)s|=e[t+1]}return s}s.prototype.readUInt16LE=function(e,t){return y(this,e,true,t)};s.prototype.readUInt16BE=function(e,t){return y(this,e,false,t)};function b(e,t,r,n){if(!n){W(typeof r==="boolean","missing or invalid endian");W(t!==undefined&&t!==null,"missing offset");W(t+3<e.length,"Trying to read beyond buffer length")}var i=e.length;if(t>=i)return;var s;if(r){if(t+2<i)s=e[t+2]<<16;if(t+1<i)s|=e[t+1]<<8;s|=e[t];if(t+3<i)s=s+(e[t+3]<<24>>>0)}else{if(t+1<i)s=e[t+1]<<16;if(t+2<i)s|=e[t+2]<<8;if(t+3<i)s|=e[t+3];s=s+(e[t]<<24>>>0)}return s}s.prototype.readUInt32LE=function(e,t){return b(this,e,true,t)};s.prototype.readUInt32BE=function(e,t){return b(this,e,false,t)};s.prototype.readInt8=function(e,t){if(!t){W(e!==undefined&&e!==null,"missing offset");W(e<this.length,"Trying to read beyond buffer length")}if(e>=this.length)return;var r=this[e]&128;if(r)return(255-this[e]+1)*-1;else return this[e]};function w(e,t,r,n){if(!n){W(typeof r==="boolean","missing or invalid endian");W(t!==undefined&&t!==null,"missing offset");W(t+1<e.length,"Trying to read beyond buffer length")}var i=e.length;if(t>=i)return;var s=y(e,t,r,true);var a=s&32768;if(a)return(65535-s+1)*-1;else return s}s.prototype.readInt16LE=function(e,t){return w(this,e,true,t)};s.prototype.readInt16BE=function(e,t){return w(this,e,false,t)};function E(e,t,r,n){if(!n){W(typeof r==="boolean","missing or invalid endian");W(t!==undefined&&t!==null,"missing offset");W(t+3<e.length,"Trying to read beyond buffer length")}var i=e.length;if(t>=i)return;var s=b(e,t,r,true);var a=s&2147483648;if(a)return(4294967295-s+1)*-1;else return s}s.prototype.readInt32LE=function(e,t){return E(this,e,true,t)};s.prototype.readInt32BE=function(e,t){return E(this,e,false,t)};function x(e,t,r,n){if(!n){W(typeof r==="boolean","missing or invalid endian");W(t+3<e.length,"Trying to read beyond buffer length")}return i.read(e,t,r,23,4)}s.prototype.readFloatLE=function(e,t){return x(this,e,true,t)};s.prototype.readFloatBE=function(e,t){return x(this,e,false,t)};function S(e,t,r,n){if(!n){W(typeof r==="boolean","missing or invalid endian");W(t+7<e.length,"Trying to read beyond buffer length")}return i.read(e,t,r,52,8)}s.prototype.readDoubleLE=function(e,t){return S(this,e,true,t)};s.prototype.readDoubleBE=function(e,t){return S(this,e,false,t)};s.prototype.writeUInt8=function(e,t,r){if(!r){W(e!==undefined&&e!==null,"missing value");W(t!==undefined&&t!==null,"missing offset");W(t<this.length,"trying to write beyond buffer length");V(e,255)}if(t>=this.length)return;this[t]=e};function R(e,t,r,n,i){if(!i){W(t!==undefined&&t!==null,"missing value");W(typeof n==="boolean","missing or invalid endian");W(r!==undefined&&r!==null,"missing offset");W(r+1<e.length,"trying to write beyond buffer length");V(t,65535)}var s=e.length;if(r>=s)return;for(var a=0,o=Math.min(s-r,2);a<o;a++){e[r+a]=(t&255<<8*(n?a:1-a))>>>(n?a:1-a)*8}}s.prototype.writeUInt16LE=function(e,t,r){R(this,e,t,true,r)};s.prototype.writeUInt16BE=function(e,t,r){R(this,e,t,false,r)};function A(e,t,r,n,i){if(!i){W(t!==undefined&&t!==null,"missing value");W(typeof n==="boolean","missing or invalid endian");W(r!==undefined&&r!==null,"missing offset");W(r+3<e.length,"trying to write beyond buffer length");V(t,4294967295)}var s=e.length;if(r>=s)return;for(var a=0,o=Math.min(s-r,4);a<o;a++){e[r+a]=t>>>(n?a:3-a)*8&255}}s.prototype.writeUInt32LE=function(e,t,r){A(this,e,t,true,r)};s.prototype.writeUInt32BE=function(e,t,r){A(this,e,t,false,r)};s.prototype.writeInt8=function(e,t,r){if(!r){W(e!==undefined&&e!==null,"missing value");W(t!==undefined&&t!==null,"missing offset");W(t<this.length,"Trying to write beyond buffer length");F(e,127,-128)}if(t>=this.length)return;if(e>=0)this.writeUInt8(e,t,r);else this.writeUInt8(255+e+1,t,r)};function C(e,t,r,n,i){if(!i){W(t!==undefined&&t!==null,"missing value");W(typeof n==="boolean","missing or invalid endian");W(r!==undefined&&r!==null,"missing offset");W(r+1<e.length,"Trying to write beyond buffer length");F(t,32767,-32768)}var s=e.length;if(r>=s)return;if(t>=0)R(e,t,r,n,i);else R(e,65535+t+1,r,n,i)}s.prototype.writeInt16LE=function(e,t,r){C(this,e,t,true,r)};s.prototype.writeInt16BE=function(e,t,r){C(this,e,t,false,r)};function T(e,t,r,n,i){if(!i){W(t!==undefined&&t!==null,"missing value");W(typeof n==="boolean","missing or invalid endian");W(r!==undefined&&r!==null,"missing offset");W(r+3<e.length,"Trying to write beyond buffer length");F(t,2147483647,-2147483648)}var s=e.length;if(r>=s)return;if(t>=0)A(e,t,r,n,i);else A(e,4294967295+t+1,r,n,i)}s.prototype.writeInt32LE=function(e,t,r){T(this,e,t,true,r)};s.prototype.writeInt32BE=function(e,t,r){T(this,e,t,false,r)};function q(e,t,r,n,s){if(!s){W(t!==undefined&&t!==null,"missing value");W(typeof n==="boolean","missing or invalid endian");W(r!==undefined&&r!==null,"missing offset");W(r+3<e.length,"Trying to write beyond buffer length");X(t,3.4028234663852886e38,-3.4028234663852886e38)}var a=e.length;if(r>=a)return;i.write(e,t,r,n,23,4)}s.prototype.writeFloatLE=function(e,t,r){q(this,e,t,true,r)};s.prototype.writeFloatBE=function(e,t,r){q(this,e,t,false,r)};function _(e,t,r,n,s){if(!s){W(t!==undefined&&t!==null,"missing value");W(typeof n==="boolean","missing or invalid endian");W(r!==undefined&&r!==null,"missing offset");W(r+7<e.length,"Trying to write beyond buffer length");X(t,1.7976931348623157e308,-1.7976931348623157e308)}var a=e.length;if(r>=a)return;i.write(e,t,r,n,52,8)}s.prototype.writeDoubleLE=function(e,t,r){_(this,e,t,true,r)};s.prototype.writeDoubleBE=function(e,t,r){_(this,e,t,false,r)};s.prototype.fill=function(e,t,r){if(!e)e=0;if(!t)t=0;if(!r)r=this.length;if(typeof e==="string"){e=e.charCodeAt(0)}W(typeof e==="number"&&!isNaN(e),"value is not a number");W(r>=t,"end < start");if(r===t)return;if(this.length===0)return;W(t>=0&&t<this.length,"start out of bounds");W(r>=0&&r<=this.length,"end out of bounds");for(var n=t;n<r;n++){this[n]=e}};s.prototype.inspect=function(){var e=[];var t=this.length;for(var n=0;n<t;n++){e[n]=N(this[n]);if(n===r.INSPECT_MAX_BYTES){e[n+1]="...";break}}return"<Buffer "+e.join(" ")+">"};s.prototype.toArrayBuffer=function(){if(typeof Uint8Array!=="undefined"){if(s._useTypedArrays){return new s(this).buffer}else{var e=new Uint8Array(this.length);for(var t=0,r=e.length;t<r;t+=1)e[t]=this[t];return e.buffer}}else{throw new Error("Buffer.toArrayBuffer not supported in this browser")}};function L(e){if(e.trim)return e.trim();return e.replace(/^\s+|\s+$/g,"")}var I=s.prototype;s._augment=function(e){e._isBuffer=true;e._get=e.get;e._set=e.set;e.get=I.get;e.set=I.set;e.write=I.write;e.toString=I.toString;e.toLocaleString=I.toString;e.toJSON=I.toJSON;e.copy=I.copy;e.slice=I.slice;e.readUInt8=I.readUInt8;e.readUInt16LE=I.readUInt16LE;e.readUInt16BE=I.readUInt16BE;e.readUInt32LE=I.readUInt32LE;e.readUInt32BE=I.readUInt32BE;e.readInt8=I.readInt8;e.readInt16LE=I.readInt16LE;e.readInt16BE=I.readInt16BE;e.readInt32LE=I.readInt32LE;e.readInt32BE=I.readInt32BE;e.readFloatLE=I.readFloatLE;e.readFloatBE=I.readFloatBE;e.readDoubleLE=I.readDoubleLE;e.readDoubleBE=I.readDoubleBE;e.writeUInt8=I.writeUInt8;e.writeUInt16LE=I.writeUInt16LE;e.writeUInt16BE=I.writeUInt16BE;e.writeUInt32LE=I.writeUInt32LE;e.writeUInt32BE=I.writeUInt32BE;e.writeInt8=I.writeInt8;e.writeInt16LE=I.writeInt16LE;e.writeInt16BE=I.writeInt16BE;e.writeInt32LE=I.writeInt32LE;e.writeInt32BE=I.writeInt32BE;e.writeFloatLE=I.writeFloatLE;e.writeFloatBE=I.writeFloatBE;e.writeDoubleLE=I.writeDoubleLE;e.writeDoubleBE=I.writeDoubleBE;e.fill=I.fill;e.inspect=I.inspect;e.toArrayBuffer=I.toArrayBuffer;return e};function P(e,t,r){if(typeof e!=="number")return r;e=~~e;if(e>=t)return t;if(e>=0)return e;e+=t;if(e>=0)return e;return 0}function j(e){e=~~Math.ceil(+e);return e<0?0:e}function k(e){return(Array.isArray||function(e){return Object.prototype.toString.call(e)==="[object Array]"})(e)}function O(e){return k(e)||s.isBuffer(e)||e&&typeof e==="object"&&typeof e.length==="number"}function N(e){if(e<16)return"0"+e.toString(16);return e.toString(16)}function D(e){var t=[];for(var r=0;r<e.length;r++){var n=e.charCodeAt(r);if(n<=127)t.push(e.charCodeAt(r));else{var i=r;if(n>=55296&&n<=57343)r++;var s=encodeURIComponent(e.slice(i,r+1)).substr(1).split("%");for(var a=0;a<s.length;a++)t.push(parseInt(s[a],16))}}return t}function B(e){var t=[];for(var r=0;r<e.length;r++){t.push(e.charCodeAt(r)&255)}return t}function U(e){var t,r,n;var i=[];for(var s=0;s<e.length;s++){t=e.charCodeAt(s);r=t>>8;n=t%256;i.push(n);i.push(r)}return i}function H(e){return n.toByteArray(e)}function M(e,t,r,n){var i;for(var s=0;s<n;s++){if(s+r>=t.length||s>=e.length)break;t[s+r]=e[s]}return s}function z(e){try{return decodeURIComponent(e)}catch(t){return String.fromCharCode(65533)}}function V(e,t){W(typeof e==="number","cannot write a non-number as a number");W(e>=0,"specified a negative value for writing an unsigned value");W(e<=t,"value is larger than maximum value for type");W(Math.floor(e)===e,"value has a fractional component")}function F(e,t,r){W(typeof e==="number","cannot write a non-number as a number");W(e<=t,"value larger than maximum allowed value");W(e>=r,"value smaller than minimum allowed value");W(Math.floor(e)===e,"value has a fractional component")}function X(e,t,r){W(typeof e==="number","cannot write a non-number as a number");W(e<=t,"value larger than maximum allowed value");W(e>=r,"value smaller than minimum allowed value")}function W(e,t){if(!e)throw new Error(t||"Failed assertion")}},{"base64-js":2,ieee754:3}],2:[function(e,t,r){var n="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";(function(e){"use strict";var t=typeof Uint8Array!=="undefined"?Uint8Array:Array;var r="+".charCodeAt(0);var i="/".charCodeAt(0);var s="0".charCodeAt(0);var a="a".charCodeAt(0);var o="A".charCodeAt(0);function u(e){var t=e.charCodeAt(0);if(t===r)return 62;if(t===i)return 63;if(t<s)return-1;if(t<s+10)return t-s+26+26;if(t<o+26)return t-o;if(t<a+26)return t-a+26}function c(e){var r,n,i,s,a,o;if(e.length%4>0){throw new Error("Invalid string. Length must be a multiple of 4")}var c=e.length;a="="===e.charAt(c-2)?2:"="===e.charAt(c-1)?1:0;o=new t(e.length*3/4-a);i=a>0?e.length-4:e.length;var f=0;function l(e){o[f++]=e}for(r=0,n=0;r<i;r+=4,n+=3){s=u(e.charAt(r))<<18|u(e.charAt(r+1))<<12|u(e.charAt(r+2))<<6|u(e.charAt(r+3));l((s&16711680)>>16);l((s&65280)>>8);l(s&255)}if(a===2){s=u(e.charAt(r))<<2|u(e.charAt(r+1))>>4;l(s&255)}else if(a===1){s=u(e.charAt(r))<<10|u(e.charAt(r+1))<<4|u(e.charAt(r+2))>>2;l(s>>8&255);l(s&255)}return o}function f(e){var t,r=e.length%3,i="",s,a;function o(e){return n.charAt(e)}function u(e){return o(e>>18&63)+o(e>>12&63)+o(e>>6&63)+o(e&63)}for(t=0,a=e.length-r;t<a;t+=3){s=(e[t]<<16)+(e[t+1]<<8)+e[t+2];i+=u(s)}switch(r){case 1:s=e[e.length-1];i+=o(s>>2);i+=o(s<<4&63);i+="==";break;case 2:s=(e[e.length-2]<<8)+e[e.length-1];i+=o(s>>10);i+=o(s>>4&63);i+=o(s<<2&63);i+="=";break}return i}e.toByteArray=c;e.fromByteArray=f})(typeof r==="undefined"?this.base64js={}:r)},{}],3:[function(e,t,r){r.read=function(e,t,r,n,i){var s,a,o=i*8-n-1,u=(1<<o)-1,c=u>>1,f=-7,l=r?i-1:0,h=r?-1:1,p=e[t+l];l+=h;s=p&(1<<-f)-1;p>>=-f;f+=o;for(;f>0;s=s*256+e[t+l],l+=h,f-=8);a=s&(1<<-f)-1;s>>=-f;f+=n;for(;f>0;a=a*256+e[t+l],l+=h,f-=8);if(s===0){s=1-c}else if(s===u){return a?NaN:(p?-1:1)*Infinity}else{a=a+Math.pow(2,n);s=s-c}return(p?-1:1)*a*Math.pow(2,s-n)};r.write=function(e,t,r,n,i,s){var a,o,u,c=s*8-i-1,f=(1<<c)-1,l=f>>1,h=i===23?Math.pow(2,-24)-Math.pow(2,-77):0,p=n?0:s-1,d=n?1:-1,v=t<0||t===0&&1/t<0?1:0;t=Math.abs(t);if(isNaN(t)||t===Infinity){o=isNaN(t)?1:0;a=f}else{a=Math.floor(Math.log(t)/Math.LN2);if(t*(u=Math.pow(2,-a))<1){a--;u*=2}if(a+l>=1){t+=h/u}else{t+=h*Math.pow(2,1-l)}if(t*u>=2){a++;u/=2}if(a+l>=f){o=0;a=f}else if(a+l>=1){o=(t*u-1)*Math.pow(2,i);a=a+l}else{o=t*Math.pow(2,l-1)*Math.pow(2,i);a=0}}for(;i>=8;e[r+p]=o&255,p+=d,o/=256,i-=8);a=a<<i|o;c+=i;for(;c>0;e[r+p]=a&255,p+=d,a/=256,c-=8);e[r+p-d]|=v*128}},{}],4:[function(e,t,r){var n=e("buffer").Buffer;var i=4;var s=new n(i);s.fill(0);var a=8;function o(e,t){if(e.length%i!==0){var r=e.length+(i-e.length%i);e=n.concat([e,s],r)}var a=[];var o=t?e.readInt32BE:e.readInt32LE;for(var u=0;u<e.length;u+=i){a.push(o.call(e,u))}return a}function u(e,t,r){var i=new n(t);var s=r?i.writeInt32BE:i.writeInt32LE;for(var a=0;a<e.length;a++){s.call(i,e[a],a*4,true)}return i}function c(e,t,r,i){if(!n.isBuffer(e))e=new n(e);var s=t(o(e,i),e.length*a);return u(s,r,i)}t.exports={hash:c}},{buffer:1}],5:[function(e,t,r){var n=e("buffer").Buffer;var i=e("./sha");var s=e("./sha256");var a=e("./rng");var o=e("./md5");var u={sha1:i,sha256:s,md5:o};var c=64;var f=new n(c);f.fill(0);function l(e,t,r){if(!n.isBuffer(t))t=new n(t);if(!n.isBuffer(r))r=new n(r);if(t.length>c){t=e(t)}else if(t.length<c){t=n.concat([t,f],c)}var i=new n(c),s=new n(c);for(var a=0;a<c;a++){i[a]=t[a]^54;s[a]=t[a]^92}var o=e(n.concat([i,r]));return e(n.concat([s,o]))}function h(e,t){e=e||"sha1";var r=u[e];var i=[];var s=0;if(!r)p("algorithm:",e,"is not yet supported");return{update:function(e){if(!n.isBuffer(e))e=new n(e);i.push(e);s+=e.length;return this},digest:function(e){var s=n.concat(i);var a=t?l(r,t,s):r(s);i=null;return e?a.toString(e):a}}}function p(){var e=[].slice.call(arguments).join(" ");throw new Error([e,"we accept pull requests","http://github.com/dominictarr/crypto-browserify"].join("\n"))}r.createHash=function(e){return h(e)};r.createHmac=function(e,t){return h(e,t)};r.randomBytes=function(e,t){if(t&&t.call){try{t.call(this,undefined,new n(a(e)))}catch(r){t(r)}}else{return new n(a(e))}};function d(e,t){for(var r in e)t(e[r],r)}d(["createCredentials","createCipher","createCipheriv","createDecipher","createDecipheriv","createSign","createVerify","createDiffieHellman","pbkdf2"],function(e){r[e]=function(){p("sorry,",e,"is not implemented yet")}})},{"./md5":6,"./rng":7,"./sha":8,"./sha256":9,buffer:1}],6:[function(e,t,r){var n=e("./helpers");function i(){return hex_md5("abc")=="900150983cd24fb0d6963f7d28e17f72"}function s(e,t){e[t>>5]|=128<<t%32;e[(t+64>>>9<<4)+14]=t;var r=1732584193;var n=-271733879;var i=-1732584194;var s=271733878;for(var a=0;a<e.length;a+=16){var h=r;var p=n;var d=i;var v=s;r=o(r,n,i,s,e[a+0],7,-680876936);s=o(s,r,n,i,e[a+1],12,-389564586);i=o(i,s,r,n,e[a+2],17,606105819);n=o(n,i,s,r,e[a+3],22,-1044525330);r=o(r,n,i,s,e[a+4],7,-176418897);s=o(s,r,n,i,e[a+5],12,1200080426);i=o(i,s,r,n,e[a+6],17,-1473231341);n=o(n,i,s,r,e[a+7],22,-45705983);r=o(r,n,i,s,e[a+8],7,1770035416);s=o(s,r,n,i,e[a+9],12,-1958414417);i=o(i,s,r,n,e[a+10],17,-42063);n=o(n,i,s,r,e[a+11],22,-1990404162);r=o(r,n,i,s,e[a+12],7,1804603682);s=o(s,r,n,i,e[a+13],12,-40341101);i=o(i,s,r,n,e[a+14],17,-1502002290);n=o(n,i,s,r,e[a+15],22,1236535329);r=u(r,n,i,s,e[a+1],5,-165796510);s=u(s,r,n,i,e[a+6],9,-1069501632);i=u(i,s,r,n,e[a+11],14,643717713);n=u(n,i,s,r,e[a+0],20,-373897302);r=u(r,n,i,s,e[a+5],5,-701558691);s=u(s,r,n,i,e[a+10],9,38016083);i=u(i,s,r,n,e[a+15],14,-660478335);n=u(n,i,s,r,e[a+4],20,-405537848);r=u(r,n,i,s,e[a+9],5,568446438);s=u(s,r,n,i,e[a+14],9,-1019803690);i=u(i,s,r,n,e[a+3],14,-187363961);n=u(n,i,s,r,e[a+8],20,1163531501);r=u(r,n,i,s,e[a+13],5,-1444681467);s=u(s,r,n,i,e[a+2],9,-51403784);i=u(i,s,r,n,e[a+7],14,1735328473);n=u(n,i,s,r,e[a+12],20,-1926607734);r=c(r,n,i,s,e[a+5],4,-378558);s=c(s,r,n,i,e[a+8],11,-2022574463);i=c(i,s,r,n,e[a+11],16,1839030562);n=c(n,i,s,r,e[a+14],23,-35309556);r=c(r,n,i,s,e[a+1],4,-1530992060);s=c(s,r,n,i,e[a+4],11,1272893353);i=c(i,s,r,n,e[a+7],16,-155497632);n=c(n,i,s,r,e[a+10],23,-1094730640);r=c(r,n,i,s,e[a+13],4,681279174);s=c(s,r,n,i,e[a+0],11,-358537222);i=c(i,s,r,n,e[a+3],16,-722521979);n=c(n,i,s,r,e[a+6],23,76029189);r=c(r,n,i,s,e[a+9],4,-640364487);s=c(s,r,n,i,e[a+12],11,-421815835);i=c(i,s,r,n,e[a+15],16,530742520);n=c(n,i,s,r,e[a+2],23,-995338651);r=f(r,n,i,s,e[a+0],6,-198630844);s=f(s,r,n,i,e[a+7],10,1126891415);i=f(i,s,r,n,e[a+14],15,-1416354905);n=f(n,i,s,r,e[a+5],21,-57434055);r=f(r,n,i,s,e[a+12],6,1700485571);s=f(s,r,n,i,e[a+3],10,-1894986606);i=f(i,s,r,n,e[a+10],15,-1051523);n=f(n,i,s,r,e[a+1],21,-2054922799);r=f(r,n,i,s,e[a+8],6,1873313359);s=f(s,r,n,i,e[a+15],10,-30611744);i=f(i,s,r,n,e[a+6],15,-1560198380);n=f(n,i,s,r,e[a+13],21,1309151649);r=f(r,n,i,s,e[a+4],6,-145523070);s=f(s,r,n,i,e[a+11],10,-1120210379);i=f(i,s,r,n,e[a+2],15,718787259);n=f(n,i,s,r,e[a+9],21,-343485551);r=l(r,h);n=l(n,p);i=l(i,d);s=l(s,v)}return Array(r,n,i,s)}function a(e,t,r,n,i,s){return l(h(l(l(t,e),l(n,s)),i),r)}function o(e,t,r,n,i,s,o){return a(t&r|~t&n,e,t,i,s,o)}function u(e,t,r,n,i,s,o){return a(t&n|r&~n,e,t,i,s,o)}function c(e,t,r,n,i,s,o){return a(t^r^n,e,t,i,s,o)}function f(e,t,r,n,i,s,o){return a(r^(t|~n),e,t,i,s,o)}function l(e,t){var r=(e&65535)+(t&65535);var n=(e>>16)+(t>>16)+(r>>16);return n<<16|r&65535}function h(e,t){return e<<t|e>>>32-t}t.exports=function p(e){return n.hash(e,s,16)}},{"./helpers":4}],7:[function(e,t,r){(function(){var e=this;var r,n;r=function(e){var t=new Array(e);var r;for(var n=0,r;n<e;n++){if((n&3)==0)r=Math.random()*4294967296;t[n]=r>>>((n&3)<<3)&255}return t};if(e.crypto&&crypto.getRandomValues){n=function(e){var t=new Uint8Array(e);crypto.getRandomValues(t);return t}}t.exports=n||r})()},{}],8:[function(e,t,r){var n=e("./helpers");function i(e,t){e[t>>5]|=128<<24-t%32;e[(t+64>>9<<4)+15]=t;var r=Array(80);var n=1732584193;var i=-271733879;var c=-1732584194;var f=271733878;var l=-1009589776;for(var h=0;h<e.length;h+=16){var p=n;var d=i;var v=c;var m=f;var g=l;for(var y=0;y<80;y++){if(y<16)r[y]=e[h+y];else r[y]=u(r[y-3]^r[y-8]^r[y-14]^r[y-16],1);var b=o(o(u(n,5),s(y,i,c,f)),o(o(l,r[y]),a(y)));l=f;f=c;c=u(i,30);i=n;n=b}n=o(n,p);i=o(i,d);c=o(c,v);f=o(f,m);l=o(l,g)}return Array(n,i,c,f,l)}function s(e,t,r,n){if(e<20)return t&r|~t&n;if(e<40)return t^r^n;if(e<60)return t&r|t&n|r&n;return t^r^n}function a(e){return e<20?1518500249:e<40?1859775393:e<60?-1894007588:-899497514}function o(e,t){var r=(e&65535)+(t&65535);var n=(e>>16)+(t>>16)+(r>>16);return n<<16|r&65535}function u(e,t){return e<<t|e>>>32-t}t.exports=function c(e){return n.hash(e,i,20,true)}},{"./helpers":4}],9:[function(e,t,r){var n=e("./helpers");var i=function(e,t){var r=(e&65535)+(t&65535);var n=(e>>16)+(t>>16)+(r>>16);return n<<16|r&65535};var s=function(e,t){return e>>>t|e<<32-t};var a=function(e,t){return e>>>t};var o=function(e,t,r){return e&t^~e&r};var u=function(e,t,r){return e&t^e&r^t&r};var c=function(e){return s(e,2)^s(e,13)^s(e,22)};var f=function(e){return s(e,6)^s(e,11)^s(e,25)};var l=function(e){return s(e,7)^s(e,18)^a(e,3)};var h=function(e){return s(e,17)^s(e,19)^a(e,10)};var p=function(e,t){var r=new Array(1116352408,1899447441,3049323471,3921009573,961987163,1508970993,2453635748,2870763221,3624381080,310598401,607225278,1426881987,1925078388,2162078206,2614888103,3248222580,3835390401,4022224774,264347078,604807628,770255983,1249150122,1555081692,1996064986,2554220882,2821834349,2952996808,3210313671,3336571891,3584528711,113926993,338241895,666307205,773529912,1294757372,1396182291,1695183700,1986661051,2177026350,2456956037,2730485921,2820302411,3259730800,3345764771,3516065817,3600352804,4094571909,275423344,430227734,506948616,659060556,883997877,958139571,1322822218,1537002063,1747873779,1955562222,2024104815,2227730452,2361852424,2428436474,2756734187,3204031479,3329325298);var n=new Array(1779033703,3144134277,1013904242,2773480762,1359893119,2600822924,528734635,1541459225);var s=new Array(64);var a,p,d,v,m,g,y,b,w,E;var x,S;e[t>>5]|=128<<24-t%32;e[(t+64>>9<<4)+15]=t;for(var w=0;w<e.length;w+=16){a=n[0];p=n[1];d=n[2];v=n[3];m=n[4];g=n[5];y=n[6];b=n[7];for(var E=0;E<64;E++){if(E<16){s[E]=e[E+w]}else{s[E]=i(i(i(h(s[E-2]),s[E-7]),l(s[E-15])),s[E-16])}x=i(i(i(i(b,f(m)),o(m,g,y)),r[E]),s[E]);S=i(c(a),u(a,p,d));b=y;y=g;g=m;m=i(v,x);v=d;d=p;p=a;a=i(x,S)}n[0]=i(a,n[0]);n[1]=i(p,n[1]);n[2]=i(d,n[2]);n[3]=i(v,n[3]);n[4]=i(m,n[4]);n[5]=i(g,n[5]);n[6]=i(y,n[6]);n[7]=i(b,n[7])}return n};t.exports=function d(e){return n.hash(e,p,32,true)}},{"./helpers":4}],10:[function(e,t,r){function n(){this._events=this._events||{};this._maxListeners=this._maxListeners||undefined}t.exports=n;n.EventEmitter=n;n.prototype._events=undefined;n.prototype._maxListeners=undefined;n.defaultMaxListeners=10;n.prototype.setMaxListeners=function(e){if(!s(e)||e<0||isNaN(e))throw TypeError("n must be a positive number");this._maxListeners=e;return this};n.prototype.emit=function(e){var t,r,n,s,u,c;if(!this._events)this._events={};if(e==="error"){if(!this._events.error||a(this._events.error)&&!this._events.error.length){t=arguments[1];if(t instanceof Error){throw t}else{throw TypeError('Uncaught, unspecified "error" event.')}return false}}r=this._events[e];if(o(r))return false;if(i(r)){switch(arguments.length){case 1:r.call(this);break;case 2:r.call(this,arguments[1]);break;case 3:r.call(this,arguments[1],arguments[2]);break;default:n=arguments.length;s=new Array(n-1);for(u=1;u<n;u++)s[u-1]=arguments[u];r.apply(this,s)}}else if(a(r)){n=arguments.length;s=new Array(n-1);for(u=1;u<n;u++)s[u-1]=arguments[u];c=r.slice();n=c.length;for(u=0;u<n;u++)c[u].apply(this,s)}return true};n.prototype.addListener=function(e,t){var r;if(!i(t))throw TypeError("listener must be a function");if(!this._events)this._events={};if(this._events.newListener)this.emit("newListener",e,i(t.listener)?t.listener:t);if(!this._events[e])this._events[e]=t;else if(a(this._events[e]))this._events[e].push(t);else this._events[e]=[this._events[e],t];if(a(this._events[e])&&!this._events[e].warned){var r;if(!o(this._maxListeners)){r=this._maxListeners}else{r=n.defaultMaxListeners}if(r&&r>0&&this._events[e].length>r){this._events[e].warned=true;console.error("(node) warning: possible EventEmitter memory "+"leak detected. %d listeners added. "+"Use emitter.setMaxListeners() to increase limit.",this._events[e].length);if(typeof console.trace==="function"){console.trace()}}}return this};n.prototype.on=n.prototype.addListener;n.prototype.once=function(e,t){if(!i(t))throw TypeError("listener must be a function");var r=false;function n(){this.removeListener(e,n);if(!r){r=true;t.apply(this,arguments)}}n.listener=t;this.on(e,n);return this};n.prototype.removeListener=function(e,t){var r,n,s,o;if(!i(t))throw TypeError("listener must be a function");if(!this._events||!this._events[e])return this;r=this._events[e];s=r.length;n=-1;if(r===t||i(r.listener)&&r.listener===t){delete this._events[e];if(this._events.removeListener)this.emit("removeListener",e,t)}else if(a(r)){for(o=s;o-->0;){if(r[o]===t||r[o].listener&&r[o].listener===t){n=o;break}}if(n<0)return this;if(r.length===1){r.length=0;delete this._events[e]}else{r.splice(n,1)}if(this._events.removeListener)this.emit("removeListener",e,t)}return this};n.prototype.removeAllListeners=function(e){var t,r;if(!this._events)return this;if(!this._events.removeListener){if(arguments.length===0)this._events={};else if(this._events[e])delete this._events[e];return this}if(arguments.length===0){for(t in this._events){if(t==="removeListener")continue;this.removeAllListeners(t)}this.removeAllListeners("removeListener");this._events={};return this}r=this._events[e];if(i(r)){this.removeListener(e,r)}else{while(r.length)this.removeListener(e,r[r.length-1])}delete this._events[e];return this};n.prototype.listeners=function(e){var t;if(!this._events||!this._events[e])t=[];else if(i(this._events[e]))t=[this._events[e]];else t=this._events[e].slice();return t};n.listenerCount=function(e,t){var r;if(!e._events||!e._events[t])r=0;else if(i(e._events[t]))r=1;else r=e._events[t].length;return r};function i(e){return typeof e==="function"}function s(e){return typeof e==="number"}function a(e){return typeof e==="object"&&e!==null}function o(e){return e===void 0}},{}],11:[function(e,t,r){if(typeof Object.create==="function"){t.exports=function n(e,t){e.super_=t;e.prototype=Object.create(t.prototype,{constructor:{value:e,enumerable:false,writable:true,configurable:true}})}}else{t.exports=function i(e,t){e.super_=t;var r=function(){};r.prototype=t.prototype;e.prototype=new r;e.prototype.constructor=e}}},{}],12:[function(e,t,r){var n=t.exports={};n.nextTick=function(){var e=typeof window!=="undefined"&&window.setImmediate;var t=typeof window!=="undefined"&&window.postMessage&&window.addEventListener;if(e){return function(e){return window.setImmediate(e)}}if(t){var r=[];window.addEventListener("message",function(e){var t=e.source;if((t===window||t===null)&&e.data==="process-tick"){e.stopPropagation();if(r.length>0){var n=r.shift();n()}}},true);return function n(e){r.push(e);window.postMessage("process-tick","*")}}return function i(e){setTimeout(e,0)}}();n.title="browser";n.browser=true;n.env={};n.argv=[];function i(){}n.on=i;n.addListener=i;n.once=i;n.off=i;n.removeListener=i;n.removeAllListeners=i;n.emit=i;n.binding=function(e){throw new Error("process.binding is not supported")};n.cwd=function(){return"/"};n.chdir=function(e){throw new Error("process.chdir is not supported")}},{}],13:[function(e,t,r){(function(e){(function(n){var i=typeof r=="object"&&r;var s=typeof t=="object"&&t&&t.exports==i&&t;var a=typeof e=="object"&&e;if(a.global===a||a.window===a){n=a}var o,u=2147483647,c=36,f=1,l=26,h=38,p=700,d=72,v=128,m="-",g=/^xn--/,y=/[^ -~]/,b=/\x2E|\u3002|\uFF0E|\uFF61/g,w={overflow:"Overflow: input needs wider integers to process","not-basic":"Illegal input >= 0x80 (not a basic code point)","invalid-input":"Invalid input"},E=c-f,x=Math.floor,S=String.fromCharCode,R;function A(e){throw RangeError(w[e])}function C(e,t){var r=e.length;while(r--){e[r]=t(e[r])}return e}function T(e,t){return C(e.split(b),t).join(".")}function q(e){var t=[],r=0,n=e.length,i,s;while(r<n){i=e.charCodeAt(r++);if(i>=55296&&i<=56319&&r<n){s=e.charCodeAt(r++);if((s&64512)==56320){t.push(((i&1023)<<10)+(s&1023)+65536)}else{t.push(i);r--}}else{t.push(i)
}}return t}function _(e){return C(e,function(e){var t="";if(e>65535){e-=65536;t+=S(e>>>10&1023|55296);e=56320|e&1023}t+=S(e);return t}).join("")}function L(e){if(e-48<10){return e-22}if(e-65<26){return e-65}if(e-97<26){return e-97}return c}function I(e,t){return e+22+75*(e<26)-((t!=0)<<5)}function P(e,t,r){var n=0;e=r?x(e/p):e>>1;e+=x(e/t);for(;e>E*l>>1;n+=c){e=x(e/E)}return x(n+(E+1)*e/(e+h))}function j(e){var t=[],r=e.length,n,i=0,s=v,a=d,o,h,p,g,y,b,w,E,S;o=e.lastIndexOf(m);if(o<0){o=0}for(h=0;h<o;++h){if(e.charCodeAt(h)>=128){A("not-basic")}t.push(e.charCodeAt(h))}for(p=o>0?o+1:0;p<r;){for(g=i,y=1,b=c;;b+=c){if(p>=r){A("invalid-input")}w=L(e.charCodeAt(p++));if(w>=c||w>x((u-i)/y)){A("overflow")}i+=w*y;E=b<=a?f:b>=a+l?l:b-a;if(w<E){break}S=c-E;if(y>x(u/S)){A("overflow")}y*=S}n=t.length+1;a=P(i-g,n,g==0);if(x(i/n)>u-s){A("overflow")}s+=x(i/n);i%=n;t.splice(i++,0,s)}return _(t)}function k(e){var t,r,n,i,s,a,o,h,p,g,y,b=[],w,E,R,C;e=q(e);w=e.length;t=v;r=0;s=d;for(a=0;a<w;++a){y=e[a];if(y<128){b.push(S(y))}}n=i=b.length;if(i){b.push(m)}while(n<w){for(o=u,a=0;a<w;++a){y=e[a];if(y>=t&&y<o){o=y}}E=n+1;if(o-t>x((u-r)/E)){A("overflow")}r+=(o-t)*E;t=o;for(a=0;a<w;++a){y=e[a];if(y<t&&++r>u){A("overflow")}if(y==t){for(h=r,p=c;;p+=c){g=p<=s?f:p>=s+l?l:p-s;if(h<g){break}C=h-g;R=c-g;b.push(S(I(g+C%R,0)));h=x(C/R)}b.push(S(I(h,0)));s=P(r,E,n==i);r=0;++n}}++r;++t}return b.join("")}function O(e){return T(e,function(e){return g.test(e)?j(e.slice(4).toLowerCase()):e})}function N(e){return T(e,function(e){return y.test(e)?"xn--"+k(e):e})}o={version:"1.2.4",ucs2:{decode:q,encode:_},decode:j,encode:k,toASCII:N,toUnicode:O};if(typeof define=="function"&&typeof define.amd=="object"&&define.amd){define("punycode",function(){return o})}else if(i&&!i.nodeType){if(s){s.exports=o}else{for(R in o){o.hasOwnProperty(R)&&(i[R]=o[R])}}}else{n.punycode=o}})(this)}).call(this,typeof self!=="undefined"?self:typeof window!=="undefined"?window:{})},{}],14:[function(e,t,r){"use strict";function n(e,t){return Object.prototype.hasOwnProperty.call(e,t)}t.exports=function(e,t,r,s){t=t||"&";r=r||"=";var a={};if(typeof e!=="string"||e.length===0){return a}var o=/\+/g;e=e.split(t);var u=1e3;if(s&&typeof s.maxKeys==="number"){u=s.maxKeys}var c=e.length;if(u>0&&c>u){c=u}for(var f=0;f<c;++f){var l=e[f].replace(o,"%20"),h=l.indexOf(r),p,d,v,m;if(h>=0){p=l.substr(0,h);d=l.substr(h+1)}else{p=l;d=""}v=decodeURIComponent(p);m=decodeURIComponent(d);if(!n(a,v)){a[v]=m}else if(i(a[v])){a[v].push(m)}else{a[v]=[a[v],m]}}return a};var i=Array.isArray||function(e){return Object.prototype.toString.call(e)==="[object Array]"}},{}],15:[function(e,t,r){"use strict";var n=function(e){switch(typeof e){case"string":return e;case"boolean":return e?"true":"false";case"number":return isFinite(e)?e:"";default:return""}};t.exports=function(e,t,r,o){t=t||"&";r=r||"=";if(e===null){e=undefined}if(typeof e==="object"){return s(a(e),function(s){var a=encodeURIComponent(n(s))+r;if(i(e[s])){return e[s].map(function(e){return a+encodeURIComponent(n(e))}).join(t)}else{return a+encodeURIComponent(n(e[s]))}}).join(t)}if(!o)return"";return encodeURIComponent(n(o))+r+encodeURIComponent(n(e))};var i=Array.isArray||function(e){return Object.prototype.toString.call(e)==="[object Array]"};function s(e,t){if(e.map)return e.map(t);var r=[];for(var n=0;n<e.length;n++){r.push(t(e[n],n))}return r}var a=Object.keys||function(e){var t=[];for(var r in e){if(Object.prototype.hasOwnProperty.call(e,r))t.push(r)}return t}},{}],16:[function(e,t,r){"use strict";r.decode=r.parse=e("./decode");r.encode=r.stringify=e("./encode")},{"./decode":14,"./encode":15}],17:[function(e,t,r){var n=e("punycode");r.parse=b;r.resolve=E;r.resolveObject=x;r.format=w;r.Url=i;function i(){this.protocol=null;this.slashes=null;this.auth=null;this.host=null;this.port=null;this.hostname=null;this.hash=null;this.search=null;this.query=null;this.pathname=null;this.path=null;this.href=null}var s=/^([a-z0-9.+-]+:)/i,a=/:[0-9]*$/,o=["<",">",'"',"`"," ","\r","\n","	"],u=["{","}","|","\\","^","`"].concat(o),c=["'"].concat(u),f=["%","/","?",";","#"].concat(c),l=["/","?","#"],h=255,p=/^[a-z0-9A-Z_-]{0,63}$/,d=/^([a-z0-9A-Z_-]{0,63})(.*)$/,v={javascript:true,"javascript:":true},m={javascript:true,"javascript:":true},g={http:true,https:true,ftp:true,gopher:true,file:true,"http:":true,"https:":true,"ftp:":true,"gopher:":true,"file:":true},y=e("querystring");function b(e,t,r){if(e&&R(e)&&e instanceof i)return e;var n=new i;n.parse(e,t,r);return n}i.prototype.parse=function(e,t,r){if(!S(e)){throw new TypeError("Parameter 'url' must be a string, not "+typeof e)}var i=e;i=i.trim();var a=s.exec(i);if(a){a=a[0];var o=a.toLowerCase();this.protocol=o;i=i.substr(a.length)}if(r||a||i.match(/^\/\/[^@\/]+@[^@\/]+/)){var u=i.substr(0,2)==="//";if(u&&!(a&&m[a])){i=i.substr(2);this.slashes=true}}if(!m[a]&&(u||a&&!g[a])){var b=-1;for(var w=0;w<l.length;w++){var E=i.indexOf(l[w]);if(E!==-1&&(b===-1||E<b))b=E}var x,R;if(b===-1){R=i.lastIndexOf("@")}else{R=i.lastIndexOf("@",b)}if(R!==-1){x=i.slice(0,R);i=i.slice(R+1);this.auth=decodeURIComponent(x)}b=-1;for(var w=0;w<f.length;w++){var E=i.indexOf(f[w]);if(E!==-1&&(b===-1||E<b))b=E}if(b===-1)b=i.length;this.host=i.slice(0,b);i=i.slice(b);this.parseHost();this.hostname=this.hostname||"";var A=this.hostname[0]==="["&&this.hostname[this.hostname.length-1]==="]";if(!A){var C=this.hostname.split(/\./);for(var w=0,T=C.length;w<T;w++){var q=C[w];if(!q)continue;if(!q.match(p)){var _="";for(var L=0,I=q.length;L<I;L++){if(q.charCodeAt(L)>127){_+="x"}else{_+=q[L]}}if(!_.match(p)){var P=C.slice(0,w);var j=C.slice(w+1);var k=q.match(d);if(k){P.push(k[1]);j.unshift(k[2])}if(j.length){i="/"+j.join(".")+i}this.hostname=P.join(".");break}}}}if(this.hostname.length>h){this.hostname=""}else{this.hostname=this.hostname.toLowerCase()}if(!A){var O=this.hostname.split(".");var N=[];for(var w=0;w<O.length;++w){var D=O[w];N.push(D.match(/[^A-Za-z0-9_-]/)?"xn--"+n.encode(D):D)}this.hostname=N.join(".")}var B=this.port?":"+this.port:"";var U=this.hostname||"";this.host=U+B;this.href+=this.host;if(A){this.hostname=this.hostname.substr(1,this.hostname.length-2);if(i[0]!=="/"){i="/"+i}}}if(!v[o]){for(var w=0,T=c.length;w<T;w++){var H=c[w];var M=encodeURIComponent(H);if(M===H){M=escape(H)}i=i.split(H).join(M)}}var z=i.indexOf("#");if(z!==-1){this.hash=i.substr(z);i=i.slice(0,z)}var V=i.indexOf("?");if(V!==-1){this.search=i.substr(V);this.query=i.substr(V+1);if(t){this.query=y.parse(this.query)}i=i.slice(0,V)}else if(t){this.search="";this.query={}}if(i)this.pathname=i;if(g[o]&&this.hostname&&!this.pathname){this.pathname="/"}if(this.pathname||this.search){var B=this.pathname||"";var D=this.search||"";this.path=B+D}this.href=this.format();return this};function w(e){if(S(e))e=b(e);if(!(e instanceof i))return i.prototype.format.call(e);return e.format()}i.prototype.format=function(){var e=this.auth||"";if(e){e=encodeURIComponent(e);e=e.replace(/%3A/i,":");e+="@"}var t=this.protocol||"",r=this.pathname||"",n=this.hash||"",i=false,s="";if(this.host){i=e+this.host}else if(this.hostname){i=e+(this.hostname.indexOf(":")===-1?this.hostname:"["+this.hostname+"]");if(this.port){i+=":"+this.port}}if(this.query&&R(this.query)&&Object.keys(this.query).length){s=y.stringify(this.query)}var a=this.search||s&&"?"+s||"";if(t&&t.substr(-1)!==":")t+=":";if(this.slashes||(!t||g[t])&&i!==false){i="//"+(i||"");if(r&&r.charAt(0)!=="/")r="/"+r}else if(!i){i=""}if(n&&n.charAt(0)!=="#")n="#"+n;if(a&&a.charAt(0)!=="?")a="?"+a;r=r.replace(/[?#]/g,function(e){return encodeURIComponent(e)});a=a.replace("#","%23");return t+i+r+a+n};function E(e,t){return b(e,false,true).resolve(t)}i.prototype.resolve=function(e){return this.resolveObject(b(e,false,true)).format()};function x(e,t){if(!e)return t;return b(e,false,true).resolveObject(t)}i.prototype.resolveObject=function(e){if(S(e)){var t=new i;t.parse(e,false,true);e=t}var r=new i;Object.keys(this).forEach(function(e){r[e]=this[e]},this);r.hash=e.hash;if(e.href===""){r.href=r.format();return r}if(e.slashes&&!e.protocol){Object.keys(e).forEach(function(t){if(t!=="protocol")r[t]=e[t]});if(g[r.protocol]&&r.hostname&&!r.pathname){r.path=r.pathname="/"}r.href=r.format();return r}if(e.protocol&&e.protocol!==r.protocol){if(!g[e.protocol]){Object.keys(e).forEach(function(t){r[t]=e[t]});r.href=r.format();return r}r.protocol=e.protocol;if(!e.host&&!m[e.protocol]){var n=(e.pathname||"").split("/");while(n.length&&!(e.host=n.shift()));if(!e.host)e.host="";if(!e.hostname)e.hostname="";if(n[0]!=="")n.unshift("");if(n.length<2)n.unshift("");r.pathname=n.join("/")}else{r.pathname=e.pathname}r.search=e.search;r.query=e.query;r.host=e.host||"";r.auth=e.auth;r.hostname=e.hostname||e.host;r.port=e.port;if(r.pathname||r.search){var s=r.pathname||"";var a=r.search||"";r.path=s+a}r.slashes=r.slashes||e.slashes;r.href=r.format();return r}var o=r.pathname&&r.pathname.charAt(0)==="/",u=e.host||e.pathname&&e.pathname.charAt(0)==="/",c=u||o||r.host&&e.pathname,f=c,l=r.pathname&&r.pathname.split("/")||[],n=e.pathname&&e.pathname.split("/")||[],h=r.protocol&&!g[r.protocol];if(h){r.hostname="";r.port=null;if(r.host){if(l[0]==="")l[0]=r.host;else l.unshift(r.host)}r.host="";if(e.protocol){e.hostname=null;e.port=null;if(e.host){if(n[0]==="")n[0]=e.host;else n.unshift(e.host)}e.host=null}c=c&&(n[0]===""||l[0]==="")}if(u){r.host=e.host||e.host===""?e.host:r.host;r.hostname=e.hostname||e.hostname===""?e.hostname:r.hostname;r.search=e.search;r.query=e.query;l=n}else if(n.length){if(!l)l=[];l.pop();l=l.concat(n);r.search=e.search;r.query=e.query}else if(!C(e.search)){if(h){r.hostname=r.host=l.shift();var p=r.host&&r.host.indexOf("@")>0?r.host.split("@"):false;if(p){r.auth=p.shift();r.host=r.hostname=p.shift()}}r.search=e.search;r.query=e.query;if(!A(r.pathname)||!A(r.search)){r.path=(r.pathname?r.pathname:"")+(r.search?r.search:"")}r.href=r.format();return r}if(!l.length){r.pathname=null;if(r.search){r.path="/"+r.search}else{r.path=null}r.href=r.format();return r}var d=l.slice(-1)[0];var v=(r.host||e.host)&&(d==="."||d==="..")||d==="";var y=0;for(var b=l.length;b>=0;b--){d=l[b];if(d=="."){l.splice(b,1)}else if(d===".."){l.splice(b,1);y++}else if(y){l.splice(b,1);y--}}if(!c&&!f){for(;y--;y){l.unshift("..")}}if(c&&l[0]!==""&&(!l[0]||l[0].charAt(0)!=="/")){l.unshift("")}if(v&&l.join("/").substr(-1)!=="/"){l.push("")}var w=l[0]===""||l[0]&&l[0].charAt(0)==="/";if(h){r.hostname=r.host=w?"":l.length?l.shift():"";var p=r.host&&r.host.indexOf("@")>0?r.host.split("@"):false;if(p){r.auth=p.shift();r.host=r.hostname=p.shift()}}c=c||r.host&&l.length;if(c&&!w){l.unshift("")}if(!l.length){r.pathname=null;r.path=null}else{r.pathname=l.join("/")}if(!A(r.pathname)||!A(r.search)){r.path=(r.pathname?r.pathname:"")+(r.search?r.search:"")}r.auth=e.auth||r.auth;r.slashes=r.slashes||e.slashes;r.href=r.format();return r};i.prototype.parseHost=function(){var e=this.host;var t=a.exec(e);if(t){t=t[0];if(t!==":"){this.port=t.substr(1)}e=e.substr(0,e.length-t.length)}if(e)this.hostname=e};function S(e){return typeof e==="string"}function R(e){return typeof e==="object"&&e!==null}function A(e){return e===null}function C(e){return e==null}},{punycode:13,querystring:16}],18:[function(e,t,r){t.exports=function n(e){return e&&typeof e==="object"&&typeof e.copy==="function"&&typeof e.fill==="function"&&typeof e.readUInt8==="function"}},{}],19:[function(e,t,r){(function(t,n){var i=/%[sdj%]/g;r.format=function(e){if(!x(e)){var t=[];for(var r=0;r<arguments.length;r++){t.push(o(arguments[r]))}return t.join(" ")}var r=1;var n=arguments;var s=n.length;var a=String(e).replace(i,function(e){if(e==="%")return"%";if(r>=s)return e;switch(e){case"%s":return String(n[r++]);case"%d":return Number(n[r++]);case"%j":try{return JSON.stringify(n[r++])}catch(t){return"[Circular]"}default:return e}});for(var u=n[r];r<s;u=n[++r]){if(b(u)||!C(u)){a+=" "+u}else{a+=" "+o(u)}}return a};r.deprecate=function(e,i){if(R(n.process)){return function(){return r.deprecate(e,i).apply(this,arguments)}}if(t.noDeprecation===true){return e}var s=false;function a(){if(!s){if(t.throwDeprecation){throw new Error(i)}else if(t.traceDeprecation){console.trace(i)}else{console.error(i)}s=true}return e.apply(this,arguments)}return a};var s={};var a;r.debuglog=function(e){if(R(a))a=t.env.NODE_DEBUG||"";e=e.toUpperCase();if(!s[e]){if(new RegExp("\\b"+e+"\\b","i").test(a)){var n=t.pid;s[e]=function(){var t=r.format.apply(r,arguments);console.error("%s %d: %s",e,n,t)}}else{s[e]=function(){}}}return s[e]};function o(e,t){var n={seen:[],stylize:c};if(arguments.length>=3)n.depth=arguments[2];if(arguments.length>=4)n.colors=arguments[3];if(y(t)){n.showHidden=t}else if(t){r._extend(n,t)}if(R(n.showHidden))n.showHidden=false;if(R(n.depth))n.depth=2;if(R(n.colors))n.colors=false;if(R(n.customInspect))n.customInspect=true;if(n.colors)n.stylize=u;return l(n,e,n.depth)}r.inspect=o;o.colors={bold:[1,22],italic:[3,23],underline:[4,24],inverse:[7,27],white:[37,39],grey:[90,39],black:[30,39],blue:[34,39],cyan:[36,39],green:[32,39],magenta:[35,39],red:[31,39],yellow:[33,39]};o.styles={special:"cyan",number:"yellow","boolean":"yellow",undefined:"grey","null":"bold",string:"green",date:"magenta",regexp:"red"};function u(e,t){var r=o.styles[t];if(r){return"["+o.colors[r][0]+"m"+e+"["+o.colors[r][1]+"m"}else{return e}}function c(e,t){return e}function f(e){var t={};e.forEach(function(e,r){t[e]=true});return t}function l(e,t,n){if(e.customInspect&&t&&_(t.inspect)&&t.inspect!==r.inspect&&!(t.constructor&&t.constructor.prototype===t)){var i=t.inspect(n,e);if(!x(i)){i=l(e,i,n)}return i}var s=h(e,t);if(s){return s}var a=Object.keys(t);var o=f(a);if(e.showHidden){a=Object.getOwnPropertyNames(t)}if(q(t)&&(a.indexOf("message")>=0||a.indexOf("description")>=0)){return p(t)}if(a.length===0){if(_(t)){var u=t.name?": "+t.name:"";return e.stylize("[Function"+u+"]","special")}if(A(t)){return e.stylize(RegExp.prototype.toString.call(t),"regexp")}if(T(t)){return e.stylize(Date.prototype.toString.call(t),"date")}if(q(t)){return p(t)}}var c="",y=false,b=["{","}"];if(g(t)){y=true;b=["[","]"]}if(_(t)){var w=t.name?": "+t.name:"";c=" [Function"+w+"]"}if(A(t)){c=" "+RegExp.prototype.toString.call(t)}if(T(t)){c=" "+Date.prototype.toUTCString.call(t)}if(q(t)){c=" "+p(t)}if(a.length===0&&(!y||t.length==0)){return b[0]+c+b[1]}if(n<0){if(A(t)){return e.stylize(RegExp.prototype.toString.call(t),"regexp")}else{return e.stylize("[Object]","special")}}e.seen.push(t);var E;if(y){E=d(e,t,n,o,a)}else{E=a.map(function(r){return v(e,t,n,o,r,y)})}e.seen.pop();return m(E,c,b)}function h(e,t){if(R(t))return e.stylize("undefined","undefined");if(x(t)){var r="'"+JSON.stringify(t).replace(/^"|"$/g,"").replace(/'/g,"\\'").replace(/\\"/g,'"')+"'";return e.stylize(r,"string")}if(E(t))return e.stylize(""+t,"number");if(y(t))return e.stylize(""+t,"boolean");if(b(t))return e.stylize("null","null")}function p(e){return"["+Error.prototype.toString.call(e)+"]"}function d(e,t,r,n,i){var s=[];for(var a=0,o=t.length;a<o;++a){if(O(t,String(a))){s.push(v(e,t,r,n,String(a),true))}else{s.push("")}}i.forEach(function(i){if(!i.match(/^\d+$/)){s.push(v(e,t,r,n,i,true))}});return s}function v(e,t,r,n,i,s){var a,o,u;u=Object.getOwnPropertyDescriptor(t,i)||{value:t[i]};if(u.get){if(u.set){o=e.stylize("[Getter/Setter]","special")}else{o=e.stylize("[Getter]","special")}}else{if(u.set){o=e.stylize("[Setter]","special")}}if(!O(n,i)){a="["+i+"]"}if(!o){if(e.seen.indexOf(u.value)<0){if(b(r)){o=l(e,u.value,null)}else{o=l(e,u.value,r-1)}if(o.indexOf("\n")>-1){if(s){o=o.split("\n").map(function(e){return"  "+e}).join("\n").substr(2)}else{o="\n"+o.split("\n").map(function(e){return"   "+e}).join("\n")}}}else{o=e.stylize("[Circular]","special")}}if(R(a)){if(s&&i.match(/^\d+$/)){return o}a=JSON.stringify(""+i);if(a.match(/^"([a-zA-Z_][a-zA-Z_0-9]*)"$/)){a=a.substr(1,a.length-2);a=e.stylize(a,"name")}else{a=a.replace(/'/g,"\\'").replace(/\\"/g,'"').replace(/(^"|"$)/g,"'");a=e.stylize(a,"string")}}return a+": "+o}function m(e,t,r){var n=0;var i=e.reduce(function(e,t){n++;if(t.indexOf("\n")>=0)n++;return e+t.replace(/\u001b\[\d\d?m/g,"").length+1},0);if(i>60){return r[0]+(t===""?"":t+"\n ")+" "+e.join(",\n  ")+" "+r[1]}return r[0]+t+" "+e.join(", ")+" "+r[1]}function g(e){return Array.isArray(e)}r.isArray=g;function y(e){return typeof e==="boolean"}r.isBoolean=y;function b(e){return e===null}r.isNull=b;function w(e){return e==null}r.isNullOrUndefined=w;function E(e){return typeof e==="number"}r.isNumber=E;function x(e){return typeof e==="string"}r.isString=x;function S(e){return typeof e==="symbol"}r.isSymbol=S;function R(e){return e===void 0}r.isUndefined=R;function A(e){return C(e)&&I(e)==="[object RegExp]"}r.isRegExp=A;function C(e){return typeof e==="object"&&e!==null}r.isObject=C;function T(e){return C(e)&&I(e)==="[object Date]"}r.isDate=T;function q(e){return C(e)&&(I(e)==="[object Error]"||e instanceof Error)}r.isError=q;function _(e){return typeof e==="function"}r.isFunction=_;function L(e){return e===null||typeof e==="boolean"||typeof e==="number"||typeof e==="string"||typeof e==="symbol"||typeof e==="undefined"}r.isPrimitive=L;r.isBuffer=e("./support/isBuffer");function I(e){return Object.prototype.toString.call(e)}function P(e){return e<10?"0"+e.toString(10):e.toString(10)}var j=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];function k(){var e=new Date;var t=[P(e.getHours()),P(e.getMinutes()),P(e.getSeconds())].join(":");return[e.getDate(),j[e.getMonth()],t].join(" ")}r.log=function(){console.log("%s - %s",k(),r.format.apply(r,arguments))};r.inherits=e("inherits");r._extend=function(e,t){if(!t||!C(t))return e;var r=Object.keys(t);var n=r.length;while(n--){e[r[n]]=t[r[n]]}return e};function O(e,t){return Object.prototype.hasOwnProperty.call(e,t)}}).call(this,e("G+mPsH"),typeof self!=="undefined"?self:typeof window!=="undefined"?window:{})},{"./support/isBuffer":18,"G+mPsH":12,inherits:11}],20:[function(e,t,r){var n=e("./core");n.XML.Parser=e("./xml/browser_parser");e("./http/xhr");/*gfodor*/if(typeof window!=="undefined")window.AltAWS=n},{"./core":22,"./http/xhr":31,"./xml/browser_parser":63}],21:[function(e,t,r){var n=e("./core");e("./credentials");e("./credentials/credential_provider_chain");n.Config=n.util.inherit({constructor:function i(e){if(e===undefined)e={};e=this.extractCredentials(e);n.util.each.call(this,this.keys,function(t,r){this.set(t,e[t],r)})},update:function s(e,t){t=t||false;e=this.extractCredentials(e);n.util.each.call(this,e,function(e,r){if(t||this.keys.hasOwnProperty(e))this[e]=r})},getCredentials:function a(e){var t=this;function r(r){e(r,r?null:t.credentials)}function i(e,t){return new n.util.error(t||new Error,{code:"CredentialsError",message:e})}function s(){t.credentials.get(function(e){if(e){var n="Could not load credentials from "+t.credentials.constructor.name;e=i(n,e)}r(e)})}function a(){var e=null;if(!t.credentials.accessKeyId||!t.credentials.secretAccessKey){e=i("Missing credentials")}r(e)}if(t.credentials){if(typeof t.credentials.get==="function"){s()}else{a()}}else if(t.credentialProvider){t.credentialProvider.resolve(function(e,n){if(e){e=i("Could not load credentials from any providers",e)}t.credentials=n;r(e)})}else{r(i("No credentials to load"))}},loadFromPath:function o(e){this.clear();var t=JSON.parse(n.util.readFileSync(e));var r=new n.FileSystemCredentials(e);var i=new n.CredentialProviderChain;i.providers.unshift(r);i.resolve(function(e,r){if(e)throw e;else t.credentials=r});this.constructor(t);return this},clear:function u(){n.util.each.call(this,this.keys,function(e){delete this[e]});this.set("credentials",undefined);this.set("credentialProvider",undefined)},set:function c(e,t,r){if(t===undefined){if(r===undefined){r=this.keys[e]}if(typeof r==="function"){this[e]=r.call(this)}else{this[e]=r}}else{this[e]=t}},keys:{credentials:null,credentialProvider:null,region:null,logger:null,apiVersions:{},apiVersion:null,endpoint:undefined,httpOptions:{},maxRetries:undefined,maxRedirects:10,paramValidation:true,sslEnabled:true,s3ForcePathStyle:false,computeChecksums:true,convertResponseTypes:true,dynamoDbCrc32:true,signatureVersion:null},extractCredentials:function f(e){if(e.accessKeyId&&e.secretAccessKey){e=n.util.copy(e);e.credentials=new n.Credentials(e)}return e}});n.config=new n.Config},{"./core":22,"./credentials":23,"./credentials/credential_provider_chain":25}],22:[function(e,t,r){var n={util:e("./util")};var i={};i.toString();t.exports=n;n.util.update(n,{VERSION:"2.0.15",Signers:{},Protocol:{Json:e("./protocol/json"),Query:e("./protocol/query"),Rest:e("./protocol/rest"),RestJson:e("./protocol/rest_json"),RestXml:e("./protocol/rest_xml")},XML:{Builder:e("./xml/builder"),Parser:null},JSON:{Builder:e("./json/builder"),Parser:e("./json/parser")},Model:{Api:e("./model/api"),Operation:e("./model/operation"),Shape:e("./model/shape"),Paginator:e("./model/paginator"),ResourceWaiter:e("./model/resource_waiter")},util:e("./util")});e("./service");e("./credentials");e("./credentials/credential_provider_chain");e("./credentials/temporary_credentials");e("./credentials/web_identity_credentials");e("./credentials/cognito_identity_credentials");e("./credentials/saml_credentials");e("./config");e("./http");e("./sequential_executor");e("./event_listeners");e("./request");e("./response");e("./resource_waiter");e("./signers/request_signer");e("./param_validator");n.events=new n.SequentialExecutor},{"./config":21,"./credentials":23,"./credentials/cognito_identity_credentials":24,"./credentials/credential_provider_chain":25,"./credentials/saml_credentials":26,"./credentials/temporary_credentials":27,"./credentials/web_identity_credentials":28,"./event_listeners":29,"./http":30,"./json/builder":32,"./json/parser":33,"./model/api":34,"./model/operation":36,"./model/paginator":37,"./model/resource_waiter":38,"./model/shape":39,"./param_validator":40,"./protocol/json":41,"./protocol/query":42,"./protocol/rest":43,"./protocol/rest_json":44,"./protocol/rest_xml":45,"./request":49,"./resource_waiter":50,"./response":51,"./sequential_executor":52,"./service":53,"./signers/request_signer":55,"./util":62,"./xml/builder":64}],23:[function(e,t,r){var n=e("./core");n.Credentials=n.util.inherit({constructor:function i(){n.util.hideProperties(this,["secretAccessKey"]);this.expired=false;this.expireTime=null;if(arguments.length===1&&typeof arguments[0]==="object"){var e=arguments[0].credentials||arguments[0];this.accessKeyId=e.accessKeyId;this.secretAccessKey=e.secretAccessKey;this.sessionToken=e.sessionToken}else{this.accessKeyId=arguments[0];this.secretAccessKey=arguments[1];this.sessionToken=arguments[2]}},expiryWindow:15,needsRefresh:function s(){var e=n.util.date.getDate().getTime();var t=new Date(e+this.expiryWindow*1e3);if(this.expireTime&&t>this.expireTime){return true}else{return this.expired||!this.accessKeyId||!this.secretAccessKey}},get:function a(e){var t=this;if(this.needsRefresh()){this.refresh(function(r){if(!r)t.expired=false;if(e)e(r)})}else if(e){e()}},refresh:function o(e){this.expired=false;e()}})},{"./core":22}],24:[function(e,t,r){var n=e("../core");n.CognitoIdentityCredentials=n.util.inherit(n.Credentials,{localStorageKey:{id:"aws.cognito.identity-id",providers:"aws.cognito.identity-providers"},constructor:function i(e){n.Credentials.call(this);this.expired=true;this.webIdentityCredentials=new n.WebIdentityCredentials(e);this.cognito=new n.CognitoIdentity({params:e});this.sts=new n.STS;this.params=e;this.data=null;this.identityId=null;this.loadCachedId()},refresh:function s(e){var t=this;t.data=null;t.identityId=null;t.getId(function(r){if(!r){t.cognito.getOpenIdToken(function(r,n){if(!r){t.cacheId(n);t.params.WebIdentityToken=n.Token;t.webIdentityCredentials.refresh(function(r){if(!r){t.data=t.webIdentityCredentials.data;t.sts.credentialsFrom(t.data,t)}e(r)})}else{e(r)}})}else{e(r)}})},getId:function a(e){var t=this;if(typeof t.params.IdentityId==="string")return e();t.cognito.getId(function(r,n){if(!r&&n.IdentityId){t.params.IdentityId=n.IdentityId}e(r,n)})},loadCachedId:function o(){var e=this;if(n.util.isBrowser()&&!e.params.IdentityId){var t=window.localStorage;var r=t[e.localStorageKey.id];if(r&&e.params.Logins){var i=Object.keys(e.params.Logins);var s=(t[e.localStorageKey.providers]||"").split(",");var a=s.filter(function(e){return i.indexOf(e)!==-1});if(a.length!==0){e.params.IdentityId=r}}else if(r){e.params.IdentityId=r}}},cacheId:function u(e){this.identityId=e.IdentityId;this.params.IdentityId=this.identityId;if(n.util.isBrowser()){var t=window.localStorage;t[this.localStorageKey.id]=e.IdentityId;if(this.params.Logins){t[this.localStorageKey.providers]=Object.keys(this.params.Logins).join(",")}}}})},{"../core":22}],25:[function(e,t,r){var n=e("../core");n.CredentialProviderChain=n.util.inherit(n.Credentials,{constructor:function i(e){if(e){this.providers=e}else{this.providers=n.CredentialProviderChain.defaultProviders.slice(0)}},resolve:function s(e){if(this.providers.length===0){e(new Error("No providers"));return this}var t=0;var r=this.providers.slice(0);function n(i,s){if(!i&&s||t===r.length){e(i,s);return}var a=r[t++];if(typeof a==="function"){s=a.call()}else{s=a}if(s.get){s.get(function(e){n(e,e?null:s)})}else{n(null,s)}}n();return this}});n.CredentialProviderChain.defaultProviders=[]},{"../core":22}],26:[function(e,t,r){var n=e("../core");n.SAMLCredentials=n.util.inherit(n.Credentials,{constructor:function i(e){n.Credentials.call(this);this.expired=true;this.params=e;this.service=new n.STS({params:this.params})},refresh:function s(e){var t=this;if(!e)e=function(e){if(e)throw e};t.service.assumeRoleWithSAML(function(r,n){if(!r){t.service.credentialsFrom(n,t)}e(r)})}})},{"../core":22}],27:[function(e,t,r){var n=e("../core");n.TemporaryCredentials=n.util.inherit(n.Credentials,{constructor:function i(e){n.Credentials.call(this);this.loadMasterCredentials();this.expired=true;this.params=e||{};if(this.params.RoleArn){this.params.RoleSessionName=this.params.RoleSessionName||"temporary-credentials"}this.service=new n.STS({params:this.params})},refresh:function s(e){var t=this;if(!e)e=function(e){if(e)throw e};t.service.config.credentials=t.masterCredentials;var r=t.params.RoleArn?t.service.assumeRole:t.service.getSessionToken;r.call(t.service,function(r,n){if(!r){t.service.credentialsFrom(n,t)}e(r)})},loadMasterCredentials:function a(){this.masterCredentials=n.config.credentials;while(this.masterCredentials.masterCredentials){this.masterCredentials=this.masterCredentials.masterCredentials}}})},{"../core":22}],28:[function(e,t,r){var n=e("../core");n.WebIdentityCredentials=n.util.inherit(n.Credentials,{constructor:function i(e){n.Credentials.call(this);this.expired=true;this.params=e;this.params.RoleSessionName=this.params.RoleSessionName||"web-identity";this.service=new n.STS({params:this.params});this.data=null},refresh:function s(e){var t=this;if(!e)e=function(e){if(e)throw e};t.service.assumeRoleWithWebIdentity(function(r,n){t.data=null;if(!r){t.data=n;t.service.credentialsFrom(n,t)}e(r)})}})},{"../core":22}],29:[function(e,t,r){var n=e("./core");var i=e("./sequential_executor");n.EventListeners={Core:{}};n.EventListeners={Core:(new i).addNamedListeners(function(e,t){t("VALIDATE_CREDENTIALS","validate",function r(e,t){if(!e.service.api.signatureVersion)return t();e.service.config.getCredentials(function(r){if(r){e.response.error=n.util.error(r,{code:"CredentialsError",message:"Missing credentials in config"})}t()})});e("VALIDATE_REGION","validate",function i(e){if(!e.service.config.region&&!e.service.isGlobalEndpoint){e.response.error=n.util.error(new Error,{code:"ConfigError",message:"Missing region in config"})}});e("VALIDATE_PARAMETERS","validate",function s(e){var t=e.service.api.operations[e.operation].input;(new n.ParamValidator).validate(t,e.params)});e("SET_CONTENT_LENGTH","afterBuild",function a(e){if(e.httpRequest.headers["Content-Length"]===undefined){var t=n.util.string.byteLength(e.httpRequest.body);e.httpRequest.headers["Content-Length"]=t}});e("SET_HTTP_HOST","afterBuild",function o(e){e.httpRequest.headers["Host"]=e.httpRequest.endpoint.host});e("RESTART","restart",function u(e){var t=this.response.error;if(!t||!t.retryable)return;if(this.response.retryCount<this.service.config.maxRetries){this.response.retryCount++}else{this.response.error=null}});t("SIGN","sign",function c(e,t){if(!e.service.api.signatureVersion)return t();e.service.config.getCredentials(function(r,i){if(r){e.response.error=r;return t()}try{var s=n.util.date.getDate();var a=e.service.getSignerClass(e);var o=new a(e.httpRequest,e.service.api.signingName||e.service.api.endpointPrefix);delete e.httpRequest.headers["Authorization"];delete e.httpRequest.headers["Date"];delete e.httpRequest.headers["X-Amz-Date"];o.addAuthorization(i,s);e.signedAt=s}catch(u){e.response.error=u}t()})});e("VALIDATE_RESPONSE","validateResponse",function f(e){if(this.service.successfulResponse(e,this)){e.data={};e.error=null}else{e.data=null;e.error=n.util.error(new Error,{code:"UnknownError",message:"An unknown error occurred."})}});t("SEND","send",function l(e,t){e.httpResponse._abortCallback=t;e.error=null;e.data=null;function r(r){e.httpResponse.stream=r;r.on("headers",function i(t,s){e.request.emit("httpHeaders",[t,s,e]);if(!e.request.httpRequest._streaming){if(n.HttpClient.streamsApiVersion===2){r.on("readable",function a(){var t=r.read();if(t!==null){e.request.emit("httpData",[t,e])}})}else{r.on("data",function o(t){e.request.emit("httpData",[t,e])})}}});r.on("end",function s(){e.request.emit("httpDone");t()})}function i(t){t.on("sendProgress",function r(t){e.request.emit("httpUploadProgress",[t,e])});t.on("receiveProgress",function n(t){e.request.emit("httpDownloadProgress",[t,e])})}function s(r){e.error=n.util.error(r,{code:"NetworkingError",region:e.request.httpRequest.region,hostname:e.request.httpRequest.endpoint.hostname,retryable:true});e.request.emit("httpError",[e.error,e],function(){t()})}function a(){var t=n.HttpClient.getInstance();var a=e.request.service.config.httpOptions||{};try{var o=t.handleRequest(e.request.httpRequest,a,r,s);i(o)}catch(u){s(u)}}var o=(n.util.date.getDate()-this.signedAt)/1e3;if(o>=60*10){this.emit("sign",[this],function(e){if(e)t(e);else a()})}else{a()}});e("HTTP_HEADERS","httpHeaders",function h(e,t,r){r.httpResponse.statusCode=e;r.httpResponse.headers=t;r.httpResponse.body=new n.util.Buffer("");r.httpResponse.buffers=[];r.httpResponse.numBytes=0});e("HTTP_DATA","httpData",function p(e,t){if(e){if(n.util.isNode()){t.httpResponse.numBytes+=e.length;var r=t.httpResponse.headers["content-length"];var i={loaded:t.httpResponse.numBytes,total:r};t.request.emit("httpDownloadProgress",[i,t])}t.httpResponse.buffers.push(new n.util.Buffer(e))}});e("HTTP_DONE","httpDone",function d(e){if(e.httpResponse.buffers&&e.httpResponse.buffers.length>0){var t=n.util.buffer.concat(e.httpResponse.buffers);e.httpResponse.body=t}delete e.httpResponse.numBytes;delete e.httpResponse.buffers});e("FINALIZE_ERROR","retry",function v(e){if(e.httpResponse.statusCode){e.error.statusCode=e.httpResponse.statusCode;if(e.error.retryable===undefined){e.error.retryable=this.service.retryableError(e.error,this)}}});e("INVALIDATE_CREDENTIALS","retry",function m(e){if(!e.error)return;switch(e.error.code){case"RequestExpired":case"ExpiredTokenException":case"ExpiredToken":e.error.retryable=true;e.request.service.config.credentials.expired=true}});e("REDIRECT","retry",function g(e){if(e.error&&e.error.statusCode>=300&&e.error.statusCode<400&&e.httpResponse.headers["location"]){this.httpRequest.endpoint=new n.Endpoint(e.httpResponse.headers["location"]);e.error.redirect=true;e.error.retryable=true}});e("RETRY_CHECK","retry",function y(e){if(e.error){if(e.error.redirect&&e.redirectCount<e.maxRedirects){e.error.retryDelay=0}else if(e.error.retryable&&e.retryCount<e.maxRetries){var t=this.service.retryDelays();e.error.retryDelay=t[e.retryCount]||0}}});t("RESET_RETRY_STATE","afterRetry",function b(e,t){var r,n=false;
if(e.error){r=e.error.retryDelay||0;if(e.error.retryable&&e.retryCount<e.maxRetries){e.retryCount++;n=true}else if(e.error.redirect&&e.redirectCount<e.maxRedirects){e.redirectCount++;n=true}}if(n){e.error=null;setTimeout(t,r)}else{t()}})}),CorePost:(new i).addNamedListeners(function(e){e("EXTRACT_REQUEST_ID","extractData",function t(e){e.requestId=e.httpResponse.headers["x-amz-request-id"]||e.httpResponse.headers["x-amzn-requestid"];if(!e.requestId&&e.data&&e.data.ResponseMetadata){e.requestId=e.data.ResponseMetadata.RequestId}})}),Logger:(new i).addNamedListeners(function(t){t("LOG_REQUEST","complete",function r(t){var r=t.request;var i=r.service.config.logger;if(!i)return;function s(){var s=n.util.date.getDate().getTime();var a=(s-r.startTime.getTime())/1e3;var o=i.isTTY?true:false;var u=t.httpResponse.statusCode;var c=e("util").inspect(r.params,true,true);var f="";if(o)f+="[33m";f+="[AWS "+r.service.serviceIdentifier+" "+u;f+=" "+a.toString()+"s "+t.retryCount+" retries]";if(o)f+="[0;1m";f+=" "+n.util.string.lowerFirst(r.operation);f+="("+c+")";if(o)f+="[0m";return f}var a=s();if(typeof i.log==="function"){i.log(a)}else if(typeof i.write==="function"){i.write(a+"\n")}})}),Json:(new i).addNamedListeners(function(t){var r=e("./protocol/json");t("BUILD","build",r.buildRequest);t("EXTRACT_DATA","extractData",r.extractData);t("EXTRACT_ERROR","extractError",r.extractError)}),Rest:(new i).addNamedListeners(function(t){var r=e("./protocol/rest");t("BUILD","build",r.buildRequest);t("EXTRACT_DATA","extractData",r.extractData);t("EXTRACT_ERROR","extractError",r.extractError)}),RestJson:(new i).addNamedListeners(function(t){var r=e("./protocol/rest_json");t("BUILD","build",r.buildRequest);t("EXTRACT_DATA","extractData",r.extractData);t("EXTRACT_ERROR","extractError",r.extractError)}),RestXml:(new i).addNamedListeners(function(t){var r=e("./protocol/rest_xml");t("BUILD","build",r.buildRequest);t("EXTRACT_DATA","extractData",r.extractData);t("EXTRACT_ERROR","extractError",r.extractError)}),Query:(new i).addNamedListeners(function(t){var r=e("./protocol/query");t("BUILD","build",r.buildRequest);t("EXTRACT_DATA","extractData",r.extractData);t("EXTRACT_ERROR","extractError",r.extractError)})}},{"./core":22,"./protocol/json":41,"./protocol/query":42,"./protocol/rest":43,"./protocol/rest_json":44,"./protocol/rest_xml":45,"./sequential_executor":52,util:19}],30:[function(e,t,r){var n=e("./core");var i=n.util.inherit;n.Endpoint=i({constructor:function s(e,t){n.util.hideProperties(this,["slashes","auth","hash","search","query"]);if(typeof e==="undefined"||e===null){throw new Error("Invalid endpoint: "+e)}else if(typeof e!=="string"){return n.util.copy(e)}if(!e.match(/^http/)){var r=t&&t.sslEnabled!==undefined?t.sslEnabled:n.config.sslEnabled;e=(r?"https":"http")+"://"+e}n.util.update(this,n.util.urlParse(e));if(this.port){this.port=parseInt(this.port,10)}else{this.port=this.protocol==="https:"?443:80}}});n.HttpRequest=i({constructor:function a(e,t){e=new n.Endpoint(e);this.method="POST";this.path=e.path||"/";this.headers={};this.body="";this.endpoint=e;this.region=t;this.setUserAgent()},setUserAgent:function o(){var e=n.util.isBrowser()?"X-Amz-":"";this.headers[e+"User-Agent"]=n.util.userAgent()},pathname:function u(){return this.path.split("?",1)[0]},search:function c(){return this.path.split("?",2)[1]||""}});n.HttpResponse=i({constructor:function f(){this.statusCode=undefined;this.headers={};this.body=undefined}});n.HttpClient=i({});n.HttpClient.getInstance=function l(){if(this.singleton===undefined){this.singleton=new this}return this.singleton}},{"./core":22}],31:[function(e,t,r){var n=e("../core");var i=e("events").EventEmitter;e("../http");n.XHRClient=n.util.inherit({handleRequest:function s(e,t,r,a){var o=this;var u=e.endpoint;var c=new i;var f=u.protocol+"//"+u.hostname;if(u.port!==80&&u.port!==443){f+=":"+u.port}f+=e.path;var l=new XMLHttpRequest,h=false;e.stream=l;l.addEventListener("readystatechange",function(){try{if(l.status===0)return}catch(e){return}if(this.readyState>=this.HEADERS_RECEIVED&&!h){try{l.responseType="arraybuffer"}catch(e){}c.statusCode=l.status;c.headers=o.parseHeaders(l.getAllResponseHeaders());c.emit("headers",c.statusCode,c.headers);h=true}if(this.readyState===this.DONE){o.finishRequest(l,c)}},false);l.upload.addEventListener("progress",function(e){c.emit("sendProgress",e)});l.addEventListener("progress",function(e){c.emit("receiveProgress",e)},false);l.addEventListener("timeout",function(){a(n.util.error(new Error("Timeout"),{code:"TimeoutError"}))},false);l.addEventListener("error",function(){a(n.util.error(new Error("Network Failure"),{code:"NetworkingError"}))},false);r(c);l.open(e.method,f,t.xhrAsync!==false);n.util.each(e.headers,function(e,t){if(e!=="Content-Length"&&e!=="User-Agent"&&e!=="Host"){l.setRequestHeader(e,t)}});if(t.timeout){l.timeout=t.timeout}if(t.xhrWithCredentials){l.withCredentials=true}if(e.body&&typeof e.body.buffer==="object"){l.send(e.body.buffer)}else{l.send(e.body)}return c},parseHeaders:function a(e){var t={};n.util.arrayEach(e.split(/\r?\n/),function(e){var r=e.split(":",1)[0];var n=e.substring(r.length+2);if(r.length>0)t[r]=n});return t},finishRequest:function o(e,t){var r;if(e.responseType==="arraybuffer"&&e.response){var i=e.response;r=new n.util.Buffer(i.byteLength);var s=new Uint8Array(i);for(var a=0;a<r.length;++a){r[a]=s[a]}}try{if(!r&&typeof e.responseText==="string"){r=new n.util.Buffer(e.responseText)}}catch(o){}if(r)t.emit("data",r);t.emit("end")}});n.HttpClient.prototype=n.XHRClient.prototype;n.HttpClient.streamsApiVersion=1},{"../core":22,"../http":30,events:10}],32:[function(e,t,r){var n=e("../util");function i(){}i.prototype.build=function(e,t){return JSON.stringify(s(e,t))};function s(e,t){if(!t||e===undefined||e===null)return undefined;switch(t.type){case"structure":return a(e,t);case"map":return u(e,t);case"list":return o(e,t);default:return c(e,t)}}function a(e,t){var r={};n.each(e,function(e,n){var i=t.members[e];if(i){if(i.location!=="body")return;var a=s(n,i);if(a!==undefined)r[e]=a}});return r}function o(e,t){var r=[];n.arrayEach(e,function(e){var n=s(e,t.member);if(n!==undefined)r.push(n)});return r}function u(e,t){var r={};n.each(e,function(e,n){var i=s(n,t.value);if(i!==undefined)r[e]=i});return r}function c(e,t){return t.toWireFormat(e)}t.exports=i},{"../util":62}],33:[function(e,t,r){var n=e("../util");function i(){}i.prototype.parse=function(e,t){return s(JSON.parse(e),t)};function s(e,t){if(!t||e===undefined||e===null)return undefined;switch(t.type){case"structure":return a(e,t);case"map":return u(e,t);case"list":return o(e,t);default:return c(e,t)}}function a(e,t){var r={};n.each(e,function(e,n){var i=t.members[e];if(i){var a=s(n,i);if(a!==undefined)r[e]=a}});return r}function o(e,t){var r=[];n.arrayEach(e,function(e){var n=s(e,t.member);if(n!==undefined)r.push(n)});return r}function u(e,t){var r={};n.each(e,function(e,n){var i=s(n,t.value);if(i!==undefined)r[e]=i});return r}function c(e,t){return t.toType(e)}t.exports=i},{"../util":62}],34:[function(e,t,r){var n=e("./collection");var i=e("./operation");var s=e("./shape");var a=e("./paginator");var o=e("./resource_waiter");var u=e("../util");var c=u.property;var f=u.memoizedProperty;function l(e,t){e=e||{};t=t||{};t.api=this;e.metadata=e.metadata||{};c(this,"isApi",true,false);c(this,"apiVersion",e.metadata.apiVersion);c(this,"endpointPrefix",e.metadata.endpointPrefix);c(this,"signingName",e.metadata.signingName);c(this,"globalEndpoint",e.metadata.globalEndpoint);c(this,"signatureVersion",e.metadata.signatureVersion);c(this,"jsonVersion",e.metadata.jsonVersion);c(this,"targetPrefix",e.metadata.targetPrefix);c(this,"protocol",e.metadata.protocol);c(this,"timestampFormat",e.metadata.timestampFormat);c(this,"xmlNamespaceUri",e.metadata.xmlNamespace);c(this,"abbreviation",e.metadata.serviceAbbreviation);c(this,"fullName",e.metadata.serviceFullName);f(this,"className",function(){var t=e.metadata.serviceAbbreviation||e.metadata.serviceFullName;if(!t)return null;t=t.replace(/^Amazon|AWS\s*|\(.*|\s+|\W+/g,"");if(t==="ElasticLoadBalancing")t="ELB";return t});c(this,"operations",new n(e.operations,t,function(e,r){return new i(e,r,t)},u.string.lowerFirst));c(this,"shapes",new n(e.shapes,t,function(e,r){return s.create(r,t)}));c(this,"paginators",new n(e.paginators,t,function(e,r){return new a(e,r,t)}));c(this,"waiters",new n(e.waiters,t,function(e,r){return new o(e,r,t)},u.string.lowerFirst));if(t.documentation){c(this,"documentation",e.documentation);c(this,"documentationUrl",e.documentationUrl)}}t.exports=l},{"../util":62,"./collection":35,"./operation":36,"./paginator":37,"./resource_waiter":38,"./shape":39}],35:[function(e,t,r){var n=e("../util").memoizedProperty;function i(e,t,r,i){i=i||String;var s=this;for(var a in e){if(e.hasOwnProperty(a)){(function(t){n(s,i(t),function(){return r(t,e[t])})})(a)}}}t.exports=i},{"../util":62}],36:[function(e,t,r){var n=e("./shape");var i=e("../util");var s=i.property;var a=i.memoizedProperty;function o(e,t,r){r=r||{};s(this,"name",e);s(this,"api",r.api,false);t.http=t.http||{};s(this,"httpMethod",t.http.method||"POST");s(this,"httpPath",t.http.requestUri||"/");a(this,"input",function(){if(!t.input){return new n.create({type:"structure"},r)}return n.create(t.input,r)});a(this,"output",function(){if(!t.output){return new n.create({type:"structure"},r)}return n.create(t.output,r)});a(this,"errors",function(){var e=[];if(!t.errors)return null;for(var i=0;i<t.errors.length;i++){e.push(n.create(t.errors[i],r))}return e});a(this,"paginator",function(){return r.api.paginators[e]});if(r.documentation){s(this,"documentation",t.documentation);s(this,"documentationUrl",t.documentationUrl)}}t.exports=o},{"../util":62,"./shape":39}],37:[function(e,t,r){var n=e("../util").property;function i(e,t){n(this,"inputToken",t.input_token);n(this,"limitKey",t.limit_key);n(this,"moreResults",t.more_results);n(this,"outputToken",t.output_token);n(this,"resultKey",t.result_key)}t.exports=i},{"../util":62}],38:[function(e,t,r){var n=e("../util");var i=n.property;function s(e,t,r){r=r||{};function s(){i(this,"name",e);i(this,"api",r.api,false);if(t.operation){i(this,"operation",n.string.lowerFirst(t.operation))}var s=this,a={ignoreErrors:"ignore_errors",successType:"success_type",successValue:"success_value",successPath:"success_path",acceptorType:"acceptor_type",acceptorValue:"acceptor_value",acceptorPath:"acceptor_path",failureType:"failure_type",failureValue:"failure_value",failurePath:"success_path",interval:"interval",maxAttempts:"max_attempts"};Object.keys(a).forEach(function(e){var r=t[a[e]];if(r)i(s,e,r)})}if(r.api){var a=null;if(t["extends"]){a=r.api.waiters[t["extends"]]}else if(e!=="__default__"){a=r.api.waiters["__default__"]}if(a)s.prototype=a}return new s}t.exports=s},{"../util":62}],39:[function(e,t,r){var n=e("./collection");var i=e("../util");function s(e,t,r){if(r!==null&&r!==undefined){i.property.apply(this,arguments)}}function a(e,t){if(!e.constructor.prototype[t]){i.memoizedProperty.apply(this,arguments)}}function o(e,t,r){t=t||{};s(this,"shape",e.shape);s(this,"api",t.api,false);s(this,"type",e.type);s(this,"location",e.location||"body");s(this,"name",this.name||e.xmlName||e.locationName||r);s(this,"isStreaming",e.streaming||false);s(this,"isComposite",e.isComposite||false);s(this,"isShape",true,false);if(t.documentation){s(this,"documentation",e.documentation);s(this,"documentationUrl",e.documentationUrl)}if(e.xmlAttribute){s(this,"isXmlAttribute",e.xmlAttribute||false)}s(this,"defaultValue",null);this.toWireFormat=function(e){if(e===null||e===undefined)return"";return e};this.toType=function(e){return e}}o.normalizedTypes={character:"string","double":"float","long":"integer","short":"integer",biginteger:"integer",bigdecimal:"float",blob:"binary"};o.types={structure:c,list:f,map:l,"boolean":y,timestamp:h,"float":d,integer:v,string:p,base64:g,binary:m};o.resolve=function b(e,t){if(e.shape){var r=t.api.shapes[e.shape];if(!r){throw new Error("Cannot find shape reference: "+e.shape)}return r}else{return null}};o.create=function w(e,t,r){if(e.isShape)return e;var n=o.resolve(e,t);if(n){var i=Object.keys(e);if(!t.documentation){i=i.filter(function(e){return!e.match(/documentation/)})}if(i===["shape"]){return n}var s=function(){n.constructor.call(this,e,t,r)};s.prototype=n;return new s}else{if(!e.type){if(e.members)e.type="structure";else if(e.member)e.type="list";else if(e.key)e.type="map";else e.type="string"}var a=e.type;if(o.normalizedTypes[e.type]){e.type=o.normalizedTypes[e.type]}if(o.types[e.type]){return new o.types[e.type](e,t,r)}else{throw new Error("Unrecognized shape type: "+a)}}};function u(e){o.apply(this,arguments);s(this,"isComposite",true);if(e.flattened){s(this,"flattened",e.flattened||false)}}function c(e,t){var r=null,i=!this.isShape;u.apply(this,arguments);if(i){s(this,"defaultValue",function(){return{}});s(this,"members",{});s(this,"memberNames",[]);s(this,"required",[]);s(this,"isRequired",function(e){return false})}if(e.members){s(this,"members",new n(e.members,t,function(e,r){return o.create(r,t,e)}));a(this,"memberNames",function(){return e.xmlOrder||Object.keys(e.members)})}if(e.required){s(this,"required",e.required);s(this,"isRequired",function(t){if(!r){r={};for(var n=0;n<e.required.length;n++){r[e.required[n]]=true}}return r[t]},false,true)}s(this,"resultWrapper",e.resultWrapper||null);if(e.payload){s(this,"payload",e.payload)}if(typeof e.xmlNamespace==="string"){s(this,"xmlNamespaceUri",e.xmlNamespace)}else if(typeof e.xmlNamespace==="object"){s(this,"xmlNamespacePrefix",e.xmlNamespace.prefix);s(this,"xmlNamespaceUri",e.xmlNamespace.uri)}}function f(e,t){var r=this,n=!this.isShape;u.apply(this,arguments);if(n){s(this,"defaultValue",function(){return[]})}if(e.member){a(this,"member",function(){return o.create(e.member,t)})}if(this.flattened){var i=this.name;a(this,"name",function(){return r.member.name||i})}}function l(e,t){var r=!this.isShape;u.apply(this,arguments);if(r){s(this,"defaultValue",function(){return{}});s(this,"key",o.create({type:"string"},t));s(this,"value",o.create({type:"string"},t))}if(e.key){a(this,"key",function(){return o.create(e.key,t)})}if(e.value){a(this,"value",function(){return o.create(e.value,t)})}}function h(e){var t=this;o.apply(this,arguments);if(this.location==="header"){s(this,"timestampFormat","rfc822")}else if(e.timestampFormat){s(this,"timestampFormat",e.timestampFormat)}else if(this.api){if(this.api.timestampFormat){s(this,"timestampFormat",this.api.timestampFormat)}else{switch(this.api.protocol){case"json":case"rest-json":s(this,"timestampFormat","unixTimestamp");break;case"rest-xml":case"query":s(this,"timestampFormat","iso8601");break}}}this.toType=function(e){if(e===null||e===undefined)return null;if(typeof e.toUTCString==="function")return e;return typeof e==="string"||typeof e==="number"?i.date.parseTimestamp(e):null};this.toWireFormat=function(e){return i.date.format(e,t.timestampFormat)}}function p(){o.apply(this,arguments)}function d(){o.apply(this,arguments);this.toType=function(e){if(e===null||e===undefined)return null;return parseFloat(e)};this.toWireFormat=this.toType}function v(){o.apply(this,arguments);this.toType=function(e){if(e===null||e===undefined)return null;return parseInt(e,10)};this.toWireFormat=this.toType}function m(){o.apply(this,arguments);this.toType=i.base64.decode;this.toWireFormat=i.base64.encode}function g(){m.apply(this,arguments)}function y(){o.apply(this,arguments);this.toType=function(e){if(typeof e==="boolean")return e;if(e===null||e===undefined)return null;return e==="true"}}o.shapes={StructureShape:c,ListShape:f,MapShape:l,StringShape:p,BooleanShape:y,Base64Shape:g};t.exports=o},{"../util":62,"./collection":35}],40:[function(e,t,r){var n=e("./core");n.ParamValidator=n.util.inherit({validate:function i(e,t,r){return this.validateMember(e,t||{},r||"params")},validateStructure:function s(e,t,r){this.validateType(r,t,["object"],"structure");for(var n=0;e.required&&n<e.required.length;n++){var i=e.required[n];var s=t[i];if(s===undefined||s===null){this.fail("MissingRequiredParameter","Missing required key '"+i+"' in "+r)}}for(i in t){if(!t.hasOwnProperty(i))continue;var a=t[i],o=e.members[i];if(o!==undefined){var u=[r,i].join(".");this.validateMember(o,a,u)}else{this.fail("UnexpectedParameter","Unexpected key '"+i+"' found in "+r)}}return true},validateMember:function a(e,t,r){switch(e.type){case"structure":return this.validateStructure(e,t,r);case"list":return this.validateList(e,t,r);case"map":return this.validateMap(e,t,r);default:return this.validateScalar(e,t,r)}},validateList:function o(e,t,r){this.validateType(r,t,[Array]);for(var n=0;n<t.length;n++){this.validateMember(e.member,t[n],r+"["+n+"]")}},validateMap:function u(e,t,r){this.validateType(r,t,["object"],"map");for(var n in t){if(!t.hasOwnProperty(n))continue;this.validateMember(e.value,t[n],r+"['"+n+"']")}},validateScalar:function c(e,t,r){switch(e.type){case null:case undefined:case"string":return this.validateType(r,t,["string"]);case"base64":case"binary":return this.validatePayload(r,t);case"integer":case"float":return this.validateNumber(r,t);case"boolean":return this.validateType(r,t,["boolean"]);case"timestamp":return this.validateType(r,t,[Date,/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/,"number"],"Date object, ISO-8601 string, or a UNIX timestamp");default:return this.fail("UnkownType","Unhandled type "+e.type+" for "+r)}},fail:function f(e,t){throw n.util.error(new Error(t),{code:e})},validateType:function l(e,t,r,i){if(t===null||t===undefined)return;var s=false;for(var a=0;a<r.length;a++){if(typeof r[a]==="string"){if(typeof t===r[a])return}else if(r[a]instanceof RegExp){if((t||"").toString().match(r[a]))return}else{if(t instanceof r[a])return;if(n.util.isType(t,r[a]))return;if(!i&&!s)r=r.slice();r[a]=n.util.typeName(r[a])}s=true}var o=i;if(!o){o=r.join(", ").replace(/,([^,]+)$/,", or$1")}var u=o.match(/^[aeiou]/i)?"n":"";this.fail("InvalidParameterType","Expected "+e+" to be a"+u+" "+o)},validateNumber:function h(e,t){if(t===null||t===undefined)return;if(typeof t==="string"){var r=parseFloat(t);if(r.toString()===t)t=r}this.validateType(e,t,["number"])},validatePayload:function p(e,t){if(t===null||t===undefined)return;if(typeof t==="string")return;if(t&&typeof t.byteLength==="number")return;if(n.util.isNode()){var r=n.util.nodeRequire("stream").Stream;if(n.util.Buffer.isBuffer(t)||t instanceof r)return}var i=["Buffer","Stream","File","Blob","ArrayBuffer","DataView"];if(t){for(var s=0;s<i.length;s++){if(n.util.isType(t,i[s]))return;if(n.util.typeName(t.constructor)===i[s])return}}this.fail("InvalidParameterType","Expected "+e+" to be a "+"string, Buffer, Stream, Blob, or typed array object")}})},{"./core":22}],41:[function(e,t,r){var n=e("../util");var i=e("../json/builder");var s=e("../json/parser");function a(e){var t=e.httpRequest;var r=e.service.api;var n=r.targetPrefix+"."+r.operations[e.operation].name;var s=r.jsonVersion||"1.0";var a=r.operations[e.operation].input;var o=new i;if(s===1)s="1.0";t.body=o.build(e.params||{},a);t.headers["Content-Type"]="application/x-amz-json-"+s;t.headers["X-Amz-Target"]=n}function o(e){var t={};var r=e.httpResponse;if(r.body.length>0){var i=JSON.parse(r.body.toString());if(i.__type||i.code){t.code=(i.__type||i.code).split("#").pop()}else{t.code="UnknownError"}if(t.code==="RequestEntityTooLarge"){t.message="Request body must be less than 1 MB"}else{t.message=i.message||i.Message||null}}else{t.code=r.statusCode;t.message=null}e.error=n.error(new Error,t)}function u(e){var t=e.httpResponse.body.toString()||"{}";if(e.request.service.config.convertResponseTypes===false){e.data=JSON.parse(t)}else{var r=e.request.service.api.operations[e.request.operation];var n=r.output||{};var i=new s;e.data=i.parse(t,n)}}t.exports={buildRequest:a,extractError:o,extractData:u}},{"../json/builder":32,"../json/parser":33,"../util":62}],42:[function(e,t,r){var n=e("../core");var i=e("../util");var s=e("../query/query_param_serializer");var a=e("../model/shape");function o(e){var t=e.service.api.operations[e.operation];var r=e.httpRequest;r.headers["Content-Type"]="application/x-www-form-urlencoded; charset=utf-8";r.params={Version:e.service.api.apiVersion,Action:t.name};var n=new s;n.serialize(e.params,t.input,function(e,t){r.params[e]=t});r.body=i.queryParamsToString(r.params)}function u(e){var t,r=e.httpResponse.body.toString();if(r.match("<UnknownOperationException")){t={Code:"UnknownOperation",Message:"Unknown operation "+e.request.operation}}else{t=(new n.XML.Parser).parse(r)}if(t.Errors)t=t.Errors;if(t.Error)t=t.Error;if(t.Code){e.error=i.error(new Error,{code:t.Code,message:t.Message})}else{e.error=i.error(new Error,{code:e.httpResponse.statusCode,message:null})}}function c(e){var t=e.request;var r=t.service.api.operations[t.operation];var s=r.output||{};var o=s;if(o.resultWrapper){var u=a.create({type:"structure"});u.members[o.resultWrapper]=s;u.memberNames=[o.resultWrapper];i.property(s,"name",s.resultWrapper);s=u}var c=new n.XML.Parser;var f=c.parse(e.httpResponse.body.toString(),s);if(o.resultWrapper){if(f[o.resultWrapper]){i.update(f,f[o.resultWrapper]);delete f[o.resultWrapper]}}e.data=f}t.exports={buildRequest:o,extractError:u,extractData:c}},{"../core":22,"../model/shape":39,"../query/query_param_serializer":46,"../util":62}],43:[function(e,t,r){var n=e("../util");function i(e){e.httpRequest.method=e.service.api.operations[e.operation].httpMethod}function s(e){var t=e.service.api.operations[e.operation];var r=t.input;var i=[e.httpRequest.endpoint.path,t.httpPath].join("/");i=i.replace(/\/+/g,"/");var s=e.service.escapePathParam||a;var u=e.service.escapeQuerystringParam||o;var c={},f=false;n.each(r.members,function(t,r){var n=e.params[t];if(n===null||n===undefined)return;if(r.location==="uri"){i=i.replace("{"+r.name+"}",s(n))}else if(r.location==="querystring"){f=true;c[r.name]=u(n)}});if(f){i+=i.indexOf("?")>=0?"&":"?";var l=[];n.arrayEach(Object.keys(c).sort(),function(e){l.push(o(e)+"="+c[e])});i+=l.join("&")}e.httpRequest.path=i}function a(e){return n.uriEscape(String(e))}function o(e){return n.uriEscape(String(e))}function u(e){var t=e.service.api.operations[e.operation];n.each(t.input.members,function(t,r){var i=e.params[t];if(i===null||i===undefined)return;if(r.location==="headers"&&r.type==="map"){n.each(i,function(t,n){e.httpRequest.headers[r.name+t]=n})}else if(r.location==="header"){i=r.toWireFormat(i).toString();e.httpRequest.headers[r.name]=i}})}function c(e){i(e);s(e);u(e)}function f(){}function l(e){var t=e.request;var r={};var i=e.httpResponse;var s=t.service.api.operations[t.operation];var a=s.output;var o={};n.each(i.headers,function(e,t){o[e.toLowerCase()]=t});n.each(a.members,function(e,t){var s=(t.name||e).toLowerCase();if(t.location==="headers"&&t.type==="map"){r[e]={};n.each(i.headers,function(n,i){var s=n.match(new RegExp("^"+t.name+"(.+)","i"));if(s!==null){r[e][s[1]]=i}})}else if(t.location==="header"){if(o[s]!==undefined){r[e]=o[s]}}else if(t.location==="status"){r[e]=parseInt(i.statusCode,10)}});e.data=r}t.exports={buildRequest:c,extractError:f,extractData:l}},{"../util":62}],44:[function(e,t,r){var n=e("../util");var i=e("./rest");var s=e("./json");var a=e("../json/builder");function o(e){var t=new a;var r=e.service.api.operations[e.operation].input;if(r.payload){var n={};var i=r.members[r.payload];n=e.params[r.payload];if(n===undefined)return;if(i.type==="structure"){e.httpRequest.body=t.build(n,i)}else{e.httpRequest.body=n}}else{e.httpRequest.body=t.build(e.params,r)}}function u(e){i.buildRequest(e);if(["GET","HEAD"].indexOf(e.httpRequest.method)<0){o(e)}}function c(e){s.extractError(e)}function f(e){i.extractData(e);var t=e.request;var r=t.service.api.operations[t.operation].output||{};if(r.payload){var a=r.members[r.payload];if(a.isStreaming){e.data[r.payload]=e.httpResponse.body}else if(a.type==="structure"){s.extractData(e)}else{e.data[r.payload]=e.httpResponse.body.toString()}}else{var o=e.data;s.extractData(e);e.data=n.merge(o,e.data)}}t.exports={buildRequest:u,extractError:c,extractData:f}},{"../json/builder":32,"../util":62,"./json":41,"./rest":43}],45:[function(e,t,r){var n=e("../core");var i=e("../util");var s=e("./rest");function a(e){var t=e.service.api.operations[e.operation].input;var r=new n.XML.Builder;var s=e.params;var a=t.payload;if(a){var o=t.members[a];s=s[a];if(s===undefined)return;if(o.type==="structure"){var u=o.name;e.httpRequest.body=r.toXML(s,o,u)}else{e.httpRequest.body=s}}else{e.httpRequest.body=r.toXML(s,t,t.shape||i.string.upperFirst(e.operation)+"Request")}}function o(e){s.buildRequest(e);if(["GET","HEAD"].indexOf(e.httpRequest.method)<0){a(e)}}function u(e){s.extractError(e);var t=(new n.XML.Parser).parse(e.httpResponse.body.toString());if(t.Errors)t=t.Errors;if(t.Error)t=t.Error;if(t.Code){e.error=i.error(new Error,{code:t.Code,message:t.Message})}else{e.error=i.error(new Error,{code:e.httpResponse.statusCode,message:null})}}function c(e){s.extractData(e);var t;var r=e.request;var a=e.httpResponse.body;var o=r.service.api.operations[r.operation];var u=o.output;var c=u.payload;if(c){var f=u.members[c];if(f.isStreaming){e.data[c]=a}else if(f.type==="structure"){t=new n.XML.Parser;i.update(e.data,t.parse(a.toString(),f))}else{e.data[c]=a.toString()}}else if(a.length>0){t=new n.XML.Parser;var l=t.parse(a.toString(),u);i.update(e.data,l)}}t.exports={buildRequest:o,extractError:u,extractData:c}},{"../core":22,"../util":62,"./rest":43}],46:[function(e,t,r){var n=e("../util");function i(){}i.prototype.serialize=function(e,t,r){s("",e,t,r)};function s(e,t,r,i){n.each(r.members,function(r,n){var s=t[r];if(s===null||s===undefined)return;var a=e?e+"."+n.name:n.name;u(a,s,n,i)})}function a(e,t,r,i){var s=1;n.each(t,function(t,n){var a=r.flattened?".":".entry.";var o=a+s++ +".";var c=o+(r.key.name||"key");var f=o+(r.value.name||"value");u(e+c,t,r.key,i);u(e+f,n,r.value,i)})}function o(e,t,r,i){var s=r.member||{};if(t.length===0){i.call(this,e,null);return}n.arrayEach(t,function(t,n){var a="."+(n+1);if(r.flattened){if(s.name){var o=e.split(".");o.pop();o.push(s.name);e=o.join(".")}}else{a=".member"+a}u(e+a,t,s,i)})}function u(e,t,r,n){if(t===null||t===undefined)return;if(r.type==="structure"){s(e,t,r,n)}else if(r.type==="list"){o(e,t,r,n)}else if(r.type==="map"){a(e,t,r,n)}else{n(e,r.toWireFormat(t).toString())}}t.exports=i},{"../util":62}],47:[function(e,t,r){var n=e("./util");var i=e("./region_config.json");function s(e){var t=e.serviceIdentifier||"";var r=e.config.region||"";var s={};i.forEach(function(i){(i.regions||[]).forEach(function(a){if(r.match(new RegExp("^"+a.replace("*",".*")+"$"))){(i.serviceConfigs||[]).forEach(function(r){(r.services||[]).forEach(function(i){if(t.match(new RegExp("^"+i.replace("*",".*")+"$"))){n.update(s,r.config);e.isGlobalEndpoint=!!r.globalEndpoint}})})}})});n.each(s,function(t,r){if(e.config[t]===undefined||e.config[t]===null){e.config[t]=r}})}t.exports=s},{"./region_config.json":48,"./util":62}],48:[function(e,t,r){t.exports=[{regions:["*"],serviceConfigs:[{services:["*"],config:{endpoint:"{service}.{region}.amazonaws.com"}},{services:["cloudfront","iam","importexport","sts"],config:{endpoint:"{service}.amazonaws.com"},globalEndpoint:true},{services:["s3"],config:{endpoint:"{service}-{region}.amazonaws.com"}},{services:["route53"],config:{endpoint:"https://{service}.amazonaws.com"},globalEndpoint:true}]},{regions:["us-east-1"],serviceConfigs:[{services:["s3","simpledb"],config:{endpoint:"{service}.amazonaws.com"}}]},{regions:["cn-*"],serviceConfigs:[{services:["*"],config:{endpoint:"{service}.{region}.amazonaws.com.cn",signatureVersion:"v4"}}]}]},{}],49:[function(e,t,r){(function(t){var r=e("./core");var n=e("./state_machine");var i=r.util.inherit;var s={success:1,error:1,complete:1};function a(e){return s.hasOwnProperty(e._asm.currentState)}var o=new n;o.setupStates=function(){var e=function(e,t){try{var n=this;n.emit(n._asm.currentState,function(){var r=n.response.error;if(r&&r!==e&&a(n)){throw r}t(r)})}catch(i){if(i!==e&&a(n)){r.SequentialExecutor.prototype.unhandledErrorCallback.call(this,i);t()}else{t(i)}}};this.addState("validate","build","error",e);this.addState("build","afterBuild","restart",e);this.addState("afterBuild","sign","restart",e);this.addState("sign","send","retry",e);this.addState("retry","afterRetry","afterRetry",e);this.addState("afterRetry","sign","error",e);this.addState("send","validateResponse","retry",e);this.addState("validateResponse","extractData","extractError",e);this.addState("extractError","extractData","retry",e);this.addState("extractData","success","retry",e);this.addState("restart","build","error",e);this.addState("success","complete","complete",e);this.addState("error","complete","complete",e);this.addState("complete",null,null,e)};o.setupStates();r.Request=i({constructor:function u(e,t,i){var s=e.endpoint;var a=e.config.region;if(e.isGlobalEndpoint)a="us-east-1";this.service=e;this.operation=t;this.params=i||{};this.httpRequest=new r.HttpRequest(s,a);this.startTime=r.util.date.getDate();this.response=new r.Response(this);this._asm=new n(o.states,"validate");r.SequentialExecutor.call(this);this.emit=this.emitEvent},send:function c(e){if(e){this.on("complete",function(t){e.call(t,t.error,t.data)})}this.runTo();return this.response},build:function f(e){return this.runTo("send",e)},runTo:function l(e,t){this._asm.runTo(e,t,this);return this},abort:function h(){this.removeAllListeners("validateResponse");this.removeAllListeners("extractError");this.on("validateResponse",function e(t){t.error=r.util.error(new Error("Request aborted by user"),{code:"RequestAbortedError",retryable:false})});if(this.httpRequest.stream){this.httpRequest.stream.abort();if(this.httpRequest._abortCallback){this.httpRequest._abortCallback()}else{this.removeAllListeners("send")}}return this},eachPage:function p(e){e=r.util.fn.makeAsync(e,3);function t(n){e.call(n,n.error,n.data,function(i){if(i===false)return;if(n.hasNextPage()){n.nextPage().on("complete",t).send()}else{e.call(n,null,null,r.util.fn.noop)}})}this.on("complete",t).send()},eachItem:function d(e){function t(t,n){if(t)return e(t,null);if(n===null)return e(null,null);var i=this.request.service.paginationConfig(this.request.operation);var s=i.resultKey;if(Array.isArray(s))s=s[0];var a=r.util.jamespath.query(s,n);r.util.arrayEach(a,function(t){r.util.arrayEach(t,function(t){e(null,t)})})}this.eachPage(t)},isPageable:function v(){return this.service.paginationConfig(this.operation)?true:false},createReadStream:function m(){var e=r.util.nodeRequire("stream");var n=this;var i=null;var s=false;if(r.HttpClient.streamsApiVersion===2){i=new e.Readable;i._read=function(){}}else{i=new e.Stream;i.readable=true}i.sent=false;i.on("newListener",function(e){if(!i.sent&&(e==="data"||e==="readable")){if(e==="data")s=true;i.sent=true;t.nextTick(function(){n.send(function(){})})}});this.on("httpHeaders",function a(e,t,o){if(e<300){this.httpRequest._streaming=true;n.removeListener("httpData",r.EventListeners.Core.HTTP_DATA);n.removeListener("httpError",r.EventListeners.Core.HTTP_ERROR);n.on("httpError",function c(e,t){t.error=e;t.error.retryable=false});var u=o.httpResponse.stream;if(s){u.on("data",function(e){i.emit("data",e)});u.on("end",function(){i.emit("end")})}else{u.on("readable",function(){var e;do{e=u.read();if(e!==null)i.push(e)}while(e!==null);i.read(0)});u.on("end",function(){i.push(null)})}u.on("error",function(e){i.emit("error",e)})}});this.on("error",function(e){i.emit("error",e)});return i},emitEvent:function g(e,t,n){if(typeof t==="function"){n=t;t=null}if(!n)n=this.unhandledErrorCallback;if(!t)t=this.eventParameters(e,this.response);var i=r.SequentialExecutor.prototype.emit;i.call(this,e,t,function(e){if(e)this.response.error=e;n.call(this,e)})},eventParameters:function y(e){switch(e){case"restart":case"validate":case"sign":case"build":case"afterValidate":case"afterBuild":return[this];
case"error":return[this.response.error,this.response];default:return[this.response]}},presign:function b(e,t){if(!t&&typeof e==="function"){t=e;e=null}return(new r.Signers.Presign).sign(this.toGet(),e,t)},toUnauthenticated:function w(){this.removeListener("validate",r.EventListeners.Core.VALIDATE_CREDENTIALS);this.removeListener("sign",r.EventListeners.Core.SIGN);return this.toGet()},toGet:function E(){if(this.service.api.protocol==="query"){this.removeListener("build",this.buildAsGet);this.addListener("build",this.buildAsGet)}return this},buildAsGet:function x(e){e.httpRequest.method="GET";e.httpRequest.path=e.service.endpoint.path+"?"+e.httpRequest.body;e.httpRequest.body="";delete e.httpRequest.headers["Content-Length"];delete e.httpRequest.headers["Content-Type"]}});r.util.mixin(r.Request,r.SequentialExecutor)}).call(this,e("G+mPsH"))},{"./core":22,"./state_machine":61,"G+mPsH":12}],50:[function(e,t,r){var n=e("./core");var i=n.util.inherit;n.ResourceWaiter=i({constructor:function s(e,t){this.service=e;this.state=t;if(typeof this.state==="object"){n.util.each.call(this,this.state,function(e,t){this.state=e;this.expectedValue=t})}this.loadWaiterConfig(this.state);if(!this.expectedValue){this.expectedValue=this.config.successValue}},service:null,state:null,expectedValue:null,config:null,waitDone:false,Listeners:{retry:(new n.SequentialExecutor).addNamedListeners(function(e){e("RETRY_CHECK","retry",function(e){var t=e.request._waiter;if(e.error&&e.error.code==="ResourceNotReady"){e.error.retryDelay=t.config.interval*1e3}})}),output:(new n.SequentialExecutor).addNamedListeners(function(e){e("CHECK_OUT_ERROR","extractError",function t(e){if(e.error){e.request._waiter.setError(e,true)}});e("CHECK_OUTPUT","extractData",function r(e){var t=e.request._waiter;var r=t.checkSuccess(e);if(!r){t.setError(e,r===null?false:true)}else{e.error=null}})}),error:(new n.SequentialExecutor).addNamedListeners(function(e){e("CHECK_ERROR","extractError",function t(e){var t=e.request._waiter;var r=t.checkError(e);if(!r){t.setError(e,r===null?false:true)}else{e.error=null;e.request.removeAllListeners("extractData")}});e("CHECK_ERR_OUTPUT","extractData",function r(e){e.request._waiter.setError(e,true)})})},wait:function a(e,t){if(typeof e==="function"){t=e;e=undefined}var r=this.service.makeRequest(this.config.operation,e);var n=this.Listeners[this.config.successType];r._waiter=this;r.response.maxRetries=this.config.maxAttempts;r.addListeners(this.Listeners.retry);if(n)r.addListeners(n);if(t)r.send(t);return r},setError:function o(e,t){e.data=null;e.error=n.util.error(e.error||new Error,{code:"ResourceNotReady",message:"Resource is not in the state "+this.state,retryable:t})},checkSuccess:function u(e){if(!this.config.successPath){return e.httpResponse.statusCode<300}var t=n.util.jamespath.find(this.config.successPath,e.data);if(this.config.failureValue&&this.config.failureValue.indexOf(t)>=0){return null}if(this.expectedValue){return t===this.expectedValue}else{return t?true:false}},checkError:function c(e){var t=this.config.successValue;if(typeof t==="number"){return e.httpResponse.statusCode===t}else{return e.error&&e.error.code===t}},loadWaiterConfig:function f(e,t){if(!this.service.api.waiters[e]){if(t)return;throw new n.util.error(new Error,{code:"StateNotFoundError",message:"State "+e+" not found."})}this.config=this.service.api.waiters[e];var r=this.config;(function(){r.successType=r.successType||r.acceptorType;r.successPath=r.successPath||r.acceptorPath;r.successValue=r.successValue||r.acceptorValue;r.failureType=r.failureType||r.acceptorType;r.failurePath=r.failurePath||r.acceptorPath;r.failureValue=r.failureValue||r.acceptorValue})()}})},{"./core":22}],51:[function(e,t,r){var n=e("./core");var i=n.util.inherit;n.Response=i({constructor:function s(e){this.request=e;this.data=null;this.error=null;this.retryCount=0;this.redirectCount=0;this.httpResponse=new n.HttpResponse;if(e){this.maxRetries=e.service.numRetries();this.maxRedirects=e.service.config.maxRedirects}},nextPage:function a(e){var t;var r=this.request.service;var i=this.request.operation;try{t=r.paginationConfig(i,true)}catch(s){this.error=s}if(!this.hasNextPage()){if(e)e(this.error,null);else if(this.error)throw this.error;return null}var a=n.util.copy(this.request.params);if(!this.nextPageTokens){return e?e(null,null):null}else{var o=t.inputToken;if(typeof o==="string")o=[o];for(var u=0;u<o.length;u++){a[o[u]]=this.nextPageTokens[u]}return r.makeRequest(this.request.operation,a,e)}},hasNextPage:function o(){this.cacheNextPageTokens();if(this.nextPageTokens)return true;if(this.nextPageTokens===undefined)return undefined;else return false},cacheNextPageTokens:function u(){if(this.hasOwnProperty("nextPageTokens"))return this.nextPageTokens;this.nextPageTokens=undefined;var e=this.request.service.paginationConfig(this.request.operation);if(!e)return this.nextPageTokens;this.nextPageTokens=null;if(e.moreResults){if(!n.util.jamespath.find(e.moreResults,this.data)){return this.nextPageTokens}}var t=e.outputToken;if(typeof t==="string")t=[t];n.util.arrayEach.call(this,t,function(e){var t=n.util.jamespath.find(e,this.data);if(t){this.nextPageTokens=this.nextPageTokens||[];this.nextPageTokens.push(t)}});return this.nextPageTokens}})},{"./core":22}],52:[function(e,t,r){var n=e("./core");var i=n.util.nodeRequire("domain");n.SequentialExecutor=n.util.inherit({constructor:function s(){this.domain=i&&i.active;this._events={}},listeners:function a(e){return this._events[e]?this._events[e].slice(0):[]},on:function o(e,t){if(this._events[e]){this._events[e].push(t)}else{this._events[e]=[t]}return this},onAsync:function u(e,t){t._isAsync=true;return this.on(e,t)},removeListener:function c(e,t){var r=this._events[e];if(r){var n=r.length;var i=-1;for(var s=0;s<n;++s){if(r[s]===t){i=s}}if(i>-1){r.splice(i,1)}}return this},removeAllListeners:function f(e){if(e){delete this._events[e]}else{this._events={}}return this},emit:function l(e,t,r){if(!r)r=this.unhandledErrorCallback;var n=this.listeners(e);var i=n.length;this.callListeners(n,t,r);return i>0},callListeners:function h(e,t,r){if(e.length===0){r.call(this);return}var n=this,i=e.shift();if(i._isAsync){var s=function(i){if(i){r.call(n,i)}else{n.callListeners(e,t,r)}};i.apply(n,t.concat([s]))}else{try{i.apply(n,t);n.callListeners(e,t,r)}catch(a){r.call(n,a)}}},addListeners:function p(e){var t=this;if(e._events)e=e._events;n.util.each(e,function(e,r){if(typeof r==="function")r=[r];n.util.arrayEach(r,function(r){t.on(e,r)})});return t},addNamedListener:function d(e,t,r){this[e]=r;this.addListener(t,r);return this},addNamedAsyncListener:function v(e,t,r){r._isAsync=true;return this.addNamedListener(e,t,r)},addNamedListeners:function m(e){var t=this;e(function(){t.addNamedListener.apply(t,arguments)},function(){t.addNamedAsyncListener.apply(t,arguments)});return this},unhandledErrorCallback:function g(e){if(e){if(i&&this.domain instanceof i.Domain){e.domainEmitter=this;e.domain=this.domain;e.domainThrown=false;this.domain.emit("error",e)}else{throw e}}}});n.SequentialExecutor.prototype.addListener=n.SequentialExecutor.prototype.on;t.exports=n.SequentialExecutor},{"./core":22}],53:[function(e,t,r){var n=e("./core");var i=e("./model/api");var s=e("./region_config");var a=n.util.inherit;n.Service=a({constructor:function o(e){if(!this.loadServiceClass){throw n.util.error(new Error,"Service must be constructed with `new' operator")}var t=this.loadServiceClass(e||{});if(t)return new t(e);this.initialize(e)},initialize:function u(e){this.config=new n.Config(n.config);if(e)this.config.update(e,true);this.validateService();s(this);this.config.endpoint=this.endpointFromTemplate(this.config.endpoint);this.setEndpoint(this.config.endpoint)},validateService:function c(){},loadServiceClass:function f(e){var t=e;if(!n.util.isEmpty(this.api)){return null}else if(t.apiConfig){return n.Service.defineServiceApi(this.constructor,t.apiConfig)}else if(!this.constructor.services){return null}else{t=new n.Config(n.config);t.update(e,true);var r=t.apiVersions[this.constructor.serviceIdentifier];r=r||t.apiVersion;return this.getLatestServiceClass(r)}},getLatestServiceClass:function l(e){e=this.getLatestServiceVersion(e);if(this.constructor.services[e]===null){n.Service.defineServiceApi(this.constructor,e)}return this.constructor.services[e]},getLatestServiceVersion:function h(e){if(!this.constructor.services||this.constructor.services.length===0){throw new Error("No services defined on "+this.constructor.serviceIdentifier)}if(!e){e="latest"}else if(n.util.isType(e,Date)){e=n.util.date.iso8601(e).split("T")[0]}if(Object.hasOwnProperty(this.constructor.services,e)){return e}var t=Object.keys(this.constructor.services).sort();var r=null;for(var i=t.length-1;i>=0;i--){if(t[i][t[i].length-1]!=="*"){r=t[i]}if(t[i].substr(0,10)<=e){return r}}throw new Error("Could not find "+this.constructor.serviceIdentifier+" API to satisfy version constraint `"+e+"'")},api:{},defaultRetryCount:3,makeRequest:function p(e,t,r){if(typeof t==="function"){r=t;t=null}t=t||{};if(this.config.params){var i=this.api.operations[e];if(i){t=n.util.copy(t);n.util.each(this.config.params,function(e,r){if(i.input.members[e]){if(t[e]===undefined||t[e]===null){t[e]=r}}})}}var s=new n.Request(this,e,t);this.addAllRequestListeners(s);if(r)s.send(r);return s},makeUnauthenticatedRequest:function d(e,t,r){if(typeof t==="function"){r=t;t={}}var n=this.makeRequest(e,t).toUnauthenticated();return r?n.send(r):n},waitFor:function v(e,t,r){var i=new n.ResourceWaiter(this,e);return i.wait(t,r)},addAllRequestListeners:function m(e){var t=[n.events,n.EventListeners.Core,this.serviceInterface(),n.EventListeners.CorePost];for(var r=0;r<t.length;r++){if(t[r])e.addListeners(t[r])}if(!this.config.paramValidation){e.removeListener("validate",n.EventListeners.Core.VALIDATE_PARAMETERS)}if(this.config.logger){e.addListeners(n.EventListeners.Logger)}this.setupRequestListeners(e)},setupRequestListeners:function g(){},getSignerClass:function y(){var e;if(this.config.signatureVersion){e=this.config.signatureVersion}else{e=this.api.signatureVersion}return n.Signers.RequestSigner.getVersion(e)},serviceInterface:function b(){switch(this.api.protocol){case"query":return n.EventListeners.Query;case"json":return n.EventListeners.Json;case"rest-json":return n.EventListeners.RestJson;case"rest-xml":return n.EventListeners.RestXml}if(this.api.protocol){throw new Error("Invalid service `protocol' "+this.api.protocol+" in API config")}},successfulResponse:function w(e){return e.httpResponse.statusCode<300},numRetries:function E(){if(this.config.maxRetries!==undefined){return this.config.maxRetries}else{return this.defaultRetryCount}},retryDelays:function x(){var e=this.numRetries();var t=[];for(var r=0;r<e;++r){t[r]=Math.pow(2,r)*30}return t},retryableError:function S(e){if(this.networkingError(e))return true;if(this.expiredCredentialsError(e))return true;if(this.throttledError(e))return true;if(e.statusCode>=500)return true;return false},networkingError:function R(e){return e.code==="NetworkingError"},expiredCredentialsError:function A(e){return e.code==="ExpiredTokenException"},throttledError:function C(e){return e.code==="ProvisionedThroughputExceededException"},endpointFromTemplate:function T(e){if(typeof e!=="string")return e;var t=e;t=t.replace(/\{service\}/g,this.api.endpointPrefix);t=t.replace(/\{region\}/g,this.config.region);t=t.replace(/\{scheme\}/g,this.config.sslEnabled?"https":"http");return t},setEndpoint:function q(e){this.endpoint=new n.Endpoint(e,this.config)},paginationConfig:function _(e,t){var r=this.api.operations[e].paginator;if(!r){if(t){var i=new Error;throw n.util.error(i,"No pagination configuration for "+e)}return null}return r}});n.util.update(n.Service,{defineMethods:function L(e){n.util.each(e.prototype.api.operations,function t(r){if(e.prototype[r])return;e.prototype[r]=function(e,t){return this.makeRequest(r,e,t)}})},defineService:function I(e,t,r){if(!Array.isArray(t)){r=t;t=[]}var i=a(n.Service,r||{});if(typeof e==="string"){n.Service.addVersions(i,t);var s=i.serviceIdentifier||e;i.serviceIdentifier=s}else{i.prototype.api=e;n.Service.defineMethods(i)}return i},addVersions:function P(e,t){if(!Array.isArray(t))t=[t];e.services=e.services||{};for(var r=0;r<t.length;r++){if(e.services[t[r]]===undefined){e.services[t[r]]=null}}e.apiVersions=Object.keys(e.services).sort()},defineServiceApi:function j(e,t,r){var s=a(e,{serviceIdentifier:e.serviceIdentifier});function o(e){if(e.isApi){s.prototype.api=e}else{s.prototype.api=new i(e)}}if(typeof t==="string"){if(r){o(r)}else{try{var u=n.util.nodeRequire("aws-sdk-apis");o(u.load(e.serviceIdentifier,t))}catch(c){throw n.util.error(c,{message:"Could not find API configuration "+e.serviceIdentifier+"-"+t})}}if(!e.services.hasOwnProperty(t)){e.apiVersions=e.apiVersions.concat(t).sort()}e.services[t]=s}else{o(t)}n.Service.defineMethods(s);return s}})},{"./core":22,"./model/api":34,"./region_config":47}],54:[function(e,t,r){var n=e("../core");var i=n.util.inherit;var s="presigned-expires";function a(e){var t=e.httpRequest.headers[s];delete e.httpRequest.headers["User-Agent"];delete e.httpRequest.headers["X-Amz-User-Agent"];if(e.service.getSignerClass()===n.Signers.V4){if(t>604800){var r="Presigning does not support expiry time greater "+"than a week with SigV4 signing.";throw n.util.error(new Error,{code:"InvalidExpiryTime",message:r,retryable:false})}e.httpRequest.headers[s]=t}else if(e.service.getSignerClass()===n.Signers.S3){e.httpRequest.headers[s]=parseInt(n.util.date.unixTimestamp()+t,10).toString()}else{throw n.util.error(new Error,{message:"Presigning only supports S3 or SigV4 signing.",code:"UnsupportedSigner",retryable:false})}}function o(e){var t=e.httpRequest.endpoint;var r=n.util.urlParse(e.httpRequest.path);var i={};if(r.search){i=n.util.queryStringParse(r.search.substr(1))}n.util.each(e.httpRequest.headers,function(e,t){if(e===s)e="Expires";i[e]=t});delete e.httpRequest.headers[s];var a=i["Authorization"].split(" ");if(a[0]==="AWS"){a=a[1].split(":");i["AWSAccessKeyId"]=a[0];i["Signature"]=a[1]}else if(a[0]==="AWS4-HMAC-SHA256"){a.shift();var o=a.join(" ");var u=o.match(/Signature=(.*?)(?:,|\s|\r?\n|$)/)[1];i["X-Amz-Signature"]=u;delete i["Expires"]}delete i["Authorization"];delete i["Host"];t.pathname=r.pathname;t.search=n.util.queryParamsToString(i)}n.Signers.Presign=i({sign:function u(e,t,r){e.httpRequest.headers[s]=t||3600;e.on("build",a);e.on("sign",o);e.removeListener("afterBuild",n.EventListeners.Core.SET_CONTENT_LENGTH);e.emit("beforePresign",[e]);if(r){e.build(function(){if(this.response.error)r(this.response.error);else{r(null,n.util.urlFormat(e.httpRequest.endpoint))}})}else{e.build();return n.util.urlFormat(e.httpRequest.endpoint)}}});t.exports=n.Signers.Presign},{"../core":22}],55:[function(e,t,r){var n=e("../core");var i=n.util.inherit;n.Signers.RequestSigner=i({constructor:function s(e){this.request=e}});n.Signers.RequestSigner.getVersion=function a(e){switch(e){case"v2":return n.Signers.V2;case"v3":return n.Signers.V3;case"v4":return n.Signers.V4;case"s3":return n.Signers.S3;case"v3https":return n.Signers.V3Https}throw new Error("Unknown signing version "+e)};e("./v2");e("./v3");e("./v3https");e("./v4");e("./s3");e("./presign")},{"../core":22,"./presign":54,"./s3":56,"./v2":57,"./v3":58,"./v3https":59,"./v4":60}],56:[function(e,t,r){var n=e("../core");var i=n.util.inherit;n.Signers.S3=i(n.Signers.RequestSigner,{subResources:{acl:1,cors:1,lifecycle:1,"delete":1,location:1,logging:1,notification:1,partNumber:1,policy:1,requestPayment:1,restore:1,tagging:1,torrent:1,uploadId:1,uploads:1,versionId:1,versioning:1,versions:1,website:1},responseHeaders:{"response-content-type":1,"response-content-language":1,"response-expires":1,"response-cache-control":1,"response-content-disposition":1,"response-content-encoding":1},addAuthorization:function s(e,t){if(!this.request.headers["presigned-expires"]){this.request.headers["X-Amz-Date"]=n.util.date.rfc822(t)}if(e.sessionToken){this.request.headers["x-amz-security-token"]=e.sessionToken}var r=this.sign(e.secretAccessKey,this.stringToSign());var i="AWS "+e.accessKeyId+":"+r;this.request.headers["Authorization"]=i},stringToSign:function a(){var e=this.request;var t=[];t.push(e.method);t.push(e.headers["Content-MD5"]||"");t.push(e.headers["Content-Type"]||"");t.push(e.headers["presigned-expires"]||"");var r=this.canonicalizedAmzHeaders();if(r)t.push(r);t.push(this.canonicalizedResource());return t.join("\n")},canonicalizedAmzHeaders:function o(){var e=[];n.util.each(this.request.headers,function(t){if(t.match(/^x-amz-/i))e.push(t)});e.sort(function(e,t){return e.toLowerCase()<t.toLowerCase()?-1:1});var t=[];n.util.arrayEach.call(this,e,function(e){t.push(e.toLowerCase()+":"+String(this.request.headers[e]))});return t.join("\n")},canonicalizedResource:function u(){var e=this.request;var t=e.path.split("?");var r=t[0];var i=t[1];var s="";if(e.virtualHostedBucket)s+="/"+e.virtualHostedBucket;s+=r;if(i){var a=[];n.util.arrayEach.call(this,i.split("&"),function(e){var t=e.split("=")[0];var r=e.split("=")[1];if(this.subResources[t]||this.responseHeaders[t]){var n={name:t};if(r!==undefined){if(this.subResources[t]){n.value=r}else{n.value=decodeURIComponent(r)}}a.push(n)}});a.sort(function(e,t){return e.name<t.name?-1:1});if(a.length){i=[];n.util.arrayEach(a,function(e){if(e.value===undefined)i.push(e.name);else i.push(e.name+"="+e.value)});s+="?"+i.join("&")}}return s},sign:function c(e,t){return n.util.crypto.hmac(e,t,"base64","sha1")}});t.exports=n.Signers.S3},{"../core":22}],57:[function(e,t,r){var n=e("../core");var i=n.util.inherit;n.Signers.V2=i(n.Signers.RequestSigner,{addAuthorization:function s(e,t){if(!t)t=n.util.date.getDate();var r=this.request;r.params.Timestamp=n.util.date.iso8601(t);r.params.SignatureVersion="2";r.params.SignatureMethod="HmacSHA256";r.params.AWSAccessKeyId=e.accessKeyId;if(e.sessionToken){r.params.SecurityToken=e.sessionToken}delete r.params.Signature;r.params.Signature=this.signature(e);r.body=n.util.queryParamsToString(r.params);r.headers["Content-Length"]=r.body.length},signature:function a(e){return n.util.crypto.hmac(e.secretAccessKey,this.stringToSign(),"base64")},stringToSign:function o(){var e=[];e.push(this.request.method);e.push(this.request.endpoint.host.toLowerCase());e.push(this.request.pathname());e.push(n.util.queryParamsToString(this.request.params));return e.join("\n")}});t.exports=n.Signers.V2},{"../core":22}],58:[function(e,t,r){var n=e("../core");var i=n.util.inherit;n.Signers.V3=i(n.Signers.RequestSigner,{addAuthorization:function s(e,t){var r=n.util.date.rfc822(t);this.request.headers["X-Amz-Date"]=r;if(e.sessionToken){this.request.headers["x-amz-security-token"]=e.sessionToken}this.request.headers["X-Amzn-Authorization"]=this.authorization(e,r)},authorization:function a(e){return"AWS3 "+"AWSAccessKeyId="+e.accessKeyId+","+"Algorithm=HmacSHA256,"+"SignedHeaders="+this.signedHeaders()+","+"Signature="+this.signature(e)},signedHeaders:function o(){var e=[];n.util.arrayEach(this.headersToSign(),function t(r){e.push(r.toLowerCase())});return e.sort().join(";")},canonicalHeaders:function u(){var e=this.request.headers;var t=[];n.util.arrayEach(this.headersToSign(),function r(n){t.push(n.toLowerCase().trim()+":"+String(e[n]).trim())});return t.sort().join("\n")+"\n"},headersToSign:function c(){var e=[];n.util.each(this.request.headers,function t(r){if(r==="Host"||r==="Content-Encoding"||r.match(/^X-Amz/i)){e.push(r)}});return e},signature:function f(e){return n.util.crypto.hmac(e.secretAccessKey,this.stringToSign(),"base64")},stringToSign:function l(){var e=[];e.push(this.request.method);e.push("/");e.push("");e.push(this.canonicalHeaders());e.push(this.request.body);return n.util.crypto.sha256(e.join("\n"))}});t.exports=n.Signers.V3},{"../core":22}],59:[function(e,t,r){var n=e("../core");var i=n.util.inherit;e("./v3");n.Signers.V3Https=i(n.Signers.V3,{authorization:function s(e){return"AWS3-HTTPS "+"AWSAccessKeyId="+e.accessKeyId+","+"Algorithm=HmacSHA256,"+"Signature="+this.signature(e)},stringToSign:function a(){return this.request.headers["X-Amz-Date"]}});t.exports=n.Signers.V3Https},{"../core":22,"./v3":58}],60:[function(e,t,r){var n=e("../core");var i=n.util.inherit;var s={};var a="presigned-expires";n.Signers.V4=i(n.Signers.RequestSigner,{constructor:function o(e,t){n.Signers.RequestSigner.call(this,e);this.serviceName=t},algorithm:"AWS4-HMAC-SHA256",addAuthorization:function u(e,t){var r=n.util.date.iso8601(t).replace(/[:\-]|\.\d{3}/g,"");if(this.isPresigned()){this.updateForPresigned(e,r)}else{this.addHeaders(e,r);this.updateBody(e)}this.request.headers["Authorization"]=this.authorization(e,r)},addHeaders:function c(e,t){this.request.headers["X-Amz-Date"]=t;if(e.sessionToken){this.request.headers["x-amz-security-token"]=e.sessionToken}},updateBody:function f(e){if(this.request.params){this.request.params.AWSAccessKeyId=e.accessKeyId;if(e.sessionToken){this.request.params.SecurityToken=e.sessionToken}this.request.body=n.util.queryParamsToString(this.request.params);this.request.headers["Content-Length"]=this.request.body.length}},updateForPresigned:function l(e,t){var r=this.credentialString(t);var i={"X-Amz-Date":t,"X-Amz-Algorithm":this.algorithm,"X-Amz-Credential":e.accessKeyId+"/"+r,"X-Amz-Expires":this.request.headers[a],"X-Amz-SignedHeaders":this.signedHeaders()};if(e.sessionToken){i["X-Amz-Security-Token"]=e.sessionToken}if(this.request.headers["Content-Type"]){i["Content-Type"]=this.request.headers["Content-Type"]}n.util.each.call(this,this.request.headers,function(e,t){if(e===a)return;if(this.isSignableHeader(e)&&e.toLowerCase().indexOf("x-amz-")===0){i[e]=t}});var s=this.request.path.indexOf("?")>=0?"&":"?";this.request.path+=s+n.util.queryParamsToString(i)},authorization:function h(e,t){var r=[];var n=this.credentialString(t);r.push(this.algorithm+" Credential="+e.accessKeyId+"/"+n);r.push("SignedHeaders="+this.signedHeaders());r.push("Signature="+this.signature(e,t));return r.join(", ")},signature:function p(e,t){var r=s[this.serviceName];var i=t.substr(0,8);if(!r||r.akid!==e.accessKeyId||r.region!==this.request.region||r.date!==i){var a=e.secretAccessKey;var o=n.util.crypto.hmac("AWS4"+a,i,"buffer");var u=n.util.crypto.hmac(o,this.request.region,"buffer");var c=n.util.crypto.hmac(u,this.serviceName,"buffer");var f=n.util.crypto.hmac(c,"aws4_request","buffer");s[this.serviceName]={region:this.request.region,date:i,key:f,akid:e.accessKeyId}}var l=s[this.serviceName].key;return n.util.crypto.hmac(l,this.stringToSign(t),"hex")},stringToSign:function d(e){var t=[];t.push("AWS4-HMAC-SHA256");t.push(e);t.push(this.credentialString(e));t.push(this.hexEncodedHash(this.canonicalString()));return t.join("\n")},canonicalString:function v(){var e=[],t=this.request.pathname();if(this.serviceName!=="s3")t=n.util.uriEscapePath(t);e.push(this.request.method);e.push(t);e.push(this.request.search());e.push(this.canonicalHeaders()+"\n");e.push(this.signedHeaders());e.push(this.hexEncodedBodyHash());return e.join("\n")},canonicalHeaders:function m(){var e=[];n.util.each.call(this,this.request.headers,function(t,r){e.push([t,r])});e.sort(function(e,t){return e[0].toLowerCase()<t[0].toLowerCase()?-1:1});var t=[];n.util.arrayEach.call(this,e,function(e){var r=e[0].toLowerCase();if(this.isSignableHeader(r)){t.push(r+":"+this.canonicalHeaderValues(e[1].toString()))}});return t.join("\n")},canonicalHeaderValues:function g(e){return e.replace(/\s+/g," ").replace(/^\s+|\s+$/g,"")},signedHeaders:function y(){var e=[];n.util.each.call(this,this.request.headers,function(t){t=t.toLowerCase();if(this.isSignableHeader(t))e.push(t)});return e.sort().join(";")},credentialString:function b(e){var t=[];t.push(e.substr(0,8));t.push(this.request.region);t.push(this.serviceName);t.push("aws4_request");return t.join("/")},hexEncodedHash:function w(e){return n.util.crypto.sha256(e,"hex")},hexEncodedBodyHash:function E(){if(this.isPresigned()&&this.serviceName==="s3"){return"UNSIGNED-PAYLOAD"}else if(this.request.headers["X-Amz-Content-Sha256"]){return this.request.headers["X-Amz-Content-Sha256"]}else{return this.hexEncodedHash(this.request.body||"")}},unsignableHeaders:["authorization","content-type","content-length","user-agent",a],isSignableHeader:function x(e){if(e.toLowerCase().indexOf("x-amz-")===0)return true;return this.unsignableHeaders.indexOf(e)<0},isPresigned:function S(){return this.request.headers[a]?true:false}});t.exports=n.Signers.V4},{"../core":22}],61:[function(e,t,r){function n(e,t){this.currentState=t||null;this.states=e||{}}n.prototype.runTo=function i(e,t,r,n){if(typeof e==="function"){n=r;r=t;t=e;e=null}var i=this;var s=i.states[i.currentState];s.fn.call(r||i,n,function(n){if(n){if(s.fail)i.currentState=s.fail;else return t?t.call(r,n):null}else{if(s.accept)i.currentState=s.accept;else return t?t.call(r):null}if(i.currentState===e){return t?t.call(r,n):null}i.runTo(e,t,r,n)})};n.prototype.addState=function s(e,t,r,n){if(typeof t==="function"){n=t;t=null;r=null}else if(typeof r==="function"){n=r;r=null}if(!this.currentState)this.currentState=e;this.states[e]={accept:t,fail:r,fn:n};return this};t.exports=n},{}],62:[function(e,t,r){(function(r){var n=e("crypto");var i=e("buffer").Buffer;var s={engine:function a(){if(s.isBrowser()&&typeof navigator!=="undefined"){return navigator.userAgent}else{return r.platform+"/"+r.version}},userAgent:function o(){var t=s.isBrowser()?"js":"nodejs";var r="aws-sdk-"+t+"/"+e("./core").VERSION;if(t==="nodejs")r+=" "+s.engine();return r},isBrowser:function u(){return r&&r.browser},isNode:function c(){return!s.isBrowser()},nodeRequire:function f(t){if(s.isNode())return e(t)},multiRequire:function l(t,r){return e(s.isNode()?t:r)},uriEscape:function h(e){var t=encodeURIComponent(e);t=t.replace(/[^A-Za-z0-9_.~\-%]+/g,escape);t=t.replace(/[*]/g,function(e){return"%"+e.charCodeAt(0).toString(16).toUpperCase()});return t},uriEscapePath:function p(e){var t=[];s.arrayEach(e.split("/"),function(e){t.push(s.uriEscape(e))});return t.join("/")},urlParse:function d(t){return e("url").parse(t)},urlFormat:function v(t){return e("url").format(t)},queryStringParse:function m(t){return e("querystring").parse(t)},queryParamsToString:function g(e){var t=[];var r=s.uriEscape;var n=Object.keys(e).sort();s.arrayEach(n,function(n){var i=e[n];var a=r(n);var o=a+"=";if(Array.isArray(i)){var u=[];s.arrayEach(i,function(e){u.push(r(e))});o=a+"="+u.sort().join("&"+a+"=")}else if(i!==undefined&&i!==null){o=a+"="+r(i)}t.push(o)});return t.join("&")},readFileSync:function y(e){if(typeof window!=="undefined")return null;return s.nodeRequire("fs").readFileSync(e,"utf-8")},base64:{encode:function b(e){return new i(e).toString("base64")},decode:function w(e){return new i(e,"base64")}},Buffer:i,buffer:{concat:function(e){var t=0,r=0,n=null,s;for(s=0;s<e.length;s++){t+=e[s].length}n=new i(t);for(s=0;s<e.length;s++){e[s].copy(n,r);r+=e[s].length}return n}},string:{byteLength:function E(e){if(e===null||e===undefined)return 0;if(typeof e==="string")e=new i(e);if(typeof e.byteLength==="number"){return e.byteLength}else if(typeof e.length==="number"){return e.length}else if(typeof e.size==="number"){return e.size}else if(typeof e.path==="string"){return s.nodeRequire("fs").lstatSync(e.path).size}else{throw s.error(new Error("Cannot determine length of "+e),{object:e})}},upperFirst:function x(e){return e[0].toUpperCase()+e.substr(1)},lowerFirst:function S(e){return e[0].toLowerCase()+e.substr(1)}},ini:{parse:function R(e){var t,r={};s.arrayEach(e.split(/\r?\n/),function(e){e=e.split(/(^|\s);/)[0];var n=e.match(/^\s*\[([^\[\]]+)\]\s*$/);if(n){t=n[1]}else if(t){var i=e.match(/^\s*(.+?)\s*=\s*(.+)\s*$/);if(i){r[t]=r[t]||{};r[t][i[1]]=i[2]}}});return r}},fn:{noop:function(){},makeAsync:function A(e,t){if(t&&t<=e.length){return e}return function(){var t=Array.prototype.slice.call(arguments,0);var r=t.pop();var n=e.apply(null,t);r(n)}}},jamespath:{query:function C(e,t){if(!t)return[];var r=[];var n=e.split(/\s+or\s+/);s.arrayEach.call(this,n,function(e){var n=[t];var i=e.split(".");s.arrayEach.call(this,i,function(e){var t=e.match("^(.+?)(?:\\[(-?\\d+|\\*|)\\])?$");var r=[];s.arrayEach.call(this,n,function(e){if(t[1]==="*"){s.arrayEach.call(this,e,function(e){r.push(e)})}else if(e.hasOwnProperty(t[1])){r.push(e[t[1]])}});n=r;if(t[2]!==undefined){r=[];s.arrayEach.call(this,n,function(e){if(Array.isArray(e)){if(t[2]==="*"||t[2]===""){r=r.concat(e)}else{var n=parseInt(t[2],10);if(n<0)n=e.length+n;r.push(e[n])}}});n=r}if(n.length===0)return s.abort});if(n.length>0){r=n;return s.abort}});return r},find:function T(e,t){return s.jamespath.query(e,t)[0]}},date:{getDate:function q(){return new Date},iso8601:function _(e){if(e===undefined){e=s.date.getDate()}return e.toISOString()},rfc822:function L(e){if(e===undefined){e=s.date.getDate()}return e.toUTCString()},unixTimestamp:function I(e){if(e===undefined){e=s.date.getDate()}return e.getTime()/1e3},from:function P(e){if(typeof e==="number"){return new Date(e*1e3)}else{return new Date(e)}},format:function j(e,t){if(!t)t="iso8601";return s.date[t](s.date.from(e))},parseTimestamp:function k(e){if(typeof e==="number"){return new Date(e*1e3)}else if(e.match(/^\d+$/)){return new Date(e*1e3)}else if(e.match(/^\d{4}/)){return new Date(e)}else if(e.match(/^\w{3},/)){return new Date(e)}else{throw s.error(new Error("unhandled timestamp format: "+e),{code:"TimestampParserError"})}}},crypto:{crc32Table:[0,1996959894,3993919788,2567524794,124634137,1886057615,3915621685,2657392035,249268274,2044508324,3772115230,2547177864,162941995,2125561021,3887607047,2428444049,498536548,1789927666,4089016648,2227061214,450548861,1843258603,4107580753,2211677639,325883990,1684777152,4251122042,2321926636,335633487,1661365465,4195302755,2366115317,997073096,1281953886,3579855332,2724688242,1006888145,1258607687,3524101629,2768942443,901097722,1119000684,3686517206,2898065728,853044451,1172266101,3705015759,2882616665,651767980,1373503546,3369554304,3218104598,565507253,1454621731,3485111705,3099436303,671266974,1594198024,3322730930,2970347812,795835527,1483230225,3244367275,3060149565,1994146192,31158534,2563907772,4023717930,1907459465,112637215,2680153253,3904427059,2013776290,251722036,2517215374,3775830040,2137656763,141376813,2439277719,3865271297,1802195444,476864866,2238001368,4066508878,1812370925,453092731,2181625025,4111451223,1706088902,314042704,2344532202,4240017532,1658658271,366619977,2362670323,4224994405,1303535960,984961486,2747007092,3569037538,1256170817,1037604311,2765210733,3554079995,1131014506,879679996,2909243462,3663771856,1141124467,855842277,2852801631,3708648649,1342533948,654459306,3188396048,3373015174,1466479909,544179635,3110523913,3462522015,1591671054,702138776,2966460450,3352799412,1504918807,783551873,3082640443,3233442989,3988292384,2596254646,62317068,1957810842,3939845945,2647816111,81470997,1943803523,3814918930,2489596804,225274430,2053790376,3826175755,2466906013,167816743,2097651377,4027552580,2265490386,503444072,1762050814,4150417245,2154129355,426522225,1852507879,4275313526,2312317920,282753626,1742555852,4189708143,2394877945,397917763,1622183637,3604390888,2714866558,953729732,1340076626,3518719985,2797360999,1068828381,1219638859,3624741850,2936675148,906185462,1090812512,3747672003,2825379669,829329135,1181335161,3412177804,3160834842,628085408,1382605366,3423369109,3138078467,570562233,1426400815,3317316542,2998733608,733239954,1555261956,3268935591,3050360625,752459403,1541320221,2607071920,3965973030,1969922972,40735498,2617837225,3943577151,1913087877,83908371,2512341634,3803740692,2075208622,213261112,2463272603,3855990285,2094854071,198958881,2262029012,4057260610,1759359992,534414190,2176718541,4139329115,1873836001,414664567,2282248934,4279200368,1711684554,285281116,2405801727,4167216745,1634467795,376229701,2685067896,3608007406,1308918612,956543938,2808555105,3495958263,1231636301,1047427035,2932959818,3654703836,1088359270,936918e3,2847714899,3736837829,1202900863,817233897,3183342108,3401237130,1404277552,615818150,3134207493,3453421203,1423857449,601450431,3009837614,3294710456,1567103746,711928724,3020668471,3272380065,1510334235,755167117],crc32:function O(e){var t=s.crypto.crc32Table;
var r=0^-1;if(typeof e==="string"){e=new i(e)}for(var n=0;n<e.length;n++){var a=e.readUInt8(n);r=r>>>8^t[(r^a)&255]}return(r^-1)>>>0},hmac:function N(e,t,r,s){if(!r)r="binary";if(r==="buffer"){r=undefined}if(!s)s="sha256";if(typeof t==="string")t=new i(t);return n.createHmac(s,e).update(t).digest(r)},md5:function D(e,t){if(!t){t="binary"}if(t==="buffer"){t=undefined}if(typeof e==="string")e=new i(e);return s.crypto.createHash("md5").update(e).digest(t)},sha256:function B(e,t){if(!t){t="binary"}if(t==="buffer"){t=undefined}if(typeof e==="string")e=new i(e);return s.crypto.createHash("sha256").update(e).digest(t)},toHex:function U(e){var t=[];for(var r=0;r<e.length;r++){t.push(("0"+e.charCodeAt(r).toString(16)).substr(-2,2))}return t.join("")},createHash:function H(e){return n.createHash(e)}},abort:{},each:function M(e,t){for(var r in e){if(e.hasOwnProperty(r)){var n=t.call(this,r,e[r]);if(n===s.abort)break}}},arrayEach:function z(e,t){for(var r in e){if(e.hasOwnProperty(r)){var n=t.call(this,e[r],parseInt(r,10));if(n===s.abort)break}}},update:function V(e,t){s.each(t,function r(t,n){e[t]=n});return e},merge:function F(e,t){return s.update(s.copy(e),t)},copy:function X(e){if(e===null||e===undefined)return e;var t={};for(var r in e){t[r]=e[r]}return t},isEmpty:function W(e){for(var t in e){if(e.hasOwnProperty(t)){return false}}return true},isType:function K(e,t){if(typeof t==="function")t=s.typeName(t);return Object.prototype.toString.call(e)==="[object "+t+"]"},typeName:function G(e){if(e.hasOwnProperty("name"))return e.name;var t=e.toString();var r=t.match(/^\s*function (.+)\(/);return r?r[1]:t},error:function J(e,t){var r=null;if(typeof e.message==="string"&&e.message!==""){if(typeof t==="string"||t&&t.message){r=s.copy(e);r.message=e.message}}e.message=e.message||null;if(typeof t==="string"){e.message=t}else{s.update(e,t)}if(typeof Object.defineProperty==="function"){Object.defineProperty(e,"name",{writable:true,enumerable:false});Object.defineProperty(e,"message",{enumerable:true})}e.name=e.name||e.code||"Error";e.time=new Date;if(r)e.originalError=r;return e},inherit:function $(e,t){var r=null;if(t===undefined){t=e;e=Object;r={}}else{var n=function i(){};n.prototype=e.prototype;r=new n}if(t.constructor===Object){t.constructor=function(){if(e!==Object){return e.apply(this,arguments)}}}t.constructor.prototype=r;s.update(t.constructor.prototype,t);t.constructor.__super__=e;return t.constructor},mixin:function Y(){var e=arguments[0];for(var t=1;t<arguments.length;t++){for(var r in arguments[t].prototype){var n=arguments[t].prototype[r];if(r!=="constructor"){e.prototype[r]=n}}}return e},hideProperties:function Z(e,t){if(typeof Object.defineProperty!=="function")return;s.arrayEach(t,function(t){Object.defineProperty(e,t,{enumerable:false,writable:true,configurable:true})})},property:function Q(e,t,r,n,i){var s={configurable:true,enumerable:n!==undefined?n:true};if(typeof r==="function"&&!i){s.get=r}else{s.value=r;s.writable=true}Object.defineProperty(e,t,s)},memoizedProperty:function et(e,t,r,n){var i=null;s.property(e,t,function(){if(i===null){i=r()}return i},n)}};t.exports=s}).call(this,e("G+mPsH"))},{"./core":22,"G+mPsH":12,buffer:1,crypto:5,querystring:16,url:17}],63:[function(e,t,r){var n=e("../util");var i=e("../model/shape");function s(){}s.prototype.parse=function(e,t){if(e.replace(/^\s+/,"")==="")return{};var r,i;try{if(window.DOMParser){var s=new DOMParser;r=s.parseFromString(e,"text/xml");if(r.documentElement===null){throw new Error("Cannot parse empty document.")}var o=r.getElementsByTagName("parsererror")[0];if(o&&(o.parentNode===r||o.parentNode.nodeName==="body")){throw new Error(o.getElementsByTagName("div")[0].textContent)}}else if(window.ActiveXObject){r=new window.ActiveXObject("Microsoft.XMLDOM");r.async=false;if(!r.loadXML(e)){throw new Error("Parse error in document")}}else{throw new Error("Cannot load XML parser")}}catch(u){i=u}if(r&&r.documentElement&&!i){var c=a(r.documentElement,t);var f=r.getElementsByTagName("ResponseMetadata")[0];if(f){c.ResponseMetadata=a(f,{})}return c}else if(i){throw n.error(i||new Error,{code:"XMLParserError"})}else{return{}}};function a(e,t){if(!t)t={};switch(t.type){case"structure":return o(e,t);case"map":return u(e,t);case"list":return c(e,t);case undefined:case null:return l(e);default:return f(e,t)}}function o(e,t){var r={};if(e===null)return r;n.each(t.members,function(t,n){if(n.isXmlAttribute){if(e.attributes.hasOwnProperty(n.name)){var i=e.attributes[n.name].value;r[t]=a({textContent:i},n)}}else{var s=n.flattened?e:e.getElementsByTagName(n.name)[0];if(s){r[t]=a(s,n)}else if(!n.flattened&&n.type==="list"){r[t]=n.defaultValue}}});return r}function u(e,t){var r={};var n=t.key.name||"key";var i=t.value.name||"value";var s=t.flattened?t.name:"entry";var o=e.firstElementChild;while(o){if(o.nodeName===s){var u=o.getElementsByTagName(n)[0].textContent;var c=o.getElementsByTagName(i)[0];r[u]=a(c,t.value)}o=o.nextElementSibling}return r}function c(e,t){var r=[];var n=t.flattened?t.name:t.member.name||"member";var i=e.firstElementChild;while(i){if(i.nodeName===n){r.push(a(i,t.member))}i=i.nextElementSibling}return r}function f(e,t){if(e.getAttribute){var r=e.getAttribute("encoding");if(r==="base64"){t=new i.create({type:r})}}var n=e.textContent;if(n==="")n=null;if(typeof t.toType==="function"){return t.toType(n)}else{return n}}function l(e){if(e===undefined||e===null)return"";if(!e.firstElementChild){if(e.parentNode.parentNode===null)return{};if(e.childNodes.length===0)return"";else return e.textContent}var t={type:"structure",members:{}};var r=e.firstElementChild;while(r){var n=r.nodeName;if(t.members.hasOwnProperty(n)){t.members[n].type="list"}else{t.members[n]={name:n}}r=r.nextElementSibling}return o(e,t)}t.exports=s},{"../model/shape":39,"../util":62}],64:[function(e,t,r){var n=e("../util");var i=e("xmlbuilder");function s(){}s.prototype.toXML=function(e,t,r){var n=i.create(r);l(n,t);a(n,e,t);return n.children.length===0?"":n.root().toString()};function a(e,t,r){switch(r.type){case"structure":return o(e,t,r);case"map":return u(e,t,r);case"list":return c(e,t,r);default:return f(e,t,r)}}function o(e,t,r){n.arrayEach(r.memberNames,function(n){var i=r.members[n];if(i.location!=="body")return;var s=t[n];var o=i.name;if(s!==undefined&&s!==null){if(i.isXmlAttribute){e.att(o,s)}else if(i.flattened){a(e,s,i)}else{var u=e.ele(o);l(u,i);a(u,s,i)}}})}function u(e,t,r){var i=r.key.name||"key";var s=r.value.name||"value";n.each(t,function(t,n){var o=e.ele(r.flattened?r.name:"entry");a(o.ele(i),t,r.key);a(o.ele(s),n,r.value)})}function c(e,t,r){if(r.flattened){n.arrayEach(t,function(t){var n=r.member.name||r.name;var i=e.ele(n);a(i,t,r.member)})}else{n.arrayEach(t,function(t){var n=r.member.name||"member";var i=e.ele(n);a(i,t,r.member)})}}function f(e,t,r){e.txt(r.toWireFormat(t))}function l(e,t){var r,n="xmlns";if(t.xmlNamespaceUri){r=t.xmlNamespaceUri;if(t.xmlNamespacePrefix)n+=":"+t.xmlNamespacePrefix}else if(e.isRoot&&t.api.xmlNamespaceUri){r=t.api.xmlNamespaceUri}if(r)e.att(n,r)}t.exports=s},{"../util":62,xmlbuilder:67}],65:[function(e,t,r){(function(){var r,n;n=e("./XMLFragment");r=function(){function e(e,t,r){var i,s,a;this.children=[];this.rootObject=null;if(this.is(e,"Object")){a=[e,t],t=a[0],r=a[1];e=null}if(e!=null){e=""+e||"";if(t==null){t={version:"1.0"}}}if(t!=null&&!(t.version!=null)){throw new Error("Version number is required")}if(t!=null){t.version=""+t.version||"";if(!t.version.match(/1\.[0-9]+/)){throw new Error("Invalid version number: "+t.version)}i={version:t.version};if(t.encoding!=null){t.encoding=""+t.encoding||"";if(!t.encoding.match(/[A-Za-z](?:[A-Za-z0-9._-]|-)*/)){throw new Error("Invalid encoding: "+t.encoding)}i.encoding=t.encoding}if(t.standalone!=null){i.standalone=t.standalone?"yes":"no"}s=new n(this,"?xml",i);this.children.push(s)}if(r!=null){i={};if(e!=null){i.name=e}if(r.ext!=null){r.ext=""+r.ext||"";i.ext=r.ext}s=new n(this,"!DOCTYPE",i);this.children.push(s)}if(e!=null){this.begin(e)}}e.prototype.begin=function(t,r,i){var s,a;if(!(t!=null)){throw new Error("Root element needs a name")}if(this.rootObject){this.children=[];this.rootObject=null}if(r!=null){s=new e(t,r,i);return s.root()}t=""+t||"";a=new n(this,t,{});a.isRoot=true;a.documentObject=this;this.children.push(a);this.rootObject=a;return a};e.prototype.root=function(){return this.rootObject};e.prototype.end=function(e){return toString(e)};e.prototype.toString=function(e){var t,r,n,i,s;r="";s=this.children;for(n=0,i=s.length;n<i;n++){t=s[n];r+=t.toString(e)}return r};e.prototype.is=function(e,t){var r;r=Object.prototype.toString.call(e).slice(8,-1);return e!=null&&r===t};return e}();t.exports=r}).call(this)},{"./XMLFragment":66}],66:[function(e,t,r){(function(){var e,r={}.hasOwnProperty;e=function(){function e(e,t,r,n){this.isRoot=false;this.documentObject=null;this.parent=e;this.name=t;this.attributes=r;this.value=n;this.children=[]}e.prototype.element=function(t,n,i){var s,a,o,u,c;if(!(t!=null)){throw new Error("Missing element name")}t=""+t||"";this.assertLegalChar(t);if(n==null){n={}}if(this.is(n,"String")&&this.is(i,"Object")){u=[i,n],n=u[0],i=u[1]}else if(this.is(n,"String")){c=[{},n],n=c[0],i=c[1]}for(a in n){if(!r.call(n,a))continue;o=n[a];o=""+o||"";n[a]=this.escape(o)}s=new e(this,t,n);if(i!=null){i=""+i||"";i=this.escape(i);this.assertLegalChar(i);s.raw(i)}this.children.push(s);return s};e.prototype.insertBefore=function(t,n,i){var s,a,o,u,c,f;if(this.isRoot){throw new Error("Cannot insert elements at root level")}if(!(t!=null)){throw new Error("Missing element name")}t=""+t||"";this.assertLegalChar(t);if(n==null){n={}}if(this.is(n,"String")&&this.is(i,"Object")){c=[i,n],n=c[0],i=c[1]}else if(this.is(n,"String")){f=[{},n],n=f[0],i=f[1]}for(o in n){if(!r.call(n,o))continue;u=n[o];u=""+u||"";n[o]=this.escape(u)}s=new e(this.parent,t,n);if(i!=null){i=""+i||"";i=this.escape(i);this.assertLegalChar(i);s.raw(i)}a=this.parent.children.indexOf(this);this.parent.children.splice(a,0,s);return s};e.prototype.insertAfter=function(t,n,i){var s,a,o,u,c,f;if(this.isRoot){throw new Error("Cannot insert elements at root level")}if(!(t!=null)){throw new Error("Missing element name")}t=""+t||"";this.assertLegalChar(t);if(n==null){n={}}if(this.is(n,"String")&&this.is(i,"Object")){c=[i,n],n=c[0],i=c[1]}else if(this.is(n,"String")){f=[{},n],n=f[0],i=f[1]}for(o in n){if(!r.call(n,o))continue;u=n[o];u=""+u||"";n[o]=this.escape(u)}s=new e(this.parent,t,n);if(i!=null){i=""+i||"";i=this.escape(i);this.assertLegalChar(i);s.raw(i)}a=this.parent.children.indexOf(this);this.parent.children.splice(a+1,0,s);return s};e.prototype.remove=function(){var e,t;if(this.isRoot){throw new Error("Cannot remove the root element")}e=this.parent.children.indexOf(this);[].splice.apply(this.parent.children,[e,e-e+1].concat(t=[])),t;return this.parent};e.prototype.text=function(t){var r;if(!(t!=null)){throw new Error("Missing element text")}t=""+t||"";t=this.escape(t);this.assertLegalChar(t);r=new e(this,"",{},t);this.children.push(r);return this};e.prototype.cdata=function(t){var r;if(!(t!=null)){throw new Error("Missing CDATA text")}t=""+t||"";this.assertLegalChar(t);if(t.match(/]]>/)){throw new Error("Invalid CDATA text: "+t)}r=new e(this,"",{},"<![CDATA["+t+"]]>");this.children.push(r);return this};e.prototype.comment=function(t){var r;if(!(t!=null)){throw new Error("Missing comment text")}t=""+t||"";t=this.escape(t);this.assertLegalChar(t);if(t.match(/--/)){throw new Error("Comment text cannot contain double-hypen: "+t)}r=new e(this,"",{},"<!-- "+t+" -->");this.children.push(r);return this};e.prototype.raw=function(t){var r;if(!(t!=null)){throw new Error("Missing raw text")}t=""+t||"";r=new e(this,"",{},t);this.children.push(r);return this};e.prototype.up=function(){if(this.isRoot){throw new Error("This node has no parent. Use doc() if you need to get the document object.")}return this.parent};e.prototype.root=function(){var e;if(this.isRoot){return this}e=this.parent;while(!e.isRoot){e=e.parent}return e};e.prototype.document=function(){return this.root().documentObject};e.prototype.end=function(e){return this.document().toString(e)};e.prototype.prev=function(){var e;if(this.isRoot){throw new Error("Root node has no siblings")}e=this.parent.children.indexOf(this);if(e<1){throw new Error("Already at the first node")}return this.parent.children[e-1]};e.prototype.next=function(){var e;if(this.isRoot){throw new Error("Root node has no siblings")}e=this.parent.children.indexOf(this);if(e===-1||e===this.parent.children.length-1){throw new Error("Already at the last node")}return this.parent.children[e+1]};e.prototype.clone=function(t){var r;r=new e(this.parent,this.name,this.attributes,this.value);if(t){this.children.forEach(function(e){var n;n=e.clone(t);n.parent=r;return r.children.push(n)})}return r};e.prototype.importXMLBuilder=function(e){var t;t=e.root().clone(true);t.parent=this;this.children.push(t);t.isRoot=false;return this};e.prototype.attribute=function(e,t){var r;if(!(e!=null)){throw new Error("Missing attribute name")}if(!(t!=null)){throw new Error("Missing attribute value")}e=""+e||"";t=""+t||"";if((r=this.attributes)==null){this.attributes={}}this.attributes[e]=this.escape(t);return this};e.prototype.removeAttribute=function(e){if(!(e!=null)){throw new Error("Missing attribute name")}e=""+e||"";delete this.attributes[e];return this};e.prototype.toString=function(e,t){var r,n,i,s,a,o,u,c,f,l,h,p;o=e!=null&&e.pretty||false;s=e!=null&&e.indent||"  ";a=e!=null&&e.newline||"\n";t||(t=0);c=new Array(t+1).join(s);u="";if(o){u+=c}if(!(this.value!=null)){u+="<"+this.name}else{u+=""+this.value}h=this.attributes;for(r in h){n=h[r];if(this.name==="!DOCTYPE"){u+=" "+n}else{u+=" "+r+'="'+n+'"'}}if(this.children.length===0){if(!(this.value!=null)){u+=this.name==="?xml"?"?>":this.name==="!DOCTYPE"?">":"/>"}if(o){u+=a}}else if(o&&this.children.length===1&&this.children[0].value){u+=">";u+=this.children[0].value;u+="</"+this.name+">";u+=a}else{u+=">";if(o){u+=a}p=this.children;for(f=0,l=p.length;f<l;f++){i=p[f];u+=i.toString(e,t+1)}if(o){u+=c}u+="</"+this.name+">";if(o){u+=a}}return u};e.prototype.escape=function(e){return e.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/'/g,"&apos;").replace(/"/g,"&quot;")};e.prototype.assertLegalChar=function(e){var t,r;t=/[\u0000-\u0008\u000B-\u000C\u000E-\u001F\uD800-\uDFFF\uFFFE-\uFFFF]/;r=e.match(t);if(r){throw new Error("Invalid character ("+r+") in string: "+e)}};e.prototype.is=function(e,t){var r;r=Object.prototype.toString.call(e).slice(8,-1);return e!=null&&r===t};e.prototype.ele=function(e,t,r){return this.element(e,t,r)};e.prototype.txt=function(e){return this.text(e)};e.prototype.dat=function(e){return this.cdata(e)};e.prototype.att=function(e,t){return this.attribute(e,t)};e.prototype.com=function(e){return this.comment(e)};e.prototype.doc=function(){return this.document()};e.prototype.e=function(e,t,r){return this.element(e,t,r)};e.prototype.t=function(e){return this.text(e)};e.prototype.d=function(e){return this.cdata(e)};e.prototype.a=function(e,t){return this.attribute(e,t)};e.prototype.c=function(e){return this.comment(e)};e.prototype.r=function(e){return this.raw(e)};e.prototype.u=function(){return this.up()};return e}();t.exports=e}).call(this)},{}],67:[function(e,t,r){(function(){var r;r=e("./XMLBuilder");t.exports.create=function(e,t,n){if(e!=null){return new r(e,t,n).root()}else{return new r}}}).call(this)},{"./XMLBuilder":65}]},{},[20]);;AltAWS.CloudWatch=AltAWS.Service.defineService("cloudwatch");
AltAWS.Service.defineServiceApi(AltAWS.CloudWatch, "2010-08-01", {"metadata":{"apiVersion":"2010-08-01","endpointPrefix":"monitoring","serviceAbbreviation":"CloudWatch","serviceFullName":"Amazon CloudWatch","signatureVersion":"v4","xmlNamespace":"http://monitoring.amazonaws.com/doc/2010-08-01/","protocol":"query"},"operations":{"DeleteAlarms":{"input":{"type":"structure","required":["AlarmNames"],"members":{"AlarmNames":{"shape":"S2"}}}},"DescribeAlarmHistory":{"input":{"type":"structure","members":{"AlarmName":{},"HistoryItemType":{},"StartDate":{"type":"timestamp"},"EndDate":{"type":"timestamp"},"MaxRecords":{"type":"integer"},"NextToken":{}}},"output":{"resultWrapper":"DescribeAlarmHistoryResult","type":"structure","members":{"AlarmHistoryItems":{"type":"list","member":{"type":"structure","members":{"AlarmName":{},"Timestamp":{"type":"timestamp"},"HistoryItemType":{},"HistorySummary":{},"HistoryData":{}}}},"NextToken":{}}}},"DescribeAlarms":{"input":{"type":"structure","members":{"AlarmNames":{"shape":"S2"},"AlarmNamePrefix":{},"StateValue":{},"ActionPrefix":{},"MaxRecords":{"type":"integer"},"NextToken":{}}},"output":{"resultWrapper":"DescribeAlarmsResult","type":"structure","members":{"MetricAlarms":{"shape":"Sj"},"NextToken":{}}}},"DescribeAlarmsForMetric":{"input":{"type":"structure","required":["MetricName","Namespace"],"members":{"MetricName":{},"Namespace":{},"Statistic":{},"Dimensions":{"shape":"Sv"},"Period":{"type":"integer"},"Unit":{}}},"output":{"resultWrapper":"DescribeAlarmsForMetricResult","type":"structure","members":{"MetricAlarms":{"shape":"Sj"}}}},"DisableAlarmActions":{"input":{"type":"structure","required":["AlarmNames"],"members":{"AlarmNames":{"shape":"S2"}}}},"EnableAlarmActions":{"input":{"type":"structure","required":["AlarmNames"],"members":{"AlarmNames":{"shape":"S2"}}}},"GetMetricStatistics":{"input":{"type":"structure","required":["Namespace","MetricName","StartTime","EndTime","Period","Statistics"],"members":{"Namespace":{},"MetricName":{},"Dimensions":{"shape":"Sv"},"StartTime":{"type":"timestamp"},"EndTime":{"type":"timestamp"},"Period":{"type":"integer"},"Statistics":{"type":"list","member":{}},"Unit":{}}},"output":{"resultWrapper":"GetMetricStatisticsResult","type":"structure","members":{"Label":{},"Datapoints":{"type":"list","member":{"type":"structure","members":{"Timestamp":{"type":"timestamp"},"SampleCount":{"type":"double"},"Average":{"type":"double"},"Sum":{"type":"double"},"Minimum":{"type":"double"},"Maximum":{"type":"double"},"Unit":{}},"xmlOrder":["Timestamp","SampleCount","Average","Sum","Minimum","Maximum","Unit"]}}}}},"ListMetrics":{"input":{"type":"structure","members":{"Namespace":{},"MetricName":{},"Dimensions":{"type":"list","member":{"type":"structure","required":["Name"],"members":{"Name":{},"Value":{}}}},"NextToken":{}}},"output":{"xmlOrder":["Metrics","NextToken"],"resultWrapper":"ListMetricsResult","type":"structure","members":{"Metrics":{"type":"list","member":{"type":"structure","members":{"Namespace":{},"MetricName":{},"Dimensions":{"shape":"Sv"}},"xmlOrder":["Namespace","MetricName","Dimensions"]}},"NextToken":{}}}},"PutMetricAlarm":{"input":{"type":"structure","required":["AlarmName","MetricName","Namespace","Statistic","Period","EvaluationPeriods","Threshold","ComparisonOperator"],"members":{"AlarmName":{},"AlarmDescription":{},"ActionsEnabled":{"type":"boolean"},"OKActions":{"shape":"So"},"AlarmActions":{"shape":"So"},"InsufficientDataActions":{"shape":"So"},"MetricName":{},"Namespace":{},"Statistic":{},"Dimensions":{"shape":"Sv"},"Period":{"type":"integer"},"Unit":{},"EvaluationPeriods":{"type":"integer"},"Threshold":{"type":"double"},"ComparisonOperator":{}}}},"PutMetricData":{"input":{"type":"structure","required":["Namespace","MetricData"],"members":{"Namespace":{},"MetricData":{"type":"list","member":{"type":"structure","required":["MetricName"],"members":{"MetricName":{},"Dimensions":{"shape":"Sv"},"Timestamp":{"type":"timestamp"},"Value":{"type":"double"},"StatisticValues":{"type":"structure","required":["SampleCount","Sum","Minimum","Maximum"],"members":{"SampleCount":{"type":"double"},"Sum":{"type":"double"},"Minimum":{"type":"double"},"Maximum":{"type":"double"}}},"Unit":{}}}}}}},"SetAlarmState":{"input":{"type":"structure","required":["AlarmName","StateValue","StateReason"],"members":{"AlarmName":{},"StateValue":{},"StateReason":{},"StateReasonData":{}}}}},"shapes":{"S2":{"type":"list","member":{}},"Sj":{"type":"list","member":{"type":"structure","members":{"AlarmName":{},"AlarmArn":{},"AlarmDescription":{},"AlarmConfigurationUpdatedTimestamp":{"type":"timestamp"},"ActionsEnabled":{"type":"boolean"},"OKActions":{"shape":"So"},"AlarmActions":{"shape":"So"},"InsufficientDataActions":{"shape":"So"},"StateValue":{},"StateReason":{},"StateReasonData":{},"StateUpdatedTimestamp":{"type":"timestamp"},"MetricName":{},"Namespace":{},"Statistic":{},"Dimensions":{"shape":"Sv"},"Period":{"type":"integer"},"Unit":{},"EvaluationPeriods":{"type":"integer"},"Threshold":{"type":"double"},"ComparisonOperator":{}},"xmlOrder":["AlarmName","AlarmArn","AlarmDescription","AlarmConfigurationUpdatedTimestamp","ActionsEnabled","OKActions","AlarmActions","InsufficientDataActions","StateValue","StateReason","StateReasonData","StateUpdatedTimestamp","MetricName","Namespace","Statistic","Dimensions","Period","Unit","EvaluationPeriods","Threshold","ComparisonOperator"]}},"So":{"type":"list","member":{}},"Sv":{"type":"list","member":{"type":"structure","required":["Name","Value"],"members":{"Name":{},"Value":{}},"xmlOrder":["Name","Value"]}}},"paginators":{"DescribeAlarmHistory":{"input_token":"NextToken","output_token":"NextToken","limit_key":"MaxRecords","result_key":"AlarmHistoryItems"},"DescribeAlarms":{"input_token":"NextToken","output_token":"NextToken","limit_key":"MaxRecords","result_key":"MetricAlarms"},"DescribeAlarmsForMetric":{"result_key":"MetricAlarms"},"ListMetrics":{"input_token":"NextToken","output_token":"NextToken","result_key":"Metrics"}}});
AltAWS.CognitoIdentity=AltAWS.Service.defineService("cognitoidentity");AltAWS.util.update(AltAWS.CognitoIdentity.prototype,{getOpenIdToken:function e(t,n){return this.makeUnauthenticatedRequest("getOpenIdToken",t,n)},getId:function t(e,n){return this.makeUnauthenticatedRequest("getId",e,n)}});
AltAWS.Service.defineServiceApi(AltAWS.CognitoIdentity, "2014-06-30", {"metadata":{"apiVersion":"2014-06-30","endpointPrefix":"cognito-identity","jsonVersion":"1.1","serviceFullName":"Amazon Cognito Identity","signatureVersion":"v4","targetPrefix":"AWSCognitoIdentityService","protocol":"json"},"operations":{"CreateIdentityPool":{"input":{"type":"structure","required":["IdentityPoolName","AllowUnauthenticatedIdentities"],"members":{"IdentityPoolName":{},"AllowUnauthenticatedIdentities":{"type":"boolean"},"SupportedLoginProviders":{"shape":"S4"}}},"output":{"shape":"S7"}},"DeleteIdentityPool":{"input":{"type":"structure","required":["IdentityPoolId"],"members":{"IdentityPoolId":{}}}},"DescribeIdentityPool":{"input":{"type":"structure","required":["IdentityPoolId"],"members":{"IdentityPoolId":{}}},"output":{"shape":"S7"}},"GetId":{"input":{"type":"structure","required":["AccountId","IdentityPoolId"],"members":{"AccountId":{},"IdentityPoolId":{},"Logins":{"shape":"Sd"}}},"output":{"type":"structure","members":{"IdentityId":{}}}},"GetOpenIdToken":{"input":{"type":"structure","required":["IdentityId"],"members":{"IdentityId":{},"Logins":{"shape":"Sd"}}},"output":{"type":"structure","members":{"IdentityId":{},"Token":{}}}},"ListIdentities":{"input":{"type":"structure","required":["IdentityPoolId","MaxResults"],"members":{"IdentityPoolId":{},"MaxResults":{"type":"integer"},"NextToken":{}}},"output":{"type":"structure","members":{"IdentityPoolId":{},"Identities":{"type":"list","member":{"type":"structure","members":{"IdentityId":{},"Logins":{"shape":"Sq"}}}},"NextToken":{}}}},"ListIdentityPools":{"input":{"type":"structure","required":["MaxResults"],"members":{"MaxResults":{"type":"integer"},"NextToken":{}}},"output":{"type":"structure","members":{"IdentityPools":{"type":"list","member":{"type":"structure","members":{"IdentityPoolId":{},"IdentityPoolName":{}}}},"NextToken":{}}}},"UnlinkIdentity":{"input":{"type":"structure","required":["IdentityId","Logins","LoginsToRemove"],"members":{"IdentityId":{},"Logins":{"shape":"Sd"},"LoginsToRemove":{"shape":"Sq"}}}},"UpdateIdentityPool":{"input":{"shape":"S7"},"output":{"shape":"S7"}}},"shapes":{"S4":{"type":"map","key":{},"value":{}},"S7":{"type":"structure","required":["IdentityPoolId","IdentityPoolName","AllowUnauthenticatedIdentities"],"members":{"IdentityPoolId":{},"IdentityPoolName":{},"AllowUnauthenticatedIdentities":{"type":"boolean"},"SupportedLoginProviders":{"shape":"S4"}}},"Sd":{"type":"map","key":{},"value":{}},"Sq":{"type":"list","member":{}}}});
AltAWS.CognitoSync=AltAWS.Service.defineService("cognitosync");
AltAWS.Service.defineServiceApi(AltAWS.CognitoSync, "2014-06-30", {"metadata":{"apiVersion":"2014-06-30","endpointPrefix":"cognito-sync","jsonVersion":"1.1","serviceFullName":"Amazon Cognito Sync","signatureVersion":"v4","protocol":"rest-json"},"operations":{"DeleteDataset":{"http":{"method":"DELETE","requestUri":"/identitypools/{IdentityPoolId}/identities/{IdentityId}/datasets/{DatasetName}","responseCode":200},"input":{"type":"structure","required":["IdentityPoolId","IdentityId","DatasetName"],"members":{"IdentityPoolId":{"location":"uri","locationName":"IdentityPoolId"},"IdentityId":{"location":"uri","locationName":"IdentityId"},"DatasetName":{"location":"uri","locationName":"DatasetName"}}},"output":{"type":"structure","members":{"Dataset":{"shape":"S6"}}}},"DescribeDataset":{"http":{"method":"GET","requestUri":"/identitypools/{IdentityPoolId}/identities/{IdentityId}/datasets/{DatasetName}","responseCode":200},"input":{"type":"structure","required":["IdentityPoolId","IdentityId","DatasetName"],"members":{"IdentityPoolId":{"location":"uri","locationName":"IdentityPoolId"},"IdentityId":{"location":"uri","locationName":"IdentityId"},"DatasetName":{"location":"uri","locationName":"DatasetName"}}},"output":{"type":"structure","members":{"Dataset":{"shape":"S6"}}}},"DescribeIdentityPoolUsage":{"http":{"method":"GET","requestUri":"/identitypools/{IdentityPoolId}","responseCode":200},"input":{"type":"structure","required":["IdentityPoolId"],"members":{"IdentityPoolId":{"location":"uri","locationName":"IdentityPoolId"}}},"output":{"type":"structure","members":{"IdentityPoolUsage":{"shape":"Se"}}}},"DescribeIdentityUsage":{"http":{"method":"GET","requestUri":"/identitypools/{IdentityPoolId}/identities/{IdentityId}","responseCode":200},"input":{"type":"structure","required":["IdentityPoolId","IdentityId"],"members":{"IdentityPoolId":{"location":"uri","locationName":"IdentityPoolId"},"IdentityId":{"location":"uri","locationName":"IdentityId"}}},"output":{"type":"structure","members":{"IdentityUsage":{"type":"structure","members":{"IdentityId":{},"IdentityPoolId":{},"LastModifiedDate":{"type":"timestamp"},"DatasetCount":{"type":"integer"},"DataStorage":{"type":"long"}}}}}},"ListDatasets":{"http":{"method":"GET","requestUri":"/identitypools/{IdentityPoolId}/identities/{IdentityId}/datasets","responseCode":200},"input":{"type":"structure","required":["IdentityId","IdentityPoolId"],"members":{"IdentityPoolId":{"location":"uri","locationName":"IdentityPoolId"},"IdentityId":{"location":"uri","locationName":"IdentityId"},"NextToken":{"location":"querystring","locationName":"nextToken"},"MaxResults":{"location":"querystring","locationName":"maxResults","type":"integer"}}},"output":{"type":"structure","members":{"Datasets":{"type":"list","member":{"shape":"S6"}},"Count":{"type":"integer"},"NextToken":{}}}},"ListIdentityPoolUsage":{"http":{"method":"GET","requestUri":"/identitypools","responseCode":200},"input":{"type":"structure","members":{"NextToken":{"location":"querystring","locationName":"nextToken"},"MaxResults":{"location":"querystring","locationName":"maxResults","type":"integer"}}},"output":{"type":"structure","members":{"IdentityPoolUsages":{"type":"list","member":{"shape":"Se"}},"MaxResults":{"type":"integer"},"Count":{"type":"integer"},"NextToken":{}}}},"ListRecords":{"http":{"method":"GET","requestUri":"/identitypools/{IdentityPoolId}/identities/{IdentityId}/datasets/{DatasetName}/records","responseCode":200},"input":{"type":"structure","required":["IdentityPoolId","IdentityId","DatasetName"],"members":{"IdentityPoolId":{"location":"uri","locationName":"IdentityPoolId"},"IdentityId":{"location":"uri","locationName":"IdentityId"},"DatasetName":{"location":"uri","locationName":"DatasetName"},"LastSyncCount":{"location":"querystring","locationName":"lastSyncCount","type":"long"},"NextToken":{"location":"querystring","locationName":"nextToken"},"MaxResults":{"location":"querystring","locationName":"maxResults","type":"integer"},"SyncSessionToken":{"location":"querystring","locationName":"syncSessionToken"}}},"output":{"type":"structure","members":{"Records":{"shape":"St"},"NextToken":{},"Count":{"type":"integer"},"DatasetSyncCount":{"type":"long"},"LastModifiedBy":{},"MergedDatasetNames":{"type":"list","member":{}},"DatasetExists":{"type":"boolean"},"DatasetDeletedAfterRequestedSyncCount":{"type":"boolean"},"SyncSessionToken":{}}}},"UpdateRecords":{"http":{"requestUri":"/identitypools/{IdentityPoolId}/identities/{IdentityId}/datasets/{DatasetName}","responseCode":200},"input":{"type":"structure","required":["IdentityPoolId","IdentityId","DatasetName","SyncSessionToken"],"members":{"IdentityPoolId":{"location":"uri","locationName":"IdentityPoolId"},"IdentityId":{"location":"uri","locationName":"IdentityId"},"DatasetName":{"location":"uri","locationName":"DatasetName"},"RecordPatches":{"type":"list","member":{"type":"structure","required":["Op","Key","SyncCount"],"members":{"Op":{},"Key":{},"Value":{},"SyncCount":{"type":"long"},"DeviceLastModifiedDate":{"type":"timestamp"}}}},"SyncSessionToken":{},"ClientContext":{"location":"header","locationName":"x-amz-Client-Context"}}},"output":{"type":"structure","members":{"Records":{"shape":"St"}}}}},"shapes":{"S6":{"type":"structure","members":{"IdentityId":{},"DatasetName":{},"CreationDate":{"type":"timestamp"},"LastModifiedDate":{"type":"timestamp"},"LastModifiedBy":{},"DataStorage":{"type":"long"},"NumRecords":{"type":"long"}}},"Se":{"type":"structure","members":{"IdentityPoolId":{},"SyncSessionsCount":{"type":"long"},"DataStorage":{"type":"long"},"LastModifiedDate":{"type":"timestamp"}}},"St":{"type":"list","member":{"type":"structure","members":{"Key":{},"Value":{},"SyncCount":{"type":"long"},"LastModifiedDate":{"type":"timestamp"},"LastModifiedBy":{},"DeviceLastModifiedDate":{"type":"timestamp"}}}}}});
AltAWS.DynamoDB=AltAWS.Service.defineService("dynamodb");AltAWS.util.update(AltAWS.DynamoDB.prototype,{setupRequestListeners:function e(r){if(r.service.config.dynamoDbCrc32){r.addListener("extractData",this.checkCrc32)}},checkCrc32:function r(e){if(!e.request.service.crc32IsValid(e)){e.error=AltAWS.util.error(new Error,{code:"CRC32CheckFailed",message:"CRC32 integrity check failed",retryable:true})}},crc32IsValid:function t(e){var r=e.httpResponse.headers["x-amz-crc32"];if(!r)return true;return parseInt(r,10)===AltAWS.util.crypto.crc32(e.httpResponse.body)},defaultRetryCount:10,retryDelays:function c(){var e=this.numRetries();var r=[];for(var t=0;t<e;++t){if(t===0){r.push(0)}else{r.push(50*Math.pow(2,t-1))}}return r}});
AltAWS.Service.defineServiceApi(AltAWS.DynamoDB, "2012-08-10", {"metadata":{"apiVersion":"2012-08-10","endpointPrefix":"dynamodb","jsonVersion":"1.0","serviceAbbreviation":"DynamoDB","serviceFullName":"Amazon DynamoDB","signatureVersion":"v4","targetPrefix":"DynamoDB_20120810","protocol":"json"},"operations":{"BatchGetItem":{"input":{"type":"structure","required":["RequestItems"],"members":{"RequestItems":{"shape":"S2"},"ReturnConsumedCapacity":{}}},"output":{"type":"structure","members":{"Responses":{"type":"map","key":{},"value":{"shape":"Sk"}},"UnprocessedKeys":{"shape":"S2"},"ConsumedCapacity":{"shape":"Sm"}}}},"BatchWriteItem":{"input":{"type":"structure","required":["RequestItems"],"members":{"RequestItems":{"shape":"St"},"ReturnConsumedCapacity":{},"ReturnItemCollectionMetrics":{}}},"output":{"type":"structure","members":{"UnprocessedItems":{"shape":"St"},"ItemCollectionMetrics":{"type":"map","key":{},"value":{"type":"list","member":{"shape":"S13"}}},"ConsumedCapacity":{"shape":"Sm"}}}},"CreateTable":{"input":{"type":"structure","required":["AttributeDefinitions","TableName","KeySchema","ProvisionedThroughput"],"members":{"AttributeDefinitions":{"shape":"S18"},"TableName":{},"KeySchema":{"shape":"S1c"},"LocalSecondaryIndexes":{"type":"list","member":{"type":"structure","required":["IndexName","KeySchema","Projection"],"members":{"IndexName":{},"KeySchema":{"shape":"S1c"},"Projection":{"shape":"S1h"}}}},"GlobalSecondaryIndexes":{"type":"list","member":{"type":"structure","required":["IndexName","KeySchema","Projection","ProvisionedThroughput"],"members":{"IndexName":{},"KeySchema":{"shape":"S1c"},"Projection":{"shape":"S1h"},"ProvisionedThroughput":{"shape":"S1n"}}}},"ProvisionedThroughput":{"shape":"S1n"}}},"output":{"type":"structure","members":{"TableDescription":{"shape":"S1q"}}}},"DeleteItem":{"input":{"type":"structure","required":["TableName","Key"],"members":{"TableName":{},"Key":{"shape":"S6"},"Expected":{"shape":"S21"},"ConditionalOperator":{},"ReturnValues":{},"ReturnConsumedCapacity":{},"ReturnItemCollectionMetrics":{}}},"output":{"type":"structure","members":{"Attributes":{"shape":"Sl"},"ConsumedCapacity":{"shape":"Sn"},"ItemCollectionMetrics":{"shape":"S13"}}}},"DeleteTable":{"input":{"type":"structure","required":["TableName"],"members":{"TableName":{}}},"output":{"type":"structure","members":{"TableDescription":{"shape":"S1q"}}}},"DescribeTable":{"input":{"type":"structure","required":["TableName"],"members":{"TableName":{}}},"output":{"type":"structure","members":{"Table":{"shape":"S1q"}}}},"GetItem":{"input":{"type":"structure","required":["TableName","Key"],"members":{"TableName":{},"Key":{"shape":"S6"},"AttributesToGet":{"shape":"Sf"},"ConsistentRead":{"type":"boolean"},"ReturnConsumedCapacity":{}}},"output":{"type":"structure","members":{"Item":{"shape":"Sl"},"ConsumedCapacity":{"shape":"Sn"}}}},"ListTables":{"input":{"type":"structure","members":{"ExclusiveStartTableName":{},"Limit":{"type":"integer"}}},"output":{"type":"structure","members":{"TableNames":{"type":"list","member":{}},"LastEvaluatedTableName":{}}}},"PutItem":{"input":{"type":"structure","required":["TableName","Item"],"members":{"TableName":{},"Item":{"shape":"Sx"},"Expected":{"shape":"S21"},"ReturnValues":{},"ReturnConsumedCapacity":{},"ReturnItemCollectionMetrics":{},"ConditionalOperator":{}}},"output":{"type":"structure","members":{"Attributes":{"shape":"Sl"},"ConsumedCapacity":{"shape":"Sn"},"ItemCollectionMetrics":{"shape":"S13"}}}},"Query":{"input":{"type":"structure","required":["TableName","KeyConditions"],"members":{"TableName":{},"IndexName":{},"Select":{},"AttributesToGet":{"shape":"Sf"},"Limit":{"type":"integer"},"ConsistentRead":{"type":"boolean"},"KeyConditions":{"type":"map","key":{},"value":{"shape":"S2p"}},"QueryFilter":{"shape":"S2q"},"ConditionalOperator":{},"ScanIndexForward":{"type":"boolean"},"ExclusiveStartKey":{"shape":"S6"},"ReturnConsumedCapacity":{}}},"output":{"type":"structure","members":{"Items":{"shape":"Sk"},"Count":{"type":"integer"},"ScannedCount":{"type":"integer"},"LastEvaluatedKey":{"shape":"S6"},"ConsumedCapacity":{"shape":"Sn"}}}},"Scan":{"input":{"type":"structure","required":["TableName"],"members":{"TableName":{},"AttributesToGet":{"shape":"Sf"},"Limit":{"type":"integer"},"Select":{},"ScanFilter":{"shape":"S2q"},"ConditionalOperator":{},"ExclusiveStartKey":{"shape":"S6"},"ReturnConsumedCapacity":{},"TotalSegments":{"type":"integer"},"Segment":{"type":"integer"}}},"output":{"type":"structure","members":{"Items":{"shape":"Sk"},"Count":{"type":"integer"},"ScannedCount":{"type":"integer"},"LastEvaluatedKey":{"shape":"S6"},"ConsumedCapacity":{"shape":"Sn"}}}},"UpdateItem":{"input":{"type":"structure","required":["TableName","Key"],"members":{"TableName":{},"Key":{"shape":"S6"},"AttributeUpdates":{"type":"map","key":{},"value":{"type":"structure","members":{"Value":{"shape":"S8"},"Action":{}}}},"Expected":{"shape":"S21"},"ConditionalOperator":{},"ReturnValues":{},"ReturnConsumedCapacity":{},"ReturnItemCollectionMetrics":{}}},"output":{"type":"structure","members":{"Attributes":{"shape":"Sl"},"ConsumedCapacity":{"shape":"Sn"},"ItemCollectionMetrics":{"shape":"S13"}}}},"UpdateTable":{"input":{"type":"structure","required":["TableName"],"members":{"TableName":{},"ProvisionedThroughput":{"shape":"S1n"},"GlobalSecondaryIndexUpdates":{"type":"list","member":{"type":"structure","members":{"Update":{"type":"structure","required":["IndexName","ProvisionedThroughput"],"members":{"IndexName":{},"ProvisionedThroughput":{"shape":"S1n"}}}}}}}},"output":{"type":"structure","members":{"TableDescription":{"shape":"S1q"}}}}},"shapes":{"S2":{"type":"map","key":{},"value":{"type":"structure","required":["Keys"],"members":{"Keys":{"type":"list","member":{"shape":"S6"}},"AttributesToGet":{"shape":"Sf"},"ConsistentRead":{"type":"boolean"}}}},"S6":{"type":"map","key":{},"value":{"shape":"S8"}},"S8":{"type":"structure","members":{"S":{},"N":{},"B":{"type":"blob"},"SS":{"type":"list","member":{}},"NS":{"type":"list","member":{}},"BS":{"type":"list","member":{"type":"blob"}}}},"Sf":{"type":"list","member":{}},"Sk":{"type":"list","member":{"shape":"Sl"}},"Sl":{"type":"map","key":{},"value":{"shape":"S8"}},"Sm":{"type":"list","member":{"shape":"Sn"}},"Sn":{"type":"structure","members":{"TableName":{},"CapacityUnits":{"type":"double"},"Table":{"shape":"Sp"},"LocalSecondaryIndexes":{"shape":"Sq"},"GlobalSecondaryIndexes":{"shape":"Sq"}}},"Sp":{"type":"structure","members":{"CapacityUnits":{"type":"double"}}},"Sq":{"type":"map","key":{},"value":{"shape":"Sp"}},"St":{"type":"map","key":{},"value":{"type":"list","member":{"type":"structure","members":{"PutRequest":{"type":"structure","required":["Item"],"members":{"Item":{"shape":"Sx"}}},"DeleteRequest":{"type":"structure","required":["Key"],"members":{"Key":{"shape":"S6"}}}}}}},"Sx":{"type":"map","key":{},"value":{"shape":"S8"}},"S13":{"type":"structure","members":{"ItemCollectionKey":{"type":"map","key":{},"value":{"shape":"S8"}},"SizeEstimateRangeGB":{"type":"list","member":{"type":"double"}}}},"S18":{"type":"list","member":{"type":"structure","required":["AttributeName","AttributeType"],"members":{"AttributeName":{},"AttributeType":{}}}},"S1c":{"type":"list","member":{"type":"structure","required":["AttributeName","KeyType"],"members":{"AttributeName":{},"KeyType":{}}}},"S1h":{"type":"structure","members":{"ProjectionType":{},"NonKeyAttributes":{"type":"list","member":{}}}},"S1n":{"type":"structure","required":["ReadCapacityUnits","WriteCapacityUnits"],"members":{"ReadCapacityUnits":{"type":"long"},"WriteCapacityUnits":{"type":"long"}}},"S1q":{"type":"structure","members":{"AttributeDefinitions":{"shape":"S18"},"TableName":{},"KeySchema":{"shape":"S1c"},"TableStatus":{},"CreationDateTime":{"type":"timestamp"},"ProvisionedThroughput":{"shape":"S1t"},"TableSizeBytes":{"type":"long"},"ItemCount":{"type":"long"},"LocalSecondaryIndexes":{"type":"list","member":{"type":"structure","members":{"IndexName":{},"KeySchema":{"shape":"S1c"},"Projection":{"shape":"S1h"},"IndexSizeBytes":{"type":"long"},"ItemCount":{"type":"long"}}}},"GlobalSecondaryIndexes":{"type":"list","member":{"type":"structure","members":{"IndexName":{},"KeySchema":{"shape":"S1c"},"Projection":{"shape":"S1h"},"IndexStatus":{},"ProvisionedThroughput":{"shape":"S1t"},"IndexSizeBytes":{"type":"long"},"ItemCount":{"type":"long"}}}}}},"S1t":{"type":"structure","members":{"LastIncreaseDateTime":{"type":"timestamp"},"LastDecreaseDateTime":{"type":"timestamp"},"NumberOfDecreasesToday":{"type":"long"},"ReadCapacityUnits":{"type":"long"},"WriteCapacityUnits":{"type":"long"}}},"S21":{"type":"map","key":{},"value":{"type":"structure","members":{"Value":{"shape":"S8"},"Exists":{"type":"boolean"},"ComparisonOperator":{},"AttributeValueList":{"shape":"S25"}}}},"S25":{"type":"list","member":{"shape":"S8"}},"S2p":{"type":"structure","required":["ComparisonOperator"],"members":{"AttributeValueList":{"shape":"S25"},"ComparisonOperator":{}}},"S2q":{"type":"map","key":{},"value":{"shape":"S2p"}}},"paginators":{"BatchGetItem":{"input_token":"RequestItems","output_token":"UnprocessedKeys","result_key":"Responses[]"},"ListTables":{"input_token":"ExclusiveStartTableName","output_token":"LastEvaluatedTableName","limit_key":"Limit","result_key":"TableNames"},"Query":{"input_token":"ExclusiveStartKey","output_token":"LastEvaluatedKey","limit_key":"Limit","result_key":"Items"},"Scan":{"input_token":"ExclusiveStartKey","output_token":"LastEvaluatedKey","limit_key":"Limit","result_key":"Items"}},"waiters":{"__default__":{"interval":20,"max_attempts":25},"__TableState":{"operation":"DescribeTable"},"TableExists":{"extends":"__TableState","ignore_errors":["ResourceNotFoundException"],"success_type":"output","success_path":"Table.TableStatus","success_value":"ACTIVE"},"TableNotExists":{"extends":"__TableState","success_type":"error","success_value":"ResourceNotFoundException"}}});
AltAWS.Kinesis=AltAWS.Service.defineService("kinesis");
AltAWS.Service.defineServiceApi(AltAWS.Kinesis, "2013-12-02", {"metadata":{"apiVersion":"2013-12-02","endpointPrefix":"kinesis","jsonVersion":"1.1","serviceAbbreviation":"Kinesis","serviceFullName":"Amazon Kinesis","signatureVersion":"v4","targetPrefix":"Kinesis_20131202","protocol":"json"},"operations":{"CreateStream":{"input":{"type":"structure","required":["StreamName","ShardCount"],"members":{"StreamName":{},"ShardCount":{"type":"integer"}}}},"DeleteStream":{"input":{"type":"structure","required":["StreamName"],"members":{"StreamName":{}}}},"DescribeStream":{"input":{"type":"structure","required":["StreamName"],"members":{"StreamName":{},"Limit":{"type":"integer"},"ExclusiveStartShardId":{}}},"output":{"type":"structure","required":["StreamDescription"],"members":{"StreamDescription":{"type":"structure","required":["StreamName","StreamARN","StreamStatus","Shards","HasMoreShards"],"members":{"StreamName":{},"StreamARN":{},"StreamStatus":{},"Shards":{"type":"list","member":{"type":"structure","required":["ShardId","HashKeyRange","SequenceNumberRange"],"members":{"ShardId":{},"ParentShardId":{},"AdjacentParentShardId":{},"HashKeyRange":{"type":"structure","required":["StartingHashKey","EndingHashKey"],"members":{"StartingHashKey":{},"EndingHashKey":{}}},"SequenceNumberRange":{"type":"structure","required":["StartingSequenceNumber"],"members":{"StartingSequenceNumber":{},"EndingSequenceNumber":{}}}}}},"HasMoreShards":{"type":"boolean"}}}}}},"GetRecords":{"input":{"type":"structure","required":["ShardIterator"],"members":{"ShardIterator":{},"Limit":{"type":"integer"}}},"output":{"type":"structure","required":["Records"],"members":{"Records":{"type":"list","member":{"type":"structure","required":["SequenceNumber","Data","PartitionKey"],"members":{"SequenceNumber":{},"Data":{"type":"blob"},"PartitionKey":{}}}},"NextShardIterator":{}}}},"GetShardIterator":{"input":{"type":"structure","required":["StreamName","ShardId","ShardIteratorType"],"members":{"StreamName":{},"ShardId":{},"ShardIteratorType":{},"StartingSequenceNumber":{}}},"output":{"type":"structure","members":{"ShardIterator":{}}}},"ListStreams":{"input":{"type":"structure","members":{"Limit":{"type":"integer"},"ExclusiveStartStreamName":{}}},"output":{"type":"structure","required":["StreamNames","HasMoreStreams"],"members":{"StreamNames":{"type":"list","member":{}},"HasMoreStreams":{"type":"boolean"}}}},"MergeShards":{"input":{"type":"structure","required":["StreamName","ShardToMerge","AdjacentShardToMerge"],"members":{"StreamName":{},"ShardToMerge":{},"AdjacentShardToMerge":{}}}},"PutRecord":{"input":{"type":"structure","required":["StreamName","Data","PartitionKey"],"members":{"StreamName":{},"Data":{"type":"blob"},"PartitionKey":{},"ExplicitHashKey":{},"SequenceNumberForOrdering":{}}},"output":{"type":"structure","required":["ShardId","SequenceNumber"],"members":{"ShardId":{},"SequenceNumber":{}}}},"SplitShard":{"input":{"type":"structure","required":["StreamName","ShardToSplit","NewStartingHashKey"],"members":{"StreamName":{},"ShardToSplit":{},"NewStartingHashKey":{}}}}},"shapes":{},"paginators":{"DescribeStream":{"input_token":"ExclusiveStartShardId","limit_key":"Limit","more_results":"StreamDescription.HasMoreShards","output_token":"StreamDescription.Shards[-1].ShardId","result_key":"StreamDescription.Shards"},"GetRecords":{"input_token":"ShardIterator","limit_key":"Limit","output_token":"NextShardIterator","result_key":"Records"},"ListStreams":{"input_token":"ExclusiveStartStreamName","limit_key":"Limit","more_results":"HasMoreStreams","output_token":"StreamNames[-1]","result_key":"StreamNames"}}});
AltAWS.S3=AltAWS.Service.defineService("s3");AltAWS.util.update(AltAWS.S3.prototype,{validateService:function e(){if(!this.config.region)this.config.region="us-east-1"},setupRequestListeners:function t(e){e.addListener("build",this.addContentType);e.addListener("build",this.populateURI);e.addListener("build",this.computeContentMd5);e.addListener("build",this.computeSha256);e.addListener("build",this.computeSseCustomerKeyMd5);e.removeListener("validate",AltAWS.EventListeners.Core.VALIDATE_REGION);e.addListener("extractError",this.extractError);e.addListener("extractData",this.extractData);e.addListener("beforePresign",this.prepareSignedUrl)},populateURI:function r(e){var t=e.httpRequest;var r=e.params.Bucket;if(r){if(!e.service.pathStyleBucketName(r)){t.endpoint.hostname=r+"."+t.endpoint.hostname;var n=t.endpoint.port;if(n!==80&&n!==443){t.endpoint.host=t.endpoint.hostname+":"+t.endpoint.port}else{t.endpoint.host=t.endpoint.hostname}t.virtualHostedBucket=r;t.path=t.path.replace(new RegExp("/"+r),"");if(t.path[0]!=="/"){t.path="/"+t.path}}}},addContentType:function n(e){var t=e.httpRequest;if(t.method==="GET"||t.method==="HEAD"){delete t.headers["Content-Type"];return}if(!t.headers["Content-Type"]){t.headers["Content-Type"]="application/octet-stream"}var r=t.headers["Content-Type"];if(AltAWS.util.isBrowser()){if(typeof t.body==="string"&&!r.match(/;\s*charset=/)){var n="; charset=UTF-8";t.headers["Content-Type"]+=n}else{var i=function(e,t,r){return t+r.toUpperCase()};t.headers["Content-Type"]=r.replace(/(;\s*charset=)(.+)$/,i)}}},computableChecksumOperations:{putBucketCors:true,putBucketLifecycle:true,putBucketTagging:true,deleteObjects:true},willComputeChecksums:function i(e){if(this.computableChecksumOperations[e.operation])return true;if(!this.config.computeChecksums)return false;if(!AltAWS.util.Buffer.isBuffer(e.httpRequest.body)&&typeof e.httpRequest.body!=="string"){return false}var t=e.service.api.operations[e.operation].input.members;if(e.service.getSignerClass(e)===AltAWS.Signers.V4){if(t.ContentMD5&&!t.ContentMD5.required)return false}if(t.ContentMD5&&!e.params.ContentMD5)return true},computeContentMd5:function a(e){if(e.service.willComputeChecksums(e)){var t=AltAWS.util.crypto.md5(e.httpRequest.body,"base64");e.httpRequest.headers["Content-MD5"]=t}},computeSha256:function s(e){if(e.service.getSignerClass(e)===AltAWS.Signers.V4){e.httpRequest.headers["X-Amz-Content-Sha256"]=AltAWS.util.crypto.sha256(e.httpRequest.body||"","hex")}},computeSseCustomerKeyMd5:function o(e){var t=["x-amz-server-side-encryption-customer-key","x-amz-copy-source-server-side-encryption-customer-key"];AltAWS.util.arrayEach(t,function(t){if(e.httpRequest.headers[t]){var r=e.httpRequest.headers[t];var n=t+"-MD5";e.httpRequest.headers[t]=AltAWS.util.base64.encode(r);if(!e.httpRequest.headers[n]){var i=AltAWS.util.crypto.md5(r,"base64");e.httpRequest.headers[n]=AltAWS.util.base64.encode(i)}}})},pathStyleBucketName:function u(e){if(this.config.s3ForcePathStyle)return true;if(this.dnsCompatibleBucketName(e)){return this.config.sslEnabled&&e.match(/\./)?true:false}else{return true}},dnsCompatibleBucketName:function p(e){var t=e;var r=new RegExp(/^[a-z0-9][a-z0-9\.\-]{1,61}[a-z0-9]$/);var n=new RegExp(/(\d+\.){3}\d+/);var i=new RegExp(/\.\./);return t.match(r)&&!t.match(n)&&!t.match(i)?true:false},escapePathParam:function c(e){return AltAWS.util.uriEscapePath(String(e))},successfulResponse:function d(e){var t=e.request;var r=e.httpResponse;if(t.operation==="completeMultipartUpload"&&r.body.toString().match("<Error>"))return false;else return r.statusCode<300},retryableError:function h(e,t){if(t.operation==="completeMultipartUpload"&&e.statusCode===200){return true}else if(e&&e.code==="RequestTimeout"){return true}else{var r=AltAWS.Service.prototype.retryableError;return r.call(this,e,t)}},extractData:function l(e){var t=e.request;if(t.operation==="getBucketLocation"){var r=e.httpResponse.body.toString().match(/>(.+)<\/Location/);if(r){delete e.data["_"];e.data.LocationConstraint=r[1]}}},extractError:function f(e){var t={304:"NotModified",403:"Forbidden",400:"BadRequest",404:"NotFound"};var r=e.httpResponse.statusCode;var n=e.httpResponse.body;if(t[r]&&n.length===0){e.error=AltAWS.util.error(new Error,{code:t[e.httpResponse.statusCode],message:null})}else{var i=(new AltAWS.XML.Parser).parse(n.toString());e.error=AltAWS.util.error(new Error,{code:i.Code||r,message:i.Message||null})}},getSignedUrl:function m(e,t,r){t=AltAWS.util.copy(t||{});var n=t.Expires||900;delete t.Expires;var i=this.makeRequest(e,t);return i.presign(n,r)},prepareSignedUrl:function v(e){e.removeListener("build",e.service.addContentType);if(!e.params.Body){e.removeListener("build",e.service.computeContentMd5);e.removeListener("build",e.service.computeSha256)}},createBucket:function S(e,t){if(!e)e={};var r=this.endpoint.hostname;if(r!==this.api.globalEndpoint&&!e.CreateBucketConfiguration){e.CreateBucketConfiguration={LocationConstraint:this.config.region}}return this.makeRequest("createBucket",e,t)}});
AltAWS.Service.defineServiceApi(AltAWS.S3, "2006-03-01", {"metadata":{"apiVersion":"2006-03-01","checksumFormat":"md5","endpointPrefix":"s3","globalEndpoint":"s3.amazonaws.com","serviceAbbreviation":"Amazon S3","serviceFullName":"Amazon Simple Storage Service","signatureVersion":"s3","timestampFormat":"rfc822","protocol":"rest-xml"},"operations":{"AbortMultipartUpload":{"http":{"method":"DELETE","requestUri":"/{Bucket}/{Key}"},"input":{"type":"structure","required":["Bucket","Key","UploadId"],"members":{"Bucket":{"location":"uri","locationName":"Bucket"},"Key":{"location":"uri","locationName":"Key"},"UploadId":{"location":"querystring","locationName":"uploadId"}}}},"CompleteMultipartUpload":{"http":{"requestUri":"/{Bucket}/{Key}"},"input":{"type":"structure","required":["Bucket","Key","UploadId"],"members":{"Bucket":{"location":"uri","locationName":"Bucket"},"Key":{"location":"uri","locationName":"Key"},"MultipartUpload":{"locationName":"CompleteMultipartUpload","xmlNamespace":"http://s3.amazonaws.com/doc/2006-03-01/","type":"structure","members":{"Parts":{"locationName":"Part","type":"list","member":{"type":"structure","members":{"ETag":{},"PartNumber":{"type":"integer"}}},"flattened":true}}},"UploadId":{"location":"querystring","locationName":"uploadId"}},"payload":"MultipartUpload"},"output":{"type":"structure","members":{"Location":{},"Bucket":{},"Key":{},"Expiration":{"location":"header","locationName":"x-amz-expiration","type":"timestamp"},"ETag":{},"ServerSideEncryption":{"location":"header","locationName":"x-amz-server-side-encryption"},"VersionId":{"location":"header","locationName":"x-amz-version-id"}}}},"CopyObject":{"http":{"method":"PUT","requestUri":"/{Bucket}/{Key}"},"input":{"type":"structure","required":["Bucket","CopySource","Key"],"members":{"ACL":{"location":"header","locationName":"x-amz-acl"},"Bucket":{"location":"uri","locationName":"Bucket"},"CacheControl":{"location":"header","locationName":"Cache-Control"},"ContentDisposition":{"location":"header","locationName":"Content-Disposition"},"ContentEncoding":{"location":"header","locationName":"Content-Encoding"},"ContentLanguage":{"location":"header","locationName":"Content-Language"},"ContentType":{"location":"header","locationName":"Content-Type"},"CopySource":{"location":"header","locationName":"x-amz-copy-source"},"CopySourceIfMatch":{"location":"header","locationName":"x-amz-copy-source-if-match"},"CopySourceIfModifiedSince":{"location":"header","locationName":"x-amz-copy-source-if-modified-since","type":"timestamp"},"CopySourceIfNoneMatch":{"location":"header","locationName":"x-amz-copy-source-if-none-match"},"CopySourceIfUnmodifiedSince":{"location":"header","locationName":"x-amz-copy-source-if-unmodified-since","type":"timestamp"},"Expires":{"location":"header","locationName":"Expires","type":"timestamp"},"GrantFullControl":{"location":"header","locationName":"x-amz-grant-full-control"},"GrantRead":{"location":"header","locationName":"x-amz-grant-read"},"GrantReadACP":{"location":"header","locationName":"x-amz-grant-read-acp"},"GrantWriteACP":{"location":"header","locationName":"x-amz-grant-write-acp"},"Key":{"location":"uri","locationName":"Key"},"Metadata":{"shape":"Sx","location":"headers","locationName":"x-amz-meta-"},"MetadataDirective":{"location":"header","locationName":"x-amz-metadata-directive"},"ServerSideEncryption":{"location":"header","locationName":"x-amz-server-side-encryption"},"StorageClass":{"location":"header","locationName":"x-amz-storage-class"},"WebsiteRedirectLocation":{"location":"header","locationName":"x-amz-website-redirect-location"},"SSECustomerAlgorithm":{"location":"header","locationName":"x-amz-server-side-encryption-customer-algorithm"},"SSECustomerKey":{"location":"header","locationName":"x-amz-server-side-encryption-customer-key"},"SSECustomerKeyMD5":{"location":"header","locationName":"x-amz-server-side-encryption-customer-key-MD5"},"CopySourceSSECustomerAlgorithm":{"location":"header","locationName":"x-amz-copy-source-server-side-encryption-customer-algorithm"},"CopySourceSSECustomerKey":{"location":"header","locationName":"x-amz-copy-source-server-side-encryption-customer-key"},"CopySourceSSECustomerKeyMD5":{"location":"header","locationName":"x-amz-copy-source-server-side-encryption-customer-key-MD5"}}},"output":{"type":"structure","members":{"CopyObjectResult":{"type":"structure","members":{"ETag":{},"LastModified":{"type":"timestamp"}}},"Expiration":{"location":"header","locationName":"x-amz-expiration","type":"timestamp"},"CopySourceVersionId":{"location":"header","locationName":"x-amz-copy-source-version-id"},"ServerSideEncryption":{"location":"header","locationName":"x-amz-server-side-encryption"},"SSECustomerAlgorithm":{"location":"header","locationName":"x-amz-server-side-encryption-customer-algorithm"},"SSECustomerKeyMD5":{"location":"header","locationName":"x-amz-server-side-encryption-customer-key-MD5"}},"payload":"CopyObjectResult"},"alias":"PutObjectCopy"},"CreateBucket":{"http":{"method":"PUT","requestUri":"/{Bucket}"},"input":{"type":"structure","required":["Bucket"],"members":{"ACL":{"location":"header","locationName":"x-amz-acl"},"Bucket":{"location":"uri","locationName":"Bucket"},"CreateBucketConfiguration":{"xmlNamespace":"http://s3.amazonaws.com/doc/2006-03-01/","locationName":"CreateBucketConfiguration","type":"structure","members":{"LocationConstraint":{}}},"GrantFullControl":{"location":"header","locationName":"x-amz-grant-full-control"},"GrantRead":{"location":"header","locationName":"x-amz-grant-read"},"GrantReadACP":{"location":"header","locationName":"x-amz-grant-read-acp"},"GrantWrite":{"location":"header","locationName":"x-amz-grant-write"},"GrantWriteACP":{"location":"header","locationName":"x-amz-grant-write-acp"}},"payload":"CreateBucketConfiguration"},"output":{"type":"structure","members":{"Location":{"location":"header","locationName":"Location"}}},"alias":"PutBucket"},"CreateMultipartUpload":{"http":{"requestUri":"/{Bucket}/{Key}?uploads"},"input":{"type":"structure","required":["Bucket","Key"],"members":{"ACL":{"location":"header","locationName":"x-amz-acl"},"Bucket":{"location":"uri","locationName":"Bucket"},"CacheControl":{"location":"header","locationName":"Cache-Control"},"ContentDisposition":{"location":"header","locationName":"Content-Disposition"},"ContentEncoding":{"location":"header","locationName":"Content-Encoding"},"ContentLanguage":{"location":"header","locationName":"Content-Language"},"ContentType":{"location":"header","locationName":"Content-Type"},"Expires":{"location":"header","locationName":"Expires","type":"timestamp"},"GrantFullControl":{"location":"header","locationName":"x-amz-grant-full-control"},"GrantRead":{"location":"header","locationName":"x-amz-grant-read"},"GrantReadACP":{"location":"header","locationName":"x-amz-grant-read-acp"},"GrantWriteACP":{"location":"header","locationName":"x-amz-grant-write-acp"},"Key":{"location":"uri","locationName":"Key"},"Metadata":{"shape":"Sx","location":"headers","locationName":"x-amz-meta-"},"ServerSideEncryption":{"location":"header","locationName":"x-amz-server-side-encryption"},"StorageClass":{"location":"header","locationName":"x-amz-storage-class"},"WebsiteRedirectLocation":{"location":"header","locationName":"x-amz-website-redirect-location"},"SSECustomerAlgorithm":{"location":"header","locationName":"x-amz-server-side-encryption-customer-algorithm"},"SSECustomerKey":{"location":"header","locationName":"x-amz-server-side-encryption-customer-key"},"SSECustomerKeyMD5":{"location":"header","locationName":"x-amz-server-side-encryption-customer-key-MD5"}}},"output":{"type":"structure","members":{"Bucket":{"locationName":"Bucket"},"Key":{},"UploadId":{},"ServerSideEncryption":{"location":"header","locationName":"x-amz-server-side-encryption"},"SSECustomerAlgorithm":{"location":"header","locationName":"x-amz-server-side-encryption-customer-algorithm"},"SSECustomerKeyMD5":{"location":"header","locationName":"x-amz-server-side-encryption-customer-key-MD5"}}},"alias":"InitiateMultipartUpload"},"DeleteBucket":{"http":{"method":"DELETE","requestUri":"/{Bucket}"},"input":{"type":"structure","required":["Bucket"],"members":{"Bucket":{"location":"uri","locationName":"Bucket"}}}},"DeleteBucketCors":{"http":{"method":"DELETE","requestUri":"/{Bucket}?cors"},"input":{"type":"structure","required":["Bucket"],"members":{"Bucket":{"location":"uri","locationName":"Bucket"}}}},"DeleteBucketLifecycle":{"http":{"method":"DELETE","requestUri":"/{Bucket}?lifecycle"},"input":{"type":"structure","required":["Bucket"],"members":{"Bucket":{"location":"uri","locationName":"Bucket"}}}},"DeleteBucketPolicy":{"http":{"method":"DELETE","requestUri":"/{Bucket}?policy"},"input":{"type":"structure","required":["Bucket"],"members":{"Bucket":{"location":"uri","locationName":"Bucket"}}}},"DeleteBucketTagging":{"http":{"method":"DELETE","requestUri":"/{Bucket}?tagging"},"input":{"type":"structure","required":["Bucket"],"members":{"Bucket":{"location":"uri","locationName":"Bucket"}}}},"DeleteBucketWebsite":{"http":{"method":"DELETE","requestUri":"/{Bucket}?website"},"input":{"type":"structure","required":["Bucket"],"members":{"Bucket":{"location":"uri","locationName":"Bucket"}}}},"DeleteObject":{"http":{"method":"DELETE","requestUri":"/{Bucket}/{Key}"},"input":{"type":"structure","required":["Bucket","Key"],"members":{"Bucket":{"location":"uri","locationName":"Bucket"},"Key":{"location":"uri","locationName":"Key"},"MFA":{"location":"header","locationName":"x-amz-mfa"},"VersionId":{"location":"querystring","locationName":"versionId"}}},"output":{"type":"structure","members":{"DeleteMarker":{"location":"header","locationName":"x-amz-delete-marker","type":"boolean"},"VersionId":{"location":"header","locationName":"x-amz-version-id"}}}},"DeleteObjects":{"http":{"requestUri":"/{Bucket}?delete"},"input":{"type":"structure","required":["Bucket","Delete"],"members":{"Bucket":{"location":"uri","locationName":"Bucket"},"Delete":{"xmlNamespace":"http://s3.amazonaws.com/doc/2006-03-01/","locationName":"Delete","type":"structure","required":["Objects"],"members":{"Objects":{"locationName":"Object","type":"list","member":{"type":"structure","required":["Key"],"members":{"Key":{},"VersionId":{}}},"flattened":true},"Quiet":{"type":"boolean"}}},"MFA":{"location":"header","locationName":"x-amz-mfa"}},"payload":"Delete"},"output":{"type":"structure","members":{"Deleted":{"type":"list","member":{"type":"structure","members":{"Key":{},"VersionId":{},"DeleteMarker":{"type":"boolean"},"DeleteMarkerVersionId":{}}},"flattened":true},"Errors":{"locationName":"Error","type":"list","member":{"type":"structure","members":{"Key":{},"VersionId":{},"Code":{},"Message":{}}},"flattened":true}}},"alias":"DeleteMultipleObjects"},"GetBucketAcl":{"http":{"method":"GET","requestUri":"/{Bucket}?acl"},"input":{"type":"structure","required":["Bucket"],"members":{"Bucket":{"location":"uri","locationName":"Bucket"}}},"output":{"type":"structure","members":{"Owner":{"shape":"S2a"},"Grants":{"shape":"S2d","locationName":"AccessControlList"}}}},"GetBucketCors":{"http":{"method":"GET","requestUri":"/{Bucket}?cors"},"input":{"type":"structure","required":["Bucket"],"members":{"Bucket":{"location":"uri","locationName":"Bucket"}}},"output":{"type":"structure","members":{"CORSRules":{"shape":"S2m","locationName":"CORSRule"}}}},"GetBucketLifecycle":{"http":{"method":"GET","requestUri":"/{Bucket}?lifecycle"},"input":{"type":"structure","required":["Bucket"],"members":{"Bucket":{"location":"uri","locationName":"Bucket"}}},"output":{"type":"structure","members":{"Rules":{"shape":"S2z","locationName":"Rule"}}}},"GetBucketLocation":{"http":{"method":"GET","requestUri":"/{Bucket}?location"},"input":{"type":"structure","required":["Bucket"],"members":{"Bucket":{"location":"uri","locationName":"Bucket"}}},"output":{"type":"structure","members":{"LocationConstraint":{}}}},"GetBucketLogging":{"http":{"method":"GET","requestUri":"/{Bucket}?logging"},"input":{"type":"structure","required":["Bucket"],"members":{"Bucket":{"location":"uri","locationName":"Bucket"}}},"output":{"type":"structure","members":{"LoggingEnabled":{"shape":"S3e"}}}},"GetBucketNotification":{"http":{"method":"GET","requestUri":"/{Bucket}?notification"},"input":{"type":"structure","required":["Bucket"],"members":{"Bucket":{"location":"uri","locationName":"Bucket"}}},"output":{"type":"structure","members":{"TopicConfiguration":{"shape":"S3m"}}}},"GetBucketPolicy":{"http":{"method":"GET","requestUri":"/{Bucket}?policy"},"input":{"type":"structure","required":["Bucket"],"members":{"Bucket":{"location":"uri","locationName":"Bucket"}}},"output":{"type":"structure","members":{"Policy":{}},"payload":"Policy"}},"GetBucketRequestPayment":{"http":{"method":"GET","requestUri":"/{Bucket}?requestPayment"},"input":{"type":"structure","required":["Bucket"],"members":{"Bucket":{"location":"uri","locationName":"Bucket"}}},"output":{"type":"structure","members":{"Payer":{}}}},"GetBucketTagging":{"http":{"method":"GET","requestUri":"/{Bucket}?tagging"},"input":{"type":"structure","required":["Bucket"],"members":{"Bucket":{"location":"uri","locationName":"Bucket"}}},"output":{"type":"structure","required":["TagSet"],"members":{"TagSet":{"shape":"S3x"}}}},"GetBucketVersioning":{"http":{"method":"GET","requestUri":"/{Bucket}?versioning"},"input":{"type":"structure","required":["Bucket"],"members":{"Bucket":{"location":"uri","locationName":"Bucket"}}},"output":{"type":"structure","members":{"Status":{},"MFADelete":{"locationName":"MfaDelete"}}}},"GetBucketWebsite":{"http":{"method":"GET","requestUri":"/{Bucket}?website"},"input":{"type":"structure","required":["Bucket"],"members":{"Bucket":{"location":"uri","locationName":"Bucket"}}},"output":{"type":"structure","members":{"RedirectAllRequestsTo":{"shape":"S46"},"IndexDocument":{"shape":"S49"},"ErrorDocument":{"shape":"S4b"},"RoutingRules":{"shape":"S4c"}}}},"GetObject":{"http":{"method":"GET","requestUri":"/{Bucket}/{Key}"},"input":{"type":"structure","required":["Bucket","Key"],"members":{"Bucket":{"location":"uri","locationName":"Bucket"},"IfMatch":{"location":"header","locationName":"If-Match"},"IfModifiedSince":{"location":"header","locationName":"If-Modified-Since","type":"timestamp"},"IfNoneMatch":{"location":"header","locationName":"If-None-Match"},"IfUnmodifiedSince":{"location":"header","locationName":"If-Unmodified-Since","type":"timestamp"},"Key":{"location":"uri","locationName":"Key"},"Range":{"location":"header","locationName":"Range"},"ResponseCacheControl":{"location":"querystring","locationName":"response-cache-control"},"ResponseContentDisposition":{"location":"querystring","locationName":"response-content-disposition"},"ResponseContentEncoding":{"location":"querystring","locationName":"response-content-encoding"},"ResponseContentLanguage":{"location":"querystring","locationName":"response-content-language"},"ResponseContentType":{"location":"querystring","locationName":"response-content-type"},"ResponseExpires":{"location":"querystring","locationName":"response-expires","type":"timestamp"},"VersionId":{"location":"querystring","locationName":"versionId"},"SSECustomerAlgorithm":{"location":"header","locationName":"x-amz-server-side-encryption-customer-algorithm"},"SSECustomerKey":{"location":"header","locationName":"x-amz-server-side-encryption-customer-key"},"SSECustomerKeyMD5":{"location":"header","locationName":"x-amz-server-side-encryption-customer-key-MD5"}}},"output":{"type":"structure","members":{"Body":{"streaming":true,"type":"blob"},"DeleteMarker":{"location":"header","locationName":"x-amz-delete-marker","type":"boolean"},"AcceptRanges":{"location":"header","locationName":"accept-ranges"},"Expiration":{"location":"header","locationName":"x-amz-expiration","type":"timestamp"},"Restore":{"location":"header","locationName":"x-amz-restore"},"LastModified":{"location":"header","locationName":"Last-Modified","type":"timestamp"},"ContentLength":{"location":"header","locationName":"Content-Length","type":"integer"},"ETag":{"location":"header","locationName":"ETag"},"MissingMeta":{"location":"header","locationName":"x-amz-missing-meta","type":"integer"},"VersionId":{"location":"header","locationName":"x-amz-version-id"},"CacheControl":{"location":"header","locationName":"Cache-Control"},"ContentDisposition":{"location":"header","locationName":"Content-Disposition"},"ContentEncoding":{"location":"header","locationName":"Content-Encoding"},"ContentLanguage":{"location":"header","locationName":"Content-Language"},"ContentType":{"location":"header","locationName":"Content-Type"},"Expires":{"location":"header","locationName":"Expires","type":"timestamp"},"WebsiteRedirectLocation":{"location":"header","locationName":"x-amz-website-redirect-location"},"ServerSideEncryption":{"location":"header","locationName":"x-amz-server-side-encryption"},"Metadata":{"shape":"Sx","location":"headers","locationName":"x-amz-meta-"},"SSECustomerAlgorithm":{"location":"header","locationName":"x-amz-server-side-encryption-customer-algorithm"},"SSECustomerKeyMD5":{"location":"header","locationName":"x-amz-server-side-encryption-customer-key-MD5"}},"payload":"Body"}},"GetObjectAcl":{"http":{"method":"GET","requestUri":"/{Bucket}/{Key}?acl"},"input":{"type":"structure","required":["Bucket","Key"],"members":{"Bucket":{"location":"uri","locationName":"Bucket"},"Key":{"location":"uri","locationName":"Key"},"VersionId":{"location":"querystring","locationName":"versionId"}}},"output":{"type":"structure","members":{"Owner":{"shape":"S2a"},"Grants":{"shape":"S2d","locationName":"AccessControlList"}}}},"GetObjectTorrent":{"http":{"method":"GET","requestUri":"/{Bucket}/{Key}?torrent"},"input":{"type":"structure","required":["Bucket","Key"],"members":{"Bucket":{"location":"uri","locationName":"Bucket"},"Key":{"location":"uri","locationName":"Key"}}},"output":{"type":"structure","members":{"Body":{"streaming":true,"type":"blob"}},"payload":"Body"}},"HeadBucket":{"http":{"method":"HEAD","requestUri":"/{Bucket}"},"input":{"type":"structure","required":["Bucket"],"members":{"Bucket":{"location":"uri","locationName":"Bucket"}}}},"HeadObject":{"http":{"method":"HEAD","requestUri":"/{Bucket}/{Key}"},"input":{"type":"structure","required":["Bucket","Key"],"members":{"Bucket":{"location":"uri","locationName":"Bucket"},"IfMatch":{"location":"header","locationName":"If-Match"},"IfModifiedSince":{"location":"header","locationName":"If-Modified-Since","type":"timestamp"},"IfNoneMatch":{"location":"header","locationName":"If-None-Match"},"IfUnmodifiedSince":{"location":"header","locationName":"If-Unmodified-Since","type":"timestamp"},"Key":{"location":"uri","locationName":"Key"},"Range":{"location":"header","locationName":"Range"},"VersionId":{"location":"querystring","locationName":"versionId"},"SSECustomerAlgorithm":{"location":"header","locationName":"x-amz-server-side-encryption-customer-algorithm"},"SSECustomerKey":{"location":"header","locationName":"x-amz-server-side-encryption-customer-key"},"SSECustomerKeyMD5":{"location":"header","locationName":"x-amz-server-side-encryption-customer-key-MD5"}}},"output":{"type":"structure","members":{"DeleteMarker":{"location":"header","locationName":"x-amz-delete-marker","type":"boolean"},"AcceptRanges":{"location":"header","locationName":"accept-ranges"},"Expiration":{"location":"header","locationName":"x-amz-expiration","type":"timestamp"},"Restore":{"location":"header","locationName":"x-amz-restore"},"LastModified":{"location":"header","locationName":"Last-Modified","type":"timestamp"},"ContentLength":{"location":"header","locationName":"Content-Length","type":"integer"},"ETag":{"location":"header","locationName":"ETag"},"MissingMeta":{"location":"header","locationName":"x-amz-missing-meta","type":"integer"},"VersionId":{"location":"header","locationName":"x-amz-version-id"},"CacheControl":{"location":"header","locationName":"Cache-Control"},"ContentDisposition":{"location":"header","locationName":"Content-Disposition"},"ContentEncoding":{"location":"header","locationName":"Content-Encoding"},"ContentLanguage":{"location":"header","locationName":"Content-Language"},"ContentType":{"location":"header","locationName":"Content-Type"},"Expires":{"location":"header","locationName":"Expires","type":"timestamp"},"WebsiteRedirectLocation":{"location":"header","locationName":"x-amz-website-redirect-location"},"ServerSideEncryption":{"location":"header","locationName":"x-amz-server-side-encryption"},"Metadata":{"shape":"Sx","location":"headers","locationName":"x-amz-meta-"},"SSECustomerAlgorithm":{"location":"header","locationName":"x-amz-server-side-encryption-customer-algorithm"},"SSECustomerKeyMD5":{"location":"header","locationName":"x-amz-server-side-encryption-customer-key-MD5"}}}},"ListBuckets":{"http":{"method":"GET"},"output":{"type":"structure","members":{"Buckets":{"type":"list","member":{"locationName":"Bucket","type":"structure","members":{"Name":{},"CreationDate":{"type":"timestamp"}}}},"Owner":{"shape":"S2a"}}},"alias":"GetService"},"ListMultipartUploads":{"http":{"method":"GET","requestUri":"/{Bucket}?uploads"},"input":{"type":"structure","required":["Bucket"],"members":{"Bucket":{"location":"uri","locationName":"Bucket"},"Delimiter":{"location":"querystring","locationName":"delimiter"},"EncodingType":{"location":"querystring","locationName":"encoding-type"},"KeyMarker":{"location":"querystring","locationName":"key-marker"},"MaxUploads":{"location":"querystring","locationName":"max-uploads","type":"integer"},"Prefix":{"location":"querystring","locationName":"prefix"},"UploadIdMarker":{"location":"querystring","locationName":"upload-id-marker"}}},"output":{"type":"structure","members":{"Bucket":{},"KeyMarker":{},"UploadIdMarker":{},"NextKeyMarker":{},"Prefix":{},"NextUploadIdMarker":{},"MaxUploads":{"type":"integer"},"IsTruncated":{"type":"boolean"},"Uploads":{"locationName":"Upload","type":"list","member":{"type":"structure","members":{"UploadId":{},"Key":{},"Initiated":{"type":"timestamp"},"StorageClass":{},"Owner":{"shape":"S2a"},"Initiator":{"shape":"S5r"}}},"flattened":true},"CommonPrefixes":{"shape":"S5s"},"EncodingType":{}}}},"ListObjectVersions":{"http":{"method":"GET","requestUri":"/{Bucket}?versions"},"input":{"type":"structure","required":["Bucket"],"members":{"Bucket":{"location":"uri","locationName":"Bucket"},"Delimiter":{"location":"querystring","locationName":"delimiter"},"EncodingType":{"location":"querystring","locationName":"encoding-type"},"KeyMarker":{"location":"querystring","locationName":"key-marker"},"MaxKeys":{"location":"querystring","locationName":"max-keys","type":"integer"},"Prefix":{"location":"querystring","locationName":"prefix"},"VersionIdMarker":{"location":"querystring","locationName":"version-id-marker"}}},"output":{"type":"structure","members":{"IsTruncated":{"type":"boolean"},"KeyMarker":{},"VersionIdMarker":{},"NextKeyMarker":{},"NextVersionIdMarker":{},"Versions":{"locationName":"Version","type":"list","member":{"type":"structure","members":{"ETag":{},"Size":{"type":"integer"},"StorageClass":{},"Key":{},"VersionId":{},"IsLatest":{"type":"boolean"},"LastModified":{"type":"timestamp"},"Owner":{"shape":"S2a"}}},"flattened":true},"DeleteMarkers":{"locationName":"DeleteMarker","type":"list","member":{"type":"structure","members":{"Owner":{"shape":"S2a"},"Key":{},"VersionId":{},"IsLatest":{"type":"boolean"},"LastModified":{"type":"timestamp"}}},"flattened":true},"Name":{},"Prefix":{},"MaxKeys":{"type":"integer"},"CommonPrefixes":{"shape":"S5s"},"EncodingType":{}}},"alias":"GetBucketObjectVersions"},"ListObjects":{"http":{"method":"GET","requestUri":"/{Bucket}"},"input":{"type":"structure","required":["Bucket"],"members":{"Bucket":{"location":"uri","locationName":"Bucket"},"Delimiter":{"location":"querystring","locationName":"delimiter"},"EncodingType":{"location":"querystring","locationName":"encoding-type"},"Marker":{"location":"querystring","locationName":"marker"},"MaxKeys":{"location":"querystring","locationName":"max-keys","type":"integer"},"Prefix":{"location":"querystring","locationName":"prefix"}}},"output":{"type":"structure","members":{"IsTruncated":{"type":"boolean"},"Marker":{},"NextMarker":{},"Contents":{"type":"list","member":{"type":"structure","members":{"Key":{},"LastModified":{"type":"timestamp"},"ETag":{},"Size":{"type":"integer"},"StorageClass":{},"Owner":{"shape":"S2a"}}},"flattened":true},"Name":{},"Prefix":{},"MaxKeys":{"type":"integer"},"CommonPrefixes":{"shape":"S5s"},"EncodingType":{}}},"alias":"GetBucket"},"ListParts":{"http":{"method":"GET","requestUri":"/{Bucket}/{Key}"},"input":{"type":"structure","required":["Bucket","Key","UploadId"],"members":{"Bucket":{"location":"uri","locationName":"Bucket"},"Key":{"location":"uri","locationName":"Key"},"MaxParts":{"location":"querystring","locationName":"max-parts","type":"integer"},"PartNumberMarker":{"location":"querystring","locationName":"part-number-marker","type":"integer"},"UploadId":{"location":"querystring","locationName":"uploadId"}}},"output":{"type":"structure","members":{"Bucket":{},"Key":{},"UploadId":{},"PartNumberMarker":{"type":"integer"},"NextPartNumberMarker":{"type":"integer"},"MaxParts":{"type":"integer"},"IsTruncated":{"type":"boolean"},"Parts":{"locationName":"Part","type":"list","member":{"type":"structure","members":{"PartNumber":{"type":"integer"},"LastModified":{"type":"timestamp"},"ETag":{},"Size":{"type":"integer"}}},"flattened":true},"Initiator":{"shape":"S5r"},"Owner":{"shape":"S2a"},"StorageClass":{}}}},"PutBucketAcl":{"http":{"method":"PUT","requestUri":"/{Bucket}?acl"},"input":{"type":"structure","required":["Bucket"],"members":{"ACL":{"location":"header","locationName":"x-amz-acl"},"AccessControlPolicy":{"shape":"S6l","xmlNamespace":"http://s3.amazonaws.com/doc/2006-03-01/","locationName":"AccessControlPolicy"},"Bucket":{"location":"uri","locationName":"Bucket"},"ContentMD5":{"location":"header","locationName":"Content-MD5"},"GrantFullControl":{"location":"header","locationName":"x-amz-grant-full-control"},"GrantRead":{"location":"header","locationName":"x-amz-grant-read"},"GrantReadACP":{"location":"header","locationName":"x-amz-grant-read-acp"},"GrantWrite":{"location":"header","locationName":"x-amz-grant-write"},"GrantWriteACP":{"location":"header","locationName":"x-amz-grant-write-acp"}},"payload":"AccessControlPolicy"}},"PutBucketCors":{"http":{"method":"PUT","requestUri":"/{Bucket}?cors"},"input":{"type":"structure","required":["Bucket"],"members":{"Bucket":{"location":"uri","locationName":"Bucket"},"CORSConfiguration":{"xmlNamespace":"http://s3.amazonaws.com/doc/2006-03-01/","locationName":"CORSConfiguration","type":"structure","members":{"CORSRules":{"shape":"S2m","locationName":"CORSRule"}}},"ContentMD5":{"location":"header","locationName":"Content-MD5"}},"payload":"CORSConfiguration"}},"PutBucketLifecycle":{"http":{"method":"PUT","requestUri":"/{Bucket}?lifecycle"},"input":{"type":"structure","required":["Bucket"],"members":{"Bucket":{"location":"uri","locationName":"Bucket"},"ContentMD5":{"location":"header","locationName":"Content-MD5"},"LifecycleConfiguration":{"xmlNamespace":"http://s3.amazonaws.com/doc/2006-03-01/","locationName":"LifecycleConfiguration","type":"structure","required":["Rules"],"members":{"Rules":{"shape":"S2z","locationName":"Rule"}}}},"payload":"LifecycleConfiguration"}},"PutBucketLogging":{"http":{"method":"PUT","requestUri":"/{Bucket}?logging"},"input":{"type":"structure","required":["Bucket","BucketLoggingStatus"],"members":{"Bucket":{"location":"uri","locationName":"Bucket"},"BucketLoggingStatus":{"xmlNamespace":"http://s3.amazonaws.com/doc/2006-03-01/","locationName":"BucketLoggingStatus","type":"structure","members":{"LoggingEnabled":{"shape":"S3e"}}},"ContentMD5":{"location":"header","locationName":"Content-MD5"}},"payload":"BucketLoggingStatus"}},"PutBucketNotification":{"http":{"method":"PUT","requestUri":"/{Bucket}?notification"},"input":{"type":"structure","required":["Bucket","NotificationConfiguration"],"members":{"Bucket":{"location":"uri","locationName":"Bucket"},"ContentMD5":{"location":"header","locationName":"Content-MD5"},"NotificationConfiguration":{"xmlNamespace":"http://s3.amazonaws.com/doc/2006-03-01/","locationName":"NotificationConfiguration","type":"structure","required":["TopicConfiguration"],"members":{"TopicConfiguration":{"shape":"S3m"}}}},"payload":"NotificationConfiguration"}},"PutBucketPolicy":{"http":{"method":"PUT","requestUri":"/{Bucket}?policy"},"input":{"xmlNamespace":"http://s3.amazonaws.com/doc/2006-03-01/","locationName":"PutBucketPolicyRequest","type":"structure","required":["Bucket","Policy"],"members":{"Bucket":{"location":"uri","locationName":"Bucket"},"ContentMD5":{"location":"header","locationName":"Content-MD5"},"Policy":{}},"payload":"Policy"}},"PutBucketRequestPayment":{"http":{"method":"PUT","requestUri":"/{Bucket}?requestPayment"},"input":{"type":"structure","required":["Bucket","RequestPaymentConfiguration"],"members":{"Bucket":{"location":"uri","locationName":"Bucket"},"ContentMD5":{"location":"header","locationName":"Content-MD5"},"RequestPaymentConfiguration":{"xmlNamespace":"http://s3.amazonaws.com/doc/2006-03-01/","locationName":"RequestPaymentConfiguration","type":"structure","required":["Payer"],"members":{"Payer":{}}}},"payload":"RequestPaymentConfiguration"}},"PutBucketTagging":{"http":{"method":"PUT","requestUri":"/{Bucket}?tagging"},"input":{"type":"structure","required":["Bucket","Tagging"],"members":{"Bucket":{"location":"uri","locationName":"Bucket"},"ContentMD5":{"location":"header","locationName":"Content-MD5"},"Tagging":{"xmlNamespace":"http://s3.amazonaws.com/doc/2006-03-01/","locationName":"Tagging","type":"structure","required":["TagSet"],"members":{"TagSet":{"shape":"S3x"}}}},"payload":"Tagging"}},"PutBucketVersioning":{"http":{"method":"PUT","requestUri":"/{Bucket}?versioning"},"input":{"type":"structure","required":["Bucket","VersioningConfiguration"],"members":{"Bucket":{"location":"uri","locationName":"Bucket"},"ContentMD5":{"location":"header","locationName":"Content-MD5"},"MFA":{"location":"header","locationName":"x-amz-mfa"},"VersioningConfiguration":{"xmlNamespace":"http://s3.amazonaws.com/doc/2006-03-01/","locationName":"VersioningConfiguration","type":"structure","members":{"MFADelete":{"locationName":"MfaDelete"},"Status":{}}}},"payload":"VersioningConfiguration"}},"PutBucketWebsite":{"http":{"method":"PUT","requestUri":"/{Bucket}?website"},"input":{"type":"structure","required":["Bucket","WebsiteConfiguration"],"members":{"Bucket":{"location":"uri","locationName":"Bucket"},"ContentMD5":{"location":"header","locationName":"Content-MD5"},"WebsiteConfiguration":{"xmlNamespace":"http://s3.amazonaws.com/doc/2006-03-01/","locationName":"WebsiteConfiguration","type":"structure","members":{"ErrorDocument":{"shape":"S4b"},"IndexDocument":{"shape":"S49"},"RedirectAllRequestsTo":{"shape":"S46"},"RoutingRules":{"shape":"S4c"}}}},"payload":"WebsiteConfiguration"}},"PutObject":{"http":{"method":"PUT","requestUri":"/{Bucket}/{Key}"},"input":{"type":"structure","required":["Bucket","Key"],"members":{"ACL":{"location":"header","locationName":"x-amz-acl"},"Body":{"streaming":true,"type":"blob"},"Bucket":{"location":"uri","locationName":"Bucket"},"CacheControl":{"location":"header","locationName":"Cache-Control"},"ContentDisposition":{"location":"header","locationName":"Content-Disposition"},"ContentEncoding":{"location":"header","locationName":"Content-Encoding"},"ContentLanguage":{"location":"header","locationName":"Content-Language"},"ContentLength":{"location":"header","locationName":"Content-Length","type":"integer"},"ContentMD5":{"location":"header","locationName":"Content-MD5"},"ContentType":{"location":"header","locationName":"Content-Type"},"Expires":{"location":"header","locationName":"Expires","type":"timestamp"},"GrantFullControl":{"location":"header","locationName":"x-amz-grant-full-control"},"GrantRead":{"location":"header","locationName":"x-amz-grant-read"},"GrantReadACP":{"location":"header","locationName":"x-amz-grant-read-acp"},"GrantWriteACP":{"location":"header","locationName":"x-amz-grant-write-acp"},"Key":{"location":"uri","locationName":"Key"},"Metadata":{"shape":"Sx","location":"headers","locationName":"x-amz-meta-"},"ServerSideEncryption":{"location":"header","locationName":"x-amz-server-side-encryption"},"StorageClass":{"location":"header","locationName":"x-amz-storage-class"},"WebsiteRedirectLocation":{"location":"header","locationName":"x-amz-website-redirect-location"},"SSECustomerAlgorithm":{"location":"header","locationName":"x-amz-server-side-encryption-customer-algorithm"},"SSECustomerKey":{"location":"header","locationName":"x-amz-server-side-encryption-customer-key"},"SSECustomerKeyMD5":{"location":"header","locationName":"x-amz-server-side-encryption-customer-key-MD5"}},"payload":"Body"},"output":{"type":"structure","members":{"Expiration":{"location":"header","locationName":"x-amz-expiration","type":"timestamp"},"ETag":{"location":"header","locationName":"ETag"},"ServerSideEncryption":{"location":"header","locationName":"x-amz-server-side-encryption"},"VersionId":{"location":"header","locationName":"x-amz-version-id"},"SSECustomerAlgorithm":{"location":"header","locationName":"x-amz-server-side-encryption-customer-algorithm"},"SSECustomerKeyMD5":{"location":"header","locationName":"x-amz-server-side-encryption-customer-key-MD5"}}}},"PutObjectAcl":{"http":{"method":"PUT","requestUri":"/{Bucket}/{Key}?acl"},"input":{"type":"structure","required":["Bucket","Key"],"members":{"ACL":{"location":"header","locationName":"x-amz-acl"},"AccessControlPolicy":{"shape":"S6l","xmlNamespace":"http://s3.amazonaws.com/doc/2006-03-01/","locationName":"AccessControlPolicy"},"Bucket":{"location":"uri","locationName":"Bucket"},"ContentMD5":{"location":"header","locationName":"Content-MD5"},"GrantFullControl":{"location":"header","locationName":"x-amz-grant-full-control"},"GrantRead":{"location":"header","locationName":"x-amz-grant-read"},"GrantReadACP":{"location":"header","locationName":"x-amz-grant-read-acp"},"GrantWrite":{"location":"header","locationName":"x-amz-grant-write"},"GrantWriteACP":{"location":"header","locationName":"x-amz-grant-write-acp"},"Key":{"location":"uri","locationName":"Key"}},"payload":"AccessControlPolicy"}},"RestoreObject":{"http":{"requestUri":"/{Bucket}/{Key}?restore"},"input":{"type":"structure","required":["Bucket","Key"],"members":{"Bucket":{"location":"uri","locationName":"Bucket"},"Key":{"location":"uri","locationName":"Key"},"VersionId":{"location":"querystring","locationName":"versionId"},"RestoreRequest":{"xmlNamespace":"http://s3.amazonaws.com/doc/2006-03-01/","locationName":"RestoreRequest","type":"structure","required":["Days"],"members":{"Days":{"type":"integer"}}}},"payload":"RestoreRequest"},"alias":"PostObjectRestore"},"UploadPart":{"http":{"method":"PUT","requestUri":"/{Bucket}/{Key}"},"input":{"type":"structure","required":["Bucket","Key","PartNumber","UploadId"],"members":{"Body":{"streaming":true,"type":"blob"},"Bucket":{"location":"uri","locationName":"Bucket"},"ContentLength":{"location":"header","locationName":"Content-Length","type":"integer"},"ContentMD5":{"location":"header","locationName":"Content-MD5"},"Key":{"location":"uri","locationName":"Key"},"PartNumber":{"location":"querystring","locationName":"partNumber","type":"integer"},"UploadId":{"location":"querystring","locationName":"uploadId"},"SSECustomerAlgorithm":{"location":"header","locationName":"x-amz-server-side-encryption-customer-algorithm"},"SSECustomerKey":{"location":"header","locationName":"x-amz-server-side-encryption-customer-key"},"SSECustomerKeyMD5":{"location":"header","locationName":"x-amz-server-side-encryption-customer-key-MD5"}},"payload":"Body"},"output":{"type":"structure","members":{"ServerSideEncryption":{"location":"header","locationName":"x-amz-server-side-encryption"},"ETag":{"location":"header","locationName":"ETag"},"SSECustomerAlgorithm":{"location":"header","locationName":"x-amz-server-side-encryption-customer-algorithm"},"SSECustomerKeyMD5":{"location":"header","locationName":"x-amz-server-side-encryption-customer-key-MD5"}}}},"UploadPartCopy":{"http":{"method":"PUT","requestUri":"/{Bucket}/{Key}"},"input":{"type":"structure","required":["Bucket","CopySource","Key","PartNumber","UploadId"],"members":{"Bucket":{"location":"uri","locationName":"Bucket"},"CopySource":{"location":"header","locationName":"x-amz-copy-source"},"CopySourceIfMatch":{"location":"header","locationName":"x-amz-copy-source-if-match"},"CopySourceIfModifiedSince":{"location":"header","locationName":"x-amz-copy-source-if-modified-since","type":"timestamp"},"CopySourceIfNoneMatch":{"location":"header","locationName":"x-amz-copy-source-if-none-match"},"CopySourceIfUnmodifiedSince":{"location":"header","locationName":"x-amz-copy-source-if-unmodified-since","type":"timestamp"},"CopySourceRange":{"location":"header","locationName":"x-amz-copy-source-range"},"Key":{"location":"uri","locationName":"Key"},"PartNumber":{"location":"querystring","locationName":"partNumber","type":"integer"},"UploadId":{"location":"querystring","locationName":"uploadId"},"SSECustomerAlgorithm":{"location":"header","locationName":"x-amz-server-side-encryption-customer-algorithm"},"SSECustomerKey":{"location":"header","locationName":"x-amz-server-side-encryption-customer-key"},"SSECustomerKeyMD5":{"location":"header","locationName":"x-amz-server-side-encryption-customer-key-MD5"},"CopySourceSSECustomerAlgorithm":{"location":"header","locationName":"x-amz-copy-source-server-side-encryption-customer-algorithm"},"CopySourceSSECustomerKey":{"location":"header","locationName":"x-amz-copy-source-server-side-encryption-customer-key"},"CopySourceSSECustomerKeyMD5":{"location":"header","locationName":"x-amz-copy-source-server-side-encryption-customer-key-MD5"}}},"output":{"type":"structure","members":{"CopySourceVersionId":{"location":"header","locationName":"x-amz-copy-source-version-id"},"CopyPartResult":{"type":"structure","members":{"ETag":{},"LastModified":{"type":"timestamp"}}},"ServerSideEncryption":{"location":"header","locationName":"x-amz-server-side-encryption"},"SSECustomerAlgorithm":{"location":"header","locationName":"x-amz-server-side-encryption-customer-algorithm"},"SSECustomerKeyMD5":{"location":"header","locationName":"x-amz-server-side-encryption-customer-key-MD5"}},"payload":"CopyPartResult"}}},"shapes":{"Sx":{"type":"map","key":{},"value":{}},"S2a":{"type":"structure","members":{"DisplayName":{},"ID":{}}},"S2d":{"type":"list","member":{"locationName":"Grant","type":"structure","members":{"Grantee":{"shape":"S2f"},"Permission":{}}}},"S2f":{"type":"structure","required":["Type"],"members":{"DisplayName":{},"EmailAddress":{},"ID":{},"Type":{"type":"string","xmlAttribute":true,"locationName":"xsi:type"},"URI":{}},"xmlNamespace":{"prefix":"xsi","uri":"http://www.w3.org/2001/XMLSchema-instance"}},"S2m":{"type":"list","member":{"type":"structure","members":{"AllowedHeaders":{"locationName":"AllowedHeader","type":"list","member":{},"flattened":true},"AllowedMethods":{"locationName":"AllowedMethod","type":"list","member":{},"flattened":true},"AllowedOrigins":{"locationName":"AllowedOrigin","type":"list","member":{},"flattened":true},"ExposeHeaders":{"locationName":"ExposeHeader","type":"list","member":{},"flattened":true},"MaxAgeSeconds":{"type":"integer"}}},"flattened":true},"S2z":{"type":"list","member":{"type":"structure","required":["Prefix","Status"],"members":{"Expiration":{"type":"structure","members":{"Date":{"shape":"S32"},"Days":{"type":"integer"}}},"ID":{},"Prefix":{},"Status":{},"Transition":{"type":"structure","members":{"Date":{"shape":"S32"},"Days":{"type":"integer"},"StorageClass":{}}},"NoncurrentVersionTransition":{"type":"structure","members":{"NoncurrentDays":{"type":"integer"},"StorageClass":{}}},"NoncurrentVersionExpiration":{"type":"structure","members":{"NoncurrentDays":{"type":"integer"}}}}},"flattened":true},"S32":{"type":"timestamp","timestampFormat":"iso8601"},"S3e":{"type":"structure","members":{"TargetBucket":{},"TargetGrants":{"type":"list","member":{"locationName":"Grant","type":"structure","members":{"Grantee":{"shape":"S2f"},"Permission":{}}}},"TargetPrefix":{}}},"S3m":{"type":"structure","members":{"Event":{},"Topic":{}}},"S3x":{"type":"list","member":{"locationName":"Tag","type":"structure","required":["Key","Value"],"members":{"Key":{},"Value":{}}}},"S46":{"type":"structure","required":["HostName"],"members":{"HostName":{},"Protocol":{}}},"S49":{"type":"structure","required":["Suffix"],"members":{"Suffix":{}}},"S4b":{"type":"structure","required":["Key"],"members":{"Key":{}}},"S4c":{"type":"list","member":{"locationName":"RoutingRule","type":"structure","required":["Redirect"],"members":{"Condition":{"type":"structure","members":{"HttpErrorCodeReturnedEquals":{},"KeyPrefixEquals":{}}},"Redirect":{"type":"structure","members":{"HostName":{},"HttpRedirectCode":{},"Protocol":{},"ReplaceKeyPrefixWith":{},"ReplaceKeyWith":{}}}}}},"S5r":{"type":"structure","members":{"ID":{},"DisplayName":{}}},"S5s":{"type":"list","member":{"type":"structure","members":{"Prefix":{}}},"flattened":true},"S6l":{"type":"structure","members":{"Grants":{"shape":"S2d","locationName":"AccessControlList"},"Owner":{"shape":"S2a"}}}},"paginators":{"ListBuckets":{"result_key":"Buckets"},"ListMultipartUploads":{"limit_key":"MaxUploads","more_results":"IsTruncated","output_token":["NextKeyMarker","NextUploadIdMarker"],"input_token":["KeyMarker","UploadIdMarker"],"result_key":["Uploads","CommonPrefixes"]},"ListObjectVersions":{"more_results":"IsTruncated","limit_key":"MaxKeys","output_token":["NextKeyMarker","NextVersionIdMarker"],"input_token":["KeyMarker","VersionIdMarker"],"result_key":["Versions","DeleteMarkers","CommonPrefixes"]},"ListObjects":{"more_results":"IsTruncated","limit_key":"MaxKeys","output_token":"NextMarker or Contents[-1].Key","input_token":"Marker","result_key":["Contents","CommonPrefixes"]},"ListParts":{"more_results":"IsTruncated","limit_key":"MaxParts","output_token":"NextPartNumberMarker","input_token":"PartNumberMarker","result_key":"Parts"}},"waiters":{"__default__":{"interval":5,"max_attempts":20},"BucketExists":{"operation":"HeadBucket","ignore_errors":[404],"success_type":"output"},"BucketNotExists":{"operation":"HeadBucket","success_type":"error","success_value":404},"ObjectExists":{"operation":"HeadObject","ignore_errors":[404],"success_type":"output"},"ObjectNotExists":{"operation":"HeadObject","success_type":"error","success_value":404}}});
AltAWS.SNS=AltAWS.Service.defineService("sns");
AltAWS.Service.defineServiceApi(AltAWS.SNS, "2010-03-31", {"metadata":{"apiVersion":"2010-03-31","endpointPrefix":"sns","serviceAbbreviation":"Amazon SNS","serviceFullName":"Amazon Simple Notification Service","signatureVersion":"v4","xmlNamespace":"http://sns.amazonaws.com/doc/2010-03-31/","protocol":"query"},"operations":{"AddPermission":{"input":{"type":"structure","required":["TopicArn","Label","AWSAccountId","ActionName"],"members":{"TopicArn":{},"Label":{},"AWSAccountId":{"type":"list","member":{}},"ActionName":{"type":"list","member":{}}}}},"ConfirmSubscription":{"input":{"type":"structure","required":["TopicArn","Token"],"members":{"TopicArn":{},"Token":{},"AuthenticateOnUnsubscribe":{}}},"output":{"resultWrapper":"ConfirmSubscriptionResult","type":"structure","members":{"SubscriptionArn":{}}}},"CreatePlatformApplication":{"input":{"type":"structure","required":["Name","Platform","Attributes"],"members":{"Name":{},"Platform":{},"Attributes":{"shape":"Sf"}}},"output":{"resultWrapper":"CreatePlatformApplicationResult","type":"structure","members":{"PlatformApplicationArn":{}}}},"CreatePlatformEndpoint":{"input":{"type":"structure","required":["PlatformApplicationArn","Token"],"members":{"PlatformApplicationArn":{},"Token":{},"CustomUserData":{},"Attributes":{"shape":"Sf"}}},"output":{"resultWrapper":"CreatePlatformEndpointResult","type":"structure","members":{"EndpointArn":{}}}},"CreateTopic":{"input":{"type":"structure","required":["Name"],"members":{"Name":{}}},"output":{"resultWrapper":"CreateTopicResult","type":"structure","members":{"TopicArn":{}}}},"DeleteEndpoint":{"input":{"type":"structure","required":["EndpointArn"],"members":{"EndpointArn":{}}}},"DeletePlatformApplication":{"input":{"type":"structure","required":["PlatformApplicationArn"],"members":{"PlatformApplicationArn":{}}}},"DeleteTopic":{"input":{"type":"structure","required":["TopicArn"],"members":{"TopicArn":{}}}},"GetEndpointAttributes":{"input":{"type":"structure","required":["EndpointArn"],"members":{"EndpointArn":{}}},"output":{"resultWrapper":"GetEndpointAttributesResult","type":"structure","members":{"Attributes":{"shape":"Sf"}}}},"GetPlatformApplicationAttributes":{"input":{"type":"structure","required":["PlatformApplicationArn"],"members":{"PlatformApplicationArn":{}}},"output":{"resultWrapper":"GetPlatformApplicationAttributesResult","type":"structure","members":{"Attributes":{"shape":"Sf"}}}},"GetSubscriptionAttributes":{"input":{"type":"structure","required":["SubscriptionArn"],"members":{"SubscriptionArn":{}}},"output":{"resultWrapper":"GetSubscriptionAttributesResult","type":"structure","members":{"Attributes":{"type":"map","key":{},"value":{}}}}},"GetTopicAttributes":{"input":{"type":"structure","required":["TopicArn"],"members":{"TopicArn":{}}},"output":{"resultWrapper":"GetTopicAttributesResult","type":"structure","members":{"Attributes":{"type":"map","key":{},"value":{}}}}},"ListEndpointsByPlatformApplication":{"input":{"type":"structure","required":["PlatformApplicationArn"],"members":{"PlatformApplicationArn":{},"NextToken":{}}},"output":{"resultWrapper":"ListEndpointsByPlatformApplicationResult","type":"structure","members":{"Endpoints":{"type":"list","member":{"type":"structure","members":{"EndpointArn":{},"Attributes":{"shape":"Sf"}}}},"NextToken":{}}}},"ListPlatformApplications":{"input":{"type":"structure","members":{"NextToken":{}}},"output":{"resultWrapper":"ListPlatformApplicationsResult","type":"structure","members":{"PlatformApplications":{"type":"list","member":{"type":"structure","members":{"PlatformApplicationArn":{},"Attributes":{"shape":"Sf"}}}},"NextToken":{}}}},"ListSubscriptions":{"input":{"type":"structure","members":{"NextToken":{}}},"output":{"resultWrapper":"ListSubscriptionsResult","type":"structure","members":{"Subscriptions":{"shape":"S1c"},"NextToken":{}}}},"ListSubscriptionsByTopic":{"input":{"type":"structure","required":["TopicArn"],"members":{"TopicArn":{},"NextToken":{}}},"output":{"resultWrapper":"ListSubscriptionsByTopicResult","type":"structure","members":{"Subscriptions":{"shape":"S1c"},"NextToken":{}}}},"ListTopics":{"input":{"type":"structure","members":{"NextToken":{}}},"output":{"resultWrapper":"ListTopicsResult","type":"structure","members":{"Topics":{"type":"list","member":{"type":"structure","members":{"TopicArn":{}}}},"NextToken":{}}}},"Publish":{"input":{"type":"structure","required":["Message"],"members":{"TopicArn":{},"TargetArn":{},"Message":{},"Subject":{},"MessageStructure":{},"MessageAttributes":{"type":"map","key":{"locationName":"Name"},"value":{"locationName":"Value","type":"structure","required":["DataType"],"members":{"DataType":{},"StringValue":{},"BinaryValue":{"type":"blob"}}}}}},"output":{"resultWrapper":"PublishResult","type":"structure","members":{"MessageId":{}}}},"RemovePermission":{"input":{"type":"structure","required":["TopicArn","Label"],"members":{"TopicArn":{},"Label":{}}}},"SetEndpointAttributes":{"input":{"type":"structure","required":["EndpointArn","Attributes"],"members":{"EndpointArn":{},"Attributes":{"shape":"Sf"}}}},"SetPlatformApplicationAttributes":{"input":{"type":"structure","required":["PlatformApplicationArn","Attributes"],"members":{"PlatformApplicationArn":{},"Attributes":{"shape":"Sf"}}}},"SetSubscriptionAttributes":{"input":{"type":"structure","required":["SubscriptionArn","AttributeName"],"members":{"SubscriptionArn":{},"AttributeName":{},"AttributeValue":{}}}},"SetTopicAttributes":{"input":{"type":"structure","required":["TopicArn","AttributeName"],"members":{"TopicArn":{},"AttributeName":{},"AttributeValue":{}}}},"Subscribe":{"input":{"type":"structure","required":["TopicArn","Protocol"],"members":{"TopicArn":{},"Protocol":{},"Endpoint":{}}},"output":{"resultWrapper":"SubscribeResult","type":"structure","members":{"SubscriptionArn":{}}}},"Unsubscribe":{"input":{"type":"structure","required":["SubscriptionArn"],"members":{"SubscriptionArn":{}}}}},"shapes":{"Sf":{"type":"map","key":{},"value":{}},"S1c":{"type":"list","member":{"type":"structure","members":{"SubscriptionArn":{},"Owner":{},"Protocol":{},"Endpoint":{},"TopicArn":{}}}}},"paginators":{"ListEndpointsByPlatformApplication":{"input_token":"NextToken","output_token":"NextToken","result_key":"Endpoints"},"ListPlatformApplications":{"input_token":"NextToken","output_token":"NextToken","result_key":"PlatformApplications"},"ListSubscriptions":{"input_token":"NextToken","output_token":"NextToken","result_key":"Subscriptions"},"ListSubscriptionsByTopic":{"input_token":"NextToken","output_token":"NextToken","result_key":"Subscriptions"},"ListTopics":{"input_token":"NextToken","output_token":"NextToken","result_key":"Topics"}}});
AltAWS.SQS=AltAWS.Service.defineService("sqs");AltAWS.util.update(AltAWS.SQS.prototype,{setupRequestListeners:function e(s){s.addListener("build",this.buildEndpoint);if(s.service.config.computeChecksums){if(s.operation==="sendMessage"){s.addListener("extractData",this.verifySendMessageChecksum)}else if(s.operation==="sendMessageBatch"){s.addListener("extractData",this.verifySendMessageBatchChecksum)}else if(s.operation==="receiveMessage"){s.addListener("extractData",this.verifyReceiveMessageChecksum)}}},verifySendMessageChecksum:function s(e){if(!e.data)return;var s=e.data.MD5OfMessageBody;var a=this.params.MessageBody;var t=this.service.calculateChecksum(a);if(t!==s){var i='Got "'+e.data.MD5OfMessageBody+'", expecting "'+t+'".';this.service.throwInvalidChecksumError(e,[e.data.MessageId],i)}},verifySendMessageBatchChecksum:function a(e){if(!e.data)return;var s=this.service;var a={};var t=[];var i=[];AltAWS.util.arrayEach(e.data.Successful,function(e){a[e.Id]=e});AltAWS.util.arrayEach(this.params.Entries,function(e){if(a[e.Id]){var r=a[e.Id].MD5OfMessageBody;var n=e.MessageBody;if(!s.isChecksumValid(r,n)){t.push(e.Id);i.push(a[e.Id].MessageId)}}});if(t.length>0){s.throwInvalidChecksumError(e,i,"Invalid messages: "+t.join(", "))}},verifyReceiveMessageChecksum:function t(e){if(!e.data)return;var s=this.service;var a=[];AltAWS.util.arrayEach(e.data.Messages,function(e){var t=e.MD5OfBody;var i=e.Body;if(!s.isChecksumValid(t,i)){a.push(e.MessageId)}});if(a.length>0){s.throwInvalidChecksumError(e,a,"Invalid messages: "+a.join(", "))}},throwInvalidChecksumError:function i(e,s,a){e.error=AltAWS.util.error(new Error,{retryable:true,code:"InvalidChecksum",messageIds:s,message:e.request.operation+" returned an invalid MD5 response. "+a})},isChecksumValid:function r(e,s){return this.calculateChecksum(s)===e},calculateChecksum:function n(e){return AltAWS.util.crypto.md5(e,"hex")},buildEndpoint:function u(e){var s=e.httpRequest.params.QueueUrl;if(s){e.httpRequest.endpoint=new AltAWS.Endpoint(s);var a=e.httpRequest.endpoint.host.match(/^sqs\.(.+?)\./);if(a)e.httpRequest.region=a[1]}}});
AltAWS.Service.defineServiceApi(AltAWS.SQS, "2012-11-05", {"metadata":{"apiVersion":"2012-11-05","endpointPrefix":"sqs","serviceAbbreviation":"Amazon SQS","serviceFullName":"Amazon Simple Queue Service","signatureVersion":"v4","xmlNamespace":"http://queue.amazonaws.com/doc/2012-11-05/","protocol":"query"},"operations":{"AddPermission":{"input":{"type":"structure","required":["QueueUrl","Label","AWSAccountIds","Actions"],"members":{"QueueUrl":{},"Label":{},"AWSAccountIds":{"type":"list","member":{"locationName":"AWSAccountId"},"flattened":true},"Actions":{"type":"list","member":{"locationName":"ActionName"},"flattened":true}}}},"ChangeMessageVisibility":{"input":{"type":"structure","required":["QueueUrl","ReceiptHandle","VisibilityTimeout"],"members":{"QueueUrl":{},"ReceiptHandle":{},"VisibilityTimeout":{"type":"integer"}}}},"ChangeMessageVisibilityBatch":{"input":{"type":"structure","required":["QueueUrl","Entries"],"members":{"QueueUrl":{},"Entries":{"type":"list","member":{"locationName":"ChangeMessageVisibilityBatchRequestEntry","type":"structure","required":["Id","ReceiptHandle"],"members":{"Id":{},"ReceiptHandle":{},"VisibilityTimeout":{"type":"integer"}}},"flattened":true}}},"output":{"resultWrapper":"ChangeMessageVisibilityBatchResult","type":"structure","required":["Successful","Failed"],"members":{"Successful":{"type":"list","member":{"locationName":"ChangeMessageVisibilityBatchResultEntry","type":"structure","required":["Id"],"members":{"Id":{}}},"flattened":true},"Failed":{"shape":"Sd"}}}},"CreateQueue":{"input":{"type":"structure","required":["QueueName"],"members":{"QueueName":{},"Attributes":{"shape":"Sh","locationName":"Attribute"}}},"output":{"resultWrapper":"CreateQueueResult","type":"structure","members":{"QueueUrl":{}}}},"DeleteMessage":{"input":{"type":"structure","required":["QueueUrl","ReceiptHandle"],"members":{"QueueUrl":{},"ReceiptHandle":{}}}},"DeleteMessageBatch":{"input":{"type":"structure","required":["QueueUrl","Entries"],"members":{"QueueUrl":{},"Entries":{"type":"list","member":{"locationName":"DeleteMessageBatchRequestEntry","type":"structure","required":["Id","ReceiptHandle"],"members":{"Id":{},"ReceiptHandle":{}}},"flattened":true}}},"output":{"resultWrapper":"DeleteMessageBatchResult","type":"structure","required":["Successful","Failed"],"members":{"Successful":{"type":"list","member":{"locationName":"DeleteMessageBatchResultEntry","type":"structure","required":["Id"],"members":{"Id":{}}},"flattened":true},"Failed":{"shape":"Sd"}}}},"DeleteQueue":{"input":{"type":"structure","required":["QueueUrl"],"members":{"QueueUrl":{}}}},"GetQueueAttributes":{"input":{"type":"structure","required":["QueueUrl"],"members":{"QueueUrl":{},"AttributeNames":{"shape":"St"}}},"output":{"resultWrapper":"GetQueueAttributesResult","type":"structure","members":{"Attributes":{"shape":"Sh","locationName":"Attribute"}}}},"GetQueueUrl":{"input":{"type":"structure","required":["QueueName"],"members":{"QueueName":{},"QueueOwnerAWSAccountId":{}}},"output":{"resultWrapper":"GetQueueUrlResult","type":"structure","members":{"QueueUrl":{}}}},"ListDeadLetterSourceQueues":{"input":{"type":"structure","required":["QueueUrl"],"members":{"QueueUrl":{}}},"output":{"resultWrapper":"ListDeadLetterSourceQueuesResult","type":"structure","required":["queueUrls"],"members":{"queueUrls":{"shape":"Sz"}}}},"ListQueues":{"input":{"type":"structure","members":{"QueueNamePrefix":{}}},"output":{"resultWrapper":"ListQueuesResult","type":"structure","members":{"QueueUrls":{"shape":"Sz"}}}},"ReceiveMessage":{"input":{"type":"structure","required":["QueueUrl"],"members":{"QueueUrl":{},"AttributeNames":{"shape":"St"},"MessageAttributeNames":{"type":"list","member":{"locationName":"MessageAttributeName"},"flattened":true},"MaxNumberOfMessages":{"type":"integer"},"VisibilityTimeout":{"type":"integer"},"WaitTimeSeconds":{"type":"integer"}}},"output":{"resultWrapper":"ReceiveMessageResult","type":"structure","members":{"Messages":{"type":"list","member":{"locationName":"Message","type":"structure","members":{"MessageId":{},"ReceiptHandle":{},"MD5OfBody":{},"Body":{},"Attributes":{"shape":"Sh","locationName":"Attribute"},"MD5OfMessageAttributes":{},"MessageAttributes":{"shape":"S18","locationName":"MessageAttribute"}}},"flattened":true}}}},"RemovePermission":{"input":{"type":"structure","required":["QueueUrl","Label"],"members":{"QueueUrl":{},"Label":{}}}},"SendMessage":{"input":{"type":"structure","required":["QueueUrl","MessageBody"],"members":{"QueueUrl":{},"MessageBody":{},"DelaySeconds":{"type":"integer"},"MessageAttributes":{"shape":"S18","locationName":"MessageAttribute"}}},"output":{"resultWrapper":"SendMessageResult","type":"structure","members":{"MD5OfMessageBody":{},"MD5OfMessageAttributes":{},"MessageId":{}}}},"SendMessageBatch":{"input":{"type":"structure","required":["QueueUrl","Entries"],"members":{"QueueUrl":{},"Entries":{"type":"list","member":{"locationName":"SendMessageBatchRequestEntry","type":"structure","required":["Id","MessageBody"],"members":{"Id":{},"MessageBody":{},"DelaySeconds":{"type":"integer"},"MessageAttributes":{"shape":"S18","locationName":"MessageAttribute"}}},"flattened":true}}},"output":{"resultWrapper":"SendMessageBatchResult","type":"structure","required":["Successful","Failed"],"members":{"Successful":{"type":"list","member":{"locationName":"SendMessageBatchResultEntry","type":"structure","required":["Id","MessageId","MD5OfMessageBody"],"members":{"Id":{},"MessageId":{},"MD5OfMessageBody":{},"MD5OfMessageAttributes":{}}},"flattened":true},"Failed":{"shape":"Sd"}}}},"SetQueueAttributes":{"input":{"type":"structure","required":["QueueUrl","Attributes"],"members":{"QueueUrl":{},"Attributes":{"shape":"Sh","locationName":"Attribute"}}}}},"shapes":{"Sd":{"type":"list","member":{"locationName":"BatchResultErrorEntry","type":"structure","required":["Id","SenderFault","Code"],"members":{"Id":{},"SenderFault":{"type":"boolean"},"Code":{},"Message":{}}},"flattened":true},"Sh":{"type":"map","key":{"locationName":"Name"},"value":{"locationName":"Value"},"flattened":true,"locationName":"Attribute"},"St":{"type":"list","member":{"locationName":"AttributeName"},"flattened":true},"Sz":{"type":"list","member":{"locationName":"QueueUrl"},"flattened":true},"S18":{"type":"map","key":{"locationName":"Name"},"value":{"locationName":"Value","type":"structure","required":["DataType"],"members":{"StringValue":{},"BinaryValue":{"type":"blob"},"StringListValues":{"flattened":true,"locationName":"StringListValue","type":"list","member":{"locationName":"StringListValue"}},"BinaryListValues":{"flattened":true,"locationName":"BinaryListValue","type":"list","member":{"locationName":"BinaryListValue","type":"blob"}},"DataType":{}}},"flattened":true}},"paginators":{"ListQueues":{"result_key":"QueueUrls"}}});
AltAWS.STS=AltAWS.Service.defineService("sts");AltAWS.util.update(AltAWS.STS.prototype,{credentialsFrom:function e(t,s){if(!t)return null;if(!s)s=new AltAWS.TemporaryCredentials;s.expired=false;s.accessKeyId=t.Credentials.AccessKeyId;s.secretAccessKey=t.Credentials.SecretAccessKey;s.sessionToken=t.Credentials.SessionToken;s.expireTime=t.Credentials.Expiration;return s},assumeRoleWithWebIdentity:function t(e,s){return this.makeUnauthenticatedRequest("assumeRoleWithWebIdentity",e,s)},assumeRoleWithSAML:function s(e,t){return this.makeUnauthenticatedRequest("assumeRoleWithSAML",e,t)}});
AltAWS.Service.defineServiceApi(AltAWS.STS, "2011-06-15", {"metadata":{"apiVersion":"2011-06-15","endpointPrefix":"sts","globalEndpoint":"sts.amazonaws.com","serviceAbbreviation":"AWS STS","serviceFullName":"AWS Security Token Service","signatureVersion":"v4","xmlNamespace":"https://sts.amazonaws.com/doc/2011-06-15/","protocol":"query"},"operations":{"AssumeRole":{"input":{"type":"structure","required":["RoleArn","RoleSessionName"],"members":{"RoleArn":{},"RoleSessionName":{},"Policy":{},"DurationSeconds":{"type":"integer"},"ExternalId":{},"SerialNumber":{},"TokenCode":{}}},"output":{"resultWrapper":"AssumeRoleResult","type":"structure","members":{"Credentials":{"shape":"Sa"},"AssumedRoleUser":{"shape":"Sf"},"PackedPolicySize":{"type":"integer"}}}},"AssumeRoleWithSAML":{"input":{"type":"structure","required":["RoleArn","PrincipalArn","SAMLAssertion"],"members":{"RoleArn":{},"PrincipalArn":{},"SAMLAssertion":{},"Policy":{},"DurationSeconds":{"type":"integer"}}},"output":{"resultWrapper":"AssumeRoleWithSAMLResult","type":"structure","members":{"Credentials":{"shape":"Sa"},"AssumedRoleUser":{"shape":"Sf"},"PackedPolicySize":{"type":"integer"},"Subject":{},"SubjectType":{},"Issuer":{},"Audience":{},"NameQualifier":{}}}},"AssumeRoleWithWebIdentity":{"input":{"type":"structure","required":["RoleArn","RoleSessionName","WebIdentityToken"],"members":{"RoleArn":{},"RoleSessionName":{},"WebIdentityToken":{},"ProviderId":{},"Policy":{},"DurationSeconds":{"type":"integer"}}},"output":{"resultWrapper":"AssumeRoleWithWebIdentityResult","type":"structure","members":{"Credentials":{"shape":"Sa"},"SubjectFromWebIdentityToken":{},"AssumedRoleUser":{"shape":"Sf"},"PackedPolicySize":{"type":"integer"},"Provider":{},"Audience":{}}}},"DecodeAuthorizationMessage":{"input":{"type":"structure","required":["EncodedMessage"],"members":{"EncodedMessage":{}}},"output":{"resultWrapper":"DecodeAuthorizationMessageResult","type":"structure","members":{"DecodedMessage":{}}}},"GetFederationToken":{"input":{"type":"structure","required":["Name"],"members":{"Name":{},"Policy":{},"DurationSeconds":{"type":"integer"}}},"output":{"resultWrapper":"GetFederationTokenResult","type":"structure","members":{"Credentials":{"shape":"Sa"},"FederatedUser":{"type":"structure","required":["FederatedUserId","Arn"],"members":{"FederatedUserId":{},"Arn":{}}},"PackedPolicySize":{"type":"integer"}}}},"GetSessionToken":{"input":{"type":"structure","members":{"DurationSeconds":{"type":"integer"},"SerialNumber":{},"TokenCode":{}}},"output":{"resultWrapper":"GetSessionTokenResult","type":"structure","members":{"Credentials":{"shape":"Sa"}}}}},"shapes":{"Sa":{"type":"structure","required":["AccessKeyId","SecretAccessKey","SessionToken","Expiration"],"members":{"AccessKeyId":{},"SecretAccessKey":{},"SessionToken":{},"Expiration":{"type":"timestamp"}}},"Sf":{"type":"structure","required":["AssumedRoleId","Arn"],"members":{"AssumedRoleId":{},"Arn":{}}}}});

/*!
 * jQuery JavaScript Library v2.1.4
 * http://jquery.com/
 *
 * Includes Sizzle.js
 * http://sizzlejs.com/
 *
 * Copyright 2005, 2014 jQuery Foundation, Inc. and other contributors
 * Released under the MIT license
 * http://jquery.org/license
 *
 * Date: 2015-04-28T16:01Z
 */

(function( global, factory ) {

	if ( typeof module === "object" && typeof module.exports === "object" ) {
		// For CommonJS and CommonJS-like environments where a proper `window`
		// is present, execute the factory and get jQuery.
		// For environments that do not have a `window` with a `document`
		// (such as Node.js), expose a factory as module.exports.
		// This accentuates the need for the creation of a real `window`.
		// e.g. var jQuery = require("jquery")(window);
		// See ticket #14549 for more info.
		module.exports = global.document ?
			factory( global, true ) :
			function( w ) {
				if ( !w.document ) {
					throw new Error( "jQuery requires a window with a document" );
				}
				return factory( w );
			};
	} else {
		factory( global );
	}

// Pass this if window is not defined yet
}(typeof window !== "undefined" ? window : this, function( window, noGlobal ) {

// Support: Firefox 18+
// Can't be in strict mode, several libs including ASP.NET trace
// the stack via arguments.caller.callee and Firefox dies if
// you try to trace through "use strict" call chains. (#13335)
//

var arr = [];

var slice = arr.slice;

var concat = arr.concat;

var push = arr.push;

var indexOf = arr.indexOf;

var class2type = {};

var toString = class2type.toString;

var hasOwn = class2type.hasOwnProperty;

var support = {};



var
	// Use the correct document accordingly with window argument (sandbox)
	document = window.document,

	version = "2.1.4",

	// Define a local copy of jQuery
	jQuery = function( selector, context ) {
		// The jQuery object is actually just the init constructor 'enhanced'
		// Need init if jQuery is called (just allow error to be thrown if not included)
		return new jQuery.fn.init( selector, context );
	},

	// Support: Android<4.1
	// Make sure we trim BOM and NBSP
	rtrim = /^[\s\uFEFF\xA0]+|[\s\uFEFF\xA0]+$/g,

	// Matches dashed string for camelizing
	rmsPrefix = /^-ms-/,
	rdashAlpha = /-([\da-z])/gi,

	// Used by jQuery.camelCase as callback to replace()
	fcamelCase = function( all, letter ) {
		return letter.toUpperCase();
	};

jQuery.fn = jQuery.prototype = {
	// The current version of jQuery being used
	jquery: version,

	constructor: jQuery,

	// Start with an empty selector
	selector: "",

	// The default length of a jQuery object is 0
	length: 0,

	toArray: function() {
		return slice.call( this );
	},

	// Get the Nth element in the matched element set OR
	// Get the whole matched element set as a clean array
	get: function( num ) {
		return num != null ?

			// Return just the one element from the set
			( num < 0 ? this[ num + this.length ] : this[ num ] ) :

			// Return all the elements in a clean array
			slice.call( this );
	},

	// Take an array of elements and push it onto the stack
	// (returning the new matched element set)
	pushStack: function( elems ) {

		// Build a new jQuery matched element set
		var ret = jQuery.merge( this.constructor(), elems );

		// Add the old object onto the stack (as a reference)
		ret.prevObject = this;
		ret.context = this.context;

		// Return the newly-formed element set
		return ret;
	},

	// Execute a callback for every element in the matched set.
	// (You can seed the arguments with an array of args, but this is
	// only used internally.)
	each: function( callback, args ) {
		return jQuery.each( this, callback, args );
	},

	map: function( callback ) {
		return this.pushStack( jQuery.map(this, function( elem, i ) {
			return callback.call( elem, i, elem );
		}));
	},

	slice: function() {
		return this.pushStack( slice.apply( this, arguments ) );
	},

	first: function() {
		return this.eq( 0 );
	},

	last: function() {
		return this.eq( -1 );
	},

	eq: function( i ) {
		var len = this.length,
			j = +i + ( i < 0 ? len : 0 );
		return this.pushStack( j >= 0 && j < len ? [ this[j] ] : [] );
	},

	end: function() {
		return this.prevObject || this.constructor(null);
	},

	// For internal use only.
	// Behaves like an Array's method, not like a jQuery method.
	push: push,
	sort: arr.sort,
	splice: arr.splice
};

jQuery.extend = jQuery.fn.extend = function() {
	var options, name, src, copy, copyIsArray, clone,
		target = arguments[0] || {},
		i = 1,
		length = arguments.length,
		deep = false;

	// Handle a deep copy situation
	if ( typeof target === "boolean" ) {
		deep = target;

		// Skip the boolean and the target
		target = arguments[ i ] || {};
		i++;
	}

	// Handle case when target is a string or something (possible in deep copy)
	if ( typeof target !== "object" && !jQuery.isFunction(target) ) {
		target = {};
	}

	// Extend jQuery itself if only one argument is passed
	if ( i === length ) {
		target = this;
		i--;
	}

	for ( ; i < length; i++ ) {
		// Only deal with non-null/undefined values
		if ( (options = arguments[ i ]) != null ) {
			// Extend the base object
			for ( name in options ) {
				src = target[ name ];
				copy = options[ name ];

				// Prevent never-ending loop
				if ( target === copy ) {
					continue;
				}

				// Recurse if we're merging plain objects or arrays
				if ( deep && copy && ( jQuery.isPlainObject(copy) || (copyIsArray = jQuery.isArray(copy)) ) ) {
					if ( copyIsArray ) {
						copyIsArray = false;
						clone = src && jQuery.isArray(src) ? src : [];

					} else {
						clone = src && jQuery.isPlainObject(src) ? src : {};
					}

					// Never move original objects, clone them
					target[ name ] = jQuery.extend( deep, clone, copy );

				// Don't bring in undefined values
				} else if ( copy !== undefined ) {
					target[ name ] = copy;
				}
			}
		}
	}

	// Return the modified object
	return target;
};

jQuery.extend({
	// Unique for each copy of jQuery on the page
	expando: "jQuery" + ( version + Math.random() ).replace( /\D/g, "" ),

	// Assume jQuery is ready without the ready module
	isReady: true,

	error: function( msg ) {
		throw new Error( msg );
	},

	noop: function() {},

	isFunction: function( obj ) {
		return jQuery.type(obj) === "function";
	},

	isArray: Array.isArray,

	isWindow: function( obj ) {
		return obj != null && obj === obj.window;
	},

	isNumeric: function( obj ) {
		// parseFloat NaNs numeric-cast false positives (null|true|false|"")
		// ...but misinterprets leading-number strings, particularly hex literals ("0x...")
		// subtraction forces infinities to NaN
		// adding 1 corrects loss of precision from parseFloat (#15100)
		return !jQuery.isArray( obj ) && (obj - parseFloat( obj ) + 1) >= 0;
	},

	isPlainObject: function( obj ) {
		// Not plain objects:
		// - Any object or value whose internal [[Class]] property is not "[object Object]"
		// - DOM nodes
		// - window
		if ( jQuery.type( obj ) !== "object" || obj.nodeType || jQuery.isWindow( obj ) ) {
			return false;
		}

		if ( obj.constructor &&
				!hasOwn.call( obj.constructor.prototype, "isPrototypeOf" ) ) {
			return false;
		}

		// If the function hasn't returned already, we're confident that
		// |obj| is a plain object, created by {} or constructed with new Object
		return true;
	},

	isEmptyObject: function( obj ) {
		var name;
		for ( name in obj ) {
			return false;
		}
		return true;
	},

	type: function( obj ) {
		if ( obj == null ) {
			return obj + "";
		}
		// Support: Android<4.0, iOS<6 (functionish RegExp)
		return typeof obj === "object" || typeof obj === "function" ?
			class2type[ toString.call(obj) ] || "object" :
			typeof obj;
	},

	// Evaluates a script in a global context
	globalEval: function( code ) {
		var script,
			indirect = eval;

		code = jQuery.trim( code );

		if ( code ) {
			// If the code includes a valid, prologue position
			// strict mode pragma, execute code by injecting a
			// script tag into the document.
			if ( code.indexOf("use strict") === 1 ) {
				script = document.createElement("script");
				script.text = code;
				document.head.appendChild( script ).parentNode.removeChild( script );
			} else {
			// Otherwise, avoid the DOM node creation, insertion
			// and removal by using an indirect global eval
				indirect( code );
			}
		}
	},

	// Convert dashed to camelCase; used by the css and data modules
	// Support: IE9-11+
	// Microsoft forgot to hump their vendor prefix (#9572)
	camelCase: function( string ) {
		return string.replace( rmsPrefix, "ms-" ).replace( rdashAlpha, fcamelCase );
	},

	nodeName: function( elem, name ) {
		return elem.nodeName && elem.nodeName.toLowerCase() === name.toLowerCase();
	},

	// args is for internal usage only
	each: function( obj, callback, args ) {
		var value,
			i = 0,
			length = obj.length,
			isArray = isArraylike( obj );

		if ( args ) {
			if ( isArray ) {
				for ( ; i < length; i++ ) {
					value = callback.apply( obj[ i ], args );

					if ( value === false ) {
						break;
					}
				}
			} else {
				for ( i in obj ) {
					value = callback.apply( obj[ i ], args );

					if ( value === false ) {
						break;
					}
				}
			}

		// A special, fast, case for the most common use of each
		} else {
			if ( isArray ) {
				for ( ; i < length; i++ ) {
					value = callback.call( obj[ i ], i, obj[ i ] );

					if ( value === false ) {
						break;
					}
				}
			} else {
				for ( i in obj ) {
					value = callback.call( obj[ i ], i, obj[ i ] );

					if ( value === false ) {
						break;
					}
				}
			}
		}

		return obj;
	},

	// Support: Android<4.1
	trim: function( text ) {
		return text == null ?
			"" :
			( text + "" ).replace( rtrim, "" );
	},

	// results is for internal usage only
	makeArray: function( arr, results ) {
		var ret = results || [];

		if ( arr != null ) {
			if ( isArraylike( Object(arr) ) ) {
				jQuery.merge( ret,
					typeof arr === "string" ?
					[ arr ] : arr
				);
			} else {
				push.call( ret, arr );
			}
		}

		return ret;
	},

	inArray: function( elem, arr, i ) {
		return arr == null ? -1 : indexOf.call( arr, elem, i );
	},

	merge: function( first, second ) {
		var len = +second.length,
			j = 0,
			i = first.length;

		for ( ; j < len; j++ ) {
			first[ i++ ] = second[ j ];
		}

		first.length = i;

		return first;
	},

	grep: function( elems, callback, invert ) {
		var callbackInverse,
			matches = [],
			i = 0,
			length = elems.length,
			callbackExpect = !invert;

		// Go through the array, only saving the items
		// that pass the validator function
		for ( ; i < length; i++ ) {
			callbackInverse = !callback( elems[ i ], i );
			if ( callbackInverse !== callbackExpect ) {
				matches.push( elems[ i ] );
			}
		}

		return matches;
	},

	// arg is for internal usage only
	map: function( elems, callback, arg ) {
		var value,
			i = 0,
			length = elems.length,
			isArray = isArraylike( elems ),
			ret = [];

		// Go through the array, translating each of the items to their new values
		if ( isArray ) {
			for ( ; i < length; i++ ) {
				value = callback( elems[ i ], i, arg );

				if ( value != null ) {
					ret.push( value );
				}
			}

		// Go through every key on the object,
		} else {
			for ( i in elems ) {
				value = callback( elems[ i ], i, arg );

				if ( value != null ) {
					ret.push( value );
				}
			}
		}

		// Flatten any nested arrays
		return concat.apply( [], ret );
	},

	// A global GUID counter for objects
	guid: 1,

	// Bind a function to a context, optionally partially applying any
	// arguments.
	proxy: function( fn, context ) {
		var tmp, args, proxy;

		if ( typeof context === "string" ) {
			tmp = fn[ context ];
			context = fn;
			fn = tmp;
		}

		// Quick check to determine if target is callable, in the spec
		// this throws a TypeError, but we will just return undefined.
		if ( !jQuery.isFunction( fn ) ) {
			return undefined;
		}

		// Simulated bind
		args = slice.call( arguments, 2 );
		proxy = function() {
			return fn.apply( context || this, args.concat( slice.call( arguments ) ) );
		};

		// Set the guid of unique handler to the same of original handler, so it can be removed
		proxy.guid = fn.guid = fn.guid || jQuery.guid++;

		return proxy;
	},

	now: Date.now,

	// jQuery.support is not used in Core but other projects attach their
	// properties to it so it needs to exist.
	support: support
});

// Populate the class2type map
jQuery.each("Boolean Number String Function Array Date RegExp Object Error".split(" "), function(i, name) {
	class2type[ "[object " + name + "]" ] = name.toLowerCase();
});

function isArraylike( obj ) {

	// Support: iOS 8.2 (not reproducible in simulator)
	// `in` check used to prevent JIT error (gh-2145)
	// hasOwn isn't used here due to false negatives
	// regarding Nodelist length in IE
	var length = "length" in obj && obj.length,
		type = jQuery.type( obj );

	if ( type === "function" || jQuery.isWindow( obj ) ) {
		return false;
	}

	if ( obj.nodeType === 1 && length ) {
		return true;
	}

	return type === "array" || length === 0 ||
		typeof length === "number" && length > 0 && ( length - 1 ) in obj;
}
var Sizzle =
/*!
 * Sizzle CSS Selector Engine v2.2.0-pre
 * http://sizzlejs.com/
 *
 * Copyright 2008, 2014 jQuery Foundation, Inc. and other contributors
 * Released under the MIT license
 * http://jquery.org/license
 *
 * Date: 2014-12-16
 */
(function( window ) {

var i,
	support,
	Expr,
	getText,
	isXML,
	tokenize,
	compile,
	select,
	outermostContext,
	sortInput,
	hasDuplicate,

	// Local document vars
	setDocument,
	document,
	docElem,
	documentIsHTML,
	rbuggyQSA,
	rbuggyMatches,
	matches,
	contains,

	// Instance-specific data
	expando = "sizzle" + 1 * new Date(),
	preferredDoc = window.document,
	dirruns = 0,
	done = 0,
	classCache = createCache(),
	tokenCache = createCache(),
	compilerCache = createCache(),
	sortOrder = function( a, b ) {
		if ( a === b ) {
			hasDuplicate = true;
		}
		return 0;
	},

	// General-purpose constants
	MAX_NEGATIVE = 1 << 31,

	// Instance methods
	hasOwn = ({}).hasOwnProperty,
	arr = [],
	pop = arr.pop,
	push_native = arr.push,
	push = arr.push,
	slice = arr.slice,
	// Use a stripped-down indexOf as it's faster than native
	// http://jsperf.com/thor-indexof-vs-for/5
	indexOf = function( list, elem ) {
		var i = 0,
			len = list.length;
		for ( ; i < len; i++ ) {
			if ( list[i] === elem ) {
				return i;
			}
		}
		return -1;
	},

	booleans = "checked|selected|async|autofocus|autoplay|controls|defer|disabled|hidden|ismap|loop|multiple|open|readonly|required|scoped",

	// Regular expressions

	// Whitespace characters http://www.w3.org/TR/css3-selectors/#whitespace
	whitespace = "[\\x20\\t\\r\\n\\f]",
	// http://www.w3.org/TR/css3-syntax/#characters
	characterEncoding = "(?:\\\\.|[\\w-]|[^\\x00-\\xa0])+",

	// Loosely modeled on CSS identifier characters
	// An unquoted value should be a CSS identifier http://www.w3.org/TR/css3-selectors/#attribute-selectors
	// Proper syntax: http://www.w3.org/TR/CSS21/syndata.html#value-def-identifier
	identifier = characterEncoding.replace( "w", "w#" ),

	// Attribute selectors: http://www.w3.org/TR/selectors/#attribute-selectors
	attributes = "\\[" + whitespace + "*(" + characterEncoding + ")(?:" + whitespace +
		// Operator (capture 2)
		"*([*^$|!~]?=)" + whitespace +
		// "Attribute values must be CSS identifiers [capture 5] or strings [capture 3 or capture 4]"
		"*(?:'((?:\\\\.|[^\\\\'])*)'|\"((?:\\\\.|[^\\\\\"])*)\"|(" + identifier + "))|)" + whitespace +
		"*\\]",

	pseudos = ":(" + characterEncoding + ")(?:\\((" +
		// To reduce the number of selectors needing tokenize in the preFilter, prefer arguments:
		// 1. quoted (capture 3; capture 4 or capture 5)
		"('((?:\\\\.|[^\\\\'])*)'|\"((?:\\\\.|[^\\\\\"])*)\")|" +
		// 2. simple (capture 6)
		"((?:\\\\.|[^\\\\()[\\]]|" + attributes + ")*)|" +
		// 3. anything else (capture 2)
		".*" +
		")\\)|)",

	// Leading and non-escaped trailing whitespace, capturing some non-whitespace characters preceding the latter
	rwhitespace = new RegExp( whitespace + "+", "g" ),
	rtrim = new RegExp( "^" + whitespace + "+|((?:^|[^\\\\])(?:\\\\.)*)" + whitespace + "+$", "g" ),

	rcomma = new RegExp( "^" + whitespace + "*," + whitespace + "*" ),
	rcombinators = new RegExp( "^" + whitespace + "*([>+~]|" + whitespace + ")" + whitespace + "*" ),

	rattributeQuotes = new RegExp( "=" + whitespace + "*([^\\]'\"]*?)" + whitespace + "*\\]", "g" ),

	rpseudo = new RegExp( pseudos ),
	ridentifier = new RegExp( "^" + identifier + "$" ),

	matchExpr = {
		"ID": new RegExp( "^#(" + characterEncoding + ")" ),
		"CLASS": new RegExp( "^\\.(" + characterEncoding + ")" ),
		"TAG": new RegExp( "^(" + characterEncoding.replace( "w", "w*" ) + ")" ),
		"ATTR": new RegExp( "^" + attributes ),
		"PSEUDO": new RegExp( "^" + pseudos ),
		"CHILD": new RegExp( "^:(only|first|last|nth|nth-last)-(child|of-type)(?:\\(" + whitespace +
			"*(even|odd|(([+-]|)(\\d*)n|)" + whitespace + "*(?:([+-]|)" + whitespace +
			"*(\\d+)|))" + whitespace + "*\\)|)", "i" ),
		"bool": new RegExp( "^(?:" + booleans + ")$", "i" ),
		// For use in libraries implementing .is()
		// We use this for POS matching in `select`
		"needsContext": new RegExp( "^" + whitespace + "*[>+~]|:(even|odd|eq|gt|lt|nth|first|last)(?:\\(" +
			whitespace + "*((?:-\\d)?\\d*)" + whitespace + "*\\)|)(?=[^-]|$)", "i" )
	},

	rinputs = /^(?:input|select|textarea|button)$/i,
	rheader = /^h\d$/i,

	rnative = /^[^{]+\{\s*\[native \w/,

	// Easily-parseable/retrievable ID or TAG or CLASS selectors
	rquickExpr = /^(?:#([\w-]+)|(\w+)|\.([\w-]+))$/,

	rsibling = /[+~]/,
	rescape = /'|\\/g,

	// CSS escapes http://www.w3.org/TR/CSS21/syndata.html#escaped-characters
	runescape = new RegExp( "\\\\([\\da-f]{1,6}" + whitespace + "?|(" + whitespace + ")|.)", "ig" ),
	funescape = function( _, escaped, escapedWhitespace ) {
		var high = "0x" + escaped - 0x10000;
		// NaN means non-codepoint
		// Support: Firefox<24
		// Workaround erroneous numeric interpretation of +"0x"
		return high !== high || escapedWhitespace ?
			escaped :
			high < 0 ?
				// BMP codepoint
				String.fromCharCode( high + 0x10000 ) :
				// Supplemental Plane codepoint (surrogate pair)
				String.fromCharCode( high >> 10 | 0xD800, high & 0x3FF | 0xDC00 );
	},

	// Used for iframes
	// See setDocument()
	// Removing the function wrapper causes a "Permission Denied"
	// error in IE
	unloadHandler = function() {
		setDocument();
	};

// Optimize for push.apply( _, NodeList )
try {
	push.apply(
		(arr = slice.call( preferredDoc.childNodes )),
		preferredDoc.childNodes
	);
	// Support: Android<4.0
	// Detect silently failing push.apply
	arr[ preferredDoc.childNodes.length ].nodeType;
} catch ( e ) {
	push = { apply: arr.length ?

		// Leverage slice if possible
		function( target, els ) {
			push_native.apply( target, slice.call(els) );
		} :

		// Support: IE<9
		// Otherwise append directly
		function( target, els ) {
			var j = target.length,
				i = 0;
			// Can't trust NodeList.length
			while ( (target[j++] = els[i++]) ) {}
			target.length = j - 1;
		}
	};
}

function Sizzle( selector, context, results, seed ) {
	var match, elem, m, nodeType,
		// QSA vars
		i, groups, old, nid, newContext, newSelector;

	if ( ( context ? context.ownerDocument || context : preferredDoc ) !== document ) {
		setDocument( context );
	}

	context = context || document;
	results = results || [];
	nodeType = context.nodeType;

	if ( typeof selector !== "string" || !selector ||
		nodeType !== 1 && nodeType !== 9 && nodeType !== 11 ) {

		return results;
	}

	if ( !seed && documentIsHTML ) {

		// Try to shortcut find operations when possible (e.g., not under DocumentFragment)
		if ( nodeType !== 11 && (match = rquickExpr.exec( selector )) ) {
			// Speed-up: Sizzle("#ID")
			if ( (m = match[1]) ) {
				if ( nodeType === 9 ) {
					elem = context.getElementById( m );
					// Check parentNode to catch when Blackberry 4.6 returns
					// nodes that are no longer in the document (jQuery #6963)
					if ( elem && elem.parentNode ) {
						// Handle the case where IE, Opera, and Webkit return items
						// by name instead of ID
						if ( elem.id === m ) {
							results.push( elem );
							return results;
						}
					} else {
						return results;
					}
				} else {
					// Context is not a document
					if ( context.ownerDocument && (elem = context.ownerDocument.getElementById( m )) &&
						contains( context, elem ) && elem.id === m ) {
						results.push( elem );
						return results;
					}
				}

			// Speed-up: Sizzle("TAG")
			} else if ( match[2] ) {
				push.apply( results, context.getElementsByTagName( selector ) );
				return results;

			// Speed-up: Sizzle(".CLASS")
			} else if ( (m = match[3]) && support.getElementsByClassName ) {
				push.apply( results, context.getElementsByClassName( m ) );
				return results;
			}
		}

		// QSA path
		if ( support.qsa && (!rbuggyQSA || !rbuggyQSA.test( selector )) ) {
			nid = old = expando;
			newContext = context;
			newSelector = nodeType !== 1 && selector;

			// qSA works strangely on Element-rooted queries
			// We can work around this by specifying an extra ID on the root
			// and working up from there (Thanks to Andrew Dupont for the technique)
			// IE 8 doesn't work on object elements
			if ( nodeType === 1 && context.nodeName.toLowerCase() !== "object" ) {
				groups = tokenize( selector );

				if ( (old = context.getAttribute("id")) ) {
					nid = old.replace( rescape, "\\$&" );
				} else {
					context.setAttribute( "id", nid );
				}
				nid = "[id='" + nid + "'] ";

				i = groups.length;
				while ( i-- ) {
					groups[i] = nid + toSelector( groups[i] );
				}
				newContext = rsibling.test( selector ) && testContext( context.parentNode ) || context;
				newSelector = groups.join(",");
			}

			if ( newSelector ) {
				try {
					push.apply( results,
						newContext.querySelectorAll( newSelector )
					);
					return results;
				} catch(qsaError) {
				} finally {
					if ( !old ) {
						context.removeAttribute("id");
					}
				}
			}
		}
	}

	// All others
	return select( selector.replace( rtrim, "$1" ), context, results, seed );
}

/**
 * Create key-value caches of limited size
 * @returns {Function(string, Object)} Returns the Object data after storing it on itself with
 *	property name the (space-suffixed) string and (if the cache is larger than Expr.cacheLength)
 *	deleting the oldest entry
 */
function createCache() {
	var keys = [];

	function cache( key, value ) {
		// Use (key + " ") to avoid collision with native prototype properties (see Issue #157)
		if ( keys.push( key + " " ) > Expr.cacheLength ) {
			// Only keep the most recent entries
			delete cache[ keys.shift() ];
		}
		return (cache[ key + " " ] = value);
	}
	return cache;
}

/**
 * Mark a function for special use by Sizzle
 * @param {Function} fn The function to mark
 */
function markFunction( fn ) {
	fn[ expando ] = true;
	return fn;
}

/**
 * Support testing using an element
 * @param {Function} fn Passed the created div and expects a boolean result
 */
function assert( fn ) {
	var div = document.createElement("div");

	try {
		return !!fn( div );
	} catch (e) {
		return false;
	} finally {
		// Remove from its parent by default
		if ( div.parentNode ) {
			div.parentNode.removeChild( div );
		}
		// release memory in IE
		div = null;
	}
}

/**
 * Adds the same handler for all of the specified attrs
 * @param {String} attrs Pipe-separated list of attributes
 * @param {Function} handler The method that will be applied
 */
function addHandle( attrs, handler ) {
	var arr = attrs.split("|"),
		i = attrs.length;

	while ( i-- ) {
		Expr.attrHandle[ arr[i] ] = handler;
	}
}

/**
 * Checks document order of two siblings
 * @param {Element} a
 * @param {Element} b
 * @returns {Number} Returns less than 0 if a precedes b, greater than 0 if a follows b
 */
function siblingCheck( a, b ) {
	var cur = b && a,
		diff = cur && a.nodeType === 1 && b.nodeType === 1 &&
			( ~b.sourceIndex || MAX_NEGATIVE ) -
			( ~a.sourceIndex || MAX_NEGATIVE );

	// Use IE sourceIndex if available on both nodes
	if ( diff ) {
		return diff;
	}

	// Check if b follows a
	if ( cur ) {
		while ( (cur = cur.nextSibling) ) {
			if ( cur === b ) {
				return -1;
			}
		}
	}

	return a ? 1 : -1;
}

/**
 * Returns a function to use in pseudos for input types
 * @param {String} type
 */
function createInputPseudo( type ) {
	return function( elem ) {
		var name = elem.nodeName.toLowerCase();
		return name === "input" && elem.type === type;
	};
}

/**
 * Returns a function to use in pseudos for buttons
 * @param {String} type
 */
function createButtonPseudo( type ) {
	return function( elem ) {
		var name = elem.nodeName.toLowerCase();
		return (name === "input" || name === "button") && elem.type === type;
	};
}

/**
 * Returns a function to use in pseudos for positionals
 * @param {Function} fn
 */
function createPositionalPseudo( fn ) {
	return markFunction(function( argument ) {
		argument = +argument;
		return markFunction(function( seed, matches ) {
			var j,
				matchIndexes = fn( [], seed.length, argument ),
				i = matchIndexes.length;

			// Match elements found at the specified indexes
			while ( i-- ) {
				if ( seed[ (j = matchIndexes[i]) ] ) {
					seed[j] = !(matches[j] = seed[j]);
				}
			}
		});
	});
}

/**
 * Checks a node for validity as a Sizzle context
 * @param {Element|Object=} context
 * @returns {Element|Object|Boolean} The input node if acceptable, otherwise a falsy value
 */
function testContext( context ) {
	return context && typeof context.getElementsByTagName !== "undefined" && context;
}

// Expose support vars for convenience
support = Sizzle.support = {};

/**
 * Detects XML nodes
 * @param {Element|Object} elem An element or a document
 * @returns {Boolean} True iff elem is a non-HTML XML node
 */
isXML = Sizzle.isXML = function( elem ) {
	// documentElement is verified for cases where it doesn't yet exist
	// (such as loading iframes in IE - #4833)
	var documentElement = elem && (elem.ownerDocument || elem).documentElement;
	return documentElement ? documentElement.nodeName !== "HTML" : false;
};

/**
 * Sets document-related variables once based on the current document
 * @param {Element|Object} [doc] An element or document object to use to set the document
 * @returns {Object} Returns the current document
 */
setDocument = Sizzle.setDocument = function( node ) {
	var hasCompare, parent,
		doc = node ? node.ownerDocument || node : preferredDoc;

	// If no document and documentElement is available, return
	if ( doc === document || doc.nodeType !== 9 || !doc.documentElement ) {
		return document;
	}

	// Set our document
	document = doc;
	docElem = doc.documentElement;
	parent = doc.defaultView;

	// Support: IE>8
	// If iframe document is assigned to "document" variable and if iframe has been reloaded,
	// IE will throw "permission denied" error when accessing "document" variable, see jQuery #13936
	// IE6-8 do not support the defaultView property so parent will be undefined
	if ( parent && parent !== parent.top ) {
		// IE11 does not have attachEvent, so all must suffer
		if ( parent.addEventListener ) {
			parent.addEventListener( "unload", unloadHandler, false );
		} else if ( parent.attachEvent ) {
			parent.attachEvent( "onunload", unloadHandler );
		}
	}

	/* Support tests
	---------------------------------------------------------------------- */
	documentIsHTML = !isXML( doc );

	/* Attributes
	---------------------------------------------------------------------- */

	// Support: IE<8
	// Verify that getAttribute really returns attributes and not properties
	// (excepting IE8 booleans)
	support.attributes = assert(function( div ) {
		div.className = "i";
		return !div.getAttribute("className");
	});

	/* getElement(s)By*
	---------------------------------------------------------------------- */

	// Check if getElementsByTagName("*") returns only elements
	support.getElementsByTagName = assert(function( div ) {
		div.appendChild( doc.createComment("") );
		return !div.getElementsByTagName("*").length;
	});

	// Support: IE<9
	support.getElementsByClassName = rnative.test( doc.getElementsByClassName );

	// Support: IE<10
	// Check if getElementById returns elements by name
	// The broken getElementById methods don't pick up programatically-set names,
	// so use a roundabout getElementsByName test
	support.getById = assert(function( div ) {
		docElem.appendChild( div ).id = expando;
		return !doc.getElementsByName || !doc.getElementsByName( expando ).length;
	});

	// ID find and filter
	if ( support.getById ) {
		Expr.find["ID"] = function( id, context ) {
			if ( typeof context.getElementById !== "undefined" && documentIsHTML ) {
				var m = context.getElementById( id );
				// Check parentNode to catch when Blackberry 4.6 returns
				// nodes that are no longer in the document #6963
				return m && m.parentNode ? [ m ] : [];
			}
		};
		Expr.filter["ID"] = function( id ) {
			var attrId = id.replace( runescape, funescape );
			return function( elem ) {
				return elem.getAttribute("id") === attrId;
			};
		};
	} else {
		// Support: IE6/7
		// getElementById is not reliable as a find shortcut
		delete Expr.find["ID"];

		Expr.filter["ID"] =  function( id ) {
			var attrId = id.replace( runescape, funescape );
			return function( elem ) {
				var node = typeof elem.getAttributeNode !== "undefined" && elem.getAttributeNode("id");
				return node && node.value === attrId;
			};
		};
	}

	// Tag
	Expr.find["TAG"] = support.getElementsByTagName ?
		function( tag, context ) {
			if ( typeof context.getElementsByTagName !== "undefined" ) {
				return context.getElementsByTagName( tag );

			// DocumentFragment nodes don't have gEBTN
			} else if ( support.qsa ) {
				return context.querySelectorAll( tag );
			}
		} :

		function( tag, context ) {
			var elem,
				tmp = [],
				i = 0,
				// By happy coincidence, a (broken) gEBTN appears on DocumentFragment nodes too
				results = context.getElementsByTagName( tag );

			// Filter out possible comments
			if ( tag === "*" ) {
				while ( (elem = results[i++]) ) {
					if ( elem.nodeType === 1 ) {
						tmp.push( elem );
					}
				}

				return tmp;
			}
			return results;
		};

	// Class
	Expr.find["CLASS"] = support.getElementsByClassName && function( className, context ) {
		if ( documentIsHTML ) {
			return context.getElementsByClassName( className );
		}
	};

	/* QSA/matchesSelector
	---------------------------------------------------------------------- */

	// QSA and matchesSelector support

	// matchesSelector(:active) reports false when true (IE9/Opera 11.5)
	rbuggyMatches = [];

	// qSa(:focus) reports false when true (Chrome 21)
	// We allow this because of a bug in IE8/9 that throws an error
	// whenever `document.activeElement` is accessed on an iframe
	// So, we allow :focus to pass through QSA all the time to avoid the IE error
	// See http://bugs.jquery.com/ticket/13378
	rbuggyQSA = [];

	if ( (support.qsa = rnative.test( doc.querySelectorAll )) ) {
		// Build QSA regex
		// Regex strategy adopted from Diego Perini
		assert(function( div ) {
			// Select is set to empty string on purpose
			// This is to test IE's treatment of not explicitly
			// setting a boolean content attribute,
			// since its presence should be enough
			// http://bugs.jquery.com/ticket/12359
			docElem.appendChild( div ).innerHTML = "<a id='" + expando + "'></a>" +
				"<select id='" + expando + "-\f]' msallowcapture=''>" +
				"<option selected=''></option></select>";

			// Support: IE8, Opera 11-12.16
			// Nothing should be selected when empty strings follow ^= or $= or *=
			// The test attribute must be unknown in Opera but "safe" for WinRT
			// http://msdn.microsoft.com/en-us/library/ie/hh465388.aspx#attribute_section
			if ( div.querySelectorAll("[msallowcapture^='']").length ) {
				rbuggyQSA.push( "[*^$]=" + whitespace + "*(?:''|\"\")" );
			}

			// Support: IE8
			// Boolean attributes and "value" are not treated correctly
			if ( !div.querySelectorAll("[selected]").length ) {
				rbuggyQSA.push( "\\[" + whitespace + "*(?:value|" + booleans + ")" );
			}

			// Support: Chrome<29, Android<4.2+, Safari<7.0+, iOS<7.0+, PhantomJS<1.9.7+
			if ( !div.querySelectorAll( "[id~=" + expando + "-]" ).length ) {
				rbuggyQSA.push("~=");
			}

			// Webkit/Opera - :checked should return selected option elements
			// http://www.w3.org/TR/2011/REC-css3-selectors-20110929/#checked
			// IE8 throws error here and will not see later tests
			if ( !div.querySelectorAll(":checked").length ) {
				rbuggyQSA.push(":checked");
			}

			// Support: Safari 8+, iOS 8+
			// https://bugs.webkit.org/show_bug.cgi?id=136851
			// In-page `selector#id sibing-combinator selector` fails
			if ( !div.querySelectorAll( "a#" + expando + "+*" ).length ) {
				rbuggyQSA.push(".#.+[+~]");
			}
		});

		assert(function( div ) {
			// Support: Windows 8 Native Apps
			// The type and name attributes are restricted during .innerHTML assignment
			var input = doc.createElement("input");
			input.setAttribute( "type", "hidden" );
			div.appendChild( input ).setAttribute( "name", "D" );

			// Support: IE8
			// Enforce case-sensitivity of name attribute
			if ( div.querySelectorAll("[name=d]").length ) {
				rbuggyQSA.push( "name" + whitespace + "*[*^$|!~]?=" );
			}

			// FF 3.5 - :enabled/:disabled and hidden elements (hidden elements are still enabled)
			// IE8 throws error here and will not see later tests
			if ( !div.querySelectorAll(":enabled").length ) {
				rbuggyQSA.push( ":enabled", ":disabled" );
			}

			// Opera 10-11 does not throw on post-comma invalid pseudos
			div.querySelectorAll("*,:x");
			rbuggyQSA.push(",.*:");
		});
	}

	if ( (support.matchesSelector = rnative.test( (matches = docElem.matches ||
		docElem.webkitMatchesSelector ||
		docElem.mozMatchesSelector ||
		docElem.oMatchesSelector ||
		docElem.msMatchesSelector) )) ) {

		assert(function( div ) {
			// Check to see if it's possible to do matchesSelector
			// on a disconnected node (IE 9)
			support.disconnectedMatch = matches.call( div, "div" );

			// This should fail with an exception
			// Gecko does not error, returns false instead
			matches.call( div, "[s!='']:x" );
			rbuggyMatches.push( "!=", pseudos );
		});
	}

	rbuggyQSA = rbuggyQSA.length && new RegExp( rbuggyQSA.join("|") );
	rbuggyMatches = rbuggyMatches.length && new RegExp( rbuggyMatches.join("|") );

	/* Contains
	---------------------------------------------------------------------- */
	hasCompare = rnative.test( docElem.compareDocumentPosition );

	// Element contains another
	// Purposefully does not implement inclusive descendent
	// As in, an element does not contain itself
	contains = hasCompare || rnative.test( docElem.contains ) ?
		function( a, b ) {
			var adown = a.nodeType === 9 ? a.documentElement : a,
				bup = b && b.parentNode;
			return a === bup || !!( bup && bup.nodeType === 1 && (
				adown.contains ?
					adown.contains( bup ) :
					a.compareDocumentPosition && a.compareDocumentPosition( bup ) & 16
			));
		} :
		function( a, b ) {
			if ( b ) {
				while ( (b = b.parentNode) ) {
					if ( b === a ) {
						return true;
					}
				}
			}
			return false;
		};

	/* Sorting
	---------------------------------------------------------------------- */

	// Document order sorting
	sortOrder = hasCompare ?
	function( a, b ) {

		// Flag for duplicate removal
		if ( a === b ) {
			hasDuplicate = true;
			return 0;
		}

		// Sort on method existence if only one input has compareDocumentPosition
		var compare = !a.compareDocumentPosition - !b.compareDocumentPosition;
		if ( compare ) {
			return compare;
		}

		// Calculate position if both inputs belong to the same document
		compare = ( a.ownerDocument || a ) === ( b.ownerDocument || b ) ?
			a.compareDocumentPosition( b ) :

			// Otherwise we know they are disconnected
			1;

		// Disconnected nodes
		if ( compare & 1 ||
			(!support.sortDetached && b.compareDocumentPosition( a ) === compare) ) {

			// Choose the first element that is related to our preferred document
			if ( a === doc || a.ownerDocument === preferredDoc && contains(preferredDoc, a) ) {
				return -1;
			}
			if ( b === doc || b.ownerDocument === preferredDoc && contains(preferredDoc, b) ) {
				return 1;
			}

			// Maintain original order
			return sortInput ?
				( indexOf( sortInput, a ) - indexOf( sortInput, b ) ) :
				0;
		}

		return compare & 4 ? -1 : 1;
	} :
	function( a, b ) {
		// Exit early if the nodes are identical
		if ( a === b ) {
			hasDuplicate = true;
			return 0;
		}

		var cur,
			i = 0,
			aup = a.parentNode,
			bup = b.parentNode,
			ap = [ a ],
			bp = [ b ];

		// Parentless nodes are either documents or disconnected
		if ( !aup || !bup ) {
			return a === doc ? -1 :
				b === doc ? 1 :
				aup ? -1 :
				bup ? 1 :
				sortInput ?
				( indexOf( sortInput, a ) - indexOf( sortInput, b ) ) :
				0;

		// If the nodes are siblings, we can do a quick check
		} else if ( aup === bup ) {
			return siblingCheck( a, b );
		}

		// Otherwise we need full lists of their ancestors for comparison
		cur = a;
		while ( (cur = cur.parentNode) ) {
			ap.unshift( cur );
		}
		cur = b;
		while ( (cur = cur.parentNode) ) {
			bp.unshift( cur );
		}

		// Walk down the tree looking for a discrepancy
		while ( ap[i] === bp[i] ) {
			i++;
		}

		return i ?
			// Do a sibling check if the nodes have a common ancestor
			siblingCheck( ap[i], bp[i] ) :

			// Otherwise nodes in our document sort first
			ap[i] === preferredDoc ? -1 :
			bp[i] === preferredDoc ? 1 :
			0;
	};

	return doc;
};

Sizzle.matches = function( expr, elements ) {
	return Sizzle( expr, null, null, elements );
};

Sizzle.matchesSelector = function( elem, expr ) {
	// Set document vars if needed
	if ( ( elem.ownerDocument || elem ) !== document ) {
		setDocument( elem );
	}

	// Make sure that attribute selectors are quoted
	expr = expr.replace( rattributeQuotes, "='$1']" );

	if ( support.matchesSelector && documentIsHTML &&
		( !rbuggyMatches || !rbuggyMatches.test( expr ) ) &&
		( !rbuggyQSA     || !rbuggyQSA.test( expr ) ) ) {

		try {
			var ret = matches.call( elem, expr );

			// IE 9's matchesSelector returns false on disconnected nodes
			if ( ret || support.disconnectedMatch ||
					// As well, disconnected nodes are said to be in a document
					// fragment in IE 9
					elem.document && elem.document.nodeType !== 11 ) {
				return ret;
			}
		} catch (e) {}
	}

	return Sizzle( expr, document, null, [ elem ] ).length > 0;
};

Sizzle.contains = function( context, elem ) {
	// Set document vars if needed
	if ( ( context.ownerDocument || context ) !== document ) {
		setDocument( context );
	}
	return contains( context, elem );
};

Sizzle.attr = function( elem, name ) {
	// Set document vars if needed
	if ( ( elem.ownerDocument || elem ) !== document ) {
		setDocument( elem );
	}

	var fn = Expr.attrHandle[ name.toLowerCase() ],
		// Don't get fooled by Object.prototype properties (jQuery #13807)
		val = fn && hasOwn.call( Expr.attrHandle, name.toLowerCase() ) ?
			fn( elem, name, !documentIsHTML ) :
			undefined;

	return val !== undefined ?
		val :
		support.attributes || !documentIsHTML ?
			elem.getAttribute( name ) :
			(val = elem.getAttributeNode(name)) && val.specified ?
				val.value :
				null;
};

Sizzle.error = function( msg ) {
	throw new Error( "Syntax error, unrecognized expression: " + msg );
};

/**
 * Document sorting and removing duplicates
 * @param {ArrayLike} results
 */
Sizzle.uniqueSort = function( results ) {
	var elem,
		duplicates = [],
		j = 0,
		i = 0;

	// Unless we *know* we can detect duplicates, assume their presence
	hasDuplicate = !support.detectDuplicates;
	sortInput = !support.sortStable && results.slice( 0 );
	results.sort( sortOrder );

	if ( hasDuplicate ) {
		while ( (elem = results[i++]) ) {
			if ( elem === results[ i ] ) {
				j = duplicates.push( i );
			}
		}
		while ( j-- ) {
			results.splice( duplicates[ j ], 1 );
		}
	}

	// Clear input after sorting to release objects
	// See https://github.com/jquery/sizzle/pull/225
	sortInput = null;

	return results;
};

/**
 * Utility function for retrieving the text value of an array of DOM nodes
 * @param {Array|Element} elem
 */
getText = Sizzle.getText = function( elem ) {
	var node,
		ret = "",
		i = 0,
		nodeType = elem.nodeType;

	if ( !nodeType ) {
		// If no nodeType, this is expected to be an array
		while ( (node = elem[i++]) ) {
			// Do not traverse comment nodes
			ret += getText( node );
		}
	} else if ( nodeType === 1 || nodeType === 9 || nodeType === 11 ) {
		// Use textContent for elements
		// innerText usage removed for consistency of new lines (jQuery #11153)
		if ( typeof elem.textContent === "string" ) {
			return elem.textContent;
		} else {
			// Traverse its children
			for ( elem = elem.firstChild; elem; elem = elem.nextSibling ) {
				ret += getText( elem );
			}
		}
	} else if ( nodeType === 3 || nodeType === 4 ) {
		return elem.nodeValue;
	}
	// Do not include comment or processing instruction nodes

	return ret;
};

Expr = Sizzle.selectors = {

	// Can be adjusted by the user
	cacheLength: 50,

	createPseudo: markFunction,

	match: matchExpr,

	attrHandle: {},

	find: {},

	relative: {
		">": { dir: "parentNode", first: true },
		" ": { dir: "parentNode" },
		"+": { dir: "previousSibling", first: true },
		"~": { dir: "previousSibling" }
	},

	preFilter: {
		"ATTR": function( match ) {
			match[1] = match[1].replace( runescape, funescape );

			// Move the given value to match[3] whether quoted or unquoted
			match[3] = ( match[3] || match[4] || match[5] || "" ).replace( runescape, funescape );

			if ( match[2] === "~=" ) {
				match[3] = " " + match[3] + " ";
			}

			return match.slice( 0, 4 );
		},

		"CHILD": function( match ) {
			/* matches from matchExpr["CHILD"]
				1 type (only|nth|...)
				2 what (child|of-type)
				3 argument (even|odd|\d*|\d*n([+-]\d+)?|...)
				4 xn-component of xn+y argument ([+-]?\d*n|)
				5 sign of xn-component
				6 x of xn-component
				7 sign of y-component
				8 y of y-component
			*/
			match[1] = match[1].toLowerCase();

			if ( match[1].slice( 0, 3 ) === "nth" ) {
				// nth-* requires argument
				if ( !match[3] ) {
					Sizzle.error( match[0] );
				}

				// numeric x and y parameters for Expr.filter.CHILD
				// remember that false/true cast respectively to 0/1
				match[4] = +( match[4] ? match[5] + (match[6] || 1) : 2 * ( match[3] === "even" || match[3] === "odd" ) );
				match[5] = +( ( match[7] + match[8] ) || match[3] === "odd" );

			// other types prohibit arguments
			} else if ( match[3] ) {
				Sizzle.error( match[0] );
			}

			return match;
		},

		"PSEUDO": function( match ) {
			var excess,
				unquoted = !match[6] && match[2];

			if ( matchExpr["CHILD"].test( match[0] ) ) {
				return null;
			}

			// Accept quoted arguments as-is
			if ( match[3] ) {
				match[2] = match[4] || match[5] || "";

			// Strip excess characters from unquoted arguments
			} else if ( unquoted && rpseudo.test( unquoted ) &&
				// Get excess from tokenize (recursively)
				(excess = tokenize( unquoted, true )) &&
				// advance to the next closing parenthesis
				(excess = unquoted.indexOf( ")", unquoted.length - excess ) - unquoted.length) ) {

				// excess is a negative index
				match[0] = match[0].slice( 0, excess );
				match[2] = unquoted.slice( 0, excess );
			}

			// Return only captures needed by the pseudo filter method (type and argument)
			return match.slice( 0, 3 );
		}
	},

	filter: {

		"TAG": function( nodeNameSelector ) {
			var nodeName = nodeNameSelector.replace( runescape, funescape ).toLowerCase();
			return nodeNameSelector === "*" ?
				function() { return true; } :
				function( elem ) {
					return elem.nodeName && elem.nodeName.toLowerCase() === nodeName;
				};
		},

		"CLASS": function( className ) {
			var pattern = classCache[ className + " " ];

			return pattern ||
				(pattern = new RegExp( "(^|" + whitespace + ")" + className + "(" + whitespace + "|$)" )) &&
				classCache( className, function( elem ) {
					return pattern.test( typeof elem.className === "string" && elem.className || typeof elem.getAttribute !== "undefined" && elem.getAttribute("class") || "" );
				});
		},

		"ATTR": function( name, operator, check ) {
			return function( elem ) {
				var result = Sizzle.attr( elem, name );

				if ( result == null ) {
					return operator === "!=";
				}
				if ( !operator ) {
					return true;
				}

				result += "";

				return operator === "=" ? result === check :
					operator === "!=" ? result !== check :
					operator === "^=" ? check && result.indexOf( check ) === 0 :
					operator === "*=" ? check && result.indexOf( check ) > -1 :
					operator === "$=" ? check && result.slice( -check.length ) === check :
					operator === "~=" ? ( " " + result.replace( rwhitespace, " " ) + " " ).indexOf( check ) > -1 :
					operator === "|=" ? result === check || result.slice( 0, check.length + 1 ) === check + "-" :
					false;
			};
		},

		"CHILD": function( type, what, argument, first, last ) {
			var simple = type.slice( 0, 3 ) !== "nth",
				forward = type.slice( -4 ) !== "last",
				ofType = what === "of-type";

			return first === 1 && last === 0 ?

				// Shortcut for :nth-*(n)
				function( elem ) {
					return !!elem.parentNode;
				} :

				function( elem, context, xml ) {
					var cache, outerCache, node, diff, nodeIndex, start,
						dir = simple !== forward ? "nextSibling" : "previousSibling",
						parent = elem.parentNode,
						name = ofType && elem.nodeName.toLowerCase(),
						useCache = !xml && !ofType;

					if ( parent ) {

						// :(first|last|only)-(child|of-type)
						if ( simple ) {
							while ( dir ) {
								node = elem;
								while ( (node = node[ dir ]) ) {
									if ( ofType ? node.nodeName.toLowerCase() === name : node.nodeType === 1 ) {
										return false;
									}
								}
								// Reverse direction for :only-* (if we haven't yet done so)
								start = dir = type === "only" && !start && "nextSibling";
							}
							return true;
						}

						start = [ forward ? parent.firstChild : parent.lastChild ];

						// non-xml :nth-child(...) stores cache data on `parent`
						if ( forward && useCache ) {
							// Seek `elem` from a previously-cached index
							outerCache = parent[ expando ] || (parent[ expando ] = {});
							cache = outerCache[ type ] || [];
							nodeIndex = cache[0] === dirruns && cache[1];
							diff = cache[0] === dirruns && cache[2];
							node = nodeIndex && parent.childNodes[ nodeIndex ];

							while ( (node = ++nodeIndex && node && node[ dir ] ||

								// Fallback to seeking `elem` from the start
								(diff = nodeIndex = 0) || start.pop()) ) {

								// When found, cache indexes on `parent` and break
								if ( node.nodeType === 1 && ++diff && node === elem ) {
									outerCache[ type ] = [ dirruns, nodeIndex, diff ];
									break;
								}
							}

						// Use previously-cached element index if available
						} else if ( useCache && (cache = (elem[ expando ] || (elem[ expando ] = {}))[ type ]) && cache[0] === dirruns ) {
							diff = cache[1];

						// xml :nth-child(...) or :nth-last-child(...) or :nth(-last)?-of-type(...)
						} else {
							// Use the same loop as above to seek `elem` from the start
							while ( (node = ++nodeIndex && node && node[ dir ] ||
								(diff = nodeIndex = 0) || start.pop()) ) {

								if ( ( ofType ? node.nodeName.toLowerCase() === name : node.nodeType === 1 ) && ++diff ) {
									// Cache the index of each encountered element
									if ( useCache ) {
										(node[ expando ] || (node[ expando ] = {}))[ type ] = [ dirruns, diff ];
									}

									if ( node === elem ) {
										break;
									}
								}
							}
						}

						// Incorporate the offset, then check against cycle size
						diff -= last;
						return diff === first || ( diff % first === 0 && diff / first >= 0 );
					}
				};
		},

		"PSEUDO": function( pseudo, argument ) {
			// pseudo-class names are case-insensitive
			// http://www.w3.org/TR/selectors/#pseudo-classes
			// Prioritize by case sensitivity in case custom pseudos are added with uppercase letters
			// Remember that setFilters inherits from pseudos
			var args,
				fn = Expr.pseudos[ pseudo ] || Expr.setFilters[ pseudo.toLowerCase() ] ||
					Sizzle.error( "unsupported pseudo: " + pseudo );

			// The user may use createPseudo to indicate that
			// arguments are needed to create the filter function
			// just as Sizzle does
			if ( fn[ expando ] ) {
				return fn( argument );
			}

			// But maintain support for old signatures
			if ( fn.length > 1 ) {
				args = [ pseudo, pseudo, "", argument ];
				return Expr.setFilters.hasOwnProperty( pseudo.toLowerCase() ) ?
					markFunction(function( seed, matches ) {
						var idx,
							matched = fn( seed, argument ),
							i = matched.length;
						while ( i-- ) {
							idx = indexOf( seed, matched[i] );
							seed[ idx ] = !( matches[ idx ] = matched[i] );
						}
					}) :
					function( elem ) {
						return fn( elem, 0, args );
					};
			}

			return fn;
		}
	},

	pseudos: {
		// Potentially complex pseudos
		"not": markFunction(function( selector ) {
			// Trim the selector passed to compile
			// to avoid treating leading and trailing
			// spaces as combinators
			var input = [],
				results = [],
				matcher = compile( selector.replace( rtrim, "$1" ) );

			return matcher[ expando ] ?
				markFunction(function( seed, matches, context, xml ) {
					var elem,
						unmatched = matcher( seed, null, xml, [] ),
						i = seed.length;

					// Match elements unmatched by `matcher`
					while ( i-- ) {
						if ( (elem = unmatched[i]) ) {
							seed[i] = !(matches[i] = elem);
						}
					}
				}) :
				function( elem, context, xml ) {
					input[0] = elem;
					matcher( input, null, xml, results );
					// Don't keep the element (issue #299)
					input[0] = null;
					return !results.pop();
				};
		}),

		"has": markFunction(function( selector ) {
			return function( elem ) {
				return Sizzle( selector, elem ).length > 0;
			};
		}),

		"contains": markFunction(function( text ) {
			text = text.replace( runescape, funescape );
			return function( elem ) {
				return ( elem.textContent || elem.innerText || getText( elem ) ).indexOf( text ) > -1;
			};
		}),

		// "Whether an element is represented by a :lang() selector
		// is based solely on the element's language value
		// being equal to the identifier C,
		// or beginning with the identifier C immediately followed by "-".
		// The matching of C against the element's language value is performed case-insensitively.
		// The identifier C does not have to be a valid language name."
		// http://www.w3.org/TR/selectors/#lang-pseudo
		"lang": markFunction( function( lang ) {
			// lang value must be a valid identifier
			if ( !ridentifier.test(lang || "") ) {
				Sizzle.error( "unsupported lang: " + lang );
			}
			lang = lang.replace( runescape, funescape ).toLowerCase();
			return function( elem ) {
				var elemLang;
				do {
					if ( (elemLang = documentIsHTML ?
						elem.lang :
						elem.getAttribute("xml:lang") || elem.getAttribute("lang")) ) {

						elemLang = elemLang.toLowerCase();
						return elemLang === lang || elemLang.indexOf( lang + "-" ) === 0;
					}
				} while ( (elem = elem.parentNode) && elem.nodeType === 1 );
				return false;
			};
		}),

		// Miscellaneous
		"target": function( elem ) {
			var hash = window.location && window.location.hash;
			return hash && hash.slice( 1 ) === elem.id;
		},

		"root": function( elem ) {
			return elem === docElem;
		},

		"focus": function( elem ) {
			return elem === document.activeElement && (!document.hasFocus || document.hasFocus()) && !!(elem.type || elem.href || ~elem.tabIndex);
		},

		// Boolean properties
		"enabled": function( elem ) {
			return elem.disabled === false;
		},

		"disabled": function( elem ) {
			return elem.disabled === true;
		},

		"checked": function( elem ) {
			// In CSS3, :checked should return both checked and selected elements
			// http://www.w3.org/TR/2011/REC-css3-selectors-20110929/#checked
			var nodeName = elem.nodeName.toLowerCase();
			return (nodeName === "input" && !!elem.checked) || (nodeName === "option" && !!elem.selected);
		},

		"selected": function( elem ) {
			// Accessing this property makes selected-by-default
			// options in Safari work properly
			if ( elem.parentNode ) {
				elem.parentNode.selectedIndex;
			}

			return elem.selected === true;
		},

		// Contents
		"empty": function( elem ) {
			// http://www.w3.org/TR/selectors/#empty-pseudo
			// :empty is negated by element (1) or content nodes (text: 3; cdata: 4; entity ref: 5),
			//   but not by others (comment: 8; processing instruction: 7; etc.)
			// nodeType < 6 works because attributes (2) do not appear as children
			for ( elem = elem.firstChild; elem; elem = elem.nextSibling ) {
				if ( elem.nodeType < 6 ) {
					return false;
				}
			}
			return true;
		},

		"parent": function( elem ) {
			return !Expr.pseudos["empty"]( elem );
		},

		// Element/input types
		"header": function( elem ) {
			return rheader.test( elem.nodeName );
		},

		"input": function( elem ) {
			return rinputs.test( elem.nodeName );
		},

		"button": function( elem ) {
			var name = elem.nodeName.toLowerCase();
			return name === "input" && elem.type === "button" || name === "button";
		},

		"text": function( elem ) {
			var attr;
			return elem.nodeName.toLowerCase() === "input" &&
				elem.type === "text" &&

				// Support: IE<8
				// New HTML5 attribute values (e.g., "search") appear with elem.type === "text"
				( (attr = elem.getAttribute("type")) == null || attr.toLowerCase() === "text" );
		},

		// Position-in-collection
		"first": createPositionalPseudo(function() {
			return [ 0 ];
		}),

		"last": createPositionalPseudo(function( matchIndexes, length ) {
			return [ length - 1 ];
		}),

		"eq": createPositionalPseudo(function( matchIndexes, length, argument ) {
			return [ argument < 0 ? argument + length : argument ];
		}),

		"even": createPositionalPseudo(function( matchIndexes, length ) {
			var i = 0;
			for ( ; i < length; i += 2 ) {
				matchIndexes.push( i );
			}
			return matchIndexes;
		}),

		"odd": createPositionalPseudo(function( matchIndexes, length ) {
			var i = 1;
			for ( ; i < length; i += 2 ) {
				matchIndexes.push( i );
			}
			return matchIndexes;
		}),

		"lt": createPositionalPseudo(function( matchIndexes, length, argument ) {
			var i = argument < 0 ? argument + length : argument;
			for ( ; --i >= 0; ) {
				matchIndexes.push( i );
			}
			return matchIndexes;
		}),

		"gt": createPositionalPseudo(function( matchIndexes, length, argument ) {
			var i = argument < 0 ? argument + length : argument;
			for ( ; ++i < length; ) {
				matchIndexes.push( i );
			}
			return matchIndexes;
		})
	}
};

Expr.pseudos["nth"] = Expr.pseudos["eq"];

// Add button/input type pseudos
for ( i in { radio: true, checkbox: true, file: true, password: true, image: true } ) {
	Expr.pseudos[ i ] = createInputPseudo( i );
}
for ( i in { submit: true, reset: true } ) {
	Expr.pseudos[ i ] = createButtonPseudo( i );
}

// Easy API for creating new setFilters
function setFilters() {}
setFilters.prototype = Expr.filters = Expr.pseudos;
Expr.setFilters = new setFilters();

tokenize = Sizzle.tokenize = function( selector, parseOnly ) {
	var matched, match, tokens, type,
		soFar, groups, preFilters,
		cached = tokenCache[ selector + " " ];

	if ( cached ) {
		return parseOnly ? 0 : cached.slice( 0 );
	}

	soFar = selector;
	groups = [];
	preFilters = Expr.preFilter;

	while ( soFar ) {

		// Comma and first run
		if ( !matched || (match = rcomma.exec( soFar )) ) {
			if ( match ) {
				// Don't consume trailing commas as valid
				soFar = soFar.slice( match[0].length ) || soFar;
			}
			groups.push( (tokens = []) );
		}

		matched = false;

		// Combinators
		if ( (match = rcombinators.exec( soFar )) ) {
			matched = match.shift();
			tokens.push({
				value: matched,
				// Cast descendant combinators to space
				type: match[0].replace( rtrim, " " )
			});
			soFar = soFar.slice( matched.length );
		}

		// Filters
		for ( type in Expr.filter ) {
			if ( (match = matchExpr[ type ].exec( soFar )) && (!preFilters[ type ] ||
				(match = preFilters[ type ]( match ))) ) {
				matched = match.shift();
				tokens.push({
					value: matched,
					type: type,
					matches: match
				});
				soFar = soFar.slice( matched.length );
			}
		}

		if ( !matched ) {
			break;
		}
	}

	// Return the length of the invalid excess
	// if we're just parsing
	// Otherwise, throw an error or return tokens
	return parseOnly ?
		soFar.length :
		soFar ?
			Sizzle.error( selector ) :
			// Cache the tokens
			tokenCache( selector, groups ).slice( 0 );
};

function toSelector( tokens ) {
	var i = 0,
		len = tokens.length,
		selector = "";
	for ( ; i < len; i++ ) {
		selector += tokens[i].value;
	}
	return selector;
}

function addCombinator( matcher, combinator, base ) {
	var dir = combinator.dir,
		checkNonElements = base && dir === "parentNode",
		doneName = done++;

	return combinator.first ?
		// Check against closest ancestor/preceding element
		function( elem, context, xml ) {
			while ( (elem = elem[ dir ]) ) {
				if ( elem.nodeType === 1 || checkNonElements ) {
					return matcher( elem, context, xml );
				}
			}
		} :

		// Check against all ancestor/preceding elements
		function( elem, context, xml ) {
			var oldCache, outerCache,
				newCache = [ dirruns, doneName ];

			// We can't set arbitrary data on XML nodes, so they don't benefit from dir caching
			if ( xml ) {
				while ( (elem = elem[ dir ]) ) {
					if ( elem.nodeType === 1 || checkNonElements ) {
						if ( matcher( elem, context, xml ) ) {
							return true;
						}
					}
				}
			} else {
				while ( (elem = elem[ dir ]) ) {
					if ( elem.nodeType === 1 || checkNonElements ) {
						outerCache = elem[ expando ] || (elem[ expando ] = {});
						if ( (oldCache = outerCache[ dir ]) &&
							oldCache[ 0 ] === dirruns && oldCache[ 1 ] === doneName ) {

							// Assign to newCache so results back-propagate to previous elements
							return (newCache[ 2 ] = oldCache[ 2 ]);
						} else {
							// Reuse newcache so results back-propagate to previous elements
							outerCache[ dir ] = newCache;

							// A match means we're done; a fail means we have to keep checking
							if ( (newCache[ 2 ] = matcher( elem, context, xml )) ) {
								return true;
							}
						}
					}
				}
			}
		};
}

function elementMatcher( matchers ) {
	return matchers.length > 1 ?
		function( elem, context, xml ) {
			var i = matchers.length;
			while ( i-- ) {
				if ( !matchers[i]( elem, context, xml ) ) {
					return false;
				}
			}
			return true;
		} :
		matchers[0];
}

function multipleContexts( selector, contexts, results ) {
	var i = 0,
		len = contexts.length;
	for ( ; i < len; i++ ) {
		Sizzle( selector, contexts[i], results );
	}
	return results;
}

function condense( unmatched, map, filter, context, xml ) {
	var elem,
		newUnmatched = [],
		i = 0,
		len = unmatched.length,
		mapped = map != null;

	for ( ; i < len; i++ ) {
		if ( (elem = unmatched[i]) ) {
			if ( !filter || filter( elem, context, xml ) ) {
				newUnmatched.push( elem );
				if ( mapped ) {
					map.push( i );
				}
			}
		}
	}

	return newUnmatched;
}

function setMatcher( preFilter, selector, matcher, postFilter, postFinder, postSelector ) {
	if ( postFilter && !postFilter[ expando ] ) {
		postFilter = setMatcher( postFilter );
	}
	if ( postFinder && !postFinder[ expando ] ) {
		postFinder = setMatcher( postFinder, postSelector );
	}
	return markFunction(function( seed, results, context, xml ) {
		var temp, i, elem,
			preMap = [],
			postMap = [],
			preexisting = results.length,

			// Get initial elements from seed or context
			elems = seed || multipleContexts( selector || "*", context.nodeType ? [ context ] : context, [] ),

			// Prefilter to get matcher input, preserving a map for seed-results synchronization
			matcherIn = preFilter && ( seed || !selector ) ?
				condense( elems, preMap, preFilter, context, xml ) :
				elems,

			matcherOut = matcher ?
				// If we have a postFinder, or filtered seed, or non-seed postFilter or preexisting results,
				postFinder || ( seed ? preFilter : preexisting || postFilter ) ?

					// ...intermediate processing is necessary
					[] :

					// ...otherwise use results directly
					results :
				matcherIn;

		// Find primary matches
		if ( matcher ) {
			matcher( matcherIn, matcherOut, context, xml );
		}

		// Apply postFilter
		if ( postFilter ) {
			temp = condense( matcherOut, postMap );
			postFilter( temp, [], context, xml );

			// Un-match failing elements by moving them back to matcherIn
			i = temp.length;
			while ( i-- ) {
				if ( (elem = temp[i]) ) {
					matcherOut[ postMap[i] ] = !(matcherIn[ postMap[i] ] = elem);
				}
			}
		}

		if ( seed ) {
			if ( postFinder || preFilter ) {
				if ( postFinder ) {
					// Get the final matcherOut by condensing this intermediate into postFinder contexts
					temp = [];
					i = matcherOut.length;
					while ( i-- ) {
						if ( (elem = matcherOut[i]) ) {
							// Restore matcherIn since elem is not yet a final match
							temp.push( (matcherIn[i] = elem) );
						}
					}
					postFinder( null, (matcherOut = []), temp, xml );
				}

				// Move matched elements from seed to results to keep them synchronized
				i = matcherOut.length;
				while ( i-- ) {
					if ( (elem = matcherOut[i]) &&
						(temp = postFinder ? indexOf( seed, elem ) : preMap[i]) > -1 ) {

						seed[temp] = !(results[temp] = elem);
					}
				}
			}

		// Add elements to results, through postFinder if defined
		} else {
			matcherOut = condense(
				matcherOut === results ?
					matcherOut.splice( preexisting, matcherOut.length ) :
					matcherOut
			);
			if ( postFinder ) {
				postFinder( null, results, matcherOut, xml );
			} else {
				push.apply( results, matcherOut );
			}
		}
	});
}

function matcherFromTokens( tokens ) {
	var checkContext, matcher, j,
		len = tokens.length,
		leadingRelative = Expr.relative[ tokens[0].type ],
		implicitRelative = leadingRelative || Expr.relative[" "],
		i = leadingRelative ? 1 : 0,

		// The foundational matcher ensures that elements are reachable from top-level context(s)
		matchContext = addCombinator( function( elem ) {
			return elem === checkContext;
		}, implicitRelative, true ),
		matchAnyContext = addCombinator( function( elem ) {
			return indexOf( checkContext, elem ) > -1;
		}, implicitRelative, true ),
		matchers = [ function( elem, context, xml ) {
			var ret = ( !leadingRelative && ( xml || context !== outermostContext ) ) || (
				(checkContext = context).nodeType ?
					matchContext( elem, context, xml ) :
					matchAnyContext( elem, context, xml ) );
			// Avoid hanging onto element (issue #299)
			checkContext = null;
			return ret;
		} ];

	for ( ; i < len; i++ ) {
		if ( (matcher = Expr.relative[ tokens[i].type ]) ) {
			matchers = [ addCombinator(elementMatcher( matchers ), matcher) ];
		} else {
			matcher = Expr.filter[ tokens[i].type ].apply( null, tokens[i].matches );

			// Return special upon seeing a positional matcher
			if ( matcher[ expando ] ) {
				// Find the next relative operator (if any) for proper handling
				j = ++i;
				for ( ; j < len; j++ ) {
					if ( Expr.relative[ tokens[j].type ] ) {
						break;
					}
				}
				return setMatcher(
					i > 1 && elementMatcher( matchers ),
					i > 1 && toSelector(
						// If the preceding token was a descendant combinator, insert an implicit any-element `*`
						tokens.slice( 0, i - 1 ).concat({ value: tokens[ i - 2 ].type === " " ? "*" : "" })
					).replace( rtrim, "$1" ),
					matcher,
					i < j && matcherFromTokens( tokens.slice( i, j ) ),
					j < len && matcherFromTokens( (tokens = tokens.slice( j )) ),
					j < len && toSelector( tokens )
				);
			}
			matchers.push( matcher );
		}
	}

	return elementMatcher( matchers );
}

function matcherFromGroupMatchers( elementMatchers, setMatchers ) {
	var bySet = setMatchers.length > 0,
		byElement = elementMatchers.length > 0,
		superMatcher = function( seed, context, xml, results, outermost ) {
			var elem, j, matcher,
				matchedCount = 0,
				i = "0",
				unmatched = seed && [],
				setMatched = [],
				contextBackup = outermostContext,
				// We must always have either seed elements or outermost context
				elems = seed || byElement && Expr.find["TAG"]( "*", outermost ),
				// Use integer dirruns iff this is the outermost matcher
				dirrunsUnique = (dirruns += contextBackup == null ? 1 : Math.random() || 0.1),
				len = elems.length;

			if ( outermost ) {
				outermostContext = context !== document && context;
			}

			// Add elements passing elementMatchers directly to results
			// Keep `i` a string if there are no elements so `matchedCount` will be "00" below
			// Support: IE<9, Safari
			// Tolerate NodeList properties (IE: "length"; Safari: <number>) matching elements by id
			for ( ; i !== len && (elem = elems[i]) != null; i++ ) {
				if ( byElement && elem ) {
					j = 0;
					while ( (matcher = elementMatchers[j++]) ) {
						if ( matcher( elem, context, xml ) ) {
							results.push( elem );
							break;
						}
					}
					if ( outermost ) {
						dirruns = dirrunsUnique;
					}
				}

				// Track unmatched elements for set filters
				if ( bySet ) {
					// They will have gone through all possible matchers
					if ( (elem = !matcher && elem) ) {
						matchedCount--;
					}

					// Lengthen the array for every element, matched or not
					if ( seed ) {
						unmatched.push( elem );
					}
				}
			}

			// Apply set filters to unmatched elements
			matchedCount += i;
			if ( bySet && i !== matchedCount ) {
				j = 0;
				while ( (matcher = setMatchers[j++]) ) {
					matcher( unmatched, setMatched, context, xml );
				}

				if ( seed ) {
					// Reintegrate element matches to eliminate the need for sorting
					if ( matchedCount > 0 ) {
						while ( i-- ) {
							if ( !(unmatched[i] || setMatched[i]) ) {
								setMatched[i] = pop.call( results );
							}
						}
					}

					// Discard index placeholder values to get only actual matches
					setMatched = condense( setMatched );
				}

				// Add matches to results
				push.apply( results, setMatched );

				// Seedless set matches succeeding multiple successful matchers stipulate sorting
				if ( outermost && !seed && setMatched.length > 0 &&
					( matchedCount + setMatchers.length ) > 1 ) {

					Sizzle.uniqueSort( results );
				}
			}

			// Override manipulation of globals by nested matchers
			if ( outermost ) {
				dirruns = dirrunsUnique;
				outermostContext = contextBackup;
			}

			return unmatched;
		};

	return bySet ?
		markFunction( superMatcher ) :
		superMatcher;
}

compile = Sizzle.compile = function( selector, match /* Internal Use Only */ ) {
	var i,
		setMatchers = [],
		elementMatchers = [],
		cached = compilerCache[ selector + " " ];

	if ( !cached ) {
		// Generate a function of recursive functions that can be used to check each element
		if ( !match ) {
			match = tokenize( selector );
		}
		i = match.length;
		while ( i-- ) {
			cached = matcherFromTokens( match[i] );
			if ( cached[ expando ] ) {
				setMatchers.push( cached );
			} else {
				elementMatchers.push( cached );
			}
		}

		// Cache the compiled function
		cached = compilerCache( selector, matcherFromGroupMatchers( elementMatchers, setMatchers ) );

		// Save selector and tokenization
		cached.selector = selector;
	}
	return cached;
};

/**
 * A low-level selection function that works with Sizzle's compiled
 *  selector functions
 * @param {String|Function} selector A selector or a pre-compiled
 *  selector function built with Sizzle.compile
 * @param {Element} context
 * @param {Array} [results]
 * @param {Array} [seed] A set of elements to match against
 */
select = Sizzle.select = function( selector, context, results, seed ) {
	var i, tokens, token, type, find,
		compiled = typeof selector === "function" && selector,
		match = !seed && tokenize( (selector = compiled.selector || selector) );

	results = results || [];

	// Try to minimize operations if there is no seed and only one group
	if ( match.length === 1 ) {

		// Take a shortcut and set the context if the root selector is an ID
		tokens = match[0] = match[0].slice( 0 );
		if ( tokens.length > 2 && (token = tokens[0]).type === "ID" &&
				support.getById && context.nodeType === 9 && documentIsHTML &&
				Expr.relative[ tokens[1].type ] ) {

			context = ( Expr.find["ID"]( token.matches[0].replace(runescape, funescape), context ) || [] )[0];
			if ( !context ) {
				return results;

			// Precompiled matchers will still verify ancestry, so step up a level
			} else if ( compiled ) {
				context = context.parentNode;
			}

			selector = selector.slice( tokens.shift().value.length );
		}

		// Fetch a seed set for right-to-left matching
		i = matchExpr["needsContext"].test( selector ) ? 0 : tokens.length;
		while ( i-- ) {
			token = tokens[i];

			// Abort if we hit a combinator
			if ( Expr.relative[ (type = token.type) ] ) {
				break;
			}
			if ( (find = Expr.find[ type ]) ) {
				// Search, expanding context for leading sibling combinators
				if ( (seed = find(
					token.matches[0].replace( runescape, funescape ),
					rsibling.test( tokens[0].type ) && testContext( context.parentNode ) || context
				)) ) {

					// If seed is empty or no tokens remain, we can return early
					tokens.splice( i, 1 );
					selector = seed.length && toSelector( tokens );
					if ( !selector ) {
						push.apply( results, seed );
						return results;
					}

					break;
				}
			}
		}
	}

	// Compile and execute a filtering function if one is not provided
	// Provide `match` to avoid retokenization if we modified the selector above
	( compiled || compile( selector, match ) )(
		seed,
		context,
		!documentIsHTML,
		results,
		rsibling.test( selector ) && testContext( context.parentNode ) || context
	);
	return results;
};

// One-time assignments

// Sort stability
support.sortStable = expando.split("").sort( sortOrder ).join("") === expando;

// Support: Chrome 14-35+
// Always assume duplicates if they aren't passed to the comparison function
support.detectDuplicates = !!hasDuplicate;

// Initialize against the default document
setDocument();

// Support: Webkit<537.32 - Safari 6.0.3/Chrome 25 (fixed in Chrome 27)
// Detached nodes confoundingly follow *each other*
support.sortDetached = assert(function( div1 ) {
	// Should return 1, but returns 4 (following)
	return div1.compareDocumentPosition( document.createElement("div") ) & 1;
});

// Support: IE<8
// Prevent attribute/property "interpolation"
// http://msdn.microsoft.com/en-us/library/ms536429%28VS.85%29.aspx
if ( !assert(function( div ) {
	div.innerHTML = "<a href='#'></a>";
	return div.firstChild.getAttribute("href") === "#" ;
}) ) {
	addHandle( "type|href|height|width", function( elem, name, isXML ) {
		if ( !isXML ) {
			return elem.getAttribute( name, name.toLowerCase() === "type" ? 1 : 2 );
		}
	});
}

// Support: IE<9
// Use defaultValue in place of getAttribute("value")
if ( !support.attributes || !assert(function( div ) {
	div.innerHTML = "<input/>";
	div.firstChild.setAttribute( "value", "" );
	return div.firstChild.getAttribute( "value" ) === "";
}) ) {
	addHandle( "value", function( elem, name, isXML ) {
		if ( !isXML && elem.nodeName.toLowerCase() === "input" ) {
			return elem.defaultValue;
		}
	});
}

// Support: IE<9
// Use getAttributeNode to fetch booleans when getAttribute lies
if ( !assert(function( div ) {
	return div.getAttribute("disabled") == null;
}) ) {
	addHandle( booleans, function( elem, name, isXML ) {
		var val;
		if ( !isXML ) {
			return elem[ name ] === true ? name.toLowerCase() :
					(val = elem.getAttributeNode( name )) && val.specified ?
					val.value :
				null;
		}
	});
}

return Sizzle;

})( window );



jQuery.find = Sizzle;
jQuery.expr = Sizzle.selectors;
jQuery.expr[":"] = jQuery.expr.pseudos;
jQuery.unique = Sizzle.uniqueSort;
jQuery.text = Sizzle.getText;
jQuery.isXMLDoc = Sizzle.isXML;
jQuery.contains = Sizzle.contains;



var rneedsContext = jQuery.expr.match.needsContext;

var rsingleTag = (/^<(\w+)\s*\/?>(?:<\/\1>|)$/);



var risSimple = /^.[^:#\[\.,]*$/;

// Implement the identical functionality for filter and not
function winnow( elements, qualifier, not ) {
	if ( jQuery.isFunction( qualifier ) ) {
		return jQuery.grep( elements, function( elem, i ) {
			/* jshint -W018 */
			return !!qualifier.call( elem, i, elem ) !== not;
		});

	}

	if ( qualifier.nodeType ) {
		return jQuery.grep( elements, function( elem ) {
			return ( elem === qualifier ) !== not;
		});

	}

	if ( typeof qualifier === "string" ) {
		if ( risSimple.test( qualifier ) ) {
			return jQuery.filter( qualifier, elements, not );
		}

		qualifier = jQuery.filter( qualifier, elements );
	}

	return jQuery.grep( elements, function( elem ) {
		return ( indexOf.call( qualifier, elem ) >= 0 ) !== not;
	});
}

jQuery.filter = function( expr, elems, not ) {
	var elem = elems[ 0 ];

	if ( not ) {
		expr = ":not(" + expr + ")";
	}

	return elems.length === 1 && elem.nodeType === 1 ?
		jQuery.find.matchesSelector( elem, expr ) ? [ elem ] : [] :
		jQuery.find.matches( expr, jQuery.grep( elems, function( elem ) {
			return elem.nodeType === 1;
		}));
};

jQuery.fn.extend({
	find: function( selector ) {
		var i,
			len = this.length,
			ret = [],
			self = this;

		if ( typeof selector !== "string" ) {
			return this.pushStack( jQuery( selector ).filter(function() {
				for ( i = 0; i < len; i++ ) {
					if ( jQuery.contains( self[ i ], this ) ) {
						return true;
					}
				}
			}) );
		}

		for ( i = 0; i < len; i++ ) {
			jQuery.find( selector, self[ i ], ret );
		}

		// Needed because $( selector, context ) becomes $( context ).find( selector )
		ret = this.pushStack( len > 1 ? jQuery.unique( ret ) : ret );
		ret.selector = this.selector ? this.selector + " " + selector : selector;
		return ret;
	},
	filter: function( selector ) {
		return this.pushStack( winnow(this, selector || [], false) );
	},
	not: function( selector ) {
		return this.pushStack( winnow(this, selector || [], true) );
	},
	is: function( selector ) {
		return !!winnow(
			this,

			// If this is a positional/relative selector, check membership in the returned set
			// so $("p:first").is("p:last") won't return true for a doc with two "p".
			typeof selector === "string" && rneedsContext.test( selector ) ?
				jQuery( selector ) :
				selector || [],
			false
		).length;
	}
});


// Initialize a jQuery object


// A central reference to the root jQuery(document)
var rootjQuery,

	// A simple way to check for HTML strings
	// Prioritize #id over <tag> to avoid XSS via location.hash (#9521)
	// Strict HTML recognition (#11290: must start with <)
	rquickExpr = /^(?:\s*(<[\w\W]+>)[^>]*|#([\w-]*))$/,

	init = jQuery.fn.init = function( selector, context ) {
		var match, elem;

		// HANDLE: $(""), $(null), $(undefined), $(false)
		if ( !selector ) {
			return this;
		}

		// Handle HTML strings
		if ( typeof selector === "string" ) {
			if ( selector[0] === "<" && selector[ selector.length - 1 ] === ">" && selector.length >= 3 ) {
				// Assume that strings that start and end with <> are HTML and skip the regex check
				match = [ null, selector, null ];

			} else {
				match = rquickExpr.exec( selector );
			}

			// Match html or make sure no context is specified for #id
			if ( match && (match[1] || !context) ) {

				// HANDLE: $(html) -> $(array)
				if ( match[1] ) {
					context = context instanceof jQuery ? context[0] : context;

					// Option to run scripts is true for back-compat
					// Intentionally let the error be thrown if parseHTML is not present
					jQuery.merge( this, jQuery.parseHTML(
						match[1],
						context && context.nodeType ? context.ownerDocument || context : document,
						true
					) );

					// HANDLE: $(html, props)
					if ( rsingleTag.test( match[1] ) && jQuery.isPlainObject( context ) ) {
						for ( match in context ) {
							// Properties of context are called as methods if possible
							if ( jQuery.isFunction( this[ match ] ) ) {
								this[ match ]( context[ match ] );

							// ...and otherwise set as attributes
							} else {
								this.attr( match, context[ match ] );
							}
						}
					}

					return this;

				// HANDLE: $(#id)
				} else {
					elem = document.getElementById( match[2] );

					// Support: Blackberry 4.6
					// gEBID returns nodes no longer in the document (#6963)
					if ( elem && elem.parentNode ) {
						// Inject the element directly into the jQuery object
						this.length = 1;
						this[0] = elem;
					}

					this.context = document;
					this.selector = selector;
					return this;
				}

			// HANDLE: $(expr, $(...))
			} else if ( !context || context.jquery ) {
				return ( context || rootjQuery ).find( selector );

			// HANDLE: $(expr, context)
			// (which is just equivalent to: $(context).find(expr)
			} else {
				return this.constructor( context ).find( selector );
			}

		// HANDLE: $(DOMElement)
		} else if ( selector.nodeType ) {
			this.context = this[0] = selector;
			this.length = 1;
			return this;

		// HANDLE: $(function)
		// Shortcut for document ready
		} else if ( jQuery.isFunction( selector ) ) {
			return typeof rootjQuery.ready !== "undefined" ?
				rootjQuery.ready( selector ) :
				// Execute immediately if ready is not present
				selector( jQuery );
		}

		if ( selector.selector !== undefined ) {
			this.selector = selector.selector;
			this.context = selector.context;
		}

		return jQuery.makeArray( selector, this );
	};

// Give the init function the jQuery prototype for later instantiation
init.prototype = jQuery.fn;

// Initialize central reference
rootjQuery = jQuery( document );


var rparentsprev = /^(?:parents|prev(?:Until|All))/,
	// Methods guaranteed to produce a unique set when starting from a unique set
	guaranteedUnique = {
		children: true,
		contents: true,
		next: true,
		prev: true
	};

jQuery.extend({
	dir: function( elem, dir, until ) {
		var matched = [],
			truncate = until !== undefined;

		while ( (elem = elem[ dir ]) && elem.nodeType !== 9 ) {
			if ( elem.nodeType === 1 ) {
				if ( truncate && jQuery( elem ).is( until ) ) {
					break;
				}
				matched.push( elem );
			}
		}
		return matched;
	},

	sibling: function( n, elem ) {
		var matched = [];

		for ( ; n; n = n.nextSibling ) {
			if ( n.nodeType === 1 && n !== elem ) {
				matched.push( n );
			}
		}

		return matched;
	}
});

jQuery.fn.extend({
	has: function( target ) {
		var targets = jQuery( target, this ),
			l = targets.length;

		return this.filter(function() {
			var i = 0;
			for ( ; i < l; i++ ) {
				if ( jQuery.contains( this, targets[i] ) ) {
					return true;
				}
			}
		});
	},

	closest: function( selectors, context ) {
		var cur,
			i = 0,
			l = this.length,
			matched = [],
			pos = rneedsContext.test( selectors ) || typeof selectors !== "string" ?
				jQuery( selectors, context || this.context ) :
				0;

		for ( ; i < l; i++ ) {
			for ( cur = this[i]; cur && cur !== context; cur = cur.parentNode ) {
				// Always skip document fragments
				if ( cur.nodeType < 11 && (pos ?
					pos.index(cur) > -1 :

					// Don't pass non-elements to Sizzle
					cur.nodeType === 1 &&
						jQuery.find.matchesSelector(cur, selectors)) ) {

					matched.push( cur );
					break;
				}
			}
		}

		return this.pushStack( matched.length > 1 ? jQuery.unique( matched ) : matched );
	},

	// Determine the position of an element within the set
	index: function( elem ) {

		// No argument, return index in parent
		if ( !elem ) {
			return ( this[ 0 ] && this[ 0 ].parentNode ) ? this.first().prevAll().length : -1;
		}

		// Index in selector
		if ( typeof elem === "string" ) {
			return indexOf.call( jQuery( elem ), this[ 0 ] );
		}

		// Locate the position of the desired element
		return indexOf.call( this,

			// If it receives a jQuery object, the first element is used
			elem.jquery ? elem[ 0 ] : elem
		);
	},

	add: function( selector, context ) {
		return this.pushStack(
			jQuery.unique(
				jQuery.merge( this.get(), jQuery( selector, context ) )
			)
		);
	},

	addBack: function( selector ) {
		return this.add( selector == null ?
			this.prevObject : this.prevObject.filter(selector)
		);
	}
});

function sibling( cur, dir ) {
	while ( (cur = cur[dir]) && cur.nodeType !== 1 ) {}
	return cur;
}

jQuery.each({
	parent: function( elem ) {
		var parent = elem.parentNode;
		return parent && parent.nodeType !== 11 ? parent : null;
	},
	parents: function( elem ) {
		return jQuery.dir( elem, "parentNode" );
	},
	parentsUntil: function( elem, i, until ) {
		return jQuery.dir( elem, "parentNode", until );
	},
	next: function( elem ) {
		return sibling( elem, "nextSibling" );
	},
	prev: function( elem ) {
		return sibling( elem, "previousSibling" );
	},
	nextAll: function( elem ) {
		return jQuery.dir( elem, "nextSibling" );
	},
	prevAll: function( elem ) {
		return jQuery.dir( elem, "previousSibling" );
	},
	nextUntil: function( elem, i, until ) {
		return jQuery.dir( elem, "nextSibling", until );
	},
	prevUntil: function( elem, i, until ) {
		return jQuery.dir( elem, "previousSibling", until );
	},
	siblings: function( elem ) {
		return jQuery.sibling( ( elem.parentNode || {} ).firstChild, elem );
	},
	children: function( elem ) {
		return jQuery.sibling( elem.firstChild );
	},
	contents: function( elem ) {
		return elem.contentDocument || jQuery.merge( [], elem.childNodes );
	}
}, function( name, fn ) {
	jQuery.fn[ name ] = function( until, selector ) {
		var matched = jQuery.map( this, fn, until );

		if ( name.slice( -5 ) !== "Until" ) {
			selector = until;
		}

		if ( selector && typeof selector === "string" ) {
			matched = jQuery.filter( selector, matched );
		}

		if ( this.length > 1 ) {
			// Remove duplicates
			if ( !guaranteedUnique[ name ] ) {
				jQuery.unique( matched );
			}

			// Reverse order for parents* and prev-derivatives
			if ( rparentsprev.test( name ) ) {
				matched.reverse();
			}
		}

		return this.pushStack( matched );
	};
});
var rnotwhite = (/\S+/g);



// String to Object options format cache
var optionsCache = {};

// Convert String-formatted options into Object-formatted ones and store in cache
function createOptions( options ) {
	var object = optionsCache[ options ] = {};
	jQuery.each( options.match( rnotwhite ) || [], function( _, flag ) {
		object[ flag ] = true;
	});
	return object;
}

/*
 * Create a callback list using the following parameters:
 *
 *	options: an optional list of space-separated options that will change how
 *			the callback list behaves or a more traditional option object
 *
 * By default a callback list will act like an event callback list and can be
 * "fired" multiple times.
 *
 * Possible options:
 *
 *	once:			will ensure the callback list can only be fired once (like a Deferred)
 *
 *	memory:			will keep track of previous values and will call any callback added
 *					after the list has been fired right away with the latest "memorized"
 *					values (like a Deferred)
 *
 *	unique:			will ensure a callback can only be added once (no duplicate in the list)
 *
 *	stopOnFalse:	interrupt callings when a callback returns false
 *
 */
jQuery.Callbacks = function( options ) {

	// Convert options from String-formatted to Object-formatted if needed
	// (we check in cache first)
	options = typeof options === "string" ?
		( optionsCache[ options ] || createOptions( options ) ) :
		jQuery.extend( {}, options );

	var // Last fire value (for non-forgettable lists)
		memory,
		// Flag to know if list was already fired
		fired,
		// Flag to know if list is currently firing
		firing,
		// First callback to fire (used internally by add and fireWith)
		firingStart,
		// End of the loop when firing
		firingLength,
		// Index of currently firing callback (modified by remove if needed)
		firingIndex,
		// Actual callback list
		list = [],
		// Stack of fire calls for repeatable lists
		stack = !options.once && [],
		// Fire callbacks
		fire = function( data ) {
			memory = options.memory && data;
			fired = true;
			firingIndex = firingStart || 0;
			firingStart = 0;
			firingLength = list.length;
			firing = true;
			for ( ; list && firingIndex < firingLength; firingIndex++ ) {
				if ( list[ firingIndex ].apply( data[ 0 ], data[ 1 ] ) === false && options.stopOnFalse ) {
					memory = false; // To prevent further calls using add
					break;
				}
			}
			firing = false;
			if ( list ) {
				if ( stack ) {
					if ( stack.length ) {
						fire( stack.shift() );
					}
				} else if ( memory ) {
					list = [];
				} else {
					self.disable();
				}
			}
		},
		// Actual Callbacks object
		self = {
			// Add a callback or a collection of callbacks to the list
			add: function() {
				if ( list ) {
					// First, we save the current length
					var start = list.length;
					(function add( args ) {
						jQuery.each( args, function( _, arg ) {
							var type = jQuery.type( arg );
							if ( type === "function" ) {
								if ( !options.unique || !self.has( arg ) ) {
									list.push( arg );
								}
							} else if ( arg && arg.length && type !== "string" ) {
								// Inspect recursively
								add( arg );
							}
						});
					})( arguments );
					// Do we need to add the callbacks to the
					// current firing batch?
					if ( firing ) {
						firingLength = list.length;
					// With memory, if we're not firing then
					// we should call right away
					} else if ( memory ) {
						firingStart = start;
						fire( memory );
					}
				}
				return this;
			},
			// Remove a callback from the list
			remove: function() {
				if ( list ) {
					jQuery.each( arguments, function( _, arg ) {
						var index;
						while ( ( index = jQuery.inArray( arg, list, index ) ) > -1 ) {
							list.splice( index, 1 );
							// Handle firing indexes
							if ( firing ) {
								if ( index <= firingLength ) {
									firingLength--;
								}
								if ( index <= firingIndex ) {
									firingIndex--;
								}
							}
						}
					});
				}
				return this;
			},
			// Check if a given callback is in the list.
			// If no argument is given, return whether or not list has callbacks attached.
			has: function( fn ) {
				return fn ? jQuery.inArray( fn, list ) > -1 : !!( list && list.length );
			},
			// Remove all callbacks from the list
			empty: function() {
				list = [];
				firingLength = 0;
				return this;
			},
			// Have the list do nothing anymore
			disable: function() {
				list = stack = memory = undefined;
				return this;
			},
			// Is it disabled?
			disabled: function() {
				return !list;
			},
			// Lock the list in its current state
			lock: function() {
				stack = undefined;
				if ( !memory ) {
					self.disable();
				}
				return this;
			},
			// Is it locked?
			locked: function() {
				return !stack;
			},
			// Call all callbacks with the given context and arguments
			fireWith: function( context, args ) {
				if ( list && ( !fired || stack ) ) {
					args = args || [];
					args = [ context, args.slice ? args.slice() : args ];
					if ( firing ) {
						stack.push( args );
					} else {
						fire( args );
					}
				}
				return this;
			},
			// Call all the callbacks with the given arguments
			fire: function() {
				self.fireWith( this, arguments );
				return this;
			},
			// To know if the callbacks have already been called at least once
			fired: function() {
				return !!fired;
			}
		};

	return self;
};


jQuery.extend({

	Deferred: function( func ) {
		var tuples = [
				// action, add listener, listener list, final state
				[ "resolve", "done", jQuery.Callbacks("once memory"), "resolved" ],
				[ "reject", "fail", jQuery.Callbacks("once memory"), "rejected" ],
				[ "notify", "progress", jQuery.Callbacks("memory") ]
			],
			state = "pending",
			promise = {
				state: function() {
					return state;
				},
				always: function() {
					deferred.done( arguments ).fail( arguments );
					return this;
				},
				then: function( /* fnDone, fnFail, fnProgress */ ) {
					var fns = arguments;
					return jQuery.Deferred(function( newDefer ) {
						jQuery.each( tuples, function( i, tuple ) {
							var fn = jQuery.isFunction( fns[ i ] ) && fns[ i ];
							// deferred[ done | fail | progress ] for forwarding actions to newDefer
							deferred[ tuple[1] ](function() {
								var returned = fn && fn.apply( this, arguments );
								if ( returned && jQuery.isFunction( returned.promise ) ) {
									returned.promise()
										.done( newDefer.resolve )
										.fail( newDefer.reject )
										.progress( newDefer.notify );
								} else {
									newDefer[ tuple[ 0 ] + "With" ]( this === promise ? newDefer.promise() : this, fn ? [ returned ] : arguments );
								}
							});
						});
						fns = null;
					}).promise();
				},
				// Get a promise for this deferred
				// If obj is provided, the promise aspect is added to the object
				promise: function( obj ) {
					return obj != null ? jQuery.extend( obj, promise ) : promise;
				}
			},
			deferred = {};

		// Keep pipe for back-compat
		promise.pipe = promise.then;

		// Add list-specific methods
		jQuery.each( tuples, function( i, tuple ) {
			var list = tuple[ 2 ],
				stateString = tuple[ 3 ];

			// promise[ done | fail | progress ] = list.add
			promise[ tuple[1] ] = list.add;

			// Handle state
			if ( stateString ) {
				list.add(function() {
					// state = [ resolved | rejected ]
					state = stateString;

				// [ reject_list | resolve_list ].disable; progress_list.lock
				}, tuples[ i ^ 1 ][ 2 ].disable, tuples[ 2 ][ 2 ].lock );
			}

			// deferred[ resolve | reject | notify ]
			deferred[ tuple[0] ] = function() {
				deferred[ tuple[0] + "With" ]( this === deferred ? promise : this, arguments );
				return this;
			};
			deferred[ tuple[0] + "With" ] = list.fireWith;
		});

		// Make the deferred a promise
		promise.promise( deferred );

		// Call given func if any
		if ( func ) {
			func.call( deferred, deferred );
		}

		// All done!
		return deferred;
	},

	// Deferred helper
	when: function( subordinate /* , ..., subordinateN */ ) {
		var i = 0,
			resolveValues = slice.call( arguments ),
			length = resolveValues.length,

			// the count of uncompleted subordinates
			remaining = length !== 1 || ( subordinate && jQuery.isFunction( subordinate.promise ) ) ? length : 0,

			// the master Deferred. If resolveValues consist of only a single Deferred, just use that.
			deferred = remaining === 1 ? subordinate : jQuery.Deferred(),

			// Update function for both resolve and progress values
			updateFunc = function( i, contexts, values ) {
				return function( value ) {
					contexts[ i ] = this;
					values[ i ] = arguments.length > 1 ? slice.call( arguments ) : value;
					if ( values === progressValues ) {
						deferred.notifyWith( contexts, values );
					} else if ( !( --remaining ) ) {
						deferred.resolveWith( contexts, values );
					}
				};
			},

			progressValues, progressContexts, resolveContexts;

		// Add listeners to Deferred subordinates; treat others as resolved
		if ( length > 1 ) {
			progressValues = new Array( length );
			progressContexts = new Array( length );
			resolveContexts = new Array( length );
			for ( ; i < length; i++ ) {
				if ( resolveValues[ i ] && jQuery.isFunction( resolveValues[ i ].promise ) ) {
					resolveValues[ i ].promise()
						.done( updateFunc( i, resolveContexts, resolveValues ) )
						.fail( deferred.reject )
						.progress( updateFunc( i, progressContexts, progressValues ) );
				} else {
					--remaining;
				}
			}
		}

		// If we're not waiting on anything, resolve the master
		if ( !remaining ) {
			deferred.resolveWith( resolveContexts, resolveValues );
		}

		return deferred.promise();
	}
});


// The deferred used on DOM ready
var readyList;

jQuery.fn.ready = function( fn ) {
	// Add the callback
	jQuery.ready.promise().done( fn );

	return this;
};

jQuery.extend({
	// Is the DOM ready to be used? Set to true once it occurs.
	isReady: false,

	// A counter to track how many items to wait for before
	// the ready event fires. See #6781
	readyWait: 1,

	// Hold (or release) the ready event
	holdReady: function( hold ) {
		if ( hold ) {
			jQuery.readyWait++;
		} else {
			jQuery.ready( true );
		}
	},

	// Handle when the DOM is ready
	ready: function( wait ) {

		// Abort if there are pending holds or we're already ready
		if ( wait === true ? --jQuery.readyWait : jQuery.isReady ) {
			return;
		}

		// Remember that the DOM is ready
		jQuery.isReady = true;

		// If a normal DOM Ready event fired, decrement, and wait if need be
		if ( wait !== true && --jQuery.readyWait > 0 ) {
			return;
		}

		// If there are functions bound, to execute
		readyList.resolveWith( document, [ jQuery ] );

		// Trigger any bound ready events
		if ( jQuery.fn.triggerHandler ) {
			jQuery( document ).triggerHandler( "ready" );
			jQuery( document ).off( "ready" );
		}
	}
});

/**
 * The ready event handler and self cleanup method
 */
function completed() {
	document.removeEventListener( "DOMContentLoaded", completed, false );
	window.removeEventListener( "load", completed, false );
	jQuery.ready();
}

jQuery.ready.promise = function( obj ) {
	if ( !readyList ) {

		readyList = jQuery.Deferred();

		// Catch cases where $(document).ready() is called after the browser event has already occurred.
		// We once tried to use readyState "interactive" here, but it caused issues like the one
		// discovered by ChrisS here: http://bugs.jquery.com/ticket/12282#comment:15
		if ( document.readyState === "complete" ) {
			// Handle it asynchronously to allow scripts the opportunity to delay ready
			setTimeout( jQuery.ready );

		} else {

			// Use the handy event callback
			document.addEventListener( "DOMContentLoaded", completed, false );

			// A fallback to window.onload, that will always work
			window.addEventListener( "load", completed, false );
		}
	}
	return readyList.promise( obj );
};

// Kick off the DOM ready check even if the user does not
jQuery.ready.promise();




// Multifunctional method to get and set values of a collection
// The value/s can optionally be executed if it's a function
var access = jQuery.access = function( elems, fn, key, value, chainable, emptyGet, raw ) {
	var i = 0,
		len = elems.length,
		bulk = key == null;

	// Sets many values
	if ( jQuery.type( key ) === "object" ) {
		chainable = true;
		for ( i in key ) {
			jQuery.access( elems, fn, i, key[i], true, emptyGet, raw );
		}

	// Sets one value
	} else if ( value !== undefined ) {
		chainable = true;

		if ( !jQuery.isFunction( value ) ) {
			raw = true;
		}

		if ( bulk ) {
			// Bulk operations run against the entire set
			if ( raw ) {
				fn.call( elems, value );
				fn = null;

			// ...except when executing function values
			} else {
				bulk = fn;
				fn = function( elem, key, value ) {
					return bulk.call( jQuery( elem ), value );
				};
			}
		}

		if ( fn ) {
			for ( ; i < len; i++ ) {
				fn( elems[i], key, raw ? value : value.call( elems[i], i, fn( elems[i], key ) ) );
			}
		}
	}

	return chainable ?
		elems :

		// Gets
		bulk ?
			fn.call( elems ) :
			len ? fn( elems[0], key ) : emptyGet;
};


/**
 * Determines whether an object can have data
 */
jQuery.acceptData = function( owner ) {
	// Accepts only:
	//  - Node
	//    - Node.ELEMENT_NODE
	//    - Node.DOCUMENT_NODE
	//  - Object
	//    - Any
	/* jshint -W018 */
	return owner.nodeType === 1 || owner.nodeType === 9 || !( +owner.nodeType );
};


function Data() {
	// Support: Android<4,
	// Old WebKit does not have Object.preventExtensions/freeze method,
	// return new empty object instead with no [[set]] accessor
	Object.defineProperty( this.cache = {}, 0, {
		get: function() {
			return {};
		}
	});

	this.expando = jQuery.expando + Data.uid++;
}

Data.uid = 1;
Data.accepts = jQuery.acceptData;

Data.prototype = {
	key: function( owner ) {
		// We can accept data for non-element nodes in modern browsers,
		// but we should not, see #8335.
		// Always return the key for a frozen object.
		if ( !Data.accepts( owner ) ) {
			return 0;
		}

		var descriptor = {},
			// Check if the owner object already has a cache key
			unlock = owner[ this.expando ];

		// If not, create one
		if ( !unlock ) {
			unlock = Data.uid++;

			// Secure it in a non-enumerable, non-writable property
			try {
				descriptor[ this.expando ] = { value: unlock };
				Object.defineProperties( owner, descriptor );

			// Support: Android<4
			// Fallback to a less secure definition
			} catch ( e ) {
				descriptor[ this.expando ] = unlock;
				jQuery.extend( owner, descriptor );
			}
		}

		// Ensure the cache object
		if ( !this.cache[ unlock ] ) {
			this.cache[ unlock ] = {};
		}

		return unlock;
	},
	set: function( owner, data, value ) {
		var prop,
			// There may be an unlock assigned to this node,
			// if there is no entry for this "owner", create one inline
			// and set the unlock as though an owner entry had always existed
			unlock = this.key( owner ),
			cache = this.cache[ unlock ];

		// Handle: [ owner, key, value ] args
		if ( typeof data === "string" ) {
			cache[ data ] = value;

		// Handle: [ owner, { properties } ] args
		} else {
			// Fresh assignments by object are shallow copied
			if ( jQuery.isEmptyObject( cache ) ) {
				jQuery.extend( this.cache[ unlock ], data );
			// Otherwise, copy the properties one-by-one to the cache object
			} else {
				for ( prop in data ) {
					cache[ prop ] = data[ prop ];
				}
			}
		}
		return cache;
	},
	get: function( owner, key ) {
		// Either a valid cache is found, or will be created.
		// New caches will be created and the unlock returned,
		// allowing direct access to the newly created
		// empty data object. A valid owner object must be provided.
		var cache = this.cache[ this.key( owner ) ];

		return key === undefined ?
			cache : cache[ key ];
	},
	access: function( owner, key, value ) {
		var stored;
		// In cases where either:
		//
		//   1. No key was specified
		//   2. A string key was specified, but no value provided
		//
		// Take the "read" path and allow the get method to determine
		// which value to return, respectively either:
		//
		//   1. The entire cache object
		//   2. The data stored at the key
		//
		if ( key === undefined ||
				((key && typeof key === "string") && value === undefined) ) {

			stored = this.get( owner, key );

			return stored !== undefined ?
				stored : this.get( owner, jQuery.camelCase(key) );
		}

		// [*]When the key is not a string, or both a key and value
		// are specified, set or extend (existing objects) with either:
		//
		//   1. An object of properties
		//   2. A key and value
		//
		this.set( owner, key, value );

		// Since the "set" path can have two possible entry points
		// return the expected data based on which path was taken[*]
		return value !== undefined ? value : key;
	},
	remove: function( owner, key ) {
		var i, name, camel,
			unlock = this.key( owner ),
			cache = this.cache[ unlock ];

		if ( key === undefined ) {
			this.cache[ unlock ] = {};

		} else {
			// Support array or space separated string of keys
			if ( jQuery.isArray( key ) ) {
				// If "name" is an array of keys...
				// When data is initially created, via ("key", "val") signature,
				// keys will be converted to camelCase.
				// Since there is no way to tell _how_ a key was added, remove
				// both plain key and camelCase key. #12786
				// This will only penalize the array argument path.
				name = key.concat( key.map( jQuery.camelCase ) );
			} else {
				camel = jQuery.camelCase( key );
				// Try the string as a key before any manipulation
				if ( key in cache ) {
					name = [ key, camel ];
				} else {
					// If a key with the spaces exists, use it.
					// Otherwise, create an array by matching non-whitespace
					name = camel;
					name = name in cache ?
						[ name ] : ( name.match( rnotwhite ) || [] );
				}
			}

			i = name.length;
			while ( i-- ) {
				delete cache[ name[ i ] ];
			}
		}
	},
	hasData: function( owner ) {
		return !jQuery.isEmptyObject(
			this.cache[ owner[ this.expando ] ] || {}
		);
	},
	discard: function( owner ) {
		if ( owner[ this.expando ] ) {
			delete this.cache[ owner[ this.expando ] ];
		}
	}
};
var data_priv = new Data();

var data_user = new Data();



//	Implementation Summary
//
//	1. Enforce API surface and semantic compatibility with 1.9.x branch
//	2. Improve the module's maintainability by reducing the storage
//		paths to a single mechanism.
//	3. Use the same single mechanism to support "private" and "user" data.
//	4. _Never_ expose "private" data to user code (TODO: Drop _data, _removeData)
//	5. Avoid exposing implementation details on user objects (eg. expando properties)
//	6. Provide a clear path for implementation upgrade to WeakMap in 2014

var rbrace = /^(?:\{[\w\W]*\}|\[[\w\W]*\])$/,
	rmultiDash = /([A-Z])/g;

function dataAttr( elem, key, data ) {
	var name;

	// If nothing was found internally, try to fetch any
	// data from the HTML5 data-* attribute
	if ( data === undefined && elem.nodeType === 1 ) {
		name = "data-" + key.replace( rmultiDash, "-$1" ).toLowerCase();
		data = elem.getAttribute( name );

		if ( typeof data === "string" ) {
			try {
				data = data === "true" ? true :
					data === "false" ? false :
					data === "null" ? null :
					// Only convert to a number if it doesn't change the string
					+data + "" === data ? +data :
					rbrace.test( data ) ? jQuery.parseJSON( data ) :
					data;
			} catch( e ) {}

			// Make sure we set the data so it isn't changed later
			data_user.set( elem, key, data );
		} else {
			data = undefined;
		}
	}
	return data;
}

jQuery.extend({
	hasData: function( elem ) {
		return data_user.hasData( elem ) || data_priv.hasData( elem );
	},

	data: function( elem, name, data ) {
		return data_user.access( elem, name, data );
	},

	removeData: function( elem, name ) {
		data_user.remove( elem, name );
	},

	// TODO: Now that all calls to _data and _removeData have been replaced
	// with direct calls to data_priv methods, these can be deprecated.
	_data: function( elem, name, data ) {
		return data_priv.access( elem, name, data );
	},

	_removeData: function( elem, name ) {
		data_priv.remove( elem, name );
	}
});

jQuery.fn.extend({
	data: function( key, value ) {
		var i, name, data,
			elem = this[ 0 ],
			attrs = elem && elem.attributes;

		// Gets all values
		if ( key === undefined ) {
			if ( this.length ) {
				data = data_user.get( elem );

				if ( elem.nodeType === 1 && !data_priv.get( elem, "hasDataAttrs" ) ) {
					i = attrs.length;
					while ( i-- ) {

						// Support: IE11+
						// The attrs elements can be null (#14894)
						if ( attrs[ i ] ) {
							name = attrs[ i ].name;
							if ( name.indexOf( "data-" ) === 0 ) {
								name = jQuery.camelCase( name.slice(5) );
								dataAttr( elem, name, data[ name ] );
							}
						}
					}
					data_priv.set( elem, "hasDataAttrs", true );
				}
			}

			return data;
		}

		// Sets multiple values
		if ( typeof key === "object" ) {
			return this.each(function() {
				data_user.set( this, key );
			});
		}

		return access( this, function( value ) {
			var data,
				camelKey = jQuery.camelCase( key );

			// The calling jQuery object (element matches) is not empty
			// (and therefore has an element appears at this[ 0 ]) and the
			// `value` parameter was not undefined. An empty jQuery object
			// will result in `undefined` for elem = this[ 0 ] which will
			// throw an exception if an attempt to read a data cache is made.
			if ( elem && value === undefined ) {
				// Attempt to get data from the cache
				// with the key as-is
				data = data_user.get( elem, key );
				if ( data !== undefined ) {
					return data;
				}

				// Attempt to get data from the cache
				// with the key camelized
				data = data_user.get( elem, camelKey );
				if ( data !== undefined ) {
					return data;
				}

				// Attempt to "discover" the data in
				// HTML5 custom data-* attrs
				data = dataAttr( elem, camelKey, undefined );
				if ( data !== undefined ) {
					return data;
				}

				// We tried really hard, but the data doesn't exist.
				return;
			}

			// Set the data...
			this.each(function() {
				// First, attempt to store a copy or reference of any
				// data that might've been store with a camelCased key.
				var data = data_user.get( this, camelKey );

				// For HTML5 data-* attribute interop, we have to
				// store property names with dashes in a camelCase form.
				// This might not apply to all properties...*
				data_user.set( this, camelKey, value );

				// *... In the case of properties that might _actually_
				// have dashes, we need to also store a copy of that
				// unchanged property.
				if ( key.indexOf("-") !== -1 && data !== undefined ) {
					data_user.set( this, key, value );
				}
			});
		}, null, value, arguments.length > 1, null, true );
	},

	removeData: function( key ) {
		return this.each(function() {
			data_user.remove( this, key );
		});
	}
});


jQuery.extend({
	queue: function( elem, type, data ) {
		var queue;

		if ( elem ) {
			type = ( type || "fx" ) + "queue";
			queue = data_priv.get( elem, type );

			// Speed up dequeue by getting out quickly if this is just a lookup
			if ( data ) {
				if ( !queue || jQuery.isArray( data ) ) {
					queue = data_priv.access( elem, type, jQuery.makeArray(data) );
				} else {
					queue.push( data );
				}
			}
			return queue || [];
		}
	},

	dequeue: function( elem, type ) {
		type = type || "fx";

		var queue = jQuery.queue( elem, type ),
			startLength = queue.length,
			fn = queue.shift(),
			hooks = jQuery._queueHooks( elem, type ),
			next = function() {
				jQuery.dequeue( elem, type );
			};

		// If the fx queue is dequeued, always remove the progress sentinel
		if ( fn === "inprogress" ) {
			fn = queue.shift();
			startLength--;
		}

		if ( fn ) {

			// Add a progress sentinel to prevent the fx queue from being
			// automatically dequeued
			if ( type === "fx" ) {
				queue.unshift( "inprogress" );
			}

			// Clear up the last queue stop function
			delete hooks.stop;
			fn.call( elem, next, hooks );
		}

		if ( !startLength && hooks ) {
			hooks.empty.fire();
		}
	},

	// Not public - generate a queueHooks object, or return the current one
	_queueHooks: function( elem, type ) {
		var key = type + "queueHooks";
		return data_priv.get( elem, key ) || data_priv.access( elem, key, {
			empty: jQuery.Callbacks("once memory").add(function() {
				data_priv.remove( elem, [ type + "queue", key ] );
			})
		});
	}
});

jQuery.fn.extend({
	queue: function( type, data ) {
		var setter = 2;

		if ( typeof type !== "string" ) {
			data = type;
			type = "fx";
			setter--;
		}

		if ( arguments.length < setter ) {
			return jQuery.queue( this[0], type );
		}

		return data === undefined ?
			this :
			this.each(function() {
				var queue = jQuery.queue( this, type, data );

				// Ensure a hooks for this queue
				jQuery._queueHooks( this, type );

				if ( type === "fx" && queue[0] !== "inprogress" ) {
					jQuery.dequeue( this, type );
				}
			});
	},
	dequeue: function( type ) {
		return this.each(function() {
			jQuery.dequeue( this, type );
		});
	},
	clearQueue: function( type ) {
		return this.queue( type || "fx", [] );
	},
	// Get a promise resolved when queues of a certain type
	// are emptied (fx is the type by default)
	promise: function( type, obj ) {
		var tmp,
			count = 1,
			defer = jQuery.Deferred(),
			elements = this,
			i = this.length,
			resolve = function() {
				if ( !( --count ) ) {
					defer.resolveWith( elements, [ elements ] );
				}
			};

		if ( typeof type !== "string" ) {
			obj = type;
			type = undefined;
		}
		type = type || "fx";

		while ( i-- ) {
			tmp = data_priv.get( elements[ i ], type + "queueHooks" );
			if ( tmp && tmp.empty ) {
				count++;
				tmp.empty.add( resolve );
			}
		}
		resolve();
		return defer.promise( obj );
	}
});
var pnum = (/[+-]?(?:\d*\.|)\d+(?:[eE][+-]?\d+|)/).source;

var cssExpand = [ "Top", "Right", "Bottom", "Left" ];

var isHidden = function( elem, el ) {
		// isHidden might be called from jQuery#filter function;
		// in that case, element will be second argument
		elem = el || elem;
		return jQuery.css( elem, "display" ) === "none" || !jQuery.contains( elem.ownerDocument, elem );
	};

var rcheckableType = (/^(?:checkbox|radio)$/i);



(function() {
	var fragment = document.createDocumentFragment(),
		div = fragment.appendChild( document.createElement( "div" ) ),
		input = document.createElement( "input" );

	// Support: Safari<=5.1
	// Check state lost if the name is set (#11217)
	// Support: Windows Web Apps (WWA)
	// `name` and `type` must use .setAttribute for WWA (#14901)
	input.setAttribute( "type", "radio" );
	input.setAttribute( "checked", "checked" );
	input.setAttribute( "name", "t" );

	div.appendChild( input );

	// Support: Safari<=5.1, Android<4.2
	// Older WebKit doesn't clone checked state correctly in fragments
	support.checkClone = div.cloneNode( true ).cloneNode( true ).lastChild.checked;

	// Support: IE<=11+
	// Make sure textarea (and checkbox) defaultValue is properly cloned
	div.innerHTML = "<textarea>x</textarea>";
	support.noCloneChecked = !!div.cloneNode( true ).lastChild.defaultValue;
})();
var strundefined = typeof undefined;



support.focusinBubbles = "onfocusin" in window;


var
	rkeyEvent = /^key/,
	rmouseEvent = /^(?:mouse|pointer|contextmenu)|click/,
	rfocusMorph = /^(?:focusinfocus|focusoutblur)$/,
	rtypenamespace = /^([^.]*)(?:\.(.+)|)$/;

function returnTrue() {
	return true;
}

function returnFalse() {
	return false;
}

function safeActiveElement() {
	try {
		return document.activeElement;
	} catch ( err ) { }
}

/*
 * Helper functions for managing events -- not part of the public interface.
 * Props to Dean Edwards' addEvent library for many of the ideas.
 */
jQuery.event = {

	global: {},

	add: function( elem, types, handler, data, selector ) {

		var handleObjIn, eventHandle, tmp,
			events, t, handleObj,
			special, handlers, type, namespaces, origType,
			elemData = data_priv.get( elem );

		// Don't attach events to noData or text/comment nodes (but allow plain objects)
		if ( !elemData ) {
			return;
		}

		// Caller can pass in an object of custom data in lieu of the handler
		if ( handler.handler ) {
			handleObjIn = handler;
			handler = handleObjIn.handler;
			selector = handleObjIn.selector;
		}

		// Make sure that the handler has a unique ID, used to find/remove it later
		if ( !handler.guid ) {
			handler.guid = jQuery.guid++;
		}

		// Init the element's event structure and main handler, if this is the first
		if ( !(events = elemData.events) ) {
			events = elemData.events = {};
		}
		if ( !(eventHandle = elemData.handle) ) {
			eventHandle = elemData.handle = function( e ) {
				// Discard the second event of a jQuery.event.trigger() and
				// when an event is called after a page has unloaded
				return typeof jQuery !== strundefined && jQuery.event.triggered !== e.type ?
					jQuery.event.dispatch.apply( elem, arguments ) : undefined;
			};
		}

		// Handle multiple events separated by a space
		types = ( types || "" ).match( rnotwhite ) || [ "" ];
		t = types.length;
		while ( t-- ) {
			tmp = rtypenamespace.exec( types[t] ) || [];
			type = origType = tmp[1];
			namespaces = ( tmp[2] || "" ).split( "." ).sort();

			// There *must* be a type, no attaching namespace-only handlers
			if ( !type ) {
				continue;
			}

			// If event changes its type, use the special event handlers for the changed type
			special = jQuery.event.special[ type ] || {};

			// If selector defined, determine special event api type, otherwise given type
			type = ( selector ? special.delegateType : special.bindType ) || type;

			// Update special based on newly reset type
			special = jQuery.event.special[ type ] || {};

			// handleObj is passed to all event handlers
			handleObj = jQuery.extend({
				type: type,
				origType: origType,
				data: data,
				handler: handler,
				guid: handler.guid,
				selector: selector,
				needsContext: selector && jQuery.expr.match.needsContext.test( selector ),
				namespace: namespaces.join(".")
			}, handleObjIn );

			// Init the event handler queue if we're the first
			if ( !(handlers = events[ type ]) ) {
				handlers = events[ type ] = [];
				handlers.delegateCount = 0;

				// Only use addEventListener if the special events handler returns false
				if ( !special.setup || special.setup.call( elem, data, namespaces, eventHandle ) === false ) {
					if ( elem.addEventListener ) {
						elem.addEventListener( type, eventHandle, false );
					}
				}
			}

			if ( special.add ) {
				special.add.call( elem, handleObj );

				if ( !handleObj.handler.guid ) {
					handleObj.handler.guid = handler.guid;
				}
			}

			// Add to the element's handler list, delegates in front
			if ( selector ) {
				handlers.splice( handlers.delegateCount++, 0, handleObj );
			} else {
				handlers.push( handleObj );
			}

			// Keep track of which events have ever been used, for event optimization
			jQuery.event.global[ type ] = true;
		}

	},

	// Detach an event or set of events from an element
	remove: function( elem, types, handler, selector, mappedTypes ) {

		var j, origCount, tmp,
			events, t, handleObj,
			special, handlers, type, namespaces, origType,
			elemData = data_priv.hasData( elem ) && data_priv.get( elem );

		if ( !elemData || !(events = elemData.events) ) {
			return;
		}

		// Once for each type.namespace in types; type may be omitted
		types = ( types || "" ).match( rnotwhite ) || [ "" ];
		t = types.length;
		while ( t-- ) {
			tmp = rtypenamespace.exec( types[t] ) || [];
			type = origType = tmp[1];
			namespaces = ( tmp[2] || "" ).split( "." ).sort();

			// Unbind all events (on this namespace, if provided) for the element
			if ( !type ) {
				for ( type in events ) {
					jQuery.event.remove( elem, type + types[ t ], handler, selector, true );
				}
				continue;
			}

			special = jQuery.event.special[ type ] || {};
			type = ( selector ? special.delegateType : special.bindType ) || type;
			handlers = events[ type ] || [];
			tmp = tmp[2] && new RegExp( "(^|\\.)" + namespaces.join("\\.(?:.*\\.|)") + "(\\.|$)" );

			// Remove matching events
			origCount = j = handlers.length;
			while ( j-- ) {
				handleObj = handlers[ j ];

				if ( ( mappedTypes || origType === handleObj.origType ) &&
					( !handler || handler.guid === handleObj.guid ) &&
					( !tmp || tmp.test( handleObj.namespace ) ) &&
					( !selector || selector === handleObj.selector || selector === "**" && handleObj.selector ) ) {
					handlers.splice( j, 1 );

					if ( handleObj.selector ) {
						handlers.delegateCount--;
					}
					if ( special.remove ) {
						special.remove.call( elem, handleObj );
					}
				}
			}

			// Remove generic event handler if we removed something and no more handlers exist
			// (avoids potential for endless recursion during removal of special event handlers)
			if ( origCount && !handlers.length ) {
				if ( !special.teardown || special.teardown.call( elem, namespaces, elemData.handle ) === false ) {
					jQuery.removeEvent( elem, type, elemData.handle );
				}

				delete events[ type ];
			}
		}

		// Remove the expando if it's no longer used
		if ( jQuery.isEmptyObject( events ) ) {
			delete elemData.handle;
			data_priv.remove( elem, "events" );
		}
	},

	trigger: function( event, data, elem, onlyHandlers ) {

		var i, cur, tmp, bubbleType, ontype, handle, special,
			eventPath = [ elem || document ],
			type = hasOwn.call( event, "type" ) ? event.type : event,
			namespaces = hasOwn.call( event, "namespace" ) ? event.namespace.split(".") : [];

		cur = tmp = elem = elem || document;

		// Don't do events on text and comment nodes
		if ( elem.nodeType === 3 || elem.nodeType === 8 ) {
			return;
		}

		// focus/blur morphs to focusin/out; ensure we're not firing them right now
		if ( rfocusMorph.test( type + jQuery.event.triggered ) ) {
			return;
		}

		if ( type.indexOf(".") >= 0 ) {
			// Namespaced trigger; create a regexp to match event type in handle()
			namespaces = type.split(".");
			type = namespaces.shift();
			namespaces.sort();
		}
		ontype = type.indexOf(":") < 0 && "on" + type;

		// Caller can pass in a jQuery.Event object, Object, or just an event type string
		event = event[ jQuery.expando ] ?
			event :
			new jQuery.Event( type, typeof event === "object" && event );

		// Trigger bitmask: & 1 for native handlers; & 2 for jQuery (always true)
		event.isTrigger = onlyHandlers ? 2 : 3;
		event.namespace = namespaces.join(".");
		event.namespace_re = event.namespace ?
			new RegExp( "(^|\\.)" + namespaces.join("\\.(?:.*\\.|)") + "(\\.|$)" ) :
			null;

		// Clean up the event in case it is being reused
		event.result = undefined;
		if ( !event.target ) {
			event.target = elem;
		}

		// Clone any incoming data and prepend the event, creating the handler arg list
		data = data == null ?
			[ event ] :
			jQuery.makeArray( data, [ event ] );

		// Allow special events to draw outside the lines
		special = jQuery.event.special[ type ] || {};
		if ( !onlyHandlers && special.trigger && special.trigger.apply( elem, data ) === false ) {
			return;
		}

		// Determine event propagation path in advance, per W3C events spec (#9951)
		// Bubble up to document, then to window; watch for a global ownerDocument var (#9724)
		if ( !onlyHandlers && !special.noBubble && !jQuery.isWindow( elem ) ) {

			bubbleType = special.delegateType || type;
			if ( !rfocusMorph.test( bubbleType + type ) ) {
				cur = cur.parentNode;
			}
			for ( ; cur; cur = cur.parentNode ) {
				eventPath.push( cur );
				tmp = cur;
			}

			// Only add window if we got to document (e.g., not plain obj or detached DOM)
			if ( tmp === (elem.ownerDocument || document) ) {
				eventPath.push( tmp.defaultView || tmp.parentWindow || window );
			}
		}

		// Fire handlers on the event path
		i = 0;
		while ( (cur = eventPath[i++]) && !event.isPropagationStopped() ) {

			event.type = i > 1 ?
				bubbleType :
				special.bindType || type;

			// jQuery handler
			handle = ( data_priv.get( cur, "events" ) || {} )[ event.type ] && data_priv.get( cur, "handle" );
			if ( handle ) {
				handle.apply( cur, data );
			}

			// Native handler
			handle = ontype && cur[ ontype ];
			if ( handle && handle.apply && jQuery.acceptData( cur ) ) {
				event.result = handle.apply( cur, data );
				if ( event.result === false ) {
					event.preventDefault();
				}
			}
		}
		event.type = type;

		// If nobody prevented the default action, do it now
		if ( !onlyHandlers && !event.isDefaultPrevented() ) {

			if ( (!special._default || special._default.apply( eventPath.pop(), data ) === false) &&
				jQuery.acceptData( elem ) ) {

				// Call a native DOM method on the target with the same name name as the event.
				// Don't do default actions on window, that's where global variables be (#6170)
				if ( ontype && jQuery.isFunction( elem[ type ] ) && !jQuery.isWindow( elem ) ) {

					// Don't re-trigger an onFOO event when we call its FOO() method
					tmp = elem[ ontype ];

					if ( tmp ) {
						elem[ ontype ] = null;
					}

					// Prevent re-triggering of the same event, since we already bubbled it above
					jQuery.event.triggered = type;
					elem[ type ]();
					jQuery.event.triggered = undefined;

					if ( tmp ) {
						elem[ ontype ] = tmp;
					}
				}
			}
		}

		return event.result;
	},

	dispatch: function( event ) {

		// Make a writable jQuery.Event from the native event object
		event = jQuery.event.fix( event );

		var i, j, ret, matched, handleObj,
			handlerQueue = [],
			args = slice.call( arguments ),
			handlers = ( data_priv.get( this, "events" ) || {} )[ event.type ] || [],
			special = jQuery.event.special[ event.type ] || {};

		// Use the fix-ed jQuery.Event rather than the (read-only) native event
		args[0] = event;
		event.delegateTarget = this;

		// Call the preDispatch hook for the mapped type, and let it bail if desired
		if ( special.preDispatch && special.preDispatch.call( this, event ) === false ) {
			return;
		}

		// Determine handlers
		handlerQueue = jQuery.event.handlers.call( this, event, handlers );

		// Run delegates first; they may want to stop propagation beneath us
		i = 0;
		while ( (matched = handlerQueue[ i++ ]) && !event.isPropagationStopped() ) {
			event.currentTarget = matched.elem;

			j = 0;
			while ( (handleObj = matched.handlers[ j++ ]) && !event.isImmediatePropagationStopped() ) {

				// Triggered event must either 1) have no namespace, or 2) have namespace(s)
				// a subset or equal to those in the bound event (both can have no namespace).
				if ( !event.namespace_re || event.namespace_re.test( handleObj.namespace ) ) {

					event.handleObj = handleObj;
					event.data = handleObj.data;

					ret = ( (jQuery.event.special[ handleObj.origType ] || {}).handle || handleObj.handler )
							.apply( matched.elem, args );

					if ( ret !== undefined ) {
						if ( (event.result = ret) === false ) {
							event.preventDefault();
							event.stopPropagation();
						}
					}
				}
			}
		}

		// Call the postDispatch hook for the mapped type
		if ( special.postDispatch ) {
			special.postDispatch.call( this, event );
		}

		return event.result;
	},

	handlers: function( event, handlers ) {
		var i, matches, sel, handleObj,
			handlerQueue = [],
			delegateCount = handlers.delegateCount,
			cur = event.target;

		// Find delegate handlers
		// Black-hole SVG <use> instance trees (#13180)
		// Avoid non-left-click bubbling in Firefox (#3861)
		if ( delegateCount && cur.nodeType && (!event.button || event.type !== "click") ) {

			for ( ; cur !== this; cur = cur.parentNode || this ) {

				// Don't process clicks on disabled elements (#6911, #8165, #11382, #11764)
				if ( cur.disabled !== true || event.type !== "click" ) {
					matches = [];
					for ( i = 0; i < delegateCount; i++ ) {
						handleObj = handlers[ i ];

						// Don't conflict with Object.prototype properties (#13203)
						sel = handleObj.selector + " ";

						if ( matches[ sel ] === undefined ) {
							matches[ sel ] = handleObj.needsContext ?
								jQuery( sel, this ).index( cur ) >= 0 :
								jQuery.find( sel, this, null, [ cur ] ).length;
						}
						if ( matches[ sel ] ) {
							matches.push( handleObj );
						}
					}
					if ( matches.length ) {
						handlerQueue.push({ elem: cur, handlers: matches });
					}
				}
			}
		}

		// Add the remaining (directly-bound) handlers
		if ( delegateCount < handlers.length ) {
			handlerQueue.push({ elem: this, handlers: handlers.slice( delegateCount ) });
		}

		return handlerQueue;
	},

	// Includes some event props shared by KeyEvent and MouseEvent
	props: "altKey bubbles cancelable ctrlKey currentTarget eventPhase metaKey relatedTarget shiftKey target timeStamp view which".split(" "),

	fixHooks: {},

	keyHooks: {
		props: "char charCode key keyCode".split(" "),
		filter: function( event, original ) {

			// Add which for key events
			if ( event.which == null ) {
				event.which = original.charCode != null ? original.charCode : original.keyCode;
			}

			return event;
		}
	},

	mouseHooks: {
		props: "button buttons clientX clientY offsetX offsetY pageX pageY screenX screenY toElement".split(" "),
		filter: function( event, original ) {
			var eventDoc, doc, body,
				button = original.button;

			// Calculate pageX/Y if missing and clientX/Y available
			if ( event.pageX == null && original.clientX != null ) {
				eventDoc = event.target.ownerDocument || document;
				doc = eventDoc.documentElement;
				body = eventDoc.body;

				event.pageX = original.clientX + ( doc && doc.scrollLeft || body && body.scrollLeft || 0 ) - ( doc && doc.clientLeft || body && body.clientLeft || 0 );
				event.pageY = original.clientY + ( doc && doc.scrollTop  || body && body.scrollTop  || 0 ) - ( doc && doc.clientTop  || body && body.clientTop  || 0 );
			}

			// Add which for click: 1 === left; 2 === middle; 3 === right
			// Note: button is not normalized, so don't use it
			if ( !event.which && button !== undefined ) {
				event.which = ( button & 1 ? 1 : ( button & 2 ? 3 : ( button & 4 ? 2 : 0 ) ) );
			}

			return event;
		}
	},

	fix: function( event ) {
		if ( event[ jQuery.expando ] ) {
			return event;
		}

		// Create a writable copy of the event object and normalize some properties
		var i, prop, copy,
			type = event.type,
			originalEvent = event,
			fixHook = this.fixHooks[ type ];

		if ( !fixHook ) {
			this.fixHooks[ type ] = fixHook =
				rmouseEvent.test( type ) ? this.mouseHooks :
				rkeyEvent.test( type ) ? this.keyHooks :
				{};
		}
		copy = fixHook.props ? this.props.concat( fixHook.props ) : this.props;

		event = new jQuery.Event( originalEvent );

		i = copy.length;
		while ( i-- ) {
			prop = copy[ i ];
			event[ prop ] = originalEvent[ prop ];
		}

		// Support: Cordova 2.5 (WebKit) (#13255)
		// All events should have a target; Cordova deviceready doesn't
		if ( !event.target ) {
			event.target = document;
		}

		// Support: Safari 6.0+, Chrome<28
		// Target should not be a text node (#504, #13143)
		if ( event.target.nodeType === 3 ) {
			event.target = event.target.parentNode;
		}

		return fixHook.filter ? fixHook.filter( event, originalEvent ) : event;
	},

	special: {
		load: {
			// Prevent triggered image.load events from bubbling to window.load
			noBubble: true
		},
		focus: {
			// Fire native event if possible so blur/focus sequence is correct
			trigger: function() {
				if ( this !== safeActiveElement() && this.focus ) {
					this.focus();
					return false;
				}
			},
			delegateType: "focusin"
		},
		blur: {
			trigger: function() {
				if ( this === safeActiveElement() && this.blur ) {
					this.blur();
					return false;
				}
			},
			delegateType: "focusout"
		},
		click: {
			// For checkbox, fire native event so checked state will be right
			trigger: function() {
				if ( this.type === "checkbox" && this.click && jQuery.nodeName( this, "input" ) ) {
					this.click();
					return false;
				}
			},

			// For cross-browser consistency, don't fire native .click() on links
			_default: function( event ) {
				return jQuery.nodeName( event.target, "a" );
			}
		},

		beforeunload: {
			postDispatch: function( event ) {

				// Support: Firefox 20+
				// Firefox doesn't alert if the returnValue field is not set.
				if ( event.result !== undefined && event.originalEvent ) {
					event.originalEvent.returnValue = event.result;
				}
			}
		}
	},

	simulate: function( type, elem, event, bubble ) {
		// Piggyback on a donor event to simulate a different one.
		// Fake originalEvent to avoid donor's stopPropagation, but if the
		// simulated event prevents default then we do the same on the donor.
		var e = jQuery.extend(
			new jQuery.Event(),
			event,
			{
				type: type,
				isSimulated: true,
				originalEvent: {}
			}
		);
		if ( bubble ) {
			jQuery.event.trigger( e, null, elem );
		} else {
			jQuery.event.dispatch.call( elem, e );
		}
		if ( e.isDefaultPrevented() ) {
			event.preventDefault();
		}
	}
};

jQuery.removeEvent = function( elem, type, handle ) {
	if ( elem.removeEventListener ) {
		elem.removeEventListener( type, handle, false );
	}
};

jQuery.Event = function( src, props ) {
	// Allow instantiation without the 'new' keyword
	if ( !(this instanceof jQuery.Event) ) {
		return new jQuery.Event( src, props );
	}

	// Event object
	if ( src && src.type ) {
		this.originalEvent = src;
		this.type = src.type;

		// Events bubbling up the document may have been marked as prevented
		// by a handler lower down the tree; reflect the correct value.
		this.isDefaultPrevented = src.defaultPrevented ||
				src.defaultPrevented === undefined &&
				// Support: Android<4.0
				src.returnValue === false ?
			returnTrue :
			returnFalse;

	// Event type
	} else {
		this.type = src;
	}

	// Put explicitly provided properties onto the event object
	if ( props ) {
		jQuery.extend( this, props );
	}

	// Create a timestamp if incoming event doesn't have one
	this.timeStamp = src && src.timeStamp || jQuery.now();

	// Mark it as fixed
	this[ jQuery.expando ] = true;
};

// jQuery.Event is based on DOM3 Events as specified by the ECMAScript Language Binding
// http://www.w3.org/TR/2003/WD-DOM-Level-3-Events-20030331/ecma-script-binding.html
jQuery.Event.prototype = {
	isDefaultPrevented: returnFalse,
	isPropagationStopped: returnFalse,
	isImmediatePropagationStopped: returnFalse,

	preventDefault: function() {
		var e = this.originalEvent;

		this.isDefaultPrevented = returnTrue;

		if ( e && e.preventDefault ) {
			e.preventDefault();
		}
	},
	stopPropagation: function() {
		var e = this.originalEvent;

		this.isPropagationStopped = returnTrue;

		if ( e && e.stopPropagation ) {
			e.stopPropagation();
		}
	},
	stopImmediatePropagation: function() {
		var e = this.originalEvent;

		this.isImmediatePropagationStopped = returnTrue;

		if ( e && e.stopImmediatePropagation ) {
			e.stopImmediatePropagation();
		}

		this.stopPropagation();
	}
};

// Create mouseenter/leave events using mouseover/out and event-time checks
// Support: Chrome 15+
jQuery.each({
	mouseenter: "mouseover",
	mouseleave: "mouseout",
	pointerenter: "pointerover",
	pointerleave: "pointerout"
}, function( orig, fix ) {
	jQuery.event.special[ orig ] = {
		delegateType: fix,
		bindType: fix,

		handle: function( event ) {
			var ret,
				target = this,
				related = event.relatedTarget,
				handleObj = event.handleObj;

			// For mousenter/leave call the handler if related is outside the target.
			// NB: No relatedTarget if the mouse left/entered the browser window
			if ( !related || (related !== target && !jQuery.contains( target, related )) ) {
				event.type = handleObj.origType;
				ret = handleObj.handler.apply( this, arguments );
				event.type = fix;
			}
			return ret;
		}
	};
});

// Support: Firefox, Chrome, Safari
// Create "bubbling" focus and blur events
if ( !support.focusinBubbles ) {
	jQuery.each({ focus: "focusin", blur: "focusout" }, function( orig, fix ) {

		// Attach a single capturing handler on the document while someone wants focusin/focusout
		var handler = function( event ) {
				jQuery.event.simulate( fix, event.target, jQuery.event.fix( event ), true );
			};

		jQuery.event.special[ fix ] = {
			setup: function() {
				var doc = this.ownerDocument || this,
					attaches = data_priv.access( doc, fix );

				if ( !attaches ) {
					doc.addEventListener( orig, handler, true );
				}
				data_priv.access( doc, fix, ( attaches || 0 ) + 1 );
			},
			teardown: function() {
				var doc = this.ownerDocument || this,
					attaches = data_priv.access( doc, fix ) - 1;

				if ( !attaches ) {
					doc.removeEventListener( orig, handler, true );
					data_priv.remove( doc, fix );

				} else {
					data_priv.access( doc, fix, attaches );
				}
			}
		};
	});
}

jQuery.fn.extend({

	on: function( types, selector, data, fn, /*INTERNAL*/ one ) {
		var origFn, type;

		// Types can be a map of types/handlers
		if ( typeof types === "object" ) {
			// ( types-Object, selector, data )
			if ( typeof selector !== "string" ) {
				// ( types-Object, data )
				data = data || selector;
				selector = undefined;
			}
			for ( type in types ) {
				this.on( type, selector, data, types[ type ], one );
			}
			return this;
		}

		if ( data == null && fn == null ) {
			// ( types, fn )
			fn = selector;
			data = selector = undefined;
		} else if ( fn == null ) {
			if ( typeof selector === "string" ) {
				// ( types, selector, fn )
				fn = data;
				data = undefined;
			} else {
				// ( types, data, fn )
				fn = data;
				data = selector;
				selector = undefined;
			}
		}
		if ( fn === false ) {
			fn = returnFalse;
		} else if ( !fn ) {
			return this;
		}

		if ( one === 1 ) {
			origFn = fn;
			fn = function( event ) {
				// Can use an empty set, since event contains the info
				jQuery().off( event );
				return origFn.apply( this, arguments );
			};
			// Use same guid so caller can remove using origFn
			fn.guid = origFn.guid || ( origFn.guid = jQuery.guid++ );
		}
		return this.each( function() {
			jQuery.event.add( this, types, fn, data, selector );
		});
	},
	one: function( types, selector, data, fn ) {
		return this.on( types, selector, data, fn, 1 );
	},
	off: function( types, selector, fn ) {
		var handleObj, type;
		if ( types && types.preventDefault && types.handleObj ) {
			// ( event )  dispatched jQuery.Event
			handleObj = types.handleObj;
			jQuery( types.delegateTarget ).off(
				handleObj.namespace ? handleObj.origType + "." + handleObj.namespace : handleObj.origType,
				handleObj.selector,
				handleObj.handler
			);
			return this;
		}
		if ( typeof types === "object" ) {
			// ( types-object [, selector] )
			for ( type in types ) {
				this.off( type, selector, types[ type ] );
			}
			return this;
		}
		if ( selector === false || typeof selector === "function" ) {
			// ( types [, fn] )
			fn = selector;
			selector = undefined;
		}
		if ( fn === false ) {
			fn = returnFalse;
		}
		return this.each(function() {
			jQuery.event.remove( this, types, fn, selector );
		});
	},

	trigger: function( type, data ) {
		return this.each(function() {
			jQuery.event.trigger( type, data, this );
		});
	},
	triggerHandler: function( type, data ) {
		var elem = this[0];
		if ( elem ) {
			return jQuery.event.trigger( type, data, elem, true );
		}
	}
});


var
	rxhtmlTag = /<(?!area|br|col|embed|hr|img|input|link|meta|param)(([\w:]+)[^>]*)\/>/gi,
	rtagName = /<([\w:]+)/,
	rhtml = /<|&#?\w+;/,
	rnoInnerhtml = /<(?:script|style|link)/i,
	// checked="checked" or checked
	rchecked = /checked\s*(?:[^=]|=\s*.checked.)/i,
	rscriptType = /^$|\/(?:java|ecma)script/i,
	rscriptTypeMasked = /^true\/(.*)/,
	rcleanScript = /^\s*<!(?:\[CDATA\[|--)|(?:\]\]|--)>\s*$/g,

	// We have to close these tags to support XHTML (#13200)
	wrapMap = {

		// Support: IE9
		option: [ 1, "<select multiple='multiple'>", "</select>" ],

		thead: [ 1, "<table>", "</table>" ],
		col: [ 2, "<table><colgroup>", "</colgroup></table>" ],
		tr: [ 2, "<table><tbody>", "</tbody></table>" ],
		td: [ 3, "<table><tbody><tr>", "</tr></tbody></table>" ],

		_default: [ 0, "", "" ]
	};

// Support: IE9
wrapMap.optgroup = wrapMap.option;

wrapMap.tbody = wrapMap.tfoot = wrapMap.colgroup = wrapMap.caption = wrapMap.thead;
wrapMap.th = wrapMap.td;

// Support: 1.x compatibility
// Manipulating tables requires a tbody
function manipulationTarget( elem, content ) {
	return jQuery.nodeName( elem, "table" ) &&
		jQuery.nodeName( content.nodeType !== 11 ? content : content.firstChild, "tr" ) ?

		elem.getElementsByTagName("tbody")[0] ||
			elem.appendChild( elem.ownerDocument.createElement("tbody") ) :
		elem;
}

// Replace/restore the type attribute of script elements for safe DOM manipulation
function disableScript( elem ) {
	elem.type = (elem.getAttribute("type") !== null) + "/" + elem.type;
	return elem;
}
function restoreScript( elem ) {
	var match = rscriptTypeMasked.exec( elem.type );

	if ( match ) {
		elem.type = match[ 1 ];
	} else {
		elem.removeAttribute("type");
	}

	return elem;
}

// Mark scripts as having already been evaluated
function setGlobalEval( elems, refElements ) {
	var i = 0,
		l = elems.length;

	for ( ; i < l; i++ ) {
		data_priv.set(
			elems[ i ], "globalEval", !refElements || data_priv.get( refElements[ i ], "globalEval" )
		);
	}
}

function cloneCopyEvent( src, dest ) {
	var i, l, type, pdataOld, pdataCur, udataOld, udataCur, events;

	if ( dest.nodeType !== 1 ) {
		return;
	}

	// 1. Copy private data: events, handlers, etc.
	if ( data_priv.hasData( src ) ) {
		pdataOld = data_priv.access( src );
		pdataCur = data_priv.set( dest, pdataOld );
		events = pdataOld.events;

		if ( events ) {
			delete pdataCur.handle;
			pdataCur.events = {};

			for ( type in events ) {
				for ( i = 0, l = events[ type ].length; i < l; i++ ) {
					jQuery.event.add( dest, type, events[ type ][ i ] );
				}
			}
		}
	}

	// 2. Copy user data
	if ( data_user.hasData( src ) ) {
		udataOld = data_user.access( src );
		udataCur = jQuery.extend( {}, udataOld );

		data_user.set( dest, udataCur );
	}
}

function getAll( context, tag ) {
	var ret = context.getElementsByTagName ? context.getElementsByTagName( tag || "*" ) :
			context.querySelectorAll ? context.querySelectorAll( tag || "*" ) :
			[];

	return tag === undefined || tag && jQuery.nodeName( context, tag ) ?
		jQuery.merge( [ context ], ret ) :
		ret;
}

// Fix IE bugs, see support tests
function fixInput( src, dest ) {
	var nodeName = dest.nodeName.toLowerCase();

	// Fails to persist the checked state of a cloned checkbox or radio button.
	if ( nodeName === "input" && rcheckableType.test( src.type ) ) {
		dest.checked = src.checked;

	// Fails to return the selected option to the default selected state when cloning options
	} else if ( nodeName === "input" || nodeName === "textarea" ) {
		dest.defaultValue = src.defaultValue;
	}
}

jQuery.extend({
	clone: function( elem, dataAndEvents, deepDataAndEvents ) {
		var i, l, srcElements, destElements,
			clone = elem.cloneNode( true ),
			inPage = jQuery.contains( elem.ownerDocument, elem );

		// Fix IE cloning issues
		if ( !support.noCloneChecked && ( elem.nodeType === 1 || elem.nodeType === 11 ) &&
				!jQuery.isXMLDoc( elem ) ) {

			// We eschew Sizzle here for performance reasons: http://jsperf.com/getall-vs-sizzle/2
			destElements = getAll( clone );
			srcElements = getAll( elem );

			for ( i = 0, l = srcElements.length; i < l; i++ ) {
				fixInput( srcElements[ i ], destElements[ i ] );
			}
		}

		// Copy the events from the original to the clone
		if ( dataAndEvents ) {
			if ( deepDataAndEvents ) {
				srcElements = srcElements || getAll( elem );
				destElements = destElements || getAll( clone );

				for ( i = 0, l = srcElements.length; i < l; i++ ) {
					cloneCopyEvent( srcElements[ i ], destElements[ i ] );
				}
			} else {
				cloneCopyEvent( elem, clone );
			}
		}

		// Preserve script evaluation history
		destElements = getAll( clone, "script" );
		if ( destElements.length > 0 ) {
			setGlobalEval( destElements, !inPage && getAll( elem, "script" ) );
		}

		// Return the cloned set
		return clone;
	},

	buildFragment: function( elems, context, scripts, selection ) {
		var elem, tmp, tag, wrap, contains, j,
			fragment = context.createDocumentFragment(),
			nodes = [],
			i = 0,
			l = elems.length;

		for ( ; i < l; i++ ) {
			elem = elems[ i ];

			if ( elem || elem === 0 ) {

				// Add nodes directly
				if ( jQuery.type( elem ) === "object" ) {
					// Support: QtWebKit, PhantomJS
					// push.apply(_, arraylike) throws on ancient WebKit
					jQuery.merge( nodes, elem.nodeType ? [ elem ] : elem );

				// Convert non-html into a text node
				} else if ( !rhtml.test( elem ) ) {
					nodes.push( context.createTextNode( elem ) );

				// Convert html into DOM nodes
				} else {
					tmp = tmp || fragment.appendChild( context.createElement("div") );

					// Deserialize a standard representation
					tag = ( rtagName.exec( elem ) || [ "", "" ] )[ 1 ].toLowerCase();
					wrap = wrapMap[ tag ] || wrapMap._default;
					tmp.innerHTML = wrap[ 1 ] + elem.replace( rxhtmlTag, "<$1></$2>" ) + wrap[ 2 ];

					// Descend through wrappers to the right content
					j = wrap[ 0 ];
					while ( j-- ) {
						tmp = tmp.lastChild;
					}

					// Support: QtWebKit, PhantomJS
					// push.apply(_, arraylike) throws on ancient WebKit
					jQuery.merge( nodes, tmp.childNodes );

					// Remember the top-level container
					tmp = fragment.firstChild;

					// Ensure the created nodes are orphaned (#12392)
					tmp.textContent = "";
				}
			}
		}

		// Remove wrapper from fragment
		fragment.textContent = "";

		i = 0;
		while ( (elem = nodes[ i++ ]) ) {

			// #4087 - If origin and destination elements are the same, and this is
			// that element, do not do anything
			if ( selection && jQuery.inArray( elem, selection ) !== -1 ) {
				continue;
			}

			contains = jQuery.contains( elem.ownerDocument, elem );

			// Append to fragment
			tmp = getAll( fragment.appendChild( elem ), "script" );

			// Preserve script evaluation history
			if ( contains ) {
				setGlobalEval( tmp );
			}

			// Capture executables
			if ( scripts ) {
				j = 0;
				while ( (elem = tmp[ j++ ]) ) {
					if ( rscriptType.test( elem.type || "" ) ) {
						scripts.push( elem );
					}
				}
			}
		}

		return fragment;
	},

	cleanData: function( elems ) {
		var data, elem, type, key,
			special = jQuery.event.special,
			i = 0;

		for ( ; (elem = elems[ i ]) !== undefined; i++ ) {
			if ( jQuery.acceptData( elem ) ) {
				key = elem[ data_priv.expando ];

				if ( key && (data = data_priv.cache[ key ]) ) {
					if ( data.events ) {
						for ( type in data.events ) {
							if ( special[ type ] ) {
								jQuery.event.remove( elem, type );

							// This is a shortcut to avoid jQuery.event.remove's overhead
							} else {
								jQuery.removeEvent( elem, type, data.handle );
							}
						}
					}
					if ( data_priv.cache[ key ] ) {
						// Discard any remaining `private` data
						delete data_priv.cache[ key ];
					}
				}
			}
			// Discard any remaining `user` data
			delete data_user.cache[ elem[ data_user.expando ] ];
		}
	}
});

jQuery.fn.extend({
	text: function( value ) {
		return access( this, function( value ) {
			return value === undefined ?
				jQuery.text( this ) :
				this.empty().each(function() {
					if ( this.nodeType === 1 || this.nodeType === 11 || this.nodeType === 9 ) {
						this.textContent = value;
					}
				});
		}, null, value, arguments.length );
	},

	append: function() {
		return this.domManip( arguments, function( elem ) {
			if ( this.nodeType === 1 || this.nodeType === 11 || this.nodeType === 9 ) {
				var target = manipulationTarget( this, elem );
				target.appendChild( elem );
			}
		});
	},

	prepend: function() {
		return this.domManip( arguments, function( elem ) {
			if ( this.nodeType === 1 || this.nodeType === 11 || this.nodeType === 9 ) {
				var target = manipulationTarget( this, elem );
				target.insertBefore( elem, target.firstChild );
			}
		});
	},

	before: function() {
		return this.domManip( arguments, function( elem ) {
			if ( this.parentNode ) {
				this.parentNode.insertBefore( elem, this );
			}
		});
	},

	after: function() {
		return this.domManip( arguments, function( elem ) {
			if ( this.parentNode ) {
				this.parentNode.insertBefore( elem, this.nextSibling );
			}
		});
	},

	remove: function( selector, keepData /* Internal Use Only */ ) {
		var elem,
			elems = selector ? jQuery.filter( selector, this ) : this,
			i = 0;

		for ( ; (elem = elems[i]) != null; i++ ) {
			if ( !keepData && elem.nodeType === 1 ) {
				jQuery.cleanData( getAll( elem ) );
			}

			if ( elem.parentNode ) {
				if ( keepData && jQuery.contains( elem.ownerDocument, elem ) ) {
					setGlobalEval( getAll( elem, "script" ) );
				}
				elem.parentNode.removeChild( elem );
			}
		}

		return this;
	},

	empty: function() {
		var elem,
			i = 0;

		for ( ; (elem = this[i]) != null; i++ ) {
			if ( elem.nodeType === 1 ) {

				// Prevent memory leaks
				jQuery.cleanData( getAll( elem, false ) );

				// Remove any remaining nodes
				elem.textContent = "";
			}
		}

		return this;
	},

	clone: function( dataAndEvents, deepDataAndEvents ) {
		dataAndEvents = dataAndEvents == null ? false : dataAndEvents;
		deepDataAndEvents = deepDataAndEvents == null ? dataAndEvents : deepDataAndEvents;

		return this.map(function() {
			return jQuery.clone( this, dataAndEvents, deepDataAndEvents );
		});
	},

	html: function( value ) {
		return access( this, function( value ) {
			var elem = this[ 0 ] || {},
				i = 0,
				l = this.length;

			if ( value === undefined && elem.nodeType === 1 ) {
				return elem.innerHTML;
			}

			// See if we can take a shortcut and just use innerHTML
			if ( typeof value === "string" && !rnoInnerhtml.test( value ) &&
				!wrapMap[ ( rtagName.exec( value ) || [ "", "" ] )[ 1 ].toLowerCase() ] ) {

				value = value.replace( rxhtmlTag, "<$1></$2>" );

				try {
					for ( ; i < l; i++ ) {
						elem = this[ i ] || {};

						// Remove element nodes and prevent memory leaks
						if ( elem.nodeType === 1 ) {
							jQuery.cleanData( getAll( elem, false ) );
							elem.innerHTML = value;
						}
					}

					elem = 0;

				// If using innerHTML throws an exception, use the fallback method
				} catch( e ) {}
			}

			if ( elem ) {
				this.empty().append( value );
			}
		}, null, value, arguments.length );
	},

	replaceWith: function() {
		var arg = arguments[ 0 ];

		// Make the changes, replacing each context element with the new content
		this.domManip( arguments, function( elem ) {
			arg = this.parentNode;

			jQuery.cleanData( getAll( this ) );

			if ( arg ) {
				arg.replaceChild( elem, this );
			}
		});

		// Force removal if there was no new content (e.g., from empty arguments)
		return arg && (arg.length || arg.nodeType) ? this : this.remove();
	},

	detach: function( selector ) {
		return this.remove( selector, true );
	},

	domManip: function( args, callback ) {

		// Flatten any nested arrays
		args = concat.apply( [], args );

		var fragment, first, scripts, hasScripts, node, doc,
			i = 0,
			l = this.length,
			set = this,
			iNoClone = l - 1,
			value = args[ 0 ],
			isFunction = jQuery.isFunction( value );

		// We can't cloneNode fragments that contain checked, in WebKit
		if ( isFunction ||
				( l > 1 && typeof value === "string" &&
					!support.checkClone && rchecked.test( value ) ) ) {
			return this.each(function( index ) {
				var self = set.eq( index );
				if ( isFunction ) {
					args[ 0 ] = value.call( this, index, self.html() );
				}
				self.domManip( args, callback );
			});
		}

		if ( l ) {
			fragment = jQuery.buildFragment( args, this[ 0 ].ownerDocument, false, this );
			first = fragment.firstChild;

			if ( fragment.childNodes.length === 1 ) {
				fragment = first;
			}

			if ( first ) {
				scripts = jQuery.map( getAll( fragment, "script" ), disableScript );
				hasScripts = scripts.length;

				// Use the original fragment for the last item instead of the first because it can end up
				// being emptied incorrectly in certain situations (#8070).
				for ( ; i < l; i++ ) {
					node = fragment;

					if ( i !== iNoClone ) {
						node = jQuery.clone( node, true, true );

						// Keep references to cloned scripts for later restoration
						if ( hasScripts ) {
							// Support: QtWebKit
							// jQuery.merge because push.apply(_, arraylike) throws
							jQuery.merge( scripts, getAll( node, "script" ) );
						}
					}

					callback.call( this[ i ], node, i );
				}

				if ( hasScripts ) {
					doc = scripts[ scripts.length - 1 ].ownerDocument;

					// Reenable scripts
					jQuery.map( scripts, restoreScript );

					// Evaluate executable scripts on first document insertion
					for ( i = 0; i < hasScripts; i++ ) {
						node = scripts[ i ];
						if ( rscriptType.test( node.type || "" ) &&
							!data_priv.access( node, "globalEval" ) && jQuery.contains( doc, node ) ) {

							if ( node.src ) {
								// Optional AJAX dependency, but won't run scripts if not present
								if ( jQuery._evalUrl ) {
									jQuery._evalUrl( node.src );
								}
							} else {
								jQuery.globalEval( node.textContent.replace( rcleanScript, "" ) );
							}
						}
					}
				}
			}
		}

		return this;
	}
});

jQuery.each({
	appendTo: "append",
	prependTo: "prepend",
	insertBefore: "before",
	insertAfter: "after",
	replaceAll: "replaceWith"
}, function( name, original ) {
	jQuery.fn[ name ] = function( selector ) {
		var elems,
			ret = [],
			insert = jQuery( selector ),
			last = insert.length - 1,
			i = 0;

		for ( ; i <= last; i++ ) {
			elems = i === last ? this : this.clone( true );
			jQuery( insert[ i ] )[ original ]( elems );

			// Support: QtWebKit
			// .get() because push.apply(_, arraylike) throws
			push.apply( ret, elems.get() );
		}

		return this.pushStack( ret );
	};
});


var iframe,
	elemdisplay = {};

/**
 * Retrieve the actual display of a element
 * @param {String} name nodeName of the element
 * @param {Object} doc Document object
 */
// Called only from within defaultDisplay
function actualDisplay( name, doc ) {
	var style,
		elem = jQuery( doc.createElement( name ) ).appendTo( doc.body ),

		// getDefaultComputedStyle might be reliably used only on attached element
		display = window.getDefaultComputedStyle && ( style = window.getDefaultComputedStyle( elem[ 0 ] ) ) ?

			// Use of this method is a temporary fix (more like optimization) until something better comes along,
			// since it was removed from specification and supported only in FF
			style.display : jQuery.css( elem[ 0 ], "display" );

	// We don't have any data stored on the element,
	// so use "detach" method as fast way to get rid of the element
	elem.detach();

	return display;
}

/**
 * Try to determine the default display value of an element
 * @param {String} nodeName
 */
function defaultDisplay( nodeName ) {
	var doc = document,
		display = elemdisplay[ nodeName ];

	if ( !display ) {
		display = actualDisplay( nodeName, doc );

		// If the simple way fails, read from inside an iframe
		if ( display === "none" || !display ) {

			// Use the already-created iframe if possible
			iframe = (iframe || jQuery( "<iframe frameborder='0' width='0' height='0'/>" )).appendTo( doc.documentElement );

			// Always write a new HTML skeleton so Webkit and Firefox don't choke on reuse
			doc = iframe[ 0 ].contentDocument;

			// Support: IE
			doc.write();
			doc.close();

			display = actualDisplay( nodeName, doc );
			iframe.detach();
		}

		// Store the correct default display
		elemdisplay[ nodeName ] = display;
	}

	return display;
}
var rmargin = (/^margin/);

var rnumnonpx = new RegExp( "^(" + pnum + ")(?!px)[a-z%]+$", "i" );

var getStyles = function( elem ) {
		// Support: IE<=11+, Firefox<=30+ (#15098, #14150)
		// IE throws on elements created in popups
		// FF meanwhile throws on frame elements through "defaultView.getComputedStyle"
		if ( elem.ownerDocument.defaultView.opener ) {
			return elem.ownerDocument.defaultView.getComputedStyle( elem, null );
		}

		return window.getComputedStyle( elem, null );
	};



function curCSS( elem, name, computed ) {
	var width, minWidth, maxWidth, ret,
		style = elem.style;

	computed = computed || getStyles( elem );

	// Support: IE9
	// getPropertyValue is only needed for .css('filter') (#12537)
	if ( computed ) {
		ret = computed.getPropertyValue( name ) || computed[ name ];
	}

	if ( computed ) {

		if ( ret === "" && !jQuery.contains( elem.ownerDocument, elem ) ) {
			ret = jQuery.style( elem, name );
		}

		// Support: iOS < 6
		// A tribute to the "awesome hack by Dean Edwards"
		// iOS < 6 (at least) returns percentage for a larger set of values, but width seems to be reliably pixels
		// this is against the CSSOM draft spec: http://dev.w3.org/csswg/cssom/#resolved-values
		if ( rnumnonpx.test( ret ) && rmargin.test( name ) ) {

			// Remember the original values
			width = style.width;
			minWidth = style.minWidth;
			maxWidth = style.maxWidth;

			// Put in the new values to get a computed value out
			style.minWidth = style.maxWidth = style.width = ret;
			ret = computed.width;

			// Revert the changed values
			style.width = width;
			style.minWidth = minWidth;
			style.maxWidth = maxWidth;
		}
	}

	return ret !== undefined ?
		// Support: IE
		// IE returns zIndex value as an integer.
		ret + "" :
		ret;
}


function addGetHookIf( conditionFn, hookFn ) {
	// Define the hook, we'll check on the first run if it's really needed.
	return {
		get: function() {
			if ( conditionFn() ) {
				// Hook not needed (or it's not possible to use it due
				// to missing dependency), remove it.
				delete this.get;
				return;
			}

			// Hook needed; redefine it so that the support test is not executed again.
			return (this.get = hookFn).apply( this, arguments );
		}
	};
}


(function() {
	var pixelPositionVal, boxSizingReliableVal,
		docElem = document.documentElement,
		container = document.createElement( "div" ),
		div = document.createElement( "div" );

	if ( !div.style ) {
		return;
	}

	// Support: IE9-11+
	// Style of cloned element affects source element cloned (#8908)
	div.style.backgroundClip = "content-box";
	div.cloneNode( true ).style.backgroundClip = "";
	support.clearCloneStyle = div.style.backgroundClip === "content-box";

	container.style.cssText = "border:0;width:0;height:0;top:0;left:-9999px;margin-top:1px;" +
		"position:absolute";
	container.appendChild( div );

	// Executing both pixelPosition & boxSizingReliable tests require only one layout
	// so they're executed at the same time to save the second computation.
	function computePixelPositionAndBoxSizingReliable() {
		div.style.cssText =
			// Support: Firefox<29, Android 2.3
			// Vendor-prefix box-sizing
			"-webkit-box-sizing:border-box;-moz-box-sizing:border-box;" +
			"box-sizing:border-box;display:block;margin-top:1%;top:1%;" +
			"border:1px;padding:1px;width:4px;position:absolute";
		div.innerHTML = "";
		docElem.appendChild( container );

		var divStyle = window.getComputedStyle( div, null );
		pixelPositionVal = divStyle.top !== "1%";
		boxSizingReliableVal = divStyle.width === "4px";

		docElem.removeChild( container );
	}

	// Support: node.js jsdom
	// Don't assume that getComputedStyle is a property of the global object
	if ( window.getComputedStyle ) {
		jQuery.extend( support, {
			pixelPosition: function() {

				// This test is executed only once but we still do memoizing
				// since we can use the boxSizingReliable pre-computing.
				// No need to check if the test was already performed, though.
				computePixelPositionAndBoxSizingReliable();
				return pixelPositionVal;
			},
			boxSizingReliable: function() {
				if ( boxSizingReliableVal == null ) {
					computePixelPositionAndBoxSizingReliable();
				}
				return boxSizingReliableVal;
			},
			reliableMarginRight: function() {

				// Support: Android 2.3
				// Check if div with explicit width and no margin-right incorrectly
				// gets computed margin-right based on width of container. (#3333)
				// WebKit Bug 13343 - getComputedStyle returns wrong value for margin-right
				// This support function is only executed once so no memoizing is needed.
				var ret,
					marginDiv = div.appendChild( document.createElement( "div" ) );

				// Reset CSS: box-sizing; display; margin; border; padding
				marginDiv.style.cssText = div.style.cssText =
					// Support: Firefox<29, Android 2.3
					// Vendor-prefix box-sizing
					"-webkit-box-sizing:content-box;-moz-box-sizing:content-box;" +
					"box-sizing:content-box;display:block;margin:0;border:0;padding:0";
				marginDiv.style.marginRight = marginDiv.style.width = "0";
				div.style.width = "1px";
				docElem.appendChild( container );

				ret = !parseFloat( window.getComputedStyle( marginDiv, null ).marginRight );

				docElem.removeChild( container );
				div.removeChild( marginDiv );

				return ret;
			}
		});
	}
})();


// A method for quickly swapping in/out CSS properties to get correct calculations.
jQuery.swap = function( elem, options, callback, args ) {
	var ret, name,
		old = {};

	// Remember the old values, and insert the new ones
	for ( name in options ) {
		old[ name ] = elem.style[ name ];
		elem.style[ name ] = options[ name ];
	}

	ret = callback.apply( elem, args || [] );

	// Revert the old values
	for ( name in options ) {
		elem.style[ name ] = old[ name ];
	}

	return ret;
};


var
	// Swappable if display is none or starts with table except "table", "table-cell", or "table-caption"
	// See here for display values: https://developer.mozilla.org/en-US/docs/CSS/display
	rdisplayswap = /^(none|table(?!-c[ea]).+)/,
	rnumsplit = new RegExp( "^(" + pnum + ")(.*)$", "i" ),
	rrelNum = new RegExp( "^([+-])=(" + pnum + ")", "i" ),

	cssShow = { position: "absolute", visibility: "hidden", display: "block" },
	cssNormalTransform = {
		letterSpacing: "0",
		fontWeight: "400"
	},

	cssPrefixes = [ "Webkit", "O", "Moz", "ms" ];

// Return a css property mapped to a potentially vendor prefixed property
function vendorPropName( style, name ) {

	// Shortcut for names that are not vendor prefixed
	if ( name in style ) {
		return name;
	}

	// Check for vendor prefixed names
	var capName = name[0].toUpperCase() + name.slice(1),
		origName = name,
		i = cssPrefixes.length;

	while ( i-- ) {
		name = cssPrefixes[ i ] + capName;
		if ( name in style ) {
			return name;
		}
	}

	return origName;
}

function setPositiveNumber( elem, value, subtract ) {
	var matches = rnumsplit.exec( value );
	return matches ?
		// Guard against undefined "subtract", e.g., when used as in cssHooks
		Math.max( 0, matches[ 1 ] - ( subtract || 0 ) ) + ( matches[ 2 ] || "px" ) :
		value;
}

function augmentWidthOrHeight( elem, name, extra, isBorderBox, styles ) {
	var i = extra === ( isBorderBox ? "border" : "content" ) ?
		// If we already have the right measurement, avoid augmentation
		4 :
		// Otherwise initialize for horizontal or vertical properties
		name === "width" ? 1 : 0,

		val = 0;

	for ( ; i < 4; i += 2 ) {
		// Both box models exclude margin, so add it if we want it
		if ( extra === "margin" ) {
			val += jQuery.css( elem, extra + cssExpand[ i ], true, styles );
		}

		if ( isBorderBox ) {
			// border-box includes padding, so remove it if we want content
			if ( extra === "content" ) {
				val -= jQuery.css( elem, "padding" + cssExpand[ i ], true, styles );
			}

			// At this point, extra isn't border nor margin, so remove border
			if ( extra !== "margin" ) {
				val -= jQuery.css( elem, "border" + cssExpand[ i ] + "Width", true, styles );
			}
		} else {
			// At this point, extra isn't content, so add padding
			val += jQuery.css( elem, "padding" + cssExpand[ i ], true, styles );

			// At this point, extra isn't content nor padding, so add border
			if ( extra !== "padding" ) {
				val += jQuery.css( elem, "border" + cssExpand[ i ] + "Width", true, styles );
			}
		}
	}

	return val;
}

function getWidthOrHeight( elem, name, extra ) {

	// Start with offset property, which is equivalent to the border-box value
	var valueIsBorderBox = true,
		val = name === "width" ? elem.offsetWidth : elem.offsetHeight,
		styles = getStyles( elem ),
		isBorderBox = jQuery.css( elem, "boxSizing", false, styles ) === "border-box";

	// Some non-html elements return undefined for offsetWidth, so check for null/undefined
	// svg - https://bugzilla.mozilla.org/show_bug.cgi?id=649285
	// MathML - https://bugzilla.mozilla.org/show_bug.cgi?id=491668
	if ( val <= 0 || val == null ) {
		// Fall back to computed then uncomputed css if necessary
		val = curCSS( elem, name, styles );
		if ( val < 0 || val == null ) {
			val = elem.style[ name ];
		}

		// Computed unit is not pixels. Stop here and return.
		if ( rnumnonpx.test(val) ) {
			return val;
		}

		// Check for style in case a browser which returns unreliable values
		// for getComputedStyle silently falls back to the reliable elem.style
		valueIsBorderBox = isBorderBox &&
			( support.boxSizingReliable() || val === elem.style[ name ] );

		// Normalize "", auto, and prepare for extra
		val = parseFloat( val ) || 0;
	}

	// Use the active box-sizing model to add/subtract irrelevant styles
	return ( val +
		augmentWidthOrHeight(
			elem,
			name,
			extra || ( isBorderBox ? "border" : "content" ),
			valueIsBorderBox,
			styles
		)
	) + "px";
}

function showHide( elements, show ) {
	var display, elem, hidden,
		values = [],
		index = 0,
		length = elements.length;

	for ( ; index < length; index++ ) {
		elem = elements[ index ];
		if ( !elem.style ) {
			continue;
		}

		values[ index ] = data_priv.get( elem, "olddisplay" );
		display = elem.style.display;
		if ( show ) {
			// Reset the inline display of this element to learn if it is
			// being hidden by cascaded rules or not
			if ( !values[ index ] && display === "none" ) {
				elem.style.display = "";
			}

			// Set elements which have been overridden with display: none
			// in a stylesheet to whatever the default browser style is
			// for such an element
			if ( elem.style.display === "" && isHidden( elem ) ) {
				values[ index ] = data_priv.access( elem, "olddisplay", defaultDisplay(elem.nodeName) );
			}
		} else {
			hidden = isHidden( elem );

			if ( display !== "none" || !hidden ) {
				data_priv.set( elem, "olddisplay", hidden ? display : jQuery.css( elem, "display" ) );
			}
		}
	}

	// Set the display of most of the elements in a second loop
	// to avoid the constant reflow
	for ( index = 0; index < length; index++ ) {
		elem = elements[ index ];
		if ( !elem.style ) {
			continue;
		}
		if ( !show || elem.style.display === "none" || elem.style.display === "" ) {
			elem.style.display = show ? values[ index ] || "" : "none";
		}
	}

	return elements;
}

jQuery.extend({

	// Add in style property hooks for overriding the default
	// behavior of getting and setting a style property
	cssHooks: {
		opacity: {
			get: function( elem, computed ) {
				if ( computed ) {

					// We should always get a number back from opacity
					var ret = curCSS( elem, "opacity" );
					return ret === "" ? "1" : ret;
				}
			}
		}
	},

	// Don't automatically add "px" to these possibly-unitless properties
	cssNumber: {
		"columnCount": true,
		"fillOpacity": true,
		"flexGrow": true,
		"flexShrink": true,
		"fontWeight": true,
		"lineHeight": true,
		"opacity": true,
		"order": true,
		"orphans": true,
		"widows": true,
		"zIndex": true,
		"zoom": true
	},

	// Add in properties whose names you wish to fix before
	// setting or getting the value
	cssProps: {
		"float": "cssFloat"
	},

	// Get and set the style property on a DOM Node
	style: function( elem, name, value, extra ) {

		// Don't set styles on text and comment nodes
		if ( !elem || elem.nodeType === 3 || elem.nodeType === 8 || !elem.style ) {
			return;
		}

		// Make sure that we're working with the right name
		var ret, type, hooks,
			origName = jQuery.camelCase( name ),
			style = elem.style;

		name = jQuery.cssProps[ origName ] || ( jQuery.cssProps[ origName ] = vendorPropName( style, origName ) );

		// Gets hook for the prefixed version, then unprefixed version
		hooks = jQuery.cssHooks[ name ] || jQuery.cssHooks[ origName ];

		// Check if we're setting a value
		if ( value !== undefined ) {
			type = typeof value;

			// Convert "+=" or "-=" to relative numbers (#7345)
			if ( type === "string" && (ret = rrelNum.exec( value )) ) {
				value = ( ret[1] + 1 ) * ret[2] + parseFloat( jQuery.css( elem, name ) );
				// Fixes bug #9237
				type = "number";
			}

			// Make sure that null and NaN values aren't set (#7116)
			if ( value == null || value !== value ) {
				return;
			}

			// If a number, add 'px' to the (except for certain CSS properties)
			if ( type === "number" && !jQuery.cssNumber[ origName ] ) {
				value += "px";
			}

			// Support: IE9-11+
			// background-* props affect original clone's values
			if ( !support.clearCloneStyle && value === "" && name.indexOf( "background" ) === 0 ) {
				style[ name ] = "inherit";
			}

			// If a hook was provided, use that value, otherwise just set the specified value
			if ( !hooks || !("set" in hooks) || (value = hooks.set( elem, value, extra )) !== undefined ) {
				style[ name ] = value;
			}

		} else {
			// If a hook was provided get the non-computed value from there
			if ( hooks && "get" in hooks && (ret = hooks.get( elem, false, extra )) !== undefined ) {
				return ret;
			}

			// Otherwise just get the value from the style object
			return style[ name ];
		}
	},

	css: function( elem, name, extra, styles ) {
		var val, num, hooks,
			origName = jQuery.camelCase( name );

		// Make sure that we're working with the right name
		name = jQuery.cssProps[ origName ] || ( jQuery.cssProps[ origName ] = vendorPropName( elem.style, origName ) );

		// Try prefixed name followed by the unprefixed name
		hooks = jQuery.cssHooks[ name ] || jQuery.cssHooks[ origName ];

		// If a hook was provided get the computed value from there
		if ( hooks && "get" in hooks ) {
			val = hooks.get( elem, true, extra );
		}

		// Otherwise, if a way to get the computed value exists, use that
		if ( val === undefined ) {
			val = curCSS( elem, name, styles );
		}

		// Convert "normal" to computed value
		if ( val === "normal" && name in cssNormalTransform ) {
			val = cssNormalTransform[ name ];
		}

		// Make numeric if forced or a qualifier was provided and val looks numeric
		if ( extra === "" || extra ) {
			num = parseFloat( val );
			return extra === true || jQuery.isNumeric( num ) ? num || 0 : val;
		}
		return val;
	}
});

jQuery.each([ "height", "width" ], function( i, name ) {
	jQuery.cssHooks[ name ] = {
		get: function( elem, computed, extra ) {
			if ( computed ) {

				// Certain elements can have dimension info if we invisibly show them
				// but it must have a current display style that would benefit
				return rdisplayswap.test( jQuery.css( elem, "display" ) ) && elem.offsetWidth === 0 ?
					jQuery.swap( elem, cssShow, function() {
						return getWidthOrHeight( elem, name, extra );
					}) :
					getWidthOrHeight( elem, name, extra );
			}
		},

		set: function( elem, value, extra ) {
			var styles = extra && getStyles( elem );
			return setPositiveNumber( elem, value, extra ?
				augmentWidthOrHeight(
					elem,
					name,
					extra,
					jQuery.css( elem, "boxSizing", false, styles ) === "border-box",
					styles
				) : 0
			);
		}
	};
});

// Support: Android 2.3
jQuery.cssHooks.marginRight = addGetHookIf( support.reliableMarginRight,
	function( elem, computed ) {
		if ( computed ) {
			return jQuery.swap( elem, { "display": "inline-block" },
				curCSS, [ elem, "marginRight" ] );
		}
	}
);

// These hooks are used by animate to expand properties
jQuery.each({
	margin: "",
	padding: "",
	border: "Width"
}, function( prefix, suffix ) {
	jQuery.cssHooks[ prefix + suffix ] = {
		expand: function( value ) {
			var i = 0,
				expanded = {},

				// Assumes a single number if not a string
				parts = typeof value === "string" ? value.split(" ") : [ value ];

			for ( ; i < 4; i++ ) {
				expanded[ prefix + cssExpand[ i ] + suffix ] =
					parts[ i ] || parts[ i - 2 ] || parts[ 0 ];
			}

			return expanded;
		}
	};

	if ( !rmargin.test( prefix ) ) {
		jQuery.cssHooks[ prefix + suffix ].set = setPositiveNumber;
	}
});

jQuery.fn.extend({
	css: function( name, value ) {
		return access( this, function( elem, name, value ) {
			var styles, len,
				map = {},
				i = 0;

			if ( jQuery.isArray( name ) ) {
				styles = getStyles( elem );
				len = name.length;

				for ( ; i < len; i++ ) {
					map[ name[ i ] ] = jQuery.css( elem, name[ i ], false, styles );
				}

				return map;
			}

			return value !== undefined ?
				jQuery.style( elem, name, value ) :
				jQuery.css( elem, name );
		}, name, value, arguments.length > 1 );
	},
	show: function() {
		return showHide( this, true );
	},
	hide: function() {
		return showHide( this );
	},
	toggle: function( state ) {
		if ( typeof state === "boolean" ) {
			return state ? this.show() : this.hide();
		}

		return this.each(function() {
			if ( isHidden( this ) ) {
				jQuery( this ).show();
			} else {
				jQuery( this ).hide();
			}
		});
	}
});


function Tween( elem, options, prop, end, easing ) {
	return new Tween.prototype.init( elem, options, prop, end, easing );
}
jQuery.Tween = Tween;

Tween.prototype = {
	constructor: Tween,
	init: function( elem, options, prop, end, easing, unit ) {
		this.elem = elem;
		this.prop = prop;
		this.easing = easing || "swing";
		this.options = options;
		this.start = this.now = this.cur();
		this.end = end;
		this.unit = unit || ( jQuery.cssNumber[ prop ] ? "" : "px" );
	},
	cur: function() {
		var hooks = Tween.propHooks[ this.prop ];

		return hooks && hooks.get ?
			hooks.get( this ) :
			Tween.propHooks._default.get( this );
	},
	run: function( percent ) {
		var eased,
			hooks = Tween.propHooks[ this.prop ];

		if ( this.options.duration ) {
			this.pos = eased = jQuery.easing[ this.easing ](
				percent, this.options.duration * percent, 0, 1, this.options.duration
			);
		} else {
			this.pos = eased = percent;
		}
		this.now = ( this.end - this.start ) * eased + this.start;

		if ( this.options.step ) {
			this.options.step.call( this.elem, this.now, this );
		}

		if ( hooks && hooks.set ) {
			hooks.set( this );
		} else {
			Tween.propHooks._default.set( this );
		}
		return this;
	}
};

Tween.prototype.init.prototype = Tween.prototype;

Tween.propHooks = {
	_default: {
		get: function( tween ) {
			var result;

			if ( tween.elem[ tween.prop ] != null &&
				(!tween.elem.style || tween.elem.style[ tween.prop ] == null) ) {
				return tween.elem[ tween.prop ];
			}

			// Passing an empty string as a 3rd parameter to .css will automatically
			// attempt a parseFloat and fallback to a string if the parse fails.
			// Simple values such as "10px" are parsed to Float;
			// complex values such as "rotate(1rad)" are returned as-is.
			result = jQuery.css( tween.elem, tween.prop, "" );
			// Empty strings, null, undefined and "auto" are converted to 0.
			return !result || result === "auto" ? 0 : result;
		},
		set: function( tween ) {
			// Use step hook for back compat.
			// Use cssHook if its there.
			// Use .style if available and use plain properties where available.
			if ( jQuery.fx.step[ tween.prop ] ) {
				jQuery.fx.step[ tween.prop ]( tween );
			} else if ( tween.elem.style && ( tween.elem.style[ jQuery.cssProps[ tween.prop ] ] != null || jQuery.cssHooks[ tween.prop ] ) ) {
				jQuery.style( tween.elem, tween.prop, tween.now + tween.unit );
			} else {
				tween.elem[ tween.prop ] = tween.now;
			}
		}
	}
};

// Support: IE9
// Panic based approach to setting things on disconnected nodes
Tween.propHooks.scrollTop = Tween.propHooks.scrollLeft = {
	set: function( tween ) {
		if ( tween.elem.nodeType && tween.elem.parentNode ) {
			tween.elem[ tween.prop ] = tween.now;
		}
	}
};

jQuery.easing = {
	linear: function( p ) {
		return p;
	},
	swing: function( p ) {
		return 0.5 - Math.cos( p * Math.PI ) / 2;
	}
};

jQuery.fx = Tween.prototype.init;

// Back Compat <1.8 extension point
jQuery.fx.step = {};




var
	fxNow, timerId,
	rfxtypes = /^(?:toggle|show|hide)$/,
	rfxnum = new RegExp( "^(?:([+-])=|)(" + pnum + ")([a-z%]*)$", "i" ),
	rrun = /queueHooks$/,
	animationPrefilters = [ defaultPrefilter ],
	tweeners = {
		"*": [ function( prop, value ) {
			var tween = this.createTween( prop, value ),
				target = tween.cur(),
				parts = rfxnum.exec( value ),
				unit = parts && parts[ 3 ] || ( jQuery.cssNumber[ prop ] ? "" : "px" ),

				// Starting value computation is required for potential unit mismatches
				start = ( jQuery.cssNumber[ prop ] || unit !== "px" && +target ) &&
					rfxnum.exec( jQuery.css( tween.elem, prop ) ),
				scale = 1,
				maxIterations = 20;

			if ( start && start[ 3 ] !== unit ) {
				// Trust units reported by jQuery.css
				unit = unit || start[ 3 ];

				// Make sure we update the tween properties later on
				parts = parts || [];

				// Iteratively approximate from a nonzero starting point
				start = +target || 1;

				do {
					// If previous iteration zeroed out, double until we get *something*.
					// Use string for doubling so we don't accidentally see scale as unchanged below
					scale = scale || ".5";

					// Adjust and apply
					start = start / scale;
					jQuery.style( tween.elem, prop, start + unit );

				// Update scale, tolerating zero or NaN from tween.cur(),
				// break the loop if scale is unchanged or perfect, or if we've just had enough
				} while ( scale !== (scale = tween.cur() / target) && scale !== 1 && --maxIterations );
			}

			// Update tween properties
			if ( parts ) {
				start = tween.start = +start || +target || 0;
				tween.unit = unit;
				// If a +=/-= token was provided, we're doing a relative animation
				tween.end = parts[ 1 ] ?
					start + ( parts[ 1 ] + 1 ) * parts[ 2 ] :
					+parts[ 2 ];
			}

			return tween;
		} ]
	};

// Animations created synchronously will run synchronously
function createFxNow() {
	setTimeout(function() {
		fxNow = undefined;
	});
	return ( fxNow = jQuery.now() );
}

// Generate parameters to create a standard animation
function genFx( type, includeWidth ) {
	var which,
		i = 0,
		attrs = { height: type };

	// If we include width, step value is 1 to do all cssExpand values,
	// otherwise step value is 2 to skip over Left and Right
	includeWidth = includeWidth ? 1 : 0;
	for ( ; i < 4 ; i += 2 - includeWidth ) {
		which = cssExpand[ i ];
		attrs[ "margin" + which ] = attrs[ "padding" + which ] = type;
	}

	if ( includeWidth ) {
		attrs.opacity = attrs.width = type;
	}

	return attrs;
}

function createTween( value, prop, animation ) {
	var tween,
		collection = ( tweeners[ prop ] || [] ).concat( tweeners[ "*" ] ),
		index = 0,
		length = collection.length;
	for ( ; index < length; index++ ) {
		if ( (tween = collection[ index ].call( animation, prop, value )) ) {

			// We're done with this property
			return tween;
		}
	}
}

function defaultPrefilter( elem, props, opts ) {
	/* jshint validthis: true */
	var prop, value, toggle, tween, hooks, oldfire, display, checkDisplay,
		anim = this,
		orig = {},
		style = elem.style,
		hidden = elem.nodeType && isHidden( elem ),
		dataShow = data_priv.get( elem, "fxshow" );

	// Handle queue: false promises
	if ( !opts.queue ) {
		hooks = jQuery._queueHooks( elem, "fx" );
		if ( hooks.unqueued == null ) {
			hooks.unqueued = 0;
			oldfire = hooks.empty.fire;
			hooks.empty.fire = function() {
				if ( !hooks.unqueued ) {
					oldfire();
				}
			};
		}
		hooks.unqueued++;

		anim.always(function() {
			// Ensure the complete handler is called before this completes
			anim.always(function() {
				hooks.unqueued--;
				if ( !jQuery.queue( elem, "fx" ).length ) {
					hooks.empty.fire();
				}
			});
		});
	}

	// Height/width overflow pass
	if ( elem.nodeType === 1 && ( "height" in props || "width" in props ) ) {
		// Make sure that nothing sneaks out
		// Record all 3 overflow attributes because IE9-10 do not
		// change the overflow attribute when overflowX and
		// overflowY are set to the same value
		opts.overflow = [ style.overflow, style.overflowX, style.overflowY ];

		// Set display property to inline-block for height/width
		// animations on inline elements that are having width/height animated
		display = jQuery.css( elem, "display" );

		// Test default display if display is currently "none"
		checkDisplay = display === "none" ?
			data_priv.get( elem, "olddisplay" ) || defaultDisplay( elem.nodeName ) : display;

		if ( checkDisplay === "inline" && jQuery.css( elem, "float" ) === "none" ) {
			style.display = "inline-block";
		}
	}

	if ( opts.overflow ) {
		style.overflow = "hidden";
		anim.always(function() {
			style.overflow = opts.overflow[ 0 ];
			style.overflowX = opts.overflow[ 1 ];
			style.overflowY = opts.overflow[ 2 ];
		});
	}

	// show/hide pass
	for ( prop in props ) {
		value = props[ prop ];
		if ( rfxtypes.exec( value ) ) {
			delete props[ prop ];
			toggle = toggle || value === "toggle";
			if ( value === ( hidden ? "hide" : "show" ) ) {

				// If there is dataShow left over from a stopped hide or show and we are going to proceed with show, we should pretend to be hidden
				if ( value === "show" && dataShow && dataShow[ prop ] !== undefined ) {
					hidden = true;
				} else {
					continue;
				}
			}
			orig[ prop ] = dataShow && dataShow[ prop ] || jQuery.style( elem, prop );

		// Any non-fx value stops us from restoring the original display value
		} else {
			display = undefined;
		}
	}

	if ( !jQuery.isEmptyObject( orig ) ) {
		if ( dataShow ) {
			if ( "hidden" in dataShow ) {
				hidden = dataShow.hidden;
			}
		} else {
			dataShow = data_priv.access( elem, "fxshow", {} );
		}

		// Store state if its toggle - enables .stop().toggle() to "reverse"
		if ( toggle ) {
			dataShow.hidden = !hidden;
		}
		if ( hidden ) {
			jQuery( elem ).show();
		} else {
			anim.done(function() {
				jQuery( elem ).hide();
			});
		}
		anim.done(function() {
			var prop;

			data_priv.remove( elem, "fxshow" );
			for ( prop in orig ) {
				jQuery.style( elem, prop, orig[ prop ] );
			}
		});
		for ( prop in orig ) {
			tween = createTween( hidden ? dataShow[ prop ] : 0, prop, anim );

			if ( !( prop in dataShow ) ) {
				dataShow[ prop ] = tween.start;
				if ( hidden ) {
					tween.end = tween.start;
					tween.start = prop === "width" || prop === "height" ? 1 : 0;
				}
			}
		}

	// If this is a noop like .hide().hide(), restore an overwritten display value
	} else if ( (display === "none" ? defaultDisplay( elem.nodeName ) : display) === "inline" ) {
		style.display = display;
	}
}

function propFilter( props, specialEasing ) {
	var index, name, easing, value, hooks;

	// camelCase, specialEasing and expand cssHook pass
	for ( index in props ) {
		name = jQuery.camelCase( index );
		easing = specialEasing[ name ];
		value = props[ index ];
		if ( jQuery.isArray( value ) ) {
			easing = value[ 1 ];
			value = props[ index ] = value[ 0 ];
		}

		if ( index !== name ) {
			props[ name ] = value;
			delete props[ index ];
		}

		hooks = jQuery.cssHooks[ name ];
		if ( hooks && "expand" in hooks ) {
			value = hooks.expand( value );
			delete props[ name ];

			// Not quite $.extend, this won't overwrite existing keys.
			// Reusing 'index' because we have the correct "name"
			for ( index in value ) {
				if ( !( index in props ) ) {
					props[ index ] = value[ index ];
					specialEasing[ index ] = easing;
				}
			}
		} else {
			specialEasing[ name ] = easing;
		}
	}
}

function Animation( elem, properties, options ) {
	var result,
		stopped,
		index = 0,
		length = animationPrefilters.length,
		deferred = jQuery.Deferred().always( function() {
			// Don't match elem in the :animated selector
			delete tick.elem;
		}),
		tick = function() {
			if ( stopped ) {
				return false;
			}
			var currentTime = fxNow || createFxNow(),
				remaining = Math.max( 0, animation.startTime + animation.duration - currentTime ),
				// Support: Android 2.3
				// Archaic crash bug won't allow us to use `1 - ( 0.5 || 0 )` (#12497)
				temp = remaining / animation.duration || 0,
				percent = 1 - temp,
				index = 0,
				length = animation.tweens.length;

			for ( ; index < length ; index++ ) {
				animation.tweens[ index ].run( percent );
			}

			deferred.notifyWith( elem, [ animation, percent, remaining ]);

			if ( percent < 1 && length ) {
				return remaining;
			} else {
				deferred.resolveWith( elem, [ animation ] );
				return false;
			}
		},
		animation = deferred.promise({
			elem: elem,
			props: jQuery.extend( {}, properties ),
			opts: jQuery.extend( true, { specialEasing: {} }, options ),
			originalProperties: properties,
			originalOptions: options,
			startTime: fxNow || createFxNow(),
			duration: options.duration,
			tweens: [],
			createTween: function( prop, end ) {
				var tween = jQuery.Tween( elem, animation.opts, prop, end,
						animation.opts.specialEasing[ prop ] || animation.opts.easing );
				animation.tweens.push( tween );
				return tween;
			},
			stop: function( gotoEnd ) {
				var index = 0,
					// If we are going to the end, we want to run all the tweens
					// otherwise we skip this part
					length = gotoEnd ? animation.tweens.length : 0;
				if ( stopped ) {
					return this;
				}
				stopped = true;
				for ( ; index < length ; index++ ) {
					animation.tweens[ index ].run( 1 );
				}

				// Resolve when we played the last frame; otherwise, reject
				if ( gotoEnd ) {
					deferred.resolveWith( elem, [ animation, gotoEnd ] );
				} else {
					deferred.rejectWith( elem, [ animation, gotoEnd ] );
				}
				return this;
			}
		}),
		props = animation.props;

	propFilter( props, animation.opts.specialEasing );

	for ( ; index < length ; index++ ) {
		result = animationPrefilters[ index ].call( animation, elem, props, animation.opts );
		if ( result ) {
			return result;
		}
	}

	jQuery.map( props, createTween, animation );

	if ( jQuery.isFunction( animation.opts.start ) ) {
		animation.opts.start.call( elem, animation );
	}

	jQuery.fx.timer(
		jQuery.extend( tick, {
			elem: elem,
			anim: animation,
			queue: animation.opts.queue
		})
	);

	// attach callbacks from options
	return animation.progress( animation.opts.progress )
		.done( animation.opts.done, animation.opts.complete )
		.fail( animation.opts.fail )
		.always( animation.opts.always );
}

jQuery.Animation = jQuery.extend( Animation, {

	tweener: function( props, callback ) {
		if ( jQuery.isFunction( props ) ) {
			callback = props;
			props = [ "*" ];
		} else {
			props = props.split(" ");
		}

		var prop,
			index = 0,
			length = props.length;

		for ( ; index < length ; index++ ) {
			prop = props[ index ];
			tweeners[ prop ] = tweeners[ prop ] || [];
			tweeners[ prop ].unshift( callback );
		}
	},

	prefilter: function( callback, prepend ) {
		if ( prepend ) {
			animationPrefilters.unshift( callback );
		} else {
			animationPrefilters.push( callback );
		}
	}
});

jQuery.speed = function( speed, easing, fn ) {
	var opt = speed && typeof speed === "object" ? jQuery.extend( {}, speed ) : {
		complete: fn || !fn && easing ||
			jQuery.isFunction( speed ) && speed,
		duration: speed,
		easing: fn && easing || easing && !jQuery.isFunction( easing ) && easing
	};

	opt.duration = jQuery.fx.off ? 0 : typeof opt.duration === "number" ? opt.duration :
		opt.duration in jQuery.fx.speeds ? jQuery.fx.speeds[ opt.duration ] : jQuery.fx.speeds._default;

	// Normalize opt.queue - true/undefined/null -> "fx"
	if ( opt.queue == null || opt.queue === true ) {
		opt.queue = "fx";
	}

	// Queueing
	opt.old = opt.complete;

	opt.complete = function() {
		if ( jQuery.isFunction( opt.old ) ) {
			opt.old.call( this );
		}

		if ( opt.queue ) {
			jQuery.dequeue( this, opt.queue );
		}
	};

	return opt;
};

jQuery.fn.extend({
	fadeTo: function( speed, to, easing, callback ) {

		// Show any hidden elements after setting opacity to 0
		return this.filter( isHidden ).css( "opacity", 0 ).show()

			// Animate to the value specified
			.end().animate({ opacity: to }, speed, easing, callback );
	},
	animate: function( prop, speed, easing, callback ) {
		var empty = jQuery.isEmptyObject( prop ),
			optall = jQuery.speed( speed, easing, callback ),
			doAnimation = function() {
				// Operate on a copy of prop so per-property easing won't be lost
				var anim = Animation( this, jQuery.extend( {}, prop ), optall );

				// Empty animations, or finishing resolves immediately
				if ( empty || data_priv.get( this, "finish" ) ) {
					anim.stop( true );
				}
			};
			doAnimation.finish = doAnimation;

		return empty || optall.queue === false ?
			this.each( doAnimation ) :
			this.queue( optall.queue, doAnimation );
	},
	stop: function( type, clearQueue, gotoEnd ) {
		var stopQueue = function( hooks ) {
			var stop = hooks.stop;
			delete hooks.stop;
			stop( gotoEnd );
		};

		if ( typeof type !== "string" ) {
			gotoEnd = clearQueue;
			clearQueue = type;
			type = undefined;
		}
		if ( clearQueue && type !== false ) {
			this.queue( type || "fx", [] );
		}

		return this.each(function() {
			var dequeue = true,
				index = type != null && type + "queueHooks",
				timers = jQuery.timers,
				data = data_priv.get( this );

			if ( index ) {
				if ( data[ index ] && data[ index ].stop ) {
					stopQueue( data[ index ] );
				}
			} else {
				for ( index in data ) {
					if ( data[ index ] && data[ index ].stop && rrun.test( index ) ) {
						stopQueue( data[ index ] );
					}
				}
			}

			for ( index = timers.length; index--; ) {
				if ( timers[ index ].elem === this && (type == null || timers[ index ].queue === type) ) {
					timers[ index ].anim.stop( gotoEnd );
					dequeue = false;
					timers.splice( index, 1 );
				}
			}

			// Start the next in the queue if the last step wasn't forced.
			// Timers currently will call their complete callbacks, which
			// will dequeue but only if they were gotoEnd.
			if ( dequeue || !gotoEnd ) {
				jQuery.dequeue( this, type );
			}
		});
	},
	finish: function( type ) {
		if ( type !== false ) {
			type = type || "fx";
		}
		return this.each(function() {
			var index,
				data = data_priv.get( this ),
				queue = data[ type + "queue" ],
				hooks = data[ type + "queueHooks" ],
				timers = jQuery.timers,
				length = queue ? queue.length : 0;

			// Enable finishing flag on private data
			data.finish = true;

			// Empty the queue first
			jQuery.queue( this, type, [] );

			if ( hooks && hooks.stop ) {
				hooks.stop.call( this, true );
			}

			// Look for any active animations, and finish them
			for ( index = timers.length; index--; ) {
				if ( timers[ index ].elem === this && timers[ index ].queue === type ) {
					timers[ index ].anim.stop( true );
					timers.splice( index, 1 );
				}
			}

			// Look for any animations in the old queue and finish them
			for ( index = 0; index < length; index++ ) {
				if ( queue[ index ] && queue[ index ].finish ) {
					queue[ index ].finish.call( this );
				}
			}

			// Turn off finishing flag
			delete data.finish;
		});
	}
});

jQuery.each([ "toggle", "show", "hide" ], function( i, name ) {
	var cssFn = jQuery.fn[ name ];
	jQuery.fn[ name ] = function( speed, easing, callback ) {
		return speed == null || typeof speed === "boolean" ?
			cssFn.apply( this, arguments ) :
			this.animate( genFx( name, true ), speed, easing, callback );
	};
});

// Generate shortcuts for custom animations
jQuery.each({
	slideDown: genFx("show"),
	slideUp: genFx("hide"),
	slideToggle: genFx("toggle"),
	fadeIn: { opacity: "show" },
	fadeOut: { opacity: "hide" },
	fadeToggle: { opacity: "toggle" }
}, function( name, props ) {
	jQuery.fn[ name ] = function( speed, easing, callback ) {
		return this.animate( props, speed, easing, callback );
	};
});

jQuery.timers = [];
jQuery.fx.tick = function() {
	var timer,
		i = 0,
		timers = jQuery.timers;

	fxNow = jQuery.now();

	for ( ; i < timers.length; i++ ) {
		timer = timers[ i ];
		// Checks the timer has not already been removed
		if ( !timer() && timers[ i ] === timer ) {
			timers.splice( i--, 1 );
		}
	}

	if ( !timers.length ) {
		jQuery.fx.stop();
	}
	fxNow = undefined;
};

jQuery.fx.timer = function( timer ) {
	jQuery.timers.push( timer );
	if ( timer() ) {
		jQuery.fx.start();
	} else {
		jQuery.timers.pop();
	}
};

jQuery.fx.interval = 13;

jQuery.fx.start = function() {
	if ( !timerId ) {
		timerId = setInterval( jQuery.fx.tick, jQuery.fx.interval );
	}
};

jQuery.fx.stop = function() {
	clearInterval( timerId );
	timerId = null;
};

jQuery.fx.speeds = {
	slow: 600,
	fast: 200,
	// Default speed
	_default: 400
};


// Based off of the plugin by Clint Helfers, with permission.
// http://blindsignals.com/index.php/2009/07/jquery-delay/
jQuery.fn.delay = function( time, type ) {
	time = jQuery.fx ? jQuery.fx.speeds[ time ] || time : time;
	type = type || "fx";

	return this.queue( type, function( next, hooks ) {
		var timeout = setTimeout( next, time );
		hooks.stop = function() {
			clearTimeout( timeout );
		};
	});
};


(function() {
	var input = document.createElement( "input" ),
		select = document.createElement( "select" ),
		opt = select.appendChild( document.createElement( "option" ) );

	input.type = "checkbox";

	// Support: iOS<=5.1, Android<=4.2+
	// Default value for a checkbox should be "on"
	support.checkOn = input.value !== "";

	// Support: IE<=11+
	// Must access selectedIndex to make default options select
	support.optSelected = opt.selected;

	// Support: Android<=2.3
	// Options inside disabled selects are incorrectly marked as disabled
	select.disabled = true;
	support.optDisabled = !opt.disabled;

	// Support: IE<=11+
	// An input loses its value after becoming a radio
	input = document.createElement( "input" );
	input.value = "t";
	input.type = "radio";
	support.radioValue = input.value === "t";
})();


var nodeHook, boolHook,
	attrHandle = jQuery.expr.attrHandle;

jQuery.fn.extend({
	attr: function( name, value ) {
		return access( this, jQuery.attr, name, value, arguments.length > 1 );
	},

	removeAttr: function( name ) {
		return this.each(function() {
			jQuery.removeAttr( this, name );
		});
	}
});

jQuery.extend({
	attr: function( elem, name, value ) {
		var hooks, ret,
			nType = elem.nodeType;

		// don't get/set attributes on text, comment and attribute nodes
		if ( !elem || nType === 3 || nType === 8 || nType === 2 ) {
			return;
		}

		// Fallback to prop when attributes are not supported
		if ( typeof elem.getAttribute === strundefined ) {
			return jQuery.prop( elem, name, value );
		}

		// All attributes are lowercase
		// Grab necessary hook if one is defined
		if ( nType !== 1 || !jQuery.isXMLDoc( elem ) ) {
			name = name.toLowerCase();
			hooks = jQuery.attrHooks[ name ] ||
				( jQuery.expr.match.bool.test( name ) ? boolHook : nodeHook );
		}

		if ( value !== undefined ) {

			if ( value === null ) {
				jQuery.removeAttr( elem, name );

			} else if ( hooks && "set" in hooks && (ret = hooks.set( elem, value, name )) !== undefined ) {
				return ret;

			} else {
				elem.setAttribute( name, value + "" );
				return value;
			}

		} else if ( hooks && "get" in hooks && (ret = hooks.get( elem, name )) !== null ) {
			return ret;

		} else {
			ret = jQuery.find.attr( elem, name );

			// Non-existent attributes return null, we normalize to undefined
			return ret == null ?
				undefined :
				ret;
		}
	},

	removeAttr: function( elem, value ) {
		var name, propName,
			i = 0,
			attrNames = value && value.match( rnotwhite );

		if ( attrNames && elem.nodeType === 1 ) {
			while ( (name = attrNames[i++]) ) {
				propName = jQuery.propFix[ name ] || name;

				// Boolean attributes get special treatment (#10870)
				if ( jQuery.expr.match.bool.test( name ) ) {
					// Set corresponding property to false
					elem[ propName ] = false;
				}

				elem.removeAttribute( name );
			}
		}
	},

	attrHooks: {
		type: {
			set: function( elem, value ) {
				if ( !support.radioValue && value === "radio" &&
					jQuery.nodeName( elem, "input" ) ) {
					var val = elem.value;
					elem.setAttribute( "type", value );
					if ( val ) {
						elem.value = val;
					}
					return value;
				}
			}
		}
	}
});

// Hooks for boolean attributes
boolHook = {
	set: function( elem, value, name ) {
		if ( value === false ) {
			// Remove boolean attributes when set to false
			jQuery.removeAttr( elem, name );
		} else {
			elem.setAttribute( name, name );
		}
		return name;
	}
};
jQuery.each( jQuery.expr.match.bool.source.match( /\w+/g ), function( i, name ) {
	var getter = attrHandle[ name ] || jQuery.find.attr;

	attrHandle[ name ] = function( elem, name, isXML ) {
		var ret, handle;
		if ( !isXML ) {
			// Avoid an infinite loop by temporarily removing this function from the getter
			handle = attrHandle[ name ];
			attrHandle[ name ] = ret;
			ret = getter( elem, name, isXML ) != null ?
				name.toLowerCase() :
				null;
			attrHandle[ name ] = handle;
		}
		return ret;
	};
});




var rfocusable = /^(?:input|select|textarea|button)$/i;

jQuery.fn.extend({
	prop: function( name, value ) {
		return access( this, jQuery.prop, name, value, arguments.length > 1 );
	},

	removeProp: function( name ) {
		return this.each(function() {
			delete this[ jQuery.propFix[ name ] || name ];
		});
	}
});

jQuery.extend({
	propFix: {
		"for": "htmlFor",
		"class": "className"
	},

	prop: function( elem, name, value ) {
		var ret, hooks, notxml,
			nType = elem.nodeType;

		// Don't get/set properties on text, comment and attribute nodes
		if ( !elem || nType === 3 || nType === 8 || nType === 2 ) {
			return;
		}

		notxml = nType !== 1 || !jQuery.isXMLDoc( elem );

		if ( notxml ) {
			// Fix name and attach hooks
			name = jQuery.propFix[ name ] || name;
			hooks = jQuery.propHooks[ name ];
		}

		if ( value !== undefined ) {
			return hooks && "set" in hooks && (ret = hooks.set( elem, value, name )) !== undefined ?
				ret :
				( elem[ name ] = value );

		} else {
			return hooks && "get" in hooks && (ret = hooks.get( elem, name )) !== null ?
				ret :
				elem[ name ];
		}
	},

	propHooks: {
		tabIndex: {
			get: function( elem ) {
				return elem.hasAttribute( "tabindex" ) || rfocusable.test( elem.nodeName ) || elem.href ?
					elem.tabIndex :
					-1;
			}
		}
	}
});

if ( !support.optSelected ) {
	jQuery.propHooks.selected = {
		get: function( elem ) {
			var parent = elem.parentNode;
			if ( parent && parent.parentNode ) {
				parent.parentNode.selectedIndex;
			}
			return null;
		}
	};
}

jQuery.each([
	"tabIndex",
	"readOnly",
	"maxLength",
	"cellSpacing",
	"cellPadding",
	"rowSpan",
	"colSpan",
	"useMap",
	"frameBorder",
	"contentEditable"
], function() {
	jQuery.propFix[ this.toLowerCase() ] = this;
});




var rclass = /[\t\r\n\f]/g;

jQuery.fn.extend({
	addClass: function( value ) {
		var classes, elem, cur, clazz, j, finalValue,
			proceed = typeof value === "string" && value,
			i = 0,
			len = this.length;

		if ( jQuery.isFunction( value ) ) {
			return this.each(function( j ) {
				jQuery( this ).addClass( value.call( this, j, this.className ) );
			});
		}

		if ( proceed ) {
			// The disjunction here is for better compressibility (see removeClass)
			classes = ( value || "" ).match( rnotwhite ) || [];

			for ( ; i < len; i++ ) {
				elem = this[ i ];
				cur = elem.nodeType === 1 && ( elem.className ?
					( " " + elem.className + " " ).replace( rclass, " " ) :
					" "
				);

				if ( cur ) {
					j = 0;
					while ( (clazz = classes[j++]) ) {
						if ( cur.indexOf( " " + clazz + " " ) < 0 ) {
							cur += clazz + " ";
						}
					}

					// only assign if different to avoid unneeded rendering.
					finalValue = jQuery.trim( cur );
					if ( elem.className !== finalValue ) {
						elem.className = finalValue;
					}
				}
			}
		}

		return this;
	},

	removeClass: function( value ) {
		var classes, elem, cur, clazz, j, finalValue,
			proceed = arguments.length === 0 || typeof value === "string" && value,
			i = 0,
			len = this.length;

		if ( jQuery.isFunction( value ) ) {
			return this.each(function( j ) {
				jQuery( this ).removeClass( value.call( this, j, this.className ) );
			});
		}
		if ( proceed ) {
			classes = ( value || "" ).match( rnotwhite ) || [];

			for ( ; i < len; i++ ) {
				elem = this[ i ];
				// This expression is here for better compressibility (see addClass)
				cur = elem.nodeType === 1 && ( elem.className ?
					( " " + elem.className + " " ).replace( rclass, " " ) :
					""
				);

				if ( cur ) {
					j = 0;
					while ( (clazz = classes[j++]) ) {
						// Remove *all* instances
						while ( cur.indexOf( " " + clazz + " " ) >= 0 ) {
							cur = cur.replace( " " + clazz + " ", " " );
						}
					}

					// Only assign if different to avoid unneeded rendering.
					finalValue = value ? jQuery.trim( cur ) : "";
					if ( elem.className !== finalValue ) {
						elem.className = finalValue;
					}
				}
			}
		}

		return this;
	},

	toggleClass: function( value, stateVal ) {
		var type = typeof value;

		if ( typeof stateVal === "boolean" && type === "string" ) {
			return stateVal ? this.addClass( value ) : this.removeClass( value );
		}

		if ( jQuery.isFunction( value ) ) {
			return this.each(function( i ) {
				jQuery( this ).toggleClass( value.call(this, i, this.className, stateVal), stateVal );
			});
		}

		return this.each(function() {
			if ( type === "string" ) {
				// Toggle individual class names
				var className,
					i = 0,
					self = jQuery( this ),
					classNames = value.match( rnotwhite ) || [];

				while ( (className = classNames[ i++ ]) ) {
					// Check each className given, space separated list
					if ( self.hasClass( className ) ) {
						self.removeClass( className );
					} else {
						self.addClass( className );
					}
				}

			// Toggle whole class name
			} else if ( type === strundefined || type === "boolean" ) {
				if ( this.className ) {
					// store className if set
					data_priv.set( this, "__className__", this.className );
				}

				// If the element has a class name or if we're passed `false`,
				// then remove the whole classname (if there was one, the above saved it).
				// Otherwise bring back whatever was previously saved (if anything),
				// falling back to the empty string if nothing was stored.
				this.className = this.className || value === false ? "" : data_priv.get( this, "__className__" ) || "";
			}
		});
	},

	hasClass: function( selector ) {
		var className = " " + selector + " ",
			i = 0,
			l = this.length;
		for ( ; i < l; i++ ) {
			if ( this[i].nodeType === 1 && (" " + this[i].className + " ").replace(rclass, " ").indexOf( className ) >= 0 ) {
				return true;
			}
		}

		return false;
	}
});




var rreturn = /\r/g;

jQuery.fn.extend({
	val: function( value ) {
		var hooks, ret, isFunction,
			elem = this[0];

		if ( !arguments.length ) {
			if ( elem ) {
				hooks = jQuery.valHooks[ elem.type ] || jQuery.valHooks[ elem.nodeName.toLowerCase() ];

				if ( hooks && "get" in hooks && (ret = hooks.get( elem, "value" )) !== undefined ) {
					return ret;
				}

				ret = elem.value;

				return typeof ret === "string" ?
					// Handle most common string cases
					ret.replace(rreturn, "") :
					// Handle cases where value is null/undef or number
					ret == null ? "" : ret;
			}

			return;
		}

		isFunction = jQuery.isFunction( value );

		return this.each(function( i ) {
			var val;

			if ( this.nodeType !== 1 ) {
				return;
			}

			if ( isFunction ) {
				val = value.call( this, i, jQuery( this ).val() );
			} else {
				val = value;
			}

			// Treat null/undefined as ""; convert numbers to string
			if ( val == null ) {
				val = "";

			} else if ( typeof val === "number" ) {
				val += "";

			} else if ( jQuery.isArray( val ) ) {
				val = jQuery.map( val, function( value ) {
					return value == null ? "" : value + "";
				});
			}

			hooks = jQuery.valHooks[ this.type ] || jQuery.valHooks[ this.nodeName.toLowerCase() ];

			// If set returns undefined, fall back to normal setting
			if ( !hooks || !("set" in hooks) || hooks.set( this, val, "value" ) === undefined ) {
				this.value = val;
			}
		});
	}
});

jQuery.extend({
	valHooks: {
		option: {
			get: function( elem ) {
				var val = jQuery.find.attr( elem, "value" );
				return val != null ?
					val :
					// Support: IE10-11+
					// option.text throws exceptions (#14686, #14858)
					jQuery.trim( jQuery.text( elem ) );
			}
		},
		select: {
			get: function( elem ) {
				var value, option,
					options = elem.options,
					index = elem.selectedIndex,
					one = elem.type === "select-one" || index < 0,
					values = one ? null : [],
					max = one ? index + 1 : options.length,
					i = index < 0 ?
						max :
						one ? index : 0;

				// Loop through all the selected options
				for ( ; i < max; i++ ) {
					option = options[ i ];

					// IE6-9 doesn't update selected after form reset (#2551)
					if ( ( option.selected || i === index ) &&
							// Don't return options that are disabled or in a disabled optgroup
							( support.optDisabled ? !option.disabled : option.getAttribute( "disabled" ) === null ) &&
							( !option.parentNode.disabled || !jQuery.nodeName( option.parentNode, "optgroup" ) ) ) {

						// Get the specific value for the option
						value = jQuery( option ).val();

						// We don't need an array for one selects
						if ( one ) {
							return value;
						}

						// Multi-Selects return an array
						values.push( value );
					}
				}

				return values;
			},

			set: function( elem, value ) {
				var optionSet, option,
					options = elem.options,
					values = jQuery.makeArray( value ),
					i = options.length;

				while ( i-- ) {
					option = options[ i ];
					if ( (option.selected = jQuery.inArray( option.value, values ) >= 0) ) {
						optionSet = true;
					}
				}

				// Force browsers to behave consistently when non-matching value is set
				if ( !optionSet ) {
					elem.selectedIndex = -1;
				}
				return values;
			}
		}
	}
});

// Radios and checkboxes getter/setter
jQuery.each([ "radio", "checkbox" ], function() {
	jQuery.valHooks[ this ] = {
		set: function( elem, value ) {
			if ( jQuery.isArray( value ) ) {
				return ( elem.checked = jQuery.inArray( jQuery(elem).val(), value ) >= 0 );
			}
		}
	};
	if ( !support.checkOn ) {
		jQuery.valHooks[ this ].get = function( elem ) {
			return elem.getAttribute("value") === null ? "on" : elem.value;
		};
	}
});




// Return jQuery for attributes-only inclusion


jQuery.each( ("blur focus focusin focusout load resize scroll unload click dblclick " +
	"mousedown mouseup mousemove mouseover mouseout mouseenter mouseleave " +
	"change select submit keydown keypress keyup error contextmenu").split(" "), function( i, name ) {

	// Handle event binding
	jQuery.fn[ name ] = function( data, fn ) {
		return arguments.length > 0 ?
			this.on( name, null, data, fn ) :
			this.trigger( name );
	};
});

jQuery.fn.extend({
	hover: function( fnOver, fnOut ) {
		return this.mouseenter( fnOver ).mouseleave( fnOut || fnOver );
	},

	bind: function( types, data, fn ) {
		return this.on( types, null, data, fn );
	},
	unbind: function( types, fn ) {
		return this.off( types, null, fn );
	},

	delegate: function( selector, types, data, fn ) {
		return this.on( types, selector, data, fn );
	},
	undelegate: function( selector, types, fn ) {
		// ( namespace ) or ( selector, types [, fn] )
		return arguments.length === 1 ? this.off( selector, "**" ) : this.off( types, selector || "**", fn );
	}
});


var nonce = jQuery.now();

var rquery = (/\?/);



// Support: Android 2.3
// Workaround failure to string-cast null input
jQuery.parseJSON = function( data ) {
	return JSON.parse( data + "" );
};


// Cross-browser xml parsing
jQuery.parseXML = function( data ) {
	var xml, tmp;
	if ( !data || typeof data !== "string" ) {
		return null;
	}

	// Support: IE9
	try {
		tmp = new DOMParser();
		xml = tmp.parseFromString( data, "text/xml" );
	} catch ( e ) {
		xml = undefined;
	}

	if ( !xml || xml.getElementsByTagName( "parsererror" ).length ) {
		jQuery.error( "Invalid XML: " + data );
	}
	return xml;
};


var
	rhash = /#.*$/,
	rts = /([?&])_=[^&]*/,
	rheaders = /^(.*?):[ \t]*([^\r\n]*)$/mg,
	// #7653, #8125, #8152: local protocol detection
	rlocalProtocol = /^(?:about|app|app-storage|.+-extension|file|res|widget):$/,
	rnoContent = /^(?:GET|HEAD)$/,
	rprotocol = /^\/\//,
	rurl = /^([\w.+-]+:)(?:\/\/(?:[^\/?#]*@|)([^\/?#:]*)(?::(\d+)|)|)/,

	/* Prefilters
	 * 1) They are useful to introduce custom dataTypes (see ajax/jsonp.js for an example)
	 * 2) These are called:
	 *    - BEFORE asking for a transport
	 *    - AFTER param serialization (s.data is a string if s.processData is true)
	 * 3) key is the dataType
	 * 4) the catchall symbol "*" can be used
	 * 5) execution will start with transport dataType and THEN continue down to "*" if needed
	 */
	prefilters = {},

	/* Transports bindings
	 * 1) key is the dataType
	 * 2) the catchall symbol "*" can be used
	 * 3) selection will start with transport dataType and THEN go to "*" if needed
	 */
	transports = {},

	// Avoid comment-prolog char sequence (#10098); must appease lint and evade compression
	allTypes = "*/".concat( "*" ),

	// Document location
	ajaxLocation = window.location.href,

	// Segment location into parts
	ajaxLocParts = rurl.exec( ajaxLocation.toLowerCase() ) || [];

// Base "constructor" for jQuery.ajaxPrefilter and jQuery.ajaxTransport
function addToPrefiltersOrTransports( structure ) {

	// dataTypeExpression is optional and defaults to "*"
	return function( dataTypeExpression, func ) {

		if ( typeof dataTypeExpression !== "string" ) {
			func = dataTypeExpression;
			dataTypeExpression = "*";
		}

		var dataType,
			i = 0,
			dataTypes = dataTypeExpression.toLowerCase().match( rnotwhite ) || [];

		if ( jQuery.isFunction( func ) ) {
			// For each dataType in the dataTypeExpression
			while ( (dataType = dataTypes[i++]) ) {
				// Prepend if requested
				if ( dataType[0] === "+" ) {
					dataType = dataType.slice( 1 ) || "*";
					(structure[ dataType ] = structure[ dataType ] || []).unshift( func );

				// Otherwise append
				} else {
					(structure[ dataType ] = structure[ dataType ] || []).push( func );
				}
			}
		}
	};
}

// Base inspection function for prefilters and transports
function inspectPrefiltersOrTransports( structure, options, originalOptions, jqXHR ) {

	var inspected = {},
		seekingTransport = ( structure === transports );

	function inspect( dataType ) {
		var selected;
		inspected[ dataType ] = true;
		jQuery.each( structure[ dataType ] || [], function( _, prefilterOrFactory ) {
			var dataTypeOrTransport = prefilterOrFactory( options, originalOptions, jqXHR );
			if ( typeof dataTypeOrTransport === "string" && !seekingTransport && !inspected[ dataTypeOrTransport ] ) {
				options.dataTypes.unshift( dataTypeOrTransport );
				inspect( dataTypeOrTransport );
				return false;
			} else if ( seekingTransport ) {
				return !( selected = dataTypeOrTransport );
			}
		});
		return selected;
	}

	return inspect( options.dataTypes[ 0 ] ) || !inspected[ "*" ] && inspect( "*" );
}

// A special extend for ajax options
// that takes "flat" options (not to be deep extended)
// Fixes #9887
function ajaxExtend( target, src ) {
	var key, deep,
		flatOptions = jQuery.ajaxSettings.flatOptions || {};

	for ( key in src ) {
		if ( src[ key ] !== undefined ) {
			( flatOptions[ key ] ? target : ( deep || (deep = {}) ) )[ key ] = src[ key ];
		}
	}
	if ( deep ) {
		jQuery.extend( true, target, deep );
	}

	return target;
}

/* Handles responses to an ajax request:
 * - finds the right dataType (mediates between content-type and expected dataType)
 * - returns the corresponding response
 */
function ajaxHandleResponses( s, jqXHR, responses ) {

	var ct, type, finalDataType, firstDataType,
		contents = s.contents,
		dataTypes = s.dataTypes;

	// Remove auto dataType and get content-type in the process
	while ( dataTypes[ 0 ] === "*" ) {
		dataTypes.shift();
		if ( ct === undefined ) {
			ct = s.mimeType || jqXHR.getResponseHeader("Content-Type");
		}
	}

	// Check if we're dealing with a known content-type
	if ( ct ) {
		for ( type in contents ) {
			if ( contents[ type ] && contents[ type ].test( ct ) ) {
				dataTypes.unshift( type );
				break;
			}
		}
	}

	// Check to see if we have a response for the expected dataType
	if ( dataTypes[ 0 ] in responses ) {
		finalDataType = dataTypes[ 0 ];
	} else {
		// Try convertible dataTypes
		for ( type in responses ) {
			if ( !dataTypes[ 0 ] || s.converters[ type + " " + dataTypes[0] ] ) {
				finalDataType = type;
				break;
			}
			if ( !firstDataType ) {
				firstDataType = type;
			}
		}
		// Or just use first one
		finalDataType = finalDataType || firstDataType;
	}

	// If we found a dataType
	// We add the dataType to the list if needed
	// and return the corresponding response
	if ( finalDataType ) {
		if ( finalDataType !== dataTypes[ 0 ] ) {
			dataTypes.unshift( finalDataType );
		}
		return responses[ finalDataType ];
	}
}

/* Chain conversions given the request and the original response
 * Also sets the responseXXX fields on the jqXHR instance
 */
function ajaxConvert( s, response, jqXHR, isSuccess ) {
	var conv2, current, conv, tmp, prev,
		converters = {},
		// Work with a copy of dataTypes in case we need to modify it for conversion
		dataTypes = s.dataTypes.slice();

	// Create converters map with lowercased keys
	if ( dataTypes[ 1 ] ) {
		for ( conv in s.converters ) {
			converters[ conv.toLowerCase() ] = s.converters[ conv ];
		}
	}

	current = dataTypes.shift();

	// Convert to each sequential dataType
	while ( current ) {

		if ( s.responseFields[ current ] ) {
			jqXHR[ s.responseFields[ current ] ] = response;
		}

		// Apply the dataFilter if provided
		if ( !prev && isSuccess && s.dataFilter ) {
			response = s.dataFilter( response, s.dataType );
		}

		prev = current;
		current = dataTypes.shift();

		if ( current ) {

		// There's only work to do if current dataType is non-auto
			if ( current === "*" ) {

				current = prev;

			// Convert response if prev dataType is non-auto and differs from current
			} else if ( prev !== "*" && prev !== current ) {

				// Seek a direct converter
				conv = converters[ prev + " " + current ] || converters[ "* " + current ];

				// If none found, seek a pair
				if ( !conv ) {
					for ( conv2 in converters ) {

						// If conv2 outputs current
						tmp = conv2.split( " " );
						if ( tmp[ 1 ] === current ) {

							// If prev can be converted to accepted input
							conv = converters[ prev + " " + tmp[ 0 ] ] ||
								converters[ "* " + tmp[ 0 ] ];
							if ( conv ) {
								// Condense equivalence converters
								if ( conv === true ) {
									conv = converters[ conv2 ];

								// Otherwise, insert the intermediate dataType
								} else if ( converters[ conv2 ] !== true ) {
									current = tmp[ 0 ];
									dataTypes.unshift( tmp[ 1 ] );
								}
								break;
							}
						}
					}
				}

				// Apply converter (if not an equivalence)
				if ( conv !== true ) {

					// Unless errors are allowed to bubble, catch and return them
					if ( conv && s[ "throws" ] ) {
						response = conv( response );
					} else {
						try {
							response = conv( response );
						} catch ( e ) {
							return { state: "parsererror", error: conv ? e : "No conversion from " + prev + " to " + current };
						}
					}
				}
			}
		}
	}

	return { state: "success", data: response };
}

jQuery.extend({

	// Counter for holding the number of active queries
	active: 0,

	// Last-Modified header cache for next request
	lastModified: {},
	etag: {},

	ajaxSettings: {
		url: ajaxLocation,
		type: "GET",
		isLocal: rlocalProtocol.test( ajaxLocParts[ 1 ] ),
		global: true,
		processData: true,
		async: true,
		contentType: "application/x-www-form-urlencoded; charset=UTF-8",
		/*
		timeout: 0,
		data: null,
		dataType: null,
		username: null,
		password: null,
		cache: null,
		throws: false,
		traditional: false,
		headers: {},
		*/

		accepts: {
			"*": allTypes,
			text: "text/plain",
			html: "text/html",
			xml: "application/xml, text/xml",
			json: "application/json, text/javascript"
		},

		contents: {
			xml: /xml/,
			html: /html/,
			json: /json/
		},

		responseFields: {
			xml: "responseXML",
			text: "responseText",
			json: "responseJSON"
		},

		// Data converters
		// Keys separate source (or catchall "*") and destination types with a single space
		converters: {

			// Convert anything to text
			"* text": String,

			// Text to html (true = no transformation)
			"text html": true,

			// Evaluate text as a json expression
			"text json": jQuery.parseJSON,

			// Parse text as xml
			"text xml": jQuery.parseXML
		},

		// For options that shouldn't be deep extended:
		// you can add your own custom options here if
		// and when you create one that shouldn't be
		// deep extended (see ajaxExtend)
		flatOptions: {
			url: true,
			context: true
		}
	},

	// Creates a full fledged settings object into target
	// with both ajaxSettings and settings fields.
	// If target is omitted, writes into ajaxSettings.
	ajaxSetup: function( target, settings ) {
		return settings ?

			// Building a settings object
			ajaxExtend( ajaxExtend( target, jQuery.ajaxSettings ), settings ) :

			// Extending ajaxSettings
			ajaxExtend( jQuery.ajaxSettings, target );
	},

	ajaxPrefilter: addToPrefiltersOrTransports( prefilters ),
	ajaxTransport: addToPrefiltersOrTransports( transports ),

	// Main method
	ajax: function( url, options ) {

		// If url is an object, simulate pre-1.5 signature
		if ( typeof url === "object" ) {
			options = url;
			url = undefined;
		}

		// Force options to be an object
		options = options || {};

		var transport,
			// URL without anti-cache param
			cacheURL,
			// Response headers
			responseHeadersString,
			responseHeaders,
			// timeout handle
			timeoutTimer,
			// Cross-domain detection vars
			parts,
			// To know if global events are to be dispatched
			fireGlobals,
			// Loop variable
			i,
			// Create the final options object
			s = jQuery.ajaxSetup( {}, options ),
			// Callbacks context
			callbackContext = s.context || s,
			// Context for global events is callbackContext if it is a DOM node or jQuery collection
			globalEventContext = s.context && ( callbackContext.nodeType || callbackContext.jquery ) ?
				jQuery( callbackContext ) :
				jQuery.event,
			// Deferreds
			deferred = jQuery.Deferred(),
			completeDeferred = jQuery.Callbacks("once memory"),
			// Status-dependent callbacks
			statusCode = s.statusCode || {},
			// Headers (they are sent all at once)
			requestHeaders = {},
			requestHeadersNames = {},
			// The jqXHR state
			state = 0,
			// Default abort message
			strAbort = "canceled",
			// Fake xhr
			jqXHR = {
				readyState: 0,

				// Builds headers hashtable if needed
				getResponseHeader: function( key ) {
					var match;
					if ( state === 2 ) {
						if ( !responseHeaders ) {
							responseHeaders = {};
							while ( (match = rheaders.exec( responseHeadersString )) ) {
								responseHeaders[ match[1].toLowerCase() ] = match[ 2 ];
							}
						}
						match = responseHeaders[ key.toLowerCase() ];
					}
					return match == null ? null : match;
				},

				// Raw string
				getAllResponseHeaders: function() {
					return state === 2 ? responseHeadersString : null;
				},

				// Caches the header
				setRequestHeader: function( name, value ) {
					var lname = name.toLowerCase();
					if ( !state ) {
						name = requestHeadersNames[ lname ] = requestHeadersNames[ lname ] || name;
						requestHeaders[ name ] = value;
					}
					return this;
				},

				// Overrides response content-type header
				overrideMimeType: function( type ) {
					if ( !state ) {
						s.mimeType = type;
					}
					return this;
				},

				// Status-dependent callbacks
				statusCode: function( map ) {
					var code;
					if ( map ) {
						if ( state < 2 ) {
							for ( code in map ) {
								// Lazy-add the new callback in a way that preserves old ones
								statusCode[ code ] = [ statusCode[ code ], map[ code ] ];
							}
						} else {
							// Execute the appropriate callbacks
							jqXHR.always( map[ jqXHR.status ] );
						}
					}
					return this;
				},

				// Cancel the request
				abort: function( statusText ) {
					var finalText = statusText || strAbort;
					if ( transport ) {
						transport.abort( finalText );
					}
					done( 0, finalText );
					return this;
				}
			};

		// Attach deferreds
		deferred.promise( jqXHR ).complete = completeDeferred.add;
		jqXHR.success = jqXHR.done;
		jqXHR.error = jqXHR.fail;

		// Remove hash character (#7531: and string promotion)
		// Add protocol if not provided (prefilters might expect it)
		// Handle falsy url in the settings object (#10093: consistency with old signature)
		// We also use the url parameter if available
		s.url = ( ( url || s.url || ajaxLocation ) + "" ).replace( rhash, "" )
			.replace( rprotocol, ajaxLocParts[ 1 ] + "//" );

		// Alias method option to type as per ticket #12004
		s.type = options.method || options.type || s.method || s.type;

		// Extract dataTypes list
		s.dataTypes = jQuery.trim( s.dataType || "*" ).toLowerCase().match( rnotwhite ) || [ "" ];

		// A cross-domain request is in order when we have a protocol:host:port mismatch
		if ( s.crossDomain == null ) {
			parts = rurl.exec( s.url.toLowerCase() );
			s.crossDomain = !!( parts &&
				( parts[ 1 ] !== ajaxLocParts[ 1 ] || parts[ 2 ] !== ajaxLocParts[ 2 ] ||
					( parts[ 3 ] || ( parts[ 1 ] === "http:" ? "80" : "443" ) ) !==
						( ajaxLocParts[ 3 ] || ( ajaxLocParts[ 1 ] === "http:" ? "80" : "443" ) ) )
			);
		}

		// Convert data if not already a string
		if ( s.data && s.processData && typeof s.data !== "string" ) {
			s.data = jQuery.param( s.data, s.traditional );
		}

		// Apply prefilters
		inspectPrefiltersOrTransports( prefilters, s, options, jqXHR );

		// If request was aborted inside a prefilter, stop there
		if ( state === 2 ) {
			return jqXHR;
		}

		// We can fire global events as of now if asked to
		// Don't fire events if jQuery.event is undefined in an AMD-usage scenario (#15118)
		fireGlobals = jQuery.event && s.global;

		// Watch for a new set of requests
		if ( fireGlobals && jQuery.active++ === 0 ) {
			jQuery.event.trigger("ajaxStart");
		}

		// Uppercase the type
		s.type = s.type.toUpperCase();

		// Determine if request has content
		s.hasContent = !rnoContent.test( s.type );

		// Save the URL in case we're toying with the If-Modified-Since
		// and/or If-None-Match header later on
		cacheURL = s.url;

		// More options handling for requests with no content
		if ( !s.hasContent ) {

			// If data is available, append data to url
			if ( s.data ) {
				cacheURL = ( s.url += ( rquery.test( cacheURL ) ? "&" : "?" ) + s.data );
				// #9682: remove data so that it's not used in an eventual retry
				delete s.data;
			}

			// Add anti-cache in url if needed
			if ( s.cache === false ) {
				s.url = rts.test( cacheURL ) ?

					// If there is already a '_' parameter, set its value
					cacheURL.replace( rts, "$1_=" + nonce++ ) :

					// Otherwise add one to the end
					cacheURL + ( rquery.test( cacheURL ) ? "&" : "?" ) + "_=" + nonce++;
			}
		}

		// Set the If-Modified-Since and/or If-None-Match header, if in ifModified mode.
		if ( s.ifModified ) {
			if ( jQuery.lastModified[ cacheURL ] ) {
				jqXHR.setRequestHeader( "If-Modified-Since", jQuery.lastModified[ cacheURL ] );
			}
			if ( jQuery.etag[ cacheURL ] ) {
				jqXHR.setRequestHeader( "If-None-Match", jQuery.etag[ cacheURL ] );
			}
		}

		// Set the correct header, if data is being sent
		if ( s.data && s.hasContent && s.contentType !== false || options.contentType ) {
			jqXHR.setRequestHeader( "Content-Type", s.contentType );
		}

		// Set the Accepts header for the server, depending on the dataType
		jqXHR.setRequestHeader(
			"Accept",
			s.dataTypes[ 0 ] && s.accepts[ s.dataTypes[0] ] ?
				s.accepts[ s.dataTypes[0] ] + ( s.dataTypes[ 0 ] !== "*" ? ", " + allTypes + "; q=0.01" : "" ) :
				s.accepts[ "*" ]
		);

		// Check for headers option
		for ( i in s.headers ) {
			jqXHR.setRequestHeader( i, s.headers[ i ] );
		}

		// Allow custom headers/mimetypes and early abort
		if ( s.beforeSend && ( s.beforeSend.call( callbackContext, jqXHR, s ) === false || state === 2 ) ) {
			// Abort if not done already and return
			return jqXHR.abort();
		}

		// Aborting is no longer a cancellation
		strAbort = "abort";

		// Install callbacks on deferreds
		for ( i in { success: 1, error: 1, complete: 1 } ) {
			jqXHR[ i ]( s[ i ] );
		}

		// Get transport
		transport = inspectPrefiltersOrTransports( transports, s, options, jqXHR );

		// If no transport, we auto-abort
		if ( !transport ) {
			done( -1, "No Transport" );
		} else {
			jqXHR.readyState = 1;

			// Send global event
			if ( fireGlobals ) {
				globalEventContext.trigger( "ajaxSend", [ jqXHR, s ] );
			}
			// Timeout
			if ( s.async && s.timeout > 0 ) {
				timeoutTimer = setTimeout(function() {
					jqXHR.abort("timeout");
				}, s.timeout );
			}

			try {
				state = 1;
				transport.send( requestHeaders, done );
			} catch ( e ) {
				// Propagate exception as error if not done
				if ( state < 2 ) {
					done( -1, e );
				// Simply rethrow otherwise
				} else {
					throw e;
				}
			}
		}

		// Callback for when everything is done
		function done( status, nativeStatusText, responses, headers ) {
			var isSuccess, success, error, response, modified,
				statusText = nativeStatusText;

			// Called once
			if ( state === 2 ) {
				return;
			}

			// State is "done" now
			state = 2;

			// Clear timeout if it exists
			if ( timeoutTimer ) {
				clearTimeout( timeoutTimer );
			}

			// Dereference transport for early garbage collection
			// (no matter how long the jqXHR object will be used)
			transport = undefined;

			// Cache response headers
			responseHeadersString = headers || "";

			// Set readyState
			jqXHR.readyState = status > 0 ? 4 : 0;

			// Determine if successful
			isSuccess = status >= 200 && status < 300 || status === 304;

			// Get response data
			if ( responses ) {
				response = ajaxHandleResponses( s, jqXHR, responses );
			}

			// Convert no matter what (that way responseXXX fields are always set)
			response = ajaxConvert( s, response, jqXHR, isSuccess );

			// If successful, handle type chaining
			if ( isSuccess ) {

				// Set the If-Modified-Since and/or If-None-Match header, if in ifModified mode.
				if ( s.ifModified ) {
					modified = jqXHR.getResponseHeader("Last-Modified");
					if ( modified ) {
						jQuery.lastModified[ cacheURL ] = modified;
					}
					modified = jqXHR.getResponseHeader("etag");
					if ( modified ) {
						jQuery.etag[ cacheURL ] = modified;
					}
				}

				// if no content
				if ( status === 204 || s.type === "HEAD" ) {
					statusText = "nocontent";

				// if not modified
				} else if ( status === 304 ) {
					statusText = "notmodified";

				// If we have data, let's convert it
				} else {
					statusText = response.state;
					success = response.data;
					error = response.error;
					isSuccess = !error;
				}
			} else {
				// Extract error from statusText and normalize for non-aborts
				error = statusText;
				if ( status || !statusText ) {
					statusText = "error";
					if ( status < 0 ) {
						status = 0;
					}
				}
			}

			// Set data for the fake xhr object
			jqXHR.status = status;
			jqXHR.statusText = ( nativeStatusText || statusText ) + "";

			// Success/Error
			if ( isSuccess ) {
				deferred.resolveWith( callbackContext, [ success, statusText, jqXHR ] );
			} else {
				deferred.rejectWith( callbackContext, [ jqXHR, statusText, error ] );
			}

			// Status-dependent callbacks
			jqXHR.statusCode( statusCode );
			statusCode = undefined;

			if ( fireGlobals ) {
				globalEventContext.trigger( isSuccess ? "ajaxSuccess" : "ajaxError",
					[ jqXHR, s, isSuccess ? success : error ] );
			}

			// Complete
			completeDeferred.fireWith( callbackContext, [ jqXHR, statusText ] );

			if ( fireGlobals ) {
				globalEventContext.trigger( "ajaxComplete", [ jqXHR, s ] );
				// Handle the global AJAX counter
				if ( !( --jQuery.active ) ) {
					jQuery.event.trigger("ajaxStop");
				}
			}
		}

		return jqXHR;
	},

	getJSON: function( url, data, callback ) {
		return jQuery.get( url, data, callback, "json" );
	},

	getScript: function( url, callback ) {
		return jQuery.get( url, undefined, callback, "script" );
	}
});

jQuery.each( [ "get", "post" ], function( i, method ) {
	jQuery[ method ] = function( url, data, callback, type ) {
		// Shift arguments if data argument was omitted
		if ( jQuery.isFunction( data ) ) {
			type = type || callback;
			callback = data;
			data = undefined;
		}

		return jQuery.ajax({
			url: url,
			type: method,
			dataType: type,
			data: data,
			success: callback
		});
	};
});


jQuery._evalUrl = function( url ) {
	return jQuery.ajax({
		url: url,
		type: "GET",
		dataType: "script",
		async: false,
		global: false,
		"throws": true
	});
};


jQuery.fn.extend({
	wrapAll: function( html ) {
		var wrap;

		if ( jQuery.isFunction( html ) ) {
			return this.each(function( i ) {
				jQuery( this ).wrapAll( html.call(this, i) );
			});
		}

		if ( this[ 0 ] ) {

			// The elements to wrap the target around
			wrap = jQuery( html, this[ 0 ].ownerDocument ).eq( 0 ).clone( true );

			if ( this[ 0 ].parentNode ) {
				wrap.insertBefore( this[ 0 ] );
			}

			wrap.map(function() {
				var elem = this;

				while ( elem.firstElementChild ) {
					elem = elem.firstElementChild;
				}

				return elem;
			}).append( this );
		}

		return this;
	},

	wrapInner: function( html ) {
		if ( jQuery.isFunction( html ) ) {
			return this.each(function( i ) {
				jQuery( this ).wrapInner( html.call(this, i) );
			});
		}

		return this.each(function() {
			var self = jQuery( this ),
				contents = self.contents();

			if ( contents.length ) {
				contents.wrapAll( html );

			} else {
				self.append( html );
			}
		});
	},

	wrap: function( html ) {
		var isFunction = jQuery.isFunction( html );

		return this.each(function( i ) {
			jQuery( this ).wrapAll( isFunction ? html.call(this, i) : html );
		});
	},

	unwrap: function() {
		return this.parent().each(function() {
			if ( !jQuery.nodeName( this, "body" ) ) {
				jQuery( this ).replaceWith( this.childNodes );
			}
		}).end();
	}
});


jQuery.expr.filters.hidden = function( elem ) {
	// Support: Opera <= 12.12
	// Opera reports offsetWidths and offsetHeights less than zero on some elements
	return elem.offsetWidth <= 0 && elem.offsetHeight <= 0;
};
jQuery.expr.filters.visible = function( elem ) {
	return !jQuery.expr.filters.hidden( elem );
};




var r20 = /%20/g,
	rbracket = /\[\]$/,
	rCRLF = /\r?\n/g,
	rsubmitterTypes = /^(?:submit|button|image|reset|file)$/i,
	rsubmittable = /^(?:input|select|textarea|keygen)/i;

function buildParams( prefix, obj, traditional, add ) {
	var name;

	if ( jQuery.isArray( obj ) ) {
		// Serialize array item.
		jQuery.each( obj, function( i, v ) {
			if ( traditional || rbracket.test( prefix ) ) {
				// Treat each array item as a scalar.
				add( prefix, v );

			} else {
				// Item is non-scalar (array or object), encode its numeric index.
				buildParams( prefix + "[" + ( typeof v === "object" ? i : "" ) + "]", v, traditional, add );
			}
		});

	} else if ( !traditional && jQuery.type( obj ) === "object" ) {
		// Serialize object item.
		for ( name in obj ) {
			buildParams( prefix + "[" + name + "]", obj[ name ], traditional, add );
		}

	} else {
		// Serialize scalar item.
		add( prefix, obj );
	}
}

// Serialize an array of form elements or a set of
// key/values into a query string
jQuery.param = function( a, traditional ) {
	var prefix,
		s = [],
		add = function( key, value ) {
			// If value is a function, invoke it and return its value
			value = jQuery.isFunction( value ) ? value() : ( value == null ? "" : value );
			s[ s.length ] = encodeURIComponent( key ) + "=" + encodeURIComponent( value );
		};

	// Set traditional to true for jQuery <= 1.3.2 behavior.
	if ( traditional === undefined ) {
		traditional = jQuery.ajaxSettings && jQuery.ajaxSettings.traditional;
	}

	// If an array was passed in, assume that it is an array of form elements.
	if ( jQuery.isArray( a ) || ( a.jquery && !jQuery.isPlainObject( a ) ) ) {
		// Serialize the form elements
		jQuery.each( a, function() {
			add( this.name, this.value );
		});

	} else {
		// If traditional, encode the "old" way (the way 1.3.2 or older
		// did it), otherwise encode params recursively.
		for ( prefix in a ) {
			buildParams( prefix, a[ prefix ], traditional, add );
		}
	}

	// Return the resulting serialization
	return s.join( "&" ).replace( r20, "+" );
};

jQuery.fn.extend({
	serialize: function() {
		return jQuery.param( this.serializeArray() );
	},
	serializeArray: function() {
		return this.map(function() {
			// Can add propHook for "elements" to filter or add form elements
			var elements = jQuery.prop( this, "elements" );
			return elements ? jQuery.makeArray( elements ) : this;
		})
		.filter(function() {
			var type = this.type;

			// Use .is( ":disabled" ) so that fieldset[disabled] works
			return this.name && !jQuery( this ).is( ":disabled" ) &&
				rsubmittable.test( this.nodeName ) && !rsubmitterTypes.test( type ) &&
				( this.checked || !rcheckableType.test( type ) );
		})
		.map(function( i, elem ) {
			var val = jQuery( this ).val();

			return val == null ?
				null :
				jQuery.isArray( val ) ?
					jQuery.map( val, function( val ) {
						return { name: elem.name, value: val.replace( rCRLF, "\r\n" ) };
					}) :
					{ name: elem.name, value: val.replace( rCRLF, "\r\n" ) };
		}).get();
	}
});


jQuery.ajaxSettings.xhr = function() {
	try {
		return new XMLHttpRequest();
	} catch( e ) {}
};

var xhrId = 0,
	xhrCallbacks = {},
	xhrSuccessStatus = {
		// file protocol always yields status code 0, assume 200
		0: 200,
		// Support: IE9
		// #1450: sometimes IE returns 1223 when it should be 204
		1223: 204
	},
	xhrSupported = jQuery.ajaxSettings.xhr();

// Support: IE9
// Open requests must be manually aborted on unload (#5280)
// See https://support.microsoft.com/kb/2856746 for more info
if ( window.attachEvent ) {
	window.attachEvent( "onunload", function() {
		for ( var key in xhrCallbacks ) {
			xhrCallbacks[ key ]();
		}
	});
}

support.cors = !!xhrSupported && ( "withCredentials" in xhrSupported );
support.ajax = xhrSupported = !!xhrSupported;

jQuery.ajaxTransport(function( options ) {
	var callback;

	// Cross domain only allowed if supported through XMLHttpRequest
	if ( support.cors || xhrSupported && !options.crossDomain ) {
		return {
			send: function( headers, complete ) {
				var i,
					xhr = options.xhr(),
					id = ++xhrId;

				xhr.open( options.type, options.url, options.async, options.username, options.password );

				// Apply custom fields if provided
				if ( options.xhrFields ) {
					for ( i in options.xhrFields ) {
						xhr[ i ] = options.xhrFields[ i ];
					}
				}

				// Override mime type if needed
				if ( options.mimeType && xhr.overrideMimeType ) {
					xhr.overrideMimeType( options.mimeType );
				}

				// X-Requested-With header
				// For cross-domain requests, seeing as conditions for a preflight are
				// akin to a jigsaw puzzle, we simply never set it to be sure.
				// (it can always be set on a per-request basis or even using ajaxSetup)
				// For same-domain requests, won't change header if already provided.
				if ( !options.crossDomain && !headers["X-Requested-With"] ) {
					headers["X-Requested-With"] = "XMLHttpRequest";
				}

				// Set headers
				for ( i in headers ) {
					xhr.setRequestHeader( i, headers[ i ] );
				}

				// Callback
				callback = function( type ) {
					return function() {
						if ( callback ) {
							delete xhrCallbacks[ id ];
							callback = xhr.onload = xhr.onerror = null;

							if ( type === "abort" ) {
								xhr.abort();
							} else if ( type === "error" ) {
								complete(
									// file: protocol always yields status 0; see #8605, #14207
									xhr.status,
									xhr.statusText
								);
							} else {
								complete(
									xhrSuccessStatus[ xhr.status ] || xhr.status,
									xhr.statusText,
									// Support: IE9
									// Accessing binary-data responseText throws an exception
									// (#11426)
									typeof xhr.responseText === "string" ? {
										text: xhr.responseText
									} : undefined,
									xhr.getAllResponseHeaders()
								);
							}
						}
					};
				};

				// Listen to events
				xhr.onload = callback();
				xhr.onerror = callback("error");

				// Create the abort callback
				callback = xhrCallbacks[ id ] = callback("abort");

				try {
					// Do send the request (this may raise an exception)
					xhr.send( options.hasContent && options.data || null );
				} catch ( e ) {
					// #14683: Only rethrow if this hasn't been notified as an error yet
					if ( callback ) {
						throw e;
					}
				}
			},

			abort: function() {
				if ( callback ) {
					callback();
				}
			}
		};
	}
});




// Install script dataType
jQuery.ajaxSetup({
	accepts: {
		script: "text/javascript, application/javascript, application/ecmascript, application/x-ecmascript"
	},
	contents: {
		script: /(?:java|ecma)script/
	},
	converters: {
		"text script": function( text ) {
			jQuery.globalEval( text );
			return text;
		}
	}
});

// Handle cache's special case and crossDomain
jQuery.ajaxPrefilter( "script", function( s ) {
	if ( s.cache === undefined ) {
		s.cache = false;
	}
	if ( s.crossDomain ) {
		s.type = "GET";
	}
});

// Bind script tag hack transport
jQuery.ajaxTransport( "script", function( s ) {
	// This transport only deals with cross domain requests
	if ( s.crossDomain ) {
		var script, callback;
		return {
			send: function( _, complete ) {
				script = jQuery("<script>").prop({
					async: true,
					charset: s.scriptCharset,
					src: s.url
				}).on(
					"load error",
					callback = function( evt ) {
						script.remove();
						callback = null;
						if ( evt ) {
							complete( evt.type === "error" ? 404 : 200, evt.type );
						}
					}
				);
				document.head.appendChild( script[ 0 ] );
			},
			abort: function() {
				if ( callback ) {
					callback();
				}
			}
		};
	}
});




var oldCallbacks = [],
	rjsonp = /(=)\?(?=&|$)|\?\?/;

// Default jsonp settings
jQuery.ajaxSetup({
	jsonp: "callback",
	jsonpCallback: function() {
		var callback = oldCallbacks.pop() || ( jQuery.expando + "_" + ( nonce++ ) );
		this[ callback ] = true;
		return callback;
	}
});

// Detect, normalize options and install callbacks for jsonp requests
jQuery.ajaxPrefilter( "json jsonp", function( s, originalSettings, jqXHR ) {

	var callbackName, overwritten, responseContainer,
		jsonProp = s.jsonp !== false && ( rjsonp.test( s.url ) ?
			"url" :
			typeof s.data === "string" && !( s.contentType || "" ).indexOf("application/x-www-form-urlencoded") && rjsonp.test( s.data ) && "data"
		);

	// Handle iff the expected data type is "jsonp" or we have a parameter to set
	if ( jsonProp || s.dataTypes[ 0 ] === "jsonp" ) {

		// Get callback name, remembering preexisting value associated with it
		callbackName = s.jsonpCallback = jQuery.isFunction( s.jsonpCallback ) ?
			s.jsonpCallback() :
			s.jsonpCallback;

		// Insert callback into url or form data
		if ( jsonProp ) {
			s[ jsonProp ] = s[ jsonProp ].replace( rjsonp, "$1" + callbackName );
		} else if ( s.jsonp !== false ) {
			s.url += ( rquery.test( s.url ) ? "&" : "?" ) + s.jsonp + "=" + callbackName;
		}

		// Use data converter to retrieve json after script execution
		s.converters["script json"] = function() {
			if ( !responseContainer ) {
				jQuery.error( callbackName + " was not called" );
			}
			return responseContainer[ 0 ];
		};

		// force json dataType
		s.dataTypes[ 0 ] = "json";

		// Install callback
		overwritten = window[ callbackName ];
		window[ callbackName ] = function() {
			responseContainer = arguments;
		};

		// Clean-up function (fires after converters)
		jqXHR.always(function() {
			// Restore preexisting value
			window[ callbackName ] = overwritten;

			// Save back as free
			if ( s[ callbackName ] ) {
				// make sure that re-using the options doesn't screw things around
				s.jsonpCallback = originalSettings.jsonpCallback;

				// save the callback name for future use
				oldCallbacks.push( callbackName );
			}

			// Call if it was a function and we have a response
			if ( responseContainer && jQuery.isFunction( overwritten ) ) {
				overwritten( responseContainer[ 0 ] );
			}

			responseContainer = overwritten = undefined;
		});

		// Delegate to script
		return "script";
	}
});




// data: string of html
// context (optional): If specified, the fragment will be created in this context, defaults to document
// keepScripts (optional): If true, will include scripts passed in the html string
jQuery.parseHTML = function( data, context, keepScripts ) {
	if ( !data || typeof data !== "string" ) {
		return null;
	}
	if ( typeof context === "boolean" ) {
		keepScripts = context;
		context = false;
	}
	context = context || document;

	var parsed = rsingleTag.exec( data ),
		scripts = !keepScripts && [];

	// Single tag
	if ( parsed ) {
		return [ context.createElement( parsed[1] ) ];
	}

	parsed = jQuery.buildFragment( [ data ], context, scripts );

	if ( scripts && scripts.length ) {
		jQuery( scripts ).remove();
	}

	return jQuery.merge( [], parsed.childNodes );
};


// Keep a copy of the old load method
var _load = jQuery.fn.load;

/**
 * Load a url into a page
 */
jQuery.fn.load = function( url, params, callback ) {
	if ( typeof url !== "string" && _load ) {
		return _load.apply( this, arguments );
	}

	var selector, type, response,
		self = this,
		off = url.indexOf(" ");

	if ( off >= 0 ) {
		selector = jQuery.trim( url.slice( off ) );
		url = url.slice( 0, off );
	}

	// If it's a function
	if ( jQuery.isFunction( params ) ) {

		// We assume that it's the callback
		callback = params;
		params = undefined;

	// Otherwise, build a param string
	} else if ( params && typeof params === "object" ) {
		type = "POST";
	}

	// If we have elements to modify, make the request
	if ( self.length > 0 ) {
		jQuery.ajax({
			url: url,

			// if "type" variable is undefined, then "GET" method will be used
			type: type,
			dataType: "html",
			data: params
		}).done(function( responseText ) {

			// Save response for use in complete callback
			response = arguments;

			self.html( selector ?

				// If a selector was specified, locate the right elements in a dummy div
				// Exclude scripts to avoid IE 'Permission Denied' errors
				jQuery("<div>").append( jQuery.parseHTML( responseText ) ).find( selector ) :

				// Otherwise use the full result
				responseText );

		}).complete( callback && function( jqXHR, status ) {
			self.each( callback, response || [ jqXHR.responseText, status, jqXHR ] );
		});
	}

	return this;
};




// Attach a bunch of functions for handling common AJAX events
jQuery.each( [ "ajaxStart", "ajaxStop", "ajaxComplete", "ajaxError", "ajaxSuccess", "ajaxSend" ], function( i, type ) {
	jQuery.fn[ type ] = function( fn ) {
		return this.on( type, fn );
	};
});




jQuery.expr.filters.animated = function( elem ) {
	return jQuery.grep(jQuery.timers, function( fn ) {
		return elem === fn.elem;
	}).length;
};




var docElem = window.document.documentElement;

/**
 * Gets a window from an element
 */
function getWindow( elem ) {
	return jQuery.isWindow( elem ) ? elem : elem.nodeType === 9 && elem.defaultView;
}

jQuery.offset = {
	setOffset: function( elem, options, i ) {
		var curPosition, curLeft, curCSSTop, curTop, curOffset, curCSSLeft, calculatePosition,
			position = jQuery.css( elem, "position" ),
			curElem = jQuery( elem ),
			props = {};

		// Set position first, in-case top/left are set even on static elem
		if ( position === "static" ) {
			elem.style.position = "relative";
		}

		curOffset = curElem.offset();
		curCSSTop = jQuery.css( elem, "top" );
		curCSSLeft = jQuery.css( elem, "left" );
		calculatePosition = ( position === "absolute" || position === "fixed" ) &&
			( curCSSTop + curCSSLeft ).indexOf("auto") > -1;

		// Need to be able to calculate position if either
		// top or left is auto and position is either absolute or fixed
		if ( calculatePosition ) {
			curPosition = curElem.position();
			curTop = curPosition.top;
			curLeft = curPosition.left;

		} else {
			curTop = parseFloat( curCSSTop ) || 0;
			curLeft = parseFloat( curCSSLeft ) || 0;
		}

		if ( jQuery.isFunction( options ) ) {
			options = options.call( elem, i, curOffset );
		}

		if ( options.top != null ) {
			props.top = ( options.top - curOffset.top ) + curTop;
		}
		if ( options.left != null ) {
			props.left = ( options.left - curOffset.left ) + curLeft;
		}

		if ( "using" in options ) {
			options.using.call( elem, props );

		} else {
			curElem.css( props );
		}
	}
};

jQuery.fn.extend({
	offset: function( options ) {
		if ( arguments.length ) {
			return options === undefined ?
				this :
				this.each(function( i ) {
					jQuery.offset.setOffset( this, options, i );
				});
		}

		var docElem, win,
			elem = this[ 0 ],
			box = { top: 0, left: 0 },
			doc = elem && elem.ownerDocument;

		if ( !doc ) {
			return;
		}

		docElem = doc.documentElement;

		// Make sure it's not a disconnected DOM node
		if ( !jQuery.contains( docElem, elem ) ) {
			return box;
		}

		// Support: BlackBerry 5, iOS 3 (original iPhone)
		// If we don't have gBCR, just use 0,0 rather than error
		if ( typeof elem.getBoundingClientRect !== strundefined ) {
			box = elem.getBoundingClientRect();
		}
		win = getWindow( doc );
		return {
			top: box.top + win.pageYOffset - docElem.clientTop,
			left: box.left + win.pageXOffset - docElem.clientLeft
		};
	},

	position: function() {
		if ( !this[ 0 ] ) {
			return;
		}

		var offsetParent, offset,
			elem = this[ 0 ],
			parentOffset = { top: 0, left: 0 };

		// Fixed elements are offset from window (parentOffset = {top:0, left: 0}, because it is its only offset parent
		if ( jQuery.css( elem, "position" ) === "fixed" ) {
			// Assume getBoundingClientRect is there when computed position is fixed
			offset = elem.getBoundingClientRect();

		} else {
			// Get *real* offsetParent
			offsetParent = this.offsetParent();

			// Get correct offsets
			offset = this.offset();
			if ( !jQuery.nodeName( offsetParent[ 0 ], "html" ) ) {
				parentOffset = offsetParent.offset();
			}

			// Add offsetParent borders
			parentOffset.top += jQuery.css( offsetParent[ 0 ], "borderTopWidth", true );
			parentOffset.left += jQuery.css( offsetParent[ 0 ], "borderLeftWidth", true );
		}

		// Subtract parent offsets and element margins
		return {
			top: offset.top - parentOffset.top - jQuery.css( elem, "marginTop", true ),
			left: offset.left - parentOffset.left - jQuery.css( elem, "marginLeft", true )
		};
	},

	offsetParent: function() {
		return this.map(function() {
			var offsetParent = this.offsetParent || docElem;

			while ( offsetParent && ( !jQuery.nodeName( offsetParent, "html" ) && jQuery.css( offsetParent, "position" ) === "static" ) ) {
				offsetParent = offsetParent.offsetParent;
			}

			return offsetParent || docElem;
		});
	}
});

// Create scrollLeft and scrollTop methods
jQuery.each( { scrollLeft: "pageXOffset", scrollTop: "pageYOffset" }, function( method, prop ) {
	var top = "pageYOffset" === prop;

	jQuery.fn[ method ] = function( val ) {
		return access( this, function( elem, method, val ) {
			var win = getWindow( elem );

			if ( val === undefined ) {
				return win ? win[ prop ] : elem[ method ];
			}

			if ( win ) {
				win.scrollTo(
					!top ? val : window.pageXOffset,
					top ? val : window.pageYOffset
				);

			} else {
				elem[ method ] = val;
			}
		}, method, val, arguments.length, null );
	};
});

// Support: Safari<7+, Chrome<37+
// Add the top/left cssHooks using jQuery.fn.position
// Webkit bug: https://bugs.webkit.org/show_bug.cgi?id=29084
// Blink bug: https://code.google.com/p/chromium/issues/detail?id=229280
// getComputedStyle returns percent when specified for top/left/bottom/right;
// rather than make the css module depend on the offset module, just check for it here
jQuery.each( [ "top", "left" ], function( i, prop ) {
	jQuery.cssHooks[ prop ] = addGetHookIf( support.pixelPosition,
		function( elem, computed ) {
			if ( computed ) {
				computed = curCSS( elem, prop );
				// If curCSS returns percentage, fallback to offset
				return rnumnonpx.test( computed ) ?
					jQuery( elem ).position()[ prop ] + "px" :
					computed;
			}
		}
	);
});


// Create innerHeight, innerWidth, height, width, outerHeight and outerWidth methods
jQuery.each( { Height: "height", Width: "width" }, function( name, type ) {
	jQuery.each( { padding: "inner" + name, content: type, "": "outer" + name }, function( defaultExtra, funcName ) {
		// Margin is only for outerHeight, outerWidth
		jQuery.fn[ funcName ] = function( margin, value ) {
			var chainable = arguments.length && ( defaultExtra || typeof margin !== "boolean" ),
				extra = defaultExtra || ( margin === true || value === true ? "margin" : "border" );

			return access( this, function( elem, type, value ) {
				var doc;

				if ( jQuery.isWindow( elem ) ) {
					// As of 5/8/2012 this will yield incorrect results for Mobile Safari, but there
					// isn't a whole lot we can do. See pull request at this URL for discussion:
					// https://github.com/jquery/jquery/pull/764
					return elem.document.documentElement[ "client" + name ];
				}

				// Get document width or height
				if ( elem.nodeType === 9 ) {
					doc = elem.documentElement;

					// Either scroll[Width/Height] or offset[Width/Height] or client[Width/Height],
					// whichever is greatest
					return Math.max(
						elem.body[ "scroll" + name ], doc[ "scroll" + name ],
						elem.body[ "offset" + name ], doc[ "offset" + name ],
						doc[ "client" + name ]
					);
				}

				return value === undefined ?
					// Get width or height on the element, requesting but not forcing parseFloat
					jQuery.css( elem, type, extra ) :

					// Set width or height on the element
					jQuery.style( elem, type, value, extra );
			}, type, chainable ? margin : undefined, chainable, null );
		};
	});
});


// The number of elements contained in the matched element set
jQuery.fn.size = function() {
	return this.length;
};

jQuery.fn.andSelf = jQuery.fn.addBack;




// Register as a named AMD module, since jQuery can be concatenated with other
// files that may use define, but not via a proper concatenation script that
// understands anonymous AMD modules. A named AMD is safest and most robust
// way to register. Lowercase jquery is used because AMD module names are
// derived from file names, and jQuery is normally delivered in a lowercase
// file name. Do this after creating the global so that if an AMD module wants
// to call noConflict to hide this version of jQuery, it will work.

// Note that for maximum portability, libraries that are not jQuery should
// declare themselves as anonymous modules, and avoid setting a global if an
// AMD loader is present. jQuery is a special case. For more information, see
// https://github.com/jrburke/requirejs/wiki/Updating-existing-libraries#wiki-anon

if ( typeof define === "function" && define.amd ) {
	define( "jquery", [], function() {
		return jQuery;
	});
}




var
	// Map over jQuery in case of overwrite
	_jQuery = window.jQuery,

	// Map over the $ in case of overwrite
	_$ = window.$;

jQuery.noConflict = function( deep ) {
	if ( window.$ === jQuery ) {
		window.$ = _$;
	}

	if ( deep && window.jQuery === jQuery ) {
		window.jQuery = _jQuery;
	}

	return jQuery;
};

// Expose jQuery and $ identifiers, even in AMD
// (#7102#comment:10, https://github.com/jquery/jquery/pull/557)
// and CommonJS for browser emulators (#13566)
if ( typeof noGlobal === strundefined ) {
	window.Alt.jQuery = window.Alt.$ = jQuery;
}




return jQuery;

}));

(function(global) {
  'use strict';
  if (global.$traceurRuntime) {
    return;
  }
  var $Object = Object;
  var $TypeError = TypeError;
  var $create = $Object.create;
  var $defineProperties = $Object.defineProperties;
  var $defineProperty = $Object.defineProperty;
  var $freeze = $Object.freeze;
  var $getOwnPropertyDescriptor = $Object.getOwnPropertyDescriptor;
  var $getOwnPropertyNames = $Object.getOwnPropertyNames;
  var $keys = $Object.keys;
  var $hasOwnProperty = $Object.prototype.hasOwnProperty;
  var $toString = $Object.prototype.toString;
  var $preventExtensions = Object.preventExtensions;
  var $seal = Object.seal;
  var $isExtensible = Object.isExtensible;
  function nonEnum(value) {
    return {
      configurable: true,
      enumerable: false,
      value: value,
      writable: true
    };
  }
  var types = {
    void: function voidType() {},
    any: function any() {},
    string: function string() {},
    number: function number() {},
    boolean: function boolean() {}
  };
  var method = nonEnum;
  var counter = 0;
  function newUniqueString() {
    return '__$' + Math.floor(Math.random() * 1e9) + '$' + ++counter + '$__';
  }
  var symbolInternalProperty = newUniqueString();
  var symbolDescriptionProperty = newUniqueString();
  var symbolDataProperty = newUniqueString();
  var symbolValues = $create(null);
  var privateNames = $create(null);
  function createPrivateName() {
    var s = newUniqueString();
    privateNames[s] = true;
    return s;
  }
  function isSymbol(symbol) {
    return typeof symbol === 'object' && symbol instanceof SymbolValue;
  }
  function typeOf(v) {
    if (isSymbol(v))
      return 'symbol';
    return typeof v;
  }
  function Symbol(description) {
    var value = new SymbolValue(description);
    if (!(this instanceof Symbol))
      return value;
    throw new TypeError('Symbol cannot be new\'ed');
  }
  $defineProperty(Symbol.prototype, 'constructor', nonEnum(Symbol));
  $defineProperty(Symbol.prototype, 'toString', method(function() {
    var symbolValue = this[symbolDataProperty];
    if (!getOption('symbols'))
      return symbolValue[symbolInternalProperty];
    if (!symbolValue)
      throw TypeError('Conversion from symbol to string');
    var desc = symbolValue[symbolDescriptionProperty];
    if (desc === undefined)
      desc = '';
    return 'Symbol(' + desc + ')';
  }));
  $defineProperty(Symbol.prototype, 'valueOf', method(function() {
    var symbolValue = this[symbolDataProperty];
    if (!symbolValue)
      throw TypeError('Conversion from symbol to string');
    if (!getOption('symbols'))
      return symbolValue[symbolInternalProperty];
    return symbolValue;
  }));
  function SymbolValue(description) {
    var key = newUniqueString();
    $defineProperty(this, symbolDataProperty, {value: this});
    $defineProperty(this, symbolInternalProperty, {value: key});
    $defineProperty(this, symbolDescriptionProperty, {value: description});
    freeze(this);
    symbolValues[key] = this;
  }
  $defineProperty(SymbolValue.prototype, 'constructor', nonEnum(Symbol));
  $defineProperty(SymbolValue.prototype, 'toString', {
    value: Symbol.prototype.toString,
    enumerable: false
  });
  $defineProperty(SymbolValue.prototype, 'valueOf', {
    value: Symbol.prototype.valueOf,
    enumerable: false
  });
  var hashProperty = createPrivateName();
  var hashPropertyDescriptor = {value: undefined};
  var hashObjectProperties = {
    hash: {value: undefined},
    self: {value: undefined}
  };
  var hashCounter = 0;
  function getOwnHashObject(object) {
    var hashObject = object[hashProperty];
    if (hashObject && hashObject.self === object)
      return hashObject;
    if ($isExtensible(object)) {
      hashObjectProperties.hash.value = hashCounter++;
      hashObjectProperties.self.value = object;
      hashPropertyDescriptor.value = $create(null, hashObjectProperties);
      $defineProperty(object, hashProperty, hashPropertyDescriptor);
      return hashPropertyDescriptor.value;
    }
    return undefined;
  }
  function freeze(object) {
    getOwnHashObject(object);
    return $freeze.apply(this, arguments);
  }
  function preventExtensions(object) {
    getOwnHashObject(object);
    return $preventExtensions.apply(this, arguments);
  }
  function seal(object) {
    getOwnHashObject(object);
    return $seal.apply(this, arguments);
  }
  Symbol.iterator = Symbol();
  freeze(SymbolValue.prototype);
  function toProperty(name) {
    if (isSymbol(name))
      return name[symbolInternalProperty];
    return name;
  }
  function getOwnPropertyNames(object) {
    var rv = [];
    var names = $getOwnPropertyNames(object);
    for (var i = 0; i < names.length; i++) {
      var name = names[i];
      if (!symbolValues[name] && !privateNames[name])
        rv.push(name);
    }
    return rv;
  }
  function getOwnPropertyDescriptor(object, name) {
    return $getOwnPropertyDescriptor(object, toProperty(name));
  }
  function getOwnPropertySymbols(object) {
    var rv = [];
    var names = $getOwnPropertyNames(object);
    for (var i = 0; i < names.length; i++) {
      var symbol = symbolValues[names[i]];
      if (symbol)
        rv.push(symbol);
    }
    return rv;
  }
  function hasOwnProperty(name) {
    return $hasOwnProperty.call(this, toProperty(name));
  }
  function getOption(name) {
    return global.traceur && global.traceur.options[name];
  }
  function setProperty(object, name, value) {
    var sym,
        desc;
    if (isSymbol(name)) {
      sym = name;
      name = name[symbolInternalProperty];
    }
    object[name] = value;
    if (sym && (desc = $getOwnPropertyDescriptor(object, name)))
      $defineProperty(object, name, {enumerable: false});
    return value;
  }
  function defineProperty(object, name, descriptor) {
    if (isSymbol(name)) {
      if (descriptor.enumerable) {
        descriptor = $create(descriptor, {enumerable: {value: false}});
      }
      name = name[symbolInternalProperty];
    }
    $defineProperty(object, name, descriptor);
    return object;
  }
  function polyfillObject(Object) {
    $defineProperty(Object, 'defineProperty', {value: defineProperty});
    $defineProperty(Object, 'getOwnPropertyNames', {value: getOwnPropertyNames});
    $defineProperty(Object, 'getOwnPropertyDescriptor', {value: getOwnPropertyDescriptor});
    $defineProperty(Object.prototype, 'hasOwnProperty', {value: hasOwnProperty});
    $defineProperty(Object, 'freeze', {value: freeze});
    $defineProperty(Object, 'preventExtensions', {value: preventExtensions});
    $defineProperty(Object, 'seal', {value: seal});
    Object.getOwnPropertySymbols = getOwnPropertySymbols;
  }
  function exportStar(object) {
    for (var i = 1; i < arguments.length; i++) {
      var names = $getOwnPropertyNames(arguments[i]);
      for (var j = 0; j < names.length; j++) {
        var name = names[j];
        if (privateNames[name])
          continue;
        (function(mod, name) {
          $defineProperty(object, name, {
            get: function() {
              return mod[name];
            },
            enumerable: true
          });
        })(arguments[i], names[j]);
      }
    }
    return object;
  }
  function isObject(x) {
    return x != null && (typeof x === 'object' || typeof x === 'function');
  }
  function toObject(x) {
    if (x == null)
      throw $TypeError();
    return $Object(x);
  }
  function assertObject(x) {
    if (!isObject(x))
      throw $TypeError(x + ' is not an Object');
    return x;
  }
  function setupGlobals(global) {
    global.Symbol = Symbol;
    global.Reflect = global.Reflect || {};
    global.Reflect.global = global.Reflect.global || global;
    polyfillObject(global.Object);
  }
  setupGlobals(global);
  global.$traceurRuntime = {
    assertObject: assertObject,
    createPrivateName: createPrivateName,
    exportStar: exportStar,
    getOwnHashObject: getOwnHashObject,
    privateNames: privateNames,
    setProperty: setProperty,
    setupGlobals: setupGlobals,
    toObject: toObject,
    isObject: isObject,
    toProperty: toProperty,
    type: types,
    typeof: typeOf,
    defineProperties: $defineProperties,
    defineProperty: $defineProperty,
    getOwnPropertyDescriptor: $getOwnPropertyDescriptor,
    getOwnPropertyNames: $getOwnPropertyNames,
    keys: $keys
  };
})(typeof global !== 'undefined' ? global : this);
(function() {
  'use strict';
  function spread() {
    var rv = [],
        j = 0,
        iterResult;
    for (var i = 0; i < arguments.length; i++) {
      var valueToSpread = arguments[i];
      if (!$traceurRuntime.isObject(valueToSpread)) {
        throw new TypeError('Cannot spread non-object.');
      }
      if (typeof valueToSpread[$traceurRuntime.toProperty(Symbol.iterator)] !== 'function') {
        throw new TypeError('Cannot spread non-iterable object.');
      }
      var iter = valueToSpread[$traceurRuntime.toProperty(Symbol.iterator)]();
      while (!(iterResult = iter.next()).done) {
        rv[j++] = iterResult.value;
      }
    }
    return rv;
  }
  $traceurRuntime.spread = spread;
})();
(function() {
  'use strict';
  var $Object = Object;
  var $TypeError = TypeError;
  var $create = $Object.create;
  var $defineProperties = $traceurRuntime.defineProperties;
  var $defineProperty = $traceurRuntime.defineProperty;
  var $getOwnPropertyDescriptor = $traceurRuntime.getOwnPropertyDescriptor;
  var $getOwnPropertyNames = $traceurRuntime.getOwnPropertyNames;
  var $getPrototypeOf = Object.getPrototypeOf;
  function superDescriptor(homeObject, name) {
    var proto = $getPrototypeOf(homeObject);
    do {
      var result = $getOwnPropertyDescriptor(proto, name);
      if (result)
        return result;
      proto = $getPrototypeOf(proto);
    } while (proto);
    return undefined;
  }
  function superCall(self, homeObject, name, args) {
    return superGet(self, homeObject, name).apply(self, args);
  }
  function superGet(self, homeObject, name) {
    var descriptor = superDescriptor(homeObject, name);
    if (descriptor) {
      if (!descriptor.get)
        return descriptor.value;
      return descriptor.get.call(self);
    }
    return undefined;
  }
  function superSet(self, homeObject, name, value) {
    var descriptor = superDescriptor(homeObject, name);
    if (descriptor && descriptor.set) {
      descriptor.set.call(self, value);
      return value;
    }
    throw $TypeError("super has no setter '" + name + "'.");
  }
  function getDescriptors(object) {
    var descriptors = {},
        name,
        names = $getOwnPropertyNames(object);
    for (var i = 0; i < names.length; i++) {
      var name = names[i];
      descriptors[name] = $getOwnPropertyDescriptor(object, name);
    }
    return descriptors;
  }
  function createClass(ctor, object, staticObject, superClass) {
    $defineProperty(object, 'constructor', {
      value: ctor,
      configurable: true,
      enumerable: false,
      writable: true
    });
    if (arguments.length > 3) {
      if (typeof superClass === 'function')
        ctor.__proto__ = superClass;
      ctor.prototype = $create(getProtoParent(superClass), getDescriptors(object));
    } else {
      ctor.prototype = object;
    }
    $defineProperty(ctor, 'prototype', {
      configurable: false,
      writable: false
    });
    return $defineProperties(ctor, getDescriptors(staticObject));
  }
  function getProtoParent(superClass) {
    if (typeof superClass === 'function') {
      var prototype = superClass.prototype;
      if ($Object(prototype) === prototype || prototype === null)
        return superClass.prototype;
      throw new $TypeError('super prototype must be an Object or null');
    }
    if (superClass === null)
      return null;
    throw new $TypeError('Super expression must either be null or a function');
  }
  function defaultSuperCall(self, homeObject, args) {
    if ($getPrototypeOf(homeObject) !== null)
      superCall(self, homeObject, 'constructor', args);
  }
  $traceurRuntime.createClass = createClass;
  $traceurRuntime.defaultSuperCall = defaultSuperCall;
  $traceurRuntime.superCall = superCall;
  $traceurRuntime.superGet = superGet;
  $traceurRuntime.superSet = superSet;
})();
(function() {
  'use strict';
  var createPrivateName = $traceurRuntime.createPrivateName;
  var $defineProperties = $traceurRuntime.defineProperties;
  var $defineProperty = $traceurRuntime.defineProperty;
  var $create = Object.create;
  var $TypeError = TypeError;
  function nonEnum(value) {
    return {
      configurable: true,
      enumerable: false,
      value: value,
      writable: true
    };
  }
  var ST_NEWBORN = 0;
  var ST_EXECUTING = 1;
  var ST_SUSPENDED = 2;
  var ST_CLOSED = 3;
  var END_STATE = -2;
  var RETHROW_STATE = -3;
  function getInternalError(state) {
    return new Error('Traceur compiler bug: invalid state in state machine: ' + state);
  }
  function GeneratorContext() {
    this.state = 0;
    this.GState = ST_NEWBORN;
    this.storedException = undefined;
    this.finallyFallThrough = undefined;
    this.sent_ = undefined;
    this.returnValue = undefined;
    this.tryStack_ = [];
  }
  GeneratorContext.prototype = {
    pushTry: function(catchState, finallyState) {
      if (finallyState !== null) {
        var finallyFallThrough = null;
        for (var i = this.tryStack_.length - 1; i >= 0; i--) {
          if (this.tryStack_[i].catch !== undefined) {
            finallyFallThrough = this.tryStack_[i].catch;
            break;
          }
        }
        if (finallyFallThrough === null)
          finallyFallThrough = RETHROW_STATE;
        this.tryStack_.push({
          finally: finallyState,
          finallyFallThrough: finallyFallThrough
        });
      }
      if (catchState !== null) {
        this.tryStack_.push({catch: catchState});
      }
    },
    popTry: function() {
      this.tryStack_.pop();
    },
    get sent() {
      this.maybeThrow();
      return this.sent_;
    },
    set sent(v) {
      this.sent_ = v;
    },
    get sentIgnoreThrow() {
      return this.sent_;
    },
    maybeThrow: function() {
      if (this.action === 'throw') {
        this.action = 'next';
        throw this.sent_;
      }
    },
    end: function() {
      switch (this.state) {
        case END_STATE:
          return this;
        case RETHROW_STATE:
          throw this.storedException;
        default:
          throw getInternalError(this.state);
      }
    },
    handleException: function(ex) {
      this.GState = ST_CLOSED;
      this.state = END_STATE;
      throw ex;
    }
  };
  function nextOrThrow(ctx, moveNext, action, x) {
    switch (ctx.GState) {
      case ST_EXECUTING:
        throw new Error(("\"" + action + "\" on executing generator"));
      case ST_CLOSED:
        if (action == 'next') {
          return {
            value: undefined,
            done: true
          };
        }
        throw x;
      case ST_NEWBORN:
        if (action === 'throw') {
          ctx.GState = ST_CLOSED;
          throw x;
        }
        if (x !== undefined)
          throw $TypeError('Sent value to newborn generator');
      case ST_SUSPENDED:
        ctx.GState = ST_EXECUTING;
        ctx.action = action;
        ctx.sent = x;
        var value = moveNext(ctx);
        var done = value === ctx;
        if (done)
          value = ctx.returnValue;
        ctx.GState = done ? ST_CLOSED : ST_SUSPENDED;
        return {
          value: value,
          done: done
        };
    }
  }
  var ctxName = createPrivateName();
  var moveNextName = createPrivateName();
  function GeneratorFunction() {}
  function GeneratorFunctionPrototype() {}
  GeneratorFunction.prototype = GeneratorFunctionPrototype;
  $defineProperty(GeneratorFunctionPrototype, 'constructor', nonEnum(GeneratorFunction));
  GeneratorFunctionPrototype.prototype = {
    constructor: GeneratorFunctionPrototype,
    next: function(v) {
      return nextOrThrow(this[ctxName], this[moveNextName], 'next', v);
    },
    throw: function(v) {
      return nextOrThrow(this[ctxName], this[moveNextName], 'throw', v);
    }
  };
  $defineProperties(GeneratorFunctionPrototype.prototype, {
    constructor: {enumerable: false},
    next: {enumerable: false},
    throw: {enumerable: false}
  });
  Object.defineProperty(GeneratorFunctionPrototype.prototype, Symbol.iterator, nonEnum(function() {
    return this;
  }));
  function createGeneratorInstance(innerFunction, functionObject, self) {
    var moveNext = getMoveNext(innerFunction, self);
    var ctx = new GeneratorContext();
    var object = $create(functionObject.prototype);
    object[ctxName] = ctx;
    object[moveNextName] = moveNext;
    return object;
  }
  function initGeneratorFunction(functionObject) {
    functionObject.prototype = $create(GeneratorFunctionPrototype.prototype);
    functionObject.__proto__ = GeneratorFunctionPrototype;
    return functionObject;
  }
  function AsyncFunctionContext() {
    GeneratorContext.call(this);
    this.err = undefined;
    var ctx = this;
    ctx.result = new Promise(function(resolve, reject) {
      ctx.resolve = resolve;
      ctx.reject = reject;
    });
  }
  AsyncFunctionContext.prototype = $create(GeneratorContext.prototype);
  AsyncFunctionContext.prototype.end = function() {
    switch (this.state) {
      case END_STATE:
        this.resolve(this.returnValue);
        break;
      case RETHROW_STATE:
        this.reject(this.storedException);
        break;
      default:
        this.reject(getInternalError(this.state));
    }
  };
  AsyncFunctionContext.prototype.handleException = function() {
    this.state = RETHROW_STATE;
  };
  function asyncWrap(innerFunction, self) {
    var moveNext = getMoveNext(innerFunction, self);
    var ctx = new AsyncFunctionContext();
    ctx.createCallback = function(newState) {
      return function(value) {
        ctx.state = newState;
        ctx.value = value;
        moveNext(ctx);
      };
    };
    ctx.errback = function(err) {
      handleCatch(ctx, err);
      moveNext(ctx);
    };
    moveNext(ctx);
    return ctx.result;
  }
  function getMoveNext(innerFunction, self) {
    return function(ctx) {
      while (true) {
        try {
          return innerFunction.call(self, ctx);
        } catch (ex) {
          handleCatch(ctx, ex);
        }
      }
    };
  }
  function handleCatch(ctx, ex) {
    ctx.storedException = ex;
    var last = ctx.tryStack_[ctx.tryStack_.length - 1];
    if (!last) {
      ctx.handleException(ex);
      return;
    }
    ctx.state = last.catch !== undefined ? last.catch : last.finally;
    if (last.finallyFallThrough !== undefined)
      ctx.finallyFallThrough = last.finallyFallThrough;
  }
  $traceurRuntime.asyncWrap = asyncWrap;
  $traceurRuntime.initGeneratorFunction = initGeneratorFunction;
  $traceurRuntime.createGeneratorInstance = createGeneratorInstance;
})();
(function() {
  function buildFromEncodedParts(opt_scheme, opt_userInfo, opt_domain, opt_port, opt_path, opt_queryData, opt_fragment) {
    var out = [];
    if (opt_scheme) {
      out.push(opt_scheme, ':');
    }
    if (opt_domain) {
      out.push('//');
      if (opt_userInfo) {
        out.push(opt_userInfo, '@');
      }
      out.push(opt_domain);
      if (opt_port) {
        out.push(':', opt_port);
      }
    }
    if (opt_path) {
      out.push(opt_path);
    }
    if (opt_queryData) {
      out.push('?', opt_queryData);
    }
    if (opt_fragment) {
      out.push('#', opt_fragment);
    }
    return out.join('');
  }
  ;
  var splitRe = new RegExp('^' + '(?:' + '([^:/?#.]+)' + ':)?' + '(?://' + '(?:([^/?#]*)@)?' + '([\\w\\d\\-\\u0100-\\uffff.%]*)' + '(?::([0-9]+))?' + ')?' + '([^?#]+)?' + '(?:\\?([^#]*))?' + '(?:#(.*))?' + '$');
  var ComponentIndex = {
    SCHEME: 1,
    USER_INFO: 2,
    DOMAIN: 3,
    PORT: 4,
    PATH: 5,
    QUERY_DATA: 6,
    FRAGMENT: 7
  };
  function split(uri) {
    return (uri.match(splitRe));
  }
  function removeDotSegments(path) {
    if (path === '/')
      return '/';
    var leadingSlash = path[0] === '/' ? '/' : '';
    var trailingSlash = path.slice(-1) === '/' ? '/' : '';
    var segments = path.split('/');
    var out = [];
    var up = 0;
    for (var pos = 0; pos < segments.length; pos++) {
      var segment = segments[pos];
      switch (segment) {
        case '':
        case '.':
          break;
        case '..':
          if (out.length)
            out.pop();
          else
            up++;
          break;
        default:
          out.push(segment);
      }
    }
    if (!leadingSlash) {
      while (up-- > 0) {
        out.unshift('..');
      }
      if (out.length === 0)
        out.push('.');
    }
    return leadingSlash + out.join('/') + trailingSlash;
  }
  function joinAndCanonicalizePath(parts) {
    var path = parts[ComponentIndex.PATH] || '';
    path = removeDotSegments(path);
    parts[ComponentIndex.PATH] = path;
    return buildFromEncodedParts(parts[ComponentIndex.SCHEME], parts[ComponentIndex.USER_INFO], parts[ComponentIndex.DOMAIN], parts[ComponentIndex.PORT], parts[ComponentIndex.PATH], parts[ComponentIndex.QUERY_DATA], parts[ComponentIndex.FRAGMENT]);
  }
  function canonicalizeUrl(url) {
    var parts = split(url);
    return joinAndCanonicalizePath(parts);
  }
  function resolveUrl(base, url) {
    var parts = split(url);
    var baseParts = split(base);
    if (parts[ComponentIndex.SCHEME]) {
      return joinAndCanonicalizePath(parts);
    } else {
      parts[ComponentIndex.SCHEME] = baseParts[ComponentIndex.SCHEME];
    }
    for (var i = ComponentIndex.SCHEME; i <= ComponentIndex.PORT; i++) {
      if (!parts[i]) {
        parts[i] = baseParts[i];
      }
    }
    if (parts[ComponentIndex.PATH][0] == '/') {
      return joinAndCanonicalizePath(parts);
    }
    var path = baseParts[ComponentIndex.PATH];
    var index = path.lastIndexOf('/');
    path = path.slice(0, index + 1) + parts[ComponentIndex.PATH];
    parts[ComponentIndex.PATH] = path;
    return joinAndCanonicalizePath(parts);
  }
  function isAbsolute(name) {
    if (!name)
      return false;
    if (name[0] === '/')
      return true;
    var parts = split(name);
    if (parts[ComponentIndex.SCHEME])
      return true;
    return false;
  }
  $traceurRuntime.canonicalizeUrl = canonicalizeUrl;
  $traceurRuntime.isAbsolute = isAbsolute;
  $traceurRuntime.removeDotSegments = removeDotSegments;
  $traceurRuntime.resolveUrl = resolveUrl;
})();
(function(global) {
  'use strict';
  var $__2 = $traceurRuntime.assertObject($traceurRuntime),
      canonicalizeUrl = $__2.canonicalizeUrl,
      resolveUrl = $__2.resolveUrl,
      isAbsolute = $__2.isAbsolute;
  var moduleInstantiators = Object.create(null);
  var baseURL;
  if (global.location && global.location.href)
    baseURL = resolveUrl(global.location.href, './');
  else
    baseURL = '';
  var UncoatedModuleEntry = function UncoatedModuleEntry(url, uncoatedModule) {
    this.url = url;
    this.value_ = uncoatedModule;
  };
  ($traceurRuntime.createClass)(UncoatedModuleEntry, {}, {});
  var ModuleEvaluationError = function ModuleEvaluationError(erroneousModuleName, cause) {
    this.message = this.constructor.name + (cause ? ': \'' + cause + '\'' : '') + ' in ' + erroneousModuleName;
  };
  ($traceurRuntime.createClass)(ModuleEvaluationError, {loadedBy: function(moduleName) {
      this.message += '\n loaded by ' + moduleName;
    }}, {}, Error);
  var UncoatedModuleInstantiator = function UncoatedModuleInstantiator(url, func) {
    $traceurRuntime.superCall(this, $UncoatedModuleInstantiator.prototype, "constructor", [url, null]);
    this.func = func;
  };
  var $UncoatedModuleInstantiator = UncoatedModuleInstantiator;
  ($traceurRuntime.createClass)(UncoatedModuleInstantiator, {getUncoatedModule: function() {
      if (this.value_)
        return this.value_;
      try {
        return this.value_ = this.func.call(global);
      } catch (ex) {
        if (ex instanceof ModuleEvaluationError) {
          ex.loadedBy(this.url);
          throw ex;
        }
        throw new ModuleEvaluationError(this.url, ex);
      }
    }}, {}, UncoatedModuleEntry);
  function getUncoatedModuleInstantiator(name) {
    if (!name)
      return;
    var url = ModuleStore.normalize(name);
    return moduleInstantiators[url];
  }
  ;
  var moduleInstances = Object.create(null);
  var liveModuleSentinel = {};
  function Module(uncoatedModule) {
    var isLive = arguments[1];
    var coatedModule = Object.create(null);
    Object.getOwnPropertyNames(uncoatedModule).forEach((function(name) {
      var getter,
          value;
      if (isLive === liveModuleSentinel) {
        var descr = Object.getOwnPropertyDescriptor(uncoatedModule, name);
        if (descr.get)
          getter = descr.get;
      }
      if (!getter) {
        value = uncoatedModule[name];
        getter = function() {
          return value;
        };
      }
      Object.defineProperty(coatedModule, name, {
        get: getter,
        enumerable: true
      });
    }));
    Object.preventExtensions(coatedModule);
    return coatedModule;
  }
  var ModuleStore = {
    normalize: function(name, refererName, refererAddress) {
      if (typeof name !== "string")
        throw new TypeError("module name must be a string, not " + typeof name);
      if (isAbsolute(name))
        return canonicalizeUrl(name);
      if (/[^\.]\/\.\.\//.test(name)) {
        throw new Error('module name embeds /../: ' + name);
      }
      if (name[0] === '.' && refererName)
        return resolveUrl(refererName, name);
      return canonicalizeUrl(name);
    },
    get: function(normalizedName) {
      var m = getUncoatedModuleInstantiator(normalizedName);
      if (!m)
        return undefined;
      var moduleInstance = moduleInstances[m.url];
      if (moduleInstance)
        return moduleInstance;
      moduleInstance = Module(m.getUncoatedModule(), liveModuleSentinel);
      return moduleInstances[m.url] = moduleInstance;
    },
    set: function(normalizedName, module) {
      normalizedName = String(normalizedName);
      moduleInstantiators[normalizedName] = new UncoatedModuleInstantiator(normalizedName, (function() {
        return module;
      }));
      moduleInstances[normalizedName] = module;
    },
    get baseURL() {
      return baseURL;
    },
    set baseURL(v) {
      baseURL = String(v);
    },
    registerModule: function(name, func) {
      var normalizedName = ModuleStore.normalize(name);
      if (moduleInstantiators[normalizedName])
        throw new Error('duplicate module named ' + normalizedName);
      moduleInstantiators[normalizedName] = new UncoatedModuleInstantiator(normalizedName, func);
    },
    bundleStore: Object.create(null),
    register: function(name, deps, func) {
      if (!deps || !deps.length && !func.length) {
        this.registerModule(name, func);
      } else {
        this.bundleStore[name] = {
          deps: deps,
          execute: function() {
            var $__0 = arguments;
            var depMap = {};
            deps.forEach((function(dep, index) {
              return depMap[dep] = $__0[index];
            }));
            var registryEntry = func.call(this, depMap);
            registryEntry.execute.call(this);
            return registryEntry.exports;
          }
        };
      }
    },
    getAnonymousModule: function(func) {
      return new Module(func.call(global), liveModuleSentinel);
    },
    getForTesting: function(name) {
      var $__0 = this;
      if (!this.testingPrefix_) {
        Object.keys(moduleInstances).some((function(key) {
          var m = /(traceur@[^\/]*\/)/.exec(key);
          if (m) {
            $__0.testingPrefix_ = m[1];
            return true;
          }
        }));
      }
      return this.get(this.testingPrefix_ + name);
    }
  };
  ModuleStore.set('@traceur/src/runtime/ModuleStore', new Module({ModuleStore: ModuleStore}));
  var setupGlobals = $traceurRuntime.setupGlobals;
  $traceurRuntime.setupGlobals = function(global) {
    setupGlobals(global);
  };
  $traceurRuntime.ModuleStore = ModuleStore;
  global.System = {
    register: ModuleStore.register.bind(ModuleStore),
    get: ModuleStore.get,
    set: ModuleStore.set,
    normalize: ModuleStore.normalize
  };
  $traceurRuntime.getModuleImpl = function(name) {
    var instantiator = getUncoatedModuleInstantiator(name);
    return instantiator && instantiator.getUncoatedModule();
  };
})(typeof global !== 'undefined' ? global : this);
System.register("traceur-runtime@0.0.51/src/runtime/polyfills/utils", [], function() {
  "use strict";
  var __moduleName = "traceur-runtime@0.0.51/src/runtime/polyfills/utils";
  var $ceil = Math.ceil;
  var $floor = Math.floor;
  var $isFinite = isFinite;
  var $isNaN = isNaN;
  var $pow = Math.pow;
  var $min = Math.min;
  var toObject = $traceurRuntime.toObject;
  function toUint32(x) {
    return x >>> 0;
  }
  function isObject(x) {
    return x && (typeof x === 'object' || typeof x === 'function');
  }
  function isCallable(x) {
    return typeof x === 'function';
  }
  function isNumber(x) {
    return typeof x === 'number';
  }
  function toInteger(x) {
    x = +x;
    if ($isNaN(x))
      return 0;
    if (x === 0 || !$isFinite(x))
      return x;
    return x > 0 ? $floor(x) : $ceil(x);
  }
  var MAX_SAFE_LENGTH = $pow(2, 53) - 1;
  function toLength(x) {
    var len = toInteger(x);
    return len < 0 ? 0 : $min(len, MAX_SAFE_LENGTH);
  }
  function checkIterable(x) {
    return !isObject(x) ? undefined : x[Symbol.iterator];
  }
  function isConstructor(x) {
    return isCallable(x);
  }
  return {
    get toObject() {
      return toObject;
    },
    get toUint32() {
      return toUint32;
    },
    get isObject() {
      return isObject;
    },
    get isCallable() {
      return isCallable;
    },
    get isNumber() {
      return isNumber;
    },
    get toInteger() {
      return toInteger;
    },
    get toLength() {
      return toLength;
    },
    get checkIterable() {
      return checkIterable;
    },
    get isConstructor() {
      return isConstructor;
    }
  };
});
System.register("traceur-runtime@0.0.51/src/runtime/polyfills/Array", [], function() {
  "use strict";
  var __moduleName = "traceur-runtime@0.0.51/src/runtime/polyfills/Array";
  var $__3 = System.get("traceur-runtime@0.0.51/src/runtime/polyfills/utils"),
      isCallable = $__3.isCallable,
      isConstructor = $__3.isConstructor,
      checkIterable = $__3.checkIterable,
      toInteger = $__3.toInteger,
      toLength = $__3.toLength,
      toObject = $__3.toObject;
  function from(arrLike) {
    var mapFn = arguments[1];
    var thisArg = arguments[2];
    var C = this;
    var items = toObject(arrLike);
    var mapping = mapFn !== undefined;
    var k = 0;
    var arr,
        len;
    if (mapping && !isCallable(mapFn)) {
      throw TypeError();
    }
    if (checkIterable(items)) {
      arr = isConstructor(C) ? new C() : [];
      for (var $__4 = items[Symbol.iterator](),
          $__5; !($__5 = $__4.next()).done; ) {
        var item = $__5.value;
        {
          if (mapping) {
            arr[k] = mapFn.call(thisArg, item, k);
          } else {
            arr[k] = item;
          }
          k++;
        }
      }
      arr.length = k;
      return arr;
    }
    len = toLength(items.length);
    arr = isConstructor(C) ? new C(len) : new Array(len);
    for (; k < len; k++) {
      if (mapping) {
        arr[k] = mapFn.call(thisArg, items[k], k);
      } else {
        arr[k] = items[k];
      }
    }
    arr.length = len;
    return arr;
  }
  function fill(value) {
    var start = arguments[1] !== (void 0) ? arguments[1] : 0;
    var end = arguments[2];
    var object = toObject(this);
    var len = toLength(object.length);
    var fillStart = toInteger(start);
    var fillEnd = end !== undefined ? toInteger(end) : len;
    fillStart = fillStart < 0 ? Math.max(len + fillStart, 0) : Math.min(fillStart, len);
    fillEnd = fillEnd < 0 ? Math.max(len + fillEnd, 0) : Math.min(fillEnd, len);
    while (fillStart < fillEnd) {
      object[fillStart] = value;
      fillStart++;
    }
    return object;
  }
  function find(predicate) {
    var thisArg = arguments[1];
    return findHelper(this, predicate, thisArg);
  }
  function findIndex(predicate) {
    var thisArg = arguments[1];
    return findHelper(this, predicate, thisArg, true);
  }
  function findHelper(self, predicate) {
    var thisArg = arguments[2];
    var returnIndex = arguments[3] !== (void 0) ? arguments[3] : false;
    var object = toObject(self);
    var len = toLength(object.length);
    if (!isCallable(predicate)) {
      throw TypeError();
    }
    for (var i = 0; i < len; i++) {
      if (i in object) {
        var value = object[i];
        if (predicate.call(thisArg, value, i, object)) {
          return returnIndex ? i : value;
        }
      }
    }
    return returnIndex ? -1 : undefined;
  }
  return {
    get from() {
      return from;
    },
    get fill() {
      return fill;
    },
    get find() {
      return find;
    },
    get findIndex() {
      return findIndex;
    }
  };
});
System.register("traceur-runtime@0.0.51/src/runtime/polyfills/ArrayIterator", [], function() {
  "use strict";
  var $__8;
  var __moduleName = "traceur-runtime@0.0.51/src/runtime/polyfills/ArrayIterator";
  var $__6 = System.get("traceur-runtime@0.0.51/src/runtime/polyfills/utils"),
      toObject = $__6.toObject,
      toUint32 = $__6.toUint32;
  var ARRAY_ITERATOR_KIND_KEYS = 1;
  var ARRAY_ITERATOR_KIND_VALUES = 2;
  var ARRAY_ITERATOR_KIND_ENTRIES = 3;
  var ArrayIterator = function ArrayIterator() {};
  ($traceurRuntime.createClass)(ArrayIterator, ($__8 = {}, Object.defineProperty($__8, "next", {
    value: function() {
      var iterator = toObject(this);
      var array = iterator.iteratorObject_;
      if (!array) {
        throw new TypeError('Object is not an ArrayIterator');
      }
      var index = iterator.arrayIteratorNextIndex_;
      var itemKind = iterator.arrayIterationKind_;
      var length = toUint32(array.length);
      if (index >= length) {
        iterator.arrayIteratorNextIndex_ = Infinity;
        return createIteratorResultObject(undefined, true);
      }
      iterator.arrayIteratorNextIndex_ = index + 1;
      if (itemKind == ARRAY_ITERATOR_KIND_VALUES)
        return createIteratorResultObject(array[index], false);
      if (itemKind == ARRAY_ITERATOR_KIND_ENTRIES)
        return createIteratorResultObject([index, array[index]], false);
      return createIteratorResultObject(index, false);
    },
    configurable: true,
    enumerable: true,
    writable: true
  }), Object.defineProperty($__8, Symbol.iterator, {
    value: function() {
      return this;
    },
    configurable: true,
    enumerable: true,
    writable: true
  }), $__8), {});
  function createArrayIterator(array, kind) {
    var object = toObject(array);
    var iterator = new ArrayIterator;
    iterator.iteratorObject_ = object;
    iterator.arrayIteratorNextIndex_ = 0;
    iterator.arrayIterationKind_ = kind;
    return iterator;
  }
  function createIteratorResultObject(value, done) {
    return {
      value: value,
      done: done
    };
  }
  function entries() {
    return createArrayIterator(this, ARRAY_ITERATOR_KIND_ENTRIES);
  }
  function keys() {
    return createArrayIterator(this, ARRAY_ITERATOR_KIND_KEYS);
  }
  function values() {
    return createArrayIterator(this, ARRAY_ITERATOR_KIND_VALUES);
  }
  return {
    get entries() {
      return entries;
    },
    get keys() {
      return keys;
    },
    get values() {
      return values;
    }
  };
});
System.register("traceur-runtime@0.0.51/src/runtime/polyfills/Map", [], function() {
  "use strict";
  var __moduleName = "traceur-runtime@0.0.51/src/runtime/polyfills/Map";
  var isObject = System.get("traceur-runtime@0.0.51/src/runtime/polyfills/utils").isObject;
  var getOwnHashObject = $traceurRuntime.getOwnHashObject;
  var $hasOwnProperty = Object.prototype.hasOwnProperty;
  var deletedSentinel = {};
  function lookupIndex(map, key) {
    if (isObject(key)) {
      var hashObject = getOwnHashObject(key);
      return hashObject && map.objectIndex_[hashObject.hash];
    }
    if (typeof key === 'string')
      return map.stringIndex_[key];
    return map.primitiveIndex_[key];
  }
  function initMap(map) {
    map.entries_ = [];
    map.objectIndex_ = Object.create(null);
    map.stringIndex_ = Object.create(null);
    map.primitiveIndex_ = Object.create(null);
    map.deletedCount_ = 0;
  }
  var Map = function Map() {
    var iterable = arguments[0];
    if (!isObject(this))
      throw new TypeError('Map called on incompatible type');
    if ($hasOwnProperty.call(this, 'entries_')) {
      throw new TypeError('Map can not be reentrantly initialised');
    }
    initMap(this);
    if (iterable !== null && iterable !== undefined) {
      for (var $__11 = iterable[Symbol.iterator](),
          $__12; !($__12 = $__11.next()).done; ) {
        var $__13 = $traceurRuntime.assertObject($__12.value),
            key = $__13[0],
            value = $__13[1];
        {
          this.set(key, value);
        }
      }
    }
  };
  ($traceurRuntime.createClass)(Map, {
    get size() {
      return this.entries_.length / 2 - this.deletedCount_;
    },
    get: function(key) {
      var index = lookupIndex(this, key);
      if (index !== undefined)
        return this.entries_[index + 1];
    },
    set: function(key, value) {
      var objectMode = isObject(key);
      var stringMode = typeof key === 'string';
      var index = lookupIndex(this, key);
      if (index !== undefined) {
        this.entries_[index + 1] = value;
      } else {
        index = this.entries_.length;
        this.entries_[index] = key;
        this.entries_[index + 1] = value;
        if (objectMode) {
          var hashObject = getOwnHashObject(key);
          var hash = hashObject.hash;
          this.objectIndex_[hash] = index;
        } else if (stringMode) {
          this.stringIndex_[key] = index;
        } else {
          this.primitiveIndex_[key] = index;
        }
      }
      return this;
    },
    has: function(key) {
      return lookupIndex(this, key) !== undefined;
    },
    delete: function(key) {
      var objectMode = isObject(key);
      var stringMode = typeof key === 'string';
      var index;
      var hash;
      if (objectMode) {
        var hashObject = getOwnHashObject(key);
        if (hashObject) {
          index = this.objectIndex_[hash = hashObject.hash];
          delete this.objectIndex_[hash];
        }
      } else if (stringMode) {
        index = this.stringIndex_[key];
        delete this.stringIndex_[key];
      } else {
        index = this.primitiveIndex_[key];
        delete this.primitiveIndex_[key];
      }
      if (index !== undefined) {
        this.entries_[index] = deletedSentinel;
        this.entries_[index + 1] = undefined;
        this.deletedCount_++;
      }
    },
    clear: function() {
      initMap(this);
    },
    forEach: function(callbackFn) {
      var thisArg = arguments[1];
      for (var i = 0,
          len = this.entries_.length; i < len; i += 2) {
        var key = this.entries_[i];
        var value = this.entries_[i + 1];
        if (key === deletedSentinel)
          continue;
        callbackFn.call(thisArg, value, key, this);
      }
    },
    entries: $traceurRuntime.initGeneratorFunction(function $__14() {
      var i,
          len,
          key,
          value;
      return $traceurRuntime.createGeneratorInstance(function($ctx) {
        while (true)
          switch ($ctx.state) {
            case 0:
              i = 0, len = this.entries_.length;
              $ctx.state = 12;
              break;
            case 12:
              $ctx.state = (i < len) ? 8 : -2;
              break;
            case 4:
              i += 2;
              $ctx.state = 12;
              break;
            case 8:
              key = this.entries_[i];
              value = this.entries_[i + 1];
              $ctx.state = 9;
              break;
            case 9:
              $ctx.state = (key === deletedSentinel) ? 4 : 6;
              break;
            case 6:
              $ctx.state = 2;
              return [key, value];
            case 2:
              $ctx.maybeThrow();
              $ctx.state = 4;
              break;
            default:
              return $ctx.end();
          }
      }, $__14, this);
    }),
    keys: $traceurRuntime.initGeneratorFunction(function $__15() {
      var i,
          len,
          key,
          value;
      return $traceurRuntime.createGeneratorInstance(function($ctx) {
        while (true)
          switch ($ctx.state) {
            case 0:
              i = 0, len = this.entries_.length;
              $ctx.state = 12;
              break;
            case 12:
              $ctx.state = (i < len) ? 8 : -2;
              break;
            case 4:
              i += 2;
              $ctx.state = 12;
              break;
            case 8:
              key = this.entries_[i];
              value = this.entries_[i + 1];
              $ctx.state = 9;
              break;
            case 9:
              $ctx.state = (key === deletedSentinel) ? 4 : 6;
              break;
            case 6:
              $ctx.state = 2;
              return key;
            case 2:
              $ctx.maybeThrow();
              $ctx.state = 4;
              break;
            default:
              return $ctx.end();
          }
      }, $__15, this);
    }),
    values: $traceurRuntime.initGeneratorFunction(function $__16() {
      var i,
          len,
          key,
          value;
      return $traceurRuntime.createGeneratorInstance(function($ctx) {
        while (true)
          switch ($ctx.state) {
            case 0:
              i = 0, len = this.entries_.length;
              $ctx.state = 12;
              break;
            case 12:
              $ctx.state = (i < len) ? 8 : -2;
              break;
            case 4:
              i += 2;
              $ctx.state = 12;
              break;
            case 8:
              key = this.entries_[i];
              value = this.entries_[i + 1];
              $ctx.state = 9;
              break;
            case 9:
              $ctx.state = (key === deletedSentinel) ? 4 : 6;
              break;
            case 6:
              $ctx.state = 2;
              return value;
            case 2:
              $ctx.maybeThrow();
              $ctx.state = 4;
              break;
            default:
              return $ctx.end();
          }
      }, $__16, this);
    })
  }, {});
  Object.defineProperty(Map.prototype, Symbol.iterator, {
    configurable: true,
    writable: true,
    value: Map.prototype.entries
  });
  return {get Map() {
      return Map;
    }};
});
System.register("traceur-runtime@0.0.51/src/runtime/polyfills/Number", [], function() {
  "use strict";
  var __moduleName = "traceur-runtime@0.0.51/src/runtime/polyfills/Number";
  var $__17 = System.get("traceur-runtime@0.0.51/src/runtime/polyfills/utils"),
      isNumber = $__17.isNumber,
      toInteger = $__17.toInteger;
  var $abs = Math.abs;
  var $isFinite = isFinite;
  var $isNaN = isNaN;
  var MAX_SAFE_INTEGER = Math.pow(2, 53) - 1;
  var MIN_SAFE_INTEGER = -Math.pow(2, 53) + 1;
  var EPSILON = Math.pow(2, -52);
  function NumberIsFinite(number) {
    return isNumber(number) && $isFinite(number);
  }
  ;
  function isInteger(number) {
    return NumberIsFinite(number) && toInteger(number) === number;
  }
  function NumberIsNaN(number) {
    return isNumber(number) && $isNaN(number);
  }
  ;
  function isSafeInteger(number) {
    if (NumberIsFinite(number)) {
      var integral = toInteger(number);
      if (integral === number)
        return $abs(integral) <= MAX_SAFE_INTEGER;
    }
    return false;
  }
  return {
    get MAX_SAFE_INTEGER() {
      return MAX_SAFE_INTEGER;
    },
    get MIN_SAFE_INTEGER() {
      return MIN_SAFE_INTEGER;
    },
    get EPSILON() {
      return EPSILON;
    },
    get isFinite() {
      return NumberIsFinite;
    },
    get isInteger() {
      return isInteger;
    },
    get isNaN() {
      return NumberIsNaN;
    },
    get isSafeInteger() {
      return isSafeInteger;
    }
  };
});
System.register("traceur-runtime@0.0.51/src/runtime/polyfills/Object", [], function() {
  "use strict";
  var __moduleName = "traceur-runtime@0.0.51/src/runtime/polyfills/Object";
  var $__18 = $traceurRuntime.assertObject($traceurRuntime),
      defineProperty = $__18.defineProperty,
      getOwnPropertyDescriptor = $__18.getOwnPropertyDescriptor,
      getOwnPropertyNames = $__18.getOwnPropertyNames,
      keys = $__18.keys,
      privateNames = $__18.privateNames;
  function is(left, right) {
    if (left === right)
      return left !== 0 || 1 / left === 1 / right;
    return left !== left && right !== right;
  }
  function assign(target) {
    for (var i = 1; i < arguments.length; i++) {
      var source = arguments[i];
      var props = keys(source);
      var p,
          length = props.length;
      for (p = 0; p < length; p++) {
        var name = props[p];
        if (privateNames[name])
          continue;
        target[name] = source[name];
      }
    }
    return target;
  }
  function mixin(target, source) {
    var props = getOwnPropertyNames(source);
    var p,
        descriptor,
        length = props.length;
    for (p = 0; p < length; p++) {
      var name = props[p];
      if (privateNames[name])
        continue;
      descriptor = getOwnPropertyDescriptor(source, props[p]);
      defineProperty(target, props[p], descriptor);
    }
    return target;
  }
  return {
    get is() {
      return is;
    },
    get assign() {
      return assign;
    },
    get mixin() {
      return mixin;
    }
  };
});
System.register("traceur-runtime@0.0.51/node_modules/rsvp/lib/rsvp/asap", [], function() {
  "use strict";
  var __moduleName = "traceur-runtime@0.0.51/node_modules/rsvp/lib/rsvp/asap";
  function asap(callback, arg) {
    var length = queue.push([callback, arg]);
    if (length === 1) {
      scheduleFlush();
    }
  }
  var $__default = asap;
  ;
  var browserGlobal = (typeof window !== 'undefined') ? window : {};
  var BrowserMutationObserver = browserGlobal.MutationObserver || browserGlobal.WebKitMutationObserver;
  function useNextTick() {
    return function() {
      process.nextTick(flush);
    };
  }
  function useMutationObserver() {
    var iterations = 0;
    var observer = new BrowserMutationObserver(flush);
    var node = document.createTextNode('');
    observer.observe(node, {characterData: true});
    return function() {
      node.data = (iterations = ++iterations % 2);
    };
  }
  function useSetTimeout() {
    return function() {
      setTimeout(flush, 1);
    };
  }
  var queue = [];
  function flush() {
    for (var i = 0; i < queue.length; i++) {
      var tuple = queue[i];
      var callback = tuple[0],
          arg = tuple[1];
      callback(arg);
    }
    queue = [];
  }
  var scheduleFlush;
  if (typeof process !== 'undefined' && {}.toString.call(process) === '[object process]') {
    scheduleFlush = useNextTick();
  } else if (BrowserMutationObserver) {
    scheduleFlush = useMutationObserver();
  } else {
    scheduleFlush = useSetTimeout();
  }
  return {get default() {
      return $__default;
    }};
});
System.register("traceur-runtime@0.0.51/src/runtime/polyfills/Promise", [], function() {
  "use strict";
  var __moduleName = "traceur-runtime@0.0.51/src/runtime/polyfills/Promise";
  var async = System.get("traceur-runtime@0.0.51/node_modules/rsvp/lib/rsvp/asap").default;
  var promiseRaw = {};
  function isPromise(x) {
    return x && typeof x === 'object' && x.status_ !== undefined;
  }
  function idResolveHandler(x) {
    return x;
  }
  function idRejectHandler(x) {
    throw x;
  }
  function chain(promise) {
    var onResolve = arguments[1] !== (void 0) ? arguments[1] : idResolveHandler;
    var onReject = arguments[2] !== (void 0) ? arguments[2] : idRejectHandler;
    var deferred = getDeferred(promise.constructor);
    switch (promise.status_) {
      case undefined:
        throw TypeError;
      case 0:
        promise.onResolve_.push(onResolve, deferred);
        promise.onReject_.push(onReject, deferred);
        break;
      case +1:
        promiseEnqueue(promise.value_, [onResolve, deferred]);
        break;
      case -1:
        promiseEnqueue(promise.value_, [onReject, deferred]);
        break;
    }
    return deferred.promise;
  }
  function getDeferred(C) {
    if (this === $Promise) {
      var promise = promiseInit(new $Promise(promiseRaw));
      return {
        promise: promise,
        resolve: (function(x) {
          promiseResolve(promise, x);
        }),
        reject: (function(r) {
          promiseReject(promise, r);
        })
      };
    } else {
      var result = {};
      result.promise = new C((function(resolve, reject) {
        result.resolve = resolve;
        result.reject = reject;
      }));
      return result;
    }
  }
  function promiseSet(promise, status, value, onResolve, onReject) {
    promise.status_ = status;
    promise.value_ = value;
    promise.onResolve_ = onResolve;
    promise.onReject_ = onReject;
    return promise;
  }
  function promiseInit(promise) {
    return promiseSet(promise, 0, undefined, [], []);
  }
  var Promise = function Promise(resolver) {
    if (resolver === promiseRaw)
      return;
    if (typeof resolver !== 'function')
      throw new TypeError;
    var promise = promiseInit(this);
    try {
      resolver((function(x) {
        promiseResolve(promise, x);
      }), (function(r) {
        promiseReject(promise, r);
      }));
    } catch (e) {
      promiseReject(promise, e);
    }
  };
  ($traceurRuntime.createClass)(Promise, {
    catch: function(onReject) {
      return this.then(undefined, onReject);
    },
    then: function(onResolve, onReject) {
      if (typeof onResolve !== 'function')
        onResolve = idResolveHandler;
      if (typeof onReject !== 'function')
        onReject = idRejectHandler;
      var that = this;
      var constructor = this.constructor;
      return chain(this, function(x) {
        x = promiseCoerce(constructor, x);
        return x === that ? onReject(new TypeError) : isPromise(x) ? x.then(onResolve, onReject) : onResolve(x);
      }, onReject);
    }
  }, {
    resolve: function(x) {
      if (this === $Promise) {
        return promiseSet(new $Promise(promiseRaw), +1, x);
      } else {
        return new this(function(resolve, reject) {
          resolve(x);
        });
      }
    },
    reject: function(r) {
      if (this === $Promise) {
        return promiseSet(new $Promise(promiseRaw), -1, r);
      } else {
        return new this((function(resolve, reject) {
          reject(r);
        }));
      }
    },
    cast: function(x) {
      if (x instanceof this)
        return x;
      if (isPromise(x)) {
        var result = getDeferred(this);
        chain(x, result.resolve, result.reject);
        return result.promise;
      }
      return this.resolve(x);
    },
    all: function(values) {
      var deferred = getDeferred(this);
      var resolutions = [];
      try {
        var count = values.length;
        if (count === 0) {
          deferred.resolve(resolutions);
        } else {
          for (var i = 0; i < values.length; i++) {
            this.resolve(values[i]).then(function(i, x) {
              resolutions[i] = x;
              if (--count === 0)
                deferred.resolve(resolutions);
            }.bind(undefined, i), (function(r) {
              deferred.reject(r);
            }));
          }
        }
      } catch (e) {
        deferred.reject(e);
      }
      return deferred.promise;
    },
    race: function(values) {
      var deferred = getDeferred(this);
      try {
        for (var i = 0; i < values.length; i++) {
          this.resolve(values[i]).then((function(x) {
            deferred.resolve(x);
          }), (function(r) {
            deferred.reject(r);
          }));
        }
      } catch (e) {
        deferred.reject(e);
      }
      return deferred.promise;
    }
  });
  var $Promise = Promise;
  var $PromiseReject = $Promise.reject;
  function promiseResolve(promise, x) {
    promiseDone(promise, +1, x, promise.onResolve_);
  }
  function promiseReject(promise, r) {
    promiseDone(promise, -1, r, promise.onReject_);
  }
  function promiseDone(promise, status, value, reactions) {
    if (promise.status_ !== 0)
      return;
    promiseEnqueue(value, reactions);
    promiseSet(promise, status, value);
  }
  function promiseEnqueue(value, tasks) {
    async((function() {
      for (var i = 0; i < tasks.length; i += 2) {
        promiseHandle(value, tasks[i], tasks[i + 1]);
      }
    }));
  }
  function promiseHandle(value, handler, deferred) {
    try {
      var result = handler(value);
      if (result === deferred.promise)
        throw new TypeError;
      else if (isPromise(result))
        chain(result, deferred.resolve, deferred.reject);
      else
        deferred.resolve(result);
    } catch (e) {
      try {
        deferred.reject(e);
      } catch (e) {}
    }
  }
  var thenableSymbol = '@@thenable';
  function isObject(x) {
    return x && (typeof x === 'object' || typeof x === 'function');
  }
  function promiseCoerce(constructor, x) {
    if (!isPromise(x) && isObject(x)) {
      var then;
      try {
        then = x.then;
      } catch (r) {
        var promise = $PromiseReject.call(constructor, r);
        x[thenableSymbol] = promise;
        return promise;
      }
      if (typeof then === 'function') {
        var p = x[thenableSymbol];
        if (p) {
          return p;
        } else {
          var deferred = getDeferred(constructor);
          x[thenableSymbol] = deferred.promise;
          try {
            then.call(x, deferred.resolve, deferred.reject);
          } catch (r) {
            deferred.reject(r);
          }
          return deferred.promise;
        }
      }
    }
    return x;
  }
  return {get Promise() {
      return Promise;
    }};
});
System.register("traceur-runtime@0.0.51/src/runtime/polyfills/Set", [], function() {
  "use strict";
  var __moduleName = "traceur-runtime@0.0.51/src/runtime/polyfills/Set";
  var isObject = System.get("traceur-runtime@0.0.51/src/runtime/polyfills/utils").isObject;
  var Map = System.get("traceur-runtime@0.0.51/src/runtime/polyfills/Map").Map;
  var getOwnHashObject = $traceurRuntime.getOwnHashObject;
  var $hasOwnProperty = Object.prototype.hasOwnProperty;
  function initSet(set) {
    set.map_ = new Map();
  }
  var Set = function Set() {
    var iterable = arguments[0];
    if (!isObject(this))
      throw new TypeError('Set called on incompatible type');
    if ($hasOwnProperty.call(this, 'map_')) {
      throw new TypeError('Set can not be reentrantly initialised');
    }
    initSet(this);
    if (iterable !== null && iterable !== undefined) {
      for (var $__25 = iterable[Symbol.iterator](),
          $__26; !($__26 = $__25.next()).done; ) {
        var item = $__26.value;
        {
          this.add(item);
        }
      }
    }
  };
  ($traceurRuntime.createClass)(Set, {
    get size() {
      return this.map_.size;
    },
    has: function(key) {
      return this.map_.has(key);
    },
    add: function(key) {
      return this.map_.set(key, key);
    },
    delete: function(key) {
      return this.map_.delete(key);
    },
    clear: function() {
      return this.map_.clear();
    },
    forEach: function(callbackFn) {
      var thisArg = arguments[1];
      var $__23 = this;
      return this.map_.forEach((function(value, key) {
        callbackFn.call(thisArg, key, key, $__23);
      }));
    },
    values: $traceurRuntime.initGeneratorFunction(function $__27() {
      var $__28,
          $__29;
      return $traceurRuntime.createGeneratorInstance(function($ctx) {
        while (true)
          switch ($ctx.state) {
            case 0:
              $__28 = this.map_.keys()[Symbol.iterator]();
              $ctx.sent = void 0;
              $ctx.action = 'next';
              $ctx.state = 12;
              break;
            case 12:
              $__29 = $__28[$ctx.action]($ctx.sentIgnoreThrow);
              $ctx.state = 9;
              break;
            case 9:
              $ctx.state = ($__29.done) ? 3 : 2;
              break;
            case 3:
              $ctx.sent = $__29.value;
              $ctx.state = -2;
              break;
            case 2:
              $ctx.state = 12;
              return $__29.value;
            default:
              return $ctx.end();
          }
      }, $__27, this);
    }),
    entries: $traceurRuntime.initGeneratorFunction(function $__30() {
      var $__31,
          $__32;
      return $traceurRuntime.createGeneratorInstance(function($ctx) {
        while (true)
          switch ($ctx.state) {
            case 0:
              $__31 = this.map_.entries()[Symbol.iterator]();
              $ctx.sent = void 0;
              $ctx.action = 'next';
              $ctx.state = 12;
              break;
            case 12:
              $__32 = $__31[$ctx.action]($ctx.sentIgnoreThrow);
              $ctx.state = 9;
              break;
            case 9:
              $ctx.state = ($__32.done) ? 3 : 2;
              break;
            case 3:
              $ctx.sent = $__32.value;
              $ctx.state = -2;
              break;
            case 2:
              $ctx.state = 12;
              return $__32.value;
            default:
              return $ctx.end();
          }
      }, $__30, this);
    })
  }, {});
  Object.defineProperty(Set.prototype, Symbol.iterator, {
    configurable: true,
    writable: true,
    value: Set.prototype.values
  });
  Object.defineProperty(Set.prototype, 'keys', {
    configurable: true,
    writable: true,
    value: Set.prototype.values
  });
  return {get Set() {
      return Set;
    }};
});
System.register("traceur-runtime@0.0.51/src/runtime/polyfills/String", [], function() {
  "use strict";
  var __moduleName = "traceur-runtime@0.0.51/src/runtime/polyfills/String";
  var $toString = Object.prototype.toString;
  var $indexOf = String.prototype.indexOf;
  var $lastIndexOf = String.prototype.lastIndexOf;
  function startsWith(search) {
    var string = String(this);
    if (this == null || $toString.call(search) == '[object RegExp]') {
      throw TypeError();
    }
    var stringLength = string.length;
    var searchString = String(search);
    var searchLength = searchString.length;
    var position = arguments.length > 1 ? arguments[1] : undefined;
    var pos = position ? Number(position) : 0;
    if (isNaN(pos)) {
      pos = 0;
    }
    var start = Math.min(Math.max(pos, 0), stringLength);
    return $indexOf.call(string, searchString, pos) == start;
  }
  function endsWith(search) {
    var string = String(this);
    if (this == null || $toString.call(search) == '[object RegExp]') {
      throw TypeError();
    }
    var stringLength = string.length;
    var searchString = String(search);
    var searchLength = searchString.length;
    var pos = stringLength;
    if (arguments.length > 1) {
      var position = arguments[1];
      if (position !== undefined) {
        pos = position ? Number(position) : 0;
        if (isNaN(pos)) {
          pos = 0;
        }
      }
    }
    var end = Math.min(Math.max(pos, 0), stringLength);
    var start = end - searchLength;
    if (start < 0) {
      return false;
    }
    return $lastIndexOf.call(string, searchString, start) == start;
  }
  function contains(search) {
    if (this == null) {
      throw TypeError();
    }
    var string = String(this);
    var stringLength = string.length;
    var searchString = String(search);
    var searchLength = searchString.length;
    var position = arguments.length > 1 ? arguments[1] : undefined;
    var pos = position ? Number(position) : 0;
    if (isNaN(pos)) {
      pos = 0;
    }
    var start = Math.min(Math.max(pos, 0), stringLength);
    return $indexOf.call(string, searchString, pos) != -1;
  }
  function repeat(count) {
    if (this == null) {
      throw TypeError();
    }
    var string = String(this);
    var n = count ? Number(count) : 0;
    if (isNaN(n)) {
      n = 0;
    }
    if (n < 0 || n == Infinity) {
      throw RangeError();
    }
    if (n == 0) {
      return '';
    }
    var result = '';
    while (n--) {
      result += string;
    }
    return result;
  }
  function codePointAt(position) {
    if (this == null) {
      throw TypeError();
    }
    var string = String(this);
    var size = string.length;
    var index = position ? Number(position) : 0;
    if (isNaN(index)) {
      index = 0;
    }
    if (index < 0 || index >= size) {
      return undefined;
    }
    var first = string.charCodeAt(index);
    var second;
    if (first >= 0xD800 && first <= 0xDBFF && size > index + 1) {
      second = string.charCodeAt(index + 1);
      if (second >= 0xDC00 && second <= 0xDFFF) {
        return (first - 0xD800) * 0x400 + second - 0xDC00 + 0x10000;
      }
    }
    return first;
  }
  function raw(callsite) {
    var raw = callsite.raw;
    var len = raw.length >>> 0;
    if (len === 0)
      return '';
    var s = '';
    var i = 0;
    while (true) {
      s += raw[i];
      if (i + 1 === len)
        return s;
      s += arguments[++i];
    }
  }
  function fromCodePoint() {
    var codeUnits = [];
    var floor = Math.floor;
    var highSurrogate;
    var lowSurrogate;
    var index = -1;
    var length = arguments.length;
    if (!length) {
      return '';
    }
    while (++index < length) {
      var codePoint = Number(arguments[index]);
      if (!isFinite(codePoint) || codePoint < 0 || codePoint > 0x10FFFF || floor(codePoint) != codePoint) {
        throw RangeError('Invalid code point: ' + codePoint);
      }
      if (codePoint <= 0xFFFF) {
        codeUnits.push(codePoint);
      } else {
        codePoint -= 0x10000;
        highSurrogate = (codePoint >> 10) + 0xD800;
        lowSurrogate = (codePoint % 0x400) + 0xDC00;
        codeUnits.push(highSurrogate, lowSurrogate);
      }
    }
    return String.fromCharCode.apply(null, codeUnits);
  }
  return {
    get startsWith() {
      return startsWith;
    },
    get endsWith() {
      return endsWith;
    },
    get contains() {
      return contains;
    },
    get repeat() {
      return repeat;
    },
    get codePointAt() {
      return codePointAt;
    },
    get raw() {
      return raw;
    },
    get fromCodePoint() {
      return fromCodePoint;
    }
  };
});
System.register("traceur-runtime@0.0.51/src/runtime/polyfills/polyfills", [], function() {
  "use strict";
  var __moduleName = "traceur-runtime@0.0.51/src/runtime/polyfills/polyfills";
  var Map = System.get("traceur-runtime@0.0.51/src/runtime/polyfills/Map").Map;
  var Set = System.get("traceur-runtime@0.0.51/src/runtime/polyfills/Set").Set;
  var Promise = System.get("traceur-runtime@0.0.51/src/runtime/polyfills/Promise").Promise;
  var $__36 = System.get("traceur-runtime@0.0.51/src/runtime/polyfills/String"),
      codePointAt = $__36.codePointAt,
      contains = $__36.contains,
      endsWith = $__36.endsWith,
      fromCodePoint = $__36.fromCodePoint,
      repeat = $__36.repeat,
      raw = $__36.raw,
      startsWith = $__36.startsWith;
  var $__37 = System.get("traceur-runtime@0.0.51/src/runtime/polyfills/Array"),
      fill = $__37.fill,
      find = $__37.find,
      findIndex = $__37.findIndex,
      from = $__37.from;
  var $__38 = System.get("traceur-runtime@0.0.51/src/runtime/polyfills/ArrayIterator"),
      entries = $__38.entries,
      keys = $__38.keys,
      values = $__38.values;
  var $__39 = System.get("traceur-runtime@0.0.51/src/runtime/polyfills/Object"),
      assign = $__39.assign,
      is = $__39.is,
      mixin = $__39.mixin;
  var $__40 = System.get("traceur-runtime@0.0.51/src/runtime/polyfills/Number"),
      MAX_SAFE_INTEGER = $__40.MAX_SAFE_INTEGER,
      MIN_SAFE_INTEGER = $__40.MIN_SAFE_INTEGER,
      EPSILON = $__40.EPSILON,
      isFinite = $__40.isFinite,
      isInteger = $__40.isInteger,
      isNaN = $__40.isNaN,
      isSafeInteger = $__40.isSafeInteger;
  var getPrototypeOf = $traceurRuntime.assertObject(Object).getPrototypeOf;
  function maybeDefine(object, name, descr) {
    if (!(name in object)) {
      Object.defineProperty(object, name, descr);
    }
  }
  function maybeDefineMethod(object, name, value) {
    maybeDefine(object, name, {
      value: value,
      configurable: true,
      enumerable: false,
      writable: true
    });
  }
  function maybeDefineConst(object, name, value) {
    maybeDefine(object, name, {
      value: value,
      configurable: false,
      enumerable: false,
      writable: false
    });
  }
  function maybeAddFunctions(object, functions) {
    for (var i = 0; i < functions.length; i += 2) {
      var name = functions[i];
      var value = functions[i + 1];
      maybeDefineMethod(object, name, value);
    }
  }
  function maybeAddConsts(object, consts) {
    for (var i = 0; i < consts.length; i += 2) {
      var name = consts[i];
      var value = consts[i + 1];
      maybeDefineConst(object, name, value);
    }
  }
  function maybeAddIterator(object, func, Symbol) {
    if (!Symbol || !Symbol.iterator || object[Symbol.iterator])
      return;
    if (object['@@iterator'])
      func = object['@@iterator'];
    Object.defineProperty(object, Symbol.iterator, {
      value: func,
      configurable: true,
      enumerable: false,
      writable: true
    });
  }
  function polyfillPromise(global) {
    if (!global.Promise)
      global.Promise = Promise;
  }
  function polyfillCollections(global, Symbol) {
    if (!global.Map)
      global.Map = Map;
    var mapPrototype = global.Map.prototype;
    maybeAddIterator(mapPrototype, mapPrototype.entries, Symbol);
    maybeAddIterator(getPrototypeOf(new global.Map().values()), function() {
      return this;
    }, Symbol);
    if (!global.Set)
      global.Set = Set;
    var setPrototype = global.Set.prototype;
    maybeAddIterator(setPrototype, setPrototype.values, Symbol);
    maybeAddIterator(getPrototypeOf(new global.Set().values()), function() {
      return this;
    }, Symbol);
  }
  function polyfillString(String) {
    maybeAddFunctions(String.prototype, ['codePointAt', codePointAt, 'contains', contains, 'endsWith', endsWith, 'startsWith', startsWith, 'repeat', repeat]);
    maybeAddFunctions(String, ['fromCodePoint', fromCodePoint, 'raw', raw]);
  }
  function polyfillArray(Array, Symbol) {
    maybeAddFunctions(Array.prototype, ['entries', entries, 'keys', keys, 'values', values, 'fill', fill, 'find', find, 'findIndex', findIndex]);
    maybeAddFunctions(Array, ['from', from]);
    maybeAddIterator(Array.prototype, values, Symbol);
    maybeAddIterator(getPrototypeOf([].values()), function() {
      return this;
    }, Symbol);
  }
  function polyfillObject(Object) {
    maybeAddFunctions(Object, ['assign', assign, 'is', is, 'mixin', mixin]);
  }
  function polyfillNumber(Number) {
    maybeAddConsts(Number, ['MAX_SAFE_INTEGER', MAX_SAFE_INTEGER, 'MIN_SAFE_INTEGER', MIN_SAFE_INTEGER, 'EPSILON', EPSILON]);
    maybeAddFunctions(Number, ['isFinite', isFinite, 'isInteger', isInteger, 'isNaN', isNaN, 'isSafeInteger', isSafeInteger]);
  }
  function polyfill(global) {
    polyfillPromise(global);
    polyfillCollections(global, global.Symbol);
    polyfillString(global.String);
    polyfillArray(global.Array, global.Symbol);
    polyfillObject(global.Object);
    polyfillNumber(global.Number);
  }
  polyfill(this);
  var setupGlobals = $traceurRuntime.setupGlobals;
  $traceurRuntime.setupGlobals = function(global) {
    setupGlobals(global);
    polyfill(global);
  };
  return {};
});
System.register("traceur-runtime@0.0.51/src/runtime/polyfill-import", [], function() {
  "use strict";
  var __moduleName = "traceur-runtime@0.0.51/src/runtime/polyfill-import";
  System.get("traceur-runtime@0.0.51/src/runtime/polyfills/polyfills");
  return {};
});
System.get("traceur-runtime@0.0.51/src/runtime/polyfill-import" + '');

window.Alt.Log = function (m) {
	console.log(m);
};

if (!window.chrome) {
	window.chrome = {};
}

// This is to make sure that the app gets DOMContentLoaded before AltContentLoaded
var interval = setInterval(function () {
	if (window.hasOwnProperty('innerDepth') && window.hasOwnProperty('pixelToMeterRatio')) {
		clearInterval(interval);
		window.dispatchEvent(new CustomEvent('AltContentLoaded'));
	}
}, 10);

window.Alt.flushActiveTextField = function () {
	window.Alt.previousActiveTextField = null;
	window.Alt.previousActiveTextFieldValue = null;
	window.Alt.previousActiveTextFieldInvalid = null;
	window.Alt.previousActiveTextFieldInvalidReason = null;
};

window.Alt.flushActiveTextField();

// This is a hack to work around the fact that field types "number" and
// "email" do not allow reading/writing selections according to the HTML
// spec.
//
// The workaround is to temporarily flip the type to text and back :P
var withTextFieldWithMutableSelection = function (textField, callback) {
	var allowsSelectionMutation = (textField &&
			(textField.type === 'text' || textField.type === 'url' || textField.type === 'search' ||
			textField.type === 'password' || textField.type === 'telephone'));

	if (!textField || allowsSelectionMutation) {
		callback(textField);
	} else {
		var oldType = textField.type;

		try {
			textField.type = 'text';
			callback(textField);
		} finally {
			textField.type = oldType;
		}
	}
};

window.Alt.setActiveTextFieldSelection = function (start, end) {
	if (!window.document || !document.activeElement) return;

	withTextFieldWithMutableSelection(document.activeElement, function (textField) {
		textField.setSelectionRange(start, end);
	});
};

window.Alt.insertIntoActiveTextField = function (str) {
	if (!window.document || !document.activeElement) return;

	// Special case hack for email fields. Email fields have a bug where, upon being converted to 
	// text fields via withTextFieldWithMutableSelection, their selectionStart and selectionEnd
	// fields are always 0, meaning the new text will always be prepended. Appending it on the
	// end, while not great, is a more acceptable behavior that will align with expectations
	// from the virtual keyboard.
	if(document.activeElement.type === "email") {
		document.activeElement.value += str;
	}
	// Otherwise, treat the active element as a text field and insert the new text.
	else {
		withTextFieldWithMutableSelection(document.activeElement, function (textField) {
			var start = textField.selectionStart;
			var end = textField.selectionEnd;
			textField.value = textField.value.slice(0, start) + str + textField.value.slice(end);
			textField.selectionStart = textField.selectionEnd = start + str.length;
		});
	}

	// Simulate an input event so that React components respond to it appropriately
	var ev = new Event('input', {bubbles: true});
	ev.simulated = true;
	document.activeElement.dispatchEvent(ev);
};

var getNextTabbedFieldFrom = function (field) {
	var focussableElements =
		'a:not([disabled]), button:not([disabled]), ' +
		'input[type=text]:not([disabled]), ' +
		'input[type=password]:not([disabled]), ' +
		'input[type=url]:not([disabled]), ' +
		'input[type=search]:not([disabled]), ' +
		'input[type=telephone]:not([disabled]), ' +
		'select, ' +
		'[tabindex]:not([disabled]):not([tabindex="-1"])';

	var form = field.form;
	if (!form) return null;

	var focussable = Array.prototype.filter.call(
		form.querySelectorAll(focussableElements),
		function (element) { return element.offsetWidth > 0 || element.offsetHeight > 0 || element === field; });

	var index = focussable.indexOf(document.activeElement);
	return focussable[index + 1];
};

window.Alt.tabToNextFocusableField = function () {
	if (!document.activeElement) return;
	var next = getNextTabbedFieldFrom(document.activeElement);
	if (next) next.focus();
};

if (typeof Backbone !== 'undefined') {
	window.Alt.Backbone = window.Backbone.noConflict();
}

(function () {
	var getActiveTextField = function () {
		if (!window.document || !document.activeElement) return null;

		var el = document.activeElement;
		var type = el.getAttribute('type');

		if (!el.tagName) { return null; }

		var tagName = el.tagName.toLowerCase();
		var nonTextInputs = ['submit', 'button', 'reset', 'range', 'checkbox', 'radio', 'file', 'color', 'image'];
		if (
			(tagName === 'input' && nonTextInputs.indexOf(type) === -1) ||
			tagName === 'text' ||
			tagName === 'textarea' ||
			tagName === 'email'
		) {
			return el;
		}

		return null;
	};

	var callUpdateHasActiveTextField = function (textField) {
		if (!document) return;
		if (!window.engine) return;

		var textFieldInfo = {};
		textFieldInfo.__Type = 'ActiveTextFieldInfo';
		textFieldInfo.hasActiveTextField = false;
		textFieldInfo.activeTextFieldName = null;
		textFieldInfo.activeTextFieldId = null;
		textFieldInfo.activeTextFieldValue = null;
		textFieldInfo.activeTextFieldLabel = null;
		textFieldInfo.activeTextFieldInvalid = null;
		textFieldInfo.activeTextFieldInvalidReason = null;
		textFieldInfo.activeTextFieldDescription = null;
		textFieldInfo.activeTextFieldAutocapitalize = null;
		textFieldInfo.nextFormNavType = null;
		textFieldInfo.formInvalid = null;

		if (textField !== null) {
			textFieldInfo.hasActiveTextField = true;

			var type = textField.getAttribute('type');
			var value = textField.value;

			// Draw an asterisk for the first N - 1 characters, then the last character
			if (type && type.toLowerCase() === 'password' && value.length > 1) {
				value = (new Array(value.length)).join('\u2022') + value[value.length - 1];
			}

			var nextField = getNextTabbedFieldFrom(textField);

			textFieldInfo.activeTextFieldName = textField.name;
			textFieldInfo.activeTextFieldId = textField.id;
			textFieldInfo.activeTextFieldValue = value;
			textFieldInfo.activeTextFieldInvalid = textField.getAttribute('aria-invalid');
			textFieldInfo.activeTextFieldInvalidReason = textField.getAttribute('aria-invalid-reason');
			textFieldInfo.activeTextFieldAutocapitalize = textField.getAttribute('autocapitalize');
			textFieldInfo.formInvalid = textField.form && textField.form.getAttribute('aria-invalid');
			textFieldInfo.nextFormNavType = nextField && nextField.type;

			if (textField.id && textField.id.length > 0) {
				textFieldInfo.activeTextFieldLabel = Alt.$('label[for=\'' + textField.id + '\']').text();
			}

			if (!textFieldInfo.activeTextFieldLabel && textField.name && textField.name.length > 0) {
				textFieldInfo.activeTextFieldLabel = Alt.$('label[for=\'' + textField.name + '\']').text();
			}

			var ariaDescribedBy = textField.getAttribute('aria-describedby');

			if (ariaDescribedBy) {
				textFieldInfo.activeTextFieldDescription = Alt.$('#' + ariaDescribedBy).text();
			}
		}

		window.engine.call('UpdateHasActiveTextField', textFieldInfo);
	};

	var checkForActiveTextField = function () {
		if (!document) return;
		if (!window.engine) return;

		var currentActiveTextField = getActiveTextField();
		var currentActiveTextFieldValue = currentActiveTextField && currentActiveTextField.value;
		var currentActiveTextFieldInvalid = currentActiveTextField &&
													currentActiveTextField.getAttribute('aria-invalid');
		var currentActiveTextFieldInvalidReason = currentActiveTextField &&
													currentActiveTextField.getAttribute('aria-invalid-reason');

		if (currentActiveTextField !== window.Alt.previousActiveTextField ||
			(currentActiveTextFieldValue !== window.Alt.previousActiveTextFieldValue) ||
			(currentActiveTextFieldInvalid !== window.Alt.previousActiveTextFieldInvalid) ||
			(currentActiveTextFieldInvalidReason !== window.Alt.previousActiveTextFieldInvalidReason)) {
			callUpdateHasActiveTextField(currentActiveTextField);
		}

		window.Alt.previousActiveTextField = currentActiveTextField;
		window.Alt.previousActiveTextFieldValue = currentActiveTextFieldValue;
		window.Alt.previousActiveTextFieldInvalid = currentActiveTextFieldInvalid;
		window.Alt.previousActiveTextFieldInvalidReason = currentActiveTextFieldInvalidReason;
	};

	setInterval(checkForActiveTextField, 100);

	// if the user dismisses they keyboard, they should be able to
	// refocus the active text field when they click on focused input field again
	var checkActiveTextFieldOnClick = function () {
		callUpdateHasActiveTextField(getActiveTextField());
	};

	var addClickListenerWhenDocumentReady = function () {
		if (document) {
			document.addEventListener('click', function () {
				checkActiveTextFieldOnClick();
			});
		} else {
			setTimeout(addClickListenerWhenDocumentReady, 250);
		}
	};

	addClickListenerWhenDocumentReady();
})();

"use strict";
{
  var EightIAPI = window.EightIAPI;
  var eightI = window.eightI;
  var THREE = window.THREE;
  var EightIMod = function() {
    function EightIMod() {
      this.MaxActorSize = 3;
      window.altspace._internal.callClientFunction('EnableDocumentBillboard');
      altspace.setHighPerfMode(true);
      document.getElementsByTagName("body")[0].style.overflow = "hidden";
      var self = this;
      altspace.getThreeJSTrackingSkeleton().then(function(skeleton) {
        self.skeleton = skeleton;
        self.camera = EightIAPI.getCamera();
        self.centerEye = self.skeleton.getJoint('Eye');
        window.requestAnimationFrame(function() {
          self.updateCamera();
        });
        EightIAPI.play();
        self.autoplay();
      });
    }
    return ($traceurRuntime.createClass)(EightIMod, {
      autoplay: function() {
        setInterval(function() {
          EightIAPI.play();
        }, 1000);
      },
      updateCamera: function() {
        var $__1 = this;
        this.camera.position.x = this.centerEye.position.x / 100;
        this.camera.position.z = this.centerEye.position.z / 100;
        var actorPosition = new THREE.Vector3(0, this.camera.position.y, 0);
        this.camera.lookAt(actorPosition);
        var dist = this.camera.position.distanceTo(actorPosition);
        var fov = 2.0 * Math.atan(this.MaxActorSize / (2.0 * dist)) * (180 / Math.PI);
        this.camera.fov = fov;
        eightI.player.resize();
        window.requestAnimationFrame(function() {
          $__1.updateCamera();
        });
      }
    }, {});
  }();
  setTimeout(function() {
    if (window.Alt.Util.UrlContains("8i.com/viewer/")) {
      window.Alt.Mods = window.Alt.Mods || [];
      window.Alt.Mods.push(new EightIMod());
    }
  }, 1);
}

"use strict";
window.Alt.$(function() {
  var _ = Alt._;
  var $ = Alt.$;
  if (window.top.document == window.document) {
    Alt.AltspaceUrlMixin.wireAltspaceLinks();
    var functionExecutePoller = function() {
      window.engine.call("GetNextEnqueuedFunctionExecution").then(function(nextCall) {
        if (nextCall != null) {
          var func = nextCall.Function;
          var args = nextCall.Arguments;
          var callbackId = nextCall.CallbackId;
          var target = null;
          var f = window;
          var $__4 = true;
          var $__5 = false;
          var $__6 = undefined;
          try {
            for (var $__2 = void 0,
                $__1 = (func.split("."))[Symbol.iterator](); !($__4 = ($__2 = $__1.next()).done); $__4 = true) {
              var name = $__2.value;
              {
                target = f;
                f = f[name];
                if (!f) {
                  break;
                }
              }
            }
          } catch ($__7) {
            $__5 = true;
            $__6 = $__7;
          } finally {
            try {
              if (!$__4 && $__1.return != null) {
                $__1.return();
              }
            } finally {
              if ($__5) {
                throw $__6;
              }
            }
          }
          if (target && f) {
            if (callbackId) {
              f.call(target, args, function(returnValue) {
                var returnObject = {};
                returnObject.__Type = "EnqueuedCallbackArgs";
                returnObject.CallbackId = callbackId;
                returnObject.ReturnValue = JSON.stringify(returnValue);
                window.engine.call("FireEnqueuedCallback", returnObject);
              });
            } else {
              f.call(target, args);
            }
          }
        }
      });
    };
    window.engine.on("ExecuteFunctionEnqueued", functionExecutePoller);
    Alt.PollId = setInterval(functionExecutePoller, 100);
    Alt.Display.PollForNewDisplayStatePackage();
    Alt.PlayerController.url = window.location.href;
    var broadcastScrollPointTimeout = null;
    var broadcastScrollPoint = function() {
      Alt.Display.IfOwner(function() {
        var options = {};
        options.__Type = "SetContentScrollPointOptions";
        options.x = Alt.$(window).scrollLeft();
        options.y = Alt.$(window).scrollTop();
        window.engine.call("SetContentScrollPoint", options);
      });
    };
    Alt.$(window).scroll(function() {
      if (broadcastScrollPointTimeout != null) {
        clearTimeout(broadcastScrollPointTimeout);
      }
      broadcastScrollPointTimeout = setTimeout(broadcastScrollPoint, 500);
    });
    setInterval(function() {
      if (Alt.PlayerController.url != window.location.href && Alt.MediaManager.checkForMediaPlayerInterval == null) {
        Alt.PlayerController.url = window.location.href;
        Alt.MediaManager.checkForMediaPlayerInterval = null;
        Alt.MediaManager.PlayerController = null;
        Alt.Display.PollForNewDisplayStatePackage();
      }
    }, 1000);
  }
});

"use strict";
Alt.AltspaceUrlMixin = {
  wireAltspaceLinks: function() {
    var altLinks = Alt.$('a[href^="altspace"]');
    altLinks.off("click");
    altLinks.click(function(e) {
      Alt.HtmlView.FollowAltspaceLink(Alt.$(this).attr("href"));
      e.preventDefault();
      return false;
    });
  },
  componentDidUpdate: function() {
    this.wireAltspaceLinks();
  }
};

"use strict";
var Auth = function() {
  function Auth() {}
  return ($traceurRuntime.createClass)(Auth, {}, {
    Authenticate: function(args, callback) {
      var $ = Alt.$;
      var authToken = args['AuthToken'];
      var host = args['Host'];
      $.ajaxSetup({timeout: 7000});
      $.ajax({
        url: host + 'api/session.json',
        remainingRetries: 5,
        headers: {"Authorization": "Token " + authToken},
        xhrFields: {withCredentials: true},
        complete: function(xhr, status) {
          console.log("Auth result: " + status);
          callback({
            success: true,
            err: null
          });
        },
        error: function(xhr, status, err) {
          var $__3 = this;
          console.log("Auth error: " + err);
          if (status === "timeout" && this.remainingRetries > 0) {
            this.remainingRetries--;
            setTimeout(function() {
              $.ajax($__3);
            }, 1000);
          } else {
            callback({
              success: false,
              err: err
            });
          }
        }
      });
    },
    SkipSignUp: function() {
      window.engine.call("SkipSignUp");
    }
  });
}();
window.Alt.Auth = Auth;

"use strict";
var Avatars = function() {
  function Avatars() {}
  return ($traceurRuntime.createClass)(Avatars, {}, {
    getAvatar: function(userId) {
      var options = {};
      options.__Type = "JSTypeString";
      options.String0 = userId;
      return window.engine.call("GetAvatar", options);
    },
    getAvatars: function(userIds) {
      var options = {};
      options.__Type = "JSTypeString";
      options.String0 = userIds;
      return window.engine.call("GetAvatars", options);
    }
  });
}();
window.Alt.Avatars = Avatars;

"use strict";
window.Alt.$(function() {
  var _ = Alt._;
  var $ = Alt.$;
  Alt.BeamModel = function(url) {
    var options = {};
    options.__Type = "JSTypeBeamModel";
    options.Url = url;
    console.log('Beaming model at: ' + url);
    window.engine.call("BeamModel", options);
  };
});

"use strict";
var Display = function() {
  function Display() {
    this.captureCallbacks = {};
  }
  return ($traceurRuntime.createClass)(Display, {
    IfOwner: function(f) {
      this.GetDisplayIsMine(function(isMine) {
        if (isMine) {
          f();
        }
      });
    },
    IfNotOwner: function(f) {
      this.GetDisplayIsMine(function(isMine) {
        if (!isMine) {
          f();
        }
      });
    },
    GetDisplayIsMine: function(f) {
      window.engine.call("DisplayIsMine").then(f);
    },
    GetDisplayIsPersonal: function(f) {
      window.engine.call("DisplayIsPersonal").then(f);
    },
    GetIsVisible: function(f) {
      window.engine.call("IsVisible").then(f);
    },
    PollWhileVisible: function(f) {
      var $__2 = this;
      var step = function() {
        $__2.GetIsVisible(function(isVisible) {
          if (isVisible) {
            try {
              f();
            } finally {
              setTimeout(step, 5000);
            }
          } else {
            setTimeout(step, 100);
          }
        });
      };
      step();
    },
    BeginCapturingRect: function(x, y, width, height, callback) {
      var callbackKey = (x + "_" + y + "_" + width + "_" + height);
      this.captureCallbacks[callbackKey] = callback;
      var options = {};
      options.__Type = "DisplayRectOptions";
      options.x = x;
      options.y = y;
      options.width = width;
      options.height = height;
      window.engine.call("RegisterDisplayRectToCapture", options);
    },
    DragTo: function(startX, startY, endX, endY, callback) {
      var self = this;
      var move = function() {
        self.FireMouseMoveEventAt(endX, endY);
      };
      var up = function() {
        self.FireMouseUpEventAt(endX, endY);
      };
      var cb = function() {
        callback();
      };
      self.FireMouseDownEventAt(startX, startY);
      setTimeout(move, 20);
      setTimeout(up, 40);
      if (callback) {
        setTimeout(cb, 60);
      }
    },
    Click: function(x, y, callback) {
      var self = this;
      self.FireMouseMoveEventAt(x, y);
      setTimeout(function() {
        self.FireMouseDownEventAt(x, y);
        setTimeout(function() {
          self.FireMouseUpEventAt(x, y);
          if (callback) {
            setTimeout(callback, 20);
          }
        }, 20);
      }, 20);
    },
    PressKey: function(keyCode) {
      var self = this;
      self.FireKeyDownEvent(keyCode);
      setTimeout(function() {
        self.FireKeyUpEvent(keyCode);
      }, 5);
    },
    FireKeyDownEvent: function(keyCode) {
      var options = {};
      options.__Type = "KeyEventOptions";
      options.keyCode = keyCode;
      window.engine.call("FireKeyDownEvent", options);
    },
    FireKeyUpEvent: function(keyCode) {
      var options = {};
      options.__Type = "KeyEventOptions";
      options.keyCode = keyCode;
      window.engine.call("FireKeyUpEvent", options);
    },
    FireMouseMoveEventAt: function(x, y) {
      var options = {};
      options.__Type = "MouseEventOptions";
      options.x = x;
      options.y = y;
      window.engine.call("FireMouseMoveEvent", options);
    },
    FireMouseDownEventAt: function(x, y) {
      var options = {};
      options.__Type = "MouseEventOptions";
      options.x = x;
      options.y = y;
      window.engine.call("FireMouseDownEvent", options);
    },
    FireMouseUpEventAt: function(x, y) {
      var options = {};
      options.__Type = "MouseEventOptions";
      options.x = x;
      options.y = y;
      window.engine.call("FireMouseUpEvent", options);
    },
    PullLatestDisplayStatePackage: function(callback) {
      window.engine.call("TryGetDisplayStatePackage").then(function(displayStatePackage) {
        if (displayStatePackage) {
          Alt.Display.Volume = displayStatePackage.Volume;
          Alt.Display.Volume = displayStatePackage.Volume;
          Alt.Display.UsingDirectAudio = displayStatePackage.UsingDirectAudio;
          Alt.Display.DisplayId = displayStatePackage.DisplayId;
          Alt.Display.SetScrollPoint(displayStatePackage.ScrollX, displayStatePackage.ScrollY);
          var mediaPlayerInfo = Alt.StorableMap.parse(displayStatePackage.MediaPlayerInfoJson);
          Alt.MediaManager.HandleUpdatedMediaPlayerInfo(mediaPlayerInfo);
        } else {
          callback("Failed to pull display state package, re-try");
        }
      });
    },
    HandleCapturedRect: function(args) {
      var callbackKey = (Math.floor(args.X) + "_" + Math.floor(args.Y) + "_" + Math.floor(args.Width) + "_" + Math.floor(args.Height));
      if (this.captureCallbacks[callbackKey]) {
        if (!this.captureCallbacks[callbackKey](args)) {
          var options = {};
          options.__Type = "DisplayRectOptions";
          options.x = Math.floor(args.X);
          options.y = Math.floor(args.Y);
          options.width = Math.floor(args.Width);
          options.height = Math.floor(args.Height);
          window.engine.call("UnregisterDisplayRectToCapture", options);
        }
      }
    },
    PollForNewDisplayStatePackage: function() {
      var repullLatestDisplayStatePackage = function() {
        Alt.Display.PullLatestDisplayStatePackage(function(err) {
          if (err) {
            setTimeout(repullLatestDisplayStatePackage, 250);
          }
        });
      };
      repullLatestDisplayStatePackage();
    },
    TogglePlayback: function(args) {
      var hasMediaPlayer = Alt.MediaManager.PlayerController && Alt.MediaManager.PlayerController.player;
      if (!hasMediaPlayer)
        return;
      var player = Alt.MediaManager.PlayerController.player;
      var playerType = player.getPlayerType();
      if (playerType !== "YouTube")
        return;
      var playerState = player.getPlayerState();
      if (playerState === Alt.PlayerState.PLAYING) {
        player.pauseVideo();
      } else {
        player.playVideo();
      }
    },
    SetVolume: function(args) {
      var volume = args.Volume;
      var usingDirectAudio = args.UsingDirectAudio;
      var hasMediaPlayer = Alt.MediaManager.PlayerController && Alt.MediaManager.PlayerController.player;
      if (usingDirectAudio) {
        if (!hasMediaPlayer || Alt.MediaManager.PlayerController.player.isHtml5Video()) {
          volume = 100;
        }
      }
      Alt.Display.UsingDirectAudio = usingDirectAudio;
      Alt.Display.Volume = volume;
      if (hasMediaPlayer) {
        Alt.MediaManager.PlayerController.player.setVolume(volume);
      } else if (!usingDirectAudio) {
        Alt.$("video,audio").each(function(index, element) {
          element.volume = volume / 100.0;
        });
      }
    },
    SetScrollPoint: function(x, y) {
      window.scrollTo(x, y);
    }
  }, {});
}();
window.Alt.Display = new Display();

"use strict";
var FacebookHelper = function() {
  function FacebookHelper() {}
  return ($traceurRuntime.createClass)(FacebookHelper, {}, {
    AddPhoto: function(args, callback) {
      Alt.Display.Click(20, 160);
    },
    PrefillPost: function(args, callback) {
      var prefillMessage = args.PrefillMessage + args.RailsUrl;
      ;
      Alt.$("textarea[name='xc_message']")[0].value = "";
      Alt.$("textarea[name='xc_message']")[0].value = (prefillMessage);
      console.log("Writing: " + prefillMessage);
      Alt.$("button[value='Add Photos']").click();
      if (callback != null) {
        callback(args);
      }
    }
  });
}();
window.Alt.FacebookHelper = FacebookHelper;

"use strict";
var Hand = function() {
  function Hand() {
    this.CenterPosition = null;
    this.CenterDirection = null;
  }
  return ($traceurRuntime.createClass)(Hand, {}, {UpdateHandData: function(args) {
      this.CenterPosition = args.CenterPosition;
      this.CenterDirection = args.CenterDirection;
    }});
}();
var Skeleton = function() {
  function Skeleton() {
    this.LeftHand = new Hand();
    this.RightHand = new Hand();
  }
  return ($traceurRuntime.createClass)(Skeleton, {}, {});
}();
var Input = function() {
  function Input() {}
  return ($traceurRuntime.createClass)(Input, {}, {
    GetSkeletonFrame: function(callback) {
      window.engine.call("GetSkeletonFrame").then(callback);
    },
    GetLookRay: function(callback) {
      window.engine.call("GetLookRay").then(callback);
    }
  });
}();
window.Alt.Input = Input;
window.Alt.Input.Skeleton = new Skeleton();

"use strict";
var HtmlView = function() {
  function HtmlView() {}
  return ($traceurRuntime.createClass)(HtmlView, {}, {
    Fire: function(eventName, eventArguments) {
      if (!eventArguments) {
        eventArguments = {};
      }
      var options = {};
      options.__Type = "FiredEventArgs";
      options.EventName = eventName;
      options.ArgsJson = JSON.stringify(eventArguments);
      window.engine.call("DispatchFiredViewEvent", options);
    },
    FollowAltspaceLink: function(href) {
      var options = {};
      options.__Type = "FollowAltspaceLinkOptions";
      options.href = href;
      window.engine.call("FollowAltspaceLink", options);
    },
    CopyAltspaceLinkToClipboard: function(href) {
      var options = {};
      options.__Type = "FollowAltspaceLinkOptions";
      options.href = href;
      window.engine.call("CopyAltspaceLinkToClipboard", options);
    },
    SetProperty: function(args) {
      var propertyName = args.Name;
      var propertyValue = args.Value;
      if (window.Alt.View.setStateDirectlyFromUnity) {
        var newState = {};
        newState[propertyName] = propertyValue;
        window.Alt.View.setState(newState);
      } else {
        window.Alt.View.props.model.set(propertyName, propertyValue);
      }
      if (typeof(window.Alt.View.handleModelChange) != "undefined") {
        window.Alt.View.handleModelChange();
      }
      window.Alt.View.forceUpdate();
    }
  });
}();
window.Alt.HtmlView = HtmlView;

"use strict";
var MediaManager = function() {
  function MediaManager() {}
  return ($traceurRuntime.createClass)(MediaManager, {
    HandleUpdatedMediaPlayerInfo: function(mediaPlayerInfo) {
      var $__2 = this;
      Alt.Display.GetDisplayIsMine(function(displayIsMine) {
        Alt.Display.GetDisplayIsPersonal(function(displayIsPersonal) {
          var hasMediaInfoUrl = mediaPlayerInfo.url != null;
          if (hasMediaInfoUrl) {
            if (Alt.MediaManager.PlayerController == null) {
              $__2.EnsureScanningForMedia(mediaPlayerInfo);
            } else {
              Alt.MediaManager.PlayerController.Sync(mediaPlayerInfo);
            }
          } else {
            var isMediaSite = Alt.PlayerDetector.isMediaSiteHost(document.location.host);
            if (displayIsMine && isMediaSite) {
              $__2.EnsureScanningForMedia(mediaPlayerInfo);
            }
          }
        });
      });
    },
    EnsureScanningForMedia: function(mediaPlayerInfo) {
      var $__2 = this;
      if (this.checkForMediaPlayerInterval || Alt.MediaManager.PlayerController != null) {
        return;
      }
      Alt.Log("Scanning for media player.");
      var checkForMediaPlayer = function() {
        var playerController = new Alt.PlayerController(mediaPlayerInfo);
        if (playerController.DetectPlayer()) {
          Alt.Log("Detected media player.");
          if ($__2.checkForMediaPlayerInterval != null) {
            clearInterval($__2.checkForMediaPlayerInterval);
            $__2.checkForMediaPlayerInterval = null;
          }
          playerController.Setup();
        }
      };
      this.checkForMediaPlayerInterval = setInterval(checkForMediaPlayer, 1000);
    },
    BroadcastAndUpdateMediaPlayerInfoIfOwner: function(player, newMediaPlayerInfo) {
      Alt.Display.IfOwner(function() {
        var $__6 = true;
        var $__7 = false;
        var $__8 = undefined;
        try {
          for (var $__4 = void 0,
              $__3 = (Alt._.keys(newMediaPlayerInfo))[Symbol.iterator](); !($__6 = ($__4 = $__3.next()).done); $__6 = true) {
            var k = $__4.value;
            {
              player.mediaPlayerInfo[k] = newMediaPlayerInfo[k];
            }
          }
        } catch ($__9) {
          $__7 = true;
          $__8 = $__9;
        } finally {
          try {
            if (!$__6 && $__3.return != null) {
              $__3.return();
            }
          } finally {
            if ($__7) {
              throw $__8;
            }
          }
        }
        var options = {};
        options.__Type = "SetMediaPlayerInfoOptions";
        options.mediaPlayerInfoJson = player.mediaPlayerInfo.stringify();
        Alt.Log("Broadcast media player info:");
        Alt.Log(player.mediaPlayerInfo);
        window.engine.call("SetMediaPlayerInfoJson", options);
      });
    }
  }, {});
}();
window.Alt.MediaManager = new MediaManager();

"use strict";
var PlayerController = function() {
  function PlayerController(mediaPlayerInfo) {
    this.mediaPlayerInfo = mediaPlayerInfo;
    if (typeof(this.mediaPlayerInfo.lastPauseServerTime) == "undefined") {
      this.mediaPlayerInfo.lastPauseServerTime = -1;
    }
    if (typeof(this.mediaPlayerInfo.lastPauseAltspaceTime) == "undefined") {
      this.mediaPlayerInfo.lastPauseAltspaceTime = new Date(0).toISOString();
    }
    this.url = window.location.href;
    this.hasSetInitialPlayerState = false;
  }
  return ($traceurRuntime.createClass)(PlayerController, {
    DetectPlayer: function() {
      this.RedirectIfOnWallUrl();
      var detector = new Alt.PlayerDetector();
      this.player = detector.DetectPlayer();
      if (this.player != null && this.player.getPlayerType() == "YouTube") {
        this.WorkaroundYoutubeAds();
      }
      return this.player != null;
    },
    RedirectIfOnWallUrl: function() {
      var wallPaths = ["/ProfilesGate"];
      if (this.mediaPlayerInfo && this.mediaPlayerInfo.url) {
        var isWallUrl = Alt._.some(wallPaths, function(path) {
          return document.location.toString().indexOf(path) >= 0;
        });
        if (isWallUrl) {
          document.location = this.mediaPlayerInfo.url;
        }
      }
    },
    WorkaroundYoutubeAds: function() {
      var $__2 = this;
      var complete = false;
      var pushInitialMediaPlayerInfoWhenReady = function() {
        setTimeout(function() {
          complete = $__2.PushInitialMediaPlayerInfo();
        }, 0);
        setTimeout(function() {
          if (!complete) {
            setTimeout(pushInitialMediaPlayerInfoWhenReady, 500);
          }
        }, 250);
      };
      pushInitialMediaPlayerInfoWhenReady();
    },
    PushInitialMediaPlayerInfo: function() {
      var $__2 = this;
      if (typeof(this.player.getVideoUrl()) == "undefined" || typeof(this.player.getVideoId()) == "undefined") {
        return false;
      }
      var newPlayerInfo = {
        playerType: this.player.getPlayerType(),
        seekOffset: this.player.getCurrentTime(),
        duration: this.player.getDuration(),
        videoUrl: this.player.getVideoUrl(),
        lastPauseServerTime: -1,
        lastPauseAltspaceTime: new Date(0).toISOString(),
        videoId: this.player.getVideoId(),
        url: this.player.getLandingUrl(),
        paused: false
      };
      Alt.Util.GetServerTimeInMilliSeconds(function(serverTime) {
        Alt.Util.GetAltspaceTime(function(altspaceTime) {
          newPlayerInfo.serverTimeAtStart = serverTime;
          newPlayerInfo.altspaceTimeAtStart = altspaceTime.toISOString();
          Alt.MediaManager.BroadcastAndUpdateMediaPlayerInfoIfOwner($__2, newPlayerInfo);
        });
      });
      return true;
    },
    Setup: function() {
      var $__2 = this;
      this.player.Init(function() {
        $__2.WirePlayerStateChangeEventListener();
        $__2.DoFirstSyncIfNeeded();
      });
      Alt.MediaManager.PlayerController = this;
    },
    WirePlayerStateChangeEventListener: function() {
      var $__2 = this;
      setTimeout(function() {
        $__2.HandlePlayerStateChange($__2.player.getPlayerState());
      }, 0);
      this.player.addStateChangeEventListener(function(state) {
        $__2.HandlePlayerStateChange(state);
      });
    },
    HandlePlayerStateChange: function(state) {
      var $__2 = this;
      Alt.Trace.Write("PlayerController.StateChanged", {
        State: state,
        Owned: true
      });
      if (Alt.Display) {
        Alt.Display.SetVolume({
          Volume: Alt.Display.Volume,
          UsingDirectAudio: Alt.Display.UsingDirectAudio
        });
      }
      Alt.Util.GetServerTimeInMilliSeconds(function(serverTime) {
        Alt.Util.GetAltspaceTime(function(altspaceTime) {
          Alt.Display.GetDisplayIsMine(function(isMine) {
            Alt.Display.GetDisplayIsPersonal(function(displayIsPersonal) {
              var isPlaying = state == Alt.PlayerState.PLAYING;
              var isStopped = state == Alt.PlayerState.PAUSED || state == Alt.PlayerState.ENDED;
              if (isMine) {
                if (isPlaying) {
                  $__2.PushInitialMediaPlayerInfo();
                } else if (isStopped) {
                  if (!displayIsPersonal) {
                    Alt.MediaManager.BroadcastAndUpdateMediaPlayerInfoIfOwner($__2, {
                      paused: true,
                      lastPauseServerTime: serverTime,
                      lastPauseAltspaceTime: altspaceTime.toISOString()
                    });
                  }
                }
              }
              if (!isMine && isPlaying && !$__2.hasSetInitialPlayerState) {
                if ($__2.mediaPlayerInfo.paused) {
                  $__2.player.pauseVideo();
                }
                $__2.hasSetInitialPlayerState = true;
              }
            });
          });
        });
      });
    },
    DoFirstSyncIfNeeded: function() {
      var $__2 = this;
      if (this.mediaPlayerInfo.url) {
        Alt.Display.GetDisplayIsPersonal(function(displayIsPersonal) {
          if (!displayIsPersonal) {
            $__2.Sync($__2.mediaPlayerInfo);
          }
        });
      }
    },
    Sync: function(newMediaPlayerInfo) {
      var $__2 = this;
      var isFirstSync = !this.hadFirstSync;
      var pauseStateChanged = this.mediaPlayerInfo.paused != newMediaPlayerInfo.paused;
      var videoIdChanged = this.mediaPlayerInfo.videoId != newMediaPlayerInfo.videoId;
      var seekOffsetChanged = Math.floor(this.mediaPlayerInfo.seekOffset) != Math.floor(newMediaPlayerInfo.seekOffset);
      this.mediaPlayerInfo = newMediaPlayerInfo;
      Alt.Util.GetServerTimeInMilliSeconds(function(serverTime) {
        Alt.Util.GetAltspaceTime(function(altspaceTime) {
          var $__3 = $__2.mediaPlayerInfo,
              paused = $__3.paused,
              seekOffset = $__3.seekOffset,
              serverTimeAtStart = $__3.serverTimeAtStart,
              altspaceTimeAtStart = $__3.altspaceTimeAtStart,
              videoId = $__3.videoId,
              videoUrl = $__3.videoUrl,
              lastPauseServerTime = $__3.lastPauseServerTime,
              lastPauseAltspaceTime = $__3.lastPauseAltspaceTime,
              duration = $__3.duration;
          if (altspaceTimeAtStart) {
            altspaceTimeAtStart = new Date(altspaceTimeAtStart);
          }
          if (lastPauseAltspaceTime) {
            lastPauseAltspaceTime = new Date(lastPauseAltspaceTime);
          }
          var latency = 1.0;
          if (isFirstSync) {
            latency += 0.5;
          }
          var currentTime = altspaceTimeAtStart ? altspaceTime : serverTime;
          var startTime = altspaceTimeAtStart ? altspaceTimeAtStart : serverTimeAtStart;
          var pauseTime = altspaceTimeAtStart ? lastPauseAltspaceTime : lastPauseServerTime;
          var elapsedSinceStart = (currentTime - startTime) / 1000.0;
          var totalPauseTime = 0;
          if (pauseTime > 0) {
            totalPauseTime = (currentTime - pauseTime) / 1000.0;
          }
          var newSeekPosition = seekOffset + elapsedSinceStart - totalPauseTime;
          var startSeconds = Math.floor(newSeekPosition + latency);
          if (duration > 0) {
            startSeconds = startSeconds % Math.floor(duration);
          }
          var shouldLoadNewVideo = videoIdChanged || isFirstSync;
          if (shouldLoadNewVideo) {
            Alt.Log("Loading video " + videoId + " at " + startSeconds);
            $__2.player.loadVideoById(videoId, startSeconds);
          } else {
            if (pauseStateChanged) {
              if (paused) {
                Alt.Log("Pausing video.");
                $__2.player.pauseVideo();
              } else {
                Alt.Log("Playing video.");
                $__2.player.playVideo();
              }
            }
            if (seekOffsetChanged) {
              Alt.Log("Seeking video to " + startSeconds);
              $__2.player.seekTo(startSeconds, true);
            }
          }
        });
      });
      this.hadFirstSync = true;
    }
  }, {});
}();
window.Alt.PlayerController = PlayerController;

"use strict";
var PlayerDetector = function() {
  function PlayerDetector() {
    this.name = "Player Detector";
  }
  return ($traceurRuntime.createClass)(PlayerDetector, {
    DetectPlayer: function() {
      var player;
      var detectedPlayerType = this.DetectPlayerType();
      if (detectedPlayerType) {
        player = detectedPlayerType.GetPlayer();
      } else {
        player = this.TryGetYoutubeStandalonePlayer();
      }
      return player;
    },
    DetectPlayerType: function() {
      var successfulDetectors = this.GetSuccessfulDetectors();
      if (successfulDetectors.length > 1) {
        console.log("Error: More than one player type detected:");
        console.log(successfulDetectors);
        return null;
      }
      if (successfulDetectors.length !== 1) {
        return null;
      }
      return successfulDetectors[0];
    },
    GetSuccessfulDetectors: function() {
      var detectors = [new Alt.NbcSportsPlayerDetector(), new Alt.NcaaPlayerDetector(), new Alt.SxswPlayerDetector(), new Alt.TwitchPlayerDetector(), new Alt.YoutubePlayerDetector(), new Alt.NetflixPlayerDetector()];
      return Alt._.filter(detectors, function(detector) {
        return detector.IsPlayerDetected();
      });
    },
    TryGetYoutubeStandalonePlayer: function() {
      var player;
      Alt.$("embed").each(function(iEmbed, embed) {
        if (embed.cueVideoById && embed.loadVideoById && embed.pauseVideo && embed.seekTo) {
          player = new Alt.YouTubePlayer(embed);
        }
      });
      return player;
    }
  }, {isMediaSiteHost: function(host) {
      var mediaHosts = ["youtube.com", "netflix.com", "twitch.com", "twitch.tv", "nbcsports.com", "ncaa.com", "sxsw.com"];
      return Alt._.some(mediaHosts, function(h) {
        return host.toLowerCase().indexOf(h) >= 0;
      });
    }});
}();
Alt.PlayerDetector = PlayerDetector;

"use strict";
window.Alt.PlayerState = {};
Alt.PlayerState.UNSTARTED = -1;
Alt.PlayerState.ENDED = 0;
Alt.PlayerState.PLAYING = 1;
Alt.PlayerState.PAUSED = 2;
Alt.PlayerState.BUFFERING = 3;
Alt.PlayerState.CUED = 5;

"use strict";
var PowerPointController = function() {
  function PowerPointController() {}
  return ($traceurRuntime.createClass)(PowerPointController, {
    GetCurrentSlide: function() {
      var el = Alt.$(".cui-ctl-mediumlabel");
      if (el.length === 0)
        return 0;
      return parseInt(el.text().match(/(\d+) of/)[1]) - 1;
    },
    Init: function() {
      var $__2 = this;
      var advanceSlide = function() {
        Alt.Display.Click(700, 710);
      };
      var previousSlide = function() {
        Alt.Display.Click(580, 710);
      };
      var moveTowardsTarget = function() {
        if ($__2.GetCurrentSlide() !== $__2.targetSlide) {
          if ($__2.GetCurrentSlide() < $__2.targetSlide) {
            advanceSlide();
          } else {
            previousSlide();
          }
        }
        setTimeout(function() {
          return moveTowardsTarget();
        }, 200);
      };
      var updateTargetFromHash = function() {
        var matches = window.location.hash.match(/slide=(\d+)/);
        if (matches && matches[1]) {
          $__2.targetSlide = parseInt(matches[1]);
        }
      };
      document.getElementById("SlidePanel").click();
      setTimeout(function() {
        moveTowardsTarget();
        updateTargetFromHash();
        window.onhashchange = function() {
          return updateTargetFromHash();
        };
        $__2.ready = true;
      }, 500);
      this.targetSlide = 0;
    },
    HandleDisplayClick: function() {
      if (!this.ready)
        return;
      window.location.hash = ("#slide=" + (this.GetCurrentSlide() + 1));
    },
    GetBeamableUrl: function(args, callback) {
      var forms = document.getElementsByTagName("form");
      for (var i = 0; i < forms.length; i++) {
        var action = forms[i].action;
        if (action.indexOf("PowerPointFrame.aspx") >= 0) {
          callback({BeamableUrl: action});
          return;
        }
      }
      callback({});
    }
  }, {});
}();
Alt.$(function() {
  var host = document.location.host.toLowerCase();
  var isPowerPointRoot = host.indexOf("powerpoint.officeapps") >= 0;
  var isPowerPointEmbed = host.indexOf("view.officeapps.live.com") >= 0 || host.indexOf("onedrive.live.com") >= 0;
  if (isPowerPointRoot || isPowerPointEmbed) {
    window.Alt.PowerPointController = new PowerPointController();
    if (isPowerPointRoot) {
      setTimeout(function() {
        return window.Alt.PowerPointController.Init();
      }, 3000);
    }
  }
});

"use strict";
var StorableMap = function() {
  function StorableMap(data) {
    if (typeof(data) !== "undefined") {
      var $__4 = true;
      var $__5 = false;
      var $__6 = undefined;
      try {
        for (var $__2 = void 0,
            $__1 = (Alt._.keys(data))[Symbol.iterator](); !($__4 = ($__2 = $__1.next()).done); $__4 = true) {
          var k = $__2.value;
          {
            this[k] = data[k];
          }
        }
      } catch ($__7) {
        $__5 = true;
        $__6 = $__7;
      } finally {
        try {
          if (!$__4 && $__1.return != null) {
            $__1.return();
          }
        } finally {
          if ($__5) {
            throw $__6;
          }
        }
      }
    }
  }
  return ($traceurRuntime.createClass)(StorableMap, {stringify: function() {
      var out = [];
      var keys = Alt._.keys(this).slice(0);
      keys.sort();
      var $__4 = true;
      var $__5 = false;
      var $__6 = undefined;
      try {
        for (var $__2 = void 0,
            $__1 = (keys)[Symbol.iterator](); !($__4 = ($__2 = $__1.next()).done); $__4 = true) {
          var k = $__2.value;
          {
            if (this[k] === null) {
              continue;
            }
            if ($traceurRuntime.typeof((this[k])) === "object") {
              throw "Cannot have nested objects in StorableMap (for now)";
            }
            if (typeof(this[k]) !== "function") {
              out.push([k, this[k]]);
            }
          }
        }
      } catch ($__7) {
        $__5 = true;
        $__6 = $__7;
      } finally {
        try {
          if (!$__4 && $__1.return != null) {
            $__1.return();
          }
        } finally {
          if ($__5) {
            throw $__6;
          }
        }
      }
      return JSON.stringify(out);
    }}, {
    toStorableJSON: function(obj) {
      var out = new Alt.StorableMap();
      var $__4 = true;
      var $__5 = false;
      var $__6 = undefined;
      try {
        for (var $__2 = void 0,
            $__1 = (Alt._.keys(obj))[Symbol.iterator](); !($__4 = ($__2 = $__1.next()).done); $__4 = true) {
          var k = $__2.value;
          {
            out[k] = obj[k];
          }
        }
      } catch ($__7) {
        $__5 = true;
        $__6 = $__7;
      } finally {
        try {
          if (!$__4 && $__1.return != null) {
            $__1.return();
          }
        } finally {
          if ($__5) {
            throw $__6;
          }
        }
      }
      return out.stringify();
    },
    parse: function(json) {
      var map = new StorableMap();
      var $__4 = true;
      var $__5 = false;
      var $__6 = undefined;
      try {
        for (var $__2 = void 0,
            $__1 = (JSON.parse(json))[Symbol.iterator](); !($__4 = ($__2 = $__1.next()).done); $__4 = true) {
          var entry = $__2.value;
          {
            map[entry[0]] = entry[1];
          }
        }
      } catch ($__7) {
        $__5 = true;
        $__6 = $__7;
      } finally {
        try {
          if (!$__4 && $__1.return != null) {
            $__1.return();
          }
        } finally {
          if ($__5) {
            throw $__6;
          }
        }
      }
      return map;
    }
  });
}();
window.Alt.StorableMap = StorableMap;

"use strict";
var Trace = function() {
  function Trace() {}
  return ($traceurRuntime.createClass)(Trace, {Write: function(scopeAndEvent, data) {
      var $__3,
          $__4;
      var $__2 = scopeAndEvent.split("."),
          scope = ($__3 = $__2[Symbol.iterator](), ($__4 = $__3.next()).done ? void 0 : $__4.value),
          eventName = ($__4 = $__3.next()).done ? void 0 : $__4.value;
      if (!data) {
        data = {};
      }
      data.DisplayId = Alt.Display.DisplayId;
      var options = {};
      options.__Type = "WriteTraceOptions";
      options.Scope = scope;
      options.EventName = eventName;
      options.DataJson = JSON.stringify(data);
      window.engine.call("WriteTrace", options);
    }}, {});
}();
window.Alt.Trace = new Trace();

"use strict";
var TwitterHelper = function() {
  function TwitterHelper() {}
  return ($traceurRuntime.createClass)(TwitterHelper, {}, {
    GetXCsrfToken: function(args, callback) {
      Alt.$.ajax({
        url: Alt.Util.GetPositronUrl("/api/users/me.json"),
        success: function(response, status, xhr) {
          callback({token: xhr.getResponseHeader("X-CSRF-Token")});
        }
      });
    },
    GenerateTwitterCard: function(args, callback) {
      var ajaxArgs = {
        url: Alt.Util.GetPositronUrl("/api/photos"),
        method: "POST",
        dataType: "json",
        headers: {"X-CSRF-Token": args.Token},
        data: {
          primary_image_url: args.PrimaryImageUrl,
          primary_image_height: args.PrimaryImageHeight,
          primary_image_width: args.PrimaryImageWidth,
          camera_direction_type: args.CameraDirectionType,
          taken_by_user_id: args.TakenByUserId,
          taken_in_space_id: args.TakenInSpaceId,
          taken_at: (new Date()).toString()
        },
        success: callback
      };
      if ("withCredentials" in args) {
        ajaxArgs["xhrFields"] = {withCredentials: args.withCredentials};
      }
      Alt.$.ajax(ajaxArgs);
    }
  });
}();
window.Alt.TwitterHelper = TwitterHelper;

"use strict";
var Users = function() {
  function Users() {}
  return ($traceurRuntime.createClass)(Users, {}, {
    dispatchLocalAvatarChanged: function(args) {
      if (!Users._cachedLocalUser)
        return;
      Users._cachedLocalUser.updateAvatarInfo(args);
      Users._cachedLocalUser.dispatchEvent({
        type: 'avatarchange',
        data: Users._cachedLocalUser.avatarInfo
      });
    },
    getLocalUser: function() {
      if (Users._cachedLocalUser !== null) {
        return Promise.resolve(Users._cachedLocalUser);
      }
      return altspace._internal.callClientFunction("GetLocalUser").then(function(localUser) {
        var user = new Users.User(localUser);
        Users._cachedLocalUser = user;
        return user;
      });
    }
  });
}();
Users.User = function() {
  function User(localUser) {
    this.userId = localUser.userId;
    this.displayName = localUser.displayName;
    this.isModerator = localUser.isModerator;
    if (localUser.legacyUserId) {
      console.warn('AltspaceVR: The getUser API has changed. ' + 'The "userId" it provides is now different for every app (as defined by the app host/port) ' + 'to improve the privacy of AltspaceVR users. If your app has a database with userIds in it, ' + 'use the temporary field "legacyUserId" to map onto the new ID scheme for your hostname ' + 'before May 15, 2018.');
      this.legacyUserId = localUser.legacyUserId;
    }
    this.updateAvatarInfo(localUser.avatarInfo);
  }
  return ($traceurRuntime.createClass)(User, {updateAvatarInfo: function(newInfo) {
      this.avatarInfo = {sid: newInfo.sid};
      if (newInfo.primaryColor)
        this.avatarInfo.primaryColor = newInfo.primaryColor;
      if (newInfo.highlightColor)
        this.avatarInfo.highlightColor = newInfo.highlightColor;
      if (newInfo.textures)
        this.avatarInfo.textures = newInfo.textures;
    }}, {});
}();
EventDispatcher.prototype.apply(Users.User.prototype);
Users._pendingEvents = [];
Users._isAltContentLoaded = false;
Users._cachedLocalUser = null;
window.addEventListener("AltContentLoaded", function(event) {
  Users._isAltContentLoaded = true;
  if (Users._pendingEvents.length > 0) {
    setTimeout(function() {
      var $__5 = true;
      var $__6 = false;
      var $__7 = undefined;
      try {
        for (var $__3 = void 0,
            $__2 = (pendingEvents)[Symbol.iterator](); !($__5 = ($__3 = $__2.next()).done); $__5 = true) {
          event = $__3.value;
          {
            window.dispatchEvent(event);
          }
        }
      } catch ($__8) {
        $__6 = true;
        $__7 = $__8;
      } finally {
        try {
          if (!$__5 && $__2.return != null) {
            $__2.return();
          }
        } finally {
          if ($__6) {
            throw $__7;
          }
        }
      }
    }, 1);
  }
});
window.Alt.Users = Users;

"use strict";
(function() {
  var _positronFetchCache = {};
  var Util = function() {
    function Util() {}
    return ($traceurRuntime.createClass)(Util, {}, {
      GetPositronUrl: function(path) {
        return (Alt.PositronProtocol + "://" + Alt.PositronHost + ":" + Alt.PositronPort + path);
      },
      Fetch: function(path, callback, errCallback) {
        var ifModified = typeof(_positronFetchCache[path]) !== "undefined";
        var ajaxParams = {
          url: this.GetPositronUrl(path),
          xhrFields: {withCredentials: true},
          cache: false
        };
        if (ifModified) {
          ajaxParams.ifModified = true;
        }
        ajaxParams.success = function(data, status, xhr) {
          if (status == "notmodified") {
            callback(_positronFetchCache[path], status, xhr);
          } else {
            if (data && data != "") {
              _positronFetchCache[path] = data;
            }
            callback(data, status, xhr);
          }
        };
        if (errCallback) {
          ajaxParams.error = errCallback;
        }
        Alt.$.ajax(ajaxParams);
      },
      getQueryVariable: function(variable) {
        var query = window.location.search.substring(1);
        var vars = query.split('&');
        for (var i = 0; i < vars.length; i++) {
          var pair = vars[i].split('=');
          if (decodeURIComponent(pair[0]) == variable) {
            return decodeURIComponent(pair[1]);
          }
        }
        return null;
      },
      GetServerTimeInMilliSeconds: function(f) {
        window.engine.call("GetServerTimeInMilliSeconds").then(f);
      },
      GetAltspaceTime: function(f) {
        window.engine.call("GetAltspaceTime").then(function(time) {
          f(new Date(time));
        });
      },
      ResetAvatar: function(f) {
        window.engine.call("ResetAvatar").then(f);
      },
      AveragePixelColor: function(pixels) {
        var sum = 0;
        this.ForEachPixel(pixels, function(pixel) {
          sum += pixel[0];
          sum += pixel[1];
          sum += pixel[2];
        });
        return sum * 1.0 / pixels.length;
      },
      ForEachPixel: function(pixels, callback) {
        for (var i = 0; i < pixels.length / 4; i++) {
          var pixel = [pixels[i * 4], pixels[i * 4 + 1], pixels[i * 4 + 2], pixels[i * 4 + 3]];
          if (!callback(pixel, i)) {
            break;
          }
        }
      },
      RandomString: function(length) {
        var text = "";
        var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
        for (var i = 0; i < length; i++)
          text += possible.charAt(Math.floor(Math.random() * possible.length));
        return text;
      },
      CheckForActiveElement: function(args, callback) {
        if (document.activeElement && document.activeElement != Alt.$("body")[0]) {
          callback({HasElement: true});
        } else {
          callback({HasElement: false});
        }
      },
      MountView: function(viewType) {
        Alt.View = React.render(React.createElement(Alt[(viewType + "View")], {model: new Alt.ViewModel()}), Alt.$(("#" + viewType + "View"))[0]);
        window.engine.call("FlushPropertiesToView");
      },
      UrlContains: function(text) {
        return document.location.href.toLowerCase().indexOf(text.toLowerCase()) >= 0;
      },
      ObjectToTimeline: function(tlObject) {
        var tl = new TimelineLite(tlObject['vars']);
        for (var groupKey in tlObject['tweens']) {
          var animationGroup = tlObject['tweens'][groupKey];
          if (animationGroup.tlMethod == 'staggerFrom' || animationGroup.tlMethod == 'staggerTo') {
            tl[animationGroup.tlMethod](animationGroup.selector, animationGroup.duration, animationGroup.vars, animationGroup.offset, animationGroup.position);
          } else {
            tl[animationGroup.tlMethod](animationGroup.selector, animationGroup.duration, animationGroup.vars, animationGroup.position);
          }
        }
        ;
        return (tl);
      }
    });
  }();
  if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
    module.exports = Util;
  } else {
    window.Alt.Util = Util;
  }
})();

"use strict";
Alt.ViewModel = Alt.Backbone.Model.extend({});

"use strict";
var Window = function() {
  function Window() {}
  return ($traceurRuntime.createClass)(Window, {}, {
    SetPixelToMeterRatio: function(args) {
      window.pixelToMeterRatio = args.PixelToMeterRatio;
    },
    SetInnerDepth: function(args) {
      var changed = !window.innerDepth || window.innerDepth != args.InnerDepth;
      window.innerDepth = args.InnerDepth;
      if (changed)
        window.dispatchEvent(new CustomEvent('resize'));
    }
  });
}();
window.Alt.Window = Window;

"use strict";
var YouTubeRelatedLinks = function() {
  function YouTubeRelatedLinks() {}
  return ($traceurRuntime.createClass)(YouTubeRelatedLinks, {
    lookup: function(videoId, callback) {
      if (this.__lookupCache && this.__lookupCache[videoId]) {
        return callback(this.__lookupCache[videoId]);
      }
      this.__receiveCallback = function(parseResponse) {
        callback({
          videoId: videoId,
          relatedLinks: parseResponse.relatedLinks
        });
      };
      altspace._internal.callClientFunction("GetYouTubeRelatedLinks", {VideoId: videoId}, {argsType: "GetYouTubeRelatedLinksOptions"});
    },
    preload: function(videoId) {
      var $__2 = this;
      if (!videoId)
        return;
      if (!this.__lookupCache) {
        this.__lookupCache = {};
      }
      if (this.__lookupCache[videoId])
        return;
      this.lookup(videoId, function(response) {
        $__2.__lookupCache[videoId] = response;
      });
    },
    Parse: function(args, callback) {
      var jq = Alt.jQuery;
      var _ = Alt._;
      var links = _.compact(_.map(jq("a").toArray(), function(link) {
        if (jq("img", jq(link)).length == 0)
          return null;
        var href = jq(link).attr("href");
        if (!href.contains("/watch"))
          return null;
        var id = href.match(/[?&]v=([^&$]+)/)[1];
        var recommended = jq(link).parent().parent().html().toLowerCase().indexOf("recommended") >= 0;
        return {
          id: id,
          recommended: recommended
        };
      }));
      callback({relatedLinks: links});
    },
    Receive: function(response) {
      if (this.__receiveCallback) {
        this.__receiveCallback(response);
        this.__receiveCallback = null;
      }
    }
  }, {});
}();
window.Alt.YouTubeRelatedLinks = new YouTubeRelatedLinks();

"use strict";
var NbcSportsPlayer = function() {
  function NbcSportsPlayer() {
    this.height = 715;
    this.width = 1280;
  }
  return ($traceurRuntime.createClass)(NbcSportsPlayer, {
    Init: function(callback) {
      this.HideAdvertisements();
      this.FakeFullscreen();
      if (callback != null) {
        callback();
      }
    },
    FakeFullscreen: function() {
      Alt.$("#nbc-content").css("margin-left", "0px");
      Alt.$("#NBCSportsPlayer").height(this.height);
      Alt.$("#NBCSportsPlayer").width(this.width);
      Alt.$("#content-wrapper").height(this.height);
      Alt.$("#content-wrapper").width(this.width);
      Alt.$("#flash-content-wrapper").height(this.height);
      Alt.$("#flash-content-wrapper").width(this.width);
    },
    HideAdvertisements: function() {
      Alt.$("#nbc-header").hide();
      Alt.$(".live-extra-promo").hide();
      Alt.$(".column-right").hide();
      Alt.$("#nbc-footer").hide();
    },
    WiggleMouse: function() {
      Alt.Display.FireMouseMoveEventAt(250, 250);
      Alt.Display.FireMouseMoveEventAt(300, 300);
    },
    Click: function(x, y) {
      this.WiggleMouse();
      Alt.Display.FireMouseDownEventAt(x, y);
      Alt.Display.FireMouseUpEventAt(x, y);
    },
    Lerp: function(a, b, fraction) {
      return a + (b - a) * fraction;
    },
    ToggleMute: function() {
      var muteButtonX = 151;
      var muteButtonY = this.height - 18;
      this.Click(muteButtonX, muteButtonY);
    },
    setVolume: function(volume) {
      var leftPixel = 161;
      var rightPixel = leftPixel + 55;
      var volumeX = Math.floor(this.Lerp(leftPixel, rightPixel, volume / 100.0));
      var volumeY = this.height - 18;
      this.Click(volumeX, volumeY);
      this.Click(volumeX, volumeY + 13);
    },
    getLandingUrl: function() {
      return document.location.toString();
    },
    loadVideoById: function(videoId, startSeconds) {},
    pauseVideo: function() {},
    playVideo: function() {},
    seekTo: function(startSeconds, jump) {},
    getCurrentTime: function() {
      return 0;
    },
    getDuration: function() {
      return 100000;
    },
    getVideoUrl: function() {
      return document.location.toString();
    },
    getVideoId: function() {
      return "NbcSportsPlayerID";
    },
    getPlayerState: function() {
      return Alt.PlayerState.PLAYING;
    },
    getPlayerType: function() {
      return "NbcSportsPlayer";
    },
    addStateChangeEventListener: function(listener) {},
    getVolume: function() {
      return 100;
    },
    isHtml5Video: function() {
      return false;
    }
  }, {});
}();
window.Alt.NbcSportsPlayer = NbcSportsPlayer;

"use strict";
var NcaaPlayer = function() {
  function NcaaPlayer() {}
  return ($traceurRuntime.createClass)(NcaaPlayer, {
    Init: function(callback) {
      if (callback != null) {
        callback();
      }
    },
    setVolume: function(volume) {
      if (volume > 100)
        volume = 100;
      if (volume < 0)
        volume = 0;
      Alt.Display.FireMouseMoveEventAt(885, 580);
      var lerpedVolumeY = Math.round(560 - (volume / 100.0) * 70);
      setTimeout(function() {
        Alt.Display.Click(885, lerpedVolumeY);
      }, 20);
    },
    getLandingUrl: function() {
      return document.location.toString();
    },
    loadVideoById: function(videoId, startSeconds) {},
    pauseVideo: function() {},
    playVideo: function() {},
    seekTo: function(startSeconds, jump) {},
    getCurrentTime: function() {
      return 0;
    },
    getDuration: function() {
      return 100000;
    },
    getVideoUrl: function() {
      return document.location.toString();
    },
    getVideoId: function() {
      return "NcaaPlayerID";
    },
    getPlayerState: function() {
      return Alt.PlayerState.PLAYING;
    },
    getPlayerType: function() {
      return "NcaaPlayer";
    },
    addStateChangeEventListener: function(listener) {},
    getVolume: function() {
      return 100;
    },
    isHtml5Video: function() {
      return false;
    }
  }, {});
}();
window.Alt.NcaaPlayer = NcaaPlayer;

"use strict";
var NetflixPlayerVisage = function() {
  function NetflixPlayerVisage(netflixPlayer) {
    this.player = netflixPlayer;
    this.changeEventListeners = [];
    this.seekPixelConfig = {
      leftmostRedPixel: 142,
      rightmostRedPixel: 1085,
      seekPixelLength: 1085 - 142,
      seekTopOffset: 585,
      clickOffset: -6
    };
    this.seekOffsetAtLastForcedUpdate = 0;
  }
  return ($traceurRuntime.createClass)(NetflixPlayerVisage, {
    AddChangeEventListener: function(listener) {
      this.changeEventListeners[this.changeEventListeners.length] = listener;
    },
    BeginObserving: function() {
      this.ObserveControlPatch("controlsVisible", 800, 640);
      this.ObserveControlPatch("compatNagVisible", 1090, 90);
      this.ObservePlayButton();
      this.ObserveSeekPosition();
    },
    ObserveControlPatch: function(flagName, x, y) {
      var $__2 = this;
      var captureCount = 0;
      this.ObservePlayerPatch(x, y, 16, 16, function(capture) {
        captureCount += 1;
        var patchVisible = false;
        var isControlPixelColor = function(c) {
          return c >= 30 && c <= 40;
        };
        var firstPixelGrey = isControlPixelColor(capture.Pixels[0]) && isControlPixelColor(capture.Pixels[1]) && isControlPixelColor(capture.Pixels[2]);
        if (firstPixelGrey) {
          var sawNonControlPixel = false;
          Alt.Util.ForEachPixel(capture.Pixels, function(pixel, i) {
            if (Math.abs(pixel[0] - capture.Pixels[0]) > 2 || Math.abs(pixel[1] - capture.Pixels[1]) > 2 || Math.abs(pixel[2] - capture.Pixels[2]) > 2) {
              sawNonControlPixel = true;
            }
            return !sawNonControlPixel;
          });
          if (!sawNonControlPixel) {
            patchVisible = true;
          }
        }
        var newState = {};
        newState[flagName] = patchVisible;
        $__2.UpdatePlayerVisage(newState);
        return true;
      });
    },
    UpdatePlayerVisage: function(newVisage) {
      var $__6 = true;
      var $__7 = false;
      var $__8 = undefined;
      try {
        for (var $__4 = void 0,
            $__3 = (Alt._.keys(newVisage))[Symbol.iterator](); !($__6 = ($__4 = $__3.next()).done); $__6 = true) {
          var k = $__4.value;
          {
            this[k] = newVisage[k];
          }
        }
      } catch ($__9) {
        $__7 = true;
        $__8 = $__9;
      } finally {
        try {
          if (!$__6 && $__3.return != null) {
            $__3.return();
          }
        } finally {
          if ($__7) {
            throw $__8;
          }
        }
      }
      var $__13 = true;
      var $__14 = false;
      var $__15 = undefined;
      try {
        for (var $__11 = void 0,
            $__10 = (this.changeEventListeners)[Symbol.iterator](); !($__13 = ($__11 = $__10.next()).done); $__13 = true) {
          var listener = $__11.value;
          {
            listener(this);
          }
        }
      } catch ($__16) {
        $__14 = true;
        $__15 = $__16;
      } finally {
        try {
          if (!$__13 && $__10.return != null) {
            $__10.return();
          }
        } finally {
          if ($__14) {
            throw $__15;
          }
        }
      }
    },
    ObservePlayerPatch: function(patchX, patchY, patchWidth, patchHeight, callback) {
      Alt.Display.BeginCapturingRect(patchX, patchY, patchWidth, patchHeight, callback);
    },
    ObservePlayButton: function() {
      var $__2 = this;
      var captureCount = 0;
      this.ObservePlayerPatch(152, 630, 5, 5, function(capture) {
        captureCount += 1;
        if ($__2.controlsVisible) {
          var averagePixelColor = Alt.Util.AveragePixelColor(capture.Pixels);
          Alt.Display.GetDisplayIsPersonal(function(displayIsPersonal) {
            if (!displayIsPersonal && !$__2.player.didInitVolume) {
              $__2.player.PushCommand({command: "init_volume"});
            }
          });
          if (averagePixelColor > 4.5) {
            $__2.player.UpdatePlayerState(Alt.PlayerState.PAUSED);
            $__2.UpdatePlayerVisage({
              lastSeenPlayState: Alt.PlayerState.PAUSED,
              lastSeenPauseTime: new Date()
            });
          } else {
            $__2.player.UpdatePlayerState(Alt.PlayerState.PLAYING);
            $__2.UpdatePlayerVisage({
              lastSeenPlayState: Alt.PlayerState.PLAYING,
              lastSeenPlayTime: new Date()
            });
          }
        }
        return true;
      });
    },
    ObserveSeekPosition: function() {
      var $__2 = this;
      var captureCount = 0;
      var $__17 = this.seekPixelConfig,
          leftmostRedPixel = $__17.leftmostRedPixel,
          rightmostRedPixel = $__17.rightmostRedPixel,
          seekPixelLength = $__17.seekPixelLength,
          seekTopOffset = $__17.seekTopOffset;
      this.ObservePlayerPatch(leftmostRedPixel, seekTopOffset, seekPixelLength, 1, function(capture) {
        captureCount += 1;
        if ($__2.controlsVisible) {
          var isRedPixel = function(pixels, offset) {
            return pixels[offset] > 64 && pixels[offset + 1] < 16 && pixels[offset + 2] < 16;
          };
          for (var i = capture.Width * 4 - 4; i >= 0; i -= 4) {
            if (isRedPixel(capture.Pixels, i)) {
              var seekOffset = (i / 4.0) / (seekPixelLength + 1);
              var newVisage = {lastSeenSeekOffset: seekOffset};
              if (!$__2.lastSeenSeekOffsetChangeTime || Math.abs($__2.lastSeenSeekOffset - seekOffset) > 0.00001) {
                newVisage.lastSeenSeekOffsetChangeTime = new Date();
              }
              $__2.UpdatePlayerVisage(newVisage);
              $__2.CheckForLongSeek(newVisage.lastSeenSeekOffset);
              break;
            }
          }
        }
        return true;
      });
    },
    CheckForLongSeek: function(lastSeenSeekOffset) {
      var $__2 = this;
      if (typeof this.displayIsPersonal === 'undefined') {
        Alt.Display.GetDisplayIsPersonal(function(displayIsPersonal) {
          $__2.displayIsPersonal = displayIsPersonal;
          $__2.ForcePlayerStateUpdateOnLongSeek(lastSeenSeekOffset);
        });
      }
      this.ForcePlayerStateUpdateOnLongSeek(lastSeenSeekOffset);
    },
    ForcePlayerStateUpdateOnLongSeek: function(lastSeenSeekOffset) {
      if (!this.displayIsPersonal)
        return;
      var longSeekThresholdInSeconds = 15.0;
      var seekLengthInSeconds = this.player.getDuration() * Math.abs(this.seekOffsetAtLastForcedUpdate - lastSeenSeekOffset);
      if (seekLengthInSeconds > longSeekThresholdInSeconds) {
        console.log(("Forcing update for seek (or video played for > " + longSeekThresholdInSeconds + " seconds)."));
        this.seekOffsetAtLastForcedUpdate = lastSeenSeekOffset;
        this.player.ForceUpdatePlayerState();
      }
    },
    WriteImage: function(pngBase64, filename) {
      var opts = {};
      opts.__Type = "WriteImageOptions";
      opts.PngBase64 = pngBase64;
      opts.Filename = filename;
      window.engine.call("WriteImage", opts);
    }
  }, {});
}();
window.Alt.NetflixPlayerVisage = NetflixPlayerVisage;

"use strict";
var NetflixPlayer = function() {
  function NetflixPlayer() {
    this.playerVisage = new NetflixPlayerVisage(this);
    this.playerState = Alt.PlayerState.UNSTARTED;
    this.stateChangeEventListeners = [];
    this.lastControlClickFlipFlop = false;
    this.currentVolume = 0;
    this.commandQueue = [];
    this.ProcessCommandQueue();
    this.volumeSlideTimeout = null;
  }
  return ($traceurRuntime.createClass)(NetflixPlayer, {
    Init: function(callback) {
      var $__2 = this;
      this.lastClickAmount = 0;
      this.initCallback = callback;
      this.isPC = navigator.appVersion.indexOf("Mac") == -1;
      this.didInitVolume = false;
      this.currentSetVolume = -1;
      this.clickCount = 0;
      this.playerVisage.AddChangeEventListener(function(visage) {
        if (visage.controlsVisible && $__2.initCallback) {
          Alt.$("#SLPlayer").focus();
          var initCallback = $__2.initCallback;
          $__2.initCallback = null;
          initCallback();
        }
      });
      this.playerVisage.AddChangeEventListener(function(visage) {
        if (visage.compatNagVisible) {
          $__2.PushCommand({command: "close_nag"});
        }
      });
      this.playerVisage.BeginObserving();
      this.LoadClipMetadata();
      Alt.$("#SLPlayer").append("<param name=\"windowless\" value=\"true\"/>");
    },
    LoadClipMetadata: function() {
      var $__18,
          $__19;
      var $__2 = this;
      var playerConfigPairs = Alt.$("#SLPlayer param[name='initParams']").attr("value").split(",");
      this.playerConfig = {};
      var $__6 = true;
      var $__7 = false;
      var $__8 = undefined;
      try {
        for (var $__4 = void 0,
            $__3 = (playerConfigPairs)[Symbol.iterator](); !($__6 = ($__4 = $__3.next()).done); $__6 = true) {
          var pair = $__4.value;
          {
            var $__17 = pair.split("="),
                k = ($__18 = $__17[Symbol.iterator](), ($__19 = $__18.next()).done ? void 0 : $__19.value),
                v = ($__19 = $__18.next()).done ? void 0 : $__19.value;
            this.playerConfig[k] = v;
          }
        }
      } catch ($__9) {
        $__7 = true;
        $__8 = $__9;
      } finally {
        try {
          if (!$__6 && $__3.return != null) {
            $__3.return();
          }
        } finally {
          if ($__7) {
            throw $__8;
          }
        }
      }
      var esnUrl = this.playerConfig.EsnUrl;
      var metadataUrlBase = esnUrl.substring(esnUrl.indexOf("https"), esnUrl.indexOf("esn"));
      var metadataUrl = (metadataUrlBase + "metadata?movieid=" + this.getStrippedVideoId());
      Alt.$.ajax({
        dataType: "json",
        url: metadataUrl,
        xhrFields: {withCredentials: true},
        success: function(metadata) {
          $__2.clipMetadata = metadata;
        }
      });
    },
    InitVolume: function(callback) {
      var $__2 = this;
      this.didInitVolume = true;
      var count = 0;
      var startingAttenuation = function() {
        if ((count < 10 && !$__2.isPC) || (count < 20 && $__2.isPC)) {
          count++;
          if ($__2.isPC) {
            Alt.Display.PressKey(40);
            setTimeout(startingAttenuation, 20);
          } else {
            Alt.Display.Click(226, 510, startingAttenuation);
          }
        } else {
          Alt.Display.Click(10, 11);
          callback();
        }
      };
      Alt.Display.Click(226, 600, startingAttenuation);
    },
    UpdateVolumeThen: function(callback) {
      var $__2 = this;
      var changeVolume = (Number(this.currentVolume) != Number(this.currentSetVolume));
      if (changeVolume) {
        this.currentSetVolume = this.currentSetVolume < 0 ? 0 : this.currentSetVolume;
        var endShiftVolume = this.currentVolume;
        var startPoint = 0;
        var endPoint = 0;
        var diffPresses = 0;
        var direction = 0;
        if (this.isPC) {
          endPoint = Math.round(20.0 * this.currentVolume / 100);
          startPoint = Math.round(20.0 * this.currentSetVolume / 100);
          diffPresses = endPoint - startPoint;
          direction = (diffPresses < 0.0 ? -1 : 1);
          diffPresses = Math.abs(diffPresses);
          if ((endPoint == 0 || endPoint == 20) && diffPresses > 0) {
            diffPresses += 5;
          }
        } else {
          startPoint = Math.round(510 - (this.currentSetVolume / 100 * 110));
          endPoint = Math.round(510 - (this.currentVolume / 100 * 110));
        }
        Alt.Display.Click(226, 600, function() {
          if ($__2.isPC) {
            var count = 0;
            var step = function() {
              if (count < diffPresses) {
                Alt.Display.PressKey((direction < 0) ? 40 : 38);
                count++;
                setTimeout(step, 20);
              } else {
                Alt.Display.Click(10, 10, function() {
                  $__2.currentSetVolume = Number(endShiftVolume);
                  callback();
                });
              }
            };
            step();
          } else {
            var currentBarOffset = Math.floor(9 * ($__2.currentSetVolume / 100.0));
            var targetBarOffset = Math.floor(9 * ($__2.currentVolume / 100.0));
            var barDifferential = currentBarOffset - targetBarOffset;
            var step = function() {
              if (barDifferential < 0) {
                barDifferential += 1;
                Alt.Display.Click(226, 400, step);
              } else if (barDifferential > 0) {
                barDifferential -= 1;
                Alt.Display.Click(226, 510, step);
              } else {
                Alt.Display.Click(10, 10, function() {
                  $__2.currentSetVolume = Number(endShiftVolume);
                  callback();
                });
              }
            };
            step();
          }
        });
      } else {
        callback();
      }
    },
    UpdatePlayerState: function(playerState) {
      var previousState = this.playerState;
      this.playerState = playerState;
      if (previousState != this.playerState) {
        var $__6 = true;
        var $__7 = false;
        var $__8 = undefined;
        try {
          for (var $__4 = void 0,
              $__3 = (this.stateChangeEventListeners)[Symbol.iterator](); !($__6 = ($__4 = $__3.next()).done); $__6 = true) {
            var listener = $__4.value;
            {
              listener(this.playerState);
            }
          }
        } catch ($__9) {
          $__7 = true;
          $__8 = $__9;
        } finally {
          try {
            if (!$__6 && $__3.return != null) {
              $__3.return();
            }
          } finally {
            if ($__7) {
              throw $__8;
            }
          }
        }
      }
    },
    ForceUpdatePlayerState: function() {
      var $__6 = true;
      var $__7 = false;
      var $__8 = undefined;
      try {
        for (var $__4 = void 0,
            $__3 = (this.stateChangeEventListeners)[Symbol.iterator](); !($__6 = ($__4 = $__3.next()).done); $__6 = true) {
          var listener = $__4.value;
          {
            listener(this.playerState);
          }
        }
      } catch ($__9) {
        $__7 = true;
        $__8 = $__9;
      } finally {
        try {
          if (!$__6 && $__3.return != null) {
            $__3.return();
          }
        } finally {
          if ($__7) {
            throw $__8;
          }
        }
      }
    },
    TriggerControlsThen: function(callback) {
      return this.TriggerControlsWithEventTypeAndThen("Move", callback);
    },
    TriggerControlsViaClickAndThen: function(callback) {
      return this.TriggerControlsWithEventTypeAndThen("Click", callback);
    },
    TriggerControlsWithEventTypeAndThen: function(eventType, callback) {
      var x = 10;
      var y = this.lastControlClickFlipFlop ? 10 : 11;
      this.lastControlClickFlipFlop = !this.lastControlClickFlipFlop;
      if (eventType == "Click") {
        Alt.Display.Click(x, y);
      } else {
        Alt.Display.FireMouseMoveEventAt(x, y);
      }
      if (callback) {
        return setTimeout(callback, 500);
      }
    },
    ProcessCommandQueue: function() {
      var $__2 = this;
      if (this.commandQueue.length == 0) {
        setTimeout(function() {
          $__2.ProcessCommandQueue();
        }, 250);
        return;
      }
      var next = function() {
        $__2.ProcessCommandQueue();
      };
      var command = this.commandQueue.shift();
      if (command.command == "pause" || command.command == "play") {
        this.DoPausePlayCommandThen(next);
      } else if (command.command == "seek") {
        this.DoSeekCommandThen(command.seconds, next);
      } else if (command.command == "init_volume") {
        this.DoInitVolumeCommandThen(next);
      } else if (command.command == "update_volume") {
        this.UpdateVolumeThen(next);
      } else if (command.command == "close_nag") {
        Alt.Display.Click(1200, 130, next);
      }
    },
    DoPausePlayCommandThen: function(next) {
      var $__2 = this;
      this.TriggerControlsThen(function() {
        var stateToCheck = command.command == "pause" ? Alt.PlayerState.PLAYING : Alt.PlayerState.PAUSED;
        if ($__2.playerVisage.lastSeenPlayState == stateToCheck) {
          Alt.Display.Click(152, 630, next);
        } else {
          next();
        }
      });
    },
    DoSeekCommandThen: function(commandSeconds, next) {
      var $__2 = this;
      this.TriggerControlsThen(function() {
        var $__17 = $__2.playerVisage.seekPixelConfig,
            leftmostRedPixel = $__17.leftmostRedPixel,
            rightmostRedPixel = $__17.rightmostRedPixel,
            seekPixelLength = $__17.seekPixelLength,
            seekTopOffset = $__17.seekTopOffset,
            clickOffset = $__17.clickOffset;
        var latencySeconds = 4;
        var percentToSeek = (commandSeconds + latencySeconds) * 1.0 / $__2.getDuration();
        var seekPixel = leftmostRedPixel + (percentToSeek * (seekPixelLength + 1)) + clickOffset;
        Alt.Display.Click(Math.floor(seekPixel), Math.floor(seekTopOffset), function() {
          $__2.TriggerControlsThen(next);
        });
      });
    },
    DoInitVolumeCommandThen: function(next) {
      var $__2 = this;
      this.InitVolume(function() {
        setInterval(function() {
          $__2.PushCommand({command: "update_volume"});
        }, 1000);
        next();
      });
    },
    PushCommand: function(command) {
      this.commandQueue[this.commandQueue.length] = command;
    },
    getLandingUrl: function() {
      return this.getVideoUrl();
    },
    loadVideoById: function(videoId, startSeconds) {
      if (this.getVideoId() == videoId) {
        this.seekTo(startSeconds, true);
      } else {
        document.location = this.getVideoUrlForVideoId(videoId);
      }
    },
    pauseVideo: function() {
      this.PushCommand({command: "pause"});
    },
    playVideo: function() {
      this.PushCommand({command: "play"});
    },
    seekTo: function(startSeconds, jump) {
      this.PushCommand({
        command: "seek",
        seconds: startSeconds
      });
    },
    getCurrentTime: function() {
      var seekOffset = 0.0;
      var extraDurationMs = 0;
      if (this.playerVisage.lastSeenSeekOffset) {
        seekOffset = this.playerVisage.lastSeenSeekOffset;
        if (this.playerVisage.lastSeenPlayState == Alt.PlayerState.PLAYING) {
          extraDurationMs = (new Date()) - this.playerVisage.lastSeenSeekOffsetChangeTime;
        }
      }
      var fudgeFactor = -1.0;
      return (seekOffset * this.getDuration()) + (extraDurationMs / 1000.0) + fudgeFactor;
    },
    getDuration: function() {
      if (this.clipMetadata && this.clipMetadata.video) {
        if (this.clipMetadata.video.runtime) {
          return this.clipMetadata.video.runtime;
        } else if (this.clipMetadata.video.seasons) {
          var $__13 = true;
          var $__14 = false;
          var $__15 = undefined;
          try {
            for (var $__11 = void 0,
                $__10 = (this.clipMetadata.video.seasons)[Symbol.iterator](); !($__13 = ($__11 = $__10.next()).done); $__13 = true) {
              var season = $__11.value;
              {
                var $__6 = true;
                var $__7 = false;
                var $__8 = undefined;
                try {
                  for (var $__4 = void 0,
                      $__3 = (season.episodes)[Symbol.iterator](); !($__6 = ($__4 = $__3.next()).done); $__6 = true) {
                    var episode = $__4.value;
                    {
                      if (episode.id == this.playerConfig.EpisodeMovieId) {
                        return episode.runtime;
                      }
                    }
                  }
                } catch ($__9) {
                  $__7 = true;
                  $__8 = $__9;
                } finally {
                  try {
                    if (!$__6 && $__3.return != null) {
                      $__3.return();
                    }
                  } finally {
                    if ($__7) {
                      throw $__8;
                    }
                  }
                }
              }
            }
          } catch ($__16) {
            $__14 = true;
            $__15 = $__16;
          } finally {
            try {
              if (!$__13 && $__10.return != null) {
                $__10.return();
              }
            } finally {
              if ($__14) {
                throw $__15;
              }
            }
          }
        }
      }
      Alt.Log("Warning: clip duration not found. Setting to default value");
      return 1320.0;
    },
    getVideoUrl: function() {
      return this.getVideoUrlForVideoId(this.getVideoId());
    },
    getVideoUrlForVideoId: function(videoId) {
      var idPairs = videoId.split(",");
      return ("http://www.netflix.com/watch/" + idPairs[0]);
    },
    getStrippedVideoId: function() {
      var movieId = this.playerConfig.MovieId;
      if (typeof(this.playerConfig.EpisodeMovieId) !== "undefined" && this.playerConfig.EpisodeMovieId != "0") {
        movieId = this.playerConfig.EpisodeMovieId;
      }
      return ("" + movieId);
    },
    getVideoId: function() {
      var movieId = this.playerConfig.MovieId;
      if (typeof(this.playerConfig.EpisodeMovieId) !== "undefined" && this.playerConfig.EpisodeMovieId != "0") {
        movieId = this.playerConfig.EpisodeMovieId;
      }
      if (typeof(this.playerConfig.TrackId) !== "undefined") {
        return (movieId + "," + this.playerConfig.TrackId);
      } else {
        return ("" + movieId);
      }
    },
    getPlayerState: function() {
      return this.playerState;
    },
    addStateChangeEventListener: function(listener) {
      this.stateChangeEventListeners[this.stateChangeEventListeners.length] = listener;
    },
    getPlayerType: function() {
      return "Netflix";
    },
    getVolume: function() {},
    setVolume: function(volume, fadeTime) {
      if (volume < 0) {
        volume = 0;
      }
      if (volume > 100) {
        volume = 100;
      }
      this.currentVolume = volume;
    },
    isHtml5Video: function() {
      return false;
    }
  }, {});
}();
window.Alt.NetflixPlayer = NetflixPlayer;

"use strict";
var SxswPlayer = function() {
  function SxswPlayer() {}
  return ($traceurRuntime.createClass)(SxswPlayer, {
    Init: function(callback) {
      var player = Alt.$("[type='application/x-shockwave-flash']");
      player.css("width", "100%").css("height", "100%").css("position", "absolute").prependTo(Alt.$("body"));
      Alt.$("div").css("display", "none");
      if (callback != null) {
        callback();
      }
    },
    setVolume: function(volume) {
      if (volume > 100)
        volume = 100;
      if (volume < 0)
        volume = 0;
      Alt.Display.FireMouseMoveEventAt(1020, 688);
      var lerpedVolumeY = Math.round(650 - (volume / 100.0) * 30);
      setTimeout(function() {
        Alt.Display.Click(1020, lerpedVolumeY);
      }, 20);
    },
    getLandingUrl: function() {
      return document.location.toString();
    },
    loadVideoById: function(videoId, startSeconds) {},
    pauseVideo: function() {},
    playVideo: function() {},
    seekTo: function(startSeconds, jump) {},
    getCurrentTime: function() {
      return 0;
    },
    getDuration: function() {
      return 100000;
    },
    getVideoUrl: function() {
      return document.location.toString();
    },
    getVideoId: function() {
      return "SxswPlayerID";
    },
    getPlayerState: function() {
      return Alt.PlayerState.PLAYING;
    },
    getPlayerType: function() {
      return "SxswPlayer";
    },
    addStateChangeEventListener: function(listener) {},
    getVolume: function() {
      return 100;
    }
  }, {});
}();
window.Alt.SxswPlayer = SxswPlayer;

"use strict";
var TwitchHtml5Player = function() {
  function TwitchHtml5Player() {}
  return ($traceurRuntime.createClass)(TwitchHtml5Player, {
    Init: function(callback) {
      var $__1 = this;
      if (callback != null) {
        callback();
      }
      if (navigator.userAgent.indexOf('Mobile') !== -1) {
        var tryPlay = function() {
          if (Alt.$(".player-button-play")[0]) {
            setTimeout(function() {
              return $__1.playVideo();
            }, 7000);
          } else {
            setTimeout(tryPlay, 1000);
          }
        };
      }
      tryPlay();
    },
    setVolume: function(volume) {
      if (volume < 0) {
        volume = 0;
      } else if (volume > 100) {
        volume = 100;
      }
      Alt.$("video")[0].volume = volume / 100.0;
    },
    getLandingUrl: function() {
      return document.location.toString();
    },
    loadVideoById: function(videoId, startSeconds) {},
    isHtml5Video: function() {
      return true;
    },
    pauseVideo: function() {
      Alt.$("video")[0].pause();
    },
    playVideo: function() {
      Alt.$(".player-button-play")[0].click();
    },
    seekTo: function(startSeconds, jump) {},
    getCurrentTime: function() {
      return 0;
    },
    getDuration: function() {
      return 100000;
    },
    getVideoUrl: function() {
      return document.location.toString();
    },
    getVideoId: function() {
      return document.location.pathname;
    },
    getPlayerState: function() {
      return Alt.PlayerState.PLAYING;
    },
    getPlayerType: function() {
      return "TwitchHtml5Player";
    },
    addStateChangeEventListener: function(listener) {},
    getVolume: function() {
      return this.volume;
    }
  }, {});
}();
window.Alt.TwitchHtml5Player = TwitchHtml5Player;

"use strict";
var TwitchPlayer = function() {
  function TwitchPlayer() {}
  return ($traceurRuntime.createClass)(TwitchPlayer, {
    Init: function(callback) {
      if (callback != null) {
        callback();
      }
      this.volume = 0;
      this.isArchivedVideo = (document.location.pathname.search("c/") > -1);
      Alt.Display.GetDisplayIsPersonal(function(displayIsPersonal) {
        if (!displayIsPersonal && $(".dynamic-player").size() > 0) {
          Alt.$("#left_col").remove();
          Alt.$("#right_col").remove();
          Alt.$("#main_col").css({margin: 0});
          Alt.$("#channel").css({
            margin: 0,
            padding: 0
          });
          Alt.$("#new-user-prompt").remove();
          Alt.$(".clearfix.upsell-banner").hide();
          Alt.$("#broadcast-meta").remove();
          Alt.$("style").each(function(e, styleBlock) {
            styleBlock.remove();
          });
          Alt.$(".no-boxart").css("padding", 0);
          Alt.$("#player .player").css("height", 720);
          if (Alt.$(".player-video video").size() > 0) {
            Alt.$(".player-video video")[0].play();
          }
          Alt.$("button.js-player-mature-accept").click();
          if ($("#mature-link").size() > 0) {
            $("#mature-link").click();
          } else {
            $("#message-container").on("DOMNodeInserted", function(e) {
              if (e.target.id == "mature-link") {
                e.click();
              }
            });
          }
        }
      });
    },
    setVolume: function(volume) {
      if (volume < 0) {
        volume = 0;
      } else if (volume > 100) {
        volume = 100;
      }
      var minVolumeXPixel = 61,
          maxVolumeXPixel = 146;
      var lerpVar = volume / 100.0;
      var clickXPixel = Math.floor(minVolumeXPixel + (maxVolumeXPixel - minVolumeXPixel) * lerpVar);
      Alt.Display.Click(clickXPixel, 700);
      this.volume = volume;
    },
    getLandingUrl: function() {
      return document.location.toString();
    },
    loadVideoById: function(videoId, startSeconds) {
      Alt.Log("incoming video ID" + videoId + ", current: " + document.location.pathname);
      if (document.location.pathname !== videoId) {
        document.location = "http://www.twitch.tv" + videoId;
        var minPlayHeadPixel = 2;
        var maxPlayHeadPixel = 1265;
      }
    },
    isHtml5Video: function() {
      return true;
    },
    pauseVideo: function() {},
    playVideo: function() {},
    seekTo: function(startSeconds, jump) {},
    getCurrentTime: function() {
      return 0;
    },
    getDuration: function() {
      return 100000;
    },
    getVideoUrl: function() {
      return document.location.toString();
    },
    getVideoId: function() {
      return document.location.pathname;
    },
    getPlayerState: function() {
      return Alt.PlayerState.PLAYING;
    },
    getPlayerType: function() {
      return "TwitchPlayer";
    },
    addStateChangeEventListener: function(listener) {},
    getVolume: function() {
      return this.volume;
    }
  }, {});
}();
window.Alt.TwitchPlayer = TwitchPlayer;

"use strict";
var YouTubePlayer = function() {
  function YouTubePlayer(player) {
    this.player = player;
  }
  return ($traceurRuntime.createClass)(YouTubePlayer, {
    Init: function(callback) {
      var $__2 = this;
      var isAltYouTube = window.AltYouTubePage;
      if (isAltYouTube) {
        var playerParent = Alt.$(this.player).parent();
        var embed = Alt.$(this.player).remove();
        embed.attr({
          wmode: "opaque",
          allowFullScreen: "false"
        });
        var checkForPlayerReady = function() {
          if (embed[0].getPlayerState) {
            callback();
          } else {
            setTimeout(checkForPlayerReady, 500);
          }
        };
        checkForPlayerReady();
        playerParent.append(embed);
        Alt.Display.GetDisplayIsPersonal(function(displayIsPersonal) {
          if (!displayIsPersonal) {
            $__2.addStateChangeEventListener(function(state) {
              var wasExplicitlyPaused = typeof($__2.explicitlyPaused) !== "undefined";
              var isPaused = state == Alt.PlayerState.PAUSED;
              var wasAutomaticallyPaused = isPaused && !wasExplicitlyPaused;
              if (wasAutomaticallyPaused) {
                $__2.playVideo();
              }
            });
          }
        });
      } else {
        callback();
      }
    },
    getLandingUrl: function() {
      return "https://altvr-distro.azureedge.net/youtube.html?id=" + this.getVideoId();
    },
    loadVideoById: function(videoId, startSeconds) {
      var result = this.player.loadPlaylist([videoId], 0, startSeconds);
      this.player.setLoop(true);
      return result;
    },
    pauseVideo: function() {
      this.explicitlyPaused = true;
      return this.player.pauseVideo();
    },
    playVideo: function() {
      delete this.explicitlyPaused;
      return this.player.playVideo();
    },
    seekTo: function(startSeconds, jump) {
      return this.player.seekTo(startSeconds, jump);
    },
    getCurrentTime: function() {
      return this.player.getCurrentTime();
    },
    getDuration: function() {
      return this.player.getDuration();
    },
    getVideoUrl: function() {
      if (this.player.getAdState && this.player.getAdState() == 1) {
        return undefined;
      }
      return this.player.getVideoUrl();
    },
    getVideoId: function() {
      var $__4,
          $__5;
      if (this.getVideoUrl().match(/(?:\?|&)v=([^&]+)/i)) {
        var $__3 = this.getVideoUrl().match(/(?:\?|&)v=([^&]+)/i),
            qs = ($__4 = $__3[Symbol.iterator](), ($__5 = $__4.next()).done ? void 0 : $__5.value),
            videoId = ($__5 = $__4.next()).done ? void 0 : $__5.value;
      }
      return videoId;
    },
    getPlayerState: function() {
      return this.player.getPlayerState();
    },
    getPlayerType: function() {
      return "YouTube";
    },
    isHtml5Video: function() {
      return true;
    },
    addStateChangeEventListener: function(listener) {
      return this.player.addEventListener("onStateChange", function(obj) {
        if (obj.data !== undefined) {
          listener(obj.data);
        } else {
          listener(obj);
        }
      });
    },
    getVolume: function() {
      return this.player.getVolume();
    },
    setVolume: function(volume, fadeTime) {
      this.player.setVolume(volume);
      return;
    }
  }, {});
}();
window.Alt.YouTubePlayer = YouTubePlayer;

"use strict";
var NbcSportsPlayerDetector = function() {
  function NbcSportsPlayerDetector() {
    this.name = "NBC Sports Player Detector";
  }
  return ($traceurRuntime.createClass)(NbcSportsPlayerDetector, {
    IsPlayerDetected: function() {
      return (window.document.getElementById("NBCSportsPlayer") != null);
    },
    GetPlayer: function() {
      return new Alt.NbcSportsPlayer();
    }
  }, {});
}();
Alt.NbcSportsPlayerDetector = NbcSportsPlayerDetector;

"use strict";
var NcaaPlayerDetector = function() {
  function NcaaPlayerDetector() {
    this.name = "NCAA Player Detector";
  }
  return ($traceurRuntime.createClass)(NcaaPlayerDetector, {
    IsPlayerDetected: function() {
      return window.document.title.contains("NCAA March Madness Live") && Alt.$("[type='application/x-shockwave-flash']").length > 0;
    },
    GetPlayer: function() {
      return new Alt.NcaaPlayer();
    }
  }, {});
}();
Alt.NcaaPlayerDetector = NcaaPlayerDetector;

"use strict";
var NetflixPlayerDetector = function() {
  function NetflixPlayerDetector() {
    this.name = "Netflix Player Detector";
  }
  return ($traceurRuntime.createClass)(NetflixPlayerDetector, {
    IsPlayerDetected: function() {
      if (!window.netflix)
        return false;
      var hasSilverLight = window.netflix.silverlight || (window.netflix.Silverlight && window.netflix.Silverlight.MoviePlayer);
      return (Alt.$("#SLPlayer").length > 0) && hasSilverLight;
    },
    GetPlayer: function() {
      return new Alt.NetflixPlayer();
    }
  }, {});
}();
Alt.NetflixPlayerDetector = NetflixPlayerDetector;

"use strict";
var SxswPlayerDetector = function() {
  function SxswPlayerDetector() {
    this.name = "Sxsw Player Detector";
  }
  return ($traceurRuntime.createClass)(SxswPlayerDetector, {
    IsPlayerDetected: function() {
      window.document.title.contains("SXSW ON");
    },
    GetPlayer: function() {
      return new Alt.SxswPlayer();
    }
  }, {});
}();
Alt.SxswPlayerDetector = SxswPlayerDetector;

"use strict";
var TwitchPlayerDetector = function() {
  function TwitchPlayerDetector() {
    this.name = "Twitch Player Detector";
  }
  return ($traceurRuntime.createClass)(TwitchPlayerDetector, {
    RedirectIfFlash: function() {
      if (this.IsFlashPlayerDetected() && !this.IsDirectoryPage()) {
        var channel = location.href.substring(location.href.lastIndexOf("/") + 1);
        location.href = "http://player.twitch.tv/?channel=" + channel + "&html5";
      }
    },
    IsFlashPlayerDetected: function() {
      return window.document.title.contains("Twitch") && Alt.$(".dynamic-player").length > 0;
    },
    IsPlayerDetected: function() {
      this.RedirectIfFlash();
      return this.IsHtml5PlayerDetected();
    },
    IsHtml5PlayerDetected: function() {
      return window.document.title.contains("Twitch") && location.href.contains("html5");
    },
    IsDirectoryPage: function() {
      return location.href.contains("directory");
    },
    GetPlayer: function() {
      this.RedirectIfFlash();
      if (this.IsHtml5PlayerDetected()) {
        return new Alt.TwitchHtml5Player();
      }
    }
  }, {});
}();
Alt.TwitchPlayerDetector = TwitchPlayerDetector;

"use strict";
var YoutubePlayerDetector = function() {
  function YoutubePlayerDetector() {
    this.name = "Youtube Player Detector";
  }
  return ($traceurRuntime.createClass)(YoutubePlayerDetector, {
    IsPlayerDetected: function() {
      return this.HasCapturedYouTubePlayer() || this.IsAltYouTubePage();
    },
    HasCapturedYouTubePlayer: function() {
      return window.Alt.CapturedYouTubePlayer;
    },
    IsAltYouTubePage: function() {
      return window.AltYouTubePage && !window.AltYouTubePageInitialized;
    },
    GetPlayer: function() {
      if (this.HasCapturedYouTubePlayer()) {
        return this.GetPlayerFromCaptured();
      }
      if (this.IsAltYouTubePage()) {
        return this.GetInjectedPlayer();
      }
    },
    GetPlayerFromCaptured: function() {
      return new Alt.YouTubePlayer(window.Alt.CapturedYouTubePlayer);
    },
    GetInjectedPlayer: function() {
      window.AltYouTubePageInitialized = true;
      var tag = document.createElement('script');
      tag.src = "https://www.youtube.com/iframe_api";
      var firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
      window.onYouTubeIframeAPIReady = function() {
        var player = new YT.Player('player', {
          height: '720',
          width: '1280',
          events: {'onReady': function(event) {
              window.Alt.CapturedYouTubePlayer = event.target;
            }}
        });
      };
    }
  }, {});
}();
Alt.YoutubePlayerDetector = YoutubePlayerDetector;
