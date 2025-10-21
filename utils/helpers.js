const toastContainer = document.querySelector(".toast-container");
export function showToast(message, isSuccess, ms = 2500) {
    const toast = document.createElement("div");
    const toastType = isSuccess ? "success" : "error";
    toast.className = `toast ${toastType}`;
    toast.innerHTML = `<p class="toast-content">${message}</p>`;
    toastContainer.prepend(toast);

    setTimeout(() => {
        toast.classList.remove(toastType);
        toast.addEventListener("transitionend", () => {
            toast.remove();
        });
    }, ms);
}

export function escapeHTML(html) {
    // return DOMPurify.sanitize(html);
    const div = document.createElement("div");
    div.textContent = html;
    return div.innerHTML;
}

export function formatPlaylistDuration(duration) {
    const hours = Math.floor(duration / 3600);
    const minutes = Math.floor((duration % 3600) / 60);
    const seconds = duration % 60;

    if (hours) {
        return `about ${hours === 1 ? "hour" : "hours"}`;
    } else {
        return `${minutes} min ${seconds} sec`;
    }
}

export function formatTrackDuration(duration) {
    const hours = Math.floor(duration / 3600);
    const minutes = Math.floor((duration % 3600) / 60);
    const seconds = Math.floor(duration % 60);

    if (hours) {
        return `${hours}:${String(minutes).padStart(2, "0")}:${String(
            seconds
        ).padStart(2, "0")}`;
    } else {
        return `${minutes}:${String(seconds).padStart(2, "0")}`;
    }
}

export function createArray(n) {
    return Array(n)
        .fill(0)
        .map((_, i) => i);
}

export function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

export function generateEmail() {
    return (
        "ddx" +
        Math.ceil(Math.random() * 1000) +
        Math.ceil(Math.random() * 1000) +
        "@gmail.com"
    );
}

export function generatePass() {
    return (
        "1Ddx" +
        Math.ceil(Math.random() * 1000) +
        Math.ceil(Math.random() * 1000)
    );
}
