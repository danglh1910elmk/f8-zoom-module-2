import httpRequest from "./utils/httpRequest.js";

const $ = document.querySelector.bind(document);
const $$ = document.querySelectorAll.bind(document);

const hitsSection = $(".hits-section");
const popularArtistsSection = $(".popular-artists-section");
const artistSection = $(".artist-section");
const playlistSection = $(".playlist-section");

const libraryContentContainer = $(".library-content");

const playlistPlayBtn = $(".playlist-controls .play-btn-large");
const artistPlayBtn = $(".artist-controls .play-btn-large");
const audioElement = $(".audio");

const REPLAY_THRESHOLD = 2;
const NEXT = 1;
const PREVIOUS = -1;
let isRepeated = false;
let isShuffled = false;
let currentIndex;
let currentSongList = []; // playlist đang play
let nextSongList = [];
let currentSongListId, nextSongListId;
/*
    - mỗi khi vào 1 playlist/artist cự thể, gán nextSongListId = playlistId/artistId đồng thời gán nextSongList = DS bài hát của playlist/artist đó
    - khi nhấn vào playlistPlayBtn/artistPlayBtn (click vào 1 song trong songList) thì sẽ gán currentSongList = nextSongList và play currentSongList 
    - currentSongListId, nextSongListId: mục đích để sau này kiểm tra xem nextSongList có nằm trong 'view' không
*/

// Auth Modal Functionality
document.addEventListener("DOMContentLoaded", function () {
    // Get DOM elements
    const signupBtn = document.querySelector(".signup-btn");
    const loginBtn = document.querySelector(".login-btn");
    const authModal = document.getElementById("authModal");
    const modalClose = document.getElementById("modalClose");
    const signupForm = document.getElementById("signupForm");
    const loginForm = document.getElementById("loginForm");
    const showLoginBtn = document.getElementById("showLogin");
    const showSignupBtn = document.getElementById("showSignup");
    const signupEmailInput = $("#signupEmail");
    const loginEmailInput = $("#loginEmail");

    // Function to show signup form
    function showSignupForm() {
        signupForm.style.display = "block";
        loginForm.style.display = "none";
        signupEmailInput.focus();
    }

    // Function to show login form
    function showLoginForm() {
        signupForm.style.display = "none";
        loginForm.style.display = "block";
        loginEmailInput.focus();
    }

    // Function to open modal
    function openModal() {
        authModal.classList.add("show");
        document.body.style.overflow = "hidden"; // Prevent background scrolling
    }

    // Open modal with Sign Up form when clicking Sign Up button
    signupBtn.addEventListener("click", function () {
        showSignupForm();
        openModal();
        signupEmailInput.focus();

        // remove before flight
        signupEmailInput.value = generateEmail();
        $("#signupPassword").value = generatePass();
        // $("#signupEmail").value = "@gmail.com";
        // $("#signupPassword").value = "Password123";
    });

    // Open modal with Login form when clicking Login button
    loginBtn.addEventListener("click", function () {
        showLoginForm();
        openModal();
        loginEmailInput.focus();

        // remove before flight
        // loginEmailInput.value = generateEmail();
        // $("#loginPassword").value = generatePass();
        loginEmailInput.value = "xdd@gmail.com";
        $("#loginPassword").value = "Password123";
    });

    // Close modal function
    function closeModal() {
        authModal.classList.remove("show");
        document.body.style.overflow = "auto"; // Restore scrolling
    }

    // Close modal when clicking close button
    modalClose.addEventListener("click", closeModal);

    // Close modal when clicking overlay (outside modal container)
    authModal.addEventListener("click", function (e) {
        if (e.target === authModal) {
            closeModal();
        }
    });

    // Close modal with Escape key
    document.addEventListener("keydown", function (e) {
        if (e.key === "Escape" && authModal.classList.contains("show")) {
            closeModal();
        }
    });

    // Switch to Login form
    showLoginBtn.addEventListener("click", function () {
        showLoginForm();
    });

    // Switch to Signup form
    showSignupBtn.addEventListener("click", function () {
        showSignupForm();
    });

    function isEmailValid(email) {
        const pattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+.[a-zA-Z]{2,}$/;

        return pattern.test(email);
    }

    function isPasswordValid(password) {
        // const pattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[^\s]{6,}$/;
        const pattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[^\s]*$/;

        return pattern.test(password);
    }

    function validateEmailAndPassword(formElement, email, password) {
        // validate email
        if (!isEmailValid(email)) {
            showValidationError(
                formElement,
                "email",
                "Please enter a valid email address"
            );
            return false; // failed
        }

        // validate password
        if (password.length < 6) {
            showValidationError(
                formElement,
                "password",
                "Password must be at least 6 characters long"
            );
            return false; // failed
        } else if (password.length >= 6 && !isPasswordValid(password)) {
            showValidationError(
                formElement,
                "password",
                "Password must contain at least one uppercase letter, one lowercase letter, and one number."
            );
            return false; // failed
        }

        return true; // passed
    }

    function showValidationError(formElement, type, message) {
        // type = 'email' / 'password'

        const selector =
            type === "email"
                ? ".form-group:first-of-type"
                : ".form-group:last-of-type";

        const formGroup = formElement.querySelector(selector);
        const errorMessageText = formElement.querySelector(
            `.${type}-error-message`
        );

        formGroup.classList.add("invalid");
        errorMessageText.textContent = message;
    }

    // sign up functionality
    signupForm
        .querySelector(".auth-form-content")
        .addEventListener("submit", async (e) => {
            e.preventDefault();

            const email = signupEmailInput.value.trim();
            const password = $("#signupPassword").value.trim();
            const credentials = { email, password };

            if (!validateEmailAndPassword(signupForm, email, password)) {
                return;
            }

            try {
                const { user, access_token, refresh_token } =
                    await httpRequest.post("auth/register", credentials);
                console.log("sign up user: ", user);

                // save accessToken, refreshToken to localStorage
                localStorage.setItem("accessToken", access_token);
                localStorage.setItem("refreshToken", refresh_token);
                // save registered user to localStorage
                localStorage.setItem("user", JSON.stringify(user));

                updateUserInfo(user);
                fetchAndRenderSidebar(user);

                closeModal();
            } catch (error) {
                console.dir(error);

                let type, errorMessage;

                // check xem có 'details' hay không?

                if (error.response.error.details) {
                    const { field, message } = error.response.error.details[0];

                    type = field.toLowerCase().includes("email")
                        ? "email"
                        : "password";
                    errorMessage = message;
                } else {
                    const { code, message } = error.response.error;

                    type = code.toLowerCase().includes("email")
                        ? "email"
                        : "password";
                    errorMessage = message;
                }
                showValidationError(signupForm, type, errorMessage);
            }
        });

    // log in functionality
    loginForm
        .querySelector(".auth-form-content")
        .addEventListener("submit", async (e) => {
            e.preventDefault();

            const email = loginEmailInput.value.trim();
            const password = $("#loginPassword").value.trim();
            const credentials = { email, password };

            // validate email and password
            if (!validateEmailAndPassword(loginForm, email, password)) {
                return;
            }

            try {
                const { user, access_token, refresh_token } =
                    await httpRequest.post("auth/login", credentials);

                console.log("login user: ", user);

                // save user, accessToken, refreshToken to localStorage
                localStorage.setItem("user", JSON.stringify(user));
                localStorage.setItem("accessToken", access_token);
                localStorage.setItem("refreshToken", refresh_token);

                updateUserInfo(user);
                fetchAndRenderSidebar(user);

                closeModal();
            } catch (error) {
                console.dir(error);

                let type, errorMessage;
                // check xem có 'details' hay không?
                if (error.response.error.details) {
                    const { field, message } = error.response.error.details[0];
                    type = field;
                    errorMessage = message;
                } else {
                    const { code, message } = error.response.error;
                    type = code;
                    errorMessage = message;
                }

                if (type === "email") {
                    showValidationError(loginForm, type, errorMessage);
                } else if (type === "INVALID_CREDENTIALS") {
                    showValidationError(loginForm, "email", errorMessage);
                    showValidationError(loginForm, "password", errorMessage);
                }
            }
        });

    // tính năng ẩn hiệu ứng 'invalid' khi người dùng bắt đầu type gì đó vào form-input
    $$(".form-input").forEach((element) => {
        element.addEventListener("input", (e) => {
            const formGroup = e.currentTarget.closest(".form-group");

            if (formGroup) {
                formGroup.classList.remove("invalid");
            }
        });
    });

    // con mắt để ẩn/hiện password
    $$(".show-password-btn").forEach((element) => {
        element.addEventListener("click", (e) => {
            const siblingInput = e.currentTarget.previousElementSibling;
            const eyeIcon = element.querySelector(".eye-icon");

            const inputType =
                siblingInput.type === "password" ? "text" : "password";

            // change icon
            if (inputType === "text") {
                eyeIcon.classList.add("fa-eye");
                eyeIcon.classList.remove("fa-eye-slash");
            } else {
                eyeIcon.classList.remove("fa-eye");
                eyeIcon.classList.add("fa-eye-slash");
            }

            // change input type
            siblingInput.type = inputType;
        });
    });
});

