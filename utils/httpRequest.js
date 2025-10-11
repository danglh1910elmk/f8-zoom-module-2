class HttpRequest {
    constructor() {
        this.baseUrl = "https://spotify.f8team.dev/api/";
    }

    async _send(path, method, data, options = {}) {
        try {
            const accessToken = localStorage.getItem("accessToken");

            if (accessToken) {
                options.headers = options.headers || {};
                options.headers.Authorization = `Bearer ${accessToken}`;
            }

            // detect if data is FormData for file uploads
            const isFormData = data instanceof FormData;
            const config = {
                ...options,
                method,
            };

            // for FormData: Let browser handle body and multipart headers
            if (isFormData) {
                config.body = data;
                config.headers = {
                    ...options.headers, // don't set Content-Type
                };
            }
            // default JSON handling
            else {
                config.headers = {
                    "Content-Type": "application/json",
                    ...options.headers,
                };
                config.body = data === null ? null : JSON.stringify(data);
            }
            const res = await fetch(`${this.baseUrl}${path}`, config);

            // Try to parse as JSON if response is JSON; handle non-JSON for uploads if needed
            let response;
            const contentType = res.headers.get("content-type");

            // for JSON response
            if (contentType && contentType.includes("application/json")) {
                response = await res.json();
            }
            // for non-JSON response
            else {
                response = await res.text();
            }

            if (!res.ok) {
                const error = new Error(`HTTP status code: ${res.status}`);
                error.status = res.status;
                error.statusText = res.statusText;
                error.response = response;
                throw error;
            }

            return response;
        } catch (error) {
            if (error instanceof TypeError) {
                error.isNetworkError = true;
            }

            throw error;
        }
    }

    async get(path, options) {
        return await this._send(path, "GET", null, options);
    }

    async post(path, data, options) {
        return await this._send(path, "POST", data, options);
    }

    async put(path, data, options) {
        return await this._send(path, "PUT", data, options);
    }

    async patch(path, data, options) {
        return await this._send(path, "PATCH", data, options);
    }

    async del(path, options) {
        return await this._send(path, "DELETE", null, options);
    }
}

const httpRequest = new HttpRequest();

export default httpRequest;
