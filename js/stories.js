"use strict";

// This is the global list of the stories, an instance of StoryList
let storyList;

/** Get and show stories when site first loads. */

async function getAndShowStoriesOnStart() {
  storyList = await StoryList.getStories();
  $storiesLoadingMsg.remove();

  putStoriesOnPage();
}

/**
 * A render method to render HTML for an individual Story instance
 * - story: an instance of Story
 *
 * Returns the markup for the story.
 */

function generateStoryMarkup(story) {
  // console.debug("generateStoryMarkup", story);

  const hostName = story.getHostName();

  // if a user is logged in, show favorite/not-favorite star
  const starClass = Boolean(currentUser);

  const showDeleteBtn = currentUser && currentUser.ownsStory(story);
  const showEditBtn = currentUser && currentUser.ownsStory(story);

  return $(`
      <li id="${story.storyId}">
        <div>
        ${showDeleteBtn ? getDeleteBtnHTML() : ""}
        ${showEditBtn ? getEditBtnHTML() : ""}
        ${starClass ? getStarHTML(story, currentUser) : ""}
        <a href="${story.url}" target="a_blank" class="story-link">
          ${story.title}
        </a>
        <small class="story-hostname">(${hostName})</small>
        <div class="story-author">by ${story.author}</div>
        <div class="story-user">posted by ${story.username}</div>
        </div>
      </li>
    `);
}

// Make delete button HTML for story
function getDeleteBtnHTML() {
  return `
      <span class="trash-can">
        <i class="fas fa-trash-alt"></i>
      </span>`;
}

// Make edit button HTML for story
function getEditBtnHTML() {
  return `
  <span class="edit-btn">
  <i class="far fa-edit"></i>
  </span>`;
}

//Make favorite/not-favorite star for story
function getStarHTML(story, currentUser) {
  const isFavorite = currentUser.isFavorite(story);
  const starType = isFavorite ? "fas" : "far";
  return `
      <span class="star">
        <i class="${starType} fa-star"></i>
      </span>`;
}

/** Gets list of stories from server, generates their HTML, and puts on page. */

function putStoriesOnPage() {
  console.debug("putStoriesOnPage");

  $allStoriesList.empty();

  // loop through all of our stories and generate HTML for them
  for (let story of storyList.stories) {
    const $story = generateStoryMarkup(story);

    // Check if the story is a favorite for the current user
    if (currentUser && currentUser.isFavorite(story.storyId)) {
      $story.addClass("favorite");
    }

    $allStoriesList.append($story);
  }

  $allStoriesList.show();
}

// Handle deleting a story
async function deleteStory(evt) {
  console.debug("deleteStory");

  // Find the closest <li> element (story container) and get its ID
  const $closestLi = $(evt.target).closest("li");
  const storyId = $closestLi.attr("id");

  // Call the removeStory method on the storyList to delete the story
  await storyList.removeStory(currentUser, storyId);

  // Re-generate the user's stories on the page
  await putUserStoriesOnPage();
}

$ownStories.on("click", ".trash-can", deleteStory);

//Handle submitting new story form.

async function handleFavoriteClick(story) {
  if (!currentUser) return; // If not logged in, do nothing
  
  if (currentUser.isFavorite(story)) {
    await currentUser.removeFavorite(story);
  } else {
    await currentUser.addFavorite(story);
  }

  // Refresh the stories on the page after updating favorites
  await getAndShowStoriesOnStart();
}

// Function to handle form submission for adding a new story.
async function handleStoryFormSubmission(evt) {
  console.debug("handleStoryFormSubmission", evt);
  evt.preventDefault();

  const title = $("#new-story-title").val();
  const author = $("#new-story-author").val();
  const url = $("#new-story-url").val();
  const username = currentUser.username;
  const storyData = { title, url, author, username };

  // Call the addStory method from storyList
  const newStory = await storyList.addStory(currentUser, storyData);

  // Put the new story on the page
  const $newStory = generateStoryMarkup(newStory);
  $allStoriesList.prepend($newStory); // prepend to show the new story at the top

  $submitForm.fadeOut("slow", function() {
  // reset the form fields after fade out
  $submitForm.trigger("reset");
  });
}

