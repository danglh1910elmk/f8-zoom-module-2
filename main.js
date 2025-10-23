import httpRequest from "./utils/httpRequest.js";
import {
    showToast,
    escapeHTML,
    formatPlaylistDuration,
    formatTrackDuration,
    createArray,
    shuffleArray,
    generateEmail,
    generatePass,
} from "./utils/helpers.js";

const $ = document.querySelector.bind(document);
const $$ = document.querySelectorAll.bind(document);

const siteTitle = $("title");
const hitsSection = $(".hits-section");
const popularArtistsSection = $(".popular-artists-section");
const artistSection = $(".artist-section");
const playlistSection = $(".playlist-section");

const libraryContentContainer = $(".library-content");

const playlistPlayBtn = $(".playlist-controls .play-btn-large");
const playlistPlayBtnIcon = $(".playlist-controls .play-btn-large i");
const artistPlayBtn = $(".artist-controls .play-btn-large");
const artistPlayBtnIcon = $(".artist-controls .play-btn-large i");

const audioElement = $(".audio");

const REPLAY_THRESHOLD = 2;
const NEXT = 1;
const PREVIOUS = -1;
let isRepeated = false;
let isShuffled = false;
let currentIndex;
let currentSongList = []; // playlist đang play
let nextSongList = [];
let currentSongListId;
let nextSongListId; // playlistId/artistId khi nhấn vào 1 playlist/artist cụ thể
/*
    - mỗi khi vào 1 playlist/artist cụ thể, gán nextSongListId = playlistId/artistId đồng thời gán nextSongList = DS bài hát của playlist/artist đó
    - khi nhấn vào playlistPlayBtn/artistPlayBtn (click vào 1 song trong songList) thì sẽ gán currentSongList = nextSongList và play currentSongList 
    - currentSongListId, nextSongListId: mục đích để sau này kiểm tra xem nextSongList có nằm trong 'view' không
*/

// ========================================
// ======= Auth Modal Functionality =======
// ========================================
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

        signupEmailInput.value = generateEmail();
        $("#signupPassword").value = generatePass();
    });

    // Open modal with Login form when clicking Login button
    loginBtn.addEventListener("click", function () {
        showLoginForm();
        openModal();
        loginEmailInput.focus();

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
                // console.log("sign up user: ", user);

                // show toast
                showToast("Signed up successfully", true);

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

                // console.log("login user: ", user);
                console.log("Logged in successfully");

                // show toast
                showToast("Logged in successfully", true);

                // save user, accessToken, refreshToken to localStorage
                localStorage.setItem("user", JSON.stringify(user));
                localStorage.setItem("accessToken", access_token);
                localStorage.setItem("refreshToken", refresh_token);

                updateUserInfo(user);
                fetchAndRenderSidebar(user);

                // go to home
                $(".go-home-btn").click();

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

    // set display_name or email
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

// ================================================
// == User Menu Dropdown Functionality (log out) ==
// ================================================
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

            // show toast
            showToast("Logged out successfully", true);

            // hide user-info
            userInfo.classList.remove("show");

            // display sign in/up button
            authButtons.classList.add("show");

            // update sidebar
            fetchAndRenderSidebar(null);

            // go to home
            $(".go-home-btn").click();

            // remove accessToken localStorage
            localStorage.removeItem("accessToken");

            // remove user from localStorage
            localStorage.removeItem("user");
        } catch (error) {
            console.dir(error);
            console.error("Failed to log out: ", error.message);
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
        console.error(
            "Cannot fetch user's followed and owned playlists: ",
            error.message
        );
    }
}

async function fetchFollowedArtists() {
    try {
        // get user's followed artists
        const res = await httpRequest.get("me/following");
        return res.artists;
    } catch (error) {
        console.dir(error);
        console.error("Cannot fetch user's followed artists: ", error.message);
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
                            item.image_url ||
                            "placeholder.svg?height=48&width=48"
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
        console.error("Failed to fetch sidebar: ", error.message);
    }
}

async function renderSidebarSearchedResults(
    searchString,
    type = 3,
    sortMode = "recent"
) {
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

        // filter - name hoặc user_username (nếu có) chứa searchString
        allItems = allItems.filter((item) => {
            return (
                item.name.toLowerCase().includes(searchString) ||
                item?.user_username?.toLowerCase()?.includes(searchString)
            );
        });

        // sort handling
        allItems = sortArray(allItems, sortMode);

        // render
        renderSidebar(allItems);
    } catch (error) {
        console.dir(error);
        console.error("Failed to render sidebar: ", error.message);
    }
}

async function reRenderSidebar() {
    const type = +localStorage.getItem("type"); // convert to number
    const sortMode = localStorage.getItem("sortMode"); // get config from localStorage
    await fetchAndRenderSidebar(true, type, sortMode);
}

