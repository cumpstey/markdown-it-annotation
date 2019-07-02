(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
// Process annotations
//
'use strict';

////////////////////////////////////////////////////////////////////////////////
// Renderer partials

function render_annotation_anchor_name(tokens, idx, options, env/*, slf*/) {
  var n = Number(tokens[idx].meta.id + 1).toString();
  var prefix = '';

  if (typeof env.docId === 'string') {
    prefix = '-' + env.docId + '-';
  }

  return prefix + n;
}

function render_annotation_caption(tokens, idx/*, options, env, slf*/) {
  var n = Number(tokens[idx].meta.id + 1).toString();

  if (tokens[idx].meta.subId > 0) {
    n += ':' + tokens[idx].meta.subId;
  }

  return '[' + n + ']';
}

function render_annotation_ref(tokens, idx, options, env, slf) {
  var id = slf.rules.annotation_anchor_name(tokens, idx, options, env, slf);
  var caption = slf.rules.annotation_caption(tokens, idx, options, env, slf);
  var refid = id;

  if (tokens[idx].meta.subId > 0) {
    refid += ':' + tokens[idx].meta.subId;
  }

  var classAttr = tokens[idx].meta.type ? ` class="${tokens[idx].meta.type}"` : '';
  var link = `<a href="#an${id}" id="anref${refid}"${classAttr}>${caption}</a>`;
  return `<sup class="annotation-ref">${link}</sup>`;
}

function render_annotation_block_open(tokens, idx, options) {
  return '<section class="annotations">\n' +
    '<ol class="annotation-list">\n';
}

function render_annotation_block_close() {
  return '</ol>\n</section>\n';
}

function render_annotation_open(tokens, idx, options, env, slf) {
  var id = slf.rules.annotation_anchor_name(tokens, idx, options, env, slf);

  if (tokens[idx].meta.subId > 0) {
    id += ':' + tokens[idx].meta.subId;
  }

  return '<li id="an' + id + '" class="annotation-item">';
}

function render_annotation_close() {
  return '</li>\n';
}

function render_annotation_anchor(tokens, idx, options, env, slf) {
  var id = slf.rules.annotation_anchor_name(tokens, idx, options, env, slf);

  if (tokens[idx].meta.subId > 0) {
    id += ':' + tokens[idx].meta.subId;
  }

  /* ↩ with escape code to prevent display as Apple Emoji on iOS */
  return ' <a href="#anref' + id + '" class="annotation-backref">\u21a9\uFE0E</a>';
}


module.exports = function annotation_plugin(md) {
  var parseLinkLabel = md.helpers.parseLinkLabel,
    isSpace = md.utils.isSpace;

  md.renderer.rules.annotation_ref = render_annotation_ref;
  md.renderer.rules.annotation_block_open = render_annotation_block_open;
  md.renderer.rules.annotation_block_close = render_annotation_block_close;
  md.renderer.rules.annotation_open = render_annotation_open;
  md.renderer.rules.annotation_close = render_annotation_close;
  md.renderer.rules.annotation_anchor = render_annotation_anchor;

  // helpers (only used in other rules, no tokens are attached to those)
  md.renderer.rules.annotation_caption = render_annotation_caption;
  md.renderer.rules.annotation_anchor_name = render_annotation_anchor_name;

  // Process annotation block definition
  function annotation_def(state, startLine, endLine, silent) {
    var oldBMark, oldTShift, oldSCount, oldParentType, pos, label, token,
      initial, offset, ch, posAfterColon,
      start = state.bMarks[startLine] + state.tShift[startLine],
      max = state.eMarks[startLine];

    // line should be at least 5 chars - "[^x]:"
    if (start + 4 > max) { return false; }

    if (state.src.charCodeAt(start) !== 0x5B/* [ */) { return false; }
    if (state.src.charCodeAt(start + 1) !== 0x5E/* ^ */) { return false; }

    for (pos = start + 2; pos < max; pos++) {
      if (state.src.charCodeAt(pos) === 0x20/* \s */) { return false; }
      if (state.src.charCodeAt(pos) === 0x5D/* ] */) {
        break;
      }
    }

    if (pos === start + 2) { return false; } // no empty annotation labels
    if (pos + 1 >= max || state.src.charCodeAt(++pos) !== 0x3A/* : */) { return false; }
    if (silent) { return true; }
    pos++;

    if (!state.env.annotations) { state.env.annotations = {}; }
    if (!state.env.annotations.refs) { state.env.annotations.refs = {}; }
    label = state.src.slice(start + 2, pos - 2);
    state.env.annotations.refs[':' + label] = -1;

    token = new state.Token('annotation_reference_open', '', 1);
    token.meta = { label: label };
    token.level = state.level++;
    state.tokens.push(token);

    oldBMark = state.bMarks[startLine];
    oldTShift = state.tShift[startLine];
    oldSCount = state.sCount[startLine];
    oldParentType = state.parentType;

    posAfterColon = pos;
    initial = offset = state.sCount[startLine] + pos - (state.bMarks[startLine] + state.tShift[startLine]);

    while (pos < max) {
      ch = state.src.charCodeAt(pos);

      if (isSpace(ch)) {
        if (ch === 0x09) {
          offset += 4 - offset % 4;
        } else {
          offset++;
        }
      } else {
        break;
      }

      pos++;
    }

    state.tShift[startLine] = pos - posAfterColon;
    state.sCount[startLine] = offset - initial;

    state.bMarks[startLine] = posAfterColon;
    state.blkIndent += 4;
    state.parentType = 'annotation';

    if (state.sCount[startLine] < state.blkIndent) {
      state.sCount[startLine] += state.blkIndent;
    }

    state.md.block.tokenize(state, startLine, endLine, true);

    state.parentType = oldParentType;
    state.blkIndent -= 4;
    state.tShift[startLine] = oldTShift;
    state.sCount[startLine] = oldSCount;
    state.bMarks[startLine] = oldBMark;

    token = new state.Token('annotation_reference_close', '', -1);
    token.level = --state.level;
    state.tokens.push(token);

    return true;
  }

  // Process inline annotations (^[...])
  function annotation_inline(state, silent) {
    var labelStart,
      labelEnd,
      annotationId,
      token,
      tokens,
      max = state.posMax,
      start = state.pos;

    if (start + 2 >= max) { return false; }
    if (state.src.charCodeAt(start) !== 0x5E/* ^ */) { return false; }
    if (state.src.charCodeAt(start + 1) !== 0x5B/* [ */) { return false; }

    labelStart = start + 2;
    labelEnd = parseLinkLabel(state, start + 1);

    // parser failed to find ']', so it's not a valid note
    if (labelEnd < 0) { return false; }

    // We found the end of the link, and know for a fact it's a valid link;
    // so all that's left to do is to call tokenizer.
    //
    if (!silent) {
      if (!state.env.annotations) { state.env.annotations = {}; }
      if (!state.env.annotations.list) { state.env.annotations.list = []; }
      annotationId = state.env.annotations.list.length;

      state.md.inline.parse(
        state.src.slice(labelStart, labelEnd),
        state.md,
        state.env,
        tokens = []
      );

      token = state.push('annotation_ref', '', 0);
      token.meta = { id: annotationId };

      state.env.annotations.list[annotationId] = { tokens: tokens };
    }

    state.pos = labelEnd + 1;
    state.posMax = max;
    return true;
  }

  // Process annotation references ([^...])
  function annotation_ref(state, silent) {
    var label,
    type,
      pos,
      annotationId,
      annotationSubId,
      token,
      max = state.posMax,
      start = state.pos;

    // should be at least 4 chars - "[^x]"
    if (start + 3 > max) { return false; }

    if (!state.env.annotations || !state.env.annotations.refs) { return false; }
    if (state.src.charCodeAt(start) !== 0x5B/* [ */) { return false; }
    if (state.src.charCodeAt(start + 1) !== 0x5E/* ^ */) { return false; }

    for (pos = start + 2; pos < max; pos++) {
      if (state.src.charCodeAt(pos) === 0x20/* \s */) { return false; }
      if (state.src.charCodeAt(pos) === 0x0A/* \n */) { return false; }
      if (state.src.charCodeAt(pos) === 0x5D/* ] */) {
        break;
      }
    }

    if (pos === start + 2) { return false; } // no empty annotation labels
    if (pos >= max) { return false; } // end of block reached
    pos++;

    // Extract the label
    label = state.src.slice(start + 2, pos - 1);

    // Extract the type from the label
    var typeMatch = label.match(/^(?<label>.*):(?<type>[a-z0-9_-]*)$/i);
    if (typeMatch) {
      label = typeMatch.groups.label;
      type = typeMatch.groups.type;
    }

    if (typeof state.env.annotations.refs[':' + label] === 'undefined') { return false; }

    if (!silent) {
      if (!state.env.annotations.list) { state.env.annotations.list = []; }

      if (state.env.annotations.refs[':' + label] < 0) {
        annotationId = state.env.annotations.list.length;
        state.env.annotations.list[annotationId] = { label: label, count: 0 };
        state.env.annotations.refs[':' + label] = annotationId;
      } else {
        annotationId = state.env.annotations.refs[':' + label];
      }

      annotationSubId = state.env.annotations.list[annotationId].count;
      state.env.annotations.list[annotationId].count++;

      token = state.push('annotation_ref', '', 0);
      token.meta = { id: annotationId, subId: annotationSubId, label: label, type: type };
    }

    state.pos = pos;
    state.posMax = max;
    return true;
  }

  // Glue annotation tokens to end of token stream
  function annotation_tail(state) {
    var i, l, j, t, lastParagraph, list, token, tokens, current, currentLabel,
      insideRef = false,
      refTokens = {};

    if (!state.env.annotations) { return; }

    state.tokens = state.tokens.filter(function (tok) {
      if (tok.type === 'annotation_reference_open') {
        insideRef = true;
        current = [];
        currentLabel = tok.meta.label;
        return false;
      }
      if (tok.type === 'annotation_reference_close') {
        insideRef = false;
        // prepend ':' to avoid conflict with Object.prototype members
        refTokens[':' + currentLabel] = current;
        return false;
      }
      if (insideRef) { current.push(tok); }
      return !insideRef;
    });

    if (!state.env.annotations.list) { return; }
    list = state.env.annotations.list;

    token = new state.Token('annotation_block_open', '', 1);
    state.tokens.push(token);

    for (i = 0, l = list.length; i < l; i++) {
      token = new state.Token('annotation_open', '', 1);
      token.meta = { id: i, label: list[i].label };
      state.tokens.push(token);

      if (list[i].tokens) {
        tokens = [];

        token = new state.Token('paragraph_open', 'p', 1);
        token.block = true;
        tokens.push(token);

        token = new state.Token('inline', '', 0);
        token.children = list[i].tokens;
        token.content = '';
        tokens.push(token);

        token = new state.Token('paragraph_close', 'p', -1);
        token.block = true;
        tokens.push(token);

      } else if (list[i].label) {
        tokens = refTokens[':' + list[i].label];
      }

      state.tokens = state.tokens.concat(tokens);
      if (state.tokens[state.tokens.length - 1].type === 'paragraph_close') {
        lastParagraph = state.tokens.pop();
      } else {
        lastParagraph = null;
      }

      t = list[i].count > 0 ? list[i].count : 1;
      for (j = 0; j < t; j++) {
        token = new state.Token('annotation_anchor', '', 0);
        token.meta = { id: i, subId: j, label: list[i].label };
        state.tokens.push(token);
      }

      if (lastParagraph) {
        state.tokens.push(lastParagraph);
      }

      token = new state.Token('annotation_close', '', -1);
      state.tokens.push(token);
    }

    token = new state.Token('annotation_block_close', '', -1);
    state.tokens.push(token);
  }

  md.block.ruler.before('reference', 'annotation_def', annotation_def, { alt: ['paragraph', 'reference'] });
  md.inline.ruler.after('image', 'annotation_inline', annotation_inline);
  md.inline.ruler.after('annotation_inline', 'annotation_ref', annotation_ref);
  md.core.ruler.after('inline', 'annotation_tail', annotation_tail);
};

},{}]},{},[1]);
