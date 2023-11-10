"use strict";

// global to hold the User instance of the currently-logged-in user
let currentUser;

/******************************************************************************
 * User login/signup/login
 */

/** Handle login form submission. If login ok, sets up the user instance */

async function login(evt) {
  console.debug("login", evt);
  evt.preventDefault();

  // grab the username and password
  const username = $("#login-username").val();
  const password = $("#login-password").val();

  // User.login retrieves user info from API and returns User instance
  // which we'll make the globally-available, logged-in user.
  currentUser = await User.login(username, password);

  $loginForm.trigger("reset");

  saveUserCredentialsInLocalStorage();
  updateUIOnUserLogin();
}

$loginForm.on("submit", login);

/** Handle signup form submission. */

async function signup(evt) {
  console.debug("signup", evt);
  evt.preventDefault();

  const name = $("#signup-name").val();
  const username = $("#signup-username").val();
  const password = $("#signup-password").val();

  // User.signup retrieves user info from API and returns User instance
  // which we'll make the globally-available, logged-in user.
  currentUser = await User.signup(username, password, name);

  saveUserCredentialsInLocalStorage();
  updateUIOnUserLogin();

  $signupForm.trigger("reset");
}

$signupForm.on("submit", signup);

/** Handle click of logout button
 *
 * Remove their credentials from localStorage and refresh page
 */

function logout(evt) {
  console.debug("logout", evt);
  localStorage.clear();
  location.reload();
}

$navLogOut.on("click", logout);

/******************************************************************************
 * Storing/recalling previously-logged-in-user with localStorage
 */

/** If there are user credentials in local storage, use those to log in
 * that user. This is meant to be called on page load, just once.
 */

async function checkForRememberedUser() {
  console.debug("checkForRememberedUser");
  const token = localStorage.getItem("token");
  const username = localStorage.getItem("username");
  if (!token || !username) return false;

  // try to log in with these credentials (will be null if login failed)
  currentUser = await User.loginViaStoredCredentials(token, username);
}

/** Sync current user information to localStorage.
 *
 * We store the username/token in localStorage so when the page is refreshed
 * (or the user revisits the site later), they will still be logged in.
 */

function saveUserCredentialsInLocalStorage() {
  console.debug("saveUserCredentialsInLocalStorage");
  if (currentUser) {
    localStorage.setItem("token", currentUser.loginToken);
    localStorage.setItem("username", currentUser.username);
  }
}

/******************************************************************************
 * General UI stuff about users
 */

/** When a user signs up or registers, we want to set up the UI for them:
 *
 * - show the stories list
 * - update nav bar options for logged-in user
 * - generate the user profile part of the page
 */

async function updateUIOnUserLogin() {
  console.debug("updateUIOnUserLogin");

  $allStoriesList.show();

  // Update navigation bar options
  updateNavOnLogin();
  
  if (currentUser) {
    // Update the displayed name in the upper right corner
    $("#nav-user-profile").text(currentUser.name);
  }
}

/** Generate the user profile part of the page */
async function generateUserProfile() {
  // Assuming you have a section with the id "user-profile" to display user information
  const $userProfileSection = $('#user-profile');

  // Get user information (adjust as needed based on your User class properties)
  const { username, name, createdAt } = currentUser;

  // Create HTML content for user profile
  const userProfileHTML = `
    <h2>${username}'s Profile</h2>
    <p><strong>Name:</strong> ${name}</p>
    <p><strong>Joined:</strong> ${new Date(createdAt).toLocaleDateString()}</p>
    <!-- Add more user profile information as needed -->
  `;

  // Update the content of the user profile section
  $userProfileSection.html(userProfileHTML);
}

  /** Handle the user profile form submission */

  async function handleProfileFormSubmission(evt) {
    evt.preventDefault();
    // Implement the logic to handle the profile form submission
    // Extract the new name and password from the form
    const newName = $("#new-name").val();
    const newPassword = $("#new-password").val();

   try {
    // Update the user's profile
    await currentUser.updateProfile({name: newName, password: newPassword});
    // Update the currentUser information with the new name
    currentUser.name = newName;

    // Display a success message to the user
    displayProfileMessage("Profile updated successfully!", "success");

    // Clear the form
    $("#profile-form").trigger("reset");
    } catch (error) {
      // Handle errors and display an error message to the user
      displayProfileMessage(`Error updating profile: ${error.message}`, "error");
    }
  }

  // Function to display profile update messages
function displayProfileMessage(message, messageType) {
  const messageDiv = $("#profile-message");
  messageDiv.text(message);

  // Add styles based on the message type (success or error)
  if (messageType === "success") {
    messageDiv.removeClass("error").addClass("success");
  } else if (messageType === "error") {
    messageDiv.removeClass("success").addClass("error");
  }

  // Clear the message after a few seconds (optional)
  setTimeout(() => {
    messageDiv.text("").removeClass("success error");
  }, 3000); // Clear message after 3 seconds (adjust as needed)
}

// Attach the function to the user profile form's submit event
$("#profile-form").on("submit", handleProfileFormSubmission);