// =======================================
// =============== Sidebar ===============
// =======================================
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

    // ================================================
    // ===== sort playlists/artists functionality =====
    // ================================================
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
        if (!isUserLoggedIn("Log in to do this action!")) return;

        const dropdownItem = e.target.closest(".dropdown-item");
        const sortDropdownBtn =
            dropdownItem.querySelector(".sort-dropdown-btn");
        const sortBtnText = $(".sort-btn-text");

        const type = +localStorage.getItem("type");

        if (sortDropdownBtn.classList.contains("sort-by-recent")) {
            addActiveClassToDropdownItem(dropdownItem);
            fetchAndRenderSidebar(true, type, "recent");

            // nếu librarySearchInput đang hiển thị và đang có input trong đó
            if (
                librarySearchInputWrapper.classList.contains("show") &&
                sidebarSearchString
            ) {
                renderSidebarSearchedResults(
                    sidebarSearchString,
                    type,
                    "recent"
                );
            } else {
                fetchAndRenderSidebar(true, type, "recent");
            }

            sortBtnText.textContent = "Recents";
            // save config
            localStorage.setItem("sortMode", "recent");
        } else if (sortDropdownBtn.classList.contains("sort-by-alphabetical")) {
            addActiveClassToDropdownItem(dropdownItem);

            // nếu librarySearchInput đang hiển thị và đang có input trong đó
            if (
                librarySearchInputWrapper.classList.contains("show") &&
                sidebarSearchString
            ) {
                renderSidebarSearchedResults(
                    sidebarSearchString,
                    type,
                    "alphabetical"
                );
            } else {
                fetchAndRenderSidebar(true, type, "alphabetical");
            }

            sortBtnText.textContent = "Alphabetical";
            // save config
            localStorage.setItem("sortMode", "alphabetical");
        }

        // close Dropdown
        sortDropdown.classList.remove("show");
    });

    // =====================================================
    // ===== filter by Playlist / Artist functionality =====
    // =====================================================
    playlistsFilterBtn.addEventListener("click", function () {
        if (!isUserLoggedIn("Log in to do this action!")) return;

        let sortMode;
        // if playlistsFilterBtn is active -> remove 'active' then re-render
        if (this.classList.contains("active")) {
            this.classList.remove("active");

            sortMode = localStorage.getItem("sortMode");

            // nếu librarySearchInput đang hiển thị và đang có text trong input
            if (
                librarySearchInputWrapper.classList.contains("show") &&
                sidebarSearchString
            ) {
                renderSidebarSearchedResults(sidebarSearchString, 3, sortMode);
            } else {
                fetchAndRenderSidebar(true, 3, sortMode); // render both playlists and artists
            }
            // save config
            localStorage.setItem("type", 3);
        }
        // if playlistsFilterBtn is not active -> add 'active' class then re-render
        else {
            this.classList.add("active");
            artistsFilterBtn.classList.remove("active");

            sortMode = localStorage.getItem("sortMode");

            // nếu librarySearchInput đang hiển thị và đang có text trong input
            if (
                librarySearchInputWrapper.classList.contains("show") &&
                sidebarSearchString
            ) {
                renderSidebarSearchedResults(sidebarSearchString, 1, sortMode);
            } else {
                fetchAndRenderSidebar(true, 1, sortMode); // render playlists only
            }
            // save config
            localStorage.setItem("type", 1);
        }
    });

    artistsFilterBtn.addEventListener("click", function () {
        if (!isUserLoggedIn("Log in to do this action!")) return;

        let sortMode;

        // if artistsFilterBtn is active -> remove 'active' then re-render
        if (this.classList.contains("active")) {
            this.classList.remove("active");

            sortMode = localStorage.getItem("sortMode");

            // nếu librarySearchInput đang hiển thị và đang có text trong input
            if (
                librarySearchInputWrapper.classList.contains("show") &&
                sidebarSearchString
            ) {
                renderSidebarSearchedResults(sidebarSearchString, 3, sortMode);
            } else {
                fetchAndRenderSidebar(true, 3, sortMode); // render both playlists and artists
            }
            // save config
            localStorage.setItem("type", 3);
        }
        // if artistsFilterBtn is not active -> add 'active' class then re-render
        else {
            this.classList.add("active");
            playlistsFilterBtn.classList.remove("active");

            sortMode = localStorage.getItem("sortMode");

            // nếu librarySearchInput đang hiển thị và đang có text trong input
            if (
                librarySearchInputWrapper.classList.contains("show") &&
                sidebarSearchString
            ) {
                renderSidebarSearchedResults(sidebarSearchString, 2, sortMode);
            } else {
                fetchAndRenderSidebar(true, 2, sortMode); // render both playlists and artists
            }
            // save config
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
        if (!isUserLoggedIn("Log in to create new playlist!")) return;

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

            // re-render sidebar
            await reRenderSidebar();

            // open new created playlist
            await handlePlaylistClick(playlist.id);

            // show toast
            showToast("Playlist created successfully", true);
        } catch (error) {
            console.dir(error);
            console.error("Failed to create new playlist: ", error.message);

            // show toast
            showToast("Failed to create playlist", false);
        }
    });

    // =============================================
    // ======= playlist/artist context menu ========
    // =============================================
    const playlistContextMenu = $(".playlist-context-menu");
    const artistContextMenu = $(".artist-context-menu");

    let contextMenuId; // lưu playlistId/artistId khi chuột phải vào playlist/artist trong sidebar

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
            await handleUnfollowPlaylist(contextMenuId); // doing
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

    // ==============================================
    // =============== sidebar search ===============
    // ==============================================
    const searchLibraryBtn = $(".search-library-btn");
    const librarySearchInputWrapper = $(".library-search-input-wrapper");
    const librarySearchInput = $(".library-search-input");
    const inputClearBtn = $(".input-clear-btn");

    let sidebarSearchString;

    searchLibraryBtn.addEventListener("click", () => {
        if (!isUserLoggedIn()) return;

        librarySearchInputWrapper.classList.toggle("show");
        setTimeout(() => {
            librarySearchInput.focus();
        }, 100); // delay 1 chút mới focus được
    });

    librarySearchInput.addEventListener("keydown", async (e) => {
        if (e.key !== "Enter") return;

        sidebarSearchString = librarySearchInput.value.trim();

        if (!sidebarSearchString) return;

        const type = +localStorage.getItem("type");
        const sortMode = localStorage.getItem("sortMode");
        await renderSidebarSearchedResults(sidebarSearchString, type, sortMode);
    });

    // close librarySearchInput when clicking outside
    document.addEventListener("click", async (e) => {
        // khi nhấn bên ngoài và searchString không có gì -> ẩn librarySearchInput và render lại sidebar
        if (
            !librarySearchInputWrapper.contains(e.target) &&
            !searchLibraryBtn.contains(e.target) &&
            librarySearchInputWrapper.classList.contains("show") &&
            !sidebarSearchString
        ) {
            librarySearchInputWrapper.classList.remove("show");
            sidebarSearchString = "";
            librarySearchInput.value = "";

            const type = +localStorage.getItem("type");
            const sortMode = localStorage.getItem("sortMode");
            await fetchAndRenderSidebar(true, type, sortMode);
        }
    });

    inputClearBtn.addEventListener("click", () => {
        sidebarSearchString = "";
        librarySearchInput.value = "";
        librarySearchInput.focus();
    });
});

// prevent default context menu
document.addEventListener("contextmenu", (e) => {
    e.preventDefault();
});

function isUserLoggedIn(toastMessage = null) {
    const user = JSON.parse(localStorage.getItem("user"));
    if (!user) {
        toastMessage && showToast(toastMessage, false);
        return false;
    }

    return true;
}

async function handleFollowPlaylist(playlistId) {
    if (!isUserLoggedIn("Log in to follow this playlist!")) return;

    try {
        const playlist = await getPlaylistById(playlistId);
        // không cho follow/unfollow playlist của mình (giống spotify)
        if (playlist.is_owner) {
            // show toast ?
            console.error("Cannot follow your own playlist!");
            return;
        }

        const { message, is_following } = await httpRequest.post(
            `playlists/${playlistId}/follow`
        );

        // re-render sidebar
        await reRenderSidebar();

        // nếu nằm trong 'view' thì re-render playlist page
        if (nextSongListId === playlistId) {
            await fetchAndRenderPlaylistPage(playlistId);
        }

        // show toast success
        showToast(message, true);
    } catch (error) {
        console.dir(error);
        console.error("Failed to follow playlist: ", error.message);

        // show toast : error.response.error.message
        showToast(error.response.error.message, false);
    }
}