// User Menu Dropdown Functionality (log out)
document.addEventListener("DOMContentLoaded", function () {
    const userAvatar = document.getElementById("userAvatar");
    const userDropdown = document.getElementById("userDropdown");
    const logoutBtn = document.getElementById("logoutBtn");

    // Toggle dropdown when clicking avatar
    userAvatar.addEventListener("click", function (e) {
        e.stopPropagation();
        userDropdown.classList.toggle("show");
    });

    // Close dropdown when clicking outside
    document.addEventListener("click", function (e) {
        if (
            !userAvatar.contains(e.target) &&
            !userDropdown.contains(e.target)
        ) {
            userDropdown.classList.remove("show");
        }
    });

    // Close dropdown when pressing Escape
    document.addEventListener("keydown", function (e) {
        if (e.key === "Escape" && userDropdown.classList.contains("show")) {
            userDropdown.classList.remove("show");
        }
    });

    // Handle logout button click
    logoutBtn.addEventListener("click", async function () {
        // Close dropdown first
        userDropdown.classList.remove("show");

        try {
            const userInfo = $(".user-info");
            const authButtons = $(".auth-buttons");

            const refreshToken = localStorage.getItem("refreshToken");
            const data = {
                refresh_token: refreshToken,
            };

            const { message, details } = await httpRequest.post(
                "auth/logout",
                data
            );
            console.log(message);
            console.log(details);

            // hide user-info
            userInfo.classList.remove("show");

            // display sign in/up button
            authButtons.classList.add("show");

            // update sidebar
            fetchAndRenderSidebar(null);

            // remove accessToken localStorage
            localStorage.removeItem("accessToken");

            // remove user from localStorage
            localStorage.removeItem("user");
        } catch (error) {
            console.dir(error);
        }
    });
});

async function fetchFollowedAndOwnedPlaylists() {
    try {
        // get user's followed playlists
        const res1 = await httpRequest.get("me/playlists/followed");
        const followedPlaylists = res1.playlists;

        // get user-owned playlists
        const res2 = await httpRequest.get("me/playlists");
        const ownedPlaylists = res2.playlists;

        // combine
        return [...followedPlaylists, ...ownedPlaylists];
    } catch (error) {
        console.dir(error);
        console.error("Cannot fetch user's followed and owned playlists");
    }
}

async function fetchFollowedArtists() {
    try {
        // get user's followed artists
        const res = await httpRequest.get("me/following");
        return res.artists;
    } catch (error) {
        console.dir(error);
        console.error("Cannot fetch user's followed artists");
    }
}

function renderSidebar(list) {
    if (!list.length) {
        libraryContentContainer.innerHTML = `<div class="library-item">
                                                    <p>Your list is empty!</p>
                                                </div>`;
        return;
    }

    let likedSongsHtml = "";

    // find "Liked Songs" playlist (to always place it at the top)
    const likedSongsPlaylistIndex = list.findIndex((item) => {
        return item.name === "Liked Songs";
    });

    if (likedSongsPlaylistIndex !== -1) {
        const likedSongsPlaylist = list[likedSongsPlaylistIndex];
        list.splice(likedSongsPlaylistIndex, 1);

        likedSongsHtml = `<div class="library-item" data-id="${likedSongsPlaylist.id}" data-user-id="${likedSongsPlaylist.user_id}" data-type="playlist">
                                <div class="item-icon liked-songs">
                                    <i class="fas fa-heart"></i>
                                </div>
                                <div class="item-info">
                                    <div class="item-title">Liked Songs</div>
                                    <div class="item-subtitle">
                                        <i class="fas fa-thumbtack"></i>
                                        Playlist • ${likedSongsPlaylist.total_tracks} songs
                                    </div>
                                </div>
                            </div>`;
    }

    const html = list
        .map((item) => {
            const userId = item.user_id ? escapeHTML(item.user_id) : "";
            const title = escapeHTML(item.name);
            const isArtist = item.is_verified !== undefined;
            const subtitle = isArtist
                ? "Artist"
                : `Playlist ${
                      item.user_username ? `• ${item.user_username}` : ""
                  }`;

            return `<div class="library-item" data-id="${escapeHTML(item.id)}"
                    data-user-id="${userId}" data-type="${
                isArtist ? "artist" : "playlist"
            }">
                    <img
                        src="${
                            item.image_url
                                ? item.image_url
                                : "placeholder.svg?height=48&width=48"
                        }"
                        alt="${title}"
                        class="item-image"
                    />
                    <div class="item-info">
                        <div class="item-title">${title}</div>
                        <div class="item-subtitle">${escapeHTML(subtitle)}</div>
                    </div>
                </div>`;
        })
        .join("");

    libraryContentContainer.innerHTML = likedSongsHtml + html;
}

