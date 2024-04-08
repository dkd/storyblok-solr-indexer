import StoryblokClient from 'storyblok-js-client'

/**
 * Represents a class that handles indexing of Storyblok content into a Solr search engine.
 */
class StoryblokSolrIndexer {
	/**
	 * Creates an instance of the StoryblokSolrIndexer class.
	 * @param {Object} storyblok - Configuration object for the Storyblok API client.
	 * @param {Object} solr - An instance of a Solr client or configuration object.
	 */
	constructor(storyblok, solr) {
		// Initialize the Storyblok API client with the provided access token.
		this.storyblokApiClient = new StoryblokClient({ accessToken: storyblok.accessToken });

		// Store any additional options needed for the Storyblok API client.
		this.storyblokOptions = storyblok.options;

		// Assign the provided Solr client or configuration to this instance.
		this.solr = solr;
	}

	/**
	 * Asynchronously processes story changes based on an action and updates the Solr index.
	 * @param {Object} data - Data containing the details of the change including the action type.
	 */
	async indexStoriesBasedOnAction(data) {
		try {
			// Check if the action property exists in the provided data object using optional chaining.
			if (data?.action) {
				// Use a switch statement to handle different types of actions.
				switch (data.action) {
					case 'published':
					case 'moved':
						// If the story is published or moved, add or update it in the Solr index.
						await this.addUpdateStoryInIndex(data);
						break;
					case 'unpublished':
					case 'deleted':
						// If the story is unpublished or deleted, remove it from the Solr index.
						await this.deleteStoryFromIndex(data);
						break;
					default:
						// For any other action, reindex all stories.
						await this.clearSolrIndex();
						await this.indexAll();
						break;
				}
			} else {
				// If no action is specified, fall back to reindexing all stories.
				await this.clearSolrIndex();
				await this.indexAll();
			}
		} catch (error) {
			// Log any errors that occur during the indexing process.
			console.error('Error processing index action:', error);
		}
	}

	/**
	 * Asynchronously indexes all stories in the Solr search engine.
	 */
	async indexAll() {
		// Fetch the first page to determine the total number of stories and calculate the number of pages.
		const firstPageResponse = await this.fetchStories();
		const total = parseInt(firstPageResponse.headers.total);           // Total number of stories
		const maxPage = Math.ceil(total / this.storyblokOptions.per_page); // Calculate total pages based on per_page option

		let contentRequests = [];

		// Loop through all pages, fetching each one's stories and adding the promise to an array.
		for (let page = 1; page <= maxPage; page++) {
			contentRequests.push(this.fetchStories(page));
		}

		// Await all fetch story promises at once for efficiency, resulting in all page responses.
		const pageResponses = await Promise.all(contentRequests);

		let docs = []; // Initialize an array to hold all documents for indexing.

		// Iterate over each page response, extract the stories, and prepare them for Solr indexing.
		pageResponses.forEach(response => {
			const stories = response.data.stories;
			stories.forEach(story => {
				// Transform each story into a Solr-friendly format.
				docs.push(this.prepareSolrDoc(story));
			});
		});

		// If there are documents to index, perform the Solr indexing request.
		if (docs.length > 0) {
			await this.doSolrRequest(docs);
		}
	}

	/**
	 * Fetches stories from the Storyblok Content Delivery API.
	 *
	 * @param {number} page - The page number of the results to retrieve, with a default value of 1.
	 * @returns {Promise} - A promise that resolves to the response of the Storyblok API request.
	 */
	fetchStories(page = 1) {
		// Executes a GET request to the Storyblok API using the predefined client instance.
		// It combines predefined options with the page number for paginated results.
		return this.storyblokApiClient.get('cdn/stories/', { ...this.storyblokOptions, page });
	}

	/**
	 * Fetches a single story from Storyblok by its ID.
	 * 
	 * @param {string} storyId - The unique identifier for the story to be retrieved.
	 * @returns {Promise} - A Promise that resolves with the response from the Storyblok API containing the requested story data.
	 */
	getStoryById(storyId) {
		// Makes an API call using the Storyblok client instance to get the data of a specific story. 
		// The storyId parameter is interpolated into the URL to specify which story to fetch.
		return this.storyblokApiClient.get(`cdn/stories/${storyId}`);
	}

	/**
	 * Prepares a document for indexing in Solr from a Storyblok story object.
	 *
	 * @param {Object} story - The story object retrieved from Storyblok which contains the content and metadata of a story.
	 * @returns {Object} - An object structured for Solr indexing, with necessary fields such as id, type, and appKey.
	 */
	prepareSolrDoc(story) {
		// Extracts all textual values from the story's content using a helper function.
		let contentStrings = this.findAllTextValues(story.content);

		// Constructs the Solr document with required and additional fields.
		let doc = {
			id: story.id, // Unique identifier for the document (required for Solr).
			type: story?.content?.component, // Type of the component, using optional chaining to prevent errors if story.content is undefined.
			appKey: 'StoryblokSolrIndexer', // Identifier for the application performing the indexing (required field).
			url: story.full_slug, // URL slug for the story.
			title: story.name, // Name of the story.
			content: contentStrings.join(' '), // Aggregate content string created by joining all text values with a space.
		};

		// Returns the constructed document which is ready for indexing.
		return doc;
	}

