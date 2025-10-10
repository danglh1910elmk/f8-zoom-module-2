// signupForm
//     .querySelector(".auth-form-content")
//     .addEventListener("submit", async (e) => {
//         e.preventDefault();

//         const emailFormGroup = signupForm.querySelector(
//             ".form-group:first-of-type"
//         );
//         const passwordFormGroup = signupForm.querySelector(
//             ".form-group:last-of-type"
//         );

//         const emailErrorMessageText = signupForm.querySelector(
//             ".email-error-message"
//         );
//         const passwordErrorMessageText = signupForm.querySelector(
//             ".password-error-message"
//         );

//         const email = $("#signupEmail").value.trim();
//         const password = $("#signupPassword").value.trim();
//         const credentials = { email, password };

//         // validate email
//         if (!isEmailValid(email)) {
//             emailFormGroup.classList.add("invalid");
//             showValidationError(
//                 emailFormGroup,
//                 emailErrorMessageText,
//                 "Please enter a valid email address"
//             );
//             return;
//         }

//         // validate password
//         if (password.length < 6) {
//             showValidationError(
//                 passwordFormGroup,
//                 passwordErrorMessageText,
//                 "Password must be at least 6 characters long"
//             );
//             return;
//         } else if (password.length >= 6 && !isPasswordValid(password)) {
//             showValidationError(
//                 passwordFormGroup,
//                 passwordErrorMessageText,
//                 "Password must contain at least one uppercase letter, one lowercase letter, and one number."
//             );
//             return;
//         }

//         try {
//             const { user, access_token } = await httpRequest.post(
//                 "auth/register",
//                 credentials
//             );
//             console.log("user - ", user);

//             // save access_token to localStorage
//             localStorage.setItem("accessToken", access_token);
//             // save registered user to localStorage
//             localStorage.setItem("currentUser", JSON.stringify(user));

//             updateUserInfo(user);
//         } catch (error) {
//             console.dir(error);
//         }
//     });

// function validateEmailAndPassword(formElement, email, password) {
//     const emailFormGroup = formElement.querySelector(
//         ".form-group:first-of-type"
//     );
//     const passwordFormGroup = formElement.querySelector(
//         ".form-group:last-of-type"
//     );

//     const emailErrorMessageText = formElement.querySelector(
//         ".email-error-message"
//     );
//     const passwordErrorMessageText = formElement.querySelector(
//         ".password-error-message"
//     );

//     // validate email
//     if (!isEmailValid(email)) {
//         emailFormGroup.classList.add("invalid");
//         showValidationError(
//             emailFormGroup,
//             emailErrorMessageText,
//             "Please enter a valid email address"
//         );
//         return false; // failed
//     }

//     // validate password
//     if (password.length < 6) {
//         showValidationError(
//             passwordFormGroup,
//             passwordErrorMessageText,
//             "Password must be at least 6 characters long"
//         );
//         return false; // failed
//     } else if (password.length >= 6 && !isPasswordValid(password)) {
//         showValidationError(
//             passwordFormGroup,
//             passwordErrorMessageText,
//             "Password must contain at least one uppercase letter, one lowercase letter, and one number."
//         );
//         return false; // failed
//     }

//     return true; // passed
// }

// function showValidationError(formGroup, errorMessageText, message) {
//     formGroup.classList.add("invalid");
//     errorMessageText.textContent = message;
// }

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

// ! API upload image
/* 
uploadBtn.addEventListener('click', () => {
  coverInput.click();
});

coverInput.addEventListener('change', async () => {
  const file = coverInput.files[0];
  if (!file) return;

  const formData = new FormData();
  formData.append('cover', file); // 'cover' must match the API's expected field name

  try {
    const response = await fetch(UPLOAD_API_URL, {
      method: 'POST',
      body: formData,
      // Do NOT set Content-Type header; fetch will do it automatically for FormData
      headers: {
        // Optional: add auth token if required
        // 'Authorization': 'Bearer YOUR_TOKEN',
      }
    });

    if (!response.ok) {
      throw new Error(`Upload failed: ${response.statusText}`);
    }

    const result = await response.json();
    console.log('Upload success:', result);
    // Optionally update UI with the new cover image URL

  } catch (error) {
    console.error('Upload error:', error.message);
  }
});
*/