function sortArray(arr, sortMode) {
    if (sortMode === "recent") {
        return arr.sort(
            (a, b) => new Date(b.updated_at) - new Date(a.updated_at)
        );
    } else if (sortMode === "alphabetical") {
        return arr.sort((a, b) =>
            a.name.toLowerCase().localeCompare(b.name.toLowerCase())
        );
    }
}

async function fetchAndRenderSidebar(user, type = 3, sortMode = "recent") {
    /*
    type:
        - 1: playlist only
        - 2: artist only
        - 3: both
    sortMode:
        - recent
        - alphabetical
    */
    if (!user) {
        libraryContentContainer.innerHTML = `<div class="library-item">
                                                    <p>Sign up or Log in to Create Playlists</p>
                                                </div>`;
        return;
    }

    let playlists = [],
        artists = [],
        allItems = [];
    try {
        if (type === 1) {
            playlists = await fetchFollowedAndOwnedPlaylists();
        } else if (type === 2) {
            artists = await fetchFollowedArtists();
        } else if (type === 3) {
            playlists = await fetchFollowedAndOwnedPlaylists();
            artists = await fetchFollowedArtists();
        }

        // combine
        allItems = [...playlists, ...artists];

        // sort handling
        allItems = sortArray(allItems, sortMode);

        // render
        renderSidebar(allItems);
    } catch (error) {
        console.dir(error);
    }
}

async function reRenderSidebar() {
    const type = +localStorage.getItem("type"); // convert to number
    const sortMode = localStorage.getItem("sortMode"); // get config from localStorage
    await fetchAndRenderSidebar(true, type, sortMode);
}

// INITIALIZE
// lấy được thông tin user rồi hiển thị
document.addEventListener("DOMContentLoaded", async function () {
    async function fetchUser() {
        try {
            const { user } = await httpRequest.get("users/me");
            return user;
        } catch (error) {
            console.dir(error);
            console.error("Cannot fetch User!");

            // display sign-in, sign-up buttons
            authButtons.classList.add("show");
        }
    }
    const authButtons = $(".auth-buttons");

    const user = await fetchUser();

    updateUserInfo(user);

    // update sidebar (playlists + artists)
    fetchAndRenderSidebar(user, 3, "recent");
    localStorage.setItem("type", 3); // default, type is 3 (render both playlist + artist)
    localStorage.setItem("sortMode", "recent"); // default, sortMode = recent

    if (!user) return;

    // update repeated, shuffled status
    isRepeated = localStorage.getItem("isRepeated") === "true";
    repeatBtn.classList.toggle("active", isRepeated);
    isShuffled = localStorage.getItem("isShuffled") === "true";
    shuffleBtn.classList.toggle("active", isShuffled);

    // update volume
    audioElement.volume = +localStorage.getItem("volumeValue");
    innerVolumeBar.style.width = `${audioElement.volume * 100}%`;
    // change volumeIcon based on volume value
    setVolumeIcon(audioElement.volume);
});