	/**
	 * Adds or updates a story in the Solr index.
	 * @param {Object} data - The data object containing the ID of the story to be indexed.
	 */
	async addUpdateStoryInIndex(data) {
		// Fetches the story from Storyblok by story ID.
		const response = await this.getStoryById(data.story_id);
		// Use optional chaining (?.) to safely access deep nested properties.
		const story = response?.data?.story;

		// Check if the story object exists.
		if (story) {
			// Prepare the document for indexing in Solr.
			const doc = this.prepareSolrDoc(story);
			// Add or update the story document in Solr.
			await this.doSolrRequest([doc]);
		}
	}

	/**
	 * Asynchronously deletes a story from the search index.
	 * @param {Object} data - An object containing the necessary deletion parameters.
	 */
	async deleteStoryFromIndex(data) {
		// Prepare the document for deletion by specifying the ID in a 'delete' operation.
		const doc = { 'delete': data.story_id };
		// Send the prepared document to Solr for execution of the delete operation.
		await this.doSolrRequest(doc);
	}

	/**
     * Asynchronously clears all documents from the Solr search index.
     */
	async clearSolrIndex() {
		// Prepare the delete command to clear the entire index.
		// The JSON body for the delete command uses '*:*' to match all documents.
		const deleteCommand = { "delete": { "query": "*:*" } };

		try {
				// Execute the delete command by making a request to the Solr API.
				const response = await this.doSolrRequest(deleteCommand);
				
				// Log the successful clearing of the index.
				console.log('Successfully cleared the Solr index.', response);
		} catch (error) {
				// In case of an error during the deletion process, log the error.
				console.error('Error clearing the Solr index:', error);
				// Optionally, rethrow the error to allow calling code to handle it.
				throw error;
		}
}

	/**
	 * Create
	 * @param {*} solrOptions 
	 * @returns 
	 */
	getSolrApiUrl(solrOptions) {
		const protocol = solrOptions.port == 443 ? 'https' : 'http';
		return `${protocol}://${solrOptions.host}/${solrOptions.path}/${solrOptions.core}`
	}

	// Define an asynchronous function to make a request to Solr.
	async doSolrRequest(docs) {
		console.log('Solr Request Data added/updated/deleted', docs)
		try {
			// Retrieve the API URL for the Solr instance, assuming it can be accessed from `this` context.
			const solrApiUrl = this.getSolrApiUrl(this.solr);

			// Create a string with the username and password separated by a colon.
			const userPass = `${this.solr.user}:${this.solr.pass}`;

			// Encode the username and password in base64 format for the Authorization header (Node.js compatible method).
			const base64UserPass = Buffer.from(userPass).toString('base64');

			// Convert the documents to a JSON string as the request body.
			const body = JSON.stringify(docs)

			// Perform the fetch operation using the POST method with the appropriate headers and body.
			const response = await fetch(`${solrApiUrl}/update?commit=true`, {
				body: body,
				method: "POST", // Use POST method to send data to the server.
				headers: {
					"Authorization": `Basic ${base64UserPass}`, // Set the basic authentication header with encoded credentials.
					"content-type": "application/json;charset=UTF-8", // Specify the content type of the request.
				}
			});

			// Check if the HTTP response status indicates a failure.
			if (!response.ok) {
				console.error('Solr added/updated/deleted', docs)
				// Throw an error including the HTTP status code to provide more details about the failure.
				throw new Error(`HTTP error! status: ${response.status}`);
			} else {
				console.log('Solr added/updated/deleted', docs)
			}

			// Parse the JSON response from the Solr server and return it.
			return await response.json();
		} catch (error) {
			// Log any errors that occur during the request or processing to the console.
			console.error("Error occurred during Solr request:", error);
			// Rethrow the error to allow caller functions to handle it further if necessary.
			throw error;
		}
	}


	/**
	 * Find all text values in story object
	 * @param {*} obj 
	 * @returns 
	 */
	findAllTextValues(obj) {
		const result = [];

		for (let key in obj) {
			if (key === "text" && typeof obj[key] === "string") {
				result.push(obj[key]);
			} else if (typeof obj[key] === "object") {
				result.push(...this.findAllTextValues(obj[key]));
			}
		}

		return result;
	}
}

export default StoryblokSolrIndexer
