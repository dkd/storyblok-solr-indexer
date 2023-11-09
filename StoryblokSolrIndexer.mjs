import StoryblokClient from 'storyblok-js-client'

class StoryblokSolrIndexer {
	constructor(
		storyblok,
		solr
	) {
		const storyblokApi = new StoryblokClient({ accessToken: storyblok.accessToken })
		const storyblokOptions = storyblok.options

		return storyblokApi.get(`cdn/stories/`, storyblokOptions).then(async res => {
			const total = res.headers.total
			const maxPage = Math.ceil(total / storyblokOptions.per_page)

			let contentRequests = []
			for (let page = 1; page <= maxPage; page++) {
				contentRequests.push(storyblokApi.get(`cdn/stories/`, { ...storyblokOptions, page }))
			}
			await Promise.all(contentRequests).then(async (responses) => {
				let records = []
				let docs = []

				responses.forEach((response) => {
					let data = response.data
					records = records.concat(data.stories)
				})

				records.forEach(record => {
					let contentStrings = this.findAllTextValues(record.content)
					let doc = {
						id: record.uuid, // required
						type: record?.content?.component, // required
						appKey: 'StoryblokSolrIndexer', // required
						url: record.full_slug,
						title: record.name,
						content: contentStrings.join(' '),

					}
					docs.push(doc)
				})
				if (docs.length > 0) {
					// add to solr Index
					const solrApiUrl = this.apiUrl(solr)
					const userPass = `${solr.user}:${solr.pass}`
					const solrResponse = await fetch(
						`${solrApiUrl}/update?commit=true`,
						{
							body: JSON.stringify(docs),
							method: "POST",
							headers: {
								"Authorization": `Basic ${btoa(userPass)}`,
								"content-type": "application/json;charset=UTF-8",
							}
						}
					).then((response) => response.json())
					console.log('Solr response:', solrResponse)
				}
			}).catch(e => { console.log(e) })
		}).catch(e => { console.log(e) })
	}

	apiUrl(solrOptions) {
		const protocol = solrOptions.port == 443 ? 'https' : 'http';
		return `${protocol}://${solrOptions.host}/${solrOptions.path}/${solrOptions.core}`
	}

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
