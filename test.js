import 'dotenv/config'
import StoryblokSolrIndexer from './StoryblokSolrIndexer.mjs'

const storyblockOptions = {
	accessToken: process.env.STORYBLOK_ACCESS_TOKEN,
	options: {
		starts_with: '',
		'filter_query[component][in]': 'article,page',
		per_page: 100,
		page: 1,
		version: 'published'
	}
}
const solrOptions = {
	host: process.env.SOLR_HOST,
	port: process.env.SOLR_PORT,
	path: process.env.SOLR_PATH,
	user: process.env.SOLR_USER,
	pass: process.env.SOLR_PASS,
	core: process.env.SOLR_CORE,
}
new StoryblokSolrIndexer(	storyblockOptions, solrOptions)

