import 'dotenv/config';
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