/******************************************************************************
 * Functionality for list of user's own stories
 */

function putUserStoriesOnPage() {
  console.debug("putUserStoriesOnPage");

  $ownStories.empty();

  if (currentUser.ownStories.length === 0) {
    $ownStories.append("<h5>No stories added by user yet!</h5>");
  } else {
    // loop through all of users stories and generate HTML for them
    for (let story of currentUser.ownStories) {
      let $story = generateStoryMarkup(story, true);
      $ownStories.append($story);
    }
  }

  $ownStories.show();
}

/******************************************************************************
 * Functionality for favorites list and starr/un-starr a story
 */

// Put favorites list on page.

function putFavoritesListOnPage() {
  console.debug("putFavoritesListOnPage");

  $favoritedStories.empty();

  if (currentUser.favorites.length === 0) {
    $favoritedStories.append("<h5>No favorites added!</h5>");
  } else {
    // loop through all of users favorites and generate HTML for them
    for (let story of currentUser.favorites) {
      const $story = generateStoryMarkup(story);
      $favoritedStories.append($story);
    }
  }

  $favoritedStories.show();
}

//Handle favorite/un-favorite a story
async function toggleStoryFavorite(evt) {
  console.debug("toggleStoryFavorite");

  const $tgt = $(evt.target);
  const $closestLi = $tgt.closest("li");
  const storyId = $closestLi.attr("id");
  const story = storyList.stories.find(s => s.storyId === storyId);

  // see if the item is already favorited (checking by presence of star)
  if ($tgt.hasClass("fas")) {
    // currently a favorite: remove from user's fav list and change star
    await currentUser.removeFavorite(story);
    $tgt.closest("i").toggleClass("fas far");
  } else {
    // currently not a favorite: do the opposite
    await currentUser.addFavorite(story);
    $tgt.closest("i").toggleClass("fas far");
  }
}

// Add a function to handle the click event on the "Edit" button
function handleEditClick(story) {
  // Assuming you have a form with id "edit-story-form" and input fields
  const $editForm = $("#edit-story-form");
  const $editTitle = $("#edit-story-title");
  const $editAuthor = $("#edit-story-author");
  const $editUrl = $("#edit-story-url");

  // Populate the form fields with the current story details
  $editTitle.val(story.title);
  $editAuthor.val(story.author);
  $editUrl.val(story.url);

  // Show the edit form
  $editForm.show();

  // Handle form submission
  $editForm.on("submit", async function (evt) {
    evt.preventDefault();

    // Get the updated values from the form
    const updatedTitle = $editTitle.val();
    const updatedAuthor = $editAuthor.val();
    const updatedUrl = $editUrl.val();

    // Call the updateStory method
    try {
      const updatedStory = await storyList.updateStory(currentUser, story.storyId, {
        title: updatedTitle,
        author: updatedAuthor,
        url: updatedUrl,
      });

      // Update the UI with the edited story
      updateStoryInUI(updatedStory);

      // Hide the edit form
      $editForm.hide();
      $editForm.off("submit");
    } catch (error) {
      console.error("Error updating story:", error.message);
      // Handle the error, e.g., display an error message to the user
    }
  });
}

// Add an event listener for the "Edit" button click
$ownStories.on("click", ".edit-btn", function (evt) {
  const $closestLi = $(evt.target).closest("li");
  const storyId = $closestLi.attr("id");
  const story = storyList.stories.find((s) => s.storyId === storyId);
  handleEditClick(story);
});

// Function to update the story in the UI after editing
function updateStoryInUI(updatedStory) {
  // Implement logic to update the story in the UI
  // For example, find the corresponding <li> element and update its content
  const $storyElement = $("#" + updatedStory.storyId);
  $storyElement.find(".story-title").text(updatedStory.title);
  $storyElement.find(".story-author").text("by " + updatedStory.author);
  $storyElement.find(".story-url").attr("href", updatedStory.url).text(updatedStory.url);
}

// Attach the function to the form's submit event
$("#new-story-form").on("submit", handleStoryFormSubmission);

$storiesLists.on("click", ".star", toggleStoryFavorite);