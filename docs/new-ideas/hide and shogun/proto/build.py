"""Builds the single-file prototype: engine.js is inlined into ui_template.html.
  hide-and-shogun-alpha.html            page body only (for publishing as an Artifact; the host adds the head)
  hide-and-shogun-alpha-standalone.html complete page (doctype + viewport) for opening straight from a file"""
import os
here = os.path.dirname(os.path.abspath(__file__))
tpl = open(os.path.join(here, 'ui_template.html')).read()
eng = open(os.path.join(here, 'engine.js')).read()
assert '</script' not in eng
page = tpl.replace('/*__ENGINE__*/', eng)
open(os.path.join(here, 'hide-and-shogun-alpha.html'), 'w').write(page)
head = '<!doctype html>\n<html lang="en-AU"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"></head><body>\n'
open(os.path.join(here, 'hide-and-shogun-alpha-standalone.html'), 'w').write(head + page + '\n</body></html>\n')
print('built', len(page) // 1024, 'KB')
