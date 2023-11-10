"use strict";

const BASE_URL = "https://hack-or-snooze-v3.herokuapp.com";

/******************************************************************************
 * Story: a single story in the system
 */

class Story {

  /** Make instance of Story from data object about story:
   *   - {title, author, url, username, storyId, createdAt}
   */

  constructor({ storyId, title, author, url, username, createdAt }) {
    this.storyId = storyId;
    this.title = title;
    this.author = author;
    this.url = url;
    this.username = username;
    this.createdAt = createdAt;
  }

  /** Parses hostname out of URL and returns it. */

  getHostName() {
    // Check if the URL is valid
    try {
      const url = new URL(this.url);
      return url.hostname;
    } catch (error) {
      console.error('Invalid URL:', this.url);
      return 'Invalid URL';
    }
  }
}

/******************************************************************************
 * List of Story instances: used by UI to show story lists in DOM.
 */

class StoryList {
  constructor(stories) {
    this.stories = stories;
  }

  /** Generate a new StoryList. It:
   *
   *  - calls the API
   *  - builds an array of Story instances
   *  - makes a single StoryList instance out of that
   *  - returns the StoryList instance.
   */

  static async getStories() {
    // Note presence of `static` keyword: this indicates that getStories is
    //  **not** an instance method. Rather, it is a method that is called on the
    //  class directly. Why doesn't it make sense for getStories to be an
    //  instance method?

    // query the /stories endpoint (no auth required)
    const response = await axios({
      url: `${BASE_URL}/stories`,
      method: "GET",
    });

    // turn plain old story objects from API into instances of Story class
    const stories = response.data.stories.map(story => new Story(story));

    // build an instance of our own class using the new array of stories
    return new StoryList(stories);
  }

  /** Adds story data to API, makes a Story instance, adds it to story list.
   * - user - the current instance of User who will post the story
   * - obj of {title, author, url}
   *
   * Returns the new Story instance
   */

  async addStory(user, { title, author, url }) {
    const token = user.loginToken;
    const response = await axios({
      url: `${BASE_URL}/stories`,
      method: "POST",
      data: {
        token,
        story: { title, author, url }
      }
    });

    const newStory = new Story(response.data.story);
    this.stories.unshift(newStory); // Add the new story to the beginning of the array
    user.ownStories.unshift(newStory);

    return newStory;
  }

  /** Delete story from API and remove from the story lists.
   *
   * - user: the current User instance
   * - storyId: the ID of the story you want to remove
   */

  async removeStory(user, storyId) {
    const token = user.loginToken;
    // Delete the story from the API
    await axios({
      url: `${BASE_URL}/stories/${storyId}`,
      method: "DELETE",
      data: { token: user.loginToken }
    });
     // Filter out the story from the story list
     this.stories = this.stories.filter(story => story.storyId !== storyId);

     // Filter out the story from the user's list of stories and favorites
    user.ownStories = user.ownStories.filter(s => s.storyId !== storyId);
    user.favorites = user.favorites.filter(s => s.storyId !== storyId);
  }

    /** Updates a story in the API and in the story lists.
   * - user: the current User instance
   * - storyId: the ID of the story to update
   * - updatedData: an object with updated story data
   */
    async updateStory(user, storyId, { title, author, url }) {
      const token = user.loginToken;
  
      // Send a PUT request to update the story
      const response = await axios({
        url: `${BASE_URL}/stories/${storyId}`,
        method: "PATCH",
        data: {
          token,
          story: { title, author, url },
        },
      });
  
      // Update the story in the local list
      const updatedStory = new Story(response.data.story);
      const index = this.stories.findIndex((story) => story.storyId === storyId);
      this.stories[index] = updatedStory;
  
      // Update the story in the user's own stories list
      this.updateStoryInUser(user, storyId, updatedStory);
  
      return updatedStory;
    }
     /** Updates a story in the user's own stories list.
     * - user: the current User instance
     * - storyId: the ID of the story to update
     * - updatedStory: the updated Story instance
     */
    updateStoryInUser(user, storyId, updatedStory) {
      // Update the story in the user's own stories list
      const userStoryIndex = user.ownStories.findIndex(
        (story) => story.storyId === storyId
      );

    if (userStoryIndex !== -1) {
      user.ownStories[userStoryIndex] = updatedStory;
    }
  }

  
}

/******************************************************************************
 * User: a user in the system (only used to represent the current user)
 */