// sidebar
document.addEventListener("DOMContentLoaded", async (e) => {
    const createPlaylistBtn = $("#createPlaylistBtn");
    const playlistsFilterBtn = $("#playlistsBtn");
    const artistsFilterBtn = $("#artistsBtn");

    const sortBtn = $(".sort-btn");
    const sortDropdown = $(".sort-dropdown");

    function addActiveClassToDropdownItem(targetElement) {
        // remove 'active' from other elements
        $(".dropdown-item.active")?.classList?.remove("active");

        // add 'active' to target element
        targetElement.classList.add("active");
    }

    // ===== sort playlists/artists functionality =====
    sortBtn.addEventListener("click", () => {
        // open/close Dropdown menu
        sortDropdown.classList.toggle("show");
    });

    document.addEventListener("click", (e) => {
        // click outside to close Dropdown menu
        if (!sortDropdown.contains(e.target) && !sortBtn.contains(e.target))
            sortDropdown.classList.remove("show");
    });

    sortDropdown.addEventListener("click", async (e) => {
        const user = JSON.parse(localStorage.getItem("user"));
        if (!user) return;

        const dropdownItem = e.target.closest(".dropdown-item");
        const sortDropdownBtn =
            dropdownItem.querySelector(".sort-dropdown-btn");
        const sortBtnText = $(".sort-btn-text");

        const type = +localStorage.getItem("type");

        if (sortDropdownBtn.classList.contains("sort-by-recent")) {
            addActiveClassToDropdownItem(dropdownItem);
            fetchAndRenderSidebar(user, type, "recent");
            sortBtnText.textContent = "Recents";
            // save sortMode
            localStorage.setItem("sortMode", "recent");
        } else if (sortDropdownBtn.classList.contains("sort-by-alphabetical")) {
            addActiveClassToDropdownItem(dropdownItem);
            fetchAndRenderSidebar(user, type, "alphabetical");
            sortBtnText.textContent = "Alphabetical";
            // save sortMode
            localStorage.setItem("sortMode", "alphabetical");
        }

        // close Dropdown
        sortDropdown.classList.remove("show");
    });

    // ===== filter by Playlist / Artist functionality =====
    playlistsFilterBtn.addEventListener("click", function () {
        const user = JSON.parse(localStorage.getItem("user"));
        if (!user) return;

        let sortMode;
        // deactivate playlistsFilterBtn
        if (this.classList.contains("active")) {
            this.classList.remove("active");

            sortMode = localStorage.getItem("sortMode");
            fetchAndRenderSidebar(user, 3, sortMode); // render both playlists and artists
            localStorage.setItem("type", 3);
        }
        // activate playlistsFilterBtn
        else {
            this.classList.add("active");
            artistsFilterBtn.classList.remove("active");

            sortMode = localStorage.getItem("sortMode");
            fetchAndRenderSidebar(user, 1, sortMode); // render playlists only
            localStorage.setItem("type", 1);
        }
    });

    artistsFilterBtn.addEventListener("click", function () {
        const user = JSON.parse(localStorage.getItem("user"));
        if (!user) return;

        let sortMode;
        // deactivate artistsFilterBtn
        if (this.classList.contains("active")) {
            this.classList.remove("active");

            sortMode = localStorage.getItem("sortMode");
            fetchAndRenderSidebar(user, 3, sortMode); // render both playlists and artists
            localStorage.setItem("type", 3);
        }
        // activate artistsFilterBtn
        else {
            this.classList.add("active");
            playlistsFilterBtn.classList.remove("active");

            sortMode = localStorage.getItem("sortMode");
            fetchAndRenderSidebar(user, 2, sortMode); // render artists only
            localStorage.setItem("type", 2);
        }
    });

    // ==========================================
    // ===== handle playlist / artist click =====
    // ==========================================
    libraryContentContainer.addEventListener("click", async (e) => {
        const libraryItem = e.target.closest(".library-item");
        const id = libraryItem.dataset.id;
        const type = libraryItem.dataset.type;

        if (type === "playlist") {
            handlePlaylistClick(id);
        } else if (type === "artist") {
            handleArtistClick(id);
        }
    });

    // ==========================================
    // ========== create new playlist ===========
    // ==========================================

    createPlaylistBtn.addEventListener("click", async () => {
        const user = JSON.parse(localStorage.getItem("user"));
        if (!user) return;

        try {
            const playlistInfo = {
                name: "My New Playlist",
                description: "Playlist description",
                is_public: true,
            };
            const { message, playlist } = await httpRequest.post(
                "playlists",
                playlistInfo
            );
            console.log(message);

            // re-render sidebar
            await reRenderSidebar();

            // open new created playlist
            await handlePlaylistClick(playlist.id);

            // show toast
        } catch (error) {
            console.dir(error);
            console.error("Failed to create new playlist: ", error.message);

            // show toast
        }
    });

    // =============================================
    // ======= playlist/artist context menu ========
    // =============================================
    const playlistContextMenu = $(".playlist-context-menu");
    const artistContextMenu = $(".artist-context-menu");

    let contextMenuId; // lưu playlistId/artistId khi chuột phải vào playlist/artist trong sidebar

    function openContextMenu(e, contextMenu) {
        const rect = contextMenu.getBoundingClientRect();

        const menuWidth = rect.width;
        const menuHeight = rect.height;
        const screenWidth = window.innerWidth;
        const screenHeight = window.innerHeight;

        // initial pointer coordinates
        const pointerX = e.pageX;
        const pointerY = e.pageY;

        if (
            pointerY + menuHeight > screenHeight &&
            pointerX + menuWidth <= screenWidth
        ) {
            contextMenu.style.top = `${pointerY - menuHeight}px`;
            contextMenu.style.left = `${pointerX}px`;
        } else if (
            pointerY + menuHeight > screenHeight &&
            pointerX + menuWidth > screenWidth
        ) {
            contextMenu.style.top = `${pointerY - menuHeight}px`;
            contextMenu.style.left = `${pointerX - menuWidth}px`;
        } else if (pointerX + menuWidth > screenWidth) {
            contextMenu.style.top = `${pointerY}px`;
            contextMenu.style.left = `${pointerX - menuWidth}px`;
        } else {
            contextMenu.style.top = `${pointerY}px`;
            contextMenu.style.left = `${pointerX}px`;
        }

        contextMenu.classList.add("show");
    }

    async function handleUnfollowPlaylist(playlistId) {
        try {
            const playlist = await getPlaylistById(playlistId);
            // không cho follow/unfollow playlist của mình (giống spotify)
            if (playlist.is_owner) {
                // show toast
                console.error("Cannot follow/unfollow your own playlist!");
                return;
            }

            const { message, is_following } = await httpRequest.del(
                `playlists/${playlistId}/follow`
            );
            console.log(message); // show toast this msg

            // re-render sidebar
            await reRenderSidebar();

            // nếu nằm trong 'view' thì re-render
            if (nextSongListId === playlistId) {
                await fetchAndRenderPlaylist(playlistId);
            }

            // show toast success
        } catch (error) {
            console.dir(error);
            console.error("Failed to unfollow playlist: ", error.message);

            // show toast : error.response.error.message
        }
    }

    async function handleDeletePlaylist(playlistId) {
        try {
            const { message } = await httpRequest.del(
                `playlists/${playlistId}`
            );
            console.log(message); // show toast this message

            // re-render sidebar
            await reRenderSidebar();

            // nếu nằm trong 'view' thì quay về Home
            if (nextSongListId === playlistId) {
                $(".go-home-btn").click();
            }

            // show toast
        } catch (error) {
            console.dir(error);
            console.error("Failed to delete playlist: ", error.message);

            // show toast : error.response.error.message = "Permission denied: You can only delete your own playlists"
        }
    }

    async function handleUnfollowArtist(artistId) {
        try {
            const { message, is_following } = await httpRequest.del(
                `artists/${artistId}/follow`
            );
            console.log(message); // show toast this message

            // re-render sidebar
            await reRenderSidebar();

            // nếu nằm trong 'view' thì re-render
            if (nextSongListId === artistId) {
                await fetchAndRenderArtist(artistId);
            }

            // show toast
        } catch (error) {
            console.dir(error);
            console.error("Failed to unfollow artist: ", error.message);

            // show toast : error.response.error.message
            // "Not following this artist"
        }
    }

    // right click on playlist/artist in sidebar
    libraryContentContainer.addEventListener("contextmenu", async (e) => {
        // close other context menu first
        $(".context-menu.show")?.classList?.remove("show");

        const item = e.target.closest(".library-item");
        if (!item) return;

        const type = item.dataset.type;
        const id = item.dataset.id; // playlistId or artistId
        contextMenuId = id;

        if (type === "playlist") {
            // open playlist context menu
            openContextMenu(e, playlistContextMenu);
        } else {
            // open artist context menu
            openContextMenu(e, artistContextMenu);
        }
    });

    // close context menu when clicking outside
    document.addEventListener("click", (e) => {
        if (!e.target.closest(".context-menu")) {
            // close any context menu being displayed
            $(".context-menu.show")?.classList?.remove("show");
        }
    });

    // click menu items in playlistContextMenu
    playlistContextMenu.addEventListener("click", async (e) => {
        const menuItem = e.target.closest(".menu-item");
        if (!menuItem) return;

        if (menuItem.classList.contains("unfollow-playlist")) {
            await handleUnfollowPlaylist(contextMenuId);
        } else if (menuItem.classList.contains("delete-playlist")) {
            await handleDeletePlaylist(contextMenuId);
        }

        // close context menu
        playlistContextMenu.classList.remove("show");
    });

    // click menu items in artistContextMenu
    artistContextMenu.addEventListener("click", async (e) => {
        const menuItem = e.target.closest(".menu-item");
        if (!menuItem) return;

        if (menuItem.classList.contains("unfollow-artist")) {
            await handleUnfollowArtist(contextMenuId);
        }

        // close context menu
        artistContextMenu.classList.remove("show");
    });

    // search
});

// prevent default context menu
document.addEventListener("contextmenu", (e) => {
    e.preventDefault();
});

