# markdown-it-annotation

Annotations plugin for [markdown-it](https://github.com/markdown-it/markdown-it) markdown parser.

This is a slightly modified version of the [markdown-it-footnote](https://github.com/markdown-it/markdown-it-footnote/) which better suits my needs. It still produces footnotes in the raw markup, so should be (other than changing of class names) a drop-in replacement for the footnote plugin.

In my usage, I'm customising the markup and adding JS so that the content is presented with annotation icons which show the annotation content in a popup when clicked. The requirement to modify the original footnote plugin came from the need for different icons to show different categories of annotations.

**Annotations**:

The usage is virtually identical to the footnote plugin on which this is based, other than specifying a category - which is by default applied to the footnote as a class.

```
Here is an annotation reference,[^1] and another with a category.[^2:tick]

[^1]: Here is the annotation.

[^2]: Here's another.
```

html:

```html
<p>Here is an annotation reference,<sup class="annotation-ref"><a href="#an1" id="anref1">[1]</a></sup> and another with a category.<sup class="annotation-ref"><a href="#an2" id="anref2" class="tick">[2]</a></sup></p>
<section class="annotations">
<ol class="annotation-list">
<li id="an1" class="annotation-item"><p>Here is the annotation. <a href="#anref1" class="annotation-backref">↩︎</a></p>
</li>
<li id="an2" class="annotation-item"><p>Here's another. <a href="#anref2" class="annotation-backref">↩︎</a></p>
</li>
</ol>
</section>
```

## License

[MIT](https://github.com/markdown-it/markdown-it-footnote/blob/master/LICENSE)