async function handleUnfollowPlaylist(playlistId) {
    try {
        const playlist = await getPlaylistById(playlistId);
        // không cho follow/unfollow playlist của mình (giống spotify)
        if (playlist.is_owner) {
            // show toast ?
            console.error("Cannot unfollow your own playlist!");
            return;
        }

        const { message, is_following } = await httpRequest.del(
            `playlists/${playlistId}/follow`
        );

        // re-render sidebar
        await reRenderSidebar();

        // nếu nằm trong 'view' thì re-render playlist page
        if (nextSongListId === playlistId) {
            await fetchAndRenderPlaylistPage(playlistId);
        }

        // show toast success
        showToast(message, true);
    } catch (error) {
        console.dir(error);
        console.error("Failed to unfollow playlist: ", error.message);

        // show toast : error.response.error.message
        showToast(error.response.error.message, false);
    }
}

async function handleDeletePlaylist(playlistId) {
    try {
        const playlist = await getPlaylistById(playlistId);
        // prevent deleting default playlist
        if (playlist.name === "Liked Songs") {
            // show toast
            console.error("Cannot delete default playlist!");
            showToast("Cannot delete default playlist!", false);
            return;
        }

        const { message } = await httpRequest.del(`playlists/${playlistId}`);

        // re-render sidebar
        await reRenderSidebar();

        // nếu nằm trong 'view' thì quay về Home
        if (nextSongListId === playlistId) {
            $(".go-home-btn").click();
        }

        // show toast
        showToast(message, true);
    } catch (error) {
        console.dir(error);
        console.error("Failed to delete playlist: ", error.message);

        // show toast : error.response.error.message = "Permission denied: You can only delete your own playlists"
        showToast(error.response.error.message, false);
    }
}

async function handleFollowArtist(artistId) {
    if (!isUserLoggedIn("Log in to follow this artist!")) return;

    try {
        const { message, is_following } = await httpRequest.post(
            `artists/${artistId}/follow`
        );

        // re-render sidebar
        await reRenderSidebar();

        // nếu nằm trong 'view' thì re-render artist page
        if (nextSongListId === artistId) {
            await fetchAndRenderArtistPage(artistId);
        }

        // show toast
        showToast(message, true);
    } catch (error) {
        console.dir(error);
        console.error("Failed to follow artist: ", error.message);

        // show toast : error.response.error.message
        // "Not following this artist"
        showToast(error.response.error.message, false);
    }
}

async function handleUnfollowArtist(artistId) {
    try {
        const { message, is_following } = await httpRequest.del(
            `artists/${artistId}/follow`
        );

        // re-render sidebar
        await reRenderSidebar();

        // nếu nằm trong 'view' thì re-render artist page
        if (nextSongListId === artistId) {
            await fetchAndRenderArtistPage(artistId);
        }

        // show toast
        showToast(message, true);
    } catch (error) {
        console.dir(error);
        console.error("Failed to unfollow artist: ", error.message);

        // show toast : error.response.error.message
        // "Not following this artist"
        showToast(error.response.error.message, false);
    }
}

function renderPlaylistCards(playlists, container) {
    const playlistsHtml = playlists
        .map((playlist) => {
            return `<div class="playlist-card" data-playlist-id="${
                playlist.id
            }">
                        <div class="playlist-card-cover">
                            <img
                                src="${
                                    playlist.image_url ||
                                    "placeholder.svg?height=160&width=160"
                                }"
                                alt="playlist cover image"
                            />
                            <button class="playlist-play-btn">
                                <i class="fas fa-play"></i>
                            </button>
                        </div>
                        <div class="playlist-card-info">
                            <h3 class="playlist-card-name">
                                ${escapeHTML(
                                    playlist.title || playlist.name || ""
                                )}
                            </h3>
                            <p class="playlist-card-type">
                                Playlist
                            </p>
                            <p class="playlist-card-author">${escapeHTML(
                                playlist.user_display_name ||
                                    playlist.user_username ||
                                    playlist.subtitle ||
                                    ""
                            )}</p>
                        </div>
                    </div>`;
        })
        .join("");
    container.innerHTML = playlistsHtml;
}

// Today's biggest hits section
document.addEventListener("DOMContentLoaded", async () => {
    async function fetchAndRenderHitsSection() {
        try {
            const { playlists, pagination } = await httpRequest.get(
                `playlists?limit=20&offset=0`
            );

            renderPlaylistCards(playlists, hitsGrid);
        } catch (error) {
            console.dir(error);
            console.error("Failed to fetch playlists:", error.message);
        }
    }

    const hitsGrid = $(".hits-grid");

    await fetchAndRenderHitsSection();

    hitsGrid.addEventListener("click", handlePlaylistsContainerClick);
});

// fetch & render playlist page
async function fetchAndRenderPlaylistPage(playlistId) {
    const editImageBtn = $(".edit-image-btn");
    const playlistStatus = $(".playlist-status");
    const playlistHeading = $(".playlist-heading");
    const followBtn = $(".playlist-section .follow-btn");
    const playlistStats = $(".playlist-stats");
    const trackList = $(".playlist-section .track-list");

    try {
        const playlist = await httpRequest.get(`playlists/${playlistId}`);

        // đính playlistId vào playlist-section
        playlistSection.setAttribute("data-id", playlistId);

        // đính thông tin is_owner
        playlistSection.setAttribute("data-is-owner", playlist.is_owner);

        // update elements in playlist UI
        // update image source
        if (playlist.name === "Liked Songs") {
            editImageBtn.innerHTML = `<div class="item-icon item-icon-full liked-songs">
                                        <i class="fas fa-heart"></i>
                                    </div>`;
        } else {
            const imageUrl = playlist.image_url || "placeholder.svg";
            editImageBtn.innerHTML = `<img src="${imageUrl}" alt="" class="playlist-image">`;
        }

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

        // update site title
        siteTitle.textContent = `${playlist.name} | Spotify`;

        // gắn ID cho trackList
        trackList.setAttribute("id", playlistId);

        // render tracks in playlist
        const { tracks, pagination } = await httpRequest.get(
            `playlists/${playlistId}/tracks`
        );

        // ! gán nextSongList = DS bài hát của playlist này
        nextSongList = tracks;
        nextSongListId = playlistId;

        // để đồng bộ icon của playPauseBtn và playlistPlayBtn/artistPlayBtn
        // change playlistPlayBtn icon based on audioElement play/pause state
        if (currentSongListId === nextSongListId) {
            if (audioElement.paused) {
                playlistPlayBtnIcon.classList.remove("fa-pause");
                playlistPlayBtnIcon.classList.add("fa-play");
            } else {
                playlistPlayBtnIcon.classList.remove("fa-play");
                playlistPlayBtnIcon.classList.add("fa-pause");
            }
        } else {
            playlistPlayBtnIcon.classList.add("fa-play");
            playlistPlayBtnIcon.classList.remove("fa-pause");
        }

        renderTrackList(tracks, playlistId);
    } catch (error) {
        console.dir(error);
    }
}

