const { Clutter, Gio, GObject, Pango, St } = imports.gi

const ExtensionUtils = imports.misc.extensionUtils
const Me = ExtensionUtils.getCurrentExtension()

const { fallbackIfNaN, roundOrDefault, getStockColorStyleClass } = Me.imports.helpers.data
const { Translations } = Me.imports.helpers.translations
const { MARKET_STATES } = Me.imports.services.meta.generic

var NewsCard = GObject.registerClass({
  GTypeName: 'StockExtension_NewsCard'
}, class NewsCard extends St.Button {
  _init (newsItem, fgColor) {
    super._init({
      style_class: 'card message news-card',
      can_focus: true,
      x_expand: true
    })

    this.cardItem = newsItem
    this._fgColor = fgColor
    this._expandedBox = null

    this._contentBox = new St.BoxLayout({
      vertical: true,
      x_expand: true
    })
    this.set_child(this._contentBox)

    const newsContent = this._createNewsContent()

    this._contentBox.add_child(newsContent)

    this.connect('destroy', this._onDestroy.bind(this))
    this._sync()
  }

  _createNewsContent () {
    let newsContentBox = new St.BoxLayout({
      style_class: 'news-content-box',
      x_expand: true,
      vertical: true
    })

    const newsTitleLabel = new St.Label({
      style_class: 'news-title fwb',
      x_expand: true,
      y_expand: true,
      text: this.cardItem.Title
    })

    newsTitleLabel.get_clutter_text().set({
      line_wrap: true,
      line_wrap_mode: Pango.WrapMode.WORD_CHAR,
      ellipsize: Pango.EllipsizeMode.NONE
    })

    newsContentBox.add_child(newsTitleLabel)

    const newsDetailsLabel = new St.Label({
      style_class: 'news-details small-text fwb',
      x_expand: true,
      text: this.cardItem.Date.toLocaleFormat(Translations.FORMATS.DEFAULT_DATE_TIME)
    })

    newsDetailsLabel.set_style(`border-color: ${this._fgColor};`)

    newsContentBox.add_child(newsDetailsLabel)

    return newsContentBox
  }

  toggleExpanded () {
    if (this._expandedBox) {
      this._expandedBox.destroy()
      this._expandedBox = null
      return
    }

    this._expandedBox = new St.BoxLayout({
      style_class: 'news-expanded-box',
      x_expand: true,
      vertical: true
    })

    // the description duplicates the title when the feed provides no snippet
    let description = (this.cardItem.Description || '').trim()
    if (!description || description === (this.cardItem.Title || '').trim()) {
      description = 'No preview available'
    }

    const descriptionLabel = new St.Label({
      style_class: 'news-description',
      x_expand: true,
      text: description
    })

    descriptionLabel.get_clutter_text().set({
      line_wrap: true,
      line_wrap_mode: Pango.WrapMode.WORD_CHAR,
      ellipsize: Pango.EllipsizeMode.NONE
    })

    this._expandedBox.add_child(descriptionLabel)

    const readMoreLabel = new St.Label({
      style_class: 'news-read-more small-text fwb',
      text: 'Read more  ↗',
      reactive: true,
      track_hover: true
    })

    readMoreLabel.set_style('text-decoration: underline;')

    // consume press & release so the outer card button does not also toggle
    readMoreLabel.connect('button-press-event', () => Clutter.EVENT_STOP)
    readMoreLabel.connect('button-release-event', () => {
      Gio.AppInfo.launch_default_for_uri_async(this.cardItem.Link, null, null, null)
      return Clutter.EVENT_STOP
    })

    this._expandedBox.add_child(readMoreLabel)

    this._contentBox.add_child(this._expandedBox)
  }

  _sync () {
  }

  _onDestroy () {
  }
})