// Today's biggest hits section - trending tracks
document.addEventListener("DOMContentLoaded", async () => {
    function renderTrendingTracks(tracks) {
        const html = tracks
            .map((track) => {
                return `<div class="hit-card">
                        <div class="hit-card-cover">
                            <img
                                src=${
                                    track.image_url
                                        ? track.image_url
                                        : "placeholder.svg?height=160&width=160"
                                }
                                alt=${escapeHTML(track.title)}
                            />
                            <button class="hit-play-btn">
                                <i class="fas fa-play"></i>
                            </button>
                        </div>
                        <div class="hit-card-info">
                            <h3 class="hit-card-title">
                                ${escapeHTML(track.title)}
                            </h3>
                            <p class="hit-card-artist">
                                ${escapeHTML(track.artist_name)}
                            </p>
                        </div>
                    </div>`;
            })
            .join("");
        hitsGrid.innerHTML = html;
    }

    async function fetchAndRenderTrendingTracks() {
        try {
            const { tracks, pagination } = await httpRequest.get(
                "tracks/trending?limit=8"
            );

            renderTrendingTracks(tracks);
        } catch (error) {
            console.error("Cannot fetch Trending Tracks!");
            console.dir(error);
        }
    }

    const hitsGrid = $(".hits-grid");

    await fetchAndRenderTrendingTracks();
});

async function fetchAndRenderPlaylist(playlistId) {
    const playlistImage = $(".playlist-image");
    const playlistStatus = $(".playlist-status");
    const playlistHeading = $(".playlist-heading");
    const followBtn = $(".playlist-section .follow-btn");
    const playlistStats = $(".playlist-stats");
    const trackList = $(".playlist-section .track-list");

    try {
        const playlist = await httpRequest.get(`playlists/${playlistId}`);
        console.log(playlist);

        // đính playlistId vào playlist-section
        playlistSection.setAttribute("data-id", playlistId);

        // update elements in playlist UI
        // update image source
        playlistImage.src = playlist.image_url
            ? playlist.image_url
            : "placeholder.svg";

        // update playlist status (public/private)
        playlistStatus.textContent = playlist.is_public
            ? "Public Playlist"
            : "Private Playlist";

        // update playlist name
        playlistHeading.textContent = playlist.name;

        // update Follow button, không phải owner thì mới hiện
        playlist.is_owner
            ? followBtn.classList.remove("show")
            : followBtn.classList.add("show");
        followBtn.textContent = playlist.is_following ? "Following" : "Follow";

        // update playlist stats
        const totalTracks = playlist.total_tracks;
        const totalDuration = playlist.total_duration;
        playlistStats.textContent = `${
            totalTracks > 1 ? totalTracks + " songs" : totalTracks + " song"
        }, ${formatPlaylistDuration(totalDuration)}`;

        // gắn ID cho trackList
        trackList.setAttribute("id", playlistId);

        // render tracks in playlist
        const { tracks, pagination } = await httpRequest.get(
            `playlists/${playlistId}/tracks`
        );

        // ! gán nextSongList = DS bài hát của playlist này
        nextSongList = tracks;
        nextSongListId = playlistId;

        console.log(tracks);

        renderTrackList(tracks, playlistId);
    } catch (error) {
        console.dir(error);
    }
}

async function fetchAndRenderArtist(artistId) {
    // get DOM elements
    const heroImage = $(".hero-image");
    const verifiedIcon = $(".verified-icon");
    const verifiedText = $(".verified-text");
    const artistName = $(".artist-name");
    const monthlyListeners = $(".monthly-listeners");
    const followBtn = $(".artist-controls .follow-btn");
    const trackList = $(".artist-section .track-list");

    try {
        const artist = await httpRequest.get(`artists/${artistId}`);
        console.log(artist);

        // đính artistId vào artist-section
        artistSection.setAttribute("data-id", artistId);

        // update elements in playlist UI
        // update bg image
        heroImage.src = artist.background_image_url
            ? artist.background_image_url
            : "placeholder.svg";

        // update verified status
        if (artist.is_verified) {
            verifiedIcon.style.display = "block";
            verifiedText.textContent = "Verified Artist";
        } else {
            verifiedIcon.style.display = "none";
            verifiedText.textContent = "Unverified Artist";
        }

        // artist name
        artistName.textContent = artist.name;

        // update monthlyListeners
        monthlyListeners.textContent = `${artist.monthly_listeners.toLocaleString()} monthly listeners`;

        // update follow button
        followBtn.classList.add("show");
        followBtn.textContent = artist.is_following ? "Following" : "Follow";

        // gắn ID cho trackList
        trackList.setAttribute("id", artistId);

        // render popular tracks of this artist
        const { tracks, pagination } = await httpRequest.get(
            `artists/${artistId}/tracks/popular`
        );

        // ! gán nextSongList = DS bài hát
        nextSongList = tracks;
        nextSongListId = artistId;

        console.log(tracks);

        renderTrackList(tracks, artistId);
    } catch (error) {
        console.dir(error);
    }
}

async function handlePlaylistClick(playlistId) {
    // display Playlist section
    playlistSection.classList.add("show");

    // hide other sections
    hitsSection.classList.remove("show");
    popularArtistsSection.classList.remove("show");
    artistSection.classList.remove("show");

    await fetchAndRenderPlaylist(playlistId);
}

async function handleArtistClick(artistId) {
    // display Artist section
    artistSection.classList.add("show");

    // hide other sections
    hitsSection.classList.remove("show");
    popularArtistsSection.classList.remove("show");
    playlistSection.classList.remove("show");

    await fetchAndRenderArtist(artistId);
}

// Popular Artists Section
document.addEventListener("DOMContentLoaded", async () => {
    function renderPopularArtists(artists) {
        const html = artists
            .map((artist) => {
                return `<div class="artist-card" data-artist-id="${escapeHTML(
                    artist.id
                )}">
                        <div class="artist-card-cover">
                            <img 
                                src="${
                                    artist.background_image_url
                                        ? artist.background_image_url
                                        : "placeholder.svg?height=160&width=160"
                                }"
                                alt="${escapeHTML(artist.name)}"
                            />
                            <button class="artist-play-btn">
                                <i class="fas fa-play"></i>
                            </button>
                        </div>
                        <div class="artist-card-info">
                            <h3 class="artist-card-name">${escapeHTML(
                                artist.name
                            )}</h3>
                            <p class="artist-card-type">Artist</p>
                        </div>
                    </div>`;
            })
            .join("");
        artistsGrid.innerHTML = html;
    }

    async function fetchAndRenderPopularArtists() {
        try {
            const { artists, pagination } = await httpRequest.get(
                "artists/trending?limit=5"
            );

            renderPopularArtists(artists);
        } catch (error) {
            console.dir(error);
            console.error("Failed to load Popular Artists!");
        }
    }

    const artistsGrid = $(".artists-grid");

    await fetchAndRenderPopularArtists();

    artistsGrid.addEventListener("click", async (e) => {
        const artistCard = e.target.closest(".artist-card");
        if (!artistCard) return;

        const artistPlayBtn = e.target.closest(".artist-play-btn");
        const artistId = artistCard.dataset.artistId;

        await handleArtistClick(artistId);

        if (artistPlayBtn) {
            currentIndex = 0;
            currentSongList = nextSongList;
            currentSongListId = nextSongListId;
            loadRenderAndPlay();
        }
    });
});

