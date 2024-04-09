# Storyblok Solr Indexer

Indexer to index Storyblok stories in Solr. 

## Usage

Install package
```
npm install storyblok-solr-indexer
```

### Example Usage

indexer.js
```
mport 'dotenv/config';
import StoryblokSolrIndexer from './StoryblokSolrIndexer.mjs';

// Destructure required environment variables for better readability and performance.
const {
	STORYBLOK_ACCESS_TOKEN,
	SOLR_HOST,
	SOLR_PORT,
	SOLR_PATH,
	SOLR_USER,
	SOLR_PASS,
	SOLR_CORE,
	TEST_DATA
} = process.env;

if (!STORYBLOK_ACCESS_TOKEN || !SOLR_HOST || !SOLR_PORT || !SOLR_PATH || !SOLR_USER || !SOLR_PASS || !SOLR_CORE || !TEST_DATA) {
	throw new Error('One or more environment variables are missing or invalid');
}

// Configure storyblock options with access token and query parameters.
const storyblockOptions = {
		accessToken: STORYBLOK_ACCESS_TOKEN,
		options: {
				starts_with: '',
				'filter_query[component][in]': 'Page',
				per_page: 100,
				page: 1,
				version: 'published'
		}
};

// Configure Solr connection options using environment variables.
const solrOptions = {
		host: SOLR_HOST,
		port: SOLR_PORT,
		path: SOLR_PATH,
		user: SOLR_USER,
		pass: SOLR_PASS,
		core: SOLR_CORE,
};

// Parse the test data provided via environment variable.
const data = JSON.parse(TEST_DATA);

// Create an instance of StoryblokSolrIndexer and pass the configured options.
const indexer = new StoryblokSolrIndexer(storyblockOptions, solrOptions);

indexer.indexStoriesBasedOnAction(data)
```

The `data` object passed through the indexer can contain a property `action` and `story_id`.

```
{
	"action": "published", // 'unpublished', 'moved', 'deleted'
	"story_id": 473816430
}
````
If no action is passed the Solr index is cleared and fully new indexed.


Run in Terminal

```
node indexer.js
```

## NPM Package

https://www.npmjs.com/package/storyblok-solr-indexer

## Cloudflare

You can find a cloudflare worker using the indexer here: 

https://github.com/dkd/cloudflare-worker-storyblok-solr-indexer

## Hosted Solr

You can host your Solr core here:

https://hosted-solr.com/de/
