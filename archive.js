/* me/player/play
{
  "track_id": "track-uuid-here",
  "context_type": "playlist",
  "context_id": "playlist-uuid-here",
  "position_ms": 0,
  "volume_percent": 80
}

{
  "track_id": "track-uuid-here",
  "context_type": "album",
  "context_id": "album-uuid-here",
  "position_ms": 0,
  "volume_percent": 80,
  "device_name": "Web Player"
}
*/

//
const _options = {
    ...options,
    method,
    headers: {
        ...options.headers,
        "Content-Type": "application/json",
    },
};
if (data) {
    _options.body = JSON.stringify(data);
}

const accessToken = localStorage.getItem("accessToken");
if (accessToken) {
    _options.headers.Authorization = `Bearer ${accessToken}`;
}

const res = await fetch(`${this.baseUrl}${path}`, _options);

const response = await res.json();
//

//
accessToken = localStorage.getItem("accessToken");

if (accessToken) {
    options = {
        headers: {
            Authorization: `Bearer ${accessToken}`,
        },
    };
    // options.headers = options.headers || {};
    // options.headers.Authorization = `Bearer ${accessToken}`;
}

res = await fetch(`${this.baseUrl}${path}`, {
    ...options,
    method,
    headers: {
        ...options.headers,
        "Content-Type": "application/json",
    },
    body: data === null ? null : JSON.stringify(data),
});

response = await res.json();
//