// fetch & render artist page
async function fetchAndRenderArtistPage(artistId) {
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

        // đính artistId vào artist-section
        artistSection.setAttribute("data-id", artistId);

        // update elements in playlist UI
        // update bg image
        heroImage.src = artist.background_image_url || "placeholder.svg";

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

        // update site title
        siteTitle.textContent = `${artist.name} | Spotify`;

        // gắn ID cho trackList
        trackList.setAttribute("id", artistId);

        // render popular tracks of this artist
        const { tracks, pagination } = await httpRequest.get(
            `artists/${artistId}/tracks/popular`
        );

        // ! gán nextSongList = DS bài hát
        nextSongList = tracks;
        nextSongListId = artistId;

        // để đồng bộ icon của playPauseBtn và playlistPlayBtn/artistPlayBtn
        // change artistPlayBtnIcon icon based on audioElement play/pause state
        if (currentSongListId === nextSongListId) {
            if (audioElement.paused) {
                artistPlayBtnIcon.classList.remove("fa-pause");
                artistPlayBtnIcon.classList.add("fa-play");
            } else {
                artistPlayBtnIcon.classList.remove("fa-play");
                artistPlayBtnIcon.classList.add("fa-pause");
            }
        } else {
            artistPlayBtnIcon.classList.add("fa-play");
            artistPlayBtnIcon.classList.remove("fa-pause");
        }

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

    await fetchAndRenderPlaylistPage(playlistId);
}

async function handleArtistClick(artistId) {
    // display Artist section
    artistSection.classList.add("show");

    // hide other sections
    hitsSection.classList.remove("show");
    popularArtistsSection.classList.remove("show");
    playlistSection.classList.remove("show");

    await fetchAndRenderArtistPage(artistId);
}

function renderArtistCards(artists, container) {
    const html = artists
        .map((artist) => {
            return `<div class="artist-card" data-artist-id="${escapeHTML(
                artist.id
            )}">
                        <div class="artist-card-cover">
                            <img 
                                src="${
                                    artist.image_url ||
                                    "placeholder.svg?height=160&width=160"
                                }"
                                alt="Artist cover image"
                            />
                            <button class="artist-play-btn">
                                <i class="fas fa-play"></i>
                            </button>
                        </div>
                        <div class="artist-card-info">
                            <h3 class="artist-card-name">${escapeHTML(
                                artist.name || artist.title
                            )}</h3>
                            <p class="artist-card-type">Artist</p>
                        </div>
                    </div>`;
        })
        .join("");
    container.innerHTML = html;
}

// Popular Artists Section
document.addEventListener("DOMContentLoaded", async () => {
    async function fetchAndRenderPopularArtists() {
        try {
            const { artists, pagination } = await httpRequest.get(
                "artists/trending?limit=20"
            );

            renderArtistCards(artists, artistsGrid);
        } catch (error) {
            console.dir(error);
            console.error("Failed to load Popular Artists: ", error.message);
        }
    }

    const artistsGrid = $(".artists-grid");

    await fetchAndRenderPopularArtists();

    artistsGrid.addEventListener("click", handleArtistsContainerClick);
});

// ====================================================
// =================== music player ===================
// ====================================================
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
let unplayedSongIndexes = [];

function removeElementFromUnplayedSongIndexes(element) {
    const index = unplayedSongIndexes.indexOf(element);
    if (index !== -1) {
        unplayedSongIndexes.splice(index, 1);
    }
}