class User {

  /** Make user instance from obj of user data and a token:
   *   - {username, name, createdAt, favorites[], ownStories[]}
   *   - token
   */


  constructor({
                username,
                name,
                createdAt,
                favorites = [],
                ownStories = []
              },
              token) {
    this.username = username;
    this.name = name;
    this.createdAt = createdAt;

    // instantiate Story instances for the user's favorites and ownStories
    this.favorites = favorites.map(s => new Story(s));
    this.ownStories = ownStories.map(s => new Story(s));

    // store the login token on the user so it's easy to find for API calls.
    this.loginToken = token;
  }

  /** Register new user in API, make User instance & return it.
   *
   * - username: a new username
   * - password: a new password
   * - name: the user's full name
   */

  static async signup(username, password, name) {
    const response = await axios({
      url: `${BASE_URL}/signup`,
      method: "POST",
      data: { user: { username, password, name } },
    });

    let { user } = response.data

    return new User(
      {
        username: user.username,
        name: user.name,
        createdAt: user.createdAt,
        favorites: user.favorites,
        ownStories: user.stories
      },
      response.data.token
    );
  } catch(error) {
    if (error.response.status === 409) {
      // Username already taken
      console.error("Username is already taken.");
      throw new Error("Username is already taken.");
    } else {
      // Other error
      console.error("Signup failed:", error.message);
      throw new Error("Signup failed.");
    }
  }

  /** Login in user with API, make User instance & return it.

   * - username: an existing user's username
   * - password: an existing user's password
   */

  static async login(username, password) {
    try {
      const response = await axios({
        url: `${BASE_URL}/login`,
        method: "POST",
        data: { user: { username, password } },
      });

      let { user } = response.data;

      return new User(
        {
          username: user.username,
          name: user.name,
          createdAt: user.createdAt,
          favorites: user.favorites,
          ownStories: user.stories
        },
        response.data.token
      );
    } catch(error) {
      if (error.response.status === 401) {
        // Incorrect credentials
        console.error("Incorrect username or password.");
        throw new Error("Incorrect username or password.");
      } else {
        // Other error
        console.error("Login failed:", error.message);
        throw new Error("Login failed.");
      }
    } 
}
  /** When we already have credentials (token & username) for a user,
   *   we can log them in automatically. This function does that.
   */

  static async loginViaStoredCredentials(token, username) {
    try {
      const response = await axios({
        url: `${BASE_URL}/users/${username}`,
        method: "GET",
        params: { token },
      });

      let { user } = response.data;

      return new User(
        {
          username: user.username,
          name: user.name,
          createdAt: user.createdAt,
          favorites: user.favorites,
          ownStories: user.stories
        },
        token
      );
    } catch (err) {
      console.error("loginViaStoredCredentials failed", err);
      return null;
    }
  }

  /** Add a story to the user's list of favorites and update the API */
  async addFavorite(story) {
    this.favorites.push(story);
    await this._addOrRemoveFavorite("add", story);
  }

  /** Remove a story from the user's list of favorites and update the API */
  async removeFavorite(story) {
    this.favorites = this.favorites.filter((s) => s.storyId !== story.storyId);
    await this._addOrRemoveFavorite("remove", story);
  }

    /** Update API with favorite/not-favorite.
   *   - newState: "add" or "remove"
   *   - story: Story instance to make favorite / not favorite
   * */
    async _addOrRemoveFavorite(newState, story) {
      const method = newState === "add" ? "POST" : "DELETE";
      const token = this.loginToken;
    
      await axios({
        url: `${BASE_URL}/users/${this.username}/favorites/${story.storyId}`,
        method: method,
        data: { token },
      });
    }

  isFavorite(story) {
    return this.favorites.some(s => (s.storyId === story.storyId));
  }

  ownsStory(story) {
    return this.ownStories.some(userStory => userStory.storyId === story.storyId);
  }

  /** Update the user's profile (name and/or password) */
  async updateProfile({ name, password }) {
    const token = this.loginToken;

    // Make an API request to update the user's profile
    await axios({
      url: `${BASE_URL}/users/${this.username}`,
      method: "PATCH",
      data: {
        token,
        user: { name, password },
      },
    });

    // Update the user instance with the new information
    if (name) {
      this.name = name;
    }
    // Possible to update other user details if needed

    // You can add more logic based on your application's requirements

    // Return the updated user instance
    return this;
  }
}
