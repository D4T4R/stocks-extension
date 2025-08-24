const GLib = imports.gi.GLib;
const Gio = imports.gi.Gio;

const generateQueryString = params => {
    if (!params) return '';
    const paramKeyValues = Object.keys(params)
        .filter(paramName => params[paramName] !== undefined && params[paramName] !== null)
        .map(paramName => {
            let paramValue = params[paramName];
            if (typeof paramValue === 'boolean') {
                paramValue = paramValue ? 1 : 0;
            }
            return `${encodeURIComponent(paramName)}=${encodeURIComponent(paramValue)}`;
        });
    return `?${paramKeyValues.join('&')}`;
};

var fetch = ({ url, method = 'GET', headers = {}, queryParameters = {} }) => {
    return new Promise((resolve, reject) => {
        try {
            url = url + generateQueryString(queryParameters);

            let args = ['curl', '-sL', url, '--compressed'];

            // Browser spoofing headers
            const spoofedHeaders = {
                'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',
    		'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    		'Accept-Language': 'en-US,en;q=0.5',
    		'Accept-Encoding': 'gzip, deflate, br, zstd',
    		'DNT': '1',
    		'Connection': 'keep-alive',
    		'Cookie': 'A1=d=AQABBBhghmgCEJ1UZg8D2xOcj6Aenshkm1IFEgABAQGjh2iPaO2LzSMAAAAAgA^&S=AQAAAoQsRn42bDToHMsNRJEzGwI; A3=d=AQABBBhghmgCEJ1UZg8D2xOcj6Aenshkm1IFEgABAQGjh2iPaO2LzSMAAAAAgA^&S=AQAAAoQsRn42bDToHMsNRJEzGwI; A1S=d=AQABBBhghmgCEJ1UZg8D2xOcj6Aenshkm1IFEgABAQGjh2iPaO2LzSMAAAAAgA^&S=AQAAAoQsRn42bDToHMsNRJEzGwI',
    		'Upgrade-Insecure-Requests': '1',
    		'Sec-Fetch-Dest': 'document',
    		'Sec-Fetch-Mode': 'navigate',
    		'Sec-Fetch-Site': 'none',
    		'Sec-Fetch-User': '?1',
    		'Sec-GPC': '1',
    		'Priority': 'u=0, i',
    		'TE': 'trailers'};

            for (let header in spoofedHeaders) {
                args.push('-H', `${header}: ${spoofedHeaders[header]}`);
            }

            let proc = new Gio.Subprocess({
                argv: args,
                flags: Gio.SubprocessFlags.STDOUT_PIPE | Gio.SubprocessFlags.STDERR_PIPE
            });

            proc.init(null);

            proc.communicate_utf8_async(null, null, (proc, res) => {
                try {
                    let [, stdout, stderr] = proc.communicate_utf8_finish(res);
                    let status = proc.get_successful() ? 200 : 500;
                    let rateLimited = false;

                    // Check for rate limit error in stdout (Yahoo returns plain text "Too Many Requests")
                    if (stdout && (stdout.includes('429') || stdout.includes('Too Many Requests') || stdout.trim() === 'Too Many Requests')) {
                        status = 429;
                        rateLimited = true;
                    }

                    if (rateLimited || status === 429) {
                        log(`⚠️ Rate limited by Yahoo Finance for URL: ${url}`);
                        reject(new Error('429 Too Many Requests'));
                        return;
                    }

                    if (status !== 200) {
                        logError(new Error(`curl failed: ${stderr}`));
                        reject(new Error(stderr));
                        return;
                    }

                    log("📦 FETCH RESPONSE (first 300 chars): " + stdout.slice(0, 300));
                    resolve({
                        text: () => Promise.resolve(stdout),
                        json: () => {
                            try {
                                return Promise.resolve(JSON.parse(stdout));
                            } catch (e) {
                                log(`⚠️ JSON parse failed, response was: ${stdout.slice(0, 200)}`);
                                throw new Error(`Invalid JSON response: ${stdout.slice(0, 100)}`);
                            }
                        },
                        status: status,
                        ok: status === 200,
                        statusText: status === 200 ? 'OK' : (status === 429 ? 'Too Many Requests' : 'Error'),
                        raw: stdout
                    });
                } catch (e) {
                    reject(e);
                }
            });
        } catch (e) {
            reject(e);
        }
    });
};