function renderTrackList(tracks, trackListId) {
    const container = document.getElementById(trackListId);
    if (!container) {
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

            const trackId = escapeHTML(track.track_id || track.id);

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

            return `<div class="track-item ${addPlaying}" data-index=${index} data-track-id=${trackId}>
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

    localStorage.setItem("currentIndex", currentIndex);

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

    // đính track_id của currentSong vào add-btn
    addBtn.setAttribute(
        "data-track-id",
        currentSong.track_id || currentSong.id
    );

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

    // remove currentIndex from unplayedSongIndexes array
    removeElementFromUnplayedSongIndexes(currentIndex);
}

function loadRenderAndPlay() {
    loadCurrentSong();
    renderTrackList(currentSongList, currentSongListId);
    playSong();
}

function switchSong(direction) {
    if (isShuffled) {
        // bật shuffle thì phát các bài có index trong unplayedSongIndexes
        if (unplayedSongIndexes.length) {
            // gán currentIndex = phần tử đầu tiên của unplayedSongIndexes, xong rồi xóa luôn
            currentIndex = unplayedSongIndexes[0];

            // xóa phần tử đầu tiên của mảng unplayedSongIndexes
            unplayedSongIndexes.shift();
        } else {
            // khi unplayedSongIndexes.length === 0 --> tất cả đã được phát

            // reset mảng unplayedSongIndexes
            unplayedSongIndexes = createArray(currentSongList.length);

            // xóa phần tử currentIndex hiện tại khỏi mảng unplayedSongIndexes
            removeElementFromUnplayedSongIndexes(currentIndex);

            // shuffle
            shuffleArray(unplayedSongIndexes);

            // gán currentIndex = phần tử đầu tiên của unplayedSongIndexes, xong rồi xóa luôn
            currentIndex = unplayedSongIndexes[0];
            unplayedSongIndexes.shift();

            // xử lý trường hợp chỉ có 1 bài hát
            if (currentSongList.length === 1) currentIndex = 0;
        }
    } else {
        currentIndex =
            (currentIndex + direction + currentSongList.length) %
            currentSongList.length;
    }

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

    // to synchronize the icons of playPauseBtn and playlistPlayBtn/artistPlayBtn
    // để đồng bộ icon của playPauseBtn và playlistPlayBtn/artistPlayBtn
    const currentSong = currentSongList[currentIndex];
    const isFromPlaylist = !!currentSong.playlist_id; // mục đích để xác định xem cần thay đổi playlistPlayBtn hay artistPlayBtn

    // thực hiện đồng bộ nếu songList đang phát là songList đang nhìn thấy
    if (currentSongListId === nextSongListId) {
        if (isFromPlaylist) {
            playlistPlayBtnIcon.classList.remove("fa-play");
            playlistPlayBtnIcon.classList.add("fa-pause");
        } else {
            artistPlayBtnIcon.classList.remove("fa-play");
            artistPlayBtnIcon.classList.add("fa-pause");
        }
    }
});

audioElement.addEventListener("pause", () => {
    playPauseBtnIcon.classList.remove("fa-pause");
    playPauseBtnIcon.classList.add("fa-play");

    // to synchronize the icons of playPauseBtn and playlistPlayBtn/artistPlayBtn
    // để đồng bộ icon của playPauseBtn và playlistPlayBtn/artistPlayBtn
    const currentSong = currentSongList[currentIndex];
    const isFromPlaylist = !!currentSong.playlist_id; // mục đích để xác định xem cần thay đổi playlistPlayBtn hay artistPlayBtn

    // thực hiện đồng bộ nếu songList đang phát là songList đang nhìn thấy
    if (currentSongListId === nextSongListId) {
        if (isFromPlaylist) {
            playlistPlayBtnIcon.classList.remove("fa-pause");
            playlistPlayBtnIcon.classList.add("fa-play");
        } else {
            artistPlayBtnIcon.classList.remove("fa-pause");
            artistPlayBtnIcon.classList.add("fa-play");
        }
    }
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

    if (isShuffled) {
        // enabled
        shuffleArray(unplayedSongIndexes);
    } else {
        // disabled
        // reset unplayedSongIndexes array
        unplayedSongIndexes = createArray(currentSongList.length);
    }

    // save
    localStorage.setItem("isShuffled", isShuffled);
});

// ==============================
// ========= volume bar =========
// ==============================
let previousVolumeValue = +localStorage.getItem("volumeValue");

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

function updateVolumeBar(volumeValue) {
    audioElement.volume = volumeValue;
    // set volume icon based on volume value
    setVolumeIcon(volumeValue);
    // update width
    innerVolumeBar.style.width = `${volumeValue * 100}%`;
}

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
        previousVolumeValue = audioElement.volume;

        // save to localStorage
        localStorage.setItem("volumeValue", audioElement.volume);

        // reset innerVolumeBar style
        volumeBar.classList.remove("is-adjusting");

        isAdjustingVolume = false;
    }
});

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

// click volume button to mute
$(".volume-btn").addEventListener("click", () => {
    if (audioElement.volume) {
        updateVolumeBar(0);

        // save to localStorage
        localStorage.setItem("volumeValue", 0);
    } else {
        updateVolumeBar(previousVolumeValue);

        // save to localStorage
        localStorage.setItem("volumeValue", previousVolumeValue);
    }
});

// ==================================
// ====== playlist/artist page ======
// ==================================

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

function saveCurrentSongListConfig(
    currentIndex,
    currentSongList,
    currentSongListId
) {
    localStorage.setItem("currentIndex", currentIndex);
    localStorage.setItem("currentSongList", JSON.stringify(currentSongList));
    localStorage.setItem(
        "currentSongListId",
        JSON.stringify(currentSongListId)
    );
}

// handle play-btn-large click
function handlePlayBtnClick() {
    const playBtnIcon = this.querySelector("i");

    // songList đang xem không phải songList đang phát
    if (currentSongListId !== nextSongListId) {
        if (!nextSongList.length) return;

        currentIndex = 0;
        currentSongList = nextSongList;
        currentSongListId = nextSongListId;

        saveCurrentSongListConfig(
            currentIndex,
            currentSongList,
            currentSongListId
        );

        if (isShuffled) {
            unplayedSongIndexes = createArray(currentSongList.length);
            // shuffle
            shuffleArray(unplayedSongIndexes);
        }

        loadRenderAndPlay();

        // để đồng bộ icon của playPauseBtn và playlistPlayBtn/artistPlayBtn
        // change playBtn icon
        playBtnIcon.classList.remove("fa-play");
        playBtnIcon.classList.add("fa-pause");
    }
    // songList đang xem là songList đang phát
    else {
        playPauseBtn.click();

        // để đồng bộ icon của playPauseBtn và playlistPlayBtn/artistPlayBtn
        // change playBtn icon based on audioElement play/pause state
        if (audioElement.paused) {
            playBtnIcon.classList.add("fa-play");
            playBtnIcon.classList.remove("fa-pause");
        } else {
            playBtnIcon.classList.remove("fa-play");
            playBtnIcon.classList.add("fa-pause");
        }
    }
}

playlistPlayBtn.addEventListener("click", handlePlayBtnClick);

artistPlayBtn.addEventListener("click", handlePlayBtnClick);

// play music when clicking on track in list
function handleSongListDblclick(e) {
    const trackItem = e.target.closest(".track-item");
    const menuBtn = e.target.closest(".track-menu-btn");

    if (!trackItem || menuBtn) return;

    currentIndex = +trackItem.dataset.index; // convert to number

    currentSongList = nextSongList;
    currentSongListId = nextSongListId;

    saveCurrentSongListConfig(currentIndex, currentSongList, currentSongListId);

    if (isShuffled) {
        unplayedSongIndexes = createArray(currentSongList.length);
        // shuffle
        shuffleArray(unplayedSongIndexes);
    }

    loadRenderAndPlay();
}

// handle track-list double clicks
$$(".track-list").forEach((trackList) => {
    trackList.addEventListener("dblclick", handleSongListDblclick);
});

// ===============================
// ====== track contextmenu ======
// ===============================
const trackContextMenu = $(".track-context-menu");
const playlistSelectModal = $(".playlist-select-modal-overlay");
const playlistSelectModalList = $(".playlist-select-modal-list");

let currentTrackId; // lưu lại track_id mỗi khi chuột phải vào 1 track

function openPlaylistSelectModal() {
    playlistSelectModal.classList.add("show");
    fetchAndRenderPlaylistSelectModal();
}

async function fetchAndRenderPlaylistSelectModal() {
    try {
        // get user-owned playlists
        const { playlists } = await httpRequest.get("me/playlists");

        // render
        const html = playlists
            .map((playlist) => {
                return `<li class="playlist-item" data-id=${playlist.id}>
                        <div class="image-wrapper">
                            <img
                                class="playlist-cover-image"
                                src="${escapeHTML(
                                    playlist.image_url || "placeholder.svg"
                                )}"
                                alt="Playlist cover image"
                            />
                        </div>
                        <h3 class="playlist-name">
                            ${escapeHTML(playlist.name)}
                        </h3>
                    </li>`;
            })
            .join("");
        playlistSelectModalList.innerHTML = html;
    } catch (error) {
        console.dir(error);
    }
}

async function removeTrackFromPlaylist(playlistId, trackId) {
    try {
        const { message } = await httpRequest.del(
            `playlists/${playlistId}/tracks/${trackId}`
        );

        // re-render playlist page
        await fetchAndRenderPlaylistPage(playlistId);

        // re-render sidebar
        await reRenderSidebar();

        // playlistId === nextSongListId :
        // nếu playlist đang play (currentSongListId) là playlist đang bị xóa bài hát (playlistId/nextSongListId) -> thì phải gán lại currentSongList = nextSongList sau khi bị xóa bài hát
        if (currentSongListId === playlistId) {
            currentSongList = nextSongList;

            saveCurrentSongListConfig(
                currentIndex,
                currentSongList,
                currentSongListId
            );

            if (isShuffled) {
                unplayedSongIndexes = createArray(currentSongList.length);
                shuffleArray(unplayedSongIndexes);
            }
        }

        // show toast
        showToast(message, true);
    } catch (error) {
        console.dir(error);
        console.error(
            "Failed to delete this track from playlist: ",
            error.message
        );
        // show toast
        showToast(error.response.error.message, false);
    }
}

function openTrackContextMenu(e) {
    // close other context menus first
    $(".context-menu.show")?.classList?.remove("show");

    const trackItem = e.target.closest(".track-item");
    if (!trackItem) return;

    currentTrackId = trackItem.dataset.trackId; // lưu lại trackId mỗi khi chuột phải vào 1 track

    // xác định xem đây là playlist hay artist page
    const playlistSection = e.target.closest(".playlist-section"); // -> khác null nghĩa là playlist page, = null là artist page

    // nếu là playlist page
    if (playlistSection) {
        // hiện option: remove from this playlist
        $(".menu-item.remove-from-playlist").classList.add("show");
    }
    // nếu là artist page
    else {
        // ẩn option: remove from this playlist
        $(".menu-item.remove-from-playlist").classList.remove("show");
    }

    // open trackContextMenu
    openContextMenu(e, trackContextMenu);
}

// right click vào track ở playlist/artist page
$$(".track-list").forEach((trackList) => {
    trackList.addEventListener("contextmenu", openTrackContextMenu);
});

// handle track Menu Button (3 dots, ellipsis) click
$$(".track-list").forEach((trackList) => {
    trackList.addEventListener("click", (e) => {
        e.stopPropagation(); // have to stop propagation because 'document' has a click event handler to close contextmenu when clicking outside

        const menuBtn = e.target.closest(".track-menu-btn");
        if (!menuBtn) return;

        openTrackContextMenu(e);
    });
});

// click on menu-item of trackContextMenu
trackContextMenu.addEventListener("click", (e) => {
    const menuItem = e.target.closest(".menu-item");
    if (!menuItem) return;

    if (!isUserLoggedIn("Log in to do this action!")) return;

    // click 'Add to playlist' option
    if (menuItem.classList.contains("add-to-playlist")) {
        // open playlist-select-modal
        openPlaylistSelectModal();
    }
    // click 'Remove from playlist' option
    else if (menuItem.classList.contains("remove-from-playlist")) {
        removeTrackFromPlaylist(nextSongListId, currentTrackId); // nextSongListId chính là playlistId của playlist đang trong 'view'
    }

    // close trackContextMenu
    trackContextMenu.classList.remove("show");
});

async function addTrackToPlaylist(playlistId, trackId) {
    const data = {
        track_id: trackId,
        position: 0,
    };

    try {
        // add track (trackId) to playlist (playlistId)
        const { message, playlist_track } = await httpRequest.post(
            `playlists/${playlistId}/tracks`,
            data
        );

        // re-render sidebar
        await reRenderSidebar();

        // show toast
        showToast(message, true);
    } catch (error) {
        console.dir(error);
        console.error("Failed to add this track to playlist: ", error.message);
        // show toast : error.response.error.message
        showToast(error.response.error.message, false);
    }
}

// handle playlist-select-modal item click
playlistSelectModal.addEventListener("click", async (e) => {
    // close modal when clicking overlay
    if (!e.target.closest(".playlist-select-modal")) {
        playlistSelectModal.classList.remove("show");
    }

    // to get playlistId
    const playlistItem = e.target.closest(".playlist-item");
    if (!playlistItem) return;

    const playlistId = playlistItem.dataset.id;

    await addTrackToPlaylist(playlistId, currentTrackId); // currentTrackId đã lấy được khi right click vào mỗi track

    // close modal
    playlistSelectModal.classList.remove("show");
});

// close modal with "Escape" key
document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && playlistSelectModal.classList.contains("show")) {
        playlistSelectModal.classList.remove("show");
    }
});

// ==================================================
// ====== modify playlist + upload cover image ======
// ==================================================
const editPlaylistImageBtn = $(".edit-image-btn");
const editPlaylistDetailsBtn = $(".edit-details-btn");
const playlistEditDetailsModal = $("#playlistModal");
const playlistCoverInput = $(".playlist-cover-input");
const uploadImageBtn = $(".upload-image-btn");
const playlistPreviewImage = $(".playlist-preview-image");
const playlistEditDetailsSaveBtn = $(".playlist-save-btn");

// form elements
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
        console.error("Cannot get Playlist: ", error.message);
    }
}

async function getArtistById(artistId) {
    try {
        const artist = await httpRequest.get(`artists/${artistId}`);

        return artist;
    } catch (error) {
        console.dir(error);
        console.error("Cannot get Artist: ", error.message);
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

// click playlist name to edit
editPlaylistDetailsBtn.addEventListener("click", async () => {
    if (!isUserLoggedIn("Log in to edit playlist!")) return;

    editPlaylistId = playlistSection.dataset.id;
    const playlist = await getPlaylistById(editPlaylistId);

    // cannot edit if the playlist is 'Liked Songs' (default) or owned by other users
    if (!playlist.is_owner) {
        console.error("Cannot edit other user's playlist!");
        // show toast
        showToast("Cannot edit other user's playlist!", false);
        return;
    } else if (playlist.name === "Liked Songs") {
        console.error("Cannot edit default playlist!");
        // show toast
        showToast("Cannot edit default playlist!", false);

        return;
    }

    // fill current playlist name
    playlistNameInput.value = playlist.name;

    // show current playlist cover image in edit modal
    playlistPreviewImage.src = playlist.image_url || "placeholder.svg";

    // show modal
    playlistEditDetailsModal.classList.add("show");
});

// click playlist cover image to upload new cover image
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

        // update playlist's image_url to DB
        const res = await httpRequest.put(`playlists/${playlistId}`, {
            image_url: `https://spotify.f8team.dev${file.url}`,
        });

        // show toast
        showToast("Updated Playlist cover image successfully", true);
    } catch (error) {
        console.dir(error);
        console.error("Failed to update playlist cover image!");

        // show toast error
        showToast("Failed to update Playlist cover image", false);
    }
}

