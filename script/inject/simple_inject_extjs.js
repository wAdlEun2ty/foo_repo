function enableStealthRequestLogger() {
    const styleTitle = 'color: white; background: #007acc; padding: 2px 4px; border-radius: 3px;';
    const styleKey = 'color: #ffcc00;';
    const styleVal = 'color: #00ff99;';
    
    function logGroup(title, data) {
        console.group(`%c${title}`, styleTitle);
        for (const [k, v] of Object.entries(data)) {
            console.log(`%c${k}:`, styleKey, v);
        }
        console.groupEnd();
    }

    // ---- FETCH ----
    const origFetch = window.fetch;
    window.fetch = new Proxy(origFetch, {
        apply(target, thisArg, args) {
            logGroup('FETCH Request', {
                URL: args[0],
                Options: args[1]
            });
            return Reflect.apply(target, thisArg, args).then(res => {
                res.clone().text().then(txt => {
                    logGroup('FETCH Response', {
                        URL: args[0],
                        Status: res.status,
                        Body: txt
                    });
                });
                return res;
            });
        }
    });
    window.fetch.toString = () => "function fetch() { [native code] }";

    // ---- XHR ----
    const origOpen = XMLHttpRequest.prototype.open;
    const origSend = XMLHttpRequest.prototype.send;
    XMLHttpRequest.prototype.open = function (method, url, ...rest) {
        this._method = method;
        this._url = url;
        return origOpen.apply(this, [method, url, ...rest]);
    };
    XMLHttpRequest.prototype.send = function (body) {
        logGroup('XHR Request', {
            Method: this._method,
            URL: this._url,
            Body: body
        });
        this.addEventListener('load', function () {
            logGroup('XHR Response', {
                URL: this._url,
                Status: this.status,
                Response: this.responseText
            });
        });
        return origSend.apply(this, [body]);
    };

    // ---- sendBeacon ----
    const origBeacon = navigator.sendBeacon;
    navigator.sendBeacon = function (url, data) {
        logGroup('sendBeacon', { URL: url, Data: data });
        return origBeacon.apply(this, arguments);
    };
    navigator.sendBeacon.toString = () => "function sendBeacon() { [native code] }";

    // ---- WebSocket ----
    const origWS = window.WebSocket;
    window.WebSocket = function (url, protocols) {
        const ws = new origWS(url, protocols);
        logGroup('WebSocket Connect', { URL: url, Protocols: protocols });
        ws.addEventListener('message', e => {
            logGroup('WebSocket Message IN', { Data: e.data });
        });
        const origSendWS = ws.send;
        ws.send = function (data) {
            logGroup('WebSocket Message OUT', { Data: data });
            return origSendWS.apply(this, arguments);
        };
        return ws;
    };
    window.WebSocket.toString = () => "function WebSocket() { [native code] }";

    // ---- EventSource (SSE) ----
    const origES = window.EventSource;
    window.EventSource = function (url, config) {
        const es = new origES(url, config);
        logGroup('EventSource Connect', { URL: url });
        es.addEventListener('message', e => {
            logGroup('SSE Message', { Data: e.data });
        });
        return es;
    };
    window.EventSource.toString = () => "function EventSource() { [native code] }";

    console.log("%c[Stealth Full Request Logger ENABLED]", "color: lime; font-weight: bold;");
}
