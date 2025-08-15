(function() {
    // ===== KONFIGURASI LOGGER =====
    const LOGGER_ENABLED = true;
    const MAX_LOG_LENGTH = 2000;  // Batas karakter untuk log body
    const IGNORED_URLS = [
        'favicon.ico',
        '.css',
        '.jpg',
        '.png',
        '.woff',
        '.ttf'
    ];

    // ===== UTILITY FUNCTIONS =====
    function shouldIgnore(url) {
        return IGNORED_URLS.some(ignored => url.includes(ignored));
    }

    function truncate(data) {
        if (typeof data !== 'string') return data;
        return data.length > MAX_LOG_LENGTH 
            ? data.substring(0, MAX_LOG_LENGTH) + '...' 
            : data;
    }

    function createLogger(title, bgColor) {
        return function(data) {
            if (!LOGGER_ENABLED) return;
            
            const styleTitle = `color: white; background: ${bgColor}; padding: 2px 4px; border-radius: 3px;`;
            const styleKey = 'color: #ffcc00;';
            
            console.groupCollapsed(`%c${title}`, styleTitle);
            for (const [key, value] of Object.entries(data)) {
                console.log(`%c${key}:`, styleKey, truncate(value));
            }
            console.groupEnd();
        };
    }

    // ===== LOGGER INSTANCES =====
    const logFetchRequest = createLogger('FETCH Request', '#007acc');
    const logFetchResponse = createLogger('FETCH Response', '#009688');
    const logXHRRequest = createLogger('XHR Request', '#673ab7');
    const logXHRResponse = createLogger('XHR Response', '#9c27b0');
    const logBeacon = createLogger('sendBeacon', '#ff5722');
    const logWSConnect = createLogger('WebSocket Connect', '#795548');
    const logWSMessageIn = createLogger('WebSocket Message IN', '#4caf50');
    const logWSMessageOut = createLogger('WebSocket Message OUT', '#ff9800');
    const logSSE = createLogger('SSE Message', '#e91e63');

    // ===== CORE LOGGING MECHANISMS =====
    try {
        // ---- FETCH ----
        const origFetch = window.fetch;
        window.fetch = async function(...args) {
            const [url, options] = args;
            
            if (!shouldIgnore(url)) {
                logFetchRequest({
                    URL: url,
                    Method: options?.method || 'GET',
                    Headers: options?.headers,
                    Body: options?.body
                });
            }

            try {
                const response = await origFetch.apply(this, args);
                
                if (!shouldIgnore(url)) {
                    const clone = response.clone();
                    try {
                        const text = await clone.text();
                        logFetchResponse({
                            URL: url,
                            Status: response.status,
                            Headers: Object.fromEntries(clone.headers.entries()),
                            Body: text
                        });
                    } catch (e) {
                        logFetchResponse({
                            URL: url,
                            Status: response.status,
                            Note: 'Non-text response'
                        });
                    }
                }
                
                return response;
            } catch (error) {
                if (!shouldIgnore(url)) {
                    logFetchResponse({
                        URL: url,
                        Error: error.message
                    });
                }
                throw error;
            }
        };

        // ---- XHR ----
        const origOpen = XMLHttpRequest.prototype.open;
        const origSend = XMLHttpRequest.prototype.send;
        
        XMLHttpRequest.prototype.open = function(method, url) {
            this._xhrData = { method, url };
            return origOpen.apply(this, arguments);
        };
        
        XMLHttpRequest.prototype.send = function(body) {
            const xhr = this;
            const { method, url } = this._xhrData || {};
            
            if (!shouldIgnore(url)) {
                logXHRRequest({
                    Method: method,
                    URL: url,
                    Body: body
                });
                
                xhr.addEventListener('load', function() {
                    logXHRResponse({
                        URL: url,
                        Status: xhr.status,
                        Response: xhr.responseText
                    });
                });
                
                xhr.addEventListener('error', function() {
                    logXHRResponse({
                        URL: url,
                        Status: 'ERROR',
                        Error: 'Network error'
                    });
                });
            }
            
            return origSend.apply(this, arguments);
        };

        // ---- sendBeacon ----
        const origBeacon = navigator.sendBeacon;
        navigator.sendBeacon = function(url, data) {
            if (!shouldIgnore(url)) {
                logBeacon({ 
                    URL: url, 
                    Data: data instanceof Blob ? 'Blob data' : data 
                });
            }
            return origBeacon.apply(this, arguments);
        };

        // ---- WebSocket ----
        const origWebSocket = window.WebSocket;
        window.WebSocket = function(url, protocols) {
            if (!shouldIgnore(url)) {
                logWSConnect({ URL: url });
                
                const ws = new origWebSocket(url, protocols);
                
                ws.addEventListener('message', function(event) {
                    logWSMessageIn({ Data: event.data });
                });
                
                const origSend = ws.send;
                ws.send = function(data) {
                    logWSMessageOut({ Data: data });
                    origSend.call(this, data);
                };
                
                return ws;
            }
            return new origWebSocket(url, protocols);
        };

        // ---- EventSource (SSE) ----
        const origEventSource = window.EventSource;
        window.EventSource = function(url, config) {
            if (!shouldIgnore(url)) {
                const es = new origEventSource(url, config);
                
                es.addEventListener('message', function(event) {
                    logSSE({ Data: event.data });
                });
                
                return es;
            }
            return new origEventSource(url, config);
        };

        console.log(
            "%c[Stealth Network Logger]%c ACTIVATED", 
            "background: #4A00E0; color: white; padding: 3px; border-radius: 3px 0 0 3px;",
            "background: #8E2DE2; color: white; padding: 3px; border-radius: 0 3px 3px 0;"
        );
    } catch (error) {
        console.error('%c[Logger Error]%c ' + error.message, 
            'color: red; font-weight: bold;', 
            'color: inherit;'
        );
    }
})();