// click Save button
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

        // upload playlist cover image
        await updatePlaylistImageUrl(editPlaylistId, formData);

        // re-render sidebar
        await reRenderSidebar();

        // re-render playlist page
        await fetchAndRenderPlaylistPage(editPlaylistId);

        // show toast success
        showToast(message, true);
    } catch (error) {
        console.dir(error);
        console.error("Failed to update this playlist: ", error.message);

        showToast(error.response.error.message, false);
    } finally {
        // close modal
        closePlaylistEditDetailsModal();

        // clear
        formData = null;
        playlistCoverInput.value = ""; // Clear file input
        playlistPreviewImage.src = "";
    }
});

$(".playlist-form").addEventListener("submit", (e) => {
    e.preventDefault();

    playlistEditDetailsSaveBtn.click();
});

// hide error message when user types something
playlistNameInput.addEventListener("input", function () {
    this.classList.remove("invalid");
});

// ============ upload image ============
uploadImageBtn.addEventListener("click", () => {
    if (!isUserLoggedIn()) return;

    const isOwner = playlistSection.dataset.isOwner;

    if (isOwner === "false") return;

    playlistCoverInput.click();
});

// listen for changes to the file input
playlistCoverInput.addEventListener("change", async () => {
    // get the first file selected by user
    const file = playlistCoverInput.files[0];
    if (!file) return;

    formData = new FormData();
    formData.append("cover", file); // append the file under the key 'cover'

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

// ===========================================================
// ======== follow/unfollow from playlist/artist page ========
// ===========================================================

const playlistFollowBtn = $(".playlist-section .follow-btn");
const artistFollowBtn = $(".artist-section .follow-btn");

// click follow/unfollow button in playlist page
playlistFollowBtn.addEventListener("click", async (e) => {
    const playlistSection = e.target.closest(".playlist-section");
    const playlistId = playlistSection.dataset.id;

    try {
        const playlist = await getPlaylistById(playlistId);

        const isFollowing = playlist.is_following;

        if (isFollowing) {
            await handleUnfollowPlaylist(playlistId);
        } else {
            await handleFollowPlaylist(playlistId);
        }
    } catch (error) {
        console.dir(error);
        console.error("Failed to follow/unfollow playlist: ", error.message);
    }
});

// click follow/unfollow button in artist page
artistFollowBtn.addEventListener("click", async (e) => {
    const artistSection = e.target.closest(".artist-section");
    const artistId = artistSection.dataset.id;

    try {
        const artist = await getArtistById(artistId);

        const isFollowing = artist.is_following;

        if (isFollowing) {
            await handleUnfollowArtist(artistId);
        } else {
            await handleFollowArtist(artistId);
        }
    } catch (error) {
        console.dir(error);
        console.error("Failed to follow/unfollow artist: ", error.message);
    }
});

// ==========================================
// ======== add to Like Songs button ========
// ==========================================
let likedSongPlaylistId = null;

async function getLikedSongId() {
    try {
        // get user-owned playlists
        const { playlists } = await httpRequest.get("me/playlists");

        const likedSongPlaylist = playlists.find(
            (playlist) => playlist.name === "Liked Songs"
        );

        return likedSongPlaylist.id;
    } catch (error) {
        console.dir(error);
        console.error("Failed to get Liked Song ID: ", error.message);
        return;
    }
}

addBtn.addEventListener("click", async () => {
    if (!isUserLoggedIn("Log in to do this action!")) return;

    if (!likedSongPlaylistId) {
        likedSongPlaylistId = await getLikedSongId();
    }

    if (!likedSongPlaylistId) return;

    // get trackId in addBtn
    const trackId = addBtn.dataset.trackId;

    if (!trackId) return;

    await addTrackToPlaylist(likedSongPlaylistId, trackId);
});

// ====================================================
// ================= universal search =================
// ====================================================
const searchInput = $(".search-input");
const searchResultModal = $(".search-result-modal");
const searchTotalResults = $(".search-total-results");
const searchEmptyWrapper = $(".search-empty-wrapper");
const searchEmptyTitle = $(".search-empty-title");
const trackSearchSection = $(".track-search-section");
const playlistSearchSection = $(".playlist-search-section");
const artistSearchSection = $(".artist-search-section");
const searchTrackList = $(".search-track-list");
const searchPlaylistList = $(".search-playlist-list");
const searchArtistList = $(".search-artist-list");

let searchedTracks; // lưu lại danh sách tracks trả về khi search

function renderSearchTrackList(tracks, addPlayingClass = false) {
    // addPlayingClass: có thêm trạng thái playing vào track-item không? chỉ dùng khi double click vào track-item

    const tracksHtml = tracks
        .map((track, index) => {
            return `<div class="track-item ${
                currentIndex === index && addPlayingClass ? "playing" : ""
            }" data-index="${index}" data-track-id=${track.id}>
                        <div class="track-image">
                            <img
                                src="${
                                    track.image_url ||
                                    "placeholder.svg?height=40&width=40"
                                }"
                                alt="Track cover image"
                            />
                        </div>
                        <div class="track-info">
                            <div class="track-name ${
                                currentIndex === index && addPlayingClass
                                    ? "playing-text"
                                    : ""
                            }">
                            ${escapeHTML(track.title || "")}
                            </div>
                        </div>
                        <div class="track-duration">${formatTrackDuration(
                            track.additional_info.duration
                        )}</div>
                        <button class="track-menu-btn">
                            <i class="fas fa-ellipsis-h"></i>
                        </button>
                    </div>`;
        })
        .join("");
    searchTrackList.innerHTML = tracksHtml;
}

function renderSearchResultModal(query, results, totalResults) {
    const { tracks, playlists, artists, albums } = results;

    // clear first
    clearSearchResultModal();

    // open modal
    searchResultModal.classList.add("show");

    // update Total results
    searchTotalResults.textContent = `Total results: ${
        totalResults - albums.length
    }`;

    if (tracks.length === 0 && playlists.length === 0 && artists.length === 0) {
        // show <Couldn't find 'something'> block
        searchEmptyWrapper.classList.add("show");
        searchEmptyTitle.textContent = `Couldn't find "${query}"`;
        return;
    }

    if (tracks.length) {
        renderSearchTrackList(tracks);
        trackSearchSection.classList.add("show");
    }

    if (playlists.length) {
        renderPlaylistCards(playlists, searchPlaylistList);
        playlistSearchSection.classList.add("show");
    }

    if (artists.length) {
        renderArtistCards(artists, searchArtistList);
        artistSearchSection.classList.add("show");
    }
}

function clearSearchResultModal() {
    searchEmptyWrapper.classList.remove("show");
    trackSearchSection.classList.remove("show");
    playlistSearchSection.classList.remove("show");
    artistSearchSection.classList.remove("show");
}

searchInput.addEventListener("keydown", async (e) => {
    if (e.key === "Enter") {
        const searchString = searchInput.value.trim();

        if (!searchString) return;

        try {
            const {
                query,
                results,
                results: { tracks, playlists, artists, albums },
                total_results,
                pagination,
            } = await httpRequest.get(
                `search?q=${searchString}&type=all&limit=20&offset=0`
            );

            searchedTracks = tracks;

            renderSearchResultModal(query, results, total_results);
        } catch (error) {
            console.dir(error);
            console.error("Failed to search: ", error.message);

            // show toast
            showToast("Failed to search", false);
        }
    }
});

// close searchResultModal when clicking outside
document.addEventListener("click", (e) => {
    if (
        !searchResultModal.contains(e.target) &&
        !searchInput.contains(e.target) &&
        !playlistSelectModal.contains(e.target) &&
        !trackContextMenu.contains(e.target) &&
        searchResultModal.classList.contains("show")
    ) {
        searchResultModal.classList.remove("show");
        clearSearchResultModal();
    }
});

// handle searchTrackList double clicks
searchTrackList.addEventListener("dblclick", async (e) => {
    const trackItem = e.target.closest(".track-item");
    const menuBtn = e.target.closest(".track-menu-btn");

    if (!trackItem || menuBtn) return;

    currentIndex = +trackItem.dataset.index; // convert to number
    const trackId = trackItem.dataset.trackId;
    renderSearchTrackList(searchedTracks, true);

    try {
        const track = await httpRequest.get(`tracks/${trackId}`);

        currentSongList = [track];
        currentIndex = 0;

        loadCurrentSong();
        playSong();
    } catch (error) {
        console.dir(error);
        console.error("Failed to fetch track: ", error.message);
    }
});

// handle track's menu button click (in search-result-modal)
searchTrackList.addEventListener("click", (e) => {
    e.stopPropagation(); // have to stop propagation because 'document' has a click event handler to close contextmenu when clicking outside

    // close other context menus first
    $(".context-menu.show")?.classList?.remove("show");

    const trackItem = e.target.closest(".track-item");
    const menuBtn = e.target.closest(".track-menu-btn");

    if (!menuBtn) return;

    currentTrackId = trackItem.dataset.trackId; // lưu lại trackId mỗi khi chuột phải vào 1 track

    // ẩn option: remove from this playlist
    $(".menu-item.remove-from-playlist").classList.remove("show");

    // open trackContextMenu
    openContextMenu(e, trackContextMenu);
});

async function handlePlaylistsContainerClick(e) {
    const playlistCard = e.target.closest(".playlist-card");
    if (!playlistCard) return;

    const playlistCardPlayBtn = e.target.closest(".playlist-play-btn");
    const playlistId = playlistCard.dataset.playlistId;

    // click vào playlist card (không phải play button)
    await handlePlaylistClick(playlistId);

    // nếu click vào playlist play btn
    if (playlistCardPlayBtn) {
        if (!nextSongList.length) return;

        currentIndex = 0;
        currentSongList = nextSongList;
        currentSongListId = nextSongListId;

        saveCurrentSongListConfig(
            currentIndex,
            currentSongList,
            currentSongListId
        );

        if (!currentSongList.length) return;

        if (isShuffled) {
            unplayedSongIndexes = createArray(currentSongList.length);
            // shuffle
            shuffleArray(unplayedSongIndexes);
        }

        loadRenderAndPlay();
    }
}

// handle playlist click (in search-result-modal)
searchPlaylistList.addEventListener("click", async (e) => {
    const playlistCard = e.target.closest(".playlist-card");
    if (!playlistCard) return;

    // hide search-result-modal
    searchResultModal.classList.remove("show");

    await handlePlaylistsContainerClick(e);
});

async function handleArtistsContainerClick(e) {
    const artistCard = e.target.closest(".artist-card");
    if (!artistCard) return;

    const artistCardPlayBtn = e.target.closest(".artist-play-btn");
    const artistId = artistCard.dataset.artistId;

    await handleArtistClick(artistId);

    if (artistCardPlayBtn) {
        if (!nextSongList.length) return;

        currentIndex = 0;
        currentSongList = nextSongList;
        currentSongListId = nextSongListId;

        saveCurrentSongListConfig(
            currentIndex,
            currentSongList,
            currentSongListId
        );

        if (!currentSongList.length) return;

        if (isShuffled) {
            unplayedSongIndexes = createArray(currentSongList.length);
            // shuffle
            shuffleArray(unplayedSongIndexes);
        }

        loadRenderAndPlay();
    }
}

// handle artist click (in search-result-modal)
searchArtistList.addEventListener("click", async (e) => {
    const artistCard = e.target.closest(".artist-card");
    if (!artistCard) return;

    // hide search-result-modal
    searchResultModal.classList.remove("show");

    await handleArtistsContainerClick(e);
});

// ====================================
// ======== go to Home buttons ========
// ====================================
function handleGoToHomeBtnClick() {
    // display Biggest hits + popular artists
    hitsSection.classList.add("show");
    popularArtistsSection.classList.add("show");

    // hide playlist + artist section
    playlistSection.classList.remove("show");
    artistSection.classList.remove("show");

    // update site title
    siteTitle.textContent = "Spotify";
}
$$(".go-home-btn").forEach((button) => {
    button.addEventListener("click", handleGoToHomeBtnClick);
});

// ==========================
// ======= fullscreen =======
// ==========================
$(".full-screen-btn").addEventListener("click", () => {
    if (document.fullscreenElement) {
        document.exitFullscreen();
    } else {
        document.documentElement.requestFullscreen();
    }
});

// ===========================
// ========= tooltip =========
// ===========================
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

// ==========================
// ======= INITIALIZE =======
// ==========================
document.addEventListener("DOMContentLoaded", async function () {
    async function fetchUser() {
        try {
            const { user } = await httpRequest.get("users/me");
            return user;
        } catch (error) {
            console.dir(error);
            console.error("Failed to fetch User: ", error.message);

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
    // nếu shuffle đang bật thì xáo trộn mảng
    if (isShuffled) {
        shuffleArray(unplayedSongIndexes);
    }

    // update volume
    const volumeValue = +localStorage.getItem("volumeValue");
    updateVolumeBar(volumeValue);

    // load current song, songList from localStorage
    currentIndex = +localStorage.getItem("currentIndex");
    currentSongList = JSON.parse(localStorage.getItem("currentSongList"));
    currentSongListId = JSON.parse(localStorage.getItem("currentSongListId"));
    // doing
    loadCurrentSong();
    renderTrackList(currentSongList, currentSongListId);
});

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
