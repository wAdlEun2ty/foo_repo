function enableFullRequestLogger() {
    // Patch fetch
    const origFetch = window.fetch;
    window.fetch = async (...args) => {
        console.group("FETCH Request");
        console.log("URL:", args[0]);
        console.log("Options:", args[1]);
        console.groupEnd();
        const res = await origFetch(...args);
        const clone = res.clone();
        clone.text().then(txt => {
            console.group("FETCH Response");
            console.log("URL:", args[0]);
            console.log("Status:", res.status);
            console.log("Body:", txt);
            console.groupEnd();
        });
        return res;
    };

    // Patch XMLHttpRequest
    const origOpen = XMLHttpRequest.prototype.open;
    const origSend = XMLHttpRequest.prototype.send;

    XMLHttpRequest.prototype.open = function (method, url, ...rest) {
        this._method = method;
        this._url = url;
        return origOpen.apply(this, [method, url, ...rest]);
    };

    XMLHttpRequest.prototype.send = function (body) {
        console.group("XHR Request");
        console.log("Method:", this._method);
        console.log("URL:", this._url);
        console.log("Body:", body);
        console.groupEnd();

        this.addEventListener("load", function () {
            console.group("XHR Response");
            console.log("URL:", this._url);
            console.log("Status:", this.status);
            console.log("Response:", this.responseText);
            console.groupEnd();
        });

        return origSend.apply(this, [body]);
    };

    console.log("%c[Full Request Logger ENABLED]", "color:green");
}

// Panggil:
enableFullRequestLogger();
