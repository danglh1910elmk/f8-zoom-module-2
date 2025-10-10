class HttpRequest {
    constructor() {
        this.baseUrl = "https://spotify.f8team.dev/api/";
    }

    async _send(path, method, data, options = {}) {
        try {
            const accessToken = localStorage.getItem("accessToken");

            if (accessToken) {
                options = {
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                    },
                };
            }

            const res = await fetch(`${this.baseUrl}${path}`, {
                ...options,
                method,
                headers: {
                    ...options.headers,
                    "Content-Type": "application/json",
                },
                body: data === null ? null : JSON.stringify(data),
            });

            const response = await res.json();

            if (!res.ok) {
                // console.log(res);
                // console.log(response);

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

            // console.error("HTTP Request Error:", error);
            // console.dir(error);
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