// ==== play music ===================
const playerImage = $(".player-image");
const playerTitle = $(".player-title");
const playerArtist = $(".player-artist");
const addBtn = $(".add-btn"); // add to liked songs

const shuffleBtn = $(".shuffle-btn");
const previousBtn = $(".previous-btn");
const playPauseBtn = $(".play-pause-btn");
const playPauseBtnIcon = $(".play-pause-btn i");
const nextBtn = $(".next-btn");
const repeatBtn = $(".repeat-btn");
const progressBar = $(".progress-bar-wrapper");
const innerProgressBar = $(".inner-progress-bar");
const elapsedTime = $(".elapsed-time");
const totalDuration = $(".total-duration");

const volumeBar = $(".volume-bar-wrapper");
const innerVolumeBar = $(".inner-volume-bar");
const volumeIcon = $(".volume-container button i");

let isSeeking = false;
let isAdjustingVolume = false;

function renderTrackList(tracks, trackListId) {
    const container = document.getElementById(trackListId);
    if (!container) {
        console.error("Cannot find container");
        return;
    }

    if (!tracks.length) {
        container.innerHTML = `<p>The List is Empty!</p>`;
        return;
    }

    let trackNumber, addPlaying, addPlayingText;

    const html = tracks
        .map((track, index) => {
            // normalize track fields
            // vì Get playlist tracks & Get artist's popular tracks trả về track nhưng lại có fields khác nhau
            const imgSrc =
                track.image_url ||
                track.track_image_url ||
                "placeholder.svg?height=40&width=40";

            const title = escapeHTML(
                track.title || track.track_title || "Unknown Title"
            );

            const playCount = (
                track.play_count ||
                track.track_play_count ||
                0
            ).toLocaleString();

            const duration = formatTrackDuration(
                track.duration || track.track_duration || 0
            );

            // khi songList nằm trong 'view' (tức songList đang xem là songList đang phát)
            if (currentSongListId === nextSongListId) {
                trackNumber =
                    currentIndex === index
                        ? `<i class="fas fa-volume-up playing-icon"></i>`
                        : index + 1;

                addPlaying = currentIndex === index ? "playing" : ""; // add playing class or not?
                addPlayingText = currentIndex === index ? "playing-text" : ""; // add playing-text class or not?
            }
            // khi songList không nằm trong 'view'
            else {
                trackNumber = index + 1;
                addPlaying = "";
                addPlayingText = "";
            }

            return `<div class="track-item ${addPlaying}" data-index=${index}>
                            <div class="track-number">${trackNumber}</div>
                            <div class="track-image">
                                <img 
                                    src="${imgSrc}"
                                    alt="${title}"
                                />
                            </div>
                            <div class="track-info">
                                <div class="track-name ${addPlayingText}">
                                    ${title}
                                </div>
                            </div>
                            <div class="track-plays">
                                ${playCount}
                            </div>
                            <div class="track-duration">
                                ${duration}
                            </div>
                            <button class="track-menu-btn">
                                <i class="fas fa-ellipsis-h"></i>
                            </button>
                        </div>`;
        })
        .join("");
    container.innerHTML = html;
}

function calculateBarFillPercent(e, barElement) {
    // barElement refers to progressBar or volumeBar
    const rect = barElement.getBoundingClientRect();
    const barWidth = rect.width; // progress bar or volume bar width
    const leftBarElementCoord = rect.left; // left edge X-coordinate of progress/volume bar
    const currentXCoord = e.clientX; // mouse X-coordinate

    let barFillPercent =
        ((currentXCoord - leftBarElementCoord) * 100) / barWidth;

    // clamp barFillPercent between 0% and 100%
    if (barFillPercent < 0) barFillPercent = 0;
    else if (barFillPercent > 100) barFillPercent = 100;

    return barFillPercent;
}

// update innerProgressBar width and elapsedTime text
function updateProgressPreview(fillPercent) {
    if (Number.isNaN(audioElement.duration)) return;

    // update innerProgressBar width
    innerProgressBar.style.width = `${fillPercent}%`;

    // update elapsedTime text
    elapsedTime.textContent = formatTrackDuration(
        (audioElement.duration * fillPercent) / 100
    );
}

function loadCurrentSong() {
    const currentSong = currentSongList[currentIndex];

    // update Song info in player-left
    const imgSrc =
        currentSong.image_url ||
        currentSong.track_image_url ||
        "placeholder.svg?height=56&width=56";
    playerImage.src = imgSrc;

    const title = escapeHTML(
        currentSong.title || currentSong.track_title || "Unknown Title"
    );
    playerTitle.textContent = title;

    const artistName = escapeHTML(
        currentSong.artist_name || currentSong.album_title || "Unknown Artists"
    );
    playerArtist.textContent = artistName;

    // update duration
    const duration = formatTrackDuration(
        currentSong.duration || currentSong.track_duration || 0
    );
    audioElement.addEventListener(
        "loadedmetadata",
        () => {
            totalDuration.textContent = duration;
        },
        { once: true }
    );

    // update audio source
    audioElement.src = currentSong.audio_url || currentSong.track_audio_url;
}

function playSong() {
    audioElement.play();
}

function loadRenderAndPlay() {
    loadCurrentSong();
    renderTrackList(currentSongList, currentSongListId);
    playSong();
}

function switchSong(direction) {
    currentIndex =
        (currentIndex + direction + currentSongList.length) %
        currentSongList.length;

    loadRenderAndPlay();
}

playPauseBtn.addEventListener("click", () => {
    if (!currentSongList.length) return; // no song in list

    if (audioElement.paused) {
        audioElement.play();
    } else {
        audioElement.pause();
    }
});

audioElement.addEventListener("play", () => {
    playPauseBtnIcon.classList.remove("fa-play");
    playPauseBtnIcon.classList.add("fa-pause");
});

audioElement.addEventListener("pause", () => {
    playPauseBtnIcon.classList.remove("fa-pause");
    playPauseBtnIcon.classList.add("fa-play");
});

audioElement.addEventListener("ended", () => {
    if (isRepeated) {
        audioElement.play();
    } else {
        switchSong(NEXT);
    }
});

