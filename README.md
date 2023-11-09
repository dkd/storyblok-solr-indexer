# Storyblok Solr Indexer

Indexer to index Storyblok stories in solr. 

## Usage

Install package
```
npm install storyblok-solr-indexer
```

### Example Usage

indexer.js
```
import 'dotenv/config'
import StoryblokSolrIndexer from 'storyblok-solr-indexer'

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

new StoryblokSolrIndexer(storyblockOptions, solrOptions)
```

Run in Terminal

```
node indexer.js
```

## Hosted Solr

https://hosted-solr.com/de/
