const ExtensionUtils = imports.misc.extensionUtils
const Me = ExtensionUtils.getCurrentExtension()

const { fromXML } = Me.imports.helpers.xmlParser

var NewsList = class NewsList {
  constructor () {
    this.Items = []
    this.Error = null
  }
}

var NewsPreviewItem = class NewsPreviewItem {
  constructor () {
    this.Description = null
    this.Link = null
    this.Title = null
    this.Date = null
  }
}

var createNewsListFromYahooData = (responseData, type, error) => {
  const newObject = new NewsList()

  newObject.Error = error

  try {
    const xmlDataObj = fromXML(responseData)
    // a channel with a single item parses as an object instead of an array
    const rawItems = [].concat(xmlDataObj.rss.channel.item || [])
    newObject.Items = rawItems.map(newsItem => {
      const previewItem = new NewsPreviewItem()

      previewItem.Description = newsItem.description
      previewItem.Title = newsItem.title
      previewItem.Link = newsItem.link
      previewItem.Date = new Date(newsItem.pubDate)

      return previewItem
    })
  }catch (e) {
    log(`failed to parse news xml ${e}`)
  }

  return newObject
}