// progress bar
audioElement.addEventListener("timeupdate", () => {
    // if user is seeking or duration is NaN -> prevent update
    if (isSeeking || !audioElement.duration) return;

    // update elapsedTime text
    elapsedTime.textContent = formatTrackDuration(audioElement.currentTime);

    const barFillPercent =
        (audioElement.currentTime * 100) / audioElement.duration;

    innerProgressBar.style.width = `${barFillPercent}%`;
});

progressBar.addEventListener("mousedown", function (e) {
    if (!currentSongList.length) return;

    isSeeking = true;

    // update innerProgressBar width and elapsedTime text
    const barFillPercent = calculateBarFillPercent(e, this);
    updateProgressPreview(barFillPercent);

    // style innerProgressBar
    progressBar.classList.add("is-seeking");
});

document.addEventListener("mouseup", (e) => {
    if (isSeeking) {
        const barFillPercent = calculateBarFillPercent(e, progressBar);

        // update currentTime
        audioElement.currentTime =
            (audioElement.duration * barFillPercent) / 100;

        // reset innerProgressBar style
        progressBar.classList.remove("is-seeking");

        isSeeking = false;
    }
});

document.addEventListener("mousemove", (e) => {
    if (isSeeking) {
        const barFillPercent = calculateBarFillPercent(e, progressBar);

        // update innerProgressBar width and elapsedTime text
        updateProgressPreview(barFillPercent);
    }
});

previousBtn.addEventListener("click", () => {
    if (!currentSongList.length) return; // no song in list

    if (audioElement.currentTime > REPLAY_THRESHOLD) {
        audioElement.currentTime = 0;
    } else {
        switchSong(PREVIOUS);
    }
});

nextBtn.addEventListener("click", () => {
    if (!currentSongList.length) return; // no song in list

    switchSong(NEXT);
});

repeatBtn.addEventListener("click", function () {
    isRepeated = !isRepeated;
    this.classList.toggle("active", isRepeated);

    // save
    localStorage.setItem("isRepeated", isRepeated);
});

shuffleBtn.addEventListener("click", function () {
    isShuffled = !isShuffled;
    this.classList.toggle("active", isShuffled);

    // save
    localStorage.setItem("isShuffled", isShuffled);
});

// volume bar
volumeBar.addEventListener("mousedown", (e) => {
    isAdjustingVolume = true;

    // update inner width
    const barFillPercent = calculateBarFillPercent(e, volumeBar);
    innerVolumeBar.style.width = `${barFillPercent}%`;
    // update volume
    audioElement.volume = barFillPercent / 100;

    // style innerVolumeBar
    volumeBar.classList.add("is-adjusting");

    // change volumeIcon based on volume value
    setVolumeIcon(audioElement.volume);
});

document.addEventListener("mouseup", (e) => {
    if (isAdjustingVolume) {
        const barFillPercent = calculateBarFillPercent(e, volumeBar);
        // update volume
        audioElement.volume = barFillPercent / 100;

        // save to localStorage
        localStorage.setItem("volumeValue", audioElement.volume);

        // reset innerVolumeBar style
        volumeBar.classList.remove("is-adjusting");

        isAdjustingVolume = false;
    }
});

function setVolumeIcon(volumeValue) {
    const classes = [
        "fa-volume-xmark",
        "fa-volume-off",
        "fa-volume-low",
        "fa-volume-high",
    ];
    let volumeClass;

    volumeIcon.classList.remove(...classes);

    if (volumeValue === 0) {
        volumeClass = classes[0];
    } else if (volumeValue <= 0.3) {
        volumeClass = classes[1];
    } else if (volumeValue <= 0.8) {
        volumeClass = classes[2];
    } else {
        volumeClass = classes[3];
    }

    volumeIcon.classList.add(volumeClass);
}

document.addEventListener("mousemove", (e) => {
    if (isAdjustingVolume) {
        const barFillPercent = calculateBarFillPercent(e, volumeBar);
        // update inner width
        innerVolumeBar.style.width = `${barFillPercent}%`;
        // update volume
        audioElement.volume = barFillPercent / 100;

        // change volumeIcon based on volume value
        setVolumeIcon(audioElement.volume);
    }
});

// ==================================
// ====== playlist/artist page ======
// ==================================

// handle large play btn click
function handlePlayBtnClick() {
    // songList đang xem không phải songList đang phát
    if (currentSongListId !== nextSongListId) {
        if (!nextSongList.length) return;

        currentIndex = 0;
        currentSongList = nextSongList;
        currentSongListId = nextSongListId;
        loadRenderAndPlay();

        // change icon
    }
    // songList đang xem là songList đang phát
    else {
        playPauseBtn.click();
        // change icon
    }
}

playlistPlayBtn.addEventListener("click", handlePlayBtnClick);

artistPlayBtn.addEventListener("click", handlePlayBtnClick);

function handleSongListDblclick(e) {
    const trackItem = e.target.closest(".track-item");
    const menuBtn = e.target.closest(".track-menu-btn");

    if (!trackItem || menuBtn) return;

    currentIndex = +trackItem.dataset.index; // convert to number

    currentSongList = nextSongList;
    currentSongListId = nextSongListId;

    loadRenderAndPlay();
}

// handle playlist's track-list double clicks
$(".playlist-section .track-list").addEventListener(
    "dblclick",
    handleSongListDblclick
);

// handle artist's popular track-list double clicks
$(".artist-section .track-list").addEventListener(
    "dblclick",
    handleSongListDblclick
);

// modify playlist - không sửa được Liked Songs || của người khác
const playlistImage = $(".playlist-image");
const editPlaylistImageBtn = $(".edit-image-btn");
const editPlaylistDetailsBtn = $(".edit-details-btn");
const playlistEditDetailsModal = $("#playlistModal");
const playlistCoverInput = $(".playlist-cover-input");
const uploadImageBtn = $(".upload-image-btn");
const playlistPreviewImage = $(".playlist-preview-image");
const playlistEditDetailsSaveBtn = $(".playlist-save-btn");

// form elements
const playlistEditForm = $(".playlist-form");
const playlistNameInput = $(".playlist-name-input");
const playlistDescInput = $(".playlist-desc-input");

let editPlaylistId, formData;

function closePlaylistEditDetailsModal() {
    playlistEditDetailsModal.classList.remove("show");
    // remove error message when closing modal
    playlistNameInput.classList.remove("invalid");
}

async function getPlaylistById(playlistId) {
    try {
        const playlist = await httpRequest.get(`playlists/${playlistId}`);

        return playlist;
    } catch (error) {
        console.dir(error);
        console.error("Cannot get Playlist!");
    }
}

// close playlistEditDetailsModal when clicking close button
$("#playlistModalClose").addEventListener("click", () => {
    closePlaylistEditDetailsModal();
});

// close playlistEditDetailsModal when clicking overlay
playlistEditDetailsModal.addEventListener("click", (e) => {
    if (e.target === playlistEditDetailsModal) {
        closePlaylistEditDetailsModal();
    }
});

// close playlistEditDetailsModal with Escape key
document.addEventListener("keydown", (e) => {
    if (
        e.key === "Escape" &&
        playlistEditDetailsModal.classList.contains("show")
    ) {
        closePlaylistEditDetailsModal();
    }
});

editPlaylistDetailsBtn.addEventListener("click", async (e) => {
    const user = JSON.parse(localStorage.getItem("user"));
    if (!user) {
        // show toast
        console.error("log in/sign up to edit playlist");
        return;
    }

    editPlaylistId = playlistSection.dataset.id;
    const playlist = await getPlaylistById(editPlaylistId);

    // cannot edit if the playlist is 'Liked Songs' (default) or owned by other users
    if (!playlist.is_owner) {
        // show toast

        console.error("Cannot edit other user's playlist!");
        return;
    } else if (playlist.name === "Liked Songs") {
        // show toast

        console.error("Cannot edit default playlist!");
        return;
    }

    // fill current playlist name
    playlistNameInput.value = playlist.name;

    // show current playlist cover image in edit modal
    playlistPreviewImage.src = playlist.image_url || "placeholder.svg";

    // show modal
    playlistEditDetailsModal.classList.add("show");
});

editPlaylistImageBtn.addEventListener("click", () => {
    editPlaylistDetailsBtn.click();
    uploadImageBtn.click();
});

async function updatePlaylistImageUrl(playlistId, formData) {
    if (!formData || !formData.get("cover")) return;

    try {
        const { file, message, playlist_id } = await httpRequest.post(
            `upload/playlist/${playlistId}/cover`,
            formData
        );

        console.log(message);

        // update playlist's image_url to DB
        const res = await httpRequest.put(`playlists/${playlistId}`, {
            image_url: `https://spotify.f8team.dev${file.url}`,
        });
        console.log(res.message);
    } catch (error) {
        console.dir(error);
        console.error("Failed to update playlist cover image!");

        // show toast error
    }
}

playlistEditDetailsSaveBtn.addEventListener("click", async (e) => {
    const name = playlistNameInput.value.trim();
    const description = playlistDescInput.value.trim();
    const data = { name, description };

    // check whether name is empty
    if (!name) {
        playlistNameInput.classList.add("invalid");
        return;
    }

    try {
        // update playlist name + desc
        const { message, playlist } = await httpRequest.put(
            `playlists/${editPlaylistId}`,
            data
        );
        console.log(message);

        // upload playlist cover image
        await updatePlaylistImageUrl(editPlaylistId, formData);

        // re-render sidebar
        await reRenderSidebar();

        // re-render playlist
        await fetchAndRenderPlaylist(editPlaylistId);

        // show toast success
    } catch (error) {
        console.dir(error);
        console.error("Cannot update this playlist!");
        // show toast
    } finally {
        // close modal
        closePlaylistEditDetailsModal();

        // clear
        formData = null;
        playlistCoverInput.value = ""; // Clear file input
        playlistPreviewImage.src = "";
    }
});

// hide error message when user types something
playlistNameInput.addEventListener("input", function () {
    this.classList.remove("invalid");
});

// upload image
uploadImageBtn.addEventListener("click", () => {
    playlistCoverInput.click();
});

// listen for changes to the file input
playlistCoverInput.addEventListener("change", async () => {
    // get the first file selected by user
    const file = playlistCoverInput.files[0];
    if (!file) return;

    formData = new FormData();
    formData.append("cover", file); // append the file under the key 'cover'

    console.log(file);

    // update preview image
    const reader = new FileReader(); // create new FileReader instance to read image file

    // start reading the file as Data URL
    reader.readAsDataURL(file);

    // run once the file is successfully read
    reader.onload = (e) => {
        // e.target = reader
        // e.target.result: base64-encoded data URL (result of reading image file)
        playlistPreviewImage.src = e.target.result;
    };
});

// go to Home buttons
$$(".go-home-btn").forEach((button) => {
    button.addEventListener("click", () => {
        // display Biggest hits + popular artists
        hitsSection.classList.add("show");
        popularArtistsSection.classList.add("show");

        // hide playlist + artist section
        playlistSection.classList.remove("show");
        artistSection.classList.remove("show");
    });
});

// ======= tooltip =======
$$(".tooltip").forEach((ele) => {
    const tooltipText = ele.querySelector(".tooltip-text");
    if (!tooltipText) return;

    let timeoutId;

    ele.addEventListener("mouseenter", () => {
        timeoutId = setTimeout(() => {
            Object.assign(tooltipText.style, {
                opacity: "1",
                visibility: "visible",
            });
        }, 500);
    });

    ele.addEventListener("mouseleave", () => {
        clearTimeout(timeoutId);

        Object.assign(tooltipText.style, {
            opacity: "0",
            visibility: "hidden",
        });
    });
});

// ================ helpers ====================
function formatPlaylistDuration(duration) {
    const hours = Math.floor(duration / 3600);
    const minutes = Math.floor((duration % 3600) / 60);
    const seconds = duration % 60;

    if (hours) {
        return `about ${hours === 1 ? "hour" : "hours"}`;
    } else {
        return `${minutes} min ${seconds} sec`;
    }
}

function formatTrackDuration(duration) {
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

function updateUserInfo(user) {
    if (!user) return;

    const userName = $("#user-name");
    const userAvatarImg = $("#user-avatar-img");
    const userInfo = $(".user-info");
    const authButtons = $(".auth-buttons");

    // set avatar
    if (user.avatar_url) {
        userAvatarImg.src = user.avatar_url;
    }

    // set Display name or email
    if (user.display_name) {
        userName.textContent = user.display_name;
    } else {
        userName.textContent = user.email;
    }

    // display userInfo
    userInfo.classList.add("show");

    // hide sign in/up buttons
    authButtons.classList.remove("show");
}

function escapeHTML(html) {
    // return DOMPurify.sanitize(html);
    const div = document.createElement("div");
    div.textContent = html;
    return div.innerHTML;
}

function generateEmail() {
    return (
        "ddx" +
        Math.ceil(Math.random() * 1000) +
        Math.ceil(Math.random() * 1000) +
        "@gmail.com"
    );
}

function generatePass() {
    return (
        "1Ddx" +
        Math.ceil(Math.random() * 1000) +
        Math.ceil(Math.random() * 1000)
    );
}

/*
main account: 
{ 
  "username": "xdd",
  "email": "xdd@gmail.com",
  "password": "Password123",
  "display_name": "xdd",
  "bio": "something",
  "country": "US"
}
*/